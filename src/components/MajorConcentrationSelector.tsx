import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { purdueMajors, getConcentrations } from "@/data/purdueMajors";
import { getDegreeRequirements } from "@/data/degreeRequirements";

interface MajorConcentrationSelectorProps {
  selectedMajor: string;
  selectedConcentration: string;
  onMajorChange: (major: string) => void;
  onConcentrationChange: (concentration: string) => void;
  className?: string;
}

export function MajorConcentrationSelector({ 
  selectedMajor, 
  selectedConcentration,
  onMajorChange, 
  onConcentrationChange,
  className 
}: MajorConcentrationSelectorProps) {
  const [availableConcentrations, setAvailableConcentrations] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMajor) {
      const concentrations = getConcentrations(selectedMajor);
      setAvailableConcentrations(concentrations);
      
      // Reset concentration if the selected one is not available for the new major
      if (selectedConcentration && !concentrations.includes(selectedConcentration)) {
        onConcentrationChange('');
      }
    } else {
      setAvailableConcentrations([]);
      onConcentrationChange('');
    }
  }, [selectedMajor, selectedConcentration, onConcentrationChange]);

  const getDegreeInfo = (major: string, concentration: string = '') => {
    const requirements = getDegreeRequirements(major, concentration);
    if (!requirements) return null;
    
    return {
      totalCredits: requirements.degree_info.total_credits_required,
      minimumGpa: requirements.degree_info.minimum_gpa_required,
      college: requirements.degree_info.college,
      degree: requirements.degree_info.degree
    };
  };

  const handleMajorChange = (major: string) => {
    onMajorChange(major);
    // Reset concentration when major changes
    onConcentrationChange('');
  };

  const hasConcentrations = availableConcentrations.length > 0;

  const degreeInfo = selectedMajor ? getDegreeInfo(selectedMajor, selectedConcentration) : null;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Academic Program Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Major Selection */}
          <div>
            <label htmlFor="major-select" className="block text-sm font-medium text-foreground mb-2">
              Select Major
            </label>
            <Select value={selectedMajor} onValueChange={handleMajorChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a major" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {purdueMajors.map((major) => (
                  <SelectItem key={major} value={major}>
                    <div className="w-full">
                      <div className="font-medium">{major}</div>
                      {getConcentrations(major).length > 0 ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {getConcentrations(major).length} concentrations available
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-1">
                          No specializations required
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Concentration Selection */}
          {hasConcentrations && (
            <div>
              <label htmlFor="concentration-select" className="block text-sm font-medium text-foreground mb-2">
                Select Concentration
              </label>
              <Select 
                value={selectedConcentration} 
                onValueChange={onConcentrationChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a concentration (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableConcentrations.map((concentration) => (
                    <SelectItem key={concentration} value={concentration}>
                      {concentration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* No Concentration Notice */}
          {selectedMajor && !hasConcentrations && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>No specialization required:</strong> This major follows a single academic path without concentration options.
              </p>
            </div>
          )}

          {/* Degree Information Display */}
          {degreeInfo && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Program Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Degree:</span>
                  <span className="ml-2 text-blue-700">{degreeInfo.degree}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">College:</span>
                  <span className="ml-2 text-blue-700">{degreeInfo.college}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Total Credits:</span>
                  <span className="ml-2 text-blue-700">{degreeInfo.totalCredits}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Minimum GPA:</span>
                  <span className="ml-2 text-blue-700">{degreeInfo.minimumGpa}</span>
                </div>
              </div>
              {selectedConcentration && (
                <div className="mt-2">
                  <Badge className="bg-blue-600 text-white">
                    {selectedConcentration} Concentration
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Selection Summary */}
          {selectedMajor && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Selected Program:</span> {selectedMajor}
              {selectedConcentration && ` • ${selectedConcentration} Concentration`}
              {!hasConcentrations && ' • No Concentration Required'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MajorConcentrationSelector;