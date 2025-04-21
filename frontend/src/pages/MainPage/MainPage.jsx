import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';
import { getCurrentUser, logout } from '../../services/auth';

const MainPage = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Get current user data
  const userData = getCurrentUser();
  
  // Mockup course data
  const recommendedCourses = [
    { id: 1, title: 'Introduction to Data Science', provider: 'Tech University', level: 'Beginner' },
    { id: 2, title: 'Advanced Web Development', provider: 'Code Academy', level: 'Intermediate' },
    { id: 3, title: 'Machine Learning Fundamentals', provider: 'AI Institute', level: 'Beginner' },
    { id: 4, title: 'Blockchain Technology', provider: 'Crypto Learning', level: 'Advanced' },
    { id: 5, title: 'UX/UI Design Principles', provider: 'Design School', level: 'Intermediate' },
    { id: 6, title: 'Cloud Computing Essentials', provider: 'Cloud Academy', level: 'Beginner' },
    { id: 7, title: 'Cybersecurity Basics', provider: 'Security Institute', level: 'Beginner' },
    { id: 8, title: 'Mobile App Development', provider: 'App Masters', level: 'Intermediate' }
  ];

  // Assuming user's first name is John for demo purposes
  // In a real app, you might extract this from the user ID or other stored data
  const firstName = "John";

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <div className="main-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a href="/home" className="active">Home</a>
            <a href="/degrees">Online Degrees</a>
            <a href="/my-learning">My Learning</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search my courses..." />
            <button className="search-button1">Search</button>
          </div>
          <div className="profile-dropdown">
            <div className="profile-icon" onClick={toggleProfileMenu}>
              {userData ? userData.user_id.charAt(0) : 'U'}
            </div>
            
            {showProfileMenu && (
              <div className="dropdown-menu">
                <div className="profile-info">
                  <div className="profile-avatar-large">
                    {userData ? userData.user_id.charAt(0) : 'U'}
                  </div>
                  <div className="profile-details">
                    <div className="profile-name">{firstName}</div>
                    <div className="profile-role">{userData ? userData.role : 'Student'}</div>
                  </div>
                </div>
                <ul>
                  <li><a href="/my-learning">My Learning</a></li>
                  <li><a href="/notifications">Notifications</a></li>
                  <li><a href="/transaction">Transactions</a></li>
                  {userData && userData.role === 'instructor' && (
                    <li><a href="/applications">Instructor Applications</a></li>
                  )}
                  <div className="menu-divider"></div>
                  <li><a href="#" onClick={handleLogout}>Logout</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h2>Welcome back, {firstName}!</h2>
            <p>Ready to continue your learning journey?</p>
            <button className="hero-button">Resume Learning</button>
          </div>
        </section>

        {/* Recommended Courses */}
        <section className="courses-section">
          <div className="section-header">
            <h2>Recommended for you</h2>
            <a href="#" className="view-all">View all</a>
          </div>
          <div className="courses-grid">
            {recommendedCourses.map(course => (
              <div className="course-card" key={course.id}>
                <div className="course-image">
                  {/* This is just a placeholder for the course image */}
                </div>
                <div className="course-info">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-provider">{course.provider}</p>
                  <div className="course-level">{course.level}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills Section */}
        <section className="skills-section">
          <div className="section-header">
            <h2>Top skills for you</h2>
            <a href="#" className="view-all">View all</a>
          </div>
          <div className="skills-container">
            <div className="skill-card">
              <h3>Data Analysis</h3>
              <p>14 Courses</p>
            </div>
            <div className="skill-card">
              <h3>Web Development</h3>
              <p>22 Courses</p>
            </div>
            <div className="skill-card">
              <h3>Machine Learning</h3>
              <p>8 Courses</p>
            </div>
            <div className="skill-card">
              <h3>Digital Marketing</h3>
              <p>10 Courses</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MainPage;