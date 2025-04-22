from flask import Blueprint, request, jsonify, session
from db import connect_project_db
import psycopg2.extras
from passlib.context import CryptContext

course_bp = Blueprint("create_course", __name__)

@course_bp.route("/api/course", methods=["POST"])
def create_overall_course():
    data = request.json
    required_fields = [
        "title",
        "description",
        "category",
        "price",
        "qna_link",
        "difficulty_level",
        "instructor_id"
    ]

    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT COUNT(*) FROM "course"')
        course_count = cursor.fetchone()[0]
        course_id = f"C{course_count + 1:07d}"

        cursor.execute(
            """
            INSERT INTO course (
                course_id, title, description, category, price,
                creation_date, last_update_date, status,
                enrollment_count, qna_link, difficulty_level, creator_id
            ) VALUES (%s, %s, %s, %s, %s, 
                      CURRENT_DATE, CURRENT_DATE, %s,
                      %s, %s, %s, %s)
            """,
            (
                course_id,
                data["title"],
                data["description"],
                data["category"],
                int(data["price"]),
                "draft",                  # is_approved = FALSE
                0,                      # enrollment_count = 0
                data["qna_link"],
                int(data["difficulty_level"]),
                data["instructor_id"]
            ),
        )

        conn.commit()
        return jsonify({"success": True, "course_id": course_id}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()  
