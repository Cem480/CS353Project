import React, { useState } from 'react';
import './MyLearningPage.css';
import CourseReviewPopup from './ReviewPopUp';
import { Link } from 'react-router-dom';

const MyLearningPage = () => {
  // Mockup enrolled courses with completion percentages
  const [enrolledCourses] = useState([
    {
      id: 1,
      title: "Introduction to JavaScript Programming",
      instructor: "David Mitchell",
      category: "Web Development",
      completionPercentage: 100,
      thumbnail: "javascript",
      totalLectures: 42,
      completedLectures: 32
    },
    {
      id: 2,
      title: "Advanced Python for Data Science",
      instructor: "Sarah Johnson",
      category: "Data Science",
      completionPercentage: 35,
      thumbnail: "python",
      totalLectures: 56,
      completedLectures: 20
    },
    {
      id: 3,
      title: "UX/UI Design Fundamentals",
      instructor: "Michael Wong",
      category: "Design",
      completionPercentage: 100,
      thumbnail: "design",
      totalLectures: 38,
      completedLectures: 38
    },
    {
      id: 4,
      title: "Machine Learning with TensorFlow",
      instructor: "Elena Rodriguez",
      category: "Artificial Intelligence",
      completionPercentage: 10,
      thumbnail: "ml",
      totalLectures: 65,
      completedLectures: 7
    }
  ]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState("all");
  
  // Review popup state
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Handle review button click
  const handleReviewClick = (course) => {
    setSelectedCourse(course);
    setShowReviewPopup(true);
  };

  const handleReviewSubmit = (reviewData) => {
    console.log("Review submitted:", reviewData);
    // Here you would typically send this data to your backend
  };
  // Handle filter click
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  // Filter courses based on active filter
  const getFilteredCourses = () => {
    if (activeFilter === "all") return enrolledCourses;
    if (activeFilter === "inProgress") return enrolledCourses.filter(course => course.completionPercentage > 0 && course.completionPercentage < 100);
    if (activeFilter === "notStarted") return enrolledCourses.filter(course => course.completionPercentage === 0);
    if (activeFilter === "completed") return enrolledCourses.filter(course => course.completionPercentage === 100);
    return enrolledCourses;
  };

  // Get filtered courses
  const filteredCourses = getFilteredCourses();

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
            <div className="stat-number">{enrolledCourses.length}</div>
            <div className="stat-label">Enrolled Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {enrolledCourses.filter(course => course.completionPercentage === 100).length}
            </div>
            <div className="stat-label">Completed Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {Math.round(
                enrolledCourses.reduce((acc, course) => acc + course.completionPercentage, 0) / 
                enrolledCourses.length
              )}%
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
              <div className="course-card" key={course.id}>
                <div className={`course-thumbnail ${course.thumbnail}`}>
                  {course.completionPercentage === 100 && (
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
                        <span>Progress: {course.completionPercentage}%</span>
                        <span>{course.completedLectures}/{course.totalLectures} lectures</span>
                      </div>
                      <div className="completion-bar">
                        <div 
                          className="completion-fill" 
                          style={{width: `${course.completionPercentage}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="course-actions">
                    {course.completionPercentage === 100 ? (
                      <>
                        <button 
                          className="primary-button"
                          onClick={() => handleReviewClick(course)}
                        >
                          Review Course
                        </button>
                        <button className="secondary-button">Course Details</button>
                      </>
                    ) : (
                      <>
                        <button className="primary-button">Continue Learning</button>
                        <button className="secondary-button">Course Details</button>
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