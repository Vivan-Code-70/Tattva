import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Building,
  Bus,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  HeartHandshake,
  LifeBuoy,
  Navigation,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { ProtectedFeature, UserProfile } from '../../types';

interface RoleSwitcherBarProps {
  currentUser: UserProfile;
  allowedFeatures?: ProtectedFeature[];
  onSwitchRole: (userKey: string) => void;
  onNavigateTab: (tab: 'home' | 'campus' | 'transit' | 'study' | 'cal' | 'rep' | 'portal' | 'otp') => void;
}

const DEMO_ROLES = [
  { key: 'vivan', label: 'Student', name: 'Vivan Sharma', icon: GraduationCap },
  { key: 'pvivan', label: 'Parent', name: 'Parent of Vivan', icon: HeartHandshake },
  { key: 'susmita', label: 'Facilitator', name: 'Ms. Sushmitha', icon: Users },
  { key: 'divya', label: 'Multi-Role', name: 'Ms. Divya Dogra', icon: Users },
  { key: 'bharthi', label: 'Staff / Admin', name: 'Ms. Sangeetha', icon: LifeBuoy },
  { key: 'sandhya', label: 'Director', name: 'Ms. Sandhya Gatti', icon: Building },
  { key: 'principal', label: 'Centre Head', name: 'Ms. Amrita', icon: Award },
  { key: 'sai', label: 'Gate Staff', name: 'Mr. Sai', icon: ShieldCheck },
  { key: 'librarian', label: 'Librarian', name: 'Ms. Meenakshi S.', icon: BookOpen },
  { key: 'driver', label: 'Bus Driver', name: 'Mr. Manjunath G.', icon: Bus },
];

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  currentUser,
  allowedFeatures = [],
  onSwitchRole,
  onNavigateTab,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeEntry =
    DEMO_ROLES.find((r) => currentUser.userKey === r.key || currentUser.id.toLowerCase().includes(r.key)) ||
    DEMO_ROLES.find((r) => {
      if (currentUser.role === 'teacher') return r.key === 'susmita';
      if (currentUser.role === 'support') return r.key === 'bharthi';
      if (currentUser.role === 'security') return r.key === 'sai';
      if (currentUser.role === 'parent') return r.key === 'pvivan';
      if (currentUser.role === 'student') return r.key === 'vivan';
      return r.key === currentUser.role;
    });

  const canSeeBusTracker = allowedFeatures.includes('bus_tracker');

  return (
    <div className="fixed bottom-4 right-4 z-40 no-print flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]">
      {isExpanded && (
        <div
          role="dialog"
          aria-label="Switch Demo Role"
          className="w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-view-enter"
        >
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold tracking-tight">Switch Demo Role</p>
              <p className="text-[11px] text-slate-300">
                Issues a signed RBAC session for role verification
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              aria-label="Close role switcher"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
            {DEMO_ROLES.map((item) => {
              const Icon = item.icon;
              const isCurrent = activeEntry?.key === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSwitchRole(item.key);
                    setIsExpanded(false);
                  }}
                  className={`p-2 rounded-xl border text-left transition flex flex-col gap-1 ${
                    isCurrent
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isCurrent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    {isCurrent && (
                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold leading-tight truncate">{item.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Quick Jump:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onNavigateTab('portal');
                  setIsExpanded(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition whitespace-nowrap"
              >
                Workspace
              </button>
              {canSeeBusTracker && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab('transit');
                    setIsExpanded(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1 whitespace-nowrap"
                >
                  <Navigation className="w-3 h-3 text-amber-600" />
                  <span>Bus Tracker</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="px-3.5 py-2 rounded-full bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-2 text-xs font-semibold whitespace-nowrap"
      >
        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Switch Role</span>
        <span className="text-slate-400" aria-hidden="true">·</span>
        <span className="text-amber-300 font-bold max-w-[90px] truncate">
          {activeEntry?.label || currentUser.role}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
      </button>
    </div>
  );
};
