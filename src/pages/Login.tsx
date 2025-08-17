import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, PurdueButton, PurdueInput } from "@/components/PurdueUI";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, CheckCircle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMicrosoftAuth } from "@/contexts/MicrosoftAuthContext";
import { BoilerAILogo } from "@/components/BoilerAILogo";

// Component for the redirecting state
function RedirectingToLogin({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [hasRedirected, setHasRedirected] = useState(false);
  
  useEffect(() => {
    if (!hasRedirected) {
      console.log('🔄 Already authenticated, redirecting to dashboard');
      setHasRedirected(true);
      navigate('/main', { replace: true });
    }
  }, [navigate, hasRedirected]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <div className="text-center">
        <p>Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, register, error, clearError, isLoading, isAuthenticated } = useAuth();
  const { login: microsoftLogin, isLoading: isMsLoading, error: msError, clearError: clearMsError, isAuthenticated: isMsAuthenticated } = useMicrosoftAuth();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [devLoginAttempted, setDevLoginAttempted] = useState(false);
  const [useMicrosoft, setUseMicrosoft] = useState(false);

  // Removed duplicate useEffect - authentication redirect handled below

  // Clear error when switching between login/register
  useEffect(() => {
    if (typeof clearError === 'function') clearError();
    if (typeof clearMsError === 'function') clearMsError();
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
  }, [isLogin]); // Only depend on isLogin, safely call functions

  const validatePurdueEmail = (email: string) => {
    return email.endsWith("@purdue.edu");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't process if already authenticated
    if (isAuthenticated || isMsAuthenticated) {
      console.log('🚫 Already authenticated, skipping login');
      return;
    }
    
    clearError();

    // Development bypass disabled - always use real authentication
    if (false) {
      console.log('🔧 Login component: Development bypass triggered - ONCE ONLY');
      setDevLoginAttempted(true);
      try {
        await login("/dev", "bypass");
        console.log('🎯 Login component: Dev login successful');
        return;
      } catch (err) {
        console.error('❌ Login component: Dev login failed', err);
        setDevLoginAttempted(false); // Reset on failure
        return;
      }
    }

    if (!validatePurdueEmail(email)) {
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      return;
    }

    if (!isLogin && name.trim().length < 2) {
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        // Navigation will happen automatically via useEffect when isAuthenticated changes
      } else {
        const result = await register(email, password, name.trim());
        if (result.needsVerification) {
          setRegistrationSuccess(true);
          setRegisteredEmail(email);
        }
        // If no verification needed, navigation will happen automatically
      }
    } catch (error: any) {
      // Handle special case for email verification needed
      if (error.needsVerification) {
        // Show link to resend verification
        console.log('Email verification required');
      }
      console.error('Authentication error:', error);
    }
  };

  // Clear any stuck authentication on component mount
  useEffect(() => {
    // Force clear any stuck authentication state
    localStorage.removeItem('msUser');
    localStorage.removeItem('msAccessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('session');
  }, []);

  // Redirect if authenticated, but with protection against loops
  useEffect(() => {
    if ((isAuthenticated || isMsAuthenticated) && window.location.pathname === '/login') {
      console.log('🔄 Authenticated user detected, redirecting to dashboard');
      navigate('/main', { replace: true });
    }
  }, [isAuthenticated, isMsAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <BoilerAILogo size="xl" showText={false} variant="default" />
          </div>
          <p className="mt-2 text-neutral-400">AI-powered academic assistant for Purdue</p>
        </div>

        <Card title={isLogin ? "Welcome back" : "Create account"}>
          <p className="-mt-2 mb-6 text-sm text-neutral-400">
            {isLogin ? "Sign in to your BoilerAI account" : "Join with your Purdue email"}
          </p>
          
          {/* Microsoft Sign-In - Primary Method */}
          <div className="mb-6">
            <PurdueButton
              onClick={microsoftLogin}
              disabled={isMsLoading}
              className="w-full mb-4 bg-[#0078d4] hover:bg-[#106ebe] border-[#0078d4]"
            >
              {isMsLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> 
                  Connecting to Microsoft...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                  Sign in with Purdue Microsoft
                </span>
              )}
            </PurdueButton>
            
            {msError && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800">
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                  <div className="text-red-200">
                    <p>{msError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-950 px-2 text-neutral-500">Or use email</span>
              </div>
            </div>
          </div>

          {registrationSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                <div className="text-sm text-green-200">
                  <p className="font-medium">Account created!</p>
                  <p>We sent a verification email to <strong>{registeredEmail}</strong>.</p>
                  <Link to="/resend-verification" state={{ email: registeredEmail }} className="underline text-green-300">
                    Resend verification
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <div className="text-red-200">
                  <p>{error}</p>
                  {error.includes('verify your email') && (
                    <Link to="/resend-verification" state={{ email }} className="underline text-red-300">
                      Resend verification email
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {!registrationSuccess && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Full Name</label>
                  <PurdueInput
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {name && name.trim().length < 2 && (
                    <p className="mt-1 text-sm text-red-400">Name must be at least 2 characters long</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Purdue Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                  <PurdueInput
                    type={email === "/dev" ? "text" : "email"}
                    placeholder="your.email@purdue.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {email && email !== "/dev" && !validatePurdueEmail(email) && (
                  <p className="mt-1 text-sm text-red-400">Use your Purdue email address (@purdue.edu)</p>
                )}
                {email === "/dev" && process.env.NODE_ENV === 'development' && (
                  <p className="mt-1 text-sm text-green-400">Development bypass mode</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                  <PurdueInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-8 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {password && email !== "/dev" && password.length < 6 && (
                  <p className="mt-1 text-sm text-red-400">Password must be at least 6 characters</p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Confirm Password</label>
                  <PurdueInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
                  )}
                </div>
              )}

              {!isLogin && (
                <div className="my-4 border-t border-neutral-800 pt-2 text-xs text-neutral-500">
                  After creating your account, check your Purdue email for a verification link.
                </div>
              )}

              <PurdueButton
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  (email !== "/dev" && !validatePurdueEmail(email)) ||
                  (email !== "/dev" && password.length < 6) ||
                  (!isLogin && password !== confirmPassword) ||
                  (!isLogin && name.trim().length < 2)
                }
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {isLogin ? "Signing In..." : "Creating Account..."}</span>
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </PurdueButton>
            </form>
          )}

          {!registrationSuccess && (
            <>
              {/* Privacy Notice for Microsoft Auth */}
              <div className="mt-4 mb-6 bg-green-900/20 border border-green-800 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-medium text-green-200 mb-1">Recommended: Purdue Microsoft</h4>
                    <p className="text-green-300">
                      Use your official @purdue.edu Microsoft account for instant access. No additional passwords needed!
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-sm text-neutral-400">
                <span>{isLogin ? "Don't have an account?" : "Already have an account?"} </span>
                <button
                  className="text-[--purdue-gold] hover:opacity-80"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setRegistrationSuccess(false);
                    setRegisteredEmail("");
                  }}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </>
          )}

          {registrationSuccess && (
            <div className="mt-6 space-y-2">
              <PurdueButton
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setIsLogin(true);
                  setRegistrationSuccess(false);
                  setRegisteredEmail("");
                  clearError();
                }}
              >
                Back to Login
              </PurdueButton>
              <Link to="/resend-verification" state={{ email: registeredEmail }}>
                <PurdueButton variant="secondary" className="w-full">Resend Verification Email</PurdueButton>
              </Link>
            </div>
          )}
        </Card>

        {/* Development Test Credentials */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 rounded-xl bg-blue-950/40 border border-blue-800/50">
            <div>
              <p className="text-sm font-medium text-blue-300 mb-3 text-center">Development Test Options</p>
              <div className="space-y-2 text-sm text-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-blue-300">Microsoft Auth:</span>
                  <span className="font-mono text-xs">Dev mode active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300">Email Bypass:</span>
                  <span className="font-mono text-xs">"/dev" as email</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300">Test Email:</span>
                  <span className="font-mono text-xs">testdev@purdue.edu</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-neutral-500">
          Restricted to Purdue University students, faculty, and staff
        </div>
      </div>
    </div>
  );
}