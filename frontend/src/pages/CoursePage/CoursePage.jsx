import React, { useState } from 'react';
import './CoursePage.css';

const CoursePage = () => {
  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    'week2': true,
    'multiple-linear-regression': true,
    'practice-quiz': false,
    'gradient-descent': false
  });

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Generate calendar cells
  const renderCalendar = () => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return days.map((day, index) => (
      <div key={index} className="calendar-cell">{day}</div>
    ));
  };

  return (
    <div className="course-page">
      {/* Header */}
      <header className="course-header">
        <div className="logo">
          <span className="logo-text">LearnHub</span>
        </div>
        <div className="search-container">
          <input type="text" placeholder="Search in course" className="search-input" />
          <button className="search-button">Search</button>
        </div>
        <div className="header-right">
          <div className="language-selector">
            <span>English</span>
            <span className="dropdown-arrow">▼</span>
          </div>
          <div className="notifications-icon">🔔</div>
          <div className="profile-icon">JS</div>
        </div>
      </header>

      <div className="course-container">
        {/* Left Sidebar */}
        <aside className="course-sidebar">
          <div className="course-title">
            <h2>Supervised Machine Learning: Regression and Classification</h2>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header collapsible">
              <span className="dropdown-icon">▼</span>
              <span>Course Material</span>
            </div>
            <div className="sidebar-section-content">
              <div className="sidebar-item completed">
                <span className="check-icon">✓</span>
                <span>Week 1</span>
              </div>
              <div className="sidebar-item active">
                <span className="bullet-icon">●</span>
                <span>Week 2</span>
              </div>
              <div className="sidebar-item">
                <span className="bullet-icon">○</span>
                <span>Week 3</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Grades</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Notes</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Messages</span>
              <span className="badge">1</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Course Info</span>
            </div>
          </div>
        </aside>

        {/* Main Course Content */}
        <main className="course-content">
          <div className="content-section">
            <div 
              className="section-header" 
              onClick={() => toggleSection('week2')}
            >
              <span className={`dropdown-icon ${expandedSections['week2'] ? 'expanded' : ''}`}>▼</span>
              <span className="section-title">Week 2: Regression with multiple input variables</span>
            </div>
            
            {expandedSections['week2'] && (
              <div className="section-content">
                <div className="time-remaining">
                  <span className="icon">🕒</span>
                  <span>1h 6m of videos left</span>
                </div>
                <div className="assessments-remaining">
                  <span className="icon">📝</span>
                  <span>3 graded assessments left</span>
                </div>

                <div className="week-description">
                  <p>
                    This week, you'll extend linear regression to handle multiple input features. You'll also learn some methods for improving
                    your model's training and performance, such as vectorization, feature scaling, feature engineering and polynomial
                    regression. At the end of the week, you'll get to practice implementing linear regression in code.
                  </p>
                </div>
                
                <div className="learning-objectives-toggle">
                  <span className="dropdown-icon">▼</span>
                  <span>Show Learning Objectives</span>
                </div>

                <div 
                  className="subsection-header" 
                  onClick={() => toggleSection('multiple-linear-regression')}
                >
                  <span className={`dropdown-icon ${expandedSections['multiple-linear-regression'] ? 'expanded' : ''}`}>▼</span>
                  <span>Multiple linear regression</span>
                </div>

                {expandedSections['multiple-linear-regression'] && (
                  <div className="subsection-content">
                    <div className="course-item video-item">
                      <div className="item-icon">📹</div>
                      <div className="item-details">
                        <div className="item-title">Multiple features</div>
                        <div className="item-meta">Video • 9 min</div>
                      </div>
                      <button className="resume-button">Resume</button>
                    </div>

                    <div className="course-item video-item">
                      <div className="item-icon">📹</div>
                      <div className="item-details">
                        <div className="item-title">Vectorization part 1</div>
                        <div className="item-meta">Video • 6 min</div>
                      </div>
                    </div>

                    <div className="course-item video-item">
                      <div className="item-icon">📹</div>
                      <div className="item-details">
                        <div className="item-title">Vectorization part 2</div>
                        <div className="item-meta">Video • 6 min</div>
                      </div>
                    </div>

                    <div className="course-item lab-item">
                      <div className="item-icon">💻</div>
                      <div className="item-details">
                        <div className="item-title">Optional lab: Python, NumPy and vectorization</div>
                        <div className="item-meta">Lab • 1h</div>
                      </div>
                    </div>

                    <div className="course-item video-item">
                      <div className="item-icon">📹</div>
                      <div className="item-details">
                        <div className="item-title">Gradient descent for multiple linear regression</div>
                        <div className="item-meta">Video • 7 min</div>
                      </div>
                    </div>

                    <div className="course-item lab-item">
                      <div className="item-icon">💻</div>
                      <div className="item-details">
                        <div className="item-title">Optional Lab: Multiple linear regression</div>
                        <div className="item-meta">Lab • 1h</div>
                      </div>
                    </div>
                  </div>
                )}

                <div 
                  className="subsection-header" 
                  onClick={() => toggleSection('practice-quiz')}
                >
                  <span className={`dropdown-icon ${expandedSections['practice-quiz'] ? 'expanded' : ''}`}>▼</span>
                  <span>Practice quiz: Multiple linear regression</span>
                  <span className="overdue-badge">1 Overdue</span>
                </div>

                {expandedSections['practice-quiz'] && (
                  <div className="subsection-content">
                    <div className="course-item quiz-item">
                      <div className="item-icon">📋</div>
                      <div className="item-details">
                        <div className="item-title">Practice quiz: Multiple linear regression</div>
                        <div className="item-meta overdue">Overdue: Graded Assignment • 15 min</div>
                      </div>
                    </div>
                  </div>
                )}

                <div 
                  className="subsection-header" 
                  onClick={() => toggleSection('gradient-descent')}
                >
                  <span className={`dropdown-icon ${expandedSections['gradient-descent'] ? 'expanded' : ''}`}>▼</span>
                  <span>Gradient descent in practice</span>
                </div>

                {expandedSections['gradient-descent'] && (
                  <div className="subsection-content">
                    <div className="course-item video-item">
                      <div className="item-icon">📹</div>
                      <div className="item-details">
                        <div className="item-title">Feature scaling part 1</div>
                        <div className="item-meta">Video • 8 min</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="course-progress-sidebar">
          <div className="progress-section">
            <h3>Weekly goal progress tracker</h3>
            <p className="commitment-text">I'm committed to learning 5 days a week on LearnHub.</p>
            
            <div className="calendar-grid">
              {renderCalendar()}
            </div>

            <button className="edit-goal-button">Edit my goal</button>
          </div>

          <div className="timeline-section">
            <h3>Course timeline</h3>
            <div className="timeline-item">
              <div className="timeline-icon">🗓️</div>
              <div className="timeline-content">
                <div className="timeline-date">Start date: November 7, 2024</div>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-text">Your next two deadlines</div>
            </div>

            <div className="timeline-item">
              <div className="timeline-content">
                <div className="timeline-link">Practice quiz: Multiple linear regression</div>
                <div className="timeline-status overdue">Overdue</div>
                <div className="timeline-meta">Graded Assignment</div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-content">
                <div className="timeline-link">Practice quiz: Gradient descent in practice</div>
                <div className="timeline-status overdue">Overdue</div>
                <div className="timeline-meta">Graded Assignment</div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-icon">📆</div>
              <div className="timeline-content">
                <div className="timeline-date">Estimated end date: March 23, 2025</div>
              </div>
            </div>
          </div>

          <div className="lab-sandbox-section">
                          <div className="lab-sandbox-header">
              <div className="lab-icon">🧪</div>
              <div className="lab-title">LearnHub Lab Sandbox</div>
              <div className="beta-badge">BETA</div>
            </div>

            <ul className="lab-features">
              <li>Easily launch LearnHub's preconfigured environment for programming</li>
              <li>Get access to all development dependencies (libraries and packages)—no local software installation required</li>
              <li>Practice programming, run test cases, and work on assignments from your browser</li>
            </ul>

            <button className="open-lab-button">Open Lab Sandbox</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoursePage;