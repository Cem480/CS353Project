# generate_report.py
"""Blueprint that exposes admin reporting endpoints.

Available endpoints:
* **GET /api/report/student/general**    - site - wide student metrics
* **GET /api/report/student/ranged**    - student metrics between selected months
* **GET /api/report/course/general**     - site - wide course metrics
* **GET /api/report/instructor/general** - site - wide instructor metrics

Install with:
python
from routes/generate_report import report_bp
app.register_blueprint(report_bp)

"""

from flask import Blueprint, jsonify, request
from .helpers import (
    new_report_id,
    first_day,
    last_day,
    month_label,
    last_completed_month,
)

import datetime as dt


from db import connect_project_db

report_bp = Blueprint("report", __name__)

import datetime as dt
from decimal import Decimal
import psycopg2.extras as psql
import json
import sys
import traceback


_JSON_DUMPER = lambda o: float(o) if isinstance(o, Decimal) else o

import psycopg2


def parse_month(month_str):
    return dt.datetime.strptime(month_str.strip() + "-01", "%Y-%m-%d").date()


def _dec2py(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, list):
        return [_dec2py(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _dec2py(v) for k, v in obj.items()}
    return obj


def _json_dumps(o):
    if isinstance(o, Decimal):
        return float(o)
    raise TypeError


# ────────────────────────────────────────────────────────────────────────────────
# SQL: Student general metrics
# ────────────────────────────────────────────────────────────────────────────────
STUDENT_GENERAL_SQL = """
WITH base AS (
    SELECT s.id,
           DATE_PART('year', AGE(CURRENT_DATE, u.birth_date)) AS age,
           s.major,
           s.account_status,
           s.certificate_count
    FROM student s
    JOIN "user" u ON u.id = s.id
),
enrolls AS (
    SELECT student_id,
           COUNT(*) AS enroll_cnt,
           AVG(progress_rate) AS avg_progress
    FROM enroll
    GROUP BY student_id
),
majors AS (
    SELECT major,
           COUNT(*) AS cnt,
           ROW_NUMBER() OVER(ORDER BY COUNT(*) DESC, major) AS rn
    FROM student s
    GROUP BY major
)
SELECT
  (SELECT COUNT(*) FROM base)                                       AS total_students,
  (SELECT COUNT(*) FROM base WHERE account_status = 'active')       AS active_student_count,
  ROUND((SELECT AVG(enroll_cnt) FROM enrolls)::numeric,2)          AS avg_enroll_per_student,
  ROUND((SELECT AVG(certificate_count) FROM base)::numeric,2)      AS avg_cert_per_student,
  ROUND((SELECT AVG(avg_progress) FROM enrolls)::numeric,2)        AS avg_completion_rate,
  (SELECT major FROM majors WHERE rn = 1)                          AS most_common_major,
  (SELECT cnt FROM majors WHERE rn = 1)                            AS most_common_major_count,
  ROUND((SELECT AVG(age) FROM base)::numeric,2)                    AS avg_age,
  (SELECT MIN(age) FROM base)                                      AS youngest_age,
  (SELECT MAX(age) FROM base)                                      AS oldest_age
;"""

STUDENT_MONTHLY_SQL = """
SELECT TO_CHAR(date_trunc('month', u.registration_date),'YYYY-MM') AS month,
       COUNT(*) AS registration_count
FROM "user" u
JOIN student s ON s.id = u.id
GROUP BY month
ORDER BY month;
"""
# ────────────────────────────────────────────────────────────────────────────────
# SQL: Top-3 students overall (with name & major)
# ────────────────────────────────────────────────────────────────────────────────
STUDENT_TOP_SQL = """
WITH stats AS (
    SELECT s.id,
           s.certificate_count,
           COUNT(e.course_id) AS enroll_cnt,
           AVG(e.progress_rate) AS avg_progress
    FROM student s
    LEFT JOIN enroll e ON e.student_id = s.id
    GROUP BY s.id, s.certificate_count
),
scores AS (
    SELECT id,
           ROUND(certificate_count*2 + enroll_cnt*0.5 + COALESCE(avg_progress,0)*0.1,2) AS achievement_score
    FROM (
      SELECT id,
             certificate_count,
             enroll_cnt,
             COALESCE(ROUND(avg_progress::numeric,2),0) AS avg_progress
      FROM stats
    ) t
)
SELECT
  sc.id,
  u.first_name || ' ' || u.last_name AS full_name,
  s.major,
  sc.achievement_score
FROM scores sc
JOIN student s ON s.id = sc.id
JOIN "user" u    ON u.id = sc.id
ORDER BY sc.achievement_score DESC
LIMIT 3;
"""

# ────────────────────────────────────────────────────────────────────────────────
# SQL: Student ranged metrics (+ monthly major & age stats)
# ────────────────────────────────────────────────────────────────────────────────
STUDENT_RANGE_SQL = """
WITH months AS (
  SELECT generate_series(
    date_trunc('month', %s::date),
    date_trunc('month', %s::date),
    '1 month'
  ) AS m
),
stats AS (
  SELECT
    date_trunc('month', u.registration_date) AS m,
    COUNT(*)                                 AS registration_count,
    COUNT(*) FILTER (WHERE s.account_status='active') AS active_students
  FROM "user" u
  JOIN student s ON s.id = u.id
  WHERE u.registration_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m
),
cumulative AS (
  SELECT
    months.m AS m,
    (SELECT COUNT(*) FROM "user" ux JOIN student sx ON sx.id=ux.id
     WHERE ux.registration_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day')
      AS total_students
  FROM months
),
enrolls AS (
  SELECT
    sub.m,
    ROUND(AVG(sub.enroll_cnt)::numeric,2) AS avg_enroll_per_student,
    ROUND(AVG(s.certificate_count)::numeric,2) AS avg_cert_per_student,
    ROUND(AVG(sub.avg_progress)::numeric,2)   AS avg_completion_rate
  FROM student s
  JOIN "user" u ON u.id = s.id
  LEFT JOIN (
    SELECT
      student_id,
      date_trunc('month', enroll_date) AS m,
      COUNT(*)                       AS enroll_cnt,
      AVG(progress_rate)             AS avg_progress
    FROM enroll
    WHERE enroll_date BETWEEN %s
          AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
    GROUP BY student_id, m
  ) sub ON sub.student_id = s.id
  WHERE u.registration_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY sub.m
),
major_stats AS (
  SELECT
    date_trunc('month', u.registration_date) AS m,
    s.major,
    COUNT(*)                                AS major_count,
    ROW_NUMBER() OVER (
      PARTITION BY date_trunc('month', u.registration_date)
      ORDER BY COUNT(*) DESC, s.major
    ) AS rn
  FROM "user" u
  JOIN student s ON s.id = u.id
  WHERE u.registration_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m, s.major
),
age_stats AS (
  SELECT
    date_trunc('month', u.registration_date) AS m,
    ROUND(AVG(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date)))::numeric,2)
      AS avg_age,
    MIN(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date))) AS youngest_age,
    MAX(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date))) AS oldest_age
  FROM "user" u
  WHERE u.registration_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m
),
out AS (
  SELECT
    TO_CHAR(months.m,'YYYY-MM')                     AS month,
    COALESCE(stats.registration_count,0)             AS registration_count,
    COALESCE(cumulative.total_students,0)            AS total_students,
    COALESCE(stats.active_students,0)                AS active_students,
    COALESCE(enrolls.avg_enroll_per_student,0)       AS avg_enroll_per_student,
    COALESCE(enrolls.avg_cert_per_student,0)         AS avg_cert_per_student,
    COALESCE(enrolls.avg_completion_rate,0)          AS avg_completion_rate,
    COALESCE(ms.major,'')                            AS most_common_major,
    COALESCE(ms.major_count,0)                       AS most_common_major_count,
    COALESCE(a.avg_age,0)                            AS avg_age,
    COALESCE(a.youngest_age,0)                       AS youngest_age,
    COALESCE(a.oldest_age,0)                         AS oldest_age
  FROM months
  LEFT JOIN stats       ON stats.m       = months.m
  LEFT JOIN cumulative  ON cumulative.m  = months.m
  LEFT JOIN enrolls     ON enrolls.m     = months.m
  LEFT JOIN major_stats ms ON ms.m       = months.m AND ms.rn = 1
  LEFT JOIN age_stats   a  ON a.m         = months.m
)
SELECT * FROM out
ORDER BY month;
"""


# ────────────────────────────────────────────────────────────────────────────────
# SQL: Top-3 students for a given registration date range (with name & major)
# ────────────────────────────────────────────────────────────────────────────────
STUDENT_RANGE_TOP_SQL = """
WITH stats AS (
    SELECT
      s.id,
      s.certificate_count,
      COUNT(e.course_id)   AS enroll_cnt,
      AVG(e.progress_rate) AS avg_progress
    FROM student s
    JOIN "user" u ON u.id = s.id
    LEFT JOIN enroll e ON e.student_id = s.id
    WHERE u.registration_date
      BETWEEN %s
      AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
    GROUP BY s.id, s.certificate_count
),
scores AS (
    SELECT
      id,
      ROUND(certificate_count*2 + enroll_cnt*0.5 + COALESCE(avg_progress,0)*0.1,2)
        AS achievement_score
    FROM (
      SELECT
        id,
        certificate_count,
        enroll_cnt,
        COALESCE(ROUND(avg_progress::numeric,2),0) AS avg_progress
      FROM stats
    ) t
)
SELECT
  sc.id,
  u.first_name || ' ' || u.last_name AS full_name,
  s.major,
  sc.achievement_score
FROM scores sc
JOIN student s ON s.id = sc.id
JOIN "user" u    ON u.id = sc.id
ORDER BY sc.achievement_score DESC
LIMIT 3;
"""


# ────────────────────────────────────────────────────────────────────────────────
# SQL: Course ranged metrics
# ────────────────────────────────────────────────────────────────────────────────
COURSE_RANGE_SQL = """
WITH months AS (
  SELECT generate_series(
    date_trunc('month', %s::date),
    date_trunc('month', %s::date),
    '1 month'
  ) AS m
),
new_courses AS (
  SELECT
    date_trunc('month', creation_date) AS m,
    COUNT(*)                           AS new_course_count
  FROM course
  WHERE creation_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m
),
enr AS (
  SELECT
    date_trunc('month', e.enroll_date) AS m,
    COUNT(*)                           AS enroll_count,
    SUM(c.price)                       AS total_revenue,
    COUNT(*) FILTER (WHERE c.price = 0) AS free_enroll_count,
    COUNT(*) FILTER (WHERE c.price > 0) AS paid_enroll_count,
    ROUND(AVG(e.progress_rate)::numeric,2) AS avg_completion_rate
  FROM enroll e
  JOIN course c ON c.course_id = e.course_id
  WHERE e.enroll_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m
),
most_pop AS (
  SELECT
    date_trunc('month', e.enroll_date) AS m,
    e.course_id,
    COUNT(*) AS pop_enroll_count,
    MAX(c.price) AS price
  FROM enroll e
  JOIN course c ON c.course_id = e.course_id
  WHERE e.enroll_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m, e.course_id
),
most_done AS (
  SELECT
    date_trunc('month', e.enroll_date) AS m,
    e.course_id,
    COUNT(*) FILTER (WHERE e.progress_rate = 100) AS completion_count
  FROM enroll e
  WHERE e.enroll_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m, e.course_id
)
SELECT
  TO_CHAR(months.m,'YYYY-MM')                   AS month,
  COALESCE(nc.new_course_count, 0)     AS new_course_count,
  COALESCE(enr.enroll_count, 0)                 AS enroll_count,
  COALESCE(enr.total_revenue,0)                 AS total_revenue,
  COALESCE(enr.avg_completion_rate,0)           AS avg_completion_rate,
  COALESCE(enr.free_enroll_count,0)             AS free_enroll_count,
  COALESCE(enr.paid_enroll_count,0)             AS paid_enroll_count,
  mp.course_id                                  AS most_popular_course_id,
  mp.pop_enroll_count                           AS most_popular_enrollment_count,
  CASE WHEN mp.price = 0 THEN 'free' ELSE 'paid' END AS popular_payment_type,
  md.course_id                                  AS most_completed_course_id,
  md.completion_count                           AS most_completed_count
FROM months
LEFT JOIN new_courses nc ON nc.m = months.m
LEFT JOIN enr         ON enr.m = months.m
LEFT JOIN (
  SELECT DISTINCT ON (m) m, course_id, pop_enroll_count, price
  FROM most_pop
  ORDER BY m, pop_enroll_count DESC
) mp ON mp.m = months.m
LEFT JOIN (
  SELECT DISTINCT ON (m) m, course_id, completion_count
  FROM most_done
  ORDER BY m, completion_count DESC
) md ON md.m = months.m
ORDER BY months.m;
"""

COURSE_GENERAL_SQL = """
WITH base AS (
    SELECT course_id,
           price,
           COALESCE(enrollment_count,0) AS enrollment_count
    FROM course
),
freepaid AS (
    SELECT COUNT(*) FILTER(WHERE price=0) AS free_course_count,
           COUNT(*) FILTER(WHERE price>0) AS paid_course_count
    FROM base
),
popular AS (
    SELECT c.course_id,
           c.enrollment_count,
           c.price,
           c.creator_id
    FROM course c
    ORDER BY c.enrollment_count DESC
    LIMIT 1
),
completed_raw AS (
    SELECT b.course_id,
           COALESCE(c.completion_count,0) AS completion_count,
           b.enrollment_count,
           CASE WHEN b.enrollment_count>0
                THEN ROUND(COALESCE(c.completion_count,0)*100.0/b.enrollment_count,2)
                ELSE 0 END AS completion_ratio,
           b.price,
           cr.creator_id
    FROM base b
    LEFT JOIN (
      SELECT course_id, COUNT(*) AS completion_count
      FROM enroll
      WHERE progress_rate = 100
      GROUP BY course_id
    ) c USING(course_id)
    JOIN course cr USING(course_id)
    ORDER BY COALESCE(c.completion_count,0) DESC
    LIMIT 1
)
SELECT
  (SELECT COUNT(*) FROM base)                                        AS total_courses,

  -- most popular
  popular.course_id                                                 AS most_popular_course_id,
  (SELECT title FROM course WHERE course_id = popular.course_id)    AS most_popular_course_title,
  popular.enrollment_count                                          AS most_popular_enrollment_count,
  popular.price                                                     AS most_popular_price,
  popular.creator_id                                                AS most_popular_instructor_id,
  (SELECT u.first_name || ' ' || u.last_name
   FROM "user" u WHERE u.id = popular.creator_id)                   AS most_popular_instructor_name,

  ROUND((SELECT AVG(enrollment_count)::numeric FROM base),2)        AS avg_enroll_per_course,
  COALESCE((SELECT SUM(price*enrollment_count) FROM base),0)         AS total_revenue,
  freepaid.free_course_count                                        AS free_course_count,
  freepaid.paid_course_count                                        AS paid_course_count,

  -- most completed
  completed_raw.course_id                                           AS most_completed_course_id,
  (SELECT title FROM course WHERE course_id = completed_raw.course_id) 
                                                                    AS most_completed_course_title,
  completed_raw.enrollment_count                                    AS most_completed_enrollment_count,
  completed_raw.completion_ratio                                    AS most_completed_completion_ratio,
  completed_raw.price                                               AS most_completed_price,
  completed_raw.creator_id                                          AS most_completed_instructor_id,
  (SELECT u.first_name || ' ' || u.last_name
   FROM "user" u WHERE u.id = completed_raw.creator_id)            AS most_completed_instructor_name

FROM popular
CROSS JOIN freepaid
CROSS JOIN completed_raw;
"""


CATEGORY_ENROLL_SQL = """
SELECT category, SUM(COALESCE(enrollment_count,0)) AS total_enrollments
FROM course GROUP BY category ORDER BY total_enrollments DESC;
"""

DIFFICULTY_STATS_SQL = """
SELECT c.difficulty_level,
       SUM(COALESCE(c.enrollment_count,0)) AS total_enrollments,
       ROUND(COALESCE(AVG(e.progress_rate),0)::numeric,2) AS avg_completion_rate
FROM course c LEFT JOIN enroll e ON e.course_id=c.course_id
GROUP BY c.difficulty_level ORDER BY c.difficulty_level;
"""

MONTHLY_COURSES_SQL = """
SELECT TO_CHAR(date_trunc('month', creation_date),'YYYY-MM') AS month,
       COUNT(*) AS course_count
FROM course WHERE creation_date>=CURRENT_DATE-INTERVAL '1 year'
GROUP BY month ORDER BY month;
"""

STATUS_COUNTS_SQL = """
SELECT status, COUNT(*) AS count FROM (
  SELECT status FROM course WHERE creation_date>=CURRENT_DATE-INTERVAL '1 year'
) sub GROUP BY status;
"""

TOTAL_INSTR_SQL = """
SELECT COUNT(*) AS total_instructors FROM instructor;
"""

PAID_FREE_INSTR_SQL = """
SELECT COUNT(DISTINCT c.creator_id) FILTER(WHERE c.price=0) AS instructors_with_free_course,
       COUNT(DISTINCT c.creator_id) FILTER(WHERE c.price>0) AS instructors_with_paid_course
FROM course c;
"""

AVG_COURSES_SQL = """
SELECT ROUND(AVG(course_count)::numeric,2) AS avg_courses_per_instructor FROM instructor;
"""

MOST_POP_INSTR_SQL = """
SELECT i.id,
       u.first_name || ' ' || u.last_name AS full_name,
       COALESCE(SUM(c.enrollment_count),0) AS total_enrollments
FROM instructor i
JOIN "user" u ON u.id=i.id
LEFT JOIN course c ON c.creator_id=i.id
GROUP BY i.id,u.first_name,u.last_name
ORDER BY total_enrollments DESC LIMIT 1;
"""

MOST_ACTIVE_INSTR_SQL = """
SELECT i.id,
       u.first_name || ' ' || u.last_name AS full_name,
       i.course_count AS total_courses
FROM instructor i
JOIN "user" u ON u.id=i.id
ORDER BY i.course_count DESC LIMIT 1;
"""

INSTR_AGE_SQL = """
SELECT ROUND(AVG(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date)))::numeric,2) AS avg_age,
       MIN(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date))) AS youngest_age,
       MAX(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date))) AS oldest_age
FROM instructor i
JOIN "user" u ON u.id=i.id;
"""

INSTR_MONTHLY_SQL = """
SELECT TO_CHAR(date_trunc('month', registration_date),'YYYY-MM') AS month,
       COUNT(*) AS registrations
FROM "user" u
JOIN instructor i ON u.id=i.id
WHERE registration_date>=CURRENT_DATE-INTERVAL '1 year'
GROUP BY month ORDER BY month;
"""

TOP_INSTR_SQL = """
SELECT i.id,
       u.first_name || ' ' || u.last_name AS full_name,
       i.i_rating AS rating
FROM instructor i
JOIN "user" u ON u.id=i.id
ORDER BY i.i_rating DESC LIMIT 3;
"""
# ────────────────────────────────────────────────────────────────────────────────
# SQL: Instructor ranged metrics (monthly + summary)
# ────────────────────────────────────────────────────────────────────────────────
INSTRUCTOR_RANGE_SQL = """
WITH months AS (
  SELECT generate_series(
    date_trunc('month', %s::date),
    date_trunc('month', %s::date),
    '1 month'
  ) AS m
),
new_regs AS (
  SELECT
    date_trunc('month', u.registration_date) AS m,
    COUNT(*) AS registration_count
  FROM "user" u
  JOIN instructor i ON i.id = u.id
  WHERE u.registration_date
        BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY 1
)
SELECT
  TO_CHAR(months.m, 'YYYY-MM')                        AS month,
  COALESCE(new_regs.registration_count, 0)            AS registration_count,
  -- cumulative total instructors
  (SELECT COUNT(*)
   FROM instructor ix
   JOIN "user" ux ON ix.id = ux.id
   WHERE ux.registration_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day'
  ) AS total_instructors,
  -- average courses per instructor
  ROUND((
    SELECT AVG(ix.course_count)::numeric
    FROM instructor ix
    JOIN "user" ux ON ix.id = ux.id
    WHERE ux.registration_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day'
  ) ,2) AS avg_courses_per_instructor,
  -- instructors with at least one free/paid course up to that month
  (SELECT COUNT(DISTINCT c.creator_id)
   FROM course c
   WHERE c.price = 0
     AND c.creation_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day'
  ) AS instructors_with_free_course,
  (SELECT COUNT(DISTINCT c.creator_id)
   FROM course c
   WHERE c.price > 0
     AND c.creation_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day'
  ) AS instructors_with_paid_course,
  -- age stats as of end of each month
  ROUND((
    SELECT AVG(DATE_PART('year',
      AGE(months.m + INTERVAL '1 month' - INTERVAL '1 day', ux.birth_date)
    ))::numeric
    FROM instructor ix
    JOIN "user" ux ON ix.id = ux.id
    WHERE ux.registration_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day'
  ),2) AS avg_age,
  (SELECT MIN(DATE_PART('year',
      AGE(months.m + INTERVAL '1 month' - INTERVAL '1 day', ux.birth_date)
    ))
    FROM instructor ix
    JOIN "user" ux ON ix.id = ux.id
    WHERE ux.registration_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day'
  ) AS youngest_age,
  (SELECT MAX(DATE_PART('year',
      AGE(months.m + INTERVAL '1 month' - INTERVAL '1 day', ux.birth_date)
    ))
    FROM instructor ix
    JOIN "user" ux ON ix.id = ux.id
    WHERE ux.registration_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day'
  ) AS oldest_age
FROM months
LEFT JOIN new_regs ON new_regs.m = months.m
ORDER BY months.m;
"""
INSTR_MONTHLY_SQL = """
WITH stats AS (
  SELECT
    date_trunc('month', u.registration_date) AS m,
    COUNT(*) AS registration_count
  FROM "user" u
  JOIN instructor i ON i.id = u.id
  WHERE u.registration_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m
)
SELECT
  TO_CHAR(s.m, 'YYYY-MM') AS month,
  s.registration_count,
  (
    SELECT COUNT(*)
    FROM instructor ix
    JOIN "user" ux ON ux.id = ix.id
    WHERE ux.registration_date <= s.m + INTERVAL '1 month' - INTERVAL '1 day'
  ) AS total_instructors
FROM stats s
ORDER BY s.m;
"""

INSTR_RANGE_SUMMARY_SQL = """
SELECT
  ROUND(AVG(i.course_count)::numeric,2) AS avg_courses_per_instructor,
  COUNT(DISTINCT c.creator_id) FILTER (WHERE c.price = 0) AS instructors_with_free_course,
  COUNT(DISTINCT c.creator_id) FILTER (WHERE c.price > 0) AS instructors_with_paid_course,
  ROUND(AVG(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date)))::numeric,2) AS avg_age,
  MIN(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date))) AS youngest_age,
  MAX(DATE_PART('year', AGE(CURRENT_DATE, u.birth_date))) AS oldest_age
FROM instructor i
JOIN "user" u ON u.id = i.id
LEFT JOIN course c ON c.creator_id = i.id
WHERE u.registration_date BETWEEN %s
      AND (%s + INTERVAL '1 month' - INTERVAL '1 day');

"""

INSTRUCTOR_RANGE_MONTHLY_SQL = """
SELECT
  TO_CHAR(date_trunc('month', u.registration_date),'YYYY-MM') AS month,
  COUNT(*) AS registration_count
FROM "user" u
JOIN instructor i ON i.id = u.id
WHERE u.registration_date BETWEEN %s
      AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
GROUP BY 1
ORDER BY 1;
"""

# ────────────────────────────────────────────────────────────────────────────────
# SQL: most active instructor by course‐count in range
MOST_ACTIVE_IN_RANGE_SQL = """
SELECT
  c.creator_id                           AS id,
  u.first_name || ' ' || u.last_name     AS full_name,
  COUNT(*)                               AS total_courses
FROM course c
JOIN "user" u ON u.id = c.creator_id
WHERE c.creation_date BETWEEN %s
      AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
GROUP BY c.creator_id, full_name
ORDER BY total_courses DESC
LIMIT 1;
"""

# ────────────────────────────────────────────────────────────────────────────────
# SQL: most popular instructor by enrollments in range
MOST_POPULAR_IN_RANGE_SQL = """
SELECT
  c.creator_id                           AS id,
  u.first_name || ' ' || u.last_name     AS full_name,
  COUNT(e.student_id)                    AS total_enrollments
FROM enroll e
JOIN course c    ON c.course_id = e.course_id
JOIN "user" u    ON u.id = c.creator_id
WHERE e.enroll_date BETWEEN %s
      AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
GROUP BY c.creator_id, full_name
ORDER BY total_enrollments DESC
LIMIT 1;
"""


@report_bp.route("/api/report/student/general", methods=["GET"])
def student_general_report():
    # ── 0) validate caller ─────────────────────────────────────────────
    admin_id = request.args.get("admin_id")
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # ── 1) snapshot metrics  ───────────────────────────────────────
        cur.execute(STUDENT_GENERAL_SQL)
        summary = cur.fetchone() or {}

        cur.execute(STUDENT_MONTHLY_SQL)
        rows = cur.fetchall()
        summary["monthly_registrations"] = {
            r["month"]: r["registration_count"] for r in rows
        }

        cur.execute(STUDENT_TOP_SQL)
        summary["top_students"] = cur.fetchall()

        # ── 2) determine report range  (earliest data → last full month)
        cur.execute(
            """SELECT MIN(date_trunc('month', registration_date)) AS min_month
                       FROM "user";"""
        )
        earliest_row = cur.fetchone()
        start_month = (
            earliest_row["min_month"].date()
            if earliest_row and earliest_row["min_month"]
            else dt.date.today().replace(day=1)
        )
        end_month = last_completed_month()  # helper

        summary["range"] = {
            "start": month_label(start_month),  # e.g. 02‑2024
            "end": month_label(end_month),  # e.g. 04‑2025
        }

        # ────────────────────────────────────────────────────────────────
        # 3) get‑or‑create header, then metrics — FK‑safe & idempotent
        # ────────────────────────────────────────────────────────────────
        upsert_sql = """
        WITH ins AS (
            INSERT INTO report (
                report_id, admin_id, report_type, description,
                time_range_start, time_range_end
            )
            VALUES (%(rid)s, %(admin)s, 'student_general',
                    'site-wide student snapshot',
                    %(start)s, %(end)s)
            ON CONFLICT (report_type, time_range_start, time_range_end)
            DO NOTHING
            RETURNING report_id
        ),
        chosen AS (
            SELECT report_id FROM ins
            UNION ALL
            SELECT report_id
            FROM   report
            WHERE  report_type      = 'student_general'
              AND  time_range_start = %(start)s
              AND  time_range_end   = %(end)s
            LIMIT 1
        )
        INSERT INTO student_report (
            report_id,
            total_students, avg_certificate_per_student,
            avg_enrollments_per_student, avg_completion_rate,
            active_student_count,
            most_common_major, most_common_major_count,
            avg_age, youngest_age, oldest_age,
            monthly_reg_count,
            top1_id, top2_id, top3_id
        )
        SELECT
            chosen.report_id,
            %(total_students)s, %(avg_cert_per_student)s,
            %(avg_enroll_per_student)s, %(avg_completion_rate)s,
            %(active_student_count)s,
            %(most_common_major)s, %(most_common_major_count)s,
            %(avg_age)s, %(youngest_age)s, %(oldest_age)s,
            %(reg_cnt)s,
            %(top1)s, %(top2)s, %(top3)s
        FROM chosen
        ON CONFLICT DO NOTHING;
        """

        cur.execute(
            upsert_sql,
            {
                "rid": new_report_id("SG"),  # only used if row is new
                "admin": admin_id,
                "start": start_month,
                "end": end_month,
                "reg_cnt": sum(summary["monthly_registrations"].values()),
                "top1": (
                    summary["top_students"][0]["id"]
                    if summary["top_students"]
                    else None
                ),
                "top2": (
                    summary["top_students"][1]["id"]
                    if len(summary["top_students"]) > 1
                    else None
                ),
                "top3": (
                    summary["top_students"][2]["id"]
                    if len(summary["top_students"]) > 2
                    else None
                ),
                **summary,
            },
        )

        conn.commit()
        return (
            jsonify(
                {"success": True, "report_type": "student_general", "data": summary}
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[STUDENT GENERAL ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/student/ranged", methods=["GET"])
def student_ranged_report():
    # ── 0) input checks ------------------------------------------------
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return (
            jsonify({"success": False, "message": "admin_id longer than 8 characters"}),
            400,
        )

    start_raw = request.args.get("start")  # 'YYYY-MM'
    end_raw = request.args.get("end") or start_raw
    if not start_raw:
        return jsonify({"success": False, "message": "missing start"}), 400

    sdt, edt = parse_month(start_raw), parse_month(end_raw)
    if edt < sdt:
        return jsonify({"success": False, "message": "end < start"}), 400

    # first‑day dates we need
    months_needed = []
    cur_m = sdt
    while cur_m <= edt:
        months_needed.append(cur_m)
        cur_m = (cur_m + dt.timedelta(days=32)).replace(day=1)

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # ── 1) reuse parent if it already exists -----------------------
        cur.execute(
            """
            SELECT report_id
            FROM   report
            WHERE  report_type      = 'student_ranged'
              AND  parent_report_id IS NULL
              AND  time_range_start = %s
              AND  time_range_end   = %s
            LIMIT 1
        """,
            (sdt, edt),
        )
        row = cur.fetchone()

        if row:
            parent_id = row["report_id"]
        else:
            parent_id = new_report_id("SR")
            cur.execute(
                """
                INSERT INTO report (
                    report_id, admin_id, report_type,
                    time_range_start, time_range_end, description
                )
                VALUES (%s, %s, 'student_ranged',
                        %s, %s, %s)
            """,
                (
                    parent_id,
                    admin_id,
                    sdt,
                    edt,
                    f"student range {start_raw} - {end_raw}",
                ),
            )

        # ── 2) fetch cached monthly children --------------------------
        cur.execute(
            """
            SELECT r.time_range_start AS m_start,
                   sr.*
            FROM   report r
            JOIN   student_report sr USING(report_id)
            WHERE  r.report_type      = 'student_ranged'
              AND  r.time_range_start BETWEEN %s AND %s
        """,
            (months_needed[0], months_needed[-1]),
        )
        cached = {row["m_start"]: row for row in cur.fetchall()}

        month_rows = []

        # ── 3) iterate months -----------------------------------------
        for m_first in months_needed:
            if m_first in cached:  # cache HIT
                month_rows.append(cached[m_first])
                # link orphan child to this parent (optional tidy‑up)
                cur.execute(
                    """
                    UPDATE report
                    SET    parent_report_id = %s
                    WHERE  report_type = 'student_ranged'
                      AND  parent_report_id IS NULL
                      AND  time_range_start = %s
                      AND  time_range_end   = %s
                """,
                    (parent_id, m_first, last_day(m_first)),
                )
                continue

            # cache MISS → compute metrics
            cur.execute(STUDENT_RANGE_SQL, (m_first, m_first) * 6)
            one = cur.fetchone()
            one["active_student_count"] = one.pop("active_students")
            one["m_start"] = m_first  # unify key

            cur.execute(STUDENT_RANGE_TOP_SQL, (m_first, m_first))
            top = cur.fetchall()

            child_id = new_report_id("SR")

            # child header
            cur.execute(
                """
                INSERT INTO report (
                    report_id, admin_id, report_type,
                    time_range_start, time_range_end,
                    parent_report_id, description
                )
                VALUES (%s, %s, 'student_ranged',
                        %s, %s, %s,
                        %s)
            """,
                (
                    child_id,
                    admin_id,
                    m_first,
                    last_day(m_first),
                    parent_id,
                    f"monthly student {m_first:%Y-%m}",
                ),
            )

            # metrics row
            cur.execute(
                """
              INSERT INTO student_report (
                report_id,
                total_students, avg_certificate_per_student,
                avg_enrollments_per_student, avg_completion_rate,
                active_student_count,
                most_common_major, most_common_major_count,
                avg_age, youngest_age, oldest_age,
                monthly_reg_count,
                top1_id, top2_id, top3_id
              )
              VALUES (
                %(rid)s,
                %(total_students)s, %(avg_cert_per_student)s,
                %(avg_enroll_per_student)s, %(avg_completion_rate)s,
                %(active_student_count)s,
                %(most_common_major)s, %(most_common_major_count)s,
                %(avg_age)s, %(youngest_age)s, %(oldest_age)s,
                %(reg_cnt)s,
                %(top1)s, %(top2)s, %(top3)s
              )
            """,
                {
                    "rid": child_id,
                    "reg_cnt": one["registration_count"],
                    "top1": top[0]["id"] if top else None,
                    "top2": top[1]["id"] if len(top) > 1 else None,
                    "top3": top[2]["id"] if len(top) > 2 else None,
                    **one,
                },
            )

            month_rows.append(one)

        # ── 4) overall top‑3 for the whole window ----------------------
        cur.execute(STUDENT_RANGE_TOP_SQL, (sdt, edt))
        overall_top = cur.fetchall()

        conn.commit()

        month_rows.sort(key=lambda r: r["m_start"])

        return (
            jsonify(
                {
                    "success": True,
                    "report_type": "student_ranged",
                    "data": {
                        "parent_report_id": parent_id,
                        "range": {"start": start_raw, "end": end_raw},
                        "monthly_stats": month_rows,
                        "top_students": overall_top,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[STUDENT RANGED ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/course/general", methods=["GET"])
def course_general_report() -> tuple:
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return jsonify({"success": False, "message": "admin_id too long"}), 400

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)

    try:
        # 1) plain-number snapshot
        cur.execute(COURSE_GENERAL_SQL)
        summary = cur.fetchone() or {}

        # 1a) enrollment extras
        cur.execute(
            """
            SELECT
              ROUND(AVG(e.progress_rate)::numeric,2) AS avg_completion_rate,
              COUNT(*) FILTER (WHERE c.price = 0)   AS free_enroll_count,
              COUNT(*) FILTER (WHERE c.price > 0)   AS paid_enroll_count
            FROM enroll e
            JOIN course c ON c.course_id = e.course_id;
        """
        )
        summary.update(cur.fetchone() or {})

        # 1b) status counts
        cur.execute(STATUS_COUNTS_SQL)
        status_counts = {r["status"]: r["count"] for r in cur.fetchall()}
        for st in ("accepted", "rejected"):
            status_counts.setdefault(st, 0)

        # 1c) category stats
        cur.execute(CATEGORY_ENROLL_SQL)
        cat_stats = cur.fetchall()

        # 1d) difficulty stats
        cur.execute(DIFFICULTY_STATS_SQL)
        diff_stats = cur.fetchall()

        # 1e) courses created by month (last 12)
        cur.execute(MONTHLY_COURSES_SQL)
        courses_last_year = {r["month"]: r["course_count"] for r in cur.fetchall()}

        # assemble ext_stats
        ext_stats = {
            "status_counts": status_counts,
            "category_stats": cat_stats,
            "difficulty_stats": diff_stats,
            "courses_last_year": courses_last_year,
        }

        # 2) determine and sort date range
        cur.execute("SELECT MIN(date_trunc('month', creation_date)) AS mn FROM course;")
        mn = cur.fetchone()["mn"]
        start_month = (mn or dt.date.today()).date()
        end_month = last_completed_month()
        start_date, end_date = sorted((start_month, end_month))

        summary["range"] = {
            "start": month_label(start_date),
            "end": month_label(end_date),
        }

        # 3) upsert into report + course_report
        cur.execute(
            """
        WITH ins AS (
          INSERT INTO report (
            report_id, admin_id, report_type,
            time_range_start, time_range_end,
            description, summary
          ) VALUES (
            %(rid)s, %(admin)s, 'course_general',
            %(start)s, %(end)s,
            'site-wide course snapshot',
            %(summary_json)s
          )
          ON CONFLICT (report_type, time_range_start, time_range_end)
            DO NOTHING
          RETURNING report_id
        ), chosen AS (
          SELECT report_id FROM ins
          UNION ALL
          SELECT report_id
          FROM report
          WHERE report_type='course_general'
            AND time_range_start=%(start)s
            AND time_range_end  =%(end)s
          LIMIT 1
        )
        INSERT INTO course_report (
          report_id,
          total_courses,
          free_course_count,    paid_course_count,
          free_enroll_count,    paid_enroll_count,
          avg_enroll_per_course, total_revenue,
          avg_completion_rate,
          most_popular_course_id,
          most_completed_course_id,
          ext_stats
        )
        SELECT
          c.report_id,
          %(total_courses)s,
          %(free_course_count)s, %(paid_course_count)s,
          %(free_enroll_count)s, %(paid_enroll_count)s,
          %(avg_enroll_per_course)s, %(total_revenue)s,
          %(avg_completion_rate)s,
          %(most_popular_course_id)s,
          %(most_completed_course_id)s,
          %(ext_json)s
        FROM chosen c
        ON CONFLICT DO NOTHING;
        """,
            {
                "rid": new_report_id("CG"),
                "admin": admin_id,
                "start": start_date,
                "end": end_date,
                "summary_json": psql.Json(_dec2py(ext_stats)),
                "ext_json": psql.Json(_dec2py(ext_stats)),
                **summary,
            },
        )

        conn.commit()

        payload = {
            "success": True,
            "report_type": "course_general",
            "data": {
                **summary,
                "status_counts": status_counts,
                "category_enrollments": cat_stats,
                "difficulty_stats": diff_stats,
                "courses_created_last_year": courses_last_year,
            },
        }
        return jsonify(_dec2py(payload)), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/course/ranged", methods=["GET"])
def course_ranged_report() -> tuple:
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return jsonify({"success": False, "message": "admin_id too long"}), 400

    start_raw = request.args.get("start")
    end_raw = request.args.get("end") or start_raw
    if not start_raw:
        return jsonify({"success": False, "message": "missing start"}), 400

    sdt, edt = parse_month(start_raw), parse_month(end_raw)
    if edt < sdt:
        return jsonify({"success": False, "message": "end < start"}), 400

    # build list of month‐start dates
    months, cur_m = [], sdt
    while cur_m <= edt:
        months.append(cur_m)
        cur_m = (cur_m + dt.timedelta(days=32)).replace(day=1)

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)

    try:
        # 1) find or insert parent report header
        cur.execute(
            """
          SELECT report_id
          FROM report
          WHERE report_type='course_ranged'
            AND parent_report_id IS NULL
            AND time_range_start=%s
            AND time_range_end=%s
          LIMIT 1
        """,
            (sdt, edt),
        )
        row = cur.fetchone()
        if row:
            parent_id = row["report_id"]
        else:
            parent_id = new_report_id("CR")
            cur.execute(
                """
              INSERT INTO report (
                report_id, admin_id, report_type,
                time_range_start, time_range_end,
                parent_report_id, description
              ) VALUES (%s,%s,'course_ranged',%s,%s,NULL,%s)
            """,
                (parent_id, admin_id, sdt, edt, f"range {start_raw} - {end_raw}"),
            )

        # 2) load any already‐cached months
        cur.execute(
            """
          SELECT r.time_range_start AS m_start, cr.*
          FROM report r
          JOIN course_report cr USING(report_id)
          WHERE r.parent_report_id = %s
        """,
            (parent_id,),
        )
        cached = {r["m_start"]: r for r in cur.fetchall()}

        # 3) compute fresh metrics in one shot
        cur.execute(COURSE_RANGE_SQL, (sdt, edt) * 5)
        fresh = cur.fetchall()

        month_rows = []
        for row in fresh:
            m_first = parse_month(row["month"])
            if m_first in cached:
                month_rows.append(cached[m_first])
                continue

            # generate new monthly child report
            child_id = new_report_id("CR")
            cur.execute(
                """
              INSERT INTO report (
                report_id, admin_id, report_type,
                time_range_start, time_range_end,
                parent_report_id, description
              ) VALUES (%s,%s,'course_ranged',%s,%s,%s,%s)
            """,
                (
                    child_id,
                    admin_id,
                    m_first,
                    last_day(m_first),
                    parent_id,
                    f"month {row['month']}",
                ),
            )

            # safely extract each metric, with a fallback if your SQL alias differs
            total_courses = row.get("total_courses", row.get("course_count", 0))
            free_course_count = row.get("free_course_count", 0)
            paid_course_count = row.get("paid_course_count", 0)
            free_enroll_count = row.get("free_enroll_count", 0)
            paid_enroll_count = row.get("paid_enroll_count", 0)
            avg_enroll_per_course = row.get(
                "avg_enroll_per_course", row.get("avg_enrollments_per_course", 0)
            )
            total_revenue = row.get("total_revenue", 0)
            avg_completion_rate = row.get("avg_completion_rate", 0)
            most_popular_id = row.get("most_popular_course_id")
            most_completed_id = row.get("most_completed_course_id")

            # insert only the two IDs plus whatever else you actually have columns for
            cur.execute(
                """
              INSERT INTO course_report (
                report_id,
                total_courses,
                free_course_count, paid_course_count,
                free_enroll_count, paid_enroll_count,
                avg_enroll_per_course, total_revenue,
                avg_completion_rate,
                most_popular_course_id,
                most_completed_course_id,
                ext_stats
              ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
                (
                    child_id,
                    total_courses,
                    free_course_count,
                    paid_course_count,
                    free_enroll_count,
                    paid_enroll_count,
                    avg_enroll_per_course,
                    total_revenue,
                    avg_completion_rate,
                    most_popular_id,
                    most_completed_id,
                    psql.Json(_dec2py(row)),
                ),
            )

            row["m_start"] = m_first
            month_rows.append(row)

        # 4) fetch range‐level breakdowns (unchanged)
        cur.execute(
            """
            SELECT c.category, COUNT(*) AS enroll_count
            FROM enroll e JOIN course c ON c.course_id=e.course_id
            WHERE e.enroll_date BETWEEN %s
                  AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
            GROUP BY c.category ORDER BY enroll_count DESC
        """,
            (sdt, edt),
        )
        cat_stats = cur.fetchall()

        cur.execute(
            """
            SELECT c.difficulty_level,
                   COUNT(*) AS enroll_count,
                   ROUND(AVG(e.progress_rate)::numeric,2) AS avg_completion_rate
            FROM enroll e JOIN course c ON c.course_id=e.course_id
            WHERE e.enroll_date BETWEEN %s
                  AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
            GROUP BY c.difficulty_level ORDER BY c.difficulty_level
        """,
            (sdt, edt),
        )
        diff_stats = cur.fetchall()

        # update parent summary
        cur.execute(
            "UPDATE report SET summary=%s WHERE report_id=%s",
            [
                psql.Json(
                    _dec2py(
                        {"category_stats": cat_stats, "difficulty_stats": diff_stats}
                    )
                ),
                parent_id,
            ],
        )

        conn.commit()
        month_rows.sort(key=lambda r: r["m_start"])

        return (
            jsonify(
                _dec2py(
                    {
                        "success": True,
                        "report_type": "course_ranged",
                        "data": {
                            "parent_report_id": parent_id,
                            "range": {"start": start_raw, "end": end_raw},
                            "monthly_metrics": month_rows,
                            "category_stats": cat_stats,
                            "difficulty_stats": diff_stats,
                        },
                    }
                )
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/instructor/ranged", methods=["GET"])
def instructor_ranged_report():
    # ── 0) parameter checks -------------------------------------------
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return (
            jsonify({"success": False, "message": "admin_id longer than 8 characters"}),
            400,
        )

    start_raw = request.args.get("start")
    end_raw = request.args.get("end") or start_raw
    if not start_raw:
        return jsonify({"success": False, "message": "missing start"}), 400

    sdt, edt = parse_month(start_raw), parse_month(end_raw)
    if edt < sdt:
        return jsonify({"success": False, "message": "end < start"}), 400

    # list of first‑days we need
    months_needed = []
    cur_m = sdt
    while cur_m <= edt:
        months_needed.append(cur_m)
        cur_m = (cur_m + dt.timedelta(days=32)).replace(day=1)

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # ── 1) parent header (reuse or insert) ------------------------
        cur.execute(
            """
            SELECT report_id
            FROM   report
            WHERE  report_type      = 'instructor_ranged'
              AND  parent_report_id IS NULL
              AND  time_range_start = %s
              AND  time_range_end   = %s
            LIMIT 1
        """,
            (sdt, edt),
        )
        row = cur.fetchone()

        if row:
            parent_id = row["report_id"]
        else:
            parent_id = new_report_id("IR")
            cur.execute(
                """
                INSERT INTO report (
                    report_id, admin_id, report_type,
                    time_range_start, time_range_end,
                    description
                )
                VALUES (%s,%s,'instructor_ranged',
                        %s,%s,
                        %s)
            """,
                (
                    parent_id,
                    admin_id,
                    sdt,
                    edt,
                    f"instructor range {start_raw} - {end_raw}",
                ),
            )

        # ── 2) fetch already‑cached monthly children ------------------
        cur.execute(
            """
            SELECT r.time_range_start AS m_start,
                   ir.*
            FROM   report r
            JOIN   instructor_report ir USING(report_id)
            WHERE  r.report_type      = 'instructor_ranged'
              AND  r.time_range_start BETWEEN %s AND %s
        """,
            (months_needed[0], months_needed[-1]),
        )
        cached = {row["m_start"]: row for row in cur.fetchall()}

        month_rows = []

        # ── 3) iterate months, computing any missing ------------------
        for m_first in months_needed:
            if m_first in cached:
                month_rows.append(cached[m_first])

                # link to parent if row is orphan
                cur.execute(
                    """
                    UPDATE report
                       SET parent_report_id = %s
                     WHERE report_type = 'instructor_ranged'
                       AND parent_report_id IS NULL
                       AND time_range_start = %s
                       AND time_range_end   = %s
                """,
                    (parent_id, m_first, last_day(m_first)),
                )
                continue

            # --- compute metrics for this month ----------------------
            params = (m_first, m_first) * 2  # INSTRUCTOR_RANGE_SQL needs 4 placeholders
            cur.execute(INSTRUCTOR_RANGE_SQL, params)
            one = cur.fetchone()
            one["m_start"] = m_first

            child_id = new_report_id("IR")

            # child header
            cur.execute(
                """
                INSERT INTO report (
                    report_id, admin_id, report_type,
                    time_range_start, time_range_end,
                    parent_report_id, description
                )
                VALUES (%s,%s,'instructor_ranged',
                        %s,%s,%s,
                        %s)
            """,
                (
                    child_id,
                    admin_id,
                    m_first,
                    last_day(m_first),
                    parent_id,
                    f"monthly instructor {m_first:%Y-%m}",
                ),
            )

            # metrics row (only the columns that exist)
            cur.execute(
                """
              INSERT INTO instructor_report (
                report_id,
                total_instructors,
                instructors_with_paid_course,
                instructors_with_free_course,
                avg_courses_per_instructor,
                avg_age, youngest_age, oldest_age,
                registration_count
              )
              VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
                (
                    child_id,
                    one["total_instructors"],
                    one["instructors_with_paid_course"],
                    one["instructors_with_paid_course"]
                    - one["instructors_with_paid_course"]
                    + one["instructors_with_free_course"],  # ensure present
                    one["avg_courses_per_instructor"],
                    one["avg_age"],
                    one["youngest_age"],
                    one["oldest_age"],
                    one["registration_count"],
                ),
            )

            month_rows.append(one)

        # ── 4) range‑level “highlights” (most active/popular) ---------
        cur.execute(MOST_ACTIVE_IN_RANGE_SQL, (sdt, edt))
        most_active = cur.fetchone() or {}

        cur.execute(MOST_POPULAR_IN_RANGE_SQL, (sdt, edt))
        most_pop = cur.fetchone() or {}

        cur.execute(TOP_INSTR_SQL)
        top3 = cur.fetchall()

        conn.commit()

        month_rows.sort(key=lambda r: r["m_start"])

        return (
            jsonify(
                {
                    "success": True,
                    "report_type": "instructor_ranged",
                    "data": {
                        "parent_report_id": parent_id,
                        "range": {"start": start_raw, "end": end_raw},
                        "monthly_stats": month_rows,
                        "most_active_instructor": most_active,
                        "most_popular_instructor": most_pop,
                        "top_instructors": top3,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[INSTRUCTOR RANGED ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/instructor/general", methods=["GET"])
def instructor_general_report():
    # ── 0) validate caller ------------------------------------------------
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return (
            jsonify({"success": False, "message": "admin_id longer than 8 characters"}),
            400,
        )

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # ── 1) determine date‑range: earliest → last completed month -----
        cur.execute(
            """
            SELECT MIN(date_trunc('month', u.registration_date)) AS min_month
            FROM   "user" u
            JOIN   instructor i ON i.id = u.id;
        """
        )
        row = cur.fetchone()
        min_month = row["min_month"].date() if row and row["min_month"] else None
        end_month = last_completed_month()  # helper
        start_month = min_month or end_month  # fallback

        # ── 2) snapshot metrics ----------------------------------------
        cur.execute(TOTAL_INSTR_SQL)
        summary = cur.fetchone() or {}

        cur.execute(PAID_FREE_INSTR_SQL)
        summary.update(cur.fetchone() or {})

        cur.execute(AVG_COURSES_SQL)
        summary.update(cur.fetchone() or {})

        cur.execute(MOST_POP_INSTR_SQL)
        mp = cur.fetchone() or {}
        summary["most_popular_instructor"] = mp
        summary["most_popular_instructor_id"] = mp.get("id")

        cur.execute(MOST_ACTIVE_INSTR_SQL)
        ma = cur.fetchone() or {}
        summary["most_active_instructor"] = ma
        summary["most_active_instructor_id"] = ma.get("id")

        cur.execute(INSTR_AGE_SQL)
        summary.update(cur.fetchone() or {})

        cur.execute(INSTR_MONTHLY_SQL, (start_month, end_month))
        rows = cur.fetchall()
        summary["monthly_registrations"] = {
            r["month"]: r["registration_count"] for r in rows
        }

        cur.execute(TOP_INSTR_SQL)
        summary["top_instructors"] = cur.fetchall()

        summary["range"] = {
            "start": month_label(start_month),
            "end": month_label(end_month),
        }

        # ── 3) atomic upsert (header + metrics) ------------------------
        upsert_sql = """
        WITH ins AS (
            INSERT INTO report (
                report_id, admin_id, report_type,
                time_range_start, time_range_end, description
            )
            VALUES (%(rid)s, %(admin)s, 'instructor_general',
                    %(start)s, %(end)s,
                    'site - wide instructor snapshot')
            ON CONFLICT (report_type, time_range_start, time_range_end)
            DO NOTHING
            RETURNING report_id
        ),
        chosen AS (
            SELECT report_id FROM ins
            UNION ALL
            SELECT report_id
            FROM   report
            WHERE  report_type      = 'instructor_general'
              AND  time_range_start = %(start)s
              AND  time_range_end   = %(end)s
            LIMIT 1
        )
        INSERT INTO instructor_report (
            report_id,
            total_instructors,
            instructors_with_paid_course,
            instructors_with_free_course,
            avg_courses_per_instructor,
            most_popular_instructor_id,
            most_active_instructor_id,
            avg_age, youngest_age, oldest_age,
            registration_count,
            top1_id, top2_id, top3_id
        )
        SELECT
            chosen.report_id,
            %(total_instructors)s,
            %(instructors_with_paid_course)s,
            %(instructors_with_free_course)s,
            %(avg_courses_per_instructor)s,
            %(most_popular_instructor_id)s,
            %(most_active_instructor_id)s,
            %(avg_age)s, %(youngest_age)s, %(oldest_age)s,
            %(reg_cnt)s,
            %(top1)s, %(top2)s, %(top3)s
        FROM chosen
        ON CONFLICT DO NOTHING;
        """

        cur.execute(
            upsert_sql,
            {
                "rid": new_report_id("IG"),  # only used if row is new
                "admin": admin_id,
                "start": start_month,
                "end": end_month,
                "reg_cnt": sum(summary["monthly_registrations"].values()),
                "top1": (
                    summary["top_instructors"][0]["id"]
                    if summary["top_instructors"]
                    else None
                ),
                "top2": (
                    summary["top_instructors"][1]["id"]
                    if len(summary["top_instructors"]) > 1
                    else None
                ),
                "top3": (
                    summary["top_instructors"][2]["id"]
                    if len(summary["top_instructors"]) > 2
                    else None
                ),
                **summary,
            },
        )

        conn.commit()
        return (
            jsonify(
                {"success": True, "report_type": "instructor_general", "data": summary}
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[INSTRUCTOR GENERAL ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ────────────────────────────────────────────────────────────────────────────────
#  /api/report/student/<report_id>  – unified fetch
# ────────────────────────────────────────────────────────────────────────────────
@report_bp.route("/api/report/student/<rid>", methods=["GET"])
def get_student_report(rid: str):
    """
    Fetch any stored student report by primary key rid.

    * If rid is a *parent* ranged report → return all its monthly children.
    * If rid is a *general* report     → return that one snapshot row.
    * If rid is a *child* month row    → return that month only.
    """
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # 1) look up the header row
        cur.execute(
            """
            SELECT report_id, report_type,
                   time_range_start, time_range_end,
                   parent_report_id
            FROM   report
            WHERE  report_id = %s
        """,
            (rid,),
        )
        hdr = cur.fetchone()

        if not hdr or not hdr["report_type"].startswith("student_"):
            return (
                jsonify({"success": False, "message": "student report not found"}),
                404,
            )

        # ── CASE A ─ parent ranged report  (parent_report_id IS NULL)
        if hdr["report_type"] == "student_ranged" and hdr["parent_report_id"] is None:

            cur.execute(
                """
              SELECT r.time_range_start  AS month_start,
                     sr.*
              FROM   report r
              JOIN   student_report sr USING(report_id)
              WHERE  r.parent_report_id = %s
              ORDER  BY r.time_range_start;
            """,
                (rid,),
            )
            monthly = cur.fetchall()

            # you may aggregate a quick summary if you like
            return (
                jsonify(
                    {
                        "success": True,
                        "report_type": "student_ranged",
                        "data": {"header": hdr, "monthly_stats": monthly},
                    }
                ),
                200,
            )

        # ── CASE B ─ single snapshot  (general OR child month)
        cur.execute(
            """
            SELECT sr.*
            FROM   student_report sr
            WHERE  sr.report_id = %s
        """,
            (rid,),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"success": False, "message": "metrics row missing"}), 500

        return (
            jsonify(
                {
                    "success": True,
                    "report_type": hdr["report_type"],
                    "data": {**hdr, **row},
                }
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[REPORT FETCH ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ────────────────────────────────────────────────────────────────────────────────
#  /api/report/instructor/<report_id>  – unified fetch
# ────────────────────────────────────────────────────────────────────────────────
@report_bp.route("/api/report/instructor/<rid>", methods=["GET"])
def get_instructor_report(rid: str):
    """
    Fetch any stored instructor report by primary key rid.

    ── Behaviour ───────────────────────────────────────────────────────
    • If rid is an *instructor_ranged* parent header   → return all its
      monthly children (chronologically ordered).

    • If rid is an *instructor_general* snapshot       → return that one row.

    • If rid is a ranged‑*child* month row             → return that month
      only (same format as general/snapshot).
    """
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # 1) header lookup ------------------------------------------------
        cur.execute(
            """
            SELECT report_id, report_type,
                   time_range_start, time_range_end,
                   parent_report_id
            FROM   report
            WHERE  report_id = %s
            """,
            (rid,),
        )
        hdr = cur.fetchone()

        if not hdr or not hdr["report_type"].startswith("instructor_"):
            return (
                jsonify({"success": False, "message": "instructor report not found"}),
                404,
            )

        # ── CASE A : parent ranged header  ------------------------------
        if (
            hdr["report_type"] == "instructor_ranged"
            and hdr["parent_report_id"] is None
        ):

            cur.execute(
                """
                SELECT r.time_range_start AS month_start,
                       ir.*
                FROM   report r
                JOIN   instructor_report ir USING(report_id)
                WHERE  r.parent_report_id = %s
                ORDER  BY r.time_range_start
                """,
                (rid,),
            )
            monthly = cur.fetchall()

            return (
                jsonify(
                    {
                        "success": True,
                        "report_type": "instructor_ranged",
                        "data": {"header": hdr, "monthly_stats": monthly},
                    }
                ),
                200,
            )

        # ── CASE B : single snapshot (general OR child month) -----------
        cur.execute(
            """
            SELECT ir.*
            FROM   instructor_report ir
            WHERE  ir.report_id = %s
            """,
            (rid,),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"success": False, "message": "metrics row missing"}), 500

        return (
            jsonify(
                {
                    "success": True,
                    "report_type": hdr["report_type"],
                    "data": {**hdr, **row},
                }
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[INSTRUCTOR REPORT FETCH ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/course/<rid>", methods=["GET"])
def get_course_report(rid: str):
    """
    • If rid is a course_ranged parent → return its summary + all monthly rows
    • Otherwise (general snapshot or monthly child) → return that one row
    """
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)

    try:
        # 1) fetch header + any summary JSON
        cur.execute(
            """
            SELECT
              report_id,
              report_type,
              time_range_start,
              time_range_end,
              parent_report_id,
              summary         -- JSONB column for ranged summaries
            FROM report
            WHERE report_id = %s
        """,
            (rid,),
        )
        hdr = cur.fetchone()
        if not hdr or not hdr["report_type"].startswith("course_"):
            return (
                jsonify({"success": False, "message": "course report not found"}),
                404,
            )

        # ── CASE A: parent ranged report
        if hdr["report_type"] == "course_ranged" and hdr["parent_report_id"] is None:
            # pull all the children
            cur.execute(
                """
                SELECT
                  r.time_range_start AS month_start,
                  cr.*
                FROM report r
                JOIN course_report cr USING(report_id)
                WHERE r.parent_report_id = %s
                ORDER BY r.time_range_start
            """,
                (rid,),
            )
            monthly = cur.fetchall()

            # unpack the stored summary JSON (has category_stats & difficulty_stats)
            summary = hdr.pop("summary") or {}
            return (
                jsonify(
                    {
                        "success": True,
                        "report_type": "course_ranged",
                        "data": {
                            **{
                                k: hdr[k]
                                for k in (
                                    "report_id",
                                    "time_range_start",
                                    "time_range_end",
                                )
                            },
                            # bring the summary fields up top:
                            "category_stats": summary.get("category_stats", []),
                            "difficulty_stats": summary.get("difficulty_stats", []),
                            # then the monthly metrics:
                            "monthly_metrics": monthly,
                        },
                    }
                ),
                200,
            )

        # ── CASE B: single snapshot (general or monthly child)
        cur.execute(
            """
            SELECT cr.*
            FROM course_report cr
            WHERE cr.report_id = %s
        """,
            (rid,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "metrics row missing"}), 500

        # ext_stats JSON holds the “extra” bits (status_counts, category_stats, difficulty_stats…)
        ext = row.pop("ext_stats") or {}
        return (
            jsonify(
                {
                    "success": True,
                    "report_type": hdr["report_type"],
                    "data": {
                        # core header info:
                        **{
                            k: hdr[k]
                            for k in ("report_id", "time_range_start", "time_range_end")
                        },
                        # all the scalar columns:
                        **{k: row[k] for k in row if k != "ext_stats"},
                        # now lift the extras into top-level keys:
                        **ext,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[COURSE REPORT FETCH ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()
