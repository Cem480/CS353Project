// src/services/courseContent.js
const BASE_URL = 'http://localhost:5001';

// Get course details
export async function getCourseInfo(courseId) {
  try {
    // First try to get course content info
    const response = await fetch(`${BASE_URL}/api/course-overview/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    // If we get a successful response, use it
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    
    // Fall back to the general course API if content-specific API fails
    const fallbackResponse = await fetch(`${BASE_URL}/api/course/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!fallbackResponse.ok) {
      throw new Error('Failed to fetch course information');
    }
    
    const fallbackData = await fallbackResponse.json();
    return fallbackData;
  } catch (error) {
    console.error('Error fetching course info:', error);
    throw error;
  }
}

// Get course sections
export async function getCourseSections(courseId) {
  try {
    const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/sections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch course sections');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching course sections:', error);
    throw error;
  }
}

// Get section contents
export async function getSectionContents(courseId, sectionId) {
  try {
    const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/section/${sectionId}/contents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch section contents');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching section contents:', error);
    throw error;
  }
}

// Get student grades for a course
export async function getStudentGrades(courseId, studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/grades/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch student grades');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching student grades:', error);
    throw error;
  }
}

// Get incomplete summary for a section
export async function getIncompleteTasksSummary(courseId, sectionId, studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/section/${sectionId}/incomplete-summary/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch incomplete tasks summary');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching incomplete tasks summary:', error);
    throw error;
  }
}

// Get all course details in one call
export async function getFullCourseDetails(courseId, studentId = null) {
  try {
    // Create a results object
    const results = {};
    
    // Get course info
    try {
      results.courseInfo = await getCourseInfo(courseId);
    } catch (error) {
      console.error('Error fetching course info:', error);
      results.courseInfo = null;
    }
    
    // Get course sections
    try {
      results.sections = await getCourseSections(courseId);
    } catch (error) {
      console.error('Error fetching course sections:', error);
      results.sections = [];
    }
    
    // Get section contents for each section
    results.sectionContents = {};
    if (Array.isArray(results.sections)) {
      for (const section of results.sections) {
        try {
          results.sectionContents[section.sec_id] = await getSectionContents(courseId, section.sec_id);
        } catch (error) {
          console.error(`Error fetching contents for section ${section.sec_id}:`, error);
          results.sectionContents[section.sec_id] = [];
        }
      }
    }
    
    // Get student grades if student ID is provided
    if (studentId) {
      try {
        results.grades = await getStudentGrades(courseId, studentId);
      } catch (error) {
        console.error('Error fetching student grades:', error);
        results.grades = [];
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching full course details:', error);
    throw error;
  }
}