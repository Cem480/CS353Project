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
    order_number INTEGER NOT NULL CHECK (order_number >= 0),
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
    PRIMARY KEY (course_id, sec_id, content_id, user_id, timestamp),
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

-- Enrolled categories by student
CREATE VIEW enrolled_course_categories AS
SELECT e.student_id, c.category
FROM enroll e
JOIN course c ON e.course_id = c.course_id;

-- Recommended course base
CREATE VIEW recommended_course_base AS
SELECT c.course_id, c.title, c.category, c.difficulty_level, c.enrollment_count
FROM course c
WHERE c.status = 'accepted';

-- Recommended category base
CREATE VIEW recommended_category_base AS
SELECT category, COUNT(*) AS course_count
FROM course
WHERE status = 'accepted'
GROUP BY category;


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

-- Trigger for content order numbers
CREATE OR REPLACE FUNCTION shift_order_numbers()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE content
    SET order_number = order_number + 1
    WHERE course_id = NEW.course_id
      AND sec_id = NEW.sec_id
      AND order_number >= NEW.order_number;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shift_order_numbers
BEFORE INSERT ON content
FOR EACH ROW
EXECUTE FUNCTION shift_order_numbers();

-- Trigger for section order numbers
CREATE OR REPLACE FUNCTION shift_section_order_numbers()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE section
  SET order_number = order_number + 1
  WHERE course_id = NEW.course_id
    AND order_number >= NEW.order_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shift_section_order
BEFORE INSERT ON section
FOR EACH ROW
EXECUTE FUNCTION shift_section_order_numbers();



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
    IF OLD.progress_rate < 100 AND NEW.progress_rate = 100 THEN  -- this line changed from "IF OLD.progress_rate = 100 OR NEW.progress_rate < 100 THEN RETURN NEW;" to this due to wrong logic
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

-- Increment certificate_count of student when a new one is issued
CREATE OR REPLACE FUNCTION increment_certificate_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE student
    SET certificate_count = certificate_count + 1
    WHERE ID = NEW.student_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_certificate_count
AFTER INSERT ON earn_certificate
FOR EACH ROW
EXECUTE FUNCTION increment_certificate_count();



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
    'password123',
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
    'password456',
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
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type)
    VALUES
('C0000001', 'S000001', 'CT000001', 'Python Quiz 1', 1, 15, 'task');

INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage)
    VALUES
('C0000001', 'S000001', 'CT000001', 50, 30, 'assessment', 100);

INSERT INTO assessment (course_id, sec_id, content_id, question_count)
VALUES
('C0000001', 'S000001', 'CT000001', 5);

-- Insert questions to assessment
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time)
VALUES 
('C0000001', 'S000001', 'CT000001', 'Q000001', 'What is the capital of France?', 60),
('C0000001', 'S000001', 'CT000001', 'Q000002', 'Solve 2 + 2 * 2.', 30),
('C0000001', 'S000001', 'CT000001', 'Q000003', 'Explain the concept of gravity.', 120),
('C0000001', 'S000001', 'CT000001', 'Q000004', 'Select the correct spelling.', 45),
('C0000001', 'S000001', 'CT000001', 'Q000005', 'Name a prime number between 10 and 20.', 30);

INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer)
VALUES 
('C0000001', 'S000001', 'CT000001', 'Q000001', 'B'),
('C0000001', 'S000001', 'CT000001', 'Q000002', 'C'),
('C0000001', 'S000001', 'CT000001', 'Q000004', 'D'),
('C0000001', 'S000001', 'CT000001', 'Q000003', 'A'),
('C0000001', 'S000001', 'CT000001', 'Q000005', 'D');


-- Add an assignment to trigger grade notifications
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type)
    VALUES
('C0000001', 'S000002', 'CT000004', 'Python Assignment', 4, 60, 'task');

INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage)
    VALUES
('C0000001', 'S000002', 'CT000004', 60, 120, 'assignment', 100);

INSERT INTO assignment (course_id, sec_id, content_id, start_date, end_date, upload_material, body)
    VALUES
('C0000001', 'S000002', 'CT000004', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'zip', 
'Create a simple Python application that demonstrates the use of functions.');

-- INSERT CONTENT - DOCUMENT
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type)
    VALUES
('C0000001', 'S000001', 'CT000002', 'Python Basics Document', 2, 10, 'document');

INSERT INTO document (course_id, sec_id, content_id, body)
VALUES
('C0000001', 'S000001', 'CT000002', 'This document explains basic Python syntax.');

-- INSERT CONTENT - VISUAL MATERIAL
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type)
        VALUES
('C0000001', 'S000001', 'CT000003', 'Intro Video', 3, 20, 'visual_material');

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



----------------------------------------------------------------------------
-- INSERTIONS FOR MOCK DATA

-- Insert users
-- password: pass01word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000010', 'Daniel', 'Garcia', 'daniel.garcia0@example.com', 'scrypt:32768:8:1$HISarEjuybOMY8K6$20619ccfc5dd7475a73030fd68fe1cedb6b27fec3181e90b7afd2bf8c48bc776b65aa42585cb01c8906ae4728c0537773dc1a6441b1df5bd1d5d59e12f8123e2', CURRENT_DATE, '1990-01-01', 'admin');

INSERT INTO admin (id, report_count)
VALUES ('U0000010', 0);

-- password: pass02word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000011', 'Sarah', 'Lee', 'sarah.lee1@example.com', 'scrypt:32768:8:1$78QAjhGo5TFT2coL$e42bb28037154fd1aea08988b3bed696b453b0a9a1ae0475c3c676786cdb978d6eab49488f3d8a13c48a5077d4e26facd34f0d5652a44b29a2cf9630331b3c98', CURRENT_DATE, '1990-01-01', 'admin');

INSERT INTO admin (id, report_count)
VALUES ('U0000011', 0);

-- password: pass03word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000012', 'John', 'Lee', 'john.lee2@example.com', 'scrypt:32768:8:1$TjAqGnPkhOZJf6D6$ce388ca628d806fb5ae16f4de0c4cffbf8c6ca560db8398aec34684141fa431ae53386da318ed8395b25cb040b8ec2fcec4ffba4111b6fea3e99eb02b910d4a3', CURRENT_DATE, '1990-01-01', 'admin');

INSERT INTO admin (id, report_count)
VALUES ('U0000012', 0);

-- password: pass04word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000013', 'Sarah', 'Miller', 'sarah.miller3@example.com', 'scrypt:32768:8:1$DFzFcG0W45zChjX6$b13b6270106b97167c8171ecfb57e6f64b4080b22771ec81de2d3b8b0029e268bf1d07b096162c33d0a9715de6794f8d416d78f5d229ab9d55b65d735c0f0fe5', CURRENT_DATE, '1990-01-01', 'instructor');

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000013', 0.0, 0);

-- password: pass05word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000014', 'Sophia', 'Davis', 'sophia.davis4@example.com', 'scrypt:32768:8:1$1XfOo6RzlKAFMmRj$3f2946506d87e54be5abc72735e4b5365bcb0a6adc841345cd1f05e69efdc54e376cb098eb40766a08f113d73d79467c4a8f4825b22cea35e049c3c854d8c007', CURRENT_DATE, '1990-01-01', 'instructor');

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000014', 0.0, 0);

-- password: pass06word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000015', 'Daniel', 'Davis', 'daniel.davis5@example.com', 'scrypt:32768:8:1$aHMBTWDaYJkNwvrX$43f5b1d7a3f71da63fe6d49b300a6c76862582a19513cf556d07ee21fad1559f3f84ebf2a20607b69381e1d8264299a330f4f33323167d0bfd89a5f09937725b', CURRENT_DATE, '1990-01-01', 'instructor');

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000015', 0.0, 0);

-- password: pass07word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000016', 'Emma', 'Lee', 'emma.lee6@example.com', 'scrypt:32768:8:1$P8nCqboAxOucjEeh$300017264f81a469bfe12f5c53952ba21f493fb3e138f14827e0867aa0cf27e4e6c82c28ae9e261fdaa026280d1859b369aab05634969a61f462aa064a83de7b', CURRENT_DATE, '1990-01-01', 'instructor');

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000016', 0.0, 0);

-- password: pass08word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000017', 'Alice', 'Williams', 'alice.williams7@example.com', 'scrypt:32768:8:1$RCxvRfNTIJgN2kpB$230f8daa3f8e736ef0f5b0fe527e01c92d4f3bb701bdba2702e7eddb2bf7b58b1b7250a74dd56a905e9b360d25f2f35daf4a35405513dc4f0f2603bbe9628d63', CURRENT_DATE, '1990-01-01', 'instructor');

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000017', 0.0, 0);

-- password: pass09word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000018', 'Alice', 'Brown', 'alice.brown8@example.com', 'scrypt:32768:8:1$zKPgQmpW9HdFU7af$3462081f7fb46704490cbeb63edc58b34d0457d17e53873effec4feea35fca6bfaffac618cf741184ba929ecfca72cec7a521d88e4b0f8ebc37216f2e19e3166', CURRENT_DATE, '1990-01-01', 'instructor');

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000018', 0.0, 0);

-- password: pass10word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000019', 'Sarah', 'Miller', 'sarah.miller9@example.com', 'scrypt:32768:8:1$WPZVZVn5AmSF4iCy$5996fcc478c50e4f233457733a46915584eaa749310579bcb7487de4d507c79e7d3f6bf0c3372aa050c1fc8b2ccb69f8c37bcbd112c32a2bdff4afaf43cd9978', CURRENT_DATE, '1990-01-01', 'instructor');

INSERT INTO instructor (id, i_rating, course_count)
VALUES ('U0000019', 0.0, 0);

-- password: pass11word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000020', 'Michael', 'Garcia', 'michael.garcia10@example.com', 'scrypt:32768:8:1$UfshWTqNRatv5Ysd$70257dcd19a6ed866081553128923c92d71f809fe63523a1b5a4c962b253c65c4e45643906da9454b31e279051b4dd558a922b976b783b7477f19c6ae82dc2a3', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000020', 'CS', 'active', 0);

-- password: pass12word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000021', 'Daniel', 'Miller', 'daniel.miller11@example.com', 'scrypt:32768:8:1$viItZBygL1YHklTH$60c5c5e45e98173cf7c4e422446c168f4fcf8bc873c1f74c32bb942f56a50566903c39a72de422ad8c5217f4273dba210b0f31a34e3034ba5d7b4101e19deb8f', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000021', 'Math', 'active', 0);

-- password: pass13word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000022', 'Daniel', 'Garcia', 'daniel.garcia12@example.com', 'scrypt:32768:8:1$Ktwnh0AHVcxys0er$fb2c1742c0d8fd23b72ae9cb8d144604f83887f418b8b3dfc1c09b7014a4bf0d0ef98e7aafb70319223fae7ca7b57033b857a5f99c5c331c6343456187f21668', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000022', 'Chemistry', 'active', 0);

-- password: pass14word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000023', 'Chris', 'Jones', 'chris.jones13@example.com', 'scrypt:32768:8:1$3KuqqUjiKYJEPvSl$b06ef9f5cdc613fecb78716545af07ae16cef879ca9409c929baadf9d12fb7122d094b1594a903573ef4d7fa0b6a44a0f38f53e1e57efa07d77f2701cbd5e0c6', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000023', 'Biology', 'active', 0);

-- password: pass15word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000024', 'Daniel', 'Lee', 'daniel.lee14@example.com', 'scrypt:32768:8:1$g24ubu2Vg5qiAeqC$7cef9b588df214a85168015922bb947b1d6ca628c9ee41a6fe6d8ab1af43416520feb15d0897e7f48162e30ae476b16499144f119fd25b4fef64ee9995fdae21', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000024', 'Math', 'active', 0);

-- password: pass16word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000025', 'Sarah', 'Brown', 'sarah.brown15@example.com', 'scrypt:32768:8:1$6bt5KHjotoq48F1m$4aace3d7e625ba92d1b1587cfe19c9c104632ece951d26bf069c2981582d94674db14766f7dfb4f8aa1ddfc11ea6efc117b48dbf52e68dea18cfb91bd76e32f6', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000025', 'Physics', 'active', 0);

-- password: pass17word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000026', 'David', 'Lee', 'david.lee16@example.com', 'scrypt:32768:8:1$AMvHBV2HKxcsuVnX$17ab62d420dcfe0da3a13aa9320ba1753af0dee1fc64eb5ffeb2763cc232d173dbd66d4484d29f0a9e06731c584eb1e9fc893f4c01fe22baad27da9c1a455d95', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000026', 'Chemistry', 'active', 0);

-- password: pass18word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000027', 'Olivia', 'Brown', 'olivia.brown17@example.com', 'scrypt:32768:8:1$BhSq7pLQB6l8kOxT$28e61d9e97b23ddf353b3ba938a5e8274cce118547e5fdd7ed49f25c46c143ee3e8a83554b5ce14eeba4d3872864b10d8b5cd5798be582fc396dbf9bc74aaa8e', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000027', 'Physics', 'active', 0);

-- password: pass19word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000028', 'David', 'Miller', 'david.miller18@example.com', 'scrypt:32768:8:1$xBbuPKxwqnfbnlCm$dea920d97a31bd75ebfcd0cba5e4b738af933ecb49b3f15e8c9303dbfbb8018ba160ee0290eef8370c2abed18d81301c12fc1f5818f12059cdaee3f3cd5d8e0a', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000028', 'Math', 'active', 0);

-- password: pass20word
INSERT INTO "user" (id, first_name, last_name, email, password, registration_date, birth_date, role)
VALUES ('U0000029', 'David', 'Davis', 'david.davis19@example.com', 'scrypt:32768:8:1$zo0RWXpVlRyRaeq6$07b160262da8186c0ad7811fb3ed756dca711571326f19e88caac2d2df2aa98259c87881ad0f1118a57e07734269657d40f7ecae177d8fa60a480cd2b98ebc7a', CURRENT_DATE, '1990-01-01', 'student');

INSERT INTO student (id, major, account_status, certificate_count)
VALUES ('U0000029', 'Biology', 'active', 0);


-- Insert accepted courses and sections
INSERT INTO course (course_id, title, description, category, price, creation_date, last_update_date, status, enrollment_count, qna_link, difficulty_level, creator_id) VALUES
('C0000110', 'Crash Course in Data Science', 'Explore modern techniques with real-world case studies and hands-on projects.', 'Data Science', 199, '2024-07-01', '2024-08-22', 'accepted', 0, 'https://forum.learnhub.com/data_science', 5, 'U0000014'),
('C0000111', 'Foundations of Philosophy', 'An engaging journey into the core principles and advanced methods.', 'Philosophy', 49, '2024-02-15', '2024-05-10', 'accepted', 0, 'https://forum.learnhub.com/philosophy', 2, 'U0000013'),
('C0000112', 'Mastering Cybersecurity', 'A blend of theory, practice, and creative challenges.', 'Cybersecurity', 29, '2024-06-05', '2024-09-02', 'accepted', 0, 'https://forum.learnhub.com/cybersecurity', 4, 'U0000016'),
('C0000113', 'Applied AI & Robotics', 'Comprehensive and updated with the latest trends.', 'AI & Robotics', 0, '2024-01-20', '2024-04-05', 'accepted', 0, 'https://forum.learnhub.com/ai_&_robotics', 3, 'U0000017'),
('C0000114', 'Introduction to Music Theory', 'Explore modern techniques with real-world case studies and hands-on projects.', 'Music Theory', 99, '2024-03-09', '2024-06-17', 'accepted', 0, 'https://forum.learnhub.com/music_theory', 1, 'U0000013'),
('C0000115', 'Crash Course in Economics', 'From beginner to advanced, designed to empower learners.', 'Economics', 0, '2024-05-03', '2024-06-13', 'accepted', 0, 'https://forum.learnhub.com/economics', 2, 'U0000015'),
('C0000116', 'Applied Creative Writing', 'A blend of theory, practice, and creative challenges.', 'Creative Writing', 199, '2024-04-12', '2024-06-25', 'accepted', 0, 'https://forum.learnhub.com/creative_writing', 5, 'U0000013'),
('C0000117', 'Mastering UX Design', 'Comprehensive and updated with the latest trends.', 'UX Design', 49, '2024-06-01', '2024-07-15', 'accepted', 0, 'https://forum.learnhub.com/ux_design', 4, 'U0000016'),
('C0000118', 'Foundations of Blockchain', 'An engaging journey into the core principles and advanced methods.', 'Blockchain', 0, '2024-02-20', '2024-04-25', 'accepted', 0, 'https://forum.learnhub.com/blockchain', 3, 'U0000014'),
('C0000119', 'Crash Course in Cognitive Science', 'From beginner to advanced, designed to empower learners.', 'Cognitive Science', 99, '2024-01-31', '2024-03-10', 'accepted', 0, 'https://forum.learnhub.com/cognitive_science', 2, 'U0000015');

INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time) VALUES
('C0000110', 'S011506', 'Unit 1: Foundations', 'This section focuses on key ideas.', 1, 0),
('C0000110', 'S012987', 'Unit 2: Essentials', 'This section focuses on hands-on tasks.', 2, 0),
('C0000110', 'S013451', 'Unit 3: Theory', 'This section focuses on interactive activities.', 3, 0),
('C0000110', 'S014719', 'Unit 4: Theory', 'This section focuses on conceptual frameworks.', 4, 0),

('C0000111', 'S021589', 'Unit 1: Essentials', 'This section focuses on key ideas.', 1, 0),
('C0000111', 'S022846', 'Unit 2: Lab Work', 'This section focuses on key ideas.', 2, 0),
('C0000111', 'S023210', 'Unit 3: Theory', 'This section focuses on conceptual frameworks.', 3, 0),

('C0000112', 'S031127', 'Unit 1: Theory', 'This section focuses on important theories.', 1, 0),
('C0000112', 'S032940', 'Unit 2: Foundations', 'This section focuses on conceptual frameworks.', 2, 0),
('C0000112', 'S033661', 'Unit 3: Practice', 'This section focuses on key ideas.', 3, 0),

('C0000113', 'S041391', 'Unit 1: Essentials', 'This section focuses on interactive activities.', 1, 0),
('C0000113', 'S042418', 'Unit 2: Lab Work', 'This section focuses on conceptual frameworks.', 2, 0),
('C0000113', 'S043511', 'Unit 3: Practice', 'This section focuses on hands-on tasks.', 3, 0),

('C0000114', 'S051157', 'Unit 1: Lab Work', 'This section focuses on conceptual frameworks.', 1, 0),
('C0000114', 'S052349', 'Unit 2: Essentials', 'This section focuses on hands-on tasks.', 2, 0),
('C0000114', 'S053102', 'Unit 3: Theory', 'This section focuses on conceptual frameworks.', 3, 0),
('C0000114', 'S054327', 'Unit 4: Practice', 'This section focuses on interactive activities.', 4, 0),

('C0000115', 'S061058', 'Unit 1: Theory', 'This section focuses on interactive activities.', 1, 0),
('C0000115', 'S062419', 'Unit 2: Foundations', 'This section focuses on important theories.', 2, 0),
('C0000115', 'S063203', 'Unit 3: Lab Work', 'This section focuses on hands-on tasks.', 3, 0),

('C0000116', 'S071336', 'Unit 1: Practice', 'This section focuses on interactive activities.', 1, 0),
('C0000116', 'S072178', 'Unit 2: Lab Work', 'This section focuses on conceptual frameworks.', 2, 0),
('C0000116', 'S073917', 'Unit 3: Theory', 'This section focuses on important theories.', 3, 0),
('C0000116', 'S074632', 'Unit 4: Practice', 'This section focuses on hands-on tasks.', 4, 0),
('C0000116', 'S075822', 'Unit 5: Essentials', 'This section focuses on conceptual frameworks.', 5, 0),

('C0000117', 'S081443', 'Unit 1: Theory', 'This section focuses on interactive activities.', 1, 0),
('C0000117', 'S082658', 'Unit 2: Practice', 'This section focuses on conceptual frameworks.', 2, 0),
('C0000117', 'S083197', 'Unit 3: Lab Work', 'This section focuses on conceptual frameworks.', 3, 0),

('C0000118', 'S091271', 'Unit 1: Practice', 'This section focuses on conceptual frameworks.', 1, 0),
('C0000118', 'S092378', 'Unit 2: Theory', 'This section focuses on hands-on tasks.', 2, 0),
('C0000118', 'S093810', 'Unit 3: Foundations', 'This section focuses on conceptual frameworks.', 3, 0),
('C0000118', 'S094211', 'Unit 4: Practice', 'This section focuses on interactive activities.', 4, 0),

('C0000119', 'S101267', 'Unit 1: Lab Work', 'This section focuses on conceptual frameworks.', 1, 0),
('C0000119', 'S102643', 'Unit 2: Theory', 'This section focuses on hands-on tasks.', 2, 0),
('C0000119', 'S103790', 'Unit 3: Practice', 'This section focuses on important theories.', 3, 0),
('C0000119', 'S104134', 'Unit 4: Practice', 'This section focuses on conceptual frameworks.', 4, 0);

-- Pending Courses
INSERT INTO course (course_id, title, description, category, price, creation_date, last_update_date, status, enrollment_count, qna_link, difficulty_level, creator_id) VALUES
('C0000120', 'Modern Ethics in Technology', 'Explore ethical frameworks in the age of AI.', 'Ethics', 79, '2024-07-01', '2024-08-15', 'pending', 0, 'https://forum.learnhub.com/ethics_tech', 3, 'U0000014'),
('C0000121', 'Environmental Economics', 'A comprehensive look at sustainability and market dynamics.', 'Environmental Studies', 59, '2024-06-10', '2024-08-01', 'pending', 0, 'https://forum.learnhub.com/env_econ', 4, 'U0000015');

INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time) VALUES
('C0000120', 'S120001', 'Unit 1: Tech Dilemmas', 'Ethical decisions in tech applications.', 1, 0),
('C0000120', 'S120002', 'Unit 2: Case Studies', 'Real-world examples of AI ethics.', 2, 0),
('C0000120', 'S120003', 'Unit 3: Frameworks', 'Theoretical models of modern ethics.', 3, 0),

('C0000121', 'S121001', 'Unit 1: Green Markets', 'Understanding eco-friendly market strategies.', 1, 0),
('C0000121', 'S121002', 'Unit 2: Policy Tools', 'Explore policy approaches to sustainability.', 2, 0),
('C0000121', 'S121003', 'Unit 3: Global Trends', 'International collaboration and issues.', 3, 0),
('C0000121', 'S121004', 'Unit 4: Impact Metrics', 'How to measure sustainability effects.', 4, 0);

-- Draft Courses
INSERT INTO course (course_id, title, description, category, price, creation_date, last_update_date, status, enrollment_count, qna_link, difficulty_level, creator_id) VALUES
('C0000122', 'Creative Coding with Processing', 'A hands-on intro to visual programming.', 'Digital Art', 39, '2024-05-05', '2024-07-09', 'draft', 0, 'https://forum.learnhub.com/creative_coding', 2, 'U0000016'),
('C0000123', 'History of Modern Architecture', 'Tracing the evolution of design from 1900 onwards.', 'Architecture', 89, '2024-06-01', '2024-07-12', 'draft', 0, 'https://forum.learnhub.com/modern_architecture', 3, 'U0000013');

INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time) VALUES
('C0000122', 'S122001', 'Unit 1: Processing Basics', 'Intro to the Processing environment.', 1, 0),
('C0000122', 'S122002', 'Unit 2: Drawing Shapes', 'Use code to create visual elements.', 2, 0),
('C0000122', 'S122003', 'Unit 3: Animation', 'Add motion to visual components.', 3, 0),
('C0000122', 'S122004', 'Unit 4: Interaction', 'Make programs respond to user input.', 4, 0),

('C0000123', 'S123001', 'Unit 1: Bauhaus Origins', 'Explore the start of the Bauhaus school.', 1, 0),
('C0000123', 'S123002', 'Unit 2: Postmodernism', 'Understand stylistic revolutions.', 2, 0),
('C0000123', 'S123003', 'Unit 3: Global Influences', 'Non-Western influence in modern design.', 3, 0);

-- Rejected Courses
INSERT INTO course (course_id, title, description, category, price, creation_date, last_update_date, status, enrollment_count, qna_link, difficulty_level, creator_id) VALUES
('C0000124', 'Quantum Mechanics for Beginners', 'A light introduction to mind-bending concepts.', 'Physics', 119, '2024-03-20', '2024-04-10', 'rejected', 0, 'https://forum.learnhub.com/quantum_intro', 5, 'U0000017'),
('C0000125', 'Cultural Anthropology Insights', 'Discover human societies and their patterns.', 'Anthropology', 69, '2024-04-05', '2024-06-02', 'rejected', 0, 'https://forum.learnhub.com/cultural_anthropology', 2, 'U0000015');

INSERT INTO section (course_id, sec_id, title, description, order_number, allocated_time) VALUES
('C0000124', 'S124001', 'Unit 1: Wave Functions', 'Understand basics of quantum behavior.', 1, 0),
('C0000124', 'S124002', 'Unit 2: Particles vs Waves', 'The duality paradox explained.', 2, 0),
('C0000124', 'S124003', 'Unit 3: Superposition', 'Explore Schrödingers thought experiment.', 3, 0),

('C0000125', 'S125001', 'Unit 1: Kinship Structures', 'Study family and social roles.', 1, 0),
('C0000125', 'S125002', 'Unit 2: Ritual & Belief', 'Explore meaning-making across cultures.', 2, 0),
('C0000125', 'S125003', 'Unit 3: Modern Fieldwork', 'Approaches and challenges today.', 3, 0),
('C0000125', 'S125004', 'Unit 4: Case Studies', 'Ethnographic insights from around the world.', 4, 0);



-- Insert content for section 'S011506' of course 'C0000110'
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES
('C0000110', 'S011506', 'CT000001', 'Introduction to Data Science', 1, 45, 'document'),
('C0000110', 'S011506', 'CT000002', 'Data Science Overview Video', 2, 30, 'visual_material'),
('C0000110', 'S011506', 'CT000003', 'Foundations Quiz', 3, 20, 'task');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S012987', 'CT000004', 'Unit 2: Essentials - Content 1', 1, 38, 'visual_material');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S012987', 'CT000005', 'Unit 2: Essentials - Content 2', 2, 39, 'task');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S012987', 'CT000006', 'Unit 2: Essentials - Content 3', 3, 37, 'visual_material');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S012987', 'CT000007', 'Unit 2: Essentials - Content 4', 4, 41, 'visual_material');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S013451', 'CT000008', 'Unit 3: Theory - Content 1', 1, 40, 'document');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S013451', 'CT000009', 'Unit 3: Theory - Content 2', 2, 32, 'document');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S013451', 'CT000010', 'Unit 3: Theory - Content 3', 3, 47, 'task');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S014719', 'CT000011', 'Unit 4: Theory - Content 1', 1, 31, 'visual_material');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S014719', 'CT000012', 'Unit 4: Theory - Content 2', 2, 34, 'task');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S014719', 'CT000013', 'Unit 4: Theory - Content 3', 3, 22, 'visual_material');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S014719', 'CT000014', 'Unit 4: Theory - Content 4', 4, 30, 'document');
INSERT INTO content (course_id, sec_id, content_id, title, order_number, allocated_time, content_type) VALUES ('C0000110', 'S014719', 'CT000015', 'Unit 4: Theory - Content 5', 5, 21, 'visual_material');


-- Insert corresponding entries into document, visual_material, and task tables
INSERT INTO document (course_id, sec_id, content_id, body) VALUES ('C0000110', 'S011506', 'CT000001', 'uploads/doc_intro_data_science.pdf');
INSERT INTO document (course_id, sec_id, content_id, body) VALUES ('C0000110', 'S013451', 'CT000008', 'uploads/doc_unit3_theory_1.pdf');
INSERT INTO document (course_id, sec_id, content_id, body) VALUES ('C0000110', 'S013451', 'CT000009', 'uploads/doc_unit3_theory_2.pdf');
INSERT INTO document (course_id, sec_id, content_id, body) VALUES ('C0000110', 'S014719', 'CT000014', 'uploads/doc_unit4_theory_4.pdf');


INSERT INTO visual_material (course_id, sec_id, content_id, duration, body) VALUES ('C0000110', 'S011506', 'CT000002', 30, 'uploads/video_data_science_overview.mp4');
INSERT INTO visual_material (course_id, sec_id, content_id, duration, body) VALUES ('C0000110', 'S012987', 'CT000004', 38, 'uploads/video_unit2_essentials_1.mp4');
INSERT INTO visual_material (course_id, sec_id, content_id, duration, body) VALUES ('C0000110', 'S012987', 'CT000006', 37, 'uploads/video_unit2_essentials_3.mp4');
INSERT INTO visual_material (course_id, sec_id, content_id, duration, body) VALUES ('C0000110', 'S012987', 'CT000007', 41, 'uploads/video_unit2_essentials_4.mp4');
INSERT INTO visual_material (course_id, sec_id, content_id, duration, body) VALUES ('C0000110', 'S014719', 'CT000011', 31, 'uploads/video_unit4_theory_1.mp4');
INSERT INTO visual_material (course_id, sec_id, content_id, duration, body) VALUES ('C0000110', 'S014719', 'CT000013', 22, 'uploads/video_unit4_theory_3.mp4');
INSERT INTO visual_material (course_id, sec_id, content_id, duration, body) VALUES ('C0000110', 'S014719', 'CT000015', 21, 'uploads/video_unit4_theory_5.mp4');


INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage) VALUES ('C0000110', 'S011506', 'CT000003', 70, 20, 'assessment', 100);
INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage) VALUES ('C0000110', 'S012987', 'CT000005', 78, 39, 'assessment', 30);
INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage) VALUES ('C0000110', 'S013451', 'CT000010', 80, 47, 'assignment', 60);
INSERT INTO task (course_id, sec_id, content_id, passing_grade, max_time, task_type, percentage) VALUES ('C0000110', 'S014719', 'CT000012', 68, 34, 'assessment', 50);


-- Insert corresponding entry into assessment table
INSERT INTO assessment (course_id, sec_id, content_id, question_count) VALUES ('C0000110', 'S011506', 'CT000003', 10);
INSERT INTO assessment (course_id, sec_id, content_id, question_count) VALUES ('C0000110', 'S012987', 'CT000005', 5);
INSERT INTO assessment (course_id, sec_id, content_id, question_count) VALUES ('C0000110', 'S014719', 'CT000012', 5);

-- Insert corresponding entry into assignment table
INSERT INTO assignment (course_id, sec_id, content_id, start_date, end_date, upload_material, body) VALUES ('C0000110', 'S013451', 'CT000010', '2025-05-07', '2025-05-25', 'doc', 'uploads/assignment_unit3_theory_3.pdf');

-- Insert questions for the assessment
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES
('C0000110', 'S011506', 'CT000003', 'Q0000001', 'What is Data Science?', 2),
('C0000110', 'S011506', 'CT000003', 'Q0000002', 'Name a key component of Data Science.', 2);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S012987', 'CT000005', 'Q650762', 'Question 1 for Unit 2: Essentials - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S012987', 'CT000005', 'Q245904', 'Question 2 for Unit 2: Essentials - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S012987', 'CT000005', 'Q479756', 'Question 3 for Unit 2: Essentials - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S012987', 'CT000005', 'Q558419', 'Question 4 for Unit 2: Essentials - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S012987', 'CT000005', 'Q641453', 'Question 5 for Unit 2: Essentials - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S014719', 'CT000012', 'Q222694', 'Question 1 for Unit 4: Theory - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S014719', 'CT000012', 'Q962232', 'Question 2 for Unit 4: Theory - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S014719', 'CT000012', 'Q357165', 'Question 3 for Unit 4: Theory - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S014719', 'CT000012', 'Q786756', 'Question 4 for Unit 4: Theory - Content 2', 3);
INSERT INTO question (course_id, sec_id, content_id, question_id, question_body, max_time) VALUES ('C0000110', 'S014719', 'CT000012', 'Q727235', 'Question 5 for Unit 4: Theory - Content 2', 3);


-- Insert multiple choice answers for the questions
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES
('C0000110', 'S011506', 'CT000003', 'Q0000001', 'A'),
('C0000110', 'S011506', 'CT000003', 'Q0000002', 'B');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S012987', 'CT000005', 'Q650762', 'C');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S012987', 'CT000005', 'Q245904', 'C');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S012987', 'CT000005', 'Q479756', 'D');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S012987', 'CT000005', 'Q558419', 'B');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S012987', 'CT000005', 'Q641453', 'A');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S014719', 'CT000012', 'Q222694', 'B');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S014719', 'CT000012', 'Q962232', 'B');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S014719', 'CT000012', 'Q357165', 'C');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S014719', 'CT000012', 'Q786756', 'D');
INSERT INTO multiple_choice (course_id, sec_id, content_id, question_id, correct_answer) VALUES ('C0000110', 'S014719', 'CT000012', 'Q727235', 'C');


