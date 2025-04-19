import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './TransactionPage.css';

const TransactionPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State for form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  
  // Mock course data - in a real app, fetch based on courseId
  const courses = {
    "mcs": {
      id: "mcs",
      title: "Master of Computer Science",
      university: "Tech Global University",
      price: "$15,000",
      duration: "18-24 months",
      image: "/mcs-thumbnail.jpg",
      startDate: "Flexible"
    },
    "bds": {
      id: "bds",
      title: "Bachelor of Data Science",
      university: "Analytics Institute",
      price: "$12,500",
      duration: "36 months",
      image: "/bds-thumbnail.jpg",
      startDate: "Next cohort: March 15, 2025"
    },
    "mba": {
      id: "mba",
      title: "MBA in Digital Marketing",
      university: "Business Academy",
      price: "$12,500",
      duration: "12-15 months",
      image: "/mba-thumbnail.jpg",
      startDate: "Next cohort: April 1, 2025"
    }
  };
  
  const course = courses[courseId] || courses.mcs;
  
  const formatCardNumber = (value) => {
    const input = value.replace(/\D/g, '');
    const formatted = input.replace(/(.{4})/g, '$1 ').trim();
    return formatted;
  };
  
  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.length <= 19) { // 16 digits + 3 spaces
      setCardNumber(formatted);
    }
  };
  
  const handleExpiryDateChange = (e) => {
    let input = e.target.value.replace(/\D/g, '');
    
    if (input.length > 2) {
      input = input.slice(0, 2) + '/' + input.slice(2, 4);
    }
    
    if (input.length <= 5) { // MM/YY format
      setExpiryDate(input);
    }
  };
  
  const handleCvvChange = (e) => {
    const input = e.target.value.replace(/\D/g, '');
    if (input.length <= 3) {
      setCvv(input);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, process payment here
    alert("Payment processed successfully! You are now enrolled in the course.");
    navigate('/my-courses');
  };
  
  const handleCancel = () => {
    navigate(`/degree/${courseId}`);
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
              <button className="notification-button">
                <span className="notification-icon">🔔</span>
              </button>
              <button className="user-profile">
                <span className="profile-initials">JS</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="transaction-container">
        <div className="transaction-header">
          <h1>Complete Your Enrollment</h1>
          <p>You're one step away from starting your learning journey</p>
        </div>
        
        <div className="transaction-content">
          <div className="payment-form-container">
            <h2>Payment Details</h2>
            <form onSubmit={handleSubmit} className="payment-form">
              <div className="payment-methods">
                <div className="payment-method active">
                  <i className="card-icon">💳</i>
                  Credit/Debit Card
                </div>
                <div className="payment-method disabled">
                  <i className="paypal-icon">P</i>
                  PayPal
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="cardNumber">Card Number</label>
                  <div className="card-input-container">
                    <input 
                      type="text" 
                      id="cardNumber" 
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      required 
                    />
                    <div className="card-icons">
                      <span className="visa">VISA</span>
                      <span className="mastercard">MC</span>
                      <span className="amex">AMEX</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="cardName">Cardholder Name</label>
                  <input 
                    type="text" 
                    id="cardName" 
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Smith"
                    required 
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group half-width">
                  <label htmlFor="expiryDate">Expiry Date</label>
                  <input 
                    type="text" 
                    id="expiryDate" 
                    value={expiryDate}
                    onChange={handleExpiryDateChange}
                    placeholder="MM/YY"
                    required 
                  />
                </div>
                <div className="form-group half-width">
                  <label htmlFor="cvv">CVV</label>
                  <input 
                    type="text" 
                    id="cvv" 
                    value={cvv}
                    onChange={handleCvvChange}
                    placeholder="123"
                    required 
                  />
                </div>
              </div>
              
              <h3 className="billing-header">Billing Address</h3>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="billingAddress">Street Address</label>
                  <input 
                    type="text" 
                    id="billingAddress" 
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    required 
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group third-width">
                  <label htmlFor="city">City</label>
                  <input 
                    type="text" 
                    id="city" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group third-width">
                  <label htmlFor="state">State/Province</label>
                  <input 
                    type="text" 
                    id="state" 
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group third-width">
                  <label htmlFor="zipCode">ZIP/Postal Code</label>
                  <input 
                    type="text" 
                    id="zipCode" 
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required 
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="country">Country</label>
                  <select 
                    id="country" 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  >
                    <option value="">Select a country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="IN">India</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="pay-button">
                  Pay {course.price}
                </button>
              </div>
            </form>
          </div>
          
          <div className="order-summary-container">
            <div className="order-summary">
              <h2>Order Summary</h2>
              
              <div className="course-preview">
                <div className="course-image">
                  {/* This would be an actual image in a real app */}
                  <div className="image-placeholder"></div>
                </div>
                <div className="course-preview-details">
                  <h3>{course.title}</h3>
                  <p className="university">{course.university}</p>
                </div>
              </div>
              
              <div className="order-details">
                <div className="order-detail-item">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">{course.startDate}</span>
                </div>
                <div className="order-detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{course.duration}</span>
                </div>
                <div className="order-detail-item">
                  <span className="detail-label">Credential</span>
                  <span className="detail-value">Full Degree</span>
                </div>
              </div>
              
              <div className="price-breakdown">
                <div className="price-item">
                  <span className="price-label">Program Price</span>
                  <span className="price-value">{course.price}</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Application Fee</span>
                  <span className="price-value">$0.00</span>
                </div>
                <div className="price-item discount">
                  <span className="price-label">Early Enrollment Discount</span>
                  <span className="price-value">-$0.00</span>
                </div>
                <div className="price-item total">
                  <span className="price-label">Total</span>
                  <span className="price-value">{course.price}</span>
                </div>
              </div>
              
              <div className="order-notes">
                <p>
                  <i className="note-icon">ℹ️</i>
                  By completing this purchase, you agree to LearnHub's <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
                </p>
                <p>
                  <i className="note-icon">🔒</i>
                  Your payment information is secure and encrypted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPage;