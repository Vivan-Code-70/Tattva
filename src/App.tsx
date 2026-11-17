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
  Archive,
  Laptop,
  Moon,
  ShieldCheck,
  Sun,
  Quote,
  AlertCircle,
  Phone,
  Mail,
  LogOut,
  Lock,
} from 'lucide-react';
import { Header, NavTab } from './components/Header';
import { CampusHologram } from './components/CampusHologram';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { AiStudyLabView } from './components/AiStudyLabView';
import { OtpHubView } from './components/OtpHubView';
import { OtpGeneratorModal } from './components/OtpGeneratorModal';
import { GuidedTourModal } from './components/GuidedTourModal';
import { AdmissionsInquiryModal } from './components/AdmissionsInquiryModal';
import { AccessDeniedView } from './components/AccessDeniedView';
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
import { RoleSwitcherBar } from './components/portal/RoleSwitcherBar';
import { LiveTransit } from './components/LiveTransit';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initGoogleCalendarAuth } from './services/googleCalendarService';
import { EmergencyLockdownOverlay } from './components/portal/EmergencyLockdownOverlay';
import { AuthService, getStoredToken, onSessionExpired } from './services/authService';

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
  SessionStatusResponse,
  ProtectedFeature,
  PublicSchoolInfo,
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
import heroCampusCourtyardImg from './assets/images/hero_campus_courtyard_1794761894898.jpg';
import classroomMentorshipImg from './assets/images/classroom_mentorship_1794761896314.jpg';
import leadershipPortraitImg from './assets/images/tattvaswayam_leadership_portrait_1794762697557.jpg';

const TAB_TO_FEATURE: Partial<Record<NavTab, ProtectedFeature>> = {
  transit: 'bus_tracker',
  study: 'homework',
  cal: 'calendar',
  rep: 'reports',
  otp: 'otp_directory',
};

function parseTabFromLocation(): NavTab {
  if (typeof window === 'undefined') return 'home';
  const p = window.location.pathname.toLowerCase();
  const s = new URLSearchParams(window.location.search);
  const h = window.location.hash.toLowerCase();
  if (p.includes('totp') || p.includes('otp') || s.get('page') === 'totp' || s.get('tab') === 'otp' || h.includes('totp') || h.includes('otp')) {
    return 'otp';
  }
  if (p.includes('study') || p.includes('homework') || p.includes('quiz') || p.includes('assistant') || s.get('tab') === 'study' || h.includes('study')) {
    return 'study';
  }
  if (p.includes('portal') || p.includes('login') || s.get('tab') === 'portal' || h.includes('portal')) {
    return 'portal';
  }
  if (p.includes('campus') || s.get('tab') === 'campus') {
    return 'campus';
  }
  if (p.includes('transit') || p.includes('bus-tracker') || p.includes('bus') || s.get('tab') === 'transit' || h.includes('transit')) {
    return 'transit';
  }
  if (p.includes('cal') || s.get('tab') === 'cal') {
    return 'cal';
  }
  if (p.includes('rep') || s.get('tab') === 'rep') {
    return 'rep';
  }
  return 'home';
}

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    ...StorageService.load(),
    currentUser: null,
  }));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionStatusResponse>({
    state: 'UNAUTHENTICATED',
    authenticated: false,
    registered: false,
    user: null,
    roles: [],
    allowedFeatures: [],
  });
  const [sessionResolved, setSessionResolved] = useState(false);
  const [expiredSessionMessage, setExpiredSessionMessage] = useState<string | null>(null);
  const [publicSchoolInfo, setPublicSchoolInfo] = useState<PublicSchoolInfo | null>(null);
  const [activePortalRole, setActivePortalRole] = useState<UserRole | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const applyResolvedSession = (res: SessionStatusResponse) => {
    setSessionState(res);
    setSessionResolved(true);
    if (res.state === 'REGISTERED' && res.user) {
      const key = res.user.userKey || res.user.id.toLowerCase();
      setExpiredSessionMessage(null);
      setState((prev) => ({ ...prev, currentUser: key }));
      setActivePortalRole((prevRole) =>
        prevRole && res.roles.includes(prevRole) ? prevRole : res.user!.role
      );
    } else {
      setState((prev) => ({ ...prev, currentUser: null }));
      setActivePortalRole(null);
    }
  };

  const refreshAuthSession = async () => {
    try {
      const res = await AuthService.fetchSession();
      applyResolvedSession(res);
      return res;
    } catch {
      setSessionResolved(true);
      return null;
    }
  };

  const isSuperAdmin =
    sessionState.state === 'REGISTERED' &&
    (sessionState.allowedFeatures.includes('otp_directory') ||
      state.currentUser === 'sandhya' ||
      state.currentUser === 'amrita');

  const [activeTab, setActiveTabState] = useState<NavTab>(() => parseTabFromLocation());

  const setActiveTab = (tab: NavTab) => {
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
      setActiveTabState(parseTabFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    AuthService.fetchPublicSchoolInfo().then((info) => {
      if (info) setPublicSchoolInfo(info);
    });
    refreshAuthSession();

    const unsubExpired = onSessionExpired((reason) => {
      setSessionState({
        state: 'UNAUTHENTICATED',
        authenticated: false,
        registered: false,
        user: null,
        roles: [],
        allowedFeatures: [],
      });
      setState((prev) => ({ ...prev, currentUser: null }));
      setActivePortalRole(null);
      setExpiredSessionMessage(reason);
      setActiveTab('portal');
      showToast(reason);
    });

    const handleFocus = () => {
      refreshAuthSession();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubExpired();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Poll session status periodically when signed in to reflect admin role changes or expiry
  useEffect(() => {
    if (!sessionState.authenticated) return;
    const interval = setInterval(() => {
      refreshAuthSession();
    }, 15000);
    return () => clearInterval(interval);
  }, [sessionState.authenticated]);

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
  const [isAdmissionsModalOpen, setIsAdmissionsModalOpen] = useState<boolean>(false);
  const [admissionsModalMode, setAdmissionsModalMode] = useState<'admissions' | 'visit'>('admissions');

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

  const currentUserProfile: UserProfile | null =
    sessionState.state === 'REGISTERED' && sessionState.user
      ? {
          ...(USER_PROFILES[sessionState.user.userKey || ''] || {}),
          ...sessionState.user,
          role:
            activePortalRole && sessionState.roles.includes(activePortalRole)
              ? activePortalRole
              : sessionState.user.role,
          roles: sessionState.roles,
          assignedClasses: sessionState.user.assignedClasses,
          childrenKeys: sessionState.user.childrenKeys,
          child:
            USER_PROFILES[sessionState.user.userKey || '']?.child ||
            sessionState.user.childrenKeys?.[0],
          linkedStudentKey: sessionState.user.linkedStudentKey,
          isRegistered: true,
        }
      : null;

  const currentNotifications = state.currentUser ? state.notifications[state.currentUser] || [] : [];

  const handleAuthSessionResolved = (session: SessionStatusResponse) => {
    applyResolvedSession(session);
    if (session.state === 'UNREGISTERED') {
      setActiveTab('home');
      showToast(
        session.message ||
          'Your account isn’t registered with the school. Please contact the school office for access.'
      );
      return;
    }

    if (session.state === 'REGISTERED' && session.user) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setState((prev) => ({
        ...prev,
        currentUser: session.user!.userKey || session.user!.id.toLowerCase(),
        auditLogs: [
          {
            id: `AUD-${Date.now()}`,
            time: timeStr,
            action: `Signed in via ${session.user!.authProvider === 'google' ? 'Google Sign-In' : 'School Portal'}: ${session.user!.name} (${session.roles.join(', ').toUpperCase()})`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      }));
      setActiveTab('portal');
      showToast(`Welcome back, ${session.user.name}!`);
    }
  };

  // Switch demo role via backend signed RBAC session endpoint
  const handleLoginSuccess = async (userKey: string, preserveCurrentTab: boolean = false) => {
    try {
      const res = await AuthService.switchDemoRole(userKey);
      applyResolvedSession(res);
      const u = res.user || USER_PROFILES[userKey];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setState((prev) => ({
        ...prev,
        currentUser: userKey,
        failedAttempts: { ...prev.failedAttempts, [userKey]: 0 },
        auditLogs: [
          {
            id: `AUD-${Date.now()}`,
            time: timeStr,
            action: `Signed in: ${u?.name || userKey} (${(res.roles || [u?.role]).join(', ').toUpperCase()})`,
            severity: 'info',
          },
          ...prev.auditLogs.slice(0, 49),
        ],
      }));
      if (!preserveCurrentTab) {
        setActiveTab('portal');
      }
      showToast(`Welcome back, ${u?.name || userKey}!`);
    } catch (err: any) {
      showToast(err?.message || 'Unable to sign in with selected account.');
    }
  };

  const handleLogout = async () => {
    const prevName = currentUserProfile?.name || sessionState.user?.name;
    await AuthService.logout();
    setSessionState({
      state: 'UNAUTHENTICATED',
      authenticated: false,
      registered: false,
      user: null,
      roles: [],
      allowedFeatures: [],
    });
    setActivePortalRole(null);
    setExpiredSessionMessage(null);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setState((prev) => ({
      ...prev,
      currentUser: null,
      auditLogs: prevName
        ? [
            {
              id: `AUD-${Date.now()}`,
              time: timeStr,
              action: `User signed out: ${prevName}`,
              severity: 'info',
            },
            ...prev.auditLogs.slice(0, 49),
          ]
        : prev.auditLogs,
    }));
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
      (state.currentUser === 'principal' ? 'Ms. Amrita (Centre Head)' : 'Mr. Sai (Gate Security)');
    const authorityRole = currentUserProfile?.role || (state.currentUser === 'principal' ? 'principal' : 'security');
    const now = Date.now();

    const updatedLockdown: EmergencyLockdownState = {
      active,
      triggeredBy: active ? authorityName : state.emergencyLockdown?.triggeredBy || authorityName,
      triggeredRole: active ? authorityRole : state.emergencyLockdown?.triggeredRole || authorityRole,
      timestamp: active ? now : state.emergencyLockdown?.timestamp || now,
      reason: reason || (active ? 'Immediate Campus Security & Safety Protocol' : state.emergencyLockdown?.reason),
      location: 'All Studios, Labs & Courtyard, Sampigehalli Jakkur Campus',
      instructions:
        'Lock all studio and lab doors immediately. Remain away from windows. Turn off lights. Maintain complete silence. Stay in place until official ALL-CLEAR from Centre Head or Campus Security.',
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

    // Post to server backend with auth bearer
    try {
      const token = getStoredToken();
      await fetch('/api/lockdown', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
          action: `Chief Administrator Ms. Sangeetha updated 12-hour timetable for ${className} (${day})`,
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

  const openAdmissionsModal = (mode: 'admissions' | 'visit') => {
    setAdmissionsModalMode(mode);
    setIsAdmissionsModalOpen(true);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-slate-950 text-[#182230] dark:text-slate-100 overflow-x-hidden w-full max-w-full">
        {/* Navigation Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
          }}
          authState={sessionState.state}
          allowedFeatures={sessionState.allowedFeatures}
          currentUser={currentUserProfile}
          unregisteredEmail={sessionState.user?.email}
          onLogout={handleLogout}
          notificationCount={currentNotifications.length}
          onOpenGuidedTour={() => setIsGuidedTourOpen(true)}
          lockdown={state.emergencyLockdown}
        />

        {/* Global Toast Notification (top-right so it never collides with bottom-right Role Switcher) */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm animate-view-enter toast no-print"
          >
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-medium text-xs shadow-xl border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="leading-snug">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Main Body Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-12">
          {/* TAB 1: WARM EDITORIAL SCHOOL LANDING PAGE */}
          {activeTab === 'home' && (
            <div className="space-y-14 sm:space-y-16 animate-view-enter">
              {/* Unregistered Authenticated Google Account Banner */}
              {sessionState.state === 'UNREGISTERED' && (
                <div
                  role="alert"
                  className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-[#B45309] dark:text-amber-300 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#182230] dark:text-white">
                          Your account isn’t registered with the school. Please contact the school office for access.
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        Signed in as <strong className="font-mono">{sessionState.user?.email}</strong>. You can view school details, contact information, and public announcements below, while Bus Tracker, Homework, Calendar, and Reports remain restricted.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-[#B45309]" />
                          <span>{publicSchoolInfo?.phone || '+91-76250-03355'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-[#B45309]" />
                          <span>{publicSchoolInfo?.email || 'info@tattvaswayam.com'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-xl bg-[#182230] hover:bg-[#243247] text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}

              {/* Calm Parent & Admissions Bulletin Strip */}
              <div className="rounded-xl bg-[#F4EFE6] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bell className="w-3.5 h-3.5 text-[#B45309] dark:text-amber-400 shrink-0" />
                  <span className="font-semibold text-[#182230] dark:text-slate-100 shrink-0">
                    Admissions &amp; School Updates:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    Admissions open for 2026–27 across Inizio, Novitiate, Mezzo &amp; Adroit (Ages 3.8–19 · Grades 1–12). Call +91-76250-03355.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openAdmissionsModal('visit')}
                  className="text-xs font-semibold text-[#B45309] dark:text-amber-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Schedule a Tour →
                </button>
              </div>

              {/* Section 1: Warm Daylight Editorial Hero Split */}
              <section className="space-y-6">
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-6 sm:p-10 lg:p-12 shadow-xs">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                    {/* Left Column: Warm Human Copy & Admissions CTAs */}
                    <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#B45309] dark:text-amber-400">
                          <span>Sampigehalli, Jakkur · Bengaluru</span>
                          <span aria-hidden="true" className="text-[#D8D0C0] dark:text-slate-600">·</span>
                          <span>NEP 2020 Open Learning · CBSE, Cambridge &amp; NIOS</span>
                          <span aria-hidden="true" className="text-[#D8D0C0] dark:text-slate-600">·</span>
                          <span>Ages 3.8–19 (Grades 1–12)</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-bold font-editorial tracking-tight leading-[1.12] text-[#182230] dark:text-white max-w-2xl">
                          Where Curious Minds Become Co-Creators of Knowledge
                        </h1>

                        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                          At Tattvaswayam Open Learning Resource Centre &amp; Future Academy, we blend inquiry-based NEP 2020 learning across 13 subjects with personal mentorship, flexible CBSE, Cambridge &amp; NIOS pathways, and real-time school bus peace of mind.
                        </p>
                      </div>

                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openAdmissionsModal('admissions')}
                            className="px-6 py-3.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-sm transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
                          >
                            <span>Admissions Open for 2026–27</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openAdmissionsModal('visit')}
                            className="px-5 py-3.5 rounded-xl bg-[#FAF9F6] dark:bg-slate-800 hover:bg-[#F4EFE6] dark:hover:bg-slate-700 text-[#182230] dark:text-slate-100 border border-[#D8D0C0] dark:border-slate-700 font-semibold text-sm transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
                          >
                            <Calendar className="w-4 h-4 text-[#B45309] dark:text-amber-400" />
                            <span>Book a Campus Visit</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 shrink-0 text-[#B45309] dark:text-amber-400" />
                            <span>#2060, Sampigehalli, Jakkur, Bengaluru 560064</span>
                          </span>
                          <span className="text-slate-400" aria-hidden="true">·</span>
                          <span>+91-76250-03355</span>
                          <span className="text-slate-400" aria-hidden="true">·</span>
                          <span>info@tattvaswayam.com</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Sunlit Campus Courtyard Photograph */}
                    <div className="lg:col-span-5 relative rounded-2xl overflow-hidden min-h-[260px] lg:min-h-[380px] bg-[#F4EFE6] dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700">
                      <img
                        src={heroCampusCourtyardImg}
                        alt="Students walking across the sunlit courtyard at Tattvaswayam in Sampigehalli, Jakkur, Bengaluru"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover lg:absolute lg:inset-0"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#182230]/85 via-[#182230]/45 to-transparent p-5 text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center">
                            <img
                              src="/assets/aistudio/Tattvaswayam_School_Logo_dd139741.png"
                              alt="Tattvaswayam Crest"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Sampigehalli, Jakkur Campus</div>
                            <div className="text-[11px] text-amber-200">
                              TURN open library, Wander &amp; Wonder gardens &amp; learning studios
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4-Column Family Trust Metrics Row Directly Below Hero Split */}
                <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Personal Mentorship</dt>
                    <dd className="text-2xl font-bold text-[#182230] dark:text-white font-editorial mt-1 tabular-nums">
                      1 : 18 Ratio
                    </dd>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Dedicated mentor for every small learner circle
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Four Learning Stages</dt>
                    <dd className="text-2xl font-bold text-[#182230] dark:text-white font-editorial mt-1">
                      Inizio – Adroit
                    </dd>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Ages 3.8–19 years · Grades 1–12 equivalent
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Holistic Breadth</dt>
                    <dd className="text-2xl font-bold text-[#182230] dark:text-white font-editorial mt-1 tabular-nums">
                      13 Subjects
                    </dd>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      STEM, Philosophy, Languages, Arts &amp; Out-of-Syllabus skills
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Door-to-Door Safety</dt>
                    <dd className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-editorial mt-1">
                      Live Bus Care
                    </dd>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      GPS Route 14 bus updates &amp; gate check-in alerts
                    </p>
                  </div>
                </dl>
              </section>

              {/* Section 2: Why Parents Choose Tattvaswayam & 4 Learning Stages */}
              <section className="space-y-8">
                <div className="max-w-2xl space-y-2">
                  <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 block">
                    Co-Creators of Knowledge · Zero Rote Learning
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#182230] dark:text-slate-100 font-editorial">
                    Why Parents Choose Tattvaswayam
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Rooted in NEP 2020 open learning, Tattvaswayam replaces high-pressure rote drills with choice-driven discovery, attentive mentorship, and calm daily transparency for families.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Editorial Mentorship Photograph */}
                  <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-[#E6E1D6] dark:border-slate-800 bg-[#F4EFE6] dark:bg-slate-900 relative min-h-[280px]">
                    <img
                      src={classroomMentorshipImg}
                      alt="A mentor guiding three smiling learners together at a sunlit wooden studio table"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover lg:absolute lg:inset-0"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#182230]/85 via-[#182230]/35 to-transparent p-5 text-white">
                      <p className="text-xs font-medium text-amber-200">Inquiry Over Memorization</p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        Learners sit beside facilitators to ask &ldquo;why&rdquo;, reflect in dialogue, and build real-world judgment.
                      </p>
                    </div>
                  </div>

                  {/* 4 Trust Pillars */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5">
                      <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 tabular-nums">
                        01. Flexible Academic Pathways
                      </span>
                      <h3 className="font-bold text-lg text-[#182230] dark:text-slate-100 font-editorial">
                        Open Learning, CBSE, Cambridge &amp; NIOS
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Children master all 13 subjects—Sciences, Mathematics, Languages, Philosophy, Music, Dance, and Sports—plus Out-of-Syllabus financial, media, and design skills.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5">
                      <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 tabular-nums">
                        02. Known &amp; Nurtured by Name
                      </span>
                      <h3 className="font-bold text-lg text-[#182230] dark:text-slate-100 font-editorial">
                        Small Mentor Circles (1:18 Ratio)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Low mentor-to-learner ratios mean every child is deeply understood—supported seamlessly by dedicated facilitators including our Inclusive Learning team.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        03. Peace of Mind Every Morning
                      </span>
                      <h3 className="font-bold text-lg text-[#182230] dark:text-slate-100 font-editorial">
                        Safe GPS-Monitored Transport
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Follow Route 14 live from pickup in Yelahanka, Sahakar Nagar, or Amruthahalli to Sampigehalli Gate 2, and receive instant check-in alerts when they arrive.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5">
                      <span className="text-xs font-semibold text-sky-800 dark:text-sky-400 tabular-nums">
                        04. Signature Campus Life
                      </span>
                      <h3 className="font-bold text-lg text-[#182230] dark:text-slate-100 font-editorial">
                        TURN Library, Vichar Manch &amp; Young Farmers
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Beyond textbooks, learners grow through The Unusual Reading Nook (TURN), Swayam Vichar Manch amphitheatre dialogues, and Wander &amp; Wonder ecological gardens.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Official Age-Based Stages from tattvaswayam.com */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-[#F4EFE6]/70 dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-[#B45309] dark:text-amber-400">
                      Inizio · Ages 3.8 – 5.8 yrs
                    </span>
                    <h3 className="font-bold text-base text-[#182230] dark:text-white font-editorial">
                      Early Curiosity &amp; Play
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Gentle literacy and numeracy woven through stories, rhythm, movement, and tactile wonder.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#F4EFE6]/70 dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-[#B45309] dark:text-amber-400">
                      Novitiate · Ages 5.9 – 10 yrs (Gr. 1–5)
                    </span>
                    <h3 className="font-bold text-base text-[#182230] dark:text-white font-editorial">
                      Foundations &amp; Expression
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Strengthening literature, TURN reading circles, mathematical reasoning, and nature exploration.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#F4EFE6]/70 dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-[#B45309] dark:text-amber-400">
                      Mezzo · Ages 11 – 14 yrs (Gr. 6–8)
                    </span>
                    <h3 className="font-bold text-base text-[#182230] dark:text-white font-editorial">
                      Independent Inquiry
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Transitioning to independent projects, field visits, conceptual depth, and early internships.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#F4EFE6]/70 dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-[#B45309] dark:text-amber-400">
                      Adroit · Ages 15 – 19 yrs (Gr. 9–12)
                    </span>
                    <h3 className="font-bold text-base text-[#182230] dark:text-white font-editorial">
                      Focused Pathways &amp; Readiness
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Personal mentorship toward CBSE, Cambridge, or NIOS pathways, portfolio ownership, and university readiness.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3: Real Parent Outcomes (Zero Tech Jargon) */}
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 block">
                      Designed Around Family Life
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#182230] dark:text-slate-100 font-editorial">
                      Every Part of Your Child&apos;s School Day, Connected
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click any card below to preview it firsthand
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Card 1: Safe Arrival & Bus Tracking */}
                  <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <Bus className="w-4 h-4" />
                          <span>Morning &amp; Afternoon Safety</span>
                        </span>
                        <span>Yelahanka · Sahakar Nagar · Jakkur</span>
                      </div>

                      <h3 className="font-bold text-xl text-[#182230] dark:text-slate-100 font-editorial">
                        Know Your Child Arrived Safely
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        See where your child&apos;s school bus is in real time, check realistic stop arrival times when Bengaluru traffic shifts, and receive gate check-in alerts the moment they step onto campus.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#F4EFE6] dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        5 staffed pickup &amp; drop stations
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          sessionState.state === 'REGISTERED' &&
                          sessionState.allowedFeatures.includes('bus_tracker')
                            ? setActiveTab('transit')
                            : setActiveTab('portal')
                        }
                        className="px-4 py-2 rounded-xl bg-[#182230] dark:bg-amber-600 hover:bg-[#243247] dark:hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {sessionState.state === 'REGISTERED' &&
                        sessionState.allowedFeatures.includes('bus_tracker') ? (
                          <span>Track School Bus</span>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sign In for Bus Tracker</span>
                          </>
                        )}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Clear Progress Across All 13 Subjects */}
                  <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-[#B45309] dark:text-amber-400 flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>Term Reports &amp; Feedback</span>
                        </span>
                        <span>Grades 1–12 · Printable Reports</span>
                      </div>

                      <h3 className="font-bold text-xl text-[#182230] dark:text-slate-100 font-editorial">
                        Clear Progress Across All 13 Subjects
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Follow weekly attendance trends, subject-wise marks, and thoughtful written notes from teachers—and download or print clean term report cards for your family records.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#F4EFE6] dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Term 1 report cards ready
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          sessionState.state === 'REGISTERED' &&
                          sessionState.allowedFeatures.includes('reports')
                            ? setActiveTab('rep')
                            : setActiveTab('portal')
                        }
                        className="px-4 py-2 rounded-xl bg-[#182230] dark:bg-amber-600 hover:bg-[#243247] dark:hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {sessionState.state === 'REGISTERED' &&
                        sessionState.allowedFeatures.includes('reports') ? (
                          <span>View Progress Reports</span>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sign In for Reports</span>
                          </>
                        )}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Explore Our Jakkur Campus */}
                  <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-sky-800 dark:text-sky-400 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>Interactive Campus Walk</span>
                        </span>
                        <span>#2060, Sampigehalli, Jakkur</span>
                      </div>

                      <h3 className="font-bold text-xl text-[#182230] dark:text-slate-100 font-editorial">
                        Explore Our Jakkur Campus
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        Take a guided look around TURN (The Unusual Reading Nook), our science labs, Swayam Vichar Manch amphitheatre, Wander &amp; Wonder gardens, and sports grounds before visiting in person.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#F4EFE6] dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Interactive map &amp; campus visits
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          sessionState.state === 'REGISTERED'
                            ? setActiveTab('campus')
                            : openAdmissionsModal('visit')
                        }
                        className="px-4 py-2 rounded-xl bg-[#182230] dark:bg-amber-600 hover:bg-[#243247] dark:hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <span>
                          {sessionState.state === 'REGISTERED' ? 'Explore Campus Map' : 'Book a Campus Visit'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card 4: 1-on-1 Guided Homework Support */}
                  <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-[#B45309] dark:text-amber-400 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          <span>After-School Study Companion</span>
                        </span>
                        <span>All 13 School Subjects</span>
                      </div>

                      <h3 className="font-bold text-xl text-[#182230] dark:text-slate-100 font-editorial">
                        1-on-1 Guided Homework Support
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        When your child gets stuck on Physics, Mathematics, Philosophy, or Languages at home, our step-by-step study guide walks them through the concept patiently—never just handing over answers.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#F4EFE6] dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Concept explanations &amp; practice quizzes
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          sessionState.state === 'REGISTERED' &&
                          sessionState.allowedFeatures.includes('homework')
                            ? setActiveTab('study')
                            : setActiveTab('portal')
                        }
                        className="px-4 py-2 rounded-xl bg-[#182230] dark:bg-amber-600 hover:bg-[#243247] dark:hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {sessionState.state === 'REGISTERED' &&
                        sessionState.allowedFeatures.includes('homework') ? (
                          <span>Open Homework &amp; Study</span>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sign In for Homework</span>
                          </>
                        )}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Leadership & Mentors + Voices from Our Parent Community */}
              <section className="space-y-8">
                {/* Message from Leadership & Core Mentors */}
                <div className="rounded-2xl bg-[#F4EFE6] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 p-6 sm:p-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
                    <div className="md:col-span-4 lg:col-span-3">
                      <div className="aspect-square max-w-[220px] mx-auto rounded-2xl overflow-hidden border border-[#D8D0C0] dark:border-slate-700 bg-white">
                        <img
                          src={leadershipPortraitImg}
                          alt="Centre Head Amrita standing inside TURN, The Unusual Reading Nook open library at Tattvaswayam"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-8 lg:col-span-9 space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 block">
                          Message from Our Founder &amp; Centre Leadership
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold text-[#182230] dark:text-white font-editorial">
                          &ldquo;Learners flourish when they are co-creators of knowledge—supported by warmth, inquiry, and genuine respect.&rdquo;
                        </h2>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        Dear Parents, at Tattvaswayam Open Learning Resource Centre &amp; Future Academy in Sampigehalli, Jakkur, we never measure a child by rote scores alone. Guided by Founder &amp; Managing Director <strong>Sandhya Gatti</strong> and Centre Head &amp; Chief Mentor <strong>Amrita</strong>, our facilitators sit beside learners across Inizio, Novitiate, Mezzo, and Adroit—helping each young person build clarity across Science, Mathematics, Literature, Philosophy, the Arts, and Out-of-Syllabus life skills.
                      </p>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6E1D6] dark:border-slate-800">
                        <div>
                          <div className="font-bold text-sm text-[#182230] dark:text-white">
                            Sandhya Gatti &amp; Amrita
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Founder &amp; Managing Director · Centre Head &amp; Chief Mentor
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openAdmissionsModal('visit')}
                          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#FAF9F6] dark:hover:bg-slate-700 border border-[#D8D0C0] dark:border-slate-700 text-xs font-semibold text-[#182230] dark:text-slate-100 transition cursor-pointer"
                        >
                          Meet Our Mentors on Campus →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Official Core Leadership & Facilitators Directory Strip */}
                  <div className="pt-5 border-t border-[#E6E1D6] dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-[#B45309] dark:text-amber-400 block mb-3">
                      Core Mentors &amp; Administration Team · Sampigehalli, Jakkur
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/85 dark:bg-slate-800/70 border border-[#E6E1D6] dark:border-slate-700">
                        <div className="font-bold text-[#182230] dark:text-white">Sangeetha</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">Chief Administrator</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/85 dark:bg-slate-800/70 border border-[#E6E1D6] dark:border-slate-700">
                        <div className="font-bold text-[#182230] dark:text-white">Sandhya Padmanabhan</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">Language &amp; Literature</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/85 dark:bg-slate-800/70 border border-[#E6E1D6] dark:border-slate-700">
                        <div className="font-bold text-[#182230] dark:text-white">Sushmitha</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">Mathematical Studies</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/85 dark:bg-slate-800/70 border border-[#E6E1D6] dark:border-slate-700">
                        <div className="font-bold text-[#182230] dark:text-white">Shravani</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">Early Childhood (Inizio)</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/85 dark:bg-slate-800/70 border border-[#E6E1D6] dark:border-slate-700">
                        <div className="font-bold text-[#182230] dark:text-white">Divya Dogra</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">Inclusive Learning</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voices from Our Parent Community */}
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 block">
                        Bengaluru Families Share Their Experience
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#182230] dark:text-slate-100 font-editorial mt-1">
                        Voices from Our Parent Community
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Parents of Primary, Middle &amp; Senior School Students
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <article className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <Quote className="w-5 h-5 text-[#B45309]/60 dark:text-amber-400/60" />
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          &ldquo;Moving from another city made us anxious, but Aarav&apos;s class teacher called us weekly during his first month. Because classes have only 18 students, he went from quiet observer to leading his Grade 4 science group in two terms.&rdquo;
                        </p>
                      </div>
                      <div className="pt-4 border-t border-[#F4EFE6] dark:border-slate-800">
                        <div className="font-bold text-sm text-[#182230] dark:text-white">
                          Mrs. Ananya Deshmukh
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Mother of Aarav, Grade 4 · Sahakar Nagar
                        </div>
                      </div>
                    </article>

                    <article className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <Quote className="w-5 h-5 text-[#B45309]/60 dark:text-amber-400/60" />
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          &ldquo;Both of us work full-time in Hebbal, so knowing exactly when Route 14 reaches Yelahanka and seeing the gate check-in message gives us enormous relief. Krishvika equally loves her Mathematics lab and classical dance periods.&rdquo;
                        </p>
                      </div>
                      <div className="pt-4 border-t border-[#F4EFE6] dark:border-slate-800">
                        <div className="font-bold text-sm text-[#182230] dark:text-white">
                          Mr. Karthik &amp; Mrs. Meera Nair
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Parents of Krishvika, Grade 8 · Yelahanka New Town
                        </div>
                      </div>
                    </article>

                    <article className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <Quote className="w-5 h-5 text-[#B45309]/60 dark:text-amber-400/60" />
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          &ldquo;In Grade 10, most schools narrow everything down to exam drills. Here, Vivan&apos;s mentors keep his physics and mathematics rigorous while encouraging philosophy, robotics, and sports. The term reports tell us how he thinks, not just a percentage.&rdquo;
                        </p>
                      </div>
                      <div className="pt-4 border-t border-[#F4EFE6] dark:border-slate-800">
                        <div className="font-bold text-sm text-[#182230] dark:text-white">
                          Dr. Ramesh Sharma
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Father of Vivan, Grade 10 · Amruthahalli
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </section>

              {/* Section 5: Public School Announcements & Office Contact + Portal Entry */}
              <section className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#F4EFE6] dark:border-slate-800 pb-3">
                      <div>
                        <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 block">
                          School Bulletin Board
                        </span>
                        <h2 className="text-xl font-bold text-[#182230] dark:text-slate-100 font-editorial">
                          Public School Announcements
                        </h2>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Jakkur Campus
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(publicSchoolInfo?.announcements || []).map((ann) => (
                        <article
                          key={ann.id}
                          className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-slate-800/50 border border-[#E6E1D6] dark:border-slate-700 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-[#B45309] dark:text-amber-400">
                              {ann.category}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-mono">
                              {ann.date}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-[#182230] dark:text-slate-100">
                            {ann.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {ann.content}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-6 rounded-2xl bg-[#F4EFE6] dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-[#B45309] dark:text-amber-400 block">
                        Admissions &amp; School Office
                      </span>
                      <h2 className="text-xl font-bold text-[#182230] dark:text-slate-100 font-editorial">
                        School Contact Details
                      </h2>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                        <span>{publicSchoolInfo?.address || '#2060, Sampigehalli, Jakkur, Bengaluru 560064'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#B45309] shrink-0" />
                        <span>{publicSchoolInfo?.phone || '+91-76250-03355'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#B45309] shrink-0" />
                        <span>{publicSchoolInfo?.email || 'info@tattvaswayam.com'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#B45309] shrink-0" />
                        <span>{publicSchoolInfo?.hours || 'Mon – Fri · 8:30 AM – 3:30 PM'}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#E6E1D6] dark:border-slate-800 space-y-2.5">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {sessionState.state === 'REGISTERED'
                          ? `Signed in as ${currentUserProfile?.name}. Access your role workspace cleanly.`
                          : 'Registered parents, students, facilitators, and staff can sign in to view Bus Tracker, Homework, Calendar, and Progress Reports.'}
                      </p>
                      {sessionState.state !== 'UNREGISTERED' && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('portal')}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#182230] dark:bg-amber-600 hover:bg-[#243247] text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>
                            {sessionState.state === 'REGISTERED'
                              ? 'Open My Portal Workspace'
                              : 'Sign In to Family & Staff Portal'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: EXPLORE OUR JAKKUR CAMPUS */}
          {activeTab === 'campus' && (
            sessionState.state === 'REGISTERED' ? (
              <div className="space-y-4 animate-view-enter">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#182230] dark:text-slate-100 font-editorial">
                      Explore Our Jakkur Campus
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Walk through Tattvaswayam&apos;s Open Learning Resource Centre, science labs, and courtyard. Drag to look around or choose a building below.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAdmissionsModal('visit')}
                    className="px-4 py-2 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-semibold text-xs transition cursor-pointer whitespace-nowrap"
                  >
                    Book an In-Person Tour
                  </button>
                </div>

                <CampusHologram isDark={isDark} />
              </div>
            ) : (
              <AccessDeniedView
                title={
                  sessionState.state === 'UNREGISTERED'
                    ? 'Account Not Registered'
                    : 'Sign In Required'
                }
                message={
                  sessionState.state === 'UNREGISTERED'
                    ? 'Your account isn’t registered with the school. Please contact the school office for access.'
                    : 'The interactive campus map workspace is reserved for signed-in school members.'
                }
                statusCode={sessionState.state === 'UNREGISTERED' ? 403 : 401}
                onNavigateHome={() => setActiveTab('home')}
                onNavigateLogin={() => setActiveTab('portal')}
                showLoginAction={sessionState.state === 'UNAUTHENTICATED'}
              />
            )
          )}

          {/* TAB 3: SCHOOL BUS ROUTE & SAFE ARRIVAL TRACKER */}
          {activeTab === 'transit' && (
            sessionState.state === 'REGISTERED' && sessionState.allowedFeatures.includes('bus_tracker') ? (
              <div className="space-y-6 animate-view-enter">
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#182230] dark:text-slate-100 font-editorial">
                      School Bus Route 14 &amp; Safe Arrival Tracker
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Live GPS bus updates from Yelahanka and Sahakar Nagar to Jakkur Gate 2, with instant pickup and arrival alerts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('portal')}
                      className="px-4 py-2 rounded-xl bg-[#182230] dark:bg-amber-600 hover:bg-[#243247] dark:hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <Bus className="w-4 h-4" />
                      <span>Open My Portal</span>
                    </button>
                  </div>
                </div>

                <LiveTransit
                  busRoute={state.busRoute}
                  isDark={isDark}
                  currentUser={currentUserProfile}
                  transportRequests={state.transportRequests}
                  onNavigateToParentPortal={() => setActiveTab('portal')}
                  onNavigateHome={() => setActiveTab('home')}
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
            ) : (
              <AccessDeniedView
                title="Bus Tracker Access Denied"
                message={
                  sessionState.state === 'UNREGISTERED'
                    ? 'Your account isn’t registered with the school. Please contact the school office for access.'
                    : sessionState.state === 'UNAUTHENTICATED'
                    ? 'Please sign in with a registered school account to view live school bus tracking.'
                    : 'Your assigned school role does not include Bus Tracker permissions.'
                }
                statusCode={sessionState.state === 'UNAUTHENTICATED' ? 401 : 403}
                onNavigateHome={() => setActiveTab('home')}
                onNavigateLogin={() => setActiveTab('portal')}
                showLoginAction={sessionState.state === 'UNAUTHENTICATED'}
              />
            )
          )}

          {/* TAB 3: HOMEWORK & STUDY LAB */}
          {activeTab === 'study' && (
            sessionState.state === 'REGISTERED' && sessionState.allowedFeatures.includes('homework') ? (
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
                onNavigateHome={() => setActiveTab('home')}
              />
            ) : (
              <AccessDeniedView
                title="Homework & Study Access Denied"
                message={
                  sessionState.state === 'UNREGISTERED'
                    ? 'Your account isn’t registered with the school. Please contact the school office for access.'
                    : sessionState.state === 'UNAUTHENTICATED'
                    ? 'Please sign in with a registered school account to view Homework & Study Support.'
                    : 'Your assigned school role does not include Homework & Study permissions.'
                }
                statusCode={sessionState.state === 'UNAUTHENTICATED' ? 401 : 403}
                onNavigateHome={() => setActiveTab('home')}
                onNavigateLogin={() => setActiveTab('portal')}
                showLoginAction={sessionState.state === 'UNAUTHENTICATED'}
              />
            )
          )}

          {/* TAB 4: ACADEMIC CALENDAR */}
          {activeTab === 'cal' && (
            sessionState.state === 'REGISTERED' && sessionState.allowedFeatures.includes('calendar') ? (
              <CalendarView
                events={state.events}
                counseling={state.counseling}
                currentUser={currentUserProfile}
                onToast={showToast}
                onNavigateToPortal={() => setActiveTab('portal')}
                onNavigateHome={() => setActiveTab('home')}
                onAddEvent={(newEvent) => {
                  setState((prev) => ({
                    ...prev,
                    events: [...prev.events, newEvent],
                  }));
                  showToast(`Event "${newEvent.title}" published to academic calendar.`);
                }}
              />
            ) : (
              <AccessDeniedView
                title="School Calendar Access Denied"
                message={
                  sessionState.state === 'UNREGISTERED'
                    ? 'Your account isn’t registered with the school. Please contact the school office for access.'
                    : sessionState.state === 'UNAUTHENTICATED'
                    ? 'Please sign in with a registered school account to view the School Calendar.'
                    : 'Your assigned school role does not include Calendar permissions.'
                }
                statusCode={sessionState.state === 'UNAUTHENTICATED' ? 401 : 403}
                onNavigateHome={() => setActiveTab('home')}
                onNavigateLogin={() => setActiveTab('portal')}
                showLoginAction={sessionState.state === 'UNAUTHENTICATED'}
              />
            )
          )}

          {/* TAB 5: 13-SUBJECT REPORTS & OFFICIAL TRANSCRIPTS */}
          {activeTab === 'rep' && (
            sessionState.state === 'REGISTERED' && sessionState.allowedFeatures.includes('reports') ? (
              <ReportsView
                currentUser={currentUserProfile}
                onNavigateToPortal={() => setActiveTab('portal')}
                onNavigateHome={() => setActiveTab('home')}
                attendanceRecords={state.attendanceRecords}
              />
            ) : (
              <AccessDeniedView
                title="Progress Reports Access Denied"
                message={
                  sessionState.state === 'UNREGISTERED'
                    ? 'Your account isn’t registered with the school. Please contact the school office for access.'
                    : sessionState.state === 'UNAUTHENTICATED'
                    ? 'Please sign in with a registered school account to view Progress Reports.'
                    : 'Your assigned school role does not include Progress Reports permissions.'
                }
                statusCode={sessionState.state === 'UNAUTHENTICATED' ? 401 : 403}
                onNavigateHome={() => setActiveTab('home')}
                onNavigateLogin={() => setActiveTab('portal')}
                showLoginAction={sessionState.state === 'UNAUTHENTICATED'}
              />
            )
          )}

          {/* TAB 6: DEDICATED OTP SITE / AUTHENTICATOR HUB (Restricted to Ms. Sandhya & Ms. Amrita) */}
          {activeTab === 'otp' && (
            isSuperAdmin ? (
              <OtpHubView
                currentUser={currentUserProfile}
                onNavigateToLogin={(targetKey) => {
                  if (targetKey) setPreselectedLoginUser(targetKey);
                  setActiveTab('portal');
                }}
                onNavigateToHome={() => setActiveTab('home')}
              />
            ) : (
              <AccessDeniedView
                title="OTP Directory Access Denied"
                message="The OTP Authenticator Directory is restricted to authorized school administrators."
                statusCode={sessionState.state === 'UNAUTHENTICATED' ? 401 : 403}
                onNavigateHome={() => setActiveTab('home')}
                onNavigateLogin={() => setActiveTab('portal')}
                showLoginAction={sessionState.state === 'UNAUTHENTICATED'}
              />
            )
          )}

          {/* TAB 7: PORTAL WORKSPACES */}
          {activeTab === 'portal' && (
            <div>
              {sessionState.state === 'UNREGISTERED' ? (
                <AccessDeniedView
                  title="Your account isn’t registered with the school"
                  message="Your account isn’t registered with the school. Please contact the school office for access. In the meantime, you can view public school details and announcements on the School page."
                  statusCode={403}
                  onNavigateHome={() => setActiveTab('home')}
                />
              ) : sessionState.state !== 'REGISTERED' || !currentUserProfile ? (
                <LoginView
                  initialUserKey={preselectedLoginUser}
                  onLoginSuccess={handleLoginSuccess}
                  onAuthSessionResolved={handleAuthSessionResolved}
                  expiredSessionMessage={expiredSessionMessage}
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
                  {/* Multi-Role Workspace Switcher when a user holds multiple roles (e.g., Staff/Facilitator + Parent) */}
                  {sessionState.roles.length > 1 && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-[#182230] dark:text-amber-100 block">
                          Multiple School Roles Active ({sessionState.roles.join(' + ')})
                        </span>
                        <span className="text-slate-600 dark:text-amber-200/80">
                          Switch between your authorized workspaces without signing out.
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {sessionState.roles.map((r) => {
                          const isCurrent = currentUserProfile.role === r;
                          const label =
                            r === 'teacher'
                              ? 'Facilitator View'
                              : r === 'parent'
                              ? 'Parent View'
                              : r === 'support'
                              ? 'Staff / Coordinator View'
                              : r === 'admin'
                              ? 'Admin View'
                              : `${r.charAt(0).toUpperCase() + r.slice(1)} View`;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setActivePortalRole(r)}
                              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-[#B45309] text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-100/60'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                      chatHistory={state.chatHistory[state.currentUser || currentUserProfile.userKey || ''] || []}
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
                      onRefreshSession={refreshAuthSession}
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
                      notifications={state.notifications[state.currentUser || currentUserProfile.userKey || ''] || []}
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

        {/* Parent Inquiry & Admission Registration Modal */}
        <AdmissionsInquiryModal
          isOpen={isAdmissionsModalOpen}
          initialMode={admissionsModalMode}
          onClose={() => setIsAdmissionsModalOpen(false)}
          onSuccessToast={showToast}
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

        {/* Warm Editorial School Footer */}
        <footer className="border-t border-[#E6E1D6] dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-xs text-slate-500 dark:text-slate-400 mt-12 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[#F4EFE6] dark:border-slate-800 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#182230] dark:bg-amber-600 text-white flex items-center justify-center font-editorial font-bold text-xs">
                    T
                  </div>
                  <span className="font-bold text-sm text-[#182230] dark:text-slate-100 tracking-tight font-editorial">
                    Tattvaswayam Open Learning Resource Centre &amp; Future Academy
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  NEP 2020 Open Learning · CBSE, Cambridge &amp; NIOS Assessment Pathways · Inizio to Adroit (Ages 3.8–19 / Grades 1–12)
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#B45309] dark:text-amber-400 shrink-0" />
                  <span>#2060, Sampigehalli, Jakkur, Bengaluru 560064</span>
                  <span aria-hidden="true">·</span>
                  <span>+91-76250-03355</span>
                  <span aria-hidden="true">·</span>
                  <span>info@tattvaswayam.com</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => openAdmissionsModal('admissions')}
                  className="font-semibold text-[#B45309] dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Admissions 2026–27
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => openAdmissionsModal('visit')}
                  className="hover:text-[#182230] dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Book a Campus Visit
                </button>
                {sessionState.state === 'REGISTERED' &&
                  sessionState.allowedFeatures.includes('reports') && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('rep')}
                        className="hover:text-[#182230] dark:hover:text-slate-200 transition cursor-pointer"
                      >
                        Progress Reports
                      </button>
                    </>
                  )}
                {sessionState.state === 'REGISTERED' &&
                  sessionState.allowedFeatures.includes('calendar') && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('cal')}
                        className="hover:text-[#182230] dark:hover:text-slate-200 transition cursor-pointer"
                      >
                        School Calendar
                      </button>
                    </>
                  )}
                {sessionState.state === 'REGISTERED' && sessionState.isDemoSession && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => setIsGuidedTourOpen(true)}
                      className="hover:text-[#182230] dark:hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 text-[#B45309] dark:text-amber-400" />
                      <span>Quick Demo Tour</span>
                    </button>
                  </>
                )}
                {isSuperAdmin && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('otp')}
                      className="hover:text-[#182230] dark:hover:text-slate-200 transition font-semibold cursor-pointer"
                    >
                      Super Admin OTP Directory
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <div>
                © 2026 Tattvaswayam Open Learning Resource Centre &amp; Future Academy, Sampigehalli, Jakkur, Bengaluru.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setThemeMode((prev) => {
                      if (prev === 'system') {
                        showToast('Theme set to Dark Mode.');
                        return 'dark';
                      }
                      if (prev === 'dark') {
                        showToast('Theme set to Light Mode.');
                        return 'light';
                      }
                      showToast('Theme synced to System OS.');
                      return 'system';
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E6E1D6] dark:border-slate-700 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 text-[#182230] dark:text-slate-300 font-medium transition cursor-pointer"
                >
                  {themeMode === 'system' ? (
                    <Laptop className="w-3.5 h-3.5 text-[#B45309]" />
                  ) : isDark ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-[#182230]" />
                  )}
                  <span>
                    Theme: {themeMode === 'system' ? 'Auto' : themeMode === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProjectorMode((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    isProjectorMode
                      ? 'border-[#B45309] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                      : 'border-[#E6E1D6] dark:border-slate-700 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 text-[#182230] dark:text-slate-300'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>{isProjectorMode ? 'Projector: On' : 'Projector Mode'}</span>
                </button>

                <a
                  href="/tattvasayam-future-academy-portal.zip"
                  download="tattvasayam-future-academy-portal.zip"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E6E1D6] dark:border-slate-700 hover:bg-[#F4EFE6] dark:hover:bg-slate-800 text-[#182230] dark:text-slate-300 font-medium transition"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>School Portal Archive</span>
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Seamless Cross-Role Floating Demo Switcher ONLY when Signed In with a Demo Session */}
        {sessionState.state === 'REGISTERED' && sessionState.isDemoSession && currentUserProfile && (
          <RoleSwitcherBar
            currentUser={currentUserProfile}
            allowedFeatures={sessionState.allowedFeatures}
            onSwitchRole={(userKey) => {
              handleLoginSuccess(userKey, activeTab === 'transit');
            }}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {/* Full-Screen Emergency Warning Overlay across all active student / teacher sessions */}
        {state.emergencyLockdown?.active &&
          (currentUserProfile?.role === 'student' || currentUserProfile?.role === 'teacher') && (
            <EmergencyLockdownOverlay
              lockdown={state.emergencyLockdown}
              currentUser={currentUserProfile}
              onSwitchToAuthority={(target) => {
                handleLoginSuccess(target === 'principal' ? 'principal' : 'sai');
                showToast(
                  `Switched to ${target === 'principal' ? 'Ms. Amrita (Centre Head)' : 'Mr. Sai (Gate Security)'} to manage campus lockdown.`
                );
              }}
            />
        )}
      </div>
    </ErrorBoundary>
  );
}
