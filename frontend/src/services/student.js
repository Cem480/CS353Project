// src/services/student.js
const BASE_URL = 'http://localhost:5001';

// Get student information
export async function getStudentInfo(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch student information');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching student info:', error);
    throw error;
  }
}

// Get top 10 recommended courses
export async function getRecommendedCourses(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}/recommended-courses/top10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch recommended courses');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching recommended courses:', error);
    throw error;
  }
}

// Get all recommended courses
export async function getAllRecommendedCourses(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}/recommended-courses/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch all recommended courses');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching all recommended courses:', error);
    throw error;
  }
}

// Search recommended courses
export async function searchRecommendedCourses(studentId, searchTerm) {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}/recommended-courses/search?q=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to search recommended courses');
    }
    
    return data;
  } catch (error) {
    console.error('Error searching recommended courses:', error);
    throw error;
  }
}

// Get top 5 recommended categories
export async function getTopCategories(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}/recommended-categories/top5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch top categories');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching top categories:', error);
    throw error;
  }
}

// Get all recommended categories
export async function getAllCategories(studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}/recommended-categories/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch all categories');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching all categories:', error);
    throw error;
  }
}

export async function getStudentCertificates() {
  const response = await fetch(`${BASE_URL}/api/certificate/list`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch certificates');
  return await response.json();
}

export async function generateCertificate(courseId, studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/certificate/generate/${courseId}/${studentId}`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await response.json();
    return data;  // { success: true/false, message: "...", certificate_id: "..." }
  } catch (err) {
    console.error('Failed to generate certificate:', err);
    throw new Error('Failed to generate certificate.');
  }
}