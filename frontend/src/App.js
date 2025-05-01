import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage/AuthPage';
import MainPage from './pages/MainPage/MainPage';
import DegreesPage from './pages/DegreesPage/DegreesPage';
import MyLearningPage from './pages/MyLearning/MyLearningPage';
import CoursePage from './pages/CoursePage/CoursePage';
import NotificationPage from './pages/NotificationPage/NotificationPage';
import CourseDetails from './pages/CourseDetails/CourseDetails';
import FinancialAid from './pages/FinancialAid/FinancialAid';
import TransactionPage from './pages/TransactionPage/TransactionPage';
import InstructorApplicationsPage from './pages/Applications/InstructorApplicationsPage';
import InstructorMainPage from './pages/InstructorsMainPage/InstructorsMainPage';
import CreateCourse from './pages/CreateCourse/CreateCourse';
import AddSection from './pages/AddSection/AddSection';
import ProfilePage from './pages/ProfilePage/ProfilePage';      // ⬅️ NEW
import CertificatesPage from './pages/CertificatesPage/CertificatesPage'; // ⬅️ NEW

import { isLoggedIn, getCurrentUser } from './services/auth';

function App() {
  /* ─────────────────────────  helpers  ───────────────────────── */

  // Generic protected route
  const ProtectedRoute = ({ element }) =>
    isLoggedIn() ? element : <Navigate to="/login" replace />;

  // Role-based protected route
  const RoleProtectedRoute = ({ element, allowedRole }) => {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    const userData = getCurrentUser();
    return userData?.role === allowedRole
      ? element
      : <Navigate to="/home" replace />;
  };

  // Dynamic home (redirects by role)
  const HomeRoute = () => {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    const userData = getCurrentUser();
    return userData?.role === 'instructor'
      ? <InstructorMainPage />
      : <MainPage />;
  };

  /* ─────────────────────────  routes  ───────────────────────── */

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<AuthPage />} />

        {/* Role-aware Home */}
        <Route path="/home" element={<HomeRoute />} />

        {/* Auth-protected pages */}
        <Route path="/my-learning" element={<ProtectedRoute element={<MyLearningPage />} />} />
        <Route path="/course" element={<ProtectedRoute element={<CoursePage />} />} />
        <Route path="/notifications" element={<ProtectedRoute element={<NotificationPage />} />} />
        <Route path="/course-details" element={<ProtectedRoute element={<CourseDetails />} />} />
        <Route path="/financial-aid" element={<ProtectedRoute element={<FinancialAid />} />} />
        <Route path="/transaction" element={<ProtectedRoute element={<TransactionPage />} />} />
        <Route path="/degrees" element={<ProtectedRoute element={<DegreesPage />} />} />

        {/* NEW — profile page (all logged-in users) */}
        <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />

        {/* NEW — certificates page */}
        <Route path="/my-certificates" element={<ProtectedRoute element={<CertificatesPage />} />} />


        {/* Instructor-only */}
        <Route path="/instructor/dashboard"
          element={<RoleProtectedRoute element={<InstructorMainPage />} allowedRole="instructor" />} />
        <Route path="/create-course"
          element={<RoleProtectedRoute element={<CreateCourse />} allowedRole="instructor" />} />
        <Route path="/course/:courseId/add-section"
          element={<RoleProtectedRoute element={<AddSection />} allowedRole="instructor" />} />
        <Route path="/applications"
          element={<RoleProtectedRoute element={<InstructorApplicationsPage />} allowedRole="instructor" />} />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
