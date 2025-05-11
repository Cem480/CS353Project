import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPasswordPage.css';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('http://localhost:5001/api/forgot_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() })
            });
            const result = await res.json();
            if (result.success) {
                setMessage('A new password has been sent to your email.');
                setTimeout(() => navigate('/login'), 1000); // Redirect after 3s
            }
            else {
                setError(result.message || 'Something went wrong.');
            }
        } catch (err) {
            console.error(err);
            setError('Server error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-container">
            <div className="forgot-box">
                <h2>Reset Your Password</h2>
                <p>Enter your email and we’ll send you a new password.</p>
                <form onSubmit={handleSubmit} className="forgot-form">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="forgot-input"
                        required
                    />
                    <button type="submit" className="forgot-button" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Email'}
                    </button>
                </form>
                {message && <p className="success-msg">{message}</p>}
                {error && <p className="error-msg">{error}</p>}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
