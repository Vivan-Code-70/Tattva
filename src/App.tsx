import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Award,
  ChevronRight,
  Shield,
  Activity,
  Layers,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LifeBuoy,
  Bell,
  Bus,
  Check,
  Building,
  GraduationCap,
  Users,
  Compass,
  FileText,
  CreditCard,
  QrCode,
  Sliders,
  Tv,
  Printer,
} from 'lucide-react';
import { Header } from './components/Header';
import { CampusHologram } from './components/CampusHologram';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { AiStudyLabView } from './components/AiStudyLabView';
import { OtpHubView } from './components/OtpHubView';
import { OtpGeneratorModal } from './components/OtpGeneratorModal';
import { GuidedTourModal } from './components/GuidedTourModal';
import { LoginView } from './components/portal/LoginView';
import { StudentDashboard } from './components/portal/StudentDashboard';
import { TeacherDashboard } from './components/portal/TeacherDashboard';
import { AdminDashboard } from './components/portal/AdminDashboard';
import { PrincipalDashboard } from './components/portal/PrincipalDashboard';
import { SecurityDashboard } from './components/portal/SecurityDashboard';
import { SupportDashboard } from './components/portal/SupportDashboard';
import { ParentDashboard } from './components/portal/ParentDashboard';
import { LibrarianDashboard } from './components/portal/LibrarianDashboard';
import { DriverDashboard } from './components/portal/DriverDashboard';
import { LiveTransit } from './components/LiveTransit';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initGoogleCalendarAuth } from './services/googleCalendarService';
import { EmergencyLockdownOverlay } from './components/portal/EmergencyLockdownOverlay';

import {
  CalendarEvent,
  UserProfile,
  UserRole,
  TimetablePeriod,
  NoticeItem,
  CounselingRequest,
  PendingNfcTap,
  GateLogEntry,
  LeaveRequest,
  FeeTransaction,
  EmergencyLockdownState,
  BookItem,
  BookLoan,
  BookHoldRequest,
  TransportOptInRequest,
  PassengerCategory,
} from './types';
import { soundEffects } from './utils/audioChime';
import {
  AppState,
  StorageService,
  USER_PROFILES,
  SUBJECTS,
} from './services/storageService';
import { errorReportingService } from './services/errorService';
import { profilerService } from './services/profilerService';

export default function App() {
  const [state, setState] = useState<AppState>(() => StorageService.load());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isSuperAdmin = state.currentUser === 'sandhya' || state.currentUser === 'amrita';

  const [activeTab, setActiveTabState] = useState<'home' | 'campus' | 'transit' | 'study' | 'cal' | 'rep' | 'portal' | 'otp'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const s = new URLSearchParams(window.location.search);
      const h = window.location.hash.toLowerCase();
      if (p.includes('totp') || p.includes('otp') || s.get('page') === 'totp' || s.get('tab') === 'otp' || h.includes('totp') || h.includes('otp')) {
        return 'otp';
      }
      if (p.includes('study') || p.includes('quiz') || p.includes('assistant') || s.get('tab') === 'study' || h.includes('study')) {
        return 'study';
      }
      if (p.includes('portal') || s.get('tab') === 'portal' || h.includes('portal')) {
        return 'portal';
      }
      if (p.includes('campus') || s.get('tab') === 'campus') {
        return 'campus';
      }
      if (p.includes('transit') || p.includes('bus') || s.get('tab') === 'transit' || h.includes('transit')) {
        return 'transit';
      }
      if (p.includes('cal') || s.get('tab') === 'cal') {
        return 'cal';
      }
      if (p.includes('rep') || s.get('tab') === 'rep') {
        return 'rep';
      }
    }
    return 'home';
  });

  const setActiveTab = (tab: 'home' | 'campus' | 'transit' | 'study' | 'cal' | 'rep' | 'portal' | 'otp') => {
    if (tab === 'otp' && !isSuperAdmin) {
      showToast('Restricted: The OTP Directory is accessible only to Ms. Sandhya & Ms. Amrita.');
      setActiveTabState('portal');
      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState({ tab: 'portal' }, '', '/portal');
      }
      return;
    }

    setActiveTabState(tab);
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      const targetPath = tab === 'otp' ? '/totp' : tab === 'home' ? '/' : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('totp') || p.includes('otp')) {
        if (state.currentUser === 'sandhya' || state.currentUser === 'amrita') {
          setActiveTabState('otp');
        } else {
          setActiveTabState('portal');
        }
      } else if (p.includes('study')) {
        setActiveTabState('study');
      } else if (p.includes('portal')) {
        setActiveTabState('portal');
      } else if (p.includes('campus')) {
        setActiveTabState('campus');
      } else if (p.includes('transit') || p.includes('bus')) {
        setActiveTabState('transit');
      } else if (p.includes('cal')) {
        setActiveTabState('cal');
      } else if (p.includes('rep')) {
        setActiveTabState('rep');
      } else {
        setActiveTabState('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.currentUser]);

  const [preselectedLoginUser, setPreselectedLoginUser] = useState<string>('vivan');

  // Theme Mode: 'system' | 'dark' | 'light' persisted in localStorage
  const [themeMode, setThemeMode] = useState<'system' | 'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tattvasayam_theme_mode');
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    }
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Effective isDark state: if 'system', follows systemPrefersDark; otherwise explicit choice
  const isDark = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';

  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState<boolean>(false);
  const [isOtpGeneratorOpen, setIsOtpGeneratorOpen] = useState<boolean>(false);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Calendar Auth listener
  useEffect(() => {
    const unsubscribe = initGoogleCalendarAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync state to storage (debounced)
  useEffect(() => {
    StorageService.save(state);
  }, [state]);

  // Real-time Emergency Lockdown Sync (Server SSE + Cross-tab BroadcastChannel + Storage)
  useEffect(() => {
    // 1. Initial fetch from backend
    fetch('/api/lockdown')
      .then((res) => res.json())
      .then((data) => {
        if (data?.lockdown) {
          setState((prev) => ({
            ...prev,
            emergencyLockdown: { ...prev.emergencyLockdown, ...data.lockdown },
          }));
        }
      })
      .catch(() => {});

    // 2. BroadcastChannel for zero-latency multi-tab updates
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('tattvasayam_lockdown');
        bc.onmessage = (event) => {
          if (event.data?.type === 'LOCKDOWN_UPDATE' && event.data.lockdown) {
            setState((prev) => ({
              ...prev,
              emergencyLockdown: event.data.lockdown,
            }));
          }
        };
      }
    } catch (e) {}

    // 3. Fallback Storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tattvasayam_future_academy_v1_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.emergencyLockdown) {
            setState((prev) => ({
              ...prev,
              emergencyLockdown: parsed.emergencyLockdown,
            }));
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Server-Sent Events listener for real-time remote updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/errors/stream');
      eventSource.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if ((payload.type === 'LOCKDOWN_UPDATE' || payload.type === 'CONNECTED') && payload.lockdown) {
            setState((prev) => ({
              ...prev,
              emergencyLockdown: payload.lockdown,
            }));
          }
        } catch (err) {}
      };
    } catch (e) {}

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      if (eventSource) eventSource.close();
    };
  }, []);

  // System OS theme preference listener + Cross-tab theme synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    // Modern and legacy event listener fallback
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // @ts-ignore
      mediaQuery.addListener(handleSystemThemeChange);
    }

    // Cross-tab theme change synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tattvasayam_theme_mode' && e.newValue) {
        if (e.newValue === 'dark' || e.newValue === 'light' || e.newValue === 'system') {
          setThemeMode(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        // @ts-ignore
        mediaQuery.removeListener(handleSystemThemeChange);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sync theme to DOM and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    try {
      localStorage.setItem('tattvasayam_theme_mode', themeMode);
    } catch (e) {}
  }, [isDark, themeMode]);

  // Projector / Big Screen Mode toggle
  useEffect(() => {
    if (isProjectorMode) {
      document.body.classList.add('projector-mode');
    } else {
      document.body.classList.remove('projector-mode');
    }
  }, [isProjectorMode]);

  // Sync current user with error telemetry
  useEffect(() => {
    if (state.currentUser) {
      const u = USER_PROFILES[state.currentUser];
      errorReportingService.setCurrentUser({ id: state.currentUser, role: u?.role || 'user' });
    } else {
      errorReportingService.setCurrentUser(null);
    }
  }, [state.currentUser]);

  // 10-minute Inactivity Auto-Logout
  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (state.currentUser) {
      idleTimerRef.current = setTimeout(() => {
        if (state.currentUser) {
          const u = USER_PROFILES[state.currentUser];
          errorReportingService.report({
            message: `User session timed out after 10 min inactivity: ${u?.name || state.currentUser}`,
            category: 'AUTH_SECURITY',
            severity: 'INFO',
          });
          handleLogout();
          showToast('Session expired due to inactivity. Please sign in again.');
        }
      }, 10 * 60 * 1000);
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleUserActivity = () => resetIdleTimer();
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [state.currentUser]);

  const currentUserProfile = state.currentUser ? USER_PROFILES[state.currentUser] : null;
  const currentNotifications = state.currentUser ? state.notifications[state.currentUser] || [] : [];

  // Log in as pre-configured user
  const handleLoginSuccess = (userKey: string) => {
    const u = USER_PROFILES[userKey];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setState((prev) => ({
      ...prev,
      currentUser: userKey,
      failedAttempts: { ...prev.failedAttempts, [userKey]: 0 },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: timeStr,
          action: `Successful sign-in: ${u.name} (${u.role.toUpperCase()})`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    setActiveTab('portal');
    showToast(`Welcome back, ${u.name}!`);
  };

  const handleLogout = () => {
    if (state.currentUser) {
      const u = USER_PROFILES[state.currentUser];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setState((prev) => ({
        ...prev,
        currentUser: null,
        auditLogs: [
          {
            id: `AUD-${Date.now()}`,
            time: timeStr,
            action: `User signed out: ${u?.name || 'Unknown'}`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      }));
    } else {
      setState((prev) => ({ ...prev, currentUser: null }));
    }
    setActiveTab('home');
    showToast('Signed out of academic workspace.');
  };

  // Student Tap at Gate 2 (Foolproof Security: Awaiting Physical Clearance)
  const handleDigitalIdTap = () => {
    if (!state.currentUser) return;
    const u = USER_PROFILES[state.currentUser];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = `NFC-${Date.now().toString().slice(-5)}`;

    const newPendingTap: PendingNfcTap = {
      id,
      studentKey: state.currentUser,
      studentName: u.name,
      grade: u.title,
      badgeId: `TAT-2026-${u.id.toUpperCase()}`,
      gateNumber: 'Gate 2 (Turnstile B)',
      time: timeStr,
      timestamp: Date.now(),
      status: 'PENDING',
    };

    setState((prev) => {
      const saiNotifs = prev.notifications.sai || [];
      const myNotifs = prev.notifications[state.currentUser!] || [];

      return {
        ...prev,
        pendingNfcTaps: [newPendingTap, ...prev.pendingNfcTaps],
        notifications: {
          ...prev.notifications,
          [state.currentUser!]: [
            `Gate 2 NFC tap received at ${timeStr}. Turnstile held locked until Officer Sai clears entry.`,
            ...myNotifs,
          ],
          sai: [
            `⚠️ Turnstile Hold: ${u.name} (${u.title}) tapped badge at Gate 2. Physical clearance required.`,
            ...saiNotifs,
          ],
        },
        auditLogs: [
          {
            id: `AUD-${Date.now()}`,
            time: timeStr,
            action: `Gate 2 NFC badge tap by ${u.name} (${u.title}) — Awaiting Officer approval`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      };
    });

    soundEffects.playNoticeChime();
    showToast(`NFC tap recognized! Gate 2 turnstile held locked pending Security Officer approval.`);
  };

  // Foolproof Security Approval Handler
  const handleApproveNfcTap = (tapId: string) => {
    const tap = state.pendingNfcTaps.find((t) => t.id === tapId);
    if (!tap) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newGateEntry: GateLogEntry = {
      id: `LOG-${Date.now().toString().slice(-5)}`,
      name: tap.studentName,
      category: 'Student',
      grade: tap.grade,
      time: timeStr,
      timestamp: Date.now(),
      verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
      status: 'APPROVED',
      gate: tap.gateNumber,
    };

    const parentKey = `p${tap.studentKey}`;
    const todayStr = '2026-10-31';

    setState((prev) => {
      const parentNotifs = prev.notifications[parentKey] || [];
      const studentNotifs = prev.notifications[tap.studentKey] || [];

      // Record student attendance for today as PRESENT
      const existingRecord = prev.attendanceRecords.find(
        (a) => a.studentKey === tap.studentKey && a.date === todayStr
      );
      const updatedAttendance = existingRecord
        ? prev.attendanceRecords.map((a) =>
            a.id === existingRecord.id
              ? { ...a, status: 'PRESENT' as const, markedBy: 'Mr. Sai - Gate 2 Security Clearance' }
              : a
          )
        : [
            {
              id: `ATT-${Date.now().toString().slice(-5)}`,
              date: todayStr,
              studentKey: tap.studentKey,
              status: 'PRESENT' as const,
              markedBy: 'Mr. Sai - Gate 2 Security Clearance',
              remarks: 'Physical NFC entry verified at Gate 2 Turnstile',
            },
            ...prev.attendanceRecords,
          ];

      return {
        ...prev,
        pendingNfcTaps: prev.pendingNfcTaps.map((t) =>
          t.id === tapId
            ? { ...t, status: 'APPROVED' as const, verifiedBy: 'Mr. Sai - Gate 2 Security Officer' }
            : t
        ),
        gateLogs: [newGateEntry, ...prev.gateLogs],
        attendanceRecords: updatedAttendance,
        notifications: {
          ...prev.notifications,
          [tap.studentKey]: [
            `Gate 2 physical entry APPROVED by Security Officer Sai at ${timeStr}. Turnstile unlocked!`,
            ...studentNotifs,
          ],
          [parentKey]: [
            `Campus arrival confirmed: ${tap.studentName} verified and cleared through Gate 2 by Security at ${timeStr}.`,
            ...parentNotifs,
          ],
        },
        auditLogs: [
          {
            id: `AUD-${Date.now()}`,
            time: timeStr,
            action: `Gate 2 Turnstile UNLOCKED: ${tap.studentName} approved by Officer Sai`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      };
    });

    soundEffects.playSuccessChime();
    showToast(`Security clearance approved! Gate 2 turnstile unlocked for ${tap.studentName}.`);
  };

  // Foolproof Security Denial Handler
  const handleDenyNfcTap = (tapId: string, reason?: string) => {
    const tap = state.pendingNfcTaps.find((t) => t.id === tapId);
    if (!tap) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setState((prev) => {
      const studentNotifs = prev.notifications[tap.studentKey] || [];
      return {
        ...prev,
        pendingNfcTaps: prev.pendingNfcTaps.map((t) =>
          t.id === tapId
            ? {
                ...t,
                status: 'DENIED' as const,
                verifiedBy: 'Mr. Sai',
                notes: reason || 'Manual identity check required',
              }
            : t
        ),
        notifications: {
          ...prev.notifications,
          [tap.studentKey]: [
            `Gate 2 entry denied: ${reason || 'Please proceed to Security Kiosk for physical badge verification.'}`,
            ...studentNotifs,
          ],
        },
        auditLogs: [
          {
            id: `AUD-${Date.now()}`,
            time: timeStr,
            action: `Gate 2 entry DENIED for ${tap.studentName} by Officer Sai`,
            severity: 'warn',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      };
    });

    showToast(`Entry request for ${tap.studentName} declined.`);
  };

  // Simulate incoming tap from Security Dashboard for live presentation
  const handleSimulateNfcTapForStudent = (studentKey: string = 'vivan') => {
    const u = USER_PROFILES[studentKey] || USER_PROFILES.vivan;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = `NFC-${Date.now().toString().slice(-5)}`;

    const newPendingTap: PendingNfcTap = {
      id,
      studentKey,
      studentName: u.name,
      grade: u.title,
      badgeId: `TAT-2026-${u.id.toUpperCase()}`,
      gateNumber: 'Gate 2 (Turnstile B)',
      time: timeStr,
      timestamp: Date.now(),
      status: 'PENDING',
    };

    setState((prev) => ({
      ...prev,
      pendingNfcTaps: [newPendingTap, ...prev.pendingNfcTaps],
      notifications: {
        ...prev.notifications,
        sai: [
          `⚠️ Turnstile Hold: ${u.name} (${u.title}) tapped badge at Gate 2. Physical clearance required.`,
          ...(prev.notifications.sai || []),
        ],
      },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: timeStr,
          action: `Gate 2 NFC tap submitted by ${u.name} (${u.title}) — Pending Officer approval`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));

    soundEffects.playNoticeChime();
    showToast(`Incoming badge tap from ${u.name} at Gate 2! Review and authorize turnstile.`);
  };

  // Gate attendance mark
  const handleMarkAttendance = (name: string, category: string, grade?: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setState((prev) => ({
      ...prev,
      gateLogs: [
        {
          id: `LOG-${Date.now().toString().slice(-5)}`,
          name,
          category,
          grade,
          time: timeStr,
          timestamp: Date.now(),
        },
        ...prev.gateLogs,
      ],
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: timeStr,
          action: `Gate 2 attendance recorded: ${name} (${category})`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Attendance recorded for ${name}.`);
  };

  // Emergency Lockdown Toggle Handler
  const handleToggleLockdown = async (active: boolean, reason?: string) => {
    const authorityName =
      currentUserProfile?.name ||
      (state.currentUser === 'principal' ? 'Dr. B. R. Shenoy (Principal)' : 'Mr. Sai (Gate Security)');
    const authorityRole = currentUserProfile?.role || (state.currentUser === 'principal' ? 'principal' : 'security');
    const now = Date.now();

    const updatedLockdown: EmergencyLockdownState = {
      active,
      triggeredBy: active ? authorityName : state.emergencyLockdown?.triggeredBy || authorityName,
      triggeredRole: active ? authorityRole : state.emergencyLockdown?.triggeredRole || authorityRole,
      timestamp: active ? now : state.emergencyLockdown?.timestamp || now,
      reason: reason || (active ? 'Immediate Campus Security & Safety Protocol' : state.emergencyLockdown?.reason),
      location: 'All Blocks (A, B, C) & Grounds, Jakkur Campus',
      instructions:
        'Lock all classroom doors immediately. Remain away from windows. Turn off lights. Maintain complete silence. Stay in place until official ALL-CLEAR from Principal or Campus Security.',
      resolvedAt: active ? undefined : now,
    };

    // Update local state and audit log
    setState((prev) => ({
      ...prev,
      emergencyLockdown: updatedLockdown,
      auditLogs: [
        {
          id: `AUD-LOCKDOWN-${now}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: active
            ? `EMERGENCY LOCKDOWN INITIATED by ${updatedLockdown.triggeredBy}: "${updatedLockdown.reason}"`
            : `EMERGENCY LOCKDOWN LIFTED by ${authorityName} (ALL CLEAR ISSUED)`,
          severity: active ? 'critical' : 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));

    // Post to server backend
    try {
      await fetch('/api/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLockdown),
      });
    } catch (e) {
      console.warn('Failed to sync lockdown to server:', e);
    }

    // Broadcast across tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('tattvasayam_lockdown');
        bc.postMessage({ type: 'LOCKDOWN_UPDATE', lockdown: updatedLockdown });
        bc.close();
      }
    } catch (e) {}

    // Audio & Toast Feedback
    if (active) {
      soundEffects.playLockdownSiren();
      showToast('🚨 EMERGENCY LOCKDOWN INITIATED: Full-screen warning deployed across all student & teacher sessions.');
    } else {
      soundEffects.playAllClearChime();
      showToast('✅ ALL CLEAR: Campus Emergency Lockdown lifted. Normal schedule restored.');
    }
  };

  // Assignments
  const handleToggleAssignment = (index: number) => {
    if (!state.currentUser) return;
    const studentKey = state.currentUser.toLowerCase().includes('vivan') ? 'vivan' : 'krishvika';
    setState((prev) => {
      const copy = [...prev.assignments];
      const asg = copy[index];
      const current = asg.done[studentKey];
      asg.done[studentKey] = !current;
      return { ...prev, assignments: copy };
    });
  };

  const handlePublishAssignment = (subject: string, title: string, due: string) => {
    setState((prev) => {
      const newAsg = {
        id: `ASG-${Date.now().toString().slice(-4)}`,
        subject,
        title,
        due,
        by: currentUserProfile?.name || 'Faculty',
        done: {},
      };

      const vivanNotifs = prev.notifications.vivan || [];
      const krishvikaNotifs = prev.notifications.krishvika || [];

      return {
        ...prev,
        assignments: [newAsg, ...prev.assignments],
        notifications: {
          ...prev.notifications,
          vivan: [`New assignment: ${subject} - ${title} (Due: ${due})`, ...vivanNotifs],
          krishvika: [`New assignment: ${subject} - ${title} (Due: ${due})`, ...krishvikaNotifs],
        },
      };
    });
    showToast(`Assignment "${title}" broadcasted to student portals.`);
  };

  // Counseling
  const handleBookCounseling = (
    counselor: string,
    date: string,
    mode: string,
    agenda: string
  ) => {
    if (!state.currentUser) return;
    const id = `CNS-${Math.floor(100 + Math.random() * 900)}`;
    const newReq: CounselingRequest = {
      id,
      by: state.currentUser,
      who: counselor || 'amrita',
      date,
      mode,
      agenda,
      status: 'PENDING',
    };

    setState((prev) => ({
      ...prev,
      counseling: [newReq, ...prev.counseling],
      notifications: {
        ...prev.notifications,
        sandhya: [
          `New counseling booking ${id} submitted by ${currentUserProfile?.name || state.currentUser}: "${agenda}"`,
          ...(prev.notifications.sandhya || []),
        ],
      },
    }));
    showToast(`Counseling appointment ${id} requested with ${counselor || 'Director'} for ${date}.`);
  };

  const handleUpdateCounselingStatus = (
    id: string,
    status: 'ACCEPTED' | 'POSTPONED' | 'REJECTED',
    postponedDate?: string
  ) => {
    setState((prev) => {
      const copy = prev.counseling.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status,
            date: postponedDate || c.date,
          };
        }
        return c;
      });

      const req = prev.counseling.find((c) => c.id === id);
      const studentNotifs = req ? prev.notifications[req.by] || [] : [];

      return {
        ...prev,
        counseling: copy,
        notifications: req
          ? {
              ...prev.notifications,
              [req.by]: [
                `Counseling session ${id} marked ${status}${postponedDate ? ` (Rescheduled to ${postponedDate})` : ''} by administration.`,
                ...studentNotifs,
              ],
            }
          : prev.notifications,
      };
    });
    showToast(`Counseling request ${id} updated to ${status}.`);
  };

  // Fees Checkout & Payment
  const handlePayFee = (index: number) => {
    const studentKey =
      currentUserProfile?.role === 'student'
        ? state.currentUser!
        : currentUserProfile?.child || 'vivan';

    setState((prev) => {
      const currentArr = [...(prev.feesPaid[studentKey] || [false, false, false, false])];
      currentArr[index] = true;

      let updatedTransportRequests = prev.transportRequests;
      let updatedBusRoute = prev.busRoute;

      if (index === 2) {
        const paymentRef = `REF-TR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const paidAt = new Date().toISOString().split('T')[0];
        updatedTransportRequests = prev.transportRequests.map((r) =>
          r.userKey.toLowerCase() === studentKey.toLowerCase() && r.status === 'APPROVED'
            ? { ...r, isFeePaid: true, paidAt, paymentRef }
            : r
        );
        updatedBusRoute = {
          ...prev.busRoute,
          stops: prev.busRoute.stops.map((stop) => ({
            ...stop,
            students: (stop.students || []).map((st) =>
              st.userKey?.toLowerCase() === studentKey.toLowerCase() ||
              st.name.toLowerCase() === (USER_PROFILES[studentKey]?.name || '').toLowerCase()
                ? { ...st, transportFeePaid: true }
                : st
            ),
          })),
        };
      }

      return {
        ...prev,
        feesPaid: {
          ...prev.feesPaid,
          [studentKey]: currentArr,
        },
        transportRequests: updatedTransportRequests,
        busRoute: updatedBusRoute,
      };
    });
    showToast(`Payment processed successfully! Official fee receipt issued.`);
  };

  // Bus Transport Opt-In Request
  const handleRequestTransport = (payload: {
    userKey: string;
    userName: string;
    userRole: UserRole;
    stopId: number;
    stopName: string;
    tripType: 'both' | 'morning' | 'evening';
    remarks?: string;
  }) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const reqId = `TR-OPT-${Math.floor(200 + Math.random() * 799)}`;
    const feeAmount = payload.userRole === 'student' ? 12000 : 6000;
    const newReq: TransportOptInRequest = {
      id: reqId,
      userKey: payload.userKey,
      userName: payload.userName,
      userRole: payload.userRole,
      routeNumber: state.busRoute.routeNumber || 'Route 14',
      stopName: payload.stopName,
      stopId: payload.stopId,
      tripType: payload.tripType,
      status: 'PENDING',
      requestedAt: new Date().toISOString().split('T')[0],
      feeAmount,
      isFeePaid: false,
      remarks: payload.remarks,
    };

    setState((prev) => ({
      ...prev,
      transportRequests: [
        newReq,
        ...prev.transportRequests.filter(
          (r) => r.userKey.toLowerCase() !== payload.userKey.toLowerCase()
        ),
      ],
      notifications: {
        ...prev.notifications,
        bharthi: [
          `New bus opt-in request ${reqId} from ${payload.userName} (${payload.userRole}) for ${payload.stopName}.`,
          ...(prev.notifications.bharthi || []),
        ],
        sandhya: [
          `Bus opt-in approval needed: ${payload.userName} (${payload.stopName}, ₹${feeAmount.toLocaleString('en-IN')}).`,
          ...(prev.notifications.sandhya || []),
        ],
      },
      auditLogs: [
        {
          id: `AUD-TR-${Date.now()}`,
          time: timeStr,
          action: `Transport opt-in request ${reqId} submitted by ${payload.userName} (${payload.stopName})`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Bus opt-in request ${reqId} sent to Coordinator & Admin for approval.`);
  };

  // Coordinator / Admin Decision on Bus Opt-In
  const handleUpdateTransportRequestStatus = (
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
    allocatedSeat?: string
  ) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setState((prev) => {
      const targetReq = prev.transportRequests.find((r) => r.id === requestId);
      if (!targetReq) return prev;

      const seat = allocatedSeat || targetReq.allocatedSeat || '14B';
      const updatedRequests = prev.transportRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status,
              allocatedSeat: status === 'APPROVED' ? seat : undefined,
            }
          : r
      );

      let updatedBusRoute = prev.busRoute;
      if (status === 'APPROVED') {
        const category: PassengerCategory =
          targetReq.userRole === 'student' || targetReq.userRole === 'parent'
            ? 'student'
            : targetReq.userRole === 'teacher'
            ? 'teacher'
            : targetReq.userRole === 'admin' || targetReq.userRole === 'principal'
            ? 'admin'
            : 'staff';
        const profile = USER_PROFILES[targetReq.userKey];
        let addedCount = 0;

        const updatedStops = prev.busRoute.stops.map((stop, idx) => {
          const matchesStop =
            stop.id === targetReq.stopId ||
            stop.name.toLowerCase().includes(targetReq.stopName.toLowerCase()) ||
            (idx === 2 && !prev.busRoute.stops.some((s) => s.id === targetReq.stopId));
          if (!matchesStop) return stop;

          const existingStudents = stop.students || [];
          const alreadyInStop = existingStudents.some(
            (st) =>
              st.userKey?.toLowerCase() === targetReq.userKey.toLowerCase() ||
              st.name.toLowerCase() === targetReq.userName.toLowerCase()
          );

          if (alreadyInStop) {
            return {
              ...stop,
              students: existingStudents.map((st) =>
                st.userKey?.toLowerCase() === targetReq.userKey.toLowerCase() ||
                st.name.toLowerCase() === targetReq.userName.toLowerCase()
                  ? { ...st, optedTransport: true, seatNumber: seat, transportFeePaid: targetReq.isFeePaid }
                  : st
              ),
            };
          }

          addedCount += 1;
          return {
            ...stop,
            students: [
              ...existingStudents,
              {
                id: profile?.id || `BUS-${targetReq.userKey.toUpperCase()}`,
                name: targetReq.userName,
                grade: profile?.title || targetReq.userRole,
                category,
                department: profile?.title || targetReq.userRole,
                userKey: targetReq.userKey,
                stopId: stop.id || targetReq.stopId,
                stopName: stop.name,
                status: 'waiting' as const,
                seatNumber: seat,
                optedTransport: true,
                transportFeePaid: targetReq.isFeePaid,
              },
            ],
          };
        });

        updatedBusRoute = {
          ...prev.busRoute,
          stops: updatedStops,
          totalStudentsCount: (prev.busRoute.totalStudentsCount || 0) + addedCount,
        };
      }

      const parentKey =
        targetReq.userKey === 'vivan'
          ? 'pvivan'
          : targetReq.userKey === 'krishvika'
          ? 'pkrishvika'
          : null;
      const decisionText =
        status === 'APPROVED'
          ? `Bus transport opt-in ${requestId} APPROVED for ${targetReq.userName} (${targetReq.stopName}, Seat ${seat}). Transport fee ₹${targetReq.feeAmount.toLocaleString('en-IN')} is now payable.`
          : `Bus transport opt-in ${requestId} declined by administration. No transport fee billed.`;

      const nextNotifications = {
        ...prev.notifications,
        [targetReq.userKey]: [decisionText, ...(prev.notifications[targetReq.userKey] || [])],
      };
      if (parentKey) {
        nextNotifications[parentKey] = [decisionText, ...(prev.notifications[parentKey] || [])];
      }

      return {
        ...prev,
        transportRequests: updatedRequests,
        busRoute: updatedBusRoute,
        notifications: nextNotifications,
        auditLogs: [
          {
            id: `AUD-TR-${Date.now()}`,
            time: timeStr,
            action: `Transport request ${requestId} (${targetReq.userName}) marked ${status}${status === 'APPROVED' ? ` • Seat ${seat}` : ''}`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      };
    });

    showToast(
      status === 'APPROVED'
        ? `Transport request ${requestId} approved & transport fee unlocked.`
        : `Transport request ${requestId} declined.`
    );
  };

  // Conditional Transport Fee Payment (Opted & Approved Users Only)
  const handlePayTransportFee = (
    requestId: string,
    method: FeeTransaction['paymentMethod']
  ) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const paidDate = new Date().toISOString().split('T')[0];
    const paymentRef = `REF-TR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    setState((prev) => {
      const targetReq = prev.transportRequests.find((r) => r.id === requestId);
      if (!targetReq) return prev;

      const updatedRequests = prev.transportRequests.map((r) =>
        r.id === requestId ? { ...r, isFeePaid: true, paidAt: paidDate, paymentRef } : r
      );

      const updatedBusRoute = {
        ...prev.busRoute,
        stops: prev.busRoute.stops.map((stop) => ({
          ...stop,
          students: (stop.students || []).map((st) =>
            st.userKey?.toLowerCase() === targetReq.userKey.toLowerCase() ||
            st.name.toLowerCase() === targetReq.userName.toLowerCase()
              ? { ...st, transportFeePaid: true }
              : st
          ),
        })),
      };

      const nextFeesPaid = { ...prev.feesPaid };
      if (nextFeesPaid[targetReq.userKey]) {
        const arr = [...nextFeesPaid[targetReq.userKey]];
        arr[2] = true;
        nextFeesPaid[targetReq.userKey] = arr;
      }

      const newTx: FeeTransaction = {
        id: `TX-TR-${Date.now().toString().slice(-6)}`,
        studentKey: targetReq.userKey,
        itemTitle: `Transport Fee — Route 14 (${targetReq.stopName})`,
        amount: targetReq.feeAmount,
        date: paidDate,
        paymentMethod: method,
        referenceId: paymentRef,
        status: 'SUCCESS',
      };

      return {
        ...prev,
        transportRequests: updatedRequests,
        busRoute: updatedBusRoute,
        feesPaid: nextFeesPaid,
        feeTransactions: [newTx, ...(prev.feeTransactions || [])],
        notifications: {
          ...prev.notifications,
          [targetReq.userKey]: [
            `Transport fee ₹${targetReq.feeAmount.toLocaleString('en-IN')} settled via ${method} (Ref: ${paymentRef}). Bus pass active.`,
            ...(prev.notifications[targetReq.userKey] || []),
          ],
        },
        auditLogs: [
          {
            id: `AUD-TRPAY-${Date.now()}`,
            time: timeStr,
            action: `Transport fee ₹${targetReq.feeAmount.toLocaleString('en-IN')} paid by ${targetReq.userName} via ${method}`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      };
    });

    showToast(`Transport fee settled via ${method}! Digital bus pass activated.`);
  };

  // Leave Applications (Administered exclusively by Guardian / Parent)
  const handleApplyLeave = (from: string, to: string, reason: string, studentKeyOverride?: string) => {
    if (!state.currentUser) return;
    const id = `LV-${Math.floor(100 + Math.random() * 900)}`;
    const studentKey =
      studentKeyOverride ||
      currentUserProfile?.child ||
      (currentUserProfile?.role === 'student' ? state.currentUser : 'vivan');
    const studentProfile = USER_PROFILES[studentKey] || currentUserProfile;
    const applicantName = currentUserProfile?.name || state.currentUser;

    const newLeave: LeaveRequest = {
      id,
      by: state.currentUser,
      studentKey,
      studentName: studentProfile?.name,
      from,
      to,
      reason,
      status: 'PENDING',
    };

    setState((prev) => ({
      ...prev,
      leaveRequests: [newLeave, ...prev.leaveRequests],
      notifications: {
        ...prev.notifications,
        sandhya: [
          `New leave application ${id} for ${studentProfile?.name} submitted by parent ${applicantName} (${from} to ${to})`,
          ...(prev.notifications.sandhya || []),
        ],
        [state.currentUser!]: [
          `Official leave request ${id} for ${studentProfile?.name} submitted for administrative approval.`,
          ...(prev.notifications[state.currentUser!] || []),
        ],
        ...(studentKey && studentKey !== state.currentUser
          ? {
              [studentKey]: [
                `Official leave request ${id} (${from} to ${to}) submitted on your behalf by your guardian.`,
                ...(prev.notifications[studentKey] || []),
              ],
            }
          : {}),
      },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Leave request ${id} filed for ${studentProfile?.name} by guardian ${applicantName}`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Leave application ${id} submitted to Directorate.`);
  };

  const handleUpdateLeaveStatus = (id: string, status: 'APPROVED' | 'DECLINED') => {
    setState((prev) => {
      const copy = prev.leaveRequests.map((l) => (l.id === id ? { ...l, status } : l));
      const leave = prev.leaveRequests.find((l) => l.id === id);
      const userNotifs = leave ? prev.notifications[leave.by] || [] : [];
      const studentKey = leave?.studentKey;
      const studentNotifs = studentKey && studentKey !== leave?.by ? prev.notifications[studentKey] || [] : [];

      return {
        ...prev,
        leaveRequests: copy,
        notifications: leave
          ? {
              ...prev.notifications,
              [leave.by]: [
                `Leave application ${id} for ${leave.studentName || 'student'} was ${status.toLowerCase()} by administration.`,
                ...userNotifs,
              ],
              ...(studentKey && studentKey !== leave.by
                ? {
                    [studentKey]: [
                      `Official leave application ${id} (${leave.from} to ${leave.to}) was ${status.toLowerCase()} by administration.`,
                      ...studentNotifs,
                    ],
                  }
                : {}),
            }
          : prev.notifications,
      };
    });
    showToast(`Leave application ${id} ${status.toLowerCase()}.`);
  };

  // Broadcast Mail with real Gmail API dispatch support
  const handleSendBroadcastMail = (
    to: string,
    subject: string,
    body: string,
    meta?: {
      recipientEmails?: string[];
      gmailMessageId?: string;
      gmailThreadId?: string;
      isRealEmailSent?: boolean;
      senderEmail?: string;
    }
  ) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    setState((prev) => ({
      ...prev,
      broadcastMails: [
        {
          id: `MAIL-${Date.now().toString().slice(-4)}`,
          to,
          subject,
          body,
          time: timeStr,
          dateStr,
          recipientEmails: meta?.recipientEmails,
          gmailMessageId: meta?.gmailMessageId,
          gmailThreadId: meta?.gmailThreadId,
          isRealEmailSent: meta?.isRealEmailSent,
          senderEmail: meta?.senderEmail,
        },
        ...prev.broadcastMails,
      ],
      notifications: {
        ...prev.notifications,
        vivan: [`Official Circular: ${subject}`, ...(prev.notifications.vivan || [])],
        krishvika: [`Official Circular: ${subject}`, ...(prev.notifications.krishvika || [])],
      },
    }));

    if (meta?.isRealEmailSent) {
      showToast(`⚡ Real broadcast mail "${subject}" dispatched via Gmail API!`);
    } else {
      showToast(`Broadcast circular "${subject}" logged and dispatched to ${to}.`);
    }
  };

  // Notices with Acknowledgements
  const handleAcknowledgeNotice = (noticeId: string) => {
    if (!state.currentUser) return;
    setState((prev) => ({
      ...prev,
      notices: prev.notices.map((n) => {
        if (n.id === noticeId) {
          const acks = n.acknowledgedBy || [];
          if (!acks.includes(state.currentUser!)) {
            return { ...n, acknowledgedBy: [...acks, state.currentUser!] };
          }
        }
        return n;
      }),
    }));
    showToast('Notice acknowledged and recorded in institutional log.');
  };

  const handlePublishPrincipalNotice = (newNotice: Omit<NoticeItem, 'id' | 'acknowledgedBy'>) => {
    const item: NoticeItem = {
      ...newNotice,
      id: `NOT-${Date.now().toString().slice(-4)}`,
      acknowledgedBy: [],
    };
    setState((prev) => ({
      ...prev,
      notices: [item, ...prev.notices],
    }));
    showToast(`Notice "${newNotice.title}" published to ${newNotice.targetRoles?.join(', ') || 'community'}.`);
  };

  const handlePublishAdminNotice = (
    title: string,
    category: 'academic' | 'transport' | 'fee' | 'general' | 'exam',
    audience: 'all' | 'students' | 'parents' | 'teachers',
    content: string,
    requiresAck: boolean
  ) => {
    const newNotice: NoticeItem = {
      id: `NOT-${Date.now().toString().slice(-4)}`,
      title,
      category,
      audience,
      date: '2026-10-31',
      content,
      priority: 'normal',
      requiresAck,
      acknowledgedBy: [],
    };
    setState((prev) => ({
      ...prev,
      notices: [newNotice, ...prev.notices],
    }));
    showToast(`Notice "${title}" broadcasted across academy.`);
  };

  // Support Tickets & Bug Reports
  const handleSubmitTicket = (ticket: { message: string; category: string; urgent: boolean }) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = `TKT-${Math.floor(100 + Math.random() * 900)}`;

    setState((prev) => ({
      ...prev,
      supportTickets: [
        {
          id,
          by: state.currentUser || 'anonymous',
          message: ticket.message,
          category: ticket.category,
          time: timeStr,
          status: 'OPEN',
          urgent: ticket.urgent,
        },
        ...prev.supportTickets,
      ],
      notifications: {
        ...prev.notifications,
        bharthi: [
          `${ticket.urgent ? '🚨 URGENT ' : ''}Issue ${id} from ${currentUserProfile?.name || 'User'}: ${ticket.message.slice(0, 60)}…`,
          ...(prev.notifications.bharthi || []),
        ],
      },
    }));

    showToast(`Support incident ${id} registered. Coordinator alerted.`);
  };

  const handleReplyTicket = (
    ticketId: string,
    reply: string,
    status: 'IN PROGRESS' | 'RESOLVED'
  ) => {
    setState((prev) => {
      const copy = prev.supportTickets.map((t) => {
        if (t.id === ticketId) {
          return { ...t, reply: reply || t.reply, status };
        }
        return t;
      });

      const t = prev.supportTickets.find((x) => x.id === ticketId);
      const userNotifs = t && t.by !== 'anonymous' ? prev.notifications[t.by] || [] : [];

      return {
        ...prev,
        supportTickets: copy,
        notifications:
          t && t.by !== 'anonymous'
            ? {
                ...prev.notifications,
                [t.by]: [
                  `Update on issue ${ticketId}: ${status} - "${reply || 'In review by support team'}"`,
                  ...userNotifs,
                ],
              }
            : prev.notifications,
      };
    });
    showToast(`Issue ${ticketId} updated to ${status}.`);
  };

  // Credential resets
  const handleResetCredential = (targetKey: string, isStudent: boolean) => {
    const newCode = isStudent
      ? `Sc${Math.floor(100000 + Math.random() * 900000)}`
      : Math.floor(100000 + Math.random() * 900000).toString();

    setState((prev) => ({
      ...prev,
      customPasswords: isStudent
        ? { ...prev.customPasswords, [targetKey]: newCode }
        : prev.customPasswords,
      customMpins: !isStudent
        ? { ...prev.customMpins, [targetKey]: newCode }
        : prev.customMpins,
      failedAttempts: { ...prev.failedAttempts, [targetKey]: 0 },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Credential reset for ${USER_PROFILES[targetKey]?.name || targetKey} by Super Admin`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));

    showToast(`New ${isStudent ? 'Password' : 'MPIN'} for ${USER_PROFILES[targetKey]?.name}: ${newCode}`);
  };

  const handleUnlockAccount = (targetKey: string) => {
    setState((prev) => ({
      ...prev,
      failedAttempts: { ...prev.failedAttempts, [targetKey]: 0 },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Account unlocked for ${USER_PROFILES[targetKey]?.name || targetKey}`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Account ${USER_PROFILES[targetKey]?.name} unlocked.`);
  };

  const handleUpdateTimetable = (className: string, day: string, periods: TimetablePeriod[]) => {
    setState((prev) => ({
      ...prev,
      timetables: {
        ...(prev.timetables || {}),
        [className]: {
          ...(prev.timetables?.[className] || {}),
          [day]: periods,
        },
      },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Coordinator Ms. Bharthi updated 12-hour timetable for ${className} (${day})`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Timetable saved for ${className} (${day})`);
  };

  // ================= LIBRARY MANAGEMENT SYSTEM HANDLERS ================= //
  const handleIssueBook = (loanData: {
    bookId: string;
    borrowerKey: string;
    borrowerName: string;
    borrowerRole: string;
    borrowerGrade?: string;
    dueDate: string;
  }) => {
    const book = (state.books || []).find((b) => b.id === loanData.bookId);
    if (!book) return;

    const newLoan: BookLoan = {
      id: `LN-${Date.now().toString().slice(-6)}`,
      bookId: loanData.bookId,
      bookTitle: book.title,
      borrowerKey: loanData.borrowerKey,
      borrowerName: loanData.borrowerName,
      borrowerRole: loanData.borrowerRole,
      borrowerGrade: loanData.borrowerGrade,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: loanData.dueDate,
      status: 'ACTIVE',
      fineAmount: 0,
      issuedBy: 'Ms. Meenakshi Sundaram',
    };

    setState((prev) => ({
      ...prev,
      books: (prev.books || []).map((b) =>
        b.id === loanData.bookId ? { ...b, availableCopies: Math.max(0, b.availableCopies - 1) } : b
      ),
      bookLoans: [newLoan, ...(prev.bookLoans || [])],
      notifications: {
        ...prev.notifications,
        [loanData.borrowerKey]: [
          `Library Checkout: "${book.title}" issued to your account. Due date: ${loanData.dueDate}.`,
          ...(prev.notifications[loanData.borrowerKey] || []),
        ],
      },
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Librarian issued "${book.title}" to ${loanData.borrowerName} (Loan ${newLoan.id})`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Book "${book.title}" issued to ${loanData.borrowerName}.`);
  };

  const handleReturnBook = (loanId: string, bookId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState((prev) => {
      const loan = (prev.bookLoans || []).find((l) => l.id === loanId);
      return {
        ...prev,
        books: (prev.books || []).map((b) =>
          b.id === bookId ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) } : b
        ),
        bookLoans: (prev.bookLoans || []).map((l) =>
          l.id === loanId ? { ...l, status: 'RETURNED', returnDate: today } : l
        ),
        auditLogs: [
          {
            id: `AUD-${Date.now()}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            action: `Book return processed for loan ${loanId} (${loan?.bookTitle || bookId}) by Librarian`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      };
    });
    showToast('Book return registered and available stock updated.');
  };

  const handleRenewLoan = (loanId: string, newDueDate: string) => {
    setState((prev) => ({
      ...prev,
      bookLoans: (prev.bookLoans || []).map((l) =>
        l.id === loanId ? { ...l, dueDate: newDueDate, status: 'ACTIVE' } : l
      ),
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Loan ${loanId} renewed until ${newDueDate}`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Loan ${loanId} renewed.`);
  };

  const handleAddBook = (newBookData: Omit<BookItem, 'id' | 'availableCopies'> & { availableCopies?: number }) => {
    const newBook: BookItem = {
      ...newBookData,
      id: `LIB-BK-${Math.floor(100 + Math.random() * 900)}`,
      availableCopies: newBookData.availableCopies ?? newBookData.totalCopies,
    };
    setState((prev) => ({
      ...prev,
      books: [newBook, ...(prev.books || [])],
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `New volume added to catalog: "${newBook.title}" (${newBook.id})`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Volume "${newBook.title}" catalogued.`);
  };

  const handleFulfillHold = (holdId: string) => {
    setState((prev) => ({
      ...prev,
      bookHolds: (prev.bookHolds || []).map((h) => {
        if (h.id === holdId) {
          const nextStatus = h.status === 'PENDING' ? 'READY_FOR_PICKUP' : 'FULFILLED';
          return { ...h, status: nextStatus };
        }
        return h;
      }),
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Hold reservation ${holdId} fulfilled by Librarian`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Hold ${holdId} updated.`);
  };

  const handleCancelHold = (holdId: string) => {
    setState((prev) => ({
      ...prev,
      bookHolds: (prev.bookHolds || []).map((h) => (h.id === holdId ? { ...h, status: 'CANCELLED' } : h)),
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Hold reservation ${holdId} cancelled by Librarian`,
          severity: 'info',
        },
        ...prev.auditLogs.slice(0, 49),
      ],
    }));
    showToast(`Hold ${holdId} cancelled.`);
  };

  // Quick switch role from guided tour
  const handleSelectRoleFromTour = (roleKey: string) => {
    if (state.currentUser === roleKey) {
      setActiveTab('portal');
      return;
    }
    handleLoginSuccess(roleKey);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#fffdfb] dark:bg-[#1c120b] text-[#2b1d14] dark:text-[#fff4ea] overflow-x-hidden w-full max-w-full">
        {/* Navigation Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
          }}
          currentUser={currentUserProfile}
          onLogout={handleLogout}
          isDark={isDark}
          themeMode={themeMode}
          toggleTheme={() => {
            setThemeMode((prev) => {
              if (prev === 'system') {
                showToast('Theme set to Dark Mode (persisted).');
                return 'dark';
              }
              if (prev === 'dark') {
                showToast('Theme set to Light Mode (persisted).');
                return 'light';
              }
              showToast('Theme set to System OS Preference (auto-sync).');
              return 'system';
            });
          }}
          onOpenOtpGenerator={() => setIsOtpGeneratorOpen(true)}
          notificationCount={currentNotifications.length}
          isProjectorMode={isProjectorMode}
          toggleProjectorMode={() => setIsProjectorMode((p) => !p)}
          onOpenGuidedTour={() => setIsGuidedTourOpen(true)}
          lockdown={state.emergencyLockdown}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold text-xs shadow-xl border border-orange-500">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Main Body Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
          {/* TAB 1: ACADEMY OVERVIEW / HOME */}
          {activeTab === 'home' && (
            <div className="space-y-8">
              {/* Notice Ticker Strip */}
              <div className="rounded-2xl bg-orange-50 dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 p-2.5 sm:p-3 overflow-hidden flex items-center gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-600 text-white font-extrabold uppercase text-[10px] tracking-wider shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notice Ticker</span>
                </div>
                <div className="overflow-hidden whitespace-nowrap flex-1">
                  <div className="inline-block animate-ticker text-stone-700 dark:text-stone-300 font-medium">
                    <span className="mx-4 font-bold text-orange-600">★ ANNOUNCEMENT:</span>
                    <span>Annual Science Exhibition & Robotics Arena will be inaugurated on Nov 14 in Jakkur Open Quadrangle.</span>
                    <span className="mx-4 font-bold text-orange-600">•</span>
                    <span>Route 14 Bus fleet tracker live telemetry active with Jakkur to Sahakara Nagar stops.</span>
                    <span className="mx-4 font-bold text-orange-600">•</span>
                    <span>Term 1 13-Subject Neural Mastery Evaluations and Official Transcripts now available for download.</span>
                    <span className="mx-4 font-bold text-orange-600">•</span>
                    <span>Class 10 Pre-Board examination schedule released in 12-Hour Timetable section.</span>
                  </div>
                </div>
              </div>

              {/* Cinematic Hero Section with School Name and One Primary Button */}
              <div className="relative rounded-3xl p-6 sm:p-12 overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 text-white shadow-xl">
                {/* Subtle Ambient Glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl space-y-5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 text-orange-800 shadow-sm backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    <span>Jakkur, Bengaluru • Affiliated to CBSE & Cambridge Assessment</span>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight leading-[1.1]">
                      Tattvasayam Future Academy
                    </h1>
                    <p className="text-base sm:text-lg font-medium text-orange-100 leading-snug">
                      Pioneering Integral Pedagogy, 13 Interdisciplinary Disciplines & Neural Mastery
                    </p>
                  </div>

                  <p className="text-orange-50/90 text-xs sm:text-sm leading-relaxed max-w-2xl font-sans">
                    Welcome to our comprehensive academic platform. Featuring cryptographic OTP & MPIN authentication, 3D architectural digital twin hologram, live Gate 2 biometric telemetry, and dedicated role-authoritative workspaces for our entire school community.
                  </p>

                  <div className="flex items-center gap-2 text-xs text-orange-100 font-medium pt-1">
                    <MapPin className="w-4 h-4 shrink-0 text-amber-200" />
                    <span>2060, Jakkur Plantation Road, Sampigehalli, Bengaluru, Karnataka 560064</span>
                  </div>

                  {/* Single Primary "Get started" Button */}
                  <div className="flex flex-wrap items-center gap-4 pt-4">
                    <button
                      onClick={() => setActiveTab('portal')}
                      className="px-7 py-3.5 rounded-2xl bg-white text-orange-800 hover:bg-orange-50 font-extrabold text-sm shadow-xl transition transform hover:-translate-y-0.5 flex items-center gap-2.5 active:scale-95"
                    >
                      <span>Get started</span>
                      <ArrowRight className="w-4 h-4 text-orange-600" />
                    </button>

                    <button
                      onClick={() => setIsGuidedTourOpen(true)}
                      className="px-5 py-3.5 rounded-2xl bg-orange-700/60 hover:bg-orange-700/80 text-white border border-white/30 font-bold text-xs backdrop-blur-md transition flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>Assembly Demo Guide</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('study')}
                      className="px-5 py-3.5 rounded-2xl bg-amber-500/90 hover:bg-amber-400 text-stone-900 font-bold text-xs shadow-md transition flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>AI Study Lab</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Statistics Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block">
                    Scholastic Enrolment
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 mt-1 font-mono">
                    1,240
                  </div>
                  <span className="text-xs text-stone-500 mt-0.5 block">Scholars across 12 grades</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block">
                    Academic Scope
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 dark:text-orange-400 mt-1 font-mono">
                    13 Subjects
                  </div>
                  <span className="text-xs text-stone-500 mt-0.5 block">Interdisciplinary STEM & Arts</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block">
                    Live Campus Attendance
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    98.4%
                  </div>
                  <span className="text-xs text-stone-500 mt-0.5 block">Gate 2 biometric verified</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
                  <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block">
                    Institutional Security
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                    100% 2FA
                  </div>
                  <span className="text-xs text-stone-500 mt-0.5 block">30s OTP & MPIN safeguards</span>
                </div>
              </div>

              {/* Academic Workspaces & Dedicated Tools Gateway */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-xl text-stone-900 dark:text-stone-100">
                      Interactive Campus Workspaces
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Dedicated high-fidelity interfaces for spatial architecture, fleet telemetry, inquiry labs, and academic records.
                    </p>
                  </div>
                  <span className="hidden sm:inline-block text-xs font-mono font-semibold text-orange-600 dark:text-orange-400">
                    4 Dedicated Modules
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Gateway Card 1: 3D Campus Hologram */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                          <Layers className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-stone-700">
                          Three.js 3D WebGL
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-lg text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          Jakkur Campus Architectural Hologram
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          Interactive 3D digital twin of Tattvasayam's Open Learning Resource Centre. Features 360° orbital rotation, elevation zooms, and physical architectural layout inspections.
                        </p>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-orange-100 dark:border-stone-800/80 flex items-center justify-between mt-4">
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                        Spatial Twin Active
                      </span>
                      <button
                        onClick={() => setActiveTab('campus')}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 group-hover:translate-x-0.5"
                      >
                        <span>Launch Hologram</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Gateway Card 2: Route 14 Transit Fleet Telemetry */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                          <Bus className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-stone-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-stone-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live GPS Fleet
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-lg text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Route 14 Fleet Telemetry & Transit
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          Live real-time GPS telemetry connecting Jakkur Plantation Road to Sahakara Nagar. Track vehicle KA-04-E-2040, station ETA timings, and automated parent arrival notifications.
                        </p>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-orange-100 dark:border-stone-800/80 flex items-center justify-between mt-4">
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                        6 Transit Stations Active
                      </span>
                      <button
                        onClick={() => setActiveTab('transit')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 group-hover:translate-x-0.5"
                      >
                        <span>Open Live Transit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Gateway Card 3: AI Study & Lesson Lab */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 dark:bg-stone-800 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-stone-700">
                          Gemini 2.5 AI
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-lg text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          AI Inquiry & Research Lab
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          Socratic learning assistant spanning 13 interdisciplinary subjects. Automatically generate 45-minute structured lesson schemas and evaluate comprehension with auto-graded quizzes.
                        </p>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-orange-100 dark:border-stone-800/80 flex items-center justify-between mt-4">
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                        13 Core Disciplines
                      </span>
                      <button
                        onClick={() => setActiveTab('study')}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 group-hover:translate-x-0.5"
                      >
                        <span>Launch Study Lab</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Gateway Card 4: Reports & Transcripts */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                          <Printer className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 dark:bg-stone-800 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-stone-700">
                          Recharts & CSV
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-lg text-stone-900 dark:text-stone-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Official Transcripts & Attendance
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          Weekly attendance analytics visualized with Recharts, formatted CSV data downloads, and printable A4 report cards signed with Dr. Shenoy's official institutional crest.
                        </p>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-orange-100 dark:border-stone-800/80 flex items-center justify-between mt-4">
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                        Term 1 Evaluations Ready
                      </span>
                      <button
                        onClick={() => setActiveTab('rep')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 group-hover:translate-x-0.5"
                      >
                        <span>View Reports</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Feature Showcase Pillars */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg text-stone-900 dark:text-stone-100">
                    Next-Generation School Infrastructure
                  </h3>
                  <span className="text-xs text-stone-500">Integral Pedagogy Framework</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveTab('portal')}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-amber-950 shadow-xs space-y-2.5 cursor-pointer hover:border-orange-400 transition"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                      <Shield className="w-5 h-5" />
                    </div>
                    <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                      7 Role-Based Portals
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Tailored start screens for Student, Facilitator, Staff, Parent, Admin, Coordinator, and Principal with focused overviews.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('study')}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-amber-950 shadow-xs space-y-2.5 cursor-pointer hover:border-orange-400 transition"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                      AI Study & Lesson Lab
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Dedicated inquiry assistant, automated 45-minute lesson schema generator, and self-testing quizzes for all 13 disciplines.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('transit')}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-amber-950 shadow-xs space-y-2.5 cursor-pointer hover:border-orange-400 transition"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Bus className="w-5 h-5" />
                    </div>
                    <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                      Smart Transit & Gate 2
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Live GPS Route 14 fleet tracker, digital NFC badges, contactless gate check-in, and instant parental arrival pings.
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveTab('rep')}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-amber-950 shadow-xs space-y-2.5 cursor-pointer hover:border-orange-400 transition"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Printer className="w-5 h-5" />
                    </div>
                    <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                      Official Transcripts
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Printable A4 report card with institutional crest, 13-subject marks breakdown, AI remark, and Principal Dr. Shenoy's seal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAMPUS HOLOGRAM */}
          {activeTab === 'campus' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100">
                    Jakkur Campus Digital Twin & Hologram
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Modeled from physical architectural scans of Tattvasayam Open Learning Resource Centre. Drag left or right to orbit, scroll to zoom.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300">
                    360° Orbit Mode
                  </span>
                </div>
              </div>

              <CampusHologram isDark={isDark} />
            </div>
          )}

          {/* TAB 3: LIVE TRANSIT TELEMETRY */}
          {activeTab === 'transit' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100">
                      Route 14 Real-Time Fleet Telemetry
                    </h2>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Live GPS tracking: Jakkur Plantation Road ⇄ Sahakara Nagar • Dedicated bus fleet monitoring & parental arrival notifications.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!state.currentUser) {
                        handleLoginSuccess('pvivan');
                      } else {
                        setActiveTab('portal');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2"
                  >
                    <Bus className="w-4 h-4" />
                    <span>Parent Transit Portal</span>
                  </button>
                </div>
              </div>

              <LiveTransit
                busRoute={state.busRoute}
                isDark={isDark}
                currentUser={currentUserProfile}
                transportRequests={state.transportRequests}
                onNavigateToParentPortal={() => {
                  if (!state.currentUser) {
                    handleLoginSuccess('pvivan');
                  } else {
                    setActiveTab('portal');
                  }
                }}
                onUpdateBusRoute={(updated) => {
                  setState((prev) => ({
                    ...prev,
                    busRoute: updated,
                  }));
                }}
                onRequestTransport={handleRequestTransport}
                onUpdateTransportRequestStatus={handleUpdateTransportRequestStatus}
                onPayTransportFee={handlePayTransportFee}
                onSendNotification={(title, message, type) => {
                  showToast(`${title}: ${message}`);
                  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  setState((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      pvivan: [
                        `${title}: ${message} (${timeStr})`,
                        ...(prev.notifications['pvivan'] || []),
                      ],
                    },
                    auditLogs: [
                      {
                        id: `AUD-BUS-${Date.now()}`,
                        time: timeStr,
                        action: `${title} - ${message}`,
                        severity: type === 'alert' ? 'critical' : type === 'warning' ? 'warn' : 'info',
                      },
                      ...prev.auditLogs.slice(0, 49),
                    ],
                  }));
                }}
              />
            </div>
          )}

          {/* TAB 3: DEDICATED AI STUDY LAB */}
          {activeTab === 'study' && (
            <AiStudyLabView
              currentUser={currentUserProfile}
              quizResults={state.quizResults}
              onRecordQuizResult={(subject, topic, score, percentage) => {
                const timeStr = new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const studentId = state.currentUser || 'vivan';
                setState((prev) => ({
                  ...prev,
                  quizResults: [
                    {
                      userId: studentId,
                      subject,
                      topic,
                      score,
                      percentage,
                      time: timeStr,
                    },
                    ...prev.quizResults,
                  ],
                }));
                showToast(`Quiz result for ${subject} (${score}) recorded in academic record.`);
              }}
              aiLogs={state.aiLogs}
              onRecordAiLog={(subject, question, answer) => {
                const timeStr = new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                setState((prev) => ({
                  ...prev,
                  aiLogs: [
                    {
                      userId: state.currentUser || 'vivan',
                      subject,
                      question,
                      answer,
                      time: timeStr,
                    },
                    ...prev.aiLogs.slice(0, 49),
                  ],
                }));
              }}
              onNavigateToPortal={() => setActiveTab('portal')}
            />
          )}

          {/* TAB 4: ACADEMIC CALENDAR */}
          {activeTab === 'cal' && (
            <CalendarView
              events={state.events}
              counseling={state.counseling}
              currentUser={currentUserProfile}
              onToast={showToast}
              onAddEvent={(newEvent) => {
                setState((prev) => ({
                  ...prev,
                  events: [...prev.events, newEvent],
                }));
                showToast(`Event "${newEvent.title}" published to academic calendar.`);
              }}
            />
          )}

          {/* TAB 5: 13-SUBJECT REPORTS & OFFICIAL TRANSCRIPTS */}
          {activeTab === 'rep' && (
            <ReportsView
              currentUser={currentUserProfile}
              onNavigateToPortal={() => setActiveTab('portal')}
              attendanceRecords={state.attendanceRecords}
            />
          )}

          {/* TAB 6: DEDICATED OTP SITE / AUTHENTICATOR HUB (Restricted to Ms. Sandhya & Ms. Amrita) */}
          {activeTab === 'otp' && (
            <OtpHubView
              currentUser={currentUserProfile}
              onNavigateToLogin={(targetKey) => {
                if (targetKey) setPreselectedLoginUser(targetKey);
                setActiveTab('portal');
              }}
              onNavigateToHome={() => setActiveTab('home')}
            />
          )}

          {/* TAB 7: PORTAL WORKSPACES */}
          {activeTab === 'portal' && (
            <div>
              {!state.currentUser ? (
                <LoginView
                  initialUserKey={preselectedLoginUser}
                  onLoginSuccess={handleLoginSuccess}
                  customPasswords={state.customPasswords}
                  customMpins={state.customMpins}
                  failedAttempts={state.failedAttempts}
                  onRecordFailedAttempt={(key) => {
                    setState((prev) => ({
                      ...prev,
                      failedAttempts: {
                        ...prev.failedAttempts,
                        [key]: (prev.failedAttempts[key] || 0) + 1,
                      },
                    }));
                  }}
                  onResetFailedAttempts={(key) => {
                    setState((prev) => ({
                      ...prev,
                      failedAttempts: { ...prev.failedAttempts, [key]: 0 },
                    }));
                  }}
                />
              ) : (
                <div className="space-y-6">
                  {/* Principal View */}
                  {currentUserProfile?.role === 'principal' && (
                    <PrincipalDashboard
                      user={currentUserProfile}
                      notices={state.notices}
                      onAcknowledgeNotice={handleAcknowledgeNotice}
                      onPublishNotice={handlePublishPrincipalNotice}
                      attendanceRecords={state.attendanceRecords}
                      busRoute={state.busRoute}
                      timetableSchedule={state.timetables}
                      auditLogs={state.auditLogs}
                      onNavigateToTab={(t) => setActiveTab(t as any)}
                      lockdown={state.emergencyLockdown}
                      onToggleLockdown={handleToggleLockdown}
                    />
                  )}

                  {/* Student View */}
                  {currentUserProfile?.role === 'student' && (
                    <StudentDashboard
                      user={currentUserProfile}
                      assignments={state.assignments}
                      onToggleAssignment={handleToggleAssignment}
                      counseling={state.counseling}
                      onBookCounseling={handleBookCounseling}
                      leaveRequests={state.leaveRequests}
                      onDigitalIdTap={handleDigitalIdTap}
                      chatHistory={state.chatHistory[state.currentUser] || []}
                      onSendMessage={(text) => {
                        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setState((prev) => {
                          const currentHist = prev.chatHistory[state.currentUser!] || [];
                          return {
                            ...prev,
                            chatHistory: {
                              ...prev.chatHistory,
                              [state.currentUser!]: [
                                ...currentHist,
                                { sender: 'user', text, timestamp: timeStr },
                              ],
                            },
                          };
                        });
                        showToast('Message sent to faculty mentor.');
                      }}
                      timetableSchedule={state.timetables}
                      onNavigateToStudyLab={() => setActiveTab('study')}
                      onNavigateToReports={() => setActiveTab('rep')}
                      notices={state.notices}
                      onAcknowledgeNotice={handleAcknowledgeNotice}
                      attendanceRecords={state.attendanceRecords}
                      pendingNfcTaps={state.pendingNfcTaps}
                      onQuickApproveDemo={handleApproveNfcTap}
                      onSwitchToSecurity={() => handleLoginSuccess('sai')}
                      busRoute={state.busRoute}
                      transportRequests={state.transportRequests}
                      onRequestTransport={handleRequestTransport}
                      onPayTransportFee={handlePayTransportFee}
                    />
                  )}

                  {/* Teacher / Facilitator View */}
                  {currentUserProfile?.role === 'teacher' && (
                    <TeacherDashboard
                      user={currentUserProfile}
                      assignments={state.assignments}
                      onPublishAssignment={handlePublishAssignment}
                      aiLogs={state.aiLogs}
                      quizResults={state.quizResults}
                      timetableSchedule={state.timetables}
                      attendanceRecords={state.attendanceRecords}
                      onMarkAttendance={(studentId, status) => {
                        handleMarkAttendance(
                          USER_PROFILES[studentId]?.name || studentId,
                          'Student',
                          'Grade 10-A'
                        );
                      }}
                      busRoute={state.busRoute}
                      transportRequests={state.transportRequests}
                      onRequestTransport={handleRequestTransport}
                      onPayTransportFee={handlePayTransportFee}
                    />
                  )}

                  {/* Admin View */}
                  {currentUserProfile?.role === 'admin' && (
                    <AdminDashboard
                      user={currentUserProfile}
                      counseling={state.counseling}
                      onUpdateCounselingStatus={handleUpdateCounselingStatus}
                      leaveRequests={state.leaveRequests}
                      onUpdateLeaveStatus={handleUpdateLeaveStatus}
                      broadcastMails={state.broadcastMails}
                      onSendBroadcastMail={handleSendBroadcastMail}
                      auditLogs={state.auditLogs}
                      gateLogs={state.gateLogs}
                      feesPaid={state.feesPaid}
                      onResetCredential={handleResetCredential}
                      onUnlockAccount={handleUnlockAccount}
                      failedAttempts={state.failedAttempts}
                      lockedUntil={state.lockedUntil}
                      notices={state.notices}
                      onPublishNotice={handlePublishAdminNotice}
                      busRoute={state.busRoute}
                      transportRequests={state.transportRequests}
                      onRequestTransport={handleRequestTransport}
                      onUpdateTransportRequestStatus={handleUpdateTransportRequestStatus}
                      onPayTransportFee={handlePayTransportFee}
                    />
                  )}

                  {/* Security View (Staff) */}
                  {currentUserProfile?.role === 'security' && (
                    <SecurityDashboard
                      user={currentUserProfile}
                      gateLogs={state.gateLogs}
                      onMarkAttendance={handleMarkAttendance}
                      pendingNfcTaps={state.pendingNfcTaps}
                      onApproveNfcTap={handleApproveNfcTap}
                      onDenyNfcTap={handleDenyNfcTap}
                      onSimulateStudentTap={() => handleSimulateNfcTapForStudent('vivan')}
                      lockdown={state.emergencyLockdown}
                      onToggleLockdown={handleToggleLockdown}
                      busRoute={state.busRoute}
                      transportRequests={state.transportRequests}
                      onRequestTransport={handleRequestTransport}
                      onPayTransportFee={handlePayTransportFee}
                    />
                  )}

                  {/* Support View (Coordinator) */}
                  {currentUserProfile?.role === 'support' && (
                    <SupportDashboard
                      user={currentUserProfile}
                      tickets={state.supportTickets}
                      onReplyTicket={handleReplyTicket}
                      timetableSchedule={state.timetables}
                      onUpdateTimetable={handleUpdateTimetable}
                      busRoute={state.busRoute}
                      transportRequests={state.transportRequests}
                      onRequestTransport={handleRequestTransport}
                      onUpdateTransportRequestStatus={handleUpdateTransportRequestStatus}
                      onPayTransportFee={handlePayTransportFee}
                    />
                  )}

                  {/* Parent View */}
                  {currentUserProfile?.role === 'parent' && (
                    <ParentDashboard
                      user={currentUserProfile}
                      assignments={state.assignments}
                      feesPaid={
                        state.feesPaid[currentUserProfile.child || 'vivan'] || [
                          false,
                          false,
                          false,
                          false,
                        ]
                      }
                      onPayFee={handlePayFee}
                      counseling={state.counseling}
                      onBookCounseling={handleBookCounseling}
                      leaveRequests={state.leaveRequests}
                      onApplyLeave={handleApplyLeave}
                      notifications={state.notifications[state.currentUser] || []}
                      timetableSchedule={state.timetables}
                      busRoute={state.busRoute}
                      attendanceRecords={state.attendanceRecords}
                      feeTransactions={state.feeTransactions}
                      onRecordFeePayment={(itemTitle, amount, method) => {
                        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const tx: FeeTransaction = {
                          id: `TX-${Date.now().toString().slice(-6)}`,
                          studentKey: currentUserProfile.child || 'vivan',
                          itemTitle,
                          amount,
                          date: new Date().toISOString().split('T')[0],
                          paymentMethod: method,
                          referenceId: `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                          status: 'SUCCESS',
                        };
                        setState((prev) => ({
                          ...prev,
                          feeTransactions: [tx, ...(prev.feeTransactions || [])],
                          auditLogs: [
                            {
                              id: `AUD-${Date.now()}`,
                              time: timeStr,
                              action: `Fee payment of ₹${amount.toLocaleString()} for ${currentUserProfile.child || 'student'} settled via ${method}`,
                              severity: 'info',
                            },
                            ...prev.auditLogs.slice(0, 49),
                          ],
                        }));
                      }}
                      notices={state.notices}
                      onAcknowledgeNotice={handleAcknowledgeNotice}
                      onNavigateToTab={(t) => setActiveTab(t as any)}
                      onUpdateBusRoute={(updated) => {
                        setState((prev) => ({
                          ...prev,
                          busRoute: updated,
                        }));
                      }}
                      transportRequests={state.transportRequests}
                      onRequestTransport={handleRequestTransport}
                      onPayTransportFee={handlePayTransportFee}
                    />
                  )}

                  {/* Librarian View (Dedicated Library Management System - Restricted to Librarian Only) */}
                  {currentUserProfile?.role === 'librarian' && (
                    <LibrarianDashboard
                      user={currentUserProfile}
                      books={state.books || []}
                      bookLoans={state.bookLoans || []}
                      bookHolds={state.bookHolds || []}
                      onIssueBook={handleIssueBook}
                      onReturnBook={handleReturnBook}
                      onRenewLoan={handleRenewLoan}
                      onAddBook={handleAddBook}
                      onFulfillHold={handleFulfillHold}
                      onCancelHold={handleCancelHold}
                      busRoute={state.busRoute}
                      transportRequests={state.transportRequests}
                      onRequestTransport={handleRequestTransport}
                      onPayTransportFee={handlePayTransportFee}
                    />
                  )}

                  {/* Driver View (Dedicated Fleet Route, Student Pickup/Drop Counts & Daily Commuters) */}
                  {currentUserProfile?.role === 'driver' && (
                    <DriverDashboard
                      user={currentUserProfile}
                      busRoute={state.busRoute}
                      leaveRequests={state.leaveRequests}
                      transportRequests={state.transportRequests}
                      isDark={isDark}
                      onUpdateBusRoute={(updated) => {
                        setState((prev) => ({
                          ...prev,
                          busRoute: updated,
                        }));
                      }}
                      onSendNotification={(title, message, type) => {
                        showToast(`${title}: ${message}`);
                        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setState((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            pvivan: [
                              `${title}: ${message} (${timeStr})`,
                              ...(prev.notifications['pvivan'] || []),
                            ],
                            pkrishvika: [
                              `${title}: ${message} (${timeStr})`,
                              ...(prev.notifications['pkrishvika'] || []),
                            ],
                          },
                          auditLogs: [
                            {
                              id: `AUD-DRV-${Date.now()}`,
                              time: timeStr,
                              action: `Driver Manjunath: ${title} - ${message}`,
                              severity: type === 'alert' ? 'critical' : type === 'warning' ? 'warn' : 'info',
                            },
                            ...prev.auditLogs.slice(0, 49),
                          ],
                        }));
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Guided Tour Presentation Assistant Modal */}
        <GuidedTourModal
          isOpen={isGuidedTourOpen}
          onClose={() => setIsGuidedTourOpen(false)}
          onSelectRole={handleSelectRoleFromTour}
        />

        {/* Interactive OTP Generator Modal */}
        <OtpGeneratorModal
          isOpen={isOtpGeneratorOpen}
          onClose={() => setIsOtpGeneratorOpen(false)}
          selectedUserId={state.currentUser || preselectedLoginUser}
          onNavigateToLogin={(uid) => {
            setPreselectedLoginUser(uid);
            setActiveTab('portal');
          }}
        />

        {/* Polished School Footer */}
        <footer className="border-t border-orange-200/60 dark:border-amber-950/60 bg-white/70 dark:bg-stone-900/70 py-8 text-xs text-stone-500 dark:text-stone-400 mt-12 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-orange-100 dark:border-stone-800 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center font-serif font-black text-xs">
                    T
                  </div>
                  <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100 tracking-tight">
                    TATTVASAYAM FUTURE ACADEMY
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Centre of Integral Pedagogy & Emerging Sciences • Affiliated to CBSE & Cambridge Assessment
                </p>
                <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-600" />
                  <span>Jakkur Plantation Road, Yelahanka Sub-Division, Bengaluru, Karnataka 560064</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  onClick={() => setIsGuidedTourOpen(true)}
                  className="font-bold text-orange-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Assembly Presentation Guide</span>
                </button>
                <span>•</span>
                <button
                  onClick={() => setActiveTab('rep')}
                  className="hover:text-orange-600 transition"
                >
                  13-Subject Transcripts
                </button>
                <span>•</span>
                <button
                  onClick={() => setActiveTab('cal')}
                  className="hover:text-orange-600 transition"
                >
                  Academic Calendar
                </button>
                {isSuperAdmin && (
                  <>
                    <span>•</span>
                    <button
                      onClick={() => setActiveTab('otp')}
                      className="hover:text-orange-600 dark:hover:text-orange-400 transition font-semibold"
                    >
                      Super Admin OTP Hub
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-400">
              <div>
                © 2026 Tattvasayam Future Academy. All rights reserved. System Telemetry & Diagnostics Active.
              </div>
              <div className="font-mono text-[10px]">
                Built for High Reliability & Zero Console Errors • Bangalore North
              </div>
            </div>
          </div>
        </footer>

        {/* Full-Screen Emergency Warning Overlay across all active student / teacher sessions */}
        {state.emergencyLockdown?.active &&
          (currentUserProfile?.role === 'student' || currentUserProfile?.role === 'teacher') && (
            <EmergencyLockdownOverlay
              lockdown={state.emergencyLockdown}
              currentUser={currentUserProfile}
              onSwitchToAuthority={(target) => {
                handleLoginSuccess(target === 'principal' ? 'principal' : 'sai');
                showToast(
                  `Switched to ${target === 'principal' ? 'Dr. Shenoy (Principal)' : 'Mr. Sai (Gate Security)'} to manage campus lockdown.`
                );
              }}
            />
        )}
      </div>
    </ErrorBoundary>
  );
}
