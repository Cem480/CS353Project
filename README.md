# LearnHub - Learning Management System

LearnHub is a comprehensive Learning Management System (LMS) built as part of the CS353 Database Systems course project. It provides a modern, feature-rich platform for online education with role-based access control for students, instructors, and administrators.

## 🚀 Features

### For Students
- **Course Enrollment**: Browse and enroll in courses, apply for financial aid
- **Interactive Learning**: Access video content, assignments, assessments, and labs
- **Progress Tracking**: Monitor course completion and academic progress
- **Certification**: Earn certificates upon course completion
- **Community Features**: Comment on course content and interact with peers
- **Notifications**: Real-time updates on course activities and grades

### For Instructors
- **Course Creation**: Design comprehensive courses with sections and content
- **Content Management**: Upload videos, create assignments and assessments
- **Student Management**: Track student progress and provide feedback
- **Grading System**: Evaluate assignments and provide detailed feedback
- **Analytics**: Access detailed reports on course performance

### For Administrators
- **Course Approval**: Review and approve instructor-submitted courses
- **User Management**: Oversee all system users and their activities
- **Financial Aid**: Process and manage student financial aid applications
- **System Reports**: Generate comprehensive analytics and reports
- **Notification Management**: Send system-wide announcements

## 🏗️ Architecture

### Backend (Flask)
- **Framework**: Python Flask with modular route organization
- **Database**: PostgreSQL 14 with comprehensive schema design
- **API**: RESTful API with 18 specialized route modules
- **Authentication**: Secure user authentication and session management
- **File Handling**: Document and media upload functionality

### Frontend (React)
- **Framework**: React 19 with modern hooks and functional components
- **Routing**: React Router DOM for single-page application navigation
- **Styling**: Custom CSS with responsive design principles
- **State Management**: React hooks for local state management
- **API Integration**: Axios for HTTP requests with service-oriented architecture

### Database
- **Engine**: PostgreSQL 14 with BCNF normalization standards
- **Schema**: Comprehensive 2,738-line schema with 19 tables
- **Triggers**: 19 database triggers for business logic automation
- **Constraints**: Robust data integrity through constraints and foreign keys
- **Indexing**: Strategic indexing for optimized query performance

## 🛠️ Tech Stack

### Backend Dependencies
```
Flask                 # Web framework
psycopg2-binary      # PostgreSQL adapter
python-dotenv        # Environment variable management
flask-cors           # Cross-origin resource sharing
passlib              # Password hashing
```

### Frontend Dependencies
```
React 19             # Frontend framework
React Router DOM     # Client-side routing
Axios               # HTTP client
Lucide React        # Icon library
Recharts            # Data visualization
Date-fns            # Date manipulation
html2pdf.js         # PDF generation
```

## 🐳 Environment Setup

### Prerequisites
- Docker and Docker Compose
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd CS353Project
```

### 2. Environment Configuration
Create a `.env` file in the root directory using the provided template:

```bash
cp .env.example .env
```

Configure your `.env` file with the appropriate database credentials and settings:
```env
# Database Configuration
POSTGRES_DB=learnhub
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your_secret_key
```

### 3. Run with Docker
Start the entire application stack:

```bash
docker-compose up --build
```

This will start:
- **Backend**: Flask API server on port 5000
- **Frontend**: React development server on port 3000
- **Database**: PostgreSQL server on port 5432

## 🎯 Usage

### Accessing the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Test Accounts
The system includes pre-populated test data with the following accounts:

**Student Account:**
- Email: `john.doe@example.com`
- Password: `password456`

**Instructor Account:**
- Email: `alice.smith@example.com`
- Password: `password456`

**Admin Account:**
- Email: `admin@example.com`
- Password: `adminpass`

## 📁 Project Structure

```
CS353Project/
├── backend/
│   ├── routes/           # API route modules (18 files)
│   ├── uploads/          # File upload storage
│   ├── app.py           # Flask application entry point
│   ├── db.py            # Database connection utilities
│   ├── schema.sql       # Complete database schema
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service modules
│   │   └── App.js       # Main React application
│   └── public/          # Static assets
├── docker-compose.yml   # Multi-container orchestration
└── .env.example        # Environment template
```

## 🔧 Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Management
The PostgreSQL database is automatically initialized with the complete schema and test data when first started with Docker.

## 📊 Key Features Implementation

### Database Triggers
The system includes 19 sophisticated database triggers for:
- Automatic notification generation
- Progress tracking updates
- Enrollment count management
- Certificate management
- Course completion tracking

### Notification System
Real-time notifications for:
- Course status changes
- Assignment grading
- Financial aid updates
- Course completions
- System announcements

### Role-Based Access Control
Comprehensive authorization system with distinct permissions for students, instructors, and administrators.


