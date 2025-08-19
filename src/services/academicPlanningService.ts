import { comprehensiveDegreeRequirements } from '@/data/comprehensive_degree_requirements';
import { smartCourseService, SmartCourseContext } from './smartCourseService';

export interface TranscriptData {
  student_info: {
    name: string;
    major: string;
    college: string;
    campus: string;
  };
  completed_courses: Array<{
    course_code: string;
    title: string;
    credits: number;
    grade: string;
    semester: string;
    year: number;
  }>;
  courses_in_progress: Array<{
    course_code: string;
    title: string;
    credits: number;
  }>;
  gpa_summary: {
    overall_gpa: number;
    total_credits: number;
  };
}

export interface DegreeProgress {
  major: string;
  track?: string;
  percentage: number;
  completedCredits: number;
  requiredCredits: number;
  remainingCredits: number;
  estimatedGraduation: string;
  gpa: number;
  requirements: {
    foundation: { completed: number; required: number; courses: string[] };
    core: { completed: number; required: number; courses: string[] };
    math: { completed: number; required: number; courses: string[] };
    electives: { completed: number; required: number; courses: string[] };
    general: { completed: number; required: number; courses: string[] };
  };
  nextRecommendedCourses: Array<{
    code: string;
    title: string;
    credits: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export class AcademicPlanningService {
  private degreeRequirements: any;

  constructor() {
    this.degreeRequirements = comprehensiveDegreeRequirements;
  }

  /**
   * Calculate degree progress based on transcript data
   */
  calculateDegreeProgress(transcriptData: TranscriptData): DegreeProgress {
    const major = this.detectMajor(transcriptData.student_info.major);
    const degreeReqs = this.getDegreeRequirements(major);
    
    if (!degreeReqs) {
      throw new Error(`Degree requirements not found for major: ${major}`);
    }

    const completedCourses = transcriptData.completed_courses.map(c => c.course_code);
    const requirements = this.analyzeRequirements(completedCourses, degreeReqs);
    
    const totalCompletedCredits = transcriptData.gpa_summary.total_credits;
    const requiredCredits = degreeReqs.degree_info.total_credits_required;
    const percentage = Math.min(100, (totalCompletedCredits / requiredCredits) * 100);
    
    // Calculate estimated graduation
    const remainingCredits = Math.max(0, requiredCredits - totalCompletedCredits);
    const estimatedGraduation = this.calculateEstimatedGraduation(remainingCredits);
    
    // Get next recommended courses
    const nextRecommendedCourses = this.getNextRecommendedCourses(
      completedCourses,
      requirements,
      degreeReqs
    );

    return {
      major: transcriptData.student_info.major,
      percentage,
      completedCredits: totalCompletedCredits,
      requiredCredits,
      remainingCredits,
      estimatedGraduation,
      gpa: transcriptData.gpa_summary.overall_gpa,
      requirements,
      nextRecommendedCourses
    };
  }

  /**
   * Convert transcript data to academic planner format
   */
  convertToAcademicPlannerFormat(transcriptData: TranscriptData): any {
    const courses: { [key: string]: any[] } = {};

    // Convert completed courses
    transcriptData.completed_courses.forEach(course => {
      const semesterKey = `${course.semester} ${course.year}`;
      
      if (!courses[semesterKey]) {
        courses[semesterKey] = [];
      }

      courses[semesterKey].push({
        id: course.course_code.replace(/\s+/g, '').toLowerCase(),
        code: course.course_code,
        title: course.title,
        credits: course.credits,
        status: 'completed',
        department: course.course_code.split(' ')[0],
        semester: course.semester,
        year: course.year,
        grade: course.grade
      });
    });

    // Convert in-progress courses
    const currentYear = new Date().getFullYear();
    const currentSemester = this.getCurrentSemester();
    const inProgressKey = `${currentSemester} ${currentYear}`;

    transcriptData.courses_in_progress.forEach(course => {
      if (!courses[inProgressKey]) {
        courses[inProgressKey] = [];
      }

      courses[inProgressKey].push({
        id: course.course_code.replace(/\s+/g, '').toLowerCase(),
        code: course.course_code,
        title: course.title,
        credits: course.credits,
        status: 'in-progress',
        department: course.course_code.split(' ')[0]
      });
    });

    return courses;
  }

  /**
   * Generate AI recommendations based on current progress
   */
  generateAIRecommendations(transcriptData: TranscriptData, degreeProgress: DegreeProgress): Array<{
    type: 'prerequisite' | 'schedule' | 'elective' | 'warning';
    title: string;
    description: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations = [];
    const completedCourses = transcriptData.completed_courses.map(c => c.course_code);

    // Check for prerequisite readiness
    const readyCourses = this.getReadyPrerequisiteCourses(completedCourses);
    if (readyCourses.length > 0) {
      recommendations.push({
        type: 'prerequisite',
        title: 'Prerequisites Ready',
        description: `You can now take ${readyCourses.slice(0, 2).join(', ')} based on completed prerequisites`,
        action: 'Add to Plan',
        priority: 'high'
      });
    }

    // Schedule optimization
    if (degreeProgress.remainingCredits > 0) {
      const creditsPerSemester = this.getOptimalCreditsPerSemester(degreeProgress.remainingCredits);
      recommendations.push({
        type: 'schedule',
        title: 'Schedule Optimization',
        description: `Taking ${creditsPerSemester} credits per semester will keep you on track for ${degreeProgress.estimatedGraduation}`,
        action: 'Optimize',
        priority: 'medium'
      });
    }

    // Elective suggestions
    const electiveSuggestions = this.getElectiveSuggestions(completedCourses, transcriptData.student_info.major);
    if (electiveSuggestions.length > 0) {
      recommendations.push({
        type: 'elective',
        title: 'Elective Suggestion',
        description: `Consider ${electiveSuggestions[0]} to strengthen your knowledge in this area`,
        action: 'Learn More',
        priority: 'low'
      });
    }

    // GPA warnings
    if (transcriptData.gpa_summary.overall_gpa < 2.5) {
      recommendations.push({
        type: 'warning',
        title: 'GPA Alert',
        description: 'Consider retaking courses or reducing course load to improve GPA',
        action: 'Get Advice',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Detect major from transcript
   */
  private detectMajor(major: string): string {
    const majorLower = major.toLowerCase();
    
    if (majorLower.includes('computer science')) return 'computer_science';
    if (majorLower.includes('electrical')) return 'electrical_engineering';
    if (majorLower.includes('mechanical')) return 'mechanical_engineering';
    if (majorLower.includes('mathematics')) return 'mathematics';
    
    return 'computer_science'; // Default
  }

  /**
   * Get degree requirements for a major
   */
  private getDegreeRequirements(major: string): any {
    return this.degreeRequirements[major];
  }

  /**
   * Analyze requirement completion
   */
  private analyzeRequirements(completedCourses: string[], degreeReqs: any): any {
    const requirements = {
      foundation: { completed: 0, required: 0, courses: [] },
      core: { completed: 0, required: 0, courses: [] },
      math: { completed: 0, required: 0, courses: [] },
      electives: { completed: 0, required: 0, courses: [] },
      general: { completed: 0, required: 0, courses: [] }
    };

    // Foundation courses
    if (degreeReqs.foundation_courses) {
      const foundationCodes = degreeReqs.foundation_courses.courses.map((c: any) => c.code);
      requirements.foundation.required = foundationCodes.length;
      requirements.foundation.completed = completedCourses.filter(c => foundationCodes.includes(c)).length;
      requirements.foundation.courses = foundationCodes;
    }

    // Core courses
    if (degreeReqs.core_courses) {
      const coreCodes = degreeReqs.core_courses.courses.map((c: any) => c.code);
      requirements.core.required = coreCodes.length;
      requirements.core.completed = completedCourses.filter(c => coreCodes.includes(c)).length;
      requirements.core.courses = coreCodes;
    }

    // Math requirements
    if (degreeReqs.mathematics_requirements) {
      const mathCodes = degreeReqs.mathematics_requirements.courses.map((c: any) => c.code);
      requirements.math.required = mathCodes.length;
      requirements.math.completed = completedCourses.filter(c => mathCodes.includes(c)).length;
      requirements.math.courses = mathCodes;
    }

    return requirements;
  }

  /**
   * Calculate estimated graduation
   */
  private calculateEstimatedGraduation(remainingCredits: number): string {
    const creditsPerSemester = 15;
    const semestersLeft = Math.ceil(remainingCredits / creditsPerSemester);
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Determine current semester
    let startSemester = 'Fall';
    if (currentMonth >= 0 && currentMonth <= 4) startSemester = 'Spring';
    else if (currentMonth >= 5 && currentMonth <= 7) startSemester = 'Summer';
    
    // Calculate graduation semester
    let graduationYear = currentYear;
    let graduationSemester = startSemester;
    
    for (let i = 0; i < semestersLeft; i++) {
      if (graduationSemester === 'Spring') graduationSemester = 'Summer';
      else if (graduationSemester === 'Summer') graduationSemester = 'Fall';
      else {
        graduationSemester = 'Spring';
        graduationYear++;
      }
    }
    
    return `${graduationSemester} ${graduationYear}`;
  }

  /**
   * Get current semester
   */
  private getCurrentSemester(): string {
    const month = new Date().getMonth();
    if (month >= 0 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    return 'Fall';
  }

  /**
   * Get courses ready based on prerequisites
   */
  private getReadyPrerequisiteCourses(completedCourses: string[]): string[] {
    // This would check against course prerequisite data
    const readyCourses = [];
    
    // Example logic - would be expanded with actual prerequisite data
    if (completedCourses.includes('CS 18000') && completedCourses.includes('CS 24000')) {
      if (!completedCourses.includes('CS 25200')) {
        readyCourses.push('CS 25200');
      }
    }
    
    return readyCourses;
  }

  /**
   * Get optimal credits per semester
   */
  private getOptimalCreditsPerSemester(remainingCredits: number): number {
    if (remainingCredits <= 30) return 15;
    if (remainingCredits <= 60) return 16;
    return 15;
  }

  /**
   * Get elective suggestions
   */
  private getElectiveSuggestions(completedCourses: string[], major: string): string[] {
    const suggestions = [];
    
    if (major.toLowerCase().includes('computer science')) {
      if (!completedCourses.includes('CS 35200')) {
        suggestions.push('CS 35200 (Compilers)');
      }
      if (!completedCourses.includes('CS 38100')) {
        suggestions.push('CS 38100 (Algorithms)');
      }
    }
    
    return suggestions;
  }

  /**
   * Create SmartCourse-enhanced recommendations using contextual AI
   */
  async getSmartCourseRecommendations(
    transcriptData: TranscriptData, 
    query: string,
    userId: string,
    sessionId?: string
  ): Promise<{
    recommendations: any[];
    explanation: string;
    metrics: any;
    quality: string;
  }> {
    try {
      // Create SmartCourse context with full transcript and degree plan
      const smartCourseContext = await smartCourseService.createSmartCourseContext(
        transcriptData,
        'full_context'
      );

      // Get SmartCourse enhanced recommendations
      const response = await smartCourseService.getSmartCourseAdvice(
        query,
        userId,
        smartCourseContext,
        sessionId
      );

      // Determine recommendation quality
      let quality = 'Poor';
      if (response.metrics.personalScore >= 0.8 && response.metrics.lift >= 0.2) {
        quality = 'Excellent';
      } else if (response.metrics.personalScore >= 0.6) {
        quality = 'Good';
      } else if (response.metrics.personalScore >= 0.4) {
        quality = 'Fair';
      }

      return {
        recommendations: response.recommendations,
        explanation: response.explanation,
        metrics: response.metrics,
        quality
      };
    } catch (error) {
      console.error('SmartCourse recommendations failed:', error);
      
      // Fallback to traditional recommendations
      const degreeProgress = this.calculateDegreeProgress(transcriptData);
      const traditionalRecs = this.generateAIRecommendations(transcriptData, degreeProgress);
      
      return {
        recommendations: traditionalRecs,
        explanation: 'Generated using traditional academic planning algorithms.',
        metrics: { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency: 0 },
        quality: 'Fallback'
      };
    }
  }

  /**
   * Enhanced course planning with SmartCourse contextual analysis
   */
  async createSmartCoursePlan(
    transcriptData: TranscriptData,
    targetSemester: string,
    maxCredits: number = 15,
    userId: string
  ): Promise<{
    courses: any[];
    explanation: string;
    reasoning: string;
    metrics: any;
  }> {
    const query = `Create a course plan for ${targetSemester} with up to ${maxCredits} credits. Consider my completed coursework, degree requirements, and optimal course sequencing for graduation.`;
    
    const result = await this.getSmartCourseRecommendations(
      transcriptData,
      query,
      userId
    );

    // Filter recommendations to fit within credit limit
    let totalCredits = 0;
    const selectedCourses = result.recommendations.filter(rec => {
      if (totalCredits + rec.credits <= maxCredits) {
        totalCredits += rec.credits;
        return true;
      }
      return false;
    });

    return {
      courses: selectedCourses,
      explanation: result.explanation,
      reasoning: `Selected ${selectedCourses.length} courses totaling ${totalCredits} credits based on SmartCourse contextual analysis.`,
      metrics: result.metrics
    };
  }
}

export const academicPlanningService = new AcademicPlanningService();