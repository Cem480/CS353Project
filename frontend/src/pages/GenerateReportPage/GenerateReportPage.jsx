// src/pages/GenerateReportPage/GenerateReportPage.jsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import './GenerateReportPage.css';

const GenerateReportPage = () => {
    const navigate = useNavigate();
    const user = getCurrentUser(); // { user_id, role }

    const [topic, setTopic] = useState('Student');
    const [reportType, setReportType] = useState('General');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const monthOptions = useMemo(() => {
        const now = new Date();
        // last completed month: go to the 1st of current month, then back one month
        const lastCompleted = new Date(now.getFullYear(), now.getMonth(), 1);
        const opts = [];
        for (let i = 0; i < 13; i++) {
            const d = new Date(
                lastCompleted.getFullYear(),
                lastCompleted.getMonth() - i,
                1
            );
            opts.push(d.toISOString().slice(0, 7)); // “YYYY-MM”
        }
        return opts;
    }, []);

    const handleGenerate = async () => {
        setError(null);
        // client-side date check
        if (reportType === 'Range Specific' && end < start) {
            setError('End date must not be earlier than start date');
            return;
        }

        setLoading(true);
        try {
            // Build URL
            const path = `/api/report/${topic.toLowerCase()}/${reportType === 'General' ? 'general' : 'ranged'}`;
            const params = new URLSearchParams({ admin_id: user.user_id });
            if (reportType === 'Range Specific') {
                params.append('start', start);
                params.append('end', end);
            }

            const res = await fetch(`http://localhost:5001${path}?${params}`, {
                method: 'GET',
                credentials: 'include'
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            // pick up the new report's ID
            const id =
                json.report_id ||                 // ← top-level
                json.data.report_id ||            // fallback
                json.data.parent_report_id;       // ranged

            if (!id) throw new Error('No report_id returned by server');

            // Navigate to the results page
            navigate(`/admin/reports/${topic.toLowerCase()}/${id}`);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="generate-report-page">
            <h2>Generate Report</h2>
            <div className="form">
                <label>
                    Select Report Topic
                    <select value={topic} onChange={e => setTopic(e.target.value)}>
                        <option>Student</option>
                        <option>Instructor</option>
                        <option>Course</option>
                    </select>
                </label>

                <label>
                    Select Report Type
                    <select value={reportType} onChange={e => setReportType(e.target.value)}>
                        <option>General</option>
                        <option>Range Specific</option>
                    </select>
                </label>

                {reportType === 'Range Specific' && (
                    <div className="date-range">
                        <label>
                            Start
                            <select value={start} onChange={e => setStart(e.target.value)}>
                                <option value="">--</option>
                                {monthOptions.map(m => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            End
                            <select value={end} onChange={e => setEnd(e.target.value)}>
                                <option value="">--</option>
                                {monthOptions.map(m => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {error && <div className="error">{error}</div>}

                <button onClick={handleGenerate} disabled={loading}>
                    {loading ? 'Generating…' : 'Generate Report'}
                </button>
            </div>
        </div>
    );
};

export default GenerateReportPage;
