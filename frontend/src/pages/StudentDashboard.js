import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [debts, setDebts] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const token = localStorage.getItem('token');
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashboardRes, scheduleRes, debtsRes, coursesRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/students/dashboard`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/students/schedule`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/students/debts`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/students/my-courses`, { headers })
      ]);

      setDashboardData(dashboardRes.data);
      setSchedule(scheduleRes.data);
      setDebts(debtsRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

    const handleGradesPublished = (payload) => {
      // If published grades affect this student, refresh and notify
      setToasts(t => [{ id: Date.now(), title: 'Grades published', body: 'New grades were published. Click to refresh.' }, ...t]);
      fetchDashboard();
    };

    const handleGradeApproved = (payload) => {
      setToasts(t => [{ id: Date.now(), title: 'Grade approved', body: 'An admin approved a grade. Your dashboard updated.' }, ...t]);
      fetchDashboard();
    };

    socket.on('connect', () => {
      console.log('Socket connected (student):', socket.id);
    });
    socket.on('gradesPublished', handleGradesPublished);
    socket.on('gradeApproved', handleGradeApproved);

    return () => {
      socket.off('gradesPublished', handleGradesPublished);
      socket.off('gradeApproved', handleGradeApproved);
      socket.disconnect();
    };
  }, [fetchDashboard]);

  const dismissToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  // Auto-dismiss toasts after 6 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(t => setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id));
    }, 6000));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Admis': return 'from-green-100 to-emerald-100 text-green-800 border-green-300';
      case 'Rattrapage': return 'from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300';
      case 'Dettes': return 'from-orange-100 to-red-100 text-orange-800 border-orange-300';
      case 'Ajourné': return 'from-red-100 to-rose-100 text-red-800 border-rose-300';
      default: return 'from-gray-100 to-slate-100 text-gray-800 border-gray-300';
    }
  };

  const getTabIcon = (tab) => {
    const icons = {
      overview: '📊',
      grades: '📈',
      schedule: '📅',
      courses: '📚',
      debts: '⚠️',
    };
    return icons[tab] || '📌';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600 font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">Welcome, {dashboardData?.student?.first_name}! 👋</h1>
            <p className="text-blue-100">Here's your academic progress for this semester</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-8 p-2 sticky top-20 z-40 animate-slideDown">
          <div className="flex flex-wrap gap-2">
            {['overview', 'grades', 'schedule', 'courses', 'debts'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold capitalize transition-all duration-300 transform ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:scale-102'
                }`}
              >
                <span className="text-xl">{getTabIcon(tab)}</span>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="animate-fadeInUp">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[
                { label: 'GPA', value: dashboardData.stats.gpa, icon: '📊', color: 'from-blue-500 to-blue-600' },
                { label: 'Passed Courses', value: dashboardData.stats.passedCourses, icon: '✓', color: 'from-green-500 to-green-600' },
                { label: 'Failed Courses', value: dashboardData.stats.failedCourses, icon: '✗', color: 'from-red-500 to-red-600' },
                { label: 'Total Credits', value: dashboardData.stats.totalCredits, icon: '⭐', color: 'from-purple-500 to-purple-600' }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
                >
                  <div className={`inline-block bg-gradient-to-r ${stat.color} p-4 rounded-xl mb-4`}>
                    <span className="text-3xl text-white">{stat.icon}</span>
                  </div>
                  <p className="text-gray-600 text-sm font-semibold">{stat.label}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Semester Status Card */}
            <div className="mb-6 p-8 bg-white rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Academic Status</h2>
              <div className={`p-6 rounded-xl border-2 bg-gradient-to-r ${getStatusColor(dashboardData.stats.semesterStatus)}`}>
                <p className="text-sm font-semibold mb-2">Current Semester Status</p>
                <p className="text-4xl font-bold">{dashboardData.stats.semesterStatus}</p>
                <p className="text-sm mt-3 opacity-90">
                  {dashboardData.stats.semesterStatus === 'Admis' && '✓ You are in good academic standing'}
                  {dashboardData.stats.semesterStatus === 'Rattrapage' && '⚠️ You need to improve your grades'}
                  {dashboardData.stats.semesterStatus === 'Dettes' && '⚠️ You have courses to retake'}
                  {dashboardData.stats.semesterStatus === 'Ajourné' && '✗ Your admission has been postponed'}
                </p>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">👤 Name</p>
                  <p className="text-lg font-bold text-gray-900">{dashboardData.student.first_name} {dashboardData.student.last_name}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">🎓 Student ID</p>
                  <p className="text-lg font-bold text-gray-900">{dashboardData.student.student_id}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">📧 Email</p>
                  <p className="text-lg font-bold text-gray-900">{dashboardData.student.email}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">🏫 Filière</p>
                  <p className="text-lg font-bold text-gray-900">{dashboardData.student.filiere}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">📈 Level</p>
                  <p className="text-lg font-bold text-gray-900">{dashboardData.student.level}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border border-cyan-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">📅 Semester</p>
                  <p className="text-lg font-bold text-gray-900">{dashboardData.student.semester}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grades Tab */}
        {activeTab === 'grades' && dashboardData?.grades && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📈</span> Your Grades
              </h2>
              {dashboardData.grades.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <tr>
                        <th className="p-4 text-left font-semibold">Course</th>
                        <th className="p-4 text-center font-semibold">Credits</th>
                        <th className="p-4 text-center font-semibold">Final Grade</th>
                        <th className="p-4 text-center font-semibold">Status</th>
                        <th className="p-4 text-center font-semibold">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.grades.map((grade, idx) => (
                        <tr key={idx} className="hover:bg-blue-50 transition-colors duration-200 border-b border-gray-200">
                          <td className="p-4 font-semibold text-gray-900">{grade.course_name}</td>
                          <td className="p-4 text-center text-gray-700">⭐ {grade.credits}</td>
                          <td className="p-4 text-center font-bold text-lg">
                            <span className={grade.final_grade >= 10 ? 'text-green-600' : 'text-red-600'}>
                              {(grade.final_grade || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              grade.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {grade.status}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold">
                            {grade.final_grade >= 10 ? (
                              <span className="text-green-600">✓ PASSED</span>
                            ) : (
                              <span className="text-red-600">✗ FAILED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No grades published yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && schedule && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📅</span> Your Schedule
              </h2>
              {schedule.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                      <tr>
                        <th className="p-4 text-left font-semibold">Day</th>
                        <th className="p-4 text-left font-semibold">Course</th>
                        <th className="p-4 text-center font-semibold">Time</th>
                        <th className="p-4 text-left font-semibold">Room</th>
                        <th className="p-4 text-left font-semibold">Teacher</th>
                        <th className="p-4 text-center font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-green-50 transition-colors duration-200 border-b border-gray-200">
                          <td className="p-4 font-bold text-green-600">{entry.day_of_week}</td>
                          <td className="p-4 font-semibold text-gray-900">{entry.course_name}</td>
                          <td className="p-4 text-center text-gray-700">⏰ {entry.start_time} - {entry.end_time}</td>
                          <td className="p-4 text-gray-700">🏛️ {entry.room_name || entry.classroom}</td>
                          <td className="p-4 text-gray-700">
                            {entry.first_name && entry.last_name ? `${entry.first_name} ${entry.last_name}` : 'TBA'}
                          </td>
                          <td className="p-4 text-center">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                              {entry.course_type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No schedule available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && courses && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📚</span> Enrolled Courses
              </h2>
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course, idx) => (
                    <div
                      key={course.id}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
                    >
                      <h3 className="font-bold text-xl text-blue-600 mb-2">{course.course_name}</h3>
                      <p className="text-gray-600 mb-4 font-semibold">{course.course_code}</p>
                      <div className="space-y-2 text-sm">
                        <p><strong>Type:</strong> {course.course_type}</p>
                        <p><strong>Credits:</strong> {course.credits}</p>
                        <p><strong>Instructor:</strong> {course.first_name} {course.last_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No courses enrolled</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debts Tab */}
        {activeTab === 'debts' && debts && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">⚠️</span> Academic Debts & Status
              </h2>

              {/* Debt Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { label: 'Failed Modules', value: debts.summary.failedModules, icon: '✗', color: 'from-red-500 to-red-600' },
                  { label: 'Credits Owed', value: debts.summary.totalCreditsOwed, icon: '⭐', color: 'from-orange-500 to-orange-600' },
                  { label: 'Academic Status', value: debts.summary.academicStatus, icon: '📊', color: 'from-purple-500 to-purple-600' }
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-300 text-center"
                  >
                    <div className={`inline-block bg-gradient-to-r ${stat.color} p-4 rounded-xl mb-4`}>
                      <span className="text-3xl text-white">{stat.icon}</span>
                    </div>
                    <p className="text-gray-600 text-sm font-semibold">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Debts List */}
              {debts.debts.length > 0 ? (
                <div className="rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
                      <tr>
                        <th className="p-4 text-left font-semibold">Course</th>
                        <th className="p-4 text-center font-semibold">Code</th>
                        <th className="p-4 text-center font-semibold">Credits</th>
                        <th className="p-4 text-center font-semibold">Grade</th>
                        <th className="p-4 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debts.debts.map((debt, idx) => (
                        <tr key={idx} className="hover:bg-red-50 transition-colors duration-200 border-b border-gray-200">
                          <td className="p-4 font-semibold text-gray-900">{debt.course_name}</td>
                          <td className="p-4 text-center text-gray-700">{debt.course_code}</td>
                          <td className="p-4 text-center font-bold">⭐ {debt.credits}</td>
                          <td className="p-4 text-center font-bold text-red-600">{(debt.final_grade || 0).toFixed(2)}</td>
                          <td className="p-4 text-center">
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                              {debt.status || 'FAILED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="text-2xl font-bold text-green-700">✓ No Academic Debts</p>
                  <p className="text-gray-600 mt-2">You're in good academic standing!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast stack */}
      <div style={{ position: 'fixed', right: 20, top: 80, zIndex: 60 }}>
        {toasts.map(toast => (
          <div key={toast.id} className="mb-3 bg-white rounded-lg shadow-lg p-4 w-80 border-l-4 border-blue-500 toast-slide">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-sm">{toast.title}</div>
                <div className="text-sm text-gray-700 mt-1">{toast.body}</div>
              </div>
              <div className="ml-2 flex-shrink-0">
                <button onClick={() => dismissToast(toast.id)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-in-out; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .animate-slideDown { animation: slideDown 0.4s ease-out; }
        .toast-slide { animation: toastIn 0.35s ease-out, fadeOut 0.2s linear 5.8s forwards; opacity: 0; transform: translateX(20px); }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateX(20px); } }
      `}</style>
    </div>
  );
}
