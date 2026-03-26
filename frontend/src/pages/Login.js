import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: enter email, 2: enter token + new password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();

  const isAccountLocked = attemptCount >= 5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isAccountLocked) {
      setError('Too many login attempts. Please try again later.');
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        email: email.toLowerCase().trim(),
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const { user } = response.data;

      // Server sets token cookie; store only user for UI state
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('loginTime', new Date().toISOString());

      setAttemptCount(0);
      setUser(user);
      navigate(`/${user.role}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(errorMsg);
      setAttemptCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordStep1 = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail) {
      setForgotError('Please enter your email');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/forgot-password`, {
        email: forgotEmail.toLowerCase().trim()
      });

      // In development, token is returned. In production, user checks email
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);
      }

      setForgotSuccess(`${response.data.message}. Check your email for the reset code.`);
      setTimeout(() => setForgotStep(2), 2000);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to process password reset');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordStep2 = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!resetToken || !newPassword || !confirmNewPassword) {
      setForgotError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/reset-password`, {
        token: resetToken.trim(),
        password: newPassword
      });

      setForgotSuccess(response.data.message);
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotStep(1);
        setForgotEmail('');
        setResetToken('');
        setNewPassword('');
        setConfirmNewPassword('');
      }, 2000);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .animate-slideInLeft { animation: slideInLeft 0.5s ease-out; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
        .form-field { animation: slideInLeft 0.5s ease-out forwards; opacity: 0; }
        .form-field:nth-child(1) { animation-delay: 0.2s; }
        .form-field:nth-child(2) { animation-delay: 0.4s; }
        .form-field:nth-child(3) { animation-delay: 0.6s; }
        .form-field:nth-child(4) { animation-delay: 0.8s; }
      `}</style>
      {/* Animated background shapes */}
      <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse" style={{animationDelay: '1s'}}></div>

      <div className="w-full max-w-md z-10">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Rotating outer glow */}
                <div className="absolute -inset-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-3xl opacity-70 animate-spin" style={{animationDuration: '6s'}}></div>
                {/* Inner glow layer 1 */}
                <div className="absolute inset-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-2xl opacity-60 animate-pulse" style={{animationDuration: '3s'}}></div>
                {/* Inner glow layer 2 */}
                <div className="absolute inset-4 bg-gradient-to-br from-cyan-300 via-blue-400 to-purple-500 rounded-full blur-xl opacity-50"></div>
                {/* Logo container */}
                <div className="absolute inset-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-sm">
                  <img src="/logo.png" alt="Studify Logo" className="w-24 h-24 object-contain drop-shadow-lg" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            <p className="text-gray-300 text-sm">Sign in to access your portal</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg animate-shake text-sm flex items-gap-2 animate-fadeInUp">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Lock Warning */}
          {attemptCount > 0 && !isAccountLocked && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-2 rounded-lg text-xs animate-fadeInUp transition-all duration-300">
              {5 - attemptCount} attempts remaining before account lock
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="form-field">
              <label className="block text-sm font-medium text-gray-200 mb-2 transition-colors duration-300">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAccountLocked}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/20 transition-all duration-300 text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/30"
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Password Input */}
            <div className="form-field">
              <label className="block text-sm font-medium text-gray-200 mb-2 transition-colors duration-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAccountLocked}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/20 transition-all duration-300 text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isAccountLocked}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-300 transition-all duration-300 transform hover:scale-110 disabled:cursor-not-allowed"
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
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="form-field flex items-center justify-between">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-gray-200 transition-all duration-300 transform hover:translate-x-1">
                <input type="checkbox" className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-blue-500 transition-all duration-300 cursor-pointer" />
                <span className="text-sm">Keep me signed in</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-all duration-300 font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || isAccountLocked}
              className="form-field w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-blue-500/50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2m14-4V7a2 2 0 00-2-2h-6a2 2 0 00-2 2v4m12-2v2m0-5V7a2 2 0 10-4 0v4m4 0v2" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="form-field text-center pt-4 border-t border-white/10 transition-all duration-300">
            <p className="text-gray-300 text-sm">
              Don't have an account?{' '}
              <a href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-all duration-300 transform hover:translate-x-1 inline-block">
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6 animate-fadeInUp">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Reset Password</h2>
              <p className="text-gray-300 text-sm">
                {forgotStep === 1 ? 'Enter your email to receive a reset code' : 'Enter your reset code and new password'}
              </p>
            </div>

            {/* Error Alert */}
            {forgotError && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                {forgotError}
              </div>
            )}

            {/* Success Alert */}
            {forgotSuccess && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg text-sm">
                {forgotSuccess}
              </div>
            )}

            {/* Step 1: Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotPasswordStep1} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-gray-200 font-medium rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Step 2: Token + New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotPasswordStep2} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Reset Code</label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste your reset code here"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-400 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Check your email for the reset code</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotStep(1);
                    setResetToken('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-gray-200 font-medium rounded-lg transition-all duration-300"
                >
                  Back
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
