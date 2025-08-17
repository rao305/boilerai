import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail, AlertCircle } from 'lucide-react';
import { BoilerAILogo } from '@/components/BoilerAILogo';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, isLoading, error, clearError } = useAuth();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'invalid'>('verifying');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    const handleVerification = async () => {
      if (!token) {
        setStatus('invalid');
        setMessage('Invalid verification link. Please check your email for the correct link.');
        return;
      }

      try {
        clearError();
        await verifyEmail(token);
        setStatus('success');
        setMessage('Email verified successfully! You are now logged in.');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/main');
        }, 3000);
      } catch (error: any) {
        console.error('Email verification failed:', error);
        setStatus('error');
        setMessage(error.message || 'Email verification failed. The link may be expired or invalid.');
      }
    };

    handleVerification();
  }, [token, verifyEmail, clearError, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'invalid':
        return <AlertCircle className="h-12 w-12 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'invalid':
        return 'border-orange-200 bg-orange-50';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BoilerAILogo size="lg" showText={false} variant="default" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#CFB991]">Boiler</span>
            <span className="text-foreground">AI</span>
          </h1>
          <p className="text-muted-foreground">
            Your AI-powered academic assistant at Purdue University
          </p>
        </div>

        <Card className={`shadow-lg ${getStatusColor()}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            
            <CardTitle className="text-2xl font-bold text-gray-900">
              {status === 'verifying' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
              {status === 'invalid' && 'Invalid Link'}
            </CardTitle>
            
            <CardDescription>
              {status === 'verifying' && 'Please wait while we verify your email address.'}
              {status === 'success' && 'Welcome to BoilerAI! Your AI-powered academic assistant.'}
              {status === 'error' && 'There was a problem verifying your email.'}
              {status === 'invalid' && 'The verification link appears to be invalid.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Status Message */}
            <div className="text-center">
              <p className="text-gray-600">
                {message}
              </p>
            </div>

            {/* Error Alert */}
            {(status === 'error' || error) && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  {error || message}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Actions */}
            {status === 'success' && (
              <div className="space-y-3">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">
                    🎉 Your BoilerAI account is now active! Redirecting to dashboard in 3 seconds...
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={() => navigate('/main')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Go to BoilerAI Dashboard
                </Button>
              </div>
            )}

            {/* Error Actions */}
            {(status === 'error' || status === 'invalid') && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/login')}
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                  
                  <Link to="/resend-verification">
                    <Button 
                      variant="outline"
                      className="w-full"
                    >
                      Request New Verification Email
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Loading State */}
            {status === 'verifying' && isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
                <span className="text-gray-600">Verifying your email...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Need help? Contact support at</p>
          <a 
            href="mailto:support@boilerai.com" 
            className="text-indigo-600 hover:text-indigo-500"
          >
            support@boilerai.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;