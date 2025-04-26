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

        # Insert the application with default 'pending' status
        cursor.execute("""
            INSERT INTO apply_financial_aid (
                course_id, student_id, income, statement, application_date, status, evaluator_id
            ) VALUES (%s, %s, %s, %s, CURRENT_DATE, 'pending', NULL)
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
# If approved add enroll relation if not exists before!!!
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

        # Update the application with evaluation result
        cursor.execute("""
            UPDATE apply_financial_aid
            SET status = %s,
                evaluator_id = %s
            WHERE course_id = %s AND student_id = %s
        """, (
            'approved' if is_accepted else 'rejected',
            instructor_id,
            course_id,
            student_id
        ))

        # If accepted, enroll the student if not already enrolled
        if is_accepted:
            # Check if already enrolled
            cursor.execute("""
                SELECT 1 FROM enroll
                WHERE course_id = %s AND student_id = %s
            """, (course_id, student_id))

            already_enrolled = cursor.fetchone()

            if not already_enrolled:
                # Insert into enroll table
                cursor.execute("""
                    INSERT INTO enroll (course_id, student_id, enroll_date, progress_rate)
                    VALUES (%s, %s, CURRENT_DATE, 0)
                """, (course_id, student_id))

        conn.commit()
        return jsonify({"success": True, "message": "Financial aid is evaluated!"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# Get financial aid statistics
@financial_aid_bp.route("/api/instructor/<instructor_id>/financial_aid_stats", methods=["GET"])
def get_financial_aid_stats(instructor_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN afa.status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN afa.status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN afa.status = 'pending' THEN 1 ELSE 0 END) AS pending
            FROM apply_financial_aid afa
            JOIN course c ON afa.course_id = c.course_id
            WHERE c.creator_id = %s
        """, (instructor_id,))

        row = cursor.fetchone()

        return jsonify({
            "approved": row["approved"],
            "rejected": row["rejected"],
            "pending": row["pending"]
        }), 200

    except Exception as e:
        print(f"Error fetching financial aid stats: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# Get all financial_aid_applications
@financial_aid_bp.route("/api/instructor/<instructor_id>/financial_aid_applications", methods=["POST"])
def get_financial_aid_applications(instructor_id):

    data = request.json or {}
    status = data.get("status", None)  # Example expected: "pending", "approved", "rejected", or None

    allowed_statuses = {"pending", "approved", "rejected"}

    if status and status not in allowed_statuses:
        return jsonify({"success": False, "message": "Invalid status value!"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        base_query="""
            SELECT 
                afa.course_id,
                afa.student_id,
                u.first_name || ' ' || u.last_name AS student_name,
                c.title AS course_title,
                afa.statement,
                afa.income,
                afa.application_date,
                afa.status
            FROM apply_financial_aid afa
            JOIN course c ON afa.course_id = c.course_id
            JOIN "user" u ON afa.student_id = u.id
            WHERE c.creator_id = %s
        """
        params = [instructor_id]

        if status:
            base_query += " AND afa.status = %s"
            params.append(status)

        base_query += " ORDER BY c.title, afa.application_date DESC"
        cursor.execute(base_query, tuple(params))

        rows = cursor.fetchall()

        applications = []
        for row in rows:
            applications.append({
                "courseId": row["course_id"],
                "studentId": row["student_id"],
                "studentName": row["student_name"],
                "courseTitle": row["course_title"],
                "statement": row["statement"],
                "income": float(row["income"]),
                "applicationDate": row["application_date"].strftime("%Y-%m-%d"),
                "status": row["status"]
            })

        return jsonify(applications), 200

    except Exception as e:
        print(f"Error fetching financial aid applications: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
