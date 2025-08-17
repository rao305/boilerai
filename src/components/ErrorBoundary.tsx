import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PurdueButton, Card } from '@/components/PurdueUI';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', 'ERROR_BOUNDARY', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    
    this.setState({
      error,
      errorInfo
    });

    // Log to external service in production
    if (import.meta.env.PROD) {
      // TODO: Report to external error tracking service
      // e.g., Sentry, LogRocket, etc.
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Card title="Something went wrong">
              <div className="text-sm text-neutral-300 space-y-2">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  An unexpected error occurred. This could be due to:
                </div>
                <ul className="list-disc list-inside text-neutral-400 space-y-1">
                  <li>A temporary issue with transcript processing</li>
                  <li>Network connectivity problems</li>
                  <li>Invalid file format or corrupted data</li>
                </ul>
              </div>
              <div className="mt-3 space-y-2">
                <PurdueButton onClick={this.handleReset} className="w-full">
                  <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Try Again</span>
                </PurdueButton>
                <PurdueButton variant="secondary" onClick={() => (window.location.href = '/')} className="w-full">
                  Go to Home
                </PurdueButton>
              </div>
            </Card>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-2 p-2 rounded text-xs ring-1 ring-neutral-800 bg-neutral-950/60">
                <summary className="cursor-pointer font-semibold">Error Details (Dev Mode)</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;