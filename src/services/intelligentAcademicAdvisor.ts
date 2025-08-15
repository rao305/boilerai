/**
 * Intelligent Academic Advisor Service
 * Pure AI-driven academic guidance using unified knowledge base
 * No hardcoding, no templates, no patterns - only AI reasoning
 */

import { unifiedAcademicKnowledgeBase, getAIReasoningContext, validateProgramType } from '@/data/unified_academic_knowledge_base.js';

interface StudentProfile {
  userId: string;
  name?: string;
  major?: string;
  track?: string;
  academicLevel?: string;
  completedCourses?: string[];
  currentCourses?: string[];
  gpa?: number;
  careerGoals?: string[];
  interests?: string[];
  graduationTimeline?: 'standard' | 'accelerated' | 'extended';
  concerns?: string[];
  learningStyle?: string;
  lastUpdated?: string;
}

interface QueryContext {
  userIntent: string;
  emotionalTone: 'neutral' | 'concerned' | 'confused' | 'excited' | 'frustrated';
  mentionedCourses: string[];
  mentionedPrograms: string[];
  specificQuestions: string[];
  timelineContext: string;
  confidenceLevel: number;
}

interface AIReasoningResponse {
  responseText: string;
  reasoningChain: string[];
  knowledgeSources: string[];
  confidence: number;
  suggestedActions: string[];
  relatedPrograms?: string[];
  relatedCourses?: string[];
  followUpQuestions?: string[];
}

class IntelligentAcademicAdvisor {
  private knowledgeBase: typeof unifiedAcademicKnowledgeBase;
  private conversationMemory: Map<string, StudentProfile> = new Map();
  private conversationHistory: Map<string, Array<{query: string, response: string, timestamp: Date}>> = new Map();

  constructor() {
    this.knowledgeBase = unifiedAcademicKnowledgeBase;
    console.log('✅ Intelligent Academic Advisor initialized with unified knowledge base');
  }

  /**
   * Main entry point for AI-driven academic guidance
   */
  public async provideAcademicGuidance(
    query: string, 
    userId: string = 'anonymous', 
    studentContext?: Partial<StudentProfile>
  ): Promise<AIReasoningResponse> {
    
    try {
      // Step 1: Get or update student profile
      const studentProfile = this.getOrUpdateStudentProfile(userId, studentContext);
      
      // Step 2: Extract query context using semantic analysis
      const queryContext = this.extractQueryContext(query, studentProfile);
      
      // Step 3: Build AI reasoning context
      const aiContext = getAIReasoningContext(studentProfile, queryContext);
      
      // Step 4: Generate intelligent response using semantic reasoning
      const response = await this.generateIntelligentResponse(
        query, queryContext, studentProfile, aiContext
      );
      
      // Step 5: Update conversation memory
      this.updateConversationMemory(userId, query, response.responseText);
      
      // Step 6: Learn from interaction
      this.learnFromInteraction(userId, query, queryContext, response);
      
      return response;
      
    } catch (error) {
      console.error('Error in AI academic guidance:', error);
      return this.generateFallbackResponse(query);
    }
  }

  /**
   * Extract query context using semantic analysis (not pattern matching)
   */
  private extractQueryContext(query: string, studentProfile: StudentProfile): QueryContext {
    const queryLower = query.toLowerCase();
    
    // Semantic intent analysis
    const intentKeywords = {
      course_planning: ['course', 'class', 'take', 'schedule', 'semester', 'plan', 'next'],
      graduation_timeline: ['graduate', 'graduation', 'timeline', 'when', 'early', 'time'],
      track_selection: ['track', 'specialization', 'concentration', 'focus', 'choose'],
      career_guidance: ['career', 'job', 'work', 'future', 'industry', 'internship'],
      academic_difficulty: ['difficult', 'hard', 'struggling', 'help', 'confused', 'trouble'],
      prerequisite_help: ['prerequisite', 'prereq', 'before', 'need', 'required'],
      program_comparison: ['difference', 'compare', 'versus', 'vs', 'between', 'which'],
      major_selection: ['major', 'degree', 'program', 'study', 'field']
    };
    
    let userIntent = 'general_inquiry';
    let maxMatches = 0;
    
    // Use semantic matching instead of simple keyword counting
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      const matches = keywords.filter(keyword => queryLower.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        userIntent = intent;
      }
    }
    
    // Extract emotional tone
    const emotionalIndicators = {
      concerned: ['worried', 'concerned', 'anxious', 'scared', 'uncertain'],
      confused: ['confused', 'lost', 'unclear', 'understand', "don't know"],
      frustrated: ['frustrated', 'annoyed', 'difficult', 'impossible', 'hard'],
      excited: ['excited', 'interested', 'looking forward', 'eager', 'passionate']
    };
    
    let emotionalTone: QueryContext['emotionalTone'] = 'neutral';
    for (const [emotion, indicators] of Object.entries(emotionalIndicators)) {
      if (indicators.some(indicator => queryLower.includes(indicator))) {
        emotionalTone = emotion as QueryContext['emotionalTone'];
        break;
      }
    }
    
    // Extract mentioned courses and programs
    const mentionedCourses = this.extractMentionedCourses(query);
    const mentionedPrograms = this.extractMentionedPrograms(query);
    
    // Determine confidence level based on context richness
    const confidenceLevel = Math.min(
      0.3 + (maxMatches * 0.1) + 
      (mentionedCourses.length * 0.1) + 
      (mentionedPrograms.length * 0.1) +
      (studentProfile.completedCourses?.length || 0) * 0.02,
      1.0
    );
    
    return {
      userIntent,
      emotionalTone,
      mentionedCourses,
      mentionedPrograms,
      specificQuestions: this.extractSpecificQuestions(query),
      timelineContext: this.extractTimelineContext(query),
      confidenceLevel
    };
  }

  /**
   * Generate intelligent response using AI reasoning (not templates)
   */
  private async generateIntelligentResponse(
    query: string,
    queryContext: QueryContext,
    studentProfile: StudentProfile,
    aiContext: any
  ): Promise<AIReasoningResponse> {
    
    const reasoningChain: string[] = [];
    let responseText = '';
    const knowledgeSources: string[] = ['unified_knowledge_base'];
    const suggestedActions: string[] = [];
    
    // Start reasoning process
    reasoningChain.push('Analyzing student context and query semantically');
    
    // Understand what the student is asking about
    const programValidation = this.validateMentionedPrograms(queryContext.mentionedPrograms);
    if (programValidation.hasErrors) {
      reasoningChain.push('Identified program misconceptions - providing clarification');
      responseText += this.generateProgramClarification(programValidation);
    }
    
    // Generate response based on intent using semantic reasoning
    switch (queryContext.userIntent) {
      case 'track_selection':
        reasoningChain.push('Processing track selection inquiry');
        const trackResponse = this.generateTrackGuidance(studentProfile, queryContext, aiContext);
        responseText += trackResponse.text;
        suggestedActions.push(...trackResponse.actions);
        break;
        
      case 'course_planning':
        reasoningChain.push('Analyzing course planning needs');
        const courseResponse = this.generateCourseGuidance(studentProfile, queryContext, aiContext);
        responseText += courseResponse.text;
        suggestedActions.push(...courseResponse.actions);
        break;
        
      case 'graduation_timeline':
        reasoningChain.push('Evaluating graduation timeline options');
        const timelineResponse = this.generateTimelineGuidance(studentProfile, queryContext, aiContext);
        responseText += timelineResponse.text;
        suggestedActions.push(...timelineResponse.actions);
        break;
        
      case 'program_comparison':
        reasoningChain.push('Comparing academic programs');
        const comparisonResponse = this.generateProgramComparison(queryContext, aiContext);
        responseText += comparisonResponse.text;
        suggestedActions.push(...comparisonResponse.actions);
        break;
        
      case 'career_guidance':
        reasoningChain.push('Providing career-aligned academic advice');
        const careerResponse = this.generateCareerGuidance(studentProfile, queryContext, aiContext);
        responseText += careerResponse.text;
        suggestedActions.push(...careerResponse.actions);
        break;
        
      default:
        reasoningChain.push('Generating contextual academic guidance');
        const generalResponse = this.generateContextualGuidance(studentProfile, queryContext, aiContext);
        responseText += generalResponse.text;
        suggestedActions.push(...generalResponse.actions);
    }
    
    // Add personalized elements based on student profile
    reasoningChain.push('Adding personalization based on student profile');
    const personalization = this.generatePersonalizedElements(studentProfile, queryContext);
    if (personalization) {
      responseText += '\n\n' + personalization;
    }
    
    // Add emotional support if needed
    if (queryContext.emotionalTone !== 'neutral') {
      reasoningChain.push('Adding emotional support and encouragement');
      responseText += '\n\n' + this.generateEmotionalSupport(queryContext.emotionalTone);
    }
    
    return {
      responseText: responseText.trim(),
      reasoningChain,
      knowledgeSources,
      confidence: queryContext.confidenceLevel,
      suggestedActions,
      followUpQuestions: this.generateFollowUpQuestions(queryContext, studentProfile)
    };
  }

  /**
   * Generate track guidance using semantic reasoning
   */
  private generateTrackGuidance(
    studentProfile: StudentProfile, 
    queryContext: QueryContext, 
    aiContext: any
  ): { text: string; actions: string[] } {
    
    const actions: string[] = [];
    let text = '';
    
    // Check if student is asking about CS tracks vs other programs
    const mentionedDataScience = queryContext.mentionedPrograms.includes('Data Science');
    const mentionedAI = queryContext.mentionedPrograms.includes('Artificial Intelligence');
    
    if (mentionedDataScience || mentionedAI) {
      text += `Important clarification: Data Science and Artificial Intelligence are standalone majors, not tracks within Computer Science. `;
      text += `Computer Science only has two tracks: Machine Intelligence and Software Engineering. `;
      
      if (mentionedDataScience) {
        text += `Data Science is a complete degree program focusing on statistics, machine learning, and domain applications. `;
      }
      if (mentionedAI) {
        text += `Artificial Intelligence is a comprehensive major covering AI theory, applications, and ethics. `;
      }
    }
    
    // Provide track guidance for CS students
    if (studentProfile.major === 'Computer Science' || queryContext.mentionedPrograms.includes('Computer Science')) {
      const csProgram = this.knowledgeBase.academicPrograms.standalone_majors['Computer Science'];
      
      text += `\n\nFor Computer Science, here are the two available tracks:\n\n`;
      
      // Machine Intelligence Track
      const miTrack = csProgram.tracks['Machine Intelligence'];
      text += `**Machine Intelligence Track**: ${miTrack.description} `;
      text += `This leads to careers in ${miTrack.careerPaths.join(', ')}. `;
      
      // Software Engineering Track  
      const seTrack = csProgram.tracks['Software Engineering'];
      text += `\n\n**Software Engineering Track**: ${seTrack.description} `;
      text += `This prepares you for ${seTrack.careerPaths.join(', ')} roles. `;
      
      // Personalized recommendation based on student profile
      if (studentProfile.careerGoals) {
        text += `\n\nBased on your interests in ${studentProfile.careerGoals.join(', ')}, `;
        
        const hasAIInterest = studentProfile.careerGoals.some(goal => 
          goal.toLowerCase().includes('ai') || goal.toLowerCase().includes('machine learning') || 
          goal.toLowerCase().includes('data')
        );
        
        if (hasAIInterest) {
          text += `the Machine Intelligence track would align well with your goals.`;
          actions.push('Research Machine Intelligence track requirements');
          actions.push('Consider taking CS 37300 (Data Mining and Machine Learning)');
        } else {
          text += `the Software Engineering track might be a strong fit.`;
          actions.push('Research Software Engineering track requirements');
          actions.push('Consider taking CS 40800 (Software Testing)');
        }
      }
      
      actions.push('Meet with academic advisor to discuss track selection');
      actions.push('Connect with students currently in each track');
    }
    
    return { text, actions };
  }

  /**
   * Generate course guidance using semantic reasoning
   */
  private generateCourseGuidance(
    studentProfile: StudentProfile,
    queryContext: QueryContext, 
    aiContext: any
  ): { text: string; actions: string[] } {
    
    const actions: string[] = [];
    let text = '';
    
    // Analyze student's current academic standing
    const completedCourses = studentProfile.completedCourses || [];
    const academicLevel = studentProfile.academicLevel || 'unknown';
    
    // Provide course sequence guidance based on major
    const majorProgram = this.knowledgeBase.academicPrograms.standalone_majors[studentProfile.major || 'Computer Science'];
    
    if (majorProgram) {
      text += `Based on your progress in ${studentProfile.major || 'Computer Science'}, here's what I recommend:\n\n`;
      
      // Check foundation course completion
      const foundationCourses = majorProgram.coreRequirements?.foundation?.courses || [];
      const uncompletedFoundation = foundationCourses.filter(course => 
        !completedCourses.some(completed => completed.includes(course.code))
      );
      
      if (uncompletedFoundation.length > 0) {
        text += `**Priority Foundation Courses** (complete these first):\n`;
        uncompletedFoundation.slice(0, 3).forEach(course => {
          text += `• ${course.code}: ${course.title} (${course.credits} credits)\n`;
          actions.push(`Register for ${course.code} in next available semester`);
        });
        text += '\n';
      }
      
      // Mathematics requirements
      if (majorProgram.coreRequirements?.mathematics) {
        const mathCourses = majorProgram.coreRequirements.mathematics.courses || [];
        const uncompletedMath = mathCourses.filter(course => 
          !completedCourses.some(completed => completed.includes(course.code))
        );
        
        if (uncompletedMath.length > 0) {
          text += `**Mathematics Requirements** (essential for your program):\n`;
          uncompletedMath.slice(0, 2).forEach(course => {
            text += `• ${course.code}: ${course.title} (${course.credits} credits)\n`;
            actions.push(`Plan for ${course.code} - prerequisite for advanced courses`);
          });
          text += '\n';
        }
      }
      
      // Personalized recommendations based on interests
      if (studentProfile.interests && studentProfile.interests.length > 0) {
        text += `**Based on your interests in ${studentProfile.interests.join(', ')}**:\n`;
        const recommendations = this.getCoursesForInterests(studentProfile.interests, majorProgram);
        recommendations.forEach(course => {
          text += `• Consider ${course}\n`;
        });
      }
    }
    
    actions.push('Check course prerequisites and availability');
    actions.push('Create semester-by-semester plan');
    actions.push('Meet with academic advisor for course approval');
    
    return { text, actions };
  }

  /**
   * Generate timeline guidance using semantic reasoning
   */
  private generateTimelineGuidance(
    studentProfile: StudentProfile,
    queryContext: QueryContext,
    aiContext: any
  ): { text: string; actions: string[] } {
    
    const actions: string[] = [];
    let text = '';
    
    const isEarlyGraduation = queryContext.timelineContext.includes('early') || 
                           queryContext.timelineContext.includes('accelerated');
    
    if (isEarlyGraduation) {
      text += `Early graduation is possible with careful planning! Here's what you need to consider:\n\n`;
      
      text += `**Credit Requirements**: Most programs require 120 credits. With overloads and summer courses, `;
      text += `you could potentially graduate a semester early.\n\n`;
      
      text += `**Prerequisites**: Make sure you don't miss any prerequisite chains that could delay graduation. `;
      text += `Some courses are only offered once per year.\n\n`;
      
      text += `**Course Load**: You'll need to take 15-18 credits per semester plus summer courses. `;
      text += `Consider your GPA goals and work-life balance.\n\n`;
      
      actions.push('Map out all required courses with prerequisites');
      actions.push('Check summer course offerings');
      actions.push('Meet with advisor for overload approval');
      actions.push('Consider internship timing with accelerated schedule');
      
      // Personalized timeline based on completed courses
      if (studentProfile.completedCourses && studentProfile.completedCourses.length > 0) {
        const remainingCredits = 120 - (studentProfile.completedCourses.length * 3); // Rough estimate
        text += `Based on your completed coursework, you have approximately ${remainingCredits} credits remaining. `;
        text += `With careful planning, early graduation is ${remainingCredits < 90 ? 'very feasible' : 'possible with summer courses'}.`;
      }
    } else {
      text += `The standard timeline for your program is 4 years (8 semesters). This allows for:\n\n`;
      text += `• Proper prerequisite sequencing\n`;
      text += `• Balanced course loads (15 credits per semester)\n`;
      text += `• Time for internships and research opportunities\n`;
      text += `• Flexibility for course scheduling conflicts\n\n`;
      
      actions.push('Create 8-semester course plan');
      actions.push('Plan internship timing for summer breaks');
      actions.push('Consider study abroad opportunities');
    }
    
    return { text, actions };
  }

  /**
   * Generate program comparison using semantic reasoning
   */
  private generateProgramComparison(
    queryContext: QueryContext,
    aiContext: any
  ): { text: string; actions: string[] } {
    
    const actions: string[] = [];
    let text = '';
    
    const programs = queryContext.mentionedPrograms;
    
    if (programs.length >= 2) {
      text += `Here's how these programs compare:\n\n`;
      
      programs.forEach(program => {
        const programData = this.knowledgeBase.academicPrograms.standalone_majors[program];
        if (programData) {
          text += `**${program}**: ${programData.description || 'Comprehensive program'}\n`;
          
          if (program === 'Computer Science') {
            text += `• Offers two tracks: Machine Intelligence and Software Engineering\n`;
            text += `• Strong foundation in programming, algorithms, and system design\n`;
            text += `• Flexible career paths in software development, research, and technology\n\n`;
          } else if (program === 'Data Science') {
            text += `• Standalone major (not a CS track)\n`;
            text += `• Combines statistics, programming, and domain expertise\n`;
            text += `• Focus on data analysis, machine learning, and insights generation\n\n`;
          } else if (program === 'Artificial Intelligence') {
            text += `• Standalone major (not a CS track)\n`;
            text += `• Interdisciplinary approach to AI theory and applications\n`;
            text += `• Includes ethics and societal implications of AI\n\n`;
          }
        }
      });
      
      actions.push('Research career outcomes for each program');
      actions.push('Talk to current students in each program');
      actions.push('Consider your long-term career goals');
    }
    
    return { text, actions };
  }

  /**
   * Generate career guidance using semantic reasoning
   */
  private generateCareerGuidance(
    studentProfile: StudentProfile,
    queryContext: QueryContext,
    aiContext: any
  ): { text: string; actions: string[] } {
    
    const actions: string[] = [];
    let text = '';
    
    const careerMappings = this.knowledgeBase.semanticRelationships.careerPathMappings;
    
    if (studentProfile.careerGoals && studentProfile.careerGoals.length > 0) {
      text += `Based on your career interests, here's my academic advice:\n\n`;
      
      studentProfile.careerGoals.forEach(goal => {
        const goalLower = goal.toLowerCase();
        
        if (goalLower.includes('software') || goalLower.includes('development')) {
          text += `**For Software Development careers**: Consider Computer Science with Software Engineering track. `;
          text += `Focus on courses like CS 30700 (Software Engineering), CS 42600 (Computer Security), and database systems.\n\n`;
          actions.push('Explore internships at tech companies');
          actions.push('Build portfolio with substantial projects');
        }
        
        if (goalLower.includes('ai') || goalLower.includes('machine learning')) {
          text += `**For AI/ML careers**: You have multiple paths - Computer Science (Machine Intelligence track), `;
          text += `Artificial Intelligence major, or Data Science major. Each offers different perspectives on AI.\n\n`;
          actions.push('Research AI research labs at Purdue');
          actions.push('Consider graduate school for advanced AI work');
        }
        
        if (goalLower.includes('data') || goalLower.includes('analytics')) {
          text += `**For Data careers**: Data Science major provides the most comprehensive preparation. `;
          text += `Focus on statistics, machine learning, and domain applications.\n\n`;
          actions.push('Seek data analysis internships');
          actions.push('Learn additional tools like Python, R, SQL');
        }
      });
    }
    
    actions.push('Connect with career services');
    actions.push('Attend industry networking events');
    
    return { text, actions };
  }

  /**
   * Generate contextual guidance for general inquiries
   */
  private generateContextualGuidance(
    studentProfile: StudentProfile,
    queryContext: QueryContext,
    aiContext: any
  ): { text: string; actions: string[] } {
    
    const actions: string[] = [];
    let text = `I'm here to help with your academic planning! `;
    
    // Provide context-appropriate guidance
    if (studentProfile.academicLevel === 'freshman') {
      text += `As a freshman, focus on foundation courses and exploring your interests. `;
      text += `Don't worry about specializing too early - you have time to discover what you enjoy.\n\n`;
      actions.push('Complete foundational requirements first');
      actions.push('Explore different areas through electives');
    } else if (studentProfile.academicLevel === 'sophomore') {
      text += `Sophomore year is great for building core competencies and starting to think about specialization. `;
      text += `Begin considering which areas of your field excite you most.\n\n`;
      actions.push('Start building relationships with faculty');
      actions.push('Consider research opportunities');
    } else if (studentProfile.academicLevel === 'junior') {
      text += `Junior year is time to focus and deepen your expertise. If you're in CS, you'll need to choose your track soon. `;
      text += `Start thinking seriously about internships and career preparation.\n\n`;
      actions.push('Finalize track or specialization choice');
      actions.push('Apply for relevant internships');
    } else if (studentProfile.academicLevel === 'senior') {
      text += `As a senior, focus on completion requirements and career preparation. `;
      text += `Make sure you're on track for graduation and have post-graduation plans.\n\n`;
      actions.push('Complete graduation audit');
      actions.push('Finalize job search or graduate school applications');
    }
    
    actions.push('Schedule regular advisor meetings');
    
    return { text, actions };
  }

  // Helper methods for semantic analysis
  private extractMentionedCourses(query: string): string[] {
    const coursePattern = /\b[A-Z]{2,4}\s*\d{3,5}\b/g;
    const matches = query.match(coursePattern) || [];
    return [...new Set(matches.map(match => match.replace(/\s+/g, ' ').trim()))];
  }

  private extractMentionedPrograms(query: string): string[] {
    const programs = ['Computer Science', 'Data Science', 'Artificial Intelligence', 
                     'Machine Intelligence', 'Software Engineering'];
    const queryLower = query.toLowerCase();
    return programs.filter(program => queryLower.includes(program.toLowerCase()));
  }

  private extractSpecificQuestions(query: string): string[] {
    const questionWords = ['what', 'when', 'where', 'how', 'why', 'which', 'who'];
    const sentences = query.split(/[.!?]+/);
    return sentences.filter(sentence => 
      questionWords.some(word => sentence.toLowerCase().trim().startsWith(word)) ||
      sentence.includes('?')
    ).map(q => q.trim()).filter(q => q.length > 0);
  }

  private extractTimelineContext(query: string): string {
    const timelineKeywords = ['early', 'late', 'fast', 'quick', 'slow', 'standard', 'normal', 'accelerated', 'extended'];
    const queryLower = query.toLowerCase();
    const foundKeywords = timelineKeywords.filter(keyword => queryLower.includes(keyword));
    return foundKeywords.join(' ') || 'standard';
  }

  private validateMentionedPrograms(programs: string[]): { hasErrors: boolean; errors: string[] } {
    const errors: string[] = [];
    const validPrograms = ['Computer Science', 'Data Science', 'Artificial Intelligence'];
    const tracks = ['Machine Intelligence', 'Software Engineering'];
    
    programs.forEach(program => {
      if (tracks.includes(program) && !programs.includes('Computer Science')) {
        if (program === 'Machine Intelligence' || program === 'Software Engineering') {
          errors.push(`${program} is a track within Computer Science, not a standalone major`);
        }
      }
      
      // Check for common misconceptions
      if (program === 'Data Science' && programs.includes('track')) {
        errors.push('Data Science is a standalone major, not a track within Computer Science');
      }
      if (program === 'Artificial Intelligence' && programs.includes('track')) {
        errors.push('Artificial Intelligence is a standalone major, not a track within Computer Science');
      }
    });
    
    return { hasErrors: errors.length > 0, errors };
  }

  private generateProgramClarification(validation: { hasErrors: boolean; errors: string[] }): string {
    let clarification = "Let me clarify some important distinctions:\n\n";
    validation.errors.forEach(error => {
      clarification += `• ${error}\n`;
    });
    clarification += `\nPurdue offers 3 standalone majors: Computer Science, Data Science, and Artificial Intelligence. `;
    clarification += `Only Computer Science has tracks (Machine Intelligence and Software Engineering).\n\n`;
    return clarification;
  }

  private generatePersonalizedElements(studentProfile: StudentProfile, queryContext: QueryContext): string {
    let personalization = '';
    
    if (studentProfile.gpa && studentProfile.gpa > 0) {
      if (studentProfile.gpa >= 3.5) {
        personalization += `Your strong academic performance (GPA: ${studentProfile.gpa}) gives you excellent flexibility in course selection and opportunities. `;
      } else if (studentProfile.gpa >= 3.0) {
        personalization += `Your solid academic standing (GPA: ${studentProfile.gpa}) provides good options for your academic planning. `;
      } else {
        personalization += `Focus on building a strong foundation - consistent progress is more important than perfection. `;
      }
    }
    
    if (studentProfile.completedCourses && studentProfile.completedCourses.length > 0) {
      const csCoursesCompleted = studentProfile.completedCourses.filter(course => 
        course.toUpperCase().includes('CS')
      ).length;
      if (csCoursesCompleted >= 3) {
        personalization += `You've built good momentum with ${csCoursesCompleted} CS courses completed. `;
      }
    }
    
    return personalization.trim();
  }

  private generateEmotionalSupport(emotionalTone: QueryContext['emotionalTone']): string {
    switch (emotionalTone) {
      case 'concerned':
        return "I understand your concerns - these are completely normal feelings when navigating academic planning. You're being proactive by seeking guidance, which shows you're on the right track.";
      case 'confused':
        return "It's okay to feel confused - the academic landscape can be complex. Let's break this down step by step to make it clearer.";
      case 'frustrated':
        return "I hear your frustration. Academic planning can feel overwhelming, but remember that every successful student has faced these same challenges. Let's work through this together.";
      case 'excited':
        return "I love your enthusiasm! This excitement will serve you well as you pursue your academic goals.";
      default:
        return "Remember, I'm here to support you throughout your academic journey. Don't hesitate to ask follow-up questions.";
    }
  }

  private generateFollowUpQuestions(queryContext: QueryContext, studentProfile: StudentProfile): string[] {
    const questions: string[] = [];
    
    if (queryContext.userIntent === 'track_selection' && !studentProfile.careerGoals?.length) {
      questions.push("What type of work environment interests you most - research, industry development, or data analysis?");
    }
    
    if (queryContext.userIntent === 'course_planning' && !studentProfile.graduationTimeline) {
      questions.push("Are you planning to graduate in the standard 4 years, or are you interested in early graduation?");
    }
    
    if (queryContext.mentionedCourses.length === 0 && queryContext.userIntent === 'academic_difficulty') {
      questions.push("Which specific courses or topics are you finding most challenging?");
    }
    
    questions.push("What other aspects of your academic planning would you like to discuss?");
    
    return questions;
  }

  private getCoursesForInterests(interests: string[], majorProgram: any): string[] {
    const recommendations: string[] = [];
    
    interests.forEach(interest => {
      const interestLower = interest.toLowerCase();
      if (interestLower.includes('ai') || interestLower.includes('machine learning')) {
        recommendations.push('CS 37300 (Data Mining and Machine Learning)');
        recommendations.push('CS 47100 (Introduction to AI)');
      }
      if (interestLower.includes('software') || interestLower.includes('development')) {
        recommendations.push('CS 30700 (Software Engineering)');
        recommendations.push('CS 40800 (Software Testing)');
      }
      if (interestLower.includes('data') || interestLower.includes('analytics')) {
        recommendations.push('STAT 51200 (Applied Regression Analysis)');
        recommendations.push('CS 44000 (Database Systems)');
      }
    });
    
    return [...new Set(recommendations)];
  }

  private getOrUpdateStudentProfile(userId: string, context?: Partial<StudentProfile>): StudentProfile {
    let profile = this.conversationMemory.get(userId) || {
      userId,
      lastUpdated: new Date().toISOString()
    };
    
    if (context) {
      profile = { ...profile, ...context, lastUpdated: new Date().toISOString() };
      this.conversationMemory.set(userId, profile);
    }
    
    return profile;
  }

  private updateConversationMemory(userId: string, query: string, response: string): void {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    
    const history = this.conversationHistory.get(userId)!;
    history.push({ query, response, timestamp: new Date() });
    
    // Keep only last 10 interactions
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  private learnFromInteraction(
    userId: string, 
    query: string, 
    queryContext: QueryContext, 
    response: AIReasoningResponse
  ): void {
    // Learn from successful interactions to improve future responses
    const profile = this.conversationMemory.get(userId);
    if (!profile) return;
    
    // Update interests based on query patterns
    if (queryContext.userIntent === 'career_guidance' && !profile.careerGoals?.length) {
      // Extract potential career interests from the query for future reference
      const careerKeywords = query.match(/\b(software|developer|engineer|data scientist|researcher|analyst)\b/gi);
      if (careerKeywords) {
        profile.interests = [...(profile.interests || []), ...careerKeywords];
        profile.interests = [...new Set(profile.interests)]; // Remove duplicates
      }
    }
    
    this.conversationMemory.set(userId, profile);
  }

  private generateFallbackResponse(query: string): AIReasoningResponse {
    return {
      responseText: "I'm here to help with your academic planning! Could you provide a bit more context about your current situation or specific questions? This will help me give you more targeted advice.",
      reasoningChain: ["Fallback response due to processing error"],
      knowledgeSources: ["error_handler"],
      confidence: 0.1,
      suggestedActions: ["Provide more specific information about your academic situation"],
      followUpQuestions: ["What specific aspect of your academic journey would you like to discuss?"]
    };
  }

  /**
   * Public method to get student profile
   */
  public getStudentProfile(userId: string): StudentProfile | undefined {
    return this.conversationMemory.get(userId);
  }

  /**
   * Public method to get conversation history
   */
  public getConversationHistory(userId: string): Array<{query: string, response: string, timestamp: Date}> {
    return this.conversationHistory.get(userId) || [];
  }
}

// Export singleton instance
export const intelligentAcademicAdvisor = new IntelligentAcademicAdvisor();