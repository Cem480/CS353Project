from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras
from datetime import datetime

user_course_bp = Blueprint("user_course", __name__)

@user_course_bp.route("/api/enroll/<course_id>/<student_id>", methods=["POST"])
def enroll(course_id, student_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # Check if course is accepted
        cursor.execute("""
            SELECT status FROM course WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()

        if course is None:
            return jsonify({"success": False, "message": "Course not found"}), 404

        if course["status"] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403
        
        # Check if user is a student
        cursor.execute('SELECT role FROM "user" WHERE id = %s', (student_id,))
        user = cursor.fetchone()
        if not user or user["role"] != "student":
            return jsonify({"success": False, "message": "Only students can enroll"}), 403
        
        cursor.execute("""
            INSERT INTO enroll (course_id, student_id, enroll_date, progress_rate)
            VALUES (%s, %s, CURRENT_DATE, 0)
        """, (course_id, student_id))
        conn.commit()
        return jsonify({"success": True}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@user_course_bp.route("/api/enroll/check/<course_id>/<student_id>", methods=["GET"])
def check_enrollment(course_id, student_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        enrolled = cursor.fetchone() is not None
        return jsonify({"enrolled": enrolled})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# submit task was here

# assign grade was here

# complete content was here

# feedback was here

# comment was here