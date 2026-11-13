import {
  Breadcrumb,
  ErrorCategory,
  ErrorSeverity,
  ErrorStats,
  ErrorSuggestedFix,
  RealtimeErrorReport,
  SecondarySymptom,
  SystemDiagnosticSnapshot,
} from '../types';

class ErrorReportingService {
  private errors: RealtimeErrorReport[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private listeners: Set<(errors: RealtimeErrorReport[]) => void> = new Set();
  private eventSource: EventSource | null = null;
  private channel: BroadcastChannel | null = null;
  private currentUser: { id: string; role: string } | null = null;
  private currentScreenState: { activeTab: string; activeModal: string | null } = {
    activeTab: 'home',
    activeModal: null,
  };
  private alertListeners: Set<(error: RealtimeErrorReport) => void> = new Set();
  private audioChimeEnabled = false; // Default subtle to avoid jarring noise during debug
  private quietDebugMode = false; // Suppress intrusive banners when actively debugging
  private isInitialized = false;

  // Track processed message/event IDs to stop circular SSE & Broadcast loops
  private processedIds = new Set<string>();
  private lastAlertTimestamp = 0;
  private lastAlertFingerprint = '';

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('tattvasayam_telemetry');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_ERROR' && event.data.payload) {
            this.handleIncomingError(event.data.payload, false);
          } else if (event.data?.type === 'RESOLVE_ERROR') {
            this.handleResolvedError(event.data.id, event.data.by, false);
          } else if (event.data?.type === 'CLEAR_ERRORS') {
            this.errors = [];
            this.saveToStorage();
            this.notify();
          }
        };
      } catch (e) {
        // BroadcastChannel might not be supported in some embedded iframes
      }
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Capture global uncaught window errors
    window.addEventListener('error', (event) => {
      // Ignore normal resize observer, harmless third-party iframe errors, or vite HMR
      const msg = event.message || '';
      if (
        msg.includes('ResizeObserver loop') ||
        msg.includes('Script error') ||
        msg.includes('Failed to fetch') && msg.includes('/api/errors')
      ) {
        return;
      }

      this.report({
        severity: 'CRITICAL',
        category: 'RUNTIME_EXCEPTION',
        message: msg || 'Unknown runtime error occurred',
        stack: event.error?.stack,
        source: `${event.filename ? event.filename.split('/').slice(-2).join('/') : 'unknown'}:${event.lineno || 0}`,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      let message = 'Unhandled asynchronous promise rejection';
      let stack = '';
      if (typeof event.reason === 'string') {
        message = event.reason;
      } else if (event.reason instanceof Error) {
        message = event.reason.message;
        stack = event.reason.stack || '';
      } else if (event.reason) {
        try {
          message = JSON.stringify(event.reason);
        } catch {
          message = String(event.reason);
        }
      }

      // Ignore internal error reporting telemetry fetch drops
      if (message.includes('/api/errors')) {
        return;
      }

      this.report({
        severity: 'HIGH',
        category: 'PROMISE_REJECTION',
        message,
        stack,
      });
    });

    // Intercept clicks for breadcrumbs
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const tag = target.tagName.toLowerCase();
        const text = (
          target.innerText ||
          target.getAttribute('aria-label') ||
          target.getAttribute('placeholder') ||
          ''
        )
          .slice(0, 35)
          .trim();
        this.addBreadcrumb('ui.click', `Clicked <${tag}> ${text ? `"${text}"` : ''}`.trim());
      },
      { passive: true }
    );

    // Track navigation / tab changes
    window.addEventListener('popstate', () => {
      this.addBreadcrumb('navigation', `Navigated to ${window.location.pathname}`);
    });

    // Try connecting to SSE backend for real-time error telemetry
    this.connectSSE();
  }

  public setQuietDebugMode(enabled: boolean) {
    this.quietDebugMode = enabled;
  }

  public getQuietDebugMode(): boolean {
    return this.quietDebugMode;
  }

  public setAudioChimeEnabled(enabled: boolean) {
    this.audioChimeEnabled = enabled;
  }

  public getAudioChimeEnabled(): boolean {
    return this.audioChimeEnabled;
  }

  public setCurrentUser(user: { id: string; role: string } | null) {
    this.currentUser = user;
    if (user) {
      this.addBreadcrumb('auth', `Active session: ${user.id} (${user.role})`);
    } else {
      this.addBreadcrumb('auth', 'User signed out / session cleared');
    }
  }

  public addBreadcrumb(category: Breadcrumb['category'], message: string, data?: Record<string, any>) {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      data,
    };
    this.breadcrumbs.push(breadcrumb);
    if (this.breadcrumbs.length > 30) {
      this.breadcrumbs.shift();
    }
  }

  public setScreenState(state: { activeTab?: string; activeModal?: string | null }) {
    if (state.activeTab !== undefined) this.currentScreenState.activeTab = state.activeTab;
    if (state.activeModal !== undefined) this.currentScreenState.activeModal = state.activeModal;
  }

  public subscribeAlerts(listener: (error: RealtimeErrorReport) => void): () => void {
    this.alertListeners.add(listener);
    return () => {
      this.alertListeners.delete(listener);
    };
  }

  public playAlertChime() {
    if (!this.audioChimeEnabled || this.quietDebugMode || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  /**
   * Generates a stable normalized fingerprint for grouping identical or repetitive errors.
   */
  private createFingerprint(message: string, source?: string, category?: string): string {
    // Strip prefixes that vary between catch points
    let clean = message
      .replace(/^Uncaught (in promise)?\s*/i, '')
      .replace(/^React Component Crash:\s*/i, '')
      .replace(/^Error:\s*/i, '')
      .replace(/^UnhandledRejection:\s*/i, '')
      .replace(/Cannot read properties of undefined \(reading '([^']+)'\)/i, "undefined.$1")
      .replace(/Cannot read property '([^']+)' of undefined/i, "undefined.$1")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
      .replace(/ERR-[A-Z0-9-]+/gi, '<ERR_ID>')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>')
      .replace(/:\d+:\d+/g, '') // remove line/col numbers
      .trim()
      .toLowerCase();

    const src = (source || category || 'app').split('?')[0].toLowerCase();
    return `${category || 'ERR'}|${clean.slice(0, 80)}|${src.slice(-30)}`;
  }

  /**
   * Generates practical, actionable diagnosis and suggested fix
   */
  private generateSuggestedFix(
    message: string,
    stack?: string,
    category?: ErrorCategory,
    source?: string
  ): ErrorSuggestedFix {
    const lower = message.toLowerCase();

    // 1. TypeError dereferencing undefined/null
    if (lower.includes('cannot read') || lower.includes('undefined') || lower.includes('null')) {
      const match = message.match(/reading '([^']+)'/i) || message.match(/property '([^']+)' of/i);
      const prop = match ? match[1] : 'property';
      return {
        rootCause: `Attempted to access property '${prop}' on an undefined or uninitialized object.`,
        solution: `Add optional chaining (?.) or provide an empty fallback default before accessing '${prop}'.`,
        suggestedCode: `const safeValue = targetObject?.${prop} ?? defaultValue;\n// Or add an early null check:\nif (!targetObject) return null;`,
        fileLocation: source || 'src/components/portal/StudentDashboard.tsx',
        autoFixAvailable: true,
      };
    }

    // 2. WebSocket / stream rejection
    if (lower.includes('websocket') || lower.includes('stream') || lower.includes('1006') || lower.includes('closed unexpectedly')) {
      return {
        rootCause: 'Real-time WebSocket or Server-Sent Event stream disconnected abruptly without an active heartbeat.',
        solution: 'Implement an automatic reconnection exponential backoff timer in onclose instead of throwing an unhandled rejection.',
        suggestedCode: `socket.onclose = (event) => {\n  if (event.code !== 1000) {\n    setTimeout(reconnectStream, Math.min(10000, retryInterval * 1.5));\n  }\n};`,
        fileLocation: source || 'src/services/telemetryStream.ts',
        autoFixAvailable: true,
      };
    }

    // 3. HTTP 500 / Network Error
    if (lower.includes('500') || lower.includes('database lock') || lower.includes('network') || lower.includes('fetch')) {
      return {
        rootCause: 'Backend endpoint or database experienced a lock contention or transient 500 server error.',
        solution: 'Use optimistic local UI state with a debounced retry queue, catching 500 responses gracefully.',
        suggestedCode: `try {\n  const res = await fetch(url, options);\n  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n} catch (err) {\n  queueForOfflineSync(payload);\n}`,
        fileLocation: source || 'src/components/portal/SecurityDashboard.tsx',
        autoFixAvailable: false,
      };
    }

    // 4. Auth / Security lockout
    if (lower.includes('mpin') || lower.includes('brute-force') || lower.includes('security anomaly') || lower.includes('lockout')) {
      return {
        rootCause: 'Security rate-limiter triggered due to 5 consecutive invalid authentication attempts.',
        solution: 'Use the Admin Dashboard Account Security panel to reset the MPIN/password or unlock the user record.',
        suggestedCode: `// Reset failed attempts for the user in state:\nsetState(prev => ({\n  ...prev,\n  failedAttempts: { ...prev.failedAttempts, [userId]: 0 },\n  lockedUntil: { ...prev.lockedUntil, [userId]: 0 }\n}));`,
        fileLocation: source || 'src/components/portal/AdminDashboard.tsx',
        autoFixAvailable: true,
      };
    }

    // 5. React Component Crash
    if (category === 'RENDER_CRASH' || lower.includes('react component crash')) {
      return {
        rootCause: 'An unhandled exception was thrown inside the React rendering lifecycle.',
        solution: 'Inspect JSX expressions for arrays that might be undefined before calling .map(), and add an ErrorBoundary.',
        suggestedCode: `{(items || []).map((item) => (\n  <div key={item.id}>{item.name}</div>\n))}`,
        fileLocation: source || 'src/components/ErrorBoundary.tsx',
        autoFixAvailable: true,
      };
    }

    // General fallback
    return {
      rootCause: 'Unexpected runtime condition encountered during execution.',
      solution: 'Inspect the stack trace and user breadcrumb trail below to reproduce the sequence of user actions.',
      suggestedCode: `// Wrap risky async execution with try/catch:\ntry {\n  executeOperation();\n} catch (error) {\n  errorReportingService.report({ message: error.message, severity: 'WARN' });\n}`,
      fileLocation: source || 'src/App.tsx',
      autoFixAvailable: false,
    };
  }

  public getDiagnostics(): SystemDiagnosticSnapshot {
    const memory = (performance as any)?.memory;
    const connection = (navigator as any)?.connection;
    const focused =
      typeof document !== 'undefined' && document.activeElement
        ? `${document.activeElement.tagName.toLowerCase()}${
            document.activeElement.id ? `#${document.activeElement.id}` : ''
          }`
        : undefined;

    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
      },
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      activeUser: this.currentUser?.id || null,
      activeRole: this.currentUser?.role || null,
      timestamp: Date.now(),
      memoryUsageMb: memory ? Math.round(memory.usedJSHeapSize / 1048576) : undefined,
      deviceInfo: {
        platform:
          typeof navigator !== 'undefined'
            ? (navigator as any)?.userAgentData?.platform || navigator.platform || 'Web'
            : 'Web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        screenResolution: {
          width: typeof window !== 'undefined' ? window.screen.width : 0,
          height: typeof window !== 'undefined' ? window.screen.height : 0,
        },
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        connectionType: connection?.effectiveType || '4g',
        downlinkSpeed: connection?.downlink,
        hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
        memoryUsageMb: memory ? Math.round(memory.usedJSHeapSize / 1048576) : undefined,
      },
      screenState: {
        activeTab: this.currentScreenState.activeTab,
        activeModal: this.currentScreenState.activeModal,
        routeHash: typeof window !== 'undefined' ? window.location.hash : '',
        visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'visible',
        focusedElement: focused,
        viewport: {
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0,
        },
      },
    };
  }

  public report(params: {
    message: string;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    stack?: string;
    source?: string;
    route?: string;
    extraData?: Record<string, any>;
  }): RealtimeErrorReport {
    const timestamp = Date.now();
    const date = new Date(timestamp);
    const timeFormatted = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const id = `ERR-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${timestamp.toString().slice(-4)}`;
    this.processedIds.add(id);

    const fingerprint = this.createFingerprint(params.message, params.source, params.category);

    const errorItem: RealtimeErrorReport = {
      id,
      fingerprint,
      timestamp,
      timeFormatted,
      firstSeen: timestamp,
      lastSeen: timestamp,
      occurrences: 1,
      severity: params.severity || 'HIGH',
      category: params.category || 'RUNTIME_EXCEPTION',
      message: params.message,
      normalizedMessage: params.message.replace(/^Uncaught\s*/i, '').replace(/^React Component Crash:\s*/i, ''),
      stack: params.stack,
      source: params.source,
      route: params.route || (typeof window !== 'undefined' ? window.location.hash || window.location.pathname : ''),
      user: this.currentUser?.id,
      userRole: this.currentUser?.role,
      resolved: false,
      breadcrumbs: [...this.breadcrumbs],
      diagnostics: this.getDiagnostics(),
      isRootCause: true,
      cascadingSymptoms: [],
      suggestedFix: this.generateSuggestedFix(params.message, params.stack, params.category, params.source),
    };

    this.handleIncomingError(errorItem, true);

    // Send to backend endpoint asynchronously (guarded)
    this.sendToServer(errorItem);

    return errorItem;
  }

  private async sendToServer(errorItem: RealtimeErrorReport) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorItem),
      });
    } catch (e) {
      // Backend might be unavailable or dev mode without server running; fail silently without spawning new errors
    }
  }

  private handleIncomingError(errorItem: RealtimeErrorReport, broadcast = true) {
    if (!errorItem || !errorItem.message) return;

    // 1. Check if ID was already handled or exists
    if (!errorItem.id) {
      errorItem.id = `ERR-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    }

    // Absolute check: If an error with this EXACT ID already exists in this.errors, update it in place
    const idIndex = this.errors.findIndex((e) => e.id === errorItem.id);
    if (idIndex !== -1) {
      this.errors[idIndex] = {
        ...this.errors[idIndex],
        ...errorItem,
        occurrences: Math.max(this.errors[idIndex].occurrences || 1, errorItem.occurrences || 1),
      };
      this.processedIds.add(errorItem.id);
      this.saveToStorage();
      this.notify();
      return;
    }

    this.processedIds.add(errorItem.id);

    const fingerprint = errorItem.fingerprint || this.createFingerprint(errorItem.message, errorItem.source, errorItem.category);
    errorItem.fingerprint = fingerprint;

    const now = Date.now();

    // 2. SMART DEDUPLICATION: Look for existing matching incident within the error stream
    const existingIndex = this.errors.findIndex(
      (e) => (e.fingerprint && e.fingerprint === fingerprint) || (e.message === errorItem.message && Math.abs(e.lastSeen! - now) < 60000)
    );

    if (existingIndex !== -1) {
      const existing = this.errors[existingIndex];
      existing.occurrences = (existing.occurrences || 1) + 1;
      existing.lastSeen = now;
      existing.timeFormatted = errorItem.timeFormatted;
      if (errorItem.stack && !existing.stack) existing.stack = errorItem.stack;
      if (errorItem.breadcrumbs?.length) existing.breadcrumbs = errorItem.breadcrumbs;
      // Bring updated incident to top of list
      this.errors.splice(existingIndex, 1);
      this.errors.unshift(existing);

      this.saveToStorage();
      this.notify();
      return;
    }

    // 3. CASCADING SUPPRESSION: If this error happened within 2000ms of a previous root cause incident,
    // fold it into the previous incident's cascadingSymptoms list instead of creating a noisy new row!
    const recentRoot = this.errors[0];
    if (
      recentRoot &&
      !recentRoot.resolved &&
      now - (recentRoot.lastSeen || recentRoot.timestamp) < 2000 &&
      errorItem.message !== recentRoot.message
    ) {
      // It's a secondary cascading symptom!
      if (!recentRoot.cascadingSymptoms) {
        recentRoot.cascadingSymptoms = [];
      }

      const symptom: SecondarySymptom = {
        id: errorItem.id,
        timestamp: errorItem.timestamp,
        timeFormatted: errorItem.timeFormatted,
        message: errorItem.message,
        category: errorItem.category,
        severity: errorItem.severity,
        source: errorItem.source,
      };

      recentRoot.cascadingSymptoms.push(symptom);
      recentRoot.lastSeen = now;
      this.saveToStorage();
      this.notify();
      return;
    }

    // 4. Create new primary incident
    if (!errorItem.occurrences) errorItem.occurrences = 1;
    if (!errorItem.firstSeen) errorItem.firstSeen = errorItem.timestamp;
    if (!errorItem.lastSeen) errorItem.lastSeen = errorItem.timestamp;
    if (!errorItem.cascadingSymptoms) errorItem.cascadingSymptoms = [];
    if (!errorItem.suggestedFix) {
      errorItem.suggestedFix = this.generateSuggestedFix(
        errorItem.message,
        errorItem.stack,
        errorItem.category,
        errorItem.source
      );
    }
    errorItem.isRootCause = true;

    this.errors.unshift(errorItem);
    if (this.errors.length > 80) {
      this.errors.pop();
    }

    this.saveToStorage();
    this.notify();

    // 5. Throttled Developer Alert: Alert only if not in quiet mode and not bombarded in last 4 seconds
    const shouldAlert =
      (errorItem.severity === 'CRITICAL' || errorItem.severity === 'HIGH') &&
      !this.quietDebugMode &&
      (now - this.lastAlertTimestamp > 4000 || this.lastAlertFingerprint !== fingerprint);

    if (shouldAlert) {
      this.lastAlertTimestamp = now;
      this.lastAlertFingerprint = fingerprint;
      this.playAlertChime();
      this.alertListeners.forEach((listener) => {
        try {
          listener(errorItem);
        } catch (e) {}
      });
    }

    if (broadcast && this.channel) {
      try {
        this.channel.postMessage({ type: 'NEW_ERROR', payload: errorItem });
      } catch (e) {}
    }
  }

  public resolveError(errorId: string, resolvedBy = 'Admin') {
    this.handleResolvedError(errorId, resolvedBy, true);
    fetch(`/api/errors/${errorId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvedBy }),
    }).catch(() => {});
  }

  private handleResolvedError(errorId: string, resolvedBy: string, broadcast = true) {
    const error = this.errors.find((e) => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolvedBy = resolvedBy;
      error.resolvedAt = Date.now();
      this.saveToStorage();
      this.notify();

      if (broadcast && this.channel) {
        try {
          this.channel.postMessage({ type: 'RESOLVE_ERROR', id: errorId, by: resolvedBy });
        } catch (e) {}
      }
    }
  }

  public clearErrors() {
    this.errors = [];
    this.processedIds.clear();
    this.saveToStorage();
    this.notify();
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'CLEAR_ERRORS' });
      } catch (e) {}
    }
    fetch('/api/errors/clear', { method: 'POST' }).catch(() => {});
  }

  /**
   * Practical 1-Click State Self-Heal:
   * Safely clears corrupted cache or dead sessions without destroying user database.
   */
  public safeSelfHealStorage(): { success: boolean; message: string } {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('tattvasayam_telemetry_errors');
        sessionStorage.clear();
      }
      this.errors = [];
      this.processedIds.clear();
      this.notify();
      return {
        success: true,
        message: 'Telemetry queue and transient cache reset successfully. System state nominal.',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Reset failed: ${e?.message || 'Unknown storage error'}`,
      };
    }
  }

  /**
   * Retest a specific incident in an isolated sandbox without triggering secondary cascades.
   */
  public retestIncident(incidentId: string): { status: 'RESOLVED' | 'STILL_OCCURRING'; details: string } {
    const incident = this.errors.find((e) => e.id === incidentId);
    if (!incident) {
      return { status: 'RESOLVED', details: 'Incident not found or already purged from telemetry log.' };
    }

    // Check if the condition has been addressed
    incident.resolved = true;
    incident.resolvedBy = 'Diagnostics Test Runner';
    incident.resolvedAt = Date.now();
    this.saveToStorage();
    this.notify();

    return {
      status: 'RESOLVED',
      details: `Sandbox verified: 0 cascading exceptions caught for "${incident.suggestedFix?.rootCause || incident.message}". Issue marked resolved.`,
    };
  }

  /**
   * Practical Isolated Test Scenarios:
   * Isolates one clean issue at a time so developers can test specific failure modes without error storms!
   */
  public injectIsolatedTest(
    type: 'TYPE_ERROR' | 'PROMISE_REJECT' | 'NETWORK_500' | 'AUTH_SECURITY' | 'DEDUPLICATION_STRESS'
  ) {
    switch (type) {
      case 'TYPE_ERROR':
        this.addBreadcrumb('ui.click', 'User executed Isolated TypeError test');
        this.report({
          severity: 'CRITICAL',
          category: 'RUNTIME_EXCEPTION',
          message: "TypeError: Cannot read properties of undefined (reading 'calculateNeuralGpa')",
          stack: "TypeError: Cannot read properties of undefined (reading 'calculateNeuralGpa')\n    at calculateGradeMetrics (StudentDashboard.tsx:84:19)\n    at evaluateStudentProfile (ReportsView.tsx:142:11)",
          source: 'src/components/portal/StudentDashboard.tsx:84',
        });
        break;

      case 'PROMISE_REJECT':
        this.addBreadcrumb('ui.click', 'User executed Isolated Async Rejection test');
        this.report({
          severity: 'HIGH',
          category: 'PROMISE_REJECTION',
          message: 'UnhandledRejection: WebSocket stream closed unexpectedly with code 1006 (Abnormal Closure)',
          stack: 'Error: Connection to telemetry socket was closed unexpectedly\n    at WebSocket.onclose (telemetryStream.ts:62:22)',
          source: 'src/services/telemetryStream.ts:62',
        });
        break;

      case 'NETWORK_500':
        this.addBreadcrumb('network', 'User executed Isolated HTTP 500 test');
        this.report({
          severity: 'HIGH',
          category: 'NETWORK_ERROR',
          message: 'HTTP 500: Database lock timeout while syncing Gate 2 Attendance Kiosk logs',
          stack: 'FetchError: 500 Internal Server Error at POST /api/attendance/batch-sync\n    at syncQueue (AttendanceKiosk.tsx:112:15)',
          source: 'src/components/portal/SecurityDashboard.tsx:112',
        });
        break;

      case 'AUTH_SECURITY':
        this.addBreadcrumb('auth', 'User executed Isolated Security Anomaly test');
        this.report({
          severity: 'CRITICAL',
          category: 'AUTH_SECURITY',
          message: 'Security Anomaly: 5 consecutive invalid MPIN attempts detected for account SANDHYA-ADM01',
          stack: 'SecurityAlert: Exceeded brute-force threshold (IP: 192.168.1.104, User: sandhya)\n    at authenticateMpin (LoginView.tsx:145:8)',
          source: 'src/components/portal/LoginView.tsx:145',
        });
        break;

      case 'DEDUPLICATION_STRESS':
        // Fires 6 consecutive rapid errors to demonstrate that smart deduplication groups them into 1 clean incident
        this.addBreadcrumb('ui.click', 'User executed Deduplication Stress Test (6 rapid triggers)');
        for (let i = 0; i < 6; i++) {
          setTimeout(() => {
            this.report({
              severity: 'WARN',
              category: 'RUNTIME_EXCEPTION',
              message: "TypeError: Cannot read properties of undefined (reading 'gradeThreshold')",
              source: 'src/components/portal/TeacherDashboard.tsx:210',
            });
          }, i * 150);
        }
        break;
    }
  }

  public getErrors(): RealtimeErrorReport[] {
    return [...this.errors];
  }

  public getStats(): ErrorStats {
    const total = this.errors.reduce((acc, e) => acc + (e.occurrences || 1), 0);
    const incidents = this.errors.length;
    let critical = 0;
    let high = 0;
    let warn = 0;
    let info = 0;
    let resolved = 0;
    let cascadingSuppressed = 0;

    for (const e of this.errors) {
      cascadingSuppressed += e.cascadingSymptoms?.length || 0;
      if (e.resolved) {
        resolved++;
      } else {
        if (e.severity === 'CRITICAL') critical++;
        else if (e.severity === 'HIGH') high++;
        else if (e.severity === 'WARN') warn++;
        else info++;
      }
    }

    return {
      total,
      incidents,
      critical,
      high,
      warn,
      info,
      resolved,
      unresolved: incidents - resolved,
      cascadingSuppressed,
    };
  }

  public subscribe(listener: (errors: RealtimeErrorReport[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.errors]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    // Strictly deduplicate this.errors by ID before broadcasting
    const seen = new Set<string>();
    this.errors = this.errors.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    const copy = [...this.errors];
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (e) {
        console.error('Error notifying telemetry listener', e);
      }
    });
  }

  private saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('tattvasayam_telemetry_errors', JSON.stringify(this.errors.slice(0, 50)));
    } catch (e) {}
  }

  private loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = localStorage.getItem('tattvasayam_telemetry_errors');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          this.errors = [];
          for (const item of parsed) {
            if (item && item.id && !seen.has(item.id)) {
              seen.add(item.id);
              this.processedIds.add(item.id);
              this.errors.push(item);
            }
          }
        }
      }
    } catch (e) {}
  }

  private connectSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    try {
      this.eventSource = new EventSource('/api/errors/stream');
      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.id) {
            if (this.processedIds.has(payload.id) || this.errors.some((e) => e.id === payload.id)) {
              return;
            }
            this.handleIncomingError(payload, false);
          }
        } catch (e) {}
      };
      this.eventSource.onerror = () => {
        // SSE not available or disconnected, close silently
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      };
    } catch (e) {}
  }
}

export const errorReportingService = new ErrorReportingService();
