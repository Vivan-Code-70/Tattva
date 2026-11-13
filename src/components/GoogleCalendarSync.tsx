import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight,
  Upload,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  signInWithGoogleCalendar,
  signOutGoogleCalendar,
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  subscribeGoogleAuth,
  GoogleCalendarItem,
  GoogleCalendarAuthStatus,
  getCachedAccessToken,
} from '../services/googleCalendarService';
import { CalendarEvent } from '../types';

interface GoogleCalendarSyncProps {
  academyEvents: CalendarEvent[];
  onGoogleEventsUpdated: (events: GoogleCalendarItem[]) => void;
  showGoogleEvents: boolean;
  onToggleShowGoogleEvents: (show: boolean) => void;
  onToast: (msg: string) => void;
}

export const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({
  academyEvents,
  onGoogleEventsUpdated,
  showGoogleEvents,
  onToggleShowGoogleEvents,
  onToast,
}) => {
  const [authStatus, setAuthStatus] = useState<GoogleCalendarAuthStatus>({
    isSignedIn: false,
    user: null,
    hasToken: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchedEvents, setFetchedEvents] = useState<GoogleCalendarItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pushSuccessCount, setPushSuccessCount] = useState<number | null>(null);

  // Subscribe to auth state updates
  useEffect(() => {
    const unsubscribe = subscribeGoogleAuth((status) => {
      setAuthStatus(status);
      if (!status.hasToken) {
        setFetchedEvents([]);
        onGoogleEventsUpdated([]);
      }
    });
    return () => unsubscribe();
  }, [onGoogleEventsUpdated]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleCalendar();
      onToast(`Connected as ${res.user.displayName || res.user.email}! Fetching calendar events...`);
      // Immediately fetch upcoming events
      await handleFetchEvents();
      setIsExpanded(true);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Failed to sign in with Google Calendar';
      setErrorMsg(msg);
      onToast(`Authorization notice: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogleCalendar();
      setFetchedEvents([]);
      onGoogleEventsUpdated([]);
      setLastSyncTime(null);
      onToast('Disconnected from Google Calendar.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleFetchEvents = async () => {
    if (!getCachedAccessToken()) {
      setErrorMsg('Please connect your Google Calendar first.');
      return;
    }

    setIsFetching(true);
    setErrorMsg(null);
    try {
      const events = await fetchGoogleCalendarEvents();
      setFetchedEvents(events);
      onGoogleEventsUpdated(events);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(timeStr);
      onToast(`Fetched ${events.length} Google Calendar event(s).`);
    } catch (err: any) {
      console.error('Fetch error:', err);
      const msg = err?.message || 'Could not fetch Google Calendar events.';
      setErrorMsg(msg);
      onToast(`Sync error: ${msg}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handlePushAcademicEvents = async () => {
    if (!getCachedAccessToken()) {
      onToast('Please sign in with Google first.');
      return;
    }

    const upcoming = academyEvents.slice(0, 10);
    const confirmed = window.confirm(
      `Push ${upcoming.length} institutional event(s) to your primary Google Calendar?\n\n` +
        upcoming.map((e) => `• ${e.date}: ${e.title}`).join('\n')
    );
    if (!confirmed) return;

    setIsPushing(true);
    setErrorMsg(null);
    let successCount = 0;

    try {
      for (const ev of upcoming) {
        await createGoogleCalendarEvent({
          summary: `[TFA] ${ev.title}`,
          description: ev.description || `Category: ${ev.type} • Tattvasayam Future Academy institutional schedule`,
          date: ev.date,
          isAllDay: true,
        });
        successCount++;
      }
      setPushSuccessCount(successCount);
      onToast(`Exported ${successCount} event(s) to your Google Calendar!`);
      // Refresh to include new events
      await handleFetchEvents();
    } catch (err: any) {
      console.error('Push error:', err);
      setErrorMsg(err?.message || 'Failed to push some events to Google Calendar.');
      onToast(`Export partial error: ${err?.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  const isConnected = authStatus.isSignedIn && authStatus.hasToken;

  return (
    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 p-4 sm:p-5 shadow-xs transition">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-stone-800 flex items-center justify-center shrink-0 border border-orange-200 dark:border-stone-700">
            {/* Google Calendar official color-inspired icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              <path fill="#ffffff" d="M19 19H5V8h14v11z" />
              <path fill="#EA4335" d="M11 10h2v5h-2z" />
              <path fill="#FBBC05" d="M7 10h2v5H7z" />
              <path fill="#34A853" d="M15 10h2v5h-2z" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Google Calendar Sync
              </h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isConnected
                ? `Active account: ${authStatus.user?.displayName || authStatus.user?.email || 'Authorized'}`
                : 'Authorize your Google Calendar to overlay upcoming personal & academic appointments'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold text-stone-800 dark:text-stone-100 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-600 shadow-xs transition hover:shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              <span>{isLoading ? 'Authorizing...' : 'Sign in with Google'}</span>
            </button>
          ) : (
            <>
              {/* Overlay Toggle */}
              <button
                onClick={() => onToggleShowGoogleEvents(!showGoogleEvents)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  showGoogleEvents
                    ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                    : 'bg-stone-50 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }`}
                title="Toggle Google Calendar events on the main calendar"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showGoogleEvents ? 'Overlay Active' : 'Overlay Hidden'}</span>
              </button>

              {/* Refresh / Fetch Events */}
              <button
                onClick={handleFetchEvents}
                disabled={isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                <span>{isFetching ? 'Syncing...' : 'Fetch Events'}</span>
              </button>

              {/* Push Academic to Google */}
              <button
                onClick={handlePushAcademicEvents}
                disabled={isPushing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition disabled:opacity-50"
                title="Add upcoming TFA academic events to your Google Calendar"
              >
                <Upload className="w-3.5 h-3.5 text-orange-600" />
                <span>{isPushing ? 'Exporting...' : 'Push to G-Cal'}</span>
              </button>

              {/* Expand details */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition"
                title={isExpanded ? 'Collapse' : 'View events list'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Disconnect */}
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 text-stone-400 hover:text-red-600 transition"
                title="Disconnect Google Calendar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[11px] underline font-medium hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Expanded Synchronized Events Drawer */}
      {isConnected && isExpanded && (
        <div className="mt-4 pt-4 border-t border-orange-100 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-stone-700 dark:text-stone-300">
              <CalendarCheck className="w-4 h-4 text-blue-600" />
              <span>
                Upcoming Google Calendar Events ({fetchedEvents.length} retrieved)
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-[11px] text-stone-400 font-mono">
                Last synced at {lastSyncTime}
              </span>
            )}
          </div>

          {fetchedEvents.length === 0 ? (
            <div className="p-5 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-950/40 rounded-xl">
              <Clock className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-blue-500" />
              <p>No upcoming events retrieved yet or calendar is empty for this period.</p>
              <button
                onClick={handleFetchEvents}
                className="mt-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Click here to fetch events
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {fetchedEvents.map((ev) => {
                const dateDisplay = ev.start.dateTime
                  ? new Date(ev.start.dateTime).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ev.start.date || 'All Day';

                return (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                          G-Cal
                        </span>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 truncate">
                          {ev.summary || '(Untitled Event)'}
                        </h4>
                      </div>
                      <div className="text-[11px] text-blue-700 dark:text-blue-300 font-mono mt-0.5">
                        {dateDisplay}
                      </div>
                      {ev.location && (
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          📍 {ev.location}
                        </div>
                      )}
                    </div>

                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0 transition"
                        title="Open in Google Calendar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
