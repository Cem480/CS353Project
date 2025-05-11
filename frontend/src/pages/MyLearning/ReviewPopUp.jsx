import React, { useState } from 'react';
import './ReviewPopUp.css';

const CourseReviewPopup = ({ course, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ courseId: course.id, rating, comment });
    onClose();
  };

  return (
    <div className="review-popup-overlay">
      <div className="review-popup">
        <div className="review-popup-header">
          <h3>Review Course</h3>
          <button className="review-popup-close-button" onClick={onClose}>×</button>
        </div>
        <div className="review-popup-content">
          <h4 className="review-popup-course-name">{course.title}</h4>
          
          <form onSubmit={handleSubmit}>
            <div className="review-popup-rating-container">
              <p>Rate this course:</p>
              <div className="review-popup-star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star}
                    className={`review-popup-star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            
            <div className="review-popup-comment-container">
              <label htmlFor="comment">Your feedback:</label>
              <textarea 
                id="comment" 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this course..."
                rows="4"
              />
            </div>
            
            <div className="review-popup-actions">
              <button type="button" className="review-popup-cancel-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="review-popup-submit-button" disabled={rating === 0}>Submit Review</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourseReviewPopup;