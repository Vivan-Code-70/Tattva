/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  GraduationCap,
  Users,
  Building,
  LifeBuoy,
  HeartHandshake,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Award,
  Smartphone,
  ArrowRight,
  HelpCircle,
  Check,
  X,
  PhoneOff,
  BookOpen,
  Bus,
} from 'lucide-react';
import { UserRole } from '../../types';
import {
  USER_PROFILES,
  DEFAULT_PASSWORDS,
  DEFAULT_MPINS,
} from '../../services/storageService';
import { otpService } from '../../services/otpService';

interface LoginViewProps {
  onLoginSuccess: (userId: string) => void;
  customPasswords: Record<string, string>;
  customMpins: Record<string, string>;
  failedAttempts: Record<string, number>;
  onRecordFailedAttempt: (key: string) => void;
  onResetFailedAttempts: (key: string) => void;
  initialUserKey?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  customPasswords,
  customMpins,
  failedAttempts,
  onRecordFailedAttempt,
  onResetFailedAttempts,
  initialUserKey,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [targetUserKey, setTargetUserKey] = useState<string>(initialUserKey || 'vivan');
  
  // Auth mode for non-student roles: 'otp' or 'mpin'
  const [authMode, setAuthMode] = useState<'otp' | 'mpin'>('otp');

  // Input states (NO autofill)
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [mpinInput, setMpinInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [showForgotMpinModal, setShowForgotMpinModal] = useState<boolean>(false);

  // Large Role Cards Definition for 7 Roles
  const roles = [
    {
      role: 'student' as UserRole,
      title: 'Student',
      defaultKey: 'vivan',
      defaultId: 'VIVAN-2026-X',
      desc: '13-subject study lab, daily timetable, assignments, attendance & digital ID',
      icon: GraduationCap,
      color: 'from-orange-500 to-amber-500',
      badge: 'ID & Password',
    },
    {
      role: 'teacher' as UserRole,
      title: 'Facilitator',
      defaultKey: 'susmita',
      defaultId: 'SUSMITA-FAC-10',
      desc: 'Class management, attendance marking, coursework publishing & AI lesson plans',
      icon: Users,
      color: 'from-amber-600 to-orange-600',
      badge: 'OTP / MPIN',
    },
    {
      role: 'parent' as UserRole,
      title: 'Parent',
      defaultKey: 'pvivan',
      defaultId: 'PARENT-VIVAN01',
      desc: 'Track scholastic mastery, neural GPA, fee payments, receipts & live bus route',
      icon: HeartHandshake,
      color: 'from-rose-500 to-pink-600',
      badge: 'OTP / MPIN',
    },
    {
      role: 'principal' as UserRole,
      title: 'Principal',
      defaultKey: 'principal',
      defaultId: 'PRINCIPAL-DR-01',
      desc: 'Executive institutional pulse, school attendance, circulars & academic health',
      icon: Award,
      color: 'from-purple-600 to-indigo-600',
      badge: 'OTP / MPIN',
    },
    {
      role: 'admin' as UserRole,
      title: 'Admin',
      defaultKey: 'sandhya',
      defaultId: 'SANDHYA-ADM01',
      desc: 'Pending approvals first, leave & counseling requests, credentials & audits',
      icon: Building,
      color: 'from-orange-600 to-rose-600',
      badge: 'OTP / MPIN',
    },
    {
      role: 'support' as UserRole,
      title: 'Coordinator',
      defaultKey: 'bharthi',
      defaultId: 'BHARTHI-SUP03',
      desc: '12-hour timetable coordination, incident tickets & room allocations',
      icon: LifeBuoy,
      color: 'from-blue-600 to-indigo-600',
      badge: 'OTP / MPIN',
    },
    {
      role: 'security' as UserRole,
      title: 'Staff',
      defaultKey: 'sai',
      defaultId: 'SECURITY-GATE02',
      desc: 'Gate 2 live check-in scanner, NFC tap verification & campus visitors log',
      icon: ShieldCheck,
      color: 'from-stone-700 to-stone-900',
      badge: 'OTP / MPIN',
    },
    {
      role: 'librarian' as UserRole,
      title: 'Librarian',
      defaultKey: 'librarian',
      defaultId: 'LIB-SR-01',
      desc: 'Library management system, catalog circulation, book loans, holds & volume audits',
      icon: BookOpen,
      color: 'from-teal-600 to-emerald-700',
      badge: 'OTP / MPIN',
    },
    {
      role: 'driver' as UserRole,
      title: 'Bus Pilot / Driver',
      defaultKey: 'driver',
      defaultId: 'DRIVER-KA04-2026',
      desc: 'Route 14 turn-by-turn navigation, picked up & to drop tally, daily manifest & dynamic traffic rerouting',
      icon: Bus,
      color: 'from-amber-600 to-orange-700',
      badge: 'OTP / MPIN',
    },
  ];

  // Set initial role if initialUserKey provided
  useEffect(() => {
    if (initialUserKey && USER_PROFILES[initialUserKey]) {
      const p = USER_PROFILES[initialUserKey];
      setTargetUserKey(initialUserKey);
      setSelectedRole(p.role);
      setUserIdInput(p.id);
      setAuthMode('otp');
    }
  }, [initialUserKey]);

  const handleSelectRole = (r: (typeof roles)[0]) => {
    setSelectedRole(r.role);
    setTargetUserKey(r.defaultKey);
    setUserIdInput(r.defaultId);
    setOtpInput('');
    setPasswordInput('');
    setMpinInput('');
    setErrorMessage('');
    setSuccessNotice('');
    setAuthMode('otp');
  };

  // Submit OTP Verification
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let resolvedKey = targetUserKey;
    const cleanId = userIdInput.trim().toUpperCase();
    if (cleanId) {
      const match = Object.keys(USER_PROFILES).find(
        (k) => USER_PROFILES[k].id.toUpperCase() === cleanId
      );
      if (match) {
        resolvedKey = match;
      }
    }

    const result = otpService.verifyOtp(resolvedKey, otpInput);
    if (!result.success) {
      setErrorMessage(result.message || 'Invalid OTP code. Please enter the active 6-digit code.');
      return;
    }

    onResetFailedAttempts(resolvedKey);
    onLoginSuccess(resolvedKey);
  };

  // Submit Student Password
  const handleVerifyStudentPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let resolvedKey = targetUserKey;
    const cleanId = userIdInput.trim().toUpperCase();
    if (cleanId) {
      const match = Object.keys(USER_PROFILES).find(
        (k) => USER_PROFILES[k].id.toUpperCase() === cleanId
      );
      if (match) {
        resolvedKey = match;
      }
    }

    const correctPw = customPasswords[resolvedKey] || DEFAULT_PASSWORDS[resolvedKey] || 'Vivan@2026';
    if (passwordInput.trim() !== correctPw) {
      onRecordFailedAttempt(resolvedKey);
      const fails = (failedAttempts[resolvedKey] || 0) + 1;
      setErrorMessage(
        fails >= 4
          ? 'Account locked due to multiple incorrect attempts. Please contact Administrator Ms. Sandhya.'
          : 'Incorrect password. Default sample password is Vivan@2026 (or Krishvika@2026).'
      );
      return;
    }

    onResetFailedAttempts(resolvedKey);
    onLoginSuccess(resolvedKey);
  };

  // Submit MPIN ("I do not have my phone")
  const handleVerifyMpin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let resolvedKey = targetUserKey;
    const cleanId = userIdInput.trim().toUpperCase();
    if (cleanId) {
      const match = Object.keys(USER_PROFILES).find(
        (k) => USER_PROFILES[k].id.toUpperCase() === cleanId
      );
      if (match) {
        resolvedKey = match;
      }
    }

    const correctMpin = customMpins[resolvedKey] || DEFAULT_MPINS[resolvedKey] || '2026';
    if (mpinInput.trim() !== correctMpin) {
      onRecordFailedAttempt(resolvedKey);
      setErrorMessage('Incorrect 6-digit Master PIN. Please check with the administrator if forgotten.');
      return;
    }

    onResetFailedAttempts(resolvedKey);
    onLoginSuccess(resolvedKey);
  };

  const currentProfile = USER_PROFILES[targetUserKey];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Institutional Portal Header Banner */}
      <div className="p-6 sm:p-8 rounded-[16px] bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/assets/aistudio/Tattvaswayam_School_Logo_dd139741.png"
                alt="Tattvasayam Future Academy"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20 text-orange-100">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
                <span>Identity & Workspace Gateway</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                TATTVASAYAM FUTURE ACADEMY
              </h2>
              <p className="text-xs sm:text-sm text-orange-100/90 leading-relaxed max-w-xl">
                Role-authoritative gateway for Students, Facilitators, Staff, Parents, Administration, and Principal.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end justify-center shrink-0 border-l border-white/20 pl-6 text-right">
            <span className="text-xs text-orange-200 font-semibold uppercase tracking-wider">Campus</span>
            <span className="text-sm font-bold text-white">Jakkur, Bengaluru</span>
            <span className="text-xs text-orange-200 mt-0.5">Academic Year 2026–27</span>
          </div>
        </div>
      </div>

      {/* Role Selection View (7 Large Role Cards) */}
      {!selectedRole ? (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight font-display">
              Choose Your Institutional Role
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Select your persona below to enter your personalized school workspace
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {roles.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  onClick={() => handleSelectRole(item)}
                  className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 hover:border-orange-500 dark:hover:border-orange-500 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col justify-between hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-stone-700">
                        {item.badge}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-stone-900 dark:text-stone-100 text-base font-display">
                      {item.title}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Sign In</span>
                      <span>&rarr;</span>
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono font-medium">
                      {item.defaultId}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Dedicated Login Screen */
        <div className="max-w-xl mx-auto bg-white dark:bg-stone-900 rounded-[16px] border border-orange-200 dark:border-amber-950 shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-5 bg-stone-50 dark:bg-stone-850 border-b border-orange-100 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setErrorMessage('');
                  setSuccessNotice('');
                }}
                className="p-2 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition"
                title="Back to all roles"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 capitalize font-display">
                  {currentProfile?.name || selectedRole} Sign In
                </h3>
                <span className="text-xs text-stone-500 font-mono">
                  {currentProfile?.id || userIdInput}
                </span>
              </div>
            </div>

            {selectedRole !== 'student' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-stone-800 text-orange-700 dark:text-orange-300">
                {authMode === 'otp' ? 'OTP Verification' : 'MPIN Verification'}
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Error Message Display */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Success Notice Display */}
            {successNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">{successNotice}</span>
              </div>
            )}

            {/* Quick Account Switcher for Student */}
            {selectedRole === 'student' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Select Student Account:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserKey('vivan');
                      setUserIdInput('VIVAN-2026-X');
                      setPasswordInput('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      targetUserKey === 'vivan'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Vivan (Grade 10-A)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserKey('krishvika');
                      setUserIdInput('KRISHVIKA-2026-VIII');
                      setPasswordInput('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      targetUserKey === 'krishvika'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Krishvika (Grade 8-B)
                  </button>
                </div>
              </div>
            )}

            {/* Quick Account Switcher for Parent */}
            {selectedRole === 'parent' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400">
                  Select Parent Account:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserKey('pvivan');
                      setUserIdInput('PARENT-VIVAN01');
                      setOtpInput('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      targetUserKey === 'pvivan'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Parent of Vivan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUserKey('pkrishvika');
                      setUserIdInput('PARENT-KRISHVIKA01');
                      setOtpInput('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      targetUserKey === 'pkrishvika'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Parent of Krishvika
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- STUDENT LOGIN: ID & PASSWORD ---------------- */}
            {selectedRole === 'student' && (
              <form onSubmit={handleVerifyStudentPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Student ID:
                  </label>
                  <input
                    type="text"
                    required
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="e.g. VIVAN-2026-X"
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Default: Vivan@2026 or Krishvika@2026"
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Demo credential: <code className="font-mono text-orange-600 dark:text-orange-400 font-bold">Vivan@2026</code> (or <code className="font-mono text-orange-600 dark:text-orange-400 font-bold">Krishvika@2026</code>)
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Enter Student Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ---------------- NON-STUDENT ROLES: OTP (DEFAULT) ---------------- */}
            {selectedRole !== 'student' && authMode === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Institutional ID / Username:
                  </label>
                  <input
                    type="text"
                    required
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="Enter registered ID"
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-700 dark:text-stone-300">
                      Enter 6-Digit One-Time Password (OTP):
                    </label>
                    <span className="text-[11px] text-stone-400 font-mono">
                      RFC 6238 TOTP
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border-2 border-orange-300 dark:border-stone-700 focus:border-orange-500 text-stone-900 dark:text-stone-100"
                  />
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
                    Check your authenticator app or phone. Super Admins can also inspect active TOTP codes in the Admin OTP Hub.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify OTP & Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* "I do not have my phone" option */}
                <div className="pt-2 text-center border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('mpin');
                      setErrorMessage('');
                    }}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>I do not have my phone (Use MPIN instead)</span>
                  </button>
                </div>
              </form>
            )}

            {/* ---------------- NON-STUDENT ROLES: MPIN FALLBACK ---------------- */}
            {selectedRole !== 'student' && authMode === 'mpin' && (
              <form onSubmit={handleVerifyMpin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Institutional ID / Username:
                  </label>
                  <input
                    type="text"
                    required
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="Enter registered ID"
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-700 dark:text-stone-300">
                      Master PIN (MPIN):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotMpinModal(true)}
                      className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline font-semibold"
                    >
                      Forgot MPIN?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={mpinInput}
                    onChange={(e) => setMpinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit MPIN"
                    className="w-full text-center tracking-widest font-mono text-xl p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Standard 6-digit security PIN provided during enrollment
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition text-xs flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Verify MPIN & Sign In</span>
                </button>

                <div className="pt-2 text-center border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('otp');
                      setErrorMessage('');
                    }}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Have your phone? Use OTP code instead</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Forgot MPIN Modal / Guidance */}
      {showForgotMpinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-[16px] max-w-md w-full p-6 border border-orange-200 dark:border-amber-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm">
                <HelpCircle className="w-5 h-5" />
                <span>Forgotten MPIN Recovery</span>
              </div>
              <button
                onClick={() => setShowForgotMpinModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              <p>
                Master PINs are cryptographically managed security credentials issued during institutional registration.
              </p>
              <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-stone-850 border border-orange-200 dark:border-stone-700 space-y-1">
                <span className="font-bold text-stone-900 dark:text-stone-100 block">
                  Next Step: Check with the Administrator
                </span>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Please consult Director of Academics <strong>Ms. Sandhya</strong> or Operations Head <strong>Ms. Amrita</strong> in Room 101, or contact <span className="font-mono text-orange-600">support@tattvasayam.edu.in</span> to generate an instant credential reset.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowForgotMpinModal(false)}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
