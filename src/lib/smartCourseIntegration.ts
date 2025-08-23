/**
 * SmartCourse Integration Library
 * 
 * Provides frontend utilities for SmartCourse-inspired intelligence features:
 * - Context-aware recommendation requests
 * - Quality metrics tracking
 * - Role-based personalization
 * - Ablation testing interface
 */

export interface SmartCourseMetrics {
  planScore: number;      // |R ∩ P| / |R| - fraction meeting plan requirements
  personalScore: number;  // |R ∩ (P ∪ L)| / |R| - plan + retake coverage
  lift: number;           // personalScore - planScore
  recall: number;         // |R ∩ P| / |P| - plan requirement coverage
  precision: number;      // accuracy of recommendations
  responseTime: number;   // latency in seconds
  recommendationCount: number;
}

export interface ContextualRecommendation {
  courseId: string;
  title?: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  category: 'requirement' | 'retake' | 'elective' | 'prerequisite';
}

export interface SmartCourseResponse {
  content: string;
  recommendations: ContextualRecommendation[];
  metrics: SmartCourseMetrics;
  contextMode: 'full' | 'no_transcript' | 'no_plan' | 'question_only';
  personalizationScore: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

export interface StudentProfile {
  studentId: string;
  major: string;
  trackId?: string;
  gpa: number;
  completedCourses: Array<{
    courseId: string;
    grade: string;
    term: string;
  }>;
  inProgressCourses: string[];
  outstandingRequirements: string[];
  lowGradeCourses: string[];
  trackDeclared: boolean;
  termsEnrolled: number;
}

export interface SmartCourseRequest {
  question: string;
  profile: StudentProfile;
  contextMode?: 'full' | 'no_transcript' | 'no_plan' | 'question_only';
  enableMetrics?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface AblationStudyResult {
  full: SmartCourseResponse;
  no_transcript: SmartCourseResponse;
  no_plan: SmartCourseResponse;
  question_only: SmartCourseResponse;
  comparison: {
    bestMode: string;
    qualityDelta: number;
    recommendations: string[];
  };
}

export class SmartCourseIntegration {
  private baseUrl: string;
  private enableMetrics: boolean;
  private performanceCache: Map<string, SmartCourseMetrics[]>;

  constructor(baseUrl: string = '/api/advisor', enableMetrics: boolean = true) {
    this.baseUrl = baseUrl;
    this.enableMetrics = enableMetrics;
    this.performanceCache = new Map();
  }

  /**
   * Send contextual advisory request with SmartCourse intelligence
   */
  async sendContextualRequest(request: SmartCourseRequest): Promise<SmartCourseResponse> {
    try {
      const requestData = {
        question: request.question,
        profile_json: this.transformProfileToBackend(request.profile),
        context_mode: request.contextMode || 'full',
        enable_metrics: request.enableMetrics ?? this.enableMetrics,
        userId: request.userId,
        sessionId: request.sessionId
      };

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Advisory request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Advisory request failed');
      }

      return this.parseSmartCourseResponse(data.data);

    } catch (error) {
      console.error('SmartCourse contextual request failed:', error);
      throw error;
    }
  }

  /**
   * Run context ablation study (SmartCourse-style)
   */
  async runAblationStudy(
    question: string, 
    profile: StudentProfile,
    userId?: string
  ): Promise<AblationStudyResult> {
    const contextModes: Array<'full' | 'no_transcript' | 'no_plan' | 'question_only'> = [
      'full', 'no_transcript', 'no_plan', 'question_only'
    ];

    const results: Partial<AblationStudyResult> = {};

    // Run requests for each context mode
    for (const mode of contextModes) {
      try {
        const response = await this.sendContextualRequest({
          question,
          profile,
          contextMode: mode,
          enableMetrics: true,
          userId
        });
        results[mode] = response;
      } catch (error) {
        console.warn(`Ablation study failed for mode ${mode}:`, error);
        // Create fallback response
        results[mode] = {
          content: `Context ablation test failed for ${mode} mode`,
          recommendations: [],
          metrics: {
            planScore: 0,
            personalScore: 0,
            lift: 0,
            recall: 0,
            precision: 0,
            responseTime: 0,
            recommendationCount: 0
          },
          contextMode: mode,
          personalizationScore: 0,
          confidence: 0,
          reasoning: 'Ablation test failed',
          timestamp: new Date().toISOString()
        };
      }
    }

    // Analyze results
    const comparison = this.compareAblationResults(results as AblationStudyResult);

    return {
      ...results as AblationStudyResult,
      comparison
    };
  }

  /**
   * Get recommendation quality insights
   */
  async getQualityInsights(studentId: string, timeWindow?: number): Promise<{
    averageMetrics: SmartCourseMetrics;
    trends: Array<{timestamp: string; metrics: SmartCourseMetrics}>;
    suggestions: string[];
    contextEffectiveness: Record<string, number>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/quality-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          time_window_hours: timeWindow
        })
      });

      if (!response.ok) {
        throw new Error(`Quality insights request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;

    } catch (error) {
      console.error('Quality insights request failed:', error);
      return {
        averageMetrics: this.getDefaultMetrics(),
        trends: [],
        suggestions: ['Unable to load quality insights'],
        contextEffectiveness: {}
      };
    }
  }

  /**
   * Track recommendation interaction for learning
   */
  async trackRecommendationInteraction(
    recommendationId: string,
    interaction: 'viewed' | 'clicked' | 'enrolled' | 'dismissed',
    studentId: string
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/track-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          interaction_type: interaction,
          student_id: studentId,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to track recommendation interaction:', error);
    }
  }

  /**
   * Get performance analytics for monitoring
   */
  async getPerformanceAnalytics(): Promise<{
    totalQueries: number;
    averageResponseTime: number;
    averagePlanScore: number;
    averagePersonalization: number;
    handlerDistribution: Record<string, number>;
    contextModeDistribution: Record<string, number>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;

    } catch (error) {
      console.error('Performance analytics request failed:', error);
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        averagePlanScore: 0,
        averagePersonalization: 0,
        handlerDistribution: {},
        contextModeDistribution: {}
      };
    }
  }

  /**
   * Create enhanced student profile from transcript data
   */
  createProfileFromTranscript(transcriptData: any, major: string = 'CS'): StudentProfile {
    const completed = transcriptData.courses || [];
    const gradePoints: Record<string, number> = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
    };

    // Calculate GPA
    let totalPoints = 0;
    let totalCredits = 0;
    const lowGradeCourses: string[] = [];

    for (const course of completed) {
      const credits = course.credits || 3;
      const gradePoint = gradePoints[course.grade] || 2.0;
      
      totalPoints += gradePoint * credits;
      totalCredits += credits;

      // Identify low-grade courses (below B-)
      if (gradePoint < 2.7) {
        lowGradeCourses.push(course.courseId);
      }
    }

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0.0;

    return {
      studentId: transcriptData.studentId || 'unknown',
      major,
      trackId: transcriptData.trackId,
      gpa,
      completedCourses: completed.map((c: any) => ({
        courseId: c.courseId,
        grade: c.grade,
        term: c.term
      })),
      inProgressCourses: transcriptData.inProgress || [],
      outstandingRequirements: transcriptData.outstandingRequirements || [],
      lowGradeCourses,
      trackDeclared: !!transcriptData.trackId,
      termsEnrolled: Math.ceil(completed.length / 4) || 1
    };
  }

  /**
   * Transform frontend profile to backend format
   */
  private transformProfileToBackend(profile: StudentProfile): any {
    return {
      student: {
        id: profile.studentId,
        gpa: profile.gpa
      },
      major: profile.major,
      track_id: profile.trackId,
      completed: profile.completedCourses,
      in_progress: profile.inProgressCourses.map(courseId => ({ course_id: courseId })),
      outstanding_requirements: profile.outstandingRequirements,
      terms_enrolled: profile.termsEnrolled,
      constraints: {
        target_grad_term: '',
        max_credits: 16,
        summer_ok: true,
        pace: 'normal'
      }
    };
  }

  /**
   * Parse backend response into SmartCourse format
   */
  private parseSmartCourseResponse(data: any): SmartCourseResponse {
    // Extract course recommendations from content
    const recommendations = this.extractRecommendationsFromContent(data.content || '');

    return {
      content: data.content || '',
      recommendations,
      metrics: data.evaluation_metrics || this.getDefaultMetrics(),
      contextMode: data.context_mode || 'full',
      personalizationScore: data.personalization_score || 0,
      confidence: data.confidence || 0.5,
      reasoning: data.reasoning || 'Standard advisory response',
      timestamp: data.timestamp || new Date().toISOString()
    };
  }

  /**
   * Extract recommendations from LLM response content
   */
  private extractRecommendationsFromContent(content: string): ContextualRecommendation[] {
    const coursePattern = /\b([A-Z]{2,5}\d{5})\b/g;
    const matches = content.match(coursePattern) || [];
    
    const recommendations: ContextualRecommendation[] = [];
    const seen = new Set<string>();

    for (const courseId of matches) {
      if (!seen.has(courseId)) {
        recommendations.push({
          courseId,
          reasoning: this.extractReasoningForCourse(content, courseId),
          priority: this.determinePriority(courseId, content),
          category: this.categorizeRecommendation(courseId, content)
        });
        seen.add(courseId);
      }
    }

    return recommendations;
  }

  private extractReasoningForCourse(content: string, courseId: string): string {
    // Simple heuristic to find reasoning near the course mention
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(courseId)) {
        // Return the line containing the course, or the next line if it looks like reasoning
        const reasoning = lines[i].replace(/^\s*-\s*/, '').trim();
        return reasoning || `Recommended course: ${courseId}`;
      }
    }
    return `Recommended course: ${courseId}`;
  }

  private determinePriority(courseId: string, content: string): 'high' | 'medium' | 'low' {
    const highPriorityKeywords = ['required', 'prerequisite', 'must', 'critical', 'urgent'];
    const mediumPriorityKeywords = ['recommend', 'suggest', 'consider', 'should'];
    
    const courseContext = this.extractCourseContext(content, courseId);
    
    if (highPriorityKeywords.some(keyword => courseContext.includes(keyword))) {
      return 'high';
    } else if (mediumPriorityKeywords.some(keyword => courseContext.includes(keyword))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private categorizeRecommendation(courseId: string, content: string): 'requirement' | 'retake' | 'elective' | 'prerequisite' {
    const courseContext = this.extractCourseContext(content, courseId);
    
    if (courseContext.includes('retake') || courseContext.includes('repeat')) {
      return 'retake';
    } else if (courseContext.includes('prerequisite') || courseContext.includes('prereq')) {
      return 'prerequisite';
    } else if (courseContext.includes('required') || courseContext.includes('requirement')) {
      return 'requirement';
    } else {
      return 'elective';
    }
  }

  private extractCourseContext(content: string, courseId: string): string {
    const sentences = content.split(/[.!?]/);
    for (const sentence of sentences) {
      if (sentence.includes(courseId)) {
        return sentence.toLowerCase();
      }
    }
    return '';
  }

  private compareAblationResults(results: AblationStudyResult): AblationStudyResult['comparison'] {
    const modes = ['full', 'no_transcript', 'no_plan', 'question_only'] as const;
    let bestMode = 'full';
    let bestScore = 0;

    for (const mode of modes) {
      const score = results[mode].metrics.personalScore;
      if (score > bestScore) {
        bestScore = score;
        bestMode = mode;
      }
    }

    const fullContextScore = results.full.metrics.personalScore;
    const qualityDelta = bestScore - fullContextScore;

    // Collect all unique recommendations
    const allRecommendations = new Set<string>();
    modes.forEach(mode => {
      results[mode].recommendations.forEach(rec => {
        allRecommendations.add(rec.courseId);
      });
    });

    return {
      bestMode,
      qualityDelta,
      recommendations: Array.from(allRecommendations)
    };
  }

  private getDefaultMetrics(): SmartCourseMetrics {
    return {
      planScore: 0,
      personalScore: 0,
      lift: 0,
      recall: 0,
      precision: 0,
      responseTime: 0,
      recommendationCount: 0
    };
  }
}

// Global instance for easy import
export const smartCourseIntegration = new SmartCourseIntegration();