import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './DegreesPage.css';
import { getCurrentUser, logout } from '../../services/auth';
import axios from 'axios';
import StudentHeader from '../../components/StudentHeader';
import AdminHeader from '../../components/AdminHeader';
import InstructorHeader from '../../components/InstructorHeader';

const DegreesPage = () => {
  const navigate = useNavigate();
  const userData = getCurrentUser();
  const initialFetchRef = useRef(false);
  const role = userData?.role;
  // State variables
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [sortOption, setSortOption] = useState("relevance");

  const [filters, setFilters] = useState({
    title: "",
    description: "",
    category: "",
    priceMin: 0,
    priceMax: 20000,
    is_free: false,
    creation_date_from: "",
    creation_date_to: "",
    last_update_date_from: "",
    last_update_date_to: "",
    is_approved: true,
    enrollment_count_min: 0,
    enrollment_count_max: 10000,
    university: "", // This will map to instructor
    level: ""
  });

  const [categories, setCategories] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [levels, setLevels] = useState([]);

  // Navigation functions for the navbar
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const getInitials = () => {
    if (!userData) return 'U';

    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (userData.user_id) {
      return userData.user_id.charAt(0).toUpperCase();
    }

    return 'U';
  };

  // Effects
  useEffect(() => {
    // Redirect to login if no user
    if (!userData) {
      navigate('/login');
      return;
    }

    // Fetch courses only once on initial component mount
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, userData]);

  // Data fetching
  const fetchCourses = async () => {
    try {
      console.log('Fetching online degrees...');
      setLoading(true);
      setError('');

      // Using the correct endpoint for online degrees
      const response = await axios.get('http://localhost:5001/api/degrees');
      const coursesData = response.data;

      console.log('Degrees data received:', coursesData);

      if (!Array.isArray(coursesData)) {
        throw new Error('Invalid response format');
      }

      setCourses(coursesData);
      setFilteredCourses(coursesData);

      // Extract unique categories, instructors, and levels
      const uniqueCategories = [...new Set(coursesData.map(course => course.category))].filter(Boolean);
      const uniqueInstructors = [...new Set(coursesData.map(course =>
        course.instructor_name || "Unknown"))].filter(Boolean);
      const uniqueLevels = [...new Set(coursesData.map(course =>
        course.difficulty_level || "Not specified"))].filter(Boolean);

      setCategories(uniqueCategories);
      setUniversities(uniqueInstructors); // Rename this to instructors in the component
      setLevels(uniqueLevels);
    } catch (err) {
      console.error('Error fetching online degrees:', err);
      setError('Failed to load online degrees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters with API
  const applyFilters = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();

      if (filters.title) {
        params.append('title', filters.title);
      }

      if (filters.description) {
        params.append('description', filters.description);
      }

      if (filters.category) {
        params.append('category', filters.category);
      }

      // Price parameters
      params.append('min_price', filters.priceMin);
      params.append('max_price', filters.priceMax);

      if (filters.is_free) {
        params.append('free_only', 'true');
      }

      // Date parameters
      if (filters.creation_date_from) {
        params.append('creation_start', filters.creation_date_from);
      }

      if (filters.creation_date_to) {
        params.append('creation_end', filters.creation_date_to);
      }

      if (filters.last_update_date_from) {
        params.append('update_start', filters.last_update_date_from);
      }

      if (filters.last_update_date_to) {
        params.append('update_end', filters.last_update_date_to);
      }

      // Enrollment parameters
      params.append('enroll_min', filters.enrollment_count_min);
      params.append('enroll_max', filters.enrollment_count_max);

      // Level parameter
      if (filters.level) {
        params.append('level', filters.level);
      }

      // University (instructor) parameter
      if (filters.university) {
        // This is a bit trickier since we need to search by instructor name
        // We'll use the general search parameter
        params.append('search', filters.university);
      }

      // Sort parameter
      if (sortOption === 'newest') {
        params.append('sort', 'newest');
      } else if (sortOption === 'enrollment') {
        params.append('sort', 'most_enrolled');
      } else if (sortOption === 'price_low') {
        params.append('sort', 'price_low_to_high');
      } else if (sortOption === 'price_high') {
        params.append('sort', 'price_high_to_low');
      } else {
        params.append('sort', 'relevance');
      }

      // Make the API call with filters
      const response = await axios.get(`http://localhost:5001/api/degrees?${params.toString()}`);
      const filteredData = response.data;

      if (!Array.isArray(filteredData)) {
        throw new Error('Invalid response format');
      }

      setFilteredCourses(filteredData);
      setCurrentPage(1); // Reset to first page when filters change

    } catch (err) {
      console.error('Error applying filters:', err);
      setError('Failed to filter courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      title: "",
      description: "",
      category: "",
      priceMin: 0,
      priceMax: 20000,
      is_free: false,
      creation_date_from: "",
      creation_date_to: "",
      last_update_date_from: "",
      last_update_date_to: "",
      is_approved: true,
      enrollment_count_min: 0,
      enrollment_count_max: 10000,
      university: "",
      level: ""
    });
    fetchCourses(); // Refetch courses without filters
    setCurrentPage(1);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Sorting functions
  const handleSortChange = (e) => {
    const sortValue = e.target.value;
    setSortOption(sortValue);

    // Apply current filters with new sort option
    applyFilters();
  };

  // Pagination functions
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Navigation
  const handleViewCourseDetails = (courseId) => {
    navigate(`/course-details?id=${courseId}`);
  };

  // Utility functions
  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatPrice = (price) => {
    if (price === 0) return "Free";
    return `$${price?.toLocaleString() || '0'}`;
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCourses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  // Generate page buttons
  const pageButtons = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pageButtons.push(
        <button
          key={i}
          className={`page-button ${currentPage === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pageButtons.push(<span key={i}>...</span>);
    }
  }

  return (
    <div className="degrees-page">
      {/* Header/Navbar */}
      <header className="main-page-header">
        {role === 'admin' && <AdminHeader />}
        {role === 'instructor' && <InstructorHeader />}
        {role === 'student' && <StudentHeader />}

      </header>

      <div className="degrees-container">
        <div className="page-title">
          <h2>Online Degrees</h2>
          <p>Earn your degree from world-class universities</p>
        </div>

        {/* Error message if any */}
        {error && (
          <div style={{
            padding: '10px',
            margin: '10px auto',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            maxWidth: '1200px',
            textAlign: 'center'
          }}>
            {error}
            <button
              onClick={fetchCourses}
              style={{
                marginLeft: '15px',
                padding: '5px 10px',
                backgroundColor: '#c62828',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            fontSize: '16px',
            color: '#666'
          }}>
            Loading courses...
          </div>
        )}

        {/* Mobile Filter Toggle */}
        <div className="mobile-filter-toggle">
          <button onClick={toggleFilters}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        <div className="main-content">
          {/* Filters Section */}
          <div className={`filters-section ${showFilters ? 'show' : ''}`}>
            <h3>Category</h3>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>{category}</option>
              ))}
            </select>

            <div className="filter-group">
              <h4>Price</h4>
              <div className="price-range">
                <input
                  type="range"
                  name="priceMax"
                  min="0"
                  max="20000"
                  step="500"
                  value={filters.priceMax}
                  onChange={handleFilterChange}
                />
                <div className="price-range-labels">
                  <span>$0</span>
                  <span>${filters.priceMax.toLocaleString()}</span>
                </div>
              </div>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="is_free"
                  name="is_free"
                  checked={filters.is_free}
                  onChange={handleFilterChange}
                />
                <label htmlFor="is_free">Free courses only</label>
              </div>
            </div>

            <div className="filter-group">
              <h4>Creation Date</h4>
              <div className="date-range">
                <label>From</label>
                <input
                  type="date"
                  name="creation_date_from"
                  value={filters.creation_date_from}
                  onChange={handleFilterChange}
                />
                <label>To</label>
                <input
                  type="date"
                  name="creation_date_to"
                  value={filters.creation_date_to}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="filter-group">
              <h4>Last Update Date</h4>
              <div className="date-range">
                <label>From</label>
                <input
                  type="date"
                  name="last_update_date_from"
                  value={filters.last_update_date_from}
                  onChange={handleFilterChange}
                />
                <label>To</label>
                <input
                  type="date"
                  name="last_update_date_to"
                  value={filters.last_update_date_to}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="filter-group">
              <h4>Enrollment Count</h4>
              <div className="enrollment-range">
                <input
                  type="range"
                  name="enrollment_count_max"
                  min="0"
                  max="10000"
                  step="500"
                  value={filters.enrollment_count_max}
                  onChange={handleFilterChange}
                />
                <div className="enrollment-range-labels">
                  <span>0</span>
                  <span>{filters.enrollment_count_max.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="filter-group">
              <h4>Instructor</h4>
              <select name="university" value={filters.university} onChange={handleFilterChange}>
                <option value="">All Instructors</option>
                {universities.map((instructor, index) => (
                  <option key={index} value={instructor}>{instructor}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <h4>Level</h4>
              <select name="level" value={filters.level} onChange={handleFilterChange}>
                <option value="">All Levels</option>
                {levels.map((level, index) => (
                  <option key={index} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <button className="apply-button" onClick={applyFilters}>Apply Filters</button>
          </div>

          {/* Degrees List */}
          <div className="degrees-list">
            <div className="degrees-header">
              <div className="degrees-sort">
                <label htmlFor="sort">Sort by:</label>
                <select
                  id="sort"
                  value={sortOption}
                  onChange={handleSortChange}
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest</option>
                  <option value="enrollment">Most Enrolled</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {!loading && filteredCourses.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#666'
              }}>
                No courses match your filters. Try adjusting your criteria.
              </div>
            )}

            <div className="degrees-grid">
              {currentItems.map(course => (
                <div className="degree-card" key={course.course_id}>
                  <div className="degree-image">
                    {/* Green background as placeholder for course image */}
                  </div>
                  <div className="degree-content">
                    <h3 className="degree-title">{course.title}</h3>
                    <p className="degree-university">{course.instructor_name || "Unknown Instructor"}</p>
                    <p className="degree-description">
                      {course.description || "No description available"}
                    </p>
                    <div className="degree-meta">
                      <div className="degree-detail">
                        <span>Category:</span> {course.category || "Not specified"}
                      </div>
                      <div className="degree-detail">
                        <span>Last Updated:</span> {formatDate(course.last_update_date)}
                      </div>
                      <div className="degree-detail">
                        <span>Enrolled:</span> {course.enrollment_count?.toLocaleString() || 0} students
                      </div>
                    </div>
                    <div className="degree-footer">
                      <div className="degree-price">{formatPrice(course.price)}</div>
                      <button
                        className="learn-more"
                        onClick={() => handleViewCourseDetails(course.course_id)}
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                {currentPage > 1 && (
                  <button
                    className="page-button"
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    &lt;
                  </button>
                )}

                {pageButtons}

                {currentPage < totalPages && (
                  <button
                    className="page-button"
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    &gt;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DegreesPage;