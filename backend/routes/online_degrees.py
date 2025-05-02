from flask import Blueprint, request, jsonify
from db import connect_project_db

online_degrees_bp = Blueprint("online_degrees_bp", __name__)

@online_degrees_bp.route("/api/degrees", methods=["GET"])
def get_online_degrees():
    try:
        conn = connect_project_db()
        cursor = conn.cursor()

        # Base query
        base_query = """
            SELECT 
                c.course_id,
                c.title,
                c.description,
                CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) AS instructor_name,
                c.category,
                c.price,
                c.difficulty_level,
                c.creation_date,
                c.last_update_date,
                c.enrollment_count
            FROM course c
            JOIN instructor i ON c.creator_id = i.id
            JOIN "user" u ON u.id = i.id
            WHERE c.status = 'accepted'
        """

        filters = []
        values = []

        # Title
        search_title = request.args.get("title")
        if search_title:
            filters.append("c.title ILIKE %s")
            values.append(f"%{search_title}%")

        # Description
        search_description = request.args.get("description")
        if search_description:
            filters.append("c.description ILIKE %s")
            values.append(f"%{search_description}%")

        # Category
        category = request.args.get("category")
        if category:
            filters.append("c.category = %s")
            values.append(category)

        # Price range
        min_price = request.args.get("min_price", type=int)
        max_price = request.args.get("max_price", type=int)
        if min_price is not None and max_price is not None:
            filters.append("c.price BETWEEN %s AND %s")
            values.extend([min_price, max_price])

        # Free courses only
        free_only = request.args.get("free_only", "false").lower() == "true"
        if free_only:
            filters.append("c.price = 0")

        # Creation date
        creation_start = request.args.get("creation_start")
        creation_end = request.args.get("creation_end")
        if creation_start and creation_end:
            filters.append("c.creation_date BETWEEN %s AND %s")
            values.extend([creation_start, creation_end])

        # Last update date
        update_start = request.args.get("update_start")
        update_end = request.args.get("update_end")
        if update_start and update_end:
            filters.append("c.last_update_date BETWEEN %s AND %s")
            values.extend([update_start, update_end])

        # Enrollment count range
        enroll_min = request.args.get("enroll_min", type=int)
        enroll_max = request.args.get("enroll_max", type=int)
        if enroll_min is not None and enroll_max is not None:
            filters.append("c.enrollment_count BETWEEN %s AND %s")
            values.extend([enroll_min, enroll_max])

        # Difficulty level
        level = request.args.get("level", type=int)
        if level is not None:
            filters.append("c.difficulty_level = %s")
            values.append(level)

        # Append filters
        if filters:
            base_query += " AND " + " AND ".join(filters)

        # Sorting
        sort = request.args.get("sort", "relevance")
        if sort == "newest":
            base_query += " ORDER BY c.creation_date DESC"
        elif sort == "most_enrolled":
            base_query += " ORDER BY c.enrollment_count DESC"
        elif sort == "price_low_to_high":
            base_query += " ORDER BY c.price ASC"
        elif sort == "price_high_to_low":
            base_query += " ORDER BY c.price DESC"
        else:  # default: relevance
            base_query += " ORDER BY (c.enrollment_count * 0.5 + (CURRENT_DATE - c.creation_date) * -0.1) DESC"

        cursor.execute(base_query, values)
        rows = cursor.fetchall()
        keys = [desc[0] for desc in cursor.description]
        return jsonify([dict(zip(keys, row)) for row in rows])

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
