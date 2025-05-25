import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import NotificationButton from '../../components/NotificationButton';
import { get_student_financial_aid_applications } from '../../services/financial_aid';
import './StudentFinancialAidPage.css';

import StudentHeader from '../../components/StudentHeader';
import AdminHeader from '../../components/AdminHeader';
import InstructorHeader from '../../components/InstructorHeader';

const MyFinancialAidApplicationsPage = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const role = user.role;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    async function fetchApplications() {
      try {
        const result = await get_student_financial_aid_applications(user.user_id);
        setApplications(result);  // It's already an array!
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [user.user_id]);

  const getFilteredApplications = () => {
    if (activeFilter === 'approved') return applications.filter(a => a.status === 'approved');
    if (activeFilter === 'pending') return applications.filter(a => a.status === 'pending');
    if (activeFilter === 'rejected') return applications.filter(a => a.status === 'rejected');
    return applications;
  };

  const filteredApplications = getFilteredApplications();

  return (
    <div className="my-learning-page">
      <header className="main-page-header">
        {role === 'admin' && <AdminHeader />}
        {role === 'instructor' && <InstructorHeader />}
        {role === 'student' && <StudentHeader />}

      </header>

      <div className="learning-container">
        <div className="page-title">
          <h2>My Financial Aid Applications</h2>
          <p>Track the status of your financial aid requests</p>
        </div>

        <div className="learning-stats">
          <div className="stat-card"><div className="stat-number">{applications.length}</div><div className="stat-label">Total Applications</div></div>
          <div className="stat-card"><div className="stat-number">{applications.filter(a => a.status === 'approved').length}</div><div className="stat-label">Approved</div></div>
          <div className="stat-card"><div className="stat-number">{applications.filter(a => a.status === 'pending').length}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card"><div className="stat-number">{applications.filter(a => a.status === 'rejected').length}</div><div className="stat-label">Rejected</div></div>
        </div>

        <div className="learning-filters">
          {['all', 'approved', 'pending', 'rejected'].map(filter => (
            <button
              key={filter}
              className={`filter-button ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        <div className="learning-courses">
          {loading ? (
            <p>Loading applications...</p>
          ) : filteredApplications.length === 0 ? (
            <p>No applications match your filter.</p>
          ) : (
            filteredApplications.map(app => (
              <div className="financial-aid-card" key={`${app.courseId}-${app.applicationDate}`}>
                <div className="financial-aid-info">
                  <h3 className="financial-aid-title">{app.courseTitle}</h3>
                  <p className="financial-aid-instructor">Evaluator: {app.evaluatorName || '—'}</p>
                  <div className="financial-aid-meta">Status: {app.status.charAt(0).toUpperCase() + app.status.slice(1)}</div>
                  <div className="financial-aid-meta">Income: ${app.income.toLocaleString()}</div>
                  <div className="financial-aid-meta">Applied on: {new Date(app.applicationDate).toLocaleDateString()}</div>
                </div>
                <div className="financial-aid-actions">
                  <button
                    className="financial-aid-view-button"
                    onClick={() => navigate(`/course-details?id=${app.courseId}`)}
                  >
                    View Course
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyFinancialAidApplicationsPage;
