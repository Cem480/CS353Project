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
    upload_material: 'pdf', // Default allowed upload format (single format)
    // Fields for visual material
    duration: 10 // Default duration in minutes
  });
  
  // Assessment creation state
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [showAssessmentCreator, setShowAssessmentCreator] = useState(false);
  
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
    
    // Handle database constraints based on your schema
    let processedValue = value;
    
    // upload_material appears to be very short (like "zip", "pdf") - limit to 3 chars
    if (name === 'upload_material' && value.length > 3) {
      processedValue = value.substring(0, 3);
    }
    
    // Handle other potential constraints
    if (name === 'task_type' && value.length > 10) {
      processedValue = value.substring(0, 10);
    }
    
    // For content_type, map long values to shorter ones if needed
    if (name === 'content_type') {
      if (value === 'visual_material') {
        processedValue = 'visual'; // Shorten to fit constraints
      }
    }
    
    setContentData({
      ...contentData,
      [name]: processedValue
    });
    
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    // Show assessment creator when task type is assessment
    if (name === 'task_type' && processedValue === 'assessment') {
      setShowAssessmentCreator(true);
    } else if (name === 'task_type' && processedValue !== 'assessment') {
      setShowAssessmentCreator(false);
      setAssessmentQuestions([]);
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
  
  // Assessment Questions Management
  const addQuestion = (type = 'multiple_choice') => {
    const newQuestion = {
      id: Date.now(),
      question_body: '',
      question_type: type,
      max_time: 5,
      options: type === 'multiple_choice' ? [
        { id: 1, text: '', is_correct: false },
        { id: 2, text: '', is_correct: false }
      ] : [],
      correct_answer: type === 'text' ? '' : null,
      explanation: ''
    };
    
    setAssessmentQuestions(prev => [...prev, newQuestion]);
  };
  
  const removeQuestion = (questionId) => {
    setAssessmentQuestions(prev => prev.filter(q => q.id !== questionId));
  };
  
  const updateQuestion = (questionId, field, value) => {
    setAssessmentQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, [field]: value } : q)
    );
  };
  
  const addOption = (questionId) => {
    setAssessmentQuestions(prev => 
      prev.map(q => q.id === questionId ? {
        ...q,
        options: [...q.options, {
          id: Date.now(),
          text: '',
          is_correct: false
        }]
      } : q)
    );
  };
  
  const removeOption = (questionId, optionId) => {
    setAssessmentQuestions(prev => 
      prev.map(q => q.id === questionId ? {
        ...q,
        options: q.options.filter(opt => opt.id !== optionId)
      } : q)
    );
  };
  
  const updateOption = (questionId, optionId, field, value) => {
    setAssessmentQuestions(prev => 
      prev.map(q => q.id === questionId ? {
        ...q,
        options: q.options.map(opt => 
          opt.id === optionId ? { ...opt, [field]: value } : opt
        )
      } : q)
    );
  };
  
  const setCorrectAnswer = (questionId, optionId) => {
    setAssessmentQuestions(prev => 
      prev.map(q => q.id === questionId ? {
        ...q,
        options: q.options.map(opt => ({
          ...opt,
          is_correct: opt.id === optionId
        }))
      } : q)
    );
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
    if ((contentData.content_type === 'document' || contentData.content_type === 'visual') && !selectedFile) {
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
        if (assessmentQuestions.length === 0) {
          newErrors.assessment_questions = 'At least one question is required for assessment';
        }
        
        // Validate each question
        assessmentQuestions.forEach((question, index) => {
          if (!question.question_body.trim()) {
            newErrors[`question_${question.id}_body`] = `Question ${index + 1} text is required`;
          }
          
          if (question.question_type === 'multiple_choice') {
            if (question.options.length < 2) {
              newErrors[`question_${question.id}_options`] = `Question ${index + 1} must have at least 2 options`;
            }
            
            const hasCorrectAnswer = question.options.some(opt => opt.is_correct);
            if (!hasCorrectAnswer) {
              newErrors[`question_${question.id}_correct`] = `Question ${index + 1} must have a correct answer selected`;
            }
          } else if (question.question_type === 'text' && !question.correct_answer?.trim()) {
            newErrors[`question_${question.id}_answer`] = `Question ${index + 1} must have a correct answer`;
          }
        });
      }
    }
    
    // Visual material specific validations
    if (contentData.content_type === 'visual') {
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
      
      // For assessments, we need to set the question_count from actual questions
      if (contentData.content_type === 'task' && contentData.task_type === 'assessment') {
        formData.set('question_count', assessmentQuestions.length);
      }
      
      console.log('Submitting content with data:', contentData);
      console.log('File:', selectedFile);
      console.log('Assessment questions:', assessmentQuestions);
      
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
      
      // If this is an assessment and we have questions, submit them separately
      if (contentData.content_type === 'task' && contentData.task_type === 'assessment' && assessmentQuestions.length > 0) {
        try {
          // Format questions for backend
          const formattedQuestions = assessmentQuestions.map((q, index) => ({
            question_id: index + 1,
            question_body: q.question_body,
            max_time: parseInt(q.max_time) || 5,
            // For multiple choice, we can store options in the question_body as JSON
            // or create a separate options submission
            options: q.question_type === 'multiple_choice' ? q.options : null,
            correct_answer: q.question_type === 'text' ? q.correct_answer : 
                           q.question_type === 'true_false' ? q.correct_answer :
                           q.options?.find(opt => opt.is_correct)?.text || null
          }));
          
          // Submit questions - this might need to be adapted based on your backend API
          const questionsResponse = await fetch(`http://localhost:5001/api/course/${courseId}/section/${sectionId}/content/${data.content_id}/questions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ questions: formattedQuestions })
          });
          
          if (!questionsResponse.ok) {
            console.warn('Failed to submit questions, but content was created successfully');
          }
        } catch (questionError) {
          console.error('Error submitting questions:', questionError);
          // Don't fail the whole process if questions fail
        }
      }
      
      setSuccessMessage('Content added successfully!');
      
      // Reset form after successful submission
      setContentData({
        ...contentData,
        title: '',
        allocated_time: ''
      });
      setSelectedFile(null);
      setAssessmentQuestions([]);
      setShowAssessmentCreator(false);
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
              <option value="visual">Visual Material</option>
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
                    <label htmlFor="upload_material">Allowed Upload Format <span className="required-mark">*</span></label>
                    <select
                      id="upload_material"
                      name="upload_material"
                      className={`form-input ${errors.upload_material ? 'error' : ''}`}
                      value={contentData.upload_material}
                      onChange={handleInputChange}
                    >
                      <option value="pdf">PDF</option>
                      <option value="doc">DOC</option>
                      <option value="zip">ZIP</option>
                      <option value="txt">TXT</option>
                      <option value="jpg">JPG</option>
                      <option value="png">PNG</option>
                    </select>
                    {errors.upload_material && <div className="error-message">{errors.upload_material}</div>}
                    <div className="form-hint">Select the allowed file format for submissions</div>
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
                <>
                  {errors.assessment_questions && (
                    <div className="error-message" style={{marginBottom: '20px'}}>
                      {errors.assessment_questions}
                    </div>
                  )}
                  
                  <div className="assessment-creator-section">
                    <h4>Assessment Questions ({assessmentQuestions.length})</h4>
                    
                    <div className="add-question-buttons" style={{marginBottom: '20px'}}>
                      <button 
                        type="button"
                        className="add-button"
                        onClick={() => addQuestion('multiple_choice')}
                        style={{marginRight: '10px'}}
                      >
                        + Multiple Choice
                      </button>
                      <button 
                        type="button"
                        className="add-button"
                        onClick={() => addQuestion('text')}
                        style={{marginRight: '10px'}}
                      >
                        + Text Answer
                      </button>
                      <button 
                        type="button"
                        className="add-button"
                        onClick={() => addQuestion('true_false')}
                      >
                        + True/False
                      </button>
                    </div>
                    
                    {assessmentQuestions.map((question, index) => (
                      <div key={question.id} className="question-card" style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '20px',
                        backgroundColor: '#f9f9f9'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                          <span style={{fontWeight: '600'}}>Question {index + 1}</span>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <select
                              value={question.question_type}
                              onChange={(e) => updateQuestion(question.id, 'question_type', e.target.value)}
                              style={{padding: '5px 8px', border: '1px solid #ccc', borderRadius: '4px'}}
                            >
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="text">Text Answer</option>
                              <option value="true_false">True/False</option>
                            </select>
                            <input
                              type="number"
                              value={question.max_time}
                              onChange={(e) => updateQuestion(question.id, 'max_time', parseInt(e.target.value) || 5)}
                              placeholder="Time (min)"
                              style={{width: '80px', padding: '5px 8px', border: '1px solid #ccc', borderRadius: '4px'}}
                              min="1"
                            />
                            <button 
                              type="button"
                              onClick={() => removeQuestion(question.id)}
                              style={{
                                background: '#ff4757',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '25px',
                                height: '25px',
                                cursor: 'pointer'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        <div className="form-row">
                          <label>
                            Question Text *
                            <textarea
                              value={question.question_body}
                              onChange={(e) => updateQuestion(question.id, 'question_body', e.target.value)}
                              className={`form-input ${errors[`question_${question.id}_body`] ? 'error' : ''}`}
                              placeholder="Enter your question here"
                              rows={2}
                            />
                            {errors[`question_${question.id}_body`] && 
                              <span className="error-message">{errors[`question_${question.id}_body`]}</span>}
                          </label>
                        </div>

                        {/* Multiple Choice Options */}
                        {question.question_type === 'multiple_choice' && (
                          <div style={{marginTop: '15px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                              <span style={{fontWeight: '500'}}>Answer Options</span>
                              <button 
                                type="button"
                                onClick={() => addOption(question.id)}
                                style={{
                                  padding: '5px 10px',
                                  background: '#e8f4f8',
                                  border: '1px solid #b8daff',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                + Add Option
                              </button>
                            </div>
                            
                            {errors[`question_${question.id}_options`] && 
                              <div className="error-message">{errors[`question_${question.id}_options`]}</div>}
                            {errors[`question_${question.id}_correct`] && 
                              <div className="error-message">{errors[`question_${question.id}_correct`]}</div>}

                            {question.options.map((option, optIndex) => (
                              <div key={option.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '10px'
                              }}>
                                <input
                                  type="radio"
                                  name={`question_${question.id}_correct`}
                                  checked={option.is_correct}
                                  onChange={() => setCorrectAnswer(question.id, option.id)}
                                  style={{width: 'auto', margin: '0'}}
                                />
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => updateOption(question.id, option.id, 'text', e.target.value)}
                                  className={`form-input ${errors[`question_${question.id}_option_${option.id}`] ? 'error' : ''}`}
                                  placeholder={`Option ${optIndex + 1}`}
                                  style={{flex: '1'}}
                                />
                                {question.options.length > 2 && (
                                  <button 
                                    type="button"
                                    onClick={() => removeOption(question.id, option.id)}
                                    style={{
                                      background: '#ff6b7a',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'pointer',
                                      fontSize: '14px'
                                    }}
                                  >
                                    ×
                                  </button>
                                )}
                                {errors[`question_${question.id}_option_${option.id}`] && 
                                  <span className="error-message" style={{display: 'block', width: '100%'}}>
                                    {errors[`question_${question.id}_option_${option.id}`]}
                                  </span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* True/False Options */}
                        {question.question_type === 'true_false' && (
                          <div style={{display: 'flex', gap: '20px', marginTop: '10px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                              <input
                                type="radio"
                                name={`question_${question.id}_tf`}
                                checked={question.correct_answer === 'true'}
                                onChange={() => updateQuestion(question.id, 'correct_answer', 'true')}
                                style={{width: 'auto', margin: '0'}}
                              />
                              True
                            </label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
                              <input
                                type="radio"
                                name={`question_${question.id}_tf`}
                                checked={question.correct_answer === 'false'}
                                onChange={() => updateQuestion(question.id, 'correct_answer', 'false')}
                                style={{width: 'auto', margin: '0'}}
                              />
                              False
                            </label>
                          </div>
                        )}

                        {/* Text Answer */}
                        {question.question_type === 'text' && (
                          <div className="form-row">
                            <label>
                              Correct Answer *
                              <input
                                type="text"
                                value={question.correct_answer || ''}
                                onChange={(e) => updateQuestion(question.id, 'correct_answer', e.target.value)}
                                className={`form-input ${errors[`question_${question.id}_answer`] ? 'error' : ''}`}
                                placeholder="Enter the correct answer"
                              />
                              {errors[`question_${question.id}_answer`] && 
                                <span className="error-message">{errors[`question_${question.id}_answer`]}</span>}
                            </label>
                          </div>
                        )}

                        {/* Explanation */}
                        <div className="form-row">
                          <label>
                            Explanation (Optional)
                            <textarea
                              value={question.explanation}
                              onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                              className="form-input"
                              placeholder="Explain the correct answer (shown after submission)"
                              rows={2}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
          {contentData.content_type === 'visual' && (
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

      <style jsx>{`
        .add-button {
          background-color: #0c6349;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s, transform 0.2s;
          font-size: 14px;
        }

        .add-button:hover {
          background-color: #09553d;
          transform: translateY(-2px);
        }

        .assessment-creator-section {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          background-color: #fafafa;
        }

        .assessment-creator-section h4 {
          margin-top: 0;
          color: #333;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 10px;
        }

        .add-question-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .question-card {
          transition: all 0.3s ease;
        }

        .question-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        @media (max-width: 768px) {
          .add-question-buttons {
            flex-direction: column;
          }
          
          .add-button {
            width: 100%;
            margin-bottom: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default AddSectionContent;