const BASE_URL = 'http://localhost:5000';

// Function to create a new course
export async function createCourse(courseData) {
  try {
    // Make a copy to avoid modifying the original object
    const dataToSend = { ...courseData };
    
    // Ensure price is an integer
    if (dataToSend.price !== undefined) {
      // First ensure it's a number, then convert to integer
      dataToSend.price = parseInt(String(dataToSend.price), 10);
      
      // If parsing failed (e.g., NaN), set to 0
      if (isNaN(dataToSend.price)) {
        dataToSend.price = 0;
      }
    }
    
    console.log('Attempting to create course with:', dataToSend);
    
    const response = await fetch(`${BASE_URL}/api/add/course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
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
    console.error('Create course error:', error);
    return {
      success: false,
      message: error.message || 'An error occurred while creating the course'
    };
  }
}

// Function to add a section to a course
export async function addSection(courseId, sectionData) {
  try {
    console.log('Attempting to add section with:', sectionData);
    
    const response = await fetch(`${BASE_URL}/api/add/course/${courseId}/section`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sectionData),
      credentials: 'include',
    });
    
    console.log('Add section response status:', response.status);
    
    const data = await response.json();
    console.log('Add section response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add section');
    }
    
    return data;
  } catch (error) {
    console.error('Add section error:', error);
    throw error;
  }
}

// Function to add content to a section
export async function addContent(courseId, sectionId, contentData) {
  try {
    console.log('Attempting to add content with:', contentData);
    
    // For content with file uploads (document or visual_material), we need to use FormData
    let options = {
      method: 'POST',
      credentials: 'include',
    };
    
    // Check if contentData is already FormData
    if (contentData instanceof FormData) {
      options.body = contentData;
    } else {
      // If it's a regular object, convert to JSON
      options.headers = {
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify(contentData);
    }
    
    const response = await fetch(`${BASE_URL}/api/add/course/${courseId}/section/${sectionId}/content`, options);
    
    console.log('Add content response status:', response.status);
    
    const data = await response.json();
    console.log('Add content response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add content');
    }
    
    return data;
  } catch (error) {
    console.error('Add content error:', error);
    throw error;
  }
}

// Function to add a question to content
export async function addQuestion(courseId, sectionId, contentId, questionData) {
  try {
    console.log('Attempting to add question with:', questionData);
    
    const response = await fetch(`${BASE_URL}/api/add/course/${courseId}/section/${sectionId}/content/${contentId}/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
      credentials: 'include',
    });
    
    console.log('Add question response status:', response.status);
    
    const data = await response.json();
    console.log('Add question response data:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add question');
    }
    
    return data;
  } catch (error) {
    console.error('Add question error:', error);
    throw error;
  }
}

// Function to fetch instructor courses (mock for now)
export async function getInstructorCourses(instructorId) {
  try {
    // This would be replaced with an actual API call
    // For now return mock data
    return {
      success: true,
      courses: [
        { 
          id: 'C1A2B3C4', 
          title: 'Advanced JavaScript Programming', 
          students: 45, 
          status: 'published', 
          progress: 100 
        },
        { 
          id: 'C5D6E7F8', 
          title: 'Introduction to React', 
          students: 25, 
          status: 'approved', 
          progress: 100 
        },
        { 
          id: 'C9G0H1I2', 
          title: 'Building RESTful APIs', 
          students: 0, 
          status: 'draft', 
          progress: 60 
        },
        { 
          id: 'C3J4K5L6', 
          title: 'Database Design Principles', 
          students: 0, 
          status: 'draft', 
          progress: 35 
        }
      ]
    };
  } catch (error) {
    console.error('Get instructor courses error:', error);
    throw error;
  }
}