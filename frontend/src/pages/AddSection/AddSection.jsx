import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById } from '../../services/course';
import './AddSection.css';

const AddSection = ({ isEditMode = false }) => {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [sectionData, setSectionData] = useState({
    title: '',
    description: '',
    order_number: '',
    allocated_time: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // If editing, fetch existing section data
  useEffect(() => {
    if (isEditMode && sectionId) {
      // Add code to fetch section data here if needed
    }
  }, [isEditMode, sectionId]);
  
  // Fetch course data to display title
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const courseData = await getCourseById(courseId);
        if (courseData.success) {
          setCourse(courseData.course);
        } else {
          throw new Error(courseData.message || 'Failed to load course');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setErrors({
          submit: 'Failed to load course data. Please try again.'
        });
      }
    };
    
    fetchCourseData();
  }, [courseId]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSectionData({
      ...sectionData,
      [name]: value
    });
    
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!sectionData.title.trim()) {
      newErrors.title = 'Section title is required';
    }
    
    if (!sectionData.description.trim()) {
      newErrors.description = 'Section description is required';
    }
    
    if (!sectionData.order_number) {
      newErrors.order_number = 'Order number is required';
    } else if (isNaN(sectionData.order_number) || parseInt(sectionData.order_number) <= 0) {
      newErrors.order_number = 'Order number must be a positive number';
    }
    
    if (!sectionData.allocated_time) {
      newErrors.allocated_time = 'Allocated time is required';
    } else if (isNaN(sectionData.allocated_time) || parseInt(sectionData.allocated_time) <= 0) {
      newErrors.allocated_time = 'Allocated time must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Submit section
  const submitSection = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`http://localhost:5001/api/add/course/${courseId}/section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: sectionData.title,
          description: sectionData.description,
          order_number: parseInt(sectionData.order_number),
          allocated_time: parseInt(sectionData.allocated_time)
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add section');
      }
      
      setSuccessMessage('Section added successfully!');
      
      // Reset form after successful submission
      setSectionData({
        title: '',
        description: '',
        order_number: '',
        allocated_time: ''
      });
      
      // Navigate to content-editor page instead of content page
      // This is the key change to fix the navigation issue
      setTimeout(() => {
        navigate(`/course/${courseId}/content-editor`);
      }, 1500);
      
    } catch (error) {
      console.error('Error adding section:', error);
      setErrors({
        submit: error.message || 'Failed to add section. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle back button
  const handleBack = () => {
    // Navigate to content-editor instead of content
    navigate(`/course/${courseId}/content-editor`);
  };
  
  return (
    <div className="add-section-container">
      <div className="section-header">
        <button className="back-button" onClick={handleBack}>←</button>
        <h1>{isEditMode ? 'Edit Section' : 'Add Section to'} {course?.title || 'Course'}</h1>
      </div>
      
      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}
      
      {errors.submit && (
        <div className="error-message" style={{marginBottom: '20px'}}>
          {errors.submit}
        </div>
      )}
      
      <div className="form-container">
        <h2 className="form-title">Section Details</h2>
        
        <form onSubmit={submitSection}>
          <div className="form-row">
            <label htmlFor="title">
              Section Title <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className={`form-input ${errors.title ? 'error' : ''}`}
              value={sectionData.title}
              onChange={handleInputChange}
              placeholder="Enter a title for this section"
            />
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>
          
          <div className="form-row">
            <label htmlFor="description">
              Section Description <span className="required-mark">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              className={`form-input ${errors.description ? 'error' : ''}`}
              value={sectionData.description}
              onChange={handleInputChange}
              placeholder="Describe what this section covers"
              rows={4}
            />
            {errors.description && <div className="error-message">{errors.description}</div>}
          </div>
          
          <div className="form-row-2">
            <div className="form-row">
              <label htmlFor="order_number">
                Order Number <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                id="order_number"
                name="order_number"
                min="1"
                className={`form-input ${errors.order_number ? 'error' : ''}`}
                value={sectionData.order_number}
                onChange={handleInputChange}
                placeholder="Position in the course (e.g., 1, 2, 3)"
              />
              {errors.order_number && <div className="error-message">{errors.order_number}</div>}
              <div className="form-hint">The order in which this section appears in the course</div>
            </div>
            
            <div className="form-row">
              <label htmlFor="allocated_time">
                Allocated Time (minutes) <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                id="allocated_time"
                name="allocated_time"
                min="1"
                className={`form-input ${errors.allocated_time ? 'error' : ''}`}
                value={sectionData.allocated_time}
                onChange={handleInputChange}
                placeholder="Estimated time to complete (in minutes)"
              />
              {errors.allocated_time && <div className="error-message">{errors.allocated_time}</div>}
              <div className="form-hint">Estimated time needed to complete this section</div>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleBack}
            >
              Cancel
            </button>
            
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Section' : 'Add Section')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSection;