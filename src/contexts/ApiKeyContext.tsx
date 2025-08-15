import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiKeyContextType {
  isApiKeyValid: boolean;
  setApiKeyValid: (valid: boolean) => void;
  hasApiKey: boolean;
  checkApiKey: () => Promise<boolean>;
  refreshApiKeyStatus: () => Promise<boolean>;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const useApiKey = () => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};

interface ApiKeyProviderProps {
  children: React.ReactNode;
}

export const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const checkApiKey = async (): Promise<boolean> => {
    const storedKey = localStorage.getItem('openai_api_key');
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    const key = storedKey || envKey;
    
    // Basic format validation - if no key is found, clear everything
    if (!key || key === 'your_openai_api_key_here' || key.length < 10 || !key.startsWith('sk-')) {
      setHasApiKey(false);
      setIsApiKeyValid(false);
      // Clear any cached validation status
      localStorage.removeItem('api_key_validation_status');
      return false;
    }

    setHasApiKey(true);
    
    // Enhanced validation with fallback strategies
    try {
      // Strategy 1: Basic format validation
      const formatValid = key.startsWith('sk-') && key.length >= 20;
      if (!formatValid) {
        setIsApiKeyValid(false);
        return false;
      }

      // Strategy 2: Use backend validation to avoid CORS issues
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      try {
        const boundFetch = window.fetch.bind(window);
        const response = await boundFetch(`${backendUrl}/api/settings/validate-openai-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ apiKey: key })
        });
        
        const result = await response.json();
        
        // Handle both success responses and structured error responses from backend
        if (response.ok && result.success && result.valid) {
          setIsApiKeyValid(true);
          // Store validation status with timestamp for AI services to check
          const validationData = { 
            openai: true, 
            timestamp: Date.now(),
            backendUrl: backendUrl 
          };
          localStorage.setItem('api_key_validation_status', JSON.stringify(validationData));
          return true;
        } else {
          setIsApiKeyValid(false);
          // Handle both 400 status with JSON and other error cases
          const reason = result?.reason || `HTTP ${response.status}: ${response.statusText}`;
          const validationData = { 
            openai: false, 
            timestamp: Date.now(),
            backendUrl: backendUrl,
            reason: reason 
          };
          localStorage.setItem('api_key_validation_status', JSON.stringify(validationData));
          return false;
        }
        
      } catch (fetchError: any) {
        
        // Check if it's a network error (backend down) vs OpenAI API error
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          // Backend is down - definitely not AI ready
          setIsApiKeyValid(false);
          localStorage.setItem('api_key_validation_status', JSON.stringify({ openai: false }));
          return false;
        } else {
          // Other validation errors - also not AI ready
          setIsApiKeyValid(false);
          localStorage.setItem('api_key_validation_status', JSON.stringify({ openai: false }));
          return false;
        }
      }
      
    } catch (error: any) {
      // NO MORE DANGEROUS FALLBACKS! Require actual validation
      setIsApiKeyValid(false);
      localStorage.setItem('api_key_validation_status', JSON.stringify({ openai: false }));
      return false;
    }
  };

  const setApiKeyValid = (valid: boolean) => {
    setIsApiKeyValid(valid);
    if (valid) {
      setHasApiKey(true);
    }
  };

  const refreshApiKeyStatus = async (): Promise<boolean> => {
    // Clear cache and force fresh validation
    localStorage.removeItem('api_key_validation_status');
    setIsApiKeyValid(false);
    return await checkApiKey();
  };

  // Developer convenience: expose functions to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // @ts-ignore
      window.debugApiKey = {
        clearCache: () => {
          localStorage.removeItem('api_key_validation_status');
          localStorage.removeItem('last_backend_url');
          setIsApiKeyValid(false);
        },
        forceCheck: async () => {
          const result = await checkApiKey();
          return result;
        },
        getStatus: () => {
          const status = localStorage.getItem('api_key_validation_status');
          const lastUrl = localStorage.getItem('last_backend_url');
          const storedKey = localStorage.getItem('openai_api_key');
          return {
            status: status ? JSON.parse(status) : null, 
            lastUrl,
            currentValid: isApiKeyValid,
            hasStoredKey: !!storedKey,
            keyLength: storedKey?.length,
            keyPrefix: storedKey ? storedKey.substring(0, 8) + '...' : 'none'
          };
        },
        testValidation: async () => {
          const result = await checkApiKey();
          return result;
        }
      };
    }
  }, [isApiKeyValid]);

  useEffect(() => {
    // Check if key exists and validate it immediately
    const storedKey = localStorage.getItem('openai_api_key');
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    const key = storedKey || envKey;
    
    if (key && key.startsWith('sk-') && key.length >= 20) {
      setHasApiKey(true);
      
      // ALWAYS validate with backend on mount - no cached validation
      localStorage.removeItem('api_key_validation_status'); // Clear any stale cache
      setIsApiKeyValid(false); // Start as invalid until proven valid
      
      // Validate immediately
      checkApiKey().then(isValid => {
      }).catch(error => {
        console.error('🚨 Mount validation failed:', error);
        setIsApiKeyValid(false);
      });
    } else {
      setHasApiKey(false);
      setIsApiKeyValid(false);
      localStorage.removeItem('api_key_validation_status');
    }
    
    // Listen for storage changes (in case key is updated in another tab)
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'openai_api_key') {
        await checkApiKey();
      }
    };
    
    // Listen for custom events (when Settings page updates the key)
    const handleApiKeyUpdate = async () => {
      await checkApiKey();
    };
    
    // Listen for API key cleared events (when user starts typing new key)
    const handleApiKeyCleared = () => {
      setIsApiKeyValid(false);
      localStorage.removeItem('api_key_validation_status');
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('apiKeyUpdated', handleApiKeyUpdate);
    window.addEventListener('apiKeyCleared', handleApiKeyCleared);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('apiKeyUpdated', handleApiKeyUpdate);
      window.removeEventListener('apiKeyCleared', handleApiKeyCleared);
    };
  }, []);

  const value = {
    isApiKeyValid,
    setApiKeyValid,
    hasApiKey,
    checkApiKey,
    refreshApiKeyStatus
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;