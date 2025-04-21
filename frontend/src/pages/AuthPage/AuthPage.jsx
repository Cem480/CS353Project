import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    role: 'student' // Default role
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/home');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    // Reset error
    setError('');

    if (isLogin) {
      if (!formData.email || !formData.password) {
        setError('Email and password are required');
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
      
      if (!formData.password) {
        setError('Password is required');
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
          if (result.role === 'student') {
            navigate('/home');
          } else if (result.role === 'instructor') {
            navigate('/my-learning');
          } else {
            navigate('/home'); // Default fallback
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
          phone_no: formData.phone_no || null,
          email: formData.email,
          password: formData.password,
          birth_date: formData.birth_date,
          role: formData.role
        };

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
      role: 'student'
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
                    className="form-input"
                    placeholder="+90XXX-XXX-XX-XX"
                  />
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
                  className="form-input"
                  placeholder="Enter your email"
                  required
                />
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
                  className="form-input"
                  placeholder="Enter your password"
                  required
                />
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
                    className="form-input"
                    placeholder="Confirm your password"
                    required={!isLogin}
                  />
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

              <div className="form-actions">
                {isLogin && (
                  <a className="forgot-password" href="#">
                    Forgot Password?
                  </a>
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