import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NotificationPage.css';
import * as notificationService from '../../services/notification';
import { formatDistanceToNow } from 'date-fns';

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // State for filter tabs
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Get the current user ID from localStorage
  const getUserId = () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const { user_id } = JSON.parse(userData);
      return user_id;
    }
    return null;
  };
  
  const userId = getUserId();
  
  // Fetch notifications on component mount and when filter changes
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) {
        setError('User not logged in');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Only pass status if it's not 'all'
        const statusParam = activeFilter !== 'all' ? activeFilter : null;
        const response = await notificationService.getUserNotifications(userId, statusParam);
        
        if (response.success) {
          // Transform backend data to match our component's expected format
          const transformedNotifications = response.notifications.map(note => ({
            id: note.notification_id,
            type: note.type,
            title: getTitleFromType(note.type),
            message: note.message,
            course: note.entity_type === 'course' ? note.entity_id : null,
            time: formatTimeAgo(note.timestamp),
            read: note.status !== 'unread',
            status: note.status
          }));
          
          setNotifications(transformedNotifications);
          
          // Update the notification count in local storage for comparison
          const unreadCount = transformedNotifications.filter(note => !note.read).length;
          notificationService.acknowledgeNotifications(unreadCount);
        } else {
          setError(response.message || 'Failed to fetch notifications');
        }
      } catch (err) {
        setError('Error fetching notifications. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [userId, activeFilter]);
  
  // Helper function to generate title based on notification type
  const getTitleFromType = (type) => {
    switch(type) {
      case 'assignment':
        return 'Assignment Due Soon';
      case 'course':
        return 'Course Update';
      case 'achievement':
        return 'Achievement Unlocked!';
      case 'reminder':
        return 'Reminder';
      case 'announcement':
        return 'Announcement';
      case 'system':
        return 'System Notification';
      default:
        return 'Notification';
    }
  };
  
  // Format timestamp to relative time
  const formatTimeAgo = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'some time ago';
    }
  };
  
  // Mark notification as read
  const markAsRead = async (id) => {
    if (!userId) return;
    
    try {
      const response = await notificationService.markNotificationAsRead(id, userId);
      
      if (response.success) {
        setNotifications(
          notifications.map((note) => 
            note.id === id ? { ...note, read: true, status: 'read' } : note
          )
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  // Mark all as read
  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const response = await notificationService.markAllNotificationsAsRead(userId);
      
      if (response.success) {
        setNotifications(
          notifications.map((note) => ({ ...note, read: true, status: 'read' }))
        );
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Archive notification
  const archiveNotification = async (id, event) => {
    event.stopPropagation(); // Prevent triggering the parent click (markAsRead)
    if (!userId) return;
    
    try {
      const response = await notificationService.archiveNotification(id, userId);
      
      if (response.success) {
        // Remove the notification from the list if we're not viewing archived
        if (activeFilter !== 'archived') {
          setNotifications(notifications.filter(note => note.id !== id));
        } else {
          // Or update its status if we're viewing archived
          setNotifications(
            notifications.map((note) => 
              note.id === id ? { ...note, status: 'archived' } : note
            )
          );
        }
      }
    } catch (err) {
      console.error('Error archiving notification:', err);
    }
  };

  // Get filtered notifications
  const getFilteredNotifications = () => {
    switch(activeFilter) {
      case 'unread':
        return notifications.filter(note => !note.read);
      case 'archived':
        return notifications.filter(note => note.status === 'archived');
      case 'all':
      default:
        return notifications.filter(note => note.status !== 'archived');
    }
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
  
  // Create a test notification for demonstration
  const createTestNotification = async () => {
    if (!userId) return;
    
    try {
      // Remove from localStorage to ensure animation triggers
      localStorage.removeItem('lastNotificationCount');
      
      const testNotification = {
        receiver_id: userId,
        type: 'announcement',
        message: 'This is a test notification. It was created at ' + new Date().toLocaleTimeString(),
        entity_type: 'system',
        entity_id: 'test'
      };
      
      const response = await notificationService.createNotification(testNotification);
      
      if (response.success) {
        // Display a temporary alert so the user knows the test worked
        alert('Test notification created! Navigate to another page and back to see the animation and hear the sound effect on the notification bell.');
        
        // Force refresh the notifications
        const currentFilter = activeFilter;
        setActiveFilter('temp');
        setTimeout(() => setActiveFilter(currentFilter), 100);
      }
    } catch (err) {
      console.error('Error creating test notification:', err);
    }
  };

  // Get filtered notifications
  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="notification-page">
      {/* Header */}
      <header className="main-header">          <div className="header-left">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} title="Go to home page">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a onClick={() => navigate('/')} className="nav-link" style={{ cursor: 'pointer' }} title="Home">Home</a>
            <a onClick={() => navigate('/my-learning')} className="nav-link" style={{ cursor: 'pointer' }} title="My Learning">My Learning</a>
            <a onClick={() => navigate('/explore')} className="nav-link" style={{ cursor: 'pointer' }} title="Explore">Explore</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search courses..." />
            <button className="search-button">Search</button>
          </div>
          <div 
            className="notification-button active" 
            onClick={() => navigate('/notifications')}
            style={{ cursor: 'pointer' }}
            aria-label="Notifications"
            title="View notifications"
          >
            <span className="notification-icon">🔔</span>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </div>
          <div 
            className="profile-icon" 
            onClick={() => navigate('/profile')}
            style={{ cursor: 'pointer' }}
            aria-label="Profile"
            title="View profile"
          >
            {userId ? userId.substring(0, 2).toUpperCase() : 'GU'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="notification-container">
        <div className="notification-header">
          <h1>Notifications</h1>
          <div className="notification-actions">
            {unreadCount > 0 && (
              <button 
                className="mark-all-read" 
                onClick={markAllAsRead}
                aria-label="Mark all notifications as read"
                title="Mark all notifications as read"
              >
                Mark all as read
              </button>
            )}
            <button 
              className="test-notification" 
              onClick={createTestNotification}
              aria-label="Create test notification"
              title="Create a test notification to see the sound and animation"
            >
              Test Notification Sound
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="notification-filters">
          <button 
            className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
            aria-label="Show all notifications"
            title="Show all notifications"
          >
            All
          </button>
          <button 
            className={`filter-button ${activeFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unread')}
            aria-label="Show unread notifications"
            title="Show unread notifications"
          >
            Unread ({unreadCount})
          </button>
          <button 
            className={`filter-button ${activeFilter === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveFilter('archived')}
            aria-label="Show archived notifications"
            title="Show archived notifications"
          >
            Archived
          </button>
        </div>

        {/* Test notification info */}
        <div className="test-notification-info">
          <p>
            <strong>🔔 Testing notifications:</strong> Click the "Test Notification Sound" button above, then navigate to 
            another page (like Home) to see the animation and hear the sound effect on the notification bell.
          </p>
        </div>

        {/* Notification List */}
        <div className="notification-list">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>Try Again</button>
            </div>
          ) : filteredNotifications.length === 0 ? (
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
                tabIndex="0"
                role="button"
                aria-label={`${notification.read ? 'Read' : 'Unread'} notification: ${notification.title}`}
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
                <div className="notification-actions">
                  <button 
                    className="archive-button"
                    onClick={(e) => archiveNotification(notification.id, e)}
                    title="Archive notification"
                    aria-label="Archive this notification"
                  >
                    🗑️
                  </button>
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