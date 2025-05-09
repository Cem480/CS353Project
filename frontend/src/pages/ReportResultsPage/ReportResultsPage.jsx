// src/pages/ReportResultsPage/ReportResultsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    LineChart, Line,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { getCurrentUser } from '../../services/auth';
import './ReportResultsPage.css';

/* ──────────────────────────────────────────────────────────────────────────── */
const COLORS = ['var(--primary-color)', 'var(--accent-color)'];

const Metric = ({ label, value }) => (
    <div className="metric-card">
        <strong>{label}</strong>
        <p>{value}</p>
    </div>
);

const Highlight = ({ title, lines }) => (
    <div className="info-card">
        <h4>{title}</h4>
        {lines.map(([k, v]) => (
            <p key={k}><strong>{k}:</strong> {v}</p>
        ))}
    </div>
);

const ChartBlock = ({ title, type, data, dataKey, xKey = 'month' }) => (
    <section className="chart-section">
        <h3>{title}</h3>
        <ResponsiveContainer width="100%" height={260}>
            {type === 'line' ? (
                <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={xKey} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey={dataKey} stroke="var(--primary-color)" />
                </LineChart>
            ) : (
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={xKey} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey={dataKey} fill="var(--primary-color)" />
                </BarChart>
            )}
        </ResponsiveContainer>
    </section>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ReportResultsPage() {
    const { reportType, reportId } = useParams();
    const userId = getCurrentUser()?.user_id;

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const res = await fetch(
                    `http://localhost:5001/api/report/${reportType}/${reportId}?admin_id=${userId}`,
                    { credentials: 'include' }
                );
                const json = await res.json();
                if (!json.success) throw new Error(json.message);
                setReport(json.data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [reportType, reportId, userId]);

    if (loading) return <div className="report-page"><p>Loading…</p></div>;
    if (error) return <div className="report-page"><p className="error">{error}</p></div>;
    if (!report) return null;

    // helpers
    const objToSeries = obj => Object.entries(obj || {}).map(([m, v]) => ({ month: m, count: Number(v) }));

    // registration series (student or instructor)
    let regSeries = [];
    if (report.monthly_registrations) {
        regSeries = objToSeries(report.monthly_registrations);
    } else if (report.monthly_stats) {
        regSeries = report.monthly_stats.map(m => ({
            month: m.month || m.month_start?.slice(0, 7),
            count: Number(m.registration_count ?? m.monthly_reg_count)
        }));
    }

    const isInstructor = reportType === 'instructor';
    const isCourse = reportType === 'course';
    const isCourseRanged = isCourse && Array.isArray(report.monthly_metrics);
    const lastInstr = (isInstructor && Array.isArray(report.monthly_stats) && report.monthly_stats.length)
        ? report.monthly_stats.at(-1)
        : null;
    // if ranged → use lastInstr, else use report summary
    const instrSource = isInstructor
        ? (lastInstr ?? report)
        : {};

    // course-general pie & bars & line
    const pieData = isCourse && !isCourseRanged ? [
        { name: 'Free', value: report.free_course_count },
        { name: 'Paid', value: report.paid_course_count },
    ] : [];
    const enrollBarData = isCourse && !isCourseRanged ? [
        { type: 'Free', count: report.free_enroll_count },
        { type: 'Paid', count: report.paid_enroll_count },
    ] : [];
    const createdLine = isCourse && !isCourseRanged
        ? objToSeries(report.courses_created_last_year)
        : [];

    return (
        <div className="report-page">
            <div className="page-title">
                <h2>
                    {reportType === 'student' ? 'Student'
                        : reportType === 'instructor' ? 'Instructor'
                            : 'Course'} Report
                </h2>
                {report.range && <p>{report.range.start} → {report.range.end}</p>}
            </div>

            {/* ──────────────── STUDENT / INSTRUCTOR U I ──────────────── */}
            {(reportType === 'student' || isInstructor) && (
                <StudentInstructorUI
                    report={report}
                    regSeries={regSeries}
                    isInstructor={isInstructor}
                    instrSource={instrSource}
                />
            )}

            {/* ====================== COURSE GENERAL ======================== */}
            {isCourse && !isCourseRanged && (
                <CourseGeneralUI
                    report={report}
                    pieData={pieData}
                    enrollBarData={enrollBarData}
                    createdLine={createdLine}
                />
            )}

            {/* ====================== COURSE RANGED ========================= */}
            {isCourseRanged && (
                <CourseRangedUI report={report} />
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════ */
function StudentInstructorUI({ report, regSeries, isInstructor = false, instrSource = {} }) {
    return (
        <>
            <ChartBlock title="Monthly Registrations" type="line" data={regSeries} dataKey="count" />

            <section className="cards-section">
                <h3>{report.top_students ? 'Top 3 Students' : 'Top 3 Instructors'}</h3>
                <div className="cards-grid">
                    {(report.top_students || report.top_instructors).map(item => (
                        <Highlight
                            key={item.id}
                            title={item.full_name}
                            lines={[
                                ...('major' in item ? [['Major', item.major]] : []),
                                ...('rating' in item ? [['Rating', item.rating]] : []),
                                ...('achievement_score' in item ? [['Score', item.achievement_score]] : []),
                            ]}
                        />
                    ))}
                </div>
            </section>

            <section className="snapshot-section">
                <h3>Summary Metrics</h3>
                <div className="metrics-grid">

                    {'total_students' in report && (
                        <>
                            <Metric label="Total Students" value={report.total_students} />
                            <Metric label="Active Students" value={report.active_student_count} />
                            <Metric label="Avg Enroll / Student" value={report.avg_enrollments_per_student} />
                            <Metric label="Avg Certificates" value={report.avg_certificate_per_student} />
                            <Metric label="Completion Rate" value={`${report.avg_completion_rate}%`} />
                            <Metric label="Avg Age" value={report.avg_age} />
                            <Metric label="Age Range" value={`${report.youngest_age} – ${report.oldest_age}`} />
                            <Metric label="Most Common Major" value={`${report.most_common_major} (${report.most_common_major_count})`} />
                        </>
                    )}

                    {isInstructor && (
                        <>
                            <Metric label="Total Instructors" value={instrSource.total_instructors} />
                            <Metric label="Free-Course Instructors" value={instrSource.instructors_with_free_course} />
                            <Metric label="Paid-Course Instructors" value={instrSource.instructors_with_paid_course} />
                            <Metric label="Avg Courses / Instructor" value={instrSource.avg_courses_per_instructor} />
                            <Metric label="Avg Age" value={instrSource.avg_age} />
                            <Metric label="Age Range" value={`${instrSource.youngest_age} – ${instrSource.oldest_age}`} />
                        </>
                    )}

                </div>
            </section>

            {isInstructor && (
                <section className="cards-section">
                    <h3>Highlights</h3>
                    <div className="cards-grid">
                        <Highlight title="Most Active Instructor" lines={[
                            ['Name', report.most_active_instructor.full_name],
                            ['Courses', report.most_active_instructor.total_courses],
                        ]} />
                        <Highlight title="Most Popular Instructor" lines={[
                            ['Name', report.most_popular_instructor.full_name],
                            ['Enrollments', report.most_popular_instructor.total_enrollments],
                        ]} />
                    </div>
                </section>
            )}
        </>
    );
}

/* ════════════════════════════════════════════════════════════════════════ */
function CourseGeneralUI({ report, pieData, enrollBarData, createdLine }) {
    return (
        <>
            <ChartBlock title="Category Enrollments" type="bar" data={report.category_enrollments} dataKey="total_enrollments" />
            <ChartBlock title="Difficulty Level Enrollments" type="bar" data={report.difficulty_stats} dataKey="total_enrollments" />

            <section className="snapshot-section">
                <h3>Snapshot Metrics</h3>
                <div className="metrics-grid">
                    <Metric label="Total Courses" value={report.total_courses} />
                    <Metric label="Free Courses" value={report.free_course_count} />
                    <Metric label="Paid Courses" value={report.paid_course_count} />
                    <Metric label="Avg Enroll / Course" value={report.avg_enroll_per_course} />
                    <Metric label="Total Revenue" value={`$${report.total_revenue}`} />
                    <Metric label="Avg Completion Rate" value={`${report.avg_completion_rate}%`} />
                </div>
            </section>

            <section className="chart-section">
                <h3>Free vs Paid Courses</h3>
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </section>

            <section className="chart-section">
                <h3>Enrollments: Free vs Paid</h3>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={enrollBarData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="var(--primary-color)" />
                    </BarChart>
                </ResponsiveContainer>
            </section>

            <ChartBlock title="Courses Created (Last 12 Months)" type="line" data={createdLine} dataKey="count" />

            <section className="cards-section">
                <h3>Highlights</h3>
                <div className="cards-grid">
                    <Highlight title="Most Popular Course" lines={[
                        ['Title', report.most_popular_course_title],
                        ['Enrollments', report.most_popular_enrollment_count],
                        ['Price', report.most_popular_price === 0 ? 'Free' : `$${report.most_popular_price}`],
                        ['Instructor', report.most_popular_instructor_name],
                    ]} />
                    <Highlight title="Most Completed Course" lines={[
                        ['Title', report.most_completed_course_title],
                        ['Completions', report.most_completed_enrollment_count],
                        ['Ratio', `${report.most_completed_completion_ratio}%`],
                        ['Price', report.most_completed_price === 0 ? 'Free' : `$${report.most_completed_price}`],
                        ['Instructor', report.most_completed_instructor_name],
                    ]} />
                </div>
            </section>
        </>
    );
}

/* ════════════════════════════════════════════════════════════════════════ */
function CourseRangedUI({ report }) {
    const mm = report.monthly_metrics;
    return (
        <>
            <ChartBlock title="Monthly Total Revenue" type="line" data={mm} dataKey="total_revenue" />
            <ChartBlock title="New Courses per Month" type="bar" data={mm} dataKey="new_course_count" />
            <ChartBlock title="Monthly Enrollments" type="bar" data={mm} dataKey="enroll_count" />
            <ChartBlock title="Average Completion Rate" type="line" data={mm} dataKey="avg_completion_rate" />

            <section className="cards-section">
                <h3>Most Popular Course – by Month</h3>
                <div className="cards-grid">
                    {mm.map(m => (
                        <Highlight key={`pop-${m.month}`} title={m.month} lines={[
                            ['Title', m.most_popular_course_title],
                            ['Enrollments', m.pop_enroll_count ?? m.enroll_count],
                            ['Price', m.price === 0 ? 'Free' : `$${m.price}`],
                            ['Instructor', m.most_popular_instructor_name],
                        ]} />
                    ))}
                </div>
            </section>

            <section className="cards-section">
                <h3>Most Completed Course – by Month</h3>
                <div className="cards-grid">
                    {mm.map(m => (
                        <Highlight key={`cmp-${m.month}`} title={m.month} lines={[
                            ['Title', m.most_completed_course_title],
                            ['Completions', m.completion_count ?? m.most_completed_count],
                            ['Price', m.price === 0 ? 'Free' : `$${m.price}`],
                            ['Instructor', m.most_completed_instructor_name],
                        ]} />
                    ))}
                </div>
            </section>
        </>
    );
}
