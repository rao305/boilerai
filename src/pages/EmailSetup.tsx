import { useState } from 'react';
import { Card, PurdueButton, PurdueInput, Badge } from '@/components/PurdueUI';
import { Mail, Settings, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function EmailSetup() {
  const [emailConfig, setEmailConfig] = useState({
    emailUser: '',
    emailPass: '',
    emailFrom: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);

  // Check current email configuration on component mount
  useState(() => {
    checkCurrentConfig();
  }, []);

  const checkCurrentConfig = async () => {
    try {
      const response = await fetch('/api/admin/email-config');
      if (response.ok) {
        const config = await response.json();
        setCurrentConfig(config);
      }
    } catch (error) {
      console.error('Failed to check current config:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/setup-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailUser: emailConfig.emailUser,
          emailPass: emailConfig.emailPass,
          emailFrom: emailConfig.emailFrom || `BoilerAI Academic Planner <${emailConfig.emailUser}>`
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Email service configured successfully! Real email verification is now active.'
        });
        setCurrentConfig({
          emailUser: emailConfig.emailUser,
          emailFrom: emailConfig.emailFrom || `BoilerAI Academic Planner <${emailConfig.emailUser}>`,
          status: 'active'
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Failed to configure email service'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to connect to server. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testEmailService = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testEmail: emailConfig.emailUser // Send test email to the configured address
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test email service'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto px-4 py-8 max-w-2xl text-neutral-100 bg-neutral-950 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Email Service Setup
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Configure Microsoft Outlook SMTP to send verification emails to @purdue.edu accounts
        </p>
      </div>

      {/* Current Status */}
      {currentConfig && (
        <Card title="Current Configuration" className="mb-6">
          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium text-neutral-300">Email Account</div>
              <p className="text-sm text-neutral-400">{currentConfig.emailUser}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-300">Sender Name</div>
              <p className="text-sm text-neutral-400">{currentConfig.emailFrom}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-neutral-300">Status</div>
              <Badge>{currentConfig.status === 'active' ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
        </Card>
      )}

      <Card title="Microsoft Outlook Configuration" className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emailUser" className="block text-sm font-medium text-neutral-300 mb-2">Outlook Email Address</label>
            <PurdueInput
              id="emailUser"
              type="email"
              placeholder="yourname@outlook.com"
              value={emailConfig.emailUser}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, emailUser: e.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="emailPass" className="block text-sm font-medium text-neutral-300 mb-2">Password or App Password</label>
            <div className="relative">
              <PurdueInput
                id="emailPass"
                type={showPassword ? "text" : "password"}
                placeholder="Your Outlook password or app password"
                value={emailConfig.emailPass}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, emailPass: e.target.value }))}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="emailFrom" className="block text-sm font-medium text-neutral-300 mb-2">Sender Name (Optional)</label>
            <PurdueInput
              id="emailFrom"
              placeholder="BoilerFN Academic Assistant"
              value={emailConfig.emailFrom}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, emailFrom: e.target.value }))}
            />
            <p className="text-xs text-neutral-500 mt-1">
              Leave blank to use: "BoilerFN Academic Assistant &lt;{emailConfig.emailUser}&gt;"
            </p>
          </div>

          <div className="flex gap-3">
            <PurdueButton type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Configuring...' : 'Configure Email Service'}
            </PurdueButton>
            {emailConfig.emailUser && emailConfig.emailPass && (
              <PurdueButton type="button" variant="secondary" onClick={testEmailService} disabled={isLoading}>
                Test Email
              </PurdueButton>
            )}
          </div>
        </form>

        {testResult && (
          <div className={`mt-4 p-3 rounded-lg border ${testResult.success ? 'border-green-800 bg-green-900/20 text-green-200' : 'border-red-800 bg-red-900/20 text-red-200'}`}>
            {testResult.message}
          </div>
        )}
      </Card>

      {/* Setup Instructions */}
      <Card title="Setup Instructions">
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium text-neutral-200">For Better Security (Recommended):</div>
            <ol className="list-decimal list-inside text-neutral-400 space-y-1 mt-2">
              <li>Go to <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" className="underline">Microsoft Account Security</a></li>
              <li>Click "Advanced security options"</li>
              <li>Find "App passwords" and create a new one</li>
              <li>Name it "BoilerFN Academic Assistant"</li>
              <li>Use the generated app password above</li>
            </ol>
          </div>
          <div>
            <div className="font-medium text-neutral-200">What Happens After Setup:</div>
            <ul className="list-disc list-inside text-neutral-400 space-y-1 mt-2">
              <li>Verification emails sent to @purdue.edu accounts</li>
              <li>BoilerFN email branding</li>
              <li>Secure SMTP over TLS encryption</li>
              <li>24-hour expiring verification links</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}