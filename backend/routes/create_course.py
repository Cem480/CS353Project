from flask import Blueprint, request, jsonify, session
from db import connect_project_db
import psycopg2.extras
import uuid
from passlib.context import CryptContext
from werkzeug.utils import secure_filename
import os

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


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

    for field in required_fields:
        if field not in data:
            return jsonify({"success": False, "message": f"Missing field: {field}"}), 400
        if isinstance(data[field], str) and not data[field].strip():
            return jsonify({"success": False, "message": f"Field {field} cannot be empty"}), 400


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
    data = request.form
    file = request.files.get("body")

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

        # Step 1: Insert into `content`
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

        # Step 2: Insert into content type table
        if data["content_type"] == "task":
            task_fields = ["passing_grade", "max_time", "task_type", "percentage"]
            if not all(field in data for field in task_fields):
                raise Exception("Missing task fields")

            cursor.execute("""
                INSERT INTO task (
                    course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                course_id, sec_id, content_id,
                int(data["passing_grade"]),
                int(data["max_time"]),
                data["task_type"],
                int(data["percentage"])
            ))

            if data["task_type"] == "assessment":
                if "question_count" not in data:
                    raise Exception("Missing question_count for assessment")
                cursor.execute("""
                    INSERT INTO assessment (
                        course_id, sec_id, content_id, question_count
                    ) VALUES (%s, %s, %s, %s)
                """, (
                    course_id, sec_id, content_id,
                    int(data["question_count"])
                ))

            elif data["task_type"] == "assignment":
                for field in ["start_date", "end_date", "upload_material", "body"]:
                    if field not in data:
                        raise Exception(f"Missing {field} for assignment")

                cursor.execute("""
                    INSERT INTO assignment (
                        course_id, sec_id, content_id, start_date,
                        end_date, upload_material, body
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    course_id, sec_id, content_id,
                    data["start_date"], data["end_date"],
                    data["upload_material"], data["body"]
                ))

        elif data["content_type"] == "document":
            file = request.files.get("body")
            if not file:
                raise Exception("No document file provided")

            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)

            cursor.execute("""
                INSERT INTO document (course_id, sec_id, content_id, body)
                VALUES (%s, %s, %s, %s)
            """, (course_id, sec_id, content_id, filepath))


        elif data["content_type"] == "visual_material":
            if "duration" not in data:
                raise Exception("Missing duration for visual material")
            
            file = request.files.get("body")
            if not file:
                raise Exception("No visual file provided")

            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)

            cursor.execute("""
                INSERT INTO visual_material (course_id, sec_id, content_id, duration, body)
                VALUES (%s, %s, %s, %s, %s)
            """, (course_id, sec_id, content_id, int(request.form["duration"]), filepath))

        
        # Update course last update time
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


@course_bp.route("/api/add/course/<course_id>/section/<sec_id>/content/<content_id>/question", methods=["POST"])
def add_question(course_id, sec_id, content_id):
    data = request.json
    question_type = data.get("question_type")  # "multiple_choice" or "open_ended"
    question_id = f"Q{uuid.uuid4().hex[:6].upper()}"

    required_fields = ["question_body", "max_time", "question_type"]
    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        # Insert into `question`
        cursor.execute("""
            INSERT INTO question (
                course_id, sec_id, content_id, question_id, question_body, max_time
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            course_id, sec_id, content_id, question_id,
            data["question_body"], int(data["max_time"])
        ))

        if question_type == "multiple_choice":
            if "correct_answer" not in data:
                raise Exception("Missing correct_answer for multiple choice")
            cursor.execute("""
                INSERT INTO multiple_choice (
                    course_id, sec_id, content_id, question_id, correct_answer
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                course_id, sec_id, content_id, question_id, data["correct_answer"]
            ))

        elif question_type == "open_ended":
            if "answer" not in data:
                raise Exception("Missing answer for open-ended question")
            cursor.execute("""
                INSERT INTO open_ended (
                    course_id, sec_id, content_id, question_id, answer
                ) VALUES (%s, %s, %s, %s, %s)
            """, (
                course_id, sec_id, content_id, question_id, data["answer"]
            ))
        else:
            raise Exception("Invalid question_type")

        conn.commit()
        return jsonify({
            "success": True,
            "question_id": question_id,
            "question_type": question_type
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@course_bp.route("/api/course/<course_id>", methods=["GET"])
def get_course(course_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT * FROM "course" WHERE course_id = %s', (course_id,))
        course = cursor.fetchone()
        
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        
        # Convert DictRow to a regular dict
        course_dict = dict(course)
        
        return jsonify({"success": True, "course": course_dict}), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

@course_bp.route("/api/course/<course_id>/sections", methods=["GET"])
def get_course_sections(course_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT * FROM "course" WHERE course_id = %s', (course_id,))
        course = cursor.fetchone()
        
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        
        cursor.execute(
            'SELECT * FROM "section" WHERE course_id = %s ORDER BY order_number', 
            (course_id,)
        )
        sections = cursor.fetchall()
        
        # Convert DictRow objects to regular dicts
        sections_list = [dict(section) for section in sections]
        
        return jsonify({"success": True, "sections": sections_list}), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

@course_bp.route("/api/course/<course_id>/section/<sec_id>/content", methods=["GET"])
def get_section_content(course_id, sec_id):
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
        
        cursor.execute(
            'SELECT * FROM "content" WHERE course_id = %s AND sec_id = %s ORDER BY allocated_time', 
            (course_id, sec_id)
        )
        content = cursor.fetchall()
        
        # Convert DictRow objects to regular dicts
        content_list = [dict(item) for item in content]
        
        # Get additional information based on content type
        for item in content_list:
            content_type = item['content_type']
            content_id = item['content_id']
            
            if content_type == 'task':
                cursor.execute(
                    'SELECT * FROM "task" WHERE course_id = %s AND sec_id = %s AND content_id = %s',
                    (course_id, sec_id, content_id)
                )
                task_info = cursor.fetchone()
                if task_info:
                    item['task_info'] = dict(task_info)
                    
                    # Get assessment or assignment specific info
                    task_type = task_info['task_type']
                    if task_type == 'assessment':
                        cursor.execute(
                            'SELECT * FROM "assessment" WHERE course_id = %s AND sec_id = %s AND content_id = %s',
                            (course_id, sec_id, content_id)
                        )
                        assessment_info = cursor.fetchone()
                        if assessment_info:
                            item['assessment_info'] = dict(assessment_info)
                    
                    elif task_type == 'assignment':
                        cursor.execute(
                            'SELECT * FROM "assignment" WHERE course_id = %s AND sec_id = %s AND content_id = %s',
                            (course_id, sec_id, content_id)
                        )
                        assignment_info = cursor.fetchone()
                        if assignment_info:
                            item['assignment_info'] = dict(assignment_info)
        
        return jsonify({"success": True, "content": content_list}), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

@course_bp.route("/api/instructor/<instructor_id>/courses", methods=["GET"])
def get_instructor_courses(instructor_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute(
            'SELECT * FROM "course" WHERE creator_id = %s ORDER BY creation_date DESC', 
            (instructor_id,)
        )
        courses = cursor.fetchall()
        
        # Convert DictRow objects to regular dicts
        courses_list = [dict(course) for course in courses]
        
        # Add additional information like student count for each course
        for course in courses_list:
            course_id = course['course_id']
            
            # Get student count for this course
            cursor.execute(
                'SELECT COUNT(*) FROM "enroll" WHERE course_id = %s', 
                (course_id,)
            )
            count_result = cursor.fetchone()
            course['students'] = count_result[0] if count_result else 0
            
            # Determine course progress if it's in draft status
            if course['status'] == 'draft':
                # This is a simplified progress calculation
                # You might want to implement a more sophisticated algorithm
                cursor.execute(
                    'SELECT COUNT(*) FROM "section" WHERE course_id = %s', 
                    (course_id,)
                )
                section_count = cursor.fetchone()[0] or 0
                
                # Simple progress: if there are sections, assume 50% progress
                course['progress'] = 50 if section_count > 0 else 25
            else:
                course['progress'] = 100  # Published courses are complete
        
        return jsonify({"success": True, "courses": courses_list}), 200
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()