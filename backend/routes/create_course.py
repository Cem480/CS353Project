from flask import Blueprint, request, jsonify, session
from db import connect_project_db
import psycopg2.extras
import uuid
from passlib.context import CryptContext

course_bp = Blueprint("create_course", __name__)

@course_bp.route("/api/add/course", methods=["POST"])
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
        course_id = f"C{uuid.uuid4().hex[:7].upper()}"  # UUID-based course_id   Total length = 8

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
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@course_bp.route("/api/add/course/<course_id>/section", methods=["POST"])
def add_section(course_id):
    data = request.json
    required_fields = [
        "title",
        "description", 
        "order_number",
        "allocated_time"
    ]

    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT * FROM "course" WHERE course_id = %s', (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404

        sec_id = f"S{uuid.uuid4().hex[:7].upper()}"

        cursor.execute(
            'SELECT * FROM "section" WHERE course_id = %s AND order_number = %s', 
            (course_id, data["order_number"])
        )
        existing_section = cursor.fetchone()
        if existing_section:
            return jsonify({
                "success": False, 
                "message": f"A section with order number {data['order_number']} already exists for this course"
            }), 400

        cursor.execute(
            """
            INSERT INTO section (
                course_id, sec_id, title, description,
                order_number, allocated_time
            ) VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                course_id,
                sec_id,
                data["title"],
                data["description"],
                int(data["order_number"]),
                int(data["allocated_time"])
            ),
        )

        # Update CURRENT_TIMESTAMP (as we discussed earlier)
        cursor.execute(
            """
            UPDATE course 
            SET last_update_date = CURRENT_DATE
            WHERE course_id = %s
            """,
            (course_id,)
        )

        conn.commit()
        return jsonify({"success": True, "section_id": sec_id, "course_id": course_id}), 201

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@course_bp.route("/api/add/course/<course_id>/section/<sec_id>/content", methods=["POST"])
def add_content(course_id, sec_id):
    data = request.json
    required_fields = [
        "title",
        "allocated_time",
        "content_type"
    ]

    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    valid_content_types = ['task', 'document', 'visual_material']
    if data["content_type"] not in valid_content_types:
        return jsonify({
            "success": False, 
            "message": f"Invalid content_type. Must be one of: {', '.join(valid_content_types)}"
        }), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute(
            'SELECT * FROM "section" WHERE course_id = %s AND sec_id = %s', 
            (course_id, sec_id)
        )
        section = cursor.fetchone()
        if not section:
            return jsonify({"success": False, "message": "Section not found"}), 404

        content_id = f"CT{uuid.uuid4().hex[:6].upper()}"    # CT + 6 = 8 total

        cursor.execute(
            """
            INSERT INTO content (
                course_id, sec_id, content_id, title,
                allocated_time, content_type
            ) VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                course_id,
                sec_id,
                content_id,
                data["title"],
                int(data["allocated_time"]),
                data["content_type"]
            ),
        )

        
        cursor.execute(
            """
            UPDATE course 
            SET last_update_date = CURRENT_DATE
            WHERE course_id = %s
            """,
            (course_id,)
        )

        conn.commit()
        return jsonify({
            "success": True, 
            "course_id": course_id,
            "section_id": sec_id,
            "content_id": content_id
        }), 201

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
