// SmartCourse-enhanced contextual AI advising service
// Integrates SmartCourse's proven contextual prompting methodology with our existing AI infrastructure

import { TranscriptData } from '@/types';
import { academicPlanningService } from './academicPlanningService';
import { unifiedChatService } from './unifiedChatService';
import { logger } from '@/utils/logger';

export interface SmartCourseMetrics {
  planScore: number;       // Fraction of recommendations that satisfy unmet plan requirements
  personalScore: number;   // Fraction including retake recommendations for low grades
  lift: number;           // Improvement from personalization (PersonalScore - PlanScore)
  recall: number;         // Coverage of student's remaining plan courses
  latency: number;        // Response time in milliseconds
}

export interface SmartCourseRecommendation {
  courseCode: string;
  title: string;
  credits: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  type: 'required' | 'elective' | 'retake' | 'prerequisite';
  meetsRequirement?: string;
}

export interface SmartCourseContext {
  mode: 'full_context' | 'no_transcript' | 'no_plan' | 'question_only';
  transcript?: TranscriptData;
  degreePlan?: any;
  outstandingRequirements?: string[];
  lowGradeCourses?: string[];
}

export interface SmartCourseResponse {
  recommendations: SmartCourseRecommendation[];
  explanation: string;
  metrics: SmartCourseMetrics;
  context: SmartCourseContext;
  thinkingProcess?: {
    analysis: string;
    reasoning: string;
    validation: string;
  };
}

export class SmartCourseService {
  private comprehensivePurdueKnowledge: string;

  constructor() {
    this.comprehensivePurdueKnowledge = this.buildPurdueKnowledgeBase();
  }

  /**
   * Main SmartCourse advising method - uses contextual prompting with transcript + plan + query
   */
  async getSmartCourseAdvice(
    query: string,
    userId: string,
    context: SmartCourseContext,
    sessionId?: string
  ): Promise<SmartCourseResponse> {
    const startTime = Date.now();
    
    try {
      // Build SmartCourse contextual prompt based on the research methodology
      const smartPrompt = this.buildSmartCoursePrompt(query, context);
      
      // Get AI response using our unified service
      const aiResponse = await unifiedChatService.sendMessage(smartPrompt, userId, sessionId);
      
      // Parse and evaluate the response
      const recommendations = this.parseRecommendations(aiResponse, context);
      const metrics = this.calculateSmartCourseMetrics(recommendations, context, Date.now() - startTime);
      
      // Extract thinking process if available
      const thinkingProcess = this.extractThinkingProcess(aiResponse);
      
      return {
        recommendations,
        explanation: this.cleanResponse(aiResponse),
        metrics,
        context,
        thinkingProcess
      };
      
    } catch (error) {
      logger.error('SmartCourse advice generation failed:', 'SMARTCOURSE', error);
      
      return {
        recommendations: [],
        explanation: `I apologize, but I'm unable to provide course recommendations at the moment. Please try again or contact your academic advisor for assistance.`,
        metrics: {
          planScore: 0,
          personalScore: 0,
          lift: 0,
          recall: 0,
          latency: Date.now() - startTime
        },
        context
      };
    }
  }

  /**
   * Evaluate recommendation quality using SmartCourse metrics (PlanScore, PersonalScore, Lift, Recall)
   */
  private calculateSmartCourseMetrics(
    recommendations: SmartCourseRecommendation[],
    context: SmartCourseContext,
    latency: number
  ): SmartCourseMetrics {
    if (recommendations.length === 0) {
      return { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency };
    }

    const R = recommendations.length; // Total recommendations
    const P = context.outstandingRequirements || []; // Outstanding degree plan requirements
    const L = context.lowGradeCourses || []; // Low grade courses eligible for retake

    // PlanScore: fraction of recommendations that satisfy unmet plan requirements
    const planMeetingRecs = recommendations.filter(rec => 
      rec.type === 'required' || rec.meetsRequirement
    ).length;
    const planScore = R > 0 ? planMeetingRecs / R : 0;

    // PersonalScore: fraction including retake recommendations
    const personalRecs = recommendations.filter(rec => 
      rec.type === 'required' || rec.type === 'retake' || rec.meetsRequirement
    ).length;
    const personalScore = R > 0 ? personalRecs / R : 0;

    // Lift: improvement from personalization
    const lift = personalScore - planScore;

    // Recall: coverage of remaining plan courses
    const coveredRequirements = recommendations.filter(rec => 
      P.some(req => rec.courseCode.includes(req) || req.includes(rec.courseCode))
    ).length;
    const recall = P.length > 0 ? coveredRequirements / P.length : 0;

    return {
      planScore: Math.round(planScore * 100) / 100,
      personalScore: Math.round(personalScore * 100) / 100,
      lift: Math.round(lift * 100) / 100,
      recall: Math.round(recall * 100) / 100,
      latency
    };
  }

  /**
   * Build SmartCourse contextual prompt following the research methodology
   */
  private buildSmartCoursePrompt(query: string, context: SmartCourseContext): string {
    let prompt = `You are BoilerAI, Purdue University's advanced academic advisor powered by SmartCourse contextual intelligence.

${this.comprehensivePurdueKnowledge}

SMARTCOURSE CONTEXTUAL ANALYSIS:
You must follow the proven SmartCourse methodology for contextual academic advising.

`;

    // Add context based on SmartCourse mode
    switch (context.mode) {
      case 'full_context':
        prompt += this.buildFullContextPrompt(context);
        break;
      case 'no_transcript':
        prompt += this.buildNoPlanContextPrompt(context);
        break;
      case 'no_plan':
        prompt += this.buildNoTranscriptContextPrompt(context);
        break;
      case 'question_only':
        prompt += this.buildQuestionOnlyPrompt();
        break;
    }

    prompt += `
SMARTCOURSE ADVISING PROTOCOL:
Based on the SmartCourse research, you must:

1. ANALYZE the student's specific context (transcript + degree plan + personal factors)
2. ALIGN recommendations with outstanding degree requirements
3. PERSONALIZE based on completed courses and performance patterns
4. PRIORITIZE based on prerequisite chains and graduation timeline
5. VALIDATE against Purdue policies and academic standards

RECOMMENDATION REQUIREMENTS:
- Provide 4-8 specific course recommendations
- Include course codes, titles, and clear reasoning
- Categorize as: required, elective, retake, or prerequisite
- Explain how each recommendation advances degree progress
- Consider prerequisite readiness and course sequencing
- Account for semester availability and scheduling

COMMUNICATION STYLE:
- Use natural, conversational language
- Be personable while maintaining academic accuracy
- Reference specific courses and requirements
- Provide actionable next steps
- No markdown formatting - plain text only

Student Query: ${query}

Provide comprehensive course recommendations following the SmartCourse methodology.`;

    return prompt;
  }

  /**
   * Full context mode: transcript + degree plan + query (highest quality recommendations)
   */
  private buildFullContextPrompt(context: SmartCourseContext): string {
    if (!context.transcript || !context.degreePlan) {
      return this.buildQuestionOnlyPrompt();
    }

    const completedCourses = context.transcript.completed_courses?.map(c => c.course_code) || [];
    const inProgressCourses = context.transcript.courses_in_progress?.map(c => c.course_code) || [];
    const studentInfo = context.transcript.student_info;
    const gpa = context.transcript.gpa_summary;

    return `FULL STUDENT CONTEXT AVAILABLE:

STUDENT PROFILE:
- Name: ${studentInfo.name}
- Major: ${studentInfo.major}
- College: ${studentInfo.college}
- Campus: ${studentInfo.campus}
- Current GPA: ${gpa.overall_gpa}
- Total Credits: ${gpa.total_credits}

COMPLETED COURSES (${completedCourses.length}):
${completedCourses.join(', ')}

COURSES IN PROGRESS (${inProgressCourses.length}):
${inProgressCourses.join(', ')}

DEGREE PLAN REQUIREMENTS:
${JSON.stringify(context.degreePlan, null, 2)}

OUTSTANDING REQUIREMENTS:
${context.outstandingRequirements?.join(', ') || 'To be determined from degree plan analysis'}

LOW GRADE COURSES (eligible for retake):
${context.lowGradeCourses?.join(', ') || 'None identified'}

With this complete academic context, provide highly personalized course recommendations that:
- Address specific degree requirements not yet met
- Consider prerequisite readiness based on completed coursework
- Account for academic performance patterns
- Optimize for efficient degree progress
- Suggest strategic retakes if beneficial for GPA improvement

`;
  }

  /**
   * No transcript mode: degree plan only
   */
  private buildNoPlanContextPrompt(context: SmartCourseContext): string {
    if (!context.degreePlan) {
      return this.buildQuestionOnlyPrompt();
    }

    return `DEGREE PLAN CONTEXT AVAILABLE:

DEGREE REQUIREMENTS:
${JSON.stringify(context.degreePlan, null, 2)}

NOTE: Student transcript not available. Recommendations will be based on general degree plan requirements without personalization for completed coursework or academic performance.

Provide course recommendations directly from the degree plan requirements, focusing on:
- Core required courses
- Foundation course sequences
- Critical path courses for degree completion

`;
  }

  /**
   * No plan mode: transcript only
   */
  private buildNoTranscriptContextPrompt(context: SmartCourseContext): string {
    if (!context.transcript) {
      return this.buildQuestionOnlyPrompt();
    }

    const completedCourses = context.transcript.completed_courses?.map(c => c.course_code) || [];
    const studentInfo = context.transcript.student_info;
    const gpa = context.transcript.gpa_summary;

    return `TRANSCRIPT CONTEXT AVAILABLE:

STUDENT PROFILE:
- Name: ${studentInfo.name}
- Major: ${studentInfo.major}
- College: ${studentInfo.college}
- Current GPA: ${gpa.overall_gpa}
- Total Credits: ${gpa.total_credits}

COMPLETED COURSES:
${completedCourses.join(', ')}

NOTE: Degree plan not available. Recommendations will be based on completed coursework patterns and major requirements from your knowledge base.

Provide recommendations based on:
- Natural course progression from completed courses
- Typical requirements for the student's major
- Prerequisite readiness
- General academic advancement

`;
  }

  /**
   * Question only mode: no context (lowest quality recommendations)
   */
  private buildQuestionOnlyPrompt(): string {
    return `MINIMAL CONTEXT MODE:

No student transcript or degree plan information available.

NOTE: Recommendations will be generic and may not be optimal for the student's specific situation. For best results, the student should upload their transcript and confirm their degree plan.

Provide general course recommendations based on:
- Common degree requirements
- Typical course sequences
- General academic best practices

`;
  }

  /**
   * Build comprehensive Purdue knowledge base for contextual advising
   */
  private buildPurdueKnowledgeBase(): string {
    return `PURDUE UNIVERSITY COMPREHENSIVE KNOWLEDGE BASE:

SUPPORTED MAJORS & TRACKS:
1. Computer Science (BS) - School of Science
   - Machine Intelligence Track: AI/ML focus with courses like CS 47300, CS 57300, CS 58000
   - Software Engineering Track: Development focus with CS 40800, CS 42600, CS 49000
   - General Track: Flexible electives for broad CS education

2. Data Science (BS) - School of Science
   - Standalone major (no tracks)
   - Combines statistics, computer science, and domain knowledge
   - Core courses: STAT 51100, CS 25100, STAT 41600

3. Artificial Intelligence (BS) - School of Science
   - Standalone major (no tracks)
   - Advanced AI focus with deep learning, robotics, NLP
   - Core courses: CS 47300, CS 57300, ECE 59500

MINORS AVAILABLE:
- Computer Science Minor (for non-CS majors)
- Data Science Minor
- Artificial Intelligence Minor
- Mathematics Minor
- Statistics Minor

CORE COMPUTER SCIENCE COURSE SEQUENCE:
Foundation (Required for all CS tracks):
- CS 18000: Problem Solving & OOP (Java)
- CS 24000: Programming in C
- CS 25000: Computer Architecture
- CS 25100: Data Structures & Algorithms
- CS 25200: Systems Programming
- CS 30700: Software Engineering

Mathematics Requirements:
- MA 16500-16600: Calculus I & II (or MA 16100-16200)
- MA 26100: Multivariate Calculus
- CS 18200: Discrete Mathematics
- One of: MA 30300 (ODEs), STAT 35000 (Statistics), MA 35100 (Linear Algebra)

Science Requirements:
- Two laboratory science sequences (Physics, Chemistry, or Biology)
- PHY 17200-27200 (Physics I & II) commonly chosen

CODO (Change of Degree Objective) REQUIREMENTS:

Computer Science CODO Requirements:
1. Minimum 2.5 cumulative GPA
2. Minimum 2.5 GPA in math and science courses
3. Completed courses with C or better:
   - CS 18000 (Problem Solving & OOP)
   - MA 16500 (Calculus I) or MA 16100
   - One laboratory science course
4. In progress or completed: CS 24000, MA 16600 (or MA 16200)
5. Overall strong academic standing

Data Science CODO Requirements:
1. Minimum 2.5 cumulative GPA
2. Completed with C or better:
   - CS 18000 or CS 15900
   - MA 16500 (Calculus I)
   - STAT 35000 (Elementary Statistics)
3. Strong performance in quantitative courses

COURSE PREREQUISITES:
- CS 24000 requires: CS 18000
- CS 25000 requires: CS 18000
- CS 25100 requires: CS 18000, CS 18200
- CS 25200 requires: CS 24000, CS 25000
- CS 30700 requires: CS 25100
- CS 37300 requires: CS 25100, CS 25200
- CS 38100 requires: CS 25100, MA 26100

SCHOOL OF SCIENCE REQUIREMENTS:
- Science, Technology & Society requirement
- Written/Oral Communication courses
- Cultural Diversity requirement
- General education electives (32 credit hours minimum)

GRADUATION REQUIREMENTS:
- 120 total credit hours minimum
- 2.0 cumulative GPA minimum
- 2.0 GPA in major courses
- Residency requirement (30+ credit hours at Purdue)
- All degree-specific requirements completed

ACADEMIC POLICIES:
- Normal course load: 12-18 credit hours per semester
- Overload permission required for >18 credits
- Minimum full-time: 12 credits
- Grade forgiveness policy available for repeated courses
- Withdrawal deadlines vary by semester
- Academic probation for GPA <2.0

COURSE AVAILABILITY:
- Fall/Spring: Most courses available
- Summer: Limited offerings, mainly lower-level courses
- Some advanced courses offered only once per year
- Check course rotation schedule for specialized electives

CAREER TRACKS & ELECTIVES:
Software Engineering Track Electives:
- CS 40800: Software Testing
- CS 42600: Computer Security
- CS 49000: Special Topics in Software Engineering

Machine Intelligence Track Electives:
- CS 47300: Web Information Search & Management
- CS 57300: Data Mining
- CS 58000: Algorithm Design & Analysis

General CS Electives:
- CS 35200: Compilers
- CS 35400: Operating Systems
- CS 38100: Introduction to Analysis of Algorithms
- CS 42200: Computer Networks
- CS 44800: Introduction to Relational Database Systems

This knowledge base represents the complete Purdue academic environment for accurate advising within your specialization areas.`;
  }

  /**
   * Parse AI response to extract course recommendations
   */
  private parseRecommendations(response: string, context: SmartCourseContext): SmartCourseRecommendation[] {
    const recommendations: SmartCourseRecommendation[] = [];
    
    // Extract course codes using regex patterns
    const coursePattern = /([A-Z]{2,4}\s+\d{5}(?:[A-Z])?)/g;
    const courseMatches = response.match(coursePattern) || [];
    
    // Parse structured recommendations if available
    const lines = response.split('\n');
    let currentRec: Partial<SmartCourseRecommendation> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for course code patterns
      const courseMatch = trimmedLine.match(/^(?:\d+\.?\s*)?([A-Z]{2,4}\s+\d{5}[A-Z]?)(?:\s*:?\s*(.+))?/);
      if (courseMatch) {
        // Save previous recommendation if complete
        if (currentRec.courseCode) {
          recommendations.push(this.completeRecommendation(currentRec, context));
        }
        
        // Start new recommendation
        currentRec = {
          courseCode: courseMatch[1],
          title: courseMatch[2] || '',
          credits: 3, // Default
          reason: '',
          priority: 'medium',
          type: 'elective'
        };
      }
      
      // Extract additional details
      if (trimmedLine.toLowerCase().includes('credit')) {
        const creditMatch = trimmedLine.match(/(\d+)\s*credit/);
        if (creditMatch && currentRec.courseCode) {
          currentRec.credits = parseInt(creditMatch[1]);
        }
      }
      
      // Determine recommendation type and priority
      if (trimmedLine.toLowerCase().includes('required') || trimmedLine.toLowerCase().includes('must take')) {
        if (currentRec.courseCode) {
          currentRec.type = 'required';
          currentRec.priority = 'high';
        }
      }
      
      if (trimmedLine.toLowerCase().includes('retake') || trimmedLine.toLowerCase().includes('repeat')) {
        if (currentRec.courseCode) {
          currentRec.type = 'retake';
          currentRec.priority = 'high';
        }
      }
      
      if (trimmedLine.toLowerCase().includes('prerequisite')) {
        if (currentRec.courseCode) {
          currentRec.type = 'prerequisite';
          currentRec.priority = 'high';
        }
      }
      
      // Collect reasoning
      if (currentRec.courseCode && trimmedLine.length > 10 && !courseMatch) {
        currentRec.reason = (currentRec.reason || '') + ' ' + trimmedLine;
      }
    }
    
    // Save final recommendation
    if (currentRec.courseCode) {
      recommendations.push(this.completeRecommendation(currentRec, context));
    }
    
    return recommendations.slice(0, 8); // Limit to 8 recommendations as per SmartCourse research
  }

  /**
   * Complete partial recommendation with defaults and validation
   */
  private completeRecommendation(
    partial: Partial<SmartCourseRecommendation>,
    context: SmartCourseContext
  ): SmartCourseRecommendation {
    return {
      courseCode: partial.courseCode || 'UNKNOWN',
      title: partial.title || 'Course Title',
      credits: partial.credits || 3,
      reason: (partial.reason || '').trim() || 'Academic advancement',
      priority: partial.priority || 'medium',
      type: partial.type || 'elective',
      meetsRequirement: this.identifyRequirement(partial.courseCode || '', context)
    };
  }

  /**
   * Identify which degree requirement a course satisfies
   */
  private identifyRequirement(courseCode: string, context: SmartCourseContext): string | undefined {
    if (!context.outstandingRequirements) return undefined;
    
    // Check if course directly matches outstanding requirements
    for (const req of context.outstandingRequirements) {
      if (req.includes(courseCode) || courseCode.includes(req)) {
        return req;
      }
    }
    
    // Check by course type
    if (courseCode.startsWith('CS')) {
      return 'Computer Science Core';
    }
    if (courseCode.startsWith('MA')) {
      return 'Mathematics Requirement';
    }
    if (courseCode.startsWith('STAT')) {
      return 'Statistics Requirement';
    }
    
    return undefined;
  }

  /**
   * Extract thinking process from AI response
   */
  private extractThinkingProcess(response: string): { analysis: string; reasoning: string; validation: string } | undefined {
    const analyzeMatch = response.match(/(?:ANALYZE|Analysis)[:]\s*(.*?)(?=(?:REASON|Reasoning|$))/si);
    const reasonMatch = response.match(/(?:REASON|Reasoning)[:]\s*(.*?)(?=(?:VALIDATE|Validation|$))/si);
    const validateMatch = response.match(/(?:VALIDATE|Validation)[:]\s*(.*?)(?=(?:SYNTHESIZE|$))/si);
    
    if (analyzeMatch || reasonMatch || validateMatch) {
      return {
        analysis: analyzeMatch?.[1]?.trim() || '',
        reasoning: reasonMatch?.[1]?.trim() || '',
        validation: validateMatch?.[1]?.trim() || ''
      };
    }
    
    return undefined;
  }

  /**
   * Clean AI response for presentation
   */
  private cleanResponse(response: string): string {
    // Remove structured thinking sections if present
    let cleaned = response.replace(/(?:ANALYZE|REASON|VALIDATE|SYNTHESIZE)[:]\s*.*?(?=(?:ANALYZE|REASON|VALIDATE|SYNTHESIZE|$))/gsi, '');
    
    // Clean up extra whitespace and formatting
    cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned || response; // Fallback to original if cleaning removes everything
  }

  /**
   * Create context from transcript and degree planning service
   */
  async createSmartCourseContext(
    transcript: TranscriptData,
    mode: SmartCourseContext['mode'] = 'full_context'
  ): Promise<SmartCourseContext> {
    let context: SmartCourseContext = { mode };
    
    if (mode === 'full_context' || mode === 'no_plan') {
      context.transcript = transcript;
      
      // Identify low grade courses (B- or below for retake consideration)
      context.lowGradeCourses = transcript.completed_courses
        ?.filter(course => this.isLowGrade(course.grade))
        .map(course => course.course_code) || [];
    }
    
    if (mode === 'full_context' || mode === 'no_transcript') {
      // Get degree plan from academic planning service
      try {
        const degreeProgress = academicPlanningService.calculateDegreeProgress(transcript);
        context.degreePlan = degreeProgress;
        
        // Extract outstanding requirements
        context.outstandingRequirements = this.extractOutstandingRequirements(degreeProgress);
      } catch (error) {
        logger.warn('Could not load degree plan for SmartCourse context:', 'SMARTCOURSE', error);
      }
    }
    
    return context;
  }

  /**
   * Determine if a grade is considered low for retake consideration
   */
  private isLowGrade(grade: string): boolean {
    const lowGrades = ['D+', 'D', 'D-', 'F', 'C-', 'C'];
    return lowGrades.includes(grade);
  }

  /**
   * Extract outstanding requirements from degree progress
   */
  private extractOutstandingRequirements(degreeProgress: any): string[] {
    const outstanding: string[] = [];
    
    // Extract from next recommended courses
    if (degreeProgress.nextRecommendedCourses) {
      outstanding.push(...degreeProgress.nextRecommendedCourses.map((c: any) => c.code));
    }
    
    // Extract from requirements analysis
    if (degreeProgress.requirements) {
      const { foundation, core, math, electives } = degreeProgress.requirements;
      
      if (foundation.completed < foundation.required) {
        outstanding.push(...foundation.courses.slice(foundation.completed));
      }
      if (core.completed < core.required) {
        outstanding.push(...core.courses.slice(core.completed));
      }
      if (math.completed < math.required) {
        outstanding.push(...math.courses.slice(math.completed));
      }
    }
    
    return outstanding;
  }

  /**
   * Generate SmartCourse metrics report for analytics
   */
  generateMetricsReport(responses: SmartCourseResponse[]): {
    averageMetrics: SmartCourseMetrics;
    contextComparison: { [key: string]: SmartCourseMetrics };
    qualityAssessment: string;
  } {
    if (responses.length === 0) {
      return {
        averageMetrics: { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency: 0 },
        contextComparison: {},
        qualityAssessment: 'No data available'
      };
    }

    // Calculate averages
    const totals = responses.reduce((acc, resp) => ({
      planScore: acc.planScore + resp.metrics.planScore,
      personalScore: acc.personalScore + resp.metrics.personalScore,
      lift: acc.lift + resp.metrics.lift,
      recall: acc.recall + resp.metrics.recall,
      latency: acc.latency + resp.metrics.latency
    }), { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency: 0 });

    const averageMetrics = {
      planScore: totals.planScore / responses.length,
      personalScore: totals.personalScore / responses.length,
      lift: totals.lift / responses.length,
      recall: totals.recall / responses.length,
      latency: totals.latency / responses.length
    };

    // Group by context mode
    const contextComparison: { [key: string]: SmartCourseMetrics } = {};
    ['full_context', 'no_transcript', 'no_plan', 'question_only'].forEach(mode => {
      const modeResponses = responses.filter(r => r.context.mode === mode);
      if (modeResponses.length > 0) {
        const modeAvg = modeResponses.reduce((acc, resp) => ({
          planScore: acc.planScore + resp.metrics.planScore,
          personalScore: acc.personalScore + resp.metrics.personalScore,
          lift: acc.lift + resp.metrics.lift,
          recall: acc.recall + resp.metrics.recall,
          latency: acc.latency + resp.metrics.latency
        }), { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency: 0 });

        contextComparison[mode] = {
          planScore: modeAvg.planScore / modeResponses.length,
          personalScore: modeAvg.personalScore / modeResponses.length,
          lift: modeAvg.lift / modeResponses.length,
          recall: modeAvg.recall / modeResponses.length,
          latency: modeAvg.latency / modeResponses.length
        };
      }
    });

    // Quality assessment
    let qualityAssessment = 'Good';
    if (averageMetrics.personalScore >= 0.75 && averageMetrics.lift >= 0.2) {
      qualityAssessment = 'Excellent - High personalization and context utilization';
    } else if (averageMetrics.personalScore >= 0.5) {
      qualityAssessment = 'Good - Moderate context utilization';
    } else {
      qualityAssessment = 'Needs Improvement - Low context utilization';
    }

    return { averageMetrics, contextComparison, qualityAssessment };
  }
}

export const smartCourseService = new SmartCourseService();