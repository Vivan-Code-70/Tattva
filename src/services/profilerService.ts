export interface NetworkPerformanceMetric {
  id: string;
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  transferSize: number;
  decodedBodySize: number;
  initiatorType: string;
}

export interface LongTaskMetric {
  id: string;
  startTime: number;
  duration: number;
  attribution?: string;
}

export interface MemoryMetric {
  timestamp: number;
  usedJSHeapSizeMb: number;
  totalJSHeapSizeMb: number;
  jsHeapSizeLimitMb: number;
}

export interface RenderProfileMetric {
  componentName: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

export interface PerformanceKPIs {
  fps: number;
  frameTimeMs: number;
  usedHeapMb: number;
  totalHeapMb: number;
  avgNetworkLatencyMs: number;
  totalNetworkRequests: number;
  totalBytesTransferredKb: number;
  longTaskCount: number;
  fcpMs: number | null;
  lcpMs: number | null;
}

class ProfilerService {
  private networkMetrics: NetworkPerformanceMetric[] = [];
  private longTasks: LongTaskMetric[] = [];
  private memoryHistory: MemoryMetric[] = [];
  private renderMetrics: RenderProfileMetric[] = [];
  private listeners: Set<() => void> = new Set();

  private fps = 60;
  private frameTimeMs = 16.6;
  private fcpMs: number | null = null;
  private lcpMs: number | null = null;

  private isProfiling = false;
  private animFrameId: number | null = null;
  private memoryInterval: NodeJS.Timeout | null = null;

  public init() {
    if (this.isProfiling || typeof window === 'undefined') return;
    this.isProfiling = true;

    // 1. Observe Resource Network Timings
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const res = entry as PerformanceResourceTiming;
            const item: NetworkPerformanceMetric = {
              id: `NET-${Math.random().toString(36).substring(2, 7)}`,
              name: res.name.length > 50 ? '…' + res.name.slice(-48) : res.name,
              entryType: res.entryType,
              startTime: Math.round(res.startTime),
              duration: Math.round(res.duration * 10) / 10,
              transferSize: res.transferSize || 0,
              decodedBodySize: res.decodedBodySize || 0,
              initiatorType: res.initiatorType || 'fetch',
            };
            this.networkMetrics.unshift(item);
            if (this.networkMetrics.length > 80) this.networkMetrics.pop();
          });
          this.notify();
        });
        resourceObserver.observe({ type: 'resource', buffered: true });
      } catch (e) {}

      // 2. Observe Long Tasks (>50ms main thread blocking)
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const item: LongTaskMetric = {
              id: `LT-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              startTime: Math.round(entry.startTime),
              duration: Math.round(entry.duration),
              attribution: (entry as any).attribution?.[0]?.name || 'Script Execution',
            };
            this.longTasks.unshift(item);
            if (this.longTasks.length > 50) this.longTasks.pop();
          });
          this.notify();
        });
        longTaskObserver.observe({ type: 'longtask', buffered: true });
      } catch (e) {}

      // 3. Observe Paint Timings (FCP & LCP)
      try {
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.fcpMs = Math.round(entry.startTime);
            }
          });
          this.notify();
        });
        paintObserver.observe({ type: 'paint', buffered: true });
      } catch (e) {}

      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.lcpMs = Math.round(lastEntry.startTime);
            this.notify();
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}
    }

    // 4. Measure FPS and Frame Render Time
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrame = (time: number) => {
      frameCount++;
      const delta = time - lastTime;
      if (delta >= 1000) {
        this.fps = Math.round((frameCount * 1000) / delta);
        this.frameTimeMs = Math.round((delta / frameCount) * 10) / 10;
        frameCount = 0;
        lastTime = time;
        this.notify();
      }
      this.animFrameId = requestAnimationFrame(measureFrame);
    };
    this.animFrameId = requestAnimationFrame(measureFrame);

    // 5. Sample Memory Usage
    this.sampleMemory();
    this.memoryInterval = setInterval(() => this.sampleMemory(), 2000);
  }

  private sampleMemory() {
    const memory = (performance as any)?.memory;
    if (memory) {
      const metric: MemoryMetric = {
        timestamp: Date.now(),
        usedJSHeapSizeMb: Math.round(memory.usedJSHeapSize / 1048576),
        totalJSHeapSizeMb: Math.round(memory.totalJSHeapSize / 1048576),
        jsHeapSizeLimitMb: Math.round(memory.jsHeapSizeLimit / 1048576),
      };
      this.memoryHistory.push(metric);
      if (this.memoryHistory.length > 30) this.memoryHistory.shift();
      this.notify();
    }
  }

  public recordRenderMetric(metric: RenderProfileMetric) {
    this.renderMetrics.unshift(metric);
    if (this.renderMetrics.length > 60) this.renderMetrics.pop();
    this.notify();
  }

  public getKPIs(): PerformanceKPIs {
    const totalRequests = this.networkMetrics.length;
    const avgLatency =
      totalRequests > 0
        ? Math.round(
            (this.networkMetrics.reduce((acc, curr) => acc + curr.duration, 0) / totalRequests) *
              10
          ) / 10
        : 0;
    const totalBytes =
      Math.round(
        this.networkMetrics.reduce((acc, curr) => acc + curr.transferSize, 0) / 1024
      );

    const latestMem = this.memoryHistory[this.memoryHistory.length - 1];

    return {
      fps: this.fps,
      frameTimeMs: this.frameTimeMs,
      usedHeapMb: latestMem?.usedJSHeapSizeMb || 24,
      totalHeapMb: latestMem?.totalJSHeapSizeMb || 48,
      avgNetworkLatencyMs: avgLatency,
      totalNetworkRequests: totalRequests,
      totalBytesTransferredKb: totalBytes,
      longTaskCount: this.longTasks.length,
      fcpMs: this.fcpMs,
      lcpMs: this.lcpMs,
    };
  }

  public getNetworkMetrics(): NetworkPerformanceMetric[] {
    return [...this.networkMetrics];
  }

  public getLongTasks(): LongTaskMetric[] {
    return [...this.longTasks];
  }

  public getMemoryHistory(): MemoryMetric[] {
    return [...this.memoryHistory];
  }

  public getRenderMetrics(): RenderProfileMetric[] {
    return [...this.renderMetrics];
  }

  public clearMetrics() {
    this.networkMetrics = [];
    this.longTasks = [];
    this.renderMetrics = [];
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {}
    });
  }
}

export const profilerService = new ProfilerService();
