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
import { isLoggedIn } from './services/auth';

function App() {
  // Simple Protected Route component
  const ProtectedRoute = ({ element }) => {
    return isLoggedIn() ? element : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={isLoggedIn() ? <Navigate to="/home" /> : <AuthPage />} 
          />
          
          {/* Protected routes */}
          <Route path="/home" element={<ProtectedRoute element={<MainPage />} />} />
          <Route path="/my-learning" element={<ProtectedRoute element={<MyLearningPage />} />} />
          <Route path="/course" element={<ProtectedRoute element={<CoursePage />} />} />
          <Route path="/notifications" element={<ProtectedRoute element={<NotificationPage />} />} />
          <Route path="/course-details" element={<ProtectedRoute element={<CourseDetails />} />} />
          <Route path="/financial-aid" element={<ProtectedRoute element={<FinancialAid />} />} />
          <Route path="/transaction" element={<ProtectedRoute element={<TransactionPage />} />} />
          <Route path="/degrees" element={<ProtectedRoute element={<DegreesPage />} />} />
          <Route path="/applications" element={<ProtectedRoute element={<InstructorApplicationsPage />} />} />
          
          {/* Default routes */}
          <Route path="/" element={isLoggedIn() ? <Navigate to="/home" /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;