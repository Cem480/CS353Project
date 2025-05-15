// components/InstructorHeader.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth';
import { getBasicProfile } from '../services/user';

const InstructorHeader = () => {
  const navigate = useNavigate();
  const userData = getCurrentUser();
  const [userName, setUserName] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const fetchName = async () => {
      try {
        const profile = await getBasicProfile(userData.user_id);
        setUserName(profile.full_name);
      } catch {
        setUserName('Instructor');
      }
    };
    if (userData?.user_id) fetchName();
  }, [userData?.user_id]);

  const toggleProfileMenu = () => setShowProfileMenu(!showProfileMenu);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
    <header className="main-header">
      <div className="header-left">
        <div className="logo" onClick={() => navigate('/home')}>
          <h1>LearnHub</h1>
        </div>
        <div className="nav-links">
          <a href="/home">Dashboard</a>
          <a href="/instructor/courses" className="active">My Courses</a>
          <a href="/instructor/grading">Grading</a>
          <a href="/applications">Financial Aid</a>
        </div>
      </div>
      <div className="header-right">
        <div className="search-bar">
          <input type="text" placeholder="Search courses..." />
          <button className="search-button">Search</button>
        </div>
        <div className="profile-dropdown">
          <div className="profile-icon" onClick={toggleProfileMenu}>
            {userData ? userData.user_id.charAt(0).toUpperCase() : 'I'}
          </div>
          {showProfileMenu && (
            <div className="dropdown-menu active">
              <div className="profile-info">
                <div className="profile-avatar-large">
                  {userData ? userData.user_id.charAt(0).toUpperCase() : 'I'}
                </div>
                <div className="profile-details">
                  <div className="profile-name">{userName}</div>
                  <div className="profile-role">{userData?.role || 'instructor'}</div>
                </div>
              </div>
              <ul>
                <li><a href="/my-courses">My Courses</a></li>
                <li><a href="/earnings">Earnings</a></li>
                <li><a href="/notifications">Notifications</a></li>
                <li><a href="/applications">Financial Aid</a></li>
                <li><a href="/settings">Account Settings</a></li>
                <div className="menu-divider"></div>
                <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</a></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default InstructorHeader;
