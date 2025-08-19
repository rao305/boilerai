import React from "react";
import { NavLink } from "react-router-dom";
import { Bot, LayoutDashboard, Search, Calendar, GraduationCap, FileText, Settings, LogOut, User, Brain, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BoilerAILogo } from "@/components/BoilerAILogo";

// Purdue color scheme
const PURDUE_GOLD = "#CFB991";

// API Key Status Badge Component
function ApiKeyStatusBadge() {
  const { isApiKeyValid, refreshApiKeyStatus } = useApiKey();
  
  // Debug logging for state changes
  React.useEffect(() => {
    console.log('🔍 [TopNav] ApiKeyStatusBadge isApiKeyValid changed to:', isApiKeyValid);
  }, [isApiKeyValid]);
  
  const handleClick = async (e: React.MouseEvent) => {
    // If already valid, navigate to settings
    if (isApiKeyValid) {
      window.location.href = '/settings';
      return;
    }
    
    // If not valid, first try to refresh status
    e.preventDefault();
    console.log('🔄 Refreshing API key status on click...');
    const isNowValid = await refreshApiKeyStatus();
    
    // If still not valid after refresh, navigate to settings
    if (!isNowValid) {
      window.location.href = '/settings';
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
        isApiKeyValid
          ? 'bg-green-900/20 border-green-800 text-green-300 hover:bg-green-900/30'
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

export function TopNavigation() {
  const { user, logout } = useAuth();
  const { clearSessionApiKeys } = useApiKey();
  
  const navigationItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
    { name: "Course Explorer", href: "/courses", icon: Search },
    { name: "Academic Planner", href: "/planner", icon: Calendar },
    { name: "Degree Audit", href: "/audit", icon: GraduationCap },
    { name: "Transcript", href: "/transcript", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    // Clear session-only API keys before logging out
    clearSessionApiKeys();
    logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b border-neutral-800 bg-neutral-900/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <NavLink to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <BoilerAILogo size="md" showText={true} variant="default" />
              </NavLink>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === "/"}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center space-x-2 px-1 pt-1 text-sm font-medium border-b-2 transition-all duration-200",
                      isActive
                        ? "text-neutral-200"
                        : "border-transparent text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                    )
                  }
                  style={({ isActive }) => isActive ? { borderBottomColor: PURDUE_GOLD, color: PURDUE_GOLD } : {}}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center space-x-3">
              {/* API Key Status */}
              <ApiKeyStatusBadge />
              
              <div className="text-sm text-neutral-400">
                Welcome back, <span className="font-medium text-neutral-200">{user?.name}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0 hover:bg-neutral-800">
                    <div 
                      className="h-8 w-8 rounded-full flex items-center justify-center border border-neutral-700"
                      style={{ backgroundColor: `${PURDUE_GOLD}20`, borderColor: PURDUE_GOLD }}
                    >
                      <span 
                        className="text-sm font-medium"
                        style={{ color: PURDUE_GOLD }}
                      >
                        {user?.name ? getInitials(user.name) : 'U'}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-neutral-900 border-neutral-800" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-neutral-200">{user?.name}</p>
                      <p className="text-xs leading-none text-neutral-400">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-neutral-800" />
                  <DropdownMenuItem asChild className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800">
                    <NavLink to="/settings" className="w-full">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-neutral-300 hover:bg-neutral-800 focus:bg-neutral-800">
                    <NavLink to="/settings" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-neutral-800" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-neutral-800 focus:bg-neutral-800">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}