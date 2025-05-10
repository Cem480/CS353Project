from flask import Blueprint, jsonify, request
import psycopg2.extras
from db import connect_project_db
import uuid

instructor_bp = Blueprint('instructor', __name__)

# 4.1 Instructor Courses Page
"""
SQL Statements:
SELECT c.course_id, c.title, c.description, c.price, c.difficulty_level, c.status,
       COUNT(DISTINCT e.student_id) as students,
       CASE 
           WHEN c.status = 'draft' THEN 
               COALESCE(
                   100.0 * (
                       SELECT COUNT(*)
                       FROM section_content sc
                       WHERE sc.section_id IN (
                           SELECT section_id FROM section WHERE course_id = c.course_id
                       )
                   )
                   / NULLIF((SELECT COUNT(*) FROM section WHERE course_id = c.course_id) * 5, 0),
               0)
           ELSE 100
       END as progress
FROM course c
LEFT JOIN enroll e ON c.course_id = e.course_id
WHERE c.creator_id = @instructorID
GROUP BY c.course_id
ORDER BY c.creation_date DESC;
"""
@instructor_bp.route('/api/instructor/<instructor_id>/courses', methods=['GET'])
def get_instructor_courses(instructor_id):
    """Get all courses created by a specific instructor"""
    try:
        conn = connect_project_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Query to get all courses created by the instructor
        cursor.execute("""
            SELECT
                c.course_id,
                c.title,
                c.description,
                c.price,
                c.difficulty_level,
                c.status,
                COUNT(DISTINCT e.student_id) AS students,
                CASE
                    WHEN c.status = 'draft' THEN
                        COALESCE(
                            100.0 * (
                                SELECT COUNT(*)
                                FROM content sc
                                WHERE sc.course_id = c.course_id
                            )
                            / NULLIF((SELECT COUNT(*) FROM section WHERE course_id = c.course_id) * 5, 0),
                        0)
                    ELSE 100
                END AS progress
            FROM course c
            LEFT JOIN enroll e ON c.course_id = e.course_id
            WHERE c.creator_id = %s
            GROUP BY c.course_id
            ORDER BY c.creation_date DESC
        """, (instructor_id,))
        
        courses = []
        for row in cursor.fetchall():
            course = {
                'id': row['course_id'],
                'title': row['title'],
                'description': row['description'],
                'price': float(row['price']) if row['price'] else 0.0,
                'level': row['difficulty_level'],
                'status': row['status'],
                'students': row['students'],
                'progress': row['progress'] if row['progress'] is not None else 0
            }
            courses.append(course)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'courses': courses
        })
    
    except Exception as e:
        print(f"Error in get_instructor_courses: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch instructor courses: {str(e)}'
        }), 500

# 4.2 Instructor Statistics Page
"""
SQL Statements:
-- Query for published course count
SELECT COUNT(*) 
FROM course 
WHERE creator_id = @instructorID AND status = 'published';

-- Query for total students
SELECT COUNT(DISTINCT e.student_id) 
FROM enroll e
JOIN course c ON e.course_id = c.course_id
WHERE c.creator_id = @instructorID;

-- Query for average rating
SELECT COALESCE(AVG(f.rating), 0)
FROM feedback f
JOIN course c ON f.course_id = c.course_id
WHERE c.creator_id = @instructorID;

-- Query for monthly revenue (this query may need to be adjusted as there's no direct payment table in schema)
SELECT COALESCE(SUM(c.price), 0)
FROM course c
JOIN enroll e ON c.course_id = e.course_id
WHERE c.creator_id = @instructorID 
AND e.enroll_date >= CURRENT_DATE - INTERVAL '30 days';
"""
@instructor_bp.route('/api/instructor/<instructor_id>/stats', methods=['GET'])
def get_instructor_stats(instructor_id):
    """Get statistics for an instructor (published courses, total students, ratings, revenue)"""
    try:
        conn = connect_project_db()
        cursor = conn.cursor()
        
        # Query for published course count
        cursor.execute("""
            SELECT COUNT(*) 
            FROM course 
            WHERE creator_id = %s AND status = 'accepted'
        """, (instructor_id,))
        published_courses = cursor.fetchone()[0]
        
        # Query for total students
        cursor.execute("""
            SELECT COUNT(DISTINCT e.student_id) 
            FROM enroll e
            JOIN course c ON e.course_id = c.course_id
            WHERE c.creator_id = %s
        """, (instructor_id,))
        total_students = cursor.fetchone()[0]
        
        # Query for average rating
        cursor.execute("""
            SELECT COALESCE(AVG(f.rating), 0)
            FROM feedback f
            JOIN course c ON f.course_id = c.course_id
            WHERE c.creator_id = %s
        """, (instructor_id,))
        avg_rating = cursor.fetchone()[0]
        
        # Query for monthly revenue (assuming enrollment = payment)
        cursor.execute("""
            SELECT COALESCE(SUM(c.price), 0)
            FROM course c
            JOIN enroll e ON c.course_id = e.course_id
            WHERE c.creator_id = %s 
            AND e.enroll_date >= CURRENT_DATE - INTERVAL '30 days'
        """, (instructor_id,))
        monthly_revenue = cursor.fetchone()[0]
        
        stats = {
            'publishedCourses': published_courses,
            'totalStudents': total_students,
            'averageRating': float(avg_rating) if avg_rating else 0.0,
            'monthlyRevenue': float(monthly_revenue) if monthly_revenue else 0.0
        }
        
        cursor.close()
        conn.close()
        
        return jsonify(stats)
    
    except Exception as e:
        print(f"Error in get_instructor_stats: {e}")
        return jsonify({
            'publishedCourses': 0,
            'totalStudents': 0,
            'averageRating': 0.0,
            'monthlyRevenue': 0.0,
            'error': str(e)
        }), 500

# 4.3 View Student Enrollment and Progress
"""
SQL Statements:
SELECT s.id as student_id, 
       u.first_name, 
       u.last_name, 
       e.enroll_date, 
       e.progress_rate,
       COUNT(DISTINCT c.content_id) as total_content,
       COUNT(DISTINCT comp.content_id) as completed_content
FROM enroll e
JOIN student s ON e.student_id = s.id
JOIN "user" u ON s.id = u.id
JOIN course co ON e.course_id = co.course_id
LEFT JOIN section sec ON sec.course_id = co.course_id
LEFT JOIN content c ON c.course_id = sec.course_id AND c.sec_id = sec.sec_id
LEFT JOIN complete comp ON comp.course_id = c.course_id 
                        AND comp.sec_id = c.sec_id 
                        AND comp.content_id = c.content_id 
                        AND comp.student_id = s.id 
                        AND comp.is_completed = TRUE
WHERE co.course_id = @courseID AND co.creator_id = @instructorID
GROUP BY s.id, u.first_name, u.last_name, e.enroll_date, e.progress_rate
ORDER BY e.progress_rate DESC, u.last_name, u.first_name;
"""
@instructor_bp.route('/api/instructor/<instructor_id>/course/<course_id>/students', methods=['GET'])
def get_course_students(instructor_id, course_id):
    """Get all students enrolled in a specific course with their progress"""
    try:
        conn = connect_project_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # First verify this course belongs to the instructor
        cursor.execute("""
            SELECT 1 FROM course WHERE course_id = %s AND creator_id = %s
        """, (course_id, instructor_id))
        
        if cursor.fetchone() is None:
            return jsonify({
                'success': False,
                'message': 'Course not found or you do not have permission to view it'
            }), 404
        
        # Get all enrolled students with their progress
        cursor.execute("""
            SELECT s.id as student_id, 
                   u.first_name, 
                   u.last_name, 
                   e.enroll_date, 
                   e.progress_rate,
                   COUNT(DISTINCT c.content_id) as total_content,
                   COUNT(DISTINCT comp.content_id) as completed_content
            FROM enroll e
            JOIN student s ON e.student_id = s.id
            JOIN "user" u ON s.id = u.id
            JOIN course co ON e.course_id = co.course_id
            LEFT JOIN section sec ON sec.course_id = co.course_id
            LEFT JOIN content c ON c.course_id = sec.course_id AND c.sec_id = sec.sec_id
            LEFT JOIN complete comp ON comp.course_id = c.course_id 
                                    AND comp.sec_id = c.sec_id 
                                    AND comp.content_id = c.content_id 
                                    AND comp.student_id = s.id 
                                    AND comp.is_completed = TRUE
            WHERE co.course_id = %s AND co.creator_id = %s
            GROUP BY s.id, u.first_name, u.last_name, e.enroll_date, e.progress_rate
            ORDER BY e.progress_rate DESC, u.last_name, u.first_name
        """, (course_id, instructor_id))
        
        students = []
        for row in cursor.fetchall():
            students.append({
                'studentId': row['student_id'],
                'firstName': row['first_name'],
                'lastName': row['last_name'],
                'enrollDate': row['enroll_date'].isoformat() if row['enroll_date'] else None,
                'progressRate': row['progress_rate'],
                'totalContent': row['total_content'],
                'completedContent': row['completed_content']
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'students': students
        })
    
    except Exception as e:
        print(f"Error in get_course_students: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch course students: {str(e)}'
        }), 500

# 4.4 View Course Feedback/Ratings
"""
SQL Statements:
SELECT f.course_id,
       f.student_id,
       u.first_name,
       u.last_name,
       f.rating,
       f.comment,
       f.feedback_date
FROM feedback f
JOIN student s ON f.student_id = s.id
JOIN "user" u ON s.id = u.id
JOIN course c ON f.course_id = c.course_id
WHERE f.course_id = @courseID AND c.creator_id = @instructorID
ORDER BY f.feedback_date DESC;

-- For average rating
SELECT AVG(f.rating) as avg_rating, COUNT(*) as review_count
FROM feedback f
JOIN course c ON f.course_id = c.course_id
WHERE f.course_id = @courseID AND c.creator_id = @instructorID;
"""
@instructor_bp.route('/api/instructor/<instructor_id>/course/<course_id>/feedback', methods=['GET'])
def get_course_feedback(instructor_id, course_id):
    """Get all feedback for a specific course"""
    try:
        conn = connect_project_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # First verify this course belongs to the instructor
        cursor.execute("""
            SELECT 1 FROM course WHERE course_id = %s AND creator_id = %s
        """, (course_id, instructor_id))
        
        if cursor.fetchone() is None:
            return jsonify({
                'success': False,
                'message': 'Course not found or you do not have permission to view it'
            }), 404
        
        # Get average rating and review count
        cursor.execute("""
            SELECT COALESCE(AVG(f.rating), 0) as avg_rating, COUNT(*) as review_count
            FROM feedback f
            JOIN course c ON f.course_id = c.course_id
            WHERE f.course_id = %s AND c.creator_id = %s
        """, (course_id, instructor_id))
        
        stats = cursor.fetchone()
        
        # Get all feedback
        cursor.execute("""
            SELECT f.course_id,
                   f.student_id,
                   u.first_name,
                   u.last_name,
                   f.rating,
                   f.comment,
                   f.feedback_date
            FROM feedback f
            JOIN student s ON f.student_id = s.id
            JOIN "user" u ON s.id = u.id
            JOIN course c ON f.course_id = c.course_id
            WHERE f.course_id = %s AND c.creator_id = %s
            ORDER BY f.feedback_date DESC
        """, (course_id, instructor_id))
        
        feedback_list = []
        for row in cursor.fetchall():
            feedback_list.append({
                'courseId': row['course_id'],
                'studentId': row['student_id'],
                'studentName': f"{row['first_name']} {row['last_name']}",
                'rating': row['rating'],
                'comment': row['comment'],
                'feedbackDate': row['feedback_date'].isoformat() if row['feedback_date'] else None
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'averageRating': float(stats['avg_rating']) if stats and stats['avg_rating'] else 0.0,
            'reviewCount': stats['review_count'] if stats else 0,
            'feedback': feedback_list
        })
    
    except Exception as e:
        print(f"Error in get_course_feedback: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch course feedback: {str(e)}'
        }), 500

# 4.5 Edit an Existing Course
@instructor_bp.route('/api/instructor/<instructor_id>/course/<course_id>/edit', methods=['PUT'])
def edit_course(instructor_id, course_id):
    conn = connect_project_db()
    cursor = conn.cursor()
    
    # Verify course exists and belongs to the instructor
    cursor.execute(
        "SELECT * FROM course WHERE course_id = %s AND creator_id = %s",
        (course_id, instructor_id)
    )
    course = cursor.fetchone()
    
    if not course:
        return jsonify({"error": "Course not found or you're not authorized to edit it"}), 404
    
    data = request.json
    
    try:
        # Start a transaction
        cursor.execute("BEGIN")

        # Update course table
        cursor.execute(
            """UPDATE course 
               SET title = %s, description = %s, category = %s, price = %s, 
                   difficulty_level = %s, status = %s, last_update_date = CURRENT_DATE
               WHERE course_id = %s AND creator_id = %s""",
            (data.get('title'), data.get('description'), data.get('category'), data.get('price'),
             data.get('difficultyLevel'), data.get('status', 'draft'), course_id, instructor_id)
        )

        # Process sections
        processed_sections = set()
        if 'sections' in data:
            for sec_data in data['sections']:
                sec_id = sec_data.get('id')
                if sec_id:  # Existing section
                    processed_sections.add(sec_id)
                    
                    # Get order_number and allocated_time for update
                    update_sec_order_number = sec_data.get('order_number')
                    update_sec_allocated_time = sec_data.get('allocated_time')

                    cursor.execute(
                        """UPDATE section 
                           SET title = %s, description = %s, order_number = %s, allocated_time = %s
                           WHERE course_id = %s AND sec_id = %s""",
                        (sec_data.get('title'), sec_data.get('description'), 
                         update_sec_order_number, 
                         update_sec_allocated_time, 
                         course_id, sec_id)
                    )
                else:  # New section
                    sec_id = str(uuid.uuid4())[:8]
                    
                    new_sec_order_number = sec_data.get('order_number')
                    if new_sec_order_number is None:
                        new_sec_order_number = 1  # Default for NOT NULL field

                    new_sec_allocated_time = sec_data.get('allocated_time')

                    cursor.execute(
                        """INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (course_id, sec_id, sec_data.get('title'), sec_data.get('description'), 
                         new_sec_order_number, new_sec_allocated_time)
                    )

                # Process contents for this section
                processed_contents = set()
                if 'contents' in sec_data:
                    for content_data in sec_data['contents']:
                        content_id = content_data.get('id')
                        content_type = content_data.get('type') # task, document, visual_material

                        if content_id:  # Existing content
                            processed_contents.add(content_id)
                            cursor.execute(
                                """UPDATE content 
                                   SET title = %s, order_number = %s, allocated_time = %s, content_type = %s
                                   WHERE course_id = %s AND sec_id = %s AND content_id = %s""",
                                (content_data.get('title'), content_data.get('order'), 
                                 content_data.get('allocatedTime'), content_type, course_id, sec_id, content_id)
                            )
                            # Update specific content type table (task, document, visual_material)
                            if content_type == 'task':
                                task_type = content_data.get('taskType') # assessment, assignment
                                cursor.execute(
                                    """UPDATE task SET passing_grade=%s, max_time=%s, task_type=%s, percentage=%s
                                       WHERE course_id=%s AND sec_id=%s AND content_id=%s""",
                                    (content_data.get('passingGrade'), content_data.get('maxTime'), task_type, 
                                     content_data.get('percentage'), course_id, sec_id, content_id)
                                )
                                if task_type == 'assessment':
                                    cursor.execute(
                                        """UPDATE assessment SET question_count=%s
                                           WHERE course_id=%s AND sec_id=%s AND content_id=%s""",
                                        (len(content_data.get('questions', [])), course_id, sec_id, content_id)
                                    )
                                    # Process questions for assessment
                                    processed_questions = set()
                                    if 'questions' in content_data:
                                        for q_data in content_data['questions']:
                                            q_id = q_data.get('id')
                                            if q_id: # Existing question
                                                processed_questions.add(q_id)
                                                cursor.execute(
                                                    """UPDATE question SET question_body=%s, max_time=%s
                                                       WHERE course_id=%s AND sec_id=%s AND content_id=%s AND question_id=%s""",
                                                    (q_data.get('body'), q_data.get('maxTime'), course_id, sec_id, content_id, q_id)
                                                )
                                                if q_data.get('questionType') == 'multiple_choice':
                                                    cursor.execute(
                                                        """UPDATE multiple_choice SET correct_answer=%s
                                                           WHERE course_id=%s AND sec_id=%s AND content_id=%s AND question_id=%s""",
                                                        (q_data.get('correctAnswer'), course_id, sec_id, content_id, q_id)
                                                    )
                                                elif q_data.get('questionType') == 'open_ended':
                                                    cursor.execute(
                                                        """UPDATE open_ended SET answer=%s
                                                           WHERE course_id=%s AND sec_id=%s AND content_id=%s AND question_id=%s""",
                                                        (q_data.get('answer'), course_id, sec_id, content_id, q_id)
                                                    )
                                            else: # New question
                                                q_id = str(uuid.uuid4())[:8]
                                                cursor.execute(
                                                    """INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time)
                                                       VALUES (%s, %s, %s, %s, %s, %s)""",
                                                    (course_id, sec_id, content_id, q_id, q_data.get('body'), q_data.get('maxTime'))
                                                )
                                                if q_data.get('questionType') == 'multiple_choice':
                                                    cursor.execute(
                                                        """INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer)
                                                           VALUES (%s, %s, %s, %s, %s)""",
                                                        (course_id, sec_id, content_id, q_id, q_data.get('correctAnswer'))
                                                    )
                                                elif q_data.get('questionType') == 'open_ended':
                                                    cursor.execute(
                                                        """INSERT INTO open_ended (course_id, sec_id, content_id, question_id, answer)
                                                           VALUES (%s, %s, %s, %s, %s)""",
                                                        (course_id, sec_id, content_id, q_id, q_data.get('answer'))
                                                    )
                                    # Delete questions not in payload
                                    cursor.execute("SELECT question_id FROM question WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id))
                                    existing_questions = {row[0] for row in cursor.fetchall()}
                                    questions_to_delete = existing_questions - processed_questions
                                    for q_id_del in questions_to_delete:
                                        # Before deleting question, delete from multiple_choice and open_ended
                                        cursor.execute("DELETE FROM multiple_choice WHERE course_id = %s AND sec_id = %s AND content_id = %s AND question_id = %s", (course_id, sec_id, content_id, q_id_del))
                                        cursor.execute("DELETE FROM open_ended WHERE course_id = %s AND sec_id = %s AND content_id = %s AND question_id = %s", (course_id, sec_id, content_id, q_id_del))
                                        cursor.execute("DELETE FROM question WHERE course_id = %s AND sec_id = %s AND content_id = %s AND question_id = %s", (course_id, sec_id, content_id, q_id_del))

                                elif task_type == 'assignment':
                                    cursor.execute(
                                        """UPDATE assignment SET start_date=%s, end_date=%s, upload_material=%s, body=%s
                                           WHERE course_id=%s AND sec_id=%s AND content_id=%s""",
                                        (content_data.get('startDate'), content_data.get('endDate'), 
                                         content_data.get('uploadMaterial'), content_data.get('body'), 
                                         course_id, sec_id, content_id)
                                    )
                            elif content_type == 'document':
                                cursor.execute(
                                    """UPDATE document SET body=%s
                                       WHERE course_id=%s AND sec_id=%s AND content_id=%s""",
                                    (content_data.get('body'), course_id, sec_id, content_id)
                                )
                            elif content_type == 'visual_material':
                                cursor.execute(
                                    """UPDATE visual_material SET duration=%s, body=%s
                                       WHERE course_id=%s AND sec_id=%s AND content_id=%s""",
                                    (content_data.get('duration'), content_data.get('body'), course_id, sec_id, content_id)
                                )
                        else:  # New content
                            content_id = str(uuid.uuid4())[:8]
                            cursor.execute(
                                """INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type)
                                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                                (course_id, sec_id, content_id, content_data.get('title'), content_data.get('order'), 
                                 content_data.get('allocatedTime'), content_type)
                            )
                            # Insert into specific content type table
                            if content_type == 'task':
                                task_type = content_data.get('taskType')
                                cursor.execute(
                                    """INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage)
                                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                                    (course_id, sec_id, content_id, content_data.get('passingGrade'), content_data.get('maxTime'), 
                                     task_type, content_data.get('percentage'))
                                )
                                if task_type == 'assessment':
                                    cursor.execute(
                                        """INSERT INTO assessment (course_id, sec_id, content_id, question_count)
                                           VALUES (%s, %s, %s, %s)""",
                                        (course_id, sec_id, content_id, len(content_data.get('questions', [])))
                                    )
                                    if 'questions' in content_data:
                                        for q_data in content_data['questions']:
                                            q_id = str(uuid.uuid4())[:8]
                                            cursor.execute(
                                                """INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time)
                                                   VALUES (%s, %s, %s, %s, %s, %s)""",
                                                (course_id, sec_id, content_id, q_id, q_data.get('body'), q_data.get('maxTime'))
                                            )
                                            if q_data.get('questionType') == 'multiple_choice':
                                                cursor.execute(
                                                    """INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer)
                                                       VALUES (%s, %s, %s, %s, %s)""",
                                                    (course_id, sec_id, content_id, q_id, q_data.get('correctAnswer'))
                                                )
                                            elif q_data.get('questionType') == 'open_ended':
                                                cursor.execute(
                                                    """INSERT INTO open_ended (course_id, sec_id, content_id, question_id, answer)
                                                       VALUES (%s, %s, %s, %s, %s)""",
                                                    (course_id, sec_id, content_id, q_id, q_data.get('answer'))
                                                )
                                elif task_type == 'assignment':
                                    cursor.execute(
                                        """INSERT INTO assignment (course_id, sec_id, content_id, start_date, end_date, upload_material, body)
                                           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                                        (course_id, sec_id, content_id, content_data.get('startDate'), content_data.get('endDate'), 
                                         content_data.get('uploadMaterial'), content_data.get('body'))
                                    )
                            elif content_type == 'document':
                                cursor.execute(
                                    """INSERT INTO document (course_id, sec_id, content_id, body)
                                       VALUES (%s, %s, %s, %s)""",
                                    (course_id, sec_id, content_id, content_data.get('body'))
                                )
                            elif content_type == 'visual_material':
                                cursor.execute(
                                    """INSERT INTO visual_material (course_id, sec_id, content_id, duration, body)
                                       VALUES (%s, %s, %s, %s, %s)""",
                                    (course_id, sec_id, content_id, content_data.get('duration'), content_data.get('body'))
                                )
                
                # Delete contents not in payload for this section
                cursor.execute("SELECT content_id, content_type FROM content WHERE course_id = %s AND sec_id = %s", (course_id, sec_id))
                existing_contents_rows = cursor.fetchall()
                existing_contents = {row[0]: row[1] for row in existing_contents_rows} # Store as dict {content_id: content_type}
                
                contents_to_delete = set(existing_contents.keys()) - processed_contents
                print(f"Section {sec_id}, existing contents: {existing_contents.keys()}, processed contents: {processed_contents}, to_delete: {contents_to_delete}")

                for content_id_del in contents_to_delete:
                    content_type_del = existing_contents[content_id_del]
                    print(f"Deleting content: {content_id_del} of type {content_type_del} from section {sec_id}")
                    # 1. Delete from 'complete' table first
                    cursor.execute("DELETE FROM complete WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                    print(f"Deleted from complete for content {content_id_del}")

                    if content_type_del == 'task':
                        # Need to find task_type (assessment or assignment)
                        cursor.execute("SELECT task_type FROM task WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                        task_type_row = cursor.fetchone()
                        if task_type_row:
                            task_type_del = task_type_row[0]
                            if task_type_del == 'assessment':
                                # Delete from multiple_choice and open_ended first (via question_id)
                                cursor.execute("SELECT question_id FROM question WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                                questions_in_assessment = [q_row[0] for q_row in cursor.fetchall()]
                                for q_id_del_assess in questions_in_assessment:
                                    cursor.execute("DELETE FROM multiple_choice WHERE course_id = %s AND sec_id = %s AND content_id = %s AND question_id = %s", (course_id, sec_id, content_id_del, q_id_del_assess))
                                    cursor.execute("DELETE FROM open_ended WHERE course_id = %s AND sec_id = %s AND content_id = %s AND question_id = %s", (course_id, sec_id, content_id_del, q_id_del_assess))
                                    print(f"Deleted from mcq/oe for question {q_id_del_assess}")
                                # Delete from question
                                cursor.execute("DELETE FROM question WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                                print(f"Deleted from question for assessment {content_id_del}")
                                # Delete from assessment
                                cursor.execute("DELETE FROM assessment WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                                print(f"Deleted from assessment for content {content_id_del}")
                            elif task_type_del == 'assignment':
                                # Delete from assignment
                                cursor.execute("DELETE FROM assignment WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                                print(f"Deleted from assignment for content {content_id_del}")
                        # Delete from task
                        cursor.execute("DELETE FROM task WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                        print(f"Deleted from task for content {content_id_del}")
                    elif content_type_del == 'document':
                        cursor.execute("DELETE FROM document WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                        print(f"Deleted from document for content {content_id_del}")
                    elif content_type_del == 'visual_material':
                        cursor.execute("DELETE FROM visual_material WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                        print(f"Deleted from visual_material for content {content_id_del}")
                    
                    # Finally, delete from content
                    cursor.execute("DELETE FROM content WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id, content_id_del))
                    print(f"Deleted from content for content_id {content_id_del}")

        # Delete sections not in payload
        cursor.execute("SELECT sec_id FROM section WHERE course_id = %s", (course_id,))
        existing_sections = {row[0] for row in cursor.fetchall()}
        sections_to_delete = existing_sections - processed_sections
        print(f"Course {course_id}, existing sections: {existing_sections}, processed sections: {processed_sections}, to_delete: {sections_to_delete}")

        for sec_id_del in sections_to_delete:
            print(f"Deleting section: {sec_id_del}")
            # Fetch all content_ids and their types for this section before deleting them
            cursor.execute("SELECT content_id, content_type FROM content WHERE course_id = %s AND sec_id = %s", (course_id, sec_id_del))
            contents_in_section_to_delete = cursor.fetchall()

            for content_id_del, content_type_del in contents_in_section_to_delete:
                print(f"Deleting content: {content_id_del} of type {content_type_del} from section {sec_id_del} (during section deletion)")
                # 1. Delete from 'complete' table first
                cursor.execute("DELETE FROM complete WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                print(f"Deleted from complete for content {content_id_del} in section {sec_id_del}")

                if content_type_del == 'task':
                    cursor.execute("SELECT task_type FROM task WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                    task_type_row = cursor.fetchone()
                    if task_type_row:
                        task_type_del_sec = task_type_row[0]
                        if task_type_del_sec == 'assessment':
                            cursor.execute("SELECT question_id FROM question WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                            questions_in_assessment_sec = [q_row[0] for q_row in cursor.fetchall()]
                            for q_id_del_sec_assess in questions_in_assessment_sec:
                                cursor.execute("DELETE FROM multiple_choice WHERE course_id = %s AND sec_id = %s AND content_id = %s AND question_id = %s", (course_id, sec_id_del, content_id_del, q_id_del_sec_assess))
                                cursor.execute("DELETE FROM open_ended WHERE course_id = %s AND sec_id = %s AND content_id = %s AND question_id = %s", (course_id, sec_id_del, content_id_del, q_id_del_sec_assess))
                            cursor.execute("DELETE FROM question WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                            cursor.execute("DELETE FROM assessment WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                        elif task_type_del_sec == 'assignment':
                            cursor.execute("DELETE FROM assignment WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                    cursor.execute("DELETE FROM task WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                elif content_type_del == 'document':
                    cursor.execute("DELETE FROM document WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                elif content_type_del == 'visual_material':
                    cursor.execute("DELETE FROM visual_material WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                
                # Delete from content (for the section being deleted)
                cursor.execute("DELETE FROM content WHERE course_id = %s AND sec_id = %s AND content_id = %s", (course_id, sec_id_del, content_id_del))
                print(f"Deleted from content for content_id {content_id_del} in section {sec_id_del}")

            # Finally, delete the section itself
            cursor.execute("DELETE FROM section WHERE course_id = %s AND sec_id = %s", (course_id, sec_id_del))
            print(f"Deleted section {sec_id_del}")

        conn.commit()
        return jsonify({"success": True, "message": "Course updated successfully"})
    except Exception as e:
        cursor.execute("ROLLBACK")
        conn.close()
        return jsonify({"error": str(e)}), 500