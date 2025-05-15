from flask import Blueprint, request, jsonify
from db import connect_project_db

course_overview_bp = Blueprint("course_overview_bp", __name__)

@course_overview_bp.route("/api/course-overview/<course_id>", methods=["GET"])
def get_course_general_info(course_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if course exists
        cursor.execute("SELECT 1 FROM course WHERE course_id = %s", (course_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Course not found"}), 404

        # Check if course status is accepted
        cursor.execute("SELECT 1 FROM course WHERE course_id = %s AND status = 'accepted'", (course_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Course not accepted"}), 404

        # Fetch general info with instructor details
        cursor.execute("""
            SELECT
                c.course_id,
                c.title,
                c.description,
                c.category,
                c.price,
                cw.is_free,  -- from the view
                c.creation_date,
                c.last_update_date,
                c.difficulty_level,
                c.enrollment_count,
                c.status,
                i.id AS instructor_id,
                u.first_name,
                u.middle_name,
                u.last_name,
                i.i_rating
            FROM course AS c
            JOIN course_with_is_free AS cw ON c.course_id = cw.course_id
            JOIN instructor AS i ON c.creator_id = i.id
            JOIN "user" AS u ON i.id = u.id
            WHERE c.course_id = %s;
        """, (course_id,))
        
        course = cursor.fetchone()
        if course is None:
            return jsonify({"success": False, "message": "Instructor or user info not found"}), 500

        keys = [desc[0] for desc in cursor.description]
        return jsonify(dict(zip(keys, course)))

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Internal server error: {str(e)}"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@course_overview_bp.route("/api/course-overview/<course_id>/syllabus", methods=["GET"])
def get_course_syllabus(course_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Validate if course exists
        cursor.execute("SELECT 1 FROM course WHERE course_id = %s", (course_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Course not found"}), 404
        
        # Check if course status is accepted
        cursor.execute("SELECT 1 FROM course WHERE course_id = %s AND status = 'accepted'", (course_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Course not accepted"}), 404

        # Fetch sections and contents
        cursor.execute("""
            SELECT
                s.sec_id,
                s.title AS section_title,
                s.description AS section_description,
                s.allocated_time AS section_time,
                s.order_number AS section_order,
                c.content_id,
                c.title AS content_title,
                c.allocated_time AS content_time,
                c.content_type AS content_type
            FROM section s
            LEFT JOIN content c ON s.course_id = c.course_id AND s.sec_id = c.sec_id
            WHERE s.course_id = %s
            ORDER BY s.order_number, c.order_number
        """, (course_id,))
        
        rows = cursor.fetchall()

        from collections import OrderedDict
        syllabus = OrderedDict()

        for row in rows:
            sec_id, sec_title, sec_desc, sec_time, sec_order, content_id, content_title, content_time, content_type = row

            if sec_id not in syllabus:
                syllabus[sec_id] = {
                    "sec_id": sec_id,
                    "title": sec_title,
                    "description": sec_desc,
                    "allocated_time": sec_time,
                    "order_number": sec_order,
                    "contents": [],
                    "content_summary": {
                        "task": 0,
                        "document": 0,
                        "visual_material": 0
                    }
                }

            if content_id:
                syllabus[sec_id]["contents"].append({
                    "content_id": content_id,
                    "title": content_title,
                    "allocated_time": content_time,
                    "content_type": content_type
                })
                if content_type in syllabus[sec_id]["content_summary"]:
                    syllabus[sec_id]["content_summary"][content_type] += 1

        return jsonify(list(syllabus.values()))

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Internal server error: {str(e)}"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()





# course_content.py
# feedback.py
# comment.py

# my_learning.py  # ayca will do it in profile