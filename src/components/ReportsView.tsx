import React, { useState } from 'react';
import {
  Award,
  Download,
  Sparkles,
  BarChart3,
  TrendingUp,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  ShieldAlert,
  ArrowRight,
  Printer,
  X,
  ShieldCheck,
  Building,
  Mail,
} from 'lucide-react';
import { SUBJECTS, USER_PROFILES, StorageService, getStudentOptedSubjects } from '../services/storageService';
import { AiService } from '../services/aiService';
import { UserProfile, AttendanceRecord } from '../types';
import { DailyAttendanceTrendChart } from './DailyAttendanceTrendChart';
import { exportDailyAttendanceTrendCSV } from '../utils/attendanceExport';
import { GoogleWorkspaceIntegrationModal } from './portal/GoogleWorkspaceIntegrationModal';

interface ReportsViewProps {
  currentUser: UserProfile | null;
  onNavigateToPortal?: () => void;
  attendanceRecords?: AttendanceRecord[];
}

interface DownloadStatusDetails {
  filename: string;
  timestamp: string;
  size: string;
  rows: number;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  onNavigateToPortal,
  attendanceRecords = [],
}) => {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatusDetails | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceModalMode, setWorkspaceModalMode] = useState<'sheets' | 'gmail'>('sheets');
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const triggerDownloadStatus = (fname: string) => {
    setDownloadStatus({
      filename: fname,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      size: '2.1 KB',
      rows: 5,
    });
  };

  const handleExportAttendanceCSV = () => {
    const fname = exportDailyAttendanceTrendCSV(attendanceRecords, currentUser, 'current');
    triggerDownloadStatus(fname);
  };

  // If not logged in, render the Campus Attendance Trend Chart and confidential transcript sign-in banner
  if (!currentUser) {
    return (
      <div className="space-y-6 overflow-x-hidden w-full">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-display">
                <TrendingUp className="w-5 h-5 text-orange-600 shrink-0" />
                <span>Campus Attendance Analytics & Daily Trends</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Institutional Public Overview
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Tattvasayam Future Academy • Daily verified RFID turnstile turnout across academic cohorts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const fname = exportDailyAttendanceTrendCSV(attendanceRecords, null, 'current');
                triggerDownloadStatus(fname);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-stone-800 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-stone-700 hover:bg-orange-50 dark:hover:bg-stone-700 font-bold text-xs rounded-xl shadow-xs transition"
              title="Download daily attendance trend data as formatted CSV"
            >
              <Download className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setWorkspaceModalMode('sheets');
                setIsWorkspaceModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded-xl shadow-xs transition"
              title="Export to Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Google Sheets</span>
            </button>

            <button
              onClick={() => {
                setWorkspaceModalMode('gmail');
                setIsWorkspaceModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-stone-700 hover:bg-orange-100 font-bold text-xs rounded-xl shadow-xs transition"
              title="Send report via Gmail"
            >
              <Mail className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Gmail</span>
            </button>

            <button
              onClick={onNavigateToPortal}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <span>Sign In to Access Transcripts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Daily Attendance Trend Chart using Recharts with Summary Table */}
        <DailyAttendanceTrendChart
          attendanceRecords={attendanceRecords}
          onExportCSV={triggerDownloadStatus}
          onOpenWorkspace={(m) => {
            setWorkspaceModalMode(m);
            setIsWorkspaceModalOpen(true);
          }}
        />

        {/* Confidential Scholastic Transcript Notice */}
        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                Individual Student Transcripts & Official Report Cards
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xl">
                13-discipline mastery assessments, AI educator remarks, and downloadable transcripts are restricted to authenticated students, parents, faculty, and administrators.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToPortal}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
          >
            <span>Sign In via Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Download Status Toast Notification */}
        {downloadStatus && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md w-[92vw] sm:w-[420px] p-4 rounded-2xl bg-stone-900 text-white shadow-2xl border border-stone-700 space-y-2.5 animate-bounce-short">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                    Download Status: Successfully Saved
                  </h4>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {downloadStatus.timestamp} • File ready on local storage
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDownloadStatus(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              The daily attendance trend data has been confirmed and saved to your device:
              <code className="block mt-1 font-mono text-[11px] text-orange-400 bg-stone-800 p-1.5 rounded-lg border border-stone-700 truncate">
                {downloadStatus.filename}
              </code>
            </p>

            <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-stone-400 font-mono">
                {downloadStatus.size} • {downloadStatus.rows} weekdays
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setWorkspaceModalMode('sheets');
                    setIsWorkspaceModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-bold hover:bg-emerald-900 transition flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Google Sheets</span>
                </button>
                <button
                  onClick={() => {
                    setWorkspaceModalMode('gmail');
                    setIsWorkspaceModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-orange-950 text-orange-300 border border-orange-800 text-[11px] font-bold hover:bg-orange-900 transition flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>Gmail</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Workspace Modal */}
        <GoogleWorkspaceIntegrationModal
          isOpen={isWorkspaceModalOpen}
          onClose={() => setIsWorkspaceModalOpen(false)}
          mode={workspaceModalMode}
          attendanceRecords={attendanceRecords}
          currentUser={currentUser}
          onToast={showToast}
        />
      </div>
    );
  }

  // If logged in as gate security or support coordinator, allow attendance analytics but restrict scholastic reports
  if (currentUser.role === 'security' || currentUser.role === 'support') {
    return (
      <div className="space-y-6 overflow-x-hidden w-full">
        {/* Security / Support Header Card with Export CSV button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-display">
                <TrendingUp className="w-5 h-5 text-orange-600 shrink-0" />
                <span>Turnstile Attendance & Gate Telemetry</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-400">
                Staff Verified • {currentUser.role.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              RFID gate logs, tardiness alerts, and daily weekday turnout percentages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const fname = exportDailyAttendanceTrendCSV(attendanceRecords, currentUser, 'current');
                triggerDownloadStatus(fname);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white dark:bg-stone-800 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-stone-700 hover:bg-orange-50 dark:hover:bg-stone-700 rounded-xl shadow-xs transition"
              title="Download daily attendance trend data as formatted CSV"
            >
              <Download className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setWorkspaceModalMode('sheets');
                setIsWorkspaceModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl shadow-xs transition"
              title="Export to Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Google Sheets</span>
            </button>

            <button
              onClick={() => {
                setWorkspaceModalMode('gmail');
                setIsWorkspaceModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-stone-700 hover:bg-orange-100 rounded-xl shadow-xs transition"
              title="Send via Gmail"
            >
              <Mail className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Gmail</span>
            </button>
          </div>
        </div>

        {/* Daily Attendance Trend Chart for Turnstile & Support Staff */}
        <DailyAttendanceTrendChart
          attendanceRecords={attendanceRecords}
          onExportCSV={triggerDownloadStatus}
          onOpenWorkspace={(m) => {
            setWorkspaceModalMode(m);
            setIsWorkspaceModalOpen(true);
          }}
        />

        <div className="max-w-md mx-auto my-4 p-6 text-center bg-white dark:bg-stone-900 rounded-2xl border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
          <ShieldAlert className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Scholastic Academic Grades Restricted
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Student classroom subject grades and academic transcripts are confidential and not accessible under {currentUser.role} credentials.
          </p>
        </div>

        {/* Download Status Toast Notification */}
        {downloadStatus && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md w-[92vw] sm:w-[420px] p-4 rounded-2xl bg-stone-900 text-white shadow-2xl border border-stone-700 space-y-2.5 animate-bounce-short">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                    Download Status: Successfully Saved
                  </h4>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {downloadStatus.timestamp} • File ready on local storage
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDownloadStatus(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              The daily attendance trend data has been confirmed and saved to your device:
              <code className="block mt-1 font-mono text-[11px] text-orange-400 bg-stone-800 p-1.5 rounded-lg border border-stone-700 truncate">
                {downloadStatus.filename}
              </code>
            </p>

            <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-stone-400 font-mono">
                {downloadStatus.size} • {downloadStatus.rows} weekdays
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setWorkspaceModalMode('sheets');
                    setIsWorkspaceModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-bold hover:bg-emerald-900 transition flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Google Sheets</span>
                </button>
                <button
                  onClick={() => {
                    setWorkspaceModalMode('gmail');
                    setIsWorkspaceModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-orange-950 text-orange-300 border border-orange-800 text-[11px] font-bold hover:bg-orange-900 transition flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>Gmail</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Workspace Modal */}
        <GoogleWorkspaceIntegrationModal
          isOpen={isWorkspaceModalOpen}
          onClose={() => setIsWorkspaceModalOpen(false)}
          mode={workspaceModalMode}
          attendanceRecords={attendanceRecords}
          currentUser={currentUser}
          onToast={showToast}
        />
      </div>
    );
  }

  // Determine default student to display
  const initialStudent =
    currentUser.role === 'student'
      ? currentUser.id.toLowerCase().includes('vivan')
        ? 'vivan'
        : 'krishvika'
      : currentUser.role === 'parent'
      ? currentUser.child || 'vivan'
      : 'vivan';

  const [selectedStudent, setSelectedStudent] = useState<string>(initialStudent);
  const [aiRemark, setAiRemark] = useState<string>('');
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [viewSection, setViewSection] = useState<'all' | 'attendance' | 'academics'>('all');

  const student = USER_PROFILES[selectedStudent] || USER_PROFILES.vivan;
  const optedSubjects = student.optedSubjects || getStudentOptedSubjects(selectedStudent);
  const scores = student.scores || [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90];

  const optedItems = optedSubjects.map((s) => {
    const idx = SUBJECTS.indexOf(s);
    return { subject: s, score: scores[idx] ?? 90 };
  });

  const totalScore = optedItems.reduce((a, b) => a + b.score, 0);
  const avg = optedItems.length > 0 ? (totalScore / optedItems.length).toFixed(1) : '98.0';

  const getGrade = (score: number) => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    return 'C';
  };

  const getGradePoint = (score: number) => {
    if (score >= 95) return '10.0';
    if (score >= 90) return '9.2';
    if (score >= 80) return '8.4';
    return '7.0';
  };

  const handleDownloadCSV = () => {
    const rows = [
      ['Subject', 'Score', 'Grade', 'Max Score', 'Status'],
      ...optedItems.map((item) => [
        item.subject,
        item.score.toString(),
        getGrade(item.score),
        '100',
        'Opted Discipline',
      ]),
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    StorageService.downloadText(
      `tattvasayam-report-${student.name.toLowerCase()}-${student.title.replace(/\s+/g, '-')}.csv`,
      csvContent,
      'text/csv;charset=utf-8;'
    );
  };

  const handleDraftRemark = async () => {
    setIsDrafting(true);
    const remark = await AiService.draftRemark(student.name, student.title, optedItems);
    setAiRemark(remark);
    setIsDrafting(false);
  };

  // Find top and lowest subject among opted subjects
  const ranked = [...optedItems].sort((a, b) => b.score - a.score);
  const topSubject = ranked[0] || { subject: 'Mathematics', score: 99 };
  const lowestSubject = ranked[ranked.length - 1] || { subject: 'English', score: 95 };

  const canSwitchStudent = currentUser.role !== 'student' && currentUser.role !== 'parent';

  return (
    <div className="space-y-6 overflow-x-hidden w-full">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 font-display">
              <Award className="w-5 h-5 text-orange-600 shrink-0" />
              <span>Academic Transcripts & Campus Attendance</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-400">
              Verified 2026–27
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Scholastic evaluations for {student.name} ({student.title}) • Daily verified gate turnstile attendance & 13-discipline mastery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Section view switcher */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewSection('all')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                viewSection === 'all'
                  ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              All Analytics
            </button>
            <button
              onClick={() => setViewSection('attendance')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                viewSection === 'attendance'
                  ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Daily Attendance</span>
            </button>
            <button
              onClick={() => setViewSection('academics')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                viewSection === 'academics'
                  ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Transcripts</span>
            </button>
          </div>

          {canSwitchStudent && (
            <select
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value);
                setAiRemark('');
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-stone-700 bg-orange-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-orange-500"
            >
              <option value="vivan">Vivan Sharma (Grade 10-A)</option>
              <option value="krishvika">Krishvika Patel (Grade 8-B)</option>
            </select>
          )}

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>Print Report Card</span>
          </button>

          {/* Export CSV Button for Daily Attendance Trend Data */}
          <button
            onClick={handleExportAttendanceCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-stone-800 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-stone-700 rounded-xl hover:bg-orange-50 dark:hover:bg-stone-700 shadow-xs transition"
            title="Download daily attendance trend data as formatted CSV"
          >
            <Download className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>Export CSV</span>
          </button>

          {/* Google Sheets Sync/Export Button */}
          <button
            onClick={() => {
              setWorkspaceModalMode('sheets');
              setIsWorkspaceModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-xs transition"
            title="Export & Sync Daily Attendance to Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Google Sheets</span>
          </button>

          {/* Gmail Attendance Dispatch Button */}
          <button
            onClick={() => {
              setWorkspaceModalMode('gmail');
              setIsWorkspaceModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-xs transition"
            title="Send Verified Daily Attendance Report via Gmail"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Gmail</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition"
            title="Download student 13-discipline academic transcript as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Transcript CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block truncate">
            Neural Scholastic GPA
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1 font-mono">
            {avg}%
          </div>
          <span className="text-[10px] text-stone-500 block truncate">Cumulative 13 disciplines</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block truncate">
            Weekly Campus Attendance
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            98.9%
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block truncate">
            Target 95.0% surpassed
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block truncate">
            On-Time Punctuality
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 font-mono">
            97.9%
          </div>
          <span className="text-[10px] text-stone-500 block truncate">
            Pre-08:30 RFID Turnstiles
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-stone-400 dark:text-stone-500 tracking-wider block truncate">
            Highest Subject Mastery
          </span>
          <div className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 mt-1 truncate">
            {topSubject.subject}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold font-mono">
            {topSubject.score}% (A+ Grade)
          </span>
        </div>
      </div>

      {/* DAILY ATTENDANCE TREND CHART (RECHARTS) & WEEKLY SUMMARY TABLE */}
      {(viewSection === 'all' || viewSection === 'attendance') && (
        <DailyAttendanceTrendChart
          attendanceRecords={attendanceRecords}
          className="my-2"
          onExportCSV={triggerDownloadStatus}
          onOpenWorkspace={(mode) => {
            setWorkspaceModalMode(mode);
            setIsWorkspaceModalOpen(true);
          }}
        />
      )}

      {/* 13-Subject Mastery Progress Grid */}
      {(viewSection === 'all' || viewSection === 'academics') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Opted Subject Performance Breakdown</span>
            </h3>
            <span className="text-xs text-orange-600 font-bold font-mono bg-orange-50 dark:bg-stone-800 px-2 py-0.5 rounded">
              {optedItems.length} Enrolled Disciplines
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {optedItems.map((item) => {
              const { subject, score } = item;
              const grade = getGrade(score);

              return (
                <div key={subject} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate pr-2">
                      {subject}
                    </span>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-stone-500">{score}/100</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          grade === 'A+'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : grade === 'A'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {grade}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Educator Remark Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-amber-950 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-orange-100 dark:border-stone-800 pb-2">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>AI Educator Remark</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-stone-800 dark:text-orange-400 font-bold">
                Gemini 3.8
              </span>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
              Synthesizes multidimensional score mastery into an official transcript remark of cognitive strengths and growth targets.
            </p>

            <div className="mt-3 p-3.5 rounded-xl bg-orange-50/60 dark:bg-stone-800/60 border border-orange-200 dark:border-stone-700 min-h-[120px] flex items-center justify-center">
              {isDrafting ? (
                <div className="flex flex-col items-center gap-2 text-stone-500 text-xs">
                  <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  <span>Drafting cognitive remark…</span>
                </div>
              ) : aiRemark ? (
                <p className="text-xs leading-relaxed text-stone-800 dark:text-stone-200 italic font-serif">
                  "{aiRemark}"
                </p>
              ) : (
                <p className="text-xs text-stone-400 italic text-center">
                  Click below to generate a tailored report card remark for {student.name}.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDraftRemark}
              disabled={isDrafting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isDrafting ? 'Drafting Remark…' : 'Generate AI Remark'}</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-stone-800 border border-orange-200 dark:border-stone-700 hover:bg-orange-100 rounded-xl transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Preview & Print Transcript</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* PRINTABLE OFFICIAL REPORT CARD MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white text-stone-900 rounded-2xl shadow-2xl p-6 sm:p-10 my-6 max-h-[95vh] overflow-y-auto printable-report-card">
            {/* Action Bar (hidden when printing) */}
            <div className="no-print flex items-center justify-between pb-4 mb-6 border-b border-stone-200">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Official Report Card Print Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-stone-500 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Report Card Body */}
            <div className="border-4 border-double border-orange-600/60 p-6 sm:p-8 rounded-xl space-y-6 bg-white">
              {/* Header Letterhead */}
              <div className="text-center space-y-1.5 border-b-2 border-orange-600/30 pb-5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 p-1.5 border border-orange-200 shadow-sm mb-1">
                  <img
                    src="/assets/aistudio/Tattvaswayam_School_Logo_dd139741.png"
                    alt="Tattvasayam Future Academy Seal"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-wide text-stone-900">
                  Tattvasayam Future Academy
                </h1>
                <p className="text-xs text-stone-600 font-medium">
                  Centre of Integral Pedagogy & Emerging Sciences • Affiliated to CBSE / Cambridge Assessment
                </p>
                <p className="text-[11px] text-stone-500">
                  Jakkur Plantation Road, Yelahanka Sub-Division, Bengaluru, Karnataka 560064 • Tel: +91 80 2846 1900
                </p>
                <div className="inline-block mt-2 px-4 py-1 bg-orange-100 text-orange-900 rounded-full font-bold text-xs uppercase tracking-widest border border-orange-300">
                  Cumulative Scholastic Evaluation & Official Transcript • Term 1 (2026–27)
                </div>
              </div>

              {/* Student Metadata Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-orange-50/50 rounded-xl border border-orange-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Candidate Name</span>
                  <span className="font-extrabold text-stone-900 text-sm">{student.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Student Roll ID</span>
                  <span className="font-mono font-bold text-stone-900">{student.id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Cohort & Class</span>
                  <span className="font-bold text-stone-900">{student.title}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Academic Attendance</span>
                  <span className="font-mono font-bold text-emerald-700">98.4% (122/124 Days)</span>
                </div>
              </div>

              {/* Opted Subjects Marks Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-900 text-white font-bold uppercase text-[11px]">
                      <th className="p-2.5 rounded-l-lg">No.</th>
                      <th className="p-2.5">Opted Academic Discipline</th>
                      <th className="p-2.5 text-center">Max Marks</th>
                      <th className="p-2.5 text-center">Marks Obtained</th>
                      <th className="p-2.5 text-center">Letter Grade</th>
                      <th className="p-2.5 text-center rounded-r-lg">Grade Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {optedItems.map((item, idx) => {
                      const sc = item.score;
                      const gr = getGrade(sc);
                      const gp = getGradePoint(sc);
                      return (
                        <tr key={item.subject} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                          <td className="p-2.5 font-mono text-stone-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-stone-800">{item.subject}</td>
                          <td className="p-2.5 text-center font-mono text-stone-500">100</td>
                          <td className="p-2.5 text-center font-mono font-extrabold text-stone-900">{sc}</td>
                          <td className="p-2.5 text-center">
                            <span className="font-bold text-orange-700 font-mono">{gr}</span>
                          </td>
                          <td className="p-2.5 text-center font-mono text-stone-600">{gp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-orange-100 font-bold text-stone-900 text-xs border-t-2 border-orange-400">
                      <td colSpan={2} className="p-3 text-right uppercase tracking-wider">
                        Grand Aggregate ({optedItems.length} Opted Subjects):
                      </td>
                      <td className="p-3 text-center font-mono">{(optedItems.length * 100).toLocaleString()}</td>
                      <td className="p-3 text-center font-mono font-black text-sm text-orange-900">
                        {totalScore}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        {avg}%
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        9.4 / 10.0
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Performance Descriptors & AI Educator Remark */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                <span className="font-bold text-stone-900 uppercase tracking-wide text-[11px] block">
                  Educator Comprehensive Evaluation & Cognitive Notes:
                </span>
                <p className="italic text-stone-700 font-serif leading-relaxed">
                  "{aiRemark || 'Student exhibits exceptional intellectual curiosity across advanced physical sciences and analytical mathematics. Demonstrates consistent initiative in peer tutoring and quantum laboratory explorations. High recommendation for national robotics olympiads.'}"
                </p>
                <div className="text-[10px] text-stone-400 pt-1">
                  Result Classification: <span className="font-bold text-emerald-700">FIRST CLASS WITH DISTINCTION (TOP 5% IN BENGALURU NORTH COHORT)</span>
                </div>
              </div>

              {/* Signatures & Academy Seal */}
              <div className="pt-6 border-t-2 border-stone-200 grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-dashed border-stone-400 mb-1 flex items-end justify-center font-serif italic text-stone-600">
                    Susmita Roy
                  </div>
                  <span className="font-bold text-stone-900 block">Ms. Susmita Roy</span>
                  <span className="text-[10px] text-stone-500">Class Facilitator</span>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-orange-600 flex items-center justify-center text-orange-700 text-[9px] font-bold uppercase text-center p-1 leading-tight">
                    Official Institutional Seal • TFA
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1">Registry Verified</span>
                </div>

                <div>
                  <div className="h-10 border-b border-dashed border-stone-400 mb-1 flex items-end justify-center font-serif italic text-stone-600">
                    Dr. B. R. Shenoy
                  </div>
                  <span className="font-bold text-stone-900 block">Dr. B. R. Shenoy</span>
                  <span className="text-[10px] text-stone-500">Principal & Head of School</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold shadow-2xl border border-stone-700 animate-bounce-short">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Download Status Toast Notification */}
      {downloadStatus && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-[92vw] sm:w-[420px] p-4 rounded-2xl bg-stone-900 text-white shadow-2xl border border-stone-700 space-y-2.5 animate-bounce-short">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                  Download Status: Successfully Saved
                </h4>
                <span className="text-[10px] text-stone-400 font-mono">
                  {downloadStatus.timestamp} • File ready on local storage
                </span>
              </div>
            </div>
            <button
              onClick={() => setDownloadStatus(null)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed">
            The daily attendance trend data has been confirmed and saved to your device:
            <code className="block mt-1 font-mono text-[11px] text-orange-400 bg-stone-800 p-1.5 rounded-lg border border-stone-700 truncate">
              {downloadStatus.filename}
            </code>
          </p>

          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
            <span className="text-[10px] text-stone-400 font-mono">
              {downloadStatus.size} • {downloadStatus.rows} weekdays
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setWorkspaceModalMode('sheets');
                  setIsWorkspaceModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-bold hover:bg-emerald-900 transition flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>Google Sheets</span>
              </button>
              <button
                onClick={() => {
                  setWorkspaceModalMode('gmail');
                  setIsWorkspaceModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-orange-950 text-orange-300 border border-orange-800 text-[11px] font-bold hover:bg-orange-900 transition flex items-center gap-1"
              >
                <Mail className="w-3 h-3" />
                <span>Gmail</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Workspace Modal (Sheets & Gmail) */}
      <GoogleWorkspaceIntegrationModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        mode={workspaceModalMode}
        attendanceRecords={attendanceRecords}
        currentUser={currentUser}
        onToast={showToast}
      />
    </div>
  );
};
