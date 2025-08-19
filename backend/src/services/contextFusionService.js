const DegreeRequirements = require('./degreeRequirementsAPI');

class ContextFusionService {
  /**
   * Fuses transcript, degree requirements, and user query into AI-ready context
   * IMPROVED: Handles all user states - with transcript, without transcript, or partial data
   * NOTE:
   * - This uses ACTUAL data from your knowledge base, not hardcoded examples
   * - All course information comes from your existing database
   * - Now includes robust fallback handling for all edge cases
   */
  static async fuseContext(transcript, program, userQuery, userProfile = null) {
    // VALIDATION: Sanitize and validate inputs
    const sanitizedQuery = this.sanitizeUserInput(userQuery);
    const validatedTranscript = this.validateTranscriptData(transcript);
    const validatedProgram = this.validateProgramName(program);
    
    // EDGE CASE 1: No transcript, no program, no user profile - anonymous user
    if (!validatedTranscript && !validatedProgram && !userProfile) {
      return {
        systemPrompt: `You are Boiler AI, Purdue University's academic advisor. 
          You're helping an anonymous student who hasn't provided transcript or profile information.
          Provide general academic guidance based on Purdue University policies and standard degree requirements.
          Encourage them to create a profile or upload their transcript for more personalized advice.`,
        userPrompt: `GENERAL ACADEMIC QUERY: ${sanitizedQuery}
        
        Since I don't have specific information about your academic progress, I'll provide general guidance.
        For personalized advice, consider creating a profile or uploading your transcript.`
      };
    }

    // EDGE CASE 2: No transcript but have user profile - registered user without transcript
    if (!validatedTranscript && userProfile) {
      const validatedProfile = this.validateUserProfile(userProfile);
      return this.fuseContextWithProfileOnly(validatedProfile, sanitizedQuery, validatedProgram);
    }

    // EDGE CASE 3: Have transcript but no program detected
    if (validatedTranscript && !validatedProgram) {
      return this.fuseContextWithUnknownProgram(validatedTranscript, sanitizedQuery);
    }

    // EDGE CASE 4: Have partial transcript data
    if (validatedTranscript && (!validatedTranscript.courses || validatedTranscript.courses.length === 0)) {
      return this.fuseContextWithEmptyTranscript(validatedTranscript, validatedProgram, sanitizedQuery);
    }

    try {
      // Get degree requirements DIRECTLY from your knowledge base
      // NOTE: This uses your existing data, no hardcoded courses
      const programRequirements = await DegreeRequirements.getRequirementsForProgram(validatedProgram);
      const validatedRequirements = this.validateKnowledgeBaseResponse(programRequirements, 'program');
      
      const programProgress = validatedRequirements ? 
        await DegreeRequirements.checkProgress(validatedRequirements, validatedTranscript) : null;

      // Build structured context for the AI using REAL data
      return {
        systemPrompt: this.buildSystemPrompt(validatedTranscript, programProgress),
        userPrompt: this.buildUserPrompt(validatedTranscript, programProgress, sanitizedQuery)
      };
    } catch (error) {
      console.error('Context fusion error:', error);
      
      // ENHANCED ERROR RECOVERY: Try different fallback strategies
      try {
        // Fallback 1: Try with minimal transcript data if available
        if (validatedTranscript) {
          return {
            systemPrompt: `You are Boiler AI, Purdue University's academic advisor. 
              I have the student's transcript data but couldn't retrieve detailed program requirements.
              Use the transcript information to provide guidance, but note the program information limitation.`,
            userPrompt: `STUDENT QUERY: ${sanitizedQuery}
              
              NOTE: I can see your transcript but couldn't access detailed program requirements.
              I'll base my advice on your completed courses and general Purdue policies.`
          };
        }
        
        // Fallback 2: General guidance with program name if available
        if (validatedProgram) {
          return {
            systemPrompt: `You are Boiler AI, Purdue University's academic advisor. 
              I know the student is in ${validatedProgram} but couldn't access their transcript or detailed program requirements.
              Provide general guidance for ${validatedProgram} students at Purdue.`,
            userPrompt: `STUDENT QUERY: ${sanitizedQuery}
              
              NOTE: I know you're in ${validatedProgram} but couldn't access detailed information.
              I'll provide general guidance for your program.`
          };
        }
        
        // Fallback 3: Complete safe fallback
        return this.createSafeFallbackContext(sanitizedQuery, error);
        
      } catch (fallbackError) {
        console.error('All fallback strategies failed:', fallbackError);
        return this.createSafeFallbackContext(sanitizedQuery, error);
      }
    }
  }

  static buildSystemPrompt(transcript, programProgress) {
    // NOTE:
    // - This builds a prompt using ACTUAL course data from your knowledge base
    // - NO hardcoded course codes - everything comes from programProgress
    
    let context = `You are Boiler AI, Purdue University's expert academic advisor. Use ONLY the context below to answer student queries.\n\n`;
    
    // Add student profile using REAL transcript data
    context += `STUDENT PROFILE:
- Name: ${transcript.studentInfo.name || 'Student'}
- Program: ${transcript.studentInfo.program || 'Undeclared'}
- College: ${transcript.studentInfo.college || 'N/A'}
- Cumulative GPA: ${transcript.gpaSummary.cumulativeGPA.toFixed(2)}
- Total Credits Earned: ${transcript.gpaSummary.totalCreditsEarned}
- Credits In Progress: ${transcript.courses.filter(c => c.status === 'in-progress').length}\n\n`;

    // Add completed courses using REAL transcript data
    context += `COMPLETED COURSES:\n`;
    if (transcript.courses.filter(c => c.status === 'completed').length > 0) {
      transcript.courses
        .filter(c => c.status === 'completed')
        .forEach(c => {
          context += `- ${c.courseCode}: ${c.title} (Grade: ${c.grade}, ${c.credits} credits)\n`;
        });
    } else {
      context += "None\n";
    }
    context += `\n`;

    // Add in-progress courses using REAL transcript data
    context += `IN-PROGRESS COURSES:\n`;
    if (transcript.courses.filter(c => c.status === 'in-progress').length > 0) {
      transcript.courses
        .filter(c => c.status === 'in-progress')
        .forEach(c => {
          context += `- ${c.courseCode}: ${c.title} (${c.credits} credits)\n`;
        });
    } else {
      context += "None\n";
    }
    context += `\n`;

    // Add program progress using ACTUAL degree requirements from your knowledge base
    if (programProgress) {
      context += this.buildProgramContext(programProgress);
    } else {
      context += `DEGREE PROGRESS: Program requirements not available in the knowledge base.\n\n`;
    }

    context += `INSTRUCTIONS:
1. ALWAYS check if prerequisites are met using transcript data before recommending courses
2. If a course requires a minimum grade (e.g., "C"), verify the student has that grade
3. NEVER recommend courses the student has already completed
4. If the student is near graduation, prioritize remaining requirements
5. If uncertain, say "I need to check with an advisor"
6. Always reference specific courses/requirements when explaining your reasoning`;

    return context;
  }

  static buildProgramContext(programProgress) {
    // NOTE:
    // - This uses ACTUAL program requirements from your knowledge base
    // - NO hardcoded course counts - calculates from real data
    
    // Count completed requirements from ACTUAL program data
    const coreCompleted = programProgress.requirements.core ? 
      programProgress.requirements.core.filter(c => c.status === 'completed').length : 0;
    const coreTotal = programProgress.requirements.core ? 
      programProgress.requirements.core.length : 0;
    
    const mathCompleted = programProgress.requirements.math ? 
      programProgress.requirements.math.filter(c => c.status === 'completed').length : 0;
    const mathTotal = programProgress.requirements.math ? 
      programProgress.requirements.math.length : 0;
    
    const scienceCompleted = programProgress.requirements.science ? 
      programProgress.requirements.science.filter(c => c.status === 'completed').length : 0;
    const scienceTotal = programProgress.requirements.science ? 
      programProgress.requirements.science.length : 0;
    
    let context = `DEGREE PROGRESS FOR ${programProgress.program ? programProgress.program.toUpperCase() : 'PROGRAM'}:\n`;
    context += `- Core Requirements: ${coreCompleted}/${coreTotal} completed\n`;
    
    if (mathTotal > 0) context += `- Math Requirements: ${mathCompleted}/${mathTotal} completed\n`;
    if (scienceTotal > 0) context += `- Science Requirements: ${scienceCompleted}/${scienceTotal} completed\n`;
    
    context += `- Total Credits Required: ${programProgress.totalCreditsRequired || 'N/A'}\n\n`;
    
    context += `PENDING REQUIREMENTS:\n`;
    context += this.listPendingRequirements(programProgress);
    
    context += `\nRECOMMENDATION PRIORITIES:\n`;
    context += `1. Complete missing core courses\n`;
    if (mathTotal > 0) context += `2. Fulfill math requirements\n`;
    if (scienceTotal > 0) context += `3. Fulfill science requirements\n`;
    context += `4. Earn sufficient elective credits`;
    
    return context;
  }

  static listPendingRequirements(programProgress) {
    // NOTE:
    // - This lists ONLY courses that are ACTUALLY pending in the student's program
    // - Uses REAL data from programProgress, not hardcoded examples
    
    const pending = [];
    
    // Core courses from ACTUAL program data
    if (programProgress.requirements && programProgress.requirements.core) {
      programProgress.requirements.core.forEach(course => {
        if (course.status !== 'completed') {
          pending.push(`- ${course.code}: ${course.title || 'Course Title'} (Min grade: ${course.minGrade || 'N/A'})`);
        }
      });
    }
    
    // Math courses from ACTUAL program data
    if (programProgress.requirements && programProgress.requirements.math) {
      programProgress.requirements.math.forEach(course => {
        if (course.status !== 'completed') {
          pending.push(`- ${course.code}: ${course.title || 'Course Title'} (Min grade: ${course.minGrade || 'N/A'})`);
        }
      });
    }
    
    // Science courses from ACTUAL program data
    if (programProgress.requirements && programProgress.requirements.science) {
      programProgress.requirements.science.forEach(course => {
        if (course.status !== 'completed') {
          pending.push(`- ${course.code}: ${course.title || 'Course Title'} (Min grade: ${course.minGrade || 'N/A'})`);
        }
      });
    }

    // Electives from ACTUAL program data
    if (programProgress.requirements && programProgress.requirements.electives) {
      const electives = programProgress.requirements.electives;
      
      if (electives.csElectives) {
        electives.csElectives.forEach(course => {
          if (course.status !== 'completed') {
            pending.push(`- ${course.code}: ${course.title || 'CS Elective'} (Min grade: ${course.minGrade || 'N/A'})`);
          }
        });
      }

      if (electives.freeElectives) {
        electives.freeElectives.forEach(course => {
          if (course.status !== 'completed') {
            pending.push(`- ${course.code}: ${course.title || 'Free Elective'} (Min grade: ${course.minGrade || 'N/A'})`);
          }
        });
      }
    }
    
    return pending.length > 0 ? pending.join('\n') : 'All requirements completed!';
  }

  static buildUserPrompt(transcript, programProgress, userQuery) {
    // NOTE:
    // - This prompt structure works with ANY university's requirements
    // - No hardcoded course examples - just tells the AI how to use the context
    
    return `STUDENT QUERY: ${userQuery}

ADVISORY TASK: Provide specific, actionable advice based on the student's academic record and program requirements.

ANSWER STRUCTURE:
1. State whether the student meets any relevant prerequisites
2. List specific courses that address the query (ONLY FROM THE STUDENT'S ACTUAL PROGRAM)
3. Explain why each course is recommended with reference to their transcript
4. Note any concerns or alternatives based on their actual progress
5. Provide next steps if additional information is needed`;
  }

  /**
   * Enhanced context fusion with prerequisite checking
   * Uses ACTUAL prerequisite data from knowledge base
   */
  static async fuseContextWithPrerequisites(transcript, program, userQuery, requestedCourses = []) {
    const baseContext = await this.fuseContext(transcript, program, userQuery);
    
    if (requestedCourses.length === 0) {
      return baseContext;
    }

    try {
      // Check prerequisites for specific requested courses using REAL data
      const coursePrereqs = [];
      for (const courseCode of requestedCourses) {
        const meetsPrereqs = await DegreeRequirements.checkCoursePrerequisites(
          courseCode, 
          transcript
        );
        const courseDetails = await DegreeRequirements.getCourseDetails(courseCode);
        
        coursePrereqs.push({
          courseCode,
          meetsPrerequisites: meetsPrereqs,
          courseDetails
        });
      }

      // Add prerequisite information to system prompt
      let prereqContext = '\n\nPREREQUISITE ANALYSIS FOR REQUESTED COURSES:\n';
      coursePrereqs.forEach(course => {
        prereqContext += `- ${course.courseCode}: Prerequisites ${course.meetsPrerequisites ? 'MET' : 'NOT MET'}\n`;
        if (course.courseDetails && course.courseDetails.prerequisites) {
          prereqContext += `  Required: ${course.courseDetails.prerequisites.map(p => p.code).join(', ')}\n`;
        }
      });

      return {
        systemPrompt: baseContext.systemPrompt + prereqContext,
        userPrompt: baseContext.userPrompt
      };
    } catch (error) {
      console.error('Error in enhanced context fusion:', error);
      return baseContext;
    }
  }

  /**
   * EDGE CASE HANDLER: User has profile but no transcript
   * Provides personalized advice based on profile information and program requirements
   */
  static async fuseContextWithProfileOnly(userProfile, userQuery, program) {
    try {
      // Try to get program requirements if program is known
      let programContext = '';
      if (program) {
        const programRequirements = await DegreeRequirements.getRequirementsForProgram(program);
        if (programRequirements) {
          programContext = `\n\nPROGRAM REQUIREMENTS FOR ${program.toUpperCase()}:
${this.buildProgramRequirementsSummary(programRequirements)}`;
        }
      }

      const systemPrompt = `You are Boiler AI, Purdue University's academic advisor. 
        You're helping a student who has created a profile but hasn't uploaded their transcript yet.
        
        STUDENT PROFILE:
        - Name: ${userProfile.name || 'Student'}
        - Major: ${userProfile.major || program || 'Not specified'}
        - Year: ${userProfile.currentYear || 'Not specified'}
        - Expected Graduation: ${userProfile.expectedGraduationYear || 'Not specified'}
        - Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
        - Goals: ${userProfile.academicGoals?.join(', ') || 'Not specified'}
        ${programContext}
        
        GUIDANCE APPROACH:
        1. Provide advice based on their major and year level
        2. Reference general program requirements where applicable
        3. Suggest typical course progressions for their level
        4. Encourage transcript upload for more specific recommendations
        5. Ask clarifying questions about their current progress when helpful`;

      const userPrompt = `STUDENT QUERY: ${userQuery}

ADVISORY TASK: Provide helpful academic advice based on the student's profile information.
Since I don't have their transcript, ask relevant questions about their current progress
and provide guidance based on typical degree pathways for their major and year level.`;

      return { systemPrompt, userPrompt };
    } catch (error) {
      console.error('Error in profile-only context fusion:', error);
      // Fallback to basic profile context
      return {
        systemPrompt: `You are Boiler AI, helping a ${userProfile?.major || 'Purdue'} student. 
          Provide general academic advice based on their major: ${userProfile?.major || 'Unknown'}.`,
        userPrompt: userQuery
      };
    }
  }

  /**
   * EDGE CASE HANDLER: Have transcript but program is unknown
   * Uses transcript data but provides general degree guidance
   */
  static async fuseContextWithUnknownProgram(transcript, userQuery) {
    const systemPrompt = `You are Boiler AI, Purdue University's academic advisor.
      I have the student's transcript data but couldn't determine their specific program.
      
      STUDENT ACADEMIC RECORD:
      - Name: ${transcript.studentInfo?.name || 'Student'}
      - Cumulative GPA: ${transcript.gpaSummary?.cumulativeGPA?.toFixed(2) || 'N/A'}
      - Total Credits Earned: ${transcript.gpaSummary?.totalCreditsEarned || 'N/A'}
      
      COMPLETED COURSES:
      ${this.buildCoursesList(transcript.courses?.filter(c => c.status === 'completed') || [])}
      
      IN-PROGRESS COURSES:
      ${this.buildCoursesList(transcript.courses?.filter(c => c.status === 'in-progress') || [])}
      
      GUIDANCE APPROACH:
      1. Use their completed courses to infer their likely major
      2. Provide advice based on their academic record
      3. Ask about their intended major for more specific guidance
      4. Suggest courses that build on their completed coursework`;

    const userPrompt = `STUDENT QUERY: ${userQuery}

ADVISORY TASK: Based on the student's completed courses, provide academic guidance.
Ask about their major if relevant, and make recommendations based on their academic progress.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * EDGE CASE HANDLER: Have transcript but no course data
   * Handles cases where transcript upload failed to extract course information
   */
  static async fuseContextWithEmptyTranscript(transcript, program, userQuery) {
    const systemPrompt = `You are Boiler AI, Purdue University's academic advisor.
      The student uploaded a transcript but I couldn't extract their course information.
      
      AVAILABLE INFORMATION:
      - Name: ${transcript.studentInfo?.name || 'Student'}
      - Program: ${transcript.studentInfo?.program || program || 'Unknown'}
      - GPA: ${transcript.gpaSummary?.cumulativeGPA?.toFixed(2) || 'N/A'}
      
      GUIDANCE APPROACH:
      1. Acknowledge the transcript processing limitation
      2. Ask them to describe their current academic progress
      3. Provide general guidance for their program
      4. Suggest re-uploading transcript or manually providing course information`;

    const userPrompt = `STUDENT QUERY: ${userQuery}

NOTE: I received your transcript but had trouble reading the course information.
Could you tell me about your current academic progress, or try re-uploading your transcript?
In the meantime, I'll provide general guidance for your program.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Helper: Build a summary of program requirements
   */
  static buildProgramRequirementsSummary(programRequirements) {
    if (!programRequirements || !programRequirements.requirements) {
      return 'Program requirements not available in knowledge base.';
    }

    const summary = [];
    const reqs = programRequirements.requirements;

    if (reqs.core?.length > 0) {
      summary.push(`Core Courses (${reqs.core.length} required): ${reqs.core.map(c => c.code).join(', ')}`);
    }

    if (reqs.math?.length > 0) {
      summary.push(`Math Requirements (${reqs.math.length} required): ${reqs.math.map(c => c.code).join(', ')}`);
    }

    if (reqs.science?.length > 0) {
      summary.push(`Science Requirements (${reqs.science.length} required): ${reqs.science.map(c => c.code).join(', ')}`);
    }

    return summary.join('\n') || 'Detailed requirements not available.';
  }

  /**
   * Helper: Build a formatted list of courses
   */
  static buildCoursesList(courses) {
    if (!courses || courses.length === 0) {
      return 'None';
    }

    return courses.map(course => 
      `- ${course.courseCode}: ${course.title} ${course.grade ? `(Grade: ${course.grade})` : ''}`
    ).join('\n');
  }

  /**
   * Context fusion for course recommendations
   * Includes information about course scheduling and availability
   */
  static async fuseContextForRecommendations(transcript, program, userQuery, targetSemester = null) {
    const baseContext = await this.fuseContext(transcript, program, userQuery);
    
    try {
      // Add semester planning context if target semester provided
      if (targetSemester) {
        const semesterContext = `\n\nTARGET SEMESTER: ${targetSemester}
When recommending courses, consider:
1. Typical course offerings for ${targetSemester}
2. Course sequencing and prerequisites
3. Workload balance for the semester
4. Any scheduling conflicts that might exist`;

        return {
          systemPrompt: baseContext.systemPrompt + semesterContext,
          userPrompt: baseContext.userPrompt
        };
      }

      return baseContext;
    } catch (error) {
      console.error('Error in recommendation context fusion:', error);
      return baseContext;
    }
  }

  /**
   * VALIDATION: Sanitize user input to prevent injection attacks
   */
  static sanitizeUserInput(input) {
    if (typeof input !== 'string' || !input) {
      return '';
    }
    
    // Remove potentially dangerous characters and limit length
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit to 1000 characters
  }

  /**
   * VALIDATION: Validate transcript data structure and completeness
   */
  static validateTranscriptData(transcript) {
    if (!transcript || typeof transcript !== 'object') {
      return null;
    }

    // Check for required structure
    if (!transcript.studentInfo && !transcript.gpaSummary && !transcript.courses) {
      console.warn('Invalid transcript structure - missing required sections');
      return null;
    }

    // Validate student info
    if (transcript.studentInfo) {
      if (typeof transcript.studentInfo !== 'object') {
        console.warn('Invalid transcript: studentInfo is not an object');
        return null;
      }
    }

    // Validate courses array
    if (transcript.courses && !Array.isArray(transcript.courses)) {
      console.warn('Invalid transcript: courses is not an array');
      return null;
    }

    // Validate GPA summary
    if (transcript.gpaSummary) {
      if (typeof transcript.gpaSummary !== 'object') {
        console.warn('Invalid transcript: gpaSummary is not an object');
        return null;
      }
      
      // Check for reasonable GPA values
      const gpa = transcript.gpaSummary.cumulativeGPA;
      if (gpa !== undefined && (typeof gpa !== 'number' || gpa < 0 || gpa > 4.3)) {
        console.warn('Invalid transcript: unrealistic GPA value', { gpa });
        // Don't reject entirely, just log warning
      }
    }

    return transcript;
  }

  /**
   * VALIDATION: Validate and normalize program name
   */
  static validateProgramName(program) {
    if (typeof program !== 'string' || !program) {
      return null;
    }

    // Sanitize program name
    const sanitized = program
      .replace(/[<>]/g, '')
      .trim()
      .substring(0, 100);

    if (sanitized.length === 0) {
      return null;
    }

    // Check for suspicious content
    if (/javascript:|<script|on\w+=/i.test(sanitized)) {
      console.warn('Suspicious program name detected', { program: sanitized });
      return null;
    }

    return sanitized;
  }

  /**
   * VALIDATION: Validate user profile data
   */
  static validateUserProfile(userProfile) {
    if (!userProfile || typeof userProfile !== 'object') {
      return null;
    }

    const validated = {};

    // Validate and sanitize name
    if (userProfile.name && typeof userProfile.name === 'string') {
      validated.name = this.sanitizeUserInput(userProfile.name).substring(0, 50);
    }

    // Validate major
    if (userProfile.major && typeof userProfile.major === 'string') {
      validated.major = this.sanitizeUserInput(userProfile.major).substring(0, 50);
    }

    // Validate year (should be reasonable academic year)
    if (userProfile.currentYear && typeof userProfile.currentYear === 'string') {
      const year = userProfile.currentYear.toLowerCase();
      if (['freshman', 'sophomore', 'junior', 'senior', '1st year', '2nd year', '3rd year', '4th year'].includes(year)) {
        validated.currentYear = year;
      }
    }

    // Validate graduation year (should be reasonable future year)
    if (userProfile.expectedGraduationYear) {
      const gradYear = parseInt(userProfile.expectedGraduationYear);
      const currentYear = new Date().getFullYear();
      if (gradYear >= currentYear && gradYear <= currentYear + 10) {
        validated.expectedGraduationYear = gradYear;
      }
    }

    // Validate arrays (interests, goals)
    if (Array.isArray(userProfile.interests)) {
      validated.interests = userProfile.interests
        .filter(i => typeof i === 'string')
        .map(i => this.sanitizeUserInput(i).substring(0, 50))
        .filter(i => i.length > 0)
        .slice(0, 10); // Limit to 10 interests
    }

    if (Array.isArray(userProfile.academicGoals)) {
      validated.academicGoals = userProfile.academicGoals
        .filter(g => typeof g === 'string')
        .map(g => this.sanitizeUserInput(g).substring(0, 100))
        .filter(g => g.length > 0)
        .slice(0, 10); // Limit to 10 goals
    }

    return Object.keys(validated).length > 0 ? validated : null;
  }

  /**
   * ERROR RECOVERY: Create safe fallback context when all else fails
   */
  static createSafeFallbackContext(userQuery, error) {
    console.error('Context fusion failed completely, using safe fallback', { error: error.message });
    
    const sanitizedQuery = this.sanitizeUserInput(userQuery);
    
    return {
      systemPrompt: `You are Boiler AI, Purdue University's academic advisor.
        There was a technical issue accessing student or program information.
        Provide general academic guidance based on Purdue University policies.
        If you cannot provide specific advice, recommend contacting an academic advisor directly.`,
      userPrompt: `STUDENT QUERY (Limited Context): ${sanitizedQuery}
        
        NOTE: Due to a technical limitation, I don't have access to your specific academic information right now.
        I'll provide general guidance, but for personalized advice, please consider visiting your academic advisor.`
    };
  }

  /**
   * VALIDATION: Validate knowledge base response data
   */
  static validateKnowledgeBaseResponse(response, operation) {
    if (!response) {
      console.warn(`Knowledge base returned null/undefined for operation: ${operation}`);
      return null;
    }

    // Basic structure validation for program requirements
    if (operation === 'program' && response.requirements) {
      if (typeof response.requirements !== 'object') {
        console.warn('Invalid program requirements structure from knowledge base');
        return null;
      }
    }

    // Basic validation for course information
    if (operation === 'course' && response.courseCode) {
      if (typeof response.courseCode !== 'string') {
        console.warn('Invalid course information structure from knowledge base');
        return null;
      }
    }

    return response;
  }
}

module.exports = ContextFusionService;