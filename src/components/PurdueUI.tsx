import React from "react";

// Purdue palette
const PURDUE_GOLD = "#CFB991";

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
  return (
    <div className={`rounded-2xl bg-neutral-900/70 ring-1 ring-neutral-800 shadow-lg p-6 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-200">{title}</h3>
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
  const baseClasses = "rounded-xl font-medium transition-colors disabled:opacity-50";
  
  const sizeClasses = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-4 py-2 text-sm",
    large: "px-6 py-3 text-base"
  };

  const variantClasses = {
    primary: `text-neutral-900 hover:opacity-90`,
    secondary: "border border-neutral-700 text-neutral-300 hover:bg-neutral-900/70",
    ghost: "text-neutral-300 hover:bg-neutral-900/60"
  };

  const style = variant === "primary" ? { background: PURDUE_GOLD } : {};

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
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-500 focus:border-neutral-700 ${className}`}
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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-700 ${className}`}
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
  return (
    <div 
      className={`rounded-2xl bg-neutral-950/60 p-4 ring-1 ring-neutral-800 hover:ring-neutral-700 transition-all ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-neutral-200 mb-1">{title}</h3>
          {subtitle && (
            <p className="text-sm text-neutral-400 mb-2">{subtitle}</p>
          )}
          {details && details.length > 0 && (
            <div className="text-xs text-neutral-500 space-y-1">
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
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, i) => (
        <div key={i} className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
          <div className="text-neutral-400 text-sm">{stat.label}</div>
          <div className="text-xl font-semibold text-neutral-100">{stat.value}</div>
          {stat.sublabel && (
            <div className="text-xs text-neutral-500">{stat.sublabel}</div>
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
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{title}</h1>
          {subtitle && (
            <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>
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