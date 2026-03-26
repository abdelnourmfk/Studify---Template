import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    role: 'student',
    specialty_id: '',
    filiere: 'IT',
    level: '1st Year',
    signup_code: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch available specialties on component mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      setSpecialtiesLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/specialties`);
        setSpecialties(response.data || []);
      } catch (err) {
        console.error('Failed to fetch specialties:', err);
        setSpecialties([]);
      } finally {
        setSpecialtiesLoading(false);
      }
    };
    fetchSpecialties();
  }, []);

  const passwordStrength = formData.password ? (
    formData.password.length >= 8 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) 
      ? 'strong' 
      : formData.password.length >= 6 
      ? 'medium' 
      : 'weak'
  ) : 'none';

  const isPasswordValid = passwordStrength !== 'weak' && formData.password === formData.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.first_name || !formData.last_name) {
      setError('Please enter your full name');
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validation based on role
    if (formData.role === 'student') {
      if (!formData.specialty_id) {
        setError('Please select a specialty');
        return;
      }
    } else if (formData.role === 'teacher' || formData.role === 'agent') {
      if (!formData.signup_code) {
        setError('Signup code is required');
        return;
      }
    }

    setLoading(true);

    try {
      let endpoint = '';
      const registerData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role
      };

      // Determine endpoint and data based on role
      if (formData.role === 'student') {
        endpoint = `${process.env.REACT_APP_API_URL}/api/auth/register`;
        registerData.specialty_id = parseInt(formData.specialty_id);
        registerData.filiere = formData.filiere;
        registerData.level = formData.level;
      } else if (formData.role === 'teacher') {
        endpoint = `${process.env.REACT_APP_API_URL}/api/auth/register/teacher`;
        registerData.signup_code = formData.signup_code.trim();
      } else if (formData.role === 'agent') {
        endpoint = `${process.env.REACT_APP_API_URL}/api/auth/register/agent`;
        registerData.signup_code = formData.signup_code.trim();
      }

      const response = await axios.post(endpoint, registerData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.85)), url('/background-image.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Animated background shapes */}
      <div className="absolute w-96 h-96 bg-green-500/10 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="w-full max-w-lg z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-block bg-gradient-to-br from-green-600 to-green-800 p-3 rounded-xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-gray-300">Join Studify Academy Portal</p>
          </div>

          {/* Success Alert */}
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg animate-fadeIn text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg animate-shake text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-white placeholder-gray-400"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Account Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'student', label: '👨‍🎓 Student', icon: '🎓' },
                  { value: 'teacher', label: '👨‍🏫 Teacher', icon: '📚' },
                  { value: 'agent', label: '👨‍💼 Admin', icon: '⚙️' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({...formData, role: option.value})}
                    className={`py-3 px-4 rounded-lg border-2 transition-all duration-300 font-medium text-center transform hover:scale-105 ${
                      formData.role === option.value
                        ? 'border-green-500 bg-green-500/20 text-green-300'
                        : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/40'
                    }`}
                  >
                    <div className="text-xl mb-1">{option.icon}</div>
                    <span className="text-xs">{option.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent-specific fields */}
            {formData.role === 'agent' && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Signup Code</label>
                <p className="text-xs text-gray-400 mb-2">Enter the signup code provided by the principal agent</p>
                <input
                  type="text"
                  name="signup_code"
                  value={formData.signup_code}
                  onChange={handleChange}
                  placeholder="AGENT-XXXXXXXXXX"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-white placeholder-gray-400 font-mono"
                />
              </div>
            )}

            {/* Teacher-specific fields */}
            {formData.role === 'teacher' && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Signup Code</label>
                <p className="text-xs text-gray-400 mb-2">Enter the signup code provided by your specialty agent</p>
                <input
                  type="text"
                  name="signup_code"
                  value={formData.signup_code}
                  onChange={handleChange}
                  placeholder="TEACHER-XXXXXXXXXX"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-400 font-mono"
                />
              </div>
            )}

            {/* Specialty Selection for Students Only */}
            {formData.role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Specialty</label>
                <select
                  name="specialty_id"
                  value={formData.specialty_id}
                  onChange={handleChange}
                  disabled={specialtiesLoading}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" className="bg-slate-900">
                    {specialtiesLoading ? 'Loading specialties...' : 'Select a specialty'}
                  </option>
                  {specialties.map(specialty => (
                    <option key={specialty.id} value={specialty.id} className="bg-slate-900">
                      {specialty.name} ({specialty.faculty_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Student-specific fields */}
            {formData.role === 'student' && (
              <>
                {/* Filiere and Level Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Department (Filière)</label>
                    <select
                      name="filiere"
                      value={formData.filiere}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-white"
                    >
                      <option value="IT" className="bg-slate-900">Information Technology (IT)</option>
                      <option value="Finance" className="bg-slate-900">Finance</option>
                      <option value="Engineering" className="bg-slate-900">Engineering</option>
                      <option value="Business" className="bg-slate-900">Business Administration</option>
                      <option value="Healthcare" className="bg-slate-900">Healthcare</option>
                      <option value="Law" className="bg-slate-900">Law</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Academic Level</label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-white"
                    >
                      <option value="1st Year" className="bg-slate-900">1st Year</option>
                      <option value="2nd Year" className="bg-slate-900">2nd Year</option>
                      <option value="3rd Year" className="bg-slate-900">3rd Year</option>
                      <option value="4th Year" className="bg-slate-900">4th Year</option>
                      <option value="Master 1" className="bg-slate-900">Master 1</option>
                      <option value="Master 2" className="bg-slate-900">Master 2</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-white placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 1019.542 10c0 .228-.007.459-.02.687m-9.186 4.602a3 3 0 11.464-5.441 1 1 0 111.414 1.414A1 1 0 0110 15z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2 flex gap-1">
                  <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength !== 'none' ? (passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-600'}`}></div>
                  <div className={`h-1 flex-1 rounded-full transition-colors ${['medium', 'strong'].includes(passwordStrength) ? (passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-600'}`}></div>
                  <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-white/10 border rounded-lg focus:outline-none focus:ring-2 transition-all text-white placeholder-gray-400 ${
                  formData.confirmPassword && formData.password === formData.confirmPassword
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                    : 'border-white/20 focus:border-green-500 focus:ring-green-500/20'
                }`}
              />
              {formData.confirmPassword && (
                <p className={`text-xs mt-1 ${formData.password === formData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                  {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-gray-200 transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-green-500" defaultChecked />
              <span className="text-sm">I agree to the Terms of Service</span>
            </label>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating account...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-gray-300 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
                Sign in
              </a>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-xs text-gray-300">
            <p className="font-semibold text-green-400 mb-2">📝 Demo Credentials (For Testing)</p>
            <p className="mb-1"><strong>Student:</strong> student@example.com / password123</p>
            <p className="mb-1"><strong>Teacher:</strong> teacher@example.com / password123</p>
            <p><strong>Agent:</strong> agent@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
