/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Moon,
  Sun,
  User,
  LogOut,
  KeyRound,
  Tv,
  Sparkles,
  Archive,
  Laptop,
} from 'lucide-react';
import { UserProfile, EmergencyLockdownState } from '../types';
import { ShieldAlert } from 'lucide-react';

interface HeaderProps {
  activeTab: 'home' | 'campus' | 'transit' | 'study' | 'cal' | 'rep' | 'portal' | 'otp';
  setActiveTab: (tab: 'home' | 'campus' | 'transit' | 'study' | 'cal' | 'rep' | 'portal' | 'otp') => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  isDark: boolean;
  themeMode?: 'system' | 'dark' | 'light';
  toggleTheme: () => void;
  onOpenOtpGenerator?: () => void;
  notificationCount: number;
  isProjectorMode?: boolean;
  toggleProjectorMode?: () => void;
  onOpenGuidedTour?: () => void;
  lockdown?: EmergencyLockdownState;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isDark,
  themeMode = 'system',
  toggleTheme,
  onOpenOtpGenerator,
  notificationCount,
  isProjectorMode = false,
  toggleProjectorMode,
  onOpenGuidedTour,
  lockdown,
}) => {
  const isSuperAdmin = currentUser?.id === 'sandhya' || currentUser?.id === 'amrita';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-orange-200/70 dark:border-amber-950/70 shadow-2xs transition-colors w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Academy Name */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-stone-850 p-1 flex items-center justify-center border border-orange-200/80 dark:border-stone-700 shadow-xs group-hover:scale-105 transition-all shrink-0">
            <img
              src="/assets/aistudio/Tattvaswayam_School_Logo_dd139741.png"
              alt="Tattvasayam Future Academy Official Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-wider text-orange-600 dark:text-orange-400 text-sm sm:text-base leading-none block font-mono">
                TATTVASAYAM
              </span>
              {lockdown?.active && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse shadow-xs">
                  <ShieldAlert className="w-3 h-3" />
                  <span>LOCKDOWN ACTIVE</span>
                </span>
              )}
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 tracking-wider hidden xs:block">
              Future Academy • Jakkur
            </span>
          </div>
        </div>

        {/* Navigation Links (Desktop/Tablet) */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'home'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-50/80 dark:hover:bg-stone-800'
            }`}
          >
            Academy
          </button>
          <button
            onClick={() => setActiveTab('campus')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'campus'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-50/80 dark:hover:bg-stone-800'
            }`}
          >
            Campus Hologram
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'transit'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-50/80 dark:hover:bg-stone-800'
            }`}
          >
            Live Transit
          </button>
          <button
            onClick={() => setActiveTab('study')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'study'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-50/80 dark:hover:bg-stone-800'
            }`}
          >
            AI Study Lab
          </button>
          <button
            onClick={() => setActiveTab('cal')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'cal'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-50/80 dark:hover:bg-stone-800'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('rep')}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === 'rep'
                ? 'bg-orange-600 text-white shadow-xs font-bold'
                : 'text-stone-700 dark:text-stone-300 hover:bg-orange-50/80 dark:hover:bg-stone-800'
            }`}
          >
            Reports
          </button>

          {/* OTP Authenticator Site: ONLY visible to Super Admins (Ms. Amrita & Ms. Sandhya) */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('otp')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'otp'
                  ? 'bg-orange-600 text-white shadow-xs font-bold'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-stone-800 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin OTP Hub</span>
            </button>
          )}
        </nav>

        {/* Right Action Tools: Portal, Admin OTP if authorized, Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Admin OTP Button (Restricted to Ms. Sandhya & Ms. Amrita) */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('otp')}
              title="Open Super Admin TOTP Authenticator"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-xs ${
                activeTab === 'otp'
                  ? 'border-orange-500 bg-orange-600 text-white'
                  : 'border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-stone-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-stone-750'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">Admin OTPs</span>
            </button>
          )}

          {/* Portal Button */}
          <button
            onClick={() => setActiveTab('portal')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
              activeTab === 'portal'
                ? 'bg-orange-600 text-white'
                : currentUser
                ? 'bg-orange-100 dark:bg-stone-800 text-orange-950 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-stone-700 border border-orange-300 dark:border-amber-900'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[85px] sm:max-w-[140px] truncate">
              {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
            </span>
            {notificationCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-orange-700 dark:bg-orange-600 dark:text-white font-mono font-bold">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Logout if authenticated */}
          {currentUser && (
            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 sm:p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-stone-800 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Guided Tour button */}
          {onOpenGuidedTour && (
            <button
              onClick={onOpenGuidedTour}
              title="Start Guided Presentation Tour"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-stone-850 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition text-xs font-bold flex items-center gap-1 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Tour</span>
            </button>
          )}

          {/* Download Project ZIP Archive */}
          <a
            href="/tattvasayam-future-academy-portal.zip"
            download="tattvasayam-future-academy-portal.zip"
            title="Download entire project code bundle (.zip)"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition text-xs font-bold flex items-center gap-1 shadow-2xs"
          >
            <Archive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xl:inline">Export Code</span>
          </a>

          {/* Projector / Big Screen Mode Toggle */}
          {toggleProjectorMode && (
            <button
              onClick={toggleProjectorMode}
              title={isProjectorMode ? "Switch to Standard Desktop View" : "Switch to Big-Screen Projector Mode"}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition text-xs font-bold flex items-center gap-1 shadow-2xs ${
                isProjectorMode
                  ? 'border-orange-500 bg-orange-600 text-white shadow-xs'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isProjectorMode ? 'Projector On' : 'Projector'}</span>
            </button>
          )}

          {/* Theme Toggle with Persistence & OS System Matching */}
          <button
            onClick={toggleTheme}
            title={
              themeMode === 'system'
                ? `System Theme: Matching OS (${isDark ? 'Dark' : 'Light'}) - Click for Dark`
                : themeMode === 'dark'
                ? 'Dark Theme: Click for Light'
                : 'Light Theme: Click to Match System OS'
            }
            className="p-1.5 sm:px-2 sm:py-1.5 text-stone-600 dark:text-stone-400 hover:bg-orange-50 dark:hover:bg-stone-800 rounded-xl transition flex items-center gap-1 border border-transparent hover:border-orange-200 dark:hover:border-stone-700"
          >
            {themeMode === 'system' ? (
              <>
                <Laptop className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="hidden xl:inline text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  Auto
                </span>
              </>
            ) : isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Subnav */}
      <div className="flex md:hidden items-center justify-around px-1 py-1.5 border-t border-orange-100 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 text-[11px] font-semibold text-stone-600 dark:text-stone-400 overflow-x-auto">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'home' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}
        >
          Academy
        </button>
        <button
          onClick={() => setActiveTab('campus')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'campus' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}
        >
          Hologram
        </button>
        <button
          onClick={() => setActiveTab('transit')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'transit' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}
        >
          Transit
        </button>
        <button
          onClick={() => setActiveTab('study')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'study' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}
        >
          AI Study
        </button>
        <button
          onClick={() => setActiveTab('cal')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'cal' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('rep')}
          className={`px-2 py-1 rounded-lg shrink-0 ${activeTab === 'rep' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}
        >
          Reports
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('otp')}
            className={`px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 ${activeTab === 'otp' ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}
          >
            <KeyRound className="w-3 h-3 text-orange-500" />
            <span>OTPs</span>
          </button>
        )}
      </div>
    </header>
  );
};
