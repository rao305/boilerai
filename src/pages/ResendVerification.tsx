import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, PurdueButton, PurdueInput } from '@/components/PurdueUI';
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const ResendVerification: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { resendVerification, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from navigation state if available
  React.useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.endsWith('@purdue.edu')) {
      return;
    }

    try {
      clearError();
      await resendVerification(email);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Resend verification failed:', error);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) clearError();
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto h-10 w-10 rounded-xl" style={{ background: "#CFB991" }} />
            <h1 className="mt-2 text-2xl font-bold">BoilerFN</h1>
          </div>
          <Card title="Verification Email Sent!">
            <div className="mb-3 p-3 rounded-lg bg-green-900/20 border border-green-800 text-sm text-green-200">
              Check your inbox at <strong>{email}</strong> and click the verification link.
            </div>
            <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800 mb-3 text-sm text-neutral-400">
              <div className="font-medium text-neutral-200 mb-1">What's next?</div>
              <ul className="space-y-1">
                <li>• Check your Purdue email inbox</li>
                <li>• Look for an email from BoilerFN</li>
                <li>• Click the "Verify My Email" button</li>
                <li>• You'll be automatically logged in</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <PurdueButton className="w-full" onClick={() => navigate('/login')}>Back to Login</PurdueButton>
              <PurdueButton
                variant="secondary"
                className="w-full"
                onClick={() => { setIsSubmitted(false); clearError(); }}
              >
                Send to Different Email
              </PurdueButton>
            </div>
          </Card>
          <div className="mt-6 text-center text-sm text-neutral-500">
            Didn't receive the email? Check spam or <button className="underline" onClick={() => { setIsSubmitted(false); clearError(); }}>try again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto h-10 w-10 rounded-xl" style={{ background: "#CFB991" }} />
          <h1 className="mt-2 text-2xl font-bold">BoilerFN</h1>
        </div>
        <Card title="Resend Verification Email">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Purdue Email Address</label>
              <PurdueInput
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your.name@purdue.edu"
              />
              {email && !email.endsWith('@purdue.edu') && (
                <p className="mt-1 text-sm text-red-400">Use your Purdue email address (@purdue.edu)</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 text-sm text-red-200">
                {error}
              </div>
            )}

            <PurdueButton className="w-full" disabled={isLoading || !email.endsWith('@purdue.edu')} type="submit">
              {isLoading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span>
              ) : (
                <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" /> Send Verification Email</span>
              )}
            </PurdueButton>
          </form>
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center text-sm text-neutral-300 hover:text-neutral-100">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </Card>
        <div className="mt-6 text-center text-sm text-neutral-500">
          Need help? Contact <a href="mailto:support@boilerai.com" className="underline">support@boilerai.com</a>
        </div>
      </div>
    </div>
  );
};

export default ResendVerification;