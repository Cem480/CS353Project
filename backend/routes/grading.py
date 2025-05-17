from flask import Blueprint, request, jsonify, send_from_directory, abort
from db import connect_project_db
import psycopg2.extras
import os

grading_bp = Blueprint("grading", __name__)

@grading_bp.route("/api/grade/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["PUT"])
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


@grading_bp.route("/api/instructor/<instructor_id>/ungraded-submissions", methods=["GET"])
def get_ungraded_submissions(instructor_id):
    sort = request.args.get("sort", "newest")
    limit = request.args.get("limit", type=int, default=10)
    offset = request.args.get("offset", type=int, default=0)

    sort_options = {
        "newest": "s.submission_date DESC",
        "oldest": "s.submission_date ASC",
        "student": "u.last_name ASC, u.first_name ASC",
        "course": "co.title ASC"
    }
    order_by_clause = sort_options.get(sort, "s.submission_date DESC")

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute(f"""
            SELECT s.course_id, s.sec_id, s.content_id, s.student_id, s.submission_date,
                   u.first_name, u.last_name,
                   c.title AS content_title,
                   co.title AS course_title,
                   c.content_type, t.task_type,
                   s.grade, s.answers
            FROM submit s
            JOIN course co ON co.course_id = s.course_id
            JOIN content c ON c.course_id = s.course_id AND c.sec_id = s.sec_id AND c.content_id = s.content_id
            JOIN "user" u ON u.id = s.student_id
            LEFT JOIN task t ON t.course_id = s.course_id AND t.sec_id = s.sec_id AND t.content_id = s.content_id
            WHERE s.grade IS NULL
              AND co.creator_id = %s
              AND t.task_type IN ('assignment', 'assessment')
            ORDER BY {order_by_clause}
            LIMIT %s OFFSET %s
        """, (instructor_id, limit, offset))

        submissions = []
        for row in cursor.fetchall():
            item = dict(row)

            if item["task_type"] == "assignment" and item.get("answers"):
                filename = os.path.basename(item["answers"])
                item["download_url"] = f"/api/grading/download/{filename}"
                item["answers"] = None  # hide file path

            # If it's an assignment:
            if item.get("task_type") == "assignment":
                cursor.execute("""
                    SELECT start_date, end_date, upload_material, body
                    FROM assignment
                    WHERE course_id = %s AND sec_id = %s AND content_id = %s
                """, (item["course_id"], item["sec_id"], item["content_id"]))
                assgn = cursor.fetchone()
                if assgn:
                    item["start_date"] = assgn["start_date"]
                    item["end_date"] = assgn["end_date"]
                    item["upload_material"] = assgn["upload_material"]
                    item["assignment_file_url"] = f"/api/grading/download/{os.path.basename(assgn['body'])}"

            # Add assessment fields if task_type is assessment
            elif item.get("task_type") == "assessment":
                cursor.execute("""
                    SELECT question_count FROM assessment
                    WHERE course_id = %s AND sec_id = %s AND content_id = %s
                """, (item["course_id"], item["sec_id"], item["content_id"]))
                ass_row = cursor.fetchone()
                item["question_count"] = ass_row["question_count"] if ass_row else 0

                cursor.execute("""
                    SELECT q.question_id, q.question_body, q.max_time,
                        mc.correct_answer AS mc_answer,
                        oe.answer AS oe_answer
                    FROM question q
                    LEFT JOIN multiple_choice mc ON mc.course_id = q.course_id AND mc.sec_id = q.sec_id AND mc.content_id = q.content_id AND mc.question_id = q.question_id
                    LEFT JOIN open_ended oe ON oe.course_id = q.course_id AND oe.sec_id = q.sec_id AND oe.content_id = q.content_id AND oe.question_id = q.question_id
                    WHERE q.course_id = %s AND q.sec_id = %s AND q.content_id = %s
                    ORDER BY q.question_id
                """, (item["course_id"], item["sec_id"], item["content_id"]))

                questions = []
                for q in cursor.fetchall():
                    questions.append({
                        "question_id": q["question_id"],
                        "question_body": q["question_body"],
                        "max_time": q["max_time"],
                        "correct_answer": q["mc_answer"] if q["mc_answer"] else q["oe_answer"]
                    })
                item["questions"] = questions

            submissions.append(item)

        return jsonify({"success": True, "ungraded_contents": submissions}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@grading_bp.route("/api/grading/download/<path:filename>", methods=["GET"])
def download_submission_file(filename):
    # ✅ CHANGED: Securely serve files from uploads directory
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    safe_path = os.path.join(uploads_dir, filename)

    if not os.path.isfile(safe_path):
        return abort(404, description="File not found")  

    return send_from_directory(uploads_dir, filename, as_attachment=True)