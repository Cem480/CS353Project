import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InstructionPage.css';
import { useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, logout } from '../../services/auth';

const InstructorApplicationsPage = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  // Get current user data
  const userData = getCurrentUser();

  // Assuming instructor's first name for display
  const firstName = userData ? 
  (userData.user_id.charAt(0).toUpperCase() + userData.user_id.slice(1).split('@')[0]) : 
  "Instructor";

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

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

  useEffect(() => {
    fetchStats();
    fetchApplications();
  }, []);

  const fetchStats = async () => {
    try {
      const instructorId = localStorage.getItem("user_id");
      const res = await axios.get(`http://localhost:5001/api/instructor/${instructorId}/financial_aid_stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };
    const fetchStats = async () => {
      try {
        const instructorId = userData?.user_id;
        if (instructorId) {
          const res = await axios.get(`http://localhost:5001/api/instructor/${instructorId}/financial_aid_stats`);
          setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
  }, [userData]);

  // Mock data for instructor courses
  const instructorCourses = [
    {
      id: 1,
      title: "Introduction to Data Science",
      image: "data-science.jpg",
      provider: "Tech University",
      level: "Beginner"
    },
    {
      id: 2,
      title: "Advanced Web Development",
      image: "web-dev.jpg",
      provider: "Code Academy",
      level: "Intermediate"
    },
    {
      id: 3,
      title: "UX/UI Design Principles",
      image: "uxui-design.jpg",
      provider: "Design School",
      level: "Intermediate"
    }
  ];

  // Mock data for financial aid applications
  const financialAidApplications = [
    // Course 1 applications (5)
    {
      id: 101,
      courseId: 1,
      studentName: "Alex Johnson",
      status: "pending",
      date: "Mar 20, 2025",
      reason: "Career transition into data science field.",
      aidAmount: "$99",
      progress: "75% completed application"
    },
    {
      id: 102,
      courseId: 1,
      studentName: "Jamie Smith",
      status: "pending",
      date: "Mar 19, 2025",
      reason: "Unable to afford course due to recent job loss."
    },
    {
      id: 103,
      courseId: 1,
      studentName: "Taylor Rodriguez",
      status: "approved",
      date: "Mar 15, 2025",
      reason: "Need skills for current job position."
    },
    {
      id: 104,
      courseId: 1,
      studentName: "Morgan Lee",
      status: "rejected",
      date: "Mar 10, 2025",
      reason: "Looking to expand knowledge in data analysis."
    },
    {
      id: 105,
      courseId: 1,
      studentName: "Casey Martin",
      status: "pending",
      date: "Mar 21, 2025",
      reason: "Student with limited financial resources."
    },
    
    // Course 2 applications (1)
    {
      id: 201,
      courseId: 2,
      studentName: "Jordan Parker",
      status: "pending",
      date: "Mar 18, 2025",
      reason: "Need to learn modern web development for startup."
    },
    
    // Course 3 applications (2)
    {
      id: 301,
      courseId: 3,
      studentName: "Riley Thompson",
      status: "pending",
      date: "Mar 22, 2025",
      reason: "Transitioning to UX career from graphic design."
    },
    {
      id: 302,
      courseId: 3,
      studentName: "Sam Wilson",
      status: "pending",
      date: "Mar 21, 2025",
      reason: "Want to improve portfolio with proper design skills."
    }
  ];

  const getApplicationsByCourse = (courseId) => {
    return financialAidApplications.filter(app => app.courseId === courseId);
  };

  const recentApplications = [...financialAidApplications]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5); 

  const handleApplicationAction = (applicationId, action) => {
    console.log(`Application ${applicationId}: ${action} action triggered`);
  };

  const navigateToInstructorHome = () => {
    navigate('/home');
  };

  return (
    <div className="instructor-container">
      {/* Header - Updated to match InstructorMainPage style */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a href="/home">Dashboard</a>
            <a href="/my-courses">My Courses</a>
            <a href="/analytics">Analytics</a>
            <a href="/applications" className="active">Financial Aid</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search courses..." />
            <button className="search-button">Search</button>
          </div>
          <div className="profile-dropdown">
            <div className="profile-icon" onClick={toggleProfileMenu}>
              {userData ? userData.user_id.charAt(0).toUpperCase() : 'I'}
            </div>
            
            {showProfileMenu && (
              <div className="dropdown-menu active">
                <div className="profile-info">
                  <div className="profile-avatar-large">
                    {userData ? userData.user_id.charAt(0).toUpperCase() : 'I'}
                  </div>
                  <div className="profile-details">
                    <div className="profile-name">{firstName}</div>
                    <div className="profile-role">{userData ? userData.role : 'instructor'}</div>
                  </div>
                </div>
                <ul>
                  <li><a href="/my-courses">My Courses</a></li>
                  <li><a href="/earnings">Earnings</a></li>
                  <li><a href="/notifications">Notifications</a></li>
                  <li><a href="/applications">Financial Aid</a></li>
                  <li><a href="/settings">Account Settings</a></li>
                  <div className="menu-divider"></div>
                  <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</a></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="instructor-main">
        <section className="welcome-section">
          <h1>Financial Aid Requests</h1>
          <p>Review and anage student financial aid applications for your courses!</p>
          <div className="financial-aid-summary">
            <div className="summary-item">
              <span className="count">{stats.pending}</span>
              <span className="label">Pending</span>
            </div>
            <div className="summary-item">
              <span className="count">{stats.approved}</span>
              <span className="label">Approved</span>
            </div>
            <div className="summary-item">
              <span className="count">{stats.rejected}</span>
              <span className="label">Rejected</span>
            </div>
          </div>
        </section>

        {/* Applications for each course */}
        {Object.entries(applicationsByCourse).map(([courseId, courseData]) => {
          const courseApplications = courseData.applications;

          if (courseApplications.length === 0) return null;

          return (
            <section key={courseId} className="applications-overview">
              <div className="section-header">
                <h2>Financial Aid Requests: {courseData.courseTitle}</h2>
                <span className="application-count">{courseApplications.length} requests</span>
              </div>

              <div className="applications-grid">
                {courseApplications.map(application => {
                  const isProcessed = application.status === 'approved' || application.status === 'rejected';

                  return (
                    <div key={`${application.courseId}-${application.studentId}`} className="application-card">
                      <div className="application-details">
                        <h3>{application.courseTitle}</h3>
                        <p className="student-name">From: {application.studentName}</p>
                        <p className="aid-type">Financial Aid Request</p>
                        <div className="application-meta">
                          <span className={`status ${application.status}`}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                          <span className="date">
                            Submitted: {new Date(application.applicationDate).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Income and full statement */}
                        <div className="aid-info">
                          <p className="income-info"><strong>Income:</strong> ${application.income}</p>
                          <p className="full-statement">"{application.statement}"</p>
                        </div>

                        {/* Action buttons */}
                        <div className="action-buttons">
                          <button
                            className={`approve-btn ${isProcessed ? 'disabled' : ''}`}
                            onClick={() => handleApplicationAction(application.courseId, application.studentId, 'approve')}
                            disabled={isProcessed}
                          >
                            Accept
                          </button>
                          <button
                            className={`reject-btn ${isProcessed ? 'disabled' : ''}`}
                            onClick={() => handleApplicationAction(application.courseId, application.studentId, 'reject')}
                            disabled={isProcessed}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
                {courseApplications.map(application => {
                  const isProcessed = application.status === 'approved' || application.status === 'rejected';
                  
                  return (
                    <div key={application.id} className="application-card">
                      <div className="course-image"></div>
                      <div className="application-details">
                        <h3>{course.title}</h3>
                        <p className="student-name">From: {application.studentName}</p>
                        <p className="aid-type">{application.aidType || "Financial Aid Request"}</p>
                        <div className="application-meta">
                          <span className={`status ${application.status}`}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                          <span className="date">Submitted: {application.date}</span>
                        </div>
                        <p className="aid-reason">"{application.reason?.substring(0, 60)}..."</p>
                        <div className="action-buttons">
                          <button 
                            className={`details-btn ${isProcessed ? 'disabled' : ''}`}
                            onClick={() => handleApplicationAction(application.id, 'details')}
                            disabled={isProcessed}
                          >
                            Details
                          </button>
                          <button 
                            className={`approve-btn ${isProcessed ? 'disabled' : ''}`}
                            onClick={() => handleApplicationAction(application.id, 'approve')}
                            disabled={isProcessed}
                          >
                            Accept
                          </button>
                          <button 
                            className={`reject-btn ${isProcessed ? 'disabled' : ''}`}
                            onClick={() => handleApplicationAction(application.id, 'reject')}
                            disabled={isProcessed}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default InstructorApplicationsPage;