# INFO_7 Student Management System

A full-stack web application for managing student information, grades, schedules, and course materials.

## Project Structure

```
├── backend/              # Node.js Express API
│   ├── src/
│   │   ├── server.js     # Main server file
│   │   ├── config/       # Database configuration
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Authentication & middleware
│   │   └── controllers/  # Business logic
│   └── package.json
│
├── frontend/             # React Frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   ├── utils/        # Utility functions
│   │   └── App.js        # Main app component
│   └── package.json
│
└── README.md
```

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcryptjs

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios

## Setup Instructions

### Database Setup

1. Install PostgreSQL (if not already installed)
2. Create a database:
   ```sql
   CREATE DATABASE info_7_db;
   ```

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file in backend root:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=info_7_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   NODE_ENV=development
   PORT=5000
   API_URL=http://localhost:5000
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

4. Initialize database:
   ```bash
   npm run dev
   ```

5. Start backend server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment file `.env.local` is already configured

4. Start frontend development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Student Routes
- `GET /api/students/profile` - Get student profile
- `GET /api/students/my-grades` - Get student grades
- `GET /api/students/my-courses` - Get enrolled courses

### Teacher Routes
- `POST /api/teacher/upload` - Upload course materials
- `GET /api/teacher/course/:courseId` - Get course materials

### Grades
- `POST /api/grades/publish` - Publish grades (teacher only)
- `GET /api/grades/course/:courseId` - Get course grades

### Schedule
- `GET /api/schedule/student/:studentId` - Get student schedule
- `POST /api/schedule/create` - Create schedule (agent only)

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses/create` - Create course

## User Roles & Permissions

### Student
- View personal grades
- View enrolled courses
- Download course materials
- View schedule
- Check academic status

### Teacher
- Publish grades for students
- Upload course materials
- Manage course information
- Send announcements

### Pedagogical Agent
- Manage schedules
- Configure time employment
- Validate and publish final grades
- Manage course enrollments

## Features Implemented

- ✅ User Authentication (JWT)
- ✅ Role-Based Access Control
- ✅ Student Dashboard
- ✅ Teacher Dashboard
- ✅ Pedagogical Agent Panel
- ✅ Grade Management
- ✅ Course Management
- ✅ Schedule Management
- ✅ File Uploads
- ✅ Responsive UI

## Features to Implement

- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Real-time updates (WebSocket)
- [ ] Transcript generation
- [ ] Appeal system
- [ ] Payment integration
- [ ] Document management

## Development Notes

- Database tables are automatically created on first server startup
- Tailwind CSS is loaded via CDN in frontend
- JWT tokens expire after 7 days by default
- File uploads are stored in `/uploads` directory

## License

MIT
