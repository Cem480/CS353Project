import React, { useEffect, useState } from 'react';
import './MyLearningPage.css';
import CourseReviewPopup from './ReviewPopUp';
import { Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import { getEnrolledCourses } from '../../services/course';

const MyLearningPage = () => {

  // Filter state
  const [activeFilter, setActiveFilter] = useState('all');

  // Main data state
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review popup state
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Fetch enrolled courses on load
  useEffect(() => {
    async function fetchCourses() {
      try {
        const user = getCurrentUser();
        const courses = await getEnrolledCourses(user.user_id);
        setAllCourses(courses);
      } catch (err) {
        setError('Failed to load enrolled courses.');
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  // Filter courses based on active filter
  const getFilteredCourses = () => {
    if (activeFilter === 'all') return allCourses;
    if (activeFilter === 'inProgress')
      return allCourses.filter(course => course.progress_rate > 0 && course.progress_rate < 100);
    if (activeFilter === 'notStarted')
      return allCourses.filter(course => course.progress_rate === 0);
    if (activeFilter === 'completed')
      return allCourses.filter(course => course.progress_rate === 100);
    return allCourses;
  };

  const filteredCourses = getFilteredCourses();

  // Compute stats
  const totalEnrolled = allCourses.length;
  const totalCompleted = allCourses.filter(c => c.progress_rate === 100).length;
  const averageCompletion = totalEnrolled > 0
    ? Math.round(allCourses.reduce((sum, c) => sum + c.progress_rate, 0) / totalEnrolled)
    : 0;

  // Handle review button click
  const handleReviewClick = (course) => {
    setSelectedCourse(course);
    setShowReviewPopup(true);
  };

  const handleReviewSubmit = (reviewData) => {
    console.log('Review submitted:', reviewData);
    // Here you would typically send this data to your backend
  };

  // Handle filter button click
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  return (
    <div className="my-learning-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <Link to="/home">Home</Link>
            <Link to="/degrees">Online Degrees</Link>
            <Link to="/my-learning" className="active">My Learning</Link>
            <Link to="/my-certificates">My Certificates</Link>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search my courses..." />
            <button className="search-button1">Search</button>
          </div>
          <div className="profile-icon">JS</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="learning-container">
        <div className="page-title">
          <h2>My Learning</h2>
          <p>Track your progress and continue learning</p>
        </div>

        {/* Stats Section */}
        <div className="learning-stats">
          <div className="stat-card">
            <div className="stat-number">{allCourses.length}</div>
            <div className="stat-label">Enrolled Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {allCourses.filter(course => course.progress_rate === 100).length}
            </div>
            <div className="stat-label">Completed Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {allCourses.length > 0
                ? Math.round(
                    allCourses.reduce((sum, course) => sum + course.progress_rate, 0) / allCourses.length
                  )
                : 0}%
            </div>
            <div className="stat-label">Average Completion</div>
          </div>
        </div>

        {/* Filter Tabs */}
        {/* Review Popup */}
      {showReviewPopup && selectedCourse && (
        <CourseReviewPopup 
          course={selectedCourse}
          onClose={() => setShowReviewPopup(false)}
          onSubmit={handleReviewSubmit}
        />
      )}
        <div className="learning-filters">
          <button 
            className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All Courses
          </button>
          <button 
            className={`filter-button ${activeFilter === 'inProgress' ? 'active' : ''}`}
            onClick={() => handleFilterChange('inProgress')}
          >
            In Progress
          </button>
          <button 
            className={`filter-button ${activeFilter === 'notStarted' ? 'active' : ''}`}
            onClick={() => handleFilterChange('notStarted')}
          >
            Not Started
          </button>
          <button 
            className={`filter-button ${activeFilter === 'completed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('completed')}
          >
            Completed
          </button>
        </div>

        {/* Course List */}
        <div className="learning-courses">
        {filteredCourses.length === 0 ? (
          <div className="no-courses">
            <p>No courses match your filter.</p>
          </div>
        ) : (
          filteredCourses.map(course => (
            <div className="course-card" key={course.course_id}>
              <div className={`course-thumbnail ${course.thumbnail || ''}`}>
                {course.progress_rate === 100 && (
                  <div className="completion-badge">
                    <span className="material-icons">check</span>
                  </div>
                )}
              </div>
              <div className="course-content">
                <div className="course-info">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-instructor">Instructor: {course.instructor}</p>
                  <div className="course-category">{course.category}</div>

                  <div className="completion-container">
                    <div className="completion-text">
                      <span>Progress: {course.progress_rate}%</span>
                    </div>
                    <div className="completion-bar">
                      <div
                        className="completion-fill"
                        style={{ width: `${course.progress_rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="course-actions">
                  {course.progress_rate === 100 ? (
                    <>
                      <button
                        className="primary-button"
                        onClick={() => {
                          // navigate to My Certificates page
                          window.location.href = '/my-certificates';
                        }}
                      >
                        View Certificate
                      </button>
                      <button className="secondary-button">
                        Course Details
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="primary-button">
                        Continue Learning
                      </button>
                      <button className="secondary-button">
                        Course Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>


        {/* Recommendations Section */}
        <div className="recommendations-section">
          <h3 className="section-title">Recommended Next Steps</h3>
          <div className="recommendations-grid">
            <div className="recommendation-card">
              <div className="recommendation-icon">🎯</div>
              <h4>Next Course</h4>
              <p>Advanced JavaScript: From Fundamentals to Functional JS</p>
              <button className="outline-button">Explore</button>
            </div>
            <div className="recommendation-card">
              <div className="recommendation-icon">📊</div>
              <h4>Practice Project</h4>
              <p>Build a real-world data visualization project</p>
              <button className="outline-button">Start Project</button>
            </div>
            <div className="recommendation-card">
              <div className="recommendation-icon">🏆</div>
              <h4>Get Certified</h4>
              <p>Take the Python for Data Science certification exam</p>
              <button className="outline-button">View Details</button>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default MyLearningPage;