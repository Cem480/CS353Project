import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import './CertificatesPage.css';

import StudentHeader from '../../components/StudentHeader';
import { getStudentCertificates, deleteCertificate } from '../../services/certificates';

const CertificatesPage = () => {
  const [certificates, setCertificates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const data = await getStudentCertificates();
      setCertificates(data.certificates || []);
    } catch (err) {
      console.error('Failed to fetch certificates', err);
    }
  };

  const handleDelete = async (certificateId) => {
    if (!window.confirm('Are you sure you want to delete this certificate?')) return;

    try {
      const result = await deleteCertificate(certificateId);
      if (result.success) {
        alert('Certificate deleted successfully.');
        fetchCertificates();
      } else {
        alert(`Failed to delete certificate: ${result.message}`);
      }
    } catch (err) {
      alert(`Error deleting certificate: ${err.message}`);
    }
  };

  const generateCertificateHTML = (cert) => `
    <div style="
      width: 100%;
      height: 100%;
      padding: 60px;
      border: 20px solid #2e7d32;
      font-family: 'Garamond', 'Times New Roman', serif;
      text-align: center;
    ">
      <div style="font-size: 60px; color: #2e7d32;">🎓</div>
      <h1 style="color: #2e7d32;">Certificate of Completion</h1>
      <p>This is to certify that</p>
      <h2>${cert.student_name}</h2>
      <p>has successfully completed the course</p>
      <h3>"${cert.course_title}"</h3>
      <p>on <strong>${cert.certification_date}</strong></p>
      <p style="margin-top: 60px;">LearnHub • www.learnhub.edu</p>
    </div>
  `;

  const downloadPDF = (cert) => {
    const html = generateCertificateHTML(cert);
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.width = '796.8px';
    container.style.height = '556px';

    document.body.appendChild(container);

    html2pdf()
      .from(container)
      .set({
        margin: 0,
        filename: `${cert.student_name}_${cert.course_title}_certificate.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: [5.8, 8.3], orientation: 'landscape' }
      })
      .save()
      .then(() => document.body.removeChild(container));
  };

  return (
    <div className="my-learning-page">
      <StudentHeader />

      <div className="certificates-page centered-layout">
        <div className="certificates-header">
          <h2 className="cert-title-main">My Certificates</h2>
          <p className="cert-subtitle">View and manage the certificates you've earned!</p>
          <div className="cert-count-card">
            You have earned <strong>{certificates.length}</strong> certificate{certificates.length !== 1 ? "s" : ""}.
          </div>
        </div>

        <div className="certificate-list">
          {certificates.map(cert => (
            <div key={cert.certificate_id} className="certificate-card-vertical">
              <h3 className="cert-title">
                Certificate of Completion: <strong>{cert.course_title}</strong>
              </h3>
              <p>
                This is to certify that <strong>{cert.student_name}</strong> has successfully completed the online course
                <strong> "{cert.course_title}"</strong> on <strong>{cert.certification_date}</strong>.
              </p>
              <div className="cert-footer">
                <button className="outline-button" onClick={() => downloadPDF(cert)}>Download</button>
                <button className="delete-button" onClick={() => handleDelete(cert.certificate_id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CertificatesPage;
