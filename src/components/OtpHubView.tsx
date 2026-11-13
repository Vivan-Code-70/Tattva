/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Lock,
  ArrowRight,
  Search,
  ExternalLink,
  Globe,
  Sparkles,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { otpService, OtpRecord } from '../services/otpService';
import { USER_PROFILES } from '../services/storageService';
import { UserRole, UserProfile } from '../types';

interface OtpHubViewProps {
  currentUser?: UserProfile | null;
  onNavigateToLogin: (targetUserKey?: string) => void;
  onNavigateToHome?: () => void;
}

export const OtpHubView: React.FC<OtpHubViewProps> = ({
  currentUser,
  onNavigateToLogin,
  onNavigateToHome,
}) => {
  const isSuperAdmin = currentUser?.id === 'sandhya' || currentUser?.id === 'amrita';

  const [activeCodes, setActiveCodes] = useState<Record<string, OtpRecord>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => otpService.getSecondsRemaining());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedSecretKey, setCopiedSecretKey] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const [totpWebAddress, setTotpWebAddress] = useState<string>('');

  const accountKeys = [
    'sandhya',
    'amrita',
    'principal',
    'susmita',
    'bharthi',
    'vivan',
    'krishvika',
    'pvivan',
    'pkrishvika',
    'sai',
    'librarian',
    'driver',
  ];

  // Determine current web address
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setTotpWebAddress(`${origin}/totp`);
    }
  }, []);

  // Sync OTP records function
  const updateAllCodes = () => {
    const updated: Record<string, OtpRecord> = {};
    accountKeys.forEach((key) => {
      updated[key] = otpService.getActiveOtp(key);
    });
    setActiveCodes(updated);
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    updateAllCodes();

    // 1-second ticker that ONLY updates the secondsRemaining countdown.
    // The 6-digit code only changes when the 30-second window elapses!
    const timer = setInterval(() => {
      const remaining = otpService.getSecondsRemaining();
      setSecondsRemaining(remaining);

      // If we just entered a new 30-second window, refresh the 6-digit codes
      if (remaining === 30 || remaining === 29) {
        updateAllCodes();
      }
    }, 1000);

    const unsub = otpService.subscribe(() => {
      updateAllCodes();
    });

    return () => {
      clearInterval(timer);
      unsub();
    };
  }, [isSuperAdmin]);

  const handleRefreshSingleOtp = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRefreshingKey(key);
    setTimeout(() => setRefreshingKey(null), 500);

    const fresh = otpService.generateOtp(key);
    setActiveCodes((prev) => ({ ...prev, [key]: fresh }));
  };

  const handleCopyCode = (code: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopySecret = (secret: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(secret);
    setCopiedSecretKey(key);
    setTimeout(() => setCopiedSecretKey(null), 2000);
  };

  const handleCopyWebAddress = () => {
    if (!totpWebAddress) return;
    navigator.clipboard.writeText(totpWebAddress);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // If user is NOT Ms. Sandhya or Ms. Amrita, show elegant access restriction
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-amber-950/80 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Restricted Administrative System</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              Super Admin Authorization Required
            </h2>

            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-lg mx-auto leading-relaxed">
              This TOTP cryptographic site is strictly restricted. Only <strong>Ms. Sandhya</strong> (Director of Academics) and <strong>Ms. Amrita</strong> (Head of Faculty) are authorized to view and manage institutional two-factor codes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-left text-xs text-stone-600 dark:text-stone-300 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Institutional Policy Notice</span>
            </div>
            <p>
              Students, faculty members, parents, and security personnel enter their 30-second verification codes via their personal TOTP authenticators at login. Centralized OTP generation is only permitted under direct supervision of academic leadership.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigateToLogin('sandhya')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign In as Ms. Sandhya / Ms. Amrita</span>
            </button>

            <button
              onClick={() => onNavigateToLogin()}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs transition flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-700"
            >
              <span>Back to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredAccounts = accountKeys.filter((key) => {
    const profile = USER_PROFILES[key];
    if (!profile) return false;

    if (filterRole !== 'all' && profile.role !== filterRole) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = profile.name.toLowerCase().includes(q);
      const matchId = profile.id.toLowerCase().includes(q);
      const matchRole = profile.role.toLowerCase().includes(q);
      const matchTitle = profile.title?.toLowerCase().includes(q);
      return matchName || matchId || matchRole || matchTitle;
    }

    return true;
  });

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100));

  return (
    <div className="space-y-6">
      {/* Super Admin Executive Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-gradient-to-br from-stone-900 via-stone-850 to-orange-950 text-white shadow-xl border border-orange-500/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Administrator Exclusive: {currentUser?.name}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Institutional TOTP Dispatch Hub
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Live cryptographic verification tokens for all academy profiles. Codes remain strictly synchronized with portal sign-in and rotate smoothly every <strong>30 seconds</strong>.
            </p>
          </div>

          {/* 30-Second Synchronized Epoch Clock */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-10 h-10 transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-stone-700"
                      fill="transparent"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-orange-400 transition-all duration-1000 ease-linear"
                      fill="transparent"
                      strokeDasharray={100}
                      strokeDashoffset={100 - progressPercent}
                    />
                  </svg>
                  <span className="absolute font-mono text-xs font-black text-white">
                    {secondsRemaining}s
                  </span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-orange-300">30s Standard Window</div>
                  <div className="text-[10px] text-stone-400">RFC 6238 Synchronized</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToLogin()}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-md transition"
            >
              <span>Return to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Internal Web Address Link */}
      <div className="p-4 sm:p-5 rounded-3xl bg-orange-50/80 dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-orange-600" />
            <h3 className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              Administrative Direct Link
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
              Ms. Sandhya & Ms. Amrita Only
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 truncate max-w-full">
            <span className="text-orange-600 dark:text-orange-400 font-bold shrink-0">Direct URL:</span>
            <span className="truncate select-all">{totpWebAddress || `${typeof window !== 'undefined' ? window.location.origin : ''}/totp`}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyWebAddress}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-stone-750 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition shadow-xs shrink-0"
        >
          {copiedUrl ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-600">Address Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-stone-400" />
              <span>Copy Direct Link</span>
            </>
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-stone-900 rounded-2xl border border-orange-200/80 dark:border-amber-950 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search account name or role..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end text-xs">
          {(['all', 'admin', 'teacher', 'student', 'parent', 'security', 'driver'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1 rounded-xl font-bold capitalize transition ${
                filterRole === r
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((key) => {
          const profile = USER_PROFILES[key];
          const rec = activeCodes[key] || otpService.getActiveOtp(key);
          const isCopied = copiedKey === key;
          const isSecretCopied = copiedSecretKey === key;
          const isRefreshing = refreshingKey === key;

          return (
            <div
              key={key}
              className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-amber-950/80 shadow-xs hover:border-orange-400 dark:hover:border-orange-600 transition flex flex-col justify-between gap-4"
            >
              {/* Account Identity Header */}
              <div className="flex items-start justify-between gap-2 border-b border-orange-100 dark:border-stone-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                      {profile.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono">
                      {profile.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    {profile.title}
                  </div>
                </div>

                <button
                  type="button"
                  title="Generate new epoch code"
                  onClick={(e) => handleRefreshSingleOtp(key, e)}
                  className={`p-1.5 rounded-lg text-stone-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-stone-800 transition ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 6-Digit OTP Big Display */}
              <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-stone-850/80 border border-orange-100 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-500">
                  <span className="flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                    <span>30-Second Live Code</span>
                  </span>
                  <span className="font-mono text-orange-600 dark:text-orange-400">
                    {secondsRemaining}s left
                  </span>
                </div>

                <div className="text-center py-2 flex items-center justify-center gap-1.5">
                  {rec?.code ? (
                    rec.code.split('').map((digit, i) => (
                      <span
                        key={i}
                        className="w-8 h-10 rounded-lg bg-white dark:bg-stone-800 border border-orange-200 dark:border-stone-700 flex items-center justify-center font-mono font-black text-xl text-stone-900 dark:text-stone-100 shadow-2xs"
                      >
                        {digit}
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-sm text-stone-400">Computing 30s TOTP...</span>
                  )}
                </div>

                {/* 30-Second Expiry Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Secret Key for external authenticators */}
                <div className="pt-2 border-t border-orange-200/60 dark:border-stone-750 flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-stone-400">Secret:</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300">{rec.secret}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCopySecret(rec.secret, key, e)}
                    className="hover:text-orange-600 transition font-semibold"
                  >
                    {isSecretCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Copy Code & Proceed to Login */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(rec?.code || '', key, e)}
                  className="flex-1 py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-400" />
                      <span>Copy OTP</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToLogin(key)}
                  className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1"
                >
                  <span>Use in Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <p className="text-sm font-semibold text-stone-500">
            No accounts found matching &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterRole('all');
            }}
            className="mt-3 px-4 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
