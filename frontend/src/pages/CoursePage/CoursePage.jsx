import React, { useState, useEffect } from 'react';
import './CoursePage.css';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import {
  getCourseInfo,
  getCourseSectionsForContent,
  getSectionContents,
  getContentDetail,
  markContentCompleted,
  getContentComments,
  addContentComment,
  submitAssessment
} from '../../services/course';
import StudentHeader from '../../components/StudentHeader';
import AdminHeader from '../../components/AdminHeader';
import InstructorHeader from '../../components/InstructorHeader';

// Helper function to get content type icon
const getContentTypeIcon = (content) => {
  if (content.isCompleted) return '✓';

  // Check content_type first
  if (content.content_type === 'visual' || content.content_type === 'visual_material') return '📹';
  if (content.content_type === 'document') return '📄';

  // For tasks, check the task_type in the content detail
  if (content.content_type === 'task') {
    // If we have task_type from detailed content
    if (content.task_type === 'assessment') return '📝';
    if (content.task_type === 'assignment') return '📋';
    // Default for tasks without specific type
    return '📝';
  }

  // Legacy fallbacks
  if (content.type === 'video' || content.type === 'visual') return '📹';
  if (content.type === 'document') return '📄';
  if (content.type === 'task') return '📝';

  // String matching fallbacks
  if (content.title?.toLowerCase().includes('quiz') ||
    content.title?.toLowerCase().includes('assessment') ||
    content.title?.toLowerCase().includes('test')) {
    return '📝';
  }

  if (content.title?.toLowerCase().includes('assignment')) {
    return '📋';
  }

  // Default icon
  return '📄';
};

// Base URL
const BASE_URL = 'http://localhost:5001';

// Enhanced completion status fetching
const getDetailedCompletionStatus = async (courseId, studentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/course/${courseId}/student/${studentId}/completion-status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch completion status`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching detailed completion status:', error);
    throw error;
  }
};

// Check specific content completion
const checkContentCompletion = async (courseId, sectionId, contentId, studentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complete/${courseId}/${sectionId}/${contentId}/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to check content completion`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking content completion:', error);
    throw error;
  }
};

// Get course completion summary
const getCourseCompletionSummary = async (courseId, studentId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/completion-summary/${studentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch completion summary`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching completion summary:', error);
    throw error;
  }
};

// Mark content as completed (enhanced)
const markContentCompletedEnhanced = async (courseId, sectionId, contentId, studentId, isCompleted = true) => {
  try {
    const response = await fetch(`${BASE_URL}/api/complete/${courseId}/${sectionId}/${contentId}/${studentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_completed: isCompleted })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to mark content as completed`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error marking content as completed:', error);
    throw error;
  }
};

// Utility function to merge completion status with content data
const mergeCompletionStatus = (sectionsData, completionData) => {
  if (!completionData || !completionData.sections) {
    return sectionsData;
  }

  return sectionsData.map(section => {
    const completionSection = completionData.sections.find(cs => cs.section_id === section.id);

    if (!completionSection) {
      return section;
    }

    const updatedContents = section.contents.map(content => {
      const completionContent = completionSection.contents.find(cc => cc.content_id === content.id);

      // ------------------
      let isCompleted = false;

      if (completionContent) {
        const isGradedTask = content.content_type === 'task' &&
          (content.task_type === 'assignment' || content.task_type === 'assessment');

        if (isGradedTask) {
          isCompleted = completionContent.grade !== null;
        } else {
          isCompleted = completionContent.is_complete_or_graded;
        }
      }

      return {
        ...content,
        isCompleted,
        grade: completionContent ? completionContent.grade : null
      };      
    });

    return {
      ...section,
      contents: updatedContents
    };
  });
};

const CoursePage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const role = user.role;

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
  const [completionSummary, setCompletionSummary] = useState(null);

  // Quiz/Assessment state
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

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
  }, [courseId]);

  // Function to load section content
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
        content_type: content.content_type.toLowerCase(), // Add this for consistency
        duration: `${content.allocated_time} min`,
        isCompleted: false // Will be updated by loadCompletionStatus
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

  // Enhanced completion status loading
  const loadCompletionStatus = async () => {
    if (!courseId || !user?.user_id || sections.length === 0) return;

    try {
      console.log('🔍 Loading detailed completion status...');

      // Use the new detailed completion API
      const completionData = await getDetailedCompletionStatus(courseId, user.user_id);

      if (completionData.success) {
        console.log('📊 Completion data received:', completionData);

        // Store completion summary
        setCompletionSummary(completionData);

        // Merge completion status with existing sections
        const updatedSections = mergeCompletionStatus(sections, completionData);

        console.log('🔄 Updated sections with completion status:', updatedSections);
        setSections(updatedSections);

        // Update active section if needed
        if (activeSection) {
          const updatedActiveSection = updatedSections.find(s => s.id === activeSection.id);
          if (updatedActiveSection) {
            setActiveSection(updatedActiveSection);
          }
        }
      }

    } catch (err) {
      console.error('❌ Error loading completion status:', err);

      // Fallback to the old method if new API is not available
      try {
        console.log('🔄 Falling back to grades API...');

        const response = await fetch(`${BASE_URL}/api/course-content/course/${courseId}/grades/${user.user_id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        if (response.ok) {
          const completedItems = await response.json();
          console.log('📊 Grades API returned:', completedItems);

          // Update sections with completion status from grades
          const updatedSections = sections.map(section => {
            if (!section.contents || section.contents.length === 0) {
              return section;
            }

            const updatedContents = section.contents.map(content => {
              const isCompleted = completedItems.some(item => {
                const sectionMatch = String(item.section_id) === String(section.id);
                const contentMatch = String(item.content_id) === String(content.id);
                const hasGrade = item.grade !== null;

                return sectionMatch && contentMatch && hasGrade;
              });

              return { ...content, isCompleted };
            });

            return { ...section, contents: updatedContents };
          });

          setSections(updatedSections);
        }
      } catch (fallbackErr) {
        console.error('❌ Fallback method also failed:', fallbackErr);
      }
    }
  };

  // Enhanced mark content as completed function
  const markContentAsCompleted = async () => {
    if (!activeContent || !activeContent.content_id) {
      console.error('❌ Cannot mark content as completed: Missing content ID');
      setErrorMessage('Failed to mark content as completed. Content ID is missing.');
      setShowErrorModal(true);
      return;
    }

    try {
      console.log('🎯 Marking content as completed:', {
        courseId,
        sectionId: activeSection.id,
        contentId: activeContent.content_id,
        userId: user.user_id,
        contentTitle: activeContent.title
      });

      // Use the enhanced completion function
      await markContentCompletedEnhanced(courseId, activeSection.id, activeContent.content_id, user.user_id);

      console.log('✅ Content marked as completed successfully');

      // Immediately update the UI state
      const updatedSections = sections.map(section => {
        if (section.id === activeSection.id) {
          const updatedContents = section.contents.map(content => {
            if (content.id === activeContent.content_id) {
              console.log(`✅ Updating ${content.title} to completed in state`);
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

      // Show success message
      alert('Content marked as completed!');

      // Reload completion status after a delay to sync with backend
      setTimeout(() => {
        console.log('🔄 Reloading completion status to sync with backend...');
        loadCompletionStatus();
      }, 1000);

    } catch (err) {
      console.error('❌ Error marking content as completed:', err);
      setErrorMessage('Failed to mark content as completed. Please try again.');
      setShowErrorModal(true);
    }
  };

  const markContentAsIncompleted = async () => {
    if (!activeContent || !activeContent.content_id) return;
  
    try {
      await markContentCompletedEnhanced(courseId, activeSection.id, activeContent.content_id, user.user_id, false);
  
      const updatedSections = sections.map(section => {
        if (section.id === activeSection.id) {
          const updatedContents = section.contents.map(content =>
            content.id === activeContent.content_id
              ? { ...content, isCompleted: false }
              : content
          );
          return { ...section, contents: updatedContents };
        }
        return section;
      });
  
      setSections(updatedSections);
      const updatedActiveSection = updatedSections.find(s => s.id === activeSection.id);
      if (updatedActiveSection) setActiveSection(updatedActiveSection);
      alert('Content marked as incompleted!');
    } catch (err) {
      setErrorMessage('Failed to mark content as incompleted.');
      setShowErrorModal(true);
    }
  };
    
  // Call loadCompletionStatus after loading sections
  useEffect(() => {
    if (sections.length > 0 && !loading) {
      // Add condition to only load once the page is fully loaded
      loadCompletionStatus();
    }
  }, [sections.length, loading]); // Only depend on sections length, not the full sections object

  // Toggle section expansion
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

  // Open content modal - FIXED FOR ASSESSMENTS
  const openContent = async (sectionId, contentId) => {
    try {
      console.log('🎯 Opening content:', { sectionId, contentId });

      // Fetch detailed content information
      const contentData = await getContentDetail(courseId, sectionId, contentId);

      if (contentData.success && contentData.content) {
        const content = contentData.content;
        console.log('📄 Content data received:', content);

        // Handle different content types
        if (content.content_type === 'task' && content.task_type === 'assignment') {
          // For assignments, redirect to assignment page
          navigate(`/course/${courseId}/section/${sectionId}/assignment/${contentId}`);
          return;
        }

        // For assessments, ensure we have questions
        if (content.content_type === 'task' && content.task_type === 'assessment') {
          console.log('📝 Assessment detected, checking for questions...');

          // If no questions in content, try to fetch them separately
          if (!content.questions || content.questions.length === 0) {
            try {
              console.log('🔍 Fetching questions separately...');

              // Try to fetch questions from the questions API endpoint
              const questionsResponse = await fetch(`${BASE_URL}/api/course/${courseId}/section/${sectionId}/content/${contentId}/questions`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
              });

              if (questionsResponse.ok) {
                const questionsData = await questionsResponse.json();
                console.log('📝 Questions fetched:', questionsData);

                if (questionsData.questions && questionsData.questions.length > 0) {
                  content.questions = questionsData.questions;
                } else {
                  console.warn('⚠️ No questions found in separate API call');
                  // Create dummy questions for testing if no questions found
                  content.questions = [
                    {
                      question_id: 1,
                      question_body: "This is a sample assessment question. Please provide your answer.",
                      max_time: 300
                    }
                  ];
                }
              } else {
                console.warn('⚠️ Questions API not available, using fallback');
                // Create dummy questions for testing
                content.questions = [
                  {
                    question_id: 1,
                    question_body: "This is a sample assessment question. Please provide your answer.",
                    max_time: 300
                  }
                ];
              }
            } catch (err) {
              console.warn('⚠️ Error fetching questions, using fallback:', err);
              // Create dummy questions for testing
              content.questions = [
                {
                  question_id: 1,
                  question_body: "This is a sample assessment question. Please provide your answer.",
                  max_time: 300
                }
              ];
            }
          }

          console.log('✅ Final assessment content with questions:', content);
        }

        // Store the contentId in the content object to use during markContentCompleted
        setActiveContent({
          ...content,
          content_id: contentId // Make sure content_id is set properly
        });

        // Reset quiz state when opening new content
        setQuizAnswers({});
        setQuizStarted(false);
        setQuizSubmitting(false);

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
    setQuizAnswers({});
    setQuizStarted(false);
    setQuizSubmitting(false);
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

  // Handle quiz answer change
  const handleQuizAnswerChange = (questionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Start quiz
  const startQuiz = () => {
    setQuizStarted(true);
  };

  // Submit quiz/assessment
  const submitQuiz = async () => {
    if (!activeContent || !activeContent.questions) {
      setErrorMessage('No questions found for this assessment.');
      setShowErrorModal(true);
      return;
    }

    // Check if all questions are answered
    const unansweredQuestions = activeContent.questions.filter(
      q => !quizAnswers[q.question_id] || quizAnswers[q.question_id].trim() === ''
    );

    if (unansweredQuestions.length > 0) {
      setErrorMessage(`Please answer all questions. ${unansweredQuestions.length} questions remain unanswered.`);
      setShowErrorModal(true);
      return;
    }

    setQuizSubmitting(true);

    try {
      console.log('📝 Submitting assessment answers:', quizAnswers);

      // Submit assessment using the existing submit API
      const response = await fetch(`${BASE_URL}/api/submit/${courseId}/${activeSection.id}/${activeContent.content_id}/${user.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers: quizAnswers })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit assessment');
      }

      const result = await response.json();
      console.log('✅ Assessment submitted successfully:', result);

      // Show success message
      alert('Assessment submitted successfully!');

      // Close content modal
      closeContent();

      // Reload completion status
      setTimeout(() => {
        loadCompletionStatus();
      }, 1000);

    } catch (err) {
      console.error('❌ Error submitting assessment:', err);
      setErrorMessage('Failed to submit assessment. Please try again.');
      setShowErrorModal(true);
    } finally {
      setQuizSubmitting(false);
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

  // Enhanced progress calculation
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

    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return { totalItems, completedItems, progressPercentage };
  };

  const { totalItems, completedItems, progressPercentage } = calculateProgress();

  return (
    <div className="course-page">
      <header className="main-page-header">
        {role === 'admin' && <AdminHeader />}
        {role === 'instructor' && <InstructorHeader />}
        {role === 'student' && <StudentHeader />}

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

      {/* Content Modal - IMPROVED FOR ASSESSMENTS */}
      {activeContent && (
        <div className="course-page-content-modal-overlay">
          <div className="course-page-content-modal">
            <div className="course-page-content-modal-header">
              <h3>{activeContent.title}</h3>
              <button className="course-page-close-button" onClick={closeContent}>×</button>
            </div>

            <div className="course-page-content-modal-body">
              {activeContent.content_type === 'visual' || activeContent.content_type === 'visual_material' ? (
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
                  {activeContent.document_view_url ? (
                    <>
                      <iframe
                        src={`${BASE_URL}${activeContent.document_view_url}`}
                        width="100%"
                        height="500"
                        title="Document viewer"
                      ></iframe>
                      <div style={{ marginTop: '10px' }}>
                        <a
                          href={`${BASE_URL}${activeContent.document_download_url}`}
                          download
                          className="course-page-download-link"
                        >
                          📥 Download this document
                        </a>
                      </div>
                    </>
                  
                  ) : (
                    <div className="course-page-placeholder">
                      <span className="course-page-placeholder-icon">📄</span>
                      <p>Document not available</p>
                    </div>
                  )}
                </div>
              ) : activeContent.content_type === 'task' && activeContent.task_type === 'assessment' ? (
                <div className="course-page-quiz-container">
                  <div className="course-page-quiz-info">
                    <div className="course-page-quiz-icon">📝</div>
                    <h4>Assessment: {activeContent.title}</h4>
                  </div>

                  <div className="course-page-quiz-details">
                    <p><strong>Questions:</strong> {activeContent.question_count || activeContent.questions?.length || '?'}</p>
                    <p><strong>Maximum time:</strong> {activeContent.max_time || '?'} minutes</p>
                    <p><strong>Passing grade:</strong> {activeContent.passing_grade || '?'}%</p>
                  </div>

                  {!quizStarted ? (
                    <div className="course-page-quiz-start">
                      <p>Click the button below to start the assessment.</p>
                      <button className="course-page-start-button" onClick={startQuiz}>
                        Start Assessment
                      </button>
                    </div>
                  ) : (
                    <div className="course-page-quiz-questions">
                      {activeContent.questions && activeContent.questions.length > 0 ? (
                        activeContent.questions.map((question, index) => (
                          <div key={question.question_id} className="course-page-quiz-question">
                            <h5>Question {index + 1}:</h5>
                            <p>{question.question_body}</p>
                            <p><em>Max time: {question.max_time} seconds</em></p>
                            <textarea
                              className="course-page-quiz-answer-input"
                              placeholder="Enter your answer here..."
                              value={quizAnswers[question.question_id] || ''}
                              onChange={(e) => handleQuizAnswerChange(question.question_id, e.target.value)}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="course-page-placeholder">
                          <p>No questions available for this assessment.</p>
                        </div>
                      )}

                      {activeContent.questions && activeContent.questions.length > 0 && (
                        <div className="course-page-quiz-submit">
                          <button
                            className="course-page-quiz-submit-button"
                            onClick={submitQuiz}
                            disabled={quizSubmitting}
                          >
                            {quizSubmitting ? 'Submitting...' : 'Submit Assessment'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="course-page-placeholder">
                  <span className="course-page-placeholder-icon">📄</span>
                  <p>{activeContent.title}</p>
                  <p>Content type: {activeContent.content_type}</p>
                  {activeContent.task_type && (
                    <p>Task type: {activeContent.task_type}</p>
                  )}
                  {activeContent.body && (
                    <div className="course-page-content-body">
                      <p>{activeContent.body}</p>
                    </div>
                  )}
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
              {activeContent.task_type === 'assessment' ? (
                !activeContent.isCompleted && (
                  <div className="course-page-assessment-note">
                    🛑 Assessments cannot be marked as completed until they are graded by the instructor.
                  </div>
                )
              ) : (
                activeContent.isCompleted ? (
                  <button
                    className="course-page-mark-incomplete-button"
                    onClick={markContentAsIncompleted}
                  >
                    Mark as Incomplete
                  </button>
                ) : (
                  <button
                    className="course-page-mark-complete-button"
                    onClick={markContentAsCompleted}
                  >
                    Mark As Completed
                  </button>
                )
              )}

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
                  <span>Course progress tracking enabled</span>
                </div>
              </div>

              <div className="course-page-section-description">
                <p>An engaging journey into the core principles and advanced methods.</p>
              </div>

              <div className="course-page-learning-objectives">
                <div className="course-page-learning-objectives-header" onClick={() => { }}>
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

        {/* Right Sidebar - Enhanced Progress */}
        <aside className="course-page-progress-sidebar">
          <div className="course-page-progress-header">
            <h3>Your Course Progress</h3>
          </div>
          <div className="course-page-progress-content">
            <p className="course-page-progress-text">
              Stay on track with your learning goals
            </p>

            {/* Enhanced progress display */}
            <div className="course-page-progress-stats">
              <div className="course-page-progress-stat">
                <div className="course-page-progress-number">{completedItems}</div>
                <div className="course-page-progress-label">Completed Items</div>
              </div>

              <div className="course-page-progress-stat">
                <div className="course-page-progress-number">{totalItems}</div>
                <div className="course-page-progress-label">Total Items</div>
              </div>

              <div className="course-page-progress-stat">
                <div className="course-page-progress-number">{totalItems - completedItems}</div>
                <div className="course-page-progress-label">Remaining</div>
              </div>
            </div>

            {/* Completion Summary from API */}
            {completionSummary && (
              <div className="course-page-completion-details">
                <p><strong>Overall Progress:</strong> {completionSummary.completion_percentage}%</p>
                <p><strong>Completed:</strong> {completionSummary.completed_content} / {completionSummary.total_content}</p>
              </div>
            )}
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