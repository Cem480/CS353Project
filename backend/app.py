import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from db import connect_postgres_db, connect_project_db

app = Flask(__name__)

load_dotenv()

POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

"""
To drop learn_hub_db database, connect to postgres database 
because we can not drop a database that we currently use.
"""

app.secret_key = os.getenv("SECRET_KEY", "your_default_secret_key")
CORS(app)


def reset_database():
    conn = connect_postgres_db()
    conn.autocommit = True
    cursor = conn.cursor()
    POSTGRES_DB = os.getenv("POSTGRES_DB")

    cursor.execute(
        f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{POSTGRES_DB}'
            AND pid <> pg_backend_pid();
    """
    )
    print(f"Disconnected all users from {POSTGRES_DB}")

    cursor.execute(f"DROP DATABASE IF EXISTS {POSTGRES_DB};")
    print(f"Dropped database {POSTGRES_DB}")

    cursor.execute(f"CREATE DATABASE {POSTGRES_DB};")
    print(f"Created database {POSTGRES_DB}")

    cursor.close()
    conn.close()


def initialize_tables():
    conn = connect_project_db()
    cursor = conn.cursor()
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r") as f:
        schema_sql = f.read()
        cursor.execute(schema_sql)
    conn.commit()
    cursor.close()
    conn.close()
    print(f"Initialized tables from schema.sql")


@app.route("/")
def home():
    return "Backend is running!"


from routes.auth import auth_bp

app.register_blueprint(auth_bp)

RESET_DB = os.getenv("RESET_DB", "false").lower() == "true"

if __name__ == "__main__":
    if RESET_DB:
        reset_database()
        initialize_tables()
    app.run(host="0.0.0.0", port=5000, debug=True)
