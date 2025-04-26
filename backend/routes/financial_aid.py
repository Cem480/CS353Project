from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras

financial_aid_bp = Blueprint("financial_aid", __name__)

# Financial Aid Functions
# To apply financial aid
@financial_aid_bp.route("/api/financial_aid/<course_id>/<student_id>", methods=["POST"])
def apply_financial_aid(course_id, student_id):
    data = request.json
    required_fields = ["income", "statement"]

    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "Missing income or statement field!"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # Check if course exists
        cursor.execute("SELECT 1 FROM course WHERE course_id = %s", (course_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Course not found!"}), 404
        
        # Check if student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Student not found!"}), 404

        # Check if already applied
        cursor.execute("""
            SELECT 1 FROM apply_financial_aid
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "Already applied!"}), 409
        
        # Check if student is already enrolled
        cursor.execute("""
            SELECT 1 FROM enroll
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "Already enrolled in this course!"}), 409

        # Insert the application
        cursor.execute("""
            INSERT INTO apply_financial_aid (course_id, student_id, income, statement)
            VALUES (%s, %s, %s, %s)
        """, (course_id, student_id, float(data["income"]), data["statement"]))

        conn.commit()
        return jsonify({"success": True, "message": "Financial aid application submitted"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# To evaluate a financial aid application
@financial_aid_bp.route("/api/financial_aid/evaluate/<course_id>/<student_id>/<instructor_id>", methods=["POST"])
def evaluate_financial_aid(course_id, student_id, instructor_id):
    data = request.json
    if "is_accepted" not in data:
        return jsonify({"success": False, "message": "Missing is_accepted field"}), 400

    is_accepted = data["is_accepted"]

    if not isinstance(is_accepted, bool):
        return jsonify({"success": False, "message": "is_accepted must be a boolean"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        # Check if course exists
        cursor.execute("SELECT 1 FROM course WHERE course_id = %s", (course_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Course not found!"}), 404
        
        # Check if student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Student not found!"}), 404
        
        # Check if instructor exists
        cursor.execute("""
            SELECT 1 FROM instructor WHERE id = %s
        """, (instructor_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Instructor not found!"}), 404

        # Check if financial aid application exists
        cursor.execute("""
            SELECT 1 FROM apply_financial_aid
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "No financial aid application found!"}), 404

        # Insert or update evaluation
        cursor.execute("""
            INSERT INTO evaluate_financial_aid (course_id, student_id, instructor_id, is_accepted)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (course_id, student_id, instructor_id)
            DO UPDATE SET is_accepted = EXCLUDED.is_accepted
        """, (course_id, student_id, instructor_id, is_accepted))

        conn.commit()
        return jsonify({"success": True, "message": "Evaluation submitted"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()