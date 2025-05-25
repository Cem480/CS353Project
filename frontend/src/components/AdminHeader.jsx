import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth';
import { NavLink, useLocation } from 'react-router-dom';
import NotificationButton from './NotificationButton'; // adjust path if needed

const AdminHeader = () => {
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const userData = getCurrentUser();
    const firstName = userData?.first_name ?? 'Admin';

    const toggleProfileMenu = () => setShowProfileMenu(!showProfileMenu);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        const closeMenu = (e) => {
            if (showProfileMenu && !e.target.closest('.profile-dropdown')) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', closeMenu);
        return () => document.removeEventListener('mousedown', closeMenu);
    }, [showProfileMenu]);

    const location = useLocation();
    const isOnReportResultsPage = location.pathname.startsWith('/admin/reports/');
    const cameFrom = sessionStorage.getItem('cameFrom');


    return (
        <header className="main-header">
            <div className="header-left">
                <div className="logo">
                    <h1>LearnHub</h1>
                </div>
                <div className="nav-links">
                    <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
                    <NavLink to="/admin/course-approvals" className={({ isActive }) => isActive ? 'active' : ''}>Course Approvals</NavLink>
                    <NavLink
                        to="/admin/generate-report"
                        className={({ isActive }) =>
                            isActive || (isOnReportResultsPage && cameFrom === 'generate') ? 'active' : ''
                        }
                    >
                        Generate Reports
                    </NavLink>
                    <NavLink
                        to="/admin/past-reports"
                        className={({ isActive }) =>
                            isActive || (isOnReportResultsPage && cameFrom !== 'generate') ? 'active' : ''
                        }
                    >
                        Past Reports
                    </NavLink>
                    <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>Manage Users</NavLink>
                </div>
            </div>

            <div className="header-right">
                <ul className="profile-logout-nav">
                    <li><NotificationButton /></li>
                    <li>
                        <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                            Profile
                        </NavLink>
                    </li>
                    <li>
                        <a onClick={handleLogout} style={{ cursor: 'pointer' }}>
                            Logout
                        </a>
                    </li>
                </ul>
            </div>
        </header>

    );
};

export default AdminHeader;
