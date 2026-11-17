import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn, Phone, Mail } from 'lucide-react';
import { AuthSessionState, ProtectedFeature } from '../types';
import { featureLabel } from '../services/authService';

interface AccessDeniedViewProps {
  authState?: AuthSessionState;
  requiredFeature?: ProtectedFeature;
  email?: string;
  roles?: string[];
  reason?: string;
  title?: string;
  message?: string;
  statusCode?: number;
  showLoginAction?: boolean;
  onGoHome?: () => void;
  onGoLogin?: () => void;
  onNavigateHome?: () => void;
  onNavigateLogin?: () => void;
  onLogout?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  authState,
  requiredFeature,
  email,
  roles,
  reason,
  title,
  message,
  statusCode,
  showLoginAction,
  onGoHome,
  onGoLogin,
  onNavigateHome,
  onNavigateLogin,
  onLogout,
}) => {
  const featureTitle = requiredFeature ? featureLabel(requiredFeature) : 'Protected School Resource';
  const resolvedStatusCode = statusCode ?? (authState === 'UNAUTHENTICATED' ? 401 : 403);
  const effectiveAuthState: AuthSessionState =
    authState ?? (resolvedStatusCode === 401 ? 'UNAUTHENTICATED' : 'UNREGISTERED');
  const resolvedGoHome = onGoHome || onNavigateHome || (() => {});
  const resolvedGoLogin = onGoLogin || onNavigateLogin || (() => {});
  const canShowLogin = showLoginAction ?? effectiveAuthState === 'UNAUTHENTICATED';

  const defaultReason =
    effectiveAuthState === 'UNREGISTERED'
      ? 'Your account isn’t registered with the school. Please contact the school office for access.'
      : effectiveAuthState === 'UNAUTHENTICATED'
      ? `Access Denied: Please sign in with a registered Tattvaswayam account to view ${featureTitle}.`
      : `Access Denied: Your current role${roles?.length ? ` (${roles.join(', ')})` : ''} is not permitted to access ${featureTitle}.`;

  return (
    <div className="max-w-xl mx-auto py-10 px-4 animate-view-enter">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm overflow-hidden">
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            {resolvedStatusCode === 401 ? (
              <Lock className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
              {resolvedStatusCode === 401 ? '401 · Authentication Required' : `${resolvedStatusCode} · Access Denied`}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#182230] dark:text-white font-editorial">
              {title || `Access Denied — ${featureTitle}`}
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-5 text-sm text-slate-700 dark:text-slate-300">
          <p className="leading-relaxed font-medium text-slate-800 dark:text-slate-100">
            {message || reason || defaultReason}
          </p>

          {email && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Signed in email: </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{email}</span>
            </div>
          )}

          {effectiveAuthState === 'UNREGISTERED' && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs space-y-2 text-amber-950 dark:text-amber-200">
              <p className="font-bold">School Office Access Desk</p>
              <div className="flex flex-wrap gap-4 text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-700" />
                  <span>+91-76250-03355</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-700" />
                  <span>info@tattvaswayam.com</span>
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={resolvedGoHome}
              className="px-4 py-2.5 rounded-xl bg-[#182230] dark:bg-slate-800 hover:bg-[#243247] text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to School Page</span>
            </button>

            {canShowLogin && (
              <button
                type="button"
                onClick={resolvedGoLogin}
                className="px-4 py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {effectiveAuthState === 'UNREGISTERED' && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                Sign Out &amp; Try Another Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
