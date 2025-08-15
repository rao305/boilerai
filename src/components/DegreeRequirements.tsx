import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, BookOpen, GraduationCap, Award, FileText } from 'lucide-react';
import { getDegreeRequirements, calculateSectionCredits } from '../data/degreeRequirements';

interface DegreeRequirementsProps {
  major: string;
  concentration?: string;
}

const DegreeRequirements: React.FC<DegreeRequirementsProps> = ({ major, concentration }) => {
  const [requirements, setRequirements] = useState<any>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (major) {
      const degreeData = getDegreeRequirements(major, concentration);
      setRequirements(degreeData);
      
      // Open all sections by default
      if (degreeData) {
        const sections = Object.keys(degreeData).filter(key => key !== 'degree_info');
        const initialOpen = sections.reduce((acc, section) => {
          acc[section] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setOpenSections(initialOpen);
      }
    }
  }, [major, concentration]);

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getSectionIcon = (sectionKey: string) => {
    switch (sectionKey) {
      case 'university_core_curriculum':
        return <BookOpen className="h-5 w-5" />;
      case 'major_computer_science':
        return <GraduationCap className="h-5 w-5" />;
      case 'concentration_machine_intelligence':
        return <Award className="h-5 w-5" />;
      case 'college_science_requirements':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getSectionTitle = (sectionKey: string) => {
    const titles: Record<string, string> = {
      'university_core_curriculum': 'University Core Curriculum (UCC)',
      'major_computer_science': 'Computer Science Core Requirements',
      'other_departmental_requirements': 'Other Departmental Requirements',
      'concentration_machine_intelligence': 'Machine Intelligence Concentration',
      'college_science_requirements': 'College of Science Requirements'
    };
    return titles[sectionKey] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderCourseList = (courses: string[]) => {
    if (!courses || courses.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {courses.map((course, idx) => (
          <Badge key={idx} variant="outline" className="text-xs">
            {course}
          </Badge>
        ))}
      </div>
    );
  };

  const renderRequirement = (req: any, key: string) => {
    return (
      <div key={key} className="border-l-4 border-blue-200 pl-4 py-2 mb-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">
            {req.title || req.description || key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </h4>
          {req.credits && (
            <Badge variant="secondary" className="text-xs">
              {req.credits} credits
            </Badge>
          )}
        </div>
        
        {req.note && (
          <p className="text-xs text-gray-600 mt-1">{req.note}</p>
        )}
        
        {req.courses && renderCourseList(req.courses)}
        
        {req.options && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-700 mb-2">
              {req.choose_from || 'Choose from the following options:'}
            </p>
            {req.options.map((option: any, idx: number) => (
              <div key={idx} className="ml-4 mb-2 p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{option.name}</span>
                  {option.credits && (
                    <Badge variant="outline" className="text-xs">
                      {option.credits} credits
                    </Badge>
                  )}
                </div>
                {option.courses && renderCourseList(option.courses)}
                {option.note && (
                  <p className="text-xs text-gray-600 mt-1">{option.note}</p>
                )}
                
                {option.requirements && (
                  <div className="mt-2">
                    {option.requirements.map((subReq: any, subIdx: number) => (
                      <div key={subIdx} className="ml-2 mb-1 p-1 bg-white rounded border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{subReq.name}</span>
                          {subReq.classes && (
                            <Badge variant="outline" className="text-xs">
                              {subReq.classes} classes
                            </Badge>
                          )}
                        </div>
                        {subReq.courses && renderCourseList(subReq.courses)}
                        {subReq.note && (
                          <p className="text-xs text-gray-500 mt-1">{subReq.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: any, sectionKey: string) => {
    if (!section || sectionKey === 'degree_info') return null;

    const sectionCredits = calculateSectionCredits(section);
    
    return (
      <Collapsible
        key={sectionKey}
        open={openSections[sectionKey]}
        onOpenChange={() => toggleSection(sectionKey)}
      >
        <CollapsibleTrigger className="w-full">
          <Card className="mb-4 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getSectionIcon(sectionKey)}
                  <div className="text-left">
                    <CardTitle className="text-lg">
                      {getSectionTitle(sectionKey)}
                    </CardTitle>
                    {section.category && (
                      <p className="text-sm text-gray-600">{section.category}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sectionCredits > 0 && (
                    <Badge variant="secondary">
                      {sectionCredits} credits
                    </Badge>
                  )}
                  {openSections[sectionKey] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="mb-4">
            <CardContent className="pt-6">
              {section.requirements && Object.entries(section.requirements).map(([key, req]) =>
                renderRequirement(req, key)
              )}
              
              {section.minimum_grade_required && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">
                    Grade Requirement: {section.minimum_grade_required} or better required
                  </p>
                  {section.note && (
                    <p className="text-xs text-yellow-700 mt-1">{section.note}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (!requirements) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            {major 
              ? `No degree requirements found for ${major}${concentration ? ` with ${concentration} concentration` : ''}`
              : 'Select a major to view degree requirements'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const { degree_info } = requirements;

  return (
    <div className="space-y-6">
      {/* Degree Information Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{degree_info.degree}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {degree_info.college} • {degree_info.campus}
              </p>
              {degree_info.concentration && (
                <Badge className="mt-2">{degree_info.concentration} Concentration</Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {degree_info.total_credits_required}
              </div>
              <p className="text-sm text-gray-600">Total Credits</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Minimum GPA</p>
              <p className="text-gray-600">{degree_info.minimum_gpa_required}</p>
            </div>
            <div>
              <p className="font-medium">Upper Level Credits</p>
              <p className="text-gray-600">{degree_info.upper_level_credits_required}</p>
            </div>
            <div>
              <p className="font-medium">Catalog Year</p>
              <p className="text-gray-600">{degree_info.catalog_year}</p>
            </div>
            <div>
              <p className="font-medium">Level</p>
              <p className="text-gray-600">{degree_info.level}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Sections */}
      <div>
        {Object.entries(requirements)
          .filter(([key]) => key !== 'degree_info')
          .map(([sectionKey, section]) => renderSection(section, sectionKey))}
      </div>
    </div>
  );
};

export default DegreeRequirements;