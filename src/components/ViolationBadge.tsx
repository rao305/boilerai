/**
 * Violation Badge Component
 * 
 * Displays academic policy violations and warnings with different severity levels
 * Shows prerequisite issues, GPA warnings, credit overloads, etc.
 */

import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, Info, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';

type ViolationType = 
  | 'prerequisite_missing'
  | 'gpa_insufficient' 
  | 'credit_overload'
  | 'corequisite_missing'
  | 'graduation_requirement'
  | 'policy_violation'
  | 'schedule_conflict'
  | 'deadline_warning';

type SeverityLevel = 'critical' | 'warning' | 'info';

interface Violation {
  id: string;
  type: ViolationType;
  severity: SeverityLevel;
  title: string;
  description: string;
  affected_courses?: string[];
  remediation_steps?: string[];
  deadline?: string;
  auto_resolvable?: boolean;
}

interface ViolationBadgeProps {
  violation: Violation;
  variant?: 'compact' | 'detailed';
  showRemediation?: boolean;
  onResolve?: (violationId: string) => void;
  className?: string;
}

const ViolationBadge: React.FC<ViolationBadgeProps> = ({
  violation,
  variant = 'compact',
  showRemediation = true,
  onResolve,
  className = ''
}) => {
  const getSeverityConfig = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return {
          icon: XCircle,
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          badgeVariant: 'destructive' as const,
          alertClass: 'border-red-200 bg-red-50'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          badgeVariant: 'outline' as const,
          alertClass: 'border-yellow-200 bg-yellow-50'
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          badgeVariant: 'secondary' as const,
          alertClass: 'border-blue-200 bg-blue-50'
        };
    }
  };

  const getTypeConfig = (type: ViolationType) => {
    const configs = {
      prerequisite_missing: {
        label: 'Missing Prerequisite',
        color: 'red',
        description: 'Required prerequisite course not completed'
      },
      gpa_insufficient: {
        label: 'GPA Requirement',
        color: 'orange',
        description: 'GPA below minimum requirement'
      },
      credit_overload: {
        label: 'Credit Overload',
        color: 'yellow',
        description: 'Credit hours exceed normal limit'
      },
      corequisite_missing: {
        label: 'Missing Corequisite',
        color: 'red',
        description: 'Required corequisite course not enrolled'
      },
      graduation_requirement: {
        label: 'Graduation Requirement',
        color: 'purple',
        description: 'Graduation requirement not met'
      },
      policy_violation: {
        label: 'Policy Violation',
        color: 'red',
        description: 'Academic policy violation detected'
      },
      schedule_conflict: {
        label: 'Schedule Conflict',
        color: 'orange',
        description: 'Course time conflict detected'
      },
      deadline_warning: {
        label: 'Deadline Warning',
        color: 'yellow',
        description: 'Important deadline approaching'
      }
    };
    
    return configs[type] || configs.policy_violation;
  };

  const severityConfig = getSeverityConfig(violation.severity);
  const typeConfig = getTypeConfig(violation.type);
  const Icon = severityConfig.icon;

  const handleResolve = () => {
    if (onResolve && violation.auto_resolvable) {
      onResolve(violation.id);
    }
  };

  const compactBadge = (
    <Badge 
      variant={severityConfig.badgeVariant}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1
        ${severityConfig.bgColor} ${severityConfig.textColor}
        hover:opacity-90 transition-opacity
        ${className}
      `}
    >
      <Icon className="w-3 h-3" />
      <span className="font-medium text-xs">
        {typeConfig.label}
      </span>
      {violation.affected_courses && violation.affected_courses.length > 0 && (
        <span className="text-xs opacity-75">
          ({violation.affected_courses.length})
        </span>
      )}
    </Badge>
  );

  if (variant === 'compact') {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          {compactBadge}
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-4" side="top" sideOffset={5}>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 ${severityConfig.textColor}`} />
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-sm">{violation.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {violation.description}
                </p>
              </div>
            </div>

            {violation.affected_courses && violation.affected_courses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Affected Courses:
                </p>
                <div className="flex flex-wrap gap-1">
                  {violation.affected_courses.map((course, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {course}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {violation.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Deadline: {new Date(violation.deadline).toLocaleDateString()}
                </span>
              </div>
            )}

            {showRemediation && violation.remediation_steps && violation.remediation_steps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Recommended Actions:
                </p>
                <ul className="space-y-1">
                  {violation.remediation_steps.slice(0, 3).map((step, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {violation.auto_resolvable && onResolve && (
              <Button
                size="sm"
                onClick={handleResolve}
                className="w-full"
                variant="outline"
              >
                Auto-Resolve Issue
              </Button>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  // Detailed variant
  return (
    <Alert className={`${severityConfig.alertClass} ${className}`}>
      <Icon className={`w-5 h-5 ${severityConfig.textColor}`} />
      <AlertDescription className="ml-2">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">{violation.title}</h4>
            <p className="text-sm">{violation.description}</p>
          </div>

          {violation.affected_courses && violation.affected_courses.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Affected Courses:</p>
              <div className="flex flex-wrap gap-1">
                {violation.affected_courses.map((course, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {course}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {violation.deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>Deadline: {new Date(violation.deadline).toLocaleDateString()}</span>
            </div>
          )}

          {showRemediation && violation.remediation_steps && violation.remediation_steps.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Recommended Actions:</p>
              <ul className="space-y-1">
                {violation.remediation_steps.map((step, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {violation.auto_resolvable && onResolve && (
            <Button
              size="sm"
              onClick={handleResolve}
              variant="outline"
              className="mt-2"
            >
              Auto-Resolve Issue
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

// Container component for multiple violations
interface ViolationListProps {
  violations: Violation[];
  maxVisible?: number;
  groupBySeverity?: boolean;
  onResolve?: (violationId: string) => void;
  className?: string;
}

export const ViolationList: React.FC<ViolationListProps> = ({
  violations,
  maxVisible = 5,
  groupBySeverity = true,
  onResolve,
  className = ''
}) => {
  const [showAll, setShowAll] = React.useState(false);

  if (violations.length === 0) {
    return null;
  }

  const sortedViolations = groupBySeverity 
    ? [...violations].sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    : violations;

  const visibleViolations = showAll ? sortedViolations : sortedViolations.slice(0, maxVisible);
  const hasMore = violations.length > maxVisible;

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  return (
    <div className={`space-y-3 ${className}`}>
      {violations.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="font-medium text-sm">Academic Issues</h4>
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} Critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-800">
                  {warningCount} Warning{warningCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs h-auto py-1 px-2"
            >
              {showAll ? 'Show less' : `Show all ${violations.length}`}
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {visibleViolations.map((violation) => (
          <ViolationBadge
            key={violation.id}
            violation={violation}
            variant="detailed"
            onResolve={onResolve}
          />
        ))}
      </div>
    </div>
  );
};

export default ViolationBadge;