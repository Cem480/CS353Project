import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import '../AdminMainPage/AdminMainPage.css';

const AdminCourseApprovals = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const userData = getCurrentUser();

  const toggleProfileMenu = () => setShowProfileMenu(!showProfileMenu);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Auto-close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfileMenu && !e.target.closest('.profile-dropdown')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  return (
    <div className="instructor-main-page">
      {/* Top Navigation Bar */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a href="/admin/dashboard">Dashboard</a>
            <a href="/admin/approvals" className="active">Course Approvals</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search courses..." />
            <button className="search-button">Search</button>
          </div>
          <div className="profile-dropdown">
            <div className="profile-icon" onClick={toggleProfileMenu}>
              {userData?.user_id?.charAt(0).toUpperCase() || 'A'}
            </div>
            {showProfileMenu && (
              <div className="dropdown-menu active">
                <div className="profile-info">
                  <div className="profile-avatar-large">
                    {userData?.user_id?.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-details">
                    <div className="profile-name">{userData?.user_id}</div>
                    <div className="profile-role">{userData?.role}</div>
                  </div>
                </div>
                <ul>
                  <li><a href="/settings">Account Settings</a></li>
                  <div className="menu-divider"></div>
                  <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="main-content">
        <section className="welcome-section">
          <h2>Course Approvals</h2>
          <p>Review and approve submitted courses below.</p>
          {/* You can add a table or approval list here */}
        </section>
      </main>
    </div>
  );
};

export default AdminCourseApprovals;
