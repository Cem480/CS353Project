from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@profile_bp.route("", methods=["POST"])
def get_profile():
    data = request.json
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"success": False, "message": "User ID is required"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute(
            """
            SELECT u.id, u.first_name, u.middle_name, u.last_name, 
                   u.email, u.phone_no, u.birth_date, u.registration_date, 
                   uwa.age, u.role
            FROM "user" u
            JOIN user_with_age uwa ON u.id = uwa.id
            WHERE u.id = %s
        """,
            (user_id,),
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        full_name = (
            f"{user['first_name']} "
            + (f"{user['middle_name']} " if user["middle_name"] else "")
            + f"{user['last_name']}"
        )

        profile_data = {
            "full_name": full_name.strip(),
            "email": user["email"],
            "phone_no": user["phone_no"],
            "birth_date": user["birth_date"],
            "registration_date": user["registration_date"],
            "age": user["age"],
            "role": user["role"],
        }

        if user["role"] == "admin":
            cursor.execute(
                """
                SELECT report_count
                FROM admin
                WHERE id = %s
                """,
                (user_id,),
            )
            admin = cursor.fetchone()

            if not admin:
                return (
                    jsonify({"success": False, "message": "Admin record not found"}),
                    404,
                )

            cursor.execute(
                """
                SELECT course_id, title, description, category, price, creation_date, difficulty_level
                FROM course
                WHERE approver_id = %s AND status = 'accepted'
                """,
                (user_id,),
            )
            approved_courses = [
                {
                    "course_id": row["course_id"],
                    "title": row["title"],
                    "description": row["description"],
                    "category": row["category"],
                    "price": row["price"],
                    "creation_date": row["creation_date"],
                    "difficulty_level": row["difficulty_level"],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT course_id, title, description, category, price, creation_date, difficulty_level
                FROM course
                WHERE approver_id = %s AND status = 'rejected'
                """,
                (user_id,),
            )
            rejected_courses = [
                {
                    "course_id": row["course_id"],
                    "title": row["title"],
                    "description": row["description"],
                    "category": row["category"],
                    "price": row["price"],
                    "creation_date": row["creation_date"],
                    "difficulty_level": row["difficulty_level"],
                }
                for row in cursor.fetchall()
            ]

            profile_data["admin_info"] = {
                "report_count": admin["report_count"],
                "approved_courses": approved_courses,
                "rejected_courses": rejected_courses,
            }

        if user["role"] == "instructor":
            cursor.execute(
                """
                SELECT i.i_rating, i.course_count, iwe.experience_year
                FROM instructor i
                JOIN instructor_with_experience_year iwe ON i.id = iwe.id
                WHERE i.id = %s
                """,
                (user_id,),
            )
            instructor = cursor.fetchone()

            cursor.execute(
                """
                SELECT course_id, title, category, price, creation_date, difficulty_level
                FROM course
                WHERE creator_id = %s
                """,
                (user_id,),
            )
            instructor_courses = [
                {
                    "course_id": row["course_id"],
                    "title": row["title"],
                    "category": row["category"],
                    "price": row["price"],
                    "creation_date": row["creation_date"],
                    "difficulty_level": row["difficulty_level"],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                SELECT f.rating, f.comment, f.feedback_date, c.title AS course_title
                FROM feedback f
                JOIN course c ON f.course_id = c.course_id
                WHERE c.creator_id = %s
                """,
                (user_id,),
            )
            instructor_feedbacks = [
                {
                    "rating": row["rating"],
                    "comment": row["comment"],
                    "feedback_date": row["feedback_date"],
                    "course_title": row["course_title"],
                }
                for row in cursor.fetchall()
            ]

            profile_data["instructor_info"] = {
                "i_rating": instructor["i_rating"],
                "course_count": instructor["course_count"],
                "experience_year": instructor["experience_year"],
                "courses": instructor_courses,
                "feedbacks": instructor_feedbacks,
            }

        if user["role"] == "student":
            cursor.execute(
                """
                SELECT major, certificate_count
                FROM student
                WHERE id = %s
            """,
                (user_id,),
            )
            student = cursor.fetchone()

            cursor.execute(
                """
                SELECT c.title
                FROM earn_certificate ec
                JOIN certificate c ON ec.certificate_id = c.certificate_id
                WHERE ec.student_id = %s
            """,
                (user_id,),
            )
            certificates = [row["title"] for row in cursor.fetchall()]

            cursor.execute(
                """
                SELECT co.title
                FROM enroll e
                JOIN course co ON e.course_id = co.course_id
                WHERE e.student_id = %s
            """,
                (user_id,),
            )
            enrolled_courses = [row["title"] for row in cursor.fetchall()]

            cursor.execute(
                """
                SELECT co.title
                FROM enroll e
                JOIN course co ON e.course_id = co.course_id
                WHERE e.student_id = %s AND e.progress_rate = 100
            """,
                (user_id,),
            )
            completed_courses = [row["title"] for row in cursor.fetchall()]

            profile_data["student_info"] = {
                "major": student["major"],
                "certificate_count": student["certificate_count"],
                "certificates": certificates,
                "enrolled_courses": enrolled_courses,
                "completed_courses": completed_courses,
            }

        return jsonify({"success": True, "profile": profile_data}), 200

    except Exception as e:
        print("Profile fetch error:", e)
        return jsonify({"success": False, "message": "Internal server error"}), 500

    finally:
        cursor.close()
        conn.close()
