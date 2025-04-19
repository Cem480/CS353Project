import psycopg2
import os
from flask import Flask
from dotenv import load_dotenv

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
def connect_postgres_db():
    return psycopg2.connect(
        dbname="postgres",
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

# To connect learn_hub_db
def connect_project_db():
    return psycopg2.connect(
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

# Drop database to reset it
def reset_database():
    conn = connect_postgres_db()
    conn.autocommit = True
    cursor = conn.cursor()

    # Force disconnect all users
    cursor.execute(f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{POSTGRES_DB}'
            AND pid <> pg_backend_pid();
    """)
    print(f"Disconnected all users from {POSTGRES_DB}")

    cursor.execute(f"DROP DATABASE IF EXISTS {POSTGRES_DB};")
    print(f"Dropped database {POSTGRES_DB}")

    cursor.execute(f"CREATE DATABASE {POSTGRES_DB};")
    print(f"Created database {POSTGRES_DB}")

    cursor.close()
    conn.close()

# Initialize the database using the schema.sql
def initialize_tables():
    conn = connect_project_db()
    cursor = conn.cursor()

    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
        cursor.execute(schema_sql)

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Initialized tables from schema.sql")

@app.route('/')
def home():
    return "Backend is running!"

if __name__ == '__main__':
    reset_database()     # Clean full database first
    initialize_tables()  # Create tables
    app.run(host='0.0.0.0', port=5000, debug=True)
