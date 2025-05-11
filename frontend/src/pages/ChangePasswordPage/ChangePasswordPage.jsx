import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import './ChangePasswordPage.css';

const ChangePasswordPage = () => {
    const navigate = useNavigate();
    const userId = getCurrentUser()?.user_id;
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!newPassword || !confirmPassword) {
            setError('Please fill in both fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords don't match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('http://localhost:5001/api/change_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, new_password: newPassword })
            });
            const result = await res.json();

            if (result.success) {
                setMessage('Password changed successfully! Redirecting...');
                setTimeout(() => navigate('/profile'), 2000);
            } else {
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
                <h2>Change Password</h2>
                <form onSubmit={handleSubmit} className="forgot-form">
                    <input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="forgot-input"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="forgot-input"
                        required
                    />
                    <button type="submit" className="forgot-button" disabled={loading}>
                        {loading ? 'Updating...' : 'Change Password'}
                    </button>
                </form>
                {message && <p className="success-msg">{message}</p>}
                {error && <p className="error-msg">{error}</p>}
            </div>
        </div>
    );
};

export default ChangePasswordPage;
