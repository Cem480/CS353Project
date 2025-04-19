import React, { useState } from 'react';
import './InstructionPage.css';

const InstructorApplicationsPage = () => {
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
          <p>Review and manage student financial aid applications for your courses</p>
          <div className="financial-aid-summary">
            <div className="summary-item">
              <span className="count">{financialAidApplications.filter(app => app.status === 'pending').length}</span>
              <span className="label">Pending</span>
            </div>
            <div className="summary-item">
              <span className="count">{financialAidApplications.filter(app => app.status === 'approved').length}</span>
              <span className="label">Approved</span>
            </div>
            <div className="summary-item">
              <span className="count">{financialAidApplications.filter(app => app.status === 'rejected').length}</span>
              <span className="label">Rejected</span>
            </div>
          </div>
        </section>

        {/* Applications for each course */}
        {instructorCourses.map(course => {
          const courseApplications = getApplicationsByCourse(course.id);
          
          if (courseApplications.length === 0) return null;
          
          return (
            <section key={course.id} className="applications-overview">
              <div className="section-header">
                <h2>Financial Aid Requests: {course.title}</h2>
                <span className="application-count">{courseApplications.length} requests</span>
              </div>
              
              <div className="applications-grid">
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

        {/* Recent applications section */}
        <section className="recent-applications">
          <div className="section-header">
            <h2>Recent Financial Aid Requests</h2>
            <button className="view-all-btn">View All Financial Aid History</button>
          </div>
          
          <table className="applications-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Request Date</th>
                <th>Aid Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentApplications.map(app => {
                const course = instructorCourses.find(c => c.id === app.courseId);
                return (
                  <tr key={app.id}>
                    <td>{app.studentName}</td>
                    <td>{course.title}</td>
                    <td>{app.date}</td>
                    <td><span className={`status ${app.status}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span></td>
                    <td className="action-cell">
                      <button 
                        className="small-btn details"
                        onClick={() => handleApplicationAction(app.id, 'details')}
                      >
                        i
                      </button>
                      <button 
                        className="small-btn approve"
                        onClick={() => handleApplicationAction(app.id, 'approve')}
                      >
                        ✓
                      </button>
                      <button 
                        className="small-btn reject"
                        onClick={() => handleApplicationAction(app.id, 'reject')}
                      >
                        ✗
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default InstructorApplicationsPage;