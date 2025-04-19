import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
<<<<<<< Updated upstream
import AuthPage from './pages/AuthPage/AuthPage';
=======
import AuthPage from './pages/AuthPage';
>>>>>>> Stashed changes
import MainPage from './pages/MainPage/MainPage';
import DegreesPage from './pages/DegreesPage/DegreesPage';
import MyLearningPage from './pages/MyLearning/MyLearningPage';
import CoursePage from './pages/CoursePage/CoursePage';
import NotificationPage from './pages/NotificationPage/NotificationPage';
import CourseDetails from './pages/CourseDetails/CourseDetails';
import FinancialAid from './pages/FinancialAid/FinancialAid';
import TransactionPage from './pages/TransactionPage/TransactionPage';
import InstructorApplicationsPage from './pages/Applications/InstructorApplicationsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/home" element={<MainPage />} />
          <Route path="/my-learning" element={<MyLearningPage />} />
          <Route path="/course" element={<CoursePage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/course-details" element={<CourseDetails />} />
          <Route path="/FinancialAid" element={<FinancialAid />} />
          <Route path="/Transaction" element={<TransactionPage />} />
          <Route path="/degrees" element={<DegreesPage />} />
<<<<<<< Updated upstream
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
=======
          <Route path="/applicaitons" element={<InstructorApplicationsPage />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="*" element={<Navigate to="/home" />} />
>>>>>>> Stashed changes
        </Routes>
      </div>
    </Router>
  );
}

export default App;