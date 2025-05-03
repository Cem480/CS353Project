from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras
from werkzeug.utils import secure_filename
import os

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

content_operations_bp = Blueprint("content_operations", __name__)


@content_operations_bp.route("/api/submit/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["POST"])
def submit_task(course_id, sec_id, content_id, student_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
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
        
        # Check enrollment
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403

        # Get task_type
        cursor.execute("""
            SELECT task_type FROM task WHERE course_id = %s AND sec_id = %s AND content_id = %s
        """, (course_id, sec_id, content_id))
        task = cursor.fetchone()
        if not task:
            return jsonify({"success": False, "message": "Task not found"}), 404
        task_type = task["task_type"]

        # Handle assignment file upload
        if task_type == "assignment":
            file = request.files.get("file")
            if not file:
                return jsonify({"success": False, "message": "Missing file for assignment submission"}), 400

            filename = secure_filename(f"{student_id}_{file.filename}")
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            answers = filepath

        # Handle assessment JSON answer list
        elif task_type == "assessment":
            if not request.is_json:
                return jsonify({"success": False, "message": "Expected JSON answers for assessment"}), 400
            data = request.get_json()
            if "answers" not in data or not isinstance(data["answers"], list):
                return jsonify({"success": False, "message": "Invalid or missing answers"}), 400
            answers = str(data["answers"])  # store as stringified JSON

        else:
            return jsonify({"success": False, "message": f"Unsupported task_type: {task_type}"}), 400

        # Insert into submit table
        cursor.execute("""
            INSERT INTO submit (course_id, sec_id, content_id, student_id, grade, submission_date, answers)
            VALUES (%s, %s, %s, %s, NULL, CURRENT_DATE, %s)
        """, (course_id, sec_id, content_id, student_id, answers))

        conn.commit()
        return jsonify({"success": True}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@content_operations_bp.route("/api/grade/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["PUT"])
def assign_grade(course_id, sec_id, content_id, student_id):
    data = request.json
    if "grade" not in data:
        return jsonify({"success": False, "message": "Missing grade"}), 400

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
        
        # Check if user is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403
        
        cursor.execute("""
            UPDATE submit SET grade = %s 
            WHERE course_id = %s AND sec_id = %s AND content_id = %s AND student_id = %s
        """, (int(data["grade"]), course_id, sec_id, content_id, student_id))
        conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@content_operations_bp.route("/api/complete/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["POST"])
def complete_content(course_id, sec_id, content_id, student_id):
    data = request.json
    if "is_completed" not in data:
        return jsonify({"success": False, "message": "Missing is_completed"}), 400

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
        
        # Check if user is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone() is None:
            return jsonify({"success": False, "message": "User is not enrolled in the course"}), 403
        
        cursor.execute("""
            INSERT INTO complete (course_id, sec_id, content_id, student_id, is_completed)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (course_id, sec_id, content_id, student_id) DO UPDATE SET is_completed = EXCLUDED.is_completed
        """, (course_id, sec_id, content_id, student_id, data["is_completed"]))
        conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# get specific content
@content_operations_bp.route("/api/course/<course_id>/section/<sec_id>/content/<content_id>", methods=["GET"])
def get_content_detail(course_id, sec_id, content_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if course is accepted
        cursor.execute("SELECT status FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course["status"] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403

        # Check if section exists
        cursor.execute("SELECT 1 FROM section WHERE course_id = %s AND sec_id = %s", (course_id, sec_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Section not found"}), 404

        # Check if content exists
        cursor.execute("SELECT 1 FROM content WHERE course_id = %s AND sec_id = %s AND content_id = %s",
                       (course_id, sec_id, content_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Content not found"}), 404

        # Retrieve content details
        cursor.execute("""
            SELECT c.title, c.allocated_time, c.content_type,
                   d.body AS document_path,
                   vm.body AS video_path, vm.duration,
                   t.task_type, t.percentage, t.max_time, t.passing_grade,
                   a.question_count,
                   asgn.start_date, asgn.end_date, asgn.upload_material, asgn.body AS assignment_path
            FROM content c
            LEFT JOIN document d ON (c.course_id, c.sec_id, c.content_id) = (d.course_id, d.sec_id, d.content_id)
            LEFT JOIN visual_material vm ON (c.course_id, c.sec_id, c.content_id) = (vm.course_id, vm.sec_id, vm.content_id)
            LEFT JOIN task t ON (c.course_id, c.sec_id, c.content_id) = (t.course_id, t.sec_id, t.content_id)
            LEFT JOIN assessment a ON (c.course_id, c.sec_id, c.content_id) = (a.course_id, a.sec_id, a.content_id)
            LEFT JOIN assignment asgn ON (c.course_id, c.sec_id, c.content_id) = (asgn.course_id, asgn.sec_id, asgn.content_id)
            WHERE c.course_id = %s AND c.sec_id = %s AND c.content_id = %s
        """, (course_id, sec_id, content_id))

        content = cursor.fetchone()
        if not content:
            return jsonify({"success": False, "message": "Content not found"}), 404

        # Convert to dict
        content_info = dict(content)

        # Replace file paths with URLs (assuming files are served statically from /uploads/)
        if content_info.get("document_path"):
            content_info["document_url"] = f"/uploads/{os.path.basename(content_info['document_path'])}"
        if content_info.get("video_path"):
            content_info["video_url"] = f"/uploads/{os.path.basename(content_info['video_path'])}"
        if content_info.get("assignment_path"):
            content_info["assignment_file_url"] = f"/uploads/{os.path.basename(content_info['assignment_path'])}"

        return jsonify({"success": True, "content": content_info}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
