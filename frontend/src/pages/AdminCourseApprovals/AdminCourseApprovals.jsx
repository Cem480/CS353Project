import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCurrentUser } from '../../services/auth';
import { getCoursesByStatus, evaluateCourse } from '../../services/course';

import AdminHeader from '../../components/AdminHeader';
import './AdminCourseApprovals.css';

const AdminCourseApprovals = () => {
  const navigate = useNavigate();
  const userData = getCurrentUser();

  const [pendingCourses, setPendingCourses] = useState([]);

  useEffect(() => {
    const fetchPendingCourses = async () => {
      try {
        const response = await getCoursesByStatus('pending');
        if (response.success) {
          setPendingCourses(response.courses);
        }
      } catch (err) {
        console.error('Failed to fetch pending courses', err);
      }
    };

    fetchPendingCourses();
  }, []);

  const handleEvaluation = async (courseId, isAccepted) => {
    try {
      const response = await evaluateCourse(courseId, userData.user_id, isAccepted);
      if (response.success) {
        setPendingCourses(prev => prev.filter(c => c.course_id !== courseId));
      } else {
        alert(response.message || 'Action failed');
      }
    } catch (error) {
      console.error('Course evaluation failed:', error);
    }
  };

  return (
    <div className="admin-main-page">
      <AdminHeader /> {/* ✅ now shared across admin pages */}

      <main className="main-content">
        <section className="welcome-section">
          <h2>Course Approvals</h2>
          <p>Review and approve submitted courses below.</p>

          {pendingCourses.length === 0 ? (
            <p>No pending courses found.</p>
          ) : (
            <div className="vertical-course-list">
              {pendingCourses.map(course => (
                <div key={course.course_id} className="course-card">
                  <h3>{course.title}</h3>
                  <div className="course-meta">
                    <p><strong>Instructor Name:</strong> {course.instructor_name}</p>
                    <p><strong>Category:</strong> {course.category}</p>
                    <p><strong>Difficulty:</strong> {course.difficulty_level}</p>
                    <p><strong>Price:</strong> ${course.price}</p>
                    <p><strong>Creation Date:</strong> {course.creation_date}</p>
                  </div>
                  <div className="course-description">{course.description}</div>
                  <div className="approval-actions">
                    <button className="approve-btn" onClick={() => handleEvaluation(course.course_id, true)}>Approve</button>
                    <button className="reject-btn" onClick={() => handleEvaluation(course.course_id, false)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminCourseApprovals;
