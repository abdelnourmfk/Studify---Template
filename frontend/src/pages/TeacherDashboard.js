import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MaterialsList from '../components/MaterialsList';
import axios from 'axios';

export default function TeacherDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [enteredGrades, setEnteredGrades] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    materialType: 'PDF'
  });
  const [announcementData, setAnnouncementData] = useState({
    title: '',
    content: ''
  });

  // Auth is handled via httpOnly cookie; axios.defaults.withCredentials = true is set globally
  const fileInputRef = useRef(null);
  const headers = useMemo(() => ({}), []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/teachers/my-courses`, { headers });
      setCourses(res.data);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, [headers]);

  useEffect(() => {
    if (user?.id) {
      fetchCourses();
    }
  }, [fetchCourses, user?.id]);

  const fetchCourseStudents = async (courseId) => {
    setLoadingData(true);
    try {
      const studentsRes = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/teachers/course/${courseId}/students`);
      const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      setStudents(studentList);

      // Initialize entered grades map
      const init = {};
      studentList.forEach(s => {
        init[s.id] = { exam_grade: '', control_grade: '', tp_grade: '', final_grade: null };
      });
      setEnteredGrades(init);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMaterials = async (courseId) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/teachers/course/${courseId}/materials`);
      setMaterialsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setMaterialsList([]);
    }
  };

  const handleCourseSelect = async (course) => {
    setSelectedCourse(course);
    setActiveTab('students');
    await fetchCourseStudents(course.id);
    await fetchMaterials(course.id);
  };

  const handlePublishGrades = async (courseId) => {
    const gradesToPublish = Object.keys(enteredGrades).map(k => {
      const g = enteredGrades[k];
      return {
        student_id: parseInt(k),
        exam_grade: parseFloat(g.exam_grade || 0) || 0,
        control_grade: parseFloat(g.control_grade || 0) || 0,
        tp_grade: parseFloat(g.tp_grade || 0) || 0
      };
    }).filter(g => g.exam_grade || g.control_grade || g.tp_grade);

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/teachers/publish-grades`,
        { course_id: courseId, grades: gradesToPublish },
        { headers }
      );
      alert('Grades published successfully!');
      fetchCourseStudents(courseId);
    } catch (err) {
      alert('Error publishing grades: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleGradeChange = (studentId, field, value) => {
    setEnteredGrades(prev => {
      const next = { ...prev };
      const entry = { ...(next[studentId] || {}) };
      entry[field] = value;
      // compute final
      const exam = parseFloat(entry.exam_grade || 0) || 0;
      const control = parseFloat(entry.control_grade || 0) || 0;
      const tp = parseFloat(entry.tp_grade || 0) || 0;
      entry.final_grade = Math.round(((exam * 0.5) + (control * 0.3) + (tp * 0.2)) * 100) / 100;
      next[studentId] = entry;
      return next;
    });
  };

  const handleUploadMaterial = async (courseId) => {
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      alert('Please select a file');
      return;
    }

    // Basic client-side validation: if materialType is PDF, ensure .pdf extension
    if (formData.materialType === 'PDF') {
      const name = file.name || '';
      if (!name.toLowerCase().endsWith('.pdf')) {
        alert('Please upload a PDF file for material type PDF');
        return;
      }
    }

    const formDataObj = new FormData();
    formDataObj.append('course_id', courseId);
    formDataObj.append('title', formData.title);
    formDataObj.append('description', formData.description);
    formDataObj.append('material_type', formData.materialType);
    formDataObj.append('file', file);

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/teachers/upload-material`,
        formDataObj
      );
      alert('Material uploaded successfully!');
      setFormData({ title: '', description: '', materialType: 'PDF' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      // refresh materials
      fetchMaterials(courseId);
    } catch (err) {
      alert('Error uploading material: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSendAnnouncement = async (courseId) => {
    if (!announcementData.title || !announcementData.content) {
      alert('Please fill in both the title and content.');
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/teachers/announcement`,
        {
          course_id: courseId,
          title: announcementData.title,
          content: announcementData.content
        },
        { headers }
      );
      alert('Announcement sent successfully!');
      setAnnouncementData({ title: '', content: '' });
    } catch (err) {
      alert('Error sending announcement: ' + (err.response?.data?.error || err.message));
    }
  };

  const getTabIcon = (tab) => {
    const icons = {
      courses: '📚',
      students: '👥',
      materials: '📄',
      announcements: '📢'
    };
    return icons[tab] || '📌';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8 animate-fadeIn">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">Welcome, {user?.first_name}! 👨‍🏫</h1>
            <p className="text-green-100">Manage your courses and student progress</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-8 p-2 sticky top-20 z-40 animate-slideDown">
          <div className="flex flex-wrap gap-2">
            {['courses', 'students', 'materials', 'announcements'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold capitalize transition-all duration-300 transform ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:scale-102'
                }`}
              >
                <span className="text-xl">{getTabIcon(tab)}</span>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📚</span> My Courses
              </h2>
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course, idx) => (
                    <div
                      key={course.id}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer animate-slideIn"
                      style={{animationDelay: `${idx * 100}ms`}}
                      onClick={() => handleCourseSelect(course)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-bold text-xl text-green-600 flex-1">{course.course_name}</h3>
                        <span className="text-2xl">📖</span>
                      </div>
                      <p className="text-gray-600 mb-4 font-semibold">{course.course_code}</p>
                      <div className="space-y-3 text-sm mb-4">
                        <p className="flex items-center gap-2"><span className="text-lg">🏷️</span><strong>Type:</strong> {course.course_type}</p>
                        <p className="flex items-center gap-2"><span className="text-lg">🏫</span><strong>Filière:</strong> {course.filiere}</p>
                        <p className="flex items-center gap-2"><span className="text-lg">⭐</span><strong>Credits:</strong> {course.credits}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCourseSelect(course);
                        }}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300"
                      >
                        Manage Course
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No courses assigned</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && selectedCourse && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="text-4xl">👥</span> {selectedCourse.course_name}
                  </h2>
                  <p className="text-gray-600 mt-2">🏷️ {selectedCourse.course_code}</p>
                </div>
              </div>

              {loadingData ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 font-semibold">Loading students...</p>
                </div>
              ) : students.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                        <tr>
                          <th className="p-4 text-left font-semibold">Student Name</th>
                          <th className="p-4 text-left font-semibold">Student ID</th>
                          <th className="p-4 text-center font-semibold">Exam (50%)</th>
                          <th className="p-4 text-center font-semibold">Control (30%)</th>
                          <th className="p-4 text-center font-semibold">TP (20%)</th>
                          <th className="p-4 text-center font-semibold">Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => (
                          <tr key={student.id} className="hover:bg-green-50 transition-colors duration-200 border-b border-gray-200 animate-slideIn" style={{animationDelay: `${idx * 50}ms`}}>
                            <td className="p-4 font-semibold text-gray-900">{student.first_name} {student.last_name}</td>
                            <td className="p-4 text-gray-700">{student.student_id}</td>
                            <td className="p-4">
                              <input
                                value={enteredGrades[student.id]?.exam_grade ?? ''}
                                onChange={(e) => handleGradeChange(student.id, 'exam_grade', e.target.value)}
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                                placeholder="-"
                              />
                            </td>
                            <td className="p-4">
                              <input
                                value={enteredGrades[student.id]?.control_grade ?? ''}
                                onChange={(e) => handleGradeChange(student.id, 'control_grade', e.target.value)}
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                                placeholder="-"
                              />
                            </td>
                            <td className="p-4">
                              <input
                                value={enteredGrades[student.id]?.tp_grade ?? ''}
                                onChange={(e) => handleGradeChange(student.id, 'tp_grade', e.target.value)}
                                type="number"
                                min="0"
                                max="20"
                                step="0.5"
                                className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                                placeholder="-"
                              />
                            </td>
                            <td className="p-4 text-center font-bold text-lg text-emerald-600">
                              {enteredGrades[student.id]?.final_grade != null ? enteredGrades[student.id].final_grade.toFixed(2) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={() => handlePublishGrades(selectedCourse.id)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    ✓ Publish Grades
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No students enrolled in this course</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📄</span> Upload Course Materials
              </h2>
              {selectedCourse ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border-2 border-green-200">
                  <p className="text-gray-700 mb-6 text-lg"><span className="font-bold text-green-600">📚 Course:</span> {selectedCourse.course_name}</p>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">📝 Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                        placeholder="Material title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">📋 Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                        placeholder="Material description"
                        rows="3"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">📂 Material Type</label>
                        <select
                          value={formData.materialType}
                          onChange={(e) => setFormData({...formData, materialType: e.target.value})}
                          className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                        >
                          <option value="PDF">📄 PDF</option>
                          <option value="Video">🎥 Video</option>
                          <option value="Exercise">✏️ Exercise</option>
                          <option value="External Link">🔗 External Link</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">📎 File</label>
                        <input
                          ref={fileInputRef}
                          id="file-input"
                          type="file"
                          className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleUploadMaterial(selectedCourse.id)}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      ⬆️ Upload Material
                    </button>
                  </div>

                  <MaterialsList materialsList={materialsList} baseUrl={process.env.REACT_APP_API_URL || 'http://localhost:5000'} />
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 Please select a course from the Courses tab first</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📢</span> Send Announcements
              </h2>
              {selectedCourse ? (
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-8 border-2 border-orange-200">
                  <h3 className="font-bold text-lg mb-6 text-gray-900">📣 New Announcement for: <span className="text-orange-600">{selectedCourse.course_name}</span></h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">📝 Title</label>
                      <input
                        type="text"
                        value={announcementData.title}
                        onChange={(e) => setAnnouncementData({...announcementData, title: e.target.value})}
                        placeholder="e.g., Important: Next exam postponed"
                        className="w-full px-4 py-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">💬 Message Content</label>
                      <textarea
                        value={announcementData.content}
                        onChange={(e) => setAnnouncementData({...announcementData, content: e.target.value})}
                        placeholder="Type your pedagogical message here..."
                        rows="6"
                        className="w-full px-4 py-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => handleSendAnnouncement(selectedCourse.id)}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg hover:from-orange-700 hover:to-red-700 font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      ✓ Send Announcement
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 Please select a course from the Courses tab first</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Styles moved to frontend/src/index.css to comply with CSP (no inline styles) */}
    </div>
  );
}
