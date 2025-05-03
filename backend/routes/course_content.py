from flask import Blueprint, request, jsonify
from db import connect_project_db

course_content_bp = Blueprint("course_content_bp", __name__)

from flask import Blueprint, request, jsonify
from db import connect_project_db

course_content_bp = Blueprint("course_content_bp", __name__)

# Course info on the content page
@course_content_bp.route("/api/course-content/course/<course_id>/info", methods=["GET"])
def get_course_content_info(course_id):
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
        
        
        cursor.execute("SELECT title, description FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        return jsonify({"title": course[0], "description": course[1]})
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()


@course_content_bp.route("/api/course-content/course/<course_id>/grades/<student_id>", methods=["GET"])
def get_student_grades(course_id, student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        # Check if course exists
        cursor.execute("SELECT 1 FROM course WHERE course_id = %s", (course_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Course not found"}), 404

        # Check if enrollment exists
        cursor.execute("""
            SELECT 1 FROM enroll
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student is not enrolled in this course"}), 403

        # Fetch all grades across course sections
        cursor.execute("""
            SELECT sec.sec_id, sec.title, c.content_id, c.title, s.grade
            FROM content c
            LEFT JOIN submit s
            ON c.course_id = s.course_id AND c.sec_id = s.sec_id AND c.content_id = s.content_id AND s.student_id = %s
            JOIN section sec ON c.course_id = sec.course_id AND c.sec_id = sec.sec_id
            WHERE c.course_id = %s
            ORDER BY sec.order_number, c.content_id
        """, (student_id, course_id))

        rows = cursor.fetchall()
        result = [
            {
                "section_id": row[0],
                "section_title": row[1],
                "content_id": row[2],
                "content_title": row[3],
                "grade": row[4]
            }
            for row in rows
        ]

        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Section list with order
@course_content_bp.route("/api/course-content/course/<course_id>/sections", methods=["GET"])
def get_course_sections(course_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if course exists and is accepted
        cursor.execute("""
            SELECT status FROM course WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403

        # Retrieve section list
        cursor.execute("""
            SELECT sec_id, title AS section_title, order_number
            FROM section
            WHERE course_id = %s
            ORDER BY order_number
        """, (course_id,))
        rows = cursor.fetchall()

        keys = [desc[0] for desc in cursor.description]
        return jsonify([dict(zip(keys, row)) for row in rows])

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Content list in a section
@course_content_bp.route("/api/course-content/course/<course_id>/section/<section_id>/contents", methods=["GET"])
def get_section_contents(course_id, section_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if course exists and is accepted
        cursor.execute("""
            SELECT status FROM course WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403
        
        # Check if section exists
        cursor.execute("""
            SELECT 1 FROM section
            WHERE course_id = %s AND sec_id = %s
        """, (course_id, section_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Section not found"}), 404


        cursor.execute("""
            SELECT
                c.content_id,
                c.title AS content_title,
                c.content_type,
                c.allocated_time
            FROM content c
            WHERE c.course_id = %s AND c.sec_id = %s
            ORDER BY c.content_id
        """, (course_id, section_id))
        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]
        return jsonify([dict(zip(keys, row)) for row in rows])
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# find total allocated time and task count of not completed contents in a given section
@course_content_bp.route("/api/course-content/course/<course_id>/section/<section_id>/incomplete-summary/<student_id>", methods=["GET"])
def get_section_incomplete_summary(course_id, section_id, student_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if course exists and is accepted
        cursor.execute("""
            SELECT status FROM course WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403
        
        # Check if section exists
        cursor.execute("""
            SELECT 1 FROM section
            WHERE course_id = %s AND sec_id = %s
        """, (course_id, section_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Section not found"}), 404
        
        # Check if student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Student not found"}), 404
        
        # Check if student is enrolled in course
        cursor.execute("""
            SELECT 1 FROM enroll 
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Student is not enrolled in this course"}), 403

        # Get total uncompleted allocated time and uncompleted task count
        cursor.execute("""
            SELECT 
                COALESCE(SUM(c.allocated_time), 0) AS total_unfinished_time,
                COUNT(t.content_id) AS uncompleted_task_count
            FROM content c
            LEFT JOIN complete comp 
                ON c.course_id = comp.course_id AND c.sec_id = comp.sec_id AND c.content_id = comp.content_id 
                AND comp.student_id = %s AND comp.is_completed = TRUE
            LEFT JOIN task t 
                ON c.course_id = t.course_id AND c.sec_id = t.sec_id AND c.content_id = t.content_id
            WHERE c.course_id = %s AND c.sec_id = %s 
              AND (comp.is_completed IS NULL OR comp.is_completed = FALSE)
        """, (student_id, course_id, section_id))

        row = cursor.fetchone()
        result = {
            "total_unfinished_time": row[0],
            "uncompleted_task_count": row[1]
        }
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()
