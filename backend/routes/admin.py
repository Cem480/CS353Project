from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/api/admin/evaluate_course/<course_id>/<admin_id>", methods=["PUT"])
def evaluate_course(course_id, admin_id):
    data = request.json

    # 1. Check if is_accepted is in request
    if "is_accepted" not in data:
        return jsonify({"success": False, "message": "Missing 'is_accepted' field"}), 400

    is_accepted = data["is_accepted"]

    # 2. Validate it’s a boolean
    if not isinstance(is_accepted, bool):
        return jsonify({"success": False, "message": "'is_accepted' must be a boolean"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        # 3. Check if course exists
        cursor.execute("SELECT status FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if course is None:
            return jsonify({"success": False, "message": "Course not found"}), 404

        # 4. Only allow evaluation if course is pending
        if course["status"] != "pending":
            return jsonify({"success": False, "message": "Only 'pending' courses can be evaluated"}), 400

        # 5. Update course status and set approver_id
        new_status = "accepted" if is_accepted else "rejected"
        cursor.execute("""
            UPDATE course
            SET status = %s, approver_id = %s
            WHERE course_id = %s
        """, (new_status, admin_id, course_id))
        conn.commit()

        return jsonify({"success": True, "message": f"Course {new_status} successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
