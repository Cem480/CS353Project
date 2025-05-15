import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './FinancialAid.css';
import { getCurrentUser } from '../../services/auth';
import NotificationButton from '../../components/NotificationButton';

const FinancialAid = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const userData = getCurrentUser();
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    email: '',
    country: '',
    annualIncome: '',
    
    // Educational Background
    highestEducation: '',
    fieldOfStudy: '',
    currentlyEnrolled: 'no',
    
    // Financial Situation
    employmentStatus: '',
    financialSupport: 'no',
    
    // Application Essays
    whyNeedAid: '',
    careerGoals: '',
    courseValueToCareer: '',
    
    // Agreement
    agreeTandC: false,
    agreeToVerify: false
  });
  
  // Mock course data - in a real app, fetch based on courseId
  const courses = {
    "mcs": {
      id: "mcs",
      title: "Master of Computer Science",
      university: "Tech Global University",
      price: "$15,000",
    },
    "bds": {
      id: "bds",
      title: "Bachelor of Data Science",
      university: "Analytics Institute",
      price: "$12,500",
    },
    "mba": {
      id: "mba",
      title: "MBA in Digital Marketing",
      university: "Business Academy",
      price: "$12,500",
    }
  };
  
  const course = courses[courseId] || courses.mcs;
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const nextStep = () => {
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
  };
  
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would submit the application to your backend
    console.log('Submitting financial aid application:', formData);
    setCurrentStep(5); // Move to confirmation step
  };
  
  const handleGoToMyCourses = () => {
    navigate('/my-courses');
  };
  
  const handleGoBack = () => {
    navigate(`/degree/${courseId}`);
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h2>Personal Information</h2>
            <p className="step-description">Please provide your basic personal information for this financial aid application.</p>
            
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input 
                type="text" 
                id="fullName" 
                name="fullName" 
                value={formData.fullName}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
              <small>This should match the email address associated with your LearnHub account</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="country">Country of Residence</label>
              <select 
                id="country" 
                name="country" 
                value={formData.country}
                onChange={handleChange}
                required
              >
                <option value="">Select your country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="IN">India</option>
                <option value="NG">Nigeria</option>
                <option value="BR">Brazil</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="annualIncome">Annual Income (USD)</label>
              <input 
                type="number" 
                id="annualIncome" 
                name="annualIncome" 
                value={formData.annualIncome}
                onChange={handleChange}
                required 
              />
              <small>Please provide your annual income in US dollars</small>
            </div>
            
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={handleGoBack}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={nextStep}>
                Continue
              </button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="step-content">
            <h2>Educational Background</h2>
            <p className="step-description">Please provide information about your educational background.</p>
            
            <div className="form-group">
              <label htmlFor="highestEducation">Highest Level of Education</label>
              <select 
                id="highestEducation" 
                name="highestEducation" 
                value={formData.highestEducation}
                onChange={handleChange}
                required
              >
                <option value="">Select your highest education</option>
                <option value="highschool">High School</option>
                <option value="associate">Associate's Degree</option>
                <option value="bachelor">Bachelor's Degree</option>
                <option value="master">Master's Degree</option>
                <option value="phd">Ph.D. or Doctorate</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="fieldOfStudy">Field of Study</label>
              <input 
                type="text" 
                id="fieldOfStudy" 
                name="fieldOfStudy" 
                value={formData.fieldOfStudy}
                onChange={handleChange}
                required 
              />
              <small>Enter your major or main field of study</small>
            </div>
            
            <div className="form-group">
              <label>Are you currently enrolled in an educational program?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="currentlyEnrolled" 
                    value="yes" 
                    checked={formData.currentlyEnrolled === "yes"}
                    onChange={handleChange}
                  />
                  Yes
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="currentlyEnrolled" 
                    value="no" 
                    checked={formData.currentlyEnrolled === "no"}
                    onChange={handleChange}
                  />
                  No
                </label>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={prevStep}>
                Back
              </button>
              <button type="button" className="primary-button" onClick={nextStep}>
                Continue
              </button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="step-content">
            <h2>Financial Situation</h2>
            <p className="step-description">Please provide details about your current financial situation.</p>
            
            <div className="form-group">
              <label htmlFor="employmentStatus">Current Employment Status</label>
              <select 
                id="employmentStatus" 
                name="employmentStatus" 
                value={formData.employmentStatus}
                onChange={handleChange}
                required
              >
                <option value="">Select your employment status</option>
                <option value="fulltime">Full-time employed</option>
                <option value="parttime">Part-time employed</option>
                <option value="self">Self-employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="student">Full-time student</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Do you have any other sources of financial support for your education?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="financialSupport" 
                    value="yes" 
                    checked={formData.financialSupport === "yes"}
                    onChange={handleChange}
                  />
                  Yes
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="financialSupport" 
                    value="no" 
                    checked={formData.financialSupport === "no"}
                    onChange={handleChange}
                  />
                  No
                </label>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={prevStep}>
                Back
              </button>
              <button type="button" className="primary-button" onClick={nextStep}>
                Continue
              </button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="step-content">
            <h2>Application Essays</h2>
            <p className="step-description">Please answer the following questions. These essays are an important part of your application.</p>
            
            <div className="form-group">
              <label htmlFor="whyNeedAid">
                Why are you applying for Financial Aid? (1000 character limit)
              </label>
              <textarea 
                id="whyNeedAid" 
                name="whyNeedAid" 
                value={formData.whyNeedAid}
                onChange={handleChange}
                maxLength={1000}
                rows={6}
                required 
              />
              <small>{formData.whyNeedAid.length}/1000 characters</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="careerGoals">
                Describe your career goals and how they align with this course. (1000 character limit)
              </label>
              <textarea 
                id="careerGoals" 
                name="careerGoals" 
                value={formData.careerGoals}
                onChange={handleChange}
                maxLength={1000}
                rows={6}
                required 
              />
              <small>{formData.careerGoals.length}/1000 characters</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="courseValueToCareer">
                How will this course add value to your career? (1000 character limit)
              </label>
              <textarea 
                id="courseValueToCareer" 
                name="courseValueToCareer" 
                value={formData.courseValueToCareer}
                onChange={handleChange}
                maxLength={1000}
                rows={6}
                required 
              />
              <small>{formData.courseValueToCareer.length}/1000 characters</small>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="agreeTandC" 
                  checked={formData.agreeTandC}
                  onChange={handleChange}
                  required 
                />
                I agree that all information provided is accurate and complete. I understand that providing false information may result in the rejection of my application.
              </label>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  name="agreeToVerify" 
                  checked={formData.agreeToVerify}
                  onChange={handleChange}
                  required 
                />
                I understand that LearnHub may verify the information provided and may request additional documentation.
              </label>
            </div>
            
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={prevStep}>
                Back
              </button>
              <button 
                type="button" 
                className="primary-button" 
                onClick={handleSubmit}
                disabled={!formData.agreeTandC || !formData.agreeToVerify}
              >
                Submit Application
              </button>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="step-content confirmation-step">
            <div className="confirmation-icon">✓</div>
            <h2>Application Submitted</h2>
            <p className="confirmation-message">
              Thank you for submitting your financial aid application for the <strong>{course.title}</strong> program at <strong>{course.university}</strong>. 
              Your application has been received and is under review.
            </p>
            
            <div className="confirmation-details">
              <h3>What happens next?</h3>
              <ol>
                <li>Our team will review your application (typically takes 7-10 business days)</li>
                <li>You'll receive an email notification with the decision</li>
                <li>If approved, you'll receive instructions on how to enroll in the course</li>
              </ol>
              
              <p>If you have any questions about your application, please contact our support team at <a href="mailto:financialaid@learnhub.com">financialaid@learnhub.com</a></p>
            </div>
            
            <div className="form-actions">
              <button type="button" className="primary-button" onClick={handleGoToMyCourses}>
                Go to My Courses
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Progress indicator component
  const ProgressIndicator = () => {
    const steps = [
      { number: 1, label: "Personal Info" },
      { number: 2, label: "Education" },
      { number: 3, label: "Financial" },
      { number: 4, label: "Essays" }
    ];
    
    return (
      <div className="progress-indicator">
        {steps.map((step) => (
          <div 
            key={step.number} 
            className={`progress-step ${currentStep >= step.number ? 'active' : ''} 
                       ${currentStep > step.number ? 'completed' : ''}`}
          >
            <div className="step-number">{currentStep > step.number ? '✓' : step.number}</div>
            <div className="step-label">{step.label}</div>
            {step.number < steps.length && (
              <div className="step-connector"></div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div>
      {/* LearnHub Header */}
      <header className="learnhub-header">
        <div className="header-container">
          <div className="header-left">
            <Link to="/" className="logo">LearnHub</Link>
            <nav className="main-nav">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/degrees" className="nav-link active">Online Degrees</Link>
              <Link to="/certificates" className="nav-link">Certificates</Link>
            </nav>
          </div>
          <div className="header-right">
            <div className="search-container">
              <input type="text" placeholder="Search degrees..." className="search-input" />
              <button className="search-button">Search</button>
            </div>
            <div className="user-controls">
              <NotificationButton className="notification-btn" />
              <button className="user-profile">
                <span className="profile-initials">JS</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="financial-aid-container">
        <div className="financial-aid-header">
          <button className="back-button" onClick={handleGoBack}>
            &larr; Back to Course Details
          </button>
          <h1>Financial Aid Application</h1>
          <p className="course-title">
            {course.title} • {course.university}
          </p>
          <p className="aid-description">
            LearnHub is committed to providing quality education to everyone, 
            regardless of their financial situation. Complete this application 
            to be considered for financial aid.
          </p>
        </div>
        
        {/* Only show progress indicator if not on confirmation step */}
        {currentStep < 5 && <ProgressIndicator />}
        
        <form className="financial-aid-form">
          {renderStepContent()}
        </form>
      </div>
    </div>
  );
};

export default FinancialAid;