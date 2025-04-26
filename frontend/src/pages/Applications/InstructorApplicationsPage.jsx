import React, { useState } from 'react';
import './InstructionPage.css';
import { useEffect } from 'react';
import axios from 'axios';

const InstructorApplicationsPage = () => {

  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

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

  const [applications, setApplications] = useState([]);

  const fetchApplications = async () => {
    try {
      const instructorId = localStorage.getItem("user_id");
      const response = await axios.post(
        `http://localhost:5001/api/instructor/${instructorId}/financial_aid_applications`,
        { status: "pending" },
        {
          headers: { "Content-Type": "application/json" }
        }
      );
      setApplications(response.data);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    }
  };


  // Group applications by course
  const applicationsByCourse = {};

  applications.forEach(app => {
    if (!applicationsByCourse[app.courseId]) {
      applicationsByCourse[app.courseId] = {
        courseTitle: app.courseTitle,
        applications: []
      };
    }
    applicationsByCourse[app.courseId].applications.push(app);
  });
 

  const handleApplicationAction = async (courseId, studentId, action) => {
    try {
      const instructorId = localStorage.getItem("user_id"); // Get current logged in instructor
  
      const isAccepted = action === "approve"; // if "approve", true; if "reject", false
  
      const response = await axios.post(
        `http://localhost:5001/api/financial_aid/evaluate/${courseId}/${studentId}/${instructorId}`,
        {
          is_accepted: isAccepted
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );
  
      if (response.data.success) {
        console.log(`Application ${studentId} for course ${courseId} successfully ${isAccepted ? "approved" : "rejected"}.`);
        fetchApplications(); // 🔥 Re-fetch applications to refresh the screen!
        fetchStats();         // 🔥 Re-fetch stats (pending, approved, rejected counts)!
      } else {
        console.error("Evaluation failed:", response.data.message);
      }
  
    } catch (error) {
      console.error("Error during evaluation:", error);
    }
  };

  return (
    <div className="instructor-container">
      {/* Header */}
      <header className="instructor-header">
        <div className="logo-container">
          <a href="/" className="instructor-logo">LearnHub-Instructor</a>
        </div>
        <div className="search-container">
          <input 
            type="text" 
            placeholder="What do you want to teach?" 
            className="search-input" 
          />
          <button className="search-button">Search</button>
        </div>
        <div className="user-actions">
          <a href="#" className="notifications">
            <span className="notification-icon">🔔</span>
          </a>
          <div className="user-profile">
            <span className="profile-icon">C</span>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="instructor-nav">
        <ul>
          <li><a href="/instructor/courses">Courses</a></li>
          <li><a href="/instructor/students">Students</a></li>
          <li className="active"><a href="/instructor/applications">Financial Aid</a></li>
        </ul>
      </nav>

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
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default InstructorApplicationsPage;