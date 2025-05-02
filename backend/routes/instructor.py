from flask import Blueprint, jsonify, request
import psycopg2.extras
from db import connect_project_db

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

