import React, { useState } from 'react';
import './MyLearningPage.css';

const MyLearningPage = () => {
  // Mockup enrolled courses with completion percentages
  const [enrolledCourses] = useState([
    {
      id: 1,
      title: "Introduction to JavaScript Programming",
      instructor: "David Mitchell",
      category: "Web Development",
      completionPercentage: 75,
      lastAccessed: "2024-11-15",
      thumbnail: "javascript",
      totalLectures: 42,
      completedLectures: 32,
      estimatedTimeLeft: "3 hours"
    },
    {
      id: 2,
      title: "Advanced Python for Data Science",
      instructor: "Sarah Johnson",
      category: "Data Science",
      completionPercentage: 35,
      lastAccessed: "2024-11-10",
      thumbnail: "python",
      totalLectures: 56,
      completedLectures: 20,
      estimatedTimeLeft: "8 hours"
    },
    {
      id: 3,
      title: "UX/UI Design Fundamentals",
      instructor: "Michael Wong",
      category: "Design",
      completionPercentage: 100,
      lastAccessed: "2024-10-28",
      thumbnail: "design",
      totalLectures: 38,
      completedLectures: 38,
      estimatedTimeLeft: "0 hours"
    },
    {
      id: 4,
      title: "Machine Learning with TensorFlow",
      instructor: "Elena Rodriguez",
      category: "Artificial Intelligence",
      completionPercentage: 10,
      lastAccessed: "2024-11-18",
      thumbnail: "ml",
      totalLectures: 65,
      completedLectures: 7,
      estimatedTimeLeft: "15 hours"
    }
  ]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState("all");

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

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
            <a href="#">Home</a>
            <a href="#">Online Degrees</a>
            <a href="#" className="active">My Learning</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search my courses..." />
            <button className="search-button">Search</button>
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
          <div className="stat-card">
            <div className="stat-number">26</div>
            <div className="stat-label">Learning Hours</div>
          </div>
        </div>

        {/* Filter Tabs */}
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
                    
                    <div className="course-meta">
                      <div className="meta-item">
                        <span className="meta-label">Last accessed:</span>
                        <span className="meta-value">{formatDate(course.lastAccessed)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Time left:</span>
                        <span className="meta-value">{course.estimatedTimeLeft}</span>
                      </div>
                    </div>
                  </div>
                  <div className="course-actions">
                    <button className="primary-button">
                      {course.completionPercentage === 100 ? 'Review Again' : 'Continue Learning'}
                    </button>
                    <button className="secondary-button">Course Details</button>
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