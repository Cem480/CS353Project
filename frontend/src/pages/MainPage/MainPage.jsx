import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';
import { getCurrentUser, logout } from '../../services/auth';
import { getStudentInfo, getRecommendedCourses, getTopCategories } from '../../services/student';

const MainPage = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for API data
  const [userInfo, setUserInfo] = useState({});
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  
  // Get current user data
  const userData = getCurrentUser();
  
  // Use refs to prevent multiple API calls
  const dataFetchedRef = useRef(false);
  
  useEffect(() => {
    // If no user is logged in, redirect to login
    if (!userData) {
      navigate('/login');
      return;
    }
    
    // Prevent refetching data when component remounts
    if (dataFetchedRef.current) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Only fetch student-specific data if the role is student
        if (userData.role === 'student') {
          // Mark data as fetched immediately to prevent multiple calls
          dataFetchedRef.current = true;
          
          // Fetch user info
          const userInfoData = await getStudentInfo(userData.user_id);
          setUserInfo(userInfoData);
          
          // Fetch recommended courses
          const coursesData = await getRecommendedCourses(userData.user_id);
          if (Array.isArray(coursesData) && coursesData.length > 0) {
            setRecommendedCourses(coursesData);
          } else {
            // Use fallback courses if API returns empty data
            setRecommendedCourses([
              { course_id: 1, title: 'Introduction to Data Science', instructor_name: 'Tech University', difficulty_level: 'Beginner' },
              { course_id: 2, title: 'Advanced Web Development', instructor_name: 'Code Academy', difficulty_level: 'Intermediate' },
              { course_id: 3, title: 'Machine Learning Fundamentals', instructor_name: 'AI Institute', difficulty_level: 'Beginner' },
              { course_id: 4, title: 'Blockchain Technology', instructor_name: 'Crypto Learning', difficulty_level: 'Advanced' }
            ]);
          }
          
          // Fetch top categories
          const categoriesData = await getTopCategories(userData.user_id);
          if (Array.isArray(categoriesData) && categoriesData.length > 0) {
            setTopCategories(categoriesData);
          } else {
            // Use fallback categories if API returns empty data
            setTopCategories([
              { category: 'Data Analysis', course_count: 14 },
              { category: 'Web Development', course_count: 22 },
              { category: 'Machine Learning', course_count: 8 },
              { category: 'Digital Marketing', course_count: 10 }
            ]);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
        // Set fallback data in case of error
        setRecommendedCourses([
          { course_id: 1, title: 'Introduction to Data Science', instructor_name: 'Tech University', difficulty_level: 'Beginner' },
          { course_id: 2, title: 'Advanced Web Development', instructor_name: 'Code Academy', difficulty_level: 'Intermediate' },
          { course_id: 3, title: 'Machine Learning Fundamentals', instructor_name: 'AI Institute', difficulty_level: 'Beginner' },
          { course_id: 4, title: 'Blockchain Technology', instructor_name: 'Crypto Learning', difficulty_level: 'Advanced' }
        ]);
        setTopCategories([
          { category: 'Data Analysis', course_count: 14 },
          { category: 'Web Development', course_count: 22 },
          { category: 'Machine Learning', course_count: 8 },
          { category: 'Digital Marketing', course_count: 10 }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userData, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Get user's first name
  const firstName = userInfo.first_name || (userData ? userData.user_id.charAt(0) : 'User');

  return (
    <div className="main-page">
      {/* Header */}
      <header className="main-page-header">
        <div className="main-page-header-left">
          <div className="main-page-logo">
            <h1>LearnHub</h1>
          </div>
          <div className="main-page-nav-links">
            <a href="/home" className="active">Home</a>
            <a href="/degrees">Online Degrees</a>
            <a href="/my-learning">My Learning</a>
            <a href="/my-certificates">My Certificates</a>
          </div>
        </div>
        <div className="main-page-header-right">
          <div className="main-page-search-bar">
            <input 
              type="text" 
              placeholder="Search my courses..." 
              value={searchTerm}
              onChange={handleSearch}
            />
            <button className="main-page-search-button">Search</button>
          </div>
          <div 
            className="notification-button" 
            onClick={() => navigate('/notifications')} 
            style={{ cursor: 'pointer' }}
            title="View notifications"
          >
            <span className="notification-icon">🔔</span>
            {/* Add notification count badge here if you have unread notifications */}
          </div>
          <div className="main-page-profile-dropdown">
            <div className="main-page-profile-icon" onClick={toggleProfileMenu}>
              {userData ? userData.user_id.charAt(0).toUpperCase() : 'U'}
            </div>
            
            {showProfileMenu && (
              <div className="main-page-dropdown-menu">
                <div className="main-page-profile-info">
                  <div className="main-page-profile-avatar-large">
                    {userData ? userData.user_id.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="main-page-profile-details">
                    <div className="main-page-profile-name">{firstName}</div>
                    <div className="main-page-profile-role">{userData ? userData.role : 'Student'}</div>
                  </div>
                </div>
                <ul>
                  <li><a href="/my-learning">My Learning</a></li>
                  <li><a href="/notifications">Notifications</a></li>
                  <li><a href="/transaction">Transactions</a></li>
                  {userData && userData.role === 'instructor' && (
                    <li><a href="/applications">Instructor Applications</a></li>
                  )}
                  <div className="main-page-menu-divider"></div>
                  <li><a href="/profile">Profile</a></li>
                  <li><a href="#" onClick={handleLogout}>Logout</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-page-content">
        {/* Error Message (if any) */}
        {error && (
          <div className="main-page-error">
            {error}
          </div>
        )}

        {/* Hero Section */}
        <section className="main-page-hero-section">
          <div className="main-page-hero-content">
            <h2>Welcome back, {firstName}!</h2>
            <p>Ready to continue your learning journey?</p>
            <button className="main-page-hero-button" onClick={() => navigate('/my-learning')}>
              Resume Learning
            </button>
          </div>
        </section>

        {/* Loading Indicator */}
        {loading && (
          <div className="main-page-loading">
            Loading your personalized content...
          </div>
        )}

        {/* Recommended Courses */}
        <section className="main-page-courses-section">
          <div className="main-page-section-header">
            <h2>Recommended for you</h2>
            <a href="#" className="main-page-view-all">View all</a>
          </div>
          <div className="main-page-courses-grid">
            {recommendedCourses.map(course => (
              <div 
                className="main-page-course-card" 
                key={course.course_id} 
                onClick={() => navigate(`/course-details?id=${course.course_id}`)}
              >
                <div className="main-page-course-image">
                  {/* This is just a placeholder for the course image */}
                </div>
                <div className="main-page-course-info">
                  <h3 className="main-page-course-title">{course.title}</h3>
                  <p className="main-page-course-provider">{course.instructor_name}</p>
                  <div className="main-page-course-level">{course.difficulty_level}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills/Categories Section */}
        <section className="main-page-skills-section">
          <div className="main-page-section-header">
            <h2>Top categories for you</h2>
            <a href="#" className="main-page-view-all">View all</a>
          </div>
          <div className="main-page-skills-container">
            {topCategories.map((category, index) => (
              <div className="main-page-skill-card" key={index}>
                <h3>{category.category}</h3>
                <p>{category.course_count} Courses</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MainPage;