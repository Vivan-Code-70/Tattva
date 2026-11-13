import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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
  // In development and AI Studio preview environment, dev server must run on port 3000
  if (!isProd) {
    return 3000;
  }
  if (process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort) && envPort > 0) return envPort;
  }
  return 3000;
}

function getHost(): string {
  const hostIndex = process.argv.indexOf('--host');
  if (hostIndex !== -1 && process.argv[hostIndex + 1]) {
    return process.argv[hostIndex + 1];
  }
  return '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

const app = express();
app.use(express.json({ limit: '1mb' }));

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

// ----------------- Emergency Lockdown Endpoints -----------------

app.get('/api/lockdown', (req, res) => {
  res.json({ success: true, lockdown: emergencyLockdownState });
});

app.post('/api/lockdown', (req, res) => {
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

// ----------------- AI Services Endpoints -----------------

// Student study assistant query
app.post('/api/ai/ask', async (req, res) => {
  const { subject, question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the senior study assistant of Tattvasayam Future Academy in Bengaluru, India.
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
app.post('/api/ai/lesson-plan', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You assist senior faculty at Tattvasayam Future Academy, Bengaluru.
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
app.post('/api/ai/quiz', async (req, res) => {
  const { subject, topic } = req.body;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create a 5-question multiple choice practice quiz for secondary school students at Tattvasayam Future Academy on "${subject}" (Topic: ${topic || 'core concepts'}).
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
app.post('/api/ai/remark', async (req, res) => {
  const { studentName, grade, scores } = req.body;

  if (aiClient) {
    try {
      const scoreStr = (scores || []).map((s: any) => `${s.subject}: ${s.score}%`).join(', ');
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Write a warm, discerning, specific 80-word report card remark for student ${studentName} (${grade}) at Tattvasayam Future Academy based on these scores out of 100: ${scoreStr}.
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
        contents: `You triage support messages for Tattvasayam Future Academy school portal (login, OTP, assignments, timetable, fees, gate attendance, calendar, reports, library, counseling, leave, safety).
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
    if (!isProd) {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, HOST, () => {
      console.log(`[Tattvasayam Portal] Full-Stack server running at http://${HOST}:${PORT}`);
    });

    server.on('error', (err: any) => {
      console.error('[Tattvasayam Portal] Server error:', err);
    });
  } catch (error) {
    console.error('[Tattvasayam Portal] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
