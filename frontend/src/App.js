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
import { isLoggedIn, getCurrentUser } from './services/auth';

function App() {
  // Simple Protected Route component
  const ProtectedRoute = ({ element }) => {
    return isLoggedIn() ? element : <Navigate to="/login" />;
  };
  
  // Role-based Protected Route component
  const RoleProtectedRoute = ({ element, allowedRole }) => {
    if (!isLoggedIn()) {
      return <Navigate to="/login" />;
    }
    
    const userData = getCurrentUser();
    if (userData && userData.role === allowedRole) {
      return element;
    }
    
    return <Navigate to="/home" />;
  };
  
  // HomeRoute that changes based on user role
  const HomeRoute = () => {
    if (!isLoggedIn()) {
      return <Navigate to="/login" />;
    }
    
    const userData = getCurrentUser();
    if (userData && userData.role === 'instructor') {
      return <InstructorMainPage />;
    }
    
    return <MainPage />;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={<AuthPage />} 
          />
          
          {/* Home route - redirects based on role */}
          <Route path="/home" element={<HomeRoute />} />
          
          {/* Protected routes */}
          <Route path="/my-learning" element={<ProtectedRoute element={<MyLearningPage />} />} />
          <Route path="/course" element={<ProtectedRoute element={<CoursePage />} />} />
          <Route path="/notifications" element={<ProtectedRoute element={<NotificationPage />} />} />
          <Route path="/course-details" element={<ProtectedRoute element={<CourseDetails />} />} />
          <Route path="/financial-aid" element={<ProtectedRoute element={<FinancialAid />} />} />
          <Route path="/transaction" element={<ProtectedRoute element={<TransactionPage />} />} />
          <Route path="/degrees" element={<ProtectedRoute element={<DegreesPage />} />} />
          
          {/* Instructor specific routes */}
          <Route 
            path="/instructor/dashboard" 
            element={<RoleProtectedRoute element={<InstructorMainPage />} allowedRole="instructor" />} 
          />
          <Route 
            path="/create-course" 
            element={<RoleProtectedRoute element={<CreateCourse />} allowedRole="instructor" />} 
          />
          <Route 
            path="/course/:courseId/add-section" 
            element={<RoleProtectedRoute element={<AddSection />} allowedRole="instructor" />} 
          />
          <Route 
            path="/applications" 
            element={<RoleProtectedRoute element={<InstructorApplicationsPage />} allowedRole="instructor" />} 
          />
          
          {/* Default routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;