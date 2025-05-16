import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../services/auth';
import './ProfilePage.css';

/* ───── helper for nice dates (e.g. 30 Apr 2025) ───── */
const prettyDate = iso =>
    new Date(iso).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* ───── read user from storage ───── */
    const userInfo = getCurrentUser();          // { user_id, role }
    const userId = userInfo?.user_id;

    useEffect(() => { if (!userId) navigate('/login', { replace: true }); }, [userId, navigate]);

    /* ───── fetch profile once ───── */
    useEffect(() => {
        if (!userId) return;
        const fetchProfile = async () => {
            try {
                const res = await fetch('http://localhost:5001/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId }),
                    credentials: 'include'
                });
                if (!res.ok || !res.headers.get('content-type')?.includes('application/json'))
                    throw new Error('Server error or not authenticated');

                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                setProfile(data.profile);
            } catch (e) { setError(e.message); }
            finally { setLoading(false); }
        };
        fetchProfile();
    }, [userId]);

    /* ───── early states ───── */
    if (loading) return <div className="profile-page"><p>Loading…</p></div>;
    if (error) return <div className="profile-page"><p className="error">{error}</p></div>;

    /* ───── data guaranteed ───── */
    const { full_name, email, phone_no, birth_date,
        registration_date, age, role } = profile;

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };



    return (
        <div className="profile-page">
            {/* Header */}
            <header className="profile-header">
                <div className="logo" onClick={() => navigate('/')}>
                    <span className="logo-text">LearnHub</span>
                </div>
                <div className="header-right">
                    <button className="notification-btn">🔔</button>
                    <button className="profile-icon" onClick={handleLogout}>{full_name[0]}</button>
                </div>
            </header>

            <main className="profile-main flex-row">

                {/* LEFT column */}
                <div className="profile-col">
                    {/* green info */}
                    <section className="info-card info-card--green">
                        <h2>
                            {full_name}
                            <span className="name-role"> – {role}</span>
                        </h2>
                        <div className="info-details">
                            <p><strong>Email:</strong> {email}</p>
                            <p><strong>Phone:</strong> {phone_no}</p>
                            <p><strong>Birth Date:</strong> {prettyDate(birth_date)}</p>
                            <p><strong>Joined:</strong> {prettyDate(registration_date)}</p>
                            <p><strong>Age:</strong> {age}</p>
                        </div>
                    </section>




                    {/* instructor gets Feedback card */}
                    {role === 'instructor' && (
                        <section className="feedback-wrapper">
                            <h4 className="feedback-heading">Feedback</h4>
                            <FeedbackCardList list={profile.instructor_info?.feedbacks ?? []} />
                        </section>
                    )}

                    {/* student gets Certificates card */}
                    {role === 'student' && (
                        <section className="feedback-wrapper">
                            <h4 className="feedback-heading">
                                Certificates ({profile.student_info?.certificate_count ?? 0})
                            </h4>
                            <CertificateCardList
                                list={profile.student_info?.certificates ?? []}
                                empty="No certificates earned yet."
                            />
                        </section>
                    )}

                </div>


                {/* RIGHT column  (role panel) */}
                <div className="profile-col">
                    {role === 'admin' && <AdminPanel {...profile.admin_info} navigate={navigate} />}
                    {role === 'instructor' && <InstructorPanel {...profile.instructor_info} navigate={navigate} />}
                    {role === 'student' && <StudentPanel {...profile.student_info} navigate={navigate} />}

                </div>
            </main>

        </div>
    );
};

/* ───── helper sub-components ───── */

const AdminPanel = ({ report_count, approved_courses, rejected_courses, navigate }) => (
    <section className="role-card profile-admin-panel">
        <div className="panel-header-row">
            <h3 className="panel-title">Admin Overview</h3>
            <button className="change-password-btn" onClick={() => navigate('/change-password')}>
                Change Password
            </button>
        </div>


        <p><strong>Reports generated:</strong> {report_count}</p>

        <h4>Approved Courses</h4>
        <CourseCardGrid list={approved_courses} empty="No approved courses yet." />

        <h4>Rejected Courses</h4>
        <CourseCardGrid list={rejected_courses} empty="No rejected courses." />
    </section>
);

const InstructorPanel = ({ i_rating, course_count, experience_year, courses, feedbacks, navigate }) => {
    const fullStars = Math.round(i_rating);
    return (
        <section className="role-card profile-instructor-panel">
            <div className="panel-header-row">
                <h3 className="panel-title">Instructor Overview</h3>
                <button className="change-password-btn" onClick={() => navigate('/change-password')}>
                    Change Password
                </button>
            </div>


            <p>
                <strong>Rating:</strong> {i_rating.toFixed(2)}{' '}
                {Array.from({ length: fullStars }, (_, idx) => (
                    <span key={idx} className="yellow-star">★</span>
                ))}
            </p>
            <p><strong>Experience:</strong> {experience_year} years</p>

            <h4>Your Courses ({course_count})</h4>
            <CourseCardGrid
                list={courses}
                empty="You haven’t published any courses yet."
            />
        </section>
    );
};



const StudentPanel = ({ major, certificate_count, certificates,
    enrolled_courses, completed_courses, navigate }) => (
    <section className="role-card">
        <div className="panel-header-row">
            <h3 className="panel-title">Student Overview</h3>
            <button className="change-password-btn" onClick={() => navigate('/change-password')}>
                Change Password
            </button>
        </div>


        <p><strong>Major:</strong> {major}</p>

        <h4>Continuing Courses</h4>
        <StudentCourseGrid
            list={enrolled_courses}
            empty="Not enrolled in any courses."
        />

        <h4>Completed Courses</h4>
        <StudentCourseGrid
            list={completed_courses}
            empty="No courses completed yet."
        />


    </section>
);

/* ---------- visual card for courses ---------- */
const CourseCardGrid = ({ list, empty }) => {
    if (!list?.length) return <p className="muted">{empty}</p>;

    return (
        <div className="course-grid">
            {list.map(c => (
                <div key={c.course_id} className="profile-course-card">
                    <h5 className="course-title">{c.title}</h5>
                    <p className="course-meta">
                        {c.category} &nbsp;·&nbsp; ${c.price} &nbsp;·&nbsp; Level {c.difficulty_level}
                    </p>
                </div>
            ))}
        </div>
    );
};

/* ---------- full-width green bars for student courses ---------- */
const StudentCourseGrid = ({ list, empty }) => {
    if (!list?.length) return <p className="muted">{empty}</p>;

    return (
        <div className="student-course-list">
            {list.map(c => (
                <div key={c.course_id} className="student-course-card">
                    <div className="student-course-info">
                        <h5 className="course-title">{c.title}</h5>
                        <p className="course-meta">
                            {c.category} · Level {c.difficulty_level} · Instructor: {c.instructor_name}
                        </p>
                        <p className="course-progress">{c.progress_rate}% complete</p>
                    </div>
                    <div className="progress-outer">
                        <div
                            className="progress-inner"
                            style={{ width: `${c.progress_rate}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};



/* remove literal escape sequences like \u0020 or \U0001f44d */
const clean = txt => txt.replace(/\\[uU][0-9a-fA-F]{4,6}/g, '');

/* ---------- visual card for feedback (one-per-row) ---------- */
const FeedbackCardList = ({ list }) => {
    if (!list?.length) return <p className="muted">No feedback yet.</p>;

    // strip literal \uXXXX artifacts
    const cleanText = txt => txt.replace(/\\u[0-9a-fA-F]{4}/g, '');

    return (
        <div className="feedback-grid feedback-list">
            {list.map((f, i) => (
                <div key={i} className="feedback-card">
                    <div className="feedback-header">
                        <span className="feedback-title">
                            {f.course_title} —
                            {Array.from({ length: f.rating }, (_, idx) => (
                                <span key={idx} className="yellow-star">★</span>
                            ))}
                        </span>
                        <span className="feedback-date">
                            {prettyDate(f.feedback_date)}
                        </span>
                    </div>
                    <p className="feedback-text">{cleanText(f.comment)}</p>
                </div>
            ))}
        </div>
    );
};


/* keep simple bullet list for certificates / enrollments */
const BulletList = ({ list, empty }) =>
    list?.length ? <ul className="bullet-list">{list.map((t, i) => <li key={i}>{t}</li>)}</ul>
        : <p className="muted">{empty}</p>;




// at the bottom of ProfilePage.jsx, after BulletList:
const CertificateCardList = ({ list, empty }) => {
    if (!list?.length) return <p className="muted">{empty}</p>;

    return (
        <div className="certificate-list">
            {list.map((cert, i) => (
                <div key={i} className="certificate-card">
                    <p className="certificate-title">{cert}</p>
                </div>
            ))}
        </div>
    );
};

export default ProfilePage;