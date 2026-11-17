import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  addCalendarEvent,
  addScopedHomework,
  createRegisteredUser,
  deleteRegisteredUser,
  findRegisteredUserByEmail,
  getPermissionsForRoles,
  getPublicSchoolInfo,
  getRegisteredUserByKey,
  getScopedBusTrackerForUser,
  getScopedCalendarForUser,
  getScopedHomeworkForUser,
  getScopedReportsForUser,
  issueSessionToken,
  listAllRegisteredUsers,
  ProtectedFeature,
  RegisteredUserRecord,
  revokeSession,
  SessionTokenPayload,
  toggleHomeworkDone,
  UNREGISTERED_ERROR_MESSAGE,
  updateRegisteredUser,
  UserRole,
  verifyGoogleFirebaseIdToken,
  verifyInstitutionalCredentials,
  verifySessionToken,
} from './server/rbacStore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

function getPort(): number {
  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    const parsed = parseInt(process.argv[portIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Outside AI Studio's nginx proxy (where PORT=8080 is for nginx), honor local PORT env
  if (!process.env.CONTROL_PLANE_PORT && process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort) && envPort > 0) return envPort;
  }
  if (isProd && process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort) && envPort > 0) return envPort;
  }
  return 3000;
}

function getHost(): string | undefined {
  const hostIndex = process.argv.indexOf('--host');
  if (hostIndex !== -1 && process.argv[hostIndex + 1]) {
    return process.argv[hostIndex + 1];
  }
  if (process.env.HOST) {
    return process.env.HOST;
  }
  // Leaving host undefined binds dual-stack (IPv4 127.0.0.1 + IPv6 ::1) for local browsers
  return undefined;
}

const PORT = getPort();
const HOST = getHost();

const app = express();
app.use(express.json({ limit: '1mb' }));

// --------------- Session & RBAC Middleware --------------- //

const SESSION_COOKIE_NAME = 'ts_rbac_session';

function parseCookies(req: express.Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function extractSessionToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function setSessionCookie(res: express.Response, token: string, ttlSeconds: number = 1800) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ttlSeconds}`,
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res: express.Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function buildSessionUserProfile(record: RegisteredUserRecord, authProvider: 'google' | 'institutional') {
  return {
    id: record.id,
    userKey: record.userKey,
    name: record.name,
    role: record.primaryRole,
    roles: record.roles,
    title: record.title,
    email: record.email,
    phone: record.phone,
    assignedClasses: record.assignedClasses,
    childrenKeys: record.childrenKeys,
    child: record.childrenKeys?.[0],
    linkedStudentKey: record.linkedStudentKey,
    assignedBusRoute: record.assignedBusRoute,
    authProvider,
    isRegistered: true,
    scores: record.scores,
    optedSubjects: record.optedSubjects,
  };
}

interface ResolvedAuthContext {
  status: 'UNAUTHENTICATED' | 'EXPIRED' | 'UNREGISTERED' | 'DISABLED' | 'REGISTERED';
  payload?: SessionTokenPayload;
  user?: RegisteredUserRecord;
  allowedFeatures: ProtectedFeature[];
}

function resolveAuthContext(req: express.Request): ResolvedAuthContext {
  const token = extractSessionToken(req);
  const verified = verifySessionToken(token);
  if (verified.status !== 'VALID') {
    if (verified.status === 'EXPIRED') {
      return { status: 'EXPIRED', allowedFeatures: [] };
    }
    return { status: 'UNAUTHENTICATED', allowedFeatures: [] };
  }

  const { payload } = verified;
  if (!payload.registered || !payload.userKey) {
    return { status: 'UNREGISTERED', payload, allowedFeatures: [] };
  }

  // Always resolve against live DB so role updates/revocations apply immediately
  const liveUser = getRegisteredUserByKey(payload.userKey) || findRegisteredUserByEmail(payload.email);
  if (!liveUser) {
    return { status: 'UNREGISTERED', payload, allowedFeatures: [] };
  }
  if (!liveUser.active) {
    return { status: 'DISABLED', payload, user: liveUser, allowedFeatures: [] };
  }

  return {
    status: 'REGISTERED',
    payload,
    user: liveUser,
    allowedFeatures: getPermissionsForRoles(liveUser.roles),
  };
}

function requireRegisteredFeature(feature: ProtectedFeature) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ctx = resolveAuthContext(req);
    if (ctx.status === 'UNAUTHENTICATED') {
      return res.status(401).json({
        error: 'Access Denied: Please sign in with a registered school account.',
        code: 'UNAUTHENTICATED',
      });
    }
    if (ctx.status === 'EXPIRED') {
      clearSessionCookie(res);
      return res.status(401).json({
        error: 'Access Denied: Your session has expired. Please sign in again.',
        code: 'SESSION_EXPIRED',
      });
    }
    if (ctx.status === 'UNREGISTERED') {
      return res.status(403).json({
        error: `Access Denied: ${UNREGISTERED_ERROR_MESSAGE}`,
        code: 'UNREGISTERED_ACCOUNT',
      });
    }
    if (ctx.status === 'DISABLED') {
      return res.status(403).json({
        error: 'Access Denied: Your school account has been deactivated. Contact Administration.',
        code: 'ACCOUNT_DISABLED',
      });
    }
    if (!ctx.allowedFeatures.includes(feature)) {
      return res.status(403).json({
        error: `Access Denied: Your role (${ctx.user!.roles.join(', ')}) does not permit access to ${feature.replace('_', ' ')}.`,
        code: 'FORBIDDEN_ROLE',
        requiredFeature: feature,
        currentRoles: ctx.user!.roles,
      });
    }

    (req as any).rbacUser = ctx.user;
    (req as any).rbacPayload = ctx.payload;
    (req as any).rbacFeatures = ctx.allowedFeatures;
    next();
  };
}

// In-memory Server Error Store for Real-Time Telemetry
interface ServerErrorReport {
  id: string;
  timestamp: number;
  timeFormatted: string;
  severity: string;
  category: string;
  message: string;
  stack?: string;
  source?: string;
  route?: string;
  user?: string;
  userRole?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  breadcrumbs?: any[];
  diagnostics?: any;
}

const serverErrors: ServerErrorReport[] = [];
const sseClients = new Set<express.Response>();

// Emergency Lockdown In-Memory State
interface EmergencyLockdownPayload {
  active: boolean;
  triggeredBy: string;
  triggeredRole: string;
  timestamp: number;
  reason?: string;
  location?: string;
  instructions?: string;
  resolvedAt?: number;
}

let emergencyLockdownState: EmergencyLockdownPayload = {
  active: false,
  triggeredBy: '',
  triggeredRole: '',
  timestamp: 0,
  reason: 'Immediate Campus Security & Safety Protocol',
  location: 'All Blocks (A, B, C) & Grounds, Jakkur Campus',
  instructions: 'Lock all classroom doors immediately. Remain away from windows. Turn off lights. Maintain complete silence. Stay in place until official ALL-CLEAR from Principal or Campus Security.',
};

// Gemini API Client setup
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// ----------------- Real-Time Error Reporting & SSE Endpoints -----------------

// SSE Stream for Real-Time Telemetry & Lockdown Sync
app.get('/api/errors/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial ping and current lockdown status immediately
  res.write(
    `data: ${JSON.stringify({
      type: 'CONNECTED',
      timestamp: Date.now(),
      lockdown: emergencyLockdownState,
    })}\n\n`
  );

  req.on('close', () => {
    sseClients.delete(res);
  });
});

function broadcastSSE(data: any) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Record an error from client or server
app.post('/api/errors', (req, res) => {
  const errorItem: ServerErrorReport = req.body;
  if (!errorItem || !errorItem.message) {
    return res.status(400).json({ error: 'Missing error message' });
  }

  // Deduplicate by ID or identical message within 5000ms
  const isDuplicate = serverErrors.some(
    (e) => (e.id && e.id === errorItem.id) || (e.message === errorItem.message && Math.abs(e.timestamp - errorItem.timestamp) < 5000)
  );
  if (!isDuplicate) {
    serverErrors.unshift(errorItem);
    if (serverErrors.length > 200) serverErrors.pop();
    broadcastSSE(errorItem);
  }

  res.status(200).json({ success: true, id: errorItem.id });
});

app.get('/api/errors', (req, res) => {
  res.json({
    errors: serverErrors,
    total: serverErrors.length,
    critical: serverErrors.filter((e) => e.severity === 'CRITICAL' && !e.resolved).length,
    unresolved: serverErrors.filter((e) => !e.resolved).length,
  });
});

app.post('/api/errors/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolvedBy } = req.body;
  const err = serverErrors.find((e) => e.id === id);
  if (err) {
    err.resolved = true;
    err.resolvedBy = resolvedBy || 'Admin';
    err.resolvedAt = Date.now();
    broadcastSSE({ type: 'RESOLVED', id, resolvedBy });
  }
  res.json({ success: true });
});

app.post('/api/errors/clear', (req, res) => {
  serverErrors.length = 0;
  broadcastSSE({ type: 'CLEARED' });
  res.json({ success: true });
});

// ----------------- Public School & RBAC Auth Endpoints -----------------

app.get('/api/public/school', (_req, res) => {
  res.json({ success: true, school: getPublicSchoolInfo() });
});

app.post('/api/auth/google', async (req, res) => {
  const { idToken, ttlSeconds } = req.body || {};
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({
      error: 'Missing Google sign-in ID token.',
      code: 'MISSING_TOKEN',
    });
  }

  try {
    const verifiedGoogle = await verifyGoogleFirebaseIdToken(idToken);
    const registeredUser = findRegisteredUserByEmail(verifiedGoogle.email);

    if (!registeredUser) {
      // Valid Google account, NOT in school database -> UNREGISTERED limited session
      const ttl = typeof ttlSeconds === 'number' && ttlSeconds > 0 ? ttlSeconds : 1800;
      const { token, payload } = issueSessionToken({
        email: verifiedGoogle.email,
        name: verifiedGoogle.name,
        authProvider: 'google',
        registered: false,
        rolesVersion: 0,
        ttlSeconds: ttl,
      });
      setSessionCookie(res, token, ttl);
      return res.json({
        state: 'UNREGISTERED',
        authenticated: true,
        registered: false,
        email: verifiedGoogle.email,
        name: verifiedGoogle.name,
        authProvider: 'google',
        user: null,
        roles: [],
        allowedFeatures: [],
        expiresAt: payload.exp,
        token,
        message: UNREGISTERED_ERROR_MESSAGE,
      });
    }

    if (!registeredUser.active) {
      return res.status(403).json({
        error: 'Your school account has been deactivated. Please contact the school office.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    const ttl = typeof ttlSeconds === 'number' && ttlSeconds > 0 ? ttlSeconds : 1800;
    const { token, payload } = issueSessionToken({
      userKey: registeredUser.userKey,
      email: registeredUser.email,
      name: registeredUser.name,
      authProvider: 'google',
      registered: true,
      rolesVersion: registeredUser.rolesVersion,
      ttlSeconds: ttl,
    });
    setSessionCookie(res, token, ttl);

    return res.json({
      state: 'REGISTERED',
      authenticated: true,
      registered: true,
      email: registeredUser.email,
      name: registeredUser.name,
      authProvider: 'google',
      user: buildSessionUserProfile(registeredUser, 'google'),
      roles: registeredUser.roles,
      allowedFeatures: getPermissionsForRoles(registeredUser.roles),
      rolesVersion: registeredUser.rolesVersion,
      expiresAt: payload.exp,
      token,
    });
  } catch (err: any) {
    return res.status(401).json({
      error: err?.message || 'Unable to verify Google Sign-In token.',
      code: 'INVALID_GOOGLE_TOKEN',
    });
  }
});

app.post('/api/auth/credentials', (req, res) => {
  const { identifier, authMode, secretValue, isDemoSession, ttlSeconds } = req.body || {};
  if (!identifier || !authMode || !secretValue) {
    return res.status(400).json({ error: 'Institutional ID/email and credentials are required.' });
  }

  const check = verifyInstitutionalCredentials({ identifier, authMode, secretValue });
  if (!check.ok || !check.user) {
    return res.status(401).json({
      error: check.error || 'Authentication failed.',
      code: 'INVALID_CREDENTIALS',
    });
  }

  const ttl = typeof ttlSeconds === 'number' && ttlSeconds > 0 ? ttlSeconds : 1800;
  const { token, payload } = issueSessionToken({
    userKey: check.user.userKey,
    email: check.user.email,
    name: check.user.name,
    authProvider: 'institutional',
    registered: true,
    rolesVersion: check.user.rolesVersion,
    isDemoSession: !!isDemoSession,
    ttlSeconds: ttl,
  });
  setSessionCookie(res, token, ttl);

  res.json({
    state: 'REGISTERED',
    authenticated: true,
    registered: true,
    email: check.user.email,
    name: check.user.name,
    authProvider: 'institutional',
    user: buildSessionUserProfile(check.user, 'institutional'),
    roles: check.user.roles,
    allowedFeatures: getPermissionsForRoles(check.user.roles),
    rolesVersion: check.user.rolesVersion,
    expiresAt: payload.exp,
    isDemoSession: !!isDemoSession,
    token,
  });
});

app.post('/api/auth/demo-switch', (req, res) => {
  const ctx = resolveAuthContext(req);
  if (ctx.status !== 'REGISTERED' || !ctx.payload?.isDemoSession) {
    return res.status(403).json({
      error: 'Access Denied: Role switching is only available inside an active institutional demo session.',
      code: 'FORBIDDEN_ROLE_SWITCH',
    });
  }

  const { targetUserKey } = req.body || {};
  const targetUser = getRegisteredUserByKey(String(targetUserKey || ''));
  if (!targetUser || !targetUser.active) {
    return res.status(404).json({ error: 'Target account not found or inactive.' });
  }

  const ttl = 1800;
  const { token, payload } = issueSessionToken({
    userKey: targetUser.userKey,
    email: targetUser.email,
    name: targetUser.name,
    authProvider: 'institutional',
    registered: true,
    rolesVersion: targetUser.rolesVersion,
    isDemoSession: true,
    ttlSeconds: ttl,
  });
  setSessionCookie(res, token, ttl);

  res.json({
    state: 'REGISTERED',
    authenticated: true,
    registered: true,
    email: targetUser.email,
    name: targetUser.name,
    authProvider: 'institutional',
    user: buildSessionUserProfile(targetUser, 'institutional'),
    roles: targetUser.roles,
    allowedFeatures: getPermissionsForRoles(targetUser.roles),
    rolesVersion: targetUser.rolesVersion,
    expiresAt: payload.exp,
    isDemoSession: true,
    token,
  });
});

app.get('/api/auth/session', (req, res) => {
  const ctx = resolveAuthContext(req);
  if (ctx.status === 'UNAUTHENTICATED') {
    return res.json({
      state: 'UNAUTHENTICATED',
      authenticated: false,
      registered: false,
      user: null,
      roles: [],
      allowedFeatures: [],
    });
  }
  if (ctx.status === 'EXPIRED') {
    clearSessionCookie(res);
    return res.status(401).json({
      state: 'UNAUTHENTICATED',
      authenticated: false,
      registered: false,
      user: null,
      roles: [],
      allowedFeatures: [],
      code: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please sign in again.',
    });
  }
  if (ctx.status === 'UNREGISTERED') {
    return res.json({
      state: 'UNREGISTERED',
      authenticated: true,
      registered: false,
      email: ctx.payload?.email,
      name: ctx.payload?.name,
      authProvider: ctx.payload?.authProvider || 'google',
      user: null,
      roles: [],
      allowedFeatures: [],
      expiresAt: ctx.payload?.exp,
      message: UNREGISTERED_ERROR_MESSAGE,
    });
  }
  if (ctx.status === 'DISABLED') {
    clearSessionCookie(res);
    return res.status(403).json({
      state: 'UNAUTHENTICATED',
      authenticated: false,
      registered: false,
      user: null,
      roles: [],
      allowedFeatures: [],
      code: 'ACCOUNT_DISABLED',
      message: 'Your account has been deactivated by Administration.',
    });
  }

  return res.json({
    state: 'REGISTERED',
    authenticated: true,
    registered: true,
    email: ctx.user!.email,
    name: ctx.user!.name,
    authProvider: ctx.payload?.authProvider || 'institutional',
    user: buildSessionUserProfile(ctx.user!, ctx.payload?.authProvider || 'institutional'),
    roles: ctx.user!.roles,
    allowedFeatures: ctx.allowedFeatures,
    rolesVersion: ctx.user!.rolesVersion,
    expiresAt: ctx.payload?.exp,
    isDemoSession: !!ctx.payload?.isDemoSession,
  });
});

app.post('/api/auth/expire-session', (req, res) => {
  const token = extractSessionToken(req);
  const verified = verifySessionToken(token);
  if (verified.status === 'VALID') {
    revokeSession(verified.payload.sid);
  }
  clearSessionCookie(res);
  res.json({ success: true, code: 'SESSION_EXPIRED', message: 'Session marked expired.' });
});

app.post('/api/auth/logout', (req, res) => {
  const token = extractSessionToken(req);
  const verified = verifySessionToken(token);
  if (verified.status === 'VALID') {
    revokeSession(verified.payload.sid);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

// ----------------- Backend-Enforced Protected Feature APIs -----------------

app.get('/api/bus-tracker', requireRegisteredFeature('bus_tracker'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  res.json({
    success: true,
    busTracker: getScopedBusTrackerForUser(user),
    roles: user.roles,
  });
});

app.get('/api/homework', requireRegisteredFeature('homework'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  const canManage = getPermissionsForRoles(user.roles).includes('homework_manage');
  res.json({
    success: true,
    canManage,
    assignedClasses: user.assignedClasses || [],
    assignments: getScopedHomeworkForUser(user),
  });
});

app.post('/api/homework', requireRegisteredFeature('homework_manage'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  const { subject, title, due, classGrade } = req.body || {};
  if (!subject || !title || !due) {
    return res.status(400).json({ error: 'Subject, title, and due date are required.' });
  }
  const result = addScopedHomework(user, { subject, title, due, classGrade });
  if (!result.ok) {
    return res.status(403).json({ error: result.error, code: 'CLASS_SCOPE_DENIED' });
  }
  res.status(201).json({ success: true, assignment: result.item });
});

app.patch('/api/homework/:id/toggle', requireRegisteredFeature('homework'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  const { id } = req.params;
  const { studentKey } = req.body || {};
  const result = toggleHomeworkDone(user, id, studentKey);
  if (!result.ok) {
    return res.status(403).json({ error: result.error, code: 'HOMEWORK_SCOPE_DENIED' });
  }
  res.json({ success: true, assignment: result.item });
});

app.get('/api/calendar', requireRegisteredFeature('calendar'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  const canEdit = user.roles.some((r) => r === 'admin' || r === 'principal' || r === 'support' || r === 'teacher');
  res.json({
    success: true,
    canEdit,
    ...getScopedCalendarForUser(user),
  });
});

app.post('/api/calendar', requireRegisteredFeature('calendar'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  const canEdit = user.roles.some((r) => r === 'admin' || r === 'principal' || r === 'support' || r === 'teacher');
  if (!canEdit) {
    return res.status(403).json({
      error: 'Access Denied: Only Staff or Facilitators may publish calendar events.',
      code: 'FORBIDDEN_ROLE',
    });
  }
  const { date, title, type, description } = req.body || {};
  if (!date || !title) {
    return res.status(400).json({ error: 'Date and title are required.' });
  }
  const event = addCalendarEvent({ date, title, type, description });
  res.status(201).json({ success: true, event });
});

app.get('/api/reports', requireRegisteredFeature('reports'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  const reports = getScopedReportsForUser(user);
  res.json({
    success: true,
    roles: user.roles,
    assignedClasses: user.assignedClasses || [],
    childrenKeys: user.childrenKeys || [],
    reports,
  });
});

app.get('/api/reports/:studentKey', requireRegisteredFeature('reports'), (req, res) => {
  const user = (req as any).rbacUser as RegisteredUserRecord;
  const { studentKey } = req.params;
  const allowedReports = getScopedReportsForUser(user);
  const found = allowedReports.find((r) => r.studentKey === studentKey);
  if (!found) {
    return res.status(403).json({
      error: `Access Denied: You are not authorized to view scholastic reports for "${studentKey}".`,
      code: 'REPORT_SCOPE_DENIED',
    });
  }
  res.json({ success: true, report: found });
});

// ----------------- Admin RBAC User & Role Management -----------------

app.get('/api/admin/users', requireRegisteredFeature('admin_users'), (_req, res) => {
  res.json({ success: true, users: listAllRegisteredUsers() });
});

app.post('/api/admin/users', requireRegisteredFeature('admin_users'), (req, res) => {
  const { email, name, roles, title, assignedClasses, childrenKeys, linkedStudentKey } = req.body || {};
  if (!email || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'Valid email and at least one role are required.' });
  }
  try {
    const created = createRegisteredUser({
      email,
      name: name || email.split('@')[0],
      roles: roles as UserRole[],
      title,
      assignedClasses,
      childrenKeys,
      linkedStudentKey,
    });
    res.status(201).json({ success: true, user: created });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to register user.' });
  }
});

app.patch('/api/admin/users/:userKey', requireRegisteredFeature('admin_users'), (req, res) => {
  const { userKey } = req.params;
  const updated = updateRegisteredUser(userKey, req.body || {});
  if (!updated) {
    return res.status(404).json({ error: 'User record not found.' });
  }
  res.json({ success: true, user: updated });
});

app.delete('/api/admin/users/:userKey', requireRegisteredFeature('admin_users'), (req, res) => {
  try {
    const ok = deleteRegisteredUser(req.params.userKey);
    if (!ok) return res.status(404).json({ error: 'User not found.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Cannot delete user.' });
  }
});

// ----------------- Emergency Lockdown Endpoints -----------------

app.get('/api/lockdown', (req, res) => {
  res.json({ success: true, lockdown: emergencyLockdownState });
});

app.post('/api/lockdown', (req, res) => {
  const ctx = resolveAuthContext(req);
  if (ctx.status !== 'REGISTERED' || !ctx.user?.roles.some((r) => r === 'principal' || r === 'security' || r === 'admin')) {
    return res.status(403).json({
      error: 'Access Denied: Only Campus Security, Centre Head, or Administration may toggle lockdown.',
      code: 'FORBIDDEN_ROLE',
    });
  }
  const { active, triggeredBy, triggeredRole, reason, location, instructions } = req.body;
  const now = Date.now();

  emergencyLockdownState = {
    active: !!active,
    triggeredBy: triggeredBy || (active ? 'Campus Authority' : emergencyLockdownState.triggeredBy),
    triggeredRole: triggeredRole || (active ? 'security' : emergencyLockdownState.triggeredRole),
    timestamp: active ? now : emergencyLockdownState.timestamp,
    reason: reason || (active ? 'Immediate Campus Security & Safety Protocol' : emergencyLockdownState.reason),
    location: location || 'All Blocks (A, B, C) & Grounds, Jakkur Campus',
    instructions:
      instructions ||
      'Lock all classroom doors immediately. Remain away from windows. Turn off lights. Maintain complete silence. Stay in place until official ALL-CLEAR from Principal or Campus Security.',
    resolvedAt: active ? undefined : now,
  };

  // Broadcast to all connected clients over SSE immediately
  broadcastSSE({
    type: 'LOCKDOWN_UPDATE',
    lockdown: emergencyLockdownState,
  });

  // Log in system events/audit store
  const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  serverErrors.unshift({
    id: `AUD-LOCKDOWN-${now}`,
    timestamp: now,
    timeFormatted,
    severity: active ? 'CRITICAL' : 'INFO',
    category: 'AUTH_SECURITY',
    message: active
      ? `EMERGENCY LOCKDOWN INITIATED by ${emergencyLockdownState.triggeredBy} (${emergencyLockdownState.triggeredRole}): ${emergencyLockdownState.reason}`
      : `Emergency Lockdown LIFTED by ${triggeredBy || 'Authority'} (ALL CLEAR ISSUED)`,
    resolved: !active,
    resolvedBy: active ? undefined : triggeredBy || 'Authority',
    resolvedAt: active ? undefined : now,
  });
  if (serverErrors.length > 200) serverErrors.pop();

  console.log(`[Lockdown] State updated: active=${emergencyLockdownState.active} by ${emergencyLockdownState.triggeredBy}`);
  res.json({ success: true, lockdown: emergencyLockdownState });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    sseClientsCount: sseClients.size,
    aiAvailable: !!aiClient,
  });
});

// ----------------- AI Services Endpoints (RBAC Protected) -----------------

// Student study assistant query
app.post('/api/ai/ask', requireRegisteredFeature('homework'), async (req, res) => {
  const { subject, question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the senior study assistant of Tattvaswayam Future Academy in Bengaluru, India.
Subject: ${subject}
Question: ${question}
Provide a clear, engaging, pedagogically rigorous answer in under 140 words, citing the primary conceptual principle and experimental context.`,
      });
      return res.json({ answer: response.text });
    } catch (e: any) {
      console.warn('Gemini generateContent error in /api/ai/ask:', e?.message);
    }
  }

  // Fallback handled cleanly on client
  res.json({ answer: null });
});

// Teacher lesson planner
app.post('/api/ai/lesson-plan', requireRegisteredFeature('homework_manage'), async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You assist senior faculty at Tattvaswayam Future Academy, Bengaluru.
Draft a concise, structured 45-minute lesson plan for: "${topic}".
Include:
1. Learning Objectives (2 key points)
2. 45-minute breakdown with timings (Hook, Concept Development, Interactive Simulation, Formative Peer Activity, Synthesis)
3. One rigorous formative assessment question.`,
      });
      return res.json({ lessonPlan: response.text });
    } catch (e: any) {
      console.warn('Gemini generateContent error in /api/ai/lesson-plan:', e?.message);
    }
  }

  res.json({ lessonPlan: null });
});

// AI practice quiz generator
app.post('/api/ai/quiz', requireRegisteredFeature('homework'), async (req, res) => {
  const { subject, topic } = req.body;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create a 5-question multiple choice practice quiz for secondary school students at Tattvaswayam Future Academy on "${subject}" (Topic: ${topic || 'core concepts'}).
Return strictly valid JSON array of 5 objects with format:
[
  {
    "q": "question text",
    "options": ["option A", "option B", "option C", "option D"],
    "answer": 0, // 0-indexed integer of correct option
    "explanation": "concise explanation"
  }
]
Do not wrap in markdown or backticks. Return raw JSON array only.`,
      });

      const raw = response.text || '';
      const start = raw.indexOf('[');
      const end = raw.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        return res.json({ questions: parsed });
      }
    } catch (e: any) {
      console.warn('Gemini generateContent error in /api/ai/quiz:', e?.message);
    }
  }

  res.json({ questions: null });
});

// AI Report card remark generator
app.post('/api/ai/remark', requireRegisteredFeature('reports'), async (req, res) => {
  const { studentName, grade, scores } = req.body;

  if (aiClient) {
    try {
      const scoreStr = (scores || []).map((s: any) => `${s.subject}: ${s.score}%`).join(', ');
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Write a warm, discerning, specific 80-word report card remark for student ${studentName} (${grade}) at Tattvaswayam Future Academy based on these scores out of 100: ${scoreStr}.
Highlight one standout academic strength and one constructive growth focus area. Keep tone inspiring and academic.`,
      });
      return res.json({ remark: response.text });
    } catch (e: any) {
      console.warn('Gemini generateContent error in /api/ai/remark:', e?.message);
    }
  }

  res.json({ remark: null });
});

// AI Support Ticket Triager
app.post('/api/ai/triage', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You triage support messages for Tattvaswayam Future Academy school portal (login, OTP, assignments, timetable, fees, gate attendance, calendar, reports, library, counseling, leave, safety).
Analyze this message: "${message.slice(0, 500)}"
Reply ONLY with valid JSON:
{
  "valid": boolean, // true if reports genuine problem, question, or student safety concern
  "urgent": boolean, // true if involves student safety, bullying, distress, or severe outage
  "category": string, // short label like "Portal & Academic Systems", "Student Welfare", "Fees", or "General"
  "summary": string // 1-sentence summary
}
Do not use markdown backticks.`,
      });

      const raw = response.text || '';
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        return res.json(parsed);
      }
    } catch (e: any) {
      console.warn('Gemini generateContent error in /api/ai/triage:', e?.message);
    }
  }

  // Let client heuristic handle if AI unavailable
  res.json({ valid: true, urgent: false, category: 'General Support', summary: message.slice(0, 100) });
});

// ----------------- Vite Integration & Static Serving -----------------

async function startServer() {
  try {
    const distPath = path.join(__dirname, 'dist');
    const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));

    if (!isProd || !hasDistBuild) {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
          allowedHosts: true,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const onListening = () => {
      console.log(`[Tattvaswayam Portal] Server running at http://localhost:${PORT} (bind: ${HOST || 'all interfaces'})`);
    };

    const server = HOST ? app.listen(PORT, HOST, onListening) : app.listen(PORT, onListening);

    server.on('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        console.error(`[Tattvaswayam Portal] Port ${PORT} is already in use. Stop the existing server or run with PORT=3001.`);
      } else {
        console.error('[Tattvaswayam Portal] Server error:', err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('[Tattvaswayam Portal] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
