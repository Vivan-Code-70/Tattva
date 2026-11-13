import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Activity } from 'lucide-react';
import { errorReportingService } from '../services/errorService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Report into our real-time telemetry stream!
    errorReportingService.report({
      message: `React Component Crash: ${error.message}`,
      severity: 'CRITICAL',
      category: 'RENDER_CRASH',
      stack: `${error.stack || ''}\nComponent Stack:${errorInfo.componentStack || ''}`,
      source: 'React Lifecycle ErrorBoundary',
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
          <div className="w-full max-w-md p-6 bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-900 rounded-2xl shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Subsystem Rendering Exception
            </h2>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              An unexpected rendering crash was intercepted. The incident, device state, and stack trace have been logged to the Real-Time Error Telemetry stream.
            </p>

            {this.state.error && (
              <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-left text-[11px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
