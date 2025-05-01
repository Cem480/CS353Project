import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './CertificatesPage.css';

const CertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5001/api/certificate/list', {
      credentials: 'include'
    })
      .then((res) => res.json())
      .then((data) => setCertificates(data.certificates || []))
      .catch((err) => console.error('Failed to fetch certificates', err));
  }, []);

  return (
    <div className="my-learning-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <Link to="/home">Home</Link>
            <Link to="/degrees">Online Degrees</Link>
            <Link to="/my-learning">My Learning</Link>
            <Link to="/my-certificates" className="active">My Certificates</Link>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search my certificates..." />
            <button className="search-button1">Search</button>
          </div>
          <div className="profile-icon">JS</div>
        </div>
      </header>

        {/* Main Content */}
        <div className="certificates-page centered-layout">
            <div className="certificates-header">
                <h2 className="cert-title-main">My Certificates</h2>
                <p className="cert-subtitle">View and manage the certificates you've earned!</p>
                <div className="cert-count-card">
                You have earned <strong>{certificates.length}</strong> certificate{certificates.length !== 1 ? "s" : ""}.
                </div>
            </div>

            <div className="certificate-list">
                {certificates.map((cert) => (
                <div key={cert.certificate_id} className="certificate-card-vertical">
                    <h3 className="cert-title">
                    Certificate of Completion: <strong>{cert.course_title}</strong>
                    </h3>
                    <p>
                    This is to certify that <strong>{cert.studentName}</strong> has successfully completed the online course
                    <strong> "{cert.course_title}"</strong> on <strong>{cert.certification_date}</strong>.
                    Congratulations on your achievement!
                    </p>
                    <div className="cert-footer">
                    <button className="outline-button">Download</button>
                    </div>
                </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default CertificatesPage;
