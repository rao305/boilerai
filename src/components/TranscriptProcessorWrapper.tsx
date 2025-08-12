import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

class TranscriptProcessorWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('❌ TranscriptProcessorWrapper caught error:', error);
    return { 
      hasError: true, 
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ TranscriptProcessorWrapper componentDidCatch:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Prevent infinite error loops
    if (this.state.retryCount > 3) {
      console.error('❌ Too many retries, stopping error recovery');
      return;
    }
  }

  handleRetry = () => {
    console.log('🔄 Retrying transcript processing...');
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoBack = () => {
    // Reset the component and navigate back
    this.setState({ hasError: false, error: undefined, retryCount: 0 });
    if (this.props.onReset) {
      this.props.onReset();
    }
    // Force a page refresh to ensure clean state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6">
            <Alert variant="destructive" className="border-red-200">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription>
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Transcript Processing Error</h3>
                  <p>
                    An error occurred while processing your transcript. This could be due to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Network connectivity issues</li>
                    <li>Invalid transcript format</li>
                    <li>AI service temporarily unavailable</li>
                    <li>Large file processing timeout</li>
                  </ul>
                  <div className="bg-red-50 p-3 rounded border border-red-200 mt-3">
                    <p className="text-sm font-medium text-red-800">
                      Don't worry - your data is safe and no mock data was used.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-3">
              <Button 
                onClick={this.handleRetry} 
                className="w-full"
                disabled={this.state.retryCount > 3}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {this.state.retryCount > 0 ? `Retry (${this.state.retryCount}/3)` : 'Try Again'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={this.handleGoBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Reset & Go Back
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-semibold mb-2">
                  Error Details (Development Mode)
                </summary>
                <div className="space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TranscriptProcessorWrapper;