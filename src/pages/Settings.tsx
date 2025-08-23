import React, { useState, useEffect } from "react";
import { 
  PageHeader, 
  Card, 
  Badge, 
  PurdueButton, 
  PurdueInput, 
  PurdueSelect,
  StatsGrid
} from "@/components/PurdueUI";
import { useAuth } from "@/contexts/AuthContext";
import { useMicrosoftAuth } from "@/contexts/MicrosoftAuthContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { pureAIFallback } from "@/services/pureAIFallback";
import { unifiedChatService } from "@/services/unifiedChatService";
import { 
  User, 
  Key, 
  Bell, 
  Shield, 
  Download, 
  Trash2,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings as SettingsIcon,
  Lock,
  Globe,
  Bot,
  Star,
  Brain,
  Layers
} from "lucide-react";

type ApiProvider = 'openai' | 'gemini';

// Enhanced user-specific API key storage functions for multiple providers
function getUserApiKeys(userId?: string): {openai: string, gemini: string} {
  if (!userId) return {openai: '', gemini: ''};
  
  // Check if user wants to remember API key
  const rememberKey = localStorage.getItem('remember_api_key') === 'true';
  if (!rememberKey) return {openai: '', gemini: ''};
  
  // Get user-specific API keys
  const userKeyData = localStorage.getItem(`user_api_keys_${userId}`);
  if (!userKeyData) return {openai: '', gemini: ''};
  
  try {
    const parsed = JSON.parse(userKeyData);
    return {
      openai: parsed.openai || '',
      gemini: parsed.gemini || ''
    };
  } catch {
    return {openai: '', gemini: ''};
  }
}

function setUserApiKey(userId: string, provider: ApiProvider, apiKey: string, remember: boolean): void {
  if (!remember) {
    // If not remembering, clear any stored keys and use session storage
    localStorage.removeItem(`user_api_keys_${userId}`);
    localStorage.setItem('remember_api_key', 'false');
    // Store in session for current session only
    sessionStorage.setItem(`current_session_${provider}_key`, apiKey);
    return;
  }
  
  // Get existing data or create new
  const existingData = getUserApiKeys(userId);
  const userKeyData = {
    openai: provider === 'openai' ? apiKey : existingData.openai,
    gemini: provider === 'gemini' ? apiKey : existingData.gemini,
    timestamp: Date.now(),
    userId: userId
  };
  
  localStorage.setItem(`user_api_keys_${userId}`, JSON.stringify(userKeyData));
  localStorage.setItem('remember_api_key', 'true');
  // Also clear session storage
  sessionStorage.removeItem(`current_session_${provider}_key`);
}

function clearUserApiKey(userId: string, provider?: ApiProvider): void {
  if (!provider) {
    // Clear all
    localStorage.removeItem(`user_api_keys_${userId}`);
    localStorage.removeItem('remember_api_key');
    sessionStorage.removeItem('current_session_openai_key');
    sessionStorage.removeItem('current_session_gemini_key');
  } else {
    // Clear specific provider
    const existingData = getUserApiKeys(userId);
    const userKeyData = {
      openai: provider === 'openai' ? '' : existingData.openai,
      gemini: provider === 'gemini' ? '' : existingData.gemini,
      timestamp: Date.now(),
      userId: userId
    };
    localStorage.setItem(`user_api_keys_${userId}`, JSON.stringify(userKeyData));
    sessionStorage.removeItem(`current_session_${provider}_key`);
  }
}

function getCurrentApiKeys(userId?: string): {openai: string, gemini: string} {
  if (!userId) return {openai: '', gemini: ''};
  
  // First check session storage (for non-remembered keys)
  const sessionOpenAI = sessionStorage.getItem('current_session_openai_key') || '';
  const sessionGemini = sessionStorage.getItem('current_session_gemini_key') || '';
  
  // Then check user-specific stored keys
  const storedKeys = getUserApiKeys(userId);
  
  return {
    openai: sessionOpenAI || storedKeys.openai,
    gemini: sessionGemini || storedKeys.gemini
  };
}

// Auto-detect API key provider based on format
function detectApiKeyProvider(apiKey: string): ApiProvider | null {
  if (!apiKey || apiKey.length < 10) return null;
  
  // OpenAI keys start with 'sk-' and are typically 40+ characters
  if (apiKey.startsWith('sk-') && apiKey.length >= 20) {
    return 'openai';
  }
  
  // Gemini keys start with 'AIzaSy' and are typically 30+ characters
  if (apiKey.startsWith('AIzaSy') && apiKey.length >= 30) {
    return 'gemini';
  }
  
  return null;
}

export default function Settings() {
  const { user: legacyUser } = useAuth();
  const { user: msUser } = useMicrosoftAuth();
  const { isApiKeyValid, checkApiKey, setApiKeyValid } = useApiKey();
  
  // Use Microsoft auth user if available, fallback to legacy
  const user = msUser || legacyUser;
  const [showApiKey, setShowApiKey] = useState(false);
  const [rememberApiKey, setRememberApiKey] = useState(
    localStorage.getItem('remember_api_key') === 'true'
  );
  const [apiKeys, setApiKeys] = useState(() => {
    const keys = getCurrentApiKeys(user?.id);
    return keys;
  });
  const [apiKeyStatus, setApiKeyStatus] = useState({
    openai: { valid: false, testing: false },
    gemini: { valid: false, testing: false },
  });
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('openai');
  const [detectedProvider, setDetectedProvider] = useState<ApiProvider | null>(null);
  const [profile, setProfile] = useState({
    firstName: user?.name?.split(' ')[0] || "",
    lastName: user?.name?.split(' ')[1] || "",
    email: user?.email || "",
    major: "Computer Science",
    year: "Junior",
    expectedGraduation: "Spring 2026",
  });
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: false,
    weeklyDigest: true,
    courseReminders: true,
    gradeUpdates: false,
  });
  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    shareProgress: true,
    analyticsOptIn: true,
  });

  // Sync local apiKeyStatus with global context and validation status
  useEffect(() => {
    console.log('🔄 Settings: Syncing with global context, isApiKeyValid:', isApiKeyValid);
    
    // Check validation status for both providers
    const validationStatus = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
    console.log('🔄 Settings: Validation status from localStorage:', validationStatus);
    
    setApiKeyStatus(prev => ({
      openai: {
        ...prev.openai,
        valid: validationStatus.openai || false
      },
      gemini: {
        ...prev.gemini,
        valid: validationStatus.gemini || false
      }
    }));
  }, [isApiKeyValid]);

  // Listen for API key updates from other components
  useEffect(() => {
    const handleApiKeyUpdate = () => {
      console.log('🔄 Settings: Received apiKeyUpdated event, refreshing status');
      const validationStatus = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
      console.log('🔄 Settings: Updated validation status:', validationStatus);
      
      setApiKeyStatus(prev => ({
        openai: {
          ...prev.openai,
          valid: validationStatus.openai || false
        },
        gemini: {
          ...prev.gemini,
          valid: validationStatus.gemini || false
        }
      }));
    };

    const handleApiKeyCleared = () => {
      console.log('🔄 Settings: Received apiKeyCleared event, clearing status');
      setApiKeyStatus(prev => ({
        openai: {
          ...prev.openai,
          valid: false
        },
        gemini: {
          ...prev.gemini,
          valid: false
        }
      }));
    };

    window.addEventListener('apiKeyUpdated', handleApiKeyUpdate);
    window.addEventListener('apiKeyCleared', handleApiKeyCleared);
    
    return () => {
      window.removeEventListener('apiKeyUpdated', handleApiKeyUpdate);
      window.removeEventListener('apiKeyCleared', handleApiKeyCleared);
    };
  }, []);
  
  // Auto-detect provider when user types
  useEffect(() => {
    const currentKey = apiKeys[selectedProvider];
    const detected = detectApiKeyProvider(currentKey);
    setDetectedProvider(detected);
  }, [apiKeys, selectedProvider]);

  const handleSaveProfile = () => {
    console.log("Saving profile:", profile);
  };

  const validateApiKey = async (apiKey: string, provider: ApiProvider): Promise<{ valid: boolean; status?: number; reason?: string; networkError?: boolean }> => {
    console.log(`🔍 Starting ${provider} API key validation...`, { keyLength: apiKey?.length, keyPrefix: apiKey?.substring(0, 8) + '...' });
    
    try {
      // Auto-detect if provider doesn't match key format
      const detectedProvider = detectApiKeyProvider(apiKey);
      if (detectedProvider && detectedProvider !== provider) {
        console.log(`🔄 Auto-detected provider: ${detectedProvider} (user selected: ${provider})`);
        // Auto-switch to detected provider
        setSelectedProvider(detectedProvider);
        provider = detectedProvider;
      }
      
      if (!apiKey || apiKey.length < 10) {
        console.log('❌ API key format validation failed - too short');
        setApiKeyStatus(prev => ({ ...prev, [provider]: { valid: false, testing: false } }));
        return { valid: false, reason: 'API key is too short. Please enter a valid API key.' };
      }
      
      // Validate format based on provider
      if (provider === 'openai' && (!apiKey.startsWith('sk-') || apiKey.length < 20)) {
        console.log('❌ OpenAI API key format validation failed');
        setApiKeyStatus(prev => ({ ...prev, [provider]: { valid: false, testing: false } }));
        return { valid: false, reason: 'Invalid OpenAI API key format. OpenAI keys must start with "sk-" and be at least 20 characters long.' };
      }
      
      if (provider === 'gemini' && (!apiKey.startsWith('AIzaSy') || apiKey.length < 30)) {
        console.log('❌ Gemini API key format validation failed');
        setApiKeyStatus(prev => ({ ...prev, [provider]: { valid: false, testing: false } }));
        return { valid: false, reason: 'Invalid Gemini API key format. Gemini keys must start with "AIzaSy" and be at least 30 characters long.' };
      }
      
      console.log(`✅ ${provider} API key format is valid, starting validation...`);
      setApiKeyStatus(prev => ({ ...prev, [provider]: { valid: false, testing: true } }));

      let validationResult;
      
      if (provider === 'openai') {
        // Use backend validation for OpenAI to avoid CORS issues
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        const validationUrl = `${backendUrl}/api/settings/validate-openai-key`;
        console.log('🌐 Making request to:', validationUrl);
      
        const boundFetch = window.fetch.bind(window);
        console.log('📡 Sending OpenAI validation request...');
        const response = await boundFetch(validationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ apiKey })
        });
        
        console.log('📥 Received response:', { status: response.status, ok: response.ok });
        
        if (!response.ok) {
          throw new Error(`Validation service error: ${response.status}`);
        }
        
        const result = await response.json();
        validationResult = result;
      } else if (provider === 'gemini') {
        // Direct validation for Gemini API
        console.log('📡 Sending Gemini validation request...');
        const response = await window.fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📥 Received Gemini response:', { status: response.status, ok: response.ok });
        
        validationResult = {
          success: response.ok,
          valid: response.ok,
          status: response.status,
          reason: response.ok ? 'Gemini API key validated successfully' : 'Invalid Gemini API key or network error'
        };
      }
      
      console.log('📋 Validation result:', validationResult);
      
      if (validationResult.success && validationResult.valid) {
        console.log(`✅ ${provider} API key validation successful!`);
        setApiKeyStatus(prev => ({ ...prev, [provider]: { valid: true, testing: false } }));
        
        return { 
          valid: true, 
          status: validationResult.status, 
          reason: validationResult.reason
        };
      } else {
        console.log(`❌ ${provider} API key validation failed:`, validationResult.reason);
        setApiKeyStatus(prev => ({ ...prev, [provider]: { valid: false, testing: false } }));
        
        return { 
          valid: false, 
          status: validationResult.status, 
          reason: validationResult.reason
        };
      }
      
    } catch (error: any) {
      console.error(`🚨 ${provider} validation error:`, error);
      setApiKeyStatus(prev => ({ ...prev, [provider]: { valid: false, testing: false } }));
      
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return { valid: false, reason: 'Validation timeout. Please check your internet connection and try again.' };
      }
      return { valid: false, reason: `${provider} API key validation failed: ${error.message}` };
    }
  };

  // API keys are stored client-side only for security and FERPA compliance
  // No backend storage of sensitive user data

  const handleSaveApiKeys = async () => {
    console.log("Validating and saving API keys (user-specific storage)");
    
    if (!user?.id) {
      alert('❌ User session not found. Please log in again.');
      return;
    }
    
    const currentKey = apiKeys[selectedProvider];
    if (currentKey) {
      const result = await validateApiKey(currentKey, selectedProvider);
      if (result.valid) {
        // Save using user-specific storage with remember option
        setUserApiKey(user.id, selectedProvider, currentKey, rememberApiKey);
        
        // Store validation status for AI services to check (compatible with ApiKeyContext)
        const existingValidation = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
        const validationData = { 
          ...existingValidation,
          [selectedProvider]: true,
          timestamp: Date.now(),
          userId: user.id,
          rememberKey: rememberApiKey,
          backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001',
          reason: `${selectedProvider} API key validated successfully`
        };
        localStorage.setItem('api_key_validation_status', JSON.stringify(validationData));
        
        // Update legacy storage for backward compatibility
        if (rememberApiKey) {
          localStorage.setItem(`${selectedProvider}_api_key`, currentKey);
        } else {
          localStorage.removeItem(`${selectedProvider}_api_key`);
        }
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
        
        // Update global context after a brief delay to ensure localStorage is committed
        console.log('🔄 [DEBUG] Updating global context to valid after successful save');
        setTimeout(() => {
          setApiKeyValid(true);
          console.log('🔄 [DEBUG] Global context update completed');
        }, 10);
        
        // Reinitialize all AI services
        pureAIFallback.reinitialize();
        unifiedChatService.reinitialize();
        console.log('🔄 Reinitialized AI services after save');
        
        // Force refresh the context to ensure state propagation
        setTimeout(async () => {
          await checkApiKey();
          console.log('🔄 [DEBUG] Context refresh completed');
        }, 100);
        
        const providerName = selectedProvider === 'openai' ? 'OpenAI' : 'Gemini';
        const rememberText = rememberApiKey 
          ? '\n\n💾 Your API key will be remembered for future sessions.' 
          : '\n\n🔐 Your API key will only be used for this session and will be cleared when you log out.';
        
        if (result.status === 403 || result.status === 429) {
          alert(`✅ ${providerName} API key validated and saved securely!${rememberText}\n\n⚠️ Note: Your key is valid but may have usage restrictions. You can now use all AI features including transcript parsing.`);
        } else {
          alert(`✅ ${providerName} API key validated and saved securely!${rememberText}\n\n🎉 All AI features are now fully enabled, including transcript parsing, chat assistant, and academic planning.`);
        }
      } else {
        // Update global context on validation failure
        setApiKeyValid(false);
        const providerName = selectedProvider === 'openai' ? 'OpenAI' : 'Gemini';
        alert(`❌ ${providerName} API key validation failed.\nReason: ${result.reason || 'Invalid key format or network error'}.\n\nPlease check your API key and try again.`);
      }
    } else {
      // Clear the key for this user
      clearUserApiKey(user.id, selectedProvider);
      const existingValidation = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
      const validationData = { 
        ...existingValidation,
        [selectedProvider]: false,
        timestamp: Date.now(),
        userId: user.id,
        backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001',
        reason: `${selectedProvider} API key cleared by user`
      };
      localStorage.setItem('api_key_validation_status', JSON.stringify(validationData));
      
      // Clear legacy storage
      localStorage.removeItem(`${selectedProvider}_api_key`);
      
      setApiKeyStatus(prev => ({ ...prev, [selectedProvider]: { valid: false, testing: false } }));
      
      // Update global context when clearing if no other providers are valid
      const hasValidProvider = Object.values(validationData).some(v => v === true);
      setApiKeyValid(hasValidProvider);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
      
      // Also trigger the global context to refresh
      await checkApiKey();
      
      const providerName = selectedProvider === 'openai' ? 'OpenAI' : 'Gemini';
      alert(`🗑️ ${providerName} API key removed from your browser.`);
    }
  };

  const handleExportData = () => {
    console.log("Exporting user data");
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      console.log("Deleting account");
    }
  };

  const majorOptions = [
    { value: "Computer Science", label: "Computer Science" },
    { value: "Computer Engineering", label: "Computer Engineering" },
    { value: "Data Science", label: "Data Science" },
    { value: "Mathematics", label: "Mathematics" },
    { value: "Statistics", label: "Statistics" },
  ];

  const yearOptions = [
    { value: "Freshman", label: "Freshman" },
    { value: "Sophomore", label: "Sophomore" },
    { value: "Junior", label: "Junior" },
    { value: "Senior", label: "Senior" },
    { value: "Graduate", label: "Graduate" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        subtitle="Manage your account preferences and integrations"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card title="Profile Information" right={
            <PurdueButton size="small" onClick={handleSaveProfile}>
              <Save size={14} className="mr-1" />
              Save Profile
            </PurdueButton>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">First Name</label>
                <PurdueInput
                  value={profile.firstName}
                  onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Last Name</label>
                <PurdueInput
                  value={profile.lastName}
                  onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
                <PurdueInput
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Major</label>
                <PurdueSelect
                  options={majorOptions}
                  value={profile.major}
                  onChange={(value) => setProfile({...profile, major: value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Academic Year</label>
                <PurdueSelect
                  options={yearOptions}
                  value={profile.year}
                  onChange={(value) => setProfile({...profile, year: value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Expected Graduation</label>
                <PurdueInput
                  value={profile.expectedGraduation}
                  onChange={(e) => setProfile({...profile, expectedGraduation: e.target.value})}
                />
              </div>
            </div>
          </Card>

          {/* API Keys */}
          <Card title="AI Configuration (OpenAI or Gemini)" right={
            <div className="flex items-center gap-2">
              <Badge className={`transition-all duration-300 ${(apiKeyStatus.openai.valid || apiKeyStatus.gemini.valid) ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-300 border border-green-500/30" : "bg-neutral-800/50 text-neutral-400 border border-neutral-700"}`}>
                {apiKeyStatus.openai.valid && '✅ OpenAI Connected'}
                {apiKeyStatus.gemini.valid && '✅ Gemini Connected'}
                {!apiKeyStatus.openai.valid && !apiKeyStatus.gemini.valid && '🔑 Not Connected'}
              </Badge>
              <PurdueButton 
                size="small" 
                onClick={handleSaveApiKeys} 
                disabled={apiKeyStatus[selectedProvider].testing}
                className={`transition-all duration-300 ${apiKeyStatus[selectedProvider].testing ? 'animate-pulse' : 'hover:scale-105'}`}
              >
                {apiKeyStatus[selectedProvider].testing ? (
                  <div className="animate-spin h-3 w-3 border border-neutral-600 rounded-full border-t-amber-500 mr-2"></div>
                ) : (
                  <Save size={14} className="mr-2" />
                )}
                {apiKeyStatus[selectedProvider].testing ? 'Testing...' : '💾 Save & Test'}
              </PurdueButton>
            </div>
          }>
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-800">
                <div className="flex items-center gap-3 mb-3">
                  <Key size={18} className="text-blue-400" />
                  <span className="text-base font-medium text-blue-300">AI Enhancement</span>
                </div>
                <p className="text-sm text-blue-200 mb-3">
                  Enter your OpenAI or Gemini API key to unlock intelligent chat responses, AI-powered transcript parsing, 
                  and personalized academic recommendations. Either provider works!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="text-blue-300">
                    <Bot size={12} className="inline mr-1" />
                    OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100">Get API Key</a> (Pay-as-you-go)
                  </div>
                  <div className="text-green-300">
                    <Star size={12} className="inline mr-1" />
                    Gemini: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-100">Get API Key</a> (Free!)
                  </div>
                </div>
              </div>
              
              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-300">Choose AI Provider</label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-neutral-900/50 rounded-lg border border-neutral-800">
                  <button
                    onClick={() => setSelectedProvider('gemini')}
                    className={`p-4 rounded-lg text-left transition-all duration-300 transform ${
                      selectedProvider === 'gemini' 
                        ? 'bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/50 shadow-lg scale-[1.02] ring-2 ring-yellow-500/30' 
                        : 'bg-neutral-800/50 border border-neutral-700 hover:border-yellow-500/30 hover:bg-neutral-700/50 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Star className={`h-5 w-5 transition-colors ${
                          selectedProvider === 'gemini' ? 'text-yellow-400' : 'text-neutral-400'
                        }`} />
                        <span className={`font-semibold transition-colors ${
                          selectedProvider === 'gemini' ? 'text-yellow-100' : 'text-neutral-400'
                        }`}>Gemini</span>
                      </div>
                      {apiKeyStatus.gemini.valid && (
                        <CheckCircle className="h-4 w-4 text-green-400 animate-pulse" />
                      )}
                    </div>
                    <p className={`text-xs mb-1 transition-colors ${
                      selectedProvider === 'gemini' ? 'text-yellow-200/80' : 'text-neutral-500'
                    }`}>Google's AI model</p>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedProvider === 'gemini' 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                        : 'bg-green-900/20 text-green-500/70'
                    }`}>
                      ✨ Free Forever!
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedProvider('openai')}
                    className={`p-4 rounded-lg text-left transition-all duration-300 transform ${
                      selectedProvider === 'openai' 
                        ? 'bg-gradient-to-br from-yellow-600/20 to-amber-600/20 border border-yellow-500/50 shadow-lg scale-[1.02] ring-2 ring-yellow-500/30' 
                        : 'bg-neutral-800/50 border border-neutral-700 hover:border-yellow-500/30 hover:bg-neutral-700/50 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Bot className={`h-5 w-5 transition-colors ${
                          selectedProvider === 'openai' ? 'text-yellow-400' : 'text-neutral-400'
                        }`} />
                        <span className={`font-semibold transition-colors ${
                          selectedProvider === 'openai' ? 'text-yellow-100' : 'text-neutral-400'
                        }`}>OpenAI</span>
                      </div>
                      {apiKeyStatus.openai.valid && (
                        <CheckCircle className="h-4 w-4 text-green-400 animate-pulse" />
                      )}
                    </div>
                    <p className={`text-xs mb-1 transition-colors ${
                      selectedProvider === 'openai' ? 'text-yellow-200/80' : 'text-neutral-500'
                    }`}>GPT-4 models</p>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedProvider === 'openai' 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'bg-blue-900/20 text-blue-500/70'
                    }`}>
                      💳 Pay-as-you-go
                    </div>
                  </button>
                </div>
                
                {detectedProvider && detectedProvider !== selectedProvider && (
                  <div className="p-2 rounded-lg bg-amber-900/20 border border-amber-800 text-xs text-amber-200">
                    <AlertCircle size={12} className="inline mr-1" />
                    Detected {detectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key format. Auto-switching provider.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-base font-medium text-neutral-300 mb-3">
                  {selectedProvider === 'openai' ? 'OpenAI' : 'Gemini'} API Key
                </label>
                <div className="relative">
                  <PurdueInput
                    type={showApiKey ? "text" : "password"}
                    placeholder={selectedProvider === 'openai' ? "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxx" : "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX"}
                    value={apiKeys[selectedProvider]}
                    onChange={(e) => {
                      setApiKeys({...apiKeys, [selectedProvider]: e.target.value});
                      // Clear validation status when user starts typing
                      setApiKeyStatus({...apiKeyStatus, [selectedProvider]: { valid: false, testing: false }});
                      // Clear stored validation status for this provider
                      const validationStatus = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
                      validationStatus[selectedProvider] = false;
                      localStorage.setItem('api_key_validation_status', JSON.stringify(validationStatus));
                      // Notify context to update UI
                      window.dispatchEvent(new CustomEvent('apiKeyCleared'));
                    }}
                    className="pr-20 text-sm"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {apiKeyStatus[selectedProvider].testing && (
                      <div className="animate-spin h-4 w-4 border border-neutral-600 rounded-full border-t-amber-500"></div>
                    )}
                    {!apiKeyStatus[selectedProvider].testing && apiKeys[selectedProvider] && (
                      apiKeyStatus[selectedProvider].valid ? 
                        <CheckCircle size={16} className="text-green-500" /> : 
                        <XCircle size={16} className="text-red-500" />
                    )}
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-neutral-400 hover:text-neutral-200"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember API Key Option */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-800">
                <div>
                  <div className="text-sm font-medium text-neutral-200">Remember API Key</div>
                  <div className="text-xs text-neutral-400">
                    Save your API key for future sessions (stored securely in your browser)
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberApiKey}
                    onChange={(e) => setRememberApiKey(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>

              {/* Features unlocked display */}
              <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
                <h4 className="text-sm font-medium text-neutral-200 mb-4">AI Features Available:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['Intelligent Chat Assistant', 'AI Transcript Parsing', 'Course Recommendations', 'Academic Planning Help'].map((feature) => {
                    const isEnabled = apiKeyStatus.openai.valid || apiKeyStatus.gemini.valid;
                    return (
                      <div key={feature} className={`flex items-center gap-2 text-sm ${isEnabled ? 'text-green-300' : 'text-neutral-500'}`}>
                        {isEnabled ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {feature}
                      </div>
                    );
                  })}
                </div>
                
                {/* Show active provider */}
                {(apiKeyStatus.openai.valid || apiKeyStatus.gemini.valid) && (
                  <div className="mt-3 p-2 rounded bg-green-900/20 border border-green-800 text-xs text-green-200">
                    <span className="font-medium">Active Provider:</span>
                    {apiKeyStatus.gemini.valid && ' ✅ Gemini (Free)'}
                    {apiKeyStatus.openai.valid && ' ✅ OpenAI (GPT-4)'}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/70 border border-neutral-800">
                <p className="text-xs text-neutral-400">
                  <Lock size={12} className="inline mr-1" />
                  🔒 <strong>FERPA & Security Compliant:</strong> Your API key is stored only in your browser's local storage and sent directly to the AI provider (OpenAI/Google) for processing. We never store API keys, transcript data, or personal information on our servers.
                </p>
              </div>
            </div>
          </Card>

          {/* Deep Thinking Configuration */}
          <Card title="Deep Thinking & Reasoning" right={
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-800/20 text-purple-300">
                <Brain size={12} className="mr-1" />
                Enhanced AI
              </Badge>
            </div>
          }>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800">
                <div className="flex items-center gap-3 mb-3">
                  <Brain size={18} className="text-purple-400" />
                  <span className="text-base font-medium text-purple-300">DeepThink Mode</span>
                </div>
                <p className="text-sm text-purple-200 mb-3">
                  Enable advanced reasoning capabilities that show the AI's step-by-step thinking process, 
                  contextual awareness, and decision-making rationale - similar to DeepSeek's DeepThink feature.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-200">Enable Deep Thinking</div>
                      <div className="text-xs text-neutral-400">Show AI reasoning process and contextual analysis</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-200">Show Reasoning Steps</div>
                      <div className="text-xs text-neutral-400">Display step-by-step thinking process</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-200">Show Contextual Factors</div>
                      <div className="text-xs text-neutral-400">Display what context influenced the AI's reasoning</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-200">Show Alternative Approaches</div>
                      <div className="text-xs text-neutral-400">Display alternative solutions the AI considered</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-neutral-900/70 border border-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={12} className="text-neutral-400" />
                  <span className="text-xs font-medium text-neutral-300">Thinking Modes Available</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-yellow-900/20 border border-yellow-800/30">
                    <div className="font-medium text-yellow-300">Quick (3 steps)</div>
                    <div className="text-yellow-400/70">Fast responses</div>
                  </div>
                  <div className="p-2 rounded bg-green-900/20 border border-green-800/30">
                    <div className="font-medium text-green-300">Standard (5 steps)</div>
                    <div className="text-green-400/70">Balanced analysis</div>
                  </div>
                  <div className="p-2 rounded bg-blue-900/20 border border-blue-800/30">
                    <div className="font-medium text-blue-300">Deep (8 steps)</div>
                    <div className="text-blue-400/70">Comprehensive reasoning</div>
                  </div>
                  <div className="p-2 rounded bg-purple-900/20 border border-purple-800/30">
                    <div className="font-medium text-purple-300">Critical (12 steps)</div>
                    <div className="text-purple-400/70">Maximum analysis</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card title="Notification Preferences">
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-neutral-800">
                  <div>
                    <div className="text-sm font-medium text-neutral-200">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {key === 'emailAlerts' && "Receive important updates via email"}
                      {key === 'pushNotifications' && "Browser notifications for real-time alerts"}
                      {key === 'weeklyDigest' && "Weekly summary of your academic progress"}
                      {key === 'courseReminders' && "Reminders about upcoming deadlines"}
                      {key === 'gradeUpdates' && "Notifications when grades are posted"}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setNotifications({...notifications, [key]: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card title="Account Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60">
                <span className="text-sm text-neutral-300">Account Type</span>
                <Badge>Student</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60">
                <span className="text-sm text-neutral-300">Email Verified</span>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60">
                <span className="text-sm text-neutral-300">2FA Enabled</span>
                <XCircle size={16} className="text-red-400" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60">
                <span className="text-sm text-neutral-300">AI Providers</span>
                {(apiKeyStatus.openai.valid || apiKeyStatus.gemini.valid) ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <AlertCircle size={16} className="text-yellow-400" />
                )}
              </div>
            </div>
          </Card>

          {/* Privacy Settings */}
          <Card title="Privacy & Security">
            <div className="space-y-4">
              {Object.entries(privacy).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-neutral-200">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {key === 'profilePublic' && "Make your profile visible to other students"}
                      {key === 'shareProgress' && "Share progress with academic advisors"}
                      {key === 'analyticsOptIn' && "Help improve BoilerFN with usage data"}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setPrivacy({...privacy, [key]: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Data Management */}
          <Card title="Data Management">
            <div className="space-y-3">
              <PurdueButton variant="secondary" onClick={handleExportData} className="w-full">
                <Download size={16} className="mr-2" />
                Export My Data
              </PurdueButton>
              <PurdueButton 
                variant="secondary" 
                onClick={handleDeleteAccount} 
                className="w-full bg-red-900/20 border-red-800 text-red-300 hover:bg-red-900/30"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Account
              </PurdueButton>
            </div>
          </Card>

          {/* Help & Support */}
          <Card title="Help & Support">
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-neutral-300 hover:text-white transition-colors">
                📖 User Guide
              </a>
              <a href="#" className="block text-neutral-300 hover:text-white transition-colors">
                💬 Contact Support
              </a>
              <a href="#" className="block text-neutral-300 hover:text-white transition-colors">
                🐛 Report Bug
              </a>
              <a href="#" className="block text-neutral-300 hover:text-white transition-colors">
                🔒 Privacy Policy
              </a>
              <a href="#" className="block text-neutral-300 hover:text-white transition-colors">
                📋 Terms of Service
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}