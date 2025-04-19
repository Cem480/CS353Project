import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // This would be where you integrate your authentication logic
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    // Reset form data when switching modes
    setFormData({
      email: '',
      password: '',
      username: '',
      confirmPassword: ''
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

          {/* Form Section */}
          <div className="auth-form-container">
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your username"
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

              <div className="form-actions">
                {isLogin && (
                  <a className="forgot-password" href="#">
                    Forgot Password?
                  </a>
                )}
              </div>

              <div className="form-submit">
                <button type="submit" className="submit-button">
                  {isLogin ? 'Log In' : 'Sign Up'}
                </button>
              </div>

              <div className="auth-switch">
                <p className="switch-text">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="switch-button"
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