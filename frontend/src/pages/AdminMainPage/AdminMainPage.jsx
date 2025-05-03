import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminMainPage.css';
import { getCurrentUser, logout } from '../../services/auth';

const AdminMainPage = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const userData = getCurrentUser();
  const firstName = userData?.user_id?.split('@')[0] ?? 'Admin';

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

  return (
    <div className="admin-main-page">
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a href="/admin/dashboard" className="active">Dashboard</a>
            <a href="/admin/course-approvals">Course Approvals</a>
          </div>
        </div>

        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search..." />
            <button className="search-button">Search</button>
          </div>
          <div className="profile-dropdown">
            <div className="profile-icon" onClick={toggleProfileMenu}>
              {firstName.charAt(0).toUpperCase()}
            </div>
            {showProfileMenu && (
              <div className="dropdown-menu active">
                <div className="profile-info">
                  <div className="profile-avatar-large">{firstName.charAt(0).toUpperCase()}</div>
                  <div className="profile-details">
                    <div className="profile-name">{firstName}</div>
                    <div className="profile-role">{userData?.role ?? 'admin'}</div>
                  </div>
                </div>
                <ul>
                  <li><a href="/admin/settings">Account Settings</a></li>
                  <div className="menu-divider"></div>
                  <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <h2>Welcome, {firstName}!</h2>  
      </main>
    </div>
  );
};

export default AdminMainPage;
