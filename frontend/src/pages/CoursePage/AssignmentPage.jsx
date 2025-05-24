import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import { 
  getContentDetail, 
  submitAssignment, 
  markContentCompleted, 
  getContentComments, 
  addContentComment 
} from '../../services/course';
import './CoursePage.css';

// Base URL for API calls
const BASE_URL = 'http://localhost:5001';

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

const AssignmentPage = () => {
  const { courseId, sectionId, contentId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  
  // State for assignment
  const [assignment, setAssignment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionFile, setSubmissionFile] = useState(null);

  // Load assignment data
  useEffect(() => {
    const loadAssignment = async () => {
      if (!courseId || !sectionId || !contentId) return;
      
      setLoading(true);
      
      try {
        // Fetch the assignment details
        const response = await getContentDetail(courseId, sectionId, contentId);
        
        if (response.success && response.content) {
          setAssignment(response.content);
          setCourseTitle(response.content.course_title || 'Course Title');
          
          // Check if already completed or submitted
          if (response.content.is_completed) {
            setIsCompleted(true);
          }
        } else {
          throw new Error('Failed to fetch assignment details');
        }
        
        // Check completion status from grades API
        try {
          const gradesResponse = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/grades/${user.user_id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          
          if (gradesResponse.ok) {
            const grades = await gradesResponse.json();
            const assignmentGrade = grades.find(grade => 
              grade.section_id === sectionId && 
              grade.content_id === contentId
            );
            
            if (assignmentGrade) {
              if (assignmentGrade.grade !== null) {
                setIsCompleted(true);
                setIsSubmitted(true);
              }
            }
          }
        } catch (err) {
          console.log('Could not fetch completion status:', err);
        }
        
        // Try to fetch comments
        try {
          const commentsData = await getContentComments(courseId, sectionId, contentId);
          setComments(commentsData || []);
        } catch (err) {
          console.log('Comments API may not be implemented yet:', err);
          setComments([]);
        }
      } catch (err) {
        console.error('Error loading assignment:', err);
        setError('Failed to load assignment. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadAssignment();
  }, [courseId, sectionId, contentId, user.user_id]);
  
  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };
  
  // Handle assignment submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      setShowErrorModal(true);
      return;
    }
    
    try {
      // Submit the assignment
      await submitAssignment(courseId, sectionId, contentId, user.user_id, selectedFile);
      
      // Mark as completed
      await markContentCompleted(courseId, sectionId, contentId, user.user_id);
      setIsCompleted(true);
      setIsSubmitted(true);
      
      // Show success message
      alert('Assignment submitted successfully!');
      
      // Reset file selection but keep the submitted file info
      setSubmissionFile(selectedFile);
      setSelectedFile(null);
    } catch (err) {
      console.error('Error submitting assignment:', err);
      setErrorMessage('Failed to submit assignment. Please try again.');
      setShowErrorModal(true);
    }
  };
  
  // Handle marking as completed without submission
  const handleMarkAsCompleted = async () => {
    try {
      await fetch(`${BASE_URL}/api/complete/${courseId}/${sectionId}/${contentId}/${user.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_completed: true })
      });
      
      setIsCompleted(true);
      alert('Assignment marked as completed!');
    } catch (err) {
      console.error('Error marking assignment as completed:', err);
      setErrorMessage('Failed to mark assignment as completed. Please try again.');
      setShowErrorModal(true);
    }
  };
  
  // Handle comment submission
  const handleAddComment = async (event) => {
    event.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      await addContentComment(courseId, sectionId, contentId, user.user_id, newComment);
      
      // Add the comment to the UI (optimistic update)
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
      
      // Clear the input
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setErrorMessage('Failed to add comment, but it will be visible temporarily.');
      setShowErrorModal(true);
    }
  };
  
  // Close error modal
  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage(null);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="course-page-loading-container">
        <div className="course-page-loading-spinner"></div>
        <p>Loading assignment...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="course-page-error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="course-page-primary-button">
          Go Back
        </button>
      </div>
    );
  }
  
  return (
    <div className="course-page">
      <header className="main-page-header">
  <div className="main-page-header-left">
    <div className="main-page-logo">
      <h1 onClick={() => navigate('/home')} style={{cursor: 'pointer'}}>LearnHub</h1>
    </div>
    <div className="main-page-nav-links">
      <a href="/home">Home</a>
      <a href="/degrees">Online Degrees</a>
      <a href="/my-learning" className="active">My Learning</a>
      <a href="/my-certificates">My Certificates</a>
      <a href="/student/fapplications">My Fapplications</a>
    </div>
  </div>
  <div className="main-page-header-right">
    <div className="main-page-search-bar">
      <input type="text" placeholder="Search in course..." />
      <button className="main-page-search-button">Search</button>
    </div>
    <div 
      className="notification-button" 
      onClick={() => navigate('/notifications')} 
      style={{ cursor: 'pointer' }}
      title="View notifications"
    >
      <span className="notification-icon">🔔</span>
    </div>
    <div className="main-page-profile-dropdown">
      <div className="main-page-profile-icon" onClick={() => navigate('/profile')}>
        {user.user_id.charAt(0).toUpperCase()}
      </div>
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
              <p>{errorMessage || 'An error occurred. Please try again.'}</p>
            </div>
            <div className="course-page-error-modal-footer">
              <button onClick={closeErrorModal} className="course-page-error-modal-button">
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="course-page-container">
        {/* Left Sidebar - Remains the same as CoursePage*/}
        <aside className="course-page-sidebar">
          {/* This would be populated with course navigation */}
          <div className="course-page-title">
            <h2>{courseTitle}</h2>
          </div>
          
          <div className="course-page-sidebar-section">
            <div className="course-page-sidebar-section-header">
              <span>Course Material</span>
            </div>
            {/* Navigation items would go here */}
          </div>
          
          <div className="course-page-sidebar-section">
            <div className="course-page-sidebar-section-header">
              <span>Grades</span>
            </div>
          </div>
          
          <div className="course-page-sidebar-section">
            <div className="course-page-sidebar-section-header">
              <span>Course Info</span>
            </div>
          </div>
        </aside>
        
        {/* Main Content - Assignment */}
        <main className="course-page-content">
          <div className="course-assignment-container">
            <div className="course-assignment-header">
              <h2>{assignment?.title || 'Assignment'}</h2>
              {isCompleted && (
                <div className="course-assignment-completed-tag">
                  <span className="course-assignment-completed-icon">✓</span>
                  <span>Completed</span>
                </div>
              )}
            </div>
            
            <div className="course-assignment-description">
              <p>{assignment?.body || 'Complete the assignment as instructed.'}</p>
              
              {assignment?.start_date && assignment?.end_date && (
                <div className="course-assignment-dates">
                  <p><strong>Start Date:</strong> {new Date(assignment.start_date).toLocaleDateString()}</p>
                  <p><strong>Due Date:</strong> {new Date(assignment.end_date).toLocaleDateString()}</p>
                </div>
              )}
              
              {assignment?.assignment_file_url && (
                <div className="course-assignment-dates">
                  <p>
                    <strong>Assignment File:</strong>{" "}
                    <a href={`${BASE_URL}${assignment.assignment_file_url}`} download>
                      Download Assignment File
                    </a>
                  </p>
                </div>
              )}
            </div>
            
            {/* Assignment upload form */}
            {!isSubmitted ? (
              <form className="course-assignment-form" onSubmit={handleSubmit}>
                <div className="course-assignment-file-input">
                  <label className="course-assignment-file-label" htmlFor="assignment-file">
                    Choose File
                  </label>
                  <input 
                    type="file" 
                    id="assignment-file" 
                    onChange={handleFileChange} 
                  />
                  {selectedFile && (
                    <div className="course-assignment-file-name">
                      Selected file: {selectedFile.name}
                    </div>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="course-assignment-submit-button"
                  disabled={isCompleted}
                >
                  Submit Assignment
                </button>
              </form>
            ) : (
              <div className="course-assignment-submitted">
                <div className="course-assignment-submitted-info">
                  <h3>✅ Assignment Submitted</h3>
                  <p>Your assignment has been submitted successfully and is pending grading.</p>
                  {submissionFile && (
                    <p><strong>Submitted file:</strong> {submissionFile.name}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Comments section */}
            <div className="course-assignment-comments">
              <div className="course-assignment-comments-header">
                <h3 className="course-assignment-comments-count">Comments ({comments.length})</h3>
              </div>
              
              <form className="course-assignment-comments-form" onSubmit={handleAddComment}>
                <textarea 
                  className="course-assignment-comments-input"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                ></textarea>
                <button type="submit" className="course-assignment-comments-button">
                  Post
                </button>
              </form>
              
              <div className="course-assignment-comments-list">
                {comments.length > 0 ? (
                  comments.map((comment, index) => (
                    <div key={comment.id || index} className="course-assignment-comment">
                      <div className="course-assignment-comment-header">
                        <span className="course-assignment-comment-author">
                          {comment.first_name} {comment.last_name}
                        </span>
                        <span className="course-assignment-comment-time">
                          {comment.timestamp}
                        </span>
                      </div>
                      <div className="course-assignment-comment-body">
                        {comment.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="course-assignment-no-comments">
                    No comments yet. Be the first to comment!
                  </div>
                )}
              </div>
            </div>
            
            {/* Mark as completed without submission - only show if not already completed and not submitted */}
            {!isCompleted && !isSubmitted && (
              <button 
                className="course-assignment-mark-completed"
                onClick={handleMarkAsCompleted}
              >
                Mark as Completed
              </button>
            )}
          </div>
        </main>
        
        {/* Right Sidebar - Progress */}
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
                <div className="course-page-progress-number">{isCompleted ? 1 : 0}</div>
                <div className="course-page-progress-label">Completed Items</div>
              </div>
              
              <div className="course-page-progress-stat">
                <div className="course-page-progress-number">1</div>
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

export default AssignmentPage;