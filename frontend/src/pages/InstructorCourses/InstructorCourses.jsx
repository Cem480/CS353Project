import React, { useState, useEffect } from 'react';
import './InstructorCourses.css';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { getBasicProfile } from '../../services/user';
import { getInstructorCourses } from '../../services/course';   
import InstructorHeader from '../../components/InstructorHeader';

const InstructorCourses = () => {
  const navigate = useNavigate();
  const userData = getCurrentUser();
  const [userName, setUserName] = useState('');
  const [allCourses, setAllCourses] = useState([]);

  const firstName = userName;

  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCourses = allCourses.filter(course =>
    statusFilter === 'all' ? true : course.status === statusFilter
  );

  // Handle Edit button click with updated navigation
  const handleEditClick = (courseId, status) => {
    if (status === 'draft') {
      // If course is a draft, go to the full course editor
      navigate(`/edit-course/${courseId}`);
    } else if (status === 'accepted' || status === 'pending') {
      // For accepted/pending courses, go to content editor
      navigate(`/course/${courseId}/content-editor`);
    }
    // Note: Rejected courses don't have edit functionality
  };
  
  const handleCourseDetailsClick = (courseId) => {
    navigate(`/course-details?id=${courseId}`);
  };

  // Function to determine if edit button should be shown
  const shouldShowEditButton = (status) => {
    return status !== 'rejected';
  };

  // Function to get edit button text based on status
  const getEditButtonText = (status) => {
    if (status === 'draft') {
      return '✏️ Edit Course';
    } else if (status === 'accepted' || status === 'pending') {
      return '✏️ Edit Content';
    }
    return '';
  };

  useEffect(() => {
    const fetchName = async () => {
      try {
        const profile = await getBasicProfile(userData.user_id);
        setUserName(profile.full_name);
      } catch {
        setUserName('Instructor');
      }
    };

    const fetchCourses = async () => {
      try {
        const result = await getInstructorCourses(userData.user_id);
        setAllCourses(result.courses);
      } catch (err) {
        console.error('Could not fetch instructor courses:', err);
      }
    };

    if (userData?.user_id) {
      fetchName();
      fetchCourses();
    }
  }, [userData?.user_id]);

  return (
    <div className="instructor-courses-page">
      <InstructorHeader />  

      <main className="main-content">
        <h2>Your Courses</h2>
        <div className="course-filter-bar">
          {['all', 'accepted', 'draft', 'pending', 'rejected'].map((status) => (
            <button
              key={status}
              className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <div className="course-list">
          {allCourses.length === 0 ? (
            <p>No courses created yet.</p>
          ) : (
            filteredCourses.map(course => (
              <div className="instructor-course-card" key={course.course_id}>
                <div className="instructor-course-title">{course.title}</div>
                <div className="instructor-course-description">{course.description}</div>
                <div className="instructor-course-meta"><strong>Level:</strong> {course.difficulty_level || 'N/A'}</div>
                <div className="instructor-course-meta"><strong>Students:</strong> {course.students}</div>
                <div className="instructor-course-meta"><strong>Status:</strong> <span className="instructor-course-status">{course.status}</span></div>
                
                {/* Conditional status info */}
                {course.status === 'draft' && (
                  <div className="instructor-course-progress">
                    Completion: {course.progress}%
                    <div className="progress-bar" style={{ marginTop: '8px', height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div className="progress-fill" style={{ width: `${course.progress}%`, height: '100%', backgroundColor: '#d4a800' }}></div>
                    </div>
                  </div>
                )}
                
                {course.status === 'rejected' && (
                  <div className="instructor-course-rejected-info" style={{ color: '#f44336', marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', border: '1px solid #ffcdd2' }}>
                    <strong>⚠️ Course Rejected:</strong> This course was rejected during review. Please contact support for more information or create a new course.
                  </div>
                )}
                
                <div className="instructor-course-actions">
                  {/* Only show edit button for non-rejected courses */}
                  {shouldShowEditButton(course.status) && (
                    <button 
                      className="edit-button" 
                      onClick={() => handleEditClick(course.course_id, course.status)}
                    >
                      {getEditButtonText(course.status)}
                    </button>
                  )}
                  
                  {/* Show a different message for rejected courses */}
                  {course.status === 'rejected' && (
                    <div className="rejected-course-message" style={{ 
                      width: '100%', 
                      textAlign: 'center', 
                      color: '#f44336', 
                      fontWeight: '500',
                      fontStyle: 'italic',
                      padding: '10px'
                    }}>
                      No actions available for rejected courses
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default InstructorCourses;