import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { unifiedChatService } from '@/services/unifiedChatService';

interface ApiKeyContextType {
  isApiKeyValid: boolean;
  setApiKeyValid: (valid: boolean) => void;
  hasApiKey: boolean;
  checkApiKey: () => Promise<boolean>;
  refreshApiKeyStatus: () => Promise<boolean>;
  clearSessionApiKeys: () => void;
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

// Helper functions for user-specific API key storage (matching Settings.tsx)
function getUserApiKeys(userId?: string): { openai: string | null; gemini: string | null } {
  if (!userId) return { openai: null, gemini: null };
  
  // Check if user wants to remember API key
  const rememberKey = localStorage.getItem('remember_api_key') === 'true';
  if (!rememberKey) return { openai: '', gemini: '' };
  
  // Get user-specific API key
  const userKeyData = localStorage.getItem(`user_api_keys_${userId}`);
  if (!userKeyData) return { openai: null, gemini: null };
  
  try {
    const parsed = JSON.parse(userKeyData);
    return {
      openai: parsed.openai || null,
      gemini: parsed.gemini || null
    };
  } catch {
    return { openai: null, gemini: null };
  }
}

function getCurrentApiKeys(userId?: string): { openai: string; gemini: string } {
  if (!userId) return { openai: '', gemini: '' };
  
  // First check session storage (for non-remembered keys)
  const sessionOpenAI = sessionStorage.getItem('current_session_openai_key') || '';
  const sessionGemini = sessionStorage.getItem('current_session_gemini_key') || '';
  
  // Then check user-specific stored keys
  const userKeys = getUserApiKeys(userId);
  
  return {
    openai: sessionOpenAI || userKeys.openai || '',
    gemini: sessionGemini || userKeys.gemini || ''
  };
}

export const ApiKeyProvider: React.FC<ApiKeyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const checkApiKey = async (): Promise<boolean> => {
    // User API Key Model: Users provide their own API keys (OpenAI or Gemini) through Settings
    // Use user-specific storage with fallback to legacy storage
    const userSpecificKeys = getCurrentApiKeys(user?.id);
    const legacyOpenAIKey = localStorage.getItem('openai_api_key');
    const legacyGeminiKey = localStorage.getItem('gemini_api_key');
    // Environment keys are intentionally empty - users provide their own keys
    const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY;
    const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Prioritize user-specific keys, then legacy, then env
    const openaiKey = userSpecificKeys.openai || legacyOpenAIKey || envOpenAIKey;
    const geminiKey = userSpecificKeys.gemini || legacyGeminiKey || envGeminiKey;
    
    // Check if we have at least one valid API key
    const hasValidOpenAI = openaiKey && openaiKey !== 'your_openai_api_key_here' && openaiKey.length >= 10 && openaiKey.startsWith('sk-');
    const hasValidGemini = geminiKey && geminiKey !== 'your_gemini_api_key_here' && geminiKey.length >= 30;
    
    // Basic format validation - if no valid keys are found, clear everything
    if (!hasValidOpenAI && !hasValidGemini) {
      setHasApiKey(false);
      setIsApiKeyValid(false);
      // Clear any cached validation status
      localStorage.removeItem('api_key_validation_status');
      return false;
    }

    setHasApiKey(true);
    
    // Enhanced validation with fallback strategies
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const boundFetch = window.fetch.bind(window);
      
      let openaiValid = false;
      let geminiValid = false;
      
      // Validate OpenAI key if present
      if (hasValidOpenAI) {
        try {
          const response = await boundFetch(`${backendUrl}/api/settings/validate-openai-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey: openaiKey })
          });
          
          const result = await response.json();
          openaiValid = response.ok && result.success && result.valid;
        } catch (error) {
          console.log('OpenAI validation failed:', error);
          openaiValid = false;
        }
      }
      
      // Validate Gemini key if present
      if (hasValidGemini) {
        try {
          const response = await boundFetch(`${backendUrl}/api/settings/validate-gemini-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey: geminiKey })
          });
          
          const result = await response.json();
          geminiValid = response.ok && result.success && result.valid;
        } catch (error) {
          console.log('Gemini validation failed:', error);
          geminiValid = false;
        }
      }
      
      // If at least one provider is valid, we're good to go
      const anyValid = openaiValid || geminiValid;
      setIsApiKeyValid(anyValid);
      
      // Store validation status with timestamp for AI services to check
      const validationData = { 
        openai: openaiValid, 
        gemini: geminiValid,
        timestamp: Date.now(),
        backendUrl: backendUrl 
      };
      localStorage.setItem('api_key_validation_status', JSON.stringify(validationData));
      
      if (anyValid) {
        // Reinitialize the unified chat service when API key becomes valid
        try {
          console.log('🔄 Reinitializing unified chat service after API key validation');
          unifiedChatService.reinitialize();
        } catch (error) {
          console.warn('Failed to reinitialize unified chat service:', error);
        }
      }
      
      return anyValid;
      
    } catch (error: any) {
      // NO MORE DANGEROUS FALLBACKS! Require actual validation
      setIsApiKeyValid(false);
      localStorage.setItem('api_key_validation_status', JSON.stringify({ openai: false, gemini: false }));
      return false;
    }
  };

  const setApiKeyValid = (valid: boolean) => {
    console.log('🔄 [DEBUG] setApiKeyValid called with:', valid, 'current state:', isApiKeyValid);
    setIsApiKeyValid(valid);
    if (valid) {
      setHasApiKey(true);
      // Reinitialize the unified chat service when API key becomes valid
      try {
        console.log('🔄 Reinitializing unified chat service after API key validation');
        unifiedChatService.reinitialize();
      } catch (error) {
        console.warn('Failed to reinitialize unified chat service:', error);
      }
    }
    console.log('🔄 [DEBUG] setApiKeyValid completed, new state should be:', valid);
  };

  const refreshApiKeyStatus = async (): Promise<boolean> => {
    // Clear cache and force fresh validation
    localStorage.removeItem('api_key_validation_status');
    setIsApiKeyValid(false);
    return await checkApiKey();
  };

  const clearSessionApiKeys = () => {
    // Clear session-only API keys when user logs out
    sessionStorage.removeItem('current_session_openai_key');
    sessionStorage.removeItem('current_session_gemini_key');
    // Clear validation status
    localStorage.removeItem('api_key_validation_status');
    // Reset state
    setIsApiKeyValid(false);
    setHasApiKey(false);
    console.log('🔐 Session API keys cleared on logout');
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

  // Listen for API key updates and refresh the context
  useEffect(() => {
    const handleApiKeyUpdate = async () => {
      console.log('🔄 ApiKeyContext: Received apiKeyUpdated event, refreshing');
      await checkApiKey();
    };

    const handleApiKeyCleared = () => {
      console.log('🔄 ApiKeyContext: Received apiKeyCleared event, clearing state');
      setIsApiKeyValid(false);
      setHasApiKey(false);
    };

    window.addEventListener('apiKeyUpdated', handleApiKeyUpdate);
    window.addEventListener('apiKeyCleared', handleApiKeyCleared);
    
    return () => {
      window.removeEventListener('apiKeyUpdated', handleApiKeyUpdate);
      window.removeEventListener('apiKeyCleared', handleApiKeyCleared);
    };
  }, [user?.id]);

  useEffect(() => {
    // Check if user has provided their own API keys and validate them immediately
    // Use user-specific storage with fallback to legacy storage
    const userSpecificKeys = getCurrentApiKeys(user?.id);
    const legacyOpenAIKey = localStorage.getItem('openai_api_key');
    const legacyGeminiKey = localStorage.getItem('gemini_api_key');
    // Environment keys are typically empty in user API key model
    const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY;
    const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    const openaiKey = userSpecificKeys.openai || legacyOpenAIKey || envOpenAIKey;
    const geminiKey = userSpecificKeys.gemini || legacyGeminiKey || envGeminiKey;
    
    // Check if we have at least one valid API key format
    const hasValidOpenAI = openaiKey && openaiKey.startsWith('sk-') && openaiKey.length >= 20;
    const hasValidGemini = geminiKey && geminiKey.length >= 30;
    
    if (hasValidOpenAI || hasValidGemini) {
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
      if (e.key === 'openai_api_key' || 
          e.key === 'gemini_api_key' ||
          e.key === 'remember_api_key' ||
          e.key === 'current_session_openai_key' ||
          e.key === 'current_session_gemini_key' ||
          (user?.id && e.key === `user_api_keys_${user.id}`)) {
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
  }, [user?.id]); // Add user.id as dependency to re-run when user changes

  const value = {
    isApiKeyValid,
    setApiKeyValid,
    hasApiKey,
    checkApiKey,
    refreshApiKeyStatus,
    clearSessionApiKeys
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;