import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, Eye, EyeOff, CheckCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export interface LLMConfig {
  provider: 'openai' | 'gemini' | '';
  apiKey: string;
  model?: string;
}

interface LLMProviderSelectorProps {
  value: LLMConfig;
  onChange: (config: LLMConfig) => void;
  className?: string;
}

const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    description: 'GPT models including GPT-4o, GPT-4o-mini',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    keyPrefix: 'sk-',
    keyLength: { min: 51, max: 64 },
    getKeyUrl: 'https://platform.openai.com/api-keys',
    pricing: 'Pay-per-use'
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini models including Gemini 1.5 Pro, Flash',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    keyPrefix: 'AI',
    keyLength: { min: 30, max: 50 },
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    pricing: 'Free tier available'
  }
};

export default function LLMProviderSelector({ value, onChange, className }: LLMProviderSelectorProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyValidation, setKeyValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const validateApiKey = (provider: string, apiKey: string) => {
    if (!provider || !apiKey) {
      setKeyValidation(null);
      return;
    }

    const info = PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO];
    if (!info) {
      setKeyValidation({ isValid: false, message: 'Unknown provider' });
      return;
    }

    // Check format
    if (!apiKey.startsWith(info.keyPrefix)) {
      setKeyValidation({
        isValid: false,
        message: `${info.name} API keys should start with "${info.keyPrefix}"`
      });
      return;
    }

    // Check length
    if (apiKey.length < info.keyLength.min || apiKey.length > info.keyLength.max) {
      setKeyValidation({
        isValid: false,
        message: `${info.name} API keys should be ${info.keyLength.min}-${info.keyLength.max} characters`
      });
      return;
    }

    setKeyValidation({
      isValid: true,
      message: `API key format looks valid for ${info.name}`
    });
  };

  // Validate key whenever provider or key changes
  useEffect(() => {
    validateApiKey(value.provider, value.apiKey);
  }, [value.provider, value.apiKey]);

  const handleProviderChange = (provider: string) => {
    const newProvider = provider as 'openai' | 'gemini' | '';
    const info = newProvider ? PROVIDER_INFO[newProvider] : null;
    
    onChange({
      provider: newProvider,
      apiKey: value.apiKey,
      model: info?.defaultModel || ''
    });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onChange({
      ...value,
      apiKey
    });
  };

  const handleModelChange = (model: string) => {
    onChange({
      ...value,
      model
    });
  };

  const handleUseConfiguration = () => {
    // Store configuration in sessionStorage for this session
    if (value.provider && value.apiKey) {
      const config = {
        provider: value.provider,
        apiKey: value.apiKey,
        model: value.model || PROVIDER_INFO[value.provider].defaultModel,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('llm_config', JSON.stringify(config));
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('llmConfigUpdated', { detail: config }));
    }
  };

  const selectedInfo = value.provider ? PROVIDER_INFO[value.provider] : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Provider Configuration
          {keyValidation?.isValid && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle size={12} className="mr-1" />
              Ready
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Choose your preferred AI provider and configure your API key for this session.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Provider</label>
          <Select value={value.provider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center justify-between w-full">
                  <span>OpenAI</span>
                  <Badge variant="outline">Pay-per-use</Badge>
                </div>
              </SelectItem>
              <SelectItem value="gemini">
                <div className="flex items-center justify-between w-full">
                  <span>Google Gemini</span>
                  <Badge variant="outline">Free tier</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Provider Info */}
        {selectedInfo && (
          <div className="p-3 bg-neutral-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{selectedInfo.name}</h4>
              <a
                href={selectedInfo.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                Get API Key <ExternalLink size={12} />
              </a>
            </div>
            <p className="text-sm text-neutral-600">{selectedInfo.description}</p>
            <p className="text-xs text-neutral-500">Pricing: {selectedInfo.pricing}</p>
          </div>
        )}

        {/* API Key Input */}
        {value.provider && (
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder={`Enter your ${selectedInfo?.name} API key`}
                value={value.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            </div>
            
            {/* Key Validation */}
            {keyValidation && (
              <Alert className={keyValidation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertCircle className={`h-4 w-4 ${keyValidation.isValid ? 'text-green-600' : 'text-red-600'}`} />
                <AlertDescription className={keyValidation.isValid ? 'text-green-700' : 'text-red-700'}>
                  {keyValidation.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Model Selection */}
        {value.provider && selectedInfo && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Model (Optional)</label>
            <Select value={value.model || selectedInfo.defaultModel} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {selectedInfo.models.map((model) => (
                  <SelectItem key={model} value={model}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model}</span>
                      {model === selectedInfo.defaultModel && (
                        <Badge variant="outline" className="ml-2">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Use Configuration Button */}
        {value.provider && value.apiKey && keyValidation?.isValid && (
          <Button onClick={handleUseConfiguration} className="w-full">
            Use this Configuration
          </Button>
        )}

        {/* Security Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            🔒 Your API key is stored in browser session storage only and sent directly to the AI provider. 
            We never store or log your API keys on our servers.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}