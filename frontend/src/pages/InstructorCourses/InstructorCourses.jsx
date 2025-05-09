import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InstructorCourses.css';
import { getCurrentUser, logout } from '../../services/auth';
import { getBasicProfile } from '../../services/user';


const InstructorCourses = () => {
  const navigate = useNavigate();
  const userData = getCurrentUser();
  const [userName, setUserName] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const firstName = userName;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchName = async () => {
      try {
        const profile = await getBasicProfile(userData.user_id);
        setUserName(profile.full_name);
      } catch (err) {
        console.error('Failed to fetch profile name:', err);
        setUserName('Instructor');
      }
    };
  
    if (userData?.user_id) {
      fetchName();
    }
  }, [userData?.user_id]);

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-dropdown')) {
        setShowProfileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  return (
    <div className="instructor-courses-page">
      <header className="main-header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/home')}>
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a href="/home">Dashboard</a>
            <a href="/instructor/courses" className="active">My Courses</a>
            <a href="/analytics">Analytics</a>
            <a href="/applications">Financial Aid</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search courses..." />
            <button className="search-button">Search</button>
          </div>
        <div className="profile-dropdown">
            <div className="profile-icon" onClick={toggleProfileMenu}>
                {userData ? userData.user_id.charAt(0).toUpperCase() : 'I'}
            </div>
            
            {showProfileMenu && (
            <div className="dropdown-menu active">
                <div className="profile-info">
                    <div className="profile-avatar-large">
                    {userData ? userData.user_id.charAt(0).toUpperCase() : 'I'}
                    </div>
                    <div className="profile-details">
                    <div className="profile-name">{firstName}</div>
                    <div className="profile-role">{userData ? userData.role : 'instructor'}</div>
                    </div>
                </div>
                <ul>
                    <li><a href="/my-courses">My Courses</a></li>
                    <li><a href="/earnings">Earnings</a></li>
                    <li><a href="/notifications">Notifications</a></li>
                    <li><a href="/applications">Financial Aid</a></li>
                    <li><a href="/settings">Account Settings</a></li>
                    <div className="menu-divider"></div>
                    <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</a></li>
                </ul>
                </div>
            )}
            </div>
        </div>
      </header>

      <main className="main-content">
        <h2 style={{ textAlign: 'center', marginTop: '40px', color: '#999' }}>
          This page will display all instructor courses soon.
        </h2>
      </main>
    </div>
  );
};

export default InstructorCourses;
