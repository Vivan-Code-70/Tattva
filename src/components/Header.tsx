/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  User,
  LogOut,
  KeyRound,
  Compass,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import {
  UserProfile,
  EmergencyLockdownState,
  AuthSessionState,
  ProtectedFeature,
} from '../types';

export type NavTab = 'home' | 'campus' | 'transit' | 'study' | 'cal' | 'rep' | 'portal' | 'otp';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  authState: AuthSessionState;
  allowedFeatures: ProtectedFeature[];
  currentUser: UserProfile | null;
  unregisteredEmail?: string;
  onLogout: () => void;
  notificationCount: number;
  onOpenGuidedTour?: () => void;
  lockdown?: EmergencyLockdownState;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  authState,
  allowedFeatures,
  currentUser,
  unregisteredEmail,
  onLogout,
  notificationCount,
  onOpenGuidedTour,
  lockdown,
}) => {
  const isRegistered = authState === 'REGISTERED' && !!currentUser;
  const isUnregistered = authState === 'UNREGISTERED';
  const hasFeature = (feature: ProtectedFeature) => isRegistered && allowedFeatures.includes(feature);

  const navItems: Array<{
    id: 'home' | 'campus' | 'transit' | 'study' | 'cal' | 'rep';
    label: string;
    mobileLabel: string;
  }> = [
    { id: 'home', label: 'Our School', mobileLabel: 'School' },
    ...(isRegistered ? [{ id: 'campus' as const, label: 'Campus Map', mobileLabel: 'Campus' }] : []),
    ...(hasFeature('bus_tracker')
      ? [{ id: 'transit' as const, label: 'Bus Tracker', mobileLabel: 'Bus' }]
      : []),
    ...(hasFeature('homework')
      ? [{ id: 'study' as const, label: 'Homework', mobileLabel: 'Homework' }]
      : []),
    ...(hasFeature('calendar')
      ? [{ id: 'cal' as const, label: 'Calendar', mobileLabel: 'Calendar' }]
      : []),
    ...(hasFeature('reports')
      ? [{ id: 'rep' as const, label: 'Reports', mobileLabel: 'Reports' }]
      : []),
  ];

  const showOtpDirectory = hasFeature('otp_directory');

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E6E1D6] dark:border-slate-800 w-full no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Clean Single-Line School Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 rounded-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 p-1 flex items-center justify-center border border-[#E6E1D6] dark:border-slate-700 shrink-0">
            <img
              src="/assets/aistudio/Tattvaswayam_School_Logo_dd139741.png"
              alt="Tattvaswayam Future Academy Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-editorial font-bold tracking-tight text-[#182230] dark:text-white text-base sm:text-lg whitespace-nowrap">
            Tattvaswayam
          </span>
          {lockdown?.active && isRegistered && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white whitespace-nowrap">
              <ShieldAlert className="w-3 h-3" />
              <span>Safety Alert</span>
            </span>
          )}
        </button>

        {/* Zone 2: Clean Role-Filtered Navigation Links */}
        <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-5 text-[13px] font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#B45309] text-[#182230] dark:text-white font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-[#182230] dark:hover:text-white hover:border-[#D8D0C0] dark:hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {showOtpDirectory && (
            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`py-1.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'otp'
                  ? 'border-[#B45309] text-amber-800 dark:text-amber-400 font-semibold'
                  : 'border-transparent text-amber-800 dark:text-amber-400 hover:border-amber-500'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>OTP Directory</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onOpenGuidedTour && authState === 'UNAUTHENTICATED' && (
            <button
              type="button"
              onClick={onOpenGuidedTour}
              className="px-3 py-1.5 rounded-xl border border-[#D8D0C0] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#F4EFE6] dark:hover:bg-slate-700 text-[#182230] dark:text-slate-200 transition text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#B45309] dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Quick Demo Tour</span>
              <span className="sm:hidden">Tour</span>
            </button>
          )}

          {isUnregistered ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold max-w-[200px] truncate">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{unregisteredEmail || 'Unregistered Account'}</span>
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#182230] hover:bg-[#243247] text-white text-xs font-bold transition whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('portal')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'portal'
                    ? 'bg-[#B45309] text-white shadow-xs'
                    : isRegistered
                    ? 'bg-white dark:bg-slate-800 text-[#182230] dark:text-slate-100 hover:bg-[#F4EFE6] dark:hover:bg-slate-700 border border-[#D8D0C0] dark:border-slate-700'
                    : 'bg-[#182230] dark:bg-amber-600 text-white hover:bg-[#243247] dark:hover:bg-amber-500'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[170px] truncate">
                  {isRegistered ? currentUser!.name.split(' ')[0] : 'Sign In'}
                </span>
                {isRegistered && notificationCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-[#B45309] text-white font-mono font-bold tabular-nums">
                    {notificationCount}
                  </span>
                )}
              </button>

              {isRegistered && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compact Mobile & Tablet Subnav */}
      {navItems.length > 1 && (
        <div className="flex lg:hidden items-center justify-between px-2 py-1.5 border-t border-[#E6E1D6] dark:border-slate-800 bg-[#FAF9F6] dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-400 overflow-x-auto gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'text-[#182230] dark:text-white bg-[#F4EFE6] dark:bg-slate-800 font-bold'
                  : ''
              }`}
            >
              {item.mobileLabel}
            </button>
          ))}
          {showOtpDirectory && (
            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1 ${
                activeTab === 'otp'
                  ? 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-slate-800 font-bold'
                  : ''
              }`}
            >
              <KeyRound className="w-3 h-3 text-amber-700" />
              <span>OTPs</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
