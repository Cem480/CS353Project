import React, { useEffect, useState } from 'react';
import { getUngradedSubmissions, gradeSubmission } from '../../services/instructor';
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
  const [hasMore, setHasMore] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  const [gradeInputs, setGradeInputs] = useState({});
  const [submittingGrade, setSubmittingGrade] = useState(null);
  const [gradeErrors, setGradeErrors] = useState({});

  const handleGradeChange = (key, value) => {
    setGradeInputs({ ...gradeInputs, [key]: value });

    const num = parseInt(value);
    if (isNaN(num) || num < 0 || num > 100) {
      setGradeErrors(prev => ({ ...prev, [key]: "Grade must be between 0 and 100." }));
    } else {
      setGradeErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };
  
  const submitGrade = async (sub) => {
    const key = `${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}`;
    const grade = gradeInputs[key];
  
    if (!grade || isNaN(grade)) return alert("Please enter a valid grade between 0-100");
  
    const num = parseInt(grade);
    if (isNaN(num) || num < 0 || num > 100) {
      setGradeErrors(prev => ({ ...prev, [key]: "Grade must be between 0 and 100." }));
      return;
    }

    setSubmittingGrade(key);
    const result = await gradeSubmission(sub.course_id, sub.sec_id, sub.content_id, sub.student_id, grade);
  
    if (result.success) {
      // Remove the graded item from list
      setSubmissions(prev => prev.filter(s =>
        !(s.course_id === sub.course_id &&
          s.sec_id === sub.sec_id &&
          s.content_id === sub.content_id &&
          s.student_id === sub.student_id)
      ));
    } else {
      alert("Failed to grade: " + result.message);
    }
    setSubmittingGrade(null);
  };

  const toggleCard = (index) => {
    setExpandedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };  

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
      setSubmissions(result.ungraded_contents); // NOTE: updated to match new API field
      // ✅ Disable next if result is less than requested limit
      setHasMore(result.ungraded_contents.length === limit);
    } else {
      setError(result.message || "Failed to load submissions");
      setHasMore(false);
    }
    setLoading(false);
  };

  const handleSortChange = (e) => {
    setPage(0);
    setSort(e.target.value);
  };

  return (
    <>
      <InstructorHeader />

      <div className="grading-page">
        <h2>Ungraded Content Submissions</h2>

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
          <div className="grading-card-container">
            {submissions.map((sub, i) => (
              <div className="grading-card" key={i}>
                <h3>{sub.content_title}</h3>
                <p><strong>Student:</strong> {sub.first_name} {sub.last_name}</p>
                <p><strong>Content:</strong> {sub.content_title}</p>
                <p><strong>Type:</strong> {(sub.task_type === "assignment") ? "Assignment" : "Assessment"}</p>
                <p><strong>Submitted:</strong> {new Date(sub.submission_date).toLocaleDateString()}</p>

                <button onClick={() => toggleCard(i)} className="show-more-btn">
                  {expandedCards[i] ? "Show Less" : "Show More"}
                </button>

                {expandedCards[i] && (
                <>
                  {sub.task_type === "assignment" && (
                    <div>
                      <p><strong>Start Date:</strong> {new Date(sub.start_date).toLocaleDateString()}</p>
                      <p><strong>End Date:</strong> {new Date(sub.end_date).toLocaleDateString()}</p>
                      <p><strong>Upload Type:</strong> {sub.upload_material}</p>

                      {sub.assignment_file_url && (
                        <p>
                          <strong>Assignment File:</strong>{" "}
                          <a href={`http://localhost:5001${sub.assignment_file_url}`} download>
                            Download Assignment File
                          </a>
                        </p>
                      )}

                      {sub.download_url && (
                        <p>
                          <strong>Submitted File:</strong>{" "}
                          <a href={`http://localhost:5001${sub.download_url}`} download>
                            Download Student Submission
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                  {sub.task_type === "assessment" && (
                    <div>
                      <p><strong>Question Count:</strong> {sub.question_count}</p>
                      <h4>Questions:</h4>
                      {sub.questions && sub.questions.map((q, idx) => (
                        <div key={idx} style={{ marginBottom: '10px', paddingLeft: '10px' }}>
                          <p><strong>Q{idx + 1}:</strong> {q.question_body}</p>
                          <p><strong>Max Time:</strong> {q.max_time} seconds</p>
                          <p><strong>Correct Answer:</strong> {q.correct_answer}</p>
                          {sub.answers && (
                            <p><strong>Student Answer:</strong> {JSON.parse(sub.answers || "{}")[q.question_id]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
                )}

                <div style={{ marginTop: '10px' }}>
                  <label><strong>Grade (0-100):</strong></label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={`grade-input ${gradeErrors[`${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}`] ? 'invalid' : ''}`}
                    value={gradeInputs[`${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}`] || ""}
                    onChange={(e) =>
                      handleGradeChange(`${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}`, e.target.value)
                    }
                    style={{ marginLeft: '10px', width: '60px' }}
                  />
                  <button
                    onClick={() => submitGrade(sub)}
                    disabled={
                      submittingGrade === `${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}` ||
                      !!gradeErrors[`${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}`]
                    }
                    style={{ marginLeft: '10px' }}
                  >
                    {submittingGrade === `${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}` ? "Submitting..." : "Submit Grade"}
                  </button>

                  {/* Error Message */}
                  {gradeErrors[`${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}`] && (
                    <div className="grade-error-message">
                      {gradeErrors[`${sub.course_id}_${sub.sec_id}_${sub.content_id}_${sub.student_id}`]}
                    </div>
                  )}
                </div>


              </div>
            ))}
          </div>
        )}

        <div className="pagination">
          <button onClick={() => setPage(Math.max(page - 1, 0))} disabled={page === 0}>Previous</button>
          <span>Page {page + 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={!hasMore}>Next</button>
        </div>
      </div>
    </>
  );
};

export default InstructorGradingPage;
