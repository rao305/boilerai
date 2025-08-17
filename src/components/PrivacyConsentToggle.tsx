/**
 * Privacy Consent Toggle Component
 * 
 * Implements FERPA-compliant privacy controls with granular consent options
 * Provides clear explanations and privacy-first defaults
 */

import React, { useState, useEffect } from 'react';
import { Shield, Eye, BarChart3, Users, Database, Settings, Info, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Label } from '@/components/ui/label';
import { privacyRedactionService } from '@/services/privacyRedactionService';

interface ConsentSettings {
  allow_anonymous_metrics: boolean;
  allow_redacted_examples: boolean;
  allow_academic_progress_tracking: boolean;
  data_retention_days: number;
  sharing_permissions: {
    academic_advisors: boolean;
    system_improvement: boolean;
    research_anonymized: boolean;
  };
}

interface PrivacyConsentToggleProps {
  userId: string;
  onConsentChange?: (settings: ConsentSettings) => void;
  showDetailedView?: boolean;
  className?: string;
}

const PrivacyConsentToggle: React.FC<PrivacyConsentToggleProps> = ({
  userId,
  onConsentChange,
  showDetailedView = false,
  className = ''
}) => {
  const [consent, setConsent] = useState<ConsentSettings>({
    allow_anonymous_metrics: false,
    allow_redacted_examples: false,
    allow_academic_progress_tracking: false,
    data_retention_days: 0,
    sharing_permissions: {
      academic_advisors: false,
      system_improvement: false,
      research_anonymized: false
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [privacyReport, setPrivacyReport] = useState<any>(null);

  // Load current consent settings
  useEffect(() => {
    const currentConsent = privacyRedactionService.getUserConsent(userId);
    setConsent(currentConsent);
    
    // Load privacy report
    const report = privacyRedactionService.generatePrivacyReport(userId);
    setPrivacyReport(report);
  }, [userId]);

  const handleConsentChange = (key: keyof ConsentSettings, value: any) => {
    const newConsent = { ...consent, [key]: value };
    setConsent(newConsent);
    privacyRedactionService.updateUserConsent(userId, { [key]: value });
    
    if (onConsentChange) {
      onConsentChange(newConsent);
    }
  };

  const handleSharingPermissionChange = (
    key: keyof ConsentSettings['sharing_permissions'], 
    value: boolean
  ) => {
    const newSharingPermissions = { ...consent.sharing_permissions, [key]: value };
    const newConsent = { ...consent, sharing_permissions: newSharingPermissions };
    setConsent(newConsent);
    privacyRedactionService.updateUserConsent(userId, { sharing_permissions: newSharingPermissions });
    
    if (onConsentChange) {
      onConsentChange(newConsent);
    }
  };

  const getPrivacyScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getDataRetentionLabel = (days: number): string => {
    if (days === 0) return 'No data retention';
    if (days <= 30) return 'Short-term (≤30 days)';
    if (days <= 365) return 'Medium-term (≤1 year)';
    return 'Long-term (>1 year)';
  };

  const clearAllData = () => {
    privacyRedactionService.clearUserData(userId);
    setConsent({
      allow_anonymous_metrics: false,
      allow_redacted_examples: false,
      allow_academic_progress_tracking: false,
      data_retention_days: 0,
      sharing_permissions: {
        academic_advisors: false,
        system_improvement: false,
        research_anonymized: false
      }
    });
    
    // Refresh privacy report
    const report = privacyRedactionService.generatePrivacyReport(userId);
    setPrivacyReport(report);
  };

  const compactView = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Privacy</span>
      </div>
      
      {privacyReport && (
        <Badge 
          variant="outline" 
          className={`text-xs ${getPrivacyScoreColor(privacyReport.privacy_score)}`}
        >
          {privacyReport.privacy_score}/100
        </Badge>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Data Settings
            </DialogTitle>
            <DialogDescription>
              Control how your academic data is used. All settings default to maximum privacy protection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Privacy Score */}
            {privacyReport && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Privacy Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Privacy Score</span>
                    <Badge className={getPrivacyScoreColor(privacyReport.privacy_score)}>
                      {privacyReport.privacy_score}/100
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Stored</span>
                    <Badge variant={privacyReport.data_stored ? 'outline' : 'secondary'}>
                      {privacyReport.data_stored ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Retention</span>
                    <span className="text-sm text-muted-foreground">
                      {getDataRetentionLabel(consent.data_retention_days)}
                    </span>
                  </div>
                  
                  {privacyReport.redaction_history.total_redactions > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Redactions</span>
                      <span className="text-sm text-muted-foreground">
                        {privacyReport.redaction_history.total_redactions}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Core Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data Collection & Storage
                </CardTitle>
                <CardDescription className="text-xs">
                  These settings control whether your data is stored and how it's used.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Academic Progress Tracking</Label>
                    <p className="text-xs text-muted-foreground">
                      Store your conversation history and academic profile (with redaction)
                    </p>
                  </div>
                  <Switch
                    checked={consent.allow_academic_progress_tracking}
                    onCheckedChange={(checked) => 
                      handleConsentChange('allow_academic_progress_tracking', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Anonymous Usage Metrics</Label>
                    <p className="text-xs text-muted-foreground">
                      Help improve the system with anonymous usage statistics
                    </p>
                  </div>
                  <Switch
                    checked={consent.allow_anonymous_metrics}
                    onCheckedChange={(checked) => 
                      handleConsentChange('allow_anonymous_metrics', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Redacted Examples</Label>
                    <p className="text-xs text-muted-foreground">
                      Use redacted examples of your queries to improve AI responses
                    </p>
                  </div>
                  <Switch
                    checked={consent.allow_redacted_examples}
                    onCheckedChange={(checked) => 
                      handleConsentChange('allow_redacted_examples', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sharing Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Data Sharing Permissions
                </CardTitle>
                <CardDescription className="text-xs">
                  Control who can access your anonymized data for specific purposes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Academic Advisors</Label>
                    <p className="text-xs text-muted-foreground">
                      Share progress data with your assigned academic advisors
                    </p>
                  </div>
                  <Switch
                    checked={consent.sharing_permissions.academic_advisors}
                    onCheckedChange={(checked) => 
                      handleSharingPermissionChange('academic_advisors', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">System Improvement</Label>
                    <p className="text-xs text-muted-foreground">
                      Use anonymized data to improve AI accuracy and features
                    </p>
                  </div>
                  <Switch
                    checked={consent.sharing_permissions.system_improvement}
                    onCheckedChange={(checked) => 
                      handleSharingPermissionChange('system_improvement', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Research (Anonymized)</Label>
                    <p className="text-xs text-muted-foreground">
                      Include anonymized data in academic research studies
                    </p>
                  </div>
                  <Switch
                    checked={consent.sharing_permissions.research_anonymized}
                    onCheckedChange={(checked) => 
                      handleSharingPermissionChange('research_anonymized', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* FERPA Information */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                  <Info className="w-4 h-4" />
                  FERPA Compliance Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-blue-700 space-y-2">
                <p>
                  This system is designed to comply with the Family Educational Rights and Privacy Act (FERPA).
                </p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>All academic data is processed with privacy-first defaults</li>
                  <li>Personal information is automatically redacted from stored conversations</li>
                  <li>You maintain full control over your data sharing preferences</li>
                  <li>You can request complete data deletion at any time</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={clearAllData}
              className="w-full sm:w-auto"
            >
              <Lock className="w-4 h-4 mr-2" />
              Clear All My Data
            </Button>
            <Button onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (!showDetailedView) {
    return compactView;
  }

  // Detailed view for settings pages
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Privacy & Data Controls</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage how your academic data is collected, stored, and used.
          </p>
        </div>
        {privacyReport && (
          <Badge 
            variant="outline" 
            className={`${getPrivacyScoreColor(privacyReport.privacy_score)} text-sm px-3 py-1`}
          >
            Privacy Score: {privacyReport.privacy_score}/100
          </Badge>
        )}
      </div>

      {/* Rest of detailed view would go here */}
      {compactView}
    </div>
  );
};

// Quick privacy status indicator
interface PrivacyStatusProps {
  userId: string;
  className?: string;
}

export const PrivacyStatus: React.FC<PrivacyStatusProps> = ({ userId, className = '' }) => {
  const [privacyScore, setPrivacyScore] = useState<number>(100);

  useEffect(() => {
    const report = privacyRedactionService.generatePrivacyReport(userId);
    setPrivacyScore(report.privacy_score);
  }, [userId]);

  const getStatusIcon = (score: number) => {
    if (score >= 90) return <Shield className="w-4 h-4 text-green-600" />;
    if (score >= 70) return <Eye className="w-4 h-4 text-yellow-600" />;
    return <BarChart3 className="w-4 h-4 text-red-600" />;
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={`flex items-center gap-2 cursor-pointer ${className}`}>
          {getStatusIcon(privacyScore)}
          <span className="text-sm text-muted-foreground">
            Privacy: {privacyScore}/100
          </span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64" side="top">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Privacy Status</h4>
          <p className="text-xs text-muted-foreground">
            Your privacy score reflects your current data sharing settings. 
            Higher scores mean more privacy protection.
          </p>
          <div className="flex items-center justify-between text-xs">
            <span>Current Score:</span>
            <Badge variant="outline">{privacyScore}/100</Badge>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default PrivacyConsentToggle;