import React, { useEffect, useState } from 'react';
import { getUngradedSubmissions } from '../../services/instructor';
import { getCurrentUser } from '../../services/auth';
import './Grading.css';
import InstructorHeader from '../../components/InstructorHeader';

const InstructorGradingPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const instructorId = getCurrentUser()?.user_id;

  useEffect(() => {
    if (!instructorId) return;
    fetchData();
  }, [sort, page]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    const offset = page * limit;

    const result = await getUngradedSubmissions(instructorId, sort, limit, offset);
    if (result.success) {
      setSubmissions(result.submissions);
    } else {
      setError(result.message || "Failed to load submissions");
    }
    setLoading(false);
  };

  const handleSortChange = (e) => {
    setPage(0);
    setSort(e.target.value);
  };

  return (
    <>
    {/* Use the same Instructor Header */}
    <InstructorHeader />  
      
    
    <div className="grading-page">
    <h2>Ungraded Submissions</h2>

      <div className="grading-controls">
        <label>Sort by:</label>
        <select value={sort} onChange={handleSortChange}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="student">Student Name</option>
          <option value="course">Course Title</option>
        </select>
      </div>

      {loading ? (
        <p>Loading submissions...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : submissions.length === 0 ? (
        <p>No ungraded submissions found.</p>
      ) : (
        <table className="grading-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Content</th>
              <th>Submitted On</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub, i) => (
              <tr key={i}>
                <td>{sub.first_name} {sub.last_name}</td>
                <td>{sub.course_title}</td>
                <td>{sub.content_title}</td>
                <td>{new Date(sub.submission_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Simple Pagination */}
      <div className="pagination">
        <button onClick={() => setPage(Math.max(page - 1, 0))} disabled={page === 0}>Previous</button>
        <span>Page {page + 1}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
    </>
  );
};

export default InstructorGradingPage;
