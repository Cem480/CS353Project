import React, { useState, useEffect } from 'react';
import './CoursePage.css';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { 
  getCourseInfo,
  getCourseSectionsForContent,
  getSectionContents,
  getContentDetail,
  markContentCompleted,
  getContentComments,
  addContentComment
} from '../../services/course';

// Helper function to get content type icon
const getContentTypeIcon = (content) => {
  if (content.isCompleted) return '✓';
  
  if (content.type === 'video' || content.content_type === 'video') return '📹';
  if (content.type === 'document' || content.content_type === 'document') return '📄';
  
  // For tasks, check the task_type
  if (content.type === 'task' || content.content_type === 'task') {
    if (content.task_type === 'assessment') return '📝';
    if (content.task_type === 'assignment') return '📋';
  }
  
  // Fallbacks based on string matching
  if (content.type?.includes('quiz') || content.title?.includes('Quiz') || 
      content.title?.includes('Assessment') || content.content_type?.includes('assessment')) {
    return '📝';
  }
  
  if (content.type?.includes('assignment') || content.title?.includes('Assignment') || 
      content.content_type?.includes('assignment')) {
    return '📋';
  }
  
  // Default icon
  return '📄';
};

// Base URL
const BASE_URL = 'http://localhost:5001';

// Helper function to fetch data with error handling
const fetchData = async (url, options = {}) => {
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

const CoursePage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  
  // State management
  const [courseTitle, setCourseTitle] = useState('');
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [activeContent, setActiveContent] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // Fetch course data
  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;
      
      setLoading(true);
      
      try {
        // Fetch course information
        const courseInfo = await getCourseInfo(courseId);
        setCourseTitle(courseInfo.title || 'Course Title');
        
        // Fetch sections
        const sectionsData = await getCourseSectionsForContent(courseId);
        
        if (!sectionsData || sectionsData.length === 0) {
          setSections([]);
          setLoading(false);
          return;
        }
        
        // Transform sections data
        const formattedSections = sectionsData.map(section => ({
          id: section.sec_id,
          title: section.section_title,
          orderNumber: section.order_number,
          contents: [] // Initialize with empty contents
        }));
        
        // Set sections first
        setSections(formattedSections);
        
        // Initialize expanded state
        const initialExpandedState = {};
        // Expand the first section by default
        if (formattedSections.length > 0) {
          initialExpandedState[formattedSections[0].id] = true;
        }
        setExpandedSections(initialExpandedState);
        
        // Set first section as active
        if (formattedSections.length > 0) {
          const firstSection = formattedSections[0];
          setActiveSection(firstSection);
          
          // Load content for first section asynchronously AFTER setting sections
          if (firstSection && (!firstSection.contents || firstSection.contents.length === 0)) {
            await loadSectionContent(firstSection.id, formattedSections);
          }
        }
      } catch (err) {
        console.error('Error loading course data:', err);
        setError('Failed to load course content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCourseData();
  }, [courseId]); // Only depend on courseId
  
  // Function to load section content - FIXED
  const loadSectionContent = async (sectionId, sectionsArray = sections) => {
    try {
      // Check if content is already loaded to prevent unnecessary API calls
      const targetSection = sectionsArray.find(s => s.id === sectionId);
      if (targetSection && targetSection.contents && targetSection.contents.length > 0) {
        // Content already loaded, just set this section as active
        setActiveSection(targetSection);
        return; // Return early to prevent recursion
      }
      
      // Get section content from API
      const contentsData = await getSectionContents(courseId, sectionId);
      
      // Format content data
      const formattedContents = contentsData.map(content => ({
        id: content.content_id,
        title: content.content_title,
        type: content.content_type.toLowerCase(),
        duration: `${content.allocated_time} min`,
        isCompleted: false // Default to not completed
      }));
      
      // Update sections with content
      const updatedSections = sectionsArray.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            contents: formattedContents
          };
        }
        return section;
      });
      
      // Update sections state
      setSections(updatedSections);
      
      // Find and set the active section from our updated array (important!)
      const updatedActiveSection = updatedSections.find(s => s.id === sectionId);
      if (updatedActiveSection) {
        setActiveSection(updatedActiveSection);
      }
      
    } catch (err) {
      console.error(`Error loading content for section ${sectionId}:`, err);
      setError(`Failed to load section content. ${err.message}`);
    }
  };
  
  // Load completion status - FIXED
  const loadCompletionStatus = async () => {
    if (!courseId || !user?.user_id || sections.length === 0) return;
    
    try {
      // Fetch completed items for this user and course
      const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/grades/${user.user_id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.warn('Could not fetch completion status');
        return;
      }
      
      const completedItems = await response.json();
      
      // Update sections with completion status
      const updatedSections = sections.map(section => {
        if (!section.contents || section.contents.length === 0) {
          return section; // Skip sections without loaded content
        }
        
        const updatedContents = section.contents.map(content => {
          // Check if this content is in the completed items list
          const isCompleted = completedItems.some(item => 
            item.section_id === section.id && 
            item.content_id === content.id && 
            item.grade !== null
          );
          
          return {
            ...content,
            isCompleted
          };
        });
        
        return {
          ...section,
          contents: updatedContents
        };
      });
      
      setSections(updatedSections);
      
      // Update active section
      if (activeSection) {
        const updatedActiveSection = updatedSections.find(s => s.id === activeSection.id);
        if (updatedActiveSection) {
          setActiveSection(updatedActiveSection);
        }
      }
      
    } catch (err) {
      console.error('Error loading completion status:', err);
    }
  };
  
  // Call loadCompletionStatus after loading sections - FIXED
  useEffect(() => {
    if (sections.length > 0 && !loading) {
      // Add condition to only load once the page is fully loaded
      loadCompletionStatus();
    }
  }, [sections.length, loading]); // Only depend on sections length, not the full sections object
  
  // Toggle section expansion - FIXED
  const toggleSection = (sectionId) => {
    // Toggle expanded state for this section
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
    
    // If expanding and content not loaded, load content
    if (!expandedSections[sectionId]) {
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        if (!section.contents || section.contents.length === 0) {
          // Only load content if not already loaded
          loadSectionContent(sectionId);
        } else {
          // If content already loaded, just set as active
          setActiveSection(section);
        }
      }
    }
  };
  
  // Open content modal
  const openContent = async (sectionId, contentId) => {
    try {
      // Fetch detailed content information
      const contentData = await getContentDetail(courseId, sectionId, contentId);
      
      if (contentData.success && contentData.content) {
        const content = contentData.content;
        
        // Handle different content types
        if (content.content_type === 'task' && content.task_type === 'assignment') {
          // For assignments, redirect to assignment page
          navigate(`/course/${courseId}/section/${sectionId}/assignment/${contentId}`);
          return;
        }
        
        // Store the contentId in the content object to use during markContentCompleted
        setActiveContent({
          ...content,
          content_id: contentId // Make sure content_id is set properly
        });
        
        // Try to fetch comments
        try {
          const commentsData = await getContentComments(courseId, sectionId, contentId);
          setComments(commentsData || []);
        } catch (err) {
          console.log('Error fetching comments:', err);
          setComments([]);
        }
      } else {
        throw new Error('Failed to fetch content details');
      }
    } catch (err) {
      console.error('Error loading content details:', err);
      setErrorMessage('Could not load content details. Please try again.');
      setShowErrorModal(true);
    }
  };
  
  // Close content modal
  const closeContent = () => {
    setActiveContent(null);
    setComments([]);
  };
  
  // Close error modal
  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage(null);
  };
  
  // Submit a comment
  const submitComment = async (event) => {
    event.preventDefault();
    
    if (!newComment.trim() || !activeContent) return;
    
    try {
      await addContentComment(courseId, activeSection.id, activeContent.content_id, user.user_id, newComment);
      
      // Optimistically add comment to UI
      setComments([
        {
          id: Date.now(), // Temporary ID
          user_id: user.user_id,
          first_name: user.first_name || user.user_id,
          last_name: user.last_name || '',
          text: newComment,
          timestamp: 'Just now'
        },
        ...comments
      ]);
      
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      // Still show the comment in UI but also show error
      setErrorMessage('Failed to save comment to server, but it\'s visible for now.');
      setShowErrorModal(true);
    }
  };
  
  // Mark content as completed
  const markContentCompleted = async () => {
    if (!activeContent || !activeContent.content_id) {
      console.error('Cannot mark content as completed: Missing content ID');
      setErrorMessage('Failed to mark content as completed. Content ID is missing.');
      setShowErrorModal(true);
      return;
    }
    
    try {
      const response = await fetch(`${BASE_URL}/api/complete/${courseId}/${activeSection.id}/${activeContent.content_id}/${user.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_completed: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark content as completed');
      }
      
      // Update UI to reflect completion
      const updatedSections = sections.map(section => {
        if (section.id === activeSection.id) {
          const updatedContents = section.contents.map(content => {
            if (content.id === activeContent.content_id) {
              return { ...content, isCompleted: true };
            }
            return content;
          });
          return { ...section, contents: updatedContents };
        }
        return section;
      });
      
      setSections(updatedSections);
      
      // Update active section
      const updatedActiveSection = updatedSections.find(s => s.id === activeSection.id);
      if (updatedActiveSection) {
        setActiveSection(updatedActiveSection);
      }
      
      // Close content modal
      closeContent();
      
    } catch (err) {
      console.error('Error marking content as completed:', err);
      setErrorMessage('Failed to mark content as completed. Please try again.');
      setShowErrorModal(true);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="course-page-loading-container">
        <div className="course-page-loading-spinner"></div>
        <p>Loading course content...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="course-page-error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/my-learning')} className="course-page-primary-button">
          Back to My Learning
        </button>
      </div>
    );
  }
  
  // Calculate total completed items and total items
  const calculateProgress = () => {
    let totalItems = 0;
    let completedItems = 0;
    
    sections.forEach(section => {
      if (section.contents) {
        totalItems += section.contents.length;
        section.contents.forEach(content => {
          if (content.isCompleted) {
            completedItems += 1;
          }
        });
      }
    });
    
    return { totalItems, completedItems };
  };
  
  const { totalItems, completedItems } = calculateProgress();
  
  return (
    <div className="course-page">
      {/* Header */}
      <header className="course-page-header">
        <div className="course-page-logo" onClick={() => navigate('/home')}>
          <span className="course-page-logo-text">LearnHub</span>
        </div>
        <div className="course-page-search-container">
          <input type="text" placeholder="Search in course" className="course-page-search-input" />
          <button className="course-page-search-button">Search</button>
        </div>
        <div className="course-page-header-right">
          <div className="course-page-language-selector">
            <span>English</span>
            <span className="course-page-dropdown-arrow">▼</span>
          </div>
          <div className="course-page-notifications-icon" onClick={() => navigate('/notifications')}>🔔</div>
          <div className="course-page-profile-icon" onClick={() => navigate('/profile')}>
            {user.user_id.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>
      
      {/* Error Modal */}
      {showErrorModal && (
        <div className="course-page-error-modal-overlay">
          <div className="course-page-error-modal">
            <div className="course-page-error-modal-header">
              <h3>localhost:3000 web sitesinin mesajı</h3>
            </div>
            <div className="course-page-error-modal-content">
              <p>{errorMessage || 'Failed to mark content as completed. Please try again.'}</p>
            </div>
            <div className="course-page-error-modal-footer">
              <button onClick={closeErrorModal} className="course-page-error-modal-button">
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Content Modal */}
      {activeContent && (
        <div className="course-page-content-modal-overlay">
          <div className="course-page-content-modal">
            <div className="course-page-content-modal-header">
              <h3>{activeContent.title}</h3>
              <button className="course-page-close-button" onClick={closeContent}>×</button>
            </div>
            
            <div className="course-page-content-modal-body">
              {activeContent.content_type === 'video' ? (
                <div className="course-page-video-container">
                  {activeContent.video_url ? (
                    <video 
                      controls 
                      width="100%" 
                      src={`${BASE_URL}${activeContent.video_url}`}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="course-page-placeholder">
                      <span className="course-page-placeholder-icon">▶️</span>
                      <p>Video not available</p>
                    </div>
                  )}
                </div>
              ) : activeContent.content_type === 'document' ? (
                <div className="course-page-document-container">
                  {activeContent.document_url ? (
                    <iframe 
                      src={`${BASE_URL}${activeContent.document_url}`} 
                      width="100%" 
                      height="500"
                      title="Document viewer"
                    ></iframe>
                  ) : (
                    <div className="course-page-placeholder">
                      <span className="course-page-placeholder-icon">📄</span>
                      <p>Document not available</p>
                    </div>
                  )}
                </div>
              ) : activeContent.task_type === 'assessment' ? (
                <div className="course-page-quiz-container">
                  <div className="course-page-quiz-info">
                    <div className="course-page-quiz-icon">📝</div>
                    <h4>Quiz: {activeContent.title}</h4>
                  </div>
                  
                  <div className="course-page-quiz-details">
                    <p>This quiz has {activeContent.question_count || '?'} questions.</p>
                    <p>Maximum time: {activeContent.max_time || '?'} minutes</p>
                    <p>Passing grade: {activeContent.passing_grade || '?'}%</p>
                  </div>
                  
                  {activeContent.questions && (
                    <div className="course-page-quiz-questions-preview">
                      <p>Questions will be displayed when you start the quiz.</p>
                      <button className="course-page-start-button">
                        Start Quiz
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="course-page-placeholder">
                  <span className="course-page-placeholder-icon">📄</span>
                  <p>{activeContent.title}</p>
                  <p>Content type: {activeContent.content_type}</p>
                </div>
              )}
            </div>
            
            {/* Comments Section */}
            <div className="course-page-content-modal-comments">
              <div className="course-page-comments-header">
                <h4>Comments ({comments.length})</h4>
              </div>
              
              <div className="course-page-comments-form">
                <textarea
                  className="course-page-comments-input"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                ></textarea>
                <button 
                  className="course-page-comments-submit"
                  onClick={submitComment}
                >
                  Post
                </button>
              </div>
              
              <div className="course-page-comments-list">
                {comments.length > 0 ? (
                  comments.map((comment, index) => (
                    <div key={comment.id || index} className="course-page-comment">
                      <div className="course-page-comment-header">
                        <span className="course-page-comment-author">
                          {comment.first_name} {comment.last_name}
                        </span>
                        <span className="course-page-comment-time">{comment.timestamp}</span>
                      </div>
                      <div className="course-page-comment-body">
                        {comment.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="course-page-no-comments">
                    No comments yet. Be the first to comment!
                  </div>
                )}
              </div>
            </div>
            
            <div className="course-page-content-modal-footer">
              <button 
                className="course-page-mark-complete-button"
                onClick={markContentCompleted}
              >
                Mark As Completed
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="course-page-container">
        {/* Left Sidebar */}
        <aside className="course-page-sidebar">
          <div className="course-page-title">
            <h2>{courseTitle}</h2>
          </div>
          
          {/* Course Material Section */}
          <div className="course-page-sidebar-section">
            <div className="course-page-sidebar-section-header">
              <span>Course Material</span>
            </div>
            
            <div className="course-page-sidebar-section-content">
              {sections.map((section) => (
                <React.Fragment key={section.id}>
                  <div 
                    className={`course-page-sidebar-item ${activeSection?.id === section.id ? 'active' : ''}`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className="course-page-section-icon">
                      {expandedSections[section.id] ? '▼' : '►'}
                    </span>
                    <span>Unit {section.orderNumber}: {section.title}</span>
                  </div>
                  
                  {/* If expanded, show sub-items */}
                  {section.contents && section.contents.length > 0 && expandedSections[section.id] && (
                    <div className="course-page-sidebar-subitems">
                      {section.contents.map((content) => (
                        <div 
                          key={content.id} 
                          className={`course-page-sidebar-subitem ${content.isCompleted ? 'completed' : ''}`}
                          onClick={() => openContent(section.id, content.id)}
                        >
                          <span className="course-page-content-icon">
                            {getContentTypeIcon(content)}
                          </span>
                          <span>{content.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* Grades Section */}
          <div className="course-page-sidebar-section">
            <div className="course-page-sidebar-section-header">
              <span>Grades</span>
            </div>
          </div>
          
          {/* Course Info Section */}
          <div className="course-page-sidebar-section">
            <div className="course-page-sidebar-section-header">
              <span>Course Info</span>
            </div>
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="course-page-content">
          {activeSection && (
            <div className="course-page-section">
              <div className="course-page-section-header">
                <h2>Unit {activeSection.orderNumber}: {activeSection.title}</h2>
                </div>
              
              <div className="course-page-section-info">
                <div className="course-page-time-info">
                  <span className="course-page-icon">🕒</span>
                  <span>0m of content remaining</span>
                </div>
              </div>
              
              <div className="course-page-section-description">
                <p>An engaging journey into the core principles and advanced methods.</p>
              </div>
              
              <div className="course-page-learning-objectives">
                <div className="course-page-learning-objectives-header" onClick={() => {}}>
                  <span className="course-page-icon">▼</span>
                  <span>Show Learning Objectives</span>
                </div>
              </div>
              
              {/* Section Content */}
              <div className="course-page-section-content">
                <div className="course-page-section-content-header">
                  <h3>Unit {activeSection.orderNumber}: {activeSection.title} Content</h3>
                </div>
                
                <div className="course-page-section-content-items">
                  {activeSection.contents && activeSection.contents.length > 0 ? (
                    <div className="course-page-content-list">
                      {activeSection.contents.map((content) => (
                        <div 
                          key={content.id} 
                          className={`course-page-content-item ${content.isCompleted ? 'completed' : ''}`}
                          onClick={() => openContent(activeSection.id, content.id)}
                        >
                          <div className="course-page-content-item-checkbox">
                            <input 
                              type="checkbox" 
                              checked={content.isCompleted} 
                              onChange={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              readOnly
                            />
                          </div>
                          <div className="course-page-content-item-icon">
                            {getContentTypeIcon(content)}
                          </div>
                          <div className="course-page-content-item-info">
                            <div className="course-page-content-item-title">{content.title}</div>
                            <div className="course-page-content-item-meta">
                              {content.type.charAt(0).toUpperCase() + content.type.slice(1)} • {content.duration}
                            </div>
                          </div>
                          <div className="course-page-content-item-action">
                            <span className="course-page-start-button">
                              {content.isCompleted ? 'Review' : 'Start'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="course-page-no-content">
                      <p>No content available for this section.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* Right Sidebar */}
        <aside className="course-page-progress-sidebar">
          <div className="course-page-progress-header">
            <h3>Your Course Progress</h3>
          </div>
          <div className="course-page-progress-content">
            <p className="course-page-progress-text">
              Stay on track with your learning goals
            </p>
            
            <div className="course-page-progress-stats">
              <div className="course-page-progress-stat">
                <div className="course-page-progress-number">{completedItems}</div>
                <div className="course-page-progress-label">Completed Items</div>
              </div>
              
              <div className="course-page-progress-stat">
                <div className="course-page-progress-number">{totalItems}</div>
                <div className="course-page-progress-label">Total Items</div>
              </div>
            </div>
          </div>
          
          <div className="course-page-lab-section">
            <div className="course-page-lab-header">
              <div className="course-page-lab-title">
                <span className="course-page-lab-icon">🧪</span>
                <span>LearnHub Lab Sandbox</span>
                <span className="course-page-beta-badge">BETA</span>
              </div>
            </div>
            
            <div className="course-page-lab-features">
              <ul>
                <li>Easily launch LearnHub's preconfigured environment for programming</li>
                <li>Get access to all development dependencies—no local installation required</li>
                <li>Practice programming and work on assignments from your browser</li>
              </ul>
            </div>
            
            <button className="course-page-open-lab-button">
              Open Lab Sandbox
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoursePage;