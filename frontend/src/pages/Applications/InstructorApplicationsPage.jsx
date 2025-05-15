import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InstructionPage.css';
import { useEffect } from 'react';
import { getCurrentUser, logout } from '../../services/auth';
import { getFinancialAidStats, getFinancialAidApplications, evaluateFinancialAid } from '../../services/financial_aid';
import InstructorHeader from '../../components/InstructorHeader';


const InstructorApplicationsPage = () => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [applications, setApplications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('pending');


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

  const fetchStats = async () => {
    try {
      if (userData?.user_id) {
        const res = await getFinancialAidStats(userData.user_id);
        setStats(res);
      }
    } catch (err) {}
  };

  const fetchApplications = async () => {
    try {
      if (userData?.user_id) {
        const data = await getFinancialAidApplications(userData.user_id);
        setApplications(data);
      }
    } catch (err) {}
  };

  const filteredApplications = applications.filter(app => app.status === currentFilter);

  // Group applications by course
  const applicationsByCourse = {};

  filteredApplications.forEach(app => {
    if (!applicationsByCourse[app.courseId]) {
      applicationsByCourse[app.courseId] = {
        courseTitle: app.courseTitle,
        applications: []
      };
    }
    applicationsByCourse[app.courseId].applications.push(app);
  });

  useEffect(() => {
    if (userData?.user_id) {
      fetchStats();
      fetchApplications();
    }
  }, [userData?.user_id]);
  
  const navigateToInstructorHome = () => {
    navigate('/home');
  };

  

  const handleApplicationAction = async (courseId, studentId, action) => {
    try {
      const isAccepted = action === 'approve';
      const res = await evaluateFinancialAid(courseId, studentId, userData.user_id, isAccepted);

      if (res.success) {
        fetchApplications();
        fetchStats();
      } else {
        console.error("Evaluation failed:", res.message);
      }
    } catch (err) {}
  };

  return (
    <div className="instructor-container">
      
      {/* Header - Updated to match InstructorMainPage style */}
      {/* ...header stays the same... */}
      <InstructorHeader />  
      {/* Main Content */}
      <main className="instructor-main">
        <section className="welcome-section">
          <h1>Financial Aid Requests</h1>
          <p>Review and manage student financial aid applications for your courses!</p>
          <div className="financial-aid-summary">
            <div className="summary-item" onClick={() => setCurrentFilter('pending')}>
              <span className="count">{stats.pending}</span>
              <span className="label">Pending</span>
            </div>
            <div className="summary-item" onClick={() => setCurrentFilter('approved')}>
              <span className="count">{stats.approved}</span>
              <span className="label">Approved</span>
            </div>
            <div className="summary-item" onClick={() => setCurrentFilter('rejected')}>
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
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default InstructorApplicationsPage;