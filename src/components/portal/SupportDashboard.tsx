import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Activity,
  Flame,
  ShieldAlert,
  Calendar,
  Save,
  Copy,
  RotateCcw,
  Sparkles,
  Bus,
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  SupportTicket,
  TimetablePeriod,
  TimetableSchedule,
  BusRouteInfo,
  TransportOptInRequest,
  FeeTransaction,
} from '../../types';
import {
  USER_PROFILES,
  SUBJECTS,
  ACADEMY_CLASSES,
  TIMETABLE_DAYS,
  STANDARD_PERIODS_12H,
} from '../../services/storageService';
import { TransportApprovalQueue } from './TransportApprovalQueue';
import { TransportOptInPanel } from './TransportOptInPanel';

interface SupportDashboardProps {
  user: UserProfile;
  tickets: SupportTicket[];
  onReplyTicket: (ticketId: string, reply: string, status: 'IN PROGRESS' | 'RESOLVED') => void;
  timetableSchedule: TimetableSchedule;
  onUpdateTimetable: (className: string, day: string, periods: TimetablePeriod[]) => void;
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

export const SupportDashboard: React.FC<SupportDashboardProps> = ({
  user,
  tickets,
  onReplyTicket,
  timetableSchedule,
  onUpdateTimetable,
  busRoute,
  transportRequests = [],
  onRequestTransport,
  onUpdateTransportRequestStatus,
  onPayTransportFee,
}) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'timetable' | 'transport'>('timetable');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  // Timetable Editor State
  const [selectedClass, setSelectedClass] = useState<string>(ACADEMY_CLASSES[0] || 'Grade 10-A');
  const [selectedDay, setSelectedDay] = useState<string>(TIMETABLE_DAYS[0] || 'Mon');
  const [editingPeriods, setEditingPeriods] = useState<TimetablePeriod[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync editing periods when selected class or day changes
  useEffect(() => {
    const classSchedule = timetableSchedule?.[selectedClass];
    const dayPeriods = classSchedule?.[selectedDay];

    if (dayPeriods && dayPeriods.length > 0) {
      setEditingPeriods(JSON.parse(JSON.stringify(dayPeriods)));
    } else {
      // Fallback to standard 12H template
      const fallback = STANDARD_PERIODS_12H.map((p, idx) => ({
        ...p,
        subject: SUBJECTS[idx % SUBJECTS.length],
        room: `Room ${101 + idx}`,
      }));
      setEditingPeriods(fallback);
    }
  }, [selectedClass, selectedDay, timetableSchedule]);

  const openTickets = tickets.filter((t) => t.status !== 'RESOLVED');
  const urgentTickets = tickets.filter((t) => t.urgent && t.status !== 'RESOLVED');

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === 'OPEN' && t.status === 'RESOLVED') return false;
    if (filterStatus === 'RESOLVED' && t.status !== 'RESOLVED') return false;
    return true;
  });

  const handleReplySubmit = (ticketId: string, status: 'IN PROGRESS' | 'RESOLVED') => {
    const text = replies[ticketId]?.trim() || '';
    if (status === 'RESOLVED' && !text) return;
    onReplyTicket(ticketId, text, status);
    setReplies((prev) => ({ ...prev, [ticketId]: '' }));
  };

  const handlePeriodSubjectChange = (periodIndex: number, newSubject: string) => {
    setEditingPeriods((prev) => {
      const copy = [...prev];
      if (copy[periodIndex]) {
        copy[periodIndex] = { ...copy[periodIndex], subject: newSubject };
      }
      return copy;
    });
  };

  const handlePeriodRoomChange = (periodIndex: number, newRoom: string) => {
    setEditingPeriods((prev) => {
      const copy = [...prev];
      if (copy[periodIndex]) {
        copy[periodIndex] = { ...copy[periodIndex], room: newRoom };
      }
      return copy;
    });
  };

  const handleSaveTimetable = () => {
    onUpdateTimetable(selectedClass, selectedDay, editingPeriods);
    setSaveSuccessMsg(`Timetable updated for ${selectedClass} (${selectedDay})! Live in all portals.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleCopyDayToAllWeekdays = () => {
    TIMETABLE_DAYS.forEach((day) => {
      onUpdateTimetable(selectedClass, day, editingPeriods);
    });
    setSaveSuccessMsg(`Applied ${selectedDay} timetable to all weekdays (Mon–Fri) for ${selectedClass}!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetClassToDefault = () => {
    const classIdx = ACADEMY_CLASSES.indexOf(selectedClass);
    const offset = classIdx >= 0 ? classIdx * 3 : 0;
    const dayIdx = TIMETABLE_DAYS.indexOf(selectedDay);

    const defaultPeriods = STANDARD_PERIODS_12H.map((p, periodIdx) => {
      const subjectIdx = (dayIdx * 7 + periodIdx + offset) % SUBJECTS.length;
      const roomNum = 101 + ((dayIdx + periodIdx + offset) % 9);
      return {
        periodNum: p.periodNum,
        time12: p.time12,
        startMinutes: p.startMinutes,
        endMinutes: p.endMinutes,
        subject: SUBJECTS[subjectIdx],
        room: `Room ${roomNum}`,
      };
    });

    setEditingPeriods(defaultPeriods);
    onUpdateTimetable(selectedClass, selectedDay, defaultPeriods);
    setSaveSuccessMsg(`Reset ${selectedClass} (${selectedDay}) to standard curriculum.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold text-orange-600 tracking-wider">
            Academic Coordinator Workspace
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
            Coordinator Station • {user.name}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Academy Timetable Management (12-Hour Schedule), Welfare Triage & Support Incident Response
          </p>
        </div>
      </div>

      {/* Primary Coordinator Switcher: Timetable Editor vs Incident Triage */}
      <div className="flex border-b border-orange-200/80 dark:border-amber-950/80 gap-2">
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'timetable'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Class Timetable Manager</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-mono">
            12-Hour
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'tickets'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Incident Inbox</span>
          {openTickets.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
              {openTickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('transport')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'transport'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Bus Transport & Approvals</span>
          {transportRequests.filter((r) => r.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-stone-950 font-mono font-bold">
              {transportRequests.filter((r) => r.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CLASS TIMETABLE MANAGER */}
      {activeTab === 'timetable' && (
        <div className="space-y-5">
          {/* Controls Bar: Class & Day Selector */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Configure Timetable For Respective Classes</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Set 12-hour period subjects and room allocations. Saved updates immediately sync across student, teacher, and parent views.
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-pulse">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Select Class */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-stone-500 tracking-wider block">
                Select Respective Class:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACADEMY_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      selectedClass === cls
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-orange-300'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Day */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-stone-500 tracking-wider block">
                Select School Day:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {TIMETABLE_DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`py-2 text-xs font-bold rounded-xl transition text-center ${
                      selectedDay === day
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-orange-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timetable Period List Editor */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                  {selectedClass} • {selectedDay} Schedule (7 Periods)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 font-semibold">
                  12-Hour Timings
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSaveTimetable}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Timetable</span>
                </button>

                <button
                  onClick={handleCopyDayToAllWeekdays}
                  title="Copy this schedule to Mon–Fri"
                  className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition border border-stone-200 dark:border-stone-700"
                >
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden sm:inline">Apply to All Weekdays</span>
                  <span className="sm:hidden">Mon-Fri</span>
                </button>

                <button
                  onClick={handleResetClassToDefault}
                  title="Reset to default schedule"
                  className="p-2 text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of 7 periods */}
            <div className="space-y-3">
              {editingPeriods.map((period, idx) => (
                <div
                  key={period.periodNum || idx}
                  className="p-3 sm:p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Period Time & Badge */}
                  <div className="flex items-center gap-2.5 sm:w-56 shrink-0">
                    <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-mono font-bold flex items-center justify-center text-xs">
                      P{period.periodNum || idx + 1}
                    </span>
                    <div>
                      <span className="font-mono font-bold text-stone-800 dark:text-stone-200 text-xs block">
                        {period.time12 || STANDARD_PERIODS_12H[idx]?.time12}
                      </span>
                      <span className="text-[10px] text-stone-400">45-minute lesson</span>
                    </div>
                  </div>

                  {/* Subject Dropdown & Room Input */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-0.5 block">
                        Subject:
                      </label>
                      <select
                        value={period.subject}
                        onChange={(e) => handlePeriodSubjectChange(idx, e.target.value)}
                        className="w-full p-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
                      >
                        {SUBJECTS.map((subj) => (
                          <option key={subj} value={subj}>
                            {subj}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-0.5 block">
                        Assigned Room / Facility:
                      </label>
                      <input
                        type="text"
                        value={period.room}
                        onChange={(e) => handlePeriodRoomChange(idx, e.target.value)}
                        placeholder="e.g. Room 101, Lab 2, Studio 3"
                        className="w-full p-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Save Reminder */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>All changes persist to browser storage and broadcast instantly to logged-in users.</span>
              </span>

              <button
                onClick={handleSaveTimetable}
                className="w-full sm:w-auto px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition text-center"
              >
                Save {selectedClass} Timetable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENT & SUPPORT TICKETS INBOX */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          {/* KPI Stats Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
                Open Support Issues
              </span>
              <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1 font-mono">
                {openTickets.length}
              </div>
              <span className="text-[11px] text-stone-500">Require coordinator response</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
                Urgent Welfare Concerns
              </span>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                {urgentTickets.length}
              </div>
              <span className="text-[11px] text-rose-500 font-semibold">Priority immediate review</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
                Total Handled Tickets
              </span>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-1 font-mono">
                {tickets.length}
              </div>
              <span className="text-[11px] text-stone-500">Academic & portal cases</span>
            </div>
          </div>

          {/* Issue Tickets Inbox */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 dark:border-stone-800 pb-2">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-orange-600" />
                <span>Support Incident Inbox ({filteredTickets.length})</span>
              </h3>

              <div className="flex items-center gap-1.5 text-xs">
                {(['ALL', 'OPEN', 'RESOLVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      filterStatus === st
                        ? 'bg-orange-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredTickets.length === 0 ? (
                <p className="text-stone-400 italic py-12 text-center text-xs">
                  No tickets found in this inbox view.
                </p>
              ) : (
                filteredTickets.map((t) => {
                  const sender = USER_PROFILES[t.by]?.name || t.by.toUpperCase();
                  const isResolved = t.status === 'RESOLVED';

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-xl border space-y-2.5 text-xs transition ${
                        t.urgent && !isResolved
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                          : isResolved
                          ? 'bg-stone-50/60 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 opacity-80'
                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                            {t.id}
                          </span>
                          {t.urgent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                              <Flame className="w-3 h-3" /> URGENT WELFARE
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isResolved
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-stone-500 font-medium">
                            {sender} ({USER_PROFILES[t.by]?.role || 'user'})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-stone-400 font-mono text-[11px]">
                          <span>{t.category}</span>
                          <span>•</span>
                          <span>{t.time}</span>
                        </div>
                      </div>

                      <p className="text-stone-800 dark:text-stone-200 leading-relaxed font-medium bg-white/70 dark:bg-stone-800/70 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                        "{t.message}"
                      </p>

                      {t.reply && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                          <span className="font-bold block mb-0.5">Response from Ms. Bharthi:</span>
                          <p>{t.reply}</p>
                        </div>
                      )}

                      {!isResolved && (
                        <div className="pt-2 flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Type response to user..."
                            value={replies[t.id] || ''}
                            onChange={(e) =>
                              setReplies((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                            className="flex-1 p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs"
                          />
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleReplySubmit(t.id, 'RESOLVED')}
                              disabled={!replies[t.id]?.trim()}
                              className="px-3 py-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition disabled:opacity-50"
                            >
                              Reply & Resolve
                            </button>
                            <button
                              onClick={() => handleReplySubmit(t.id, 'IN PROGRESS')}
                              className="px-3 py-1.5 font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 rounded-xl transition"
                            >
                              In Progress
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUS TRANSPORT APPROVALS & STAFF OPT-IN */}
      {activeTab === 'transport' && (
        <div className="space-y-6">
          <TransportApprovalQueue
            transportRequests={transportRequests}
            onUpdateTransportRequestStatus={onUpdateTransportRequestStatus}
            reviewerLabel="Coordinator Desk (Ms. Bharthi)"
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
    </div>
  );
};
