import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiKeyContextType {
  isApiKeyValid: boolean;
  setApiKeyValid: (valid: boolean) => void;
  hasApiKey: boolean;
  checkApiKey: () => boolean;
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

  const checkApiKey = (): boolean => {
    const storedKey = localStorage.getItem('openai_api_key');
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    const key = storedKey || envKey;
    const isValid = !!(key && key !== 'your_openai_api_key_here' && key.length > 10 && key.startsWith('sk-'));
    
    setHasApiKey(!!key);
    setIsApiKeyValid(isValid);
    
    // Log API key status for debugging
    if (isValid) {
      console.log('✅ OpenAI API key is valid - AI features unlocked');
    } else {
      console.log('⚠️ No valid OpenAI API key found - AI features locked');
    }
    
    return isValid;
  };

  const setApiKeyValid = (valid: boolean) => {
    setIsApiKeyValid(valid);
    if (valid) {
      setHasApiKey(true);
    }
  };

  useEffect(() => {
    checkApiKey();
    
    // Listen for storage changes (in case key is updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'openai_api_key') {
        checkApiKey();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    isApiKeyValid,
    setApiKeyValid,
    hasApiKey,
    checkApiKey
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export default ApiKeyProvider;