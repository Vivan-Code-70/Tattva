import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Send,
  BarChart3,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  HelpCircle,
  UserCheck,
  Calendar,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock3,
  Bus,
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  Assignment,
  AiLogItem,
  QuizResult,
  TimetableSchedule,
  AttendanceRecord,
  BusRouteInfo,
  TransportOptInRequest,
  FeeTransaction,
} from '../../types';
import {
  SUBJECTS,
  USER_PROFILES,
  TIMETABLE_DAYS,
  ACADEMY_CLASSES,
  STANDARD_PERIODS_12H,
} from '../../services/storageService';
import { AiService } from '../../services/aiService';
import { WeeklyAttendanceTrendChart } from './WeeklyAttendanceTrendChart';
import { TransportOptInPanel } from './TransportOptInPanel';

interface TeacherDashboardProps {
  user: UserProfile;
  assignments: Assignment[];
  onPublishAssignment: (subject: string, title: string, due: string) => void;
  aiLogs: AiLogItem[];
  quizResults: QuizResult[];
  timetableSchedule?: TimetableSchedule;
  attendanceRecords?: AttendanceRecord[];
  onMarkAttendance?: (studentId: string, status: 'present' | 'absent' | 'late') => void;
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

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  assignments,
  onPublishAssignment,
  aiLogs,
  quizResults,
  timetableSchedule,
  attendanceRecords = [],
  onMarkAttendance,
  busRoute,
  transportRequests = [],
  onRequestTransport,
  onPayTransportFee,
}) => {
  // Tabs: Facilitator opens on Overview with classes, mark attendance, and students needing attention
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'coursework' | 'timetable' | 'lesson-planner' | 'inquiries' | 'transport'>('overview');

  const [facultyClass, setFacultyClass] = useState('Grade 10-A');
  const [facultyDay, setFacultyDay] = useState(0);

  // Local attendance state for quick-marking roll call
  const [localAttendance, setLocalAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({
    vivan: 'present',
    krishvika: 'present',
  });
  const [attendanceSavedToast, setAttendanceSavedToast] = useState<string | null>(null);

  // Assignment publish form
  const [newSubject, setNewSubject] = useState(SUBJECTS[1]); // Physics
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-10-31');

  // AI Lesson Planner
  const [lessonTopic, setLessonTopic] = useState('Grade 10 Wave Resonance & Doppler Shift');
  const [lessonPlanResult, setLessonPlanResult] = useState('');
  const [isDraftingPlan, setIsDraftingPlan] = useState(false);

  const handleMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setLocalAttendance((prev) => ({ ...prev, [studentId]: status }));
    if (onMarkAttendance) {
      onMarkAttendance(studentId, status);
    }
  };

  const handleSaveBatchAttendance = () => {
    Object.entries(localAttendance).forEach(([sId, status]) => {
      if (onMarkAttendance) {
        onMarkAttendance(sId, status);
      }
    });
    setAttendanceSavedToast('Attendance registered and synchronized to School Registry & Gate Logs.');
    setTimeout(() => setAttendanceSavedToast(null), 3500);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onPublishAssignment(newSubject, newTitle.trim(), newDueDate);
    setNewTitle('');
  };

  const handleDraftLessonPlan = async () => {
    if (!lessonTopic.trim()) return;
    setIsDraftingPlan(true);
    setLessonPlanResult('');
    try {
      const plan = await AiService.draftLessonPlan(lessonTopic);
      setLessonPlanResult(plan);
    } catch (e) {
      setLessonPlanResult('Failed to generate lesson plan. Please retry.');
    } finally {
      setIsDraftingPlan(false);
    }
  };

  // Class mastery calculation: average of Vivan and Krishvika
  const vivanScores = USER_PROFILES.vivan.scores || [];
  const krishvikaScores = USER_PROFILES.krishvika.scores || [];

  const classMastery = SUBJECTS.map((subj, idx) => {
    const v = vivanScores[idx] || 90;
    const k = krishvikaScores[idx] || 90;
    return {
      subject: subj,
      average: Math.round((v + k) / 2),
    };
  });

  // Today's classes for Ms. Susmita Roy
  const todaysClasses = [
    { period: 'Period 2', time: '09:15 AM - 10:00 AM', subject: 'Advanced Physics', class: 'Grade 10-A', room: 'Room 204 (Quantum Lab)' },
    { period: 'Period 4', time: '10:55 AM - 11:40 AM', subject: 'Applied Mathematics', class: 'Grade 10-A', room: 'Room 102' },
    { period: 'Period 6', time: '01:10 PM - 01:55 PM', subject: 'General Science Workshop', class: 'Grade 8-B', room: 'Discovery Lab 1' },
    { period: 'Period 8', time: '02:45 PM - 03:30 PM', subject: 'Physics Peer Mentoring', class: 'Grade 10-A & 8-B', room: 'Room 204' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Ribbon */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold text-orange-600 tracking-wider">
            Facilitator Workspace
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
            {user.name} • Senior Faculty
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Physics & Mathematics Department • Advanced Secondary Section
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-50 dark:bg-stone-800 rounded-xl border border-orange-200 dark:border-stone-700 text-center">
            <span className="text-[10px] text-stone-500 block">Class Cohort Size</span>
            <span className="text-base font-extrabold text-orange-600 dark:text-orange-400 font-mono">
              28 Students
            </span>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-stone-800 rounded-xl border border-orange-200 dark:border-stone-700 text-center">
            <span className="text-[10px] text-stone-500 block">Published Coursework</span>
            <span className="text-base font-extrabold text-stone-900 dark:text-stone-100 font-mono">
              {assignments.length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Facilitator Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-orange-200/60 dark:border-stone-800 text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview & Today', icon: ClipboardList },
          { id: 'attendance', label: 'Mark Attendance', icon: UserCheck },
          { id: 'coursework', label: 'Coursework Publisher', icon: Send },
          { id: 'timetable', label: '12-Hour Timetable', icon: Clock },
          { id: 'lesson-planner', label: 'AI Lesson Planner', icon: Sparkles },
          { id: 'inquiries', label: 'Student Queries & Quizzes', icon: HelpCircle },
          { id: 'transport', label: 'Bus Transport', icon: Bus },
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

      {attendanceSavedToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <span className="font-semibold">{attendanceSavedToast}</span>
          <button onClick={() => setAttendanceSavedToast(null)} className="text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW (Classes, Mark Attendance, Students Needing Attention) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section 1: Today's Classes & Mark Attendance Quick Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Teaching Schedule */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Today's Facilitation Classes</span>
                </h3>
                <span className="text-xs text-stone-500 font-medium">Wednesday Schedule</span>
              </div>

              <div className="space-y-2.5">
                {todaysClasses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-orange-50/40 dark:bg-stone-800/40 border border-orange-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                          {item.time}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-200/60 dark:bg-orange-950/80 text-[10px] font-bold text-orange-800 dark:text-orange-300">
                          {item.class}
                        </span>
                      </div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">
                        {item.subject}
                      </div>
                      <div className="text-[11px] text-stone-500">{item.room}</div>
                    </div>

                    <button
                      onClick={() => setActiveTab('attendance')}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-[11px] shadow-xs self-start sm:self-auto transition"
                    >
                      Roll Call
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Attendance Roll Call for Active Cohort */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-orange-600" />
                    <span>Quick Roll Call (Grade 10-A)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">Live</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Mark active period presence. Synchronizes with parents and gate logs instantly.
                </p>

                <div className="space-y-2 mt-3 text-xs">
                  {[
                    { id: 'vivan', name: 'Vivan Sharma', roll: 'TFA-2026-089', grade: 'Grade 10-A' },
                    { id: 'krishvika', name: 'Krishvika Patel', roll: 'TFA-2026-104', grade: 'Grade 8-B' },
                  ].map((stu) => {
                    const status = localAttendance[stu.id] || 'present';
                    return (
                      <div
                        key={stu.id}
                        className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {stu.name}
                          </div>
                          <div className="text-[10px] text-stone-500 font-mono">
                            {stu.grade} • {stu.roll}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMark(stu.id, 'present')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMark(stu.id, 'late')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              status === 'late'
                                ? 'bg-amber-600 text-white'
                                : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            onClick={() => handleMark(stu.id, 'absent')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              status === 'absent'
                                ? 'bg-rose-600 text-white'
                                : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveBatchAttendance}
                className="w-full mt-3 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition"
              >
                Submit Attendance to Registry
              </button>
            </div>
          </div>

          {/* Section 2: Students Needing Attention & Cohort Mastery */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Students Needing Attention */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Students Needing Attention</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  2 Flagged
                </span>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                {['vivan', 'krishvika'].map((k) => {
                  const u = USER_PROFILES[k];
                  const s = u.scores || [];
                  const lowest = SUBJECTS.map((subj, idx) => ({ subj, score: s[idx] }))
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 2);

                  return (
                    <div
                      key={k}
                      className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {u.name} ({u.title})
                        </span>
                        <span className="text-[10px] font-mono text-amber-600 font-semibold">
                          Intervention Alert
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Target areas needing peer mentor pairing:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {lowest.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-mono text-[10px] font-semibold"
                          >
                            {item.subj}: {item.score}%
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setLessonTopic(`Remedial clinic for ${u.name}: ${lowest[0]?.subj || 'Physics'}`);
                            setActiveTab('lesson-planner');
                          }}
                          className="text-[10px] text-orange-600 font-bold hover:underline"
                        >
                          Plan Remedial Lesson →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Class Mastery Breakdown */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  <span>Cohort Subject Mastery (Average)</span>
                </h3>
                <span className="text-xs text-stone-500">Across 13 Academic Disciplines</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-1 text-xs">
                {classMastery.map((item) => (
                  <div key={item.subject} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-stone-800 dark:text-stone-200">
                        {item.subject}
                      </span>
                      <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                        {item.average}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${item.average}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recharts Weekly Attendance Trend Line Chart for Class Facilitator */}
          <WeeklyAttendanceTrendChart
            attendanceRecords={attendanceRecords}
            roleContext="teacher"
            title="Class Attendance & Weekly Punctuality Trend"
            subtitle="5-week turnout analytics tracked across Grade 10-A physics sessions and morning roll calls"
          />
        </div>
      )}

      {/* TAB 2: ATTENDANCE REGISTER */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Recharts Weekly Attendance Trend Line Chart */}
          <WeeklyAttendanceTrendChart
            attendanceRecords={attendanceRecords}
            roleContext="teacher"
            title="Roll Call Turnout & Punctuality Trajectory"
            subtitle="Real-time attendance compared against 5-week departmental attendance baseline"
          />

          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-3 gap-2">
            <div>
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-600" />
                <span>Departmental Roll Call & Attendance Register</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Official class registry for Academic Year 2026-2027 • Jakkur Campus
              </p>
            </div>

            <button
              onClick={handleSaveBatchAttendance}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Save & Synchronize Register
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'vivan', name: 'Vivan Sharma', roll: 'TFA-2026-089', grade: 'Grade 10-A', parent: 'Dr. Ramesh Sharma', contact: '+91 98450 12345' },
              { id: 'krishvika', name: 'Krishvika Patel', roll: 'TFA-2026-104', grade: 'Grade 8-B', parent: 'Deepak Patel', contact: '+91 98450 67890' },
            ].map((stu) => {
              const status = localAttendance[stu.id] || 'present';
              return (
                <div
                  key={stu.id}
                  className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {stu.name}
                      </h4>
                      <div className="text-xs text-stone-500 font-mono">
                        {stu.grade} • Roll: {stu.roll}
                      </div>
                      <div className="text-[11px] text-stone-400 mt-1">
                        Parent: {stu.parent} ({stu.contact})
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase font-mono ${
                        status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : status === 'late'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-stone-200 dark:border-stone-800 text-xs">
                    <span className="text-stone-500 font-medium">Mark status:</span>
                    <div className="flex gap-1.5 flex-1 justify-end">
                      <button
                        onClick={() => handleMark(stu.id, 'present')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-emerald-100'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleMark(stu.id, 'late')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition ${
                          status === 'late'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-amber-100'
                        }`}
                      >
                        Late Entry
                      </button>
                      <button
                        onClick={() => handleMark(stu.id, 'absent')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition ${
                          status === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-rose-100'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* TAB 3: COURSEWORK PUBLISHER */}
      {activeTab === 'coursework' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Publish Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-600" />
                <span>Publish Coursework / Assignment</span>
              </h3>
              <span className="text-xs text-stone-500">Pushes to student portals</span>
            </div>

            <form onSubmit={handlePublish} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Subject:
                  </label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value as any)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Submission Due Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Assignment Title & Scope:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wave packet superposition and harmonic resonance set"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Broadcast Assignment to Cohort
              </button>
            </form>
          </div>

          {/* Published assignments list */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
              <span>Active Broadcast Assignments</span>
              <span className="text-xs text-orange-600 font-mono font-bold">
                {assignments.length} total
              </span>
            </h3>

            <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs pr-1">
              {assignments.map((a, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100 block">
                      {a.subject}: {a.title}
                    </span>
                    <div className="text-[11px] text-stone-500 mt-0.5">Due: {a.due}</div>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60">
                    {Object.keys(a.done).length} completed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 12-HOUR TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2 gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                Departmental Class Schedules (12-Hour Clock)
              </h3>
            </div>

            {/* Class Switcher */}
            <div className="flex items-center gap-1.5 text-xs">
              {ACADEMY_CLASSES.slice(0, 2).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setFacultyClass(cls)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    facultyClass === cls
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-orange-50'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* Days tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {TIMETABLE_DAYS.map((d, idx) => (
              <button
                key={d}
                onClick={() => setFacultyDay(idx)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition min-w-[48px] ${
                  facultyDay === idx
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-orange-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Periods */}
          <div className="space-y-2 pt-1">
            {(() => {
              const dayName = TIMETABLE_DAYS[facultyDay];
              const periods =
                timetableSchedule?.[facultyClass]?.[dayName] ||
                timetableSchedule?.['Grade 10-A']?.[dayName] ||
                STANDARD_PERIODS_12H.map((p, idx) => ({
                  ...p,
                  subject: SUBJECTS[(facultyDay * 7 + idx) % SUBJECTS.length],
                  room: `Room ${101 + ((facultyDay + idx) % 9)}`,
                }));

              return periods.map((p, idx) => {
                const isMySubject = p.subject.toLowerCase().includes('physics') || p.subject.toLowerCase().includes('math');

                return (
                  <div
                    key={p.periodNum || idx}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs transition ${
                      isMySubject
                        ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 font-semibold'
                        : 'bg-stone-50/50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono text-stone-500 dark:text-stone-400 text-[11px] font-semibold">
                        {p.time12}
                      </span>
                      <span className="text-stone-300 dark:text-stone-700 hidden sm:inline">•</span>
                      <span className="text-stone-900 dark:text-stone-100 font-bold">
                        {p.subject}
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {p.room?.startsWith('Room') || p.room?.startsWith('Lab') || p.room?.startsWith('Studio')
                          ? p.room
                          : `Room ${p.room}`}
                      </span>
                    </div>

                    {isMySubject && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-600 text-white self-start sm:self-auto">
                        Teaching Period
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TAB 5: AI LESSON PLANNER */}
      {activeTab === 'lesson-planner' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI Lesson Planner (45-Minute Schema)</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-stone-800 dark:text-orange-400 font-bold">
              Gemini 3.8
            </span>
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400">
            Generates pedagogical objectives, timed classroom hooks, experimental demos, and formative assessment questions.
          </p>

          <div className="text-xs">
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
              Lesson Topic & Cohort:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={lessonTopic}
                onChange={(e) => setLessonTopic(e.target.value)}
                placeholder="e.g. Grade 10 Optical Refraction and Snell's Law"
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100"
              />
              <button
                onClick={handleDraftLessonPlan}
                disabled={isDraftingPlan}
                className="px-5 py-2.5 font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs transition whitespace-nowrap disabled:opacity-50"
              >
                {isDraftingPlan ? 'Drafting…' : 'Plan Lesson'}
              </button>
            </div>
          </div>

          <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs min-h-[220px] max-h-96 overflow-y-auto">
            {isDraftingPlan ? (
              <div className="flex items-center justify-center h-48 gap-2 text-stone-500">
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                <span>Drafting pedagogical lesson architecture…</span>
              </div>
            ) : lessonPlanResult ? (
              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-stone-800 dark:text-stone-200">
                {lessonPlanResult}
              </pre>
            ) : (
              <p className="text-stone-400 italic text-center py-16">
                Enter a lesson topic above and click "Plan Lesson" to generate a complete instructional blueprint.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: STUDENT INQUIRIES & QUIZ RESULTS */}
      {activeTab === 'inquiries' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student AI Inquiries */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-orange-600" />
                <span>Student AI Study Inquiries ({aiLogs.length})</span>
              </h3>
              <span className="text-[11px] text-stone-500">Live Cognitive Stream</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto text-xs pr-1">
              {aiLogs.length === 0 ? (
                <p className="text-stone-400 italic py-10 text-center">
                  No student AI inquiries logged yet.
                </p>
              ) : (
                aiLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {log.userId.toUpperCase()} • {log.subject}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">{log.time}</span>
                    </div>
                    <div className="font-medium text-stone-700 dark:text-stone-300">
                      Q: "{log.question}"
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 italic line-clamp-2">
                      A: {log.answer}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Practice Quiz Results */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Recent Student Quiz Scores ({quizResults.length})</span>
              </h3>
              <span className="text-[11px] text-stone-500">Automated AI Quizzes</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto text-xs pr-1">
              {quizResults.length === 0 ? (
                <p className="text-stone-400 italic py-10 text-center">
                  No quiz submissions recorded yet.
                </p>
              ) : (
                quizResults.map((qz, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {qz.userId.toUpperCase()} • {qz.subject}
                      </span>
                      <div className="text-[11px] text-stone-500">
                        {qz.topic || 'General'} • {qz.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {qz.score}
                      </span>
                      <span className="text-[10px] text-stone-400 block font-mono">
                        {qz.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: BUS TRANSPORT OPT-IN */}
      {activeTab === 'transport' && (
        <TransportOptInPanel
          user={user}
          busRoute={busRoute}
          transportRequests={transportRequests}
          onRequestTransport={onRequestTransport}
          onPayTransportFee={onPayTransportFee}
        />
      )}
    </div>
  );
};
