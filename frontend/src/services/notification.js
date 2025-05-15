const BASE_URL = 'http://localhost:5001';

// Function to get all notifications for a user
export async function getUserNotifications(userId, status = null) {
  try {
    let url = `${BASE_URL}/api/notifications/${userId}`;
    if (status) {
      url += `?status=${status}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies/session
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch notifications');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

// Function to mark a notification as read
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/read/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to mark notification as read');
    }
    
    return data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Function to mark all notifications as read
export async function markAllNotificationsAsRead(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/read-all/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to mark all notifications as read');
    }
    
    return data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Function to archive a notification
export async function archiveNotification(notificationId, userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/archive/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to archive notification');
    }
    
    return data;
  } catch (error) {
    console.error('Error archiving notification:', error);
    throw error;
  }
}

// Function to get notification statistics
export async function getNotificationStats(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/stats/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch notification statistics');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    throw error;
  }
}

// Function to create a custom notification
export async function createNotification(notificationData) {
  try {
    const response = await fetch(`${BASE_URL}/api/notifications/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(notificationData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create notification');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Local storage keys
const LAST_NOTIFICATION_COUNT_KEY = 'lastNotificationCount';
const LAST_NOTIFICATION_CHECK_KEY = 'lastNotificationCheck';

// Function to check if there are new notifications
export function hasNewNotifications(currentCount) {
  try {
    const lastCount = parseInt(localStorage.getItem(LAST_NOTIFICATION_COUNT_KEY) || '0');
    
    // If current count is higher than last stored count, we have new notifications
    if (currentCount > lastCount) {
      // Update last count
      localStorage.setItem(LAST_NOTIFICATION_COUNT_KEY, currentCount.toString());
      localStorage.setItem(LAST_NOTIFICATION_CHECK_KEY, Date.now().toString());
      return true;
    }
    
    // If counts are the same, no new notifications
    localStorage.setItem(LAST_NOTIFICATION_CHECK_KEY, Date.now().toString());
    return false;
  } catch (error) {
    console.error('Error checking for new notifications:', error);
    return false;
  }
}

// Function to acknowledge notifications (call this when user views notifications)
export function acknowledgeNotifications(count) {
  localStorage.setItem(LAST_NOTIFICATION_COUNT_KEY, count.toString());
  localStorage.setItem(LAST_NOTIFICATION_CHECK_KEY, Date.now().toString());
}
