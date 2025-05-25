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
import AdminHeader from '../../components/AdminHeader';

const COLORS = ['var(--primary-color)', 'var(--accent-color)'];

const Metric = ({ label, value }) => (
    <div className="metric-card">
        <strong>{label}</strong>
        <p>{value}</p>
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

function StudentInstructorUI({ report, regSeries, isInstructor = false, instrSource = {} }) {
    const monthlyStats = report.monthly_stats || [];

    const monthlyLine = (key) => monthlyStats.map(m => ({
        month: m.month_start?.slice(0, 7) || m.month || '',
        value: m[key] != null ? Number(m[key]) : null
    }));

    return (
        <>
            <ChartBlock title="Monthly Registrations" type="line" data={regSeries} dataKey="count" />
            {!isInstructor && monthlyStats.length > 0 && (
                <>
                    <ChartBlock
                        title="Monthly Active Students"
                        type="line"
                        data={monthlyStats.map(m => ({
                            month: m.month_start?.slice(0, 7),
                            value: Number(m.active_student_count ?? 0)
                        }))}
                        dataKey="value"
                        xKey="month"
                    />

                    <ChartBlock
                        title="Average Completion Rate per Month"
                        type="bar"
                        data={monthlyStats.map(m => ({
                            month: m.month_start?.slice(0, 7),
                            value: Number(m.avg_completion_rate ?? 0)
                        }))}
                        dataKey="value"
                        xKey="month"
                    />

                    <ChartBlock
                        title="Average Enrollments per Student"
                        type="line"
                        data={monthlyStats.map(m => ({
                            month: m.month_start?.slice(0, 7),
                            value: Number(m.avg_enrollments_per_student ?? 0)
                        }))}
                        dataKey="value"
                        xKey="month"
                    />

                    <ChartBlock
                        title="Total Students"
                        type="bar"
                        data={monthlyStats.map(m => ({
                            month: m.month_start?.slice(0, 7),
                            value: Number(m.total_students ?? 0)
                        }))}
                        dataKey="value"
                        xKey="month"
                    />
                </>
            )}
            {!isInstructor && monthlyStats.length > 0 && (
                <section className="snapshot-section">
                    <h3>Most Common Major – by Month</h3>
                    <div className="metrics-grid">
                        {monthlyStats.map((m, idx) => (
                            <Metric
                                key={m.month_start}
                                label={m.month_start?.slice(0, 7)}
                                value={
                                    m.most_common_major
                                        ? `${m.most_common_major} (${m.most_common_major_count})`
                                        : '—'
                                }
                            />
                        ))}
                    </div>
                </section>
            )}



            {isInstructor && monthlyStats.length > 0 && (
                <>
                    <ChartBlock title="Avg Courses per Instructor" type="line" data={monthlyLine('avg_courses_per_instructor')} dataKey="value" />
                    <ChartBlock title="Free-Course Instructors" type="bar" data={monthlyLine('instructors_with_free_course')} dataKey="value" />
                    <ChartBlock title="Paid-Course Instructors" type="bar" data={monthlyLine('instructors_with_paid_course')} dataKey="value" />
                    <ChartBlock title="Total Instructors" type="line" data={monthlyLine('total_instructors')} dataKey="value" />
                </>
            )}

            <section className="cards-section">
                <h3>{report.top_students ? 'Top 3 Students' : 'Top 3 Instructors'}</h3>
                <div className="cards-grid">
                    {(report.top_students || report.top_instructors).map((item, idx) => (
                        <div className="info-card" key={item.id}>
                            <div className="rank-badge">{idx + 1}</div>
                            <div>
                                <h4>{item.full_name}</h4>
                                {('major' in item) && <p><strong>Major:</strong> {item.major}</p>}
                                {('rating' in item) && <p><strong>Rating:</strong> {item.rating}</p>}
                                {('achievement_score' in item) && <p><strong>Score:</strong> {item.achievement_score}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {(
                // Show summary section only for general student report or any instructor report
                (!isInstructor && !Array.isArray(report.monthly_stats)) ||
                isInstructor
            ) && (
                    <section className="snapshot-section">
                        <h3>Summary Metrics</h3>
                        <div className="metrics-grid">

                            {/* ───── GENERAL STUDENT REPORT ───── */}
                            {!isInstructor && !Array.isArray(report.monthly_stats) && (
                                <>
                                    <Metric label="Total Students" value={report.total_students} />
                                    <Metric label="Active Students" value={report.active_student_count} />
                                    <Metric label="Average Enrollment Per Student" value={report.avg_enrollments_per_student} />
                                    <Metric label="Average Certificates" value={report.avg_certificate_per_student} />
                                    <Metric label="Average Completion Rate" value={`${report.avg_completion_rate}%`} />
                                    <Metric label="Average Age" value={report.avg_age ?? '—'} />
                                    {(report.youngest_age != null && report.oldest_age != null) && (
                                        <Metric label="Age Range" value={`${report.youngest_age} – ${report.oldest_age}`} />
                                    )}
                                    <Metric label="Most Common Major" value={`${report.most_common_major} (${report.most_common_major_count})`} />
                                </>
                            )}

                            {/* ───── GENERAL INSTRUCTOR REPORT ───── */}
                            {isInstructor && !Array.isArray(report.monthly_stats) && (
                                <>
                                    {instrSource.total_instructors != null && (
                                        <Metric label="Total Instructors" value={instrSource.total_instructors} />
                                    )}
                                    {instrSource.instructors_with_free_course != null && (
                                        <Metric label="Free-Course Instructors" value={instrSource.instructors_with_free_course} />
                                    )}
                                    {instrSource.instructors_with_paid_course != null && (
                                        <Metric label="Paid-Course Instructors" value={instrSource.instructors_with_paid_course} />
                                    )}
                                    {instrSource.avg_courses_per_instructor != null && (
                                        <Metric label="Avg Courses / Instructor" value={instrSource.avg_courses_per_instructor} />
                                    )}
                                </>
                            )}

                            {/* ───── SHARED INSTRUCTOR INFO ───── */}
                            {isInstructor && (
                                <>
                                    {instrSource.avg_age != null && (
                                        <Metric label="Avg Age" value={instrSource.avg_age} />
                                    )}
                                    {(instrSource.youngest_age != null && instrSource.oldest_age != null) && (
                                        <Metric label="Age Range" value={`${instrSource.youngest_age} – ${instrSource.oldest_age}`} />
                                    )}
                                </>
                            )}

                        </div>
                    </section>
                )}

            {isInstructor && (
                <section className="cards-section">
                    <h3>Highlights</h3>
                    {(() => {
                        const active = report?.most_active_instructor;
                        const popular = report?.most_popular_instructor;

                        const hasActive = active?.full_name && active?.total_courses != null;
                        const hasPopular = popular?.full_name && popular?.total_enrollments != null;

                        if (!hasActive && !hasPopular) {
                            return <p style={{ marginLeft: '1rem' }}>No instructors found.</p>;
                        }

                        return (
                            <div className="monthly-highlight-list">
                                {hasActive && (
                                    <div className="monthly-highlight-card">
                                        <h4>Most Active Instructor</h4>
                                        <p><strong>Name:</strong> {active.full_name}</p>
                                        <p><strong>Courses:</strong> {active.total_courses}</p>
                                    </div>
                                )}
                                {hasPopular && (
                                    <div className="monthly-highlight-card">
                                        <h4>Most Popular Instructor</h4>
                                        <p><strong>Name:</strong> {popular.full_name}</p>
                                        <p><strong>Enrollments:</strong> {popular.total_enrollments}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </section>
            )}
        </>
    );
}

/* ========================================================================= */
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

    const objToSeries = obj => Object.entries(obj || {}).map(([m, v]) => ({ month: m, count: Number(v) }));

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
    const instrSource = isInstructor ? (lastInstr ?? report) : {};

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
        <div className="admin-main-page">
            <AdminHeader />
            <div className="report-page">
                <div className="page-title">
                    <h2>
                        {reportType === 'student' ? 'Student'
                            : reportType === 'instructor' ? 'Instructor'
                                : 'Course'} Report
                    </h2>
                    {report.range && <p>{report.range.start} → {report.range.end}</p>}
                </div>

                {(reportType === 'student' || isInstructor) && (
                    <StudentInstructorUI
                        report={report}
                        regSeries={regSeries}
                        isInstructor={isInstructor}
                        instrSource={instrSource}
                    />
                )}

                {isCourse && !isCourseRanged && (
                    <CourseGeneralUI
                        report={report}
                        pieData={pieData}
                        enrollBarData={enrollBarData}
                        createdLine={createdLine}
                    />
                )}

                {isCourseRanged && (
                    <CourseRangedUI report={report} />
                )}
            </div>
        </div>
    );
}



/* ════════════════════════════════════════════════════════════════════════ */
function CourseGeneralUI({ report, pieData, enrollBarData, createdLine }) {
    return (
        <>
            {report?.category_enrollments?.length > 0 && (
                <ChartBlock
                    title="Category Enrollments"
                    type="bar"
                    data={report.category_enrollments}
                    dataKey="total_enrollments"
                    xKey="category"
                />
            )}

            {report?.difficulty_stats?.length > 0 && (
                <ChartBlock
                    title="Difficulty Level Enrollments"
                    type="bar"
                    data={report.difficulty_stats}
                    dataKey="total_enrollments"
                    xKey="difficulty_level"
                />
            )}

            <section className="snapshot-section">
                <h3>Snapshot Metrics</h3>
                <div className="metrics-grid">
                    {report?.total_courses != null && (
                        <Metric label="Total Courses" value={report.total_courses} />
                    )}
                    {report?.free_course_count != null && (
                        <Metric label="Free Courses" value={report.free_course_count} />
                    )}
                    {report?.paid_course_count != null && (
                        <Metric label="Paid Courses" value={report.paid_course_count} />
                    )}
                    {report?.avg_enroll_per_course != null && (
                        <Metric label="Avg Enroll / Course" value={report.avg_enroll_per_course} />
                    )}
                    {report?.total_revenue != null && (
                        <Metric label="Total Revenue" value={`$${report.total_revenue}`} />
                    )}
                    {report?.avg_completion_rate != null && (
                        <Metric label="Avg Completion Rate" value={`${report.avg_completion_rate}%`} />
                    )}
                </div>
            </section>


            {Array.isArray(pieData) && pieData.length > 0 && (
                <section className="chart-section">
                    <h3>Free vs Paid Courses</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </section>
            )}

            {Array.isArray(enrollBarData) && enrollBarData.length > 0 && (
                <section className="chart-section">
                    <h3>Enrollments: Free vs Paid</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={enrollBarData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="type" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="var(--primary-color)" />
                        </BarChart>
                    </ResponsiveContainer>
                </section>
            )}


            <ChartBlock title="Courses Created (Last 12 Months)" type="line" data={createdLine} dataKey="count" />

            <section className="cards-section">
                <h3>Highlights</h3>
                <div className="monthly-highlight-list">
                    {/* Most Popular Course */}
                    {(report?.most_popular_course_title || report?.most_popular_enrollment_count || report?.most_popular_instructor_name) ? (
                        <div className="monthly-highlight-card">
                            <h4>Most Popular Course</h4>
                            <p><strong>Title:</strong> {report.most_popular_course_title ?? 'Not available'}</p>
                            <p><strong>Enrollments:</strong> {report.most_popular_enrollment_count ?? 'Not available'}</p>
                            <p><strong>Price:</strong> {report.most_popular_price === 0 ? 'Free' : report.most_popular_price != null ? `$${report.most_popular_price}` : 'Not available'}</p>
                            <p><strong>Instructor:</strong> {report.most_popular_instructor_name ?? 'Not available'}</p>
                        </div>
                    ) : null}

                    {/* Most Completed Course */}
                    {(report?.most_completed_course_title || report?.most_completed_enrollment_count || report?.most_completed_instructor_name) ? (
                        <div className="monthly-highlight-card">
                            <h4>Most Completed Course</h4>
                            <p><strong>Title:</strong> {report.most_completed_course_title ?? 'Not available'}</p>
                            <p><strong>Completions:</strong> {report.most_completed_enrollment_count ?? 'Not available'}</p>
                            <p><strong>Ratio:</strong> {report.most_completed_completion_ratio != null ? `${report.most_completed_completion_ratio}%` : 'Not available'}</p>
                            <p><strong>Price:</strong> {report.most_completed_price === 0 ? 'Free' : report.most_completed_price != null ? `$${report.most_completed_price}` : 'Not available'}</p>
                            <p><strong>Instructor:</strong> {report.most_completed_instructor_name ?? 'Not available'}</p>
                        </div>
                    ) : null}
                </div>
            </section>


        </>
    );
}

function CourseRangedUI({ report }) {
    const mm = report.monthly_metrics;
    const renderPopularCourseCard = (m) => {
        const course = m.most_popular_course;

        const hasCourse = course?.title || course?.instructor_name || course?.price != null;

        return (
            <div className="monthly-highlight-card" key={`pop-${m.month}`}>
                <h4>{m.month ?? 'Unknown Month'}</h4>
                {hasCourse ? (
                    <>
                        {course.title && (
                            <p><strong>Title:</strong> {course.title}</p>
                        )}
                        {(m.pop_enroll_count != null || m.enroll_count != null) && (
                            <p><strong>Enrollments:</strong> {m.pop_enroll_count ?? m.enroll_count}</p>
                        )}
                        {course.price === 0 ? (
                            <p><strong>Price:</strong> Free</p>
                        ) : course.price != null ? (
                            <p><strong>Price:</strong> ${course.price}</p>
                        ) : null}
                        {course.instructor_name && (
                            <p><strong>Instructor:</strong> {course.instructor_name}</p>
                        )}
                    </>
                ) : (
                    <p>No course found.</p>
                )}
            </div>
        );
    };




    const renderCompletedCourseCard = (m) => {
        const hasData =
            m?.most_completed_course?.title ||
            m?.most_completed_count != null;


        return (
            <div className="monthly-highlight-card" key={`cmp-${m.month}`}>
                <h4>{m.month ?? 'Unknown Month'}</h4>
                {hasData ? (
                    <>
                        <p><strong>Title:</strong> {m.most_completed_course?.title ?? 'Not available'}</p>
                        <p><strong>Completions:</strong> {m.most_completed_count ?? 'N/A'}</p>
                        <p><strong>Price:</strong> {
                            m.most_completed_course?.price === 0 ? 'Free'
                                : m.most_completed_course?.price != null ? `$${m.most_completed_course.price}`
                                    : 'Not available'
                        }</p>
                        <p><strong>Instructor:</strong> {m.most_completed_course?.instructor_name ?? 'Not available'}</p>

                    </>
                ) : (
                    <p>No course found.</p>
                )}
            </div>
        );
    };

    const hasAnyPopular = mm.some(m => m?.most_popular_course?.title);
    const hasAnyCompleted = mm.some(m => m?.most_completed_course?.title);



    return (
        <>
            <ChartBlock title="Monthly Total Revenue" type="line" data={mm} dataKey="total_revenue" />
            <ChartBlock title="New Courses per Month" type="bar" data={mm} dataKey="new_course_count" />
            <ChartBlock title="Monthly Enrollments" type="bar" data={mm} dataKey="enroll_count" />
            <ChartBlock title="Average Completion Rate" type="line" data={mm} dataKey="avg_completion_rate" />

            {/* ───── Popular Course ───── */}
            <section className="cards-section">
                <h3>Most Popular Course – by Month</h3>
                {mm.length === 0 || !hasAnyPopular ? (
                    <p style={{ marginLeft: "1rem" }}>No courses found.</p>
                ) : (
                    <div className="monthly-highlight-list">
                        {mm.map(renderPopularCourseCard)}
                    </div>
                )}
            </section>

            {/* ───── Completed Course ───── */}
            <section className="cards-section">
                <h3>Most Completed Course – by Month</h3>
                {mm.length === 0 || !hasAnyCompleted ? (
                    <p style={{ marginLeft: "1rem" }}>No courses found.</p>
                ) : (
                    <div className="monthly-highlight-list">
                        {mm.map(renderCompletedCourseCard)}
                    </div>
                )}
            </section>
        </>
    );
}
