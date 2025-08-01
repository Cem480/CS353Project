const BASE_URL = 'http://localhost:5001';

export async function getInstructorStats(instructorId) {
  try {
    const response = await fetch(`${BASE_URL}/api/instructor/${instructorId}/stats`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch instructor stats');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching instructor stats:', error);
    throw error;
  }
}


export async function getUngradedSubmissions(instructorId, sort = 'newest', limit = 10, offset = 0) {
  try {
    const response = await fetch(`${BASE_URL}/api/instructor/${instructorId}/ungraded-submissions?sort=${sort}&limit=${limit}&offset=${offset}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ungraded submissions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ungraded submissions:', error);
    throw error;
  }
}

export async function gradeSubmission(courseId, secId, contentId, studentId, grade) {
  try {
    const response = await fetch(`${BASE_URL}/api/grade/${courseId}/${secId}/${contentId}/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ grade: parseInt(grade) })
    });

    return await response.json();
  } catch (err) {
    console.error("Error grading submission:", err);
    return { success: false, message: "Failed to submit grade" };
  }
}
