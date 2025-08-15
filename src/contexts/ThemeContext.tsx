import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }
    
    // Default to dark theme
    return 'dark';
  });

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme to document
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      
      // Apply light theme CSS variables
      root.style.setProperty('--background', '#FFFFFF');
      root.style.setProperty('--foreground', '#1A1A1A');
      root.style.setProperty('--card', '#F8F8F8');
      root.style.setProperty('--card-foreground', '#1A1A1A');
      root.style.setProperty('--primary', '#CFB991');
      root.style.setProperty('--primary-foreground', '#1A1A1A');
      root.style.setProperty('--secondary', '#F5F5F5');
      root.style.setProperty('--secondary-foreground', '#4A4A4A');
      root.style.setProperty('--muted', '#F0F0F0');
      root.style.setProperty('--muted-foreground', '#6A6A6A');
      root.style.setProperty('--accent', '#E8E8E8');
      root.style.setProperty('--accent-foreground', '#2A2A2A');
      root.style.setProperty('--destructive', '#EF4444');
      root.style.setProperty('--destructive-foreground', '#FFFFFF');
      root.style.setProperty('--border', '#E0E0E0');
      root.style.setProperty('--input', '#F5F5F5');
      root.style.setProperty('--ring', '#CFB991');
      root.style.setProperty('--purdue-gold', '#CFB991');
      root.style.setProperty('--purdue-black', '#1A1A1A');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      
      // Apply dark theme CSS variables
      root.style.setProperty('--background', '#0A0A0A');
      root.style.setProperty('--foreground', '#FAFAFA');
      root.style.setProperty('--card', '#171717');
      root.style.setProperty('--card-foreground', '#FAFAFA');
      root.style.setProperty('--primary', '#CFB991');
      root.style.setProperty('--primary-foreground', '#1A1A1A');
      root.style.setProperty('--secondary', '#262626');
      root.style.setProperty('--secondary-foreground', '#FAFAFA');
      root.style.setProperty('--muted', '#171717');
      root.style.setProperty('--muted-foreground', '#A3A3A3');
      root.style.setProperty('--accent', '#262626');
      root.style.setProperty('--accent-foreground', '#FAFAFA');
      root.style.setProperty('--destructive', '#DC2626');
      root.style.setProperty('--destructive-foreground', '#FAFAFA');
      root.style.setProperty('--border', '#404040');
      root.style.setProperty('--input', '#262626');
      root.style.setProperty('--ring', '#CFB991');
      root.style.setProperty('--purdue-gold', '#CFB991');
      root.style.setProperty('--purdue-black', '#000000');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className={`theme-${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// Theme-aware component wrapper
export const withTheme = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { theme } = useTheme();
    return <Component {...props} theme={theme} />;
  };
};