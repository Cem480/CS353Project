import React from 'react';
import AdminNavbar from '../../components/AdminHeader';
import { getCurrentUser } from '../../services/auth';
import './AdminMainPage.css';

const AdminMainPage = () => {
  const userData = getCurrentUser();
  const firstName = userData?.first_name ?? 'Admin';

  return (
    <div className="admin-main-page">
      <AdminNavbar />
      <main className="main-content">
        <h2>Welcome, {firstName}!</h2>
      </main>
    </div>
  );
};

export default AdminMainPage;
