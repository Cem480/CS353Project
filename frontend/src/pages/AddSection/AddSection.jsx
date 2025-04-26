import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AddSection.css';
import { getCurrentUser } from '../../services/auth';
import { getCourseById, getCourseSections, getSectionContent } from '../../services/course';

const AddSection = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State variables
  const [activeTab, setActiveTab] = useState('sections'); // 'sections' or 'content'
  const [courseData, setCourseData] = useState(null);
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
  const [isLoading, setIsLoading] = useState(true);
  
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
  }, [courseId, navigate]);
  
  // Fetch course data
  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      // Fetch course details from backend
      const data = await getCourseById(courseId);
      
      if (data.success) {
        setCourseData(data.course);
        setCourseName(data.course.title);
        console.log('Course data loaded:', data.course);
        
        // Also fetch sections
        fetchSections();
      } else {
        setErrorMessage('Failed to load course data');
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      setErrorMessage('Failed to load course data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch sections
  const fetchSections = async () => {
    try {
      const data = await getCourseSections(courseId);
      
      if (data.success) {
        setSections(data.sections);
        console.log('Sections loaded:', data.sections);
      } else {
        setErrorMessage('Failed to load course sections');
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setErrorMessage('Failed to load course sections: ' + error.message);
    }
  };
  
  // Fetch content for a section
  const fetchSectionContent = async (sectionId) => {
    try {
      const data = await getSectionContent(courseId, sectionId);
      
      if (data.success) {
        setContents(data.content);
        console.log('Section content loaded:', data.content);
      } else {
        setErrorMessage('Failed to load section content');
      }
    } catch (error) {
      console.error('Error fetching section content:', error);
      setErrorMessage('Failed to load section content: ' + error.message);
      
      // Fallback to empty content if API fails
      setContents([]);
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
    
    // Clear any existing messages
    setSuccessMessage('');
    setErrorMessage('');
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
    
    // Clear any existing messages
    setSuccessMessage('');
    setErrorMessage('');
    
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
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const requestData = {
        title: sectionForm.title,
        description: sectionForm.description || '',
        order_number: parseInt(sectionForm.order_number),
        allocated_time: parseInt(sectionForm.allocated_time)
      };
      
      // Make API call to add section
      const response = await fetch(`http://localhost:5000/api/add/course/${courseId}/section`, {
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
      setErrorMessage('An error occurred while adding the section: ' + error.message);
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
    setErrorMessage('');
    setSuccessMessage('');
    
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
      const response = await fetch(`http://localhost:5000/api/add/course/${courseId}/section/${selectedSectionId}/content`, {
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
      setErrorMessage('An error occurred while adding the content: ' + error.message);
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
};

export default AddSection;