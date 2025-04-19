// src/services/api/auth.js

const BASE_URL = 'http://localhost:5000';

// Function to login a user
export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    credentials: 'include', // if we later use cookies/session
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Login failed');
  }

  return await response.json(); // Success → return user data or token
}

// Function to register a user
export async function registerUser(userData) {
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Registration failed');
  }

  return await response.json(); // Success → return new user info
}
