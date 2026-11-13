import {
  AiLogItem,
  Assignment,
  BroadcastMail,
  CalendarEvent,
  ChatMessage,
  CounselingRequest,
  GateLogEntry,
  LeaveRequest,
  QuizResult,
  SecurityAuditItem,
  SubjectName,
  SupportTicket,
  UserProfile,
  TimetablePeriod,
  TimetableSchedule,
  NoticeItem,
  AttendanceRecord,
  BusRouteInfo,
  FeeTransaction,
  PendingNfcTap,
  EmergencyLockdownState,
  BookItem,
  BookLoan,
  BookHoldRequest,
  TransportOptInRequest,
} from '../types';
import { errorReportingService } from './errorService';

export const STANDARD_PERIODS_12H = [
  { periodNum: 1, time12: '8:30 AM – 9:15 AM', startMinutes: 510, endMinutes: 555 },
  { periodNum: 2, time12: '9:15 AM – 10:00 AM', startMinutes: 555, endMinutes: 600 },
  { periodNum: 3, time12: '10:15 AM – 11:00 AM', startMinutes: 615, endMinutes: 660 },
  { periodNum: 4, time12: '11:00 AM – 11:45 AM', startMinutes: 660, endMinutes: 705 },
  { periodNum: 5, time12: '12:30 PM – 1:15 PM', startMinutes: 750, endMinutes: 795 },
  { periodNum: 6, time12: '1:15 PM – 2:00 PM', startMinutes: 795, endMinutes: 840 },
  { periodNum: 7, time12: '2:00 PM – 2:45 PM', startMinutes: 840, endMinutes: 885 },
];

export const SUBJECTS: SubjectName[] = [
  'Mathematics',
  'Physics',
  'Biology',
  'Chemistry',
  'Philosophy',
  'English',
  'Business Studies',
  'Music',
  'Dance',
  'Sports',
  'French',
  'Hindi',
  'Kannada',
];

export const ACADEMY_CLASSES = ['Grade 10-A', 'Grade 8-B', 'Grade 9', 'Grade 7'];
export const TIMETABLE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function generateDefaultTimetables(): TimetableSchedule {
  const schedule: TimetableSchedule = {};

  ACADEMY_CLASSES.forEach((cls, classIdx) => {
    schedule[cls] = {};
    const offset = classIdx * 3;

    TIMETABLE_DAYS.forEach((day, dayIdx) => {
      schedule[cls][day] = STANDARD_PERIODS_12H.map((p, periodIdx) => {
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
    });
  });

  return schedule;
}

export const USER_PROFILES: Record<string, UserProfile> = {
  vivan: {
    id: 'VIVAN-2026-X',
    name: 'Vivan',
    role: 'student',
    title: 'Grade 10-A',
    email: 'vivan.sharma@tattvasayam.edu.in',
    scores: [99, 98, 97, 98, 100, 96, 95, 100, 94, 99, 96, 98, 99],
    optedSubjects: [
      'Mathematics',
      'Physics',
      'Biology',
      'Chemistry',
      'Philosophy',
      'English',
      'French',
    ],
  },
  krishvika: {
    id: 'KRISHVIKA-2026-VIII',
    name: 'Krishvika',
    role: 'student',
    title: 'Grade 8-B',
    email: 'krishvika.patel@tattvasayam.edu.in',
    scores: [95, 96, 99, 94, 98, 97, 92, 99, 100, 96, 95, 97, 98],
    optedSubjects: [
      'Mathematics',
      'English',
      'Biology',
      'Philosophy',
      'Music',
      'Dance',
      'Sports',
      'Hindi',
    ],
  },
  susmita: {
    id: 'SUSMITA-FAC-10',
    name: 'Ms. Susmita',
    role: 'teacher',
    title: 'Senior Faculty, Physics & Mathematics',
    email: 'susmita.sen@tattvasayam.edu.in',
  },
  sandhya: {
    id: 'SANDHYA-ADM01',
    name: 'Ms. Sandhya',
    role: 'admin',
    title: 'Super Admin, Director of Academics',
    email: 'sandhya.admin@tattvasayam.edu.in',
  },
  amrita: {
    id: 'AMRITA-ADM02',
    name: 'Ms. Amrita',
    role: 'admin',
    title: 'Operations Head',
    email: 'amrita.ops@tattvasayam.edu.in',
  },
  sai: {
    id: 'SECURITY-GATE02',
    name: 'Mr. Sai',
    role: 'security',
    title: 'Gate 2 Security Officer',
    email: 'gate2.security@tattvasayam.edu.in',
  },
  bharthi: {
    id: 'BHARTHI-SUP03',
    name: 'Ms. Bharthi',
    role: 'support',
    title: 'Support Coordinator',
    email: 'bharthi.support@tattvasayam.edu.in',
  },
  pvivan: {
    id: 'PARENT-VIVAN01',
    name: 'Parent of Vivan',
    role: 'parent',
    title: 'Parent, Grade 10-A',
    child: 'vivan',
    email: 'parent.vivan@tattvasayam.edu.in',
  },
  pkrishvika: {
    id: 'PARENT-KRISHVIKA01',
    name: 'Parent of Krishvika',
    role: 'parent',
    title: 'Parent, Grade 8-B',
    child: 'krishvika',
    email: 'parent.krishvika@tattvasayam.edu.in',
  },
  principal: {
    id: 'PRINCIPAL-DR-01',
    name: 'Dr. B. R. Shenoy',
    role: 'principal',
    title: 'Principal & Patron of Academic Excellence',
    phone: '+91 98450 52094',
    email: 'principal@tattvasayam.edu.in',
  },
  librarian: {
    id: 'LIB-SR-01',
    name: 'Ms. Meenakshi Sundaram',
    role: 'librarian',
    title: 'Chief Academic Librarian & Resource Curator',
    phone: '+91 98450 81294',
    email: 'meenakshi.lib@tattvasayam.edu.in',
  },
  driver: {
    id: 'DRIVER-KA04-2026',
    name: 'Mr. Manjunath Gowda',
    role: 'driver',
    title: 'Senior Fleet Pilot • Route 14 Express',
    phone: '+91 98450 44210',
    email: 'driver.manjunath@tattvasayam.edu.in',
    hasOptedTransport: true,
    assignedBusRoute: 'Route 14',
  },
};

export function getStudentOptedSubjects(studentKey?: string | null, profiles?: Record<string, UserProfile>): SubjectName[] {
  if (!studentKey) {
    return ['Mathematics', 'Physics', 'Biology', 'Chemistry', 'Philosophy', 'English', 'French'];
  }
  const profs = profiles || USER_PROFILES;
  const user = profs[studentKey];
  if (user?.optedSubjects && user.optedSubjects.length > 0) {
    return user.optedSubjects;
  }
  const lower = studentKey.toLowerCase();
  if (lower.includes('vivan')) {
    return ['Mathematics', 'Physics', 'Biology', 'Chemistry', 'Philosophy', 'English', 'French'];
  }
  if (lower.includes('krishvika')) {
    return ['Mathematics', 'English', 'Biology', 'Philosophy', 'Music', 'Dance', 'Sports', 'Hindi'];
  }
  return ['Mathematics', 'Physics', 'Biology', 'Chemistry', 'Philosophy', 'English', 'French'];
}

export const DEFAULT_PASSWORDS: Record<string, string> = {
  vivan: 'Vivan@2026',
  krishvika: 'Krishvika@2026',
};

export const DEFAULT_MPINS: Record<string, string> = {
  principal: '520941',
  susmita: '482913',
  sai: '735104',
  pvivan: '260814',
  pkrishvika: '917352',
  sandhya: '604281',
  amrita: '158396',
  bharthi: '391827',
  librarian: '812940',
  driver: '442100',
};

export const FEE_ITEMS = [
  { name: 'Term 1 tuition', amount: 48000 },
  { name: 'Term 2 tuition', amount: 48000 },
  { name: 'Transport', amount: 12000 },
  { name: 'Activities: music, dance, sports', amount: 9000 },
];

export const LIBRARY_CATALOG = [
  { title: 'Feynman Lectures on Physics, Vol. 1', subject: 'Physics', author: 'Richard Feynman' },
  { title: 'Mathematics for Class 10 & Advanced Olympiads', subject: 'Mathematics', author: 'RD Sharma' },
  { title: 'Biology: A Visual Guide to Cellular Life', subject: 'Biology', author: 'Neil Campbell' },
  { title: 'Chemistry: Structure and Properties', subject: 'Chemistry', author: 'Nivaldo Tro' },
  { title: 'Introduction to Philosophy and Ethics', subject: 'Philosophy', author: 'Bertrand Russell' },
  { title: 'Business Studies & Entrepreneurship Essentials', subject: 'Business Studies', author: 'Peter Drucker' },
  { title: 'Learn French: Level 1 & Conversational Fluency', subject: 'French', author: 'Alliance Française' },
  { title: 'Hindi Vyakaran Evam Rachna', subject: 'Hindi', author: 'Dr. Vasudev Nandan' },
  { title: 'Kannada Sahitya Charitre', subject: 'Kannada', author: 'R. S. Mugali' },
  { title: 'The Story of Music & Acoustic Harmonics', subject: 'Music', author: 'Howard Goodall' },
];

export const DEFAULT_LIBRARY_BOOKS: BookItem[] = [
  {
    id: 'LIB-BK-101',
    title: 'The Feynman Lectures on Physics, Vol. 1',
    author: 'Richard P. Feynman',
    subject: 'Physics',
    isbn: '978-0465024933',
    callNumber: '530.FEY.01',
    shelfLocation: 'Stack 1 • Shelf A',
    totalCopies: 5,
    availableCopies: 3,
    publishedYear: 2011,
    edition: 'Millennium Edition',
    tags: ['Mechanics', 'Radiation', 'Quantum', 'Undergraduate'],
  },
  {
    id: 'LIB-BK-102',
    title: 'Mathematics for Class 10 & Olympiad Fundamentals',
    author: 'Dr. R. D. Sharma',
    subject: 'Mathematics',
    isbn: '978-9388836104',
    callNumber: '510.SHA.10',
    shelfLocation: 'Stack 1 • Shelf C',
    totalCopies: 8,
    availableCopies: 7,
    publishedYear: 2024,
    edition: '12th Revised Edition',
    tags: ['Calculus', 'Algebra', 'Trigonometry', 'CBSE/Cambridge'],
  },
  {
    id: 'LIB-BK-103',
    title: 'Campbell Biology: Concepts & Connections',
    author: 'Jane B. Reece, Neil A. Campbell',
    subject: 'Biology',
    isbn: '978-0136538783',
    callNumber: '570.CAM.02',
    shelfLocation: 'Stack 2 • Shelf A',
    totalCopies: 6,
    availableCopies: 5,
    publishedYear: 2021,
    edition: '10th Global Edition',
    tags: ['Genetics', 'Cellular Biology', 'Ecology'],
  },
  {
    id: 'LIB-BK-104',
    title: 'Chemistry: Structure and Properties',
    author: 'Nivaldo J. Tro',
    subject: 'Chemistry',
    isbn: '978-0134293936',
    callNumber: '540.TRO.04',
    shelfLocation: 'Stack 2 • Shelf B',
    totalCopies: 4,
    availableCopies: 3,
    publishedYear: 2018,
    edition: '2nd Edition',
    tags: ['Thermodynamics', 'Atomic Theory', 'Organic'],
  },
  {
    id: 'LIB-BK-105',
    title: 'A History of Western Philosophy',
    author: 'Bertrand Russell',
    subject: 'Philosophy',
    isbn: '978-0671201586',
    callNumber: '109.RUS.01',
    shelfLocation: 'Stack 3 • Shelf A',
    totalCopies: 4,
    availableCopies: 3,
    publishedYear: 1945,
    edition: 'Routledge Classics',
    tags: ['Epistemology', 'Ethics', 'Ancient & Modern'],
  },
  {
    id: 'LIB-BK-106',
    title: 'Introduction to Algorithms (CLRS)',
    author: 'Thomas H. Cormen, Charles E. Leiserson',
    subject: 'Computer Science',
    isbn: '978-0262046305',
    callNumber: '005.1.COR.04',
    shelfLocation: 'Stack 4 • Shelf A',
    totalCopies: 6,
    availableCopies: 6,
    publishedYear: 2022,
    edition: '4th Edition',
    tags: ['Data Structures', 'Graph Theory', 'Algorithms'],
  },
  {
    id: 'LIB-BK-107',
    title: 'Business Studies & Entrepreneurial Leadership',
    author: 'Peter F. Drucker',
    subject: 'Business Studies',
    isbn: '978-0887306181',
    callNumber: '658.DRU.01',
    shelfLocation: 'Stack 3 • Shelf C',
    totalCopies: 5,
    availableCopies: 5,
    publishedYear: 2006,
    edition: 'Classic Edition',
    tags: ['Innovation', 'Management', 'Strategy'],
  },
  {
    id: 'LIB-BK-108',
    title: 'The Story of Music & Acoustic Harmonics',
    author: 'Howard Goodall',
    subject: 'Music',
    isbn: '978-1784700003',
    callNumber: '780.GOO.01',
    shelfLocation: 'Stack 5 • Shelf A',
    totalCopies: 3,
    availableCopies: 3,
    publishedYear: 2014,
    edition: 'Illustrated Edition',
    tags: ['Acoustics', 'Composition', 'History of Music'],
  },
];

export const DEFAULT_BOOK_LOANS: BookLoan[] = [
  {
    id: 'LOAN-1001',
    bookId: 'LIB-BK-101',
    bookTitle: 'The Feynman Lectures on Physics, Vol. 1',
    borrowerKey: 'vivan',
    borrowerName: 'Vivan Sharma (Grade 10-A)',
    borrowerRole: 'student',
    borrowerGrade: 'Grade 10-A',
    issueDate: '2026-10-18',
    dueDate: '2026-11-01',
    status: 'OVERDUE',
    fineAmount: 20,
    issuedBy: 'Ms. Meenakshi Sundaram',
  },
  {
    id: 'LOAN-1002',
    bookId: 'LIB-BK-105',
    bookTitle: 'A History of Western Philosophy',
    borrowerKey: 'vivan',
    borrowerName: 'Vivan Sharma (Grade 10-A)',
    borrowerRole: 'student',
    borrowerGrade: 'Grade 10-A',
    issueDate: '2026-10-25',
    dueDate: '2026-11-08',
    status: 'ACTIVE',
    fineAmount: 0,
    issuedBy: 'Ms. Meenakshi Sundaram',
  },
  {
    id: 'LOAN-1003',
    bookId: 'LIB-BK-103',
    bookTitle: 'Campbell Biology: Concepts & Connections',
    borrowerKey: 'krishvika',
    borrowerName: 'Krishvika Patel (Grade 8-B)',
    borrowerRole: 'student',
    borrowerGrade: 'Grade 8-B',
    issueDate: '2026-10-22',
    dueDate: '2026-11-05',
    status: 'ACTIVE',
    fineAmount: 0,
    issuedBy: 'Ms. Meenakshi Sundaram',
  },
  {
    id: 'LOAN-1004',
    bookId: 'LIB-BK-104',
    bookTitle: 'Chemistry: Structure and Properties',
    borrowerKey: 'susmita',
    borrowerName: 'Ms. Susmita (Faculty)',
    borrowerRole: 'teacher',
    issueDate: '2026-10-12',
    dueDate: '2026-10-26',
    returnDate: '2026-10-25',
    status: 'RETURNED',
    fineAmount: 0,
    issuedBy: 'Ms. Meenakshi Sundaram',
  },
];

export const DEFAULT_BOOK_HOLDS: BookHoldRequest[] = [
  {
    id: 'HOLD-2001',
    bookId: 'LIB-BK-101',
    bookTitle: 'The Feynman Lectures on Physics, Vol. 1',
    requesterKey: 'krishvika',
    requesterName: 'Krishvika Patel (Grade 8-B)',
    requesterRole: 'student',
    requestDate: '2026-10-30',
    status: 'PENDING',
    notes: 'Requested copy for Cambridge Science Olympiad preparation',
  },
];

export interface LibraryLoan {
  by: string; // user key
  due: string;
}

export interface AppState {
  currentUser: string | null;
  notifications: Record<string, string[]>;
  assignments: Assignment[];
  counseling: CounselingRequest[];
  events: CalendarEvent[];
  gateLogs: GateLogEntry[];
  feesPaid: Record<string, boolean[]>; // studentKey -> [boolean, boolean, ...]
  leaveRequests: LeaveRequest[];
  libraryLoans: Record<number, LibraryLoan>; // book index -> loan
  quizResults: QuizResult[];
  supportTickets: SupportTicket[];
  chatHistory: Record<string, ChatMessage[]>;
  auditLogs: SecurityAuditItem[];
  broadcastMails: BroadcastMail[];
  aiLogs: AiLogItem[];
  customPasswords: Record<string, string>;
  customMpins: Record<string, string>;
  failedAttempts: Record<string, number>;
  lockedUntil: Record<string, number>;
  timetables: TimetableSchedule;
  notices: NoticeItem[];
  attendanceRecords: AttendanceRecord[];
  busRoute: BusRouteInfo;
  feeTransactions: FeeTransaction[];
  pendingNfcTaps: PendingNfcTap[];
  emergencyLockdown: EmergencyLockdownState;
  books: BookItem[];
  bookLoans: BookLoan[];
  bookHolds: BookHoldRequest[];
  transportRequests: TransportOptInRequest[];
}

export function generateDefaultAttendanceRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const anchor = new Date(2026, 9, 31); // 2026-10-31
  const subjectsVivan = ['Physics', 'Mathematics', 'Philosophy', 'English', 'Chemistry', 'French', 'Sports'];
  const subjectsKrishvika = ['Mathematics', 'Biology', 'English', 'Hindi', 'Dance', 'Music', 'Chemistry', 'French'];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const isoDate = d.toISOString().split('T')[0];

    // Vivan's records
    let vStatus: 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' = 'PRESENT';
    let vSub = subjectsVivan[i % subjectsVivan.length];
    let vRemarks = 'Present and verified in laboratory';
    let vMarkedBy = 'Ms. Susmita';

    if (isoDate === '2026-10-14') {
      vStatus = 'LATE';
      vSub = 'Physics Lab';
      vRemarks = 'Arrived 8:32 AM (metro traffic on Bellary Rd)';
      vMarkedBy = 'Mr. Sai';
    } else if (isoDate === '2026-10-22') {
      vStatus = 'EXCUSED';
      vSub = 'Mathematics';
      vRemarks = 'Karnataka State STEM Olympiad representation';
      vMarkedBy = 'Ms. Susmita';
    } else if (isoDate === '2026-10-31') {
      vStatus = 'PRESENT';
      vSub = 'Physics';
      vRemarks = 'On time, active lab participation';
      vMarkedBy = 'Ms. Susmita';
    } else if (isoDate === '2026-10-30') {
      vStatus = 'PRESENT';
      vSub = 'Mathematics';
      vRemarks = 'Scored 100% on Riemann sums quiz';
      vMarkedBy = 'Ms. Susmita';
    } else if (isoDate === '2026-10-29') {
      vStatus = 'PRESENT';
      vSub = 'Philosophy';
      vRemarks = 'Debate on Kantian ethics';
      vMarkedBy = 'Ms. Sandhya';
    }

    records.push({
      id: `ATT-V-${i + 1}`,
      date: isoDate,
      studentKey: 'vivan',
      status: vStatus,
      period: (i % 6) + 1,
      subject: vSub,
      remarks: vRemarks,
      markedBy: vMarkedBy,
    });

    // Krishvika's records
    let kStatus: 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' = 'PRESENT';
    let kSub = subjectsKrishvika[i % subjectsKrishvika.length];
    let kRemarks = 'Present in classroom session';
    let kMarkedBy = 'Ms. Susmita';

    if (isoDate === '2026-10-12') {
      kStatus = 'EXCUSED';
      kSub = 'Biology';
      kRemarks = 'Approved orthodontic consultation';
      kMarkedBy = 'Ms. Susmita';
    } else if (isoDate === '2026-10-29') {
      kStatus = 'LATE';
      kSub = 'English';
      kRemarks = 'Arrived 8:38 AM (traffic near Sahakar Nagar)';
      kMarkedBy = 'Mr. Sai';
    } else if (isoDate === '2026-10-31') {
      kStatus = 'PRESENT';
      kSub = 'Mathematics';
      kRemarks = 'Present in Room 102';
      kMarkedBy = 'Ms. Susmita';
    } else if (isoDate === '2026-10-30') {
      kStatus = 'PRESENT';
      kSub = 'Biology';
      kRemarks = 'Cell division lab observation';
      kMarkedBy = 'Ms. Susmita';
    }

    records.push({
      id: `ATT-K-${i + 1}`,
      date: isoDate,
      studentKey: 'krishvika',
      status: kStatus,
      period: ((i + 1) % 6) + 1,
      subject: kSub,
      remarks: kRemarks,
      markedBy: kMarkedBy,
    });
  }

  return records;
}

const STORAGE_KEY = 'tattvasayam_portal_state_v2';

export class StorageService {
  private static defaultState(): AppState {
    return {
      currentUser: null,
      notifications: {
        vivan: [
          'Welcome to Term 2! Mid-term Physics examination is scheduled for Oct 15.',
          'Open Learning Resource Centre added 4 new digital physics manuscripts.',
        ],
        susmita: ['Staff council meeting on Thursday 15:30 in Conference Room A.'],
        sandhya: ['Admissions open 2026–27: 1,240 applicants processed.'],
      },
      assignments: [
        {
          id: 'ASG-101',
          subject: 'Physics',
          title: 'Wave equations & harmonic resonance worksheet',
          due: '2026-10-28',
          by: 'Ms. Susmita',
          done: { vivan: true },
        },
        {
          id: 'ASG-102',
          subject: 'Mathematics',
          title: 'Calculus optimization and rate of change problem set',
          due: '2026-10-30',
          by: 'Ms. Susmita',
          done: {},
        },
        {
          id: 'ASG-103',
          subject: 'Philosophy',
          title: 'Comparative analysis of virtue ethics and deontological duty',
          due: '2026-11-04',
          by: 'Dr. Raman',
          done: {},
        },
      ],
      counseling: [
        {
          id: 'REQ-101',
          by: 'vivan',
          who: 'amrita',
          date: '2026-10-28',
          mode: 'In person, Jakkur campus',
          agenda: 'Advanced physics laboratory hours & telescope project',
          status: 'PENDING',
        },
      ],
      events: [
        { date: '2026-10-02', title: 'Gandhi Jayanti', type: 'holiday' },
        { date: '2026-10-15', title: 'Mid-term Physics & STEM Exam', type: 'exam' },
        { date: '2026-10-24', title: 'Neural Science & Arts Expo', type: 'expo' },
        { date: '2026-10-28', title: 'Academic Counseling Day', type: 'counseling' },
        { date: '2026-11-01', title: 'Karnataka Rajyotsava', type: 'holiday' },
        { date: '2026-11-08', title: 'Deepavali Festival of Lights', type: 'holiday' },
        { date: '2026-12-25', title: 'Winter Vacation / Christmas', type: 'holiday' },
      ],
      gateLogs: [
        {
          id: 'LOG-1',
          name: 'Ms. Susmita',
          category: 'Faculty',
          grade: 'Senior Faculty',
          time: '08:05 AM',
          timestamp: Date.now() - 3600000,
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          status: 'APPROVED',
          gate: 'Gate 2',
        },
        {
          id: 'LOG-2',
          name: 'Vivan',
          category: 'Student',
          grade: 'Grade 10-A',
          time: '08:14 AM',
          timestamp: Date.now() - 3100000,
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          status: 'APPROVED',
          gate: 'Gate 2 (Turnstile B)',
        },
        {
          id: 'LOG-3',
          name: 'Krishvika',
          category: 'Student',
          grade: 'Grade 8-B',
          time: '08:20 AM',
          timestamp: Date.now() - 2700000,
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          status: 'APPROVED',
          gate: 'Gate 2 (Turnstile A)',
        },
        {
          id: 'LOG-4',
          name: 'Vivan',
          category: 'Student',
          grade: 'Grade 10-A',
          time: '08:12 AM',
          timestamp: Date.now() - 86400000 + 1200000,
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          status: 'APPROVED',
          gate: 'Gate 2 (Turnstile B)',
        },
        {
          id: 'LOG-5',
          name: 'Vivan',
          category: 'Student',
          grade: 'Grade 10-A',
          time: '08:18 AM',
          timestamp: Date.now() - 172800000 + 1500000,
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          status: 'APPROVED',
          gate: 'Gate 2 (Turnstile B)',
        },
      ],
      pendingNfcTaps: [
        {
          id: 'NFC-1001',
          studentKey: 'vivan',
          studentName: 'Vivan',
          grade: 'Grade 10-A',
          badgeId: 'TAT-2026-VIVAN-2026-X',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '08:14 AM',
          timestamp: Date.now() - 3100000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          notes: 'Biometric optical clearance confirmed',
        },
        {
          id: 'NFC-1002',
          studentKey: 'krishvika',
          studentName: 'Krishvika',
          grade: 'Grade 8-B',
          badgeId: 'TAT-2026-KRISHVIKA-2026-VIII',
          gateNumber: 'Gate 2 (Turnstile A)',
          time: '08:20 AM',
          timestamp: Date.now() - 2700000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          notes: 'Junior corridor arrival verified',
        },
        {
          id: 'NFC-1003',
          studentKey: 'vivan',
          studentName: 'Vivan',
          grade: 'Grade 10-A',
          badgeId: 'TAT-2026-VIVAN-2026-X',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '08:12 AM',
          timestamp: Date.now() - 86400000 + 1200000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          notes: 'Physics laboratory morning access pass',
        },
        {
          id: 'NFC-1004',
          studentKey: 'vivan',
          studentName: 'Vivan',
          grade: 'Grade 10-A',
          badgeId: 'TAT-2026-VIVAN-2026-X',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '08:18 AM',
          timestamp: Date.now() - 172800000 + 1500000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          notes: 'Regular timetable session entry',
        },
        {
          id: 'NFC-0901',
          studentKey: 'arjun',
          studentName: 'Arjun Verma',
          grade: 'Grade 10-A',
          badgeId: 'TAT-2026-ARJUN-X',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '07:35 AM',
          timestamp: Date.now() - 4800000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
        {
          id: 'NFC-0902',
          studentKey: 'meera',
          studentName: 'Meera Sen',
          grade: 'Grade 9',
          badgeId: 'TAT-2026-MEERA-IX',
          gateNumber: 'Gate 2 (Turnstile A)',
          time: '07:42 AM',
          timestamp: Date.now() - 4400000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
        {
          id: 'NFC-0903',
          studentKey: 'rohan',
          studentName: 'Rohan Sharma',
          grade: 'Grade 9',
          badgeId: 'TAT-2026-ROHAN-IX',
          gateNumber: 'Gate 2 (Turnstile A)',
          time: '07:55 AM',
          timestamp: Date.now() - 4000000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
        {
          id: 'NFC-0904',
          studentKey: 'ananya',
          studentName: 'Ananya Rao',
          grade: 'Grade 10-A',
          badgeId: 'TAT-2026-ANANYA-X',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '08:02 AM',
          timestamp: Date.now() - 3700000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
        {
          id: 'NFC-0905',
          studentKey: 'samir',
          studentName: 'Samir Patel',
          grade: 'Grade 8-B',
          badgeId: 'TAT-2026-SAMIR-VIII',
          gateNumber: 'Gate 2 (Turnstile A)',
          time: '08:08 AM',
          timestamp: Date.now() - 3400000,
          status: 'DENIED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          notes: 'Expired digital session token - redirected to front office',
        },
        {
          id: 'NFC-0906',
          studentKey: 'diya',
          studentName: 'Diya Nair',
          grade: 'Grade 7',
          badgeId: 'TAT-2026-DIYA-VII',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '08:24 AM',
          timestamp: Date.now() - 2500000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
        {
          id: 'NFC-0907',
          studentKey: 'kavya',
          studentName: 'Kavya Menon',
          grade: 'Grade 9',
          badgeId: 'TAT-2026-KAVYA-IX',
          gateNumber: 'Gate 2 (Turnstile A)',
          time: '08:31 AM',
          timestamp: Date.now() - 2100000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
        {
          id: 'NFC-0908',
          studentKey: 'tarun',
          studentName: 'Tarun Joshi',
          grade: 'Grade 10-A',
          badgeId: 'TAT-2026-TARUN-X',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '08:42 AM',
          timestamp: Date.now() - 1500000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
        {
          id: 'NFC-0909',
          studentKey: 'sneha',
          studentName: 'Sneha Hegde',
          grade: 'Grade 8-B',
          badgeId: 'TAT-2026-SNEHA-VIII',
          gateNumber: 'Gate 2 (Turnstile A)',
          time: '08:50 AM',
          timestamp: Date.now() - 1100000,
          status: 'DENIED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
          notes: 'Late arrival beyond gate curfew - manual slip issued',
        },
        {
          id: 'NFC-0910',
          studentKey: 'aditya',
          studentName: 'Aditya Kulkarni',
          grade: 'Grade 7',
          badgeId: 'TAT-2026-ADITYA-VII',
          gateNumber: 'Gate 2 (Turnstile B)',
          time: '09:05 AM',
          timestamp: Date.now() - 500000,
          status: 'APPROVED',
          verifiedBy: 'Mr. Sai - Gate 2 Security Officer',
        },
      ],
      feesPaid: {
        vivan: [true, false, true, false],
        krishvika: [true, true, false, false],
      },
      leaveRequests: [
        {
          id: 'LV-204',
          by: 'pvivan',
          studentKey: 'vivan',
          studentName: 'Vivan',
          leaveType: 'Academic Olympiad / Competition',
          from: '2026-10-29',
          to: '2026-10-30',
          reason: 'Participation in Karnataka Inter-School STEM Olympiad finals',
          status: 'APPROVED',
        },
      ],
      libraryLoans: {
        0: { by: 'vivan', due: '2026-11-08' },
      },
      quizResults: [
        {
          userId: 'vivan',
          subject: 'Physics',
          topic: 'Wave Mechanics',
          score: '5/5',
          percentage: 100,
          time: '10:45 AM',
        },
      ],
      supportTickets: [
        {
          id: 'TKT-101',
          by: 'krishvika',
          message: 'Unable to access digital French audio exercise from the resource repository.',
          category: 'Portal & Academic Systems',
          time: '09:30 AM',
          status: 'IN PROGRESS',
          reply: 'Investigating audio streaming CDN cache. Please try downloading the offline zip.',
          urgent: false,
        },
      ],
      chatHistory: {},
      auditLogs: [
        {
          id: 'AUD-1',
          time: new Date(Date.now() - 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'System health diagnostic test completed (All services nominal)',
          severity: 'info',
        },
        {
          id: 'AUD-2',
          time: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Staff member Ms. Susmita authenticated via OTP',
          severity: 'info',
        },
      ],
      broadcastMails: [
        {
          id: 'MAIL-1',
          to: 'All students',
          subject: 'Annual Neural Science & Arts Expo registration deadline',
          body: 'All teams participating in robotics, computational physics, and classical dance installations must register projects by Friday 5 PM.',
          time: '09:00 AM',
        },
      ],
      aiLogs: [],
      customPasswords: {},
      customMpins: {},
      failedAttempts: {},
      lockedUntil: {},
      timetables: generateDefaultTimetables(),
      notices: [
        {
          id: 'NTC-101',
          title: 'Term 2 CBSE & International Baccalaureate Summative Assessment Blueprint',
          category: 'Academic',
          date: '2026-10-28',
          content: 'Detailed 12-subject practical laboratory schedules, oral examinations in French/Hindi/Kannada, and computational mathematics rubrics are now finalized. All students must verify hall attendance credentials.',
          targetRoles: ['all'],
          acknowledgedBy: ['vivan', 'susmita', 'pvivan'],
          priority: 'high',
          author: 'Dr. B. R. Shenoy (Principal)',
        },
        {
          id: 'NTC-102',
          title: 'Annual Inter-School Robotics & Neural AI Science Expo (Jakkur Campus)',
          category: 'Event',
          date: '2026-10-29',
          content: 'The Open Learning Resource Centre will host 36 school delegations on November 14. Projects exploring bio-mimicry, renewable clean grids, and sacred geometry simulations will present at the Central Hologram Amphitheatre.',
          targetRoles: ['student', 'teacher', 'parent'],
          acknowledgedBy: ['vivan'],
          priority: 'normal',
          author: 'Ms. Susmita (Faculty Lead)',
        },
        {
          id: 'NTC-103',
          title: 'North Bengaluru Fleet Route 14 Optimization Notice',
          category: 'Advisory',
          date: '2026-10-30',
          content: 'Due to arterial road maintenance near Jakkur Aerodrome cross, Bus Route 14 will operate 10 minutes earlier on the morning circuit. Live real-time GPS telemetry is active in the Parent portal.',
          targetRoles: ['parent', 'student', 'security'],
          acknowledgedBy: ['pvivan', 'pkrishvika', 'sai'],
          priority: 'urgent',
          author: 'Transport & Safety Desk',
        },
        {
          id: 'NTC-104',
          title: 'Patron Directive: First-Principles Inquiry & Zero-Rote Pedagogy',
          category: 'Circular',
          date: '2026-10-31',
          content: 'All faculty departments must maintain 100% interactive lab time allocation and engage students through analytical problem solving. Rote memorization is replaced by experimental verification across all 13 syllabus subjects.',
          targetRoles: ['teacher', 'admin', 'principal'],
          acknowledgedBy: ['susmita', 'sandhya', 'amrita'],
          priority: 'high',
          author: 'Office of the Principal',
        },
      ],
      attendanceRecords: generateDefaultAttendanceRecords(),
      busRoute: {
        routeNumber: 'Route 14',
        routeName: 'North Bengaluru Express • Yelahanka – Jakkur',
        driverName: 'Mr. Manjunath Gowda',
        driverPhone: '+91 98450 44210',
        conductorName: 'Mr. Ramesh Babu',
        conductorPhone: '+91 98451 88320',
        vehicleNumber: 'KA-04-FA-2026',
        currentSpeedKmH: 34,
        currentLocationName: 'Approaching Sahakar Nagar 14th Main',
        nextStop: 'Sahakar Nagar Main Cross',
        liveStatus: 'ON_SCHEDULE',
        currentStopIndex: 2,
        progressPercent: 48,
        isEngineRunning: true,
        activeTrip: 'morning_inbound',
        studentsBoardedCount: 16,
        totalStudentsCount: 28,
        delayMinutes: 0,
        isLocationSharingActive: true,
        locationSharingStartedAt: '07:15 AM',
        telemetry: {
          speedKmH: 34,
          headingDeg: 142,
          fuelPercent: 86,
          engineStatus: 'RUNNING',
          gpsSignal: 'STRONG_5G',
          satelliteCount: 14,
          doorStatus: 'CLOSED',
          acStatus: 'ON',
          speedLimitKmH: 40,
          lastPingTime: 'Just now',
          currentLat: 13.0675,
          currentLng: 77.5912,
          cabinTempC: 23.5,
        },
        stops: [
          {
            id: 1,
            name: 'Yelahanka Satellite Town 4th Phase',
            shortName: 'Yelahanka 4th Phase',
            landmark: 'Near NES Circle / Mother Dairy Junction',
            lat: 13.1007,
            lng: 77.5963,
            timeScheduled: '07:20 AM',
            eta: 'Departed (07:21 AM)',
            status: 'passed',
            distanceFromStartKm: 0.0,
            zone: 'Zone North-A',
            students: [
              { id: 'st-1', name: 'Ananya Sharma', grade: 'Grade 9-A', category: 'student', stopId: 1, stopName: 'Yelahanka 4th Phase', status: 'boarded', boardedTime: '07:21 AM', seatNumber: '4A', parentKey: 'pananya', parentName: 'Dr. R. Sharma', parentPhone: '+91 98450 11200', optedTransport: true, transportFeePaid: true },
              { id: 'st-2', name: 'Aditya Rao', grade: 'Grade 11-B', category: 'student', stopId: 1, stopName: 'Yelahanka 4th Phase', status: 'boarded', boardedTime: '07:21 AM', seatNumber: '4B', parentKey: 'paditya', parentName: 'Mrs. L. Rao', parentPhone: '+91 98450 11201', optedTransport: true, transportFeePaid: true },
            ],
          },
          {
            id: 2,
            name: 'Judicial Layout Gate',
            shortName: 'Judicial Layout',
            landmark: 'GKVK Campus Perimeter Cross Road',
            lat: 13.0815,
            lng: 77.5882,
            timeScheduled: '07:35 AM',
            eta: 'Departed (07:36 AM)',
            status: 'passed',
            distanceFromStartKm: 3.2,
            zone: 'Zone North-B',
            students: [
              { id: 'st-3', name: 'Meera Sen', grade: 'Grade 9-B', category: 'student', userKey: 'meera', stopId: 2, stopName: 'Judicial Layout', status: 'boarded', boardedTime: '07:36 AM', seatNumber: '6A', parentKey: 'pmeera', parentName: 'Mr. P. Sen', parentPhone: '+91 98450 11202', optedTransport: true, transportFeePaid: true },
              { id: 'st-4', name: 'Kabir Joshi', grade: 'Grade 7-A', category: 'student', userKey: 'kabir', stopId: 2, stopName: 'Judicial Layout', status: 'boarded', boardedTime: '07:36 AM', seatNumber: '6B', parentKey: 'pkabir', parentName: 'Mrs. S. Joshi', parentPhone: '+91 98450 11203', optedTransport: true, transportFeePaid: false },
              { id: 'st-fac-1', name: 'Ms. Susmita Sen', grade: 'Faculty (Physics & Math)', category: 'teacher', department: 'Senior Physics Dept', userKey: 'susmita', stopId: 2, stopName: 'Judicial Layout', status: 'boarded', boardedTime: '07:36 AM', seatNumber: '1A', parentName: 'Self (Faculty)', parentPhone: '+91 98450 48291', optedTransport: true, transportFeePaid: true },
            ],
          },
          {
            id: 3,
            name: 'Sahakar Nagar Main Cross',
            shortName: 'Sahakar Nagar',
            landmark: '14th Main Commercial Junction',
            lat: 13.0623,
            lng: 77.5925,
            timeScheduled: '07:50 AM',
            eta: '07:49 AM',
            status: 'current',
            distanceFromStartKm: 6.4,
            zone: 'Zone Central-East',
            students: [
              { id: 'st-5', name: 'Krishvika', grade: 'Grade 8-B', category: 'student', userKey: 'krishvika', stopId: 3, stopName: 'Sahakar Nagar', status: 'waiting', seatNumber: '8A', parentKey: 'pkrishvika', parentName: 'Mr. K. Narayanan', parentPhone: '+91 98450 11204', optedTransport: true, transportFeePaid: false },
              { id: 'st-6', name: 'Rohan Iyer', grade: 'Grade 10-B', category: 'student', userKey: 'rohan', stopId: 3, stopName: 'Sahakar Nagar', status: 'waiting', seatNumber: '8B', parentKey: 'prohan', parentName: 'Mrs. V. Iyer', parentPhone: '+91 98450 11205', optedTransport: true, transportFeePaid: true },
              { id: 'st-stf-1', name: 'Ms. Bharthi', grade: 'Coordinator (Timetables & Support)', category: 'staff', department: 'Academic Operations', userKey: 'bharthi', stopId: 3, stopName: 'Sahakar Nagar', status: 'waiting', seatNumber: '2A', parentName: 'Self (Staff)', parentPhone: '+91 98450 39182', optedTransport: true, transportFeePaid: false },
            ],
          },
          {
            id: 4,
            name: 'Amruthahalli Signal Junction',
            shortName: 'Amruthahalli Signal',
            landmark: 'Bellary Road Flyover Underpass (NH 44)',
            lat: 13.0562,
            lng: 77.6045,
            timeScheduled: '08:05 AM',
            eta: '08:05 AM',
            status: 'upcoming',
            distanceFromStartKm: 8.9,
            zone: 'Zone Jakkur Corridor',
            students: [
              { id: 'st-7', name: 'Vivan', grade: 'Grade 10-A', category: 'student', userKey: 'vivan', stopId: 4, stopName: 'Amruthahalli Signal', status: 'waiting', seatNumber: '12A', parentKey: 'pvivan', parentName: 'Mr. Rajesh & Mrs. Sunita', parentPhone: '+91 98450 99881', optedTransport: true, transportFeePaid: true },
              { id: 'st-8', name: 'Arjun Verma', grade: 'Grade 10-A', category: 'student', stopId: 4, stopName: 'Amruthahalli Signal', status: 'waiting', seatNumber: '12B', parentKey: 'parjun', parentName: 'Mr. D. Verma', parentPhone: '+91 98450 99882', optedTransport: true, transportFeePaid: true },
              { id: 'st-stf-2', name: 'Mr. Sai', grade: 'Gate 2 Security Officer', category: 'staff', department: 'Campus Security', userKey: 'sai', stopId: 4, stopName: 'Amruthahalli Signal', status: 'waiting', seatNumber: '3B', parentName: 'Self (Staff)', parentPhone: '+91 98450 73510', optedTransport: true, transportFeePaid: true },
              { id: 'st-adm-1', name: 'Ms. Amrita', grade: 'Operations & Transport Lead', category: 'admin', department: 'Administration', userKey: 'amrita', stopId: 4, stopName: 'Amruthahalli Signal', status: 'waiting', seatNumber: '2B', parentName: 'Self (Admin)', parentPhone: '+91 98450 15839', optedTransport: true, transportFeePaid: true },
              { id: 'st-9', name: 'Tanya Pillai', grade: 'Grade 8-A', category: 'student', stopId: 4, stopName: 'Amruthahalli Signal', status: 'absent', seatNumber: '14A', parentKey: 'ptanya', parentName: 'Mr. R. Pillai', parentPhone: '+91 98450 99883', optedTransport: true, transportFeePaid: true },
            ],
          },
          {
            id: 5,
            name: 'Tattvasayam Future Academy, Gate 2',
            shortName: 'Campus Gate 2 Turnstile',
            landmark: 'Jakkur Plantation Road • Gate 2 Drop Zone & RFID Turnstile',
            lat: 13.0694,
            lng: 77.6186,
            timeScheduled: '08:18 AM',
            eta: '08:18 AM',
            status: 'upcoming',
            distanceFromStartKm: 11.4,
            zone: 'Academy Campus Zone',
            students: [],
          },
        ],
      },
      transportRequests: [
        {
          id: 'TR-OPT-101',
          userKey: 'aryan',
          userName: 'Aryan Mehta',
          userRole: 'student',
          routeNumber: 'Route 14',
          stopId: 3,
          stopName: 'Sahakar Nagar Main Cross',
          tripType: 'both',
          status: 'PENDING',
          requestedAt: '2026-11-06 04:30 PM',
          feeAmount: 12000,
          isFeePaid: false,
          remarks: 'Residence relocated near 14th Main Sahakar Nagar.',
        },
        {
          id: 'TR-OPT-102',
          userKey: 'susmita',
          userName: 'Ms. Susmita Sen',
          userRole: 'teacher',
          routeNumber: 'Route 14',
          stopId: 2,
          stopName: 'Judicial Layout Gate',
          tripType: 'both',
          status: 'APPROVED',
          requestedAt: '2026-10-15 10:15 AM',
          allocatedSeat: '1A',
          feeAmount: 6000,
          isFeePaid: true,
          paidAt: '2026-10-16',
          paymentRef: 'UPI-FAC-881920',
        },
        {
          id: 'TR-OPT-103',
          userKey: 'sai',
          userName: 'Mr. Sai',
          userRole: 'security',
          routeNumber: 'Route 14',
          stopId: 4,
          stopName: 'Amruthahalli Signal Junction',
          tripType: 'morning',
          status: 'APPROVED',
          requestedAt: '2026-10-18 08:00 AM',
          allocatedSeat: '3B',
          feeAmount: 6000,
          isFeePaid: true,
          paidAt: '2026-10-19',
          paymentRef: 'STF-PAY-77192',
        },
        {
          id: 'TR-OPT-104',
          userKey: 'vivan',
          userName: 'Vivan',
          userRole: 'student',
          routeNumber: 'Route 14',
          stopId: 4,
          stopName: 'Amruthahalli Signal Junction',
          tripType: 'both',
          status: 'APPROVED',
          requestedAt: '2026-06-10 11:00 AM',
          allocatedSeat: '12A',
          feeAmount: 12000,
          isFeePaid: true,
          paidAt: '2026-06-15',
          paymentRef: 'UPI-HDFC-992104812',
        },
        {
          id: 'TR-OPT-105',
          userKey: 'krishvika',
          userName: 'Krishvika',
          userRole: 'student',
          routeNumber: 'Route 14',
          stopId: 3,
          stopName: 'Sahakar Nagar Main Cross',
          tripType: 'both',
          status: 'APPROVED',
          requestedAt: '2026-10-28 09:30 AM',
          allocatedSeat: '8A',
          feeAmount: 12000,
          isFeePaid: false,
          remarks: 'Term 2 bus pass approved; transport fee payment pending.',
        },
        {
          id: 'TR-OPT-106',
          userKey: 'bharthi',
          userName: 'Ms. Bharthi',
          userRole: 'support',
          routeNumber: 'Route 14',
          stopId: 3,
          stopName: 'Sahakar Nagar Main Cross',
          tripType: 'both',
          status: 'APPROVED',
          requestedAt: '2026-10-29 11:15 AM',
          allocatedSeat: '2A',
          feeAmount: 6000,
          isFeePaid: false,
          remarks: 'Coordinator morning & evening shuttle allocation.',
        },
        {
          id: 'TR-OPT-107',
          userKey: 'amrita',
          userName: 'Ms. Amrita',
          userRole: 'admin',
          routeNumber: 'Route 14',
          stopId: 4,
          stopName: 'Amruthahalli Signal Junction',
          tripType: 'both',
          status: 'APPROVED',
          requestedAt: '2026-09-05 09:00 AM',
          allocatedSeat: '2B',
          feeAmount: 6000,
          isFeePaid: true,
          paidAt: '2026-09-07',
          paymentRef: 'ADM-UPI-552019',
        },
        {
          id: 'TR-OPT-108',
          userKey: 'meera',
          userName: 'Meera Sen',
          userRole: 'student',
          routeNumber: 'Route 14',
          stopId: 2,
          stopName: 'Judicial Layout Gate',
          tripType: 'both',
          status: 'APPROVED',
          requestedAt: '2026-07-08 02:15 PM',
          allocatedSeat: '6A',
          feeAmount: 12000,
          isFeePaid: true,
          paidAt: '2026-07-10',
          paymentRef: 'NB-AXIS-441028',
        },
        {
          id: 'TR-OPT-109',
          userKey: 'kabir',
          userName: 'Kabir Joshi',
          userRole: 'student',
          routeNumber: 'Route 14',
          stopId: 2,
          stopName: 'Judicial Layout Gate',
          tripType: 'morning',
          status: 'APPROVED',
          requestedAt: '2026-11-01 03:45 PM',
          allocatedSeat: '6B',
          feeAmount: 12000,
          isFeePaid: false,
          remarks: 'Recently approved for morning pickup; fee settlement pending.',
        },
        {
          id: 'TR-OPT-110',
          userKey: 'ananya',
          userName: 'Ananya Sharma',
          userRole: 'student',
          routeNumber: 'Route 14',
          stopId: 1,
          stopName: 'Yelahanka Satellite Town 4th Phase',
          tripType: 'both',
          status: 'APPROVED',
          requestedAt: '2026-06-14 01:00 PM',
          allocatedSeat: '4A',
          feeAmount: 12000,
          isFeePaid: true,
          paidAt: '2026-06-18',
          paymentRef: 'UPI-SBI-310942',
        },
        {
          id: 'TR-OPT-111',
          userKey: 'sandhya',
          userName: 'Ms. Sandhya',
          userRole: 'admin',
          routeNumber: 'Route 14',
          stopId: 1,
          stopName: 'Yelahanka Satellite Town 4th Phase',
          tripType: 'morning',
          status: 'PENDING',
          requestedAt: '2026-11-07 10:20 AM',
          feeAmount: 6000,
          isFeePaid: false,
          remarks: 'Requested morning pickup pass on inspection days.',
        },
      ],
      feeTransactions: [
        {
          id: 'TXN-90218',
          studentKey: 'vivan',
          itemTitle: 'Term 1 Tuition & Laboratory Endowment',
          amount: 48000,
          date: '2026-06-15',
          paymentMethod: 'UPI',
          referenceId: 'UPI-HDFC-992104812',
          status: 'SUCCESS',
        },
        {
          id: 'TXN-90342',
          studentKey: 'vivan',
          itemTitle: 'Activities: Music, Robotics & Sports Council',
          amount: 9000,
          date: '2026-07-02',
          paymentMethod: 'NetBanking',
          referenceId: 'NB-ICICI-88219401',
          status: 'SUCCESS',
        },
      ],
      emergencyLockdown: {
        active: false,
        triggeredBy: '',
        triggeredRole: '',
        timestamp: 0,
        reason: 'Immediate Campus Security & Safety Protocol',
        location: 'All Blocks (A, B, C) & Grounds, Jakkur Campus',
        instructions: 'Lock all classroom doors immediately. Remain away from windows. Turn off lights. Maintain complete silence. Stay in place until official ALL-CLEAR from Principal or Campus Security.',
      },
      books: DEFAULT_LIBRARY_BOOKS,
      bookLoans: DEFAULT_BOOK_LOANS,
      bookHolds: DEFAULT_BOOK_HOLDS,
    };
  }

  public static load(): AppState {
    if (typeof localStorage === 'undefined') return this.defaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.defaultState();
      const parsed = JSON.parse(raw);
      const def = this.defaultState();
      return {
        ...def,
        ...parsed,
        timetables: parsed.timetables || def.timetables,
        notices: parsed.notices && parsed.notices.length > 0 ? parsed.notices : def.notices,
        attendanceRecords: parsed.attendanceRecords && parsed.attendanceRecords.length >= 20 ? parsed.attendanceRecords : def.attendanceRecords,
        busRoute: (parsed.busRoute && parsed.busRoute.stops && parsed.busRoute.stops[0]?.lat) ? parsed.busRoute : def.busRoute,
        feeTransactions: parsed.feeTransactions || def.feeTransactions,
        pendingNfcTaps: Array.isArray(parsed.pendingNfcTaps) && parsed.pendingNfcTaps.length > 0 ? parsed.pendingNfcTaps : def.pendingNfcTaps,
        emergencyLockdown: parsed.emergencyLockdown || def.emergencyLockdown,
        books: Array.isArray(parsed.books) && parsed.books.length > 0 ? parsed.books : def.books,
        bookLoans: Array.isArray(parsed.bookLoans) ? parsed.bookLoans : def.bookLoans,
        bookHolds: Array.isArray(parsed.bookHolds) ? parsed.bookHolds : def.bookHolds,
        transportRequests: Array.isArray(parsed.transportRequests) && parsed.transportRequests.length > 4 ? parsed.transportRequests : def.transportRequests,
      };
    } catch (e) {
      errorReportingService.report({
        message: 'Error deserializing local portal state. Using fallback defaults.',
        severity: 'WARN',
        category: 'RUNTIME_EXCEPTION',
      });
      return this.defaultState();
    }
  }

  private static saveTimeout: any = null;

  public static save(state: AppState) {
    if (typeof localStorage === 'undefined') return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        errorReportingService.report({
          message: 'Failed to write app state to localStorage (Quota exceeded or privacy restriction)',
          severity: 'HIGH',
          category: 'RUNTIME_EXCEPTION',
        });
      }
    }, 250);
  }

  public static downloadText(filename: string, content: string, mimeType = 'text/plain') {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      errorReportingService.report({
        message: `Failed to trigger file download for ${filename}: ${e?.message || e}`,
        severity: 'HIGH',
        category: 'RUNTIME_EXCEPTION',
      });
    }
  }
}
