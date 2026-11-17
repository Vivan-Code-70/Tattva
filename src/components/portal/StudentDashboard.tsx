import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Send,
  Clock,
  Check,
  QrCode,
  Radio,
  Award,
  ArrowRight,
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Download,
  BarChart3,
  ShieldCheck,
  GraduationCap,
  Bus,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  UserProfile,
  UserRole,
  Assignment,
  CounselingRequest,
  LeaveRequest,
  ChatMessage,
  TimetableSchedule,
  NoticeItem,
  AttendanceRecord,
  PendingNfcTap,
  SubjectName,
  BusRouteInfo,
  TransportOptInRequest,
  FeeTransaction,
} from '../../types';
import {
  SUBJECTS,
  STANDARD_PERIODS_12H,
  getStudentOptedSubjects,
} from '../../services/storageService';
import { DigitalIdBadgeModal } from './DigitalIdBadgeModal';
import { StudentOverview } from './StudentOverview';
import { DailyAcademicGoals } from './DailyAcademicGoals';
import { TransportOptInPanel } from './TransportOptInPanel';
import {
  exportStudentDashboardPdf,
  StudentSubjectCompletionRow,
} from '../../utils/dashboardPdfExport';

interface StudentDashboardProps {
  user: UserProfile;
  assignments: Assignment[];
  onToggleAssignment: (index: number) => void;
  counseling: CounselingRequest[];
  onBookCounseling: (counselor: string, date: string, mode: string, agenda: string) => void;
  leaveRequests?: LeaveRequest[];
  onApplyLeave?: (from: string, to: string, reason: string) => void;
  onDigitalIdTap: () => void;
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => void;
  timetableSchedule?: TimetableSchedule;
  onNavigateToStudyLab?: () => void;
  feesPaid?: boolean[];
  onPayFee?: (index: number) => void;
  notices?: NoticeItem[];
  onAcknowledgeNotice?: (id: string) => void;
  attendanceRecords?: AttendanceRecord[];
  pendingNfcTaps?: PendingNfcTap[];
  onQuickApproveDemo?: (tapId: string) => void;
  onSwitchToSecurity?: () => void;
  onNavigateToReports?: () => void;
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
  onPayTransportFee?: (requestId: string, method: FeeTransaction['paymentMethod']) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  assignments,
  onToggleAssignment,
  counseling,
  onBookCounseling,
  leaveRequests = [],
  onApplyLeave,
  onDigitalIdTap,
  chatHistory,
  onSendMessage,
  timetableSchedule,
  onNavigateToStudyLab,
  feesPaid,
  onPayFee,
  notices = [],
  onAcknowledgeNotice,
  attendanceRecords = [],
  pendingNfcTaps = [],
  onQuickApproveDemo,
  onSwitchToSecurity,
  onNavigateToReports,
  busRoute,
  transportRequests = [],
  onRequestTransport,
  onPayTransportFee,
}) => {
  // Start on Overview tab by default
  const [activeTab, setActiveTab] = useState<'overview' | 'coursework' | 'timetable' | 'services' | 'notices' | 'transport' | 'chat'>('overview');
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isIdBadgeOpen, setIsIdBadgeOpen] = useState(false);
  const [taskChartMode, setTaskChartMode] = useState<'bar' | 'line'>('bar');
  const [pdfExportNotice, setPdfExportNotice] = useState<string | null>(null);

  // Counseling form state
  const [counselor, setCounselor] = useState('amrita');
  const [counselingDate, setCounselingDate] = useState('2026-10-28');
  const [counselingMode, setCounselingMode] = useState('In person, Jakkur campus');
  const [counselingAgenda, setCounselingAgenda] = useState('');

  // Chat message input state
  const [chatInput, setChatInput] = useState('');

  // Opted subjects determination
  const studentKey = user.id.toLowerCase().includes('vivan') ? 'vivan' : 'krishvika';
  const optedSubjects = user.optedSubjects || getStudentOptedSubjects(studentKey);
  const scores = user.scores || [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90];

  // Calculate Neural GPA strictly using opted subjects
  const optedScores = optedSubjects.map((sub) => {
    const idx = SUBJECTS.indexOf(sub);
    return scores[idx] ?? 90;
  });
  const neuralGpa = optedScores.length > 0
    ? (optedScores.reduce((a, b) => a + b, 0) / optedScores.length).toFixed(1)
    : '98.0';

  // Pending Coursework
  const pendingAssignments = assignments.filter((a) => !a.done[studentKey]);

  // Filter requests for current student
  const myCounseling = counseling.filter((c) =>
    user.id.toLowerCase().includes(c.by)
  );
  const myLeaveRequests = leaveRequests.filter((l) =>
    (l.studentKey && l.studentKey.toLowerCase().includes(studentKey)) ||
    l.by.toLowerCase().includes(studentKey) ||
    user.id.toLowerCase().includes(l.by.toLowerCase())
  );
  const myAttendance = attendanceRecords.filter((a) => a.studentKey === studentKey);

  // Live timetable check
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const handleBookCounseling = (e: React.FormEvent) => {
    e.preventDefault();
    onBookCounseling(
      counselor,
      counselingDate,
      counselingMode,
      counselingAgenda || 'General academic guidance'
    );
    setCounselingAgenda('');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  // Student timetable for today
  const studentClass = user.title?.includes('8') ? 'Grade 8-B' : 'Grade 10-A';
  const todayDayName = DAYS[now.getDay() === 0 ? 0 : Math.min(now.getDay() - 1, 4)];
  const todayPeriods =
    timetableSchedule?.[studentClass]?.[todayDayName] ||
    STANDARD_PERIODS_12H.map((p, idx) => ({
      ...p,
      subject: SUBJECTS[idx % SUBJECTS.length],
      room: `Room ${101 + (idx % 8)}`,
    }));

  // Compute completion percentage of assigned tasks across all 13 subjects
  const SHORT_SUBJECT_LABELS: Record<string, string> = {
    Mathematics: 'Math',
    Physics: 'Physics',
    Biology: 'Biology',
    Chemistry: 'Chem',
    Philosophy: 'Phil',
    English: 'English',
    'Business Studies': 'Business',
    Music: 'Music',
    Dance: 'Dance',
    Sports: 'Sports',
    French: 'French',
    Hindi: 'Hindi',
    Kannada: 'Kannada',
  };

  const subjectCompletionRows: StudentSubjectCompletionRow[] = React.useMemo(() => {
    return SUBJECTS.map((subj, idx) => {
      const subTasks = assignments.filter(
        (a) => a.subject.toLowerCase() === subj.toLowerCase()
      );
      const total = subTasks.length;
      const completed = subTasks.filter((a) => Boolean(a.done[studentKey])).length;
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        subject: subj,
        shortName: SHORT_SUBJECT_LABELS[subj] || subj,
        completed,
        total,
        completionPct,
        score: scores[idx] ?? 90,
        isOpted: optedSubjects.includes(subj),
      };
    });
  }, [assignments, studentKey, scores, optedSubjects]);

  const totalAssignedTasks = assignments.length;
  const totalCompletedTasks = assignments.filter((a) => Boolean(a.done[studentKey])).length;
  const overallTaskCompletionPct =
    totalAssignedTasks > 0 ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100) : 0;

  const handleExportStudentPdf = () => {
    const fileName = exportStudentDashboardPdf({
      user,
      studentKey,
      neuralGpa,
      optedSubjects,
      scores,
      assignments,
      subjectCompletionRows,
      todayDayName,
      todayPeriods,
      attendanceRecords: myAttendance,
      leaveRequests: myLeaveRequests,
    });
    setPdfExportNotice(`Exported dashboard report as ${fileName}`);
    setTimeout(() => setPdfExportNotice(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {pdfExportNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>{pdfExportNotice}</span>
          <button
            onClick={() => setPdfExportNotice(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Profile & KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Neural GPA Card */}
        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
              Cumulative GPA &amp; Mastery
            </span>
            <div className="text-3xl font-extrabold text-orange-600 dark:text-orange-400 mt-1 font-mono">
              {neuralGpa}%
            </div>
          </div>
          <span className="text-xs text-stone-500 mt-2">
            {user.title} • Top 2% Cohort Ranking
          </span>
        </div>

        {/* Pending Tasks Card */}
        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider">
              Pending Coursework
            </span>
            <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 mt-1 font-mono">
              {pendingAssignments.length}
            </div>
          </div>
          <span className="text-xs text-stone-500 mt-2">
            {pendingAssignments.length > 0 ? `${pendingAssignments.length} assignments active` : 'All assignments completed!'}
          </span>
        </div>

        {/* Gate 2 Digital ID Card */}
        <div className="p-5 rounded-[16px] bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100">
                Digital Pass & Gate 2 NFC
              </span>
              <QrCode className="w-4 h-4 text-orange-200" />
            </div>
            <div className="font-bold text-base mt-1 font-display">{user.name}</div>
            <div className="text-xs text-orange-100 font-mono">{user.id}</div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setIsIdBadgeOpen(true)}
              className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 backdrop-blur-xs border border-white/30"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show QR</span>
            </button>
            <button
              onClick={onDigitalIdTap}
              className="flex-1 py-1.5 bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span>Tap NFC</span>
            </button>
            <button
              onClick={handleExportStudentPdf}
              title="Export current dashboard data as PDF"
              className="py-1.5 px-3 bg-stone-900/80 hover:bg-stone-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
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
          Daily Overview
        </button>
        <button
          onClick={() => setActiveTab('coursework')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'coursework'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <span>Coursework</span>
          {pendingAssignments.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 dark:bg-stone-800 text-orange-700 font-mono">
              {pendingAssignments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'timetable'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          12-Hour Schedule
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'notices'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <span>Notices & Circulars</span>
          {notices.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 dark:bg-stone-800 font-mono">
              {notices.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'services'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Guidance & Mentorship
        </button>
        <button
          onClick={() => setActiveTab('transport')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'transport'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Bus className="w-3.5 h-3.5 text-orange-600" />
          <span>Bus Transport</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'chat'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Faculty Communication
        </button>
      </div>

      {/* ---------------- TAB 1: DAILY OVERVIEW (ONLY WHAT STUDENT NEEDS) ---------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Gateway to Dedicated AI Study Lab */}
          {onNavigateToStudyLab && (
            <div className="p-5 rounded-[16px] bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/50 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-700 dark:text-orange-400">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Interactive Learning Workspace</span>
                </div>
                <h4 className="text-base font-extrabold text-stone-900 dark:text-stone-100 font-display">
                  AI Subject Study Assistant & Practice Quiz Lab
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  13-subject inquiry engine with first-principles scientific derivations and adaptive quizzes.
                </p>
              </div>
              <button
                onClick={onNavigateToStudyLab}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                <span>Open Dedicated Lab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 4 Essential Student Overview Cards: Timetable, Assignments, Attendance, Fee Due */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Today's Live Schedule */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Today's Live Classes ({todayDayName})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('timetable')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Full 12H Schedule &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {todayPeriods.slice(0, 4).map((p, idx) => {
                  const isNow = currentMinutes >= p.startMinutes && currentMinutes < p.endMinutes;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                        isNow
                          ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40 font-bold'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-stone-500">{p.time12}</span>
                        {isNow && (
                          <span className="px-1.5 py-0.2 rounded-md bg-orange-600 text-white text-[9px] font-bold animate-pulse">
                            NOW
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-bold text-stone-900 dark:text-stone-100">
                        {p.subject}
                      </div>
                      <span className="text-[10px] text-stone-400">{p.room}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Pending Assignments */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Pending Coursework ({pendingAssignments.length})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('coursework')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  View All &rarr;
                </button>
              </div>

              {pendingAssignments.length === 0 ? (
                <div className="py-6 text-center text-stone-400 text-xs">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-1" />
                  <span>All assigned coursework is complete!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingAssignments.slice(0, 3).map((asg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-orange-200 dark:border-stone-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-stone-900 dark:text-stone-100 block">
                          {asg.subject}: {asg.title}
                        </span>
                        <span className="text-[11px] text-stone-500">Due: {asg.due} • Faculty: {asg.by}</span>
                      </div>
                      <button
                        onClick={() => {
                          const asgIdx = assignments.indexOf(asg);
                          if (asgIdx !== -1) onToggleAssignment(asgIdx);
                        }}
                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-[11px] shrink-0"
                      >
                        Mark Done
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student Overview Sub-Component with Grid Layout & 30-Day Attendance Recharts Line Chart */}
            <div className="lg:col-span-2">
              <StudentOverview
                attendanceRecords={attendanceRecords}
                studentKey={studentKey}
                studentName={user.name}
                pendingAssignmentsCount={pendingAssignments.length}
                attendancePercentage="98.4"
                onNavigateToReports={onNavigateToReports}
                onNavigateToCoursework={() => setActiveTab('coursework')}
              />
            </div>

            {/* 13-Subject Task Completion Progress Chart (Recharts) */}
            <div className="lg:col-span-2 p-5 sm:p-6 rounded-[20px] bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                      13-Subject Assigned Task Completion Progress
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 tabular-nums">
                      {overallTaskCompletionPct}% Overall ({totalCompletedTasks}/{totalAssignedTasks})
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Completion percentage of assigned coursework across all 13 Tattvaswayam subjects (updates live as tasks are marked done).
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTaskChartMode('bar')}
                      className={`px-3 py-1 rounded-lg transition ${
                        taskChartMode === 'bar'
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                      }`}
                    >
                      Progress Bars
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskChartMode('line')}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                        taskChartMode === 'line'
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Line Chart</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportStudentPdf}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              <div className="w-full h-64 pt-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  {taskChartMode === 'bar' ? (
                    <BarChart
                      data={subjectCompletionRows}
                      margin={{ top: 10, right: 12, left: -18, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10, fill: '#78716c' }}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const row: StudentSubjectCompletionRow = payload[0].payload;
                          return (
                            <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl text-xs space-y-1 min-w-[180px]">
                              <div className="flex items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-1">
                                <span className="font-extrabold text-stone-900 dark:text-stone-100">
                                  {row.subject}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-300 font-bold">
                                  {row.isOpted ? 'Opted' : 'Open'}
                                </span>
                              </div>
                              <div className="flex justify-between pt-0.5">
                                <span className="text-stone-500">Task Completion:</span>
                                <span className="font-mono font-extrabold text-orange-600 tabular-nums">
                                  {row.completionPct}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Tasks Completed:</span>
                                <span className="font-mono font-bold text-stone-800 dark:text-stone-200 tabular-nums">
                                  {row.completed} / {row.total}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Subject Score:</span>
                                <span className="font-mono font-bold text-emerald-600 tabular-nums">
                                  {row.score}%
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="completionPct"
                        name="Task Completion %"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={32}
                        background={{ fill: 'rgba(120, 113, 108, 0.12)', radius: 6 }}
                      >
                        {subjectCompletionRows.map((entry) => (
                          <Cell
                            key={entry.subject}
                            fill={
                              entry.completionPct === 100
                                ? '#10b981'
                                : entry.completionPct >= 50
                                ? '#ea580c'
                                : entry.completionPct > 0
                                ? '#f59e0b'
                                : '#a8a29e'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart
                      data={subjectCompletionRows}
                      margin={{ top: 10, right: 12, left: -18, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10, fill: '#78716c' }}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const row: StudentSubjectCompletionRow = payload[0].payload;
                          return (
                            <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl text-xs space-y-1 min-w-[180px]">
                              <div className="font-extrabold text-stone-900 dark:text-stone-100 border-b border-stone-100 dark:border-stone-800 pb-1">
                                {row.subject}
                              </div>
                              <div className="flex justify-between pt-0.5">
                                <span className="text-stone-500">Task Completion:</span>
                                <span className="font-mono font-extrabold text-orange-600 tabular-nums">
                                  {row.completionPct}% ({row.completed}/{row.total})
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="completionPct"
                        name="Task Completion %"
                        stroke="#ea580c"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 1.5 }}
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    <span>100% Complete</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-600" />
                    <span>50–99% In Progress</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-stone-400" />
                    <span>0% Pending</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('coursework')}
                  className="font-bold text-orange-600 hover:text-orange-700"
                >
                  Update Tasks in Coursework &rarr;
                </button>
              </div>
            </div>

            {/* Daily Academic Goals with Circular Progress Bar */}
            <DailyAcademicGoals
              studentKey={studentKey}
              studentName={user.name}
              onNavigateToStudyLab={onNavigateToStudyLab}
            />

            {/* Card 4: Opted Subject Performance Matrix */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Opted Subject Performance
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-orange-600 bg-orange-50 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                  {optedSubjects.length} Opted Disciplines
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {optedSubjects.map((sub) => {
                  const idx = SUBJECTS.indexOf(sub);
                  const sc = scores[idx] ?? 90;
                  const grade = sc >= 95 ? 'A+' : sc >= 90 ? 'A' : 'B';
                  return (
                    <div
                      key={sub}
                      className="p-2.5 rounded-xl bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-stone-800 dark:text-stone-200">{sub}</span>
                          <span className="font-mono font-extrabold text-orange-600">{sc}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
                            style={{ width: `${sc}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                          grade === 'A+'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {grade}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
                <span>Showing your enrolled curriculum</span>
                {onNavigateToReports && (
                  <button
                    onClick={onNavigateToReports}
                    className="font-bold text-orange-600 hover:text-orange-700"
                  >
                    View Official Transcript &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: COURSEWORK ASSIGNMENTS ---------------- */}
      {activeTab === 'coursework' && (
        <div className="space-y-4">
          <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                All Assigned Coursework ({assignments.length})
              </h3>
              <span className="text-xs text-stone-500 font-mono">
                {pendingAssignments.length} Remaining
              </span>
            </div>

            <div className="space-y-2.5">
              {assignments.map((asg, idx) => {
                const isDone = asg.done[studentKey];
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 text-xs ${
                      isDone
                        ? 'bg-stone-50/60 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 opacity-75'
                        : 'bg-white dark:bg-stone-900 border-orange-200 dark:border-stone-700 hover:border-orange-400'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100 block">
                        {asg.subject}: {asg.title}
                      </span>
                      <span className="text-[11px] text-stone-500 mt-0.5 block">
                        Due: {asg.due} · Published by: {asg.by}
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleAssignment(idx)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 shrink-0 ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Done
                        </>
                      ) : (
                        'Mark Complete'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: 12-HOUR TIMETABLE ---------------- */}
      {activeTab === 'timetable' && (
        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3 gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                Weekly 12-Hour Master Timetable
              </h3>
              <p className="text-xs text-stone-500">Standardized class periods with room locations</p>
            </div>
            <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 dark:bg-stone-800 px-2.5 py-1 rounded-lg">
              {studentClass}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {DAYS.map((d, idx) => (
              <button
                key={d}
                onClick={() => setActiveDayIndex(idx)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition min-w-[60px] ${
                  activeDayIndex === idx
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {(() => {
              const dayName = DAYS[activeDayIndex];
              const periods =
                timetableSchedule?.[studentClass]?.[dayName] ||
                STANDARD_PERIODS_12H.map((p, idx) => ({
                  ...p,
                  subject: SUBJECTS[(activeDayIndex * 7 + idx) % SUBJECTS.length],
                  room: `Room ${101 + ((activeDayIndex + idx) % 9)}`,
                }));

              const isLiveDay = activeDayIndex === (now.getDay() === 0 ? 0 : now.getDay() - 1);

              return periods.map((p, idx) => {
                const isNow = isLiveDay && currentMinutes >= p.startMinutes && currentMinutes < p.endMinutes;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 text-xs ${
                      isNow
                        ? 'bg-orange-100/90 dark:bg-orange-950/70 border-orange-400 font-bold shadow-xs'
                        : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-stone-500 text-[11px] font-semibold">{p.time12}</span>
                      {isNow && (
                        <span className="px-1.5 py-0.2 rounded-md bg-orange-600 text-white text-[9px] font-bold animate-pulse">
                          NOW
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-stone-900 dark:text-stone-100 font-bold text-sm font-display">
                        {p.subject}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{p.room}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: NOTICES WITH ACKNOWLEDGEMENTS ---------------- */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                Institutional Circulars & Notice Board
              </h3>
              <p className="text-xs text-stone-500">Read and acknowledge official school directives</p>
            </div>

            <div className="space-y-3">
              {notices.map((n) => {
                const isAck = n.acknowledgedBy.includes(studentKey);
                return (
                  <div
                    key={n.id}
                    className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/70 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm font-display">
                        {n.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-800 font-bold">
                        {n.category}
                      </span>
                    </div>

                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-[11px]">
                      {n.content}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 dark:border-stone-700/50">
                      <span className="text-[10px] text-stone-400">Date: {n.date} • {n.author}</span>
                      {onAcknowledgeNotice && (
                        <button
                          onClick={() => onAcknowledgeNotice(n.id)}
                          disabled={isAck}
                          className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition ${
                            isAck
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-orange-600 hover:bg-orange-700 text-white'
                          }`}
                        >
                          {isAck ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Acknowledged</span>
                            </>
                          ) : (
                            'Mark as Acknowledged'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 5: COUNSELING & LEAVES ---------------- */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Counseling Booking */}
          <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
              Book Academic Guidance Session
            </h3>
            <form onSubmit={handleBookCounseling} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Counselor / Faculty:
                </label>
                <select
                  value={counselor}
                  onChange={(e) => setCounselor(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                >
                  <option value="amrita">Ms. Amrita (Student Guidance)</option>
                  <option value="sandhya">Ms. Sandhya (Academics Director)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Date:
                </label>
                <input
                  type="date"
                  required
                  value={counselingDate}
                  onChange={(e) => setCounselingDate(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Discussion Agenda:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics Olympiad prep & research"
                  value={counselingAgenda}
                  onChange={(e) => setCounselingAgenda(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Send Counseling Request
              </button>
            </form>
          </div>

          {/* Guardian-Administered Leave Policy & Record */}
          <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                  Official Leave Administration
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                Guardian Policy
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-stone-850 border border-orange-200/70 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
              <span className="font-bold text-stone-900 dark:text-stone-100 block">
                Parent-Managed Permission Policy
              </span>
              <p className="text-[11px] leading-relaxed">
                As per Tattvaswayam Future Academy institutional governance, all official leave permissions and term fee installments are submitted exclusively by parent/guardian accounts.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Your Guardian-Filed Leave Records ({myLeaveRequests.length}):
              </span>

              {myLeaveRequests.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 text-center text-stone-400 text-xs">
                  No active or past leave applications on record.
                </div>
              ) : (
                myLeaveRequests.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {l.id} • {l.from} to {l.to}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : l.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                      Reason: "{l.reason}"
                    </p>
                    <span className="text-[10px] text-stone-400 block">
                      Submitted by: Guardian ({l.by})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 5B: BUS TRANSPORT OPT-IN & PASS ---------------- */}
      {activeTab === 'transport' && (
        <TransportOptInPanel
          user={user}
          busRoute={busRoute}
          transportRequests={transportRequests}
          onRequestTransport={onRequestTransport}
          onPayTransportFee={onPayTransportFee}
        />
      )}

      {/* ---------------- TAB 6: FACULTY CHAT ---------------- */}
      {activeTab === 'chat' && (
        <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
              Mentor & Faculty Communication Channel
            </h3>
            <span className="text-xs text-stone-400">Response time: &lt; 2 hrs</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 min-h-[140px] max-h-60 overflow-y-auto space-y-2 text-xs">
            {chatHistory.length === 0 ? (
              <p className="text-stone-400 text-center py-6 italic">
                No recent messages with mentors. Send a query below regarding class assignments or lab bookings.
              </p>
            ) : (
              chatHistory.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl max-w-[85%] ${
                    m.sender === 'user'
                      ? 'ml-auto bg-orange-600 text-white'
                      : 'mr-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100'
                  }`}
                >
                  <div className="text-[10px] opacity-75 font-mono mb-0.5">
                    {m.sender === 'user' ? 'Me' : 'Academic Office'} · {m.timestamp}
                  </div>
                  <div className="leading-relaxed">{m.text}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Type message to senior faculty coordinator..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Digital Student ID Badge Modal with QR code */}
      <DigitalIdBadgeModal
        isOpen={isIdBadgeOpen}
        onClose={() => setIsIdBadgeOpen(false)}
        user={user}
        onSimulateTap={onDigitalIdTap}
        pendingNfcTaps={pendingNfcTaps}
        onQuickApproveDemo={onQuickApproveDemo}
        onSwitchToSecurity={onSwitchToSecurity}
      />
    </div>
  );
};
