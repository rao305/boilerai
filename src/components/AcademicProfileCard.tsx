import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  TrendingUp, 
  BookOpen, 
  Target, 
  Star,
  AlertTriangle,
  Award,
  Calendar,
  BarChart3,
  RefreshCw,
  Loader2
} from "lucide-react";
// import { aiService } from "@/services/aiService";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";

interface AcademicPerformance {
  gpa: number;
  total_credits: number;
  completed_courses: number;
  program: string;
}

interface CoursePerformance {
  high_grades: number;
  struggling_areas: number;
  recent_semester_gpa: number;
}

interface LearningPatterns {
  course_load_preference: string;
  summer_courses_taken: number;
  track_indicators: string;
}

interface ExtractedData {
  academic_performance: AcademicPerformance;
  course_performance: CoursePerformance;
  learning_patterns: LearningPatterns;
}

interface StudentProfile {
  student_id: string;
  name: string;
  current_year: string;
  target_track: string;
  completed_courses: string[];
  gpa: number;
  graduation_goals: any;
}

interface AcademicProfileCardProps {
  className?: string;
}

export function AcademicProfileCard({ className = "" }: AcademicProfileCardProps) {
  const { user } = useAuth();
  const { transcriptData } = useAcademicPlan();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAcademicProfile();
  }, [user?.id, transcriptData]);

  const loadAcademicProfile = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const profileData = await aiService.getStudentProfile(user.id);
      
      if (profileData.has_profile) {
        setProfile(profileData.profile);
        setExtractedData(profileData.extracted_data);
      } else {
        // No profile data available
        setProfile(null);
        setExtractedData(null);
      }

    } catch (error) {
      console.error('Failed to load academic profile:', error);
      setError('Unable to load academic profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrackDisplayName = (trackIndicator: string) => {
    switch (trackIndicator) {
      case 'machine_intelligence_leaning': return 'Machine Intelligence Track';
      case 'software_engineering_leaning': return 'Software Engineering Track';
      case 'undecided': return 'Track Undecided';
      default: return 'Not Determined';
    }
  };

  const getPerformanceColor = (gpa: number) => {
    if (gpa >= 3.5) return 'text-green-600';
    if (gpa >= 3.0) return 'text-blue-600';
    if (gpa >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGPAStatus = (gpa: number) => {
    if (gpa >= 3.7) return { status: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200' };
    if (gpa >= 3.3) return { status: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (gpa >= 3.0) return { status: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (gpa >= 2.5) return { status: 'Needs Improvement', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { status: 'At Risk', color: 'bg-red-100 text-red-800 border-red-200' };
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading academic profile...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button size="sm" onClick={loadAcademicProfile} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!profile && !extractedData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No Academic Profile Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your transcript or chat with the AI to build your academic profile
          </p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Your profile will include:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Academic performance analysis</li>
              <li>• Course difficulty patterns</li>
              <li>• Personalized recommendations</li>
              <li>• Graduation timeline predictions</li>
            </ul>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="rounded-full bg-primary p-2">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Academic Profile</h3>
            <p className="text-sm text-muted-foreground">
              {profile?.name || extractedData?.academic_performance?.program || 'Your personalized insights'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={loadAcademicProfile}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Academic Performance */}
        {extractedData?.academic_performance && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Academic Performance
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current GPA</span>
                  <TrendingUp className={`h-4 w-4 ${getPerformanceColor(extractedData.academic_performance.gpa)}`} />
                </div>
                <p className={`text-xl font-bold ${getPerformanceColor(extractedData.academic_performance.gpa)}`}>
                  {extractedData.academic_performance.gpa.toFixed(2)}
                </p>
                <Badge variant="outline" className={getGPAStatus(extractedData.academic_performance.gpa).color}>
                  {getGPAStatus(extractedData.academic_performance.gpa).status}
                </Badge>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Credits</span>
                  <BookOpen className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-foreground">
                  {extractedData.academic_performance.total_credits}
                </p>
                <p className="text-xs text-muted-foreground">
                  {extractedData.academic_performance.completed_courses} courses
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Course Performance Insights */}
        {extractedData?.course_performance && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Performance Insights
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-800">Strong Performance</span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {extractedData.course_performance.high_grades} courses
                </span>
              </div>
              
              {extractedData.course_performance.struggling_areas > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-sm font-medium text-orange-800">Needs Attention</span>
                  </div>
                  <span className="text-sm font-bold text-orange-600">
                    {extractedData.course_performance.struggling_areas} courses
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Learning Patterns */}
        {extractedData?.learning_patterns && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Learning Patterns
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Course Load Preference</span>
                <Badge variant="outline">
                  {extractedData.learning_patterns.course_load_preference}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Summer Courses Taken</span>
                <span className="text-sm font-medium text-foreground">
                  {extractedData.learning_patterns.summer_courses_taken}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Track Indication</span>
                <Badge variant="outline" className="text-xs">
                  {getTrackDisplayName(extractedData.learning_patterns.track_indicators)}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Conversation-based Profile */}
        {profile && (
          <div>
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              AI-Extracted Profile
            </h4>
            <div className="space-y-2 text-sm">
              {profile.current_year && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Academic Year</span>
                  <span className="font-medium">{profile.current_year}</span>
                </div>
              )}
              
              {profile.target_track && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Track</span>
                  <Badge variant="outline">{profile.target_track}</Badge>
                </div>
              )}
              
              {profile.completed_courses && profile.completed_courses.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Completed Courses</span>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {profile.completed_courses.slice(0, 3).join(', ')}
                    {profile.completed_courses.length > 3 && ` +${profile.completed_courses.length - 3} more`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}