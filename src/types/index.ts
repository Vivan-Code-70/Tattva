export type UserRole =
  | 'student'
  | 'teacher'
  | 'admin'
  | 'security'
  | 'support'
  | 'parent'
  | 'principal'
  | 'librarian'
  | 'driver';

export type PassengerCategory = 'student' | 'teacher' | 'staff' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  scores?: number[]; // For students: scores
  optedSubjects?: SubjectName[]; // Specific subjects student has opted for
  child?: string;    // For parents: student key (e.g., 'vivan')
  phone?: string;
  email?: string;
  hasOptedTransport?: boolean;
  assignedBusRoute?: string;
  assignedBusStop?: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  category: 'Circular' | 'Academic' | 'Event' | 'Emergency' | 'Advisory' | string;
  date: string;
  content: string;
  targetRoles?: ('all' | UserRole)[];
  audience?: 'all' | 'students' | 'parents' | 'teachers' | string;
  requiresAck?: boolean;
  acknowledgedBy: string[]; // user IDs or keys who acknowledged
  priority?: 'normal' | 'high' | 'urgent';
  author?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  studentKey: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  period?: number;
  subject?: string;
  remarks?: string;
  markedBy?: string;
}

export interface BusStudent {
  id: string;
  name: string;
  grade: string;
  category?: PassengerCategory;
  department?: string;
  userKey?: string;
  stopId: number;
  stopName: string;
  status: 'waiting' | 'boarded' | 'absent' | 'dropped_off';
  boardedTime?: string;
  droppedTime?: string;
  seatNumber?: string;
  parentKey?: string;
  parentName?: string;
  parentPhone?: string;
  optedTransport?: boolean;
  transportFeePaid?: boolean;
}

export type BusPassenger = BusStudent;

export interface BusStop {
  id?: number;
  name: string;
  shortName?: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  eta: string;
  status: 'passed' | 'current' | 'upcoming';
  timeScheduled: string;
  distanceFromStartKm?: number;
  students?: BusStudent[];
  zone?: string;
  mlPredictedMinutes?: number;
  mlPredictedEta?: string;
  mlConfidenceScore?: number;
}

export interface BusTelemetry {
  speedKmH: number;
  headingDeg: number;
  fuelPercent: number;
  engineStatus: 'RUNNING' | 'IDLE' | 'OFF';
  gpsSignal: 'STRONG_5G' | 'FAIR' | 'WEAK';
  satelliteCount: number;
  doorStatus: 'CLOSED' | 'OPEN';
  acStatus: 'ON' | 'OFF';
  speedLimitKmH: number;
  lastPingTime: string;
  currentLat: number;
  currentLng: number;
  cabinTempC?: number;
}

export interface MlEtaStopPrediction {
  stopId: number;
  stopName: string;
  scheduledTime: string;
  distanceRemainingKm: number;
  historicalBaseMinutes: number;
  currentSpeedKmH: number;
  trafficCongestionFactor: number;
  passengerDwellSeconds: number;
  predictedMinutes: number;
  predictedEta: string;
  confidencePercent: number;
  marginOfErrorSeconds: number;
  congestionLevel: 'LOW' | 'MODERATE' | 'HEAVY' | 'CRITICAL';
}

export interface MlEtaPredictionSummary {
  modelName: string;
  algorithm: string;
  lastTrainedAt: string;
  inferenceTimestamp: number;
  overallConfidencePercent: number;
  meanAbsoluteErrorMinutes: number;
  currentTrafficIndex: number; // 0.0 - 1.0
  activeCorridorCongestion: 'FLOWING' | 'MODERATE_DELAY' | 'HEAVY_CONGESTION';
  primaryRouteEtaMinutes: number;
  detourRouteEtaMinutes: number;
  recommendedRouteVariant: 'primary_corridor' | 'traffic_bypass_detour';
  detourTimeSavedMinutes: number;
  stopPredictions: MlEtaStopPrediction[];
  featureWeights: {
    realtimeGpsSpeed: number;
    segmentCongestionHistory: number;
    diurnalRushIndex: number;
    stationDwellTimes: number;
  };
}

export interface TransportOptInRequest {
  id: string;
  userKey: string;
  userName: string;
  userRole: UserRole;
  routeNumber: string;
  stopName: string;
  stopId: number;
  tripType: 'both' | 'morning' | 'evening';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  allocatedSeat?: string;
  feeAmount: number;
  isFeePaid: boolean;
  paymentRef?: string;
  paidAt?: string;
  remarks?: string;
}

export interface BusRouteInfo {
  routeNumber: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  conductorName?: string;
  conductorPhone?: string;
  vehicleNumber: string;
  currentSpeedKmH: number;
  currentLocationName: string;
  nextStop: string;
  liveStatus: 'ON_SCHEDULE' | 'DELAYED_5_MIN' | 'DELAYED_10_MIN' | 'ARRIVED_CAMPUS' | 'EMERGENCY_HALT';
  stops: BusStop[];
  currentStopIndex?: number;
  progressPercent?: number;
  isEngineRunning?: boolean;
  activeTrip?: 'morning_inbound' | 'evening_outbound';
  telemetry?: BusTelemetry;
  studentsBoardedCount?: number;
  totalStudentsCount?: number;
  delayMinutes?: number;
  isLocationSharingActive?: boolean;
  locationSharingStartedAt?: string;
  activeRouteVariant?: 'primary_corridor' | 'traffic_bypass_detour';
  mlPrediction?: MlEtaPredictionSummary;
}

export interface FeeTransaction {
  id: string;
  studentKey: string;
  itemTitle: string;
  amount: number;
  date: string;
  paymentMethod: 'UPI' | 'NetBanking' | 'DebitCard' | 'CampusWallet';
  referenceId: string;
  status: 'SUCCESS' | 'PENDING';
}

export type SubjectName =
  | 'Mathematics'
  | 'Physics'
  | 'Biology'
  | 'Chemistry'
  | 'Philosophy'
  | 'English'
  | 'Business Studies'
  | 'Music'
  | 'Dance'
  | 'Sports'
  | 'French'
  | 'Hindi'
  | 'Kannada';

export interface Assignment {
  id?: string;
  subject: SubjectName | string;
  title: string;
  due: string;
  by: string;
  done: Record<string, boolean>; // userId -> done
}

export interface CounselingRequest {
  id: string;
  by: string; // student or parent key
  who: string; // counselor/admin key ('amrita' | 'sandhya')
  date: string;
  mode: string;
  agenda: string;
  status: 'PENDING' | 'ACCEPTED' | 'POSTPONED' | 'REJECTED';
}

export interface CalendarEvent {
  id?: string;
  date: string;
  title: string;
  type: 'holiday' | 'exam' | 'expo' | 'counseling';
  description?: string;
}

export interface PendingNfcTap {
  id: string;
  studentKey: string;
  studentName: string;
  grade: string;
  badgeId: string;
  gateNumber: string;
  time: string;
  timestamp: number;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  verifiedBy?: string;
  notes?: string;
}

export interface GateLogEntry {
  id: string;
  name: string;
  category: string; // 'Student' | 'Faculty' | 'Admin' | 'Staff' | 'Visitor'
  grade?: string;
  time: string;
  timestamp: number;
  verifiedBy?: string;
  status?: 'APPROVED' | 'DENIED' | 'AUTO';
  gate?: string;
}

export interface LeaveRequest {
  id: string;
  by: string;
  studentKey?: string;
  studentName?: string;
  leaveType?: string;
  from: string;
  to: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface QuizResult {
  userId: string;
  subject: string;
  topic?: string;
  score: string;
  percentage: number;
  time: string;
}

export interface SupportTicket {
  id: string;
  by: string;
  message: string;
  category: string;
  time: string;
  status: 'OPEN' | 'IN PROGRESS' | 'RESOLVED';
  reply?: string;
  urgent: boolean;
  diagnostics?: SystemDiagnosticSnapshot;
}

export interface ChatMessage {
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  ticketId?: string;
}

export interface BroadcastMail {
  id: string;
  to: string;
  subject: string;
  body: string;
  time: string;
  recipientEmails?: string[];
  gmailMessageId?: string;
  gmailThreadId?: string;
  isRealEmailSent?: boolean;
  senderEmail?: string;
  dateStr?: string;
}

export interface TimetablePeriod {
  periodNum: number;
  time12: string; // e.g. "8:30 AM – 9:15 AM"
  startMinutes: number;
  endMinutes: number;
  subject: string;
  room: string;
}

export type TimetableSchedule = Record<string, Record<string, TimetablePeriod[]>>;

export interface SecurityAuditItem {
  id: string;
  time: string;
  action: string;
  severity?: 'info' | 'warn' | 'critical';
}

export interface EmergencyLockdownState {
  active: boolean;
  triggeredBy: string;
  triggeredRole: 'principal' | 'security' | 'admin' | string;
  timestamp: number;
  reason?: string;
  location?: string;
  instructions?: string;
  resolvedAt?: number;
}

// ================= LIBRARY MANAGEMENT SYSTEM TYPES ================= //

export interface BookItem {
  id: string;
  title: string;
  author: string;
  subject: string;
  isbn: string;
  callNumber: string;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  publishedYear: number;
  edition?: string;
  tags?: string[];
}

export interface BookLoan {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerKey: string;
  borrowerName: string;
  borrowerRole: string;
  borrowerGrade?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  fineAmount: number;
  issuedBy?: string;
}

export interface BookHoldRequest {
  id: string;
  bookId: string;
  bookTitle: string;
  requesterKey: string;
  requesterName: string;
  requesterRole: string;
  requestDate: string;
  status: 'PENDING' | 'READY_FOR_PICKUP' | 'FULFILLED' | 'CANCELLED';
  notes?: string;
}

export interface AiLogItem {
  userId: string;
  subject: string;
  question: string;
  answer: string;
  time: string;
}

// ================= REAL-TIME ERROR TELEMETRY TYPES ================= //

export type ErrorSeverity = 'CRITICAL' | 'HIGH' | 'WARN' | 'INFO';

export type ErrorCategory =
  | 'RUNTIME_EXCEPTION'
  | 'PROMISE_REJECTION'
  | 'NETWORK_ERROR'
  | 'AUTH_SECURITY'
  | 'RENDER_CRASH'
  | 'API_FAILURE'
  | 'USER_REPORT';

export interface Breadcrumb {
  timestamp: number;
  category: 'ui.click' | 'navigation' | 'auth' | 'network' | 'log';
  message: string;
  data?: Record<string, any>;
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  screenResolution: { width: number; height: number };
  devicePixelRatio: number;
  online: boolean;
  connectionType?: string;
  downlinkSpeed?: number;
  hardwareConcurrency?: number;
  memoryUsageMb?: number;
}

export interface ScreenState {
  activeTab: string;
  activeModal: string | null;
  routeHash: string;
  visibilityState: string;
  focusedElement?: string;
  viewport: { width: number; height: number };
}

export interface SystemDiagnosticSnapshot {
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  online: boolean;
  activeRole: string | null;
  activeUser: string | null;
  timestamp: number;
  memoryUsageMb?: number;
  deviceInfo: DeviceInfo;
  screenState: ScreenState;
}

export interface ErrorSuggestedFix {
  rootCause: string;
  solution: string;
  suggestedCode?: string;
  fileLocation?: string;
  autoFixAvailable?: boolean;
}

export interface SecondarySymptom {
  id: string;
  timestamp: number;
  timeFormatted: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  source?: string;
}

export interface RealtimeErrorReport {
  id: string;
  fingerprint?: string;
  timestamp: number;
  timeFormatted: string;
  firstSeen?: number;
  lastSeen?: number;
  occurrences: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  normalizedMessage?: string;
  stack?: string;
  source?: string;
  route?: string;
  user?: string;
  userRole?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  breadcrumbs: Breadcrumb[];
  diagnostics: SystemDiagnosticSnapshot;
  // Cascading & Practical Debugging
  isRootCause?: boolean;
  parentIncidentId?: string;
  cascadingSymptoms?: SecondarySymptom[];
  suggestedFix?: ErrorSuggestedFix;
}

export interface ErrorStats {
  total: number;
  incidents: number; // Distinct root cause incidents
  critical: number;
  high: number;
  warn: number;
  info: number;
  resolved: number;
  unresolved: number;
  cascadingSuppressed: number; // Count of secondary symptoms folded
}
