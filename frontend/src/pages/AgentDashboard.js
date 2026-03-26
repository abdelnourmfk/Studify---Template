import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

export default function AgentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modules & Groups state
  const [semesters, setSemesters] = useState([]);
  const [modules, setModules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedModuleSpecialty, setSelectedModuleSpecialty] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCoeff, setNewModuleCoeff] = useState(1);
  const [newModuleType, setNewModuleType] = useState('CM');
  const [teacherFormData, setTeacherFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    specialization: '',
    department: ''
  });
  const [agentTeachers, setAgentTeachers] = useState([]);
  const [agentInfo, setAgentInfo] = useState(null);

  // EDT/Schedule state
  const [selectedEdtSpecialty, setSelectedEdtSpecialty] = useState('');
  const [selectedEdtSemester, setSelectedEdtSemester] = useState('');
  const [selectedEdtGroup, setSelectedEdtGroup] = useState('');
  const [edtSchedule, setEdtSchedule] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [edtModules, setEdtModules] = useState([]);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    module_id: '',
    teacher_id: '',
    room_id: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '10:00'
  });
  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    course_type: 'CM',
    credits: 3,
    teacher_id: ''
  });
  const [courseSpecialtyId, setCourseSpecialtyId] = useState('');
  const [courseSemesterId, setCourseSemesterId] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [teacherSpecialtyId, setTeacherSpecialtyId] = useState('');
  const [assignCourse, setAssignCourse] = useState(null);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [announceCourse, setAnnounceCourse] = useState(null);
  const [announceData, setAnnounceData] = useState({ title: '', content: '', broadcast_all: false });

  // Student group management state
  const [editGroupModal, setEditGroupModal] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [studentGroupModal, setStudentGroupModal] = useState(null);
  const [selectedAssignGroup, setSelectedAssignGroup] = useState('');
  const [availableGroupsForAssign, setAvailableGroupsForAssign] = useState([]);

  // Structure management (universities / faculties / specialties)
  const [universities, setUniversities] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [newUniName, setNewUniName] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newSemNumber, setNewSemNumber] = useState(1);
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [agentFirstName, setAgentFirstName] = useState('');
  const [agentLastName, setAgentLastName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');

  const token = localStorage.getItem('token');
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, teachersRes, coursesRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/agents/me/students`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/agents/me/teachers`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/courses`, { headers })
      ]);
      
      setStudents(studentsRes.data || []);
      setTeachers(teachersRes.data || []);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
    // fetch current agent record (permissions)
    (async ()=>{
      try {
        const me = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/me`);
        setAgentInfo(me.data);
      } catch (err) {
        // ignore if not an agent or not found
        console.debug('Could not fetch agent info', err?.response?.status || err.message);
      }
    })();
  }, [fetchData]);

  // Structure fetch helpers
  const fetchUniversities = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/structure/universities`, { headers });
      setUniversities(res.data || []);
    } catch (err) {
      console.error('Error fetching universities', err);
    }
  }, [headers]);

  const fetchFaculties = async (university_id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/structure/faculties`, { params: { university_id }, headers });
      setFaculties(res.data || []);
    } catch (err) {
      console.error('Error fetching faculties', err);
    }
  };

  const fetchSpecialties = async (faculty_id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/structure/specialties`, { params: { faculty_id }, headers });
      setSpecialties(res.data || []);
    } catch (err) {
      console.error('Error fetching specialties', err);
    }
  };

  // Fetch semesters for module management
  const fetchSemesters = async (specialty_id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${specialty_id}/semesters`, { headers });
      setSemesters(res.data || []);
    } catch (err) {
      console.error('Error fetching semesters', err);
    }
  };

  // Fetch modules for semester
  const fetchModules = async (semester_id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/semesters/${semester_id}/modules`, { headers });
      setModules(res.data || []);
    } catch (err) {
      console.error('Error fetching modules', err);
    }
  };

  // Fetch groups for specialty
  const fetchGroups = async (specialty_id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${specialty_id}/groups`, { headers });
      setGroups(res.data || []);
    } catch (err) {
      console.error('Error fetching groups', err);
    }
  };

  // Fetch agent teachers
  const fetchAgentTeachers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/me/teachers`, { headers });
      setAgentTeachers(res.data || []);
    } catch (err) {
      console.error('Error fetching teachers', err);
    }
  };

  // EDT fetch helpers
  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/rooms/list`, { headers });
      setRooms(res.data || []);
    } catch (err) {
      console.error('Error fetching rooms', err);
    }
  };

  const fetchEdtSchedule = useCallback(async (group_id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/groups/${group_id}/schedule`, { headers });
      setEdtSchedule(res.data || []);
    } catch (err) {
      console.error('Error fetching schedule', err);
    }
  }, [headers]);

  const fetchEdtModules = async (semester_id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/semesters/${semester_id}/modules`, { headers });
      setEdtModules(res.data || []);
    } catch (err) {
      console.error('Error fetching modules', err);
    }
  };

  const handlePrintCredentials = (creds) => {
    try {
      const isTeacher = creds.type === 'teacher';
      const html = `
        <html>
          <head><title>${isTeacher ? 'Teacher' : 'Agent'} Credentials</title></head>
          <body style="font-family: Arial, sans-serif; padding:20px;">
            <h2>${isTeacher ? 'Teacher' : 'Pedagogical Agent'} Credentials</h2>
            <p><strong>Email:</strong> ${creds.email}</p>
            <p><strong>Signup Code:</strong> ${creds.signup_code}</p>
            <p><strong>${isTeacher ? 'Teacher' : 'Agent'} ID:</strong> ${creds.teacher_id || creds.agent_id || ''}</p>
            <hr />
            <p style="color: #666; font-size: 12px;">
              <strong>Instructions:</strong><br/>
              1. Share the email and signup code with the new ${isTeacher ? 'teacher' : 'agent'}<br/>
              2. ${isTeacher ? 'Teacher' : 'Agent'} visits the registration page and selects "${isTeacher ? 'Teacher' : 'Admin'}" role<br/>
              3. ${isTeacher ? 'Teacher' : 'Agent'} enters email, signup code, and sets their own password<br/>
              4. Account is created after code verification
            </p>
          </body>
        </html>
      `;
      const w = window.open('', '_blank');
      if (!w) return alert('Popup blocked — open manually');
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(()=>{ w.print(); }, 500);
    } catch (err) {
      console.error('Print error', err);
    }
  };

  const handleDownloadCredentialsPDF = async (creds) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/agents/credentials/export-pdf`,
        creds,
        { headers, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agent-credentials-${Date.now()}.html`);
      document.body.appendChild(link);
      link.click();
      // revoke object URL to avoid memory leaks
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error', err);
      alert('Error downloading credentials');
    }
  };

  useEffect(()=>{
    if(activeTab === 'structure') fetchUniversities();
    if(activeTab === 'modules') fetchUniversities();
    if(activeTab === 'courses') fetchUniversities();
    if(activeTab === 'schedule') fetchUniversities();
    // connect socket once when dashboard loads
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', { transports: ['websocket'] });
    socket.on('connect', () => console.log('Socket connected', socket.id));
    socket.on('announcement', (data) => {
      alert('New announcement: ' + (data.title || ''));
      // optionally refresh announcements or notifications
    });
    socket.on('gradesPublished', (payload) => {
      alert('Grades published for a course');
    });
    socket.on('gradeApproved', (payload) => {
      alert('A grade was approved by admin');
    });
    socket.on('gradesBulkApproved', (payload) => {
      alert('Multiple grades approved for a course');
    });
    socket.on('scheduleUpdated', (payload) => {
      // if current group is affected, refresh schedule
      if (selectedEdtGroup) fetchEdtSchedule(selectedEdtGroup);
    });
    socket.on('scheduleDeleted', (payload) => {
      if (selectedEdtGroup) fetchEdtSchedule(selectedEdtGroup);
    });
    return () => { socket.disconnect(); };
  }, [activeTab, fetchUniversities, fetchEdtSchedule, selectedEdtGroup]);

  const fetchAvailableModules = async (specialtyId, semesterId) => {
    if (!specialtyId || !semesterId) return;
    setModulesLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/courses/modules/specialty/${specialtyId}/semester/${semesterId}`,
        { headers }
      );
      setAvailableModules(response.data || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
      setAvailableModules([]);
    } finally {
      setModulesLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseSpecialtyId || !courseSemesterId || selectedModuleIds.length === 0) {
      alert('Please select specialty, semester, and at least one module');
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/courses/create`,
        {
          ...formData,
          module_ids: selectedModuleIds.map(id => parseInt(id))
        },
        { headers }
      );
      alert('Course created successfully!');
      setFormData({
        course_code: '',
        course_name: '',
        course_type: 'CM',
        credits: 3,
        teacher_id: ''
      });
      setCourseSpecialtyId('');
      setCourseSemesterId('');
      setSelectedModuleIds([]);
      setAvailableModules([]);
      fetchData();
    } catch (err) {
      alert('Error creating course: ' + err.response?.data?.error);
    }
  };

  const handleOpenAssign = (course) => {
    setAssignCourse(course);
    setAssignTeacherId(course.teacher_id || '');
  };

  const handleAssignSave = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/courses/${assignCourse.id}/assign`, { teacher_id: assignTeacherId || null }, { headers });
      alert('Course assignment updated');
      setAssignCourse(null);
      fetchData();
    } catch (err) {
      alert('Error assigning teacher: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenAnnounce = (course) => {
    setAnnounceCourse(course);
    setAnnounceData({ title: '', content: '', broadcast_all: false });
  };

  const handleAgentAnnouncement = async () => {
    if (!announceData.title || !announceData.content) {
      alert('Please provide title and content');
      return;
    }
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/announcement`, {
        course_id: announceData.broadcast_all ? null : (announceCourse?.id || null),
        title: announceData.title,
        content: announceData.content,
        broadcast_all: announceData.broadcast_all
      }, { headers });
      alert('Announcement sent');
      setAnnounceCourse(null);
      setAnnounceData({ title: '', content: '', broadcast_all: false });
    } catch (err) {
      alert('Error sending announcement: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEnrollStudent = async (studentId) => {
    const courseId = prompt('Enter Course ID:');
    if (!courseId) return;

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/agents/enroll`,
        { student_id: studentId, course_id: courseId },
        { headers }
      );
      alert('Student enrolled successfully!');
    } catch (err) {
      alert('Error enrolling student: ' + err.response?.data?.error);
    }
  };

  const [editTeacher, setEditTeacher] = useState(null);
  const [editTeacherData, setEditTeacherData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    specialization: '',
    department: ''
  });
  
  // Edit states for modules, specialties, semesters
  const [editModule, setEditModule] = useState(null);
  const [editModuleData, setEditModuleData] = useState({ module_name: '', coefficient: 1, module_type: 'CM' });
  
  const [editSemester, setEditSemester] = useState(null);
  const [editSemesterNumber, setEditSemesterNumber] = useState(1);

  const handleEditTeacher = (teacher) => {
    setEditTeacher(teacher);
    setEditTeacherData({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      email: teacher.email || '',
      specialization: teacher.specialization || '',
      department: teacher.department || ''
    });
  };

  const handleSaveTeacher = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/teachers/` + editTeacher.id,
        editTeacherData,
        { headers }
      );
      alert('Teacher updated successfully!');
      setEditTeacher(null);
      fetchData();
      fetchAgentTeachers();
    } catch (err) {
      alert('Error updating teacher: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/teachers/${teacherId}`, { headers });
      alert('Teacher deleted successfully!');
      fetchAgentTeachers();
    } catch (err) {
      alert('Error deleting teacher: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleExportTeachers = () => {
    if (teachers.length === 0) {
      alert('No teachers to export');
      return;
    }
    const headers = ['First Name', 'Last Name', 'Email', 'Teacher ID', 'Specialization', 'Department'];
    const rows = teachers.map(t => [
      t.first_name || '',
      t.last_name || '',
      t.email || '',
      t.teacher_id || '',
      t.specialization || '',
      t.department || ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImportTeachers = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          alert('CSV must have header row and at least one data row');
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        const expectedHeaders = ['first name', 'last name', 'email', 'teacher id', 'specialization', 'department'];
        const hasRequiredHeaders = ['first name', 'last name', 'email'].every(h => headers.includes(h));
        if (!hasRequiredHeaders) {
          alert(`CSV must have columns: ${expectedHeaders.join(', ')}`);
          return;
        }
        alert(`Ready to import ${lines.length - 1} teachers. This feature requires signup code assignment per teacher. Please create teachers individually via the form above.`);
        e.target.value = '';
      } catch (err) {
        alert('Error reading CSV: ' + err.message);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Student group management handlers
  const handleOpenAssignGroupModal = async (student) => {
    try {
      setStudentGroupModal(student);
      setSelectedAssignGroup('');
      // Fetch available groups from the specialty
      const groupsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/agents/specialties/${student.specialty_id || selectedFacultyId}/groups`,
        { headers }
      );
      setAvailableGroupsForAssign(groupsResponse.data || []);
    } catch (err) {
      alert('Error loading groups: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAssignStudentToGroup = async () => {
    if (!selectedAssignGroup) {
      alert('Please select a group');
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/agents/students/${studentGroupModal.id}/assign-group`,
        { groupId: selectedAssignGroup },
        { headers }
      );
      alert('Student assigned to group successfully!');
      setStudentGroupModal(null);
      fetchData();
    } catch (err) {
      alert('Error assigning student: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveStudentFromGroup = async (studentId) => {
    if (!window.confirm('Remove student from group?')) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/agents/students/${studentId}/group`,
        { headers }
      );
      alert('Student removed from group!');
      fetchData();
    } catch (err) {
      alert('Error removing student: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenEditGroupModal = (group) => {
    setEditGroupModal(group);
    setEditGroupName(group.name || `Group ${group.group_index}`);
  };

  const handleSaveGroupName = async () => {
    if (!editGroupName.trim()) {
      alert('Group name cannot be empty');
      return;
    }
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/agents/groups/${editGroupModal.id}`,
        { name: editGroupName },
        { headers }
      );
      alert('Group updated successfully!');
      setEditGroupModal(null);
      setEditGroupName('');
      fetchData();
      if (selectedModuleSpecialty) fetchGroups(selectedModuleSpecialty);
    } catch (err) {
      alert('Error updating group: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group? This will remove all students from it.')) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/agents/specialties/${selectedModuleSpecialty || selectedFacultyId}/groups/${groupId}`,
        { headers }
      );
      alert('Group deleted successfully!');
      if (selectedModuleSpecialty) fetchGroups(selectedModuleSpecialty);
    } catch (err) {
      alert('Error deleting group: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditModule = (module) => {
    setEditModule(module);
    setEditModuleData({
      module_name: module.module_name,
      coefficient: module.coefficient,
      module_type: module.module_type
    });
  };

  const handleSaveModule = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/agents/modules/${editModule.id}`,
        editModuleData,
        { headers }
      );
      alert('Module updated successfully!');
      setEditModule(null);
      fetchModules(selectedSemester);
    } catch (err) {
      alert('Error updating module: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/agents/semesters/${selectedSemester}/modules/${moduleId}`,
        { headers }
      );
      alert('Module deleted successfully!');
      fetchModules(selectedSemester);
    } catch (err) {
      alert('Error deleting module: ' + (err.response?.data?.error || err.message));
    }
  };


  const handleDeleteSpecialty = async (specialtyId) => {
    if (!window.confirm('Are you sure you want to delete this specialty?')) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/agents/specialties/${specialtyId}`,
        { headers }
      );
      alert('Specialty deleted successfully!');
      fetchSpecialties(selectedFacultyId);
      setSelectedModuleSpecialty('');
    } catch (err) {
      alert('Error deleting specialty: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditSemester = (semester) => {
    setEditSemester(semester);
    setEditSemesterNumber(semester.number);
  };

  const handleSaveSemester = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/agents/semesters/${editSemester.id}`,
        { number: editSemesterNumber },
        { headers }
      );
      alert('Semester updated successfully!');
      setEditSemester(null);
      fetchSemesters(selectedModuleSpecialty);
    } catch (err) {
      alert('Error updating semester: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSemester = async (semesterId) => {
    if (!window.confirm('Are you sure you want to delete this semester and its modules?')) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/agents/semesters/${semesterId}`,
        { headers }
      );
      alert('Semester deleted successfully!');
      fetchSemesters(selectedModuleSpecialty);
      setSelectedSemester('');
    } catch (err) {
      alert('Error deleting semester: ' + (err.response?.data?.error || err.message));
    }
  };

  // View modal state and handler
  const [viewedTeacher, setViewedTeacher] = useState(null);
  const handleViewTeacher = (teacher) => {
    setViewedTeacher(teacher);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full animate-spin mb-4"></div>
          </div>
          <p className="text-gray-600 font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getTabIcon = (tab) => {
    const icons = {
      overview: '📊',
      students: '👥',
      teachers: '👨‍🏫',
      courses: '📚',
      structure: '🏛️',
      modules: '📖',
      schedule: '📅'
    };
    return icons[tab] || '📌';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8 animate-fadeIn">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">Welcome, {user?.first_name}! 🔧</h1>
            <p className="text-purple-100">Manage your institution's academic operations</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-8 p-2 sticky top-20 z-40 animate-slideDown">
          <div className="flex flex-wrap gap-2">
            {['overview', 'students', 'teachers', 'courses', 'structure', 'modules', 'schedule'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold capitalize transition-all duration-300 transform ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
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
        {activeTab === 'overview' && (
          <div className="animate-fadeInUp">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Students', value: students.length, icon: '👥', color: 'from-blue-500 to-blue-600' },
                { label: 'Total Teachers', value: teachers.length, icon: '👨‍🏫', color: 'from-green-500 to-green-600' },
                { label: 'Total Courses', value: courses.length, icon: '📚', color: 'from-orange-500 to-orange-600' },
                { label: 'System Status', value: 'Active', icon: '✓', color: 'from-green-500 to-emerald-500' }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 animate-slideIn"
                  style={{animationDelay: `${idx * 100}ms`}}
                >
                  <div className={`inline-block bg-gradient-to-r ${stat.color} p-4 rounded-xl mb-4`}>
                    <span className="text-3xl text-white">{stat.icon}</span>
                  </div>
                  <p className="text-gray-600 text-sm font-semibold">{stat.label}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">👥</span> Manage Students & Groups
              </h2>
              {students.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <tr>
                        <th className="p-4 text-left font-semibold">Name</th>
                        <th className="p-4 text-left font-semibold">Student ID</th>
                        <th className="p-4 text-left font-semibold">Email</th>
                        <th className="p-4 text-center font-semibold">Filière</th>
                        <th className="p-4 text-center font-semibold">Level</th>
                        <th className="p-4 text-center font-semibold">Group</th>
                        <th className="p-4 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-blue-50 transition-colors duration-200 border-b border-gray-200 animate-slideIn" style={{animationDelay: `${idx * 50}ms`}}>
                          <td className="p-4 font-semibold text-gray-900">{student.first_name} {student.last_name}</td>
                          <td className="p-4 text-gray-700">{student.student_id}</td>
                          <td className="p-4 text-gray-700">{student.email}</td>
                          <td className="p-4 text-center text-gray-700">{student.filiere}</td>
                          <td className="p-4 text-center font-semibold text-gray-700">{student.level}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                              student.group_number 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {student.group_number ? `Group ${student.group_number}` : 'Ungrouped'}
                            </span>
                          </td>
                          <td className="p-4 text-center flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => handleOpenAssignGroupModal(student)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 font-semibold transition-all"
                              title="Assign to group"
                            >
                              👥 Assign
                            </button>
                            {student.group_number && (
                              <button
                                onClick={() => handleRemoveStudentFromGroup(student.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-semibold transition-all"
                                title="Remove from group"
                              >
                                ✕ Remove
                              </button>
                            )}
                            <button
                              onClick={() => handleEnrollStudent(student.id)}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded text-sm hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold"
                              title="Enroll in course"
                            >
                              📝 Enroll
                            </button>
                          </td>
                        </tr>
                      ))}
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

        {/* Assign Student to Group Modal */}
        {studentGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md p-8 animate-fadeInUp">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">👥 Assign Group</h3>
                <button onClick={() => setStudentGroupModal(null)} className="text-2xl text-gray-500 hover:text-gray-700 transition-colors">✕</button>
              </div>
              <div className="mb-6">
                <p className="text-gray-700 font-semibold mb-2">Student: <span className="text-blue-600">{studentGroupModal.first_name} {studentGroupModal.last_name}</span></p>
                <p className="text-gray-600 text-sm mb-4">Current Group: {studentGroupModal.group_number ? `Group ${studentGroupModal.group_number}` : 'Ungrouped'}</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Group</label>
                <select value={selectedAssignGroup} onChange={(e) => setSelectedAssignGroup(e.target.value)} className="w-full border-2 border-blue-300 px-4 py-2 rounded-lg focus:border-blue-500 focus:outline-none transition-colors">
                  <option value="">Choose a group...</option>
                  {availableGroupsForAssign.map(grp => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name || `Group ${grp.group_index}`} ({grp.student_count} students)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setStudentGroupModal(null)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition-all">✕ Cancel</button>
                <button onClick={handleAssignStudentToGroup} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all">✓ Assign</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Group Name Modal */}
        {editGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md p-8 animate-fadeInUp">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">✏️ Edit Group</h3>
                <button onClick={() => setEditGroupModal(null)} className="text-2xl text-gray-500 hover:text-gray-700 transition-colors">✕</button>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Group Name</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full border-2 border-gay-300 px-4 py-2 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="mb-6">
                <p className="text-sm text-gray-600">Group Index: <span className="font-semibold">{editGroupModal.group_index}</span></p>
                <p className="text-sm text-gray-600">Students: <span className="font-semibold">{editGroupModal.student_count || 0}</span></p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setEditGroupModal(null); setEditGroupName(''); }} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition-all">✕ Cancel</button>
                <button onClick={() => handleDeleteGroup(editGroupModal.id)} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all">🗑️ Delete</button>
                <button onClick={handleSaveGroupName} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-all">✓ Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">👨‍🏫</span> Manage Teachers
              </h2>

              {/* Quick Action Buttons */}
              <div className="mb-8 flex flex-wrap gap-3">
                <button
                  onClick={() => document.getElementById('importTeacherFile')?.click()}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold transition-all"
                >
                  📥 Import from CSV
                </button>
                <input
                  id="importTeacherFile"
                  type="file"
                  accept=".csv"
                  onChange={handleImportTeachers}
                  className="hidden"
                />
                <button
                  onClick={handleExportTeachers}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold transition-all"
                >
                  📊 Export to CSV
                </button>
                <button
                  onClick={() => { fetchData(); fetchAgentTeachers(); alert('Teacher list refreshed!'); }}
                  className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 font-semibold transition-all"
                >
                  🔄 Refresh List
                </button>
                <button
                  onClick={() => {
                    document.getElementById('teacherCreationForm')?.scrollIntoView({ behavior: 'smooth' });
                    alert('Scroll down to the teacher creation form');
                  }}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold transition-all ml-auto"
                >
                  🆕 Create New Teacher
                </button>
              </div>

              {editTeacher && (
                <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl animate-slideDown">
                  <h3 className="text-lg font-bold mb-4 text-gray-900">✏️ Edit Teacher</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'First Name', key: 'first_name', icon: '👤' },
                      { label: 'Last Name', key: 'last_name', icon: '👤' },
                      { label: 'Email', key: 'email', icon: '📧' },
                      { label: 'Specialization', key: 'specialization', icon: '🎓' },
                      { label: 'Department', key: 'department', icon: '🏢' }
                    ].map((field) => (
                      <input
                        key={field.key}
                        type="text"
                        placeholder={field.label}
                        value={editTeacherData[field.key]}
                        onChange={(e) => setEditTeacherData({...editTeacherData, [field.key]: e.target.value})}
                        className="px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveTeacher}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300"
                    >
                      ✓ Save
                    </button>
                    <button
                      onClick={() => setEditTeacher(null)}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-semibold transition-all duration-300"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              )}
              {teachers.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                      <tr>
                        <th className="p-4 text-left font-semibold">Name</th>
                        <th className="p-4 text-left font-semibold">Teacher ID</th>
                        <th className="p-4 text-left font-semibold">Email</th>
                        <th className="p-4 text-center font-semibold">Specialization</th>
                        <th className="p-4 text-center font-semibold">Status</th>
                        <th className="p-4 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher, idx) => (
                        <tr key={teacher.id} className="hover:bg-green-50 transition-colors duration-200 border-b border-gray-200 animate-slideIn" style={{animationDelay: `${idx * 50}ms`}}>
                          <td className="p-4 font-semibold text-gray-900">{teacher.first_name} {teacher.last_name}</td>
                          <td className="p-4 text-gray-700">{teacher.teacher_id}</td>
                          <td className="p-4 text-gray-700">{teacher.email}</td>
                          <td className="p-4 text-center text-gray-700">{teacher.specialization || 'N/A'}</td>
                          <td className="p-4 text-center">
                            <span className="inline-block px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-semibold">
                              ✓ Active
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleViewTeacher(teacher)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 font-semibold transition-all"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => handleEditTeacher(teacher)}
                              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 font-semibold ml-2 transition-all"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(teacher.id)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-semibold ml-2 transition-all"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No teachers found</p>
                </div>
              )}

              {/* Teacher Creation Form */}
              <div id="teacherCreationForm" className="mt-12 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-300 rounded-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-900">➕ Create New Teacher</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">🎓 Select Specialty</label>
                    <select value={teacherSpecialtyId} onChange={(e)=>setTeacherSpecialtyId(e.target.value)} className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors">
                      <option value="">Choose specialty...</option>
                      {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" value={teacherFormData.first_name} onChange={(e)=>setTeacherFormData({...teacherFormData, first_name: e.target.value})} className="px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors" />
                    <input type="text" placeholder="Last Name" value={teacherFormData.last_name} onChange={(e)=>setTeacherFormData({...teacherFormData, last_name: e.target.value})} className="px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors" />
                    <input type="email" placeholder="Email" value={teacherFormData.email} onChange={(e)=>setTeacherFormData({...teacherFormData, email: e.target.value})} className="px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors" />
                    <input type="text" placeholder="Specialization" value={teacherFormData.specialization} onChange={(e)=>setTeacherFormData({...teacherFormData, specialization: e.target.value})} className="px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <input type="text" placeholder="Department" value={teacherFormData.department} onChange={(e)=>setTeacherFormData({...teacherFormData, department: e.target.value})} className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors" />
                  <div className="flex gap-3">
                    <button
                      onClick={async ()=>{
                        if(!teacherSpecialtyId || !teacherFormData.first_name || !teacherFormData.last_name || !teacherFormData.email) return alert('Fill specialty, first name, last name, and email');
                        try{
                          const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${teacherSpecialtyId}/teacher`, teacherFormData, { headers });
                          setTeacherFormData({first_name:'', last_name:'', email:'', specialization:'', department:''});
                          setTeacherSpecialtyId('');
                          alert('Teacher created — opening print preview');
                          handlePrintCredentials({...res.data, type: 'teacher'});
                          fetchData();
                          fetchAgentTeachers();
                        }catch(err){
                          alert('Error: '+(err.response?.data?.error||err.message));
                        }
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold transition-all"
                    >
                      🖨️ Create & Print Credentials
                    </button>
                    <button
                      onClick={async ()=>{
                        if(!teacherSpecialtyId || !teacherFormData.first_name || !teacherFormData.last_name || !teacherFormData.email) return alert('Fill specialty, first name, last name, and email');
                        try{
                          const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${teacherSpecialtyId}/teacher`, teacherFormData, { headers });
                          setTeacherFormData({first_name:'', last_name:'', email:'', specialization:'', department:''});
                          setTeacherSpecialtyId('');
                          alert('Teacher created — downloading credentials');
                          handleDownloadCredentialsPDF({...res.data, type: 'teacher', first_name: teacherFormData.first_name, last_name: teacherFormData.last_name});
                          fetchData();
                          fetchAgentTeachers();
                        }catch(err){
                          alert('Error: '+(err.response?.data?.error||err.message));
                        }
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
                    >
                      📥 Create & Download PDF
                    </button>
                    <button
                      onClick={() => {
                        setTeacherFormData({first_name:'', last_name:'', email:'', specialization:'', department:''});
                        setTeacherSpecialtyId('');
                      }}
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold transition-all"
                    >
                      ✕ Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📚</span> Manage Courses
              </h2>
              
              <form onSubmit={handleCreateCourse} className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-900">➕ Create New Course (from Modules)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Specialty Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                    <select
                      value={courseSpecialtyId}
                      onChange={(e) => {
                        setCourseSpecialtyId(e.target.value);
                        setCourseSemesterId('');
                        setSelectedModuleIds([]);
                        setAvailableModules([]);
                      }}
                      className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select specialty...</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Semester Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select
                      value={courseSemesterId}
                      onChange={(e) => {
                        setCourseSemesterId(e.target.value);
                        setSelectedModuleIds([]);
                        if (e.target.value) {
                          fetchAvailableModules(courseSpecialtyId, e.target.value);
                        }
                      }}
                      disabled={!courseSpecialtyId}
                      className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="">Select semester...</option>
                      {semesters.map(s => (
                        <option key={s.id} value={s.id}>Semester {s.number}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course Code */}
                  <input
                    type="text"
                    placeholder="Course Code (e.g., INF100)"
                    value={formData.course_code}
                    onChange={(e) => setFormData({...formData, course_code: e.target.value})}
                    required
                    className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                  />

                  {/* Course Name */}
                  <input
                    type="text"
                    placeholder="Course Name"
                    value={formData.course_name}
                    onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                    required
                    className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                  />

                  {/* Course Type */}
                  <select
                    value={formData.course_type}
                    onChange={(e) => setFormData({...formData, course_type: e.target.value})}
                    className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="CM">CM (Lecture)</option>
                    <option value="TD">TD (Tutorial)</option>
                    <option value="TP">TP (Practical)</option>
                    <option value="Projet">Projet</option>
                  </select>

                  {/* Credits */}
                  <input
                    type="number"
                    placeholder="Credits"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value)})}
                    min="1"
                    max="10"
                    className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                  />

                  {/* Teachers Selector */}
                  <select
                    value={formData.teacher_id || ''}
                    onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                    className="px-4 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="">Assign teacher (optional)</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))}
                  </select>
                </div>

                {/* Modules Selection */}
                {courseSemesterId && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Modules</label>
                    {modulesLoading ? (
                      <div className="text-gray-600">Loading modules...</div>
                    ) : availableModules.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        {availableModules.map(module => (
                          <label key={module.id} className="flex items-center gap-2 p-2 bg-white rounded border border-purple-200 hover:bg-purple-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedModuleIds.includes(module.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModuleIds([...selectedModuleIds, module.id.toString()]);
                                } else {
                                  setSelectedModuleIds(selectedModuleIds.filter(id => id !== module.id.toString()));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <div>
                              <div className="font-medium text-sm text-gray-900">{module.module_name}</div>
                              <div className="text-xs text-gray-600">{module.module_type} • Coeff: {module.coefficient}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-600 mb-4">No modules available for selected semester</div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!courseSpecialtyId || !courseSemesterId || selectedModuleIds.length === 0}
                  className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✚ Create Course ({selectedModuleIds.length} modules)
                </button>
              </form>

              <h3 className="text-xl font-bold mb-4 text-gray-900">📖 Existing Courses</h3>
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course, idx) => (
                    <div
                      key={course.id}
                      className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 animate-slideIn"
                      style={{animationDelay: `${idx * 100}ms`}}
                    >
                      <h4 className="font-bold text-lg text-orange-600 mb-2">{course.course_name}</h4>
                      <p className="text-gray-600 mb-3 font-semibold">{course.course_code}</p>
                      <div className="space-y-2 text-sm mb-4">
                        <p className="flex items-center gap-2"><span>🏷️</span><strong>Code:</strong> {course.course_code}</p>
                        <p className="flex items-center gap-2"><span>🎓</span><strong>Type:</strong> {course.course_type}</p>
                        <p className="flex items-center gap-2"><span>⭐</span><strong>Credits:</strong> {course.credits}</p>
                        <p className="flex items-center gap-2"><span>📚</span><strong>Modules:</strong> {course.modules ? course.modules.length : 0}</p>
                        <p className="flex items-center gap-2"><span>👨‍🏫</span><strong>Teacher:</strong> {course.first_name ? course.first_name + ' ' + course.last_name : '—'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenAssign(course)} className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 font-semibold transition-all">👤 Assign</button>
                        <button onClick={() => handleOpenAnnounce(course)} className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 font-semibold transition-all">📢 Announce</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-500">📭 No courses created yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule/EDT Tab */}
        {activeTab === 'schedule' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📅</span> Schedule (Emploi du Temps)
              </h2>

              {/* EDT Selection Panel */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">🎓 Specialty</label>
                  <select value={selectedEdtSpecialty} onChange={(e)=>{ setSelectedEdtSpecialty(e.target.value); if(e.target.value) fetchSemesters(e.target.value); setSelectedEdtSemester(''); setSelectedEdtGroup(''); }} className="w-full px-3 py-2 border rounded">
                    <option value="">Choose...</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">📚 Semester</label>
                  <select value={selectedEdtSemester} onChange={(e)=>{ setSelectedEdtSemester(e.target.value); if(e.target.value) fetchEdtModules(e.target.value); }} className="w-full px-3 py-2 border rounded" disabled={!selectedEdtSpecialty}>
                    <option value="">Choose...</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>Semester {s.number}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">👥 Group</label>
                  <select value={selectedEdtGroup} onChange={(e)=>{ setSelectedEdtGroup(e.target.value); if(e.target.value) { fetchRooms(); fetchEdtSchedule(e.target.value); } }} className="w-full px-3 py-2 border rounded" disabled={!selectedEdtSpecialty}>
                    <option value="">Choose...</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name || `Group ${g.group_index}`} ({g.student_count})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">&nbsp;</label>
                  <button onClick={()=>setShowAddSchedule(true)} disabled={!selectedEdtGroup} className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold">➕ Add Entry</button>
                </div>
              </div>

              {selectedEdtGroup && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">📋 Weekly Schedule</h3>
                  
                  {/* Time Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                          <th className="p-3 text-left font-semibold">Time</th>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                            <th key={day} className="p-3 text-center font-semibold">{day}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { time: '08:00-10:00', start: '08:00', end: '10:00' },
                          { time: '10:00-12:00', start: '10:00', end: '12:00' },
                          { time: '12:00-14:00', start: '12:00', end: '14:00' },
                          { time: '14:00-16:00', start: '14:00', end: '16:00' },
                          { time: '16:00-18:00', start: '16:00', end: '18:00' },
                        ].map((slot, idx) => (
                          <tr key={idx} className="border-b border-gray-300 hover:bg-white transition-colors">
                            <td className="p-3 font-semibold text-gray-700 bg-gray-100">{slot.time}</td>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                              const entry = edtSchedule.find(e => e.day_of_week === day && e.start_time === slot.start && e.end_time === slot.end);
                              return (
                                <td key={day} className="p-2 text-center">
                                  {entry ? (
                                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-500 rounded p-2 text-xs">
                                      <div className="font-bold text-green-800">{entry.module_name}</div>
                                      <div className="text-green-700">{entry.module_type}</div>
                                      <div className="text-green-600">🏛️ {entry.classroom}</div>
                                      {entry.first_name && <div className="text-green-600 text-xs">👨‍🏫 {entry.first_name} {entry.last_name}</div>}
                                      <button onClick={async ()=>{ if(window.confirm('Delete this entry?')) { try{ await axios.delete(`${process.env.REACT_APP_API_URL}/api/agents/schedule/${entry.id}`, { headers }); fetchEdtSchedule(selectedEdtGroup); alert('Deleted'); }catch(err){ alert('Error: '+err.message); } } }} className="mt-1 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">✕</button>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-200 rounded p-2 h-24"></div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Add Schedule Modal */}
              {showAddSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
                  <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-2xl p-8 animate-fadeInUp">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">📌 Add Schedule Entry</h3>
                      <button onClick={()=>setShowAddSchedule(false)} className="text-2xl text-gray-500 hover:text-gray-700">✕</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">📖 Module</label>
                        <input list="modulesList" value={scheduleForm.module_id} onChange={(e)=>setScheduleForm({...scheduleForm, module_id: e.target.value})} placeholder="Type or choose module..." className="w-full px-3 py-2 border rounded" />
                        <datalist id="modulesList">
                          {edtModules.map(m => <option key={m.id} value={m.id}>{m.module_name} ({m.module_type})</option>)}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">👨‍🏫 Teacher (Optional)</label>
                        <input list="teachersList" value={scheduleForm.teacher_id} onChange={(e)=>setScheduleForm({...scheduleForm, teacher_id: e.target.value})} placeholder="Type or choose teacher (optional)" className="w-full px-3 py-2 border rounded" />
                        <datalist id="teachersList">
                          <option value="" key="none">No teacher assigned</option>
                          {agentTeachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">🏛️ Room</label>
                        <select value={scheduleForm.room_id} onChange={(e)=>setScheduleForm({...scheduleForm, room_id: e.target.value})} className="w-full px-3 py-2 border rounded">
                          <option value="">Choose room...</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (capacity: {r.capacity})</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">📅 Day</label>
                        <select value={scheduleForm.day_of_week} onChange={(e)=>setScheduleForm({...scheduleForm, day_of_week: e.target.value})} className="w-full px-3 py-2 border rounded">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">🕐 Start Time</label>
                        <input type="time" value={scheduleForm.start_time} onChange={(e)=>setScheduleForm({...scheduleForm, start_time: e.target.value})} className="w-full px-3 py-2 border rounded" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">🕑 End Time</label>
                        <input type="time" value={scheduleForm.end_time} onChange={(e)=>setScheduleForm({...scheduleForm, end_time: e.target.value})} className="w-full px-3 py-2 border rounded" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button onClick={()=>setShowAddSchedule(false)} className="px-6 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400 font-semibold">✕ Cancel</button>
                      <button onClick={async ()=>{ if(!scheduleForm.module_id || !scheduleForm.room_id) return alert('Fill required fields'); try{ await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/schedule/add`, { group_id: selectedEdtGroup, ...scheduleForm }, { headers }); setShowAddSchedule(false); fetchEdtSchedule(selectedEdtGroup); alert('Schedule entry added'); }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); } }} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold">✓ Add</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Structure Tab */}
        {activeTab === 'structure' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">🏛️</span> Institution Structure
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">🏫 Universities</h3>
                  <div className="space-y-2">
                    {universities.length > 0 ? universities.map(u => (
                      <div key={u.id} className="flex justify-between items-center">
                        <div>{u.name}</div>
                        <button onClick={() => { setSelectedUniversityId(u.id); setFaculties([]); setSpecialties([]); fetchFaculties(u.id); }} className="text-sm text-blue-600">Select</button>
                      </div>
                    )) : <div className="text-sm text-gray-500">No universities</div>}
                  </div>
                  <div className="mt-4">
                    <input value={newUniName} onChange={(e)=>setNewUniName(e.target.value)} placeholder="New university name" className="w-full px-3 py-2 border rounded" />
                    <button onClick={async ()=>{
                      if(!newUniName) return alert('Enter a name');
                      try{
                        await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/structure/universities`, { name: newUniName }, { headers });
                        setNewUniName('');
                        fetchUniversities();
                        alert('University created');
                      }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); }
                    }} className="mt-2 w-full bg-indigo-600 text-white py-2 rounded">➕ Create University</button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">🏛️ Faculties</h3>
                  <div className="space-y-2">
                    {faculties.length > 0 ? faculties.map(f => (
                      <div key={f.id} className="flex justify-between items-center">
                        <div>{f.name}</div>
                        <button onClick={() => { setSelectedFacultyId(f.id); setSpecialties([]); fetchSpecialties(f.id); }} className="text-sm text-blue-600">Select</button>
                      </div>
                    )) : <div className="text-sm text-gray-500">No faculties</div>}
                  </div>
                  <div className="mt-4">
                    <select value={selectedUniversityId} onChange={(e)=>{ setSelectedUniversityId(e.target.value); fetchFaculties(e.target.value); }} className="w-full px-3 py-2 border rounded mb-2">
                      <option value="">Choose university</option>
                      {universities.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <input value={newFacultyName} onChange={(e)=>setNewFacultyName(e.target.value)} placeholder="New faculty name" className="w-full px-3 py-2 border rounded" />
                    <button onClick={async ()=>{
                      if(!selectedUniversityId) return alert('Select university first');
                      if(!newFacultyName) return alert('Enter faculty name');
                      try{
                        await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/structure/faculties`, { name: newFacultyName, university_id: selectedUniversityId }, { headers });
                        setNewFacultyName('');
                        fetchFaculties(selectedUniversityId);
                        alert('Faculty created');
                      }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); }
                    }} className="mt-2 w-full bg-indigo-600 text-white py-2 rounded">➕ Create Faculty</button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">🎓 Specialties</h3>
                  <div className="space-y-2">
                    {specialties.length > 0 ? specialties.map(s => (
                      <div key={s.id} className="flex justify-between items-center">
                        <div>{s.name}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedSpecialtyId(s.id)} className="text-sm text-blue-600">Select</button>
                          <button onClick={() => handleDeleteSpecialty(s.id)} className="text-sm bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                        </div>
                      </div>
                    )) : <div className="text-sm text-gray-500">No specialties</div>}
                  </div>
                  <div className="mt-4">
                    <select value={selectedFacultyId} onChange={(e)=>{ setSelectedFacultyId(e.target.value); fetchSpecialties(e.target.value); }} className="w-full px-3 py-2 border rounded mb-2">
                      <option value="">Choose faculty</option>
                      {faculties.map(f=> <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <input value={newSpecialtyName} onChange={(e)=>setNewSpecialtyName(e.target.value)} placeholder="New specialty name" className="w-full px-3 py-2 border rounded" />
                    <button onClick={async ()=>{
                      if(!selectedFacultyId) return alert('Select faculty first');
                      if(!newSpecialtyName) return alert('Enter specialty name');
                      try{
                        await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/structure/specialties`, { name: newSpecialtyName, faculty_id: selectedFacultyId }, { headers });
                        setNewSpecialtyName('');
                        fetchSpecialties(selectedFacultyId);
                        alert('Specialty created');
                      }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); }
                    }} className="mt-2 w-full bg-indigo-600 text-white py-2 rounded">➕ Create Specialty</button>
                  </div>
                </div>
              </div>

              {agentInfo?.permissions === 'principal' ? (
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">👩‍💼 Create / Assign Pedagogical Agent</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input value={agentFirstName} onChange={(e)=>setAgentFirstName(e.target.value)} placeholder="First name" className="px-3 py-2 border rounded" />
                    <input value={agentLastName} onChange={(e)=>setAgentLastName(e.target.value)} placeholder="Last name" className="px-3 py-2 border rounded" />
                    <input value={agentEmail} onChange={(e)=>setAgentEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border rounded" />
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select value={selectedSpecialtyId} onChange={(e)=>setSelectedSpecialtyId(e.target.value)} className="px-3 py-2 border rounded">
                      <option value="">Choose specialty</option>
                      {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div />
                    <button onClick={async ()=>{
                      if(!selectedSpecialtyId) return alert('Select specialty');
                      if(!agentFirstName || !agentLastName || !agentEmail) return alert('Fill agent details');
                      try{
                        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${selectedSpecialtyId}/agent`, { first_name: agentFirstName, last_name: agentLastName, email: agentEmail }, { headers });
                        setAgentFirstName(''); setAgentLastName(''); setAgentEmail('');
                        alert('Agent created — opening print preview');
                        handlePrintCredentials(res.data);
                        fetchSpecialties(selectedFacultyId);
                      }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); }
                    }} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold transition-all">➤ Create & Print</button>
                    <button onClick={async ()=>{
                      if(!selectedSpecialtyId) return alert('Select specialty');
                      if(!agentFirstName || !agentLastName || !agentEmail) return alert('Fill agent details');
                      try{
                        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${selectedSpecialtyId}/agent`, { first_name: agentFirstName, last_name: agentLastName, email: agentEmail }, { headers });
                        setAgentFirstName(''); setAgentLastName(''); setAgentEmail('');
                        alert('Agent created — downloading PDF');
                        handleDownloadCredentialsPDF({first_name: agentFirstName, last_name: agentLastName, ...res.data});
                        fetchSpecialties(selectedFacultyId);
                      }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); }
                    }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold transition-all">📥 Create & PDF</button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-lg text-sm text-gray-600">Only the principal agent can create other agent accounts.</div>
              )}
            </div>
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="animate-fadeInUp">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📖</span> Modules & Groups Management
              </h2>

              {/* Specialty Selection */}
              <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl">
                <label className="block text-sm font-semibold text-gray-800 mb-2">🎓 Select Specialty</label>
                <select value={selectedModuleSpecialty} onChange={(e)=>{ setSelectedModuleSpecialty(e.target.value); if(e.target.value) fetchSemesters(e.target.value); fetchAgentTeachers(); setModules([]); setSemesters([]); fetchGroups(e.target.value); }} className="w-full px-3 py-2 border rounded">
                  <option value="">Choose specialty...</option>
                  {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {selectedModuleSpecialty && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Semesters & Modules */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">📚 Semesters & Modules</h3>
                    <div className="space-y-3 mb-4">
                      {editSemester && (
                        <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded">
                          <h4 className="font-semibold mb-2">✏️ Edit Semester</h4>
                          <input type="number" placeholder="Semester number" min="1" max="8" value={editSemesterNumber} onChange={(e)=>setEditSemesterNumber(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded mb-2" />
                          <div className="flex gap-2">
                            <button onClick={handleSaveSemester} className="flex-1 bg-green-600 text-white px-4 py-2 rounded">✓ Save</button>
                            <button onClick={()=>setEditSemester(null)} className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded">✕ Cancel</button>
                          </div>
                        </div>
                      )}
                      {semesters.length > 0 ? semesters.map(sem => (
                        <div key={sem.id} className={`w-full p-2 rounded border-2 transition-all ${selectedSemester === sem.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                          <div className="flex items-center justify-between">
                            <button onClick={() => { setSelectedSemester(sem.id); fetchModules(sem.id); }} className="text-left w-full p-3">
                              <strong>Semester {sem.number}</strong>
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{modules.filter(m => m.semester_id === sem.id).length} modules</span>
                              <button onClick={() => handleEditSemester(sem)} className="text-sm bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                              <button onClick={() => handleDeleteSemester(sem.id)} className="text-sm bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                            </div>
                          </div>
                        </div>
                      )) : <div className="text-sm text-gray-500">No semesters created</div>}
                    </div>
                    <div>
                      <input type="number" placeholder="Semester number" value={newSemNumber} onChange={(e)=>setNewSemNumber(e.target.value)} min="1" max="8" className="w-full px-3 py-2 border rounded mb-2" />
                      <button onClick={async ()=>{ const val = newSemNumber; if(!val) return alert('Enter semester number'); try{ await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${selectedModuleSpecialty}/semesters`, { number: parseInt(val) }, { headers }); setNewSemNumber(1); fetchSemesters(selectedModuleSpecialty); alert('Semester created'); }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); } }} className="w-full bg-indigo-600 text-white py-2 rounded">➕ Create Semester</button>
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">📖 Modules</h3>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {modules.length > 0 ? modules.map(mod => (
                        <div key={mod.id} className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 border border-orange-200 rounded flex items-center justify-between">
                          <div>
                            <strong>{mod.module_name}</strong>
                            <div className="text-xs text-gray-600 mt-1">Type: {mod.module_type} | Coeff: {mod.coefficient}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditModule(mod)} className="text-sm bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                            <button onClick={() => handleDeleteModule(mod.id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded">Delete</button>
                          </div>
                        </div>
                      )) : <div className="text-sm text-gray-500">Select semester to view modules</div>}
                    </div>

                    {/*
                      Edit Module panel — uses handleSaveModule so the function is consumed and linter warning is resolved.
                    */}
                    {editModule && (
                      <div className="mb-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-orange-200 rounded">
                        <h4 className="font-semibold mb-2">✏️ Edit Module</h4>
                        <input type="text" placeholder="Module name" value={editModuleData.module_name} onChange={(e)=>setEditModuleData({...editModuleData, module_name: e.target.value})} className="w-full px-3 py-2 border rounded mb-2" />
                        <input type="number" placeholder="Coefficient" value={editModuleData.coefficient} onChange={(e)=>setEditModuleData({...editModuleData, coefficient: parseFloat(e.target.value)})} min="0.5" max="10" step="0.5" className="w-full px-3 py-2 border rounded mb-2" />
                        <select value={editModuleData.module_type} onChange={(e)=>setEditModuleData({...editModuleData, module_type: e.target.value})} className="w-full px-3 py-2 border rounded mb-2">
                          <option value="CM">CM (Lecture)</option>
                          <option value="TD">TD (Tutorial)</option>
                          <option value="TP">TP (Practical)</option>
                          <option value="Projet">Projet</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={handleSaveModule} className="flex-1 bg-green-600 text-white px-4 py-2 rounded">✓ Save</button>
                          <button onClick={()=>setEditModule(null)} className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded">✕ Cancel</button>
                        </div>
                      </div>
                    )}

                    {selectedSemester && (
                      <div className="space-y-2">
                        <input type="text" placeholder="Module name" value={newModuleName} onChange={(e)=>setNewModuleName(e.target.value)} className="w-full px-3 py-2 border rounded" />
                        <input type="number" placeholder="Coefficient" value={newModuleCoeff} onChange={(e)=>setNewModuleCoeff(parseFloat(e.target.value))} min="0.5" max="10" step="0.5" className="w-full px-3 py-2 border rounded" />
                        <select value={newModuleType} onChange={(e)=>setNewModuleType(e.target.value)} className="w-full px-3 py-2 border rounded">
                          <option value="CM">CM (Lecture)</option>
                          <option value="TD">TD (Tutorial)</option>
                          <option value="TP">TP (Practical)</option>
                          <option value="Projet">Projet</option>
                        </select>
                        <button onClick={async ()=>{ if(!newModuleName) return alert('Enter module name'); try{ await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/semesters/${selectedSemester}/modules`, { module_name: newModuleName, coefficient: newModuleCoeff, module_type: newModuleType }, { headers }); setNewModuleName(''); setNewModuleCoeff(1); setNewModuleType('CM'); fetchModules(selectedSemester); alert('Module created'); }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); } }} className="w-full bg-indigo-600 text-white py-2 rounded">➕ Create Module</button>
                      </div>
                    )}
                  </div>

                  {/* Groups */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">👥 Groups</h3>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {groups.length > 0 ? groups.map(grp => (
                        <div key={grp.id} className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded flex items-center justify-between">
                          <div className="cursor-pointer hover:text-blue-600">
                            <strong>{grp.name || `Group ${grp.group_index}`}</strong>
                            <div className="text-xs text-gray-600 mt-1">{grp.student_count} students</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleOpenEditGroupModal(grp)} className="text-sm bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-all" title="Edit group">✏️</button>
                            <button onClick={() => handleDeleteGroup(grp.id)} className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-all" title="Delete group">🗑️</button>
                          </div>
                        </div>
                      )) : <div className="text-sm text-gray-500">No groups created yet</div>}
                    </div>
                    <button onClick={async ()=>{ if(!selectedModuleSpecialty) return; try{ const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${selectedModuleSpecialty}/create-groups`, { group_size: 50 }, { headers }); fetchGroups(selectedModuleSpecialty); alert(`Created ${res.data.groups.length} groups`); }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); } }} className="w-full bg-indigo-600 text-white py-2 rounded">➕ Create Groups (50/group)</button>
                  </div>

                  {/* Teachers */}
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">👨‍🏫 Teachers</h3>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {agentTeachers.length > 0 ? agentTeachers.map(t => (
                        <div key={t.id} className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded">
                          <strong>{t.first_name} {t.last_name}</strong>
                          <div className="text-xs text-gray-600 mt-1">Email: {t.email}</div>
                          <div className="text-xs text-gray-600">{t.specialization || 'N/A'}</div>
                        </div>
                      )) : <div className="text-sm text-gray-500">No teachers created yet</div>}
                    </div>
                    <div className="space-y-2 mb-3">
                      <label className="block text-sm font-medium text-gray-700">Select Specialty for Teacher</label>
                      <select value={teacherSpecialtyId} onChange={(e)=>setTeacherSpecialtyId(e.target.value)} className="w-full px-3 py-2 border rounded text-sm">
                        <option value="">Choose specialty</option>
                        {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <input type="text" placeholder="First name" value={teacherFormData.first_name} onChange={(e)=>setTeacherFormData({...teacherFormData, first_name: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" />
                      <input type="text" placeholder="Last name" value={teacherFormData.last_name} onChange={(e)=>setTeacherFormData({...teacherFormData, last_name: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" />
                      <input type="email" placeholder="Email" value={teacherFormData.email} onChange={(e)=>setTeacherFormData({...teacherFormData, email: e.target.value})} className="w-full px-3 py-2 border rounded text-sm" />
                      <div className="flex gap-2">
                        <button onClick={async ()=>{ if(!teacherSpecialtyId || !teacherFormData.first_name || !teacherFormData.last_name || !teacherFormData.email) return alert('Fill all fields and select specialty'); try{ const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${teacherSpecialtyId}/teacher`, teacherFormData, { headers }); setTeacherFormData({first_name:'', last_name:'', email:'', specialization:'', department:''}); setTeacherSpecialtyId(''); alert('Teacher created — opening print preview'); handlePrintCredentials({...res.data, type: 'teacher'}); fetchAgentTeachers(); fetchSpecialties(selectedFacultyId); }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); } }} className="flex-1 bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 font-semibold">🖨️ Create & Print</button>
                        <button onClick={async ()=>{ if(!teacherSpecialtyId || !teacherFormData.first_name || !teacherFormData.last_name || !teacherFormData.email) return alert('Fill all fields and select specialty'); try{ const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/agents/specialties/${teacherSpecialtyId}/teacher`, teacherFormData, { headers }); setTeacherFormData({first_name:'', last_name:'', email:'', specialization:'', department:''}); setTeacherSpecialtyId(''); alert('Teacher created — downloading credentials'); handleDownloadCredentialsPDF({...res.data, type: 'teacher', first_name: teacherFormData.first_name, last_name: teacherFormData.last_name}); fetchAgentTeachers(); fetchSpecialties(selectedFacultyId); }catch(err){ alert('Error: '+(err.response?.data?.error||err.message)); } }} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 font-semibold">📥 Create & PDF</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* View Teacher Modal */}
        {viewedTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-2xl p-8 animate-fadeInUp">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900">👨‍🎓 Teacher Profile</h3>
                <button onClick={() => setViewedTeacher(null)} className="text-2xl text-gray-500 hover:text-gray-700 transition-colors">✕</button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">👤 Name</p>
                  <p className="text-lg font-bold text-gray-900">{viewedTeacher.first_name} {viewedTeacher.last_name}</p>

                  <p className="text-sm text-gray-600 font-semibold mt-4 mb-1">📧 Email</p>
                  <p className="text-lg font-bold text-gray-900">{viewedTeacher.email}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">🆔 Teacher ID</p>
                  <p className="text-lg font-bold text-gray-900">{viewedTeacher.teacher_id}</p>

                  <p className="text-sm text-gray-600 font-semibold mt-4 mb-1">🎓 Specialization</p>
                  <p className="text-lg font-bold text-gray-900">{viewedTeacher.specialization || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setEditTeacher(viewedTeacher); setViewedTeacher(null); }} className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 font-semibold transition-all">✏️ Edit</button>
                <button onClick={() => setViewedTeacher(null)} className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 font-semibold transition-all">✕ Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Teacher Modal */}
        {assignCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md p-8 animate-fadeInUp">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">👤 Assign Teacher</h3>
                <button onClick={() => setAssignCourse(null)} className="text-2xl text-gray-500 hover:text-gray-700 transition-colors">✕</button>
              </div>
              <p className="text-gray-600 font-semibold mb-4">📚 {assignCourse.course_name}</p>
              <div className="mb-6">
                <label className="block text-sm text-gray-700 font-semibold mb-2">Select Teacher</label>
                <select value={assignTeacherId || ''} onChange={(e)=>setAssignTeacherId(e.target.value)} className="w-full border-2 border-purple-200 px-4 py-2 rounded-lg focus:border-purple-500 focus:outline-none transition-colors">
                  <option value="">Unassign</option>
                  {teachers.map(t=> (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} — {t.teacher_id}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAssignCourse(null)} className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400 font-semibold transition-all">✕ Cancel</button>
                <button onClick={handleAssignSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-all">✓ Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Modal */}
        {announceCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-lg p-8 animate-fadeInUp">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">📢 Send Announcement</h3>
                <button onClick={() => setAnnounceCourse(null)} className="text-2xl text-gray-500 hover:text-gray-700 transition-colors">✕</button>
              </div>
              <p className="text-gray-600 font-semibold mb-4">📚 {announceCourse.course_name}</p>
              <div className="space-y-4 mb-6">
                <input type="text" placeholder="📝 Title" value={announceData.title} onChange={(e)=>setAnnounceData({...announceData, title: e.target.value})} className="w-full border-2 border-orange-200 px-4 py-2 rounded-lg focus:border-orange-500 focus:outline-none transition-colors" />
                <textarea placeholder="💬 Content" value={announceData.content} onChange={(e)=>setAnnounceData({...announceData, content: e.target.value})} className="w-full border-2 border-orange-200 px-4 py-2 rounded-lg focus:border-orange-500 focus:outline-none transition-colors h-32" />
                <label className="flex items-center gap-2 text-gray-700 font-semibold">
                  <input type="checkbox" checked={announceData.broadcast_all} onChange={(e)=>setAnnounceData({...announceData, broadcast_all: e.target.checked})} className="w-5 h-5 cursor-pointer" />
                  <span>📣 Broadcast to all students (ignore selected course)</span>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAnnounceCourse(null)} className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400 font-semibold transition-all">✕ Cancel</button>
                <button onClick={handleAgentAnnouncement} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold transition-all">✓ Send</button>
              </div>
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
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-in-out; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .animate-slideDown { animation: slideDown 0.4s ease-out; }
        .animate-slideIn { animation: slideIn 0.5s ease-out forwards; opacity: 0; }
        .hover:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
