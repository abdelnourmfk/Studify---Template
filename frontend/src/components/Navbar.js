import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // fetch unread count when user changes (auth via httpOnly cookie)
    if (!user) return;
    axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/notifications/count`)
      .then(r => setUnreadCount(r.data.unread_count || 0))
      .catch(() => {});

    // setup socket for notifications (send cookies)
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', { withCredentials: true });
    const onAnnouncement = (payload) => {
      setUnreadCount(c => c + 1);
      const msg = payload?.title || payload?.message || 'New announcement received';
      setToast({ id: Date.now(), message: msg });
      // auto-clear toast
      setTimeout(() => setToast(null), 4500);
    };
    const onGrades = (payload) => {
      setUnreadCount(c => c + 1);
      const msg = payload?.message || payload?.title || 'Grades published';
      setToast({ id: Date.now(), message: msg });
      setTimeout(() => setToast(null), 4500);
    };
    socket.on('connect', () => {});
    socket.on('announcement', onAnnouncement);
    socket.on('gradesPublished', onGrades);
    socket.on('gradeApproved', onGrades);

    return () => {
      socket.off('announcement', onAnnouncement);
      socket.off('gradesPublished', onGrades);
      socket.off('gradeApproved', onGrades);
      socket.disconnect();
    };
  }, [user]);

  // update document title when there are unread notifications
  const originalTitle = useRef(typeof document !== 'undefined' ? document.title : 'Studify');
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }
    return () => { document.title = originalTitle.current };
  }, [unreadCount]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    try {
      // notify server to clear cookie
      axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/logout`).catch(() => {});
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      onLogout();
      navigate('/login');
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const getRoleColor = () => {
    switch(user?.role) {
      case 'student': return 'from-blue-600 to-blue-800';
      case 'teacher': return 'from-green-600 to-green-800';
      case 'agent': return 'from-purple-600 to-purple-800';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getRoleLabel = () => {
    switch(user?.role) {
      case 'student': return 'Student';
      case 'teacher': return 'Instructor';
      case 'agent': return 'Admin';
      default: return 'User';
    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-lg backdrop-blur-md bg-white/95' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-br ${getRoleColor()} p-2 rounded-lg transform transition-transform hover:scale-110 flex items-center justify-center`}>
                <img src="/logo.png" alt="Studify" className="w-12 h-12 object-contain" onError={(e)=>{e.target.style.display='none'}} />
              </div>
              <div className="ml-2">
                <h1 className={`text-2xl font-bold bg-gradient-to-r ${getRoleColor()} bg-clip-text text-transparent`}>
                  Studify
                </h1>
                <p className="text-xs text-gray-500">Academic Portal</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {/* Notifications bell */}
              <div className="relative">
                <button aria-label={unreadCount > 0 ? `You have ${unreadCount} new notifications` : 'Notifications'} onClick={async () => {
                  setNotifOpen(v => !v);
                  if (!notifOpen) {
                    // fetch notifications for role (cookie auth)
                    try {
                      let res;
                      if (user?.role === 'student') {
                        res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/notifications/announcements`);
                      } else {
                        res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/notifications`);
                      }
                      setNotifications(res.data || []);
                      setUnreadCount(0);
                    } catch (e) {
                      console.error('Failed to fetch notifications', e);
                    }
                  }
                }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative" title={unreadCount > 0 ? `You have ${unreadCount} new notifications` : 'Notifications'}>
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-2">{unreadCount}</span>
                      <span className="absolute -top-3 -right-3 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-80"></span>
                    </>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border overflow-hidden z-50">
                    <div className="p-3 border-b font-semibold">Notifications</div>
                    <div className="max-h-64 overflow-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-3 hover:bg-gray-50 border-b text-sm">
                            <div className="font-semibold">{n.title || (n.course_name ? `Course: ${n.course_name}` : 'Announcement')}</div>
                            <div className="text-gray-700 text-xs mt-1">{n.content || n.body || ''}</div>
                            <div className="text-xs text-gray-400 mt-2">{new Date(n.created_at || n.createdAt || Date.now()).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Welcome,</span>
                <span className="font-semibold text-gray-900">{user?.first_name}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getRoleColor()}`}>
                {getRoleLabel()}
              </span>
              <button
                onClick={handleLogoutClick}
                className="group relative px-4 py-2 font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden pb-4 animate-fadeIn space-y-3">
              <div className="text-sm text-gray-600">
                <p>Welcome, <span className="font-semibold">{user?.first_name} {user?.last_name}</span></p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-gradient-to-r ${getRoleColor()}`}>
                  {getRoleLabel()}
                </span>
              </div>
              <div className="flex items-center gap-3 px-4">
                <button aria-label={unreadCount > 0 ? `You have ${unreadCount} new notifications` : 'Notifications'} onClick={async () => {
                  setNotifOpen(v => !v);
                  if (!notifOpen) {
                    try {
                      let res;
                      if (user?.role === 'student') {
                        res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/notifications/announcements`);
                      } else {
                        res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/admin/notifications`);
                      }
                      setNotifications(res.data || []);
                      setUnreadCount(0);
                    } catch (e) {
                      console.error('Failed to fetch notifications', e);
                    }
                  }
                }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full px-1">{unreadCount}</span>
                      <span className="absolute -top-3 -right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse opacity-80"></span>
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={handleLogoutClick}
                className="w-full px-4 py-2 font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-sm p-6 animate-fadeIn">
            <div className="flex justify-center mb-4">
              <span className="text-5xl">👋</span>
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Confirm Logout?</h3>
            <p className="text-gray-600 text-center mb-6">Are you sure you want to logout? You'll need to sign in again to access your account.</p>
            <div className="flex gap-3">
              <button
                onClick={cancelLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="h-16"></div>
      <div aria-live="polite" className="sr-only">{unreadCount > 0 ? `You have ${unreadCount} new notifications` : 'No new notifications'}</div>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white border shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 animate-fadeIn">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <div className="text-sm font-medium">{toast.message}</div>
          </div>
        </div>
      )}
    </>
  );
}
