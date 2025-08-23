import React, { useState, useEffect } from 'react';
import { Card, PurdueButton } from '@/components/PurdueUI';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, Lock, Unlock, Bot, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ApiProvider = 'openai' | 'gemini';

interface ApiKeyManagerProps {
  isUnlocked: boolean;
  onApiKeyValidated: (isValid: boolean) => void;
  showWarning?: boolean;
  requiredFor?: string;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ 
  isUnlocked, 
  onApiKeyValidated, 
  showWarning = false,
  requiredFor = "AI features"
}) => {
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('openai');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    gemini: ''
  });
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    gemini: false
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{[key in ApiProvider]: 'pending' | 'valid' | 'invalid'}>({
    openai: 'pending',
    gemini: 'pending'
  });
  const [showKeyInput, setShowKeyInput] = useState(!isUnlocked || showWarning);
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored API keys for both providers
    const storedOpenAI = localStorage.getItem('openai_api_key');
    const storedGemini = localStorage.getItem('gemini_api_key');
    
    // Also check user-specific stored keys
    const userIds = Object.keys(localStorage).filter(key => key.startsWith('user_api_keys_'));
    if (userIds.length > 0) {
      const latestUserKey = userIds[userIds.length - 1];
      const userKeyData = localStorage.getItem(latestUserKey);
      if (userKeyData) {
        try {
          const parsed = JSON.parse(userKeyData);
          if (parsed.openai) storedOpenAI || (setApiKeys(prev => ({ ...prev, openai: parsed.openai })));
          if (parsed.gemini) storedGemini || (setApiKeys(prev => ({ ...prev, gemini: parsed.gemini })));
        } catch (e) {
          console.log('Parse error:', e);
        }
      }
    }

    if (storedOpenAI && storedOpenAI !== 'your_openai_api_key_here' && storedOpenAI.length > 10) {
      setApiKeys(prev => ({ ...prev, openai: storedOpenAI }));
      setValidationStatus(prev => ({ ...prev, openai: 'valid' }));
    }
    
    if (storedGemini && storedGemini !== 'your_gemini_api_key_here' && storedGemini.length > 10) {
      setApiKeys(prev => ({ ...prev, gemini: storedGemini }));
      setValidationStatus(prev => ({ ...prev, gemini: 'valid' }));
    }

    // Check validation status from local storage
    const validationData = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
    setValidationStatus(prev => ({
      openai: validationData.openai ? 'valid' : prev.openai,
      gemini: validationData.gemini ? 'valid' : prev.gemini
    }));

    // If any provider is valid, notify parent
    const hasValidKey = validationData.openai || validationData.gemini;
    if (hasValidKey) {
      onApiKeyValidated(true);
      setShowKeyInput(false);
    }
  }, [onApiKeyValidated]);

  const validateOpenAIKey = async (key: string): Promise<boolean> => {
    if (!key || key.length < 10 || key === 'your_openai_api_key_here') {
      return false;
    }

    // Basic format validation for OpenAI API keys
    if (!key.startsWith('sk-') || key.length < 40) {
      return false;
    }

    try {
      // Test the API key with a minimal request
      const response = await window.fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('OpenAI API key validation error:', error);
      return false;
    }
  };

  const validateGeminiKey = async (key: string): Promise<boolean> => {
    if (!key || key.length < 10 || key === 'your_gemini_api_key_here') {
      return false;
    }

    // Basic format validation for Gemini API keys
    if (!key.startsWith('AIzaSy') || key.length < 30) {
      return false;
    }

    try {
      // Test the API key with the Gemini API
      const response = await window.fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Gemini API key validation error:', error);
      return false;
    }
  };

  const handleValidateKey = async () => {
    const currentKey = apiKeys[selectedProvider];
    
    if (!currentKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key`,
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    setValidationStatus(prev => ({ ...prev, [selectedProvider]: 'pending' }));

    try {
      const isValid = selectedProvider === 'openai' 
        ? await validateOpenAIKey(currentKey.trim())
        : await validateGeminiKey(currentKey.trim());
      
      if (isValid) {
        setValidationStatus(prev => ({ ...prev, [selectedProvider]: 'valid' }));
        
        // Store in localStorage
        localStorage.setItem(`${selectedProvider}_api_key`, currentKey.trim());
        
        // Update user-specific storage
        const userIds = Object.keys(localStorage).filter(key => key.startsWith('user_api_keys_'));
        if (userIds.length > 0) {
          const latestUserKey = userIds[userIds.length - 1];
          const userKeyData = localStorage.getItem(latestUserKey);
          if (userKeyData) {
            try {
              const parsed = JSON.parse(userKeyData);
              parsed[selectedProvider] = currentKey.trim();
              localStorage.setItem(latestUserKey, JSON.stringify(parsed));
            } catch (e) {
              console.log('Failed to update user-specific storage:', e);
            }
          }
        }
        
        // Update validation status
        const validationData = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
        validationData[selectedProvider] = true;
        localStorage.setItem('api_key_validation_status', JSON.stringify(validationData));
        
        onApiKeyValidated(true);
        setShowKeyInput(false);
        
        toast({
          title: "✅ API Key Validated",
          description: `${selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key is valid and saved. ${requiredFor} are now unlocked!`,
          variant: "default"
        });
      } else {
        setValidationStatus(prev => ({ ...prev, [selectedProvider]: 'invalid' }));
        
        toast({
          title: "❌ Invalid API Key",
          description: `The ${selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key is invalid or doesn't have the required permissions. Please check your key and try again.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      setValidationStatus(prev => ({ ...prev, [selectedProvider]: 'invalid' }));
      
      toast({
        title: "⚠️ Validation Failed",
        description: "Could not validate the API key. Please check your internet connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem(`${selectedProvider}_api_key`);
    
    // Update user-specific storage
    const userIds = Object.keys(localStorage).filter(key => key.startsWith('user_api_keys_'));
    if (userIds.length > 0) {
      const latestUserKey = userIds[userIds.length - 1];
      const userKeyData = localStorage.getItem(latestUserKey);
      if (userKeyData) {
        try {
          const parsed = JSON.parse(userKeyData);
          delete parsed[selectedProvider];
          localStorage.setItem(latestUserKey, JSON.stringify(parsed));
        } catch (e) {
          console.log('Failed to update user-specific storage:', e);
        }
      }
    }
    
    // Update validation status
    const validationData = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
    validationData[selectedProvider] = false;
    localStorage.setItem('api_key_validation_status', JSON.stringify(validationData));
    
    setApiKeys(prev => ({ ...prev, [selectedProvider]: '' }));
    setValidationStatus(prev => ({ ...prev, [selectedProvider]: 'pending' }));
    
    // Check if any provider still has valid keys
    const hasAnyValidKey = Object.values(validationData).some(isValid => isValid);
    onApiKeyValidated(hasAnyValidKey);
    
    if (!hasAnyValidKey) {
      setShowKeyInput(true);
    }
    
    toast({
      title: "🔑 API Key Removed",
      description: `${selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key has been removed.`,
      variant: "default"
    });
  };

  const getStatusIcon = (provider: ApiProvider) => {
    switch (validationStatus[provider]) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Key className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStatusText = (provider: ApiProvider) => {
    const providerName = provider === 'openai' ? 'OpenAI' : 'Gemini';
    switch (validationStatus[provider]) {
      case 'valid':
        return `✅ ${providerName} Ready`;
      case 'invalid':
        return `❌ Invalid ${providerName} Key`;
      default:
        return `🔒 ${providerName} Not Configured`;
    }
  };

  const getProviderInfo = (provider: ApiProvider) => {
    if (provider === 'openai') {
      return {
        name: 'OpenAI',
        icon: <Bot className="h-4 w-4" />,
        description: 'GPT-4 models with excellent reasoning',
        keyFormat: 'sk-...',
        getKeyUrl: 'https://platform.openai.com/api-keys',
        note: 'Requires payment after free trial'
      };
    } else {
      return {
        name: 'Gemini',
        icon: <Star className="h-4 w-4" />,
        description: 'Google\'s free AI model with high rate limits',
        keyFormat: 'AIzaSy...',
        getKeyUrl: 'https://aistudio.google.com/app/apikey',
        note: 'Free with generous daily limits'
      };
    }
  };

  const hasAnyValidKey = Object.values(validationStatus).some(status => status === 'valid');

  if (!showKeyInput && hasAnyValidKey) {
    return (
      <div className="space-y-3">
        {/* Show status for all providers */}
        {(['openai', 'gemini'] as ApiProvider[]).map(provider => {
          const info = getProviderInfo(provider);
          const status = validationStatus[provider];
          if (status !== 'valid') return null;
          
          return (
            <div key={provider} className="p-3 rounded-lg bg-green-900/20 border border-green-800 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {info.icon}
                  <Unlock className="h-4 w-4 text-green-400" />
                  <span className="text-green-200">{getStatusText(provider)}</span>
                </div>
                <div className="flex space-x-2">
                  <PurdueButton 
                    variant="secondary" 
                    size="small"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setShowKeyInput(true);
                    }}
                  >
                    Change Key
                  </PurdueButton>
                  <PurdueButton 
                    variant="destructive" 
                    size="small"
                    onClick={() => {
                      setSelectedProvider(provider);
                      handleRemoveKey();
                    }}
                  >
                    Remove
                  </PurdueButton>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="flex justify-center">
          <PurdueButton 
            variant="secondary" 
            size="small"
            onClick={() => setShowKeyInput(true)}
          >
            Add Another Provider
          </PurdueButton>
        </div>
      </div>
    );
  }

  const currentProviderInfo = getProviderInfo(selectedProvider);

  return (
    <Card title={`🔑 Enter API Key (OpenAI or Gemini) for ${requiredFor}`}>
      <div className="space-y-4">
        {showWarning && !hasAnyValidKey && (
          <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-800 text-sm text-amber-200">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>You need to enter a valid API key (OpenAI or Gemini - either works) to unlock {requiredFor}. We recommend starting with Gemini (completely free).</span>
            </div>
          </div>
        )}

        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Choose AI Provider
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['gemini', 'openai'] as ApiProvider[]).map(provider => {
              const info = getProviderInfo(provider);
              const isSelected = selectedProvider === provider;
              const isValid = validationStatus[provider] === 'valid';
              
              return (
                <button
                  key={provider}
                  onClick={() => setSelectedProvider(provider)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {info.icon}
                    <span className="font-medium">{info.name}</span>
                    {isValid && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                  <p className="text-xs text-green-400 mt-1">{info.note}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {currentProviderInfo.name} API Key
          </label>
          <div className="relative">
            <input
              type={showApiKeys[selectedProvider] ? "text" : "password"}
              value={apiKeys[selectedProvider]}
              onChange={(e) => setApiKeys(prev => ({ ...prev, [selectedProvider]: e.target.value }))}
              placeholder={currentProviderInfo.keyFormat}
              className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              disabled={isValidating}
            />
            <button
              type="button"
              onClick={() => setShowApiKeys(prev => ({ ...prev, [selectedProvider]: !prev[selectedProvider] }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
            >
              {showApiKeys[selectedProvider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(selectedProvider)}
            <span className="text-sm text-muted-foreground">
              {getStatusText(selectedProvider)}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <PurdueButton 
              onClick={handleValidateKey}
              disabled={!apiKeys[selectedProvider].trim() || isValidating}
              variant={validationStatus[selectedProvider] === 'valid' ? 'secondary' : 'default'}
            >
              {isValidating ? 'Validating...' : validationStatus[selectedProvider] === 'valid' ? 'Re-validate' : 'Validate & Save'}
            </PurdueButton>
            
            {validationStatus[selectedProvider] === 'valid' && (
              <PurdueButton 
                variant="destructive"
                size="small"
                onClick={handleRemoveKey}
              >
                Remove
              </PurdueButton>
            )}
            
            {hasAnyValidKey && (
              <PurdueButton 
                variant="secondary"
                onClick={() => setShowKeyInput(false)}
              >
                Hide
              </PurdueButton>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How to get a {currentProviderInfo.name} API key:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Visit <a href={currentProviderInfo.getKeyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{currentProviderInfo.getKeyUrl}</a></li>
            <li>{selectedProvider === 'gemini' ? 'Sign in with your Google account' : 'Sign in or create an OpenAI account'}</li>
            <li>{selectedProvider === 'gemini' ? 'Click "Get API key" or "Create API key"' : 'Click "Create new secret key"'}</li>
            <li>Copy the key and paste it above</li>
          </ol>
          <p className="text-amber-400">⚠️ Keep your API key secure and never share it publicly</p>
          
          {selectedProvider === 'gemini' && (
            <div className="mt-2 p-2 rounded bg-green-900/20 border border-green-800">
              <p className="text-green-200 text-xs">
                💡 <strong>Recommended:</strong> Gemini is completely free with generous daily limits - perfect for getting started!
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ApiKeyManager;