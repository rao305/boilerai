import React, { useState } from "react";
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
  Globe
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: localStorage.getItem('openai_api_key') || "",
  });
  const [apiKeyStatus, setApiKeyStatus] = useState({
    openai: { valid: false, testing: false },
  });
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

  const handleSaveProfile = () => {
    console.log("Saving profile:", profile);
  };

  const validateOpenAIKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) return false;
    
    setApiKeyStatus(prev => ({ ...prev, openai: { valid: false, testing: true } }));
    
    try {
      // Test the API key by making a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      const isValid = response.ok;
      setApiKeyStatus(prev => ({ ...prev, openai: { valid: isValid, testing: false } }));
      return isValid;
    } catch (error) {
      setApiKeyStatus(prev => ({ ...prev, openai: { valid: false, testing: false } }));
      return false;
    }
  };

  const handleSaveApiKeys = async () => {
    console.log("Validating and saving API keys");
    
    if (apiKeys.openai) {
      const isValid = await validateOpenAIKey(apiKeys.openai);
      if (isValid) {
        // Save to localStorage
        localStorage.setItem('openai_api_key', apiKeys.openai);
        
        // Test the OpenAI API key directly
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKeys.openai}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            alert('✅ OpenAI API key validated! Both transcript parsing and AI assistant are now unlocked.');
          } else {
            alert('⚠️ API key seems invalid. Please check your OpenAI API key.');
          }
        } catch (error) {
          alert('⚠️ Could not validate API key. Please check your internet connection and API key.');
        }
      } else {
        alert('❌ Invalid OpenAI API key. Please check and try again.');
      }
    } else {
      // Clear the key
      localStorage.removeItem('openai_api_key');
      setApiKeyStatus(prev => ({ ...prev, openai: { valid: false, testing: false } }));
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
          <Card title="AI Configuration" right={
            <div className="flex items-center gap-2">
              <Badge className={apiKeyStatus.openai.valid ? "bg-green-800/20 text-green-300" : "bg-neutral-800 text-neutral-300"}>
                {apiKeyStatus.openai.valid ? 'Connected' : 'Disconnected'}
              </Badge>
              <PurdueButton size="small" onClick={handleSaveApiKeys} disabled={apiKeyStatus.openai.testing}>
                {apiKeyStatus.openai.testing ? (
                  <div className="animate-spin h-3 w-3 border border-neutral-600 rounded-full border-t-amber-500 mr-1"></div>
                ) : (
                  <Save size={14} className="mr-1" />
                )}
                {apiKeyStatus.openai.testing ? 'Testing...' : 'Save & Test'}
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
                  Enter your OpenAI API key to unlock intelligent chat responses, AI-powered transcript parsing, 
                  and personalized academic recommendations.
                </p>
                <p className="text-xs text-blue-300">
                  <AlertCircle size={12} className="inline mr-1" />
                  Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100">platform.openai.com/api-keys</a>
                </p>
              </div>

              <div>
                <label className="block text-base font-medium text-neutral-300 mb-3">OpenAI API Key</label>
                <div className="relative">
                  <PurdueInput
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                    className="pr-20 text-sm"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {apiKeyStatus.openai.testing && (
                      <div className="animate-spin h-4 w-4 border border-neutral-600 rounded-full border-t-amber-500"></div>
                    )}
                    {!apiKeyStatus.openai.testing && apiKeys.openai && (
                      apiKeyStatus.openai.valid ? 
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

              {/* Features unlocked display */}
              <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
                <h4 className="text-sm font-medium text-neutral-200 mb-4">AI Features Available:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2 text-sm ${apiKeyStatus.openai.valid ? 'text-green-300' : 'text-neutral-500'}`}>
                    {apiKeyStatus.openai.valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    Intelligent Chat Assistant
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${apiKeyStatus.openai.valid ? 'text-green-300' : 'text-neutral-500'}`}>
                    {apiKeyStatus.openai.valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    AI Transcript Parsing
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${apiKeyStatus.openai.valid ? 'text-green-300' : 'text-neutral-500'}`}>
                    {apiKeyStatus.openai.valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    Course Recommendations
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${apiKeyStatus.openai.valid ? 'text-green-300' : 'text-neutral-500'}`}>
                    {apiKeyStatus.openai.valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    Academic Planning Help
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/70 border border-neutral-800">
                <p className="text-xs text-neutral-400">
                  <Lock size={12} className="inline mr-1" />
                  Your API key is stored locally in your browser and sent directly to OpenAI. We never see or store your key on our servers.
                </p>
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
                <span className="text-sm text-neutral-300">API Keys</span>
                <AlertCircle size={16} className="text-yellow-400" />
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