import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AddSection.css';
import { getCurrentUser } from '../../services/auth';

const AddSection = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State variables
  const [activeTab, setActiveTab] = useState('sections'); // 'sections' or 'content'
  const [courseName, setCourseName] = useState('');
  const [sections, setSections] = useState([]);
  const [contents, setContents] = useState([]);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showContentForm, setShowContentForm] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  
  // Forms state
  const [sectionForm, setSectionForm] = useState({
    title: '',
    description: '',
    order_number: '',
    allocated_time: ''
  });
  
  const [contentForm, setContentForm] = useState({
    title: '',
    allocated_time: '',
    content_type: '',
    // For task type
    passing_grade: '',
    max_time: '',
    task_type: '',
    percentage: '',
    // For task type - assessment
    question_count: '',
    // For task type - assignment
    start_date: '',
    end_date: '',
    upload_material: 'yes',
    body: '',
    // For visual material
    duration: '',
  });
  
  // Check authentication and fetch course data
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    } else if (user.role !== 'instructor') {
      navigate('/home');
      return;
    }
    
    fetchCourseData();
    fetchSections();
  }, [courseId]);
  
  // Fetch course data
  const fetchCourseData = async () => {
    try {
      // Simulated data for this demo - in real app you'd fetch from your API
      setCourseName('Course Name'); // Replace with actual API call
    } catch (error) {
      console.error('Error fetching course data:', error);
      setErrorMessage('Failed to load course data');
    }
  };
  
  // Fetch sections
  const fetchSections = async () => {
    try {
      // Simulated data for demo - replace with actual API call
      const mockSections = [
        { 
          sec_id: 'S1A2B3C4',
          title: 'Introduction to the Course',
          description: 'Overview of what we will learn',
          order_number: 1,
          allocated_time: 30,
        },
        {
          sec_id: 'S5D6E7F8',
          title: 'Basic Concepts',
          description: 'Learning the fundamentals',
          order_number: 2,
          allocated_time: 60,
        }
      ];
      
      setSections(mockSections);
    } catch (error) {
      console.error('Error fetching sections:', error);
      setErrorMessage('Failed to load course sections');
    }
  };
  
  // Fetch content for a section
  const fetchSectionContent = async (sectionId) => {
    try {
      // Simulated data - replace with actual API call
      const mockContents = [
        {
          content_id: 'CT1A2B3C',
          title: 'Introduction Video',
          allocated_time: 15,
          content_type: 'visual_material',
          duration: 900 // 15 minutes in seconds
        },
        {
          content_id: 'CT4D5E6F',
          title: 'Course Syllabus',
          allocated_time: 10,
          content_type: 'document'
        },
        {
          content_id: 'CT7G8H9I',
          title: 'Initial Assessment',
          allocated_time: 20,
          content_type: 'task',
          task_type: 'assessment'
        }
      ];
      
      setContents(mockContents);
    } catch (error) {
      console.error('Error fetching section content:', error);
      setErrorMessage('Failed to load section content');
    }
  };
  
  // Handle section form input changes
  const handleSectionInputChange = (e) => {
    const { name, value } = e.target;
    setSectionForm({
      ...sectionForm,
      [name]: value
    });
  };
  
  // Handle content form input changes
  const handleContentInputChange = (e) => {
    const { name, value } = e.target;
    setContentForm({
      ...contentForm,
      [name]: value
    });
  };
  
  // Open section form
  const openSectionForm = () => {
    setSectionForm({
      title: '',
      description: '',
      order_number: sections.length + 1,
      allocated_time: ''
    });
    setShowSectionForm(true);
  };
  
  // Close section form
  const closeSectionForm = () => {
    setShowSectionForm(false);
  };
  
  // Open content form
  const openContentForm = () => {
    if (!selectedSectionId) {
      setErrorMessage('Please select a section first');
      return;
    }
    
    setContentForm({
      title: '',
      allocated_time: '',
      content_type: '',
      passing_grade: '70', // Default values
      max_time: '60',
      task_type: 'assessment',
      percentage: '100',
      question_count: '10',
      start_date: '',
      end_date: '',
      upload_material: 'yes',
      body: '',
      duration: '',
    });
    
    setSelectedContentType('');
    setShowContentForm(true);
  };
  
  // Close content form
  const closeContentForm = () => {
    setShowContentForm(false);
    setSelectedContentType('');
    setUploadedFile(null);
  };
  
  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };
  
  // Remove uploaded file
  const removeUploadedFile = () => {
    setUploadedFile(null);
  };
  
  // Submit section form
  const submitSectionForm = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!sectionForm.title || !sectionForm.order_number || !sectionForm.allocated_time) {
      setErrorMessage('Please fill all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const requestData = {
        title: sectionForm.title,
        description: sectionForm.description || '',
        order_number: parseInt(sectionForm.order_number),
        allocated_time: parseInt(sectionForm.allocated_time)
      };
      
      // Make API call to add section
      const response = await fetch(`http://localhost:5001/api/add/course/${courseId}/section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Section added successfully!');
        fetchSections(); // Refresh the sections list
        setShowSectionForm(false);
      } else {
        setErrorMessage(data.message || 'Failed to add section');
      }
    } catch (error) {
      console.error('Error adding section:', error);
      setErrorMessage('An error occurred while adding the section');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Submit content form
  const submitContentForm = async (e) => {
    e.preventDefault();
    
    if (!contentForm.title || !contentForm.allocated_time || !selectedContentType) {
      setErrorMessage('Please fill all required fields and select a content type');
      return;
    }
    
    // Validate based on content type
    if (selectedContentType === 'document' || selectedContentType === 'visual_material') {
      if (!uploadedFile) {
        setErrorMessage('Please upload a file');
        return;
      }
    }
    
    if (selectedContentType === 'task') {
      if (!contentForm.passing_grade || !contentForm.max_time || !contentForm.task_type || !contentForm.percentage) {
        setErrorMessage('Please fill all task fields');
        return;
      }
      
      if (contentForm.task_type === 'assessment' && !contentForm.question_count) {
        setErrorMessage('Please enter the number of questions');
        return;
      }
      
      if (contentForm.task_type === 'assignment') {
        if (!contentForm.start_date || !contentForm.end_date) {
          setErrorMessage('Please enter start and end dates');
          return;
        }
      }
    }
    
    if (selectedContentType === 'visual_material' && !contentForm.duration) {
      setErrorMessage('Please enter the duration');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', contentForm.title);
      formData.append('allocated_time', contentForm.allocated_time);
      formData.append('content_type', selectedContentType);
      
      // Add type-specific fields
      if (selectedContentType === 'task') {
        formData.append('passing_grade', contentForm.passing_grade);
        formData.append('max_time', contentForm.max_time);
        formData.append('task_type', contentForm.task_type);
        formData.append('percentage', contentForm.percentage);
        
        if (contentForm.task_type === 'assessment') {
          formData.append('question_count', contentForm.question_count);
        }
        
        if (contentForm.task_type === 'assignment') {
          formData.append('start_date', contentForm.start_date);
          formData.append('end_date', contentForm.end_date);
          formData.append('upload_material', contentForm.upload_material);
          formData.append('body', contentForm.body);
        }
      }
      
      if (selectedContentType === 'visual_material') {
        formData.append('duration', contentForm.duration);
      }
      
      // Add file if uploading document or visual material
      if (uploadedFile && (selectedContentType === 'document' || selectedContentType === 'visual_material')) {
        formData.append('body', uploadedFile);
      }
      
      // Make API call to add content
      const response = await fetch(`http://localhost:5001/api/add/course/${courseId}/section/${selectedSectionId}/content`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Content added successfully!');
        fetchSectionContent(selectedSectionId); // Refresh content list
        setShowContentForm(false);
        setUploadedFile(null);
      } else {
        setErrorMessage(data.message || 'Failed to add content');
      }
    } catch (error) {
      console.error('Error adding content:', error);
      setErrorMessage('An error occurred while adding the content');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle section selection for content tab
  const handleSectionSelect = (e) => {
    const sectionId = e.target.value;
    setSelectedSectionId(sectionId);
    if (sectionId) {
      fetchSectionContent(sectionId);
    }
  };
  
  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Go back to instructor dashboard
  const goBack = () => {
    navigate('/home');
  };
  
  return (
    <div className="add-section-container">
      {/* Header */}
      <div className="section-header">
        <button className="back-button" onClick={goBack}>←</button>
        <h1 className="course-title">{courseName}</h1>
      </div>
      
      {/* Success message */}
      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="error-message" style={{marginBottom: '20px'}}>
          {errorMessage}
        </div>
      )}
      
      {/* Tabs */}
      <div className="content-tabs">
        <div 
          className={`content-tab ${activeTab === 'sections' ? 'active' : ''}`}
          onClick={() => setActiveTab('sections')}
        >
          Course Sections
        </div>
        <div 
          className={`content-tab ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Course Content
        </div>
      </div>
      
      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <>
          {/* Sections List */}
          <div className="sections-container">
            <div className="sections-header">
              <h2 className="sections-title">Course Sections</h2>
              <button className="add-btn" onClick={openSectionForm}>
                <i>+</i> Add Section
              </button>
            </div>
            
            {sections.length > 0 ? (
              <ul className="section-list">
                {sections.map((section) => (
                  <li className="section-item" key={section.sec_id}>
                    <div className="section-info">
                      <div className="section-item-title">{section.title}</div>
                      <div className="section-item-meta">
                        <span>Order: {section.order_number}</span>
                        <span>Time: {section.allocated_time} min</span>
                      </div>
                    </div>
                    <div className="section-actions">
                      <button 
                        className="section-action-btn"
                        onClick={() => {
                          setSelectedSectionId(section.sec_id);
                          setActiveTab('content');
                          fetchSectionContent(section.sec_id);
                        }}
                      >
                        Add Content
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{padding: '20px', textAlign: 'center'}}>
                No sections added yet. Create your first section to get started.
              </p>
            )}
          </div>
          
          {/* Section Form */}
          {showSectionForm && (
            <div className="section-form-container">
              <h2 className="form-title">Add New Section</h2>
              <form onSubmit={submitSectionForm}>
                <div className="form-row">
                  <label htmlFor="title">Section Title *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    className="form-input"
                    value={sectionForm.title}
                    onChange={handleSectionInputChange}
                    placeholder="Enter section title"
                    required
                  />
                </div>
                
                <div className="form-row">
                  <label htmlFor="description">Section Description</label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-input"
                    value={sectionForm.description}
                    onChange={handleSectionInputChange}
                    placeholder="Enter section description"
                  />
                </div>
                
                <div className="form-row-2">
                  <div className="form-row">
                    <label htmlFor="order_number">Order Number *</label>
                    <input
                      type="number"
                      id="order_number"
                      name="order_number"
                      className="form-input"
                      value={sectionForm.order_number}
                      onChange={handleSectionInputChange}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <label htmlFor="allocated_time">Time (minutes) *</label>
                    <input
                      type="number"
                      id="allocated_time"
                      name="allocated_time"
                      className="form-input"
                      value={sectionForm.allocated_time}
                      onChange={handleSectionInputChange}
                      min="1"
                      placeholder="e.g. 60"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={closeSectionForm}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Section'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
      
      {/* Content Tab */}
      {activeTab === 'content' && (
        <>
          {/* Section Selector */}
          <div className="content-container">
            <div className="content-header">
              <h2 className="content-title">Course Content</h2>
              <div className="content-section-dropdown">
                <select 
                  className="section-select"
                  onChange={handleSectionSelect}
                  value={selectedSectionId}
                >
                  <option value="">Select a section</option>
                  {sections.map((section) => (
                    <option key={section.sec_id} value={section.sec_id}>
                      {section.order_number}. {section.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedSectionId ? (
              <>
                <div style={{padding: '15px 20px', borderBottom: '1px solid var(--gray-light)'}}>
                  <button className="add-btn" onClick={openContentForm}>
                    <i>+</i> Add Content
                  </button>
                </div>
                
                {contents.length > 0 ? (
                  <ul className="content-list">
                    {contents.map((content) => (
                      <li className="content-item" key={content.content_id}>
                        <div className="content-info">
                          <div className="content-item-title">
                            {content.title}
                            <span className={`content-type-badge type-${content.content_type === 'visual_material' ? 'visual' : content.content_type}`}>
                              {content.content_type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="content-item-meta">
                            Time: {content.allocated_time} min
                            {content.content_type === 'task' && content.task_type && (
                              ` | Type: ${content.task_type}`
                            )}
                          </div>
                        </div>
                        <div className="content-actions">
                          <button className="content-action-btn">Edit</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{padding: '20px', textAlign: 'center'}}>
                    No content added to this section yet.
                  </p>
                )}
              </>
            ) : (
              <p style={{padding: '20px', textAlign: 'center'}}>
                Please select a section to view or add content.
              </p>
            )}
          </div>
          
          {/* Content Form */}
          {showContentForm && (
            <div className="content-form-container">
              <h2 className="form-title">Add Content to Section</h2>
              
              {/* Content Type Selector */}
              {!selectedContentType && (
                <>
                  <h3 style={{marginBottom: '15px'}}>Select Content Type</h3>
                  <div className="content-type-selector">
                    <div 
                      className={`type-option ${selectedContentType === 'document' ? 'active' : ''}`}
                      onClick={() => setSelectedContentType('document')}
                    >
                      <div className="type-option-icon">📄</div>
                      <div className="type-option-title">Document</div>
                      <div className="type-option-desc">Upload PDF, presentation, or other document</div>
                    </div>
                    
                    <div 
                      className={`type-option ${selectedContentType === 'visual_material' ? 'active' : ''}`}
                      onClick={() => setSelectedContentType('visual_material')}
                    >
                      <div className="type-option-icon">🎬</div>
                      <div className="type-option-title">Video/Audio</div>
                      <div className="type-option-desc">Upload video or audio content</div>
                    </div>
                    
                    <div 
                      className={`type-option ${selectedContentType === 'task' ? 'active' : ''}`}
                      onClick={() => setSelectedContentType('task')}
                    >
                      <div className="type-option-icon">📝</div>
                      <div className="type-option-title">Task</div>
                      <div className="type-option-desc">Create assessment or assignment</div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Content Form based on selected type */}
              {selectedContentType && (
                <form onSubmit={submitContentForm}>
                  <div className="form-row">
                    <label htmlFor="content-title">Content Title *</label>
                    <input
                      type="text"
                      id="content-title"
                      name="title"
                      className="form-input"
                      value={contentForm.title}
                      onChange={handleContentInputChange}
                      placeholder="Enter content title"
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <label htmlFor="allocated_time">Time (minutes) *</label>
                    <input
                      type="number"
                      id="allocated_time"
                      name="allocated_time"
                      className="form-input"
                      value={contentForm.allocated_time}
                      onChange={handleContentInputChange}
                      min="1"
                      placeholder="Time required to complete"
                      required
                    />
                  </div>
                  
                  {/* Document Specific Fields */}
                  {selectedContentType === 'document' && (
                    <div className="form-row">
                      <label>Upload Document *</label>
                      <div className="file-upload-container">
                        {!uploadedFile ? (
                          <>
                            <div className="file-upload-icon">📄</div>
                            <p className="file-upload-text">Drag and drop your file or click to browse</p>
                            <input
                              type="file"
                              id="document-file"
                              style={{ display: 'none' }}
                              onChange={handleFileUpload}
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                            />
                            <label htmlFor="document-file" className="file-upload-btn">
                              Browse Files
                            </label>
                          </>
                        ) : (
                          <div className="file-details">
                            <span className="file-name">{uploadedFile.name}</span>
                            <span className="file-size">{formatFileSize(uploadedFile.size)}</span>
                            <button
                              type="button"
                              className="remove-file-btn"
                              onClick={removeUploadedFile}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Visual Material Specific Fields */}
                  {selectedContentType === 'visual_material' && (
                    <>
                      <div className="form-row">
                        <label htmlFor="duration">Duration (seconds) *</label>
                        <input
                          type="number"
                          id="duration"
                          name="duration"
                          className="form-input"
                          value={contentForm.duration}
                          onChange={handleContentInputChange}
                          min="1"
                          placeholder="Video/Audio duration in seconds"
                          required
                        />
                      </div>
                      
                      <div className="form-row">
                        <label>Upload Video/Audio *</label>
                        <div className="file-upload-container">
                          {!uploadedFile ? (
                            <>
                              <div className="file-upload-icon">🎬</div>
                              <p className="file-upload-text">Drag and drop your file or click to browse</p>
                              <input
                                type="file"
                                id="visual-file"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                accept="video/*,audio/*"
                              />
                              <label htmlFor="visual-file" className="file-upload-btn">
                                Browse Files
                              </label>
                            </>
                          ) : (
                            <div className="file-details">
                              <span className="file-name">{uploadedFile.name}</span>
                              <span className="file-size">{formatFileSize(uploadedFile.size)}</span>
                              <button
                                type="button"
                                className="remove-file-btn"
                                onClick={removeUploadedFile}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Task Specific Fields */}
                  {selectedContentType === 'task' && (
                    <>
                      <div className="form-row-2">
                        <div className="form-row">
                          <label htmlFor="passing_grade">Passing Grade (%) *</label>
                          <input
                            type="number"
                            id="passing_grade"
                            name="passing_grade"
                            className="form-input"
                            value={contentForm.passing_grade}
                            onChange={handleContentInputChange}
                            min="1"
                            max="100"
                            required
                          />
                        </div>
                        
                        <div className="form-row">
                          <label htmlFor="max_time">Time Limit (minutes) *</label>
                          <input
                            type="number"
                            id="max_time"
                            name="max_time"
                            className="form-input"
                            value={contentForm.max_time}
                            onChange={handleContentInputChange}
                            min="1"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="form-row-2">
                        <div className="form-row">
                          <label htmlFor="task_type">Task Type *</label>
                          <select
                            id="task_type"
                            name="task_type"
                            className="form-input"
                            value={contentForm.task_type}
                            onChange={handleContentInputChange}
                            required
                          >
                            <option value="assessment">Assessment</option>
                            <option value="assignment">Assignment</option>
                          </select>
                        </div>
                        
                        <div className="form-row">
                          <label htmlFor="percentage">Grade Percentage *</label>
                          <input
                            type="number"
                            id="percentage"
                            name="percentage"
                            className="form-input"
                            value={contentForm.percentage}
                            onChange={handleContentInputChange}
                            min="1"
                            max="100"
                            required
                          />
                        </div>
                      </div>
                      
                      {/* Assessment specific fields */}
                      {contentForm.task_type === 'assessment' && (
                        <div className="form-row">
                          <label htmlFor="question_count">Number of Questions *</label>
                          <input
                            type="number"
                            id="question_count"
                            name="question_count"
                            className="form-input"
                            value={contentForm.question_count}
                            onChange={handleContentInputChange}
                            min="1"
                            required
                          />
                        </div>
                      )}
                      
                      {/* Assignment specific fields */}
                      {contentForm.task_type === 'assignment' && (
                        <>
                          <div className="form-row date-inputs">
                            <div className="form-row">
                              <label htmlFor="start_date">Start Date *</label>
                              <input
                                type="date"
                                id="start_date"
                                name="start_date"
                                className="form-input"
                                value={contentForm.start_date}
                                onChange={handleContentInputChange}
                                required
                              />
                            </div>
                            
                            <div className="form-row">
                              <label htmlFor="end_date">End Date *</label>
                              <input
                                type="date"
                                id="end_date"
                                name="end_date"
                                className="form-input"
                                value={contentForm.end_date}
                                onChange={handleContentInputChange}
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="form-row">
                            <label htmlFor="upload_material">Allow File Upload</label>
                            <select
                              id="upload_material"
                              name="upload_material"
                              className="form-input"
                              value={contentForm.upload_material}
                              onChange={handleContentInputChange}
                            >
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                          
                          <div className="form-row">
                            <label htmlFor="body">Assignment Instructions *</label>
                            <textarea
                              id="body"
                              name="body"
                              className="form-input"
                              value={contentForm.body}
                              onChange={handleContentInputChange}
                              rows={5}
                              placeholder="Provide detailed instructions for this assignment"
                              required
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                  
                  <div className="form-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={closeContentForm}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="save-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Content'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AddSection;