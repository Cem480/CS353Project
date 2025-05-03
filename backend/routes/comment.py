from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras

comment_bp = Blueprint("comment", __name__)

@comment_bp.route("/api/comment/<course_id>/<sec_id>/<content_id>/<user_id>", methods=["POST"])
def add_comment(course_id, sec_id, content_id, user_id):
    data = request.json
    if "text" not in data:
        return jsonify({"success": False, "message": "Missing comment text"}), 400

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
        
        # Get user role
        cursor.execute("""
            SELECT role FROM "user" WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        if user is None:
            return jsonify({"success": False, "message": "User not found"}), 404

        role = user["role"]

        # Allow if user is admin
        if role == "admin":
            allowed = True
        # Allow if user is instructor of this course
        elif role == "instructor":
            cursor.execute("""
                SELECT 1 FROM course WHERE course_id = %s AND creator_id = %s
            """, (course_id, user_id))
            allowed = cursor.fetchone() is not None
        # Allow if user is student and enrolled
        elif role == "student":
            cursor.execute("""
                SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
            """, (course_id, user_id))
            allowed = cursor.fetchone() is not None
        else:
            allowed = False

        if not allowed:
            return jsonify({"success": False, "message": "User is not authorized to comment"}), 403
        
        # Insert comment
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


# Return comments for specific course
@comment_bp.route("/api/comment/<course_id>/<sec_id>/<content_id>", methods=["GET"])
def get_comments_for_content(course_id, sec_id, content_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Check if course exists and is accepted
        cursor.execute("SELECT status FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403

        # Check section exists
        cursor.execute("""
            SELECT 1 FROM section WHERE course_id = %s AND sec_id = %s
        """, (course_id, sec_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Section not found"}), 404

        # Check content exists
        cursor.execute("""
            SELECT 1 FROM content WHERE course_id = %s AND sec_id = %s AND content_id = %s
        """, (course_id, sec_id, content_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Content not found"}), 404
        
        # Fetch comments
        cursor.execute("""
            SELECT u.first_name, u.last_name, c.text, c.timestamp
            FROM comment c 
            JOIN "user" u ON u.id = c.user_id
            WHERE c.course_id = %s AND c.sec_id = %s AND c.content_id = %s
            ORDER BY c.timestamp DESC
        """, (course_id, sec_id, content_id))

        rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# Return comment count for specific course
@comment_bp.route("/api/comment/<course_id>/<sec_id>/<content_id>/count", methods=["GET"])
def get_comment_count(course_id, sec_id, content_id):
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Check if course exists and is accepted
        cursor.execute("SELECT status FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course[0] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403

        # Check section exists
        cursor.execute("""
            SELECT 1 FROM section WHERE course_id = %s AND sec_id = %s
        """, (course_id, sec_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Section not found"}), 404

        # Check content exists
        cursor.execute("""
            SELECT 1 FROM content WHERE course_id = %s AND sec_id = %s AND content_id = %s
        """, (course_id, sec_id, content_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "Content not found"}), 404
        
        # Fetch comment count
        cursor.execute("""
            SELECT COUNT(*) 
            FROM comment 
            WHERE course_id = %s AND sec_id = %s AND content_id = %s
        """, (course_id, sec_id, content_id))

        count = cursor.fetchone()[0]
        return jsonify({"comment_count": count})
    
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
