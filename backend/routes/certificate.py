from flask import Blueprint, request, jsonify, session
from db import connect_project_db
import psycopg2.extras
from datetime import datetime 

certificate_bp = Blueprint("certificate", __name__)

@certificate_bp.route("/api/certificate/generate/<course_id>/<student_id>", methods=["POST"])
def generate_certificate(course_id, student_id):
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        # 1. Check if student exists (Also get his name for certificate)
        cursor.execute("""
            SELECT first_name, middle_name, last_name 
            FROM "user" 
            WHERE id = %s AND role = %s
        """, (student_id, "student"))
        student = cursor.fetchone()
        if student is None:
            return jsonify({"success": False, "message": "Student does not exist."}), 404

        # 2. Check if course exists (Also get the title for certificate)
        cursor.execute("""
            SELECT title 
            FROM course 
            WHERE course_id = %s
        """, (course_id,))
        course = cursor.fetchone()
        if course is None:
            return jsonify({"success": False, "message": "Course does not exist."}), 404
        
        # 3. Check if enrollment exists
        cursor.execute("""
            SELECT progress_rate FROM enroll 
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        enroll = cursor.fetchone()
        if enroll is None:
            return jsonify({"success": False, "message": "Student is not enrolled in this course."}), 403

        # 4. Check if certificate already exists
        cursor.execute("""
            SELECT 1 FROM earn_certificate 
            WHERE course_id = %s AND student_id = %s
        """, (course_id, student_id))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "Certificate has already been issued for this course."}), 409

        # 5. Check if progress_rate is 100
        if enroll["progress_rate"] < 100:
            return jsonify({"success": False, "message": "Course is not fully completed yet (100% progress required)."}), 403

        # Count existing certificates
        cursor.execute("SELECT COUNT(*) FROM certificate")
        certificate_count = cursor.fetchone()[0]

        # Generate new certificate ID
        cert_id = f"C{certificate_count + 1:07d}"
        full_name = " ".join(filter(None, [student["first_name"], student["middle_name"], student["last_name"]]))
        course_title = course["title"]
        date_str = datetime.today().strftime("%B %d, %Y")  # e.g., April 30, 2025

        title = f"Certificate of Completion: {course_title}"
        body = (
            f"This is to certify that {full_name} has successfully completed the online course "
            f"\"{course_title}\" on {date_str}. Congratulations on your achievement!"
        )

        # Insert into certificate table
        cursor.execute("""
            INSERT INTO certificate (certificate_id, title, body)
            VALUES (%s, %s, %s)
        """, (cert_id, title, body))

        # Insert into earn_certificate table
        cursor.execute("""
            INSERT INTO earn_certificate (student_id, course_id, certificate_id, certification_date)
            VALUES (%s, %s, %s, CURRENT_DATE)
        """, (student_id, course_id, cert_id))

        conn.commit()
        return jsonify({
            "success": True,
            "message": "Certificate successfully issued.",
            "certificate_id": cert_id
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": f"Internal server error: {str(e)}"}), 500

    finally:
        cursor.close()
        conn.close()

@certificate_bp.route("/api/certificate/list", methods=["GET"])
def list_certificates():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Not authenticated"}), 401

    user_id = session["user_id"]
    user_role = session.get("role")

    if user_role != "student":
        return jsonify({"success": False, "message": "Only students can have certificates"}), 403

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute("""
            SELECT 
                ec.certificate_id, 
                c.title, 
                c.body, 
                ec.certification_date, 
                crs.title AS course_title,
                u.first_name, 
                u.middle_name, 
                u.last_name
            FROM earn_certificate ec
            JOIN certificate c ON ec.certificate_id = c.certificate_id
            JOIN course crs ON ec.course_id = crs.course_id
            JOIN "user" u ON ec.student_id = u.id
            WHERE ec.student_id = %s
            ORDER BY ec.certification_date DESC
        """, (user_id,))

        rows = cursor.fetchall()

        certificates = [
            {
                "certificate_id": row["certificate_id"],
                "title": row["title"],
                "body": row["body"],
                "certification_date": row["certification_date"].strftime("%Y-%m-%d"),
                "course_title": row["course_title"],
                "student_name": " ".join(filter(None, [row["first_name"], row["middle_name"], row["last_name"]]))
            }
            for row in rows
        ]

        return jsonify({"success": True, "certificates": certificates, "count": len(certificates)})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        cursor.close()
        conn.close()