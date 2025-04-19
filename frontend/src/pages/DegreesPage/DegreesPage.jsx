import React, { useState } from 'react';
import './DegreesPage.css';

const DegreesPage = () => {
  const mockDegrees = [
    {
      id: 1,
      title: "Master of Computer Science",
      university: "Tech Global University",
      description: "Comprehensive program covering algorithms, AI, and software engineering",
      category: "Computer Science",
      price: 15000,
      is_free: false,
      creation_date: "2023-06-15",
      last_update_date: "2024-11-10",
      is_approved: true,
      enrollment_count: 3240,
      duration: "18-24 months",
      level: "Advanced"
    },
    {
      id: 2,
      title: "Bachelor of Data Science",
      university: "Analytics Institute",
      description: "Learn statistics, programming, and data visualization",
      category: "Data Science",
      price: 12500,
      is_free: false,
      creation_date: "2023-09-22",
      last_update_date: "2024-10-05",
      is_approved: true,
      enrollment_count: 2850,
      duration: "36 months",
      level: "Beginner"
    },
    {
      id: 3,
      title: "MBA in Digital Marketing",
      university: "Business Academy",
      description: "Strategic digital marketing skills for the modern business landscape",
      category: "Business",
      price: 18000,
      is_free: false,
      creation_date: "2024-01-10",
      last_update_date: "2024-08-15",
      is_approved: true,
      enrollment_count: 1950,
      duration: "12-15 months",
      level: "Intermediate"
    },
    {
      id: 4,
      title: "Introduction to Web Development",
      university: "Coding School",
      description: "Learn HTML, CSS, and JavaScript fundamentals",
      category: "Web Development",
      price: 0,
      is_free: true,
      creation_date: "2024-02-28",
      last_update_date: "2024-09-18",
      is_approved: true,
      enrollment_count: 8750,
      duration: "3 months",
      level: "Beginner"
    },
    {
      id: 5,
      title: "Bachelor of Cybersecurity",
      university: "Security Institute",
      description: "Comprehensive cybersecurity degree covering network security, ethical hacking, and security management",
      category: "Cybersecurity",
      price: 14000,
      is_free: false,
      creation_date: "2023-11-05",
      last_update_date: "2024-07-22",
      is_approved: true,
      enrollment_count: 2150,
      duration: "36 months",
      level: "Beginner to Advanced"
    },
    {
      id: 6,
      title: "Master of Artificial Intelligence",
      university: "AI University",
      description: "Advanced study of machine learning, neural networks, and AI applications",
      category: "Artificial Intelligence",
      price: 16500,
      is_free: false,
      creation_date: "2023-08-15",
      last_update_date: "2024-09-30",
      is_approved: true,
      enrollment_count: 1840,
      duration: "24 months",
      level: "Advanced"
    }
  ];

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
    university: "",
    level: ""
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getFilteredDegrees = () => {
    return mockDegrees;
  };

  const filteredDegrees = getFilteredDegrees();

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const formatPrice = (price) => {
    if (price === 0) return "Free";
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="degrees-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <div className="logo">
            <h1>LearnHub</h1>
          </div>
          <div className="nav-links">
            <a href="#">Home</a>
            <a href="#" className="active">Online Degrees</a>
            <a href="#">Certificates</a>
          </div>
        </div>
        <div className="header-right">
          <div className="search-bar">
            <input type="text" placeholder="Search degrees..." />
            <button className="search-button">Search</button>
          </div>
          <div className="notifications-icon">🔔</div>
          <div className="profile-icon">JS</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="degrees-container">
        <div className="page-title">
          <h2>Online Degrees</h2>
          <p>Earn your degree from world-class universities</p>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="mobile-filter-toggle">
          <button onClick={toggleFilters}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        <div className="main-content">
          {/* Filters Section */}
          <div className={`filters-section ${showFilters ? 'show' : ''}`}>
            <div className="filters-header">
              <h3>Filters</h3>
              <button className="clear-all">Clear All</button>
            </div>

            <div className="filter-group">
              <h4>Title</h4>
              <input 
                type="text" 
                name="title" 
                value={filters.title} 
                onChange={handleFilterChange} 
                placeholder="Search by title"
              />
            </div>

            <div className="filter-group">
              <h4>Description</h4>
              <input 
                type="text" 
                name="description" 
                value={filters.description} 
                onChange={handleFilterChange} 
                placeholder="Search in description"
              />
            </div>

            <div className="filter-group">
              <h4>Category</h4>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Data Science">Data Science</option>
                <option value="Business">Business</option>
                <option value="Web Development">Web Development</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
              </select>
            </div>

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
              <h4>Status</h4>
              <div className="checkbox-group">
                <input 
                  type="checkbox" 
                  id="is_approved" 
                  name="is_approved" 
                  checked={filters.is_approved} 
                  onChange={handleFilterChange}
                />
                <label htmlFor="is_approved">Approved courses only</label>
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
              <h4>University</h4>
              <select name="university" value={filters.university} onChange={handleFilterChange}>
                <option value="">All Universities</option>
                <option value="Tech Global University">Tech Global University</option>
                <option value="Analytics Institute">Analytics Institute</option>
                <option value="Business Academy">Business Academy</option>
                <option value="Coding School">Coding School</option>
                <option value="Security Institute">Security Institute</option>
                <option value="AI University">AI University</option>
              </select>
            </div>

            <div className="filter-group">
              <h4>Level</h4>
              <select name="level" value={filters.level} onChange={handleFilterChange}>
                <option value="">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Beginner to Advanced">Beginner to Advanced</option>
              </select>
            </div>

            <button className="apply-filters">Apply Filters</button>
          </div>

          {/* Degrees List */}
          <div className="degrees-list">
            <div className="degrees-header">
              <h3>Showing {filteredDegrees.length} Degrees</h3>
              <div className="degrees-sort">
                <label htmlFor="sort">Sort by:</label>
                <select id="sort">
                  <option value="relevance">Relevance</option>
                  <option value="newest">Newest</option>
                  <option value="enrollment">Most Enrolled</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>

            <div className="degrees-grid">
              {filteredDegrees.map(degree => (
                <div className="degree-card" key={degree.id}>
                  <div className="degree-image">
                    {/* Placeholder for degree image */}
                    <div className="degree-level">{degree.level}</div>
                  </div>
                  <div className="degree-content">
                    <h3 className="degree-title">{degree.title}</h3>
                    <p className="degree-university">{degree.university}</p>
                    <p className="degree-description">{degree.description}</p>
                    <div className="degree-meta">
                      <div className="degree-detail">
                        <span>Duration:</span> {degree.duration}
                      </div>
                      <div className="degree-detail">
                        <span>Last Updated:</span> {formatDate(degree.last_update_date)}
                      </div>
                      <div className="degree-detail">
                        <span>Enrolled:</span> {degree.enrollment_count.toLocaleString()} students
                      </div>
                    </div>
                    <div className="degree-footer">
                      <div className="degree-price">{formatPrice(degree.price)}</div>
                      <button className="degree-learn-more">Learn More</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button className="page-button active">1</button>
              <button className="page-button">2</button>
              <button className="page-button">3</button>
              <button className="page-button">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DegreesPage;