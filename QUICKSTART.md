# INFO_7 Project - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation Steps

#### 1. Clone/Set Up Project
Your project is already structured in:
```
c:\Users\dell\OneDrive\Bureau\PFE
```

#### 2. Backend Setup (Terminal 1)
```bash
cd c:\Users\dell\OneDrive\Bureau\PFE\backend
npm install
```

Create `.env` file with:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=info_7_db
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=development
PORT=5000
JWT_SECRET=your_super_secret_key_123
FRONTEND_URL=http://localhost:3000
```

#### 3. Create Database
```sql
CREATE DATABASE info_7_db;
```

#### 4. Start Backend Server
```bash
cd backend
npm run dev
```
Server will start on: `http://localhost:5000`

#### 5. Frontend Setup (Terminal 2)
```bash
cd c:\Users\dell\OneDrive\Bureau\PFE\frontend
npm install
npm start
```
App will open at: `http://localhost:3000`

## 📊 Database Schema

The following tables are automatically created:
- **users** - User accounts with roles
- **students** - Student-specific info
- **teachers** - Teacher-specific info
- **agents** - Pedagogical agents
- **courses** - Course information
- **enrollments** - Student course enrollments
- **grades** - Grade records
- **schedule** - Course schedules
- **course_materials** - Educational materials
- **announcements** - Notifications
- **time_employment** - Schedule configuration

## 🔐 Test Login Credentials

### Student Account
- Email: `student@example.com`
- Password: `password123`

### Teacher Account
- Email: `teacher@example.com`
- Password: `password123`

### Agent Account
- Email: `agent@example.com`
- Password: `password123`

*Note: Create these accounts through the registration page*

## 🎯 Key Features

### Student Dashboard
- View grades by course
- Check enrolled courses
- Download course materials
- View class schedule
- Track academic progress

### Teacher Panel
- Publish student grades
- Upload course materials (PDF, Videos, Exercises)
- Manage course information
- Send announcements

### Pedagogical Agent Dashboard
- Manage course schedules
- Configure time employment (groups, classrooms)
- Validate and publish final grades
- Manage enrollments

## 🛠️ Development

### Backend API Endpoints

**Auth:**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login

**Students:**
- `GET /api/students/profile` - Get profile
- `GET /api/students/my-grades` - Get grades
- `GET /api/students/my-courses` - Get courses

**Grades:**
- `POST /api/grades/publish` - Publish grades
- `GET /api/grades/course/:id` - Get course grades

**Schedule:**
- `GET /api/schedule/student/:id` - Get schedule
- `POST /api/schedule/create` - Create schedule

**Courses:**
- `GET /api/courses` - Get all courses
- `POST /api/courses/create` - Create course

## 📁 Project Structure
```
PFE/
├── backend/
│   ├── src/
│   │   ├── server.js          # Main server
│   │   ├── config/
│   │   │   ├── database.js    # DB connection
│   │   │   └── migration.js   # DB schema
│   │   ├── routes/            # API routes
│   │   └── middleware/        # Auth & middleware
│   ├── package.json
│   └── .env (create this)
│
├── frontend/
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Shared components
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── .env.local
│
├── README.md
└── .gitignore
```

## 🐛 Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check `.env` file configuration
- Verify database exists: `info_7_db`

### Frontend Can't Connect to Backend
- Ensure backend server is running on port 5000
- Check `REACT_APP_API_URL` in frontend `.env.local`
- Check CORS configuration in backend

### Port Already in Use
- Backend: Change `PORT` in `.env`
- Frontend: Set `PORT=3001` in terminal

## 📚 Next Steps

1. **Customize Database Schema** - Add more tables as needed
2. **Enhance UI** - Design custom components
3. **Add More Features**:
   - Email notifications
   - File downloads
   - Advanced reporting
   - Mobile responsiveness
4. **Testing** - Add unit & integration tests
5. **Deployment** - Deploy to production

## 📖 Resources

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

For issues or questions, check the main README.md file.

---

**Last Updated:** February 16, 2026
**Version:** 1.0.0
