import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2 } from "lucide-react";

import AdminHeader from "../../components/AdminHeader";
import "./AdminUserListPage.css";

const AdminUserListPage = () => {
    const [users, setUsers] = useState([]);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        fetchUsers();
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
        <>
            <AdminHeader />
            <div className="admin-main-page page-wrapper">
                <main className="main-content">
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

                                {(user.role === "instructor" || user.role === "student") && (
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
                </main>
            </div>
        </>
    );
};

export default AdminUserListPage;
