import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCurrentUser, logout } from '../../services/auth';

import { getCoursesByStatus } from '../../services/course';
import { evaluateCourse } from '../../services/course';


import './AdminCourseApprovals.css';

const AdminCourseApprovals = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const userData = getCurrentUser();

  const [pendingCourses, setPendingCourses] = useState([]);

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

  useEffect(() => {
    const fetchPendingCourses = async () => {
      try {
        const response = await getCoursesByStatus('pending');
        if (response.success) {
          setPendingCourses(response.courses);
        }
      } catch (err) {
        console.error('Failed to fetch pending courses', err);
      }
    };
  
    fetchPendingCourses();
  }, []);

  const handleEvaluation = async (courseId, isAccepted) => {
    try {
      const response = await evaluateCourse(courseId, userData.user_id, isAccepted);
      if (response.success) {
        setPendingCourses(prev => prev.filter(c => c.course_id !== courseId));
      } else {
        alert(response.message || 'Action failed');
      }
    } catch (error) {
      console.error('Course evaluation failed:', error);
    }
  };

  return (
    <div className="instructor-main-page">
      {/* Header Bar */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo"><h1>LearnHub</h1></div>
          <div className="nav-links">
            <a href="/admin/dashboard">Dashboard</a>
            <a href="/admin/course-approvals" className="active">Course Approvals</a>
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
                  <div className="profile-avatar-large">{userData?.user_id?.charAt(0).toUpperCase()}</div>
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

      {/* Main Content */}
      <main className="main-content">
        <section className="welcome-section">
          <h2>Course Approvals</h2>
          <p>Review and approve submitted courses below.</p>

          {pendingCourses.length === 0 ? (
            <p>No pending courses found.</p>
          ) : (
            <div className="vertical-course-list">
                {pendingCourses.map(course => (
                    <div key={course.course_id} className="course-card">
                    <h3>{course.title}</h3>
                    <div className="course-meta">
                        <p><strong>Instructor Name:</strong> {course.instructor_name}</p>
                        <p><strong>Category:</strong> {course.category}</p>
                        <p><strong>Difficulty:</strong> {course.difficulty_level}</p>
                        <p><strong>Price:</strong> ${course.price}</p>
                        <p><strong>Creation Date:</strong> {course.creation_date}</p>
                    </div>
                    <div className="course-description">{course.description}</div>
                    <div className="approval-actions">
                        <button className="approve-btn" onClick={() => handleEvaluation(course.course_id, true)}>Approve</button>
                        <button className="reject-btn" onClick={() => handleEvaluation(course.course_id, false)}>Reject</button>
                        <button className="details-btn" onClick={() => navigate(`/admin/course-approvals`)}>Details</button>
                    </div>
                    </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminCourseApprovals;
