import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, subtitle, icon: Icon, className, trend }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card p-6 transition-refined hover-lift",
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center">
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className="ml-2 text-sm text-muted-foreground">vs last semester</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}