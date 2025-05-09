import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CourseDetails.css';
import { getCurrentUser } from '../../services/auth';
import { enrollInCourse, checkEnrollment } from '../../services/student';

import { 
  getCourseInfo, 
  getCourseSections, 
  getSectionContents 
} from '../../services/courseContent';

const CourseDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showFinancialAid, setShowFinancialAid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseInfo, setCourseInfo] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionContents, setSectionContents] = useState({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  
  // Extract course ID from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get('id');
  
  // Get current user data
  const userData = getCurrentUser();
  
  // Use ref to prevent multiple API calls
  const dataFetchedRef = useRef(false);
  
  useEffect(() => {
    // If no user is logged in, redirect to login
    if (!userData) {
      navigate('/login');
      return;
    }
    
    // Prevent refetching data when component remounts
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    
    const fetchCourseData = async () => {
      setLoading(true);
      setError('');
      
      try {
        if (!courseId) {
          throw new Error('No course ID provided');
        }

        // Fetch course info
        const courseData = await getCourseInfo(courseId);
        console.log('Fetched course info:', courseData);
        
        if (!courseData) {
          throw new Error('Failed to fetch course information');
        }
        
        setCourseInfo(courseData);

        const enrollmentResult = await checkEnrollment(courseId, userData.user_id);
        setIsEnrolled(enrollmentResult.enrolled);
        
        // Fetch course sections
        const sectionsData = await getCourseSections(courseId);
        
        if (Array.isArray(sectionsData) && sectionsData.length > 0) {
          setSections(sectionsData);
          
          // Fetch content for each section
          const contentsObj = {};
          
          for (const section of sectionsData) {
            try {
              const sectionContentsData = await getSectionContents(courseId, section.sec_id);
              if (Array.isArray(sectionContentsData)) {
                contentsObj[section.sec_id] = sectionContentsData;
              }
            } catch (sectionError) {
              console.error(`Error fetching contents for section ${section.sec_id}:`, sectionError);
            }
          }
          
          setSectionContents(contentsObj);
        }
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError(`Failed to load course data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourseData();
  }, [courseId, userData, navigate]);

  const handleEnrollNow = async () => {
    if (!courseId) {
      alert('Invalid course information.');
      return;
    }

    try {
      const result = await enrollInCourse(courseId, userData.user_id);
      if (result.success) {
        alert(`You have successfully enrolled in ${courseInfo.title}!`);
        window.location.reload();
      } else {
        alert(`Enrollment failed: ${result.message}`);
      }
    } catch (err) {
      alert(`Enrollment failed: ${err.message}`);
    }
  };

  const handleFinancialAid = () => {
    setShowFinancialAid(!showFinancialAid);
  };

  const handleSubmitFinancialAid = (e) => {
    e.preventDefault();
    alert("Financial aid application submitted successfully!");
    setShowFinancialAid(false);
  };

  const handleGoBack = () => {
    navigate('/degrees');
  };

  // Get duration text based on allocated_time (in minutes)
  const getDurationText = (minutes) => {
    if (!minutes) return 'Duration not specified';
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      }
    }
  };

  // Function to get icon based on content type
  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'video':
        return '🎥';
      case 'reading':
        return '📚';
      case 'quiz':
        return '✅';
      case 'assignment':
        return '📝';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="course-details">
        <div className="course-details-container">
          <div style={{ 
            textAlign: 'center',
            padding: '40px 20px',
            fontSize: '16px',
            color: '#666'
          }}>
            Loading course details...
          </div>
        </div>
      </div>
    );
  }

  // Format course data for display
  const course = courseInfo || {};
  const title = course.title || 'Course Title';
  const description = course.description || 'No course description available.';
  const university = course.creator_id ? `Instructor ID: ${course.creator_id}` : 'University';
  const level = course.difficulty_level 
    ? `Level ${course.difficulty_level}` 
    : 'Not specified';
  const price = course.price 
    ? `$${course.price}` 
    : 'Price not available';
  const enrolled = course.enrollment_count 
    ? `${course.enrollment_count} student${course.enrollment_count !== 1 ? 's' : ''}` 
    : 'Not specified';
  const lastUpdated = course.last_update_date || 'Not specified';

  return (
    <div className="course-details">
      {/* Header */}
      <header className="course-details-course-header">
        <div className="course-details-logo" onClick={() => navigate('/home')}>
          <span className="course-details-logo-text">LearnHub</span>
        </div>
        <div className="course-details-search-container">
          <input type="text" placeholder="Search in course" className="course-details-search-input" />
          <button className="course-details-search-button">Search</button>
        </div>
        <div className="course-details-header-right">
          <div className="course-details-language-selector">
            <span>English</span>
            <span className="course-details-dropdown-arrow">▼</span>
          </div>
          <div className="course-details-notifications-icon">🔔</div>
          <div className="course-details-profile-icon">
            {userData ? userData.user_id.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>
      
      {/* Error Message (if any) */}
      {error && (
        <div style={{ 
          padding: '10px', 
          margin: '10px auto', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px',
          maxWidth: '1200px'
        }}>
          {error}
        </div>
      )}
      
      <div className="course-details-container">
        <div className="course-details-header">
          <button className="course-details-back-button" onClick={handleGoBack}>
            &larr; Back to Degrees
          </button>
          <div className="course-details-header-content">
            <h1>{title}</h1>
            <h3>{university}</h3>
          </div>
        </div>
        
        <div className="course-details-main">
          <div className="course-details-info-container">
            <div className="course-details-overview">
              <h2>Overview</h2>
              <p>{description}</p>
              
              <div className="course-details-metadata">
                <div className="course-details-metadata-item">
                  <span className="course-details-metadata-label">Duration:</span>
                  <span className="course-details-metadata-value">Not specified</span>
                </div>
                <div className="course-details-metadata-item">
                  <span className="course-details-metadata-label">Level:</span>
                  <span className="course-details-metadata-value">{level}</span>
                </div>
                <div className="course-details-metadata-item">
                  <span className="course-details-metadata-label">Enrolled:</span>
                  <span className="course-details-metadata-value">{enrolled}</span>
                </div>
                <div className="course-details-metadata-item">
                  <span className="course-details-metadata-label">Last Updated:</span>
                  <span className="course-details-metadata-value">{lastUpdated}</span>
                </div>
              </div>
            </div>
            
            <div className="course-details-syllabus">
              <h2>Syllabus</h2>
              {sections && sections.length > 0 ? (
                <div className="course-details-syllabus-modules">
                  {sections.map((section) => (
                    <div key={section.sec_id} className="course-details-syllabus-module">
                      <div className="course-details-module-header">
                        <h4>{section.section_title}</h4>
                        <span className="course-details-module-duration">Section {section.order_number}</span>
                      </div>
                      
                      {sectionContents[section.sec_id] && sectionContents[section.sec_id].length > 0 ? (
                        <ul className="course-details-module-topics">
                          {sectionContents[section.sec_id].map((content) => (
                            <li key={content.content_id}>
                              <span style={{ marginRight: '8px' }}>{getContentTypeIcon(content.content_type)}</span>
                              {content.content_title}
                              <span style={{ 
                                fontSize: '0.85em', 
                                color: '#666', 
                                marginLeft: '8px' 
                              }}>
                                ({getDurationText(content.allocated_time)})
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="course-details-no-content">No content available for this section.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="course-details-no-syllabus">
                  <p>No syllabus information available for this course.</p>
                </div>
              )}
            </div>
            
            <div className="course-details-instructors-section">
              <h2>Instructors</h2>
              <div className="course-details-no-instructors">
                <p>No instructor information available for this course.</p>
              </div>
            </div>
          </div>
          
          <div className="course-details-enrollment-card">
            <h2>{title}</h2>
            <div className="course-details-enrollment-price">{price}</div>

            {isEnrolled ? (
              <button
                className="course-details-continue-button"
                onClick={() => navigate('/my-learning')}
              >
                Continue Learning
              </button>
            ) : (
              <>
                <button className="course-details-apply-button" onClick={handleEnrollNow}>
                  Enroll Now
                </button>
                <button className="course-details-financial-aid-button" onClick={handleFinancialAid}>
                  Financial Aid Available
                </button>
              </>
            )}

            <div className="course-details-enrollment-details">
              <div className="course-details-enrollment-detail">
                <span className="course-details-detail-icon">🗓️</span>
                <span>Starts: <strong>Flexible</strong></span>
              </div>
              <div className="course-details-enrollment-detail">
                <span className="course-details-detail-icon">⏱️</span>
                <span>Duration: <strong>Not specified</strong></span>
              </div>
              <div className="course-details-enrollment-detail">
                <span className="course-details-detail-icon">🎓</span>
                <span>Level: <strong>{level}</strong></span>
              </div>
              <div className="course-details-enrollment-detail">
                <span className="course-details-detail-icon">📚</span>
                <span>Fully Online</span>
              </div>
            </div>
          </div>
        </div>
        
        {showFinancialAid && (
          <div className="course-details-financial-aid-modal">
            <div className="course-details-financial-aid-content">
              <button className="course-details-close-modal" onClick={handleFinancialAid}>×</button>
              <h2>Financial Aid Application</h2>
              <p>Please complete the following form to apply for financial aid for the {title} program.</p>
              
              <form onSubmit={handleSubmitFinancialAid}>
                <div className="course-details-form-group">
                  <label htmlFor="income">Annual Income (USD)</label>
                  <input type="number" id="income" required />
                </div>
                
                <div className="course-details-form-group">
                  <label htmlFor="reason">Why are you applying for financial aid?</label>
                  <textarea id="reason" rows="4" required></textarea>
                </div>
                
                <button type="submit" className="course-details-submit-aid-button">Submit Application</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;