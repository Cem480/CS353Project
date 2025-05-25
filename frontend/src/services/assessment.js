// src/services/assessment.js
const BASE_URL = 'http://localhost:5001';

/**
 * Create a new assessment for a course section
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {Object} assessmentData - Assessment data including questions
 * @returns {Promise<Object>} - Created assessment data
 */
export async function createAssessment(courseId, sectionId, assessmentData) {
  try {
    console.log('Creating assessment:', { courseId, sectionId, assessmentData });
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(assessmentData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create assessment');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating assessment:', error);
    throw error;
  }
}

/**
 * Update an existing assessment
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content/assessment ID
 * @param {Object} assessmentData - Updated assessment data
 * @returns {Promise<Object>} - Updated assessment data
 */
export async function updateAssessment(courseId, sectionId, contentId, assessmentData) {
  try {
    console.log('Updating assessment:', { courseId, sectionId, contentId, assessmentData });
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/assessment/${contentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(assessmentData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update assessment');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
}

/**
 * Get assessment details including questions
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content/assessment ID
 * @returns {Promise<Object>} - Assessment data with questions
 */
export async function getAssessmentDetails(courseId, sectionId, contentId) {
  try {
    console.log('Fetching assessment details:', { courseId, sectionId, contentId });
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/assessment/${contentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch assessment details');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching assessment details:', error);
    throw error;
  }
}

/**
 * Get assessment questions for students (without correct answers)
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content/assessment ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} - Assessment questions for student
 */
export async function getAssessmentForStudent(courseId, sectionId, contentId, studentId) {
  try {
    console.log('Fetching assessment for student:', { courseId, sectionId, contentId, studentId });
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/assessment/${contentId}/student/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch assessment for student');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching assessment for student:', error);
    throw error;
  }
}

/**
 * Submit assessment answers
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content/assessment ID
 * @param {string} studentId - The student ID
 * @param {Object} answers - Student answers {questionId: answer}
 * @returns {Promise<Object>} - Submission result with score
 */
export async function submitAssessmentAnswers(courseId, sectionId, contentId, studentId, answers) {
  try {
    console.log('Submitting assessment answers:', { courseId, sectionId, contentId, studentId, answers });
    
    const response = await fetch(`${BASE_URL}/api/submit/${courseId}/${sectionId}/${contentId}/${studentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ answers })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit assessment answers');
    }
    
    return data;
  } catch (error) {
    console.error('Error submitting assessment answers:', error);
    throw error;
  }
}

/**
 * Create questions for an assessment
 * @param {string} courseId - The course ID
 * @param {string} sectionId - The section ID
 * @param {string} contentId - The content/assessment ID
 * @param {Array} questions - Array of question objects
 * @returns {Promise<Object>} - Result
 */
export async function createAssessmentQuestions(courseId, sectionId, contentId, questions) {
  try {
    console.log('Creating assessment questions:', { courseId, sectionId, contentId, questions });
    
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/content/${contentId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ questions })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create assessment questions');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating assessment questions:', error);
    throw error;
  }
}