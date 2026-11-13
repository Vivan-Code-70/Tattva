import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Ensure Firebase is initialized once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.acls',
  'https://www.googleapis.com/auth/calendar.acls.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.calendarlist',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.events.owned.readonly',
  'https://www.googleapis.com/auth/calendar.events.public.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly',
  // Google Drive & Google Sheets
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  // Gmail
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

const provider = new GoogleAuthProvider();
CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));
// Request offline access / prompt select account if needed
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track popup sign-in
let isSigningIn = false;
// Token cached in memory ONLY (never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  status?: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

export interface GoogleCalendarAuthStatus {
  isSignedIn: boolean;
  user: User | null;
  hasToken: boolean;
}

type AuthCallback = (status: GoogleCalendarAuthStatus) => void;
const listeners = new Set<AuthCallback>();

function notifyListeners() {
  const status: GoogleCalendarAuthStatus = {
    isSignedIn: !!cachedUser,
    user: cachedUser,
    hasToken: !!cachedAccessToken,
  };
  listeners.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {
      console.error('Error in Google Calendar auth listener:', e);
    }
  });
}

export function subscribeGoogleAuth(callback: AuthCallback): () => void {
  listeners.add(callback);
  // Send initial state immediately
  callback({
    isSignedIn: !!cachedUser,
    user: cachedUser,
    hasToken: !!cachedAccessToken,
  });
  return () => {
    listeners.delete(callback);
  };
}

// Initialize Auth listener
export function initGoogleCalendarAuth() {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
    notifyListeners();
  });
}

// Sign in with Google using Firebase Auth popup
export async function signInWithGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google Calendar access token was not returned by Google authorization.');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyListeners();

    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (error: any) {
    console.error('Failed to sign in with Google Calendar:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

// Disconnect / Sign out
export async function signOutGoogleCalendar(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  notifyListeners();
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function getCachedGoogleUser(): User | null {
  return cachedUser;
}

/**
 * Fetch events from Google Calendar API
 */
export async function fetchGoogleCalendarEvents(options?: {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}): Promise<GoogleCalendarItem[]> {
  if (!cachedAccessToken) {
    throw new Error('Google Calendar authorization required. Please sign in with your Google account.');
  }

  const params = new URLSearchParams();
  // Default range: from start of current month or custom
  if (options?.timeMin) {
    params.set('timeMin', options.timeMin);
  } else {
    // 3 months in the past to 6 months ahead by default
    const past = new Date();
    past.setMonth(past.getMonth() - 2);
    past.setDate(1);
    past.setHours(0, 0, 0, 0);
    params.set('timeMin', past.toISOString());
  }

  if (options?.timeMax) {
    params.set('timeMax', options.timeMax);
  } else {
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    params.set('timeMax', future.toISOString());
  }

  params.set('singleEvents', 'true');
  params.set('orderBy', 'startTime');
  params.set('maxResults', String(options?.maxResults || 100));

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      notifyListeners();
      throw new Error('Google Calendar access token expired or revoked. Please reconnect your account.');
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Google Calendar API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.items || []) as GoogleCalendarItem[];
}

/**
 * Push an event to Google Calendar
 */
export async function createGoogleCalendarEvent(eventData: {
  summary: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // e.g. "09:00:00"
  endTime?: string; // e.g. "10:30:00"
  isAllDay?: boolean;
}): Promise<GoogleCalendarItem> {
  if (!cachedAccessToken) {
    throw new Error('Google Calendar authorization required.');
  }

  const payload: any = {
    summary: eventData.summary,
    description: eventData.description || 'Added from Tattvasayam Future Academy Portal',
    location: eventData.location || 'Tattvasayam Future Academy, Jakkur, Bengaluru',
  };

  if (eventData.isAllDay || !eventData.startTime) {
    // All-day event in Google Calendar: end date is exclusive (day after)
    const nextDate = new Date(eventData.date + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    payload.start = { date: eventData.date };
    payload.end = { date: nextDateStr };
  } else {
    // Timed event
    const startIso = `${eventData.date}T${eventData.startTime}`;
    const endIso = `${eventData.date}T${eventData.endTime || eventData.startTime}`;
    payload.start = { dateTime: new Date(startIso).toISOString() };
    payload.end = { dateTime: new Date(endIso).toISOString() };
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to create event in Google Calendar: ${response.status}`);
  }

  return (await response.json()) as GoogleCalendarItem;
}

/**
 * Delete an event with mandatory user confirmation dialog
 */
export async function deleteGoogleCalendarEvent(eventId: string, summary: string): Promise<boolean> {
  if (!cachedAccessToken) {
    throw new Error('Google Calendar authorization required.');
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete "${summary}" from your Google Calendar? This action cannot be undone.`
  );
  if (!confirmed) return false;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete event: HTTP ${response.status}`);
  }

  return true;
}
