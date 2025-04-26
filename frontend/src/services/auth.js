const BASE_URL = 'http://localhost:5000';

// Function to login a user
export async function loginUser(email, password) {
  try {
    console.log('Attempting login with:', { email, password });
    
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Important for cookies/session
    });
    
    console.log('Login response status:', response.status);
    
    const data = await response.json();
    console.log('Login response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store user data in localStorage for app-wide access
    if (data.success) {
      localStorage.setItem('userData', JSON.stringify({
        user_id: data.user_id,
        role: data.role
      }));
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Function to register a user
export async function registerUser(userData) {
  try {
    console.log('Attempting registration with:', userData);
    
    // Format birth_date if needed
    if (userData.birth_date && userData.birth_date.includes('/')) {
      const parts = userData.birth_date.split('/');
      if (parts.length === 3) {
        userData.birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });
    
    console.log('Register response status:', response.status);
    
    const data = await response.json();
    console.log('Register response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Simple function to check if user is logged in
export function isLoggedIn() {
  return localStorage.getItem('userData') !== null;
}

// Function to get current user data
export function getCurrentUser() {
  const userData = localStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
}

// Simple logout function
export function logout() {
  localStorage.removeItem('userData');
  
  // Clear any other user-related data
  // Note: If other items are stored, they should be cleared here as well
}