import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2 } from "lucide-react";
import "./AdminUserListPage.css";

const AdminUserListPage = () => {
    const [users, setUsers] = useState([]);
    const [deleting, setDeleting] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        fetchUsers();
        const storedId = sessionStorage.getItem("user_id");
        if (storedId) setCurrentUserId(storedId);
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get("http://localhost:5001/api/get_users", {
                withCredentials: true,
            });

            setUsers(res.data.users);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        setDeleting(userId);
        try {
            await axios.post(
                "http://localhost:5001/api/delete_user",
                { user_id: userId },
                { withCredentials: true }
            );

            setUsers(users.filter((u) => u.id !== userId));
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="page-wrapper">
            <h1 className="page-title">Manage Users</h1>
            <div className="user-grid">
                {users.map((user) => (
                    <div key={user.id} className="user-card">
                        <div className="user-info">
                            <p className="user-name">
                                {user.first_name} {user.last_name}
                            </p>
                            <p>Role: {user.role}</p>
                            <p>Email: {user.email}</p>
                            <p>Phone: {user.phone_no || "-"}</p>
                        </div>

                        {(user.role === "instructor" || user.role === "student") &&
                            user.id !== currentUserId && (
                                <button
                                    disabled={deleting === user.id}
                                    onClick={() => handleDelete(user.id)}
                                    className="delete-button"
                                    title="Delete user"
                                >
                                    <Trash2 />
                                </button>
                            )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminUserListPage;
