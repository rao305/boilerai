import React, { useMemo, useState, Suspense, lazy } from "react";
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
  Bell,
  LogOut,
  BookOpen,
  Brain,
  ChevronRight,
  SunMoon,
  ShieldCheck,
  Search,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AcademicPlanProvider } from "@/contexts/AcademicPlanContext";
import { ApiKeyProvider } from "@/contexts/ApiKeyContext";

// Keep login and auth pages as regular imports
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import ResendVerification from "./pages/ResendVerification";

// Lazy load main components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const CourseExplorer = lazy(() => import("./pages/CourseExplorer"));
const AcademicPlanner = lazy(() => import("./pages/AcademicPlanner"));
const DegreeAudit = lazy(() => import("./pages/DegreeAudit"));
const TranscriptManagement = lazy(() => import("./pages/TranscriptManagement"));
const Settings = lazy(() => import("./pages/Settings"));

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
  return (
    <aside className="hidden md:flex md:w-64 lg:w-80 flex-col gap-3 p-6 bg-neutral-950 border-r border-neutral-800">
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        const primary = key === "chat";
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${
              active
                ? "bg-neutral-900 ring-1 ring-neutral-800"
                : "hover:bg-neutral-900/60"
            } ${primary ? "border border-[--gold]" : ""}`}
            style={primary ? { ['--gold']: PURDUE_GOLD } : undefined}
          >
            <Icon size={20} className={active ? "text-neutral-100" : "text-neutral-300"} />
            <span className={`text-base font-medium ${active ? "text-neutral-100" : "text-neutral-300"}`}>
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

function Topbar({ onGlobalAsk, user }: { onGlobalAsk: (query: string) => void; user: any }) {
  const [q, setQ] = useState("");
  const { logout } = useAuth();

  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-neutral-800 px-4 py-3 backdrop-blur" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl" style={{ background: PURDUE_GOLD }} />
        <div className="font-semibold tracking-wide" style={{ color: PURDUE_GOLD }}>Boiler AI</div>
        <span className="ml-2 text-xs uppercase tracking-widest text-neutral-400">Purdue</span>
      </div>

      <form
        className="mx-2 flex flex-1 items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          if (!v) return;
          onGlobalAsk(v);
          setQ("");
        }}
      >
        <MessageCircle size={16} className="text-neutral-400" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          placeholder="Ask the AI Assistant… (e.g., 'Plan a 15-credit Fall schedule')"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="ml-auto hidden items-center gap-2 md:flex">
        <button className="rounded-xl p-2 hover:bg-neutral-900/70" title="Notifications">
          <Bell size={18} className="text-neutral-300" />
        </button>
        <button className="rounded-xl p-2 hover:bg-neutral-900/70" title="Theme">
          <SunMoon size={18} className="text-neutral-300" />
        </button>
        <div className="ml-1 flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-2 py-1">
          <div className="h-6 w-6 rounded-full bg-neutral-700" />
          <span className="text-sm text-neutral-300">{user?.name || 'User'}</span>
          <button className="rounded-lg p-1 hover:bg-neutral-800" title="Logout" onClick={logout}>
            <LogOut size={16} className="text-neutral-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const [current, setCurrent] = useState("dashboard");
  const { user } = useAuth();

  const onGlobalAsk = (q: string) => {
    setCurrent("chat");
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <Topbar onGlobalAsk={onGlobalAsk} user={user} />
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
              <Suspense fallback={<PageLoadingFallback />}>
                {Content}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <footer className="bg-neutral-950 border-t border-neutral-800 px-6 py-3 text-xs text-neutral-500 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            © {new Date().getFullYear()} Boiler AI • Purdue Academic Assistant
          </div>
          <div className="flex items-center gap-3">
            <span>Boiler Up!</span>
          </div>
        </div>
      </footer>

      <style>{`
        :root { --purdue-gold: ${PURDUE_GOLD}; }
        * { scrollbar-width: thin; scrollbar-color: #444 transparent; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 8px; }
      `}</style>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiKeyProvider>
          <AcademicPlanProvider>
            <TooltipProvider>
              <BrowserRouter>
                <SimpleAuthenticatedApp />
              </BrowserRouter>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </AcademicPlanProvider>
        </ApiKeyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

function SimpleAuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoadingFallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/resend-verification" element={<ResendVerification />} />
      <Route path="*" element={
        isAuthenticated ? <MainApp /> : <Login />
      } />
    </Routes>
  );
}

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

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      {Content}
    </Suspense>
  );
}

export default App;
