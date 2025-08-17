import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/utils/logger';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for managing async operations with loading states
 */
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const mountedRef = useRef(true);
  const lastCallId = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]) => {
      const callId = ++lastCallId.current;
      
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const data = await asyncFunction(...args);
        
        // Only update state if this is the most recent call and component is mounted
        if (callId === lastCallId.current && mountedRef.current) {
          setState({
            data,
            loading: false,
            error: null,
          });
          
          if (onSuccess) {
            onSuccess(data);
          }
        }
        
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        
        // Log error for debugging
        logger.error('Async operation failed', 'ASYNC_HOOK', {
          error: errorMessage,
          function: asyncFunction.name,
        });
        
        // Only update state if this is the most recent call and component is mounted
        if (callId === lastCallId.current && mountedRef.current) {
          setState({
            data: null,
            loading: false,
            error: errorMessage,
          });
          
          if (onError) {
            onError(error instanceof Error ? error : new Error(errorMessage));
          }
        }
        
        throw error;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // Only depend on immediate, not execute to avoid re-runs

  return {
    ...state,
    execute,
    reset,
    isIdle: !state.loading && !state.error && !state.data,
    isSuccess: !state.loading && !state.error && !!state.data,
    isError: !state.loading && !!state.error,
  };
}

/**
 * Hook specifically for API calls with retry functionality
 */
export function useAsyncApi<T>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions & { maxRetries?: number } = {}
) {
  const { maxRetries = 3, ...asyncOptions } = options;
  const [retryCount, setRetryCount] = useState(0);
  
  const asyncState = useAsync(apiCall, asyncOptions);

  const retry = useCallback(async () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      try {
        await asyncState.execute();
        setRetryCount(0); // Reset on success
      } catch (error) {
        // Error handling is done in useAsync
      }
    }
  }, [asyncState.execute, retryCount, maxRetries]);

  const reset = useCallback(() => {
    setRetryCount(0);
    asyncState.reset();
  }, [asyncState.reset]);

  return {
    ...asyncState,
    retry,
    reset,
    retryCount,
    canRetry: retryCount < maxRetries,
  };
}

/**
 * Hook for debounced async operations
 */
export function useDebouncedAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  delay: number = 500,
  options: UseAsyncOptions = {}
) {
  const asyncState = useAsync(asyncFunction, { ...options, immediate: false });
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedExecute = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        asyncState.execute(...args);
      }, delay);
    },
    [asyncState.execute, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...asyncState,
    execute: debouncedExecute,
    cancel,
  };
}