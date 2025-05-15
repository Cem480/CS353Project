import React, { useState, useEffect } from 'react';
import './InstructorCourses.css';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import { getBasicProfile } from '../../services/user';
import { getInstructorCourses } from '../../services/course';   
import InstructorHeader from '../../components/InstructorHeader';


const InstructorCourses = () => {
  const navigate = useNavigate();
  const userData = getCurrentUser();
  const [userName, setUserName] = useState('');
  const [courses, setCourses] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const firstName = userName;

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
        setCourses(result.courses);
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
      {/* ...header stays the same... */}
      <InstructorHeader />  

      <main className="main-content">
        <h2>Your Courses</h2>
        <div className="course-list">
          {courses.length === 0 ? (
            <p>No courses created yet.</p>
          ) : (
            courses.map(course => (
              <div className="instructor-course-card" key={course.id}>
                <div className="instructor-course-title">{course.title}</div>
                <div className="instructor-course-description">{course.description}</div>
                <div className="instructor-course-meta"><strong>Level:</strong> {course.difficulty_level || 'N/A'}</div>
                <div className="instructor-course-meta"><strong>Students:</strong> {course.students}</div>
                <div className="instructor-course-meta"><strong>Status:</strong> <span className="instructor-course-status">{course.status}</span></div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default InstructorCourses;
