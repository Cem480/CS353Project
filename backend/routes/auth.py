from flask import Blueprint, request, jsonify, session
from db import connect_project_db
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2.extras
from passlib.context import CryptContext
from datetime import datetime
import string
import random
import smtplib
from email.mime.text import MIMEText

auth_bp = Blueprint("auth", __name__)

# THERE IS NO PASSWORD REQUIREMENTS ADDED YET FOR SIMPLICITY


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.json
    required_fields = [
        "first_name",
        "last_name",
        "email",
        "password",
        "birth_date",
        "role",
    ]

    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT * FROM "user" WHERE email = %s', (data["email"],))
        existing = cursor.fetchone()
        if existing:
            return (
                jsonify({"success": False, "message": "Email already registered"}),
                409,
            )

        cursor.execute('SELECT COUNT(*) FROM "user"')
        user_count = cursor.fetchone()[0]
        user_id = f"U{user_count + 1:07d}"
        hashed_pw = generate_password_hash(data["password"])

        cursor.execute(
            """
            INSERT INTO "user" (
                id, first_name, middle_name, last_name,
                phone_no, email, password, registration_date,
                birth_date, role
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, %s, %s)
        """,
            (
                user_id,
                data["first_name"],
                data.get("middle_name"),
                data["last_name"],
                data.get("phone_no"),
                data["email"],
                hashed_pw,
                data["birth_date"],
                data["role"],
            ),
        )

        conn.commit()
        return (
            jsonify(
                {
                    "success": True,
                    "message": "User registered successfully",
                    "user_id": user_id,
                    "role": data["role"],
                }
            ),
            201,
        )

    except Exception as e:
        conn.rollback()
        print("Error during registration:", e)
        return jsonify({"success": False, "message": "Internal server error"}), 500

    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.json
    required_fields = ["email", "password"]

    if not all(field in data and data[field] for field in required_fields):
        return (
            jsonify({"success": False, "message": "Email and password are required"}),
            400,
        )

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT * FROM "user" WHERE email = %s', (data["email"],))
        user = cursor.fetchone()

        if not user:
            return (
                jsonify({"success": False, "message": "Invalid email or password"}),
                401,
            )

        if not check_password_hash(user["password"], data["password"]):
            return (
                jsonify({"success": False, "message": "Invalid email or password"}),
                401,
            )

        session["loggedin"] = True
        session["user_id"] = user["id"]
        session["role"] = user["role"]

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Login successful",
                    "user_id": user["id"],
                    "role": user["role"],
                }
            ),
            200,
        )

    except Exception as e:
        print("Login error:", e)
        return jsonify({"success": False, "message": "Internal server error"}), 500

    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/api/forgot_password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT * FROM "user" WHERE email = %s', (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        new_password = "".join(
            random.choices(string.ascii_letters + string.digits, k=8)
        )
        hashed_pw = generate_password_hash(new_password)

        cursor.execute(
            'UPDATE "user" SET password = %s WHERE email = %s', (hashed_pw, email)
        )
        conn.commit()

        sender_email = "budemy2@gmail.com"
        sender_password = "nmum bcja ttuo rxfs"
        smtp_server = "smtp.gmail.com"
        smtp_port = 587

        msg = MIMEText(
            f"Hi {user['first_name']}!,\n\nWe generated a new password for you! Your new password is: {new_password}\n\nPlease change your password after logging in with the password we sent you.\n\nHave a good day and keep learning with us!\n\n\nBUDEMY"
        )
        msg["Subject"] = "Password Reset - BUDEMY"
        msg["From"] = sender_email
        msg["To"] = email

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()

        return (
            jsonify(
                {"success": True, "message": "New password has been sent to your email"}
            ),
            200,
        )

    except Exception as e:
        conn.rollback()
        print("Forgot password error:", e)
        return jsonify({"success": False, "message": "Internal server error"}), 500

    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/api/change_password", methods=["POST"])
def change_password():
    data = request.json
    user_id = data.get("user_id")
    new_password = data.get("new_password")

    if not user_id or not new_password:
        return (
            jsonify(
                {"success": False, "message": "User ID and new password are required"}
            ),
            400,
        )

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    try:
        cursor.execute('SELECT password FROM "user" WHERE id = %s', (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        current_hashed_password = user["password"]

        if check_password_hash(current_hashed_password, new_password):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "New password must be different from the current password.",
                    }
                ),
                400,
            )

        new_hashed_password = generate_password_hash(new_password)

        cursor.execute(
            'UPDATE "user" SET password = %s WHERE id = %s',
            (new_hashed_password, user_id),
        )
        conn.commit()

        return (
            jsonify({"success": True, "message": "Password changed successfully!"}),
            200,
        )

    except Exception as e:
        conn.rollback()
        print("Change password error:", e)
        return jsonify({"success": False, "message": "Internal server error"}), 500

    finally:
        cursor.close()
        conn.close()
