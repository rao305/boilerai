/**
 * Repository for degree requirements that connects to your ACTUAL knowledge base
 * NOTE:
 * - This does NOT store any course data itself
 * - It's just an interface to your EXISTING knowledge base
 * - All data comes from your knowledgeRetrievalService
 */
class DegreeRequirementsRepository {
  constructor() {
    // NOTE:
    // - This service already exists in your system
    // - Do NOT create a new service - use the existing one
    this.knowledgeService = require('./knowledgeRetrievalService');
  }

  /**
   * Get all available programs from your ACTUAL knowledge base
   * NOTE:
   * - Your knowledge base already has this data
   * - Just call the existing method that retrieves program list
   */
  async getAllPrograms() {
    try {
      // NOTE: 
      // - REPLACE with your actual knowledge base call
      // - Example: return this.knowledgeService.getAllPrograms();
      return await this.knowledgeService.getAllPrograms();
    } catch (error) {
      console.error('Failed to get programs:', error);
      return [];
    }
  }

  /**
   * Get requirements for a specific program
   * NOTE:
   * - This uses your EXISTING knowledge base data
   * - No hardcoded program structures
   */
  async getProgramRequirements(programName) {
    try {
      // NOTE:
      // - Your knowledge base already has program structures
      // - Example: return this.knowledgeService.getProgramStructure(programName);
      return await this.knowledgeService.getProgramStructure(programName);
    } catch (error) {
      console.error(`Failed to get requirements for ${programName}:`, error);
      return null;
    }
  }

  /**
   * Get course information from your ACTUAL knowledge base
   * NOTE:
   * - This is CRITICAL - uses real course data
   * - Do NOT hardcode course details
   */
  async getCourseInfo(courseCode) {
    try {
      // NOTE:
      // - Your knowledge base already has course information
      // - Example: return this.knowledgeService.getCourseInformation([courseCode]);
      const courseInfo = await this.knowledgeService.getCourseInformation([courseCode]);
      return courseInfo ? courseInfo[0] : null;
    } catch (error) {
      console.error(`Failed to get course info for ${courseCode}:`, error);
      return null;
    }
  }

  /**
   * Get multiple courses information in batch
   * NOTE: Optimizes API calls by batching course lookups
   */
  async getCourseInfoBatch(courseCodes) {
    try {
      if (!courseCodes || courseCodes.length === 0) return [];
      
      const courseInfoArray = await this.knowledgeService.getCourseInformation(courseCodes);
      return courseInfoArray || [];
    } catch (error) {
      console.error(`Failed to get course info batch for ${courseCodes.join(', ')}:`, error);
      return [];
    }
  }

  /**
   * Check if a course is valid in the current catalog
   * NOTE:
   * - Uses your ACTUAL course catalog
   * - No hardcoded validation
   */
  async isValidCourse(courseCode) {
    const courseInfo = await this.getCourseInfo(courseCode);
    return !!courseInfo;
  }

  /**
   * Get prerequisite information for a course
   * NOTE: Uses your ACTUAL prerequisite mappings
   */
  async getCoursePrerequisites(courseCode) {
    try {
      const courseInfo = await this.getCourseInfo(courseCode);
      return courseInfo?.prerequisites || [];
    } catch (error) {
      console.error(`Failed to get prerequisites for ${courseCode}:`, error);
      return [];
    }
  }

  /**
   * Search courses by criteria (department, level, keywords)
   * NOTE: Searches your ACTUAL course catalog
   */
  async searchCourses(criteria) {
    try {
      // This would use your knowledge base's search functionality
      // Example: return this.knowledgeService.searchCourses(criteria);
      
      // For now, we can implement basic filtering if search isn't available
      if (criteria.department) {
        // Get all courses and filter by department
        // This is a placeholder - ideally your knowledge service has direct search
        const allCourses = await this.knowledgeService.getAllCourses();
        return allCourses.filter(course => 
          course.code && course.code.startsWith(criteria.department.toUpperCase())
        );
      }
      
      return [];
    } catch (error) {
      console.error('Failed to search courses:', error);
      return [];
    }
  }

  /**
   * Get course scheduling information
   * NOTE: If your knowledge base has scheduling data
   */
  async getCourseSchedule(courseCode, semester = null, year = null) {
    try {
      // This would query scheduling information from your knowledge base
      // Example: return this.knowledgeService.getCourseSchedule(courseCode, semester, year);
      
      const courseInfo = await this.getCourseInfo(courseCode);
      return {
        courseCode,
        available: !!courseInfo,
        schedulingInfo: courseInfo?.scheduling || null,
        semester,
        year
      };
    } catch (error) {
      console.error(`Failed to get schedule for ${courseCode}:`, error);
      return null;
    }
  }

  /**
   * Get program completion statistics
   * NOTE: If your knowledge base tracks completion data
   */
  async getProgramCompletionRequirements(programName) {
    try {
      const programReqs = await this.getProgramRequirements(programName);
      
      if (!programReqs) return null;

      // Calculate completion requirements
      const coreCredits = programReqs.requirements?.core?.reduce((sum, course) => 
        sum + (course.credits || 0), 0) || 0;
      
      const mathCredits = programReqs.requirements?.math?.reduce((sum, course) => 
        sum + (course.credits || 0), 0) || 0;
      
      const scienceCredits = programReqs.requirements?.science?.reduce((sum, course) => 
        sum + (course.credits || 0), 0) || 0;

      const electiveCredits = programReqs.requirements?.electives ? 
        Object.values(programReqs.requirements.electives).reduce((sum, electiveGroup) => {
          if (Array.isArray(electiveGroup)) {
            return sum + electiveGroup.reduce((subSum, course) => subSum + (course.credits || 0), 0);
          }
          return sum;
        }, 0) : 0;

      return {
        program: programName,
        totalCreditsRequired: programReqs.totalCreditsRequired || 120,
        breakdown: {
          core: coreCredits,
          math: mathCredits,
          science: scienceCredits,
          electives: electiveCredits
        },
        minimumGPA: programReqs.minimumGPA || 2.0,
        residencyRequirement: programReqs.residencyRequirement || 'Standard Purdue residency requirements'
      };
    } catch (error) {
      console.error(`Failed to get completion requirements for ${programName}:`, error);
      return null;
    }
  }

  /**
   * Validate transcript data against program requirements
   * NOTE: Comprehensive validation using ACTUAL program data
   */
  async validateTranscriptProgress(transcript, programName) {
    try {
      const programReqs = await this.getProgramRequirements(programName);
      if (!programReqs) return null;

      const validation = {
        program: programName,
        studentName: transcript.studentInfo?.name,
        validationDate: new Date().toISOString(),
        issues: [],
        warnings: [],
        completedRequirements: [],
        pendingRequirements: []
      };

      // Validate completed courses against program requirements
      const allRequirements = [
        ...(programReqs.requirements?.core || []),
        ...(programReqs.requirements?.math || []),
        ...(programReqs.requirements?.science || [])
      ];

      for (const requirement of allRequirements) {
        const completedCourse = transcript.completedCourses?.find(course => 
          course.courseCode.toUpperCase() === requirement.code.toUpperCase()
        );

        if (completedCourse) {
          validation.completedRequirements.push({
            code: requirement.code,
            title: requirement.title,
            grade: completedCourse.grade,
            credits: completedCourse.credits,
            status: 'completed'
          });

          // Check grade requirements
          if (requirement.minGrade) {
            const meetsGrade = this.gradeComparison(completedCourse.grade, requirement.minGrade);
            if (!meetsGrade) {
              validation.issues.push({
                type: 'grade_requirement',
                course: requirement.code,
                required: requirement.minGrade,
                actual: completedCourse.grade,
                message: `${requirement.code} requires minimum grade of ${requirement.minGrade}, but student earned ${completedCourse.grade}`
              });
            }
          }
        } else {
          validation.pendingRequirements.push({
            code: requirement.code,
            title: requirement.title,
            credits: requirement.credits,
            status: 'pending'
          });
        }
      }

      return validation;
    } catch (error) {
      console.error(`Failed to validate transcript for ${programName}:`, error);
      return null;
    }
  }

  /**
   * Helper method for grade comparison
   */
  gradeComparison(studentGrade, requiredGrade) {
    const gradeValues = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0,
      'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0
    };

    const studentValue = gradeValues[studentGrade] || 0;
    const requiredValue = gradeValues[requiredGrade] || 0;

    return studentValue >= requiredValue;
  }

  /**
   * Get program tracks/concentrations if available
   * NOTE: Some programs have multiple tracks (like CS Machine Intelligence vs Software Engineering)
   */
  async getProgramTracks(programName) {
    try {
      const programReqs = await this.getProgramRequirements(programName);
      
      if (!programReqs) return [];

      // Extract tracks if they exist in the program structure
      const tracks = programReqs.tracks || [];
      
      return tracks.map(track => ({
        name: track.name,
        description: track.description || '',
        additionalRequirements: track.requirements || [],
        recommendedElectives: track.electives || []
      }));
    } catch (error) {
      console.error(`Failed to get tracks for ${programName}:`, error);
      return [];
    }
  }
}

// Export a singleton instance
module.exports = new DegreeRequirementsRepository();