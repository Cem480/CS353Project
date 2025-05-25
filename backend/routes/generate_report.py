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


# In routes/generate_report.py, replace your six generate‐endpoints with these:


@report_bp.route("/api/report/student/general", methods=["GET"])
def student_general_report():
    # 0) validate caller
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return jsonify({"success": False, "message": "admin_id too long"}), 400

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)

    try:
        # 1) snapshot metrics
        cur.execute(STUDENT_GENERAL_SQL)
        summary = cur.fetchone() or {}

        cur.execute(STUDENT_MONTHLY_SQL)
        rows = cur.fetchall()
        summary["monthly_registrations"] = {
            r["month"]: r["registration_count"] for r in rows
        }

        cur.execute(STUDENT_TOP_SQL)
        summary["top_students"] = cur.fetchall()

        # 2) determine & sort report range
        cur.execute(
            """SELECT MIN(date_trunc('month', registration_date)) AS min_month FROM "user";"""
        )
        earliest_row = cur.fetchone()
        raw_start = (
            earliest_row["min_month"].date()
            if earliest_row and earliest_row["min_month"]
            else dt.date.today().replace(day=1)
        )
        raw_end = last_completed_month()
        start_month, end_month = sorted((raw_start, raw_end))

        summary["range"] = {
            "start": month_label(start_month),
            "end": month_label(end_month),
        }

        # 3) Insert or fetch report, then ensure admin-report link exists
        report_rid = new_report_id("SG")
        upsert_sql = """
        WITH ins AS (
            INSERT INTO report (
                report_id, report_type, description,
                time_range_start, time_range_end
            )
            VALUES (%(rid)s, 'student_general',
                    'site-wide student snapshot', %(start)s, %(end)s)
            ON CONFLICT (report_type, time_range_start, time_range_end)
              DO NOTHING
            RETURNING report_id
        ), chosen AS (
            SELECT report_id FROM ins
            UNION ALL
            SELECT report_id
            FROM report
            WHERE report_type = 'student_general'
              AND time_range_start = %(start)s
              AND time_range_end = %(end)s
            LIMIT 1
        ),
        link AS (
            INSERT INTO admin_report (admin_id, report_id)
            SELECT %(admin)s, report_id FROM chosen
            ON CONFLICT DO NOTHING
        )
        INSERT INTO student_report (
            report_id,
            total_students, avg_certificate_per_student,
            avg_enrollments_per_student, avg_completion_rate,
            active_student_count,
            most_common_major, most_common_major_count,
            avg_age, youngest_age, oldest_age,
           registration_count,
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
                "rid": report_rid,
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

        # 4) fetch the actual report_id
        cur.execute(
            """
            SELECT report_id
            FROM report
            WHERE report_type = 'student_general'
              AND time_range_start = %s
              AND time_range_end = %s
            LIMIT 1
            """,
            (start_month, end_month),
        )
        rid_row = cur.fetchone()
        report_id = rid_row["report_id"] if rid_row else None

        return (
            jsonify(
                _dec2py(
                    {
                        "success": True,
                        "report_type": "student_general",
                        "report_id": report_id,
                        "data": summary,
                    }
                )
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

    months_needed = []
    cur_m = sdt
    while cur_m <= edt:
        months_needed.append(cur_m)
        cur_m = (cur_m + dt.timedelta(days=32)).replace(day=1)

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # 1) Insert or get parent report
        parent_id = new_report_id("SR")
        parent_upsert = """
        WITH ins AS (
            INSERT INTO report (
                report_id, report_type,
                time_range_start, time_range_end, description
            )
            VALUES (%s, 'student_ranged', %s, %s, %s)
            ON CONFLICT (report_type, time_range_start, time_range_end)
              DO NOTHING
            RETURNING report_id
        ), chosen AS (
            SELECT report_id FROM ins
            UNION ALL
            SELECT report_id FROM report
             WHERE report_type = 'student_ranged'
               AND time_range_start = %s
               AND time_range_end   = %s
            LIMIT 1
        )
        SELECT report_id FROM chosen;
        """
        cur.execute(
            parent_upsert,
            (
                parent_id,
                sdt,
                edt,
                f"student range {start_raw} - {end_raw}",
                sdt,
                edt,
            ),
        )
        parent_id = cur.fetchone()["report_id"]

        # Link admin to parent report
        cur.execute(
            "INSERT INTO admin_report (admin_id, report_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (admin_id, parent_id),
        )

        # 2) Load cached children
        cur.execute(
            """
            SELECT r.time_range_start AS month_start, sr.*
            FROM report r
            JOIN student_report sr USING(report_id)
            WHERE r.parent_report_id = %s
            """,
            (parent_id,),
        )
        cached = {r["month_start"]: r for r in cur.fetchall()}

        month_rows = []
        for m in months_needed:
            if m in cached:
                month_rows.append(cached[m])
                continue

            # a) Compute fresh metrics
            cur.execute(STUDENT_RANGE_SQL, (m, m) * 6)
            one = cur.fetchone()
            one["active_student_count"] = one.pop("active_students")

            cur.execute(STUDENT_RANGE_TOP_SQL, (m, m))
            tops = cur.fetchall()

            # b) Insert or get child report
            child_id = new_report_id("SR")
            cur.execute(
                """
                WITH ins AS (
                    INSERT INTO report (
                        report_id, report_type,
                        time_range_start, time_range_end,
                        parent_report_id, description
                    )
                    VALUES (%s, 'student_ranged', %s, %s, %s, %s)
                    ON CONFLICT (report_type, time_range_start, time_range_end)
                      DO UPDATE SET parent_report_id = EXCLUDED.parent_report_id
                    RETURNING report_id
                ), chosen AS (
                    SELECT report_id FROM ins
                    UNION ALL
                    SELECT report_id FROM report
                     WHERE report_type = 'student_ranged'
                       AND time_range_start = %s
                       AND time_range_end   = %s
                    LIMIT 1
                )
                SELECT report_id FROM chosen;
                """,
                (
                    child_id,
                    m,
                    last_day(m),
                    parent_id,
                    f"monthly student {m:%Y-%m}",
                    m,
                    last_day(m),
                ),
            )
            child_id = cur.fetchone()["report_id"]

            # Link admin to child report
            cur.execute(
                "INSERT INTO admin_report (admin_id, report_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (admin_id, child_id),
            )

            # c) Insert metrics
            cur.execute(
                """
                INSERT INTO student_report (
                    report_id,
                    total_students, avg_certificate_per_student,
                    avg_enrollments_per_student, avg_completion_rate,
                    active_student_count,
                    most_common_major, most_common_major_count,
                    avg_age, youngest_age, oldest_age,
                    registration_count,
                    top1_id, top2_id, top3_id
                )
                VALUES (
                    %(rid)s,
                    %(total_students)s, %(avg_cert_per_student)s,
                    %(avg_enroll_per_student)s, %(avg_completion_rate)s,
                    %(active_student_count)s,
                    %(most_common_major)s, %(most_common_major_count)s,
                    %(avg_age)s, %(youngest_age)s, %(oldest_age)s,
                    %(registration_count)s,
                    %(top1)s, %(top2)s, %(top3)s
                )
                ON CONFLICT DO NOTHING
                """,
                {
                    **one,
                    "rid": child_id,
                    "top1": tops[0]["id"] if tops else None,
                    "top2": tops[1]["id"] if len(tops) > 1 else None,
                    "top3": tops[2]["id"] if len(tops) > 2 else None,
                },
            )

            one["report_id"] = child_id
            month_rows.append(one)

        # 4) Top-3 overall
        cur.execute(STUDENT_RANGE_TOP_SQL, (sdt, edt))
        overall_top = cur.fetchall()

        conn.commit()

        return (
            jsonify(
                _dec2py(
                    {
                        "success": True,
                        "report_type": "student_ranged",
                        "report_id": parent_id,
                        "data": {
                            "parent_report_id": parent_id,
                            "range": {"start": start_raw, "end": end_raw},
                            "monthly_stats": month_rows,
                            "top_students": overall_top,
                        },
                    }
                )
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
        # 1a) core snapshot
        cur.execute(COURSE_GENERAL_SQL)
        summary = cur.fetchone() or {}

        # 1b) live enroll extras
        cur.execute(
            """
            SELECT
              ROUND(AVG(e.progress_rate)::numeric,2) AS avg_completion_rate,
              COUNT(*) FILTER (WHERE c.price=0)   AS free_enroll_count,
              COUNT(*) FILTER (WHERE c.price>0)   AS paid_enroll_count
            FROM enroll e
            JOIN course c ON c.course_id=e.course_id
        """
        )
        summary.update(cur.fetchone() or {})

        # 1c) status counts
        cur.execute(STATUS_COUNTS_SQL)
        status_counts = {r["status"]: r["count"] for r in cur.fetchall()}
        for st in ("accepted", "rejected"):
            status_counts.setdefault(st, 0)

        # 1d) category & difficulty stats
        cur.execute(CATEGORY_ENROLL_SQL)
        category_enrollments = cur.fetchall()
        cur.execute(DIFFICULTY_STATS_SQL)
        difficulty_stats = cur.fetchall()

        # 1e) courses created in the last year
        cur.execute(MONTHLY_COURSES_SQL)
        courses_last_year = {r["month"]: r["course_count"] for r in cur.fetchall()}

        # 1f) figure out the time‐range
        cur.execute("SELECT MIN(date_trunc('month', creation_date)) AS mn FROM course;")
        mn = cur.fetchone()["mn"]
        start_month = mn.date() if mn else dt.date.today().replace(day=1)
        end_month = last_completed_month()

        # 2) prepare ext_stats
        ext_stats = _dec2py(
            {
                "status_counts": status_counts,
                "category_enrollments": category_enrollments,
                "difficulty_stats": difficulty_stats,
                "courses_last_year": courses_last_year,
            }
        )

        # 3) upsert report + course_report + admin_report
        upsert_sql = """
        WITH ins AS (
          INSERT INTO report
            (report_id, report_type,
             time_range_start, time_range_end,
             description, summary)
          VALUES (%(rid)s, 'course_general',
                  %(start)s, %(end)s,
                  'site-wide course snapshot',
                  %(summary_json)s)
          ON CONFLICT (report_type, time_range_start, time_range_end)
            DO NOTHING
          RETURNING report_id
        ), chosen AS (
          SELECT report_id FROM ins
          UNION ALL
          SELECT report_id FROM report
           WHERE report_type='course_general'
             AND time_range_start=%(start)s
             AND time_range_end=%(end)s
          LIMIT 1
        ), link AS (
          INSERT INTO admin_report (admin_id, report_id)
          SELECT %(admin)s, report_id FROM chosen
          ON CONFLICT DO NOTHING
        )
        INSERT INTO course_report (
          report_id, total_courses, free_course_count,
          paid_course_count, free_enroll_count, paid_enroll_count,
          avg_enroll_per_course, total_revenue, avg_completion_rate,
          most_popular_course_id, most_completed_course_id
        )
        SELECT
          report_id,
          %(total_courses)s, %(free_course_count)s, %(paid_course_count)s,
          %(free_enroll_count)s, %(paid_enroll_count)s,
          %(avg_enroll_per_course)s, %(total_revenue)s, %(avg_completion_rate)s,
          %(most_popular_course_id)s, %(most_completed_course_id)s
        FROM chosen
        ON CONFLICT DO NOTHING;
        """
        cur.execute(
            upsert_sql,
            {
                "rid": new_report_id("CG"),
                "admin": admin_id,
                "start": start_month,
                "end": end_month,
                "summary_json": psql.Json(ext_stats),
                **_dec2py(summary),
            },
        )
        conn.commit()

        # 4) fetch report_id again
        cur.execute(
            """
            SELECT report_id
              FROM report
             WHERE report_type='course_general'
               AND time_range_start=%s
               AND time_range_end=%s
             LIMIT 1
        """,
            (start_month, end_month),
        )
        report_id = cur.fetchone()["report_id"]

        # 5) return payload
        return (
            jsonify(
                {
                    "success": True,
                    "report_type": "course_general",
                    "report_id": report_id,
                    "data": {
                        **_dec2py(summary),
                        "status_counts": status_counts,
                        "category_enrollments": _dec2py(category_enrollments),
                        "difficulty_stats": _dec2py(difficulty_stats),
                        "courses_created_last_year": courses_last_year,
                        "range": {
                            "start": start_month.strftime("%Y-%m"),
                            "end": end_month.strftime("%Y-%m"),
                        },
                    },
                }
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/course/ranged", methods=["GET"])
def course_ranged_report() -> tuple:
    # 0) validate admin_id + dates
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return jsonify({"success": False, "message": "admin_id too long"}), 400

    start_raw = request.args.get("start")
    end_raw = request.args.get("end") or start_raw
    if not start_raw:
        return jsonify({"success": False, "message": "missing start"}), 400

    try:
        sdt = parse_month(start_raw)
        edt = parse_month(end_raw)
    except ValueError:
        return jsonify({"success": False, "message": "invalid date format"}), 400
    if edt < sdt:
        return jsonify({"success": False, "message": "end < start"}), 400

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)
    try:
        # 1) Upsert parent report and link admin
        upsert_parent = """
        WITH ins AS (
          INSERT INTO report
            (report_id, report_type, time_range_start, time_range_end, description)
          VALUES (%(rid)s,'course_ranged', %(start)s, %(end)s,
                  %(desc)s)
          ON CONFLICT (report_type, time_range_start, time_range_end) DO NOTHING
          RETURNING report_id
        ), chosen AS (
          SELECT report_id FROM ins
          UNION ALL
          SELECT report_id
            FROM report
           WHERE report_type='course_ranged'
             AND time_range_start=%(start)s
             AND time_range_end=%(end)s
          LIMIT 1
        ),
        link AS (
          INSERT INTO admin_report (admin_id, report_id)
          SELECT %(admin)s, report_id FROM chosen
          ON CONFLICT DO NOTHING
        )
        SELECT report_id FROM chosen;
        """
        cur.execute(
            upsert_parent,
            {
                "rid": new_report_id("CR"),
                "admin": admin_id,
                "start": sdt,
                "end": last_day(edt),
                "desc": f"course range {start_raw} - {end_raw}",
            },
        )
        parent_id = cur.fetchone()["report_id"]

        # 2) Snapshot metrics
        cur.execute(
            """
            WITH base AS (
              SELECT price, COALESCE(enrollment_count,0) AS enrollment_count
              FROM course
              WHERE creation_date BETWEEN %s AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
            ), freepaid AS (
              SELECT COUNT(*) AS total_courses,
                     COUNT(*) FILTER (WHERE price=0) AS free_course_count,
                     COUNT(*) FILTER (WHERE price>0) AS paid_course_count
              FROM base
            ), rev AS (
              SELECT ROUND(AVG(enrollment_count)::numeric,2) AS avg_enroll_per_course,
                     COALESCE(SUM(price*enrollment_count),0) AS total_revenue
              FROM base
            )
            SELECT * FROM freepaid CROSS JOIN rev;
            """,
            (sdt, edt),
        )
        snapshot = cur.fetchone() or {}

        # 3) Most popular course
        cur.execute(
            """
            SELECT c.course_id, c.title, COUNT(e.student_id) AS enrollments,
                   c.price, u.first_name || ' ' || u.last_name AS instructor_name
            FROM enroll e
            JOIN course c ON c.course_id = e.course_id
            JOIN "user" u ON u.id = c.creator_id
            WHERE e.enroll_date BETWEEN %s AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
            GROUP BY c.course_id, c.title, c.price, u.first_name, u.last_name
            ORDER BY enrollments DESC LIMIT 1;
            """,
            (sdt, edt),
        )
        most_popular = cur.fetchone() or {}

        # 4) Most completed course
        cur.execute(
            """
            SELECT c.course_id, c.title,
                   COUNT(*) FILTER (WHERE e.progress_rate=100) AS completions,
                   CASE WHEN COUNT(*) > 0
                        THEN ROUND(100.0 * SUM((e.progress_rate=100)::int)/COUNT(*), 2)
                        ELSE 0 END AS completion_ratio,
                   c.price, u.first_name || ' ' || u.last_name AS instructor_name
            FROM enroll e
            JOIN course c ON c.course_id = e.course_id
            JOIN "user" u ON u.id = c.creator_id
            WHERE e.enroll_date BETWEEN %s AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
            GROUP BY c.course_id, c.title, c.price, u.first_name, u.last_name
            ORDER BY completions DESC LIMIT 1;
            """,
            (sdt, edt),
        )
        most_completed = cur.fetchone() or {}

        # 5) Monthly stats
        cur.execute(COURSE_RANGE_SQL, (sdt, edt) * 5)
        monthly_metrics = cur.fetchall()

        # 6) Category & difficulty stats
        cur.execute(CATEGORY_ENROLL_SQL)
        category_stats = cur.fetchall()
        cur.execute(DIFFICULTY_STATS_SQL)
        difficulty_stats = cur.fetchall()

        conn.commit()

        payload = {
            "success": True,
            "report_type": "course_ranged",
            "report_id": parent_id,
            "data": {
                "range": {"start": start_raw, "end": end_raw},
                "snapshot_metrics": _dec2py(snapshot),
                "highlights": {
                    "most_popular_course": _dec2py(most_popular),
                    "most_completed_course": _dec2py(most_completed),
                },
                "monthly_metrics": _dec2py(monthly_metrics),
                "category_stats": _dec2py(category_stats),
                "difficulty_stats": _dec2py(difficulty_stats),
            },
        }
        return jsonify(payload), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/instructor/general", methods=["GET"])
def instructor_general_report():
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return jsonify({"success": False, "message": "admin_id too long"}), 400

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)
    try:
        # 1) Determine time range
        cur.execute(
            """
            SELECT MIN(date_trunc('month', u.registration_date)) AS min_month
            FROM "user" u
            JOIN instructor i ON i.id = u.id
        """
        )
        r0 = cur.fetchone()
        raw_start = (
            r0["min_month"].date()
            if r0 and r0["min_month"]
            else dt.date.today().replace(day=1)
        )
        raw_end = last_completed_month()
        start_month, end_month = sorted((raw_start, raw_end))

        # 2) Build snapshot summary
        summary = {}

        cur.execute(TOTAL_INSTR_SQL)
        summary.update(cur.fetchone() or {})

        cur.execute(PAID_FREE_INSTR_SQL)
        summary.update(cur.fetchone() or {})

        cur.execute(AVG_COURSES_SQL)
        summary.update(cur.fetchone() or {})

        cur.execute(MOST_POP_INSTR_SQL)
        mp = cur.fetchone() or {}
        summary["most_popular_instructor_id"] = mp.get("id")
        summary["most_popular_instructor"] = mp

        cur.execute(MOST_ACTIVE_INSTR_SQL)
        ma = cur.fetchone() or {}
        summary["most_active_instructor_id"] = ma.get("id")
        summary["most_active_instructor"] = ma

        cur.execute(INSTR_AGE_SQL)
        summary.update(cur.fetchone() or {})

        cur.execute(INSTR_MONTHLY_SQL, (start_month, end_month))
        regs = cur.fetchall()
        summary["monthly_registrations"] = {
            r["month"]: r.get("registrations", r.get("registration_count", 0))
            for r in regs
        }

        cur.execute(TOP_INSTR_SQL)
        summary["top_instructors"] = cur.fetchall()

        summary["range"] = {
            "start": month_label(start_month),
            "end": month_label(end_month),
        }

        # 3) Upsert report + link + metrics
        upsert_sql = """
        WITH ins AS (
          INSERT INTO report
            (report_id, report_type,
             time_range_start, time_range_end,
             description)
          VALUES (%(rid)s, 'instructor_general',
                  %(start)s, %(end)s,
                  'site-wide instructor snapshot')
          ON CONFLICT (report_type, time_range_start, time_range_end)
            DO NOTHING
          RETURNING report_id
        ), chosen AS (
          SELECT report_id FROM ins
          UNION ALL
          SELECT report_id
          FROM report
          WHERE report_type = 'instructor_general'
            AND time_range_start = %(start)s
            AND time_range_end = %(end)s
          LIMIT 1
        ),
        link AS (
          INSERT INTO admin_report (admin_id, report_id)
          SELECT %(admin)s, report_id FROM chosen
          ON CONFLICT DO NOTHING
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
          report_id,
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
                "rid": new_report_id("IG"),
                "admin": admin_id,
                "start": start_month,
                "end": end_month,
                "total_instructors": summary["total_instructors"],
                "instructors_with_paid_course": summary["instructors_with_paid_course"],
                "instructors_with_free_course": summary["instructors_with_free_course"],
                "avg_courses_per_instructor": summary["avg_courses_per_instructor"],
                "most_popular_instructor_id": summary["most_popular_instructor_id"],
                "most_active_instructor_id": summary["most_active_instructor_id"],
                "avg_age": summary["avg_age"],
                "youngest_age": summary["youngest_age"],
                "oldest_age": summary["oldest_age"],
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
            },
        )
        conn.commit()

        # 4) Fetch report_id for response
        cur.execute(
            """
            SELECT report_id
              FROM report
             WHERE report_type = 'instructor_general'
               AND time_range_start = %s
               AND time_range_end = %s
             LIMIT 1
            """,
            (start_month, end_month),
        )
        report_id = cur.fetchone()["report_id"]

        # 5) Respond
        return (
            jsonify(
                _dec2py(
                    {
                        "success": True,
                        "report_type": "instructor_general",
                        "report_id": report_id,
                        "data": summary,
                    }
                )
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[INSTRUCTOR GENERAL ERROR] {e}", file=sys.stderr)
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/instructor/ranged", methods=["GET"])
def instructor_ranged_report() -> tuple:
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400
    if len(admin_id) > 8:
        return jsonify({"success": False, "message": "admin_id too long"}), 400

    start_raw = request.args.get("start")
    end_raw = request.args.get("end") or start_raw
    if not start_raw:
        return jsonify({"success": False, "message": "missing start"}), 400

    try:
        sdt = parse_month(start_raw)
        edt = parse_month(end_raw)
    except ValueError:
        return jsonify({"success": False, "message": "invalid date format"}), 400
    if edt < sdt:
        return jsonify({"success": False, "message": "end < start"}), 400

    # build month‐list
    months = []
    cur_m = sdt
    while cur_m <= edt:
        months.append(cur_m)
        cur_m = (cur_m + dt.timedelta(days=32)).replace(day=1)

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)
    try:
        # 1) upsert parent report + admin link
        parent_upsert_sql = """
        WITH ins AS (
          INSERT INTO report
            (report_id, report_type, time_range_start, time_range_end, description)
          VALUES (%(rid)s, 'instructor_ranged',
                  %(start)s, %(end)s,
                  %(desc)s)
          ON CONFLICT (report_type, time_range_start, time_range_end) DO NOTHING
          RETURNING report_id
        ), chosen AS (
          SELECT report_id FROM ins
          UNION ALL
          SELECT report_id FROM report
           WHERE report_type='instructor_ranged'
             AND time_range_start=%(start)s
             AND time_range_end=%(end)s
          LIMIT 1
        ),
        link AS (
          INSERT INTO admin_report (admin_id, report_id)
          SELECT %(admin)s, report_id FROM chosen
          ON CONFLICT DO NOTHING
        )
        SELECT report_id FROM chosen;
        """
        cur.execute(
            parent_upsert_sql,
            {
                "rid": new_report_id("IR"),
                "admin": admin_id,
                "start": sdt,
                "end": last_day(edt),
                "desc": f"instructor range {start_raw} - {end_raw}",
            },
        )
        parent_id = cur.fetchone()["report_id"]

        # 2) for each month, insert child header + metrics
        monthly_rows = []
        for m in months:
            cur.execute(INSTRUCTOR_RANGE_SQL, (m, m, m, m))
            one = cur.fetchone()

            # child report header
            child_id = new_report_id("IR")
            cur.execute(
                """
                INSERT INTO report
                  (report_id, report_type,
                   time_range_start, time_range_end,
                   parent_report_id, description)
                VALUES (%s, 'instructor_ranged', %s, %s, %s, %s)
                ON CONFLICT (report_type, time_range_start, time_range_end)
                  DO UPDATE SET parent_report_id = EXCLUDED.parent_report_id
                RETURNING report_id;
                """,
                (
                    child_id,
                    m,
                    last_day(m),
                    parent_id,
                    f"monthly instructor {m:%Y-%m}",
                ),
            )
            child_id = cur.fetchone()["report_id"]

            # insert metrics
            cur.execute(
                """
                INSERT INTO instructor_report
                  (report_id, registration_count, total_instructors,
                   avg_courses_per_instructor,
                   instructors_with_free_course,
                   instructors_with_paid_course,
                   avg_age, youngest_age, oldest_age)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (report_id) DO NOTHING;
                """,
                (
                    child_id,
                    one["registration_count"],
                    one["total_instructors"],
                    one["avg_courses_per_instructor"],
                    one["instructors_with_free_course"],
                    one["instructors_with_paid_course"],
                    one["avg_age"],
                    one["youngest_age"],
                    one["oldest_age"],
                ),
            )

            monthly_rows.append(one)

        # 3) overall highlights
        cur.execute(MOST_ACTIVE_IN_RANGE_SQL, (sdt, edt))
        most_active = cur.fetchone() or {}
        cur.execute(MOST_POPULAR_IN_RANGE_SQL, (sdt, edt))
        most_popular = cur.fetchone() or {}
        cur.execute(TOP_INSTR_SQL)
        top_rated = cur.fetchall()

        conn.commit()

        return (
            jsonify(
                _dec2py(
                    {
                        "success": True,
                        "report_type": "instructor_ranged",
                        "report_id": parent_id,
                        "data": {
                            "range": {"start": start_raw, "end": end_raw},
                            "monthly_stats": monthly_rows,
                            "most_active_instructor": most_active,
                            "most_popular_instructor": most_popular,
                            "top_instructors": top_rated,
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


@report_bp.route("/api/report/student/<rid>", methods=["GET"])
def get_student_report(rid: str):
    """
    Fetch any stored student report by primary key rid.
    Returns both general and ranged with enriched top_students,
    full monthly series, *and* summary metrics for ranged.
    """
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # 1) load header
        cur.execute(
            """
            SELECT report_id, report_type,
                   time_range_start, time_range_end,
                   parent_report_id
            FROM report
            WHERE report_id = %s
            """,
            (rid,),
        )
        hdr = cur.fetchone()
        if not hdr or not hdr["report_type"].startswith("student_"):
            return (
                jsonify(
                    _dec2py({"success": False, "message": "student report not found"})
                ),
                404,
            )

        # ── RANGED PARENT ───────────────────────────────
        if hdr["report_type"] == "student_ranged" and hdr["parent_report_id"] is None:
            # a) fetch monthly children
            cur.execute(
                """
                SELECT r.time_range_start AS month_start,
                       sr.*
                  FROM report r
                  JOIN student_report sr USING(report_id)
                 WHERE r.parent_report_id = %s
                 ORDER BY r.time_range_start
                """,
                (rid,),
            )
            monthly = cur.fetchall()

            # b) recompute overall top-3
            sdt, edt = hdr["time_range_start"], hdr["time_range_end"]
            cur.execute(STUDENT_RANGE_TOP_SQL, (sdt, edt))
            overall_top = cur.fetchall()

            # c) pull last-month snapshot for summary
            summary = monthly[-1] if monthly else {}
            ranged_summary = {
                "total_students": summary.get("total_students"),
                "active_student_count": summary.get("active_student_count"),
                "avg_enrollments_per_student": summary.get(
                    "avg_enrollments_per_student"
                ),
                "avg_certificate_per_student": summary.get(
                    "avg_certificate_per_student"
                ),
                "avg_completion_rate": summary.get("avg_completion_rate"),
                "avg_age": summary.get("avg_age"),
                "youngest_age": summary.get("youngest_age"),
                "oldest_age": summary.get("oldest_age"),
                "most_common_major": summary.get("most_common_major"),
                "most_common_major_count": summary.get("most_common_major_count"),
            }

            data = {
                "parent_report_id": hdr["report_id"],
                "range": {
                    "start": sdt.strftime("%Y-%m"),
                    "end": edt.strftime("%Y-%m"),
                },
                **ranged_summary,
                "monthly_stats": monthly,
                "top_students": overall_top,
            }

            return (
                jsonify(
                    _dec2py(
                        {"success": True, "report_type": "student_ranged", "data": data}
                    )
                ),
                200,
            )

        # ── GENERAL or CHILD MONTH ───────────────────────
        # fetch the stored metrics row
        cur.execute(
            "SELECT * FROM student_report WHERE report_id = %s",
            (rid,),
        )
        row = cur.fetchone()
        if not row:
            return (
                jsonify(_dec2py({"success": False, "message": "metrics row missing"})),
                500,
            )

        # enrich top-3 ids into full objects
        top_students = []
        for col in ("top1_id", "top2_id", "top3_id"):
            sid = row.get(col)
            if not sid:
                continue
            cur.execute(
                """
                WITH stats AS (
                  SELECT
                    s.certificate_count,
                    COUNT(e.course_id)   AS enroll_cnt,
                    AVG(e.progress_rate) AS avg_progress
                  FROM student s
                  LEFT JOIN enroll e ON e.student_id = s.id
                  WHERE s.id = %s
                  GROUP BY s.certificate_count
                )
                SELECT
                  u.id,
                  u.first_name || ' ' || u.last_name AS full_name,
                  s.major,
                  ROUND(
                    s.certificate_count*2
                    + stats.enroll_cnt*0.5
                    + COALESCE(stats.avg_progress,0)*0.1
                  ,2) AS achievement_score
                FROM student s
                JOIN "user" u    ON u.id = s.id
                JOIN stats       ON TRUE
                WHERE u.id = %s
                """,
                (sid, sid),
            )
            stud = cur.fetchone()
            if stud:
                top_students.append(stud)

        # fetch full monthly registrations for the snapshot case
        cur.execute(STUDENT_MONTHLY_SQL)
        regs = cur.fetchall()
        monthly_regs = {r["month"]: r["registration_count"] for r in regs}

        # assemble
        data = {
            "report_id": hdr["report_id"],
            "report_type": hdr["report_type"],
            "time_range_start": hdr["time_range_start"],
            "time_range_end": hdr["time_range_end"],
            "parent_report_id": hdr["parent_report_id"],
            **row,
            "top_students": top_students,
            "monthly_registrations": monthly_regs,
        }

        return (
            jsonify(
                _dec2py(
                    {"success": True, "report_type": hdr["report_type"], "data": data}
                )
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[STUDENT REPORT FETCH ERROR] {e}")
        return jsonify(_dec2py({"success": False, "message": str(e)})), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/instructor/<rid>", methods=["GET"])
def get_instructor_report(rid: str):
    """
    Return instructor_general or instructor_ranged reports by ID,
    enriched with full objects for top/active/popular instructors
    and monthly registrations where appropriate.
    """
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)
    try:
        # 1) load header
        cur.execute(
            """
            SELECT report_id, report_type,
                   time_range_start, time_range_end,
                   parent_report_id
            FROM report
            WHERE report_id = %s
        """,
            (rid,),
        )
        hdr = cur.fetchone()
        if not hdr or not hdr["report_type"].startswith("instructor_"):
            return (
                jsonify(
                    _dec2py(
                        {"success": False, "message": "instructor report not found"}
                    )
                ),
                404,
            )

        start = hdr["time_range_start"]
        end = hdr["time_range_end"]

        # ─── RANGED PARENT ─────────────────────────────────────
        if (
            hdr["report_type"] == "instructor_ranged"
            and hdr["parent_report_id"] is None
        ):
            # fetch monthly children
            cur.execute(
                """
                SELECT r.time_range_start AS month_start,
                       ir.*
                FROM report r
                JOIN instructor_report ir USING (report_id)
                WHERE r.parent_report_id = %s
                ORDER BY r.time_range_start
            """,
                (rid,),
            )
            monthly = cur.fetchall()

            # fetch highlights & top-3
            cur.execute(MOST_ACTIVE_IN_RANGE_SQL, (start, end))
            most_active = cur.fetchone() or {}
            cur.execute(MOST_POPULAR_IN_RANGE_SQL, (start, end))
            most_popular = cur.fetchone() or {}
            cur.execute(TOP_INSTR_SQL)
            top3 = cur.fetchall()

            data = {
                "parent_report_id": hdr["report_id"],
                "range": {
                    "start": month_label(start),
                    "end": month_label(end),
                },
                "monthly_stats": monthly,
                "most_active_instructor": most_active,
                "most_popular_instructor": most_popular,
                "top_instructors": top3,
            }
            return (
                jsonify(
                    _dec2py(
                        {
                            "success": True,
                            "report_type": "instructor_ranged",
                            "data": data,
                        }
                    )
                ),
                200,
            )

        # ─── GENERAL or CHILD MONTH ─────────────────────────────
        # fetch the stored metrics row
        cur.execute(
            """
            SELECT *
            FROM instructor_report
            WHERE report_id = %s
        """,
            (rid,),
        )
        row = cur.fetchone()
        if not row:
            return (
                jsonify(_dec2py({"success": False, "message": "metrics row missing"})),
                500,
            )

        # monthly registrations
        cur.execute(INSTR_MONTHLY_SQL, (start, end))
        regs = cur.fetchall()
        monthly_regs = {r["month"]: r["registration_count"] for r in regs}

        # top-3 overall
        cur.execute(TOP_INSTR_SQL)
        top3 = cur.fetchall()

        # most-popular & most-active overall
        cur.execute(MOST_POP_INSTR_SQL)
        mp = cur.fetchone() or {}
        cur.execute(MOST_ACTIVE_INSTR_SQL)
        ma = cur.fetchone() or {}

        data = {
            **row,
            "range": {
                "start": month_label(start),
                "end": month_label(end),
            },
            "monthly_registrations": monthly_regs,
            "top_instructors": top3,
            "most_popular_instructor": mp,
            "most_active_instructor": ma,
        }

        return (
            jsonify(
                _dec2py(
                    {"success": True, "report_type": hdr["report_type"], "data": data}
                )
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[INSTRUCTOR REPORT FETCH ERROR] {e}")
        return jsonify(_dec2py({"success": False, "message": str(e)})), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/course/<rid>", methods=["GET"])
def get_course_report(rid: str):
    """
    Return course_general or course_ranged reports by ID,
    enriched with full titles, names, prices, and extra stats.
    For a course_ranged parent, re-query the raw SQL so nothing is null,
    and look up course details for the most_popular and most_completed IDs.
    """
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)
    try:
        # 1) load header
        cur.execute(
            """
            SELECT report_id,
                   report_type,
                   time_range_start,
                   time_range_end,
                   parent_report_id
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

        start = hdr["time_range_start"]
        end = hdr["time_range_end"]

        # avoid UnboundLocalError if we skip the ranged-parent branch
        raw = None

        # ─── RANGED PARENT ─────────────────────────────────────
        if hdr["report_type"] == "course_ranged" and hdr["parent_report_id"] is None:
            # a) re-run the monthly series
            cur.execute(COURSE_RANGE_SQL, (start, end) * 5)
            raw = cur.fetchall()

            monthly_metrics = []
            for r in raw:
                pop_id = r["most_popular_course_id"]
                comp_id = r["most_completed_course_id"]

                # look up most popular course details
                pop_details = {}
                if pop_id:
                    cur.execute(
                        """
                        SELECT c.title, c.price, u.first_name || ' ' || u.last_name AS instructor_name
                        FROM course c
                        JOIN "user" u ON u.id = c.creator_id
                        WHERE c.course_id = %s
                        """,
                        (pop_id,),
                    )
                    pop_details = cur.fetchone() or {}

                # look up most completed course details
                comp_details = {}
                if comp_id:
                    cur.execute(
                        """
                        SELECT c.title, c.price, u.first_name || ' ' || u.last_name AS instructor_name
                        FROM course c
                        JOIN "user" u ON u.id = c.creator_id
                        WHERE c.course_id = %s
                        """,
                        (comp_id,),
                    )
                    comp_details = cur.fetchone() or {}

                monthly_metrics.append(
                    {
                        "month": r["month"],
                        "new_course_count": r["new_course_count"],
                        "enroll_count": r["enroll_count"],
                        "total_revenue": float(r["total_revenue"]),
                        "avg_completion_rate": float(r["avg_completion_rate"]),
                        "free_enroll_count": r["free_enroll_count"],
                        "paid_enroll_count": r["paid_enroll_count"],
                        "most_popular_course": {
                            "id": pop_id,
                            "title": pop_details.get("title"),
                            "price": pop_details.get("price"),
                            "instructor_name": pop_details.get("instructor_name"),
                        },
                        "most_completed_course": {
                            "id": comp_id,
                            "title": comp_details.get("title"),
                            "price": comp_details.get("price"),
                            "instructor_name": comp_details.get("instructor_name"),
                        },
                    }
                )

            # b) re-run category & difficulty stats
            cur.execute(CATEGORY_ENROLL_SQL)
            category_stats = cur.fetchall()

            cur.execute(DIFFICULTY_STATS_SQL)
            difficulty_stats = cur.fetchall()

            return (
                jsonify(
                    {
                        "success": True,
                        "report_type": "course_ranged",
                        "data": {
                            "parent_report_id": rid,
                            "range": {
                                "start": month_label(start),
                                "end": month_label(end),
                            },
                            "category_stats": category_stats,
                            "difficulty_stats": difficulty_stats,
                            "monthly_metrics": monthly_metrics,
                        },
                    }
                ),
                200,
            )

        # ─── GENERAL or CHILD MONTH ─────────────────────────────
        # a) re-run general snapshot
        cur.execute(COURSE_GENERAL_SQL)
        summary = cur.fetchone() or {}

        # b) re-run extras
        cur.execute(
            """
            SELECT
              ROUND(AVG(e.progress_rate)::numeric,2) AS avg_completion_rate,
              COUNT(*) FILTER (WHERE c.price=0)   AS free_enroll_count,
              COUNT(*) FILTER (WHERE c.price>0)   AS paid_enroll_count
            FROM enroll e
            JOIN course c ON c.course_id = e.course_id
            """
        )
        summary.update(cur.fetchone() or {})

        # c) status_counts, category, difficulty, last_year
        cur.execute(STATUS_COUNTS_SQL)
        status_counts = {r["status"]: r["count"] for r in cur.fetchall()}

        cur.execute(CATEGORY_ENROLL_SQL)
        category_enrollments = cur.fetchall()

        cur.execute(DIFFICULTY_STATS_SQL)
        difficulty_stats = cur.fetchall()

        cur.execute(MONTHLY_COURSES_SQL)
        courses_last_year = {r["month"]: r["course_count"] for r in cur.fetchall()}

        data = {
            **summary,
            "status_counts": status_counts,
            "category_enrollments": category_enrollments,
            "difficulty_stats": difficulty_stats,
            "courses_created_last_year": courses_last_year,
            "range": {
                "start": month_label(start),
                "end": month_label(end),
            },
        }

        return (
            jsonify({"success": True, "report_type": hdr["report_type"], "data": data}),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[COURSE REPORT FETCH ERROR] {e}", file=sys.stderr)
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/list", methods=["GET"])
def list_reports():
    admin_id = (request.args.get("admin_id") or "").strip()
    if not admin_id:
        return jsonify({"success": False, "message": "missing admin_id"}), 400

    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psql.RealDictCursor)
    try:
        # List all reports associated with the admin
        cur.execute(
            """
            SELECT r.report_id,
                   r.report_type,
                   r.time_range_start,
                   r.time_range_end,
                   r.creation_date
              FROM report r
              JOIN admin_report ar ON ar.report_id = r.report_id
             WHERE ar.admin_id = %s AND r.parent_report_id IS NULL
             ORDER BY r.creation_date DESC
            """,
            (admin_id,),
        )
        rows = cur.fetchall()

        reports = [
            {
                "report_id": r["report_id"],
                "report_type": r["report_type"],
                "time_range_start": r["time_range_start"].isoformat(),
                "time_range_end": r["time_range_end"].isoformat(),
                "generated_at": r["creation_date"].isoformat(),
            }
            for r in rows
        ]

        return jsonify({"success": True, "data": {"reports": reports}}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()
