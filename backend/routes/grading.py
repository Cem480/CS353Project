from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras

grading_bp = Blueprint("grading", __name__)

@grading_bp.route("/api/grade/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["PUT"])
def assign_grade(course_id, sec_id, content_id, student_id):
    data = request.json
    if "grade" not in data:
        return jsonify({"success": False, "message": "Missing grade"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:

        # Check if course exists and is accepted
        cursor.execute("""
            SELECT status FROM course WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403
        
        # Check if user is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403
        
        cursor.execute("""
            UPDATE submit SET grade = %s 
            WHERE course_id = %s AND sec_id = %s AND content_id = %s AND student_id = %s
        """, (int(data["grade"]), course_id, sec_id, content_id, student_id))
        conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@grading_bp.route("/api/instructor/<instructor_id>/ungraded-submissions", methods=["GET"])
def get_ungraded_submissions(instructor_id):
    sort = request.args.get("sort", "newest")
    limit = request.args.get("limit", type=int, default=10)
    offset = request.args.get("offset", type=int, default=0)

    # ORDER BY options
    sort_options = {
        "newest": "s.submission_date DESC",
        "oldest": "s.submission_date ASC",
        "student": "u.last_name ASC, u.first_name ASC",
        "course": "co.title ASC"
    }
    order_by_clause = sort_options.get(sort, "s.submission_date DESC")

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        cursor.execute(f"""
            SELECT s.course_id, s.sec_id, s.content_id, s.student_id, s.submission_date,
                   u.first_name, u.last_name,
                   c.title AS content_title,
                   co.title AS course_title
            FROM submit s
            JOIN course co ON co.course_id = s.course_id
            JOIN content c ON c.course_id = s.course_id AND c.sec_id = s.sec_id AND c.content_id = s.content_id
            JOIN "user" u ON u.id = s.student_id
            WHERE s.grade IS NULL AND co.creator_id = %s
            ORDER BY {order_by_clause}
            LIMIT %s OFFSET %s
        """, (instructor_id, limit, offset))
        rows = cursor.fetchall()

        return jsonify({"success": True, "submissions": [dict(row) for row in rows]}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
