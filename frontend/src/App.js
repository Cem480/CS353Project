import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage/AuthPage';
import MainPage from './pages/MainPage/MainPage';
import DegreesPage from './pages/DegreesPage/DegreesPage';
import MyLearningPage from './pages/MyLearning/MyLearningPage';
import CoursePage from './pages/CoursePage/CoursePage';
import AssignmentPage from './pages/CoursePage/AssignmentPage';
import NotificationPage from './pages/NotificationPage/NotificationPage';
import CourseDetails from './pages/CourseDetails/CourseDetails';
import FinancialAid from './pages/FinancialAid/FinancialAid';
import TransactionPage from './pages/TransactionPage/TransactionPage';
import InstructorApplicationsPage from './pages/Applications/InstructorApplicationsPage';
import InstructorMainPage from './pages/InstructorsMainPage/InstructorsMainPage';
import CreateCourse from './pages/CreateCourse/CreateCourse';
import AddSection from './pages/AddSection/AddSection';
import AddSectionContent from './pages/AddSection/AddSectionContent';
import CourseEditor from './pages/AddSection/CourseEditor';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import CertificatesPage from './pages/CertificatesPage/CertificatesPage';
import AdminMainPage from './pages/AdminMainPage/AdminMainPage';
import AdminCourseApprovals from './pages/AdminCourseApprovals/AdminCourseApprovals';
import GenerateReportPage from './pages/GenerateReportPage/GenerateReportPage';
import ReportResultsPage from './pages/ReportResultsPage/ReportResultsPage';
import InstructorCourses from './pages/InstructorCourses/InstructorCourses';
import AdminReportsPage from './pages/AdminReportsPage/AdminReportsPage';
import Grading from './pages/Grading/Grading';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage/ChangePasswordPage';
import StudentFinancialAidPage from './pages/StudentFinancialAidPage/StudentFinancialAidPage'
import AdminUserListPage from './pages/AdminUserListPage/AdminUserListPage';
import { isLoggedIn, getCurrentUser } from './services/auth';

function App() {
  /* ─────────────────────────  helpers  ───────────────────────── */

  // Generic protected route
  const ProtectedRoute = ({ element }) => {
    console.log('ProtectedRoute check - isLoggedIn:', isLoggedIn());
    return isLoggedIn() ? element : <Navigate to="/login" replace />;
  };

  // Role-based protected route with better debugging
  const RoleProtectedRoute = ({ element, allowedRole }) => {
    const loggedIn = isLoggedIn();
    const userData = getCurrentUser();
    
    console.log('RoleProtectedRoute check:', {
      loggedIn,
      userData,
      allowedRole,
      userRole: userData?.role
    });
    
    if (!loggedIn) {
      console.log('Not logged in, redirecting to login');
      return <Navigate to="/login" replace />;
    }
    
    if (userData?.role !== allowedRole) {
      console.log(`Role mismatch. Required: ${allowedRole}, Got: ${userData?.role}`);
      return <Navigate to="/home" replace />;
    }
    
    return element;
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Role-aware Home */}
        <Route path="/home" element={<HomeRoute />} />

        {/* Auth-protected pages */}
        <Route path="/my-learning" element={<ProtectedRoute element={<MyLearningPage />} />} />

        {/* Course content routes */}
        <Route path="/course" element={<ProtectedRoute element={<CoursePage />} />} />
        <Route path="/course/:courseId/content" element={<ProtectedRoute element={<CoursePage />} />} />

        {/* Assignment route */}
        <Route path="/course/:courseId/section/:sectionId/assignment/:contentId"
          element={<ProtectedRoute element={<AssignmentPage />} />} />

        <Route path="/notifications" element={<ProtectedRoute element={<NotificationPage />} />} />
        <Route path="/course-details" element={<ProtectedRoute element={<CourseDetails />} />} />
        <Route path="/financial-aid" element={<ProtectedRoute element={<FinancialAid />} />} />
        <Route path="/transaction" element={<ProtectedRoute element={<TransactionPage />} />} />
        <Route path="/degrees" element={<ProtectedRoute element={<DegreesPage />} />} />

        {/* Profile and certificates */}
        <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/my-certificates" element={<ProtectedRoute element={<CertificatesPage />} />} />

        {/* NEW — Student Financial Aid page */}
        <Route path="/student/applications" element={<ProtectedRoute element={<StudentFinancialAidPage />} />} />

        {/* Instructor-only routes */}
        <Route path="/instructor/dashboard"
          element={<RoleProtectedRoute element={<InstructorMainPage />} allowedRole="instructor" />} />
        
        {/* Course creation and editing */}
        <Route path="/create-course"
          element={<RoleProtectedRoute element={<CreateCourse />} allowedRole="instructor" />} />
        <Route path="/edit-course/:courseId"
          element={<RoleProtectedRoute element={<CreateCourse />} allowedRole="instructor" />} />
        
        {/* Section management */}
        <Route path="/course/:courseId/add-section"
          element={<RoleProtectedRoute element={<AddSection />} allowedRole="instructor" />} />
        <Route path="/course/:courseId/edit-section/:sectionId"
          element={<RoleProtectedRoute element={<AddSection isEditMode={true} />} allowedRole="instructor" />} />
        
        {/* Course Editor and Content Management */}
        <Route path="/course/:courseId/content-editor"
          element={<RoleProtectedRoute element={<CourseEditor />} allowedRole="instructor" />} />
        
        {/* Content management */}
        <Route path="/course/:courseId/section/:sectionId/add-content"
          element={<RoleProtectedRoute element={<AddSectionContent />} allowedRole="instructor" />} />
        <Route path="/course/:courseId/section/:sectionId/edit-content/:contentId"
          element={<RoleProtectedRoute element={<AddSectionContent isEditMode={true} />} allowedRole="instructor" />} />
        
        {/* Content viewing */}
        <Route path="/course/:courseId/section/:sectionId/content/:contentId"
          element={<RoleProtectedRoute element={<AddSectionContent viewMode={true} />} allowedRole="instructor" />} />
        
        {/* Other instructor routes */}
        <Route path="/applications"
          element={<RoleProtectedRoute element={<InstructorApplicationsPage />} allowedRole="instructor" />} />
        <Route path="/instructor/courses"
          element={<RoleProtectedRoute element={<InstructorCourses />} allowedRole="instructor" />} />
        <Route path="/instructor/grading"
          element={<RoleProtectedRoute element={<Grading />} allowedRole="instructor" />} />

        {/* Admin-only routes */}
        <Route path="/admin/dashboard"
          element={<RoleProtectedRoute element={<AdminMainPage />} allowedRole="admin" />} />
        <Route path="/admin/course-approvals"
          element={<RoleProtectedRoute element={<AdminCourseApprovals />} allowedRole="admin" />} />
        <Route path="/admin/past-reports"
          element={<RoleProtectedRoute element={<AdminReportsPage />} allowedRole="admin" />} />
        <Route path="/admin/generate-report"
          element={<RoleProtectedRoute element={<GenerateReportPage />} allowedRole="admin" />} />
        <Route path="/admin/reports/:reportType/:reportId"
          element={<RoleProtectedRoute element={<ReportResultsPage />} allowedRole="admin" />} />
        <Route path="/admin/users"
          element={<RoleProtectedRoute element={<AdminUserListPage />} allowedRole="admin" />} />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;