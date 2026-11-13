import React, { useState } from 'react';
import {
  HeartHandshake,
  Award,
  CreditCard,
  Download,
  Calendar,
  Clock,
  BookOpen,
  Bell,
  CheckCircle,
  ShieldCheck,
  FileCheck,
  Printer,
  X,
  QrCode,
  Check,
  Bus,
  Phone,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  BarChart3,
  FileText,
  MapPin,
  Radio,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  UserProfile,
  Assignment,
  CounselingRequest,
  LeaveRequest,
  TimetableSchedule,
  BusRouteInfo,
  AttendanceRecord,
  FeeTransaction,
  NoticeItem,
  TransportOptInRequest,
  UserRole,
} from '../../types';
import {
  SUBJECTS,
  USER_PROFILES,
  FEE_ITEMS,
  StorageService,
  TIMETABLE_DAYS,
  STANDARD_PERIODS_12H,
  getStudentOptedSubjects,
} from '../../services/storageService';
import { soundEffects } from '../../utils/audioChime';
import { TransportOptInPanel } from './TransportOptInPanel';

interface ParentDashboardProps {
  user: UserProfile;
  assignments: Assignment[];
  feesPaid: boolean[];
  onPayFee: (index: number) => void;
  counseling: CounselingRequest[];
  onBookCounseling: (counselor: string, date: string, mode: string, agenda: string) => void;
  leaveRequests: LeaveRequest[];
  onApplyLeave: (from: string, to: string, reason: string) => void;
  notifications: string[];
  timetableSchedule?: TimetableSchedule;
  busRoute?: BusRouteInfo;
  attendanceRecords?: AttendanceRecord[];
  feeTransactions?: FeeTransaction[];
  onRecordFeePayment?: (itemTitle: string, amount: number, method: FeeTransaction['paymentMethod']) => void;
  notices?: NoticeItem[];
  onAcknowledgeNotice?: (id: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onUpdateBusRoute?: (updated: BusRouteInfo) => void;
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

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  user,
  assignments,
  feesPaid,
  onPayFee,
  counseling,
  onBookCounseling,
  leaveRequests,
  onApplyLeave,
  notifications,
  timetableSchedule,
  busRoute = {
    routeNumber: 'Route 14',
    routeName: 'North Bengaluru Express • Yelahanka – Jakkur',
    driverName: 'Mr. Manjunath Gowda',
    driverPhone: '+91 98450 44210',
    vehicleNumber: 'KA-04-FA-2026',
    currentSpeedKmH: 34,
    currentLocationName: 'Approaching Sahakar Nagar 14th Main',
    nextStop: 'Jakkur Campus Gate 2',
    liveStatus: 'ON_SCHEDULE',
    isLocationSharingActive: true,
    stops: [
      { name: 'Yelahanka Satellite Town 4th Phase', timeScheduled: '07:20 AM', eta: 'Departed', status: 'passed' },
      { name: 'Judicial Layout Gate', timeScheduled: '07:35 AM', eta: 'Departed', status: 'passed' },
      { name: 'Sahakar Nagar Main Cross', timeScheduled: '07:50 AM', eta: '07:49 AM', status: 'current' },
      { name: 'Amruthahalli Signal', timeScheduled: '08:05 AM', eta: '08:06 AM', status: 'upcoming' },
      { name: 'Tattvasayam Future Academy, Gate 2', timeScheduled: '08:18 AM', eta: '08:18 AM', status: 'upcoming' },
    ],
  },
  attendanceRecords = [],
  feeTransactions = [],
  onRecordFeePayment,
  onNavigateToTab,
  onUpdateBusRoute,
  transportRequests = [],
  onRequestTransport,
  onPayTransportFee,
}) => {
  const childKey = user.child || 'vivan';
  const child = USER_PROFILES[childKey] || USER_PROFILES.vivan;

  // Start on Overview tab by default
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'fees' | 'bus' | 'attendance' | 'messages'>('overview');

  // Interactive Fee Checkout Modal state
  const [checkoutFeeIndex, setCheckoutFeeIndex] = useState<number | null>(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<FeeTransaction['paymentMethod']>('UPI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  // Active Receipt modal index
  const [activeReceiptModalIndex, setActiveReceiptModalIndex] = useState<number | null>(null);

  // Counseling form state
  const [counselor, setCounselor] = useState('amrita');
  const [counselingDate, setCounselingDate] = useState('2026-10-28');
  const [counselingMode, setCounselingMode] = useState('Virtual call');
  const [counselingAgenda, setCounselingAgenda] = useState('');

  // Leave form state
  const [leaveFrom, setLeaveFrom] = useState('2026-10-30');
  const [leaveTo, setLeaveTo] = useState('2026-10-30');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveType, setLeaveType] = useState('Medical & Health');
  const [leaveSubmittedNotice, setLeaveSubmittedNotice] = useState<string | null>(null);

  // Driver location broadcast ping reminder state
  const [driverPingStatus, setDriverPingStatus] = useState<string | null>(null);

  const handlePingDriver = () => {
    soundEffects.playSuccessChime();
    setDriverPingStatus(
      `Priority notification dispatched to Driver ${busRoute.driverName} (Vehicle ${busRoute.vehicleNumber}). You will receive an immediate SMS alert when live GPS broadcast begins.`
    );
    setTimeout(() => setDriverPingStatus(null), 6000);
  };

  // Opted subjects determination
  const optedSubjects = child.optedSubjects || getStudentOptedSubjects(childKey);
  const scores = child.scores || [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90];

  // Calculate Neural GPA strictly using opted subjects
  const optedScores = optedSubjects.map((sub) => {
    const idx = SUBJECTS.indexOf(sub);
    return scores[idx] ?? 90;
  });
  const neuralGpa = optedScores.length > 0
    ? (optedScores.reduce((a, b) => a + b, 0) / optedScores.length).toFixed(1)
    : '98.0';

  const pendingAssignments = assignments.filter((a) => !a.done[childKey]);

  // Filter leaves for this student
  const childLeaves = leaveRequests.filter(
    (l) => (l.studentKey && l.studentKey === childKey) || l.by === user.id || l.by === childKey
  );

  // Top strengths from opted subjects
  const topOptedStrengths = [...optedSubjects]
    .map((sub) => {
      const idx = SUBJECTS.indexOf(sub);
      return { sub, score: scores[idx] ?? 90 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Transport enrollment check: fee index 2 applies ONLY if child has an APPROVED bus opt-in request
  const childTransportReq = transportRequests.find(
    (r) => r.userKey.toLowerCase() === childKey.toLowerCase() && r.status === 'APPROVED'
  );
  const isTransportApplicable = Boolean(childTransportReq);

  // Fee dues calculation (excludes Transport if student has not opted & been approved)
  const unpaidFeeIndex = feesPaid.findIndex((p, idx) => !p && (idx !== 2 || isTransportApplicable));
  const nextFeeItem = unpaidFeeIndex !== -1 ? FEE_ITEMS[unpaidFeeIndex] : null;

  // Filter attendance for child
  const childAttendance = attendanceRecords.filter((a) => a.studentKey === childKey);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutFeeIndex === null) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      onPayFee(checkoutFeeIndex);
      if (checkoutFeeIndex === 2 && childTransportReq && onPayTransportFee) {
        onPayTransportFee(childTransportReq.id, checkoutPaymentMethod);
      } else if (onRecordFeePayment) {
        onRecordFeePayment(
          FEE_ITEMS[checkoutFeeIndex].name,
          FEE_ITEMS[checkoutFeeIndex].amount,
          checkoutPaymentMethod
        );
      }
      setIsProcessingPayment(false);
      setPaymentSuccessNotice(`Payment successful! Official institutional receipt generated.`);
      setCheckoutFeeIndex(null);
      setTimeout(() => setPaymentSuccessNotice(null), 5000);
    }, 1000);
  };

  const handleBookCounseling = (e: React.FormEvent) => {
    e.preventDefault();
    onBookCounseling(counselor, counselingDate, counselingMode, counselingAgenda || 'Parent-Faculty consultation');
    setCounselingAgenda('');
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveFrom || !leaveTo) return;
    const fullReason = leaveReason.trim()
      ? `[${leaveType}] ${leaveReason.trim()}`
      : `[${leaveType}] Official absence requested by guardian`;
    onApplyLeave(leaveFrom, leaveTo, fullReason);
    setLeaveReason('');
    setLeaveSubmittedNotice(`Official leave application for ${child.name} submitted to Directorate.`);
    setTimeout(() => setLeaveSubmittedNotice(null), 4500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner */}
      <div className="p-6 sm:p-7 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-display">
                {user.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Guardian Portal
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Active Scholar: <strong className="text-stone-800 dark:text-stone-200">{child.name}</strong> • {child.title} ({child.id})
            </p>
          </div>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Neural GPA</span>
            <span className="text-xl font-extrabold text-orange-600 dark:text-orange-400 font-mono">{neuralGpa}%</span>
          </div>
          <div className="w-px h-8 bg-stone-200 dark:bg-stone-700" />
          <div className="text-right">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">Attendance</span>
            <span className="text-xl font-extrabold text-emerald-600 font-mono">98.4%</span>
          </div>
        </div>
      </div>

      {paymentSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{paymentSuccessNotice}</span>
        </div>
      )}

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
          Overview
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'progress'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Child's Progress & Marks
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'fees'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <span>Fees & Checkout</span>
          {nextFeeItem && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
              Due
            </span>
          )}
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
          <span>Live Bus Tracker</span>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Attendance & Gate Logs
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'messages'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <span>Messages & Leave</span>
          {notifications.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-100 text-orange-700 font-mono">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* ---------------- TAB 1: PARENT OVERVIEW (PROGRESS, FEES, MESSAGES) ---------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Child's Progress Overview */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-orange-600" />
                    <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                      Child's Scholastic Mastery
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('progress')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    Details &rarr;
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Student:</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{child.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Cohort / Section:</span>
                    <span className="text-xs font-mono font-bold">{child.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Neural GPA Median:</span>
                    <span className="text-sm font-extrabold font-mono text-orange-600">{neuralGpa}% (A+)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">Pending Coursework:</span>
                    <span className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300">
                      {pendingAssignments.length} active tasks
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-stone-400">Top Opted Subject Strengths:</span>
                  <span className="text-[10px] font-mono text-orange-600 font-bold">{optedSubjects.length} Enrolled</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {topOptedStrengths.map((item) => (
                    <span
                      key={item.sub}
                      className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-stone-800 text-orange-800 dark:text-orange-300 text-[10px] font-bold"
                    >
                      {item.sub} ({item.score}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Fees & Checkout Overview */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                      Fees & Tuition Balance
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('fees')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    All Receipts &rarr;
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {nextFeeItem ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-stone-800/60 border border-amber-200 dark:border-amber-900 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-stone-100">{nextFeeItem.name}</span>
                        <span className="font-mono font-extrabold text-orange-600">₹{nextFeeItem.amount.toLocaleString()}</span>
                      </div>
                      <span className="text-[11px] text-stone-500 block">Due date: November 15, 2026</span>
                      <button
                        onClick={() => setCheckoutFeeIndex(unpaidFeeIndex)}
                        className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition"
                      >
                        Pay Online Now (Checkout)
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>All fee installments for current term are settled.</span>
                    </div>
                  )}

                  <div className="text-xs text-stone-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Term 1 Tuition:</span>
                      <span className="text-emerald-600 font-bold">✓ Paid (Receipt #801)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Activities Council:</span>
                      <span className="text-emerald-600 font-bold">✓ Paid (Receipt #804)</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveReceiptModalIndex(0)}
                className="w-full py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View Term 1 Official Receipt</span>
              </button>
            </div>

            {/* 3. Messages & Gate Notifications Overview */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                      Institutional Messages
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    Full Thread &rarr;
                  </button>
                </div>

                <div className="mt-3 space-y-2.5 text-xs">
                  {notifications.slice(0, 3).map((msg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 leading-relaxed"
                    >
                      {msg}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-stone-400 text-center py-6 text-xs">
                      No new administrative alerts today.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-stone-800/60 border border-orange-200 dark:border-stone-700 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-800 dark:text-stone-200 block">Transit Status:</span>
                  {busRoute.isLocationSharingActive !== false ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {busRoute.routeNumber} • Driver Broadcasting Live GPS
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {busRoute.routeNumber} • Awaiting Driver Location Share
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('bus')}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition shrink-0 cursor-pointer"
                >
                  {busRoute.isLocationSharingActive !== false ? 'Track Live Bus' : 'View Bus Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: CHILD'S OPTED SUBJECTS & PROGRESS ---------------- */}
      {activeTab === 'progress' && (
        <div className="p-6 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                  Opted Subject Scholastic Evaluation Matrix
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                First-principles evaluations & practical marks for {child.name}'s opted curriculum ({child.title})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 dark:bg-stone-800 px-2.5 py-1 rounded-lg">
                {optedSubjects.length} of {SUBJECTS.length} Subjects Opted
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                Neural GPA: {neuralGpa}%
              </span>
            </div>
          </div>

          {/* Opted Subjects Grid - Strictly Opted Subjects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {optedSubjects.map((sub) => {
              const idx = SUBJECTS.indexOf(sub);
              const sc = scores[idx] || 90;
              const grade = sc >= 95 ? 'A+' : sc >= 90 ? 'A' : 'B';
              return (
                <div
                  key={sub}
                  className="p-4 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 flex flex-col justify-between gap-3 text-xs shadow-2xs hover:border-orange-300 dark:hover:border-stone-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm block">{sub}</span>
                      <span className="text-[10px] text-orange-700 dark:text-orange-400 font-semibold bg-orange-100/70 dark:bg-stone-800 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                        Enrolled Discipline
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold font-mono text-orange-600">{sc}%</span>
                      <span className={`block text-[10px] font-bold ${grade === 'A+' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        Grade {grade}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
                        style={{ width: `${sc}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span>Term II Assessment</span>
                      <span>Mastery: {sc >= 95 ? 'Distinction' : 'Proficient'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/80 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-stone-900 dark:text-stone-100 block">
                Track Specialization Curriculum
              </span>
              <span className="text-[11px] text-stone-500">
                Displaying only the {optedSubjects.length} subjects opted by {child.name}. General electives not opted are excluded from GPA calculation.
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-stone-400 shrink-0">
              {SUBJECTS.length - optedSubjects.length} institutional electives unopted
            </span>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: FEES & INTERACTIVE CHECKOUT ---------------- */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                  Academic Fee Structure & Checkout
                </h3>
                <p className="text-xs text-stone-500">Tuition, transportation, and learning resource endowments</p>
              </div>
              <span className="text-xs font-mono font-bold text-stone-400">AY 2026–27</span>
            </div>

            <div className="space-y-3">
              {FEE_ITEMS.map((item, idx) => {
                const isTransportRow = idx === 2;
                const isNotOptedForTransport = isTransportRow && !isTransportApplicable;
                const isPaid = feesPaid[idx] || (isTransportRow && childTransportReq?.isFeePaid);
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      isNotOptedForTransport
                        ? 'bg-stone-50/60 dark:bg-stone-850/40 border-stone-200 dark:border-stone-800 opacity-85'
                        : isPaid
                        ? 'bg-stone-50/60 dark:bg-stone-850/40 border-stone-200 dark:border-stone-800'
                        : 'bg-orange-50/50 dark:bg-stone-800/50 border-orange-200 dark:border-stone-700'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm block">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {isNotOptedForTransport
                          ? 'Applies only to students whose Bus Transport Opt-In is approved by Coordinator/Admin'
                          : 'Institutional Fee Item • Receipt Generated upon Payment'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-base font-extrabold font-mono text-stone-900 dark:text-stone-100 tabular-nums">
                        {isNotOptedForTransport ? '₹0 (Not Opted)' : `₹${item.amount.toLocaleString()}`}
                      </span>

                      {isNotOptedForTransport ? (
                        <button
                          onClick={() => setActiveTab('bus')}
                          className="px-3.5 py-2 rounded-xl border border-orange-200 dark:border-stone-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-stone-800 font-bold transition"
                        >
                          Request Bus Opt-In
                        </button>
                      ) : isPaid ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Paid</span>
                          </span>
                          <button
                            onClick={() => setActiveReceiptModalIndex(idx)}
                            className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-white text-[11px] font-semibold"
                          >
                            Receipt
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCheckoutFeeIndex(idx)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition"
                        >
                          Checkout Now
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

      {/* ---------------- TAB 4: LIVE BUS TRACKER ---------------- */}
      {activeTab === 'bus' && (
        <div className="space-y-6">
          {/* Driver Ping Toast Feedback */}
          {driverPingStatus && (
            <div className="p-4 rounded-2xl bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 animate-pulse shrink-0" />
                <span>{driverPingStatus}</span>
              </div>
              <button
                onClick={() => setDriverPingStatus(null)}
                className="p-1 hover:bg-amber-600/40 rounded-lg text-stone-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {busRoute.isLocationSharingActive !== false ? (
            /* ACTIVE COMMUTE TRACKING: Visible only when driver shares location */
            <div className="p-5 sm:p-6 rounded-[16px] bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 text-white shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-100">
                      Active Commute Tracking • Driver Broadcast Live
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-display">
                    {child.name}'s Morning Bus Route
                  </h3>
                  <p className="text-xs text-orange-100">
                    Assigned Stop: <span className="font-bold text-white">Amruthahalli Signal Junction (Stop #4)</span> • Seat 12A
                  </p>
                </div>

                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('transit')}
                    className="px-4 py-2.5 rounded-xl bg-white text-orange-800 hover:bg-orange-50 font-extrabold text-xs shadow-lg transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span>Open Full Interactive GPS Map</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-[10px] text-orange-200 block font-mono uppercase">Vehicle</span>
                  <span className="font-extrabold text-white text-sm font-mono">{busRoute.vehicleNumber}</span>
                  <span className="text-[10px] text-orange-200 block">Route 14 Express</span>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-[10px] text-orange-200 block font-mono uppercase">Current Speed</span>
                  <span className="font-extrabold text-white text-sm font-mono">{busRoute.currentSpeedKmH} km/h</span>
                  <span className="text-[10px] text-orange-200 block">Max 40 km/h Capped</span>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-[10px] text-orange-200 block font-mono uppercase">Current Location</span>
                  <span className="font-extrabold text-white text-xs truncate block">{busRoute.currentLocationName}</span>
                  <span className="text-[10px] text-orange-200 block">Next: {busRoute.nextStop}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-[10px] text-orange-200 block font-mono uppercase">Commute Status</span>
                  <span className="font-extrabold text-emerald-300 text-sm block">
                    {busRoute.liveStatus === 'ON_SCHEDULE' ? 'On Schedule' : 'Slight Traffic'}
                  </span>
                  <span className="text-[10px] text-orange-200 block">Gate 2 ETA: 08:18 AM</span>
                </div>
              </div>
            </div>
          ) : (
            /* WAITING STATE: Rendered when driver has NOT shared location */
            <div className="p-6 rounded-[16px] bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-amber-500/40 text-white shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                      Waiting for Driver to Share Location
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      Location Private
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-display text-white">
                    {child.name}'s Morning Bus Route ({busRoute.routeNumber})
                  </h3>
                  <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                    Driver <strong className="text-white">{busRoute.driverName}</strong> has not yet initiated live location sharing for this trip. Under the academy's digital safety policy, real-time GPS coordinates, vehicle speed, and live map tracking are visible only when the driver begins sharing location from the cabin terminal.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <button
                    onClick={handlePingDriver}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Ping Driver for Location</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Trip Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-stone-400 block font-mono uppercase">Assigned Bus</span>
                  <span className="font-extrabold text-white text-sm font-mono">{busRoute.vehicleNumber}</span>
                  <span className="text-[10px] text-amber-300/80 block">{busRoute.routeName}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-stone-400 block font-mono uppercase">Your Pickup Station</span>
                  <span className="font-extrabold text-amber-300 text-xs block">Amruthahalli Signal</span>
                  <span className="text-[10px] text-stone-400 block">Stop #4 • Seat 12A</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-stone-400 block font-mono uppercase">Scheduled Pickup</span>
                  <span className="font-extrabold text-white text-sm font-mono">08:05 AM</span>
                  <span className="text-[10px] text-stone-400 block">Morning Inbound Run</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] text-stone-400 block font-mono uppercase">Broadcast Status</span>
                  <span className="font-extrabold text-amber-400 text-xs block flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Awaiting Driver Start</span>
                  </span>
                  <span className="text-[10px] text-stone-400 block">Auto-refreshes when live</span>
                </div>
              </div>
            </div>
          )}

          {/* Route Stops & Conductor Contacts */}
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
                  Driver: <span className="font-semibold text-stone-800 dark:text-stone-200">{busRoute.driverName}</span> • Conductor: <span className="font-semibold text-stone-800 dark:text-stone-200">{busRoute.conductorName || 'Mr. Ramesh Babu'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${busRoute.driverPhone}`}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-orange-600" />
                  <span>Call Driver</span>
                </a>
                <a
                  href={`tel:${busRoute.conductorPhone || '+919845188320'}`}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call Conductor</span>
                </a>
              </div>
            </div>

            {/* Visual Route Timeline / Scheduled Timetable */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  {busRoute.isLocationSharingActive !== false
                    ? 'Route Stops & Real-Time Live Tracking:'
                    : 'Route Stops & Scheduled Timetable (Awaiting Driver Broadcast):'}
                </span>
                {busRoute.isLocationSharingActive === false && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Scheduled times shown until driver starts trip</span>
                  </span>
                )}
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-orange-200 dark:before:bg-stone-700">
                {busRoute.stops.map((stop, idx) => {
                  const isSharing = busRoute.isLocationSharingActive !== false;
                  return (
                    <div key={idx} className="relative flex items-center justify-between text-xs">
                      <div
                        className={`absolute -left-6 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                          isSharing
                            ? stop.status === 'passed'
                              ? 'border-emerald-600 bg-emerald-500 text-white'
                              : stop.status === 'current'
                              ? 'border-orange-600 bg-white dark:bg-stone-900 text-orange-600 ring-4 ring-orange-100 dark:ring-stone-800'
                              : 'border-stone-300 bg-white dark:bg-stone-800 text-stone-400'
                            : 'border-amber-400 bg-amber-50 dark:bg-stone-850 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isSharing ? (stop.status === 'passed' ? '✓' : idx + 1) : idx + 1}
                      </div>

                      <div>
                        <span
                          className={`font-bold block ${
                            isSharing && stop.status === 'current'
                              ? 'text-orange-600 text-sm'
                              : 'text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          {stop.name}
                          {idx === 3 && (
                            <span className="ml-2 px-2 py-0.2 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-[10px] font-mono font-bold">
                              ★ Vivan's Stop
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          Scheduled: {stop.timeScheduled} • {stop.landmark || 'Station'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold ${
                            isSharing
                              ? stop.status === 'current'
                                ? 'text-orange-600'
                                : 'text-stone-500'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isSharing ? `ETA: ${stop.eta}` : `Scheduled: ${stop.timeScheduled}`}
                        </span>
                        <span className="block text-[10px] text-stone-400 capitalize">
                          {isSharing ? stop.status : 'Awaiting Broadcast'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <TransportOptInPanel
            user={user}
            busRoute={busRoute}
            transportRequests={transportRequests}
            onRequestTransport={onRequestTransport}
            onPayTransportFee={onPayTransportFee}
          />
        </div>
      )}

      {/* ---------------- TAB 5: ATTENDANCE & GATE LOGS ---------------- */}
      {activeTab === 'attendance' && (
        <div className="p-6 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                Gate 2 Entry & Classroom Attendance
              </h3>
              <p className="text-xs text-stone-500">Verified biometric & NFC check-in stream</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600">98.4% Cumulative</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {childAttendance.map((att) => (
              <div
                key={att.id}
                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{att.subject || 'Campus Entry'}</span>
                  <span className="text-[11px] text-stone-400 block">{att.date} • {att.remarks || 'Present on campus'}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {att.status}
                  </span>
                  <span className="text-[10px] text-stone-400 block mt-0.5">Verified by {att.markedBy || 'Gate 2'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TAB 6: MESSAGES & OFFICIAL LEAVE APPLICATIONS ---------------- */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          {leaveSubmittedNotice && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{leaveSubmittedNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Official Leave Application Form (Moved to Parents Account) */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-200/90 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Apply for Official Student Leave
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                  Guardian Clearance
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-stone-850 border border-amber-200/60 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
                <div className="font-bold text-stone-900 dark:text-stone-100">
                  Student: {child.name} • {child.title} ({child.id})
                </div>
                <span className="text-[11px] text-stone-500">
                  Leave permissions are processed and authorized by Directorate of Academics (Ms. Sandhya).
                </span>
              </div>

              <form onSubmit={handleApplyLeave} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Leave Classification / Category:
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 font-medium"
                  >
                    <option value="Medical & Health">Medical & Health (Sick Leave)</option>
                    <option value="Academic Olympiad / Competition">Academic Olympiad / External Science & Arts Expo</option>
                    <option value="Family Obligation">Family Obligation / Religious Function</option>
                    <option value="Emergency Personal">Emergency Personal Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      From Date:
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveFrom}
                      onChange={(e) => setLeaveFrom(e.target.value)}
                      className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      To Date:
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveTo}
                      onChange={(e) => setLeaveTo(e.target.value)}
                      className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Detailed Reason & Justification:
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. State Science Olympiad finals participation at IISc campus"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submit Leave Application to Administration</span>
                </button>
              </form>
            </div>

            {/* 2. Submitted Leave Requests & Administrative Clearance History */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                      Leave Records & Clearance ({childLeaves.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Scholar: {child.name}
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
                  {childLeaves.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 text-center text-stone-400 text-xs">
                      No active leave requests. Use the form on the left to submit an application.
                    </div>
                  ) : (
                    childLeaves.map((l) => (
                      <div
                        key={l.id}
                        className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/80 space-y-1.5"
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
                            {l.status === 'APPROVED' ? '✓ APPROVED' : l.status}
                          </span>
                        </div>
                        <p className="text-stone-700 dark:text-stone-300 text-[11px] leading-relaxed">
                          {l.reason}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-200/50 dark:border-stone-700/50">
                          <span>Applicant: {user.name}</span>
                          <span>{l.status === 'APPROVED' ? 'Authorized by Directorate' : 'Pending Directorate Review'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-[11px] text-stone-500 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Attendance registers and Gate 2 turnstiles sync approved leaves automatically.</span>
              </div>
            </div>
          </div>

          {/* 3 & 4: Administrative Notes & Parent-Faculty Consultation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications & Messages */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                    Administrative Dispatches & Teacher Notes
                  </h3>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">Academic Office</span>
              </div>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
                {notifications.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 leading-relaxed"
                  >
                    <div className="text-[10px] text-stone-400 font-mono mb-1">Academic Office • Jakkur</div>
                    {msg}
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-stone-400 text-center py-6 text-xs">No dispatches at this time.</p>
                )}
              </div>
            </div>

            {/* Request Consultation */}
            <div className="p-5 rounded-[16px] bg-white dark:bg-stone-900 border border-orange-100 dark:border-stone-800 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 font-display">
                Request Parent-Faculty Consultation
              </h3>
              <form onSubmit={handleBookCounseling} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">Dean / Counselor:</label>
                  <select
                    value={counselor}
                    onChange={(e) => setCounselor(e.target.value)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                  >
                    <option value="amrita">Ms. Amrita (Student Welfare & Operations)</option>
                    <option value="sandhya">Ms. Sandhya (Director of Academics)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">Date:</label>
                  <input
                    type="date"
                    required
                    value={counselingDate}
                    onChange={(e) => setCounselingDate(e.target.value)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">Agenda:</label>
                  <input
                    type="text"
                    placeholder="e.g. Physics Olympiad mentorship & research hours"
                    value={counselingAgenda}
                    onChange={(e) => setCounselingAgenda(e.target.value)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Send Consultation Request
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Fee Checkout Modal */}
      {checkoutFeeIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-[16px] max-w-md w-full p-6 border border-orange-200 dark:border-amber-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                  Secure Fee Checkout
                </h3>
              </div>
              <button
                onClick={() => setCheckoutFeeIndex(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-stone-850 border border-orange-200 dark:border-stone-700 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-stone-900 dark:text-stone-100 block">
                  {FEE_ITEMS[checkoutFeeIndex].name}
                </span>
                <span className="text-[11px] text-stone-500">Beneficiary: Tattvasayam Future Academy</span>
              </div>
              <span className="text-base font-extrabold font-mono text-orange-600">
                ₹{FEE_ITEMS[checkoutFeeIndex].amount.toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Select Payment Method:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'NetBanking', 'DebitCard'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setCheckoutPaymentMethod(method)}
                      className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                        checkoutPaymentMethod === method
                          ? 'border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {checkoutPaymentMethod === 'UPI' && (
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] text-stone-600 dark:text-stone-300 space-y-1">
                  <span className="font-bold block">Instant VPA / QR Handle:</span>
                  <div className="font-mono text-orange-600 font-bold">tattvasayam.fees@okhdfcbank</div>
                  <span className="text-stone-400">Zero surcharge for standard educational transfers</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutFeeIndex(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {isProcessingPayment ? (
                    <span>Authorizing…</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Pay ₹{FEE_ITEMS[checkoutFeeIndex].amount.toLocaleString()}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {activeReceiptModalIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-[16px] max-w-lg w-full p-6 border border-orange-200 dark:border-amber-950 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 font-display">
                  Official Educational Fee Receipt
                </h3>
              </div>
              <button
                onClick={() => setActiveReceiptModalIndex(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">Receipt No:</span>
                <span className="font-mono font-bold">REC-2026-08{activeReceiptModalIndex + 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Student:</span>
                <span className="font-bold">{child.name} ({child.id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Item:</span>
                <span className="font-semibold">{FEE_ITEMS[activeReceiptModalIndex].name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Amount Paid:</span>
                <span className="font-mono font-extrabold text-emerald-600 text-sm">
                  ₹{FEE_ITEMS[activeReceiptModalIndex].amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Status:</span>
                <span className="font-bold text-emerald-600">VERIFIED & CLEARED</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
