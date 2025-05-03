const BASE_URL = 'http://localhost:5001';

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
