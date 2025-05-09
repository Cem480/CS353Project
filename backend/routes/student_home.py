from flask import Blueprint, request, jsonify
from db import connect_project_db

student_home_bp = Blueprint("student_home_bp", __name__)

@student_home_bp.route("/api/student/<student_id>/info", methods=["GET"])
def get_student_info(student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if this is a student
        cursor.execute('SELECT 1 FROM student WHERE id = %s', (student_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Student not found"}), 404

        cursor.execute("""
            SELECT first_name, middle_name, last_name, email
            FROM "user"
            WHERE id = %s AND role = 'student'
        """, (student_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        keys = [desc[0] for desc in cursor.description]
        return jsonify(dict(zip(keys, user)))
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()


@student_home_bp.route("/api/student/<student_id>/recommended-courses/all", methods=["GET"])
def get_all_recommended_courses(student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        cursor.execute("""
            (
                SELECT *, 1 AS priority
                FROM recommended_course_base
                WHERE category IN (
                    SELECT category FROM enrolled_course_categories WHERE student_id = %s
                )
                AND course_id NOT IN (
                    SELECT course_id FROM enroll WHERE student_id = %s
                )
            )
            UNION
            (
                SELECT *, 2 AS priority
                FROM recommended_course_base
                WHERE course_id NOT IN (
                    SELECT course_id FROM enroll WHERE student_id = %s
                )
            )
            ORDER BY priority, enrollment_count DESC, course_id
        """, (student_id, student_id, student_id))

        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]
        return jsonify([dict(zip(keys, row)) for row in rows])

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@student_home_bp.route("/api/student/<student_id>/recommended-courses/top10", methods=["GET"])
def get_top10_recommended_courses(student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        cursor.execute("""
            (
                SELECT *, 1 AS priority
                FROM recommended_course_base
                WHERE category IN (
                    SELECT category FROM enrolled_course_categories WHERE student_id = %s
                )
                AND course_id NOT IN (
                    SELECT course_id FROM enroll WHERE student_id = %s
                )
            )
            UNION
            (
                SELECT *, 2 AS priority
                FROM recommended_course_base
                WHERE course_id NOT IN (
                    SELECT course_id FROM enroll WHERE student_id = %s
                )
            )
            ORDER BY priority, enrollment_count DESC, course_id
            LIMIT 10
        """, (student_id, student_id, student_id))

        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]
        return jsonify([dict(zip(keys, row)) for row in rows])

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@student_home_bp.route("/api/student/<student_id>/recommended-courses/search", methods=["GET"])
def search_recommended_courses(student_id):
    search_term = request.args.get("q", "")
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        query = f"""
            (
                SELECT *, 1 AS priority
                FROM recommended_course_base
                WHERE category IN (
                    SELECT category FROM enrolled_course_categories WHERE student_id = %s
                )
                AND course_id NOT IN (
                    SELECT course_id FROM enroll WHERE student_id = %s
                )
            )
            UNION
            (
                SELECT *, 2 AS priority
                FROM recommended_course_base
                WHERE course_id NOT IN (
                    SELECT course_id FROM enroll WHERE student_id = %s
                )
            )
        """
        cursor.execute(query, (student_id, student_id, student_id))
        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]

        filtered = []
        for row in rows:
            course = dict(zip(keys, row))
            if search_term.lower() in course["title"].lower() or search_term.lower() in course["category"].lower():
                filtered.append(course)

        filtered = sorted(filtered, key=lambda x: (x["priority"], -x["enrollment_count"], x["course_id"]))
        return jsonify(filtered)

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@student_home_bp.route("/api/student/<student_id>/recommended-categories/all", methods=["GET"])
def get_all_recommended_categories(student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        cursor.execute("""
            WITH all_categories AS (
                SELECT category, course_count, 1 AS priority
                FROM recommended_category_base
                WHERE category IN (
                    SELECT category
                    FROM enrolled_course_categories
                    WHERE student_id = %s
                )
                UNION ALL
                SELECT category, course_count, 2 AS priority
                FROM recommended_category_base
            ),
            ranked AS (
                SELECT *, ROW_NUMBER() OVER (
                    PARTITION BY category
                    ORDER BY priority, course_count DESC
                ) AS rn
                FROM all_categories
            )
            SELECT category, course_count, priority
            FROM ranked
            WHERE rn = 1
            ORDER BY priority, course_count DESC;
        """, (student_id,))    

        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]
        return jsonify([dict(zip(keys, row)) for row in rows])
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@student_home_bp.route("/api/student/<student_id>/recommended-categories/top5", methods=["GET"])
def get_top5_recommended_categories(student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        cursor.execute("""
            WITH all_categories AS (
                SELECT category, course_count, 1 AS priority
                FROM recommended_category_base
                WHERE category IN (
                    SELECT category
                    FROM enrolled_course_categories
                    WHERE student_id = %s
                )
                UNION ALL
                SELECT category, course_count, 2 AS priority
                FROM recommended_category_base
            ),
            ranked AS (
                SELECT *, ROW_NUMBER() OVER (
                    PARTITION BY category
                    ORDER BY priority, course_count DESC
                ) AS rn
                FROM all_categories
            )
            SELECT category, course_count, priority
            FROM ranked
            WHERE rn = 1
            ORDER BY priority, course_count DESC
            LIMIT 5;
        """, (student_id,))

        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]
        return jsonify([dict(zip(keys, row)) for row in rows])
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@student_home_bp.route("/api/student/<student_id>/enrolled-courses", methods=["GET"])
def get_enrolled_courses(student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if the student exists
        cursor.execute('SELECT 1 FROM student WHERE id = %s', (student_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Student not found"}), 404

        # Fetch enrolled courses with progress
        cursor.execute("""
            SELECT
                c.course_id,
                c.title,
                c.category,
                u.first_name || ' ' || u.last_name AS instructor,
                e.progress_rate
            FROM enroll e
            JOIN course c ON e.course_id = c.course_id
            JOIN instructor i ON c.creator_id = i.id
            JOIN "user" u ON i.id = u.id
            WHERE e.student_id = %s;
        """, (student_id,))

        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]

        course_list = [dict(zip(keys, row)) for row in rows]

        return jsonify(course_list)

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()