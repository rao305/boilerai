import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Eye, Database } from 'lucide-react';

interface PrivacyIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const PrivacyIntroModal: React.FC<PrivacyIntroModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const privacyFeatures = [
    {
      icon: <Database className="h-5 w-5 text-blue-500" />,
      title: "Local Storage",
      description: "Your data stays on your device by default"
    },
    {
      icon: <Lock className="h-5 w-5 text-green-500" />,
      title: "End-to-End Encryption", 
      description: "When synced, your data is encrypted before leaving your device"
    },
    {
      icon: <Eye className="h-5 w-5 text-purple-500" />,
      title: "Smart Redaction",
      description: "Automatically removes personal information before sharing"
    },
    {
      icon: <Shield className="h-5 w-5 text-orange-500" />,
      title: "Differential Privacy",
      description: "Anonymous metrics help improve the service"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Your data stays yours
          </DialogTitle>
          <DialogDescription className="text-center text-lg mt-2">
            BoilerAI puts your privacy first with multiple layers of protection
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          {privacyFeatures.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500">
            You control your privacy settings and can change them anytime.
          </p>
          
          <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              Learn More
            </Button>
            <Button onClick={onAccept}>
              Continue with Privacy Protection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};