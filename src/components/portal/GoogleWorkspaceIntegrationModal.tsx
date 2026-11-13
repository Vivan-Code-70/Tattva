import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Loader2,
  LogOut,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  signInWithGoogleCalendar,
  signOutGoogleCalendar,
  subscribeGoogleAuth,
  GoogleCalendarAuthStatus,
  getCachedAccessToken,
  getCachedGoogleUser,
} from '../../services/googleCalendarService';
import { GoogleSheetsService, CreatedSpreadsheetResult } from '../../services/googleSheetsService';
import { GmailService, SentEmailResult } from '../../services/gmailService';
import { DayAttendanceExportItem, getDailyAttendanceExportDatasets } from '../../utils/attendanceExport';
import { AttendanceRecord, UserProfile } from '../../types';

interface GoogleWorkspaceIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'sheets' | 'gmail';
  attendanceRecords?: AttendanceRecord[];
  currentUser: UserProfile | null;
  onToast: (msg: string) => void;
}

export const GoogleWorkspaceIntegrationModal: React.FC<GoogleWorkspaceIntegrationModalProps> = ({
  isOpen,
  onClose,
  mode,
  attendanceRecords = [],
  currentUser,
  onToast,
}) => {
  const [authStatus, setAuthStatus] = useState<GoogleCalendarAuthStatus>({
    isSignedIn: false,
    user: null,
    hasToken: false,
  });

  const [activeTab, setActiveTab] = useState<'sheets' | 'gmail'>(mode);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sheets state
  const [createdSheet, setCreatedSheet] = useState<CreatedSpreadsheetResult | null>(null);
  const [isExportingSheet, setIsExportingSheet] = useState(false);

  // Gmail state (Explicit confirmation required before sending)
  const [recipientEmail, setRecipientEmail] = useState<string>(() => {
    return currentUser?.email || 'rubikscubedailynews@gmail.com';
  });
  const [emailSubject, setEmailSubject] = useState<string>(
    'Tattvasayam Future Academy - Weekly Campus Attendance Trend Report (Nov 2026)'
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sentResult, setSentResult] = useState<SentEmailResult | null>(null);
  const [confirmedByUser, setConfirmedByUser] = useState(false);

  // Subscribe to auth state updates
  useEffect(() => {
    const unsubscribe = subscribeGoogleAuth((status) => {
      setAuthStatus(status);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setActiveTab(mode);
    setErrorMsg(null);
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const dataset = getDailyAttendanceExportDatasets(attendanceRecords)[0];
  const dailyData: DayAttendanceExportItem[] = dataset.data;
  const avgTurnout = dailyData.reduce((s, d) => s + d.overallAttendance, 0) / dailyData.length;

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleCalendar();
      onToast(`Connected to Google Workspace as ${res.user.displayName || res.user.email}!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to authorize with Google Workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogleCalendar();
      setCreatedSheet(null);
      setSentResult(null);
      onToast('Disconnected from Google Workspace.');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Export to Google Sheets
  const handleExportToSheets = async () => {
    setIsExportingSheet(true);
    setErrorMsg(null);
    try {
      const result = await GoogleSheetsService.createAttendanceSpreadsheet(
        `Tattvasayam Academy - Weekly Attendance Trend (${dataset.dateRange})`,
        dailyData,
        {
          avgOverall: Math.round(avgTurnout * 100) / 100,
          avgGrade10: 99.3,
          avgGrade8: 98.4,
          avgOnTime: 97.9,
          totalScans: 2185,
          totalEnrolled: 2210,
        }
      );
      setCreatedSheet(result);
      onToast(`Google Spreadsheet created: "${result.title}"!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to create Google Spreadsheet.');
    } finally {
      setIsExportingSheet(false);
    }
  };

  // Send Email via Gmail (Requires explicit user confirmation)
  const handleSendEmail = async () => {
    if (!confirmedByUser) {
      setErrorMsg('Please review and check the confirmation checkbox before dispatching this email.');
      return;
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMsg('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    setErrorMsg(null);

    try {
      const htmlBody = GmailService.buildAttendanceEmailHtml(
        currentUser?.name || 'Academy Stakeholder',
        dataset.dateRange,
        dailyData,
        avgTurnout
      );

      const result = await GmailService.sendEmail({
        to: recipientEmail,
        subject: emailSubject,
        bodyHtml: htmlBody,
      });

      setSentResult(result);
      onToast(`Email sent via Gmail to ${recipientEmail} (ID: ${result.id.slice(0, 8)}…)`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to dispatch email via Gmail API.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-2xl border border-orange-200 dark:border-amber-950 p-5 sm:p-6 my-6 max-h-[92vh] overflow-y-auto space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              {activeTab === 'sheets' ? (
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Mail className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-stone-900 dark:text-stone-100 font-display">
                Google Workspace Integration
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sync academic attendance trend data with Google Sheets & Gmail
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('sheets');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'sheets'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets Export</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('gmail');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'gmail'
                ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Mail className="w-4 h-4 text-orange-600" />
            <span>Gmail Report Dispatch</span>
          </button>
        </div>

        {/* Google Authentication Status Card */}
        <div className="p-3.5 rounded-xl border border-orange-200/80 dark:border-stone-800 bg-orange-50/40 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div>
              {authStatus.isSignedIn && authStatus.user ? (
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    Connected as {authStatus.user.displayName || authStatus.user.email}
                  </span>
                  <span className="text-[10px] text-stone-400 block font-mono">
                    Scopes enabled: Sheets, Gmail, Drive & Calendar
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    Google Account Required
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block">
                    Authorize to create spreadsheets in Google Drive or send emails via Gmail.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            {authStatus.isSignedIn ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-50 text-xs flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 text-xs shadow-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'Connecting…' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: GOOGLE SHEETS EXPORT */}
        {activeTab === 'sheets' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 space-y-2 text-xs">
              <span className="font-extrabold text-stone-900 dark:text-stone-100 block">
                Export Attendance Matrix to Google Sheets
              </span>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                Creates a new cloud spreadsheet in your Google Drive with formatted columns for weekday turnouts, Grade 10-A, Grade 8-B, on-time punctuality rates, and weekly compliance benchmarks.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-stone-500">
                <span className="px-2 py-0.5 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600">
                  5 Academic Weekdays
                </span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600">
                  {dataset.dateRange}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  Weekly Avg: {avgTurnout.toFixed(1)}%
                </span>
              </div>
            </div>

            {createdSheet ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Spreadsheet Created Successfully in Google Drive!</span>
                </div>
                <div className="text-xs text-stone-700 dark:text-stone-300 font-mono bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 truncate">
                  {createdSheet.title}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={createdSheet.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setCreatedSheet(null)}
                    className="py-2 px-3 text-xs font-bold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 transition"
                  >
                    Create Another
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={authStatus.isSignedIn ? handleExportToSheets : handleSignIn}
                disabled={isExportingSheet || isLoading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExportingSheet ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Google Spreadsheet…</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {authStatus.isSignedIn ? 'Create & Export to Google Sheets' : 'Sign in to Export to Google Sheets'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* TAB 2: GMAIL REPORT DISPATCH (With explicit user confirmation) */}
        {activeTab === 'gmail' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="parent@example.com or admin@tattvasayam.edu"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-orange-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-orange-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-orange-500"
                />
              </div>

              {/* Email Content Preview */}
              <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 text-xs space-y-1.5 max-h-48 overflow-y-auto">
                <span className="font-extrabold text-[11px] text-stone-500 uppercase tracking-wider block">
                  Email Body Preview:
                </span>
                <p className="text-stone-700 dark:text-stone-300">
                  Verified weekly attendance summary for <strong>{dataset.dateRange}</strong>.
                </p>
                <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono space-y-0.5">
                  <div>• Mon: 98.4% (435/442)</div>
                  <div>• Tue: 99.3% (439/442) [Weekly Peak]</div>
                  <div>• Wed: {dailyData[2]?.overallAttendance.toFixed(1)}% (436/442)</div>
                  <div>• Thu: 99.1% (438/442)</div>
                  <div>• Fri: 98.9% (437/442)</div>
                  <div className="font-bold text-orange-600 pt-1">
                    Cumulative Campus Turnout Average: {avgTurnout.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* MANDATORY USER CONFIRMATION CHECKBOX FOR DESTRUCTIVE / OUTBOUND ACTION */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-orange-200 dark:border-amber-950 bg-orange-50/50 dark:bg-stone-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedByUser}
                  onChange={(e) => setConfirmedByUser(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-xs text-stone-700 dark:text-stone-300">
                  <strong>Explicit Confirmation:</strong> I confirm that I want to send this academic attendance report to <code className="font-mono text-orange-600 dark:text-orange-400">{recipientEmail || 'specified recipient'}</code> via my authenticated Gmail account.
                </span>
              </label>
            </div>

            {sentResult ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Email Dispatched Successfully via Gmail!</span>
                </div>
                <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">
                  Message ID: {sentResult.id} • Thread: {sentResult.threadId}
                </div>
                <button
                  onClick={() => {
                    setSentResult(null);
                    setConfirmedByUser(false);
                  }}
                  className="mt-2 py-1.5 px-3 text-xs font-bold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 transition"
                >
                  Send Another Email
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={authStatus.isSignedIn ? handleSendEmail : handleSignIn}
                  disabled={isSendingEmail || isLoading || (!authStatus.isSignedIn ? false : !confirmedByUser)}
                  className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending via Gmail…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {authStatus.isSignedIn ? 'Send Email via Gmail' : 'Sign in to Send via Gmail'}
                      </span>
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="py-2.5 px-4 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl font-bold text-xs hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
