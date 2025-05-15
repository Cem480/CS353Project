import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import * as notificationService from '../services/notification';
import '../styles/Notification.css';
// Import the notification sound
import notificationSound from '../assets/notification-sound.mp3';

const NotificationButton = ({ className = '' }) => {
  const navigate = useNavigate();
  const userData = getCurrentUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initial fetch of notification count
    if (userData?.user_id) {
      fetchNotificationCount();
    }

    // Set up polling interval for notifications (every 30 seconds)
    const intervalId = setInterval(() => {
      if (userData?.user_id) {
        fetchNotificationCount();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [userData?.user_id]);

  useEffect(() => {
    // Check if we have new notifications
    if (unreadCount > prevUnreadCount && prevUnreadCount !== 0) {
      // We have new notifications!
      setHasNewNotification(true);
      playNotificationSound();
      
      // Reset the animation after 10 seconds
      const timeoutId = setTimeout(() => {
        setHasNewNotification(false);
      }, 10000);
      
      return () => clearTimeout(timeoutId);
    } else if (unreadCount > 0 && notificationService.hasNewNotifications(unreadCount)) {
      // This handles the test notification case
      setHasNewNotification(true);
      playNotificationSound();
      
      // Reset the animation after 10 seconds
      const timeoutId = setTimeout(() => {
        setHasNewNotification(false);
      }, 10000);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Update previous count
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

  const fetchNotificationCount = async () => {
    if (!userData?.user_id) return;
    
    try {
      const response = await notificationService.getNotificationStats(userData.user_id);
      if (response.success) {
        const newCount = response.stats.by_status.unread || 0;
        setUnreadCount(newCount);
        
        // Check if this is a new notification using our service
        if (notificationService.hasNewNotifications(newCount)) {
          setHasNewNotification(true);
          playNotificationSound();
          
          // Reset the animation after 10 seconds
          setTimeout(() => {
            setHasNewNotification(false);
          }, 10000);
        }
      }
    } catch (err) {
      console.error('Error fetching notification count:', err);
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      // Reset to beginning and attempt to play
      audioRef.current.currentTime = 0;
      
      // Play sound with error handling for browsers that block autoplay
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Sound played successfully
            console.log('Notification sound played successfully');
          })
          .catch(error => {
            // Sound play was prevented - likely due to browser autoplay policy
            console.warn('Sound playback was prevented:', error);
            
            // We could show a visual indication that sound was blocked
            // or handle it in another way if needed
          });
      }
    }
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
    // If we had new notifications, reset the animation when clicked
    if (hasNewNotification) {
      setHasNewNotification(false);
    }
    
    // Acknowledge that the user has seen the notifications
    notificationService.acknowledgeNotifications(unreadCount);
  };

  // Determine which CSS classes to apply based on state
  const buttonClass = `notification-button ${className} ${hasNewNotification ? 'new-notification' : ''}`;
  const iconClass = `notification-icon ${hasNewNotification ? 'ring' : ''}`;

  return (
    <>
      <div 
        className={buttonClass}
        onClick={handleNotificationClick}
        title="View notifications"
      >
        <span className={iconClass}>🔔</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </div>
      <audio ref={audioRef} src={notificationSound} />
    </>
  );
};

export default NotificationButton;
