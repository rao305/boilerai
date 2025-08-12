import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User, TrendingUp, AlertCircle, Star, ChevronRight, Loader2, BookOpen, Target, Calendar } from "lucide-react";
// import { aiService } from "@/services/aiService";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface AcademicInsight {
  type: 'academic_excellence' | 'academic_support' | 'next_course' | 'track_recommendation';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable?: boolean;
}

interface StudentProfile {
  name?: string;
  current_year?: string;
  target_track?: string;
  gpa?: number;
  completed_courses?: string[];
  graduation_goals?: any;
}

interface IntelligentAcademicCoachProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export function IntelligentAcademicCoach({ isExpanded = false, onToggleExpanded }: IntelligentAcademicCoachProps) {
  const { transcriptData } = useAcademicPlan();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AcademicInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load personalized data
  useEffect(() => {
    loadPersonalizedData();
  }, [user?.id, transcriptData]);

  const loadPersonalizedData = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load student profile
      try {
        const profileData = await aiService.getStudentProfile(user.id);
        if (profileData.has_profile && profileData.profile) {
          setStudentProfile(profileData.profile);
        } else if (profileData.extracted_data) {
          // Use transcript-derived data if no conversation profile exists
          const { academic_performance } = profileData.extracted_data;
          setStudentProfile({
            name: transcriptData?.studentInfo?.name || "Student",
            gpa: academic_performance?.gpa || 0,
            completed_courses: [`${academic_performance?.completed_courses || 0} courses completed`]
          });
        }
      } catch (profileError) {
        console.warn('Failed to load student profile:', profileError);
      }

      // Load AI-powered recommendations
      try {
        const recsData = await aiService.getPersonalizedRecommendations(user.id, {
          hasTranscript: !!transcriptData,
          currentPage: 'dashboard'
        });
        
        if (recsData.success && recsData.ai_recommendations) {
          // Convert AI text response to insights
          const aiInsight: AcademicInsight = {
            type: 'next_course' as const,
            title: 'AI Academic Insights',
            message: recsData.ai_recommendations,
            priority: 'high' as const,
            actionable: true
          };
          setRecommendations([aiInsight]);
        } else if (recsData.general_recommendations) {
          // Fallback for non-AI responses
          const fallbackInsights: AcademicInsight[] = recsData.general_recommendations.map((rec: string, index: number) => ({
            type: 'next_course' as const,
            title: `Recommendation ${index + 1}`,
            message: rec,
            priority: 'medium' as const,
            actionable: true
          }));
          setRecommendations(fallbackInsights);
        }
      } catch (recsError) {
        console.warn('Failed to load AI recommendations:', recsError);
        // Provide fallback recommendations
        setRecommendations([
          {
            type: 'next_course',
            title: 'Upload Your Transcript',
            message: 'Upload your transcript to get AI-powered personalized course recommendations and graduation planning.',
            priority: 'high',
            actionable: true
          }
        ]);
      }

    } catch (error) {
      console.error('Failed to load personalized data:', error);
      setError('Unable to load personalized insights');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToAI = () => {
    navigate("/ai-assistant");
  };

  const handleGoToPlanner = () => {
    navigate("/academic-planner");
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'academic_excellence': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'academic_support': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'next_course': return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'track_recommendation': return <Target className="h-4 w-4 text-green-500" />;
      default: return <TrendingUp className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isExpanded) {
    // Main dashboard card view
    return (
      <Card className="p-6 bg-card border-border h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="rounded-md bg-primary p-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {studentProfile?.name ? `Hey ${studentProfile.name.split(' ')[0]}!` : 'AI Academic Coach'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col h-full space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading your insights...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex-1">
              <p className="text-sm text-red-600">{error}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadPersonalizedData}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Student Profile Summary */}
              {studentProfile && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      {studentProfile.gpa && (
                        <p className="text-sm font-medium text-foreground">
                          GPA: {studentProfile.gpa.toFixed(2)}
                        </p>
                      )}
                      {studentProfile.target_track && (
                        <p className="text-xs text-muted-foreground">
                          Track: {studentProfile.target_track}
                        </p>
                      )}
                    </div>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              )}

              {/* AI Insights */}
              <div className="flex-1 space-y-3">
                <h4 className="font-medium text-foreground text-sm">AI Academic Insights</h4>
                {recommendations.slice(0, 1).map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <div className="rounded-full bg-primary p-1 mt-0.5">
                      <Bot className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line">{insight.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs bg-white">
                          AI Generated
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(insight.priority)}`}>
                          {insight.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recommendations.length === 0 && (
                  <div className="text-center py-4">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Upload your transcript for AI-powered personalized insights
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={handleGoToAI}
              variant="default" 
              size="sm"
              className="w-full"
            >
              <Bot className="h-4 w-4 mr-2" />
              Chat with AI Coach
            </Button>
            <Button 
              onClick={handleGoToPlanner}
              variant="outline"
              size="sm" 
              className="w-full"
            >
              <Target className="h-4 w-4 mr-2" />
              Open Graduation Planner
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Expanded overlay view (if needed)
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col bg-background">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="rounded-md bg-primary p-2">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              AI Academic Coach
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-8 w-8 p-0"
          >
            ×
          </Button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Expanded content would go here */}
            <p className="text-muted-foreground">
              Expanded view - would show detailed academic insights and planning tools
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}