import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validatePassword, validateUsername } from '../utils/validation';
import { Lock, Mail, User } from 'lucide-react';
import { BannedNoticeModal } from './BannedNoticeModal';

interface AuthScreenProps {
  onNavigateHelp: (path: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onNavigateHelp }) => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  // Form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States
  const [loginError, setLoginError] = useState('');
  const [signupErrors, setSignupErrors] = useState<string[]>([]);
  const [isBannedError, setIsBannedError] = useState(false);
  const [showBannedModal, setShowBannedModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsBannedError(false);
    setSubmitting(true);

    try {
      await login(loginIdentifier, password);
    } catch (err: any) {
      if (err.message === 'account not found' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setLoginError('account not found');
      } else if (err.message?.includes('banned')) {
        setIsBannedError(true);
        setShowBannedModal(true);
      } else {
        setLoginError('account not found');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors([]);

    const errors: string[] = [];

    // Username validation
    const userVal = validateUsername(username);
    if (!userVal.isValid) {
      errors.push(userVal.error || 'Invalid username');
    }

    // Password matching
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    // Strict password requirements
    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      errors.push(...passVal.errors);
    }

    if (errors.length > 0) {
      setSignupErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await signup(email, username, password);
    } catch (err: any) {
      setSignupErrors([err.message || 'Failed to create account. Please check your details.']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-app)',
        }}
      >
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-white">Chatter</h1>
          <p className="text-xs text-slate-400">
            {isLogin ? 'Sign in to access your feed and chatrooms' : 'Create your account to start chatting'}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-6 border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setLoginError('');
              setIsBannedError(false);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isLogin ? 'bg-sky-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setSignupErrors([]);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isLogin ? 'bg-sky-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* LOGIN FORM */}
        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email or Username
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  required
                  placeholder="name@example.com or @username"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 mt-2 shadow-lg"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#090e17',
              }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Error Message: "account not found in red under the log in button" */}
            {loginError && (
              <p className="text-center text-xs text-red-500 font-semibold pt-1">
                {loginError}
              </p>
            )}

            {/* Banned error display */}
            {isBannedError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-center space-y-1 mt-2">
                <p className="text-xs font-bold text-red-400">Your account has been banned</p>
                <p className="text-[11px] text-slate-400">
                  To learn more about bans,{' '}
                  <button
                    type="button"
                    onClick={() => onNavigateHelp('/help/punishments/bans')}
                    className="text-sky-400 font-semibold hover:underline"
                  >
                    click here
                  </button>
                  .
                </p>
              </div>
            )}
          </form>
        ) : (
          /* SIGN UP FORM (Exact 4 fields: email, username, 2 password boxes) */
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username (Must be unique, no spaces)
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="username"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-sky-400 text-white"
                />
              </div>
            </div>

            {/* Password rules hints */}
            <div className="text-[10px] text-slate-400 bg-white/5 p-2.5 rounded-xl space-y-0.5 border border-white/5">
              <span className="font-semibold text-slate-300 block mb-0.5">Password Rules:</span>
              <p>• Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special (!#$@)</p>
              <p>• Cannot contain space, cannot start/end with - or .</p>
            </div>

            {signupErrors.length > 0 && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 space-y-1">
                {signupErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#090e17',
              }}
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>

      {/* Banned User Notice Modal (covers whole screen) */}
      <BannedNoticeModal
        isOpen={showBannedModal}
        onClose={() => setShowBannedModal(false)}
        onNavigateHelp={onNavigateHelp}
        username={loginIdentifier.replace(/^@/, '').trim()}
      />
    </div>
  );
};
