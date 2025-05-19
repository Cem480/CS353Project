import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById, getCourseSections, getSectionContent } from '../../services/course';
import './CourseEditor.css';

const CourseEditor = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [currentSectionId, setCurrentSectionId] = useState(null);
  const [sectionContents, setSectionContents] = useState([]);
  const [activeTab, setActiveTab] = useState('sections'); // 'sections' or 'content'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch course data - using the regular course API instead of course_content
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setIsLoading(true);
        const courseData = await getCourseById(courseId);
        if (courseData.success) {
          setCourse(courseData.course);
        } else {
          throw new Error(courseData.message || 'Failed to load course');
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Failed to load course data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourseData();
  }, [courseId]);
  
  // Fetch course sections
  useEffect(() => {
    const fetchSections = async () => {
      try {
        setIsLoading(true);
        const sectionsData = await getCourseSections(courseId);
        if (sectionsData.success) {
          setSections(sectionsData.sections);
          // If sections exist, set the first one as current by default
          if (sectionsData.sections && sectionsData.sections.length > 0) {
            setCurrentSectionId(sectionsData.sections[0].sec_id);
          }
        } else {
          throw new Error(sectionsData.message || 'Failed to load sections');
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
        setError('Failed to load course sections. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSections();
  }, [courseId]);
  
  // Fetch section content when section changes
  useEffect(() => {
    if (!currentSectionId) return;
    
    const fetchSectionContent = async () => {
      try {
        setIsLoading(true);
        const contentData = await getSectionContent(courseId, currentSectionId);
        if (contentData.success) {
          setSectionContents(contentData.content || []);
        } else {
          throw new Error(contentData.message || 'Failed to load content');
        }
      } catch (err) {
        console.error('Error fetching section content:', err);
        setError('Failed to load section content. Please try again.');
        setSectionContents([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSectionContent();
  }, [courseId, currentSectionId]);
  
  // Handle section click
  const handleSectionClick = (sectionId) => {
    setCurrentSectionId(sectionId);
    setActiveTab('content');
  };
  
  // Handle add section
  const handleAddSection = () => {
    navigate(`/course/${courseId}/add-section`);
  };
  
  // Handle add content
  const handleAddContent = () => {
    if (!currentSectionId) {
      setError('Please select a section first.');
      return;
    }
    navigate(`/course/${courseId}/section/${currentSectionId}/add-content`);
  };
  
  // Handle back button
  const handleBack = () => {
    navigate('/instructor/courses');
  };
  
  if (isLoading && !course) {
    return <div className="loading">Loading course data...</div>;
  }
  
  if (error && !course) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="back-button-large" onClick={handleBack}>Back to My Courses</button>
      </div>
    );
  }
  
  return (
    <div className="course-editor">
      {/* Header */}
      <div className="editor-header">
        <button className="back-button" onClick={handleBack}>←</button>
        <h1>{course?.title || 'Course Editor'}</h1>
        {course && (
          <div className="course-status">
            Status: <span className={`status-badge status-${course.status}`}>{course.status}</span>
          </div>
        )}
      </div>
      
      {/* Main content area */}
      <div className="editor-content">
        {/* Tabs */}
        <div className="editor-tabs">
          <button 
            className={`tab-button ${activeTab === 'sections' ? 'active' : ''}`}
            onClick={() => setActiveTab('sections')}
          >
            Course Sections
          </button>
          <button 
            className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
            disabled={!currentSectionId}
          >
            Section Content
          </button>
        </div>
        
        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <div className="sections-tab">
            <div className="sections-header">
              <h2>Sections</h2>
              <button className="add-button" onClick={handleAddSection}>+ Add Section</button>
            </div>
            
            {sections.length === 0 ? (
              <div className="empty-state">
                <p>No sections added yet. Click "Add Section" to create your first section.</p>
              </div>
            ) : (
              <div className="sections-list">
                {sections.map((section) => (
                  <div 
                    key={section.sec_id} 
                    className={`section-card ${currentSectionId === section.sec_id ? 'active' : ''}`}
                    onClick={() => handleSectionClick(section.sec_id)}
                  >
                    <h3>{section.title}</h3>
                    <p>{section.description}</p>
                    <div className="section-meta">
                      <span>Order: {section.order_number}</span>
                      <span>Time: {section.allocated_time} min</span>
                    </div>
                    <div className="section-actions">
                      <button 
                        className="edit-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/course/${courseId}/edit-section/${section.sec_id}`);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Content Tab */}
        {activeTab === 'content' && currentSectionId && (
          <div className="content-tab">
            <div className="content-header">
              <h2>Content for: {sections.find(s => s.sec_id === currentSectionId)?.title}</h2>
              <button className="add-button" onClick={handleAddContent}>+ Add Content</button>
            </div>
            
            {sectionContents.length === 0 ? (
              <div className="empty-state">
                <p>No content added yet. Click "Add Content" to add materials to this section.</p>
              </div>
            ) : (
              <div className="content-list">
                {sectionContents.map((content) => (
                  <div key={content.content_id} className="content-card">
                    <div className={`content-type-badge ${content.content_type}`}>
                      {content.content_type.replace('_', ' ')}
                    </div>
                    <h3>{content.title}</h3>
                    <div className="content-meta">
                      <span>Time: {content.allocated_time} min</span>
                      <span>Order: {content.order_number}</span>
                    </div>
                    
                    {/* Content type specific info */}
                    {content.content_type === 'task' && content.task_info && (
                      <div className="task-info">
                        <p><strong>Task Type:</strong> {content.task_info.task_type}</p>
                        <p><strong>Passing Grade:</strong> {content.task_info.passing_grade}%</p>
                        <p><strong>Percentage of Grade:</strong> {content.task_info.percentage}%</p>
                      </div>
                    )}
                    
                    {/* Actions for content */}
                    <div className="content-actions">
                      <button 
                        className="view-button"
                        onClick={() => navigate(`/course/${courseId}/section/${currentSectionId}/content/${content.content_id}`)}
                      >
                        View
                      </button>
                      <button 
                        className="edit-button"
                        onClick={() => navigate(`/course/${courseId}/section/${currentSectionId}/edit-content/${content.content_id}`)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className="error-message-inline">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseEditor;