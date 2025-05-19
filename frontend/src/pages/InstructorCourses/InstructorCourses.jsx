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
    if (status === 'draft' || status === 'rejected') {
      // If course is a draft or rejected, go to the full course editor
      navigate(`/edit-course/${courseId}`);
    } else {
      // For accepted/pending courses, go to content editor (not content)
      navigate(`/course/${courseId}/content-editor`);
    }
  };
  
  const handleCourseDetailsClick = (courseId) => {
    navigate(`/course-details?id=${courseId}`);
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
                  <div className="instructor-course-rejected-info" style={{ color: '#f44336', marginTop: '10px' }}>
                    <strong>Note:</strong> This course was rejected. You can edit and resubmit it.
                  </div>
                )}
                
                <div className="instructor-course-actions">
                  <button 
                    className="details-button" 
                    onClick={() => handleCourseDetailsClick(course.course_id)}
                  >
                    Course Details
                  </button>
                  
                  <button 
                    className="edit-button" 
                    onClick={() => handleEditClick(course.course_id, course.status)}
                  >
                    {course.status === 'draft' || course.status === 'rejected' 
                      ? '✏️ Edit Course' 
                      : '✏️ Edit Content'}
                  </button>
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