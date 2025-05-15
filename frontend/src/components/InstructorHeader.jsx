// components/InstructorHeader.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth';
import { getBasicProfile } from '../services/user';
import { useLocation } from 'react-router-dom';
import NotificationButton from './NotificationButton';
import * as notificationService from '../services/notification';

const InstructorHeader = () => {
  const navigate = useNavigate();
  const userData = getCurrentUser();
  const [userName, setUserName] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const fetchName = async () => {
      try {
        const profile = await getBasicProfile(userData.user_id);
        setUserName(profile.full_name);
      } catch {
        setUserName('Instructor');
      }
    };
    if (userData?.user_id) {
      fetchName();
      fetchNotificationCount();
    }
  }, [userData?.user_id]);
  
  const fetchNotificationCount = async () => {
    if (!userData?.user_id) return;
    
    try {
      const response = await notificationService.getNotificationStats(userData.user_id);
      if (response.success) {
        setUnreadCount(response.stats.by_status.unread || 0);
      }
    } catch (err) {
      console.error('Error fetching notification count:', err);
    }
  };

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
            <a href="/home" className={location.pathname === '/home' ? 'active' : ''}>Dashboard</a>
            <a href="/instructor/courses" className={location.pathname === '/instructor/courses' ? 'active' : ''}>My Courses</a>
            <a href="/instructor/grading" className={location.pathname === '/instructor/grading' ? 'active' : ''}>Grading</a>
            <a href="/applications" className={location.pathname === '/applications' ? 'active' : ''}>Financial Aid</a>
        </div>
      </div>
      <div className="header-right">
        <div className="search-bar">
          <input type="text" placeholder="Search courses..." />
          <button className="search-button">Search</button>
        </div>
        <NotificationButton />
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
                <li><a href="/notifications">Notifications {unreadCount > 0 && `(${unreadCount})`}</a></li>
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
