import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './googleCalendarService';
import {
  ProtectedFeature,
  PublicSchoolInfo,
  RegisteredUserRecord,
  SessionStatusResponse,
  UserRole,
} from '../types';

const TOKEN_STORAGE_KEY = 'tattvaswayam_rbac_token';

const googleLoginProvider = new GoogleAuthProvider();
googleLoginProvider.addScope('email');
googleLoginProvider.addScope('profile');
googleLoginProvider.setCustomParameters({ prompt: 'select_account' });

export class ApiAccessError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type SessionExpiryListener = (reason: string) => void;
const expiryListeners = new Set<SessionExpiryListener>();

export function onSessionExpired(listener: SessionExpiryListener): () => void {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

function notifySessionExpired(reason: string) {
  clearStoredToken();
  expiryListeners.forEach((cb) => {
    try {
      cb(reason);
    } catch {
      // ignore listener errors
    }
  });
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearStoredToken() {
  setStoredToken(null);
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const code = data?.code || `HTTP_${resp.status}`;
    const msg = data?.error || data?.message || `Access Denied (${resp.status})`;
    if (resp.status === 401 && code === 'SESSION_EXPIRED') {
      notifySessionExpired(msg);
    }
    throw new ApiAccessError(msg, resp.status, code);
  }
  return data as T;
}

export const AuthService = {
  async fetchPublicSchoolInfo(): Promise<PublicSchoolInfo | null> {
    try {
      const res = await fetch('/api/public/school');
      if (!res.ok) return null;
      const data = await res.json();
      return data.school || null;
    } catch {
      return null;
    }
  },

  async fetchSession(): Promise<SessionStatusResponse> {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch('/api/auth/session', {
      credentials: 'include',
      headers,
    });

    const data = await resp.json().catch(() => ({}));
    if (resp.status === 401 && data?.code === 'SESSION_EXPIRED') {
      notifySessionExpired(data?.message || 'Your session has expired. Please sign in again.');
      return {
        state: 'UNAUTHENTICATED',
        authenticated: false,
        registered: false,
        user: null,
        roles: [],
        allowedFeatures: [],
        message: data?.message,
      };
    }

    if (!resp.ok) {
      return {
        state: 'UNAUTHENTICATED',
        authenticated: false,
        registered: false,
        user: null,
        roles: [],
        allowedFeatures: [],
      };
    }

    return data as SessionStatusResponse;
  },

  async signInWithGoogle(): Promise<SessionStatusResponse & { token?: string }> {
    const result = await signInWithPopup(auth, googleLoginProvider);
    const idToken = await result.user.getIdToken(true);
    const data = await apiFetch<SessionStatusResponse & { token?: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async signInWithCredentials(params: {
    identifier: string;
    authMode: 'password' | 'otp' | 'mpin';
    secretValue: string;
    isDemoSession?: boolean;
  }): Promise<SessionStatusResponse & { token?: string }> {
    const data = await apiFetch<SessionStatusResponse & { token?: string }>('/api/auth/credentials', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async switchDemoRole(targetUserKey: string): Promise<SessionStatusResponse & { token?: string }> {
    const data = await apiFetch<SessionStatusResponse & { token?: string }>('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ targetUserKey }),
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async expireSessionForTest(): Promise<void> {
    try {
      await apiFetch('/api/auth/expire-session', { method: 'POST' });
    } finally {
      notifySessionExpired('Your session has expired. Please sign in again.');
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    clearStoredToken();
  },

  // Protected Feature Scoped APIs
  async fetchBusTracker() {
    return apiFetch<{ success: boolean; busTracker: any; roles: UserRole[] }>('/api/bus-tracker');
  },

  async fetchHomework() {
    return apiFetch<{
      success: boolean;
      canManage: boolean;
      assignedClasses: string[];
      assignments: any[];
    }>('/api/homework');
  },

  async createHomework(payload: { subject: string; title: string; due: string; classGrade?: string }) {
    return apiFetch<{ success: boolean; assignment: any }>('/api/homework', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async toggleHomework(assignmentId: string, studentKey?: string) {
    return apiFetch<{ success: boolean; assignment: any }>(
      `/api/homework/${encodeURIComponent(assignmentId)}/toggle`,
      {
        method: 'PATCH',
        body: JSON.stringify({ studentKey }),
      }
    );
  },

  async fetchCalendar() {
    return apiFetch<{
      success: boolean;
      canEdit: boolean;
      events: any[];
      counseling: any[];
    }>('/api/calendar');
  },

  async createCalendarEvent(payload: { date: string; title: string; type: string; description?: string }) {
    return apiFetch<{ success: boolean; event: any }>('/api/calendar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async fetchScopedReports() {
    return apiFetch<{
      success: boolean;
      roles: UserRole[];
      assignedClasses: string[];
      childrenKeys: string[];
      reports: Array<{
        studentKey: string;
        studentId: string;
        name: string;
        grade: string;
        optedSubjects: string[];
        scores: number[];
        attendancePercent: number;
        presentDays: number;
        totalDays: number;
      }>;
    }>('/api/reports');
  },

  async fetchStudentReport(studentKey: string) {
    return apiFetch<{ success: boolean; report: any }>(`/api/reports/${encodeURIComponent(studentKey)}`);
  },

  // Admin RBAC Directory APIs
  async listRegisteredUsers() {
    return apiFetch<{ success: boolean; users: RegisteredUserRecord[] }>('/api/admin/users');
  },

  async registerUser(payload: {
    email: string;
    name: string;
    roles: UserRole[];
    title?: string;
    assignedClasses?: string[];
    childrenKeys?: string[];
    linkedStudentKey?: string;
  }) {
    return apiFetch<{ success: boolean; user: RegisteredUserRecord }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUserRoles(
    userKey: string,
    updates: {
      roles?: UserRole[];
      primaryRole?: UserRole;
      title?: string;
      active?: boolean;
      assignedClasses?: string[];
      childrenKeys?: string[];
    }
  ) {
    return apiFetch<{ success: boolean; user: RegisteredUserRecord }>(
      `/api/admin/users/${encodeURIComponent(userKey)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  },

  async removeRegisteredUser(userKey: string) {
    return apiFetch<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(userKey)}`, {
      method: 'DELETE',
    });
  },
};

export function featureLabel(feature: ProtectedFeature): string {
  switch (feature) {
    case 'bus_tracker':
      return 'Bus Tracker';
    case 'homework':
      return 'Homework & Study Help';
    case 'homework_manage':
      return 'Homework Management';
    case 'calendar':
      return 'School Calendar';
    case 'reports':
      return 'Progress Reports';
    case 'admin_users':
      return 'User & Role Directory';
    case 'otp_directory':
      return 'OTP Directory';
    default:
      return feature;
  }
}
