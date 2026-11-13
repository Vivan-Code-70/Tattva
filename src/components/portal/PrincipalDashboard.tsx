import React, { useState } from 'react';
import {
  Award,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  Send,
  Bus,
  TrendingUp,
  FileText,
  AlertTriangle,
  Building,
  Check,
  ChevronRight,
  Plus,
  Compass,
  Sparkles,
  Phone,
  MapPin,
  Eye,
} from 'lucide-react';
import {
  UserProfile,
  NoticeItem,
  AttendanceRecord,
  BusRouteInfo,
  TimetableSchedule,
  SecurityAuditItem,
  EmergencyLockdownState,
} from '../../types';
import { USER_PROFILES } from '../../services/storageService';
import { ShieldAlert, AlertOctagon, ShieldCheck } from 'lucide-react';
import { WeeklyAttendanceTrendChart } from './WeeklyAttendanceTrendChart';

interface PrincipalDashboardProps {
  user: UserProfile;
  notices: NoticeItem[];
  onPublishNotice: (newNotice: Omit<NoticeItem, 'id' | 'acknowledgedBy'>) => void;
  attendanceRecords: AttendanceRecord[];
  busRoute: BusRouteInfo;
  timetableSchedule: TimetableSchedule;
  auditLogs: SecurityAuditItem[];
  onAcknowledgeNotice?: (noticeId: string) => void;
  onNavigateToTab?: (tab: 'home' | 'campus' | 'study' | 'cal' | 'rep' | 'portal') => void;
  lockdown?: EmergencyLockdownState;
  onToggleLockdown?: (active: boolean, reason?: string) => void;
}

export const PrincipalDashboard: React.FC<PrincipalDashboardProps> = ({
  user,
  notices,
  onPublishNotice,
  attendanceRecords,
  busRoute,
  auditLogs,
  onNavigateToTab,
  lockdown,
  onToggleLockdown,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'notices' | 'attendance' | 'bus' | 'faculty'>('overview');

  // New Notice Modal / Form state
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<NoticeItem['category']>('Circular');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState<NoticeItem['priority']>('normal');

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    onPublishNotice({
      title: noticeTitle.trim(),
      category: noticeCategory,
      content: noticeContent.trim(),
      date: new Date().toISOString().split('T')[0],
      targetRoles: ['all'],
      priority: noticePriority,
      author: 'Dr. B. R. Shenoy (Principal)',
    });

    setNoticeTitle('');
    setNoticeContent('');
    setShowNoticeModal(false);
  };

  // Emergency Lockdown State
  const [showLockdownModal, setShowLockdownModal] = useState(false);
  const [lockdownReason, setLockdownReason] = useState('Immediate Campus Security & Safety Protocol');
  const [customReason, setCustomReason] = useState('');

  const handleConfirmLockdown = () => {
    const finalReason = customReason.trim() || lockdownReason;
    if (onToggleLockdown) {
      onToggleLockdown(true, finalReason);
    }
    setShowLockdownModal(false);
    setCustomReason('');
  };

  const handleLiftLockdown = () => {
    if (window.confirm('Confirm: Lift Campus Emergency Lockdown and issue ALL CLEAR to all student/teacher sessions?')) {
      if (onToggleLockdown) {
        onToggleLockdown(false);
      }
    }
  };

  // High-level statistics
  const totalStudents = 2; // Vivan, Krishvika demo cohort
  const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate = '98.4%';
  const averageGpa = '97.2%';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Active Lockdown Banner */}
      {lockdown?.active && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-600 via-red-700 to-red-800 border-2 border-red-400 text-white shadow-xl shadow-red-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-red-700">
                  CODE RED LOCKDOWN ACTIVE
                </span>
                <span className="text-xs text-red-200">
                  Initiated by {lockdown.triggeredBy || 'Executive Desk'}
                </span>
              </div>
              <p className="text-sm font-extrabold text-white mt-0.5">
                Full-screen emergency warning overlay is currently active across all student and teacher sessions.
              </p>
              <p className="text-xs text-red-100 font-mono mt-0.5">
                Reason: {lockdown.reason || 'Campus Security Protocol'} • Location: {lockdown.location || 'Jakkur Campus'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLiftLockdown}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-red-700 font-black text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>LIFT LOCKDOWN (ALL CLEAR)</span>
          </button>
        </div>
      )}

      {/* Principal Executive Header */}
      <div className="p-6 sm:p-7 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight font-display">
                {user.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Principal & Patron
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Executive oversight for Tattvasayam Future Academy • Jakkur, Bengaluru
            </p>
          </div>
        </div>

        {/* Quick Executive Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Emergency Lockdown Toggle Button */}
          {lockdown?.active ? (
            <button
              onClick={handleLiftLockdown}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 animate-pulse"
              title="Click to lift campus emergency lockdown"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Lift Lockdown</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLockdownModal(true)}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              title="Trigger immediate campus-wide emergency lockdown"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>Emergency Lockdown</span>
            </button>
          )}

          <button
            onClick={() => setShowNoticeModal(true)}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Publish Circular</span>
          </button>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('campus')}
              className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-orange-600" />
              <span>Campus Hologram</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'notices'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <span>Notice Board & Circulars</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 dark:bg-stone-800 text-orange-700 font-mono">
            {notices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Institutional Attendance
        </button>
        <button
          onClick={() => setActiveTab('bus')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'bus'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Bus className="w-3.5 h-3.5 text-orange-600" />
          <span>Fleet & Bus Route</span>
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'faculty'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Faculty & Academic Health
        </button>
      </div>

      {/* ---------------- TAB 1: EXECUTIVE OVERVIEW ---------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Core Vital Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  School Attendance Rate
                </span>
                <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-mono mt-1">
                  {attendanceRate}
                </div>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Optimal campus turnout</span>
              </span>
            </div>

            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Cohort Neural GPA Median
                </span>
                <div className="text-3xl font-extrabold text-orange-600 dark:text-orange-400 font-mono mt-1">
                  {averageGpa}
                </div>
              </div>
              <span className="text-[11px] text-stone-500 mt-2">
                13 Interdisciplinary Subjects
              </span>
            </div>

            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Campus Fleet Status
                </span>
                <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100 mt-1 truncate font-mono">
                  {busRoute.liveStatus === 'ON_SCHEDULE' ? 'On Schedule' : 'Slight Delay'}
                </div>
              </div>
              <span className="text-[11px] text-stone-500 mt-2 truncate">
                {busRoute.currentLocationName}
              </span>
            </div>

            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Institutional Circulars
                </span>
                <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-mono mt-1">
                  {notices.length}
                </div>
              </div>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-2">
                All departments in sync
              </span>
            </div>
          </div>

          {/* Recharts Weekly Attendance Trend Line Chart */}
          <WeeklyAttendanceTrendChart
            attendanceRecords={attendanceRecords}
            roleContext="principal"
            title="Institutional Attendance Trend & Weekly Punctuality"
            subtitle="Interactive 5-week turnout analytics tracked across Grade 10-A, Grade 8-B, and RFID turnstiles"
          />

          {/* Institutional Highlights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Circulars Strip */}
            <div className="p-5 sm:p-6 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Recent Official Circulars
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('notices')}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold"
                >
                  Manage Board &rarr;
                </button>
              </div>

              <div className="space-y-3">
                {notices.slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                        {n.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300 font-semibold shrink-0">
                        {n.category}
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-300 text-[11px] line-clamp-2">
                      {n.content}
                    </p>
                    <div className="text-[10px] text-stone-400 flex items-center justify-between pt-1">
                      <span>Author: {n.author}</span>
                      <span>{n.acknowledgedBy.length} Acknowledgements</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Campus Safety & Audit Ticker */}
            <div className="p-5 sm:p-6 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Campus Audit & Access Stream
                  </h3>
                </div>
                <span className="text-xs text-stone-400 font-mono">Live telemetry</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
                {auditLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-semibold text-stone-800 dark:text-stone-200 block">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{log.id}</span>
                    </div>
                    <span className="text-[11px] text-stone-400 font-mono shrink-0">
                      {log.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: NOTICE BOARD WITH ACKNOWLEDGEMENTS ---------------- */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-stone-900 dark:text-stone-100 font-display">
                Official Institutional Notice Board
              </h3>
              <p className="text-xs text-stone-500">
                Directives, assessment blueprints, and events with real-time acknowledgement tracking
              </p>
            </div>
            <button
              onClick={() => setShowNoticeModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Draft New Circular</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {notices.map((n) => (
              <div
                key={n.id}
                className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        n.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : n.priority === 'high'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {n.category} • {n.priority}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">{n.date}</span>
                  </div>

                  <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    {n.title}
                  </h4>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {n.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">Author: {n.author}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {n.acknowledgedBy.length} Acknowledged
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {n.acknowledgedBy.map((userKey) => {
                      const profile = USER_PROFILES[userKey];
                      return (
                        <span
                          key={userKey}
                          className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{profile?.name || userKey}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: INSTITUTIONAL ATTENDANCE ---------------- */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Recharts Weekly Attendance Trend Line Chart */}
          <WeeklyAttendanceTrendChart
            attendanceRecords={attendanceRecords}
            roleContext="principal"
            title="Institutional Weekly Turnout & Trajectory Analysis"
            subtitle="Verified attendance curve comparing 5-week historical baseline with real-time biometric arrivals"
          />

          <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                  Daily Attendance Log & Verification Stream
                </h3>
                <p className="text-xs text-stone-500">
                  Verified entries from Gate 2 RFID scanner & classroom faculty marks
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600">
                Turnout: {attendanceRate}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3">Record ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Class / Subject</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Verifier / Faculty</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {attendanceRecords.map((att) => {
                    const student = USER_PROFILES[att.studentKey];
                    return (
                      <tr key={att.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                        <td className="p-3 font-mono text-stone-400">{att.id}</td>
                        <td className="p-3 font-mono">{att.date}</td>
                        <td className="p-3 font-bold text-stone-900 dark:text-stone-100">
                          {student?.name || att.studentKey}
                          <span className="block text-[10px] text-stone-400 font-normal">
                            {student?.title}
                          </span>
                        </td>
                        <td className="p-3">{att.subject || 'All Day'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              att.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : att.status === 'LATE'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="p-3 text-stone-500">{att.markedBy || 'Faculty'}</td>
                        <td className="p-3 text-stone-500 italic">{att.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: FLEET & BUS TRACKER ---------------- */}
      {activeTab === 'bus' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Bus className="w-5 h-5 text-orange-600" />
                  <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                    {busRoute.routeNumber}: {busRoute.routeName}
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Vehicle: <span className="font-mono font-bold text-stone-700 dark:text-stone-300">{busRoute.vehicleNumber}</span> • Speed: <span className="font-mono">{busRoute.currentSpeedKmH} km/h</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>GPS Telemetry Active</span>
                </span>
                <a
                  href={`tel:${busRoute.driverPhone}`}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  <span>Call Driver ({busRoute.driverName.split(' ')[1] || 'Driver'})</span>
                </a>
              </div>
            </div>

            {/* Current Route Progression */}
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                Route Stops & Real-Time Schedule:
              </span>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-orange-200 dark:before:bg-stone-700">
                {busRoute.stops.map((stop, idx) => (
                  <div key={idx} className="relative flex items-center justify-between text-xs">
                    <div
                      className={`absolute -left-6 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                        stop.status === 'passed'
                          ? 'border-emerald-600 bg-emerald-500 text-white'
                          : stop.status === 'current'
                          ? 'border-orange-600 bg-white dark:bg-stone-900 text-orange-600 ring-4 ring-orange-100 dark:ring-stone-800'
                          : 'border-stone-300 bg-white dark:bg-stone-800 text-stone-400'
                      }`}
                    >
                      {stop.status === 'passed' ? '✓' : idx + 1}
                    </div>

                    <div>
                      <span className={`font-bold block ${stop.status === 'current' ? 'text-orange-600 text-sm' : 'text-stone-800 dark:text-stone-200'}`}>
                        {stop.name}
                      </span>
                      <span className="text-[11px] text-stone-400">Scheduled: {stop.timeScheduled}</span>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold ${stop.status === 'current' ? 'text-orange-600' : 'text-stone-500'}`}>
                        ETA: {stop.eta}
                      </span>
                      <span className="block text-[10px] text-stone-400 capitalize">{stop.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 5: FACULTY & ACADEMIC HEALTH ---------------- */}
      {activeTab === 'faculty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-stone-800 flex items-center justify-center text-orange-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Senior STEM Faculty
                  </h4>
                  <span className="text-[11px] text-stone-500">Ms. Susmita • Physics & Math</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                100% on-time coursework publishing; high inquiry feedback rating on the AI Study Lab.
              </p>
              <div className="text-[11px] font-semibold text-emerald-600">Status: Active on Campus (Lab 101)</div>
            </div>

            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-stone-800 flex items-center justify-center text-amber-600">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Director of Academics
                  </h4>
                  <span className="text-[11px] text-stone-500">Ms. Sandhya • Philosophy & Ethics</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Supervising CBSE & Cambridge assessment rubrics and counseling approvals.
              </p>
              <div className="text-[11px] font-semibold text-emerald-600">Status: Active on Campus (Room 101)</div>
            </div>

            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-stone-800 flex items-center justify-center text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Schedule Coordinator
                  </h4>
                  <span className="text-[11px] text-stone-500">Ms. Bharthi • Timetable Lead</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                12-Hour daily period synchronizations across 4 cohorts with zero room clashes.
              </p>
              <div className="text-[11px] font-semibold text-emerald-600">Status: Active on Campus (Room 104)</div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Notice Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-[16px] max-w-lg w-full p-6 border border-orange-200 dark:border-amber-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                Draft Official School Circular
              </h3>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Circular Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cambridge & CBSE Summative Assessment Timetable"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Category:
                  </label>
                  <select
                    value={noticeCategory}
                    onChange={(e) => setNoticeCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="Circular">Official Circular</option>
                    <option value="Academic">Academic Blueprint</option>
                    <option value="Event">Event & Expo</option>
                    <option value="Advisory">Fleet / Advisory</option>
                    <option value="Emergency">Emergency Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Priority:
                  </label>
                  <select
                    value={noticePriority}
                    onChange={(e) => setNoticePriority(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Content / Directive:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter full notice content for students, parents, and faculty..."
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs transition"
                >
                  Publish to Notice Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Lockdown Confirmation Modal */}
      {showLockdownModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border-2 border-red-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-red-200 dark:border-red-950">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-red-700 dark:text-red-400 font-display">
                  Trigger Campus Emergency Lockdown?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Principal Executive Authority • CODE RED PROTOCOL
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 text-xs space-y-1.5 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                <AlertOctagon className="w-4 h-4 shrink-0 text-red-600" />
                <span>Immediate Multi-Session Impact:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-700 dark:text-stone-300">
                <li>Displays an inescapable full-screen red warning overlay on all active student and teacher sessions.</li>
                <li>Activates acoustic warning siren across web clients.</li>
                <li>Transmits instant emergency notification to Gate Security and Administration.</li>
              </ul>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Lockdown Classification / Reason:
                </label>
                <select
                  value={lockdownReason}
                  onChange={(e) => setLockdownReason(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
                >
                  <option value="Immediate Campus Security & Safety Protocol">Immediate Campus Security & Safety Protocol</option>
                  <option value="External Perimeter Threat Detected Near Gate 1/2">External Perimeter Threat Detected Near Gate 1/2</option>
                  <option value="Severe Weather & Flash Environmental Hazard Warning">Severe Weather & Flash Environmental Hazard Warning</option>
                  <option value="Unscheduled Emergency Readiness & Evacuation Drill">Unscheduled Emergency Readiness & Evacuation Drill</option>
                  <option value="Custom">Custom Security Directive...</option>
                </select>
              </div>

              {lockdownReason === 'Custom' && (
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Specific Directive for Overlay:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Precautionary hold in place due to road transit incident outside campus..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLockdownModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLockdown}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>CONFIRM & TRIGGER LOCKDOWN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
