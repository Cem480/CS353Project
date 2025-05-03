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

@user_course_bp.route("/api/submit/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["POST"])
def submit_task(course_id, sec_id, content_id, student_id):
    data = request.json
    if "answers" not in data:
        return jsonify({"success": False, "message": "Missing fields"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # Check if user is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403
        
        cursor.execute("""
            INSERT INTO submit (course_id, sec_id, content_id, student_id, grade, submission_date, answers)
            VALUES (%s, %s, %s, %s, NULL, CURRENT_DATE, %s)
        """, (course_id, sec_id, content_id, student_id, data["answers"]))
        conn.commit()
        return jsonify({"success": True}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@user_course_bp.route("/api/grade/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["PUT"])
def assign_grade(course_id, sec_id, content_id, student_id):
    data = request.json
    if "grade" not in data:
        return jsonify({"success": False, "message": "Missing grade"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
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

@user_course_bp.route("/api/complete/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["POST"])
def complete_content(course_id, sec_id, content_id, student_id):
    data = request.json
    if "is_completed" not in data:
        return jsonify({"success": False, "message": "Missing is_completed"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # Check if user is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403
        
        cursor.execute("""
            INSERT INTO complete (course_id, sec_id, content_id, student_id, is_completed)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (course_id, sec_id, content_id, student_id) DO UPDATE SET is_completed = EXCLUDED.is_completed
        """, (course_id, sec_id, content_id, student_id, data["is_completed"]))
        conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# feedback was here

@user_course_bp.route("/api/comment/<course_id>/<sec_id>/<content_id>/<user_id>", methods=["POST"])
def add_comment(course_id, sec_id, content_id, user_id):
    data = request.json
    if "text" not in data:
        return jsonify({"success": False, "message": "Missing comment text"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # Get user role
        cursor.execute("""
            SELECT role FROM "user" WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        if user is None:
            return jsonify({"success": False, "message": "User not found"}), 404

        role = user["role"]

        # Allow if user is admin
        if role == "admin":
            allowed = True
        # Allow if user is instructor of this course
        elif role == "instructor":
            cursor.execute("""
                SELECT 1 FROM course WHERE course_id = %s AND creator_id = %s
            """, (course_id, user_id))
            allowed = cursor.fetchone() is not None
        # Allow if user is student and enrolled
        elif role == "student":
            cursor.execute("""
                SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
            """, (course_id, user_id))
            allowed = cursor.fetchone() is not None
        else:
            allowed = False

        if not allowed:
            return jsonify({"success": False, "message": "User is not authorized to comment"}), 403
        
        cursor.execute("""
            INSERT INTO comment (course_id, sec_id, content_id, user_id, text, timestamp)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """, (course_id, sec_id, content_id, user_id, data["text"]))
        conn.commit()
        return jsonify({"success": True}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
