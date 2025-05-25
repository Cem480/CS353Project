import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './AuthPage.css';
import { loginUser, registerUser, isLoggedIn } from '../../services/auth';

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone_no: '',
    email: '',
    password: '',
    confirmPassword: '',
    birth_date: '',
    role: 'student', // Default role
    major: '' // Added major field for students
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Turkish phone number validation function
  const validateTurkishPhone = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Turkish phone patterns:
    // Mobile: starts with 5, total 10 digits (without country code)
    // With country code: +90 5XX XXX XX XX (total 13 digits including +90)
    // Landline: starts with area codes like 212, 216, 232, etc.
    
    // Check if it starts with +90 or 0090
    if (cleanPhone.startsWith('90') && cleanPhone.length === 12) {
      // +90 5XX XXX XX XX format
      return cleanPhone.substring(2, 3) === '5';
    }
    
    // Check if it starts with 0
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      // 05XX XXX XX XX format
      return cleanPhone.substring(1, 2) === '5';
    }
    
    // Check if it's just 10 digits starting with 5
    if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
      return true;
    }
    
    return false;
  };

  // Format Turkish phone number
  const formatTurkishPhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
      // Format as 5XX XXX XX XX
      return cleanPhone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
    
    if (cleanPhone.length === 11 && cleanPhone.startsWith('05')) {
      // Format as 05XX XXX XX XX
      return cleanPhone.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
    
    if (cleanPhone.length === 12 && cleanPhone.startsWith('905')) {
      // Format as +90 5XX XXX XX XX
      return '+90 ' + cleanPhone.substring(2).replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
    
    return phone;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    let newValidationErrors = { ...validationErrors };

    // Handle phone number formatting and validation
    if (name === 'phone_no') {
      // Allow only digits, spaces, +, and - characters
      newValue = value.replace(/[^0-9\s+\-]/g, '');
      
      // Validate phone number in real-time
      if (newValue && !validateTurkishPhone(newValue)) {
        newValidationErrors.phone_no = 'Please enter a valid Turkish mobile number (e.g., 5XX XXX XX XX)';
      } else {
        delete newValidationErrors.phone_no;
      }
    }

    // Handle email validation
    if (name === 'email') {
      if (newValue && !validateEmail(newValue)) {
        newValidationErrors.email = 'Please enter a valid email address';
      } else {
        delete newValidationErrors.email;
      }
    }

    // Password strength validation
    if (name === 'password' && !isLogin) {
      if (newValue.length < 8) {
        newValidationErrors.password = 'Password must be at least 8 characters long';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newValue)) {
        newValidationErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      } else {
        delete newValidationErrors.password;
      }
    }

    // Confirm password validation
    if (name === 'confirmPassword' && !isLogin) {
      if (newValue !== formData.password) {
        newValidationErrors.confirmPassword = 'Passwords do not match';
      } else {
        delete newValidationErrors.confirmPassword;
      }
    }

    // Update validation errors
    setValidationErrors(newValidationErrors);

    setFormData({
      ...formData,
      [name]: newValue
    });
  };

  // Handle phone number blur to format it
  const handlePhoneBlur = (e) => {
    const { value } = e.target;
    if (value && validateTurkishPhone(value)) {
      setFormData({
        ...formData,
        phone_no: formatTurkishPhone(value)
      });
    }
  };

  const validateForm = () => {
    // Reset error
    setError('');

    if (isLogin) {
      if (!formData.email || !formData.password) {
        setError('Email and password are required');
        return false;
      }

      if (!validateEmail(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    } else {
      // Registration validation
      if (!formData.first_name || !formData.last_name) {
        setError('First name and last name are required');
        return false;
      }

      if (!formData.email) {
        setError('Email is required');
        return false;
      }

      if (!validateEmail(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }

      if (!formData.password) {
        setError('Password is required');
        return false;
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        return false;
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords don't match");
        return false;
      }

      if (!formData.birth_date) {
        setError('Birth date is required');
        return false;
      }

      // Validate phone number if provided
      if (formData.phone_no && !validateTurkishPhone(formData.phone_no)) {
        setError('Please enter a valid Turkish mobile number');
        return false;
      }

      // Validate major when role is student
      if (formData.role === 'student' && !formData.major) {
        setError('Major is required for students');
        return false;
      }

      // Check if there are any validation errors
      if (Object.keys(validationErrors).length > 0) {
        setError('Please fix the validation errors before submitting');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login logic
        console.log('Submitting login with:', { email: formData.email, password: formData.password });
        const result = await loginUser(formData.email, formData.password);
        console.log('Login successful:', result);

        if (result.success) {
          // Navigate based on role
          if (result.role === 'instructor') {
            navigate('/instructor/dashboard'); // Use the instructor dashboard
          }
          else if (result.role === "admin") {
            navigate('/admin/dashboard');
          }
          else {
            navigate('/home'); // Default for students and other roles
          }
        } else {
          // This shouldn't happen due to fetch behavior, but just in case
          setError(result.message || 'Login failed');
        }
      } else {
        // Registration logic
        const registrationData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          phone_no: formData.phone_no ? formData.phone_no.replace(/\s/g, '') : null, // Remove spaces for storage
          email: formData.email,
          password: formData.password,
          birth_date: formData.birth_date,
          role: formData.role
        };

        // Add major if role is student
        if (formData.role === 'student') {
          registrationData.major = formData.major;
        }

        console.log('Submitting registration with:', registrationData);
        const result = await registerUser(registrationData);
        console.log('Registration successful:', result);

        if (result.success) {
          // Switch to login screen with success message
          setIsLogin(true);
          setFormData({
            ...formData,
            password: '',
            confirmPassword: ''
          });
          alert('Registration successful! Please log in.');
        } else {
          // This shouldn't happen due to fetch behavior, but just in case
          setError(result.message || 'Registration failed');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message || (isLogin ? 'Login failed' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setValidationErrors({});
    // Reset form when switching modes
    setFormData({
      first_name: '',
      last_name: '',
      middle_name: '',
      phone_no: '',
      email: '',
      password: '',
      confirmPassword: '',
      birth_date: '',
      role: 'student',
      major: ''
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* Logo Section */}
        <div className="logo-section">
          <h1 className="logo-title">LearnHub</h1>
          <p className="logo-subtitle">Expand your knowledge and skills</p>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          {/* Tab Switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Log In
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="error-message" style={{ color: 'red', padding: '10px 20px 0', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Form Section */}
          <div className="auth-form-container">
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="first_name" className="form-label">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your first name"
                    required={!isLogin}
                  />
                </div>
              )}

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="middle_name" className="form-label">
                    Middle Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="middle_name"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your middle name"
                  />
                </div>
              )}

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="last_name" className="form-label">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your last name"
                    required={!isLogin}
                  />
                </div>
              )}

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="phone_no" className="form-label">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="phone_no"
                    name="phone_no"
                    value={formData.phone_no}
                    onChange={handleInputChange}
                    onBlur={handlePhoneBlur}
                    className={`form-input ${validationErrors.phone_no ? 'error' : ''}`}
                    placeholder="5XX XXX XX XX or +90 5XX XXX XX XX"
                  />
                  {validationErrors.phone_no && (
                    <div className="validation-error">
                      {validationErrors.phone_no}
                    </div>
                  )}
                </div>
              )}

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="birth_date" className="form-label">
                    Birth Date
                  </label>
                  <input
                    type="text"
                    id="birth_date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="DD/MM/YYYY"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${validationErrors.email ? 'error' : ''}`}
                  placeholder="Enter your email"
                  required
                />
                {validationErrors.email && (
                  <div className="validation-error">
                    {validationErrors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`form-input ${validationErrors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  required
                />
                {validationErrors.password && (
                  <div className="validation-error">
                    {validationErrors.password}
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`form-input ${validationErrors.confirmPassword ? 'error' : ''}`}
                    placeholder="Confirm your password"
                    required={!isLogin}
                  />
                  {validationErrors.confirmPassword && (
                    <div className="validation-error">
                      {validationErrors.confirmPassword}
                    </div>
                  )}
                </div>
              )}

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="role" className="form-label">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="form-input"
                    required={!isLogin}
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                  </select>
                </div>
              )}

              {/* Show Major field only when role is student */}
              {!isLogin && formData.role === 'student' && (
                <div className="form-group">
                  <label htmlFor="major" className="form-label">
                    Major
                  </label>
                  <input
                    type="text"
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your major"
                    required={formData.role === 'student'}
                  />
                </div>
              )}

              <div className="form-actions">
                {isLogin && (
                  <Link to="/forgot-password" className="forgot-password">
                    Forgot Password?
                  </Link>
                )}
              </div>

              <div className="form-submit">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading
                    ? (isLogin ? 'Logging In...' : 'Signing Up...')
                    : (isLogin ? 'Log In' : 'Sign Up')
                  }
                </button>
              </div>

              <div className="auth-switch">
                <p className="switch-text">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="switch-button"
                    disabled={loading}
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <p className="footer-copyright">
            © 2025 LearnHub. All rights reserved.
          </p>
          <div className="footer-links">
            <a href="#" className="footer-link">
              Terms
            </a>
            <a href="#" className="footer-link">
              Privacy
            </a>
            <a href="#" className="footer-link">
              Help
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;