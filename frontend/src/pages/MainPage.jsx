import React, { useState } from 'react';
import './MainPage.css';

const MainPage = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isExploreMenuOpen, setIsExploreMenuOpen] = useState(false);
  
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

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    // Close explore menu if open
    if (isExploreMenuOpen) setIsExploreMenuOpen(false);
  };

  const toggleExploreMenu = () => {
    setIsExploreMenuOpen(!isExploreMenuOpen);
    // Close profile menu if open
    if (isProfileMenuOpen) setIsProfileMenuOpen(false);
  };

  return (
    <div className="main-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="explore-dropdown">
            <button className="explore-button" onClick={toggleExploreMenu}>
              Explore
              <span className={`arrow-icon ${isExploreMenuOpen ? 'up' : 'down'}`}></span>
            </button>
            {isExploreMenuOpen && (
              <div className="dropdown-menu explore-menu">
                <ul>
                  <li><a href="#">Online Degrees</a></li>
                  <li><a href="#">Find Your New Career</a></li>
                  <li><a href="#">For Enterprise</a></li>
                  <li><a href="#">For Universities</a></li>
                  <li className="menu-divider"></li>
                  <li className="menu-category">Browse by Subject</li>
                  <li><a href="#">Data Science</a></li>
                  <li><a href="#">Business</a></li>
                  <li><a href="#">Computer Science</a></li>
                  <li><a href="#">Health</a></li>
                  <li><a href="#">Social Sciences</a></li>
                  <li><a href="#">Arts & Humanities</a></li>
                  <li><a href="#">Personal Development</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="header-center">
          <div className="search-bar">
            <input type="text" placeholder="What do you want to learn?" />
            <button className="search-button">Search</button>
          </div>
        </div>
        <div className="header-right">
          <nav className="main-nav">
            <ul>
              <li><a href="#">My Learning</a></li>
            </ul>
          </nav>
          <div className="notifications-icon">🔔</div>
          <div className="profile-dropdown">
            <button className="profile-button" onClick={toggleProfileMenu}>
              <div className="profile-avatar">JS</div>
            </button>
            {isProfileMenuOpen && (
              <div className="dropdown-menu profile-menu">
                <div className="profile-info">
                  <div className="profile-avatar-large">JS</div>
                  <div className="profile-details">
                    <p className="profile-name">John Smith</p>
                    <p className="profile-email">john.smith@example.com</p>
                  </div>
                </div>
                <ul>
                  <li><a href="#">Account Settings</a></li>
                  <li><a href="#">Help Center</a></li>
                  <li className="menu-divider"></li>
                  <li><a href="#">Sign Out</a></li>
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
            <h2>Welcome back, John!</h2>
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