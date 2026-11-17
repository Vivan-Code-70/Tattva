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
  AlertCircle,
  Award,
  Smartphone,
  ArrowRight,
  HelpCircle,
  Check,
  X,
  PhoneOff,
  BookOpen,
  Bus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from 'lucide-react';
import { UserRole, SessionStatusResponse } from '../../types';
import {
  USER_PROFILES,
  DEFAULT_PASSWORDS,
  DEFAULT_MPINS,
} from '../../services/storageService';
import { otpService } from '../../services/otpService';
import { AuthService } from '../../services/authService';

interface LoginViewProps {
  onLoginSuccess: (userId: string) => void;
  onAuthSessionResolved?: (session: SessionStatusResponse) => void;
  expiredSessionMessage?: string | null;
  customPasswords: Record<string, string>;
  customMpins: Record<string, string>;
  failedAttempts: Record<string, number>;
  onRecordFailedAttempt: (key: string) => void;
  onResetFailedAttempts: (key: string) => void;
  initialUserKey?: string;
}

interface RoleConfig {
  role: UserRole;
  title: string;
  defaultKey: string;
  defaultId: string;
  defaultEmail: string;
  accountName: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEMO_ROLE_ACCOUNTS: RoleConfig[] = [
  {
    role: 'student',
    title: 'Student',
    defaultKey: 'vivan',
    defaultId: 'VIVAN-2026-X',
    defaultEmail: 'vivan.sharma@tattvaswayam.edu.in',
    accountName: 'Vivan Sharma (Grade 10-A)',
    desc: 'Courses, 12-hour timetable, assignments, attendance & digital ID',
    icon: GraduationCap,
  },
  {
    role: 'teacher',
    title: 'Faculty / Mentor',
    defaultKey: 'susmita',
    defaultId: 'SUSMITA-FAC-10',
    defaultEmail: 'sushmitha@tattvaswayam.com',
    accountName: 'Ms. Sushmitha',
    desc: 'Class roll call, coursework publishing & inquiry lesson planner',
    icon: Users,
  },
  {
    role: 'parent',
    title: 'Parent',
    defaultKey: 'pvivan',
    defaultId: 'PARENT-VIVAN01',
    defaultEmail: 'parent.vivan@tattvaswayam.com',
    accountName: 'Dr. Ramesh Sharma',
    desc: 'Academic mastery, fee receipts & live bus route tracking',
    icon: HeartHandshake,
  },
  {
    role: 'principal',
    title: 'Centre Head',
    defaultKey: 'principal',
    defaultId: 'PRINCIPAL-DR-01',
    defaultEmail: 'info@tattvaswayam.com',
    accountName: 'Ms. Amrita',
    desc: 'Campus oversight, institutional attendance & official circulars',
    icon: Award,
  },
  {
    role: 'admin',
    title: 'Founder / Admin',
    defaultKey: 'sandhya',
    defaultId: 'SANDHYA-ADM01',
    defaultEmail: 'sandhya.gatti@tattvaswayam.com',
    accountName: 'Ms. Sandhya Gatti',
    desc: 'Leave & counseling approvals, credentials & TOTP directory',
    icon: Building,
  },
  {
    role: 'support',
    title: 'Chief Admin',
    defaultKey: 'bharthi',
    defaultId: 'BHARTHI-SUP03',
    defaultEmail: 'admissions@tattvaswayam.com',
    accountName: 'Ms. Sangeetha',
    desc: '12-hour timetable coordination, admissions & transport approvals',
    icon: LifeBuoy,
  },
  {
    role: 'security',
    title: 'Gate Staff',
    defaultKey: 'sai',
    defaultId: 'SECURITY-GATE02',
    defaultEmail: 'gate2.security@tattvaswayam.edu.in',
    accountName: 'Mr. Sai Kumar',
    desc: 'Gate 2 QR & NFC badge verification & campus visitor logs',
    icon: ShieldCheck,
  },
  {
    role: 'librarian',
    title: 'Librarian',
    defaultKey: 'librarian',
    defaultId: 'LIB-SR-01',
    defaultEmail: 'library@tattvaswayam.edu.in',
    accountName: 'Ms. Meenakshi Sundaram',
    desc: 'Library circulation desk, holds queue & volume inventory',
    icon: BookOpen,
  },
  {
    role: 'driver',
    title: 'Bus Driver',
    defaultKey: 'driver',
    defaultId: 'DRIVER-KA04-2026',
    defaultEmail: 'manjunath.fleet@tattvaswayam.edu.in',
    accountName: 'Mr. Manjunath Gowda',
    desc: 'Route 14 GPS navigation, pickup/drop manifest & traffic reroutes',
    icon: Bus,
  },
];

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onAuthSessionResolved,
  expiredSessionMessage,
  customPasswords,
  customMpins,
  failedAttempts,
  onRecordFailedAttempt,
  onResetFailedAttempts,
  initialUserKey,
}) => {
  const initialConfig =
    DEMO_ROLE_ACCOUNTS.find((r) => r.defaultKey === initialUserKey) ||
    DEMO_ROLE_ACCOUNTS.find((r) => r.role === USER_PROFILES[initialUserKey || '']?.role) ||
    DEMO_ROLE_ACCOUNTS[0];

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialConfig.role);
  const [targetUserKey, setTargetUserKey] = useState<string>(initialConfig.defaultKey);
  const [authMode, setAuthMode] = useState<'otp' | 'mpin'>('otp');

  // Form states
  const [userIdInput, setUserIdInput] = useState<string>(initialConfig.defaultId);
  const [otpInput, setOtpInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [mpinInput, setMpinInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [showForgotMpinModal, setShowForgotMpinModal] = useState<boolean>(false);
  const [isDemoDrawerOpen, setIsDemoDrawerOpen] = useState<boolean>(false);

  // Sync if initialUserKey changes externally
  useEffect(() => {
    if (initialUserKey && USER_PROFILES[initialUserKey]) {
      const p = USER_PROFILES[initialUserKey];
      const roleEntry = DEMO_ROLE_ACCOUNTS.find((r) => r.role === p.role);
      setTargetUserKey(roleEntry ? roleEntry.defaultKey : initialUserKey);
      setSelectedRole(p.role);
      setUserIdInput(roleEntry ? roleEntry.defaultId : p.id);
      setAuthMode('otp');
      setErrorMessage('');
    }
  }, [initialUserKey]);

  const handleSelectRoleConfig = (config: RoleConfig) => {
    setSelectedRole(config.role);
    setTargetUserKey(config.defaultKey);
    setUserIdInput(config.defaultId);
    setOtpInput('');
    setPasswordInput('');
    setMpinInput('');
    setErrorMessage('');
    setSuccessNotice('');
    setAuthMode('otp');
  };

  const resolveUserKeyFromInput = (): string | null => {
    const raw = userIdInput.trim().toLowerCase();
    if (!raw) return null;

    // Match by profile ID, profile email, or demo email alias
    const byProfile = Object.keys(USER_PROFILES).find(
      (k) =>
        USER_PROFILES[k].id.toLowerCase() === raw ||
        (USER_PROFILES[k].email && USER_PROFILES[k].email.toLowerCase() === raw)
    );
    if (byProfile) return byProfile;

    const byRoleConfig = DEMO_ROLE_ACCOUNTS.find(
      (r) => r.defaultId.toLowerCase() === raw || r.defaultEmail.toLowerCase() === raw
    );
    if (byRoleConfig) return byRoleConfig.defaultKey;

    return targetUserKey;
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessNotice('');
    setIsGoogleLoading(true);
    try {
      const session = await AuthService.signInWithGoogle();
      if (onAuthSessionResolved) {
        onAuthSessionResolved(session);
      } else if (session.registered && (session.user as any)?.userKey) {
        onLoginSuccess((session.user as any).userKey);
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google sign-in popup was closed before completing.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage('Browser blocked the Google sign-in popup. Please allow popups for this site and try again.');
      } else {
        setErrorMessage(err?.message || 'Google sign-in verification failed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!userIdInput.trim()) {
      setErrorMessage('Please enter your Institutional ID or registered school email.');
      return;
    }

    const resolvedKey = resolveUserKeyFromInput() || userIdInput.trim();
    const credentialMode: 'password' | 'otp' | 'mpin' =
      selectedRole === 'student' ? 'password' : authMode;
    const secretVal =
      credentialMode === 'password'
        ? passwordInput
        : credentialMode === 'otp'
        ? otpInput
        : mpinInput;

    if (credentialMode === 'password' && !secretVal.trim()) {
      setErrorMessage('Please enter your account password.');
      return;
    }
    if (credentialMode === 'otp' && secretVal.trim().length !== 6) {
      setErrorMessage('Enter the 6-digit numeric verification code from your authenticator.');
      return;
    }
    if (credentialMode === 'mpin' && secretVal.trim().length !== 6) {
      setErrorMessage('Enter your 6-digit Master PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await AuthService.signInWithCredentials({
        identifier: userIdInput.trim(),
        authMode: credentialMode,
        secretValue: secretVal.trim(),
        isDemoSession: false,
      });
      if (resolvedKey && USER_PROFILES[resolvedKey]) {
        onResetFailedAttempts(resolvedKey);
      }
      if (onAuthSessionResolved) {
        onAuthSessionResolved(session);
      } else if ((session.user as any)?.userKey) {
        onLoginSuccess((session.user as any).userKey);
      }
    } catch (err: any) {
      if (resolvedKey && USER_PROFILES[resolvedKey]) {
        onRecordFailedAttempt(resolvedKey);
      }
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFillDemo = async (config: RoleConfig, autoSignIn = false) => {
    setSelectedRole(config.role);
    setTargetUserKey(config.defaultKey);
    setUserIdInput(config.defaultId);
    setErrorMessage('');

    const isStudent = config.role === 'student';
    const secretVal = isStudent
      ? customPasswords[config.defaultKey] || DEFAULT_PASSWORDS[config.defaultKey] || 'Vivan@2026'
      : otpService.getActiveOtp(config.defaultKey).code;

    if (isStudent) {
      setPasswordInput(secretVal);
    } else {
      setAuthMode('otp');
      setOtpInput(secretVal);
    }

    if (autoSignIn) {
      setIsSubmitting(true);
      try {
        const session = await AuthService.signInWithCredentials({
          identifier: config.defaultId,
          authMode: isStudent ? 'password' : 'otp',
          secretValue: secretVal,
          isDemoSession: true,
        });
        onResetFailedAttempts(config.defaultKey);
        if (onAuthSessionResolved) {
          onAuthSessionResolved(session);
        } else {
          onLoginSuccess(config.defaultKey);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unable to launch demo workspace.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setSuccessNotice(
      isStudent
        ? `Populated demo credentials for ${config.accountName}. Click Sign In to continue.`
        : `Populated active 30s OTP for ${config.accountName}. Click Sign In to continue.`
    );
  };

  const activeConfig =
    DEMO_ROLE_ACCOUNTS.find((r) => r.role === selectedRole) || DEMO_ROLE_ACCOUNTS[0];
  const ActiveIcon = activeConfig.icon;

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-8 space-y-6 animate-view-enter">
      {/* Main Institutional Sign-In Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Deep Slate Institutional Header */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center">
              <img
                src="/assets/aistudio/Tattvaswayam_School_Logo_dd139741.png"
                alt="Tattvaswayam Future Academy Crest"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight text-white font-display truncate">
                Portal Sign In
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Tattvaswayam Open Learning &amp; Future Academy · Sampigehalli, Jakkur
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-amber-300 shrink-0">
            <Lock className="w-3.5 h-3.5" />
            <span>2FA Protected</span>
          </div>
        </div>

        {/* Google Account Sign-In Bar */}
        <div className="px-6 pt-6 sm:px-7 space-y-4">
          {expiredSessionMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{expiredSessionMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-sm transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Verifying Google Account with School Directory...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12z" />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="shrink mx-3 text-[11px] font-medium text-slate-400">
              or sign in with school credentials
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>
        </div>

        {/* Primary Realistic Sign-In Form */}
        <form onSubmit={handleFormSubmit} noValidate className="px-6 pb-6 sm:px-7 sm:pb-7 pt-2 space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200"
            >
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{successNotice}</span>
            </div>
          )}

          {/* Account Role Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-role-select"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Portal Workspace
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 pointer-events-none">
                <ActiveIcon className="w-4 h-4" />
              </div>
              <select
                id="login-role-select"
                value={selectedRole}
                onChange={(e) => {
                  const found = DEMO_ROLE_ACCOUNTS.find((r) => r.role === e.target.value);
                  if (found) handleSelectRoleConfig(found);
                }}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-600"
              >
                {DEMO_ROLE_ACCOUNTS.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.title} Portal — {r.accountName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Institutional ID / Email Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-user-id"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Institutional ID or Email Address
            </label>
            <input
              id="login-user-id"
              type="text"
              required
              autoComplete="username"
              value={userIdInput}
              onChange={(e) => {
                setUserIdInput(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder={activeConfig.defaultId}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Credential Input: Password (Student) vs OTP/MPIN (Staff/Faculty/Parent) */}
          {selectedRole === 'student' ? (
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Enter your student portal password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : authMode === 'otp' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-otp"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  6-Digit One-Time Password (OTP)
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  RFC 6238 TOTP
                </span>
              </div>
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/\D/g, ''));
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-600 text-slate-900 dark:text-slate-100"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Check your authenticator app for the active 30s code.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('mpin');
                    setErrorMessage('');
                  }}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <PhoneOff className="w-3 h-3" />
                  <span>Use MPIN instead</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-mpin"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  6-Digit Master PIN (MPIN)
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotMpinModal(true)}
                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                >
                  Forgot MPIN?
                </button>
              </div>
              <input
                id="login-mpin"
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                value={mpinInput}
                onChange={(e) => {
                  setMpinInput(e.target.value.replace(/\D/g, ''));
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter 6-digit Master PIN"
                className="w-full text-center tracking-widest font-mono text-lg py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-600 text-slate-900 dark:text-slate-100"
              />
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp');
                    setErrorMessage('');
                  }}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Use OTP code instead</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Sign-In Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 font-bold text-white bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to {activeConfig.title} Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Subtle Collapsible Demo Quick-Fill Drawer (1 Account Per Role) */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => setIsDemoDrawerOpen((prev) => !prev)}
            aria-expanded={isDemoDrawerOpen}
            className="w-full px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Demo Quick-Fill (One Account Per Role)</span>
            </span>
            {isDemoDrawerOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isDemoDrawerOpen && (
            <div className="px-6 pb-5 pt-1 space-y-3 animate-view-enter">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Click any role to sign in directly or fill its demo credentials.</span>
                <span className="font-mono">
                  Student PW: <strong className="text-slate-700 dark:text-slate-300">Vivan@2026</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DEMO_ROLE_ACCOUNTS.map((config) => {
                  const Icon = config.icon;
                  const isSelected = selectedRole === config.role;
                  return (
                    <div
                      key={config.role}
                      className={`p-2.5 rounded-xl border transition flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-amber-500/70'
                          : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {config.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {config.accountName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickFillDemo(config, false)}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-semibold transition cursor-pointer"
                        >
                          Fill
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickFillDemo(config, true)}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 text-white text-[10px] font-semibold transition cursor-pointer"
                        >
                          Enter
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot MPIN Recovery Modal */}
      {showForgotMpinModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-mpin-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div id="forgot-mpin-title" className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>Master PIN Recovery</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotMpinModal(false)}
                aria-label="Close modal"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Master PINs are managed security credentials issued during institutional registration.
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Contact Campus Administration
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Please consult <strong>Ms. Sandhya Gatti</strong> or <strong>Ms. Sangeetha</strong> at #2060, Sampigehalli, Jakkur, call{' '}
                  <span className="font-mono text-amber-700 dark:text-amber-400">+91-76250-03355</span>, or email{' '}
                  <span className="font-mono text-amber-700 dark:text-amber-400">
                    info@tattvaswayam.com
                  </span>{' '}
                  for a verified credential reset.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotMpinModal(false)}
              className="w-full py-2.5 bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
