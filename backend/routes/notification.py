from flask import Blueprint, request, jsonify
from db import connect_project_db
import psycopg2.extras
import uuid
from datetime import datetime

notification_bp = Blueprint("notification", __name__)

# Get user's notifications
@notification_bp.route("/api/notifications/<user_id>", methods=["GET"])
def get_user_notifications(user_id):

    status = request.args.get("status", None)  # Statuse göre filter
    allowed_statuses = {"unread", "read", "archived"}
    
    if status and status not in allowed_statuses:
        return jsonify({"success": False, "message": "Invalid status value"}), 400

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Validate user exists
        cursor.execute('SELECT 1 FROM "user" WHERE id = %s', (user_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Build the query based on status filter
        query = """
            SELECT n.notification_id, n.type, n.entity_type, n.entity_id, n.message,
                   n.timestamp, n.status, r.read_at
            FROM notification n
            JOIN receive r ON n.notification_id = r.notification_id
            WHERE r.id = %s
        """
        params = [user_id]
        
        if status:
            query += " AND n.status = %s"
            params.append(status)
            
        query += " ORDER BY n.timestamp DESC"
        
        cursor.execute(query, tuple(params))
        
        notifications = []
        for row in cursor.fetchall():
            notifications.append({
                "notification_id": row["notification_id"],
                "type": row["type"],
                "entity_type": row["entity_type"],
                "entity_id": row["entity_id"],
                "message": row["message"],
                "timestamp": row["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                "status": row["status"],
                "read_at": row["read_at"].strftime("%Y-%m-%d %H:%M:%S") if row["read_at"] else None
            })
        
        return jsonify({
            "success": True,
            "notifications": notifications,
            "unread_count": len([n for n in notifications if n["status"] == "unread"])
        }), 200
        
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# Mark notification as read
@notification_bp.route("/api/notifications/<notification_id>/read/<user_id>", methods=["PUT"])
def mark_notification_read(notification_id, user_id):

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if the notification exists and is associated with the user
        cursor.execute("""
            SELECT 1 FROM notification n
            JOIN receive r ON n.notification_id = r.notification_id
            WHERE n.notification_id = %s AND r.id = %s
        """, (notification_id, user_id))
        
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Notification not found or not associated with this user"}), 404
        
        # Mark notification as read
        cursor.execute("""
            UPDATE notification
            SET status = 'read'
            WHERE notification_id = %s
        """, (notification_id,))
        
        # Set read timestamp if not already set
        cursor.execute("""
            UPDATE receive
            SET read_at = CURRENT_TIMESTAMP
            WHERE notification_id = %s AND id = %s AND read_at IS NULL
        """, (notification_id, user_id))
        
        conn.commit()
        return jsonify({"success": True, "message": "Notification marked as read"}), 200
        
    except Exception as e:
        conn.rollback()
        print(f"Error marking notification as read: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# Mark all notifications as read
@notification_bp.route("/api/notifications/read-all/<user_id>", methods=["PUT"])
def mark_all_notifications_read(user_id):

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if user exists
        cursor.execute('SELECT 1 FROM "user" WHERE id = %s', (user_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Get all unread notifications for this user
        cursor.execute("""
            SELECT n.notification_id
            FROM notification n
            JOIN receive r ON n.notification_id = r.notification_id
            WHERE r.id = %s AND n.status = 'unread'
        """, (user_id,))
        
        notifications = [row["notification_id"] for row in cursor.fetchall()]
        
        if not notifications:
            return jsonify({"success": True, "message": "No unread notifications"}), 200
        
        # Update notification status
        cursor.execute("""
            UPDATE notification
            SET status = 'read'
            WHERE notification_id = ANY(%s)
        """, (notifications,))
        
        # Update read timestamps
        cursor.execute("""
            UPDATE receive
            SET read_at = CURRENT_TIMESTAMP
            WHERE notification_id = ANY(%s) AND id = %s AND read_at IS NULL
        """, (notifications, user_id))
        
        conn.commit()
        return jsonify({
            "success": True, 
            "message": f"{len(notifications)} notifications marked as read"
        }), 200
        
    except Exception as e:
        conn.rollback()
        print(f"Error marking all notifications as read: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# Mark notification as archived
@notification_bp.route("/api/notifications/<notification_id>/archive/<user_id>", methods=["PUT"])
def archive_notification(notification_id, user_id):

    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if the notification exists and is associated with the user
        cursor.execute("""
            SELECT 1 FROM notification n
            JOIN receive r ON n.notification_id = r.notification_id
            WHERE n.notification_id = %s AND r.id = %s
        """, (notification_id, user_id))
        
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Notification not found or not associated with this user"}), 404
        
        # Archive notification
        cursor.execute("""
            UPDATE notification
            SET status = 'archived'
            WHERE notification_id = %s
        """, (notification_id,))
        
        conn.commit()
        return jsonify({"success": True, "message": "Notification archived"}), 200
        
    except Exception as e:
        conn.rollback()
        print(f"Error archiving notification: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# Get notifications dashboard stats
@notification_bp.route("/api/notifications/stats/<user_id>", methods=["GET"])
def get_notification_stats(user_id):
 
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Check if user exists
        cursor.execute('SELECT 1 FROM "user" WHERE id = %s', (user_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # Get counts by status and type
        cursor.execute("""
            SELECT 
                n.status,
                n.type,
                COUNT(*) as count
            FROM notification n
            JOIN receive r ON n.notification_id = r.notification_id
            WHERE r.id = %s
            GROUP BY n.status, n.type
            ORDER BY n.status, n.type
        """, (user_id,))
        
        stats = {
            "by_status": {"unread": 0, "read": 0, "archived": 0},
            "by_type": {}
        }
        
        for row in cursor.fetchall():
            status = row["status"]
            type_ = row["type"]
            count = row["count"]
            
            # Aggregate by status
            stats["by_status"][status] = stats["by_status"].get(status, 0) + count
            
            # Aggregate by type
            if type_ not in stats["by_type"]:
                stats["by_type"][type_] = 0
            stats["by_type"][type_] += count
        
        # Get most recent notification
        cursor.execute("""
            SELECT n.message, n.timestamp
            FROM notification n
            JOIN receive r ON n.notification_id = r.notification_id
            WHERE r.id = %s
            ORDER BY n.timestamp DESC
            LIMIT 1
        """, (user_id,))
        
        most_recent = cursor.fetchone()
        if most_recent:
            stats["most_recent"] = {
                "message": most_recent["message"],
                "timestamp": most_recent["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
            }
        else:
            stats["most_recent"] = None
        
        return jsonify({
            "success": True,
            "stats": stats
        }), 200
        
    except Exception as e:
        print(f"Error getting notification stats: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# Create a custom notification (for creating manual notifications eksik kalan functionalitylerde buradan esinlenilebiliriz)
@notification_bp.route("/api/notifications/create", methods=["POST"])
def create_notification():

    data = request.json
    required_fields = ["type", "message", "user_ids"]
    
    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    if not data["user_ids"] or not isinstance(data["user_ids"], list):
        return jsonify({"success": False, "message": "user_ids must be a non-empty list"}), 400
    
    conn = connect_project_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Verify all users exist
        user_ids_str = ",".join([f"'{uid}'" for uid in data["user_ids"]])
        cursor.execute(f'SELECT id FROM "user" WHERE id IN ({user_ids_str})')
        found_users = [row["id"] for row in cursor.fetchall()]
        
        if len(found_users) != len(data["user_ids"]):
            return jsonify({"success": False, "message": "One or more users not found"}), 404
        
        # Generate a notification ID
        notification_id = f"N{uuid.uuid4().hex[:7].upper()}"
        
        # Create notification
        cursor.execute("""
            INSERT INTO notification (
                notification_id, type, entity_type, entity_id, message
            ) VALUES (%s, %s, %s, %s, %s)
        """, (
            notification_id,
            data["type"],
            data.get("entity_type"),
            data.get("entity_id"),
            data["message"]
        ))
        
        # Create receive entries for all users
        for user_id in data["user_ids"]:
            cursor.execute("""
                INSERT INTO receive (notification_id, id)
                VALUES (%s, %s)
            """, (notification_id, user_id))
        
        conn.commit()
        return jsonify({
            "success": True, 
            "message": f"Notification sent to {len(data['user_ids'])} users",
            "notification_id": notification_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating notification: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()