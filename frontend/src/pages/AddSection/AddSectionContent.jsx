import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById, getSectionContent } from '../../services/course';
import './AddSectionContent.css';

const AddSectionContent = () => {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [existingContents, setExistingContents] = useState([]);
  
  // State for the form
  const [contentData, setContentData] = useState({
    title: '',
    allocated_time: '',
    content_type: 'document', // Default to document
    order_number: 1, // Default order number
    // Fields for task type
    passing_grade: 70, // Default passing grade
    max_time: 60, // Default max time in minutes
    task_type: 'assignment', // Default task type
    percentage: 10, // Default percentage of total grade
    // Fields for assessment
    question_count: 5, // Default question count
    // Fields for assignment
    start_date: new Date().toISOString().split('T')[0], // Today as default
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from today
    upload_material: 'pdf,doc,docx', // Default allowed upload formats
    // Fields for visual material
    duration: 10 // Default duration in minutes
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Fetch course and section data to display title and determine next order number
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course data
        const courseData = await getCourseById(courseId);
        if (courseData.success) {
          setCourse(courseData.course);
        } else {
          throw new Error(courseData.message || 'Failed to load course');
        }
        
        // Fetch section data and existing content to determine next order number
        const sectionData = await getSectionContent(courseId, sectionId);
        if (sectionData.success) {
          // Find the section information
          if (sectionData.content && Array.isArray(sectionData.content)) {
            setExistingContents(sectionData.content);
            
            // Set next order number
            const maxOrder = Math.max(0, ...sectionData.content.map(item => item.order_number || 0));
            setContentData(prev => ({
              ...prev,
              order_number: maxOrder + 1
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setErrors({
          submit: 'Failed to load course and section data. Please try again.'
        });
      }
    };
    
    fetchData();
  }, [courseId, sectionId]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContentData({
      ...contentData,
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
  
  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Clear file error if exists
      if (errors.file) {
        setErrors({
          ...errors,
          file: ''
        });
      }
    }
  };
  
  // Validate form based on content type
  const validateForm = () => {
    const newErrors = {};
    
    // Common validations
    if (!contentData.title.trim()) {
      newErrors.title = 'Content title is required';
    }
    
    if (!contentData.allocated_time || isNaN(contentData.allocated_time) || parseInt(contentData.allocated_time) <= 0) {
      newErrors.allocated_time = 'Time must be a positive number';
    }
    
    // File validation for document and visual_material
    if ((contentData.content_type === 'document' || contentData.content_type === 'visual_material') && !selectedFile) {
      newErrors.file = 'A file is required for this content type';
    }
    
    // Task specific validations
    if (contentData.content_type === 'task') {
      if (!contentData.passing_grade || isNaN(contentData.passing_grade) || 
          parseInt(contentData.passing_grade) < 0 || parseInt(contentData.passing_grade) > 100) {
        newErrors.passing_grade = 'Passing grade must be between 0 and 100';
      }
      
      if (!contentData.max_time || isNaN(contentData.max_time) || parseInt(contentData.max_time) <= 0) {
        newErrors.max_time = 'Maximum time must be a positive number';
      }
      
      if (!contentData.percentage || isNaN(contentData.percentage) || 
          parseInt(contentData.percentage) < 0 || parseInt(contentData.percentage) > 100) {
        newErrors.percentage = 'Percentage must be between 0 and 100';
      }
      
      // Assignment specific validations
      if (contentData.task_type === 'assignment') {
        if (!contentData.start_date) {
          newErrors.start_date = 'Start date is required';
        }
        
        if (!contentData.end_date) {
          newErrors.end_date = 'End date is required';
        } else if (new Date(contentData.end_date) <= new Date(contentData.start_date)) {
          newErrors.end_date = 'End date must be after start date';
        }
        
        if (!contentData.upload_material.trim()) {
          newErrors.upload_material = 'Allowed upload formats are required';
        }
      }
      
      // Assessment specific validations
      if (contentData.task_type === 'assessment') {
        if (!contentData.question_count || isNaN(contentData.question_count) || 
            parseInt(contentData.question_count) <= 0) {
          newErrors.question_count = 'Question count must be a positive number';
        }
      }
    }
    
    // Visual material specific validations
    if (contentData.content_type === 'visual_material') {
      if (!contentData.duration || isNaN(contentData.duration) || parseInt(contentData.duration) <= 0) {
        newErrors.duration = 'Duration must be a positive number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Submit content
  const submitContent = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object for file upload
      const formData = new FormData();
      
      // Add all form fields to FormData
      Object.keys(contentData).forEach(key => {
        formData.append(key, contentData[key]);
      });
      
      // Add file if selected
      if (selectedFile) {
        formData.append('body', selectedFile);
      }
      
      console.log('Submitting content with data:', contentData);
      console.log('File:', selectedFile);
      
      // Submit to API
      const response = await fetch(`http://localhost:5001/api/add/course/${courseId}/section/${sectionId}/content`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add content');
      }
      
      setSuccessMessage('Content added successfully!');
      
      // Reset form after successful submission
      setContentData({
        ...contentData,
        title: '',
        allocated_time: ''
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Navigate to content-editor instead of content
      setTimeout(() => {
        navigate(`/course/${courseId}/content-editor`);
      }, 1500);
      
    } catch (error) {
      console.error('Error adding content:', error);
      setErrors({
        submit: error.message || 'Failed to add content. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle cancel button
  const handleCancel = () => {
    // Navigate to content-editor instead of content
    navigate(`/course/${courseId}/content-editor`);
  };
  
  return (
    <div className="add-content-container">
      <div className="content-header">
        <button className="back-button" onClick={handleCancel}>←</button>
        <h1>Add Content to {course?.title || 'Course'}</h1>
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
        <h3>Add Content to Section</h3>
        
        <form onSubmit={submitContent} encType="multipart/form-data">
          <div className="form-row">
            <label htmlFor="content_type">Content Type <span className="required-mark">*</span></label>
            <select
              id="content_type"
              name="content_type"
              className={`form-input ${errors.content_type ? 'error' : ''}`}
              value={contentData.content_type}
              onChange={handleInputChange}
            >
              <option value="document">Document</option>
              <option value="task">Task (Assignment/Assessment)</option>
              <option value="visual_material">Visual Material</option>
            </select>
            {errors.content_type && <div className="error-message">{errors.content_type}</div>}
          </div>
          
          <div className="form-row">
            <label htmlFor="title">Content Title <span className="required-mark">*</span></label>
            <input
              type="text"
              id="title"
              name="title"
              className={`form-input ${errors.title ? 'error' : ''}`}
              value={contentData.title}
              onChange={handleInputChange}
              placeholder="Enter a title for this content"
            />
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>
          
          <div className="form-row">
            <label htmlFor="allocated_time">Time (minutes) <span className="required-mark">*</span></label>
            <input
              type="number"
              id="allocated_time"
              name="allocated_time"
              min="1"
              className={`form-input ${errors.allocated_time ? 'error' : ''}`}
              value={contentData.allocated_time}
              onChange={handleInputChange}
              placeholder="Estimated time to complete (in minutes)"
            />
            {errors.allocated_time && <div className="error-message">{errors.allocated_time}</div>}
          </div>
          
          <div className="form-row">
            <label htmlFor="order_number">Order Number <span className="required-mark">*</span></label>
            <input
              type="number"
              id="order_number"
              name="order_number"
              min="1"
              className={`form-input ${errors.order_number ? 'error' : ''}`}
              value={contentData.order_number}
              onChange={handleInputChange}
              placeholder="Position in the section"
            />
            {errors.order_number && <div className="error-message">{errors.order_number}</div>}
          </div>
          
          {/* Task-specific fields */}
          {contentData.content_type === 'task' && (
            <>
              <div className="form-row">
                <label htmlFor="task_type">Task Type <span className="required-mark">*</span></label>
                <select
                  id="task_type"
                  name="task_type"
                  className={`form-input ${errors.task_type ? 'error' : ''}`}
                  value={contentData.task_type}
                  onChange={handleInputChange}
                >
                  <option value="assignment">Assignment</option>
                  <option value="assessment">Assessment</option>
                </select>
                {errors.task_type && <div className="error-message">{errors.task_type}</div>}
              </div>
              
              <div className="form-row">
                <label htmlFor="passing_grade">Passing Grade (%) <span className="required-mark">*</span></label>
                <input
                  type="number"
                  id="passing_grade"
                  name="passing_grade"
                  min="0"
                  max="100"
                  className={`form-input ${errors.passing_grade ? 'error' : ''}`}
                  value={contentData.passing_grade}
                  onChange={handleInputChange}
                  placeholder="Minimum grade to pass"
                />
                {errors.passing_grade && <div className="error-message">{errors.passing_grade}</div>}
              </div>
              
              <div className="form-row">
                <label htmlFor="max_time">Maximum Time (minutes) <span className="required-mark">*</span></label>
                <input
                  type="number"
                  id="max_time"
                  name="max_time"
                  min="1"
                  className={`form-input ${errors.max_time ? 'error' : ''}`}
                  value={contentData.max_time}
                  onChange={handleInputChange}
                  placeholder="Maximum time allowed"
                />
                {errors.max_time && <div className="error-message">{errors.max_time}</div>}
              </div>
              
              <div className="form-row">
                <label htmlFor="percentage">Percentage of Total Grade <span className="required-mark">*</span></label>
                <input
                  type="number"
                  id="percentage"
                  name="percentage"
                  min="0"
                  max="100"
                  className={`form-input ${errors.percentage ? 'error' : ''}`}
                  value={contentData.percentage}
                  onChange={handleInputChange}
                  placeholder="Weight in final grade calculation"
                />
                {errors.percentage && <div className="error-message">{errors.percentage}</div>}
              </div>
              
              {/* Assignment-specific fields */}
              {contentData.task_type === 'assignment' && (
                <>
                  <div className="form-row">
                    <label htmlFor="start_date">Start Date <span className="required-mark">*</span></label>
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      className={`form-input ${errors.start_date ? 'error' : ''}`}
                      value={contentData.start_date}
                      onChange={handleInputChange}
                    />
                    {errors.start_date && <div className="error-message">{errors.start_date}</div>}
                  </div>
                  
                  <div className="form-row">
                    <label htmlFor="end_date">End Date <span className="required-mark">*</span></label>
                    <input
                      type="date"
                      id="end_date"
                      name="end_date"
                      className={`form-input ${errors.end_date ? 'error' : ''}`}
                      value={contentData.end_date}
                      onChange={handleInputChange}
                    />
                    {errors.end_date && <div className="error-message">{errors.end_date}</div>}
                  </div>
                  
                  <div className="form-row">
                    <label htmlFor="upload_material">Allowed Upload Formats <span className="required-mark">*</span></label>
                    <input
                      type="text"
                      id="upload_material"
                      name="upload_material"
                      className={`form-input ${errors.upload_material ? 'error' : ''}`}
                      value={contentData.upload_material}
                      onChange={handleInputChange}
                      placeholder="e.g., pdf,doc,docx"
                    />
                    {errors.upload_material && <div className="error-message">{errors.upload_material}</div>}
                    <div className="form-hint">Comma-separated list of file formats</div>
                  </div>
                  
                  <div className="form-row">
                    <label htmlFor="body">Assignment File <span className="required-mark">*</span></label>
                    <input
                      type="file"
                      id="body"
                      name="body"
                      ref={fileInputRef}
                      className={`form-input ${errors.file ? 'error' : ''}`}
                      onChange={handleFileChange}
                    />
                    {errors.file && <div className="error-message">{errors.file}</div>}
                    <div className="form-hint">Upload the assignment description or materials</div>
                  </div>
                </>
              )}
              
              {/* Assessment-specific fields */}
              {contentData.task_type === 'assessment' && (
                <div className="form-row">
                  <label htmlFor="question_count">Number of Questions <span className="required-mark">*</span></label>
                  <input
                    type="number"
                    id="question_count"
                    name="question_count"
                    min="1"
                    className={`form-input ${errors.question_count ? 'error' : ''}`}
                    value={contentData.question_count}
                    onChange={handleInputChange}
                    placeholder="Total number of questions"
                  />
                  {errors.question_count && <div className="error-message">{errors.question_count}</div>}
                </div>
              )}
            </>
          )}
          
          {/* Document-specific fields */}
          {contentData.content_type === 'document' && (
            <div className="form-row">
              <label htmlFor="body">Document File <span className="required-mark">*</span></label>
              <input
                type="file"
                id="body"
                name="body"
                ref={fileInputRef}
                className={`form-input ${errors.file ? 'error' : ''}`}
                onChange={handleFileChange}
              />
              {errors.file && <div className="error-message">{errors.file}</div>}
              <div className="form-hint">Upload a document (PDF, DOC, etc.)</div>
            </div>
          )}
          
          {/* Visual Material-specific fields */}
          {contentData.content_type === 'visual_material' && (
            <>
              <div className="form-row">
                <label htmlFor="duration">Duration (minutes) <span className="required-mark">*</span></label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  min="1"
                  className={`form-input ${errors.duration ? 'error' : ''}`}
                  value={contentData.duration}
                  onChange={handleInputChange}
                  placeholder="Length of the visual material"
                />
                {errors.duration && <div className="error-message">{errors.duration}</div>}
              </div>
              
              <div className="form-row">
                <label htmlFor="body">Visual File <span className="required-mark">*</span></label>
                <input
                  type="file"
                  id="body"
                  name="body"
                  ref={fileInputRef}
                  className={`form-input ${errors.file ? 'error' : ''}`}
                  onChange={handleFileChange}
                />
                {errors.file && <div className="error-message">{errors.file}</div>}
                <div className="form-hint">Upload a video, image, or other visual content</div>
              </div>
            </>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
            
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSectionContent;