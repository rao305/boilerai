import React, { useState, useEffect } from 'react';
import { Card, PurdueButton } from '@/components/PurdueUI';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'pending' | 'valid' | 'invalid'>('pending');
  const [showKeyInput, setShowKeyInput] = useState(!isUnlocked || showWarning);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we already have a valid API key stored
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey && storedKey !== 'your_openai_api_key_here' && storedKey.length > 10) {
      setApiKey(storedKey);
      setValidationStatus('valid');
      onApiKeyValidated(true);
      setShowKeyInput(false);
    }
  }, [onApiKeyValidated]);

  const validateApiKey = async (key: string): Promise<boolean> => {
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
      console.error('API key validation error:', error);
      return false;
    }
  };

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    setValidationStatus('pending');

    try {
      const isValid = await validateApiKey(apiKey.trim());
      
      if (isValid) {
        setValidationStatus('valid');
        localStorage.setItem('openai_api_key', apiKey.trim());
        onApiKeyValidated(true);
        setShowKeyInput(false);
        
        toast({
          title: "✅ API Key Validated",
          description: `OpenAI API key is valid and saved. ${requiredFor} are now unlocked!`,
          variant: "default"
        });
      } else {
        setValidationStatus('invalid');
        onApiKeyValidated(false);
        
        toast({
          title: "❌ Invalid API Key",
          description: "The API key is invalid or doesn't have the required permissions. Please check your key and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setValidationStatus('invalid');
      onApiKeyValidated(false);
      
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
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setValidationStatus('pending');
    onApiKeyValidated(false);
    setShowKeyInput(true);
    
    toast({
      title: "🔑 API Key Removed",
      description: `OpenAI API key has been removed. ${requiredFor} are now locked.`,
      variant: "default"
    });
  };

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Key className="h-5 w-5 text-neutral-400" />;
    }
  };

  const getStatusText = () => {
    switch (validationStatus) {
      case 'valid':
        return `✅ ${requiredFor} Unlocked`;
      case 'invalid':
        return '❌ Invalid API Key';
      default:
        return `🔒 ${requiredFor} Locked`;
    }
  };

  if (!showKeyInput && validationStatus === 'valid') {
    return (
      <div className="p-3 rounded-lg bg-green-900/20 border border-green-800 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Unlock className="h-4 w-4 text-green-400" />
            <span className="text-green-200">{getStatusText()}</span>
          </div>
          <div className="flex space-x-2">
            <PurdueButton 
              variant="secondary" 
              size="small"
              onClick={() => setShowKeyInput(true)}
            >
              Change Key
            </PurdueButton>
            <PurdueButton 
              variant="destructive" 
              size="small"
              onClick={handleRemoveKey}
            >
              Remove Key
            </PurdueButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card title={`🔑 OpenAI API Key Required for ${requiredFor}`}>
      <div className="space-y-4">
        {showWarning && (
          <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-800 text-sm text-amber-200">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>You need to enter a valid OpenAI API key to unlock {requiredFor}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              disabled={isValidating}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-muted-foreground">
              {getStatusText()}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <PurdueButton 
              onClick={handleValidateKey}
              disabled={!apiKey.trim() || isValidating}
              variant={validationStatus === 'valid' ? 'secondary' : 'default'}
            >
              {isValidating ? 'Validating...' : validationStatus === 'valid' ? 'Re-validate' : 'Validate & Save'}
            </PurdueButton>
            
            {validationStatus === 'valid' && (
              <PurdueButton 
                variant="secondary"
                onClick={() => setShowKeyInput(false)}
              >
                Hide
              </PurdueButton>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How to get an OpenAI API key:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a></li>
            <li>Sign in or create an OpenAI account</li>
            <li>Click "Create new secret key"</li>
            <li>Copy the key and paste it above</li>
          </ol>
          <p className="text-amber-400">⚠️ Keep your API key secure and never share it publicly</p>
        </div>
      </div>
    </Card>
  );
};

export default ApiKeyManager;