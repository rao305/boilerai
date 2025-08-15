import transcriptContextService, { StudentProfile } from './transcriptContextService';
import { openaiChatService } from './openaiChatService';

interface CODORequirement {
  name: string;
  description: string;
  met: boolean;
  details: string;
  courses?: string[];
  gpaRequired?: number;
  actualGpa?: number;
}

interface CODOEvaluation {
  targetMajor: string;
  eligible: boolean;
  overallScore: number;
  requirements: CODORequirement[];
  recommendations: string[];
  timeline: string;
  alternativeOptions?: string[];
  nextSteps: string[];
}

interface CODOMajorRequirements {
  [major: string]: {
    name: string;
    requirements: {
      gpa: { overall?: number; prerequisite?: number; math?: number };
      courses: {
        required: string[];
        oneOf?: string[][];
        minimumGrade?: string;
      };
      credits: { minimum?: number; inMajor?: number };
      other?: string[];
    };
    additionalInfo?: string;
  };
}

class CODOEvaluationService {
  private majorRequirements: CODOMajorRequirements = {
    'computer-science': {
      name: 'Computer Science',
      requirements: {
        gpa: { overall: 3.0, prerequisite: 2.5 },
        courses: {
          required: ['MA 161', 'MA 162', 'CS 180'],
          oneOf: [['PHYS 172', 'PHYS 152'], ['CHEM 115', 'CHEM 116']],
          minimumGrade: 'C'
        },
        credits: { minimum: 30 }
      },
      additionalInfo: 'Strong performance in math and programming courses is essential'
    },
    'computer-engineering': {
      name: 'Computer Engineering',
      requirements: {
        gpa: { overall: 2.8, math: 3.0 },
        courses: {
          required: ['MA 161', 'MA 162', 'PHYS 172', 'ECE 264'],
          minimumGrade: 'C-'
        },
        credits: { minimum: 30 }
      }
    },
    'data-science': {
      name: 'Data Science',
      requirements: {
        gpa: { overall: 3.2, math: 3.0 },
        courses: {
          required: ['MA 161', 'MA 162', 'STAT 301', 'CS 180'],
          oneOf: [['MA 265', 'MA 266']],
          minimumGrade: 'B-'
        },
        credits: { minimum: 32 }
      }
    },
    'engineering': {
      name: 'Engineering (First Year)',
      requirements: {
        gpa: { overall: 2.5, math: 2.5 },
        courses: {
          required: ['MA 161', 'PHYS 172', 'ENGR 131'],
          minimumGrade: 'C'
        },
        credits: { minimum: 30 }
      }
    },
    'business': {
      name: 'Business',
      requirements: {
        gpa: { overall: 3.0 },
        courses: {
          required: ['MA 161', 'ECON 251', 'ECON 252'],
          minimumGrade: 'C'
        },
        credits: { minimum: 30 }
      }
    },
    'mathematics': {
      name: 'Mathematics',
      requirements: {
        gpa: { overall: 3.0, math: 3.2 },
        courses: {
          required: ['MA 161', 'MA 162', 'MA 261', 'MA 265'],
          minimumGrade: 'C'
        },
        credits: { minimum: 30 }
      }
    }
  };

  async evaluateCODOEligibility(studentProfile: StudentProfile, targetMajor: string): Promise<CODOEvaluation> {
    const majorKey = this.normalizeMajorName(targetMajor);
    const majorData = this.majorRequirements[majorKey];

    if (!majorData) {
      return this.handleUnknownMajor(targetMajor, studentProfile);
    }

    const requirements = await this.evaluateRequirements(studentProfile, majorData);
    const eligible = requirements.every(req => req.met);
    const overallScore = this.calculateOverallScore(requirements);

    const recommendations = await this.generateRecommendations(studentProfile, majorData, requirements);
    const timeline = this.estimateTimeline(requirements, studentProfile);
    const nextSteps = this.generateNextSteps(requirements, majorData);

    return {
      targetMajor: majorData.name,
      eligible,
      overallScore,
      requirements,
      recommendations,
      timeline,
      nextSteps,
      alternativeOptions: eligible ? undefined : await this.suggestAlternatives(studentProfile, targetMajor)
    };
  }

  private normalizeMajorName(majorName: string): string {
    const normalized = majorName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    // Handle common variations
    const variations: { [key: string]: string } = {
      'cs': 'computer-science',
      'comp-sci': 'computer-science',
      'computer-sci': 'computer-science',
      'compeng': 'computer-engineering',
      'comp-eng': 'computer-engineering',
      'cmpeng': 'computer-engineering',
      'datascience': 'data-science',
      'data-sci': 'data-science',
      'ds': 'data-science',
      'engr': 'engineering',
      'eng': 'engineering',
      'biz': 'business',
      'mgmt': 'business',
      'math': 'mathematics',
      'maths': 'mathematics'
    };

    return variations[normalized] || normalized;
  }

  private async evaluateRequirements(studentProfile: StudentProfile, majorData: any): Promise<CODORequirement[]> {
    const requirements: CODORequirement[] = [];
    const { gpa, courses, credits } = majorData.requirements;

    // GPA Requirements
    if (gpa.overall) {
      requirements.push({
        name: 'Overall GPA',
        description: `Minimum overall GPA of ${gpa.overall}`,
        met: studentProfile.gpa.overall >= gpa.overall,
        details: `Your GPA: ${studentProfile.gpa.overall} (Required: ${gpa.overall})`,
        actualGpa: studentProfile.gpa.overall,
        gpaRequired: gpa.overall
      });
    }

    if (gpa.math) {
      const mathGpa = this.calculateSubjectGPA(studentProfile, ['MA', 'MATH']);
      requirements.push({
        name: 'Math GPA',
        description: `Minimum math GPA of ${gpa.math}`,
        met: mathGpa >= gpa.math,
        details: `Your Math GPA: ${mathGpa} (Required: ${gpa.math})`,
        actualGpa: mathGpa,
        gpaRequired: gpa.math
      });
    }

    // Course Requirements
    if (courses.required) {
      for (const courseCode of courses.required) {
        const courseTaken = this.findCourse(studentProfile, courseCode);
        const gradeMet = courseTaken ? this.gradeMetRequirement(courseTaken.grade, courses.minimumGrade || 'D') : false;

        requirements.push({
          name: `Course: ${courseCode}`,
          description: `Required course with minimum grade ${courses.minimumGrade || 'D'}`,
          met: courseTaken !== null && gradeMet,
          details: courseTaken 
            ? `Completed with grade: ${courseTaken.grade} ${gradeMet ? '✓' : `(Need ${courses.minimumGrade || 'D'}+)`}`
            : 'Course not completed',
          courses: [courseCode]
        });
      }
    }

    // One-of course requirements
    if (courses.oneOf) {
      for (let i = 0; i < courses.oneOf.length; i++) {
        const optionGroup = courses.oneOf[i];
        const completedFromGroup = optionGroup.find(code => {
          const course = this.findCourse(studentProfile, code);
          return course && this.gradeMetRequirement(course.grade, courses.minimumGrade || 'D');
        });

        requirements.push({
          name: `Course Option Group ${i + 1}`,
          description: `Complete one of: ${optionGroup.join(', ')}`,
          met: !!completedFromGroup,
          details: completedFromGroup 
            ? `Completed: ${completedFromGroup}`
            : `Need to complete one of: ${optionGroup.join(', ')}`,
          courses: optionGroup
        });
      }
    }

    // Credit Requirements
    if (credits.minimum) {
      requirements.push({
        name: 'Minimum Credits',
        description: `At least ${credits.minimum} credit hours`,
        met: studentProfile.performanceMetrics.creditHours.completed >= credits.minimum,
        details: `Completed: ${studentProfile.performanceMetrics.creditHours.completed}/${credits.minimum} credits`
      });
    }

    return requirements;
  }

  private calculateSubjectGPA(studentProfile: StudentProfile, subjects: string[]): number {
    const relevantCourses = studentProfile.courses.filter(course => 
      subjects.some(subject => course.subject === subject)
    );

    if (relevantCourses.length === 0) return 0;

    const totalPoints = relevantCourses.reduce((sum, course) => {
      const gradePoints = this.getGradePoints(course.grade);
      return sum + (gradePoints * course.creditHours);
    }, 0);

    const totalCredits = relevantCourses.reduce((sum, course) => sum + course.creditHours, 0);
    return Math.round((totalPoints / totalCredits) * 100) / 100;
  }

  private findCourse(studentProfile: StudentProfile, courseCode: string): any {
    return studentProfile.courses.find(course => {
      const fullCode = `${course.subject} ${course.number}`;
      return fullCode === courseCode || 
             courseCode.includes(fullCode) ||
             fullCode.includes(courseCode);
    });
  }

  private gradeMetRequirement(actualGrade: string, requiredGrade: string): boolean {
    const gradeValues: { [grade: string]: number } = {
      'A+': 12, 'A': 12, 'A-': 11,
      'B+': 10, 'B': 9, 'B-': 8,
      'C+': 7, 'C': 6, 'C-': 5,
      'D+': 4, 'D': 3, 'D-': 2,
      'F': 0
    };

    return (gradeValues[actualGrade] || 0) >= (gradeValues[requiredGrade] || 0);
  }

  private getGradePoints(grade: string): number {
    const gradePoints: { [grade: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    return gradePoints[grade] || 0;
  }

  private calculateOverallScore(requirements: CODORequirement[]): number {
    const totalRequirements = requirements.length;
    const metRequirements = requirements.filter(req => req.met).length;
    return Math.round((metRequirements / totalRequirements) * 100);
  }

  private async generateRecommendations(studentProfile: StudentProfile, majorData: any, requirements: CODORequirement[]): Promise<string[]> {
    const unmetRequirements = requirements.filter(req => !req.met);
    const recommendations: string[] = [];

    for (const req of unmetRequirements) {
      if (req.name.includes('GPA')) {
        const gpaGap = req.gpaRequired! - req.actualGpa!;
        if (gpaGap > 0.5) {
          recommendations.push(`Focus on improving grades - need to raise GPA by ${gpaGap.toFixed(2)} points`);
        } else {
          recommendations.push(`Take high-credit courses where you can excel to boost GPA`);
        }
      }

      if (req.name.includes('Course')) {
        if (req.courses && req.courses.length === 1) {
          recommendations.push(`Enroll in ${req.courses[0]} - priority requirement`);
        } else if (req.courses && req.courses.length > 1) {
          recommendations.push(`Choose one course from: ${req.courses.join(', ')}`);
        }
      }

      if (req.name.includes('Credits')) {
        const creditGap = parseInt(req.details.match(/(\d+)\/(\d+)/)?.[2] || '0') - 
                         parseInt(req.details.match(/(\d+)\/(\d+)/)?.[1] || '0');
        recommendations.push(`Complete ${creditGap} more credit hours before applying`);
      }
    }

    // Use AI to generate personalized recommendations
    try {
      const context = `Student Profile: ${JSON.stringify({
        gpa: studentProfile.gpa,
        strengths: studentProfile.academicStrengths,
        weaknesses: studentProfile.academicWeaknesses,
        unmetRequirements: unmetRequirements.map(r => ({ name: r.name, details: r.details }))
      })}`;

      const aiRecommendations = await this.generateAIRecommendations(context, majorData.name);
      recommendations.push(...aiRecommendations);
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
    }

    return recommendations.slice(0, 6); // Limit to 6 recommendations
  }

  private async generateAIRecommendations(context: string, targetMajor: string): Promise<string[]> {
    try {
      const prompt = `Based on this student profile and CODO evaluation, provide 3 specific, actionable recommendations:

${context}

Target Major: ${targetMajor}

Generate personalized recommendations focusing on:
1. Immediate actionable steps
2. Timeline optimization 
3. Academic strategy

Return as JSON array: ["recommendation 1", "recommendation 2", "recommendation 3"]`;

      const response = await openaiChatService.sendMessage(prompt, 'codo-evaluation');
      const recommendations = JSON.parse(response);
      return Array.isArray(recommendations) ? recommendations : [];
    } catch (error) {
      return [];
    }
  }

  private estimateTimeline(requirements: CODORequirement[], studentProfile: StudentProfile): string {
    const unmetRequirements = requirements.filter(req => !req.met);
    const unmetCourses = unmetRequirements.filter(req => req.name.includes('Course')).length;
    
    if (unmetRequirements.length === 0) {
      return 'Ready to apply immediately';
    }

    const semestersNeeded = Math.ceil(unmetCourses / 4); // Assume 4 courses per semester
    const gpaImprovement = unmetRequirements.some(req => req.name.includes('GPA'));

    if (gpaImprovement && semestersNeeded < 2) {
      return `${Math.max(2, semestersNeeded)} semesters (time needed for GPA improvement)`;
    }

    return `${semestersNeeded} semester${semestersNeeded > 1 ? 's' : ''}`;
  }

  private generateNextSteps(requirements: CODORequirement[], majorData: any): string[] {
    const unmetRequirements = requirements.filter(req => !req.met);
    const nextSteps: string[] = [];

    if (unmetRequirements.length === 0) {
      nextSteps.push('Submit CODO application through myPurdue');
      nextSteps.push('Meet with academic advisor to discuss transition plan');
      nextSteps.push('Prepare for potential major-specific entrance interview');
      return nextSteps;
    }

    // Prioritize course enrollment
    const courseRequirements = unmetRequirements.filter(req => req.name.includes('Course'));
    if (courseRequirements.length > 0) {
      nextSteps.push('Enroll in missing prerequisite courses for next semester');
    }

    // GPA improvement
    const gpaRequirements = unmetRequirements.filter(req => req.name.includes('GPA'));
    if (gpaRequirements.length > 0) {
      nextSteps.push('Focus on improving grades in current and future courses');
      nextSteps.push('Consider retaking courses with low grades if allowed');
    }

    nextSteps.push('Meet with advisor in target major for detailed planning');
    nextSteps.push('Monitor progress each semester and reassess eligibility');

    return nextSteps;
  }

  private async suggestAlternatives(studentProfile: StudentProfile, targetMajor: string): Promise<string[]> {
    // Logic to suggest similar majors based on student's strengths and current progress
    const alternatives: string[] = [];
    
    if (targetMajor.toLowerCase().includes('computer')) {
      alternatives.push('Information Technology', 'Data Science', 'Cybersecurity');
    } else if (targetMajor.toLowerCase().includes('engineering')) {
      alternatives.push('Engineering Technology', 'Computer Science', 'Physics');
    } else if (targetMajor.toLowerCase().includes('business')) {
      alternatives.push('Economics', 'Management', 'Marketing');
    }

    return alternatives.filter(alt => alt !== targetMajor).slice(0, 3);
  }

  private async handleUnknownMajor(targetMajor: string, studentProfile: StudentProfile): Promise<CODOEvaluation> {
    // For unknown majors, use AI to provide general guidance
    try {
      const aiResponse = await openaiChatService.sendMessage(
        `Provide CODO requirements and evaluation for ${targetMajor} at Purdue University. Student has ${studentProfile.gpa.overall} GPA and ${studentProfile.performanceMetrics.creditHours.completed} credits.`,
        'codo-evaluation-unknown'
      );

      return {
        targetMajor: targetMajor,
        eligible: false,
        overallScore: 0,
        requirements: [{
          name: 'Unknown Major Requirements',
          description: `Requirements for ${targetMajor}`,
          met: false,
          details: 'Please consult with academic advisor for specific requirements'
        }],
        recommendations: [
          'Contact the department directly for specific CODO requirements',
          'Meet with an academic advisor',
          'Research the major\'s prerequisite courses'
        ],
        timeline: 'Timeline depends on specific requirements',
        nextSteps: ['Contact target department', 'Schedule advisor meeting'],
        alternativeOptions: []
      };
    } catch (error) {
      return this.getGenericEvaluation(targetMajor);
    }
  }

  private getGenericEvaluation(targetMajor: string): CODOEvaluation {
    return {
      targetMajor,
      eligible: false,
      overallScore: 0,
      requirements: [],
      recommendations: ['Contact academic advisor for specific requirements'],
      timeline: 'Unknown - consult advisor',
      nextSteps: ['Meet with academic advisor'],
      alternativeOptions: []
    };
  }

  // Helper method to get all supported majors
  getSupportedMajors(): string[] {
    return Object.values(this.majorRequirements).map(major => major.name);
  }

  // Quick eligibility check without full evaluation
  async quickEligibilityCheck(studentProfile: StudentProfile, targetMajor: string): Promise<{ eligible: boolean; primaryIssues: string[] }> {
    const evaluation = await this.evaluateCODOEligibility(studentProfile, targetMajor);
    const primaryIssues = evaluation.requirements
      .filter(req => !req.met)
      .slice(0, 3)
      .map(req => req.name);

    return {
      eligible: evaluation.eligible,
      primaryIssues
    };
  }
}

export const codoevaluationService = new CODOEvaluationService();
export default codoevaluationService;