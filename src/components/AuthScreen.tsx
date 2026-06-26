/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, FileSpreadsheet, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onLoginSuccess: (user: { email: string; name: string }) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Load existing users
    const usersRaw = localStorage.getItem('remit_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];

    if (isLogin) {
      // Find matching user
      const matchedUser = users.find(
        (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (matchedUser) {
        setSuccess(`Welcome back, ${matchedUser.name}! Logging you in...`);
        setTimeout(() => {
          onLoginSuccess({ email: matchedUser.email, name: matchedUser.name });
        }, 1200);
      } else {
        // Fail-safe default user
        if (email.toLowerCase() === 'joseon359@gmail.com' && password === 'joseon123') {
          const defaultUser = { email: 'joseon359@gmail.com', name: 'Joseon' };
          onLoginSuccess(defaultUser);
          return;
        }
        setError('Invalid email or password combination. Try "joseon359@gmail.com" with password "joseon123" or sign up!');
      }
    } else {
      // Sign Up / Create Account
      const userExists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());

      if (userExists) {
        setError('An account with this email already exists. Please login instead.');
        return;
      }

      const newUser = { name, email, password };
      users.push(newUser);
      localStorage.setItem('remit_users', JSON.stringify(users));

      setSuccess('Account created successfully! Auto-logging you in...');
      setTimeout(() => {
        onLoginSuccess({ email, name });
      }, 1500);
    }
  };

  const handleDemoBypass = () => {
    onLoginSuccess({
      email: 'joseon359@gmail.com',
      name: 'Joseon (Demo User)',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md" id="auth-card-container">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex h-12 w-12 bg-indigo-600 rounded-xl items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25 mb-2">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">RemitFlow</h1>
          <p className="text-xs text-slate-400 font-medium">
            Automated Vendor Advice Dispatch & Ingestion Control
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header tabs */}
          <div className="flex border-b border-slate-800 pb-1 gap-4">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
                isLogin ? 'text-white' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Sign In
              {isLogin && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                />
              )}
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
              }}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
                !isLogin ? 'text-white' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Register
              {!isLogin && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                />
              )}
            </button>
          </div>

          {/* Error and Success Banners */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400 animate-pulse" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Name field (for Register) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Full Name / Organization
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your organization or name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 font-medium"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 font-medium font-mono"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-11 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 font-medium font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-400 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {isLogin ? 'Use standard account or create a brand new one.' : 'Minimum 6 alphanumeric characters.'}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLogin ? 'Sign In to RemitFlow' : 'Create Organization Account'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo bypass options */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            onClick={handleDemoBypass}
            className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore with Demo Sandbox</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-slate-500 space-y-1">
          <p>© {new Date().getFullYear()} RemitFlow. Fully local & standalone sandbox execution.</p>
          {isLogin && (
            <p className="font-mono text-slate-600">
              Demo credentials: <span className="text-indigo-400">joseon359@gmail.com</span> / <span className="text-indigo-400">joseon123</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
