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

@user_course_bp.route("/api/feedback/<course_id>/<student_id>", methods=["POST"])
def give_feedback(course_id, student_id):
    data = request.json
    if not all(field in data for field in ["rating", "comment"]):
        return jsonify({"success": False, "message": "Missing fields"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # ✅ Check if progress_rate is 100
        cursor.execute("""
            SELECT progress_rate FROM enroll
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        result = cursor.fetchone()

        if not result:
            return jsonify({"success": False, "message": "Enrollment not found"}), 404
        if result["progress_rate"] < 100:
            return jsonify({"success": False, "message": "You must complete the course (100%) to give feedback"}), 403

        cursor.execute("""
            INSERT INTO feedback (course_id, student_id, rating, comment, feedback_date)
            VALUES (%s, %s, %s, %s, CURRENT_DATE)
            ON CONFLICT (course_id, student_id) DO UPDATE 
            SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, feedback_date = CURRENT_DATE
        """, (course_id, student_id, int(data["rating"]), data["comment"]))
        conn.commit()
        return jsonify({"success": True}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@user_course_bp.route("/api/comment/<course_id>/<sec_id>/<content_id>/<user_id>", methods=["POST"])
def add_comment(course_id, sec_id, content_id, user_id):
    data = request.json
    if "text" not in data:
        return jsonify({"success": False, "message": "Missing comment text"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # Check if user is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, user_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403

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




# Certificate will be added
# Financial aid will be added