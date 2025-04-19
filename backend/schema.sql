CREATE TABLE "user" (
    ID VARCHAR(8),
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    phone_no VARCHAR(15),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    registration_date DATE NOT NULL,
    birth_date DATE NOT NULL,
    PRIMARY KEY (ID),
    CHECK (registration_date <= CURRENT_DATE)
);

INSERT INTO "user" (ID, first_name, middle_name, last_name, phone_no, email, password, registration_date, birth_date)
VALUES 
(
    'U0000001',
    'John',
    'F.',
    'Doe',
    '555-1234',
    'john.doe@example.com',
    'password123', -- (later we will hash passwords)
    CURRENT_DATE,
    '1995-06-15'
);