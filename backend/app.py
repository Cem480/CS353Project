import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from db import connect_postgres_db, connect_project_db

app = Flask(__name__)
load_dotenv()

# Load database config
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

app.secret_key = os.getenv("SECRET_KEY", "your_default_secret_key")
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


def reset_database():
    """
    Drops and recreates the LearnHub DB by connecting to 'postgres' DB
    (because we can't drop the DB we're connected to).
    """
    conn = connect_postgres_db()
    conn.autocommit = True
    cursor = conn.cursor()

    print(f"Terminating all connections to '{POSTGRES_DB}'...")
    cursor.execute(
        f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{POSTGRES_DB}'
          AND pid <> pg_backend_pid();
    """
    )

    cursor.execute(f"DROP DATABASE IF EXISTS {POSTGRES_DB};")
    print(f"Dropped database: {POSTGRES_DB}")

    cursor.execute(f"CREATE DATABASE {POSTGRES_DB};")
    print(f"Created new database: {POSTGRES_DB}")

    cursor.close()
    conn.close()


import subprocess


def initialize_tables():
    """
    Initializes database tables using Python's psycopg2 instead of the psql CLI tool
    """
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    
    # Read the schema.sql file
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
    
    print("Running schema.sql via Python connection...")
    
    # Connect to the project database
    conn = connect_project_db()
    conn.autocommit = True
    cursor = conn.cursor()
    
    try:
        # Execute the SQL commands
        cursor.execute(schema_sql)
        print("✅ Tables initialized successfully")
    except Exception as e:
        print(f"❌ Error initializing tables: {e}")
        raise
    finally:
        # Close cursor and connection
        cursor.close()
        conn.close()

@app.route("/")
def home():
    return "Backend is running!"


# ───── ROUTES ─────
from routes.auth import auth_bp
from routes.create_course import course_bp
from routes.user_course import user_course_bp
from routes.financial_aid import financial_aid_bp
from routes.profile import profile_bp
from routes.notification import notification_bp
from routes.certificate import certificate_bp
from routes.generate_report import report_bp
from routes.course_overview import course_overview_bp
from routes.instructor import instructor_bp
from routes.student_home import student_home_bp
from routes.online_degrees import online_degrees_bp
from routes.course_content import course_content_bp
from routes.admin import admin_bp
from routes.feedback import feedback_bp
from routes.comment import comment_bp
from routes.content_operations import content_operations_bp
from routes.grading import grading_bp

app.register_blueprint(auth_bp)
app.register_blueprint(course_bp)
app.register_blueprint(user_course_bp)
app.register_blueprint(financial_aid_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(notification_bp)
app.register_blueprint(certificate_bp)
app.register_blueprint(report_bp)
app.register_blueprint(course_overview_bp)
app.register_blueprint(instructor_bp)
app.register_blueprint(student_home_bp)
app.register_blueprint(online_degrees_bp)
app.register_blueprint(course_content_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(feedback_bp)
app.register_blueprint(comment_bp)
app.register_blueprint(content_operations_bp)
app.register_blueprint(grading_bp)


# ───── DB RESET IF SPECIFIED ─────
RESET_DB = os.getenv("RESET_DB", "false").lower() == "true"
print(f"RESET_DB = {RESET_DB}")

if __name__ == "__main__":
    if RESET_DB:
        reset_database()
        initialize_tables()
    app.run(host="0.0.0.0", port=5001, debug=True)
