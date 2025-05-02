# generate_report.py
"""Blueprint that exposes admin reporting endpoints.

Available endpoints:
* **GET /api/report/student/general**    – site-wide student metrics
* **GET /api/report/student/ranged**     – student metrics between selected months
* **GET /api/report/course/general**     – site-wide course metrics
* **GET /api/report/instructor/general** – site-wide instructor metrics

Install with:
```python
from routes/generate_report import report_bp
app.register_blueprint(report_bp)
```
"""

from flask import Blueprint, jsonify, request
from db import connect_project_db
import psycopg2.extras
from datetime import datetime

report_bp = Blueprint("report", __name__)


def parse_month(month_str):
    month_str = month_str.strip()
    return datetime.strptime(month_str + "-01", "%Y-%m-%d")


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
# SQL: Student ranged metrics
# ────────────────────────────────────────────────────────────────────────────────
STUDENT_RANGE_SQL = """
WITH months AS (
    SELECT generate_series(
        date_trunc('month', %s::date),
        date_trunc('month', %s::date),
        '1 month') AS m
),
stats AS (
    SELECT date_trunc('month', u.registration_date) AS m,
           COUNT(*) AS registration_count,
           COUNT(*) FILTER(WHERE s.account_status='active') AS active_students
    FROM "user" u
    JOIN student s ON s.id = u.id
    WHERE u.registration_date BETWEEN %s AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
    GROUP BY m
),
cumulative AS (
    SELECT months.m AS m,
           (SELECT COUNT(*) FROM "user" ux JOIN student sx ON sx.id=ux.id
            WHERE ux.registration_date <= months.m + INTERVAL '1 month' - INTERVAL '1 day') AS total_students
    FROM months
),
enrolls AS (
    SELECT sub.m AS m,
           ROUND(AVG(sub.enroll_cnt)::numeric,2) AS avg_enroll_per_student,
           ROUND(AVG(s.certificate_count)::numeric,2) AS avg_cert_per_student,
           ROUND(AVG(sub.avg_progress)::numeric,2) AS avg_completion_rate
    FROM student s
    JOIN "user" u ON u.id = s.id
    LEFT JOIN (
        SELECT student_id,
               date_trunc('month', enroll_date) AS m,
               COUNT(*) AS enroll_cnt,
               AVG(progress_rate) AS avg_progress
        FROM enroll
        WHERE enroll_date BETWEEN %s AND %s
        GROUP BY student_id, m
    ) sub ON sub.student_id = s.id
    WHERE u.registration_date BETWEEN %s AND %s
    GROUP BY sub.m
),
out AS (
    SELECT TO_CHAR(months.m,'YYYY-MM') AS month,
           COALESCE(stats.registration_count,0)  AS registration_count,
           COALESCE(cumulative.total_students,0) AS total_students,
           COALESCE(stats.active_students,0)     AS active_students,
           COALESCE(enrolls.avg_enroll_per_student,0) AS avg_enroll_per_student,
           COALESCE(enrolls.avg_cert_per_student,0)  AS avg_cert_per_student,
           COALESCE(enrolls.avg_completion_rate,0)  AS avg_completion_rate
    FROM months
    LEFT JOIN stats       ON stats.m = months.m
    LEFT JOIN cumulative  ON cumulative.m = months.m
    LEFT JOIN enrolls     ON enrolls.m = months.m
)
SELECT * FROM out ORDER BY month;
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
# SQL: Instructor ranged metrics
# ────────────────────────────────────────────────────────────────────────────────
INSTRUCTOR_RANGE_SQL = """
WITH months AS (
  SELECT generate_series(
    date_trunc('month', %s::date),
    date_trunc('month', %s::date),
    '1 month'
  ) AS m
),
regs AS (
  SELECT date_trunc('month', u.registration_date) AS m,
         COUNT(*) AS registration_count
  FROM "user" u
  JOIN instructor i ON i.id = u.id
  WHERE u.registration_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY m
),
pop AS (
  SELECT c.creator_id AS instructor_id,
         COUNT(e.student_id) AS total_enrollments
  FROM enroll e
  JOIN course c ON c.course_id = e.course_id
  WHERE e.enroll_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY c.creator_id
  ORDER BY total_enrollments DESC
  LIMIT 1
),
act AS (
  SELECT creator_id AS instructor_id,
         COUNT(*) AS course_count
  FROM course
  WHERE creation_date BETWEEN %s
        AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
  GROUP BY creator_id
  ORDER BY course_count DESC
  LIMIT 1
)
SELECT
  TO_CHAR(months.m, 'YYYY-MM') AS month,
  COALESCE(r.registration_count, 0) AS registration_count,

  /* full JSON object for most popular instructor */
  json_build_object(
    'id', pop.instructor_id,
    'full_name', u_pop.first_name || ' ' || u_pop.last_name,
    'total_enrollments', pop.total_enrollments
  ) AS most_popular_instructor,

  /* full JSON object for most active instructor */
  json_build_object(
    'id', act.instructor_id,
    'full_name', u_act.first_name || ' ' || u_act.last_name,
    'course_count', act.course_count
  ) AS most_active_instructor

FROM months
LEFT JOIN regs r ON r.m = months.m
LEFT JOIN pop ON TRUE
LEFT JOIN "user" u_pop ON u_pop.id = pop.instructor_id
LEFT JOIN act ON TRUE
LEFT JOIN "user" u_act ON u_act.id = act.instructor_id
ORDER BY months.m;
"""


@report_bp.route("/api/report/student/general", methods=["GET"])
def student_general_report():
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # 1) summary stats
        cur.execute(STUDENT_GENERAL_SQL)
        summary = cur.fetchone() or {}

        # 2) monthly registrations
        cur.execute(STUDENT_MONTHLY_SQL)
        rows = cur.fetchall()
        summary["monthly_registrations"] = {
            r["month"]: r["registration_count"] for r in rows
        }

        # 3) top-3 students
        cur.execute(STUDENT_TOP_SQL)
        summary["top_students"] = cur.fetchall()

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
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end or start.strip() == end.strip():
        return jsonify({"success": False, "message": "Invalid range"}), 400

    sdt, edt = parse_month(start), parse_month(end)
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        # 1) month-by-month stats
        cur.execute(STUDENT_RANGE_SQL, (sdt, edt, sdt, edt, sdt, edt, sdt, edt))
        monthly = cur.fetchall()

        # 2) top-3 achievers in that range
        cur.execute(STUDENT_RANGE_TOP_SQL, (sdt, edt))
        top3 = cur.fetchall()

        return (
            jsonify(
                {
                    "success": True,
                    "report_type": "student_ranged",
                    "data": {"monthly_stats": monthly, "top_students": top3},
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
def course_general_report():
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(COURSE_GENERAL_SQL)
        summary = cur.fetchone() or {}
        cur.execute(STATUS_COUNTS_SQL)
        rows = cur.fetchall()
        status_counts = {r["status"]: r["count"] for r in rows}
        for st in ["accepted", "rejected"]:
            status_counts.setdefault(st, 0)
        cur.execute(CATEGORY_ENROLL_SQL)
        categories = cur.fetchall()
        cur.execute(DIFFICULTY_STATS_SQL)
        difficulties = cur.fetchall()
        cur.execute(MONTHLY_COURSES_SQL)
        mc = cur.fetchall()
        courses_last_year = {r["month"]: r["course_count"] for r in mc}
        return (
            jsonify(
                {
                    "success": True,
                    "report_type": "course_general",
                    "data": {
                        **summary,
                        "status_counts": status_counts,
                        "category_enrollments": categories,
                        "difficulty_stats": difficulties,
                        "courses_created_last_year": courses_last_year,
                    },
                }
            ),
            200,
        )
    except Exception as e:
        conn.rollback()
        print(f"[COURSE GENERAL ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/course/ranged", methods=["GET"])
def course_ranged_report():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end or start.strip() == end.strip():
        return jsonify({"success": False, "message": "Invalid range"}), 400

    sdt, edt = parse_month(start), parse_month(end)
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # 5 CTEs each with BETWEEN → total 5*2 = 10 placeholders
        params = (sdt, edt) * 5
        cur.execute(COURSE_RANGE_SQL, params)
        monthly = cur.fetchall()

        # category breakdown per month
        cat_sql = """
        SELECT
          TO_CHAR(date_trunc('month', e.enroll_date),'YYYY-MM') AS month,
          c.category,
          COUNT(*) AS enroll_count
        FROM enroll e
        JOIN course c ON c.course_id = e.course_id
        WHERE e.enroll_date BETWEEN %s
              AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
        GROUP BY month, c.category
        ORDER BY month;
        """
        cur.execute(cat_sql, (sdt, edt))
        category_stats = cur.fetchall()

        # difficulty breakdown per month
        diff_sql = """
        SELECT
          TO_CHAR(date_trunc('month', e.enroll_date),'YYYY-MM') AS month,
          c.difficulty_level,
          COUNT(*) AS enroll_count,
          ROUND(AVG(e.progress_rate)::numeric,2) AS avg_completion_rate
        FROM enroll e
        JOIN course c ON c.course_id = e.course_id
        WHERE e.enroll_date BETWEEN %s
              AND (%s + INTERVAL '1 month' - INTERVAL '1 day')
        GROUP BY month, c.difficulty_level
        ORDER BY month;
        """
        cur.execute(diff_sql, (sdt, edt))
        difficulty_stats = cur.fetchall()

        return (
            jsonify(
                {
                    "success": True,
                    "report_type": "course_ranged",
                    "data": {
                        "monthly_metrics": monthly,
                        "category_stats": category_stats,
                        "difficulty_stats": difficulty_stats,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print(f"[COURSE RANGED ERROR] {e}")
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cur.close()
        conn.close()


@report_bp.route("/api/report/instructor/general", methods=["GET"])
def instructor_general_report():
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(TOTAL_INSTR_SQL)
        summary = cur.fetchone() or {}
        cur.execute(PAID_FREE_INSTR_SQL)
        summary.update(cur.fetchone() or {})
        cur.execute(AVG_COURSES_SQL)
        summary.update(cur.fetchone() or {})
        cur.execute(MOST_POP_INSTR_SQL)
        summary["most_popular_instructor"] = cur.fetchone() or {}
        cur.execute(MOST_ACTIVE_INSTR_SQL)
        summary["most_active_instructor"] = cur.fetchone() or {}
        cur.execute(INSTR_AGE_SQL)
        summary.update(cur.fetchone() or {})
        cur.execute(INSTR_MONTHLY_SQL)
        mr = cur.fetchall()
        summary["monthly_registrations"] = {r["month"]: r["registrations"] for r in mr}
        cur.execute(TOP_INSTR_SQL)
        summary["top_instructors"] = cur.fetchall()
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


@report_bp.route("/api/report/instructor/ranged", methods=["GET"])
def instructor_ranged_report():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end or start.strip() == end.strip():
        return jsonify({"success": False, "message": "Invalid range"}), 400

    sdt, edt = parse_month(start), parse_month(end)
    conn = connect_project_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # We need 4 BETWEEN clauses → 8 params
        params = (sdt, edt, sdt, edt, sdt, edt, sdt, edt)
        cur.execute(INSTRUCTOR_RANGE_SQL, params)
        monthly = cur.fetchall()

        # Top 3 instructors by rating (static)
        cur.execute(TOP_INSTR_SQL)
        top3 = cur.fetchall()

        return (
            jsonify(
                {
                    "success": True,
                    "report_type": "instructor_ranged",
                    "data": {
                        "monthly_registrations": monthly,
                        "most_popular": monthly[0].get("most_popular_instructor"),
                        "most_active": monthly[0].get("most_active_instructor"),
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
