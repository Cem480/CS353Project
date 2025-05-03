from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras

feedback_bp = Blueprint("feedback", __name__)


@feedback_bp.route("/api/feedback/<course_id>/<student_id>", methods=["POST"])
def give_feedback(course_id, student_id):
    data = request.json
    if not all(field in data for field in ["rating", "comment"]):
        return jsonify({"success": False, "message": "Missing fields"}), 400

    try:
        rating = int(data["rating"])
        if rating < 0 or rating > 5:
            return jsonify({"success": False, "message": "Rating must be between 0 and 5"}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Rating must be an integer"}), 400


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
        
        # Check if student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Student not found"}), 404

        # Check if user is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403
        
        # Check if progress_rate is 100
        cursor.execute("""
            SELECT progress_rate FROM enroll
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        result = cursor.fetchone()

        if not result:
            return jsonify({"success": False, "message": "Enrollment not found"}), 404
        if result["progress_rate"] < 100:
            return jsonify({"success": False, "message": "You must complete the course (100%) to give feedback"}), 403

        # Check if feedback already exists
        cursor.execute("""
            SELECT 1 FROM feedback WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "You have already submitted feedback for this course"}), 409  # Conflict

        cursor.execute("""
            INSERT INTO feedback (course_id, student_id, rating, comment, feedback_date)
            VALUES (%s, %s, %s, %s, CURRENT_DATE)
        """, (course_id, student_id, int(data["rating"]), data["comment"]))
        
        conn.commit()
        return jsonify({"success": True}), 201
    
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# get feedbacks for a course
@feedback_bp.route("/api/feedback/<course_id>", methods=["GET"])
def get_course_feedback(course_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Check if course exists and is accepted
        cursor.execute("""
            SELECT status FROM course WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403
  
        cursor.execute("""
            SELECT f.rating, f.comment, f.feedback_date, u.first_name, u.last_name
            FROM feedback f
            JOIN student s ON f.student_id = s.id
            JOIN "user" u ON s.id = u.id
            WHERE f.course_id = %s
            ORDER BY f.feedback_date DESC
        """, (course_id,))
        rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# get average feedback and feedback count for a course
@feedback_bp.route("/api/feedback/<course_id>/summary", methods=["GET"])
def get_course_feedback_summary(course_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Check if course exists and is accepted
        cursor.execute("""
            SELECT status FROM course WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403

        cursor.execute("""
            SELECT 
                course_id, 
                ROUND(AVG(rating), 2) AS avg_rating, 
                COUNT(*) AS total_reviews
            FROM feedback
            WHERE course_id = %s
            GROUP BY course_id
        """, (course_id,))
        result = cursor.fetchone()
        if result:
            return jsonify(dict(result))
        else:
            return jsonify({"course_id": course_id, "avg_rating": 0.0, "total_reviews": 0})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
