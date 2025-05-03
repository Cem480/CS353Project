from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/api/admin/evaluate_course/<course_id>/<admin_id>", methods=["PUT"])
def evaluate_course(course_id, admin_id):
    data = request.json

    # Check if is_accepted is in request
    if "is_accepted" not in data:
        return jsonify({"success": False, "message": "Missing 'is_accepted' field"}), 400

    is_accepted = data["is_accepted"]

    # Validate it’s a boolean
    if not isinstance(is_accepted, bool):
        return jsonify({"success": False, "message": "'is_accepted' must be a boolean"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        # Check if course exists
        cursor.execute("SELECT status FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if course is None:
            return jsonify({"success": False, "message": "Course not found"}), 404

        #  Only allow evaluation if course is pending
        if course["status"] != "pending":
            return jsonify({"success": False, "message": "Only 'pending' courses can be evaluated"}), 400

        # Update course status and set approver_id
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

@admin_bp.route("/api/courses", methods=["GET"])
def get_courses_by_status():
    status = request.args.get("status")
    if not status:
        return jsonify({"success": False, "message": "Missing status parameter"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute("""
            SELECT c.course_id, c.title, c.description, c.category, c.price, c.creation_date,
                   c.difficulty_level, c.creator_id,
                   u.first_name || ' ' || COALESCE(u.middle_name || ' ', '') || u.last_name AS instructor_name
            FROM course c
            JOIN instructor i ON c.creator_id = i.id
            JOIN "user" u ON i.id = u.id
            WHERE c.status = %s
            ORDER BY c.creation_date DESC
        """, (status,))

        rows = cursor.fetchall()
        courses = [
            {
                "course_id": row["course_id"],
                "title": row["title"],
                "description": row["description"],
                "category": row["category"],
                "price": row["price"],
                "creation_date": row["creation_date"].strftime("%Y-%m-%d"),
                "difficulty_level": row["difficulty_level"],
                "creator_id": row["creator_id"],
                "instructor_name": row["instructor_name"]
            }
            for row in rows
        ]

        return jsonify({"success": True, "courses": courses})

    except Exception as e:
        print("Error fetching courses by status:", e)
        return jsonify({"success": False, "message": "Internal server error"}), 500

    finally:
        cursor.close()
        conn.close()

