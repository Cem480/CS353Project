from flask import Blueprint, request, jsonify, send_from_directory, abort
from db import connect_project_db
import psycopg2.extras
from werkzeug.utils import secure_filename
import os, json
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

            original_name = secure_filename(file.filename)
            unique_filename = f"{course_id}_{sec_id}_{content_id}_{student_id}_{original_name}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            file.save(filepath)
            answers = filepath

        # Handle assessment JSON answer list
        elif task_type == "assessment":
            if not request.is_json:
                return jsonify({"success": False, "message": "Expected JSON answers for assessment"}), 400
            data = request.get_json()

            if "answers" not in data or not isinstance(data["answers"], dict):
                return jsonify({"success": False, "message": "Invalid or missing answers"}), 400

            # Validate each question_id format (optional)
            for q_id, ans in data["answers"].items():
                if not isinstance(q_id, str) or not isinstance(ans, str):
                    return jsonify({"success": False, "message": "Each answer must be a string keyed by question_id"}), 400

            answers = json.dumps(data["answers"])


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


@content_operations_bp.route("/api/complete/<course_id>/<sec_id>/<content_id>/<student_id>", methods=["GET"])
def check_content_completion(course_id, sec_id, content_id, student_id):
    """Check if specific content is completed"""
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if content is marked as completed
        cursor.execute("""
            SELECT is_completed FROM complete 
            WHERE course_id = %s AND sec_id = %s AND content_id = %s AND student_id = %s
        """, (course_id, sec_id, content_id, student_id))
        
        completion_record = cursor.fetchone()
        
        # Also check if there's a submission with grade (indicates completion)
        cursor.execute("""
            SELECT grade FROM submit 
            WHERE course_id = %s AND sec_id = %s AND content_id = %s AND student_id = %s
        """, (course_id, sec_id, content_id, student_id))
        
        submission_record = cursor.fetchone()
        
        is_completed = False
        if completion_record and completion_record['is_completed']:
            is_completed = True
        elif submission_record and submission_record['grade'] is not None:
            is_completed = True
            
        return jsonify({
            "success": True,
            "is_completed": is_completed,
            "has_completion_record": completion_record is not None,
            "has_grade": submission_record is not None and submission_record['grade'] is not None
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@content_operations_bp.route("/api/course/<course_id>/student/<student_id>/completion-status", methods=["GET"])
def get_detailed_completion_status(course_id, student_id):
    """Get detailed completion status for all content in a course"""
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if course exists and is accepted
        cursor.execute("SELECT status FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course["status"] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403

        # Check if student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        # Check if student is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student is not enrolled in this course"}), 403

        # Get all content with completion status
        cursor.execute("""
            SELECT 
                s.sec_id,
                s.title as section_title,
                s.order_number as section_order,
                c.content_id,
                c.title as content_title,
                c.content_type,
                c.allocated_time,
                c.order_number as content_order,
                COALESCE(comp.is_completed, false) as is_completed,
                sub.grade,
                CASE 
                    WHEN comp.is_completed = true THEN true
                    WHEN sub.grade IS NOT NULL THEN true
                    ELSE false
                END as is_complete_or_graded
            FROM section s
            JOIN content c ON s.course_id = c.course_id AND s.sec_id = c.sec_id
            LEFT JOIN complete comp ON c.course_id = comp.course_id 
                AND c.sec_id = comp.sec_id 
                AND c.content_id = comp.content_id 
                AND comp.student_id = %s
            LEFT JOIN submit sub ON c.course_id = sub.course_id 
                AND c.sec_id = sub.sec_id 
                AND c.content_id = sub.content_id 
                AND sub.student_id = %s
            WHERE s.course_id = %s
            ORDER BY s.order_number, c.order_number
        """, (student_id, student_id, course_id))
        
        results = cursor.fetchall()
        
        # Organize by sections
        sections = {}
        for row in results:
            section_id = row['sec_id']
            if section_id not in sections:
                sections[section_id] = {
                    'section_id': section_id,
                    'section_title': row['section_title'],
                    'section_order': row['section_order'],
                    'contents': []
                }
            
            sections[section_id]['contents'].append({
                'content_id': row['content_id'],
                'content_title': row['content_title'],
                'content_type': row['content_type'],
                'allocated_time': row['allocated_time'],
                'content_order': row['content_order'],
                'is_completed': row['is_completed'],
                'grade': row['grade'],
                'is_complete_or_graded': row['is_complete_or_graded']
            })
        
        # Convert to list
        sections_list = list(sections.values())
        
        # Calculate totals
        total_content = len(results)
        completed_content = sum(1 for row in results if row['is_complete_or_graded'])
        
        return jsonify({
            "success": True,
            "course_id": course_id,
            "student_id": student_id,
            "total_content": total_content,
            "completed_content": completed_content,
            "completion_percentage": round((completed_content / total_content * 100) if total_content > 0 else 0, 2),
            "sections": sections_list
        }), 200

    except Exception as e:
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
            content_info["document_url"] = f"/api/content/download/{os.path.basename(content_info['document_path'])}"
        if content_info.get("video_path"):
            content_info["video_url"] = f"/api/content/download/{os.path.basename(content_info['video_path'])}"
        if content_info.get("assignment_path"):
            content_info["assignment_file_url"] = f"/api/content/download/{os.path.basename(content_info['assignment_path'])}"

        # If assessment, retrieve questions too
        if content_info.get("task_type") == "assessment":
            cursor.execute("""
                SELECT question_id, question_body, max_time
                FROM question
                WHERE course_id = %s AND sec_id = %s AND content_id = %s
                ORDER BY question_id
            """, (course_id, sec_id, content_id))
            questions = cursor.fetchall()
            content_info["questions"] = [dict(q) for q in questions]

        return jsonify({"success": True, "content": content_info}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@content_operations_bp.route("/api/content/download/<path:filename>", methods=["GET"])
def download_content_file(filename):
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    safe_path = os.path.join(uploads_dir, filename)

    if not os.path.isfile(safe_path):
        return abort(404, description="File not found")

    return send_from_directory(uploads_dir, filename, as_attachment=True)


completion_bp = Blueprint("completion", __name__)
@content_operations_bp.route("/api/course/<course_id>/section/<sec_id>/content/<content_id>/questions", methods=["POST"])
def create_assessment_questions(course_id, sec_id, content_id):
    conn = connect_project_db()
    cursor = conn.cursor()
    
    try:
        # Verify the content exists and is an assessment
        cursor.execute("""
            SELECT t.task_type FROM content c
            JOIN task t ON (c.course_id, c.sec_id, c.content_id) = (t.course_id, t.sec_id, t.content_id)
            WHERE c.course_id = %s AND c.sec_id = %s AND c.content_id = %s
        """, (course_id, sec_id, content_id))
        
        task = cursor.fetchone()
        if not task:
            return jsonify({"success": False, "message": "Content not found or not a task"}), 404
        
        if task[0] != 'assessment':
            return jsonify({"success": False, "message": "Content is not an assessment"}), 400
        
        # Get the questions data from request
        data = request.get_json()
        if not data or 'questions' not in data:
            return jsonify({"success": False, "message": "Questions data is required"}), 400
        
        questions = data['questions']
        
        # Delete existing questions for this assessment (if any)
        cursor.execute("""
            DELETE FROM question 
            WHERE course_id = %s AND sec_id = %s AND content_id = %s
        """, (course_id, sec_id, content_id))
        
        # Insert new questions
        for question in questions:
            cursor.execute("""
                INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                course_id,
                sec_id, 
                content_id,
                question['question_id'],
                question['question_body'],
                question.get('max_time', 300)  # Default 5 minutes
            ))
        
        # Update the question count in the assessment table
        cursor.execute("""
            UPDATE assessment 
            SET question_count = %s 
            WHERE course_id = %s AND sec_id = %s AND content_id = %s
        """, (len(questions), course_id, sec_id, content_id))
        
        conn.commit()
        
        return jsonify({
            "success": True, 
            "message": f"Successfully created {len(questions)} questions",
            "question_count": len(questions)
        }), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()



@completion_bp.route("/api/course/<course_id>/completion/<student_id>", methods=["GET"])
def get_completion_status(course_id, student_id):
    """Get completion status for a student in a course"""
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if course exists and is accepted
        cursor.execute("SELECT status FROM course WHERE course_id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        if course["status"] != "accepted":
            return jsonify({"success": False, "message": "Course is not accepted"}), 403

        # Check if student exists
        cursor.execute("SELECT 1 FROM student WHERE id = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student not found"}), 404

        # Check if student is enrolled
        cursor.execute("""
            SELECT 1 FROM enroll WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Student is not enrolled in this course"}), 403

        # Get completion status from complete table
        cursor.execute("""
            SELECT 
                comp.course_id,
                comp.sec_id as section_id,
                comp.content_id,
                comp.is_completed,
                c.title as content_title,
                s.title as section_title
            FROM complete comp
            JOIN content c ON (comp.course_id, comp.sec_id, comp.content_id) = (c.course_id, c.sec_id, c.content_id)
            JOIN section s ON (comp.course_id, comp.sec_id) = (s.course_id, s.sec_id)
            WHERE comp.course_id = %s 
              AND comp.student_id = %s 
              AND comp.is_completed = TRUE
            ORDER BY s.order_number, c.order_number
        """, (course_id, student_id))
        
        completed_items = []
        for row in cursor.fetchall():
            completed_items.append(dict(row))

        # Also get submitted assignments/assessments that have grades
        cursor.execute("""
            SELECT 
                s.course_id,
                s.sec_id as section_id,
                s.content_id,
                s.grade,
                c.title as content_title,
                sec.title as section_title,
                TRUE as is_completed
            FROM submit s
            JOIN content c ON (s.course_id, s.sec_id, s.content_id) = (c.course_id, c.sec_id, c.content_id)
            JOIN section sec ON (s.course_id, s.sec_id) = (sec.course_id, sec.sec_id)
            WHERE s.course_id = %s 
              AND s.student_id = %s 
              AND s.grade IS NOT NULL
            ORDER BY sec.order_number, c.order_number
        """, (course_id, student_id))
        
        graded_items = []
        for row in cursor.fetchall():
            graded_items.append(dict(row))

        # Combine both types of completed items
        all_completed = completed_items + graded_items
        
        # Remove duplicates based on section_id and content_id
        unique_completed = []
        seen = set()
        for item in all_completed:
            key = (item['section_id'], item['content_id'])
            if key not in seen:
                seen.add(key)
                unique_completed.append(item)

        return jsonify({
            "success": True,
            "completedItems": unique_completed,
            "totalCompleted": len(unique_completed)
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@completion_bp.route("/api/course/<course_id>/all-content/<student_id>", methods=["GET"])
def get_all_content_with_status(course_id, student_id):
    """Get all content in a course with completion status"""
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Get all content in the course with completion status
        cursor.execute("""
            SELECT 
                c.course_id,
                c.sec_id as section_id,
                c.content_id,
                c.title as content_title,
                c.content_type,
                c.allocated_time,
                s.title as section_title,
                s.order_number as section_order,
                c.order_number as content_order,
                CASE 
                    WHEN comp.is_completed = TRUE THEN TRUE
                    WHEN sub.grade IS NOT NULL THEN TRUE
                    ELSE FALSE
                END as is_completed,
                sub.grade
            FROM content c
            JOIN section s ON (c.course_id, c.sec_id) = (s.course_id, s.sec_id)
            LEFT JOIN complete comp ON (c.course_id, c.sec_id, c.content_id) = (comp.course_id, comp.sec_id, comp.content_id)
                AND comp.student_id = %s AND comp.is_completed = TRUE
            LEFT JOIN submit sub ON (c.course_id, c.sec_id, c.content_id) = (sub.course_id, sub.sec_id, sub.content_id)
                AND sub.student_id = %s
            WHERE c.course_id = %s
            ORDER BY s.order_number, c.order_number
        """, (student_id, student_id, course_id))
        
        content_items = []
        for row in cursor.fetchall():
            content_items.append(dict(row))

        return jsonify({
            "success": True,
            "contentItems": content_items
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()