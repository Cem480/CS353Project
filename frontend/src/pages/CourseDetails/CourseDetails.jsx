
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CourseDetails.css';

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showFinancialAid, setShowFinancialAid] = useState(false);
  
  // Mock data - in a real app, you would fetch this based on the id
  const courseData = {
    "mcs": {
      id: "mcs",
      title: "Master of Computer Science",
      university: "Tech Global University",
      description: "Comprehensive program covering algorithms, AI, and software engineering",
      fullDescription: "The Master of Computer Science degree provides a thorough education in computing theory and practice, with specializations available in artificial intelligence, software engineering, data systems, and cybersecurity. Students will learn through a combination of lectures, hands-on projects, and research opportunities.",
      price: "$15,000",
      duration: "18-24 months",
      enrolled: "3,240 students",
      lastUpdated: "10 Kas 2024",
      level: "Advanced",
      instructors: [
        { name: "Dr. Sarah Chen", title: "Professor of Computer Science", image: "/instructor1.jpg" },
        { name: "Dr. Michael Rodriguez", title: "Associate Professor of AI", image: "/instructor2.jpg" }
      ],
      syllabus: [
        { 
          title: "Module 1: Foundations of Computer Science", 
          duration: "4 weeks",
          topics: ["Algorithms and Data Structures", "Computational Theory", "Programming Paradigms"]
        },
        { 
          title: "Module 2: Advanced Algorithms", 
          duration: "5 weeks",
          topics: ["Algorithm Design", "Complexity Analysis", "Optimization Techniques"]
        },
        { 
          title: "Module 3: Artificial Intelligence", 
          duration: "6 weeks",
          topics: ["Machine Learning", "Neural Networks", "Natural Language Processing"]
        },
        { 
          title: "Module 4: Software Engineering", 
          duration: "5 weeks",
          topics: ["Software Design Patterns", "Testing and Verification", "Agile Development"]
        }
      ]
    },
    "bds": {
      id: "bds",
      title: "Bachelor of Data Science",
      university: "Analytics Institute",
      description: "Learn statistics, programming, and data visualization",
      fullDescription: "The Bachelor of Data Science program equips students with the skills to collect, analyze and interpret complex data. Through a balanced curriculum of statistics, programming, and business applications, students will develop the expertise needed to transform data into actionable insights.",
      price: "$12,500",
      duration: "36 months",
      enrolled: "2,850 students",
      lastUpdated: "5 Eki 2024",
      level: "Beginner",
      skills: ["Statistical Analysis", "Programming in Python & R", "Data Visualization", "Machine Learning Basics", "Big Data Technologies"],
      instructors: [
        { name: "Prof. David Kim", title: "Head of Data Science", image: "/instructor3.jpg" },
        { name: "Dr. Lisa Johnson", title: "Professor of Statistics", image: "/instructor4.jpg" }
      ],
      syllabus: [
        { 
          title: "Module 1: Foundations of Statistics", 
          duration: "6 weeks",
          topics: ["Probability Theory", "Statistical Inference", "Hypothesis Testing"]
        },
        { 
          title: "Module 2: Programming for Data Science", 
          duration: "8 weeks",
          topics: ["Python Programming", "R Programming", "SQL and Databases"]
        },
        { 
          title: "Module 3: Data Visualization", 
          duration: "5 weeks",
          topics: ["Principles of Visual Design", "Tableau", "Interactive Dashboards"]
        },
        { 
          title: "Module 4: Introduction to Machine Learning", 
          duration: "8 weeks",
          topics: ["Supervised Learning", "Unsupervised Learning", "Model Evaluation"]
        }
      ]
    },
    "mba": {
      id: "mba",
      title: "MBA in Digital Marketing",
      university: "Business Academy",
      description: "Strategic digital marketing skills for the modern business landscape",
      fullDescription: "The MBA in Digital Marketing combines traditional business administration principles with specialized knowledge in digital marketing strategies. Students will learn to develop and implement comprehensive marketing campaigns across digital platforms while understanding the business implications and ROI of these initiatives.",
      price: "$12,500",
      duration: "12-15 months",
      enrolled: "1,950 students",
      lastUpdated: "15 Ağu 2024",
      level: "Intermediate",
      skills: ["Digital Strategy", "Content Marketing", "SEO & SEM", "Social Media Marketing", "Marketing Analytics"],
      instructors: [
        { name: "Prof. James Wilson", title: "Professor of Marketing", image: "/instructor5.jpg" },
        { name: "Dr. Emily Chang", title: "Digital Strategy Expert", image: "/instructor6.jpg" }
      ],
      syllabus: [
        { 
          title: "Module 1: Business Fundamentals", 
          duration: "4 weeks",
          topics: ["Business Strategy", "Finance for Marketers", "Organizational Behavior"]
        },
        { 
          title: "Module 2: Digital Marketing Foundations", 
          duration: "6 weeks",
          topics: ["Digital Marketing Strategy", "Consumer Behavior Online", "Brand Management"]
        },
        { 
          title: "Module 3: Digital Marketing Channels", 
          duration: "8 weeks",
          topics: ["Content Marketing", "Social Media Marketing", "SEO & SEM", "Email Marketing"]
        },
        { 
          title: "Module 4: Analytics and Optimization", 
          duration: "5 weeks",
          topics: ["Marketing Analytics", "A/B Testing", "Campaign Optimization", "ROI Analysis"]
        }
      ]
    }
  };

  // Default to the first course if id is not found
  const course = courseData[id] || courseData.mcs;

  const handleApplyNow = () => {
    // In a real app, this would navigate to an application form
    alert("Application process initiated for " + course.title);
  };

  const handleFinancialAid = () => {
    setShowFinancialAid(!showFinancialAid);
  };

  const handleSubmitFinancialAid = (e) => {
    e.preventDefault();
    alert("Financial aid application submitted successfully!");
    setShowFinancialAid(false);
  };

  const handleGoBack = () => {
    navigate('/degrees');
  };

  return (
    <div>
    {/* Header */}
    <header className="course-header">
    <div className="logo">
      <span className="logo-text">LearnHub</span>
    </div>
    <div className="search-container">
      <input type="text" placeholder="Search in course" className="search-input" />
      <button className="search-button1">Search</button>
    </div>
    <div className="header-right">
      <div className="language-selector">
        <span>English</span>
        <span className="dropdown-arrow">▼</span>
      </div>
      <div className="notifications-icon">🔔</div>
      <div className="profile-icon">JS</div>
    </div>
  </header>
    <div className="course-details-container">
        
      <div className="course-details-header">
        <button className="back-button" onClick={handleGoBack}>
          &larr; Back to Degrees
        </button>
        <div className="header-content">
          <h1>{course.title}</h1>
          <h3>{course.university}</h3>
        </div>
      </div>
      
      <div className="course-details-main">
        <div className="course-info-container">
          <div className="course-overview">
            <h2>Overview</h2>
            <p>{course.fullDescription}</p>
            
            <div className="course-metadata">
              <div className="metadata-item">
                <span className="metadata-label">Duration:</span>
                <span className="metadata-value">{course.duration}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Level:</span>
                <span className="metadata-value">{course.level}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Enrolled:</span>
                <span className="metadata-value">{course.enrolled}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Last Updated:</span>
                <span className="metadata-value">{course.lastUpdated}</span>
              </div>
            </div>
          </div>
          
          <div className="course-syllabus">
            <h2>Syllabus</h2>
            <div className="syllabus-modules">
              {course.syllabus.map((module, index) => (
                <div key={index} className="syllabus-module">
                  <div className="module-header">
                    <h4>{module.title}</h4>
                    <span className="module-duration">{module.duration}</span>
                  </div>
                  <ul className="module-topics">
                    {module.topics.map((topic, topicIndex) => (
                      <li key={topicIndex}>{topic}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          
          <div className="instructors-section">
            <h2>Instructors</h2>
            <div className="instructors-list">
              {course.instructors.map((instructor, index) => (
                <div key={index} className="instructor-card">
                  <div className="instructor-image-placeholder"></div>
                  <div className="instructor-info">
                    <h4>{instructor.name}</h4>
                    <p>{instructor.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="course-enrollment">
          <div className="enrollment-card">
            <h2>{course.title}</h2>
            <div className="enrollment-price">{course.price}</div>
            <button className="apply-button" onClick={handleApplyNow}>Enroll Now</button>
            <button className="financial-aid-button" onClick={handleFinancialAid}>
              Financial Aid Available
            </button>
            
            <div className="enrollment-details">
              <div className="enrollment-detail">
                <span className="detail-icon">🗓️</span>
                <span>Starts: <strong>Flexible</strong></span>
              </div>
              <div className="enrollment-detail">
                <span className="detail-icon">⏱️</span>
                <span>Duration: <strong>{course.duration}</strong></span>
              </div>
              <div className="enrollment-detail">
                <span className="detail-icon">🎓</span>
                <span>Level: <strong>{course.level}</strong></span>
              </div>
              <div className="enrollment-detail">
                <span className="detail-icon">📚</span>
                <span>Fully Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showFinancialAid && (
        <div className="financial-aid-modal">
          <div className="financial-aid-content">
            <button className="close-modal" onClick={handleFinancialAid}>×</button>
            <h2>Financial Aid Application</h2>
            <p>Please complete the following form to apply for financial aid for the {course.title} program.</p>
            
            <form onSubmit={handleSubmitFinancialAid}>
              
              <div className="form-group">
                <label htmlFor="income">Annual Income (USD)</label>
                <input type="number" id="income" required />
              </div>
              
              <div className="form-group">
                <label htmlFor="reason">Why are you applying for financial aid?</label>
                <textarea id="reason" rows="4" required></textarea>
              </div>
              
              <button type="submit" className="submit-aid-button">Submit Application</button>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default CourseDetails;