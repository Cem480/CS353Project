from flask import Blueprint, request, jsonify, session
from db import connect_project_db
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2.extras
from passlib.context import CryptContext
from datetime import datetime

auth_bp = Blueprint("auth", __name__)


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
