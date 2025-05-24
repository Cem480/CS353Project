import React, { useEffect, useState } from 'react';
import './MyLearningPage.css';
import CourseReviewPopup from './ReviewPopUp';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { getEnrolledCourses } from '../../services/course';
import { getStudentCertificates, generateCertificate } from '../../services/student';
import NotificationButton from '../../components/NotificationButton';

const MyLearningPage = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [activeFilter, setActiveFilter] = useState('all');
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const filterDisplayNames = {
    all: 'All',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
    completed: 'Completed',
  };

  // Fetch enrolled courses
  useEffect(() => {
    async function fetchData() {
      try {
        const courses = await getEnrolledCourses(user.user_id);
        setAllCourses(courses);
      } catch {
        setError('Failed to load enrolled courses.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user.user_id]);

  // Fetch certificates
  useEffect(() => {
    async function fetchCerts() {
      try {
        const result = await getStudentCertificates();
        if (result.success) setCertificates(result.certificates);
      } catch {
        console.error('Failed to load certificates.');
      }
    }
    fetchCerts();
  }, []);

  const getFilteredCourses = () => {
    if (activeFilter === 'inProgress') return allCourses.filter(c => c.progress_rate > 0 && c.progress_rate < 100);
    if (activeFilter === 'notStarted') return allCourses.filter(c => c.progress_rate === 0);
    if (activeFilter === 'completed') return allCourses.filter(c => c.progress_rate === 100);
    return allCourses;
  };

  const filteredCourses = getFilteredCourses();

  const handleReviewClick = (course) => {
    setSelectedCourse(course);
    setShowReviewPopup(true);
  };

  const handleReviewSubmit = (reviewData) => {
    console.log('Review submitted:', reviewData);
    // Here you'd typically send the review to the backend
  };

  // Handle Continue Learning button click
  const handleContinueLearning = (courseId) => {
    navigate(`/course/${courseId}/content`);
  };

  return (
    <div className="my-learning-page">
      <header className="main-page-header">
        <div className="main-page-header-left">
          <div className="main-page-logo">
            <h1>LearnHub</h1>
          </div>
          <div className="main-page-nav-links">
            <Link to="/home">Home</Link>
            <Link to="/degrees">Online Degrees</Link>
            <Link to="/my-learning" className="active">My Learning</Link>
            <Link to="/my-certificates">My Certificates</Link>
            <Link to="/student/fapplications">My Fapplications</Link>
          </div>
        </div>
        <div className="main-page-header-right">
          <div className="main-page-search-bar">
            <input type="text" placeholder="Search my courses..." />
            <button className="main-page-search-button">Search</button>
          </div>
          <div 
            className="notification-button" 
            onClick={() => navigate('/notifications')} 
            style={{ cursor: 'pointer' }}
            title="View notifications"
          >
            <span className="notification-icon">🔔</span>
          </div>
          <div className="main-page-profile-dropdown">
            <div className="main-page-profile-icon" onClick={() => navigate('/profile')}>
              {user.user_id.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="learning-container">
        <div className="page-title">
          <h2>My Learning</h2>
          <p>Track your progress and continue learning</p>
        </div>

        <div className="learning-stats">
          <div className="stat-card"><div className="stat-number">{allCourses.length}</div><div className="stat-label">Enrolled Courses</div></div>
          <div className="stat-card"><div className="stat-number">{allCourses.filter(c => c.progress_rate === 100).length}</div><div className="stat-label">Completed Courses</div></div>
          <div className="stat-card"><div className="stat-number">{allCourses.length > 0 ? Math.round(allCourses.reduce((sum, c) => sum + c.progress_rate, 0) / allCourses.length) : 0}%</div><div className="stat-label">Average Completion</div></div>
        </div>

        {showReviewPopup && selectedCourse && (
          <CourseReviewPopup course={selectedCourse} onClose={() => setShowReviewPopup(false)} onSubmit={handleReviewSubmit} />
        )}

        <div className="learning-filters">
          {['all', 'inProgress', 'notStarted', 'completed'].map(filter => (
            <button key={filter} className={`filter-button ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)}>
              {filterDisplayNames[filter] || (filter.charAt(0).toUpperCase() + filter.slice(1))} 
            </button>
          ))}
        </div>

        <div className="learning-courses">
          {loading ? (
            <p>Loading courses...</p>
          ) : filteredCourses.length === 0 ? (
            <p>No courses match your filter.</p>
          ) : (
            filteredCourses.map(course => {
              const hasCertificate = certificates.some(cert => cert.course_title === course.title);
              return (
                <div className="course-card" key={course.course_id}>
                  <div className="course-content">
                    <div className="course-info">
                      <h3 className="course-title">{course.title}</h3>
                      <p className="course-instructor">Instructor: {course.instructor}</p>
                      <div className="course-category">{course.category}</div>
                      <div className="completion-container">
                        <div className="completion-text">Progress: {course.progress_rate}%</div>
                        <div className="completion-bar"><div className="completion-fill" style={{ width: `${course.progress_rate}%` }}></div></div>
                      </div>
                    </div>
                    <div className="course-actions">
                      {course.progress_rate === 100 ? (
                        <>
                          {hasCertificate ? (
                            <button className="primary-button" onClick={() => navigate('/my-certificates')}>View Certificate</button>
                          ) : (
                            <button className="primary-button" onClick={async () => {
                              try {
                                const data = await generateCertificate(course.course_id, user.user_id);
                                if (data.success) {
                                  alert('Certificate generated!');
                                  const updated = await getStudentCertificates();
                                  setCertificates(updated.certificates);
                                } else {
                                  alert(`Error: ${data.message}`);
                                }
                              } catch {
                                alert('Failed to generate certificate.');
                              }
                            }}>Generate Certificate</button>
                          )}
                          <button className="secondary-button" onClick={() => navigate(`/course-details?id=${course.course_id}`)}>Course Details</button>
                        </>
                      ) : (
                        <>
                          {/* Updated to use handleContinueLearning */}
                          <button 
                            className="primary-button" 
                            onClick={() => handleContinueLearning(course.course_id)}
                          >
                            Continue Learning
                          </button>
                          <button className="secondary-button" onClick={() => navigate(`/course-details?id=${course.course_id}`)}>Course Details</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="recommendations-section">
          <h3 className="section-title">Recommended Next Steps</h3>
          <div className="recommendations-grid">
            <div className="recommendation-card"><div className="recommendation-icon">🎯</div><h4>Next Course</h4><p>Advanced JavaScript: From Fundamentals to Functional JS</p><button className="outline-button">Explore</button></div>
            <div className="recommendation-card"><div className="recommendation-icon">📊</div><h4>Practice Project</h4><p>Build a real-world data visualization project</p><button className="outline-button">Start Project</button></div>
            <div className="recommendation-card"><div className="recommendation-icon">🏆</div><h4>Get Certified</h4><p>Take the Python for Data Science certification exam</p><button className="outline-button">View Details</button></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyLearningPage;