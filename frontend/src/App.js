import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import MainPage from './pages/MainPage';
import DegreesPage from './pages/DegreesPage/DegreesPage';
import MyLearningPage from './pages/MyLearning/MyLearningPage';
import CoursePage from './pages/CoursePage/CoursePage';
import NotificationPage from './pages/NotificationPage/NotificationPage';

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
          <Route path="/degrees" element={<DegreesPage />} />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;