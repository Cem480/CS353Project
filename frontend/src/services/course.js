const BASE_URL = 'http://localhost:5001';

/**
 * Helper function for all API requests with proper error handling
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - The API response data
 */
export const apiRequest = async (url, options = {}) => {
  try {
    const defaultOptions = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options
    };
    
    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete defaultOptions.headers['Content-Type'];
    }
    
    const response = await fetch(url, defaultOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${url}):`, error);
    throw error;
  }
};

// Create a new course
export async function createCourse(courseData) {
  try {
    console.log('Creating course with data:', courseData);
    
    const response = await fetch(`${BASE_URL}/api/add/course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
      credentials: 'include',
    });
    
    console.log('Create course response status:', response.status);
    
    const data = await response.json();
    console.log('Create course response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create course');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
}

// Get course details by ID
export async function getCourseById(courseId) {
  try {
    console.log('Fetching course details for:', courseId);
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Get course response status:', response.status);
    
    const data = await response.json();
    console.log('Get course response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch course details');
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    throw error;
  }
}

// Get all sections for a course
export async function getCourseSections(courseId) {
  try {
    console.log('Fetching sections for course:', courseId);
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/sections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Get sections response status:', response.status);
    
    const data = await response.json();
    console.log('Get sections response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch course sections');
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching sections for course ${courseId}:`, error);
    throw error;
  }
}

// Get content for a specific section
export async function getSectionContent(courseId, sectionId) {
  try {
    console.log(`Fetching content for course: ${courseId}, section: ${sectionId}`);
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/content`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Get section content response status:', response.status);
    
    const data = await response.json();
    console.log('Get section content response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch section content');
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching content for section ${sectionId}:`, error);
    throw error;
  }
}

// Get courses created by an instructor
export async function getInstructorCourses(instructorId) {
  try {
    console.log('Fetching courses for instructor:', instructorId);
    
    const response = await fetch(`${BASE_URL}/api/instructor/${instructorId}/courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    console.log('Get instructor courses response status:', response.status);
    
    const data = await response.json();
    console.log('Get instructor courses response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch instructor courses');
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching courses for instructor ${instructorId}:`, error);
    throw error;
  }
}

// Get courses based on their status
export async function getCoursesByStatus(status) {
  try {
    const response = await fetch(`${BASE_URL}/api/courses?status=${status}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch courses');
    }

    return data;
  } catch (error) {
    console.error(`Error fetching courses with status "${status}":`, error);
    throw error;
  }
}

// Approve or reject a pending course 
export async function evaluateCourse(courseId, adminId, isAccepted) {
  try {
    const response = await fetch(
      `${BASE_URL}/api/admin/evaluate_course/${courseId}/${adminId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_accepted: isAccepted })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to evaluate course');
    }

    return data;
  } catch (error) {
    console.error(`Error evaluating course ${courseId}:`, error);
    throw error;
  }
}

export async function getEnrolledCourses(studentId) {
  const response = await fetch(`${BASE_URL}/api/student/${studentId}/enrolled-courses`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch enrolled courses');
  return await response.json();
}

/**
 * Get course information
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} - Course information
 */
export async function getCourseInfo(courseId) {
  return apiRequest(`${BASE_URL}/api/course-content/course/${courseId}/info`);
}

/**
 * Get all sections for a course (using course-content endpoint)
 * @param {string} courseId - The course ID
 * @returns {Promise<Array>} - Course sections
 */
export async function getCourseSectionsForContent(courseId) {
  return apiRequest(`${BASE_URL}/api/course-content/course/${courseId}/sections`);
}

/**
 * Get content list for a specific section
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @returns {Promise<Array>} - Section contents
 */
export async function getSectionContents(courseId, sectionId) {
  return apiRequest(`${BASE_URL}/api/course-content/course/${courseId}/section/${sectionId}/contents`);
}

/**
 * Get section's incomplete content summary
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - Incomplete summary
 */
export async function getSectionIncompleteSummary(courseId, sectionId, studentId) {
  return apiRequest(`${BASE_URL}/api/course-content/course/${courseId}/section/${sectionId}/incomplete-summary/${studentId}`);
}

/**
 * Get detailed information for a specific content item
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content ID
 * @returns {Promise<Object>} - Content details
 */
export async function getContentDetail(courseId, sectionId, contentId) {
  return apiRequest(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/content/${contentId}`);
}

/**
 * Submit assignment file
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content ID
 * @param {string} studentId - The student ID
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - Result
 */
export async function submitAssignment(courseId, sectionId, contentId, studentId, file) {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiRequest(`${BASE_URL}/api/submit/${courseId}/${sectionId}/${contentId}/${studentId}`, {
    method: 'POST',
    body: formData
  });
}

/**
 * Submit quiz/assessment answers
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content ID
 * @param {string} studentId - The student ID
 * @param {Object} answers - The answers object {questionId: answerText}
 * @returns {Promise<Object>} - Result
 */
export async function submitAssessment(courseId, sectionId, contentId, studentId, answers) {
  console.log('Submitting assessment:', {
    courseId,
    sectionId,
    contentId,
    studentId,
    answers
  });
  
  return apiRequest(`${BASE_URL}/api/submit/${courseId}/${sectionId}/${contentId}/${studentId}`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
}

/**
 * Get comments for a specific content item
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content ID
 * @returns {Promise<Array>} - The comments data
 */
export async function getContentComments(courseId, sectionId, contentId) {
  try {
    // Updated to use the correct API endpoint from comment.py
    return apiRequest(`${BASE_URL}/api/comment/${courseId}/${sectionId}/${contentId}`);
  } catch (error) {
    console.error('Error fetching comments:', error);
    // Return empty comments array instead of throwing
    return [];
  }
}

/**
 * Add a comment to a content item
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content ID
 * @param {string} userId - The user ID
 * @param {string} text - The comment text
 * @returns {Promise<Object>} - The result
 */
export async function addContentComment(courseId, sectionId, contentId, userId, text) {
  // Updated to use the correct API endpoint from comment.py
  return apiRequest(`${BASE_URL}/api/comment/${courseId}/${sectionId}/${contentId}/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ text }) // Updated to match the expected request format
  });
}

/**
 * Get student's completion status for a course - UPDATED VERSION
 * @param {string} courseId - The course ID
 * @param {string} studentId - The student ID 
 * @returns {Promise<Object>} - Completion status
 */
// Update your course.js - remove the getCompletionStatus function since the endpoint doesn't exist
// and update the existing functions to work properly

/**
 * Get student's completion status for a course - SIMPLIFIED VERSION
 * Uses existing grades API only
 * @param {string} courseId - The course ID
 * @param {string} studentId - The student ID 
 * @returns {Promise<Object>} - Completion status
 */
export async function getCompletionStatusFromGrades(courseId, studentId) {
  try {
    const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/grades/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.warn('Could not fetch grades for completion status');
      return { completedItems: [], totalCompleted: 0 };
    }
    
    const gradesData = await response.json();
    
    // Convert grades data to completion format
    const completedItems = gradesData
      .filter(item => item.grade !== null)
      .map(item => ({
        section_id: item.section_id,
        content_id: item.content_id,
        is_completed: true,
        grade: item.grade,
        content_title: item.content_title,
        section_title: item.section_title
      }));
    
    return {
      success: true,
      completedItems,
      totalCompleted: completedItems.length
    };
  } catch (error) {
    console.error(`Error fetching completion status from grades:`, error);
    return { completedItems: [], totalCompleted: 0 };
  }
}

/**
 * Mark content as completed - WORKING VERSION
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - Result
 */
export async function markContentCompleted(courseId, sectionId, contentId, studentId) {
  console.log('Marking content as completed:', {
    courseId,
    sectionId,
    contentId,
    studentId
  });
  
  if (!contentId) {
    throw new Error('Content ID is required');
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/complete/${courseId}/${sectionId}/${contentId}/${studentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_completed: true })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to mark content as completed');
    }
    
    console.log('Content marked as completed successfully:', data);
    return data;
  } catch (error) {
    console.error('Error marking content as completed:', error);
    throw error;
  }
}

/**
 * Check if content is completed by looking at grades
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Boolean>} - Is completed
 */
export async function checkContentCompleted(courseId, sectionId, contentId, studentId) {
  try {
    const gradesResponse = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/grades/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!gradesResponse.ok) {
      return false;
    }
    
    const grades = await gradesResponse.json();
    
    // Check if this specific content has a grade (meaning it's completed)
    const contentGrade = grades.find(item => 
      String(item.section_id) === String(sectionId) && 
      String(item.content_id) === String(contentId)
    );
    
    return contentGrade && contentGrade.grade !== null;
  } catch (error) {
    console.error('Error checking content completion:', error);
    return false;
  }
}

export const getDetailedCompletionStatus = async (courseId, studentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/student/${studentId}/completion-status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch completion status`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching detailed completion status:', error);
    throw error;
  }
};

// Check specific content completion
export const checkContentCompletion = async (courseId, sectionId, contentId, studentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complete/${courseId}/${sectionId}/${contentId}/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to check content completion`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking content completion:', error);
    throw error;
  }
};

// Get course completion summary
export const getCourseCompletionSummary = async (courseId, studentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/completion-summary/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch completion summary`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching completion summary:', error);
    throw error;
  }
};

// Mark content as completed (enhanced)
export const markContentCompletedEnhanced = async (courseId, sectionId, contentId, studentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complete/${courseId}/${sectionId}/${contentId}/${studentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_completed: true })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to mark content as completed`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error marking content as completed:', error);
    throw error;
  }
};

// Utility function to merge completion status with content data
export const mergeCompletionStatus = (sectionsData, completionData) => {
  if (!completionData || !completionData.sections) {
    return sectionsData;
  }

  return sectionsData.map(section => {
    const completionSection = completionData.sections.find(cs => cs.section_id === section.id);
    
    if (!completionSection) {
      return section;
    }

    const updatedContents = section.contents.map(content => {
      const completionContent = completionSection.contents.find(cc => cc.content_id === content.id);
      
      return {
        ...content,
        isCompleted: completionContent ? completionContent.is_complete_or_graded : false,
        grade: completionContent ? completionContent.grade : null
      };
    });

    return {
      ...section,
      contents: updatedContents
    };
  });
};