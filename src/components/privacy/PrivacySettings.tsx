import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Shield, Database, Eye, BarChart } from 'lucide-react';

interface PrivacySettingsProps {
  className?: string;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ className }) => {
  const [settings, setSettings] = useState({
    anonymousMetrics: false,
    smartRedaction: false,
    encryptedSync: false,
  });
  
  const [showLearnMore, setShowLearnMore] = useState(false);

  const handleToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const getEncouragementText = (setting: keyof typeof settings) => {
    const texts = {
      anonymousMetrics: "Share DP‑noised counts to help us spot blind spots",
      smartRedaction: "Manually review & send redacted snippets",
      encryptedSync: "Keep history across sessions with end‑to‑end encryption"
    };
    return texts[setting];
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control how your data is handled and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Anonymous Metrics */}
          <div className="flex items-start justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="anonymous-metrics" className="text-base font-medium">
                  Anonymous Metrics
                </Label>
                <Badge variant="secondary" className="text-xs">OFF by default</Badge>
              </div>
              <p className="text-sm text-gray-600">
                {getEncouragementText('anonymousMetrics')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="anonymous-metrics"
                checked={settings.anonymousMetrics}
                onCheckedChange={() => handleToggle('anonymousMetrics')}
                role="switch"
                aria-label="Anonymous Metrics"
              />
            </div>
          </div>

          {/* Smart Redaction */}
          <div className="flex items-start justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="smart-redaction" className="text-base font-medium">
                  Smart Redaction
                </Label>
                <Badge variant="secondary" className="text-xs">OFF by default</Badge>
              </div>
              <p className="text-sm text-gray-600">
                {getEncouragementText('smartRedaction')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="smart-redaction"
                checked={settings.smartRedaction}
                onCheckedChange={() => handleToggle('smartRedaction')}
                role="switch"
                aria-label="Smart Redaction"
              />
            </div>
          </div>

          {/* Encrypted Sync */}
          <div className="flex items-start justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="encrypted-sync" className="text-base font-medium">
                  Encrypted History Sync
                </Label>
                <Badge variant="secondary" className="text-xs">OFF by default</Badge>
              </div>
              <p className="text-sm text-gray-600">
                {getEncouragementText('encryptedSync')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="encrypted-sync"
                checked={settings.encryptedSync}
                onCheckedChange={() => handleToggle('encryptedSync')}
                role="switch"
                aria-label="Encrypted History Sync"
              />
            </div>
          </div>

          {/* Learn More Button */}
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowLearnMore(true)}
              className="w-full"
            >
              <Info className="h-4 w-4 mr-2" />
              Learn how it protects you
            </Button>
          </div>

          {/* Status Messages */}
          {settings.anonymousMetrics && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✅ Thanks for helping us improve! Your usage patterns help us spot accessibility gaps.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learn More Dialog */}
      <Dialog open={showLearnMore} onOpenChange={setShowLearnMore}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Anonymous Metrics Privacy Protection</DialogTitle>
            <DialogDescription>
              How we protect your privacy while improving the service
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <BarChart className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Differential Privacy</h3>
                  <p className="text-sm text-gray-600">
                    Mathematical noise ensures individual data cannot be identified
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Database className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Aggregated Only</h3>
                  <p className="text-sm text-gray-600">
                    Only statistical patterns are collected, never individual records
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">What we collect:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Feature usage patterns (which buttons are clicked)</li>
                <li>• Performance metrics (how fast pages load)</li>
                <li>• Error frequencies (what breaks and how often)</li>
              </ul>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">What we never collect:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Your transcript content or grades</li>
                <li>• Personal conversations or questions</li>
                <li>• Identifying information like names or IDs</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setShowLearnMore(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};