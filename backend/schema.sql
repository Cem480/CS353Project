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

-- NOTIFICATION TABLES
CREATE TABLE notification(
    notification_id VARCHAR(8),
    type VARCHAR(30) NOT NULL,
    entity_type VARCHAR(8),
    entity_id VARCHAR(8),
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    PRIMARY KEY (notification_id)
);

CREATE TABLE receive(
    notification_id VARCHAR(8),
    id VARCHAR(8),
    read_at TIMESTAMP,
    PRIMARY KEY (notification_id, id),
    FOREIGN KEY (notification_id) REFERENCES notification(notification_id) ON DELETE CASCADE,
    FOREIGN KEY (id) REFERENCES "user"(id)
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
    application_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    evaluator_id VARCHAR(8),
    PRIMARY KEY (course_id, student_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (student_id) REFERENCES student(id),
    FOREIGN KEY (evaluator_id) REFERENCES instructor(id)
);

CREATE TABLE certificate(
    certificate_id VARCHAR(8),
    title VARCHAR(150),
    body VARCHAR(10000),
    PRIMARY KEY (certificate_id)
);

CREATE TABLE earn_certificate(
    student_id VARCHAR(8),
    course_id VARCHAR(8),
    certificate_id VARCHAR(8),
    certification_date DATE,
    PRIMARY KEY (student_id, course_id, certificate_id),
    FOREIGN KEY (student_id, course_id)
        REFERENCES enroll(student_id, course_id),
    FOREIGN KEY (certificate_id)
        REFERENCES certificate(certificate_id)
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

-- NOTIFICATION TRIGGERS

-- Generate notifications when a course status changes
CREATE OR REPLACE FUNCTION generate_course_status_notification()
RETURNS TRIGGER AS $$
DECLARE
    notify_id VARCHAR(8);
BEGIN
    -- Only trigger if status has changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Generate a unique notification ID
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification based on status change
    IF NEW.status = 'accepted' THEN
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'course_approved', 'course', NEW.course_id, 
                'Your course "' || NEW.title || '" has been approved and is now accessible.');
                
        -- Send notification to the course creator
        INSERT INTO receive (notification_id, id)
        VALUES (notify_id, NEW.creator_id);
        
    ELSIF NEW.status = 'rejected' THEN
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'course_rejected', 'course', NEW.course_id, 
                'Your course "' || NEW.title || '" has been rejected. Please review.');
                
        -- Send notification to the course creator
        INSERT INTO receive (notification_id, id)
        VALUES (notify_id, NEW.creator_id);
        
    ELSIF NEW.status = 'pending' AND OLD.status = 'draft' THEN
        -- Create notification for admin users about a new course needing review
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'course_pending_review', 'course', NEW.course_id, 
                'A new course "' || NEW.title || '" needs your review.');
                
        -- Send notification to all admin users
        INSERT INTO receive (notification_id, id)
        SELECT notify_id, u.id
        FROM "user" u
        JOIN admin a ON u.id = a.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_course_status_notification
AFTER UPDATE OF status ON course
FOR EACH ROW
EXECUTE FUNCTION generate_course_status_notification();

-- Generate notifications for financial aid application status changes
CREATE OR REPLACE FUNCTION generate_financial_aid_notification()
RETURNS TRIGGER AS $$
DECLARE
    notify_id VARCHAR(8);
    course_title VARCHAR(150);
    student_name VARCHAR(150);
BEGIN
    -- Only trigger if status has changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Get course title
    SELECT title INTO course_title 
    FROM course
    WHERE course_id = NEW.course_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO student_name
    FROM "user"
    WHERE id = NEW.student_id;
    
    -- Generate a unique notification ID
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification based on status change
    IF NEW.status = 'approved' THEN
        -- Notification for student
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'financial_aid_approved', 'course', NEW.course_id, 
                'Your financial aid application for "' || course_title || '" has been approved!');
                
        -- Send notification to the student
        INSERT INTO receive (notification_id, id)
        VALUES (notify_id, NEW.student_id);
        
    ELSIF NEW.status = 'rejected' THEN
        -- Notification for student
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'financial_aid_rejected', 'course', NEW.course_id, 
                'Your financial aid application for "' || course_title || '" has been rejected.');
                
        -- Send notification to the student
        INSERT INTO receive (notification_id, id)
        VALUES (notify_id, NEW.student_id);
        
    ELSIF NEW.status = 'pending' THEN
        -- Create a new notification for instructors
        notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'financial_aid_pending', 'course', NEW.course_id, 
                student_name || ' has applied for financial aid for your course "' || course_title || '".');
                
        -- Send notification to the course instructor
        INSERT INTO receive (notification_id, id)
        SELECT notify_id, c.creator_id
        FROM course c
        WHERE c.course_id = NEW.course_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_financial_aid_notification
AFTER INSERT OR UPDATE OF status ON apply_financial_aid
FOR EACH ROW
EXECUTE FUNCTION generate_financial_aid_notification();

-- Generate notifications when a student enrolls in a course
CREATE OR REPLACE FUNCTION generate_enrollment_notification()
RETURNS TRIGGER AS $$
DECLARE
    notify_id VARCHAR(8);
    course_title VARCHAR(150);
    student_name VARCHAR(150);
    instructor_id VARCHAR(8);
BEGIN
    -- Get course title and instructor
    SELECT title, creator_id INTO course_title, instructor_id
    FROM course
    WHERE course_id = NEW.course_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO student_name
    FROM "user"
    WHERE id = NEW.student_id;
    
    -- Generate a unique notification ID for student
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification for student
    INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
    VALUES (notify_id, 'enrollment_success', 'course', NEW.course_id, 
            'You have successfully enrolled in "' || course_title || '". You can start learning now!');
            
    -- Send notification to the student
    INSERT INTO receive (notification_id, id)
    VALUES (notify_id, NEW.student_id);
    
    -- Generate a unique notification ID for instructor
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification for instructor
    INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
    VALUES (notify_id, 'new_student', 'course', NEW.course_id, 
            student_name || ' has enrolled in your course "' || course_title || '".');
            
    -- Send notification to the instructor
    INSERT INTO receive (notification_id, id)
    VALUES (notify_id, instructor_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enrollment_notification
AFTER INSERT ON enroll
FOR EACH ROW
EXECUTE FUNCTION generate_enrollment_notification();

-- Generate notifications when a student completes a course (progress_rate = 100)
CREATE OR REPLACE FUNCTION generate_course_completion_notification()
RETURNS TRIGGER AS $$
DECLARE
    notify_id VARCHAR(8);
    course_title VARCHAR(150);
    student_name VARCHAR(150);
    instructor_id VARCHAR(8);
BEGIN
    -- Only trigger if progress_rate updated to 100
    IF OLD.progress_rate = 100 OR NEW.progress_rate < 100 THEN
        RETURN NEW;
    END IF;
    
    -- Get course title and instructor
    SELECT title, creator_id INTO course_title, instructor_id
    FROM course
    WHERE course_id = NEW.course_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO student_name
    FROM "user"
    WHERE id = NEW.student_id;
    
    -- Generate a unique notification ID for student
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification for student
    INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
    VALUES (notify_id, 'course_completed', 'course', NEW.course_id, 
            'Congratulations! You have completed "' || course_title || '". Please share your feedback!');
            
    -- Send notification to the student
    INSERT INTO receive (notification_id, id)
    VALUES (notify_id, NEW.student_id);
    
    -- Generate a unique notification ID for instructor
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification for instructor
    INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
    VALUES (notify_id, 'student_completed_course', 'course', NEW.course_id, 
            student_name || ' has completed your course "' || course_title || '".');
            
    -- Send notification to the instructor
    INSERT INTO receive (notification_id, id)
    VALUES (notify_id, instructor_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_course_completion_notification
AFTER UPDATE OF progress_rate ON enroll
FOR EACH ROW
WHEN (NEW.progress_rate = 100)
EXECUTE FUNCTION generate_course_completion_notification();

-- Generate notifications when feedback is submitted
CREATE OR REPLACE FUNCTION generate_feedback_notification()
RETURNS TRIGGER AS $$
DECLARE
    notify_id VARCHAR(8);
    course_title VARCHAR(150);
    student_name VARCHAR(150);
    instructor_id VARCHAR(8);
BEGIN
    -- Get course title and instructor
    SELECT title, creator_id INTO course_title, instructor_id
    FROM course
    WHERE course_id = NEW.course_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO student_name
    FROM "user"
    WHERE id = NEW.student_id;
    
    -- Generate a unique notification ID for instructor
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification for instructor
    INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
    VALUES (notify_id, 'new_feedback', 'course', NEW.course_id, 
            student_name || ' has left a ' || NEW.rating || '-star feedback for your course "' || course_title || '".');
            
    -- Send notification to the instructor
    INSERT INTO receive (notification_id, id)
    VALUES (notify_id, instructor_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feedback_notification
AFTER INSERT ON feedback
FOR EACH ROW
EXECUTE FUNCTION generate_feedback_notification();

-- Generate notifications when an assignment is graded
CREATE OR REPLACE FUNCTION generate_grade_notification()
RETURNS TRIGGER AS $$
DECLARE
    notify_id VARCHAR(8);
    content_title VARCHAR(150);
    course_title VARCHAR(150);
    passing_grade INTEGER;
BEGIN
    -- Only trigger if grade is being added/updated (not NULL)
    IF NEW.grade IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get content and course title
    SELECT c.title, course.title, t.passing_grade 
    INTO content_title, course_title, passing_grade
    FROM content c
    JOIN course ON c.course_id = course.course_id
    JOIN task t ON c.content_id = t.content_id AND c.course_id = t.course_id AND c.sec_id = t.sec_id
    WHERE c.content_id = NEW.content_id AND c.course_id = NEW.course_id AND c.sec_id = NEW.sec_id;
    
    -- Generate a unique notification ID
    notify_id := 'N' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 7);
    
    -- Create notification based on grade
    IF NEW.grade >= passing_grade THEN
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'assignment_passed', 'content', NEW.content_id, 
                'You passed "' || content_title || '" in the course "' || course_title || '" with a grade of ' || NEW.grade || '.');
    ELSE
        INSERT INTO notification (notification_id, type, entity_type, entity_id, message)
        VALUES (notify_id, 'assignment_failed', 'content', NEW.content_id, 
                'You did not pass "' || content_title || '" in the course "' || course_title || '". Your grade: ' || NEW.grade || '.');
    END IF;
    
    -- Send notification to student
    INSERT INTO receive (notification_id, id)
    VALUES (notify_id, NEW.student_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grade_notification
AFTER INSERT OR UPDATE OF grade ON submit
FOR EACH ROW
EXECUTE FUNCTION generate_grade_notification();
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

-- Insert an admin user to receive course pending notifications
INSERT INTO "user" (id, first_name, middle_name, last_name, phone_no, email, password, registration_date, birth_date, role)
        VALUES 
(
    'U0000004',
    'Admin',
    NULL,
    'User',
    '555-1000',
    'admin@example.com',
    'adminpass', 
    CURRENT_DATE,
    '1985-03-10',
    'admin'
);

-- Create admin record
INSERT INTO admin (id, report_count)
VALUES ('U0000004', 0);

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

INSERT INTO student (major, ID, account_status, certificate_count) 
        VALUES (
    'Mathematics', 'U0000001', 'active', 0
);
                
-- INSERT SAMPLE COURSE
INSERT INTO course (course_id, title, description, category, price, creation_date, last_update_date, status,
                    enrollment_count, qna_link, difficulty_level, creator_id)
VALUES
('C0000001', 'Intro to Python', 'Learn Python from scratch.', 'Programming', 99, CURRENT_DATE, CURRENT_DATE,
 'accepted', 0, 'https://forum.learnhub.com/python', 2, 'U0000002');

-- INSERT SECOND COURSE WITH DRAFT STATUS (to trigger notification later)
INSERT INTO course (course_id, title, description, category, price, creation_date, last_update_date, status,
                    enrollment_count, qna_link, difficulty_level, creator_id)
VALUES
('C0000002', 'Advanced Java Programming', 'Master Java programming with advanced concepts.', 'Programming', 149, CURRENT_DATE, CURRENT_DATE,
 'draft', 0, 'https://forum.learnhub.com/java', 4, 'U0000002');
    
-- INSERT SECTION
INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time)
    VALUES
('C0000001', 'S000001', 'Getting Started', 'Basics of Python', 1, 30);

-- Insert another section for the first course
INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time)
    VALUES
('C0000001', 'S000002', 'Functions and Methods', 'Learn about Python functions', 2, 45);

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

-- Add an assignment to trigger grade notifications
INSERT INTO content (course_id, sec_id, content_id, title, allocated_time, content_type)
    VALUES
('C0000001', 'S000002', 'CT000004', 'Python Assignment', 60, 'task');

INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage)
    VALUES
('C0000001', 'S000002', 'CT000004', 60, 120, 'assignment', 100);

INSERT INTO assignment (course_id, sec_id, content_id, start_date, end_date, upload_material, body)
    VALUES
('C0000001', 'S000002', 'CT000004', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'zip', 
'Create a simple Python application that demonstrates the use of functions.');

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

-- NOTIFICATION TRIGGER TEST DATA

-- 1. Student enrollment to trigger enrollment notifications
INSERT INTO enroll (course_id, student_id, enroll_date, progress_rate)
VALUES ('C0000001', 'U0000001', CURRENT_DATE, 0);

-- 2. Financial aid application to trigger financial_aid notification
INSERT INTO apply_financial_aid (course_id, student_id, income, statement, status)
VALUES ('C0000001', 'U0000003', 25000.00, 'I need financial assistance to take this course.', 'pending');

-- 3. Submit feedback to trigger feedback notification
INSERT INTO feedback (course_id, student_id, rating, comment, feedback_date)
VALUES ('C0000001', 'U0000001', 5, 'Excellent course with great content!', CURRENT_DATE);

-- 4. Update course status to trigger course_status_notification
UPDATE course SET status = 'pending' WHERE course_id = 'C0000002';

-- 5. Grade an assignment to trigger grade notification
INSERT INTO submit (course_id, sec_id, content_id, student_id, grade, submission_date, answers)
VALUES ('C0000001', 'S000001', 'CT000001', 'U0000001', 75, CURRENT_DATE, 'A;B;C;D;A');

-- 6. Mark content as completed to increment progress
INSERT INTO complete (course_id, sec_id, content_id, student_id, is_completed)
VALUES ('C0000001', 'S000001', 'CT000001', 'U0000001', TRUE);

INSERT INTO complete (course_id, sec_id, content_id, student_id, is_completed)
VALUES ('C0000001', 'S000001', 'CT000002', 'U0000001', TRUE);

INSERT INTO complete (course_id, sec_id, content_id, student_id, is_completed)
VALUES ('C0000001', 'S000001', 'CT000003', 'U0000001', TRUE);

INSERT INTO complete (course_id, sec_id, content_id, student_id, is_completed)
VALUES ('C0000001', 'S000002', 'CT000004', 'U0000001', TRUE);

-- Update progress_rate to 100 to trigger completion notification
UPDATE enroll SET progress_rate = 100 WHERE course_id = 'C0000001' AND student_id = 'U0000001';

-- 7. Approve financial aid application to trigger notification
UPDATE apply_financial_aid SET status = 'approved', evaluator_id = 'U0000002' 
WHERE course_id = 'C0000001' AND student_id = 'U0000003';
