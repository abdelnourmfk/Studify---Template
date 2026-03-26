import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pendingGrades, setPendingGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    target_role: 'all'
  });

  const token = localStorage.getItem('token');
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const fetchAllData = useCallback(async () => {
    try {
      const [statsRes, gradesRes, studentsRes, notificationsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/dashboard`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/grades/pending`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/students/review`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/notifications`, { headers })
      ]);

      setStats(statsRes.data);
      setPendingGrades(gradesRes.data);
      setStudents(studentsRes.data);
      setNotifications(notificationsRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleApproveGrade = async (gradeId) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/grades/${gradeId}/approve`,
        {},
        { headers }
      );
      alert('Grade approved!');
      fetchAllData();
    } catch (err) {
      alert('Error approving grade: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRejectGrade = async (gradeId) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/grades/${gradeId}/reject`,
        {},
        { headers }
      );
      alert('Grade rejected!');
      fetchAllData();
    } catch (err) {
      alert('Error rejecting grade: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      alert('Fill in title and message');
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/notifications`,
        notificationForm,
        { headers }
      );
      alert('Notification sent!');
      setNotificationForm({ title: '', message: '', target_role: 'all' });
      fetchAllData();
    } catch (err) {
      alert('Error sending notification: ' + (err.response?.data?.error || err.message));
    }
  };

  const getTabIcon = (tab) => {
    const icons = {
      overview: '📊',
      grades: '✓',
      students: '👥',
      notifications: '📢'
    };
    return icons[tab] || '📌';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600 font-semibold">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-red-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 animate-fadeIn">
          <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard 🛡️</h1>
            <p className="text-red-100">Manage grades, students, and system notifications</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-8 p-2 sticky top-20 z-40 animate-slideDown">
          <div className="flex flex-wrap gap-2">
            {['overview', 'grades', 'students', 'notifications'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold capitalize transition-all duration-300 transform ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg scale-105'
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
        {activeTab === 'overview' && stats && (
          <div className="animate-fadeInUp">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Students', value: stats.total_students, icon: '👥', color: 'from-blue-500 to-blue-600' },
                { label: 'Total Teachers', value: stats.total_teachers, icon: '👨‍🏫', color: 'from-green-500 to-green-600' },
                { label: 'Total Courses', value: stats.total_courses, icon: '📚', color: 'from-purple-500 to-purple-600' },
                { label: 'Pending Grades', value: stats.pending_grades, icon: '⏳', color: 'from-orange-500 to-orange-600' }
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

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">System Health</h2>
              <div className="p-6 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-500 rounded-xl">
                <p className="text-lg font-bold text-green-800">✓ {stats.system_health}</p>
                <p className="text-green-700 text-sm mt-2">All systems operational and running smoothly</p>
              </div>
            </div>
          </div>
        )}

        {/* Grades Tab */}
        {activeTab === 'grades' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">✓</span> Grade Approvals ({pendingGrades.length})
              </h2>

              {pendingGrades.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                      <tr>
                        <th className="p-4 text-left font-semibold">Student</th>
                        <th className="p-4 text-left font-semibold">Course</th>
                        <th className="p-4 text-center font-semibold">Exam</th>
                        <th className="p-4 text-center font-semibold">Control</th>
                        <th className="p-4 text-center font-semibold">TP</th>
                        <th className="p-4 text-center font-semibold">Final</th>
                        <th className="p-4 text-center font-semibold">Teacher</th>
                        <th className="p-4 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingGrades.map((grade, idx) => (
                        <tr key={grade.id} className="hover:bg-orange-50 transition-colors duration-200 border-b border-gray-200">
                          <td className="p-4 font-semibold text-gray-900">
                            {grade.student_first} {grade.student_last}
                            <div className="text-xs text-gray-600">{grade.student_id}</div>
                          </td>
                          <td className="p-4 text-gray-700">{grade.course_name}</td>
                          <td className="p-4 text-center text-gray-700">{grade.exam_grade || '-'}</td>
                          <td className="p-4 text-center text-gray-700">{grade.control_grade || '-'}</td>
                          <td className="p-4 text-center text-gray-700">{grade.tp_grade || '-'}</td>
                          <td className="p-4 text-center font-bold text-lg">
                            {(grade.final_grade || 0).toFixed(2)}
                          </td>
                          <td className="p-4 text-gray-700">
                            {grade.teacher_first && grade.teacher_last
                              ? `${grade.teacher_first} ${grade.teacher_last}`
                              : 'TBA'}
                          </td>
                          <td className="p-4 text-center flex gap-2 justify-center">
                            <button
                              onClick={() => handleApproveGrade(grade.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 font-semibold transition-all"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleRejectGrade(grade.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-semibold transition-all"
                            >
                              ✕ Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-green-50 border-2 border-green-200 rounded-xl">
                  <p className="text-2xl font-bold text-green-700">✓ All Grades Approved</p>
                  <p className="text-gray-600 mt-2">No pending grades at this time</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">👥</span> Student Academic Review ({students.length})
              </h2>

              {students.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <tr>
                        <th className="p-4 text-left font-semibold">Name</th>
                        <th className="p-4 text-left font-semibold">Student ID</th>
                        <th className="p-4 text-center font-semibold">GPA</th>
                        <th className="p-4 text-center font-semibold">Enrolled</th>
                        <th className="p-4 text-center font-semibold">Passed</th>
                        <th className="p-4 text-center font-semibold">Failed</th>
                        <th className="p-4 text-center font-semibold">Filière</th>
                        <th className="p-4 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => {
                        const gpa = parseFloat(student.gpa || 0).toFixed(2);
                        let status = 'Admis';
                        if (gpa < 10 && gpa > 0) status = 'Rattrapage';
                        if (gpa < 6 && student.failed_courses > 2) status = 'Ajourné';
                        if (student.failed_courses > 0) status = 'Dettes';

                        return (
                          <tr key={student.id} className="hover:bg-blue-50 transition-colors border-b border-gray-200">
                            <td className="p-4 font-semibold text-gray-900">{student.first_name} {student.last_name}</td>
                            <td className="p-4 text-gray-700">{student.student_id}</td>
                            <td className="p-4 text-center font-bold text-lg">{gpa}</td>
                            <td className="p-4 text-center text-gray-700">{student.enrolled_courses}</td>
                            <td className="p-4 text-center font-bold text-green-600">{student.passed_courses}</td>
                            <td className="p-4 text-center font-bold text-red-600">{student.failed_courses}</td>
                            <td className="p-4 text-center text-gray-700">{student.filiere}</td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                status === 'Admis' ? 'bg-green-100 text-green-800' :
                                status === 'Rattrapage' ? 'bg-yellow-100 text-yellow-800' :
                                status === 'Dettes' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No students found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📢</span> System Notifications
              </h2>

              {/* Send Notification Form */}
              <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">📤 Send System Notification</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Notification title"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                  <textarea
                    placeholder="Message content"
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none h-32"
                  />
                  <select
                    value={notificationForm.target_role}
                    onChange={(e) => setNotificationForm({...notificationForm, target_role: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    <option value="all">📣 All Users</option>
                    <option value="student">👥 Students Only</option>
                    <option value="teacher">👨‍🏫 Teachers Only</option>
                    <option value="agent">🔧 Agents Only</option>
                  </select>
                  <button
                    onClick={handleSendNotification}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold transition-all"
                  >
                    📤 Send Notification
                  </button>
                </div>
              </div>

              {/* Recent Notifications */}
              <h3 className="text-lg font-bold mb-4 text-gray-800">Recent Notifications</h3>
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.slice(0, 10).map((notif, idx) => (
                    <div key={notif.id} className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">{notif.title}</h4>
                        <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mb-2">{notif.content}</p>
                      <p className="text-xs text-gray-600">👤 By: {notif.first_name} {notif.last_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No notifications</p>
                </div>
              )}
            </div>
          </div>
        )}
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
      `}</style>
    </div>
  );
}
