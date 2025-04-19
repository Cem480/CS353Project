import React, { useState } from 'react';
import './CoursePage.css';

const CoursePage = () => {

  const courseData = {
    title: "Supervised Machine Learning: Regression and Classification",
    startDate: "November 7, 2024",
    estimatedEndDate: "March 23, 2025",
    timeRemaining: "1h 6m",
    assessmentsRemaining: 3,
    weekDescription: "This week, you'll extend linear regression to handle multiple input features. You'll also learn some methods for improving your model's training and performance, such as vectorization, feature scaling, feature engineering and polynomial regression. At the end of the week, you'll get to practice implementing linear regression in code.",
    userCommitment: "I'm committed to learning 5 days a week on LearnHub."
  };

  const sidebarSections = [
    { 
      title: "Course Material", 
      isCollapsible: true,
      items: [
        { title: "Section 1", status: "completed" },
        { title: "Section 2", status: "active" },
        { title: "Section 3", status: "pending" },
      ]
    },
    { title: "Grades", isCollapsible: false, items: [] },
    { title: "Course Info", isCollapsible: false, items: [] },
  ];

  const timelineItems = [
    { type: "date", icon: "🗓️", content: `Start date: ${courseData.startDate}` },
    { type: "text", content: "Your next two deadlines" },
    { 
      type: "assignment", 
      content: "Practice quiz: Multiple linear regression",
      status: "overdue",
      meta: "Graded Assignment"
    },
    { 
      type: "assignment", 
      content: "Practice quiz: Gradient descent in practice",
      status: "overdue",
      meta: "Graded Assignment"
    },
    { type: "date", icon: "📆", content: `Estimated end date: ${courseData.estimatedEndDate}` },
  ];

  // Course sections data
  const [courseSections, setCourseSections] = useState([
    {
      id: 'week2',
      title: 'Week 2: Regression with multiple input variables',
      subsections: [
        {
          id: 'multiple-linear-regression',
          title: 'Multiple linear regression',
          items: [
            { 
              id: 'video1',
              type: 'video', 
              title: 'Multiple features', 
              duration: '9 min',
              status: 'in-progress',
              videoUrl: 'https://example.com/video1',
              comments: [
                { 
                  user: 'Alex P.', 
                  text: 'Great explanation of feature scaling! It really helped me understand why normalization is important.',
                  timestamp: '17/03/2025',
                  likes: 5
                },
                { 
                  user: 'Maria J.', 
                  text: 'I\'m still confused about when to use standardization vs min-max scaling. Could someone explain the difference?',
                  timestamp: '1 day ago',
                  likes: 2
                }
              ]
            },
            { 
              id: 'video2',
              type: 'video', 
              title: 'Vectorization part 1', 
              duration: '6 min',
              videoUrl: 'https://example.com/video2',
              comments: [
                { 
                  user: 'Taylor K.', 
                  text: 'This made vectorization so much clearer for me! I finally understand how it speeds up computation.',
                  timestamp: '17/03/2025',
                  likes: 7
                }
              ]
            },
            { 
              id: 'video3',
              type: 'video', 
              title: 'Vectorization part 2', 
              duration: '6 min',
              videoUrl: 'https://example.com/video3',
              comments: []
            },
            { 
              id: 'lab1',
              type: 'lab', 
              title: 'Optional lab: Python, NumPy and vectorization', 
              duration: '1h',
              comments: []
            },
            { 
              id: 'video4',
              type: 'video', 
              title: 'Gradient descent for multiple linear regression', 
              duration: '7 min',
              videoUrl: 'https://example.com/video4',
              comments: [
                { 
                  user: 'Sam R.', 
                  text: 'The visualization of gradient descent really helped me understand how it works!',
                  timestamp: '17/03/2025',
                  likes: 3
                }
              ]
            },
            { 
              id: 'lab2',
              type: 'lab', 
              title: 'Optional Lab: Multiple linear regression', 
              duration: '1h',
              comments: []
            },
          ]
        },
        {
          id: 'practice-quiz',
          title: 'Practice quiz: Multiple linear regression',
          hasOverdue: true,
          items: [
            { 
              id: 'quiz1',
              type: 'quiz', 
              title: 'Practice quiz: Multiple linear regression', 
              duration: '15 min',
              status: 'overdue',
              comments: []
            },
          ]
        },
        {
          id: 'gradient-descent',
          title: 'Gradient descent in practice',
          items: [
            { 
              id: 'video5',
              type: 'video', 
              title: 'Feature scaling part 1', 
              duration: '8 min',
              videoUrl: 'https://example.com/video5',
              comments: []
            },
          ]
        }
      ]
    }
  ]  );

  const labFeatures = [
    "Easily launch LearnHub's preconfigured environment for programming",
    "Get access to all development dependencies (libraries and packages)—no local software installation required",
    "Practice programming, run test cases, and work on assignments from your browser"
  ];

  const calendarDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const [expandedSections, setExpandedSections] = useState({
    'week2': true,
    'multiple-linear-regression': true,
    'practice-quiz': false,
    'gradient-descent': false
  });

  const [openedVideo, setOpenedVideo] = useState(null);

  const [newComment, setNewComment] = useState('');

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const openVideo = (video) => {
    setOpenedVideo(video);
  };

  const closeVideo = () => {
    setOpenedVideo(null);
  };

  const handleAddComment = (event) => {
    event.preventDefault();
    
    if (newComment.trim() === '' || !openedVideo) return;

    const updatedSections = courseSections.map(section => {
      const updatedSubsections = section.subsections.map(subsection => {
        const updatedItems = subsection.items.map(item => {
          if (item.id === openedVideo.id) {
            return {
              ...item,
              comments: [
                {
                  user: 'You',
                  text: newComment,
                  timestamp: 'Just now',
                  likes: 0
                },
                ...(item.comments || [])
              ]
            };
          }
          return item;
        });
        return {...subsection, items: updatedItems};
      });
      return {...section, subsections: updatedSubsections};
    });

    setCourseSections(updatedSections);

    setOpenedVideo({
      ...openedVideo,
      comments: [
        {
          user: 'You',
          text: newComment,
          timestamp: 'Just now',
          likes: 0
        },
        ...(openedVideo.comments || [])
      ]
    });

    setNewComment('');
  };

  const renderCalendar = () => {
    return calendarDays.map((day, index) => (
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
          <button className="search-button1">Search</button>
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
            <h2>{courseData.title}</h2>
          </div>
  
          {sidebarSections.map((section, index) => (
            <div key={index} className="sidebar-section">
              <div className={`sidebar-section-header ${section.isCollapsible ? 'collapsible' : ''}`}>
                {section.isCollapsible && <span className="dropdown-icon">▼</span>}
                <span>{section.title}</span>
              </div>
              {section.items.length > 0 && (
                <div className="sidebar-section-content">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className={`sidebar-item ${item.status}`}>
                      <span className={item.status === 'completed' ? 'check-icon' : 'bullet-icon'}>
                        {item.status === 'completed' ? '✓' : item.status === 'active' ? '●' : '○'}
                      </span>
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>
  
        {/* Main Course Content */}
        <main className="course-content">
          {/* Video player modal when a video is opened */}
          {openedVideo && (
            <div className="video-modal">
              <div className="video-modal-content">
                <div className="video-modal-header">
                  <h3>{openedVideo.title}</h3>
                  <button className="close-button" onClick={closeVideo}>×</button>
                </div>
                <div className="video-container">
                  <div className="video-placeholder">
                    <div className="video-placeholder-icon">▶️</div>
                    <div className="video-placeholder-text">Video Player: {openedVideo.title}</div>
                    
                  </div>
                  <button className="comment-submit">Mark As Completed</button>
                </div>
                <div className="comments-section">
                  
                  <h4>Comments ({openedVideo.comments ? openedVideo.comments.length : 0})</h4>
                  
                  <form className="comment-form" onSubmit={handleAddComment}>
                    <textarea 
                      className="comment-input" 
                      placeholder="Add a comment..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    ></textarea>
                    <button className="comment-submit" type="submit">Post</button>
                  </form>
                  
                  <div className="comments-list">
                    {openedVideo.comments && openedVideo.comments.map((comment, index) => (
                      <div key={index} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-user">{comment.user}</span>
                          <span className="comment-timestamp">{comment.timestamp}</span>
                          
                        </div>
                        <div className="comment-text">{comment.text}</div>
                        <div className="comment-actions">
                          
                        </div>
                      </div>
                    ))}
                    
                    {(!openedVideo.comments || openedVideo.comments.length === 0) && (
                      <div className="no-comments">No comments yet. Be the first to comment!</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
  
          {courseSections.map((section) => (
            <div key={section.id} className="content-section">
              <div 
                className="section-header" 
                onClick={() => toggleSection(section.id)}
              >
                <span className={`dropdown-icon ${expandedSections[section.id] ? 'expanded' : ''}`}>▼</span>
                <span className="section-title">{section.title}</span>
              </div>
              
              {expandedSections[section.id] && (
                <div className="section-content">
                  <div className="time-remaining">
                    <span className="icon">🕒</span>
                    <span>{courseData.timeRemaining} of videos left</span>
                  </div>
                  <div className="assessments-remaining">
                    <span className="icon">📝</span>
                    <span>{courseData.assessmentsRemaining} graded assessments left</span>
                  </div>
  
                  <div className="week-description">
                    <p>{courseData.weekDescription}</p>
                  </div>
                  
                  <div className="learning-objectives-toggle">
                    <span className="dropdown-icon">▼</span>
                    <span>Show Learning Objectives</span>
                  </div>
  
                  {section.subsections.map((subsection) => (
                    <div key={subsection.id}>
                      <div 
                        className="subsection-header" 
                        onClick={() => toggleSection(subsection.id)}
                      >
                        <span className={`dropdown-icon ${expandedSections[subsection.id] ? 'expanded' : ''}`}>▼</span>
                        <span>{subsection.title}</span>
                        {subsection.hasOverdue && <span className="overdue-badge">1 Overdue</span>}
                      </div>
  
                      {expandedSections[subsection.id] && (
                        <div className="subsection-content">
                          {subsection.items.map((item) => (
                            <div key={item.id} className="course-item video-item">
                              <div className="item-icon">{item.type === 'video' ? '📹' : item.type === 'lab' ? '💻' : '📋'}</div>
                              <div className="item-details">
                                <div className="item-title">{item.title}</div>
                                <div className={`item-meta ${item.status === 'overdue' ? 'overdue' : ''}`}>
                                  {item.status === 'overdue' ? 'Overdue: ' : ''}
                                  {item.type === 'video' ? 'Video' : item.type === 'lab' ? 'Lab' : 'Graded Assignment'} • {item.duration}
                                </div>
                              </div>
                              {item.type === 'video' && (
                                <button 
                                  className="view-video-button" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openVideo(item);
                                  }}
                                >
                                  {item.status === 'in-progress' ? 'Resume' : 'Watch'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </main>
  
        {/* Right Sidebar */}
        <aside className="course-progress-sidebar">
          
  
          <div className="lab-sandbox-section">
            <div className="lab-sandbox-header">
              <div className="lab-icon">🧪</div>
              <div className="lab-title">LearnHub Lab Sandbox</div>
              <div className="beta-badge">BETA</div>
            </div>
  
            <ul className="lab-features">
              {labFeatures.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
  
            <button className="open-lab-button">Open Lab Sandbox</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoursePage;