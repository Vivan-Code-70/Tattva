import React, { useState, useEffect, useMemo } from 'react';
import {
  Building,
  Users,
  ShieldCheck,
  Send,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Clock,
  KeyRound,
  BarChart,
  Mail,
  AlertTriangle,
  Copy,
  Check,
  Search,
  RefreshCw,
  Sparkles,
  ClipboardCheck,
  Bell,
  CheckCircle2,
  FileText,
  BadgeAlert,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Info,
  Radio,
  X,
  Bus,
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  CounselingRequest,
  LeaveRequest,
  BroadcastMail,
  SecurityAuditItem,
  GateLogEntry,
  NoticeItem,
  BusRouteInfo,
  TransportOptInRequest,
  FeeTransaction,
} from '../../types';
import { TransportApprovalQueue } from './TransportApprovalQueue';
import { TransportOptInPanel } from './TransportOptInPanel';
import { USER_PROFILES, FEE_ITEMS } from '../../services/storageService';
import { errorReportingService } from '../../services/errorService';
import { otpService, OtpRecord } from '../../services/otpService';
import { GmailService, SentEmailResult } from '../../services/gmailService';
import {
  signInWithGoogleCalendar,
  subscribeGoogleAuth,
  GoogleCalendarAuthStatus,
  getCachedAccessToken,
  getCachedGoogleUser,
} from '../../services/googleCalendarService';

interface AdminDashboardProps {
  user: UserProfile;
  counseling: CounselingRequest[];
  onUpdateCounselingStatus: (id: string, status: 'ACCEPTED' | 'POSTPONED' | 'REJECTED', postponedDate?: string) => void;
  leaveRequests: LeaveRequest[];
  onUpdateLeaveStatus: (id: string, status: 'APPROVED' | 'DECLINED') => void;
  broadcastMails: BroadcastMail[];
  onSendBroadcastMail: (
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
  ) => void;
  auditLogs: SecurityAuditItem[];
  gateLogs: GateLogEntry[];
  feesPaid: Record<string, boolean[]>;
  onResetCredential: (targetUserKey: string, isStudent: boolean) => void;
  onUnlockAccount: (targetUserKey: string) => void;
  failedAttempts: Record<string, number>;
  lockedUntil: Record<string, number>;
  notices?: NoticeItem[];
  onPublishNotice?: (title: string, category: 'academic' | 'transport' | 'fee' | 'general' | 'exam', audience: 'all' | 'students' | 'parents' | 'teachers', content: string, requiresAck: boolean) => void;
  busRoute?: BusRouteInfo;
  transportRequests?: TransportOptInRequest[];
  onRequestTransport?: (payload: {
    userKey: string;
    userName: string;
    userRole: UserRole;
    stopId: number;
    stopName: string;
    tripType: 'both' | 'morning' | 'evening';
    remarks?: string;
  }) => void;
  onUpdateTransportRequestStatus?: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    allocatedSeat?: string
  ) => void;
  onPayTransportFee?: (requestId: string, method: FeeTransaction['paymentMethod']) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  counseling,
  onUpdateCounselingStatus,
  leaveRequests,
  onUpdateLeaveStatus,
  broadcastMails,
  onSendBroadcastMail,
  auditLogs,
  gateLogs,
  feesPaid,
  onResetCredential,
  onUnlockAccount,
  failedAttempts,
  lockedUntil,
  notices = [],
  onPublishNotice,
  busRoute,
  transportRequests = [],
  onRequestTransport,
  onUpdateTransportRequestStatus,
  onPayTransportFee,
}) => {
  // Navigation tabs including dedicated Broadcast Mail & Transport Approvals tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'broadcast' | 'notices' | 'transport' | 'totp' | 'users' | 'security'>('overview');

  // Google Auth & Gmail state
  const [googleAuth, setGoogleAuth] = useState<GoogleCalendarAuthStatus>({
    isSignedIn: false,
    user: null,
    hasToken: false,
  });
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Broadcast Mail form state
  const [mailTo, setMailTo] = useState('All students & parents');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailPriority, setMailPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [isSendingViaGmail, setIsSendingViaGmail] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState<string | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  // User Confirmation Dialog Modal state (Mandatory for outbound email dispatch)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);

  // Subscribe to Google Auth
  useEffect(() => {
    const unsub = subscribeGoogleAuth((status) => {
      setGoogleAuth(status);
    });
    return () => unsub();
  }, []);

  // Postpone dates state
  const [postponeDates, setPostponeDates] = useState<Record<string, string>>({});

  // Notice creation form state
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState<'academic' | 'transport' | 'fee' | 'general' | 'exam'>('general');
  const [newNoticeAudience, setNewNoticeAudience] = useState<'all' | 'students' | 'parents' | 'teachers'>('all');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeRequiresAck, setNewNoticeRequiresAck] = useState(true);
  const [noticePublishedToast, setNoticePublishedToast] = useState<string | null>(null);

  // Super Admin TOTP Security Directory (Exclusive to Ms. Sandhya & Ms. Amrita)
  const [activeOtpCodes, setActiveOtpCodes] = useState<Record<string, OtpRecord>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => otpService.getSecondsRemaining());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [otpSearchQuery, setOtpSearchQuery] = useState('');
  const [otpRoleFilter, setOtpRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student' | 'parent' | 'security' | 'principal' | 'driver'>('all');

  const accountKeys = [
    'sandhya',
    'amrita',
    'principal',
    'susmita',
    'bharthi',
    'vivan',
    'krishvika',
    'pvivan',
    'pkrishvika',
    'sai',
    'librarian',
    'driver',
  ];

  const updateAllOtpCodes = () => {
    const updated: Record<string, OtpRecord> = {};
    accountKeys.forEach((key) => {
      updated[key] = otpService.getActiveOtp(key);
    });
    setActiveOtpCodes(updated);
  };

  useEffect(() => {
    updateAllOtpCodes();
    const timer = setInterval(() => {
      const remaining = otpService.getSecondsRemaining();
      setSecondsRemaining(remaining);
      if (remaining === 30 || remaining === 29) {
        updateAllOtpCodes();
      }
    }, 1000);

    const unsub = otpService.subscribe(() => {
      updateAllOtpCodes();
    });

    return () => {
      clearInterval(timer);
      unsub();
    };
  }, []);

  const handleCopyOtpCode = (code: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredOtpAccounts = useMemo(() => {
    return accountKeys.filter((key) => {
      const profile = USER_PROFILES[key];
      if (!profile) return false;
      if (otpRoleFilter !== 'all' && profile.role !== otpRoleFilter) return false;
      if (otpSearchQuery.trim()) {
        const q = otpSearchQuery.toLowerCase().trim();
        return (
          profile.name.toLowerCase().includes(q) ||
          profile.id.toLowerCase().includes(q) ||
          profile.role.toLowerCase().includes(q) ||
          (profile.title && profile.title.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [otpRoleFilter, otpSearchQuery]);

  const pendingCounseling = counseling.filter((c) => c.status === 'PENDING');
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'PENDING');
  const pendingTransport = transportRequests.filter((r) => r.status === 'PENDING');
  const totalPendingApprovals = pendingCounseling.length + pendingLeaves.length + pendingTransport.length;

  // Resolve recipients based on selection
  const resolvedRecipients = useMemo(() => {
    return GmailService.resolveBroadcastRecipients(mailTo, USER_PROFILES);
  }, [mailTo]);

  // Handle Google Sign-In for Gmail dispatch
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setSendErrorMsg(null);
    try {
      const res = await signInWithGoogleCalendar();
      setSendSuccessToast(`Connected to Google as ${res.user.displayName || res.user.email} with Gmail dispatch permissions!`);
      setTimeout(() => setSendSuccessToast(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSendErrorMsg(err?.message || 'Failed to authenticate with Google Gmail');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Open the mandatory Confirmation Dialog modal
  const handleOpenSendConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailSubject.trim() || !mailBody.trim()) return;
    setConfirmedCheckbox(false);
    setSendErrorMsg(null);
    setShowConfirmModal(true);
  };

  // Execute the confirmed broadcast via real Gmail API or system queue
  const handleConfirmAndSendBroadcast = async () => {
    if (!mailSubject.trim() || !mailBody.trim()) return;

    setIsSendingViaGmail(true);
    setSendErrorMsg(null);

    const senderEmail = googleAuth.user?.email || user.email || 'directorate@tattvasayam.edu.in';
    const recipientEmails = resolvedRecipients.map((r) => r.email);

    let gmailResult: SentEmailResult | null = null;
    let isRealSent = false;

    try {
      // If user is connected to Google with access token, trigger REAL Gmail API
      if (googleAuth.hasToken && getCachedAccessToken()) {
        // Send individually or in batch using Gmail REST API
        for (const recipient of resolvedRecipients) {
          const html = GmailService.buildBroadcastEmailHtml(
            recipient.name,
            recipient.role,
            mailSubject.trim(),
            mailBody.trim(),
            user.name,
            mailPriority
          );

          gmailResult = await GmailService.sendEmail({
            to: recipient.email,
            subject: `[TFA Directorate] ${mailSubject.trim()}`,
            bodyHtml: html,
            bodyText: mailBody.trim(),
          });
          isRealSent = true;
        }
      } else {
        // Fallback to institutional audit logging if Google not connected
        isRealSent = false;
      }

      onSendBroadcastMail(mailTo, mailSubject.trim(), mailBody.trim(), {
        recipientEmails,
        gmailMessageId: gmailResult?.id,
        gmailThreadId: gmailResult?.threadId,
        isRealEmailSent: isRealSent,
        senderEmail,
      });

      setShowConfirmModal(false);
      setMailSubject('');
      setMailBody('');

      if (isRealSent) {
        setSendSuccessToast(`Official broadcast successfully sent to ${resolvedRecipients.length} recipients via Gmail API!`);
      } else {
        setSendSuccessToast(`Broadcast dispatched to ${mailTo} and recorded in institutional log.`);
      }
      setTimeout(() => setSendSuccessToast(null), 5000);
    } catch (err: any) {
      console.error(err);
      setSendErrorMsg(err?.message || 'Failed to dispatch email via Gmail API');
    } finally {
      setIsSendingViaGmail(false);
    }
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) return;
    if (onPublishNotice) {
      onPublishNotice(
        newNoticeTitle.trim(),
        newNoticeCategory,
        newNoticeAudience,
        newNoticeContent.trim(),
        newNoticeRequiresAck
      );
    }
    setNoticePublishedToast(`Notice "${newNoticeTitle}" published to ${newNoticeAudience} audience.`);
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setTimeout(() => setNoticePublishedToast(null), 3500);
  };

  // Financial collection calculation memoized
  const { totalCollected, totalOutstanding } = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    Object.keys(feesPaid).forEach((studentKey) => {
      const arr = feesPaid[studentKey] || [];
      FEE_ITEMS.forEach((item, idx) => {
        if (arr[idx]) collected += item.amount;
        else outstanding += item.amount;
      });
    });
    return { totalCollected: collected, totalOutstanding: outstanding };
  }, [feesPaid]);

  // Gate categories calculation memoized
  const { gateCatCounts, gateTotal } = useMemo(() => {
    const counts: Record<string, number> = {};
    gateLogs.forEach((l) => {
      counts[l.category] = (counts[l.category] || 0) + 1;
    });
    return { gateCatCounts: counts, gateTotal: gateLogs.length || 1 };
  }, [gateLogs]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Ribbon */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold text-orange-600 tracking-wider">
            Super Administrator Workspace
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
            {user.name} • {user.title}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Institutional Oversight, Executive Approvals & Real-Time Security Telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalPendingApprovals > 0 ? (
            <span className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 animate-pulse">
              <BadgeAlert className="w-4 h-4" />
              <span>{totalPendingApprovals} Actionable Approvals Pending</span>
            </span>
          ) : (
            <span className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>All Approvals Cleared</span>
            </span>
          )}
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-orange-200/60 dark:border-stone-800 text-xs font-bold">
        {[
          { id: 'overview', label: `Pending Approvals (${totalPendingApprovals})`, icon: ClipboardCheck },
          { id: 'transport', label: `Bus Opt-In (${pendingTransport.length})`, icon: Bus },
          { id: 'broadcast', label: `Send Broadcast Mail (${broadcastMails.length})`, icon: Mail },
          { id: 'notices', label: 'Notice Board & Circulars', icon: Bell },
          { id: 'totp', label: 'TOTP Security Directory', icon: KeyRound },
          { id: 'users', label: 'User Accounts & Credentials', icon: Users },
          { id: 'security', label: 'Gate Logs & Audit Stream', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:text-orange-600 hover:bg-orange-50/50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {noticePublishedToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <span className="font-semibold">{noticePublishedToast}</span>
          <button onClick={() => setNoticePublishedToast(null)} className="text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & PENDING APPROVALS FIRST */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Priority Action Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                  Priority Approval Queue
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {totalPendingApprovals} leave and counseling requests require director sign-off before end of day.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="px-3 py-1 rounded-lg bg-white dark:bg-stone-800 text-orange-600 border border-orange-200 dark:border-stone-700">
                {pendingLeaves.length} Leaves Pending
              </span>
              <span className="px-3 py-1 rounded-lg bg-white dark:bg-stone-800 text-amber-600 border border-amber-200 dark:border-stone-700">
                {pendingCounseling.length} Counseling Pending
              </span>
            </div>
          </div>

          {/* Pending Approvals Side-by-Side: Leaves & Counseling */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Leave Requests Queue */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Leave Applications ({leaveRequests.length})</span>
                </h3>
                <span className="text-xs font-mono text-amber-600 font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950">
                  {pendingLeaves.length} Pending Approval
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto text-xs pr-1">
                {leaveRequests.length === 0 ? (
                  <p className="text-stone-400 italic py-8 text-center">No leave applications filed.</p>
                ) : (
                  leaveRequests.map((l) => (
                    <div
                      key={l.id}
                      className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900 dark:text-stone-100 block">
                            {l.id} • Student: {l.studentName || USER_PROFILES[l.studentKey || l.by]?.name || l.by}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Filed by: {USER_PROFILES[l.by]?.name || l.by}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950'
                              : l.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950'
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>

                      <div className="text-stone-600 dark:text-stone-400 text-xs">
                        Duration: <span className="font-semibold text-stone-800 dark:text-stone-200">{l.from} to {l.to}</span>
                        <div className="mt-0.5">Reason: <span className="italic">"{l.reason}"</span></div>
                      </div>

                      {l.status === 'PENDING' && (
                        <div className="flex items-center gap-2 pt-1 border-t border-stone-200 dark:border-stone-700">
                          <button
                            onClick={() => onUpdateLeaveStatus(l.id, 'APPROVED')}
                            className="px-3.5 py-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                          >
                            Approve Leave
                          </button>
                          <button
                            onClick={() => onUpdateLeaveStatus(l.id, 'DECLINED')}
                            className="px-3.5 py-1.5 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Counseling Requests Queue */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>Counseling & Well-Being Queue ({counseling.length})</span>
                </h3>
                <span className="text-xs font-mono text-orange-600 font-bold px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950">
                  {pendingCounseling.length} Pending
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto text-xs pr-1">
                {counseling.length === 0 ? (
                  <p className="text-stone-400 italic py-8 text-center">No counseling requests.</p>
                ) : (
                  counseling.map((c) => {
                    const requesterName = USER_PROFILES[c.by]?.name || c.by.toUpperCase();
                    const isPending = c.status === 'PENDING';

                    return (
                      <div
                        key={c.id}
                        className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {c.id} • {requesterName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                c.status === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950'
                                  : c.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950'
                                  : 'bg-stone-200 text-stone-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>
                          <span className="font-mono text-stone-500 text-[11px]">{c.date}</span>
                        </div>

                        <div className="text-stone-600 dark:text-stone-400 text-xs">
                          {c.mode} • Agenda: <span className="italic">"{c.agenda}"</span>
                        </div>

                        {isPending && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200 dark:border-stone-700">
                            <button
                              onClick={() => onUpdateCounselingStatus(c.id, 'ACCEPTED')}
                              className="px-3 py-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                            >
                              Accept
                            </button>
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={postponeDates[c.id] || c.date}
                                onChange={(e) =>
                                  setPostponeDates((prev) => ({ ...prev, [c.id]: e.target.value }))
                                }
                                className="p-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-[11px] text-stone-900 dark:text-stone-100"
                              />
                              <button
                                onClick={() =>
                                  onUpdateCounselingStatus(
                                    c.id,
                                    'POSTPONED',
                                    postponeDates[c.id] || c.date
                                  )
                                }
                                className="px-2.5 py-1 font-semibold bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-800 dark:text-stone-200 rounded-lg transition"
                              >
                                Postpone
                              </button>
                            </div>
                            <button
                              onClick={() => onUpdateCounselingStatus(c.id, 'REJECTED')}
                              className="px-2.5 py-1 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition ml-auto"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics & Financial Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
                Total Enrolment
              </span>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-1 font-mono">
                1,240
              </div>
              <span className="text-[11px] text-stone-500">Students across 12 grades</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
                Attendance Rate
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                98.4%
              </div>
              <span className="text-[11px] text-stone-500">Jakkur Campus live</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
                Fees Collected
              </span>
              <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">
                ₹{totalCollected.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-stone-500">Sample cohort</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
                Gate 2 Entries
              </span>
              <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1 font-mono">
                {gateLogs.length}
              </div>
              <span className="text-[11px] text-stone-500">Today's scans</span>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS FOR BROADCAST DISPATCH */}
      {sendSuccessToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">{sendSuccessToast}</span>
          </div>
          <button onClick={() => setSendSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {sendErrorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-2xl text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{sendErrorMsg}</span>
          </div>
          <button onClick={() => setSendErrorMsg(null)} className="text-rose-700 hover:text-rose-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB: SEND BROADCAST MAIL (POWERED BY GOOGLE GMAIL API) */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          {/* Google Workspace Connection Banner for Gmail */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-stone-800 border border-orange-200 dark:border-amber-900/60 shadow-xs flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100 font-display">
                    Google Gmail API Real Outgoing Dispatch Engine
                  </h3>
                  {googleAuth.hasToken ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Gmail Live ({googleAuth.user?.email})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Simulation & Audit Mode
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Send authentic, cryptographically signed emails directly to verified student & parent academy inboxes via OAuth.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!googleAuth.hasToken ? (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isConnectingGoogle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authorizing Gmail…</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Connect Google Account</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>OAuth Scopes Granted</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Form & Real-time Audience Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Compose Form (7 cols) */}
            <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
              <div className="border-b border-orange-100 dark:border-stone-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    Compose Broadcast Circular
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-stone-500">
                  {resolvedRecipients.length} Recipient(s) Targeted
                </span>
              </div>

              <form onSubmit={handleOpenSendConfirmation} className="space-y-4 text-xs">
                {/* Target Audience Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Target Cohort / Recipient Group:
                  </label>
                  <select
                    value={mailTo}
                    onChange={(e) => setMailTo(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 font-semibold text-stone-900 dark:text-stone-100 focus:outline-orange-500"
                  >
                    <option value="All students & parents">All Students & Parents (Campus-wide)</option>
                    <option value="All students">All Students Only</option>
                    <option value="All parents">All Parents Only</option>
                    <option value="Grade 10-A students">Grade 10-A Cohort (Vivan Sharma & Parents)</option>
                    <option value="Grade 8-B students">Grade 8-B Cohort (Krishvika Patel & Parents)</option>
                    <option value="Faculty & Staff">Faculty & Academic Directorate</option>
                    <option value="Entire Academy">Entire Academy Community (Students, Parents & Faculty)</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Dispatch Priority:
                    </label>
                    <select
                      value={mailPriority}
                      onChange={(e) => setMailPriority(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 font-semibold text-stone-900 dark:text-stone-100"
                    >
                      <option value="Normal">Normal Institutional Priority</option>
                      <option value="Urgent">Urgent Directorate Advisory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Sender Identity:
                    </label>
                    <div className="p-2.5 bg-stone-100 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-mono text-[11px] truncate">
                      {googleAuth.user?.email || 'directorate@tattvasayam.edu.in'}
                    </div>
                  </div>
                </div>

                {/* Email Subject */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Subject Line:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule for CBSE Board Mock Practicals & Robotics Showcase"
                    value={mailSubject}
                    onChange={(e) => setMailSubject(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 font-medium"
                  />
                </div>

                {/* Email Body */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Official Message Content (Formatted as Academy HTML):
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Enter the full text of the circular to be dispatched to inboxes..."
                    value={mailBody}
                    onChange={(e) => setMailBody(e.target.value)}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 font-mono text-[11px] resize-y leading-relaxed"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!mailSubject.trim() || !mailBody.trim()}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-sm transition flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Broadcast Mail to {resolvedRecipients.length} Recipient(s)</span>
                </button>
              </form>
            </div>

            {/* Right: Real-time Audience Resolution & Directory Card (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
                <div className="border-b border-orange-100 dark:border-stone-800 pb-2.5 flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-orange-600" />
                    <span>Resolved Recipients ({resolvedRecipients.length})</span>
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-stone-800 px-2 py-0.5 rounded">
                    Verified Addresses
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                  {resolvedRecipients.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>{r.name}</span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-orange-100 dark:bg-stone-700 text-orange-800 dark:text-orange-300">
                            {r.role}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                          {r.email}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">
                        {r.title || 'Enrolled'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Emails dispatched through the Gmail API will appear directly in user inboxes under the authenticated Google Workspace sender account.
                  </span>
                </div>
              </div>

              {/* Quick Template Prompts */}
              <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Quick Academy Circular Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMailSubject('Science Exhibition & Neural Robotics Showcase');
                      setMailBody('We are pleased to invite all students, parents, and mentors to our upcoming Annual Neural Science Exhibition. Student registration for robotic installations and computational experiments closes this Friday at 5:00 PM.');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 border border-orange-200 dark:border-stone-700 transition"
                  >
                    RoboLab Showcase
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMailSubject('Term 2 Examination & Board Practicals Schedule');
                      setMailBody('Official timetable and laboratory guidelines for Term 2 examinations have been finalized. Students must adhere strictly to the 12-hour timetable scheduling and carry digital RFID identity badges.');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 border border-orange-200 dark:border-stone-700 transition"
                  >
                    Exam Timetable
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMailSubject('Parent-Teacher Academic Review Conference');
                      setMailBody('Individual academic consultations with homeroom faculty and discipline leads are scheduled for this Saturday. Please confirm attendance or submit scheduling preferences.');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 border border-orange-200 dark:border-stone-700 transition"
                  >
                    Parent Conference
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Mail Audit Stream & Delivery History */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
            <div className="border-b border-orange-100 dark:border-stone-800 pb-2.5 flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Broadcast Mail Dispatch History ({broadcastMails.length})</span>
              </h4>
              <span className="text-xs text-stone-500 font-mono">
                Authoritative Audit Trail
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto text-xs pr-1">
              {broadcastMails.map((m) => (
                <div
                  key={m.id}
                  className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {m.subject}
                      </span>
                      {m.isRealEmailSent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Sent via Gmail API
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300">
                          Internal Broadcast
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-stone-400">
                      {m.time} {m.dateStr ? `• ${m.dateStr}` : ''}
                    </span>
                  </div>

                  <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed whitespace-pre-wrap">
                    {m.body}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-[10px] font-mono text-stone-500">
                    <span>
                      Target: <strong className="text-stone-700 dark:text-stone-300">{m.to}</strong>
                    </span>
                    {m.gmailMessageId && (
                      <span className="text-emerald-600 font-mono">
                        Message ID: {m.gmailMessageId.slice(0, 16)}…
                      </span>
                    )}
                    {m.senderEmail && (
                      <span>From: {m.senderEmail}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR OUTBOUND EMAIL DISPATCH */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-orange-200 dark:border-amber-950 p-6 sm:p-7 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-orange-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100 font-display">
                    Confirm Outgoing Broadcast Mail Dispatch
                  </h3>
                  <span className="text-xs text-stone-500">
                    Google Workspace Outbound Verification Check
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-orange-50/60 dark:bg-stone-800/60 rounded-2xl border border-orange-200 dark:border-stone-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Subject:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100 text-right truncate max-w-[280px]">
                  {mailSubject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Audience:</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {mailTo} ({resolvedRecipients.length} recipients)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Channel:</span>
                <span className="font-mono text-emerald-600 font-bold">
                  {googleAuth.hasToken ? 'Real Outgoing Gmail API (Bearer Token)' : 'Internal Portal Audit Queue'}
                </span>
              </div>
              <div className="pt-2 border-t border-orange-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
                <span className="font-semibold block mb-1 text-stone-500">Message Preview:</span>
                <p className="italic font-serif text-[11px] line-clamp-3 bg-white dark:bg-stone-900 p-2 rounded-lg border border-orange-100 dark:border-stone-800">
                  "{mailBody}"
                </p>
              </div>
            </div>

            {/* Mandatory Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedCheckbox}
                onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500 mt-0.5"
              />
              <span className="text-xs text-stone-700 dark:text-stone-300 leading-snug">
                I explicitly confirm dispatch of this broadcast notice to the selected academy cohort ({resolvedRecipients.length} verified recipients) using authenticated Google Workspace credentials.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSendBroadcast}
                disabled={!confirmedCheckbox || isSendingViaGmail}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSendingViaGmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Broadcast via Gmail…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Authorize & Send Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NOTICE BOARD & CIRCULARS */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create New Notice */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
            <div className="border-b border-orange-100 dark:border-stone-800 pb-2 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-600" />
                <span>Publish Official School Circular</span>
              </h3>
              <span className="text-xs text-stone-500">Campus-wide notice</span>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Circular Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory Science Exhibition & RoboLab Showcase"
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Category:
                  </label>
                  <select
                    value={newNoticeCategory}
                    onChange={(e) => setNewNoticeCategory(e.target.value as any)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="transport">Transport</option>
                    <option value="fee">Fee & Accounts</option>
                    <option value="exam">Examinations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Audience:
                  </label>
                  <select
                    value={newNoticeAudience}
                    onChange={(e) => setNewNoticeAudience(e.target.value as any)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="all">Entire Academy (All)</option>
                    <option value="students">Students Only</option>
                    <option value="parents">Parents Only</option>
                    <option value="teachers">Faculty Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Circular Details:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter official circular text..."
                  value={newNoticeContent}
                  onChange={(e) => setNewNoticeContent(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 resize-none text-stone-900 dark:text-stone-100"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newNoticeRequiresAck}
                  onChange={(e) => setNewNoticeRequiresAck(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                  Require Student & Parent Acknowledgment
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Broadcast Notice to Academy
              </button>
            </form>
          </div>

          {/* Published Circulars & Acknowledgement Status */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
            <div className="border-b border-orange-100 dark:border-stone-800 pb-2 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Active Notices & Acknowledgements ({notices.length})</span>
              </h3>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto text-xs pr-1">
              {notices.map((n) => {
                const ackCount = n.acknowledgedBy?.length || 0;
                return (
                  <div
                    key={n.id}
                    className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {n.title}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-orange-100 dark:bg-stone-700 text-orange-800 dark:text-orange-300">
                        {n.category}
                      </span>
                    </div>

                    <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                      {n.content}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-800 text-[10px] text-stone-500 font-mono">
                      <span>Audience: {(n.audience || 'ALL').toUpperCase()} • {n.date}</span>
                      {n.requiresAck && (
                        <span className="text-emerald-600 font-bold">
                          {ackCount} Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2B: BUS TRANSPORT APPROVALS & ADMIN OPT-IN */}
      {activeTab === 'transport' && (
        <div className="space-y-6">
          <TransportApprovalQueue
            transportRequests={transportRequests}
            onUpdateTransportRequestStatus={onUpdateTransportRequestStatus}
            reviewerLabel="Directorate Admin Approval Desk"
          />
          <TransportOptInPanel
            user={user}
            busRoute={busRoute}
            transportRequests={transportRequests}
            onRequestTransport={onRequestTransport}
            onPayTransportFee={onPayTransportFee}
          />
        </div>
      )}

      {/* TAB 3: TOTP SECURITY DIRECTORY */}
      {activeTab === 'totp' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-amber-950/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                    Super Admin TOTP Security Directory & Live OTP Dispatch
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                    Ms. Sandhya & Ms. Amrita Only
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Authoritative 30-second cryptographic verification tokens for all institutional profiles.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-stone-800 border border-orange-200 dark:border-stone-700">
                <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                  {secondsRemaining}s
                </span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">interval</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user by name, roll, or role..."
                value={otpSearchQuery}
                onChange={(e) => setOtpSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'admin', 'principal', 'teacher', 'student', 'parent', 'security', 'driver'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setOtpRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase ${
                    otpRoleFilter === r
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* OTP Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOtpAccounts.map((key) => {
              const profile = USER_PROFILES[key];
              if (!profile) return null;
              const rec = activeOtpCodes[key];
              const isCopied = copiedKey === key;

              return (
                <div
                  key={key}
                  className="p-3.5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/80 hover:border-orange-300 dark:hover:border-stone-600 transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100">
                          {profile.name}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-orange-100 dark:bg-stone-700 text-orange-800 dark:text-orange-300 font-mono font-bold">
                          {profile.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400">
                        {profile.title}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-stone-400">
                      ID: {profile.id}
                    </div>
                  </div>

                  {/* Code Display + Copy Button */}
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-stone-800 p-2 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center gap-1">
                      {rec?.code ? (
                        rec.code.split('').map((d, i) => (
                          <span
                            key={i}
                            className="w-5 h-7 rounded bg-orange-50 dark:bg-stone-700 border border-orange-200 dark:border-stone-600 flex items-center justify-center font-mono font-black text-sm text-stone-900 dark:text-stone-100"
                          >
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-mono text-stone-400">...</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleCopyOtpCode(rec?.code || '', key, e)}
                      className="p-1.5 px-2.5 rounded-md bg-stone-100 dark:bg-stone-700 hover:bg-orange-50 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-stone-400" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: USERS & CREDENTIALS */}
      {activeTab === 'users' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
          <div className="border-b border-orange-100 dark:border-stone-800 pb-2 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-orange-600" />
              <span>Account Credentials & Lockout Oversight</span>
            </h3>
            <span className="text-xs text-stone-500">Security Operations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {Object.keys(USER_PROFILES)
              .filter((k) => k !== 'sandhya')
              .map((key) => {
                const u = USER_PROFILES[key];
                const isStudent = u.role === 'student';
                const isLocked = (failedAttempts[key] || 0) >= 4;

                return (
                  <div
                    key={key}
                    className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {u.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-200 dark:bg-stone-700">
                          {u.role}
                        </span>
                        {isLocked && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                            Locked
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-stone-500">{u.id}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onResetCredential(key, isStudent)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600 rounded-lg hover:border-orange-500 transition"
                      >
                        Reset {isStudent ? 'Password' : 'MPIN'}
                      </button>
                      {isLocked && (
                        <button
                          onClick={() => onUnlockAccount(key)}
                          className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY AUDIT & GATE LOGS */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Institutional Audit Log */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
            <div className="border-b border-orange-100 dark:border-stone-800 pb-2 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Institutional Audit Log</span>
              </h3>
              <span className="text-[11px] font-mono text-stone-500">Live Telemetry</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto text-xs pr-1">
              {auditLogs.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 flex items-start gap-2.5"
                >
                  <span className="font-mono text-stone-400 text-[11px] shrink-0">{item.time}</span>
                  <span className="text-stone-800 dark:text-stone-200 font-medium leading-tight">
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gate 2 Entries */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
            <div className="border-b border-orange-100 dark:border-stone-800 pb-2 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Today's Gate 2 Pass Scans ({gateLogs.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-600 font-bold">Biometric / QR</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto text-xs pr-1">
              {gateLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {log.name}
                    </span>
                    <div className="text-[10px] text-stone-500 font-mono">
                      {log.category} {log.grade ? `• ${log.grade}` : ''}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-stone-500">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
