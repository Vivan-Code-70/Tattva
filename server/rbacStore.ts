import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

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

export type ProtectedFeature =
  | 'bus_tracker'
  | 'homework'
  | 'homework_manage'
  | 'calendar'
  | 'reports'
  | 'admin_users'
  | 'otp_directory';

export type AuthSessionState = 'UNAUTHENTICATED' | 'UNREGISTERED' | 'REGISTERED';

export interface RegisteredUserRecord {
  userKey: string;
  id: string;
  name: string;
  email: string;
  aliases?: string[];
  roles: UserRole[];
  primaryRole: UserRole;
  title: string;
  active: boolean;
  assignedClasses?: string[];
  childrenKeys?: string[];
  linkedStudentKey?: string;
  assignedBusRoute?: string;
  rolesVersion: number;
  phone?: string;
  scores?: number[];
  optedSubjects?: string[];
}

export interface SessionTokenPayload {
  sid: string;
  userKey?: string;
  email: string;
  name: string;
  authProvider: 'google' | 'institutional';
  registered: boolean;
  rolesVersion: number;
  isDemoSession?: boolean;
  iat: number;
  exp: number;
}

export interface ScopedHomeworkItem {
  id: string;
  subject: string;
  title: string;
  due: string;
  by: string;
  classGrade: string;
  done: Record<string, boolean>;
}

export interface ScopedStudentReport {
  studentKey: string;
  studentId: string;
  name: string;
  grade: string;
  optedSubjects: string[];
  scores: number[];
  attendancePercent: number;
  presentDays: number;
  totalDays: number;
}

export const UNREGISTERED_ERROR_MESSAGE =
  'Your account isn’t registered with the school. Please contact the school office for access.';

export const ROLE_FEATURES: Record<UserRole, ProtectedFeature[]> = {
  parent: ['bus_tracker', 'homework', 'calendar', 'reports'],
  student: ['homework', 'calendar', 'bus_tracker', 'reports'],
  support: ['calendar', 'reports', 'bus_tracker', 'homework', 'homework_manage'],
  admin: ['bus_tracker', 'homework', 'homework_manage', 'calendar', 'reports', 'admin_users', 'otp_directory'],
  principal: ['bus_tracker', 'homework', 'homework_manage', 'calendar', 'reports', 'otp_directory'],
  security: ['calendar', 'bus_tracker'],
  driver: ['bus_tracker', 'calendar'],
  librarian: ['calendar'],
  teacher: ['homework', 'homework_manage', 'calendar', 'reports'],
};

const ALL_SUBJECTS = [
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

const SEED_USERS: RegisteredUserRecord[] = [
  {
    userKey: 'vivan',
    id: 'VIVAN-2026-X',
    name: 'Vivan',
    email: 'vivan.sharma@tattvaswayam.edu.in',
    aliases: ['vivan.2026@tattvaswayam.edu.in'],
    roles: ['student'],
    primaryRole: 'student',
    title: 'Grade 10-A',
    active: true,
    assignedClasses: ['Grade 10-A'],
    linkedStudentKey: 'vivan',
    assignedBusRoute: 'Route 14',
    rolesVersion: 1,
    scores: [99, 98, 97, 98, 100, 96, 95, 100, 94, 99, 96, 98, 99],
    optedSubjects: ['Mathematics', 'Physics', 'Biology', 'Chemistry', 'Philosophy', 'English', 'French'],
  },
  {
    userKey: 'krishvika',
    id: 'KRISHVIKA-2026-VIII',
    name: 'Krishvika',
    email: 'krishvika.patel@tattvaswayam.edu.in',
    aliases: ['krishvika.2026@tattvaswayam.edu.in'],
    roles: ['student'],
    primaryRole: 'student',
    title: 'Grade 8-B',
    active: true,
    assignedClasses: ['Grade 8-B'],
    linkedStudentKey: 'krishvika',
    assignedBusRoute: 'Route 14',
    rolesVersion: 1,
    scores: [95, 96, 99, 94, 98, 97, 92, 99, 100, 96, 95, 97, 98],
    optedSubjects: ['Mathematics', 'English', 'Biology', 'Philosophy', 'Music', 'Dance', 'Sports', 'Hindi'],
  },
  {
    userKey: 'pvivan',
    id: 'PARENT-VIVAN01',
    name: 'Parent of Vivan',
    email: 'parent.vivan@tattvaswayam.com',
    aliases: ['parent.vivan@gmail.com'],
    roles: ['parent'],
    primaryRole: 'parent',
    title: 'Parent, Grade 10-A',
    active: true,
    childrenKeys: ['vivan'],
    assignedBusRoute: 'Route 14',
    rolesVersion: 1,
  },
  {
    userKey: 'pkrishvika',
    id: 'PARENT-KRISHVIKA01',
    name: 'Parent of Krishvika',
    email: 'parent.krishvika@tattvaswayam.com',
    aliases: ['parent.krishvika@gmail.com'],
    roles: ['parent'],
    primaryRole: 'parent',
    title: 'Parent, Grade 8-B',
    active: true,
    childrenKeys: ['krishvika'],
    assignedBusRoute: 'Route 14',
    rolesVersion: 1,
  },
  {
    userKey: 'susmita',
    id: 'SUSMITA-FAC-10',
    name: 'Ms. Sushmitha',
    email: 'sushmitha@tattvaswayam.com',
    roles: ['teacher'],
    primaryRole: 'teacher',
    title: 'Facilitator & Mentor, Mathematical Studies',
    active: true,
    assignedClasses: ['Grade 10-A'],
    rolesVersion: 1,
  },
  {
    userKey: 'divya',
    id: 'DIVYA-FAC-08',
    name: 'Ms. Divya Dogra',
    email: 'divya.dogra@tattvaswayam.com',
    roles: ['teacher', 'parent'],
    primaryRole: 'teacher',
    title: 'Facilitator of Inclusive Learning & Parent (Grade 8-B)',
    active: true,
    assignedClasses: ['Grade 8-B'],
    childrenKeys: ['krishvika'],
    assignedBusRoute: 'Route 14',
    rolesVersion: 1,
  },
  {
    userKey: 'bharthi',
    id: 'BHARTHI-SUP03',
    name: 'Ms. Sangeetha',
    email: 'admissions@tattvaswayam.com',
    roles: ['support'],
    primaryRole: 'support',
    title: 'Chief Administrator & Coordinator',
    active: true,
    assignedClasses: ['Grade 10-A', 'Grade 8-B', 'Grade 9', 'Grade 7'],
    rolesVersion: 1,
  },
  {
    userKey: 'sandhya',
    id: 'SANDHYA-ADM01',
    name: 'Ms. Sandhya Gatti',
    email: 'sandhya.gatti@tattvaswayam.com',
    roles: ['admin'],
    primaryRole: 'admin',
    title: 'Founder & Managing Director',
    active: true,
    assignedClasses: ['Grade 10-A', 'Grade 8-B', 'Grade 9', 'Grade 7'],
    childrenKeys: ['vivan', 'krishvika'],
    rolesVersion: 1,
  },
  {
    userKey: 'amrita',
    id: 'AMRITA-ADM02',
    name: 'Ms. Amrita',
    email: 'amrita@tattvaswayam.com',
    roles: ['admin'],
    primaryRole: 'admin',
    title: 'Centre Head & Chief Mentor',
    active: true,
    assignedClasses: ['Grade 10-A', 'Grade 8-B', 'Grade 9', 'Grade 7'],
    childrenKeys: ['vivan', 'krishvika'],
    rolesVersion: 1,
  },
  {
    userKey: 'principal',
    id: 'PRINCIPAL-DR-01',
    name: 'Ms. Amrita',
    email: 'info@tattvaswayam.com',
    roles: ['principal'],
    primaryRole: 'principal',
    title: 'Centre Head & Chief Mentor',
    phone: '+91 76250 03355',
    active: true,
    assignedClasses: ['Grade 10-A', 'Grade 8-B', 'Grade 9', 'Grade 7'],
    rolesVersion: 1,
  },
  {
    userKey: 'sai',
    id: 'SECURITY-GATE02',
    name: 'Mr. Sai',
    email: 'gate2.security@tattvaswayam.com',
    aliases: ['sai.security@tattvaswayam.com'],
    roles: ['security'],
    primaryRole: 'security',
    title: 'Gate 2 Security Officer',
    active: true,
    rolesVersion: 1,
  },
  {
    userKey: 'librarian',
    id: 'LIB-SR-01',
    name: 'Ms. Meenakshi Sundaram',
    email: 'library@tattvaswayam.com',
    roles: ['librarian'],
    primaryRole: 'librarian',
    title: 'TURN Open Library Curator',
    phone: '+91 98450 81294',
    active: true,
    rolesVersion: 1,
  },
  {
    userKey: 'driver',
    id: 'DRIVER-KA04-2026',
    name: 'Mr. Manjunath Gowda',
    email: 'driver.manjunath@tattvaswayam.edu.in',
    aliases: ['manjunath.fleet@tattvaswayam.edu.in'],
    roles: ['driver'],
    primaryRole: 'driver',
    title: 'Senior Fleet Pilot • Route 14 Express',
    phone: '+91 98450 44210',
    active: true,
    assignedBusRoute: 'Route 14',
    rolesVersion: 1,
  },
];

const DEFAULT_PASSWORDS: Record<string, string> = {
  vivan: 'Vivan@2026',
  krishvika: 'Krishvika@2026',
};

const DEFAULT_MPINS: Record<string, string> = {
  principal: '520941',
  susmita: '482913',
  divya: '718293',
  sai: '735104',
  pvivan: '260814',
  pkrishvika: '917352',
  sandhya: '604281',
  amrita: '158396',
  bharthi: '391827',
  librarian: '812940',
  driver: '442100',
};

const TOTP_SECRETS: Record<string, string> = {
  vivan: 'TATTVAVIVANXX222',
  krishvika: 'TATTVAKRISHVII22',
  susmita: 'TATTVASUSMITAFAC',
  divya: 'TATTVADIVYAFAC22',
  sandhya: 'TATTVASANDHYAADM',
  amrita: 'TATTVAMRITAOPS22',
  sai: 'TATTVASAIGATE222',
  bharthi: 'TATTVABHARTHISUP',
  pvivan: 'TATTVAPARENTVIV2',
  pkrishvika: 'TATTVAPARENTKRI2',
  principal: 'TATTVAPRINCIP22',
  librarian: 'TATTVAMEENAKSHI2',
  driver: 'TATTVAVIVANXX222',
};

const SEED_HOMEWORK: ScopedHomeworkItem[] = [
  {
    id: 'ASG-101',
    subject: 'Physics',
    title: 'Harmonic Oscillators Lab Report & Simulation Analysis',
    due: '2026-11-02',
    by: 'Ms. Sushmitha',
    classGrade: 'Grade 10-A',
    done: { vivan: true, krishvika: false },
  },
  {
    id: 'ASG-102',
    subject: 'Mathematics',
    title: 'Multivariable Calculus Partial Derivatives Set #4',
    due: '2026-11-04',
    by: 'Ms. Sushmitha',
    classGrade: 'Grade 10-A',
    done: { vivan: true, krishvika: false },
  },
  {
    id: 'ASG-103',
    subject: 'Philosophy',
    title: 'Comparative Essay: Kantian Deontology vs Virtue Ethics',
    due: '2026-11-06',
    by: 'Ms. Sandhya Gatti',
    classGrade: 'Grade 10-A',
    done: { vivan: false, krishvika: true },
  },
  {
    id: 'ASG-104',
    subject: 'Biology',
    title: 'CRISPR-Cas9 Guide RNA Mechanism Annotated Diagram',
    due: '2026-11-05',
    by: 'Ms. Divya Dogra',
    classGrade: 'Grade 8-B',
    done: { vivan: true, krishvika: false },
  },
  {
    id: 'ASG-105',
    subject: 'French',
    title: 'Le Subjonctif Présent Short Dialogue Recording',
    due: '2026-11-07',
    by: 'Ms. Sandhya Padmanabhan',
    classGrade: 'Grade 8-B',
    done: { vivan: false, krishvika: false },
  },
];

const SEED_CALENDAR_EVENTS = [
  { id: 'EV-1', date: '2026-10-15', title: 'Term 1 Mathematics Inquiry Assessment', type: 'exam', description: 'Inizio–Adroit applied mathematics showcase' },
  { id: 'EV-2', date: '2026-10-20', title: 'Swayam Vichar Manch Dialogue', type: 'expo', description: 'Learner-led community inquiry at the Amphitheatre' },
  { id: 'EV-3', date: '2026-10-24', title: 'Annual Science, Wander & Wonder Expo', type: 'expo', description: 'Young Farmers & lab demonstrations at Sampigehalli campus' },
  { id: 'EV-4', date: '2026-10-28', title: 'Academic Counseling & Parent Dialogue', type: 'counseling', description: '1-on-1 learner growth portfolio reviews' },
  { id: 'EV-5', date: '2026-11-01', title: 'Karnataka Rajyotsava', type: 'holiday', description: 'State holiday — campus closed' },
  { id: 'EV-6', date: '2026-11-08', title: 'Deepavali Festival of Lights', type: 'holiday', description: 'Festival holiday — campus closed' },
  { id: 'EV-7', date: '2026-12-25', title: 'Winter Break', type: 'holiday', description: 'Seasonal recess' },
];

const SEED_COUNSELING = [
  { id: 'CNS-101', by: 'pvivan', who: 'amrita', date: '2026-10-28', mode: 'In-Person (Jakkur Campus)', agenda: 'Adroit Grade 10 Cambridge / CBSE pathway check-in for Vivan', status: 'ACCEPTED' },
  { id: 'CNS-102', by: 'pkrishvika', who: 'sandhya', date: '2026-11-03', mode: 'Video Consultation', agenda: 'Inclusive enrichment & TURN reading club guidance for Krishvika', status: 'PENDING' },
];

const SEED_BUS_PASSENGERS = [
  { id: 'st-1', name: 'Aarav Verma', grade: 'Grade 10-A', category: 'student', userKey: 'arjun', stopId: 1, stopName: 'Yelahanka Satellite Town', status: 'boarded', boardedTime: '07:22 AM', seatNumber: '4A', parentKey: 'parjun', parentName: 'Mr. Vikram Verma', parentPhone: '+91 98450 11223', optedTransport: true, transportFeePaid: true },
  { id: 'st-2', name: 'Meera Sen', grade: 'Grade 9', category: 'student', userKey: 'meera', stopId: 1, stopName: 'Yelahanka Satellite Town', status: 'boarded', boardedTime: '07:23 AM', seatNumber: '4B', parentKey: 'pmeera', parentName: 'Mrs. Shweta Sen', parentPhone: '+91 98450 22334', optedTransport: true, transportFeePaid: true },
  { id: 'st-5', name: 'Ananya Rao', grade: 'Grade 10-A', category: 'student', userKey: 'ananya', stopId: 2, stopName: 'Judicial Layout Gate', status: 'boarded', boardedTime: '07:37 AM', seatNumber: '6A', parentKey: 'pananya', parentName: 'Mr. Rajesh Rao', parentPhone: '+91 98450 55667', optedTransport: true, transportFeePaid: true },
  { id: 'st-7', name: 'Vivan', grade: 'Grade 10-A', category: 'student', userKey: 'vivan', stopId: 3, stopName: 'Sahakar Nagar Main Cross', status: 'boarded', boardedTime: '07:49 AM', seatNumber: '8A', parentKey: 'pvivan', parentName: 'Parent of Vivan', parentPhone: '+91 98450 26081', optedTransport: true, transportFeePaid: true },
  { id: 'st-8', name: 'Krishvika', grade: 'Grade 8-B', category: 'student', userKey: 'krishvika', stopId: 3, stopName: 'Sahakar Nagar Main Cross', status: 'waiting', seatNumber: '8B', parentKey: 'pkrishvika', parentName: 'Parent of Krishvika', parentPhone: '+91 98450 91735', optedTransport: true, transportFeePaid: true },
  { id: 'st-fac-1', name: 'Ms. Sushmitha', grade: 'Facilitator (Mathematical Studies)', category: 'teacher', userKey: 'susmita', stopId: 2, stopName: 'Judicial Layout Gate', status: 'boarded', boardedTime: '07:36 AM', seatNumber: '1A', parentName: 'Self (Faculty)', optedTransport: true, transportFeePaid: true },
  { id: 'st-stf-1', name: 'Ms. Sangeetha', grade: 'Chief Administrator', category: 'staff', userKey: 'bharthi', stopId: 3, stopName: 'Sahakar Nagar Main Cross', status: 'waiting', seatNumber: '2A', parentName: 'Self (Staff)', optedTransport: true, transportFeePaid: false },
];

const DB_FILE = path.join(os.tmpdir(), 'tattvaswayam-rbac-db.json');

interface RbacDatabaseState {
  users: Record<string, RegisteredUserRecord>;
  homework: ScopedHomeworkItem[];
  calendarEvents: typeof SEED_CALENDAR_EVENTS;
  counseling: typeof SEED_COUNSELING;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`tattvaswayam-rbac:${process.cwd()}`).digest('hex');

const revokedSessionIds = new Set<string>();
let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

function readFirebaseConfig(): { projectId: string; apiKey: string } {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      projectId: parsed.projectId || '',
      apiKey: parsed.apiKey || '',
    };
  } catch {
    return { projectId: '', apiKey: '' };
  }
}

function loadDatabase(): RbacDatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (parsed && parsed.users && Object.keys(parsed.users).length > 0) {
        return parsed as RbacDatabaseState;
      }
    }
  } catch (err) {
    console.warn('[RBAC] Could not load persisted DB, using seed data:', err);
  }

  const users: Record<string, RegisteredUserRecord> = {};
  for (const u of SEED_USERS) {
    users[u.userKey] = { ...u };
  }
  return {
    users,
    homework: SEED_HOMEWORK.map((h) => ({ ...h, done: { ...h.done } })),
    calendarEvents: SEED_CALENDAR_EVENTS.map((e) => ({ ...e })),
    counseling: SEED_COUNSELING.map((c) => ({ ...c })),
  };
}

const db: RbacDatabaseState = loadDatabase();

function persistDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.warn('[RBAC] Persist warning:', err);
  }
}

// Compute union of permissions across all assigned roles for a user
export function getPermissionsForRoles(roles: UserRole[]): ProtectedFeature[] {
  const perms = new Set<ProtectedFeature>();
  for (const r of roles) {
    const allowed = ROLE_FEATURES[r] || [];
    for (const f of allowed) {
      perms.add(f);
    }
  }
  return Array.from(perms);
}

export function findRegisteredUserByEmail(email: string): RegisteredUserRecord | null {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  for (const u of Object.values(db.users)) {
    if (u.email.toLowerCase() === clean) return u;
    if (u.aliases?.some((a) => a.toLowerCase() === clean)) return u;
  }
  return null;
}

export function findRegisteredUserByIdentifier(identifier: string): RegisteredUserRecord | null {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  if (db.users[clean]) return db.users[clean];
  for (const u of Object.values(db.users)) {
    if (u.id.toLowerCase() === clean) return u;
    if (u.email.toLowerCase() === clean) return u;
    if (u.aliases?.some((a) => a.toLowerCase() === clean)) return u;
  }
  return null;
}

export function listAllRegisteredUsers(): RegisteredUserRecord[] {
  return Object.values(db.users);
}

export function getRegisteredUserByKey(userKey: string): RegisteredUserRecord | null {
  return db.users[userKey] || null;
}

export function createRegisteredUser(input: {
  email: string;
  name: string;
  roles: UserRole[];
  title?: string;
  assignedClasses?: string[];
  childrenKeys?: string[];
  linkedStudentKey?: string;
  assignedBusRoute?: string;
}): RegisteredUserRecord {
  const cleanEmail = input.email.trim().toLowerCase();
  const existing = findRegisteredUserByEmail(cleanEmail);
  if (existing) {
    throw new Error('An account with this email is already registered.');
  }
  const safeRoles: UserRole[] = input.roles.length > 0 ? Array.from(new Set(input.roles)) : ['parent'];
  const slug = cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 14) || 'user';
  let userKey = slug;
  let counter = 1;
  while (db.users[userKey]) {
    userKey = `${slug}${counter++}`;
  }

  const record: RegisteredUserRecord = {
    userKey,
    id: `${userKey.toUpperCase()}-2026`,
    name: input.name.trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    roles: safeRoles,
    primaryRole: safeRoles[0],
    title: input.title?.trim() || `${safeRoles.join(' & ')} Account`,
    active: true,
    assignedClasses: input.assignedClasses,
    childrenKeys: input.childrenKeys,
    linkedStudentKey: input.linkedStudentKey,
    assignedBusRoute: input.assignedBusRoute || 'Route 14',
    rolesVersion: 1,
  };

  db.users[userKey] = record;
  persistDatabase();
  return record;
}

export function updateRegisteredUser(
  userKey: string,
  updates: {
    roles?: UserRole[];
    primaryRole?: UserRole;
    title?: string;
    active?: boolean;
    assignedClasses?: string[];
    childrenKeys?: string[];
    linkedStudentKey?: string;
    name?: string;
  }
): RegisteredUserRecord | null {
  const current = db.users[userKey];
  if (!current) return null;

  const nextRoles =
    updates.roles && updates.roles.length > 0
      ? (Array.from(new Set(updates.roles)) as UserRole[])
      : current.roles;

  const updated: RegisteredUserRecord = {
    ...current,
    name: updates.name !== undefined ? updates.name : current.name,
    roles: nextRoles,
    primaryRole:
      updates.primaryRole && nextRoles.includes(updates.primaryRole)
        ? updates.primaryRole
        : nextRoles.includes(current.primaryRole)
        ? current.primaryRole
        : nextRoles[0],
    title: updates.title !== undefined ? updates.title : current.title,
    active: updates.active !== undefined ? updates.active : current.active,
    assignedClasses: updates.assignedClasses !== undefined ? updates.assignedClasses : current.assignedClasses,
    childrenKeys: updates.childrenKeys !== undefined ? updates.childrenKeys : current.childrenKeys,
    linkedStudentKey: updates.linkedStudentKey !== undefined ? updates.linkedStudentKey : current.linkedStudentKey,
    rolesVersion: current.rolesVersion + 1,
  };

  db.users[userKey] = updated;
  persistDatabase();
  return updated;
}

export function deleteRegisteredUser(userKey: string): boolean {
  if (!db.users[userKey]) return false;
  // Prevent deleting core bootstrap founder sandhya so admin isn't locked out
  if (userKey === 'sandhya') {
    throw new Error('Primary Founder & Managing Director account cannot be removed.');
  }
  delete db.users[userKey];
  persistDatabase();
  return true;
}

// --------------- RFC 6238 TOTP & Credential Verification --------------- //

function base32Decode(str: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function computeTotp(secretBase32: string, stepCounter: number): string {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(stepCounter), 0);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[19] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

export function verifyInstitutionalCredentials(params: {
  identifier: string;
  authMode: 'password' | 'otp' | 'mpin';
  secretValue: string;
}): { ok: boolean; user?: RegisteredUserRecord; error?: string } {
  const user = findRegisteredUserByIdentifier(params.identifier);
  if (!user) {
    return { ok: false, error: 'Unrecognized Institutional ID or email address.' };
  }
  if (!user.active) {
    return { ok: false, error: 'This school account is deactivated. Please contact the school office.' };
  }

  const input = (params.secretValue || '').trim();
  if (params.authMode === 'password') {
    const expected = DEFAULT_PASSWORDS[user.userKey] || 'Vivan@2026';
    if (input !== expected) {
      return { ok: false, error: 'Incorrect password. Please verify your credentials.' };
    }
    return { ok: true, user };
  }

  if (params.authMode === 'mpin') {
    const expected = DEFAULT_MPINS[user.userKey] || '202600';
    if (input !== expected) {
      return { ok: false, error: 'Incorrect 6-digit Master PIN.' };
    }
    return { ok: true, user };
  }

  // OTP mode
  const cleanOtp = input.replace(/\D/g, '');
  if (cleanOtp.length !== 6) {
    return { ok: false, error: 'Enter the 6-digit numeric verification code.' };
  }
  const secret = TOTP_SECRETS[user.userKey] || 'TATTVAVIVANXX222';
  const step = Math.floor(Date.now() / 1000 / 30);
  const valid =
    cleanOtp === computeTotp(secret, step) ||
    cleanOtp === computeTotp(secret, step - 1) ||
    cleanOtp === computeTotp(secret, step + 1);
  if (!valid) {
    return { ok: false, error: 'Invalid or expired 6-digit OTP code.' };
  }
  return { ok: true, user };
}

// --------------- Google Firebase ID Token Cryptographic Verification --------------- //

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Google Firebase public keys (${resp.status})`);
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/);
  const ttlMs = match ? parseInt(match[1], 10) * 1000 : 3600 * 1000;
  const certs = (await resp.json()) as Record<string, string>;
  cachedGoogleCerts = { certs, expiresAt: now + ttlMs };
  return certs;
}

export async function verifyGoogleFirebaseIdToken(idToken: string): Promise<{
  email: string;
  name: string;
  uid: string;
  emailVerified: boolean;
}> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Google ID token.');
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  const { projectId, apiKey } = readFirebaseConfig();

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported token signature algorithm.');
  }

  let signatureVerified = false;
  try {
    const certs = await getFirebasePublicCerts();
    const pem = certs[header.kid];
    if (pem) {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(`${headerB64}.${payloadB64}`);
      verifier.end();
      const sigBuf = Buffer.from(sigB64, 'base64url');
      signatureVerified = verifier.verify(pem, sigBuf);
    }
  } catch (certErr) {
    // Secondary authoritative check via Google Identity Toolkit
    if (apiKey) {
      const lookupResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );
      if (lookupResp.ok) {
        const lookupData = (await lookupResp.json()) as any;
        const userEntry = lookupData?.users?.[0];
        if (userEntry?.email && userEntry?.emailVerified) {
          return {
            email: String(userEntry.email).toLowerCase(),
            name: String(userEntry.displayName || userEntry.email.split('@')[0]),
            uid: String(userEntry.localId || payload.sub),
            emailVerified: true,
          };
        }
      }
    }
    throw certErr;
  }

  if (!signatureVerified) {
    throw new Error('Invalid Google Sign-In cryptographic signature.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (projectId && payload.aud !== projectId) {
    throw new Error('Token audience mismatch.');
  }
  if (projectId && payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Token issuer mismatch.');
  }
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Google sign-in token has expired.');
  }
  if (!payload.sub || !payload.email) {
    throw new Error('Google account email claim is missing.');
  }
  if (payload.email_verified !== true) {
    throw new Error('Google email address is not verified.');
  }

  return {
    email: String(payload.email).toLowerCase(),
    name: String(payload.name || payload.email.split('@')[0]),
    uid: String(payload.sub),
    emailVerified: true,
  };
}

// --------------- Signed Session Tokens (HMAC-SHA256) --------------- //

export function issueSessionToken(params: {
  userKey?: string;
  email: string;
  name: string;
  authProvider: 'google' | 'institutional';
  registered: boolean;
  rolesVersion: number;
  isDemoSession?: boolean;
  ttlSeconds?: number;
}): { token: string; payload: SessionTokenPayload } {
  const now = Date.now();
  const ttlMs = Math.max(5, params.ttlSeconds || 30 * 60) * 1000;
  const payload: SessionTokenPayload = {
    sid: crypto.randomUUID(),
    userKey: params.userKey,
    email: params.email,
    name: params.name,
    authProvider: params.authProvider,
    registered: params.registered,
    rolesVersion: params.rolesVersion,
    isDemoSession: params.isDemoSession,
    iat: now,
    exp: now + ttlMs,
  };

  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return { token: `${encoded}.${sig}`, payload };
}

export function verifySessionToken(
  token: string | undefined | null
): { status: 'VALID'; payload: SessionTokenPayload } | { status: 'MISSING' | 'INVALID' | 'EXPIRED' } {
  if (!token || typeof token !== 'string') return { status: 'MISSING' };
  const parts = token.split('.');
  if (parts.length !== 2) return { status: 'INVALID' };
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { status: 'INVALID' };
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionTokenPayload;
    if (revokedSessionIds.has(payload.sid) || Date.now() > payload.exp) {
      return { status: 'EXPIRED' };
    }
    return { status: 'VALID', payload };
  } catch {
    return { status: 'INVALID' };
  }
}

export function revokeSession(sid: string) {
  if (sid) revokedSessionIds.add(sid);
}

// --------------- Data Scoping Helpers --------------- //

export function getPublicSchoolInfo() {
  return {
    name: 'Tattvaswayam Open Learning Resource Centre & Future Academy',
    shortName: 'Tattvaswayam Future Academy',
    address: '#2060, Sampigehalli, Jakkur, Bengaluru 560064',
    phone: '+91-76250-03355',
    email: 'info@tattvaswayam.com',
    website: 'https://www.tattvaswayam.com/',
    hours: 'Mon – Fri · 8:30 AM – 3:30 PM',
    curriculum: 'NEP 2020 Open Learning · CBSE, Cambridge Assessment & NIOS Assessment Pathways',
    stages: [
      'Inizio (Ages 3.8 – 5.8 yrs)',
      'Novitiate (Ages 5.9 – 10 yrs · Grades 1–5)',
      'Mezzo (Ages 11 – 14 yrs · Grades 6–8)',
      'Adroit (Ages 15 – 19 yrs · Grades 9–12)',
    ],
    announcements: [
      {
        id: 'ANN-PUB-1',
        title: 'Admissions Open for 2026–27 (Inizio to Adroit)',
        category: 'Admissions',
        date: '2026-11-12',
        content: 'Family campus walkthroughs and interactive learning conversations with Centre Head Amrita and Chief Administrator Sangeetha are open for the 2026–27 academic year.',
        author: 'School Admissions Office',
      },
      {
        id: 'ANN-PUB-2',
        title: 'Swayam Vichar Manch & Young Farmers Showcase',
        category: 'Campus Life',
        date: '2026-11-10',
        content: 'Learners from Novitiate, Mezzo, and Adroit cohorts will present ecological sustainability projects and TURN Reading Nook dialogues at the Sampigehalli amphitheatre.',
        author: 'Tattvaswayam Community Desk',
      },
      {
        id: 'ANN-PUB-3',
        title: 'Winter Break & Term 2 Reopening Schedule',
        category: 'Circular',
        date: '2026-11-05',
        content: 'School offices at #2060 Sampigehalli remain open Monday through Friday from 9:00 AM to 4:00 PM for parent consultations and new registrations.',
        author: 'Administration',
      },
    ],
  };
}

export function getScopedReportsForUser(user: RegisteredUserRecord): ScopedStudentReport[] {
  const allStudents: ScopedStudentReport[] = Object.values(db.users)
    .filter((u) => u.roles.includes('student') && u.linkedStudentKey)
    .map((u) => ({
      studentKey: u.linkedStudentKey!,
      studentId: u.id,
      name: u.name,
      grade: u.title,
      optedSubjects: u.optedSubjects || ALL_SUBJECTS.slice(0, 7),
      scores: u.scores || [95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95],
      attendancePercent: u.linkedStudentKey === 'vivan' ? 96.4 : 94.8,
      presentDays: u.linkedStudentKey === 'vivan' ? 29 : 28,
      totalDays: 30,
    }));

  // Admin / Principal / Support Staff see all student reports
  if (user.roles.some((r) => r === 'admin' || r === 'principal' || r === 'support')) {
    return allStudents;
  }

  const allowedKeys = new Set<string>();
  if (user.roles.includes('student') && user.linkedStudentKey) {
    allowedKeys.add(user.linkedStudentKey);
  }
  if (user.roles.includes('parent') && user.childrenKeys) {
    for (const ck of user.childrenKeys) allowedKeys.add(ck);
  }
  if (user.roles.includes('teacher') && user.assignedClasses) {
    for (const st of allStudents) {
      if (user.assignedClasses.includes(st.grade)) {
        allowedKeys.add(st.studentKey);
      }
    }
  }

  return allStudents.filter((st) => allowedKeys.has(st.studentKey));
}

export function getScopedHomeworkForUser(user: RegisteredUserRecord): ScopedHomeworkItem[] {
  if (user.roles.some((r) => r === 'admin' || r === 'principal' || r === 'support')) {
    return db.homework;
  }

  const allowedGrades = new Set<string>(user.assignedClasses || []);
  if (user.roles.includes('student') && user.title) {
    allowedGrades.add(user.title);
  }
  if (user.roles.includes('parent') && user.childrenKeys) {
    for (const ck of user.childrenKeys) {
      const childUser = db.users[ck];
      if (childUser?.title) allowedGrades.add(childUser.title);
    }
  }

  return db.homework
    .filter((item) => allowedGrades.has(item.classGrade))
    .map((item) => {
      // Parents and Students only see their own / children's completion flags
      if (!user.roles.some((r) => r === 'teacher' || r === 'admin' || r === 'support' || r === 'principal')) {
        const visibleKeys = new Set<string>(user.childrenKeys || []);
        if (user.linkedStudentKey) visibleKeys.add(user.linkedStudentKey);
        const scopedDone: Record<string, boolean> = {};
        for (const k of visibleKeys) {
          if (item.done[k] !== undefined) scopedDone[k] = item.done[k];
        }
        return { ...item, done: scopedDone };
      }
      return item;
    });
}

export function addScopedHomework(
  user: RegisteredUserRecord,
  payload: { subject: string; title: string; due: string; classGrade?: string }
): { ok: true; item: ScopedHomeworkItem } | { ok: false; error: string } {
  const targetGrade = payload.classGrade || user.assignedClasses?.[0] || 'Grade 10-A';

  // Facilitators may ONLY publish for their assigned classes (unless also admin/support/principal)
  const isGlobalStaff = user.roles.some((r) => r === 'admin' || r === 'principal' || r === 'support');
  if (!isGlobalStaff && (!user.assignedClasses || !user.assignedClasses.includes(targetGrade))) {
    return {
      ok: false,
      error: `Access Denied: You are only authorized to publish homework for assigned classes (${(user.assignedClasses || []).join(', ') || 'None'}).`,
    };
  }

  const newItem: ScopedHomeworkItem = {
    id: `ASG-${Date.now().toString().slice(-4)}`,
    subject: payload.subject,
    title: payload.title,
    due: payload.due,
    by: user.name,
    classGrade: targetGrade,
    done: {},
  };
  db.homework.unshift(newItem);
  persistDatabase();
  return { ok: true, item: newItem };
}

export function toggleHomeworkDone(
  user: RegisteredUserRecord,
  assignmentId: string,
  targetStudentKey?: string
): { ok: true; item: ScopedHomeworkItem } | { ok: false; error: string } {
  const item = db.homework.find((h) => h.id === assignmentId);
  if (!item) return { ok: false, error: 'Assignment not found.' };

  const studentKey = targetStudentKey || user.linkedStudentKey || user.childrenKeys?.[0];
  if (!studentKey) {
    return { ok: false, error: 'No linked student profile for completion toggle.' };
  }
  const canToggle =
    user.linkedStudentKey === studentKey ||
    (user.childrenKeys && user.childrenKeys.includes(studentKey)) ||
    user.roles.some((r) => r === 'admin' || r === 'support' || r === 'teacher');
  if (!canToggle) {
    return { ok: false, error: 'Access Denied: Cannot update another student’s homework status.' };
  }

  item.done[studentKey] = !item.done[studentKey];
  persistDatabase();
  return { ok: true, item };
}

export function getScopedCalendarForUser(user: RegisteredUserRecord) {
  const isStaff = user.roles.some((r) => r === 'admin' || r === 'principal' || r === 'support');
  const visibleCounseling = isStaff
    ? db.counseling
    : db.counseling.filter((c) => c.by === user.userKey || (user.childrenKeys || []).includes(c.by.replace(/^p/, '')));

  return {
    events: db.calendarEvents,
    counseling: visibleCounseling,
  };
}

export function addCalendarEvent(event: { date: string; title: string; type: string; description?: string }) {
  const created = {
    id: `EV-${Date.now().toString().slice(-4)}`,
    date: event.date,
    title: event.title,
    type: event.type || 'exam',
    description: event.description || '',
  };
  db.calendarEvents.push(created);
  persistDatabase();
  return created;
}

export function getScopedBusTrackerForUser(user: RegisteredUserRecord) {
  const isOperationalStaff = user.roles.some(
    (r) => r === 'admin' || r === 'principal' || r === 'support' || r === 'driver' || r === 'security'
  );

  // Operational staff see full passenger manifest & route controls; Parents/Students see ONLY own/children's records (no PII leak of other children)
  let scopedPassengers = SEED_BUS_PASSENGERS;
  let scopeDescription = 'Full Route 14 Operations Scope';

  if (!isOperationalStaff) {
    const allowedUserKeys = new Set<string>();
    if (user.linkedStudentKey) allowedUserKeys.add(user.linkedStudentKey);
    if (user.childrenKeys) {
      for (const ck of user.childrenKeys) allowedUserKeys.add(ck);
    }
    scopedPassengers = SEED_BUS_PASSENGERS.filter(
      (p) => p.userKey && allowedUserKeys.has(p.userKey)
    );
    scopeDescription =
      user.roles.includes('parent') && user.childrenKeys?.length
        ? `Scoped to Child Route: ${user.childrenKeys.map((k) => db.users[k]?.name || k).join(', ')}`
        : 'Scoped to Student Route';
  }

  return {
    routeNumber: 'Route 14',
    routeName: 'North Bengaluru Express • Yelahanka – Jakkur',
    driverName: 'Mr. Manjunath Gowda',
    driverPhone: isOperationalStaff ? '+91 98450 44210' : 'Verified Fleet Pilot',
    vehicleNumber: 'KA-04-FA-2026',
    liveStatus: 'ON_SCHEDULE',
    scopeDescription,
    stops: [
      { id: 1, name: 'Yelahanka Satellite Town 4th Phase', timeScheduled: '07:20 AM', eta: 'Departed', status: 'passed' },
      { id: 2, name: 'Judicial Layout Gate', timeScheduled: '07:35 AM', eta: 'Departed', status: 'passed' },
      { id: 3, name: 'Sahakar Nagar Main Cross', timeScheduled: '07:50 AM', eta: '07:49 AM', status: 'current' },
      { id: 4, name: 'Amruthahalli Signal Junction', timeScheduled: '08:05 AM', eta: '08:05 AM', status: 'upcoming' },
      { id: 5, name: 'Tattvaswayam Future Academy, Gate 2 (#2060 Sampigehalli)', timeScheduled: '08:18 AM', eta: '08:18 AM', status: 'upcoming' },
    ],
    passengers: scopedPassengers,
  };
}
