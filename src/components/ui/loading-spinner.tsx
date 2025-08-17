import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export const LoadingSpinner = React.memo(function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
});

interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingText?: string;
  errorFallback?: React.ComponentType<{ error: string; retry?: () => void }>;
  retry?: () => void;
}

export const LoadingState = React.memo(function LoadingState({
  isLoading,
  error,
  children,
  loadingText = 'Loading...',
  errorFallback: ErrorComponent,
  retry,
}: LoadingStateProps) {
  if (error) {
    if (ErrorComponent) {
      return <ErrorComponent error={error} retry={retry} />;
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 mb-2">⚠️ Error</div>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        {retry && (
          <button
            onClick={retry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner text={loadingText} />
      </div>
    );
  }

  return <>{children}</>;
});