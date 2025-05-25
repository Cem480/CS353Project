// src/components/StudentHeader.jsx
import React from 'react';
import { useNavigate, Link, useLocation, NavLink } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth';
import NotificationButton from './NotificationButton';
import './StudentHeader.css';

const StudentHeader = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="main-header student-header">
            <div className="header-left">
                <div className="logo" onClick={() => navigate('/home')}>
                    <h1>LearnHub</h1>
                </div>
                <div className="nav-links">
                    <Link to="/home" className={location.pathname === '/home' ? 'active' : ''}>Home</Link>
                    <Link to="/degrees" className={location.pathname === '/degrees' ? 'active' : ''}>Online Degrees</Link>
                    <Link to="/my-learning" className={location.pathname === '/my-learning' ? 'active' : ''}>My Learning</Link>
                    <Link to="/my-certificates" className={location.pathname === '/my-certificates' ? 'active' : ''}>My Certificates</Link>
                    <Link to="/student/applications" className={location.pathname === '/student/applications' ? 'active' : ''}>My applications</Link>
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

export default StudentHeader;
