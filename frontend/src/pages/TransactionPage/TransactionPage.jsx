import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './TransactionPage.css';
import { getCurrentUser, logout } from '../../services/auth';
import { getCourseInfo } from '../../services/courseContent';
import { enrollInCourse } from '../../services/student';

import StudentHeader from '../../components/StudentHeader';
import AdminHeader from '../../components/AdminHeader';
import InstructorHeader from '../../components/InstructorHeader';



const TransactionPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get('courseId');

  const navigate = useNavigate();

  const userData = getCurrentUser();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const firstName = userData?.user_id?.split('@')[0] || 'User';

  // State for form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = getCurrentUser();
  const role = user.role;

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const data = await getCourseInfo(courseId);
        setCourse(data);
      } catch (err) {
        console.error('Failed to load course info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  if (loading) return <p>Loading course details...</p>;
  if (!course) return <p>Course not found.</p>;


  const formattedPrice = course.price ? `$${Number(course.price).toLocaleString()}` : 'Free';
  const formattedDate = course.creation_date
    ? new Date(course.creation_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
    : 'Not available';

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !courseId) {
      alert("User not logged in or course not found.");
      return;
    }

    try {
      const result = await enrollInCourse(courseId, user.user_id);
      if (result.success) {
        alert("Payment successful! You are now enrolled.");
        navigate('/my-learning');
      } else {
        alert(`Enrollment failed: ${result.message}`);
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      alert("An error occurred during enrollment.");
    }
  };

  const handleCancel = () => {
    navigate(`/course-details?id=${courseId}`);
  };

  return (
    <div>
      <header className="main-page-header">
        {role === 'admin' && <AdminHeader />}
        {role === 'instructor' && <InstructorHeader />}
        {role === 'student' && <StudentHeader />}

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

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="pay-button">
                  Pay
                </button>
              </div>
            </form>
          </div>

          <div className="order-summary-container">
            <div className="order-summary">
              <h2>Order Summary</h2>

              <div className="course-preview">
                <div className="course-image">
                  <div className="image-placeholder"></div>
                </div>

                <div className="course-preview-details">
                  <h3>{course.title}</h3>
                </div>
              </div>

              <div className="order-details">
                <div className="order-detail-item">
                  <span className="detail-label">Instructor Name</span>
                  <span className="detail-value">{course.first_name + " " + course.last_name}</span>
                </div>
                <div className="order-detail-item">
                  <span className="detail-label">Creation Date</span>
                  <span className="detail-value">{formattedDate}</span>
                </div>
                <div className="order-detail-item">
                  <span className="detail-label">Level</span>
                  <span className="detail-value">Level {course.difficulty_level}</span>
                </div>
              </div>

              <div className="price-breakdown">
                <div className="price-item">
                  <span className="price-label">Program Price</span>
                  <span className="price-value">{formattedPrice}</span>
                </div>
                <div className="price-item total">
                  <span className="price-label">Total</span>
                  <span className="price-value">{formattedPrice}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionPage;