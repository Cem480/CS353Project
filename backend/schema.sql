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

