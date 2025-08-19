import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

// Purdue palette
const PURDUE_GOLD = "#CFB991";
const PURDUE_BLACK = "#000000";

// Unified Badge component
export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${className}`}
      style={{ borderColor: PURDUE_GOLD, color: PURDUE_GOLD }}
    >
      {children}
    </span>
  );
}

// Unified Card component
export function Card({ title, right, children, className = "" }: { 
  title: string; 
  right?: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  
  return (
    <div className={`rounded-2xl shadow-lg p-6 ring-1 ${
      theme === 'light' 
        ? 'bg-white ring-neutral-200' 
        : 'bg-neutral-900/70 ring-neutral-800'
    } ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-sm font-semibold tracking-wide ${
          theme === 'light' ? 'text-neutral-800' : 'text-neutral-200'
        }`} style={{ color: theme === 'light' ? PURDUE_BLACK : undefined }}>
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

// Purdue-themed Button
export function PurdueButton({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "medium",
  disabled = false,
  className = "",
  type = "button",
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { theme } = useTheme();
  const baseClasses = "rounded-xl font-medium transition-colors disabled:opacity-50";
  
  const sizeClasses = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-4 py-2 text-sm",
    large: "px-6 py-3 text-base"
  };

  const variantClasses = {
    primary: `hover:opacity-90`,
    secondary: theme === 'light' 
      ? "border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
      : "border border-neutral-700 text-neutral-300 hover:bg-neutral-900/70",
    ghost: theme === 'light'
      ? "text-neutral-600 hover:bg-neutral-100"
      : "text-neutral-300 hover:bg-neutral-900/60"
  };

  const style = variant === "primary" 
    ? { background: PURDUE_GOLD, color: PURDUE_BLACK } 
    : {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}

// Purdue-themed Input
export function PurdueInput({
  placeholder,
  value,
  onChange,
  className = "",
  type = "text"
}: {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  type?: string;
}) {
  const { theme } = useTheme();
  
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
        theme === 'light'
          ? 'border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-400'
          : 'border-neutral-800 bg-neutral-950/60 text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-700'
      } focus:ring-2 focus:ring-opacity-20 ${className}`}
      style={{ 
        '--tw-ring-color': PURDUE_GOLD,
        '--tw-ring-opacity': '0.2'
      } as React.CSSProperties}
    />
  );
}

// Purdue-themed Select
export function PurdueSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = ""
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
        theme === 'light'
          ? 'border-neutral-300 bg-white text-neutral-900 focus:border-neutral-400'
          : 'border-neutral-800 bg-neutral-950/60 text-neutral-200 focus:border-neutral-700'
      } focus:ring-2 focus:ring-opacity-20 ${className}`}
      style={{ 
        '--tw-ring-color': PURDUE_GOLD,
        '--tw-ring-opacity': '0.2'
      } as React.CSSProperties}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Course/Item Card for lists
export function ItemCard({
  title,
  subtitle,
  details,
  badges = [],
  actions,
  onClick,
  className = ""
}: {
  title: string;
  subtitle?: string;
  details?: string[];
  badges?: string[];
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const { theme } = useTheme();
  
  return (
    <div 
      className={`rounded-2xl p-4 ring-1 transition-all ${
        theme === 'light'
          ? 'bg-white ring-neutral-200 hover:ring-neutral-300'
          : 'bg-neutral-950/60 ring-neutral-800 hover:ring-neutral-700'
      } ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-medium mb-1 ${
            theme === 'light' ? 'text-neutral-900' : 'text-neutral-200'
          }`}>{title}</h3>
          {subtitle && (
            <p className={`text-sm mb-2 ${
              theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
            }`}>{subtitle}</p>
          )}
          {details && details.length > 0 && (
            <div className={`text-xs space-y-1 ${
              theme === 'light' ? 'text-neutral-500' : 'text-neutral-500'
            }`}>
              {details.map((detail, i) => (
                <p key={i}>{detail}</p>
              ))}
            </div>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {badges.map((badge, i) => (
                <Badge key={i}>{badge}</Badge>
              ))}
            </div>
          )}
        </div>
        {actions && (
          <div className="ml-4 flex gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Stats grid for consistent metrics display
export function StatsGrid({ stats }: {
  stats: { label: string; value: string | number; sublabel?: string }[]
}) {
  const { theme } = useTheme();
  
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, i) => (
        <div key={i} className={`rounded-xl p-3 ring-1 ${
          theme === 'light'
            ? 'bg-white ring-neutral-200'
            : 'bg-neutral-950/60 ring-neutral-800'
        }`}>
          <div className={`text-sm ${
            theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
          }`}>{stat.label}</div>
          <div className={`text-xl font-semibold ${
            theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
          }`} style={{ color: theme === 'light' ? PURDUE_BLACK : undefined }}>
            {stat.value}
          </div>
          {stat.sublabel && (
            <div className={`text-xs ${
              theme === 'light' ? 'text-neutral-500' : 'text-neutral-500'
            }`}>{stat.sublabel}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Page header component
export function PageHeader({ 
  title, 
  subtitle, 
  actions 
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { theme } = useTheme();
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${
            theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
          }`} style={{ color: theme === 'light' ? PURDUE_BLACK : undefined }}>
            {title}
          </h1>
          {subtitle && (
            <p className={`text-sm mt-1 ${
              theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
            }`}>{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}