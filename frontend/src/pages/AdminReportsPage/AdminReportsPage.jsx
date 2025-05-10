// src/pages/AdminReportsPage/AdminReportsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';
import './AdminReportsPage.css';

export default function AdminReportsPage() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const adminId = getCurrentUser()?.user_id;

    useEffect(() => {
        if (!adminId) return;
        fetch(`http://localhost:5001/api/report/list?admin_id=${adminId}`, {
            credentials: 'include'
        })
            .then(res => res.json())
            .then(json => {
                if (!json.success) throw new Error(json.message);
                setReports(json.data.reports);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [adminId]);

    const formatDate = iso => {
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    };

    const formatMonthYear = iso => {
        // iso is like "YYYY-MM" or an ISO date string
        const [year, month] = iso.slice(0, 7).split('-');
        return `${month}/${year}`;
    };

    if (loading) return <div className="admin-reports-page"><p>Loading…</p></div>;
    if (error) return <div className="admin-reports-page error">{error}</div>;

    return (
        <div className="admin-reports-page">
            <h2>All Generated Reports</h2>
            <table className="reports-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Range</th>
                        <th>Generated On</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map(r => {
                        const [topic] = r.report_type.split('_');
                        return (
                            <tr
                                key={r.report_id}
                                className="clickable"
                                onClick={() =>
                                    navigate(
                                        `/admin/reports/${topic}/${r.report_id}`
                                    )
                                }
                            >
                                <td>{r.report_id}</td>
                                <td>
                                    {r.report_type
                                        .replace('_', ' ')
                                        .replace(/\b\w/g, c => c.toUpperCase())
                                    }
                                </td>
                                <td>
                                    {formatMonthYear(r.time_range_start)} {'→'}{' '}
                                    {formatMonthYear(r.time_range_end)}
                                </td>
                                <td>{formatDate(r.generated_at)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
