import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Zap, 
  Target, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Star,
  BookOpen,
  Clock,
  Award,
  Loader2,
  RefreshCw
} from "lucide-react";
// import { openaiChatService } from "@/services/openaiChatService";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";

interface CourseSchedule {
  semester: string;
  year: number;
  courses: Array<{
    courseCode: string;
    title: string;
    credits: number;
    difficulty?: string;
    prerequisites?: string[];
  }>;
  total_credits: number;
  cs_credits: number;
  warnings: string[];
  recommendations: string[];
}

interface GraduationPlan {
  major: string;
  track: string;
  total_semesters: number;
  graduation_date: string;
  schedules: CourseSchedule[];
  completed_courses: string[];
  remaining_requirements: Record<string, string[]>;
  warnings: string[];
  recommendations: string[];
  success_probability: number;
  customization_notes: string[];
}

interface PersonalizedPlannerSectionProps {
  className?: string;
}

export function PersonalizedPlannerSection({ className = "" }: PersonalizedPlannerSectionProps) {
  const { user } = useAuth();
  const { transcriptData } = useAcademicPlan();
  const [graduationPlan, setGraduationPlan] = useState<GraduationPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    graduation_goal: "4_year",
    track: "Machine Intelligence",
    credit_load: "standard",
    summer_courses: true
  });

  const generatePersonalizedPlan = async () => {
    if (!user?.id) return;

    try {
      setIsGenerating(true);
      setError(null);

      // Build student profile from transcript data
      const studentProfile: any = {
        major: "Computer Science",
        track: preferences.track,
        current_semester: "Fall",
        current_year: 2,
        graduation_goal: preferences.graduation_goal,
        credit_load_preference: preferences.credit_load,
        summer_availability: preferences.summer_courses
      };

      // Add transcript data if available
      if (transcriptData) {
        const studentInfo = transcriptData.studentInfo || {};
        const courses = transcriptData.courses || [];

        studentProfile.name = studentInfo.name || "";
        studentProfile.gpa = studentInfo.gpa || 0.0;
        studentProfile.completed_courses = courses
          .filter(c => c.grade && !['F', 'W'].includes(c.grade))
          .map(c => c.courseCode || '');
        studentProfile.total_credits = studentInfo.totalCredits || 0;
      }

      const planData = await aiService.generatePersonalizedPlan(
        user.id,
        studentProfile,
        preferences
      );

      if (planData.success) {
        setGraduationPlan(planData.plan);
      } else {
        throw new Error(planData.fallback_message || "Failed to generate plan");
      }

    } catch (error) {
      console.error('Failed to generate personalized plan:', error);
      setError(error instanceof Error ? error.message : "Failed to generate plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Generation Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-md bg-primary p-2">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">AI-Powered Graduation Planning</h3>
              <p className="text-sm text-muted-foreground">
                Generate personalized graduation plans based on your academic history
              </p>
            </div>
          </div>
          <Button 
            onClick={generatePersonalizedPlan} 
            disabled={isGenerating}
            className="min-w-[120px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Generate Plan
              </>
            )}
          </Button>
        </div>

        {/* Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Graduation Goal
            </label>
            <Select 
              value={preferences.graduation_goal} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, graduation_goal: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3_year">3 Years (Accelerated)</SelectItem>
                <SelectItem value="3.5_year">3.5 Years</SelectItem>
                <SelectItem value="4_year">4 Years (Standard)</SelectItem>
                <SelectItem value="flexible">Flexible Timeline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Track Preference
            </label>
            <Select 
              value={preferences.track} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, track: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Machine Intelligence">Machine Intelligence</SelectItem>
                <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                <SelectItem value="Undecided">Undecided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Course Load
            </label>
            <Select 
              value={preferences.credit_load} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, credit_load: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light (12-14 credits)</SelectItem>
                <SelectItem value="standard">Standard (15-16 credits)</SelectItem>
                <SelectItem value="heavy">Heavy (17+ credits)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Summer Courses
            </label>
            <Select 
              value={preferences.summer_courses ? "yes" : "no"} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, summer_courses: value === "yes" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes, include summer</SelectItem>
                <SelectItem value="no">No summer courses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <Button size="sm" variant="outline" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Generated Plan Display */}
      {graduationPlan && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {graduationPlan.major} - {graduationPlan.track}
              </h3>
              <p className="text-sm text-muted-foreground">
                Graduation: {graduationPlan.graduation_date} • {graduationPlan.total_semesters} semesters
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>{Math.round(graduationPlan.success_probability * 100)}% Success Rate</span>
              </Badge>
              <Button size="sm" variant="outline" onClick={generatePersonalizedPlan}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="schedule">Course Schedule</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4">
              <div className="grid gap-4">
                {graduationPlan.schedules.map((schedule, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-foreground">
                        {schedule.semester} {schedule.year}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {schedule.total_credits} credits
                        </Badge>
                        <Badge variant="outline">
                          {schedule.cs_credits} CS credits
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {schedule.courses.map((course, courseIndex) => (
                        <div key={courseIndex} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div>
                            <p className="font-medium text-sm">{course.courseCode}</p>
                            <p className="text-xs text-muted-foreground">{course.title}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {course.credits} cr
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {schedule.warnings.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {schedule.warnings.map((warning, wIndex) => (
                          <div key={wIndex} className="flex items-center space-x-2 text-sm text-orange-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="space-y-4">
              <div className="grid gap-4">
                {Object.entries(graduationPlan.remaining_requirements).map(([category, courses]) => (
                  <Card key={category} className="p-4">
                    <h4 className="font-medium text-foreground mb-3 capitalize">
                      {category.replace('_', ' ')}
                    </h4>
                    <div className="space-y-2">
                      {courses.map((course, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">{course}</span>
                          <Badge variant="outline" className="text-xs">
                            Remaining
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {/* Recommendations */}
              {graduationPlan.recommendations.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-medium text-foreground mb-3 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {graduationPlan.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
                        <Award className="h-4 w-4 text-blue-500 mt-0.5" />
                        <p className="text-sm text-blue-700">{rec}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Warnings */}
              {graduationPlan.warnings.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-medium text-foreground mb-3 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Considerations
                  </h4>
                  <div className="space-y-2">
                    {graduationPlan.warnings.map((warning, index) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-orange-50 rounded">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                        <p className="text-sm text-orange-700">{warning}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Customization Notes */}
              {graduationPlan.customization_notes.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-medium text-foreground mb-3 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Personalization Applied
                  </h4>
                  <div className="space-y-2">
                    {graduationPlan.customization_notes.map((note, index) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded">
                        <Star className="h-4 w-4 text-green-500 mt-0.5" />
                        <p className="text-sm text-green-700">{note}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Call to Action when no plan */}
      {!graduationPlan && !isGenerating && !error && (
        <Card className="p-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Ready to Generate Your Personalized Plan?
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Our AI will analyze your transcript, academic performance, and preferences to create 
            a customized graduation plan with course recommendations and timeline optimization.
          </p>
          <Button onClick={generatePersonalizedPlan} size="lg">
            <Zap className="h-5 w-5 mr-2" />
            Generate My Plan
          </Button>
        </Card>
      )}
    </div>
  );
}