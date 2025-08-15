import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { BoilerAILogo } from '@/components/BoilerAILogo';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <BoilerAILogo size="lg" showText={false} variant="default" />
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading BoilerAI...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if not completed (except if already on onboarding page)
  // Fall back to localStorage flag to avoid loops when backend profile isn't wired yet
  const localOnboardingDone = typeof window !== 'undefined' && localStorage.getItem('onboardingCompleted') === 'true';
  const needsOnboarding = user && !localOnboardingDone && !user.preferences?.onboardingCompleted;
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Render protected component
  return <>{children}</>;
};