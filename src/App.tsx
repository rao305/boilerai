import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Home,
  Calendar,
  FileUp,
  MessageCircle,
  Settings as SettingsIcon,
  LogOut,
  BookOpen,
  Brain,
  ChevronRight,
  Sun,
  Moon,
  ShieldCheck,
  Search,
  Key,
  Unlock,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MicrosoftAuthProvider } from "@/contexts/MicrosoftAuthContext";
import { AcademicPlanProvider } from "@/contexts/AcademicPlanContext";
import { ApiKeyProvider } from "@/contexts/ApiKeyContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { SessionAwareComponent } from "@/components/SessionAwareComponent";
import { UserSessionControl } from "@/components/UserSessionControl";
import { OnboardingHandler } from "@/components/OnboardingHandler";
import type { User } from "@/contexts/AuthContext";
import { BoilerAILogo } from "@/components/BoilerAILogo";
import { logEnvironmentStatus } from "@/utils/envValidation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useApiKey } from "@/contexts/ApiKeyContext";

// Keep login and auth pages as regular imports
import Login from "./pages/Login";
import StreamlinedLogin from "./pages/StreamlinedLogin";
import VerifyEmail from "./pages/VerifyEmail";
import ResendVerification from "./pages/ResendVerification";
import Onboarding from "./pages/Onboarding";

// Regular imports to fix dynamic import error
import Dashboard from "./pages/Dashboard";
import AIAssistant from "./pages/AIAssistant";
import CourseExplorer from "./pages/CourseExplorer";
import AcademicPlanner from "./pages/AcademicPlanner";
import DegreeAudit from "./pages/DegreeAudit";
import TranscriptManagement from "./pages/TranscriptManagement";
import Settings from "./pages/Settings";
import DevDashboard from "./pages/DevDashboard";

// Purdue palette
const PURDUE_BLACK = "#000000";
const PURDUE_GOLD = "#CFB991";

// Navigation tabs
const tabs = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "chat", label: "AI Assistant", icon: MessageCircle },
  { key: "explorer", label: "Course Explorer", icon: BookOpen },
  { key: "planner", label: "Academic Planner", icon: Calendar },
  { key: "audit", label: "Degree Audit", icon: ShieldCheck },
  { key: "transcript", label: "Transcript", icon: FileUp },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: PURDUE_GOLD }}></div>
      <p className="text-neutral-400">Loading...</p>
    </div>
  </div>
);

function Sidebar({ current, onSelect }: { current: string; onSelect: (key: string) => void }) {
  const { theme } = useTheme();
  
  return (
    <aside className={`hidden md:flex md:w-64 lg:w-80 flex-col gap-3 p-6 border-r ${
      theme === 'light'
        ? 'bg-white border-neutral-200'
        : 'bg-neutral-950 border-neutral-800'
    }`}>
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        const primary = key === "chat";
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${
              active
                ? theme === 'light'
                  ? 'bg-neutral-100 ring-1 ring-neutral-200'
                  : 'bg-neutral-900 ring-1 ring-neutral-800'
                : theme === 'light'
                  ? 'hover:bg-neutral-50'
                  : 'hover:bg-neutral-900/60'
            } ${primary ? "border border-[--gold]" : ""}`}
            style={primary ? { ['--gold']: PURDUE_GOLD } : undefined}
          >
            <Icon size={20} className={active 
              ? theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
              : theme === 'light' ? 'text-neutral-600' : 'text-neutral-300'
            } />
            <span className={`text-base font-medium ${active 
              ? theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
              : theme === 'light' ? 'text-neutral-600' : 'text-neutral-300'
            }`}>
              {label}
            </span>
            <span className="ml-auto opacity-60">
              <ChevronRight size={18} />
            </span>
          </button>
        );
      })}
    </aside>
  );
}

// Compact API Key Status Component
function ApiKeyStatusBadge({ onShowSettings }: { onShowSettings: () => void }) {
  const { isApiKeyValid, refreshApiKeyStatus } = useApiKey();
  const { theme } = useTheme();
  
  const handleClick = async (e: React.MouseEvent) => {
    // If already valid, just show settings
    if (isApiKeyValid) {
      onShowSettings();
      return;
    }
    
    // If not valid, first try to refresh status
    e.preventDefault();
    console.log('🔄 Refreshing API key status on click...');
    const isNowValid = await refreshApiKeyStatus();
    
    // If still not valid after refresh, show settings
    if (!isNowValid) {
      onShowSettings();
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
        isApiKeyValid
          ? theme === 'light'
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            : 'bg-green-900/20 border-green-800 text-green-300 hover:bg-green-900/30'
          : theme === 'light'
            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            : 'bg-amber-900/20 border-amber-800 text-amber-300 hover:bg-amber-900/30'
      }`}
      title={isApiKeyValid ? "AI features unlocked - Click to manage your API key" : "Click to setup your own OpenAI API key or refresh status"}
    >
      {isApiKeyValid ? (
        <>
          <Unlock size={14} />
          <span className="text-xs font-medium">AI Ready</span>
        </>
      ) : (
        <>
          <Brain size={14} />
          <span className="text-xs font-medium">Add Your API Key</span>
        </>
      )}
    </button>
  );
}

interface TopbarProps {
  onGlobalAsk: (query: string) => void;
  user: User | null;
  onNavigateToSettings: () => void;
}

function Topbar({ onGlobalAsk, user, onNavigateToSettings }: TopbarProps) {
  const [q, setQ] = useState("");
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Check if user is developer
  const isDeveloper = user?.email?.includes('dev') || user?.email?.includes('admin');

  return (
    <div className={`sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3 backdrop-blur ${
      theme === 'light' 
        ? 'border-neutral-200 bg-white/90' 
        : 'border-neutral-800 bg-black/75'
    }`}>
      <div className="flex items-center gap-2">
        <BoilerAILogo size="md" showText={true} variant="default" />
        <span className={`ml-2 text-xs uppercase tracking-widest ${
          theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
        }`}>Purdue</span>
      </div>

      {/* Empty space for future features - no global AI input */}
      <div className="flex-1" />

      <div className="ml-auto hidden items-center gap-3 md:flex">
        {/* API Key Status */}
        <ApiKeyStatusBadge onShowSettings={onNavigateToSettings} />
        
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className={`rounded-xl p-2 transition-colors ${
            theme === 'light'
              ? 'hover:bg-neutral-100 text-neutral-600'
              : 'hover:bg-neutral-900/70 text-neutral-300'
          }`} 
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        
        {/* Developer Settings Shortcut */}
        {isDeveloper && (
          <button 
            onClick={onNavigateToSettings}
            className={`rounded-xl p-2 transition-colors ${
              theme === 'light'
                ? 'hover:bg-neutral-100 text-neutral-600'
                : 'hover:bg-neutral-900/70 text-neutral-300'
            }`} 
            title="Settings (Developer)"
          >
            <SettingsIcon size={18} />
          </button>
        )}
        
        {/* User Profile Menu */}
        <UserSessionControl />
      </div>
    </div>
  );
}

function MainApp() {
  const [current, setCurrent] = useState("dashboard");
  const { user } = useAuth();
  
  // Listen for navigation events from developer settings shortcut
  useEffect(() => {
    const handleNavigate = (event: any) => {
      setCurrent(event.detail);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  const onGlobalAsk = (q: string) => {
    setCurrent("chat");
  };

  const onNavigateToSettings = () => {
    setCurrent("settings");
  };

  const Content = useMemo(() => {
    switch (current) {
      case "dashboard":
        return <Dashboard />;
      case "chat":
        return <AIAssistant />;
      case "explorer":
        return <CourseExplorer />;
      case "planner":
        return <AcademicPlanner />;
      case "audit":
        return <DegreeAudit />;
      case "transcript":
        return <TranscriptManagement />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }, [current]);

  const { theme } = useTheme();
  
  return (
    <SessionAwareComponent requireAuth={true} dataIsolation={true}>
      <div className={`min-h-screen flex flex-col ${
        theme === 'light' 
          ? 'bg-white text-neutral-900' 
          : 'bg-neutral-950 text-neutral-100'
      }`}>
      <Topbar onGlobalAsk={onGlobalAsk} user={user} onNavigateToSettings={onNavigateToSettings} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={current} onSelect={setCurrent} />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {Content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <footer className={`border-t px-6 py-3 text-xs flex-shrink-0 ${
        theme === 'light'
          ? 'bg-white border-neutral-200 text-neutral-500'
          : 'bg-neutral-950 border-neutral-800 text-neutral-500'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            © {new Date().getFullYear()} BoilerAI • Purdue Academic Assistant
          </div>
          <div className="flex items-center gap-3">
            <span>Boiler Up!</span>
          </div>
        </div>
      </footer>

      <style>{`
        :root { --purdue-gold: ${PURDUE_GOLD}; }
        * { scrollbar-width: thin; scrollbar-color: ${theme === 'light' ? '#ccc' : '#444'} transparent; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${theme === 'light' ? '#bbb' : '#3a3a3a'}; border-radius: 8px; }
      `}</style>
      </div>
    </SessionAwareComponent>
  );
}

const queryClient = new QueryClient();

const App = () => {
  
  // Validate environment variables on startup
  React.useEffect(() => {
    logEnvironmentStatus();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MicrosoftAuthProvider>
          <AuthProvider>
            <ApiKeyProvider>
              <AcademicPlanProvider>
                <TooltipProvider>
                  <BrowserRouter 
                    future={{ 
                      v7_startTransition: true,
                      v7_relativeSplatPath: true 
                    }}
                  >
                    <OnboardingHandler>
                      <Routes>
                        {/* Root route redirects to streamlined login */}
                        <Route path="/" element={<StreamlinedLogin />} />
                        
                        {/* Public routes */}
                        <Route path="/login" element={<StreamlinedLogin />} />
                        <Route path="/login/legacy" element={<Login />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                        <Route path="/resend-verification" element={<ResendVerification />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/dev" element={
                          <ProtectedRoute>
                            <DevDashboard />
                          </ProtectedRoute>
                        } />

                        {/* Protected catch-all */}
                        <Route path="*" element={
                          <ProtectedRoute>
                            <MainApp />
                          </ProtectedRoute>
                        } />
                      </Routes>
                    </OnboardingHandler>
                  </BrowserRouter>
                  <Toaster />
                  <Sonner />
                </TooltipProvider>
              </AcademicPlanProvider>
            </ApiKeyProvider>
          </AuthProvider>
        </MicrosoftAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

function MainContent({ current }: { current: string }) {
  const Content = useMemo(() => {
    switch (current) {
      case "dashboard":
        return <Dashboard />;
      case "chat":
        return <AIAssistant />;
      case "explorer":
        return <CourseExplorer />;
      case "planner":
        return <AcademicPlanner />;
      case "audit":
        return <DegreeAudit />;
      case "transcript":
        return <TranscriptManagement />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }, [current]);

  return Content;
}

export default App;
