-- USER TABLES
CREATE TABLE "user" (
    id VARCHAR(8),
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    phone_no VARCHAR(15),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(300) NOT NULL,
    registration_date DATE NOT NULL,
    birth_date DATE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
    PRIMARY KEY (id),
    CHECK (registration_date <= CURRENT_DATE)
);

CREATE TABLE student (
    id VARCHAR(8),
    major VARCHAR(50),
    account_status VARCHAR(20),
    certificate_count INTEGER DEFAULT 0 CHECK (certificate_count >= 0),
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES "user"(id)
);


CREATE TABLE admin (
    id VARCHAR(8),
    report_count INTEGER DEFAULT 0 CHECK (report_count >= 0) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES "user"(id)
);

CREATE TABLE instructor (
    id VARCHAR(8),
    i_rating FLOAT CHECK (i_rating BETWEEN 0 AND 5),
    course_count INTEGER DEFAULT 0 CHECK (course_count >= 0),
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES "user"(id)
);


-- COURSE TABLES
CREATE TABLE course(
    course_id VARCHAR(8),
    title VARCHAR(150) NOT NULL,
    description VARCHAR(2000),
    category VARCHAR(50),
    price INTEGER CHECK (price >= 0),
    creation_date DATE,
    last_update_date DATE,
    status VARCHAR(20) CHECK (status IN ('draft', 'pending', 'accepted', 'rejected')) DEFAULT 'draft',
    enrollment_count INTEGER CHECK (enrollment_count >= 0),
    qna_link VARCHAR(100),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    creator_id VARCHAR(8) NOT NULL,
    approver_id VARCHAR(8),
    PRIMARY KEY (course_id),
    FOREIGN KEY (creator_id) REFERENCES instructor(id),
    FOREIGN KEY (approver_id) REFERENCES admin(id)
);

CREATE TABLE section(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    order_number INTEGER NOT NULL CHECK (order_number >= 0),
    allocated_time INTEGER CHECK (allocated_time >= 0),
    PRIMARY KEY (course_id, sec_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id)
);

CREATE TABLE content(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    title VARCHAR(150) NOT NULL,
    allocated_time INTEGER CHECK (allocated_time >= 0),
    content_type VARCHAR(20) CHECK(content_type IN ('task', 'document', 'visual_material')),
    PRIMARY KEY (course_id, sec_id, content_id),
    FOREIGN KEY (course_id, sec_id) REFERENCES section(course_id, sec_id)
);

CREATE TABLE task(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    passing_grade INTEGER NOT NULL CHECK (passing_grade BETWEEN 0 AND 100),
    max_time INTEGER CHECK (max_time > 0),
    task_type VARCHAR(20) CHECK (task_type IN ('assessment', 'assignment')),
    percentage INTEGER NOT NULL CHECK (percentage BETWEEN 0 AND 100),
    PRIMARY KEY (course_id, sec_id, content_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES content(course_id, sec_id, content_id)
);

CREATE TABLE assessment(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    question_count INTEGER CHECK (question_count >= 0),
    PRIMARY KEY (course_id, sec_id, content_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES task(course_id, sec_id, content_id)
);

CREATE TABLE assignment(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    upload_material VARCHAR(10) NOT NULL CHECK (upload_material IN 
        ('zip', 'pdf', 'xls', 'xlsx', 'doc', 'docx', 'txt', 'ppt', 'pptx')),
    body TEXT,
    PRIMARY KEY (course_id, sec_id, content_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES task(course_id, sec_id, content_id),
    CHECK (end_date > start_date)
);

CREATE TABLE document(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    body TEXT,  -- Store actual file content here
    PRIMARY KEY (course_id, sec_id, content_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES content(course_id, sec_id, content_id)
);

CREATE TABLE visual_material(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    duration INTEGER CHECK (duration >= 0),
    body TEXT,  -- Binary file data
    PRIMARY KEY (course_id, sec_id, content_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES content(course_id, sec_id, content_id)
);

CREATE TABLE question (
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    question_id VARCHAR(8),
    question_body VARCHAR(2000),
    max_time INTEGER CHECK (max_time >= 0),
    PRIMARY KEY (course_id, sec_id, content_id, question_id),
    FOREIGN KEY (course_id, sec_id, content_id)
        REFERENCES assessment(course_id, sec_id, content_id)
);

CREATE TABLE multiple_choice (
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    question_id VARCHAR(8),
    correct_answer CHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
    PRIMARY KEY (course_id, sec_id, content_id, question_id),
    FOREIGN KEY (course_id, sec_id, content_id, question_id)
        REFERENCES question(course_id, sec_id, content_id, question_id)
);

CREATE TABLE open_ended (
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    question_id VARCHAR(8),
    answer TEXT,
    PRIMARY KEY (course_id, sec_id, content_id, question_id),
    FOREIGN KEY (course_id, sec_id, content_id, question_id)
        REFERENCES question(course_id, sec_id, content_id, question_id)
);


-- STUDENT COURSE OPERATIONS
CREATE TABLE enroll(
    course_id VARCHAR(8),
    student_id VARCHAR(8),
    enroll_date DATE, 
    progress_rate INTEGER CHECK (progress_rate BETWEEN 0 AND 100),
    PRIMARY KEY (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE TABLE submit(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    student_id VARCHAR(8),
    grade INTEGER CHECK (grade BETWEEN 0 AND 100),
    submission_date DATE, 
    answers TEXT,
    PRIMARY KEY (course_id, sec_id, content_id, student_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES task(course_id, sec_id, content_id),
    FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE TABLE complete(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    student_id VARCHAR(8),
    is_completed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (course_id, sec_id, content_id, student_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES content(course_id, sec_id, content_id),
    FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE TABLE feedback(
    course_id VARCHAR(8),
    student_id VARCHAR(8),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 0 AND 5),
    comment VARCHAR(500),
    feedback_date DATE,
    PRIMARY KEY (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE TABLE comment(
    course_id VARCHAR(8),
    sec_id VARCHAR(8),
    content_id VARCHAR(8),
    user_id VARCHAR(8),
    text VARCHAR(500) NOT NULL,
    timestamp TIMESTAMP,
    PRIMARY KEY (course_id, sec_id, content_id, user_id),
    FOREIGN KEY (course_id, sec_id, content_id) REFERENCES content(course_id, sec_id, content_id),
    FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE TABLE apply_financial_aid (
    course_id VARCHAR(8),
    student_id VARCHAR(8),
    income DECIMAL(10,2) CHECK (income >= 0),
    statement TEXT,
    PRIMARY KEY (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (student_id) REFERENCES student(ID)
);

CREATE TABLE evaluate_financial_aid(
    course_id VARCHAR(8),
    student_id VARCHAR(8),
    instructor_id VARCHAR(8),
    is_accepted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (course_id, student_id, instructor_id),
    FOREIGN KEY (course_id, student_id)
    REFERENCES apply_financial_aid(course_id, student_id),
    FOREIGN KEY (instructor_id) REFERENCES instructor(ID)
);


-- VIEWS
-- User with computed age
CREATE VIEW user_with_age AS
SELECT 
    id,
    first_name,
    last_name,
    birth_date,
    EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM birth_date) AS age
FROM "user";

-- Instructor_with_experience_year
CREATE VIEW instructor_with_experience_year AS
SELECT 
    i.ID,
    u.first_name,
    u.last_name,
    EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM u.registration_date) AS experience_year
FROM instructor i
JOIN "user" u ON i.ID = u.ID;

-- Course_with_is_free
CREATE VIEW course_with_is_free AS
SELECT
    course_id,
    title,
    price,
    CASE 
        WHEN price = 0 THEN TRUE
        ELSE FALSE
    END AS is_free
FROM course;

-- Course content count
CREATE VIEW course_content_count AS 
SELECT 
    e.student_id, 
    c.course_id, 
    SUM(CASE WHEN ct.content_id IS NULL THEN 0 ELSE 1 END) AS total_content_count,
    SUM(CASE WHEN cmp.is_completed = TRUE THEN 1 ELSE 0 END) AS completed_content_count
FROM enroll e
LEFT JOIN course c ON e.course_id = c.course_id
LEFT JOIN section s ON s.course_id = c.course_id
LEFT JOIN content ct ON ct.course_id = s.course_id AND ct.sec_id = s.sec_id
LEFT JOIN complete cmp 
    ON cmp.course_id = ct.course_id 
   AND cmp.sec_id = ct.sec_id 
   AND cmp.content_id = ct.content_id 
   AND cmp.student_id = e.student_id 
   AND cmp.is_completed = TRUE
GROUP BY e.student_id, c.course_id;


-- TRIGGERS
-- Update instructor rating when feedback is added
CREATE OR REPLACE FUNCTION update_instructor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE instructor
    SET i_rating = (
        SELECT AVG(f.rating)
        FROM feedback f
        JOIN course c ON f.course_id = c.course_id
        WHERE c.creator_id = instructor.id
    )
    WHERE instructor.id = (
        SELECT c.creator_id
        FROM course c
        WHERE c.course_id = NEW.course_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_i_rating
AFTER INSERT ON feedback
FOR EACH ROW
EXECUTE FUNCTION update_instructor_rating();

-- Update enrollment count when a student enrolls
CREATE OR REPLACE FUNCTION update_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE course
    SET enrollment_count = enrollment_count + 1
    WHERE course_id = NEW.course_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_count_updater
AFTER INSERT ON enroll
FOR EACH ROW
EXECUTE FUNCTION update_enrollment_count();

-- Update section allocated_time after new content is added
CREATE OR REPLACE FUNCTION update_section_allocated_time()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE section
    SET allocated_time = (
        SELECT SUM(c.allocated_time)
        FROM content c
        WHERE c.course_id = NEW.course_id AND c.sec_id = NEW.sec_id
    )
    WHERE section.course_id = NEW.course_id
    AND section.sec_id = NEW.sec_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_section_allocated_time
AFTER INSERT ON content
FOR EACH ROW
EXECUTE FUNCTION update_section_allocated_time();

-- Update enroll progress_rate after a content is completed
CREATE OR REPLACE FUNCTION update_progress_rate()
RETURNS TRIGGER AS $$
DECLARE
    total_count INTEGER;
    completed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM content
    WHERE course_id = NEW.course_id;

    SELECT COUNT(*) INTO completed_count
    FROM complete
    WHERE course_id = NEW.course_id AND student_id = NEW.student_id AND is_completed = TRUE;

    UPDATE enroll
    SET progress_rate = CASE
        WHEN total_count = 0 THEN 0
        ELSE ROUND(100.0 * completed_count / total_count)
    END
    WHERE course_id = NEW.course_id AND student_id = NEW.student_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_progress_rate
AFTER INSERT OR UPDATE ON complete
FOR EACH ROW
WHEN (NEW.is_completed = TRUE)
EXECUTE FUNCTION update_progress_rate();

-- Update enroll progress_rate after new content is added
CREATE OR REPLACE FUNCTION update_progress_rate_on_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Update progress_rate for all students enrolled in the course
    UPDATE enroll
    SET progress_rate = CASE 
        WHEN total.total_count = 0 THEN 0
        ELSE ROUND(100.0 * COALESCE(completed.completed_count, 0) / total.total_count)
    END
    FROM (
        SELECT course_id, COUNT(*) AS total_count
        FROM content
        WHERE course_id = NEW.course_id
        GROUP BY course_id
    ) AS total,
    (
        SELECT course_id, student_id, COUNT(*) AS completed_count
        FROM complete
        WHERE course_id = NEW.course_id AND is_completed = TRUE
        GROUP BY course_id, student_id
    ) AS completed
    WHERE enroll.course_id = NEW.course_id
    AND enroll.course_id = total.course_id
    AND enroll.student_id = completed.student_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_progress_rate_on_content
AFTER INSERT ON content
FOR EACH ROW
EXECUTE FUNCTION update_progress_rate_on_content();

-- Update course count of instructor when a new course is added
CREATE OR REPLACE FUNCTION update_instructor_course_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE instructor
    SET course_count = course_count + 1
    WHERE id = NEW.creator_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_instructor_course_count
AFTER INSERT ON course
FOR EACH ROW
EXECUTE FUNCTION update_instructor_course_count();


-- INSERTIONS
INSERT INTO "user" (id, first_name, middle_name, last_name, phone_no, email, password, registration_date, birth_date, role)
VALUES 
(
    'U0000001',
    'John',
    'F.',
    'Doe',
    '555-1234',
    'john.doe@example.com',
    'password123', -- (later we will hash passwords) -- passwords are now being hashed in the register function
    CURRENT_DATE,
    '1995-06-15',
    'student'
);

INSERT INTO "user" (id, first_name, middle_name, last_name, phone_no, email, password, registration_date, birth_date, role)
VALUES 
(
    'U0000002',
    'Alice',
    'M.',
    'Smith',
    '555-5678',
    'alice.smith@example.com',
    'password456', -- use hashed password in production
    CURRENT_DATE,
    '1988-04-22',
    'instructor'
);

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000002', 0.0, 0);

INSERT INTO "user" (id, first_name, middle_name, last_name, phone_no, email, password, registration_date, birth_date, role) 
VALUES (
    'U0000003', 'Jane', NULL, 'Doe', '555-9999',
    'jane.doe@example.com', 'hashedpassword', CURRENT_DATE, '2000-01-01', 'student'
);

INSERT INTO student (major, ID, account_status, certificate_count) 
VALUES (
    'Computer Science', 'U0000003', 'active', 0
);

-- INSERT SAMPLE COURSE
INSERT INTO course (course_id, title, description, category, price, creation_date, last_update_date, status,
                    enrollment_count, qna_link, difficulty_level, creator_id)
VALUES
('C0000001', 'Intro to Python', 'Learn Python from scratch.', 'Programming', 99, CURRENT_DATE, CURRENT_DATE,
 'accepted', 0, 'https://forum.learnhub.com/python', 2, 'U0000002');

-- INSERT SECTION
INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time)
VALUES
('C0000001', 'S000001', 'Getting Started', 'Basics of Python', 1, 30);

-- INSERT CONTENT - TASK
INSERT INTO content (course_id, sec_id, content_id, title, allocated_time, content_type)
VALUES
('C0000001', 'S000001', 'CT000001', 'Python Quiz 1', 15, 'task');

INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage)
VALUES
('C0000001', 'S000001', 'CT000001', 50, 30, 'assessment', 100);

INSERT INTO assessment (course_id, sec_id, content_id, question_count)
VALUES
('C0000001', 'S000001', 'CT000001', 5);

-- INSERT CONTENT - DOCUMENT
INSERT INTO content (course_id, sec_id, content_id, title, allocated_time, content_type)
VALUES
('C0000001', 'S000001', 'CT000002', 'Python Basics Document', 10, 'document');

INSERT INTO document (course_id, sec_id, content_id, body)
VALUES
('C0000001', 'S000001', 'CT000002', 'This document explains basic Python syntax.');

-- INSERT CONTENT - VISUAL MATERIAL
INSERT INTO content (course_id, sec_id, content_id, title, allocated_time, content_type)
VALUES
('C0000001', 'S000001', 'CT000003', 'Intro Video', 20, 'visual_material');

INSERT INTO visual_material (course_id, sec_id, content_id, duration, body)
VALUES
('C0000001', 'S000001', 'CT000003', 120, 'intro_video.mp4');
