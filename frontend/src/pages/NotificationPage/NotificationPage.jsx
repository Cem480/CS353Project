import React, { useState } from 'react';
import './NotificationPage.css';

const NotificationPage = () => {
  // Mockup notification data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'assignment',
      title: 'Assignment Due Soon',
      message: 'Your "Multiple Linear Regression" quiz is due in 24 hours.',
      course: 'Supervised Machine Learning',
      time: '1 hour ago',
      read: false
    },
    {
      id: 2,
      type: 'course',
      title: 'New Course Materials Available',
      message: 'Week 3 materials for "Advanced Python for Data Science" are now available.',
      course: 'Advanced Python for Data Science',
      time: '1 day ago',
      read: false
    },
    {
      id: 3,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: 'Congratulations! You\'ve completed your first course assessment with a score of 95%.',
      course: 'Introduction to JavaScript Programming',
      time: '2 days ago',
      read: true
    },
    {
      id: 4,
      type: 'reminder',
      title: 'Weekly Goal Reminder',
      message: 'You\'re 2 days away from completing your weekly learning goal. Keep it up!',
      course: null,
      time: '3 days ago',
      read: true
    },
    {
      id: 5,
      type: 'announcement',
      title: 'Platform Update',
      message: 'LearnHub has added new features to the Lab Sandbox environment.',
      course: null,
      time: '5 days ago',
      read: true
    },
    {
      id: 6,
      type: 'course',
      title: 'Instructor Feedback',
      message: 'Your instructor has provided feedback on your recent project submission.',
      course: 'UX/UI Design Fundamentals',
      time: '1 week ago',
      read: true
    }
  ]);

  // State for filter tabs
  const [activeFilter, setActiveFilter] = useState('all');

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(
      notifications.map((note) => 
        note.id === id ? { ...note, read: true } : note
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(
      notifications.map((note) => ({ ...note, read: true }))
    );
  };

  // Get filtered notifications
  const getFilteredNotifications = () => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter(note => !note.read);
    return notifications;
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'assignment':
        return '📝';
      case 'course':
        return '📚';
      case 'achievement':
        return '🏆';
      case 'reminder':
        return '⏰';
      case 'announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  // Count unread notifications
  const unreadCount = notifications.filter(note => !note.read).length;

  // Get filtered notifications
  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="notification-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link">Home</a>
            <a href="#" className="nav-link">My Learning</a>
            <a href="#" className="nav-link">Explore</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search courses..." />
            <button className="search-button">Search</button>
          </div>
          <div className="notification-button active">
            <span className="notification-icon">🔔</span>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </div>
          <div className="profile-icon">JS</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="notification-container">
        <div className="notification-header">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <button className="mark-all-read" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="notification-filters">
          <button 
            className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-button ${activeFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <h3>No notifications</h3>
              <p>You're all caught up! We'll notify you when there's something new.</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title">
                    {notification.title}
                    {!notification.read && <span className="unread-indicator"></span>}
                  </div>
                  <div className="notification-message">{notification.message}</div>
                  {notification.course && (
                    <div className="notification-course">{notification.course}</div>
                  )}
                  <div className="notification-time">{notification.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;