import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InstructorsMainPage.css';
import { getCurrentUser, logout } from '../../services/auth';
import { getInstructorCourses } from '../../services/course';
import { getBasicProfile } from '../../services/user';
import { getInstructorStats } from '../../services/instructor';
import InstructorHeader from '../../components/InstructorHeader';

const InstructorMainPage = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Get current user data
  const userData = getCurrentUser();
  const [userName, setUserName] = useState('');

  // State for instructor courses
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for instructor stats
  const [instructorStats, setInstructorStats] = useState({
    publishedCourses: 0,
    totalStudents: 0,
    averageRating: 0.0,
    monthlyRevenue: 0.0
  });

  useEffect(() => {
    if (!userData?.user_id) return; // wait until userData is available

    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const response = await getInstructorCourses(userData.user_id);
        if (response.success) {
          setInstructorCourses(response.courses);
        }
      } catch (error) {
        console.error('Error fetching instructor courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [userData?.user_id]);

  useEffect(() => {
    const fetchName = async () => {
      try {
        const profile = await getBasicProfile(userData.user_id);
        setUserName(profile.full_name);
      } catch (err) {
        console.error('Failed to fetch profile name:', err);
        setUserName('Instructor');
      }
    };

    if (userData?.user_id) {
      fetchName();
    }
  }, [userData?.user_id]);

  useEffect(() => {
    if (!userData?.user_id) return;

    const fetchStats = async () => {
      try {
        const statsData = await getInstructorStats(userData.user_id);
        setInstructorStats(statsData);
      } catch (err) {
        console.error('Failed to fetch instructor stats:', err);
      }
    };

    fetchStats();
  }, [userData?.user_id]);

  // Instructor stats 
  const stats = [
    { value: instructorStats.publishedCourses, label: 'Published Courses' },
    { value: instructorStats.totalStudents, label: 'Total Students' },
    { value: instructorStats.averageRating.toFixed(1), label: 'Average Rating' },
    { value: `$${instructorStats.monthlyRevenue.toFixed(2)}`, label: 'Monthly Revenue' }
  ];

  const firstName = userData?.first_name ?? 'Instructor';

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-dropdown')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleCreateCourse = () => {
    navigate('/create-course');
  };

  const navigateToFinancialAid = () => {
    navigate('/applications');
  };

  return (
    <div className="instructor-main-page">
      {/* Use the same Instructor Header */}
      <InstructorHeader />


      {/* Main Content */}
      <main className="main-content">
        {/* Welcome Section */}
        <section className="welcome-section">
          <h2>Welcome back, {firstName}!</h2>
          <p>Create engaging courses and share your knowledge with students around the world.</p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="create-course-btn" onClick={handleCreateCourse}>
              <i className="plus-icon">+</i> Create New Course
            </button>
            <button className="create-course-btn" onClick={navigateToFinancialAid} style={{ backgroundColor: '#f5f5f5', color: '#d4a800' }}>
              <i className="aid-icon">$</i> Manage Financial Aid
            </button>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          {stats.map((stat, index) => (
            <div className="stat-card" key={index}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Courses Section */}
        <section className="courses-section">
          <div className="section-header">
            <h2>Your Courses</h2>
            <a href="/instructor/courses" className="view-all">View all</a>
          </div>
          <div className="courses-grid">
            {instructorCourses.map(course => (
              <div className="course-card" key={course.id}>
                <div className="course-image">
                  {/* Course thumbnail placeholder */}
                </div>
                <div className="course-info">
                  <h3 className="course-title">{course.title}</h3>
                  <div className="course-meta">
                    <span className="course-students">
                      {course.students} {course.students === 1 ? 'student' : 'students'}
                    </span>
                    <span className={`course-status status-${course.status}`}>
                      {course.status}
                    </span>
                  </div>
                  {course.status === 'draft' && (
                    <>
                      <div className="completion-text">
                        Completion: {course.progress}%
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default InstructorMainPage;