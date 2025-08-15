import { Course } from '../types/transcript';

export interface StudentProfile {
  gpa: {
    overall: number;
    major: number;
  };
  courses: Course[];
  academicStrengths: string[];
  academicWeaknesses: string[];
  majorProgress: {
    completed: Course[];
    remaining: string[];
    completionPercentage: number;
  };
  performanceMetrics: {
    averageGradesBySubject: Record<string, number>;
    creditHours: {
      total: number;
      completed: number;
      inProgress: number;
    };
    yearLevel: string;
  };
}

export interface AIContextData {
  studentProfile: StudentProfile;
  contextPrompt: string;
  enhancementLevel: 'basic' | 'advanced' | 'comprehensive';
}

class TranscriptContextService {
  private static instance: TranscriptContextService;
  private contextCache: Map<string, AIContextData> = new Map();

  static getInstance(): TranscriptContextService {
    if (!TranscriptContextService.instance) {
      TranscriptContextService.instance = new TranscriptContextService();
    }
    return TranscriptContextService.instance;
  }

  async generateStudentProfile(courses: Course[]): Promise<StudentProfile> {
    const completedCourses = courses.filter(course => 
      course.grade && !['W', 'I', 'IP'].includes(course.grade)
    );

    const gpaCalculation = this.calculateGPA(completedCourses);
    const performanceAnalysis = this.analyzePerformance(completedCourses);
    const academicInsights = this.generateAcademicInsights(completedCourses);

    return {
      gpa: gpaCalculation,
      courses: completedCourses,
      academicStrengths: academicInsights.strengths,
      academicWeaknesses: academicInsights.weaknesses,
      majorProgress: await this.analyzeMajorProgress(completedCourses),
      performanceMetrics: performanceAnalysis
    };
  }

  private calculateGPA(courses: Course[]): { overall: number; major: number } {
    const gradePoints: Record<string, number> = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };

    let totalPoints = 0;
    let totalCredits = 0;
    let majorPoints = 0;
    let majorCredits = 0;

    courses.forEach(course => {
      if (course.grade && gradePoints[course.grade] !== undefined) {
        const points = gradePoints[course.grade] * course.creditHours;
        totalPoints += points;
        totalCredits += course.creditHours;

        // Major courses (CS, MATH, ENGR, etc.)
        if (this.isMajorCourse(course.subject)) {
          majorPoints += points;
          majorCredits += course.creditHours;
        }
      }
    });

    return {
      overall: totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0,
      major: majorCredits > 0 ? Math.round((majorPoints / majorCredits) * 100) / 100 : 0
    };
  }

  private isMajorCourse(subject: string): boolean {
    const majorSubjects = [
      'CS', 'CSE', 'ECE', 'ENGR', 'MATH', 'STAT', 
      'PHYS', 'CHEM', 'BIOL', 'IE', 'ME', 'CE', 'AAE'
    ];
    return majorSubjects.includes(subject.toUpperCase());
  }

  private analyzePerformance(courses: Course[]): StudentProfile['performanceMetrics'] {
    const subjectGrades: Record<string, number[]> = {};
    let totalCredits = 0;
    let completedCredits = 0;

    courses.forEach(course => {
      if (!subjectGrades[course.subject]) {
        subjectGrades[course.subject] = [];
      }

      if (course.grade && course.grade !== 'W') {
        const gradePoint = this.getGradePoint(course.grade);
        if (gradePoint >= 0) {
          subjectGrades[course.subject].push(gradePoint);
          completedCredits += course.creditHours;
        }
      }
      totalCredits += course.creditHours;
    });

    const averageGradesBySubject: Record<string, number> = {};
    Object.entries(subjectGrades).forEach(([subject, grades]) => {
      if (grades.length > 0) {
        averageGradesBySubject[subject] = 
          Math.round((grades.reduce((sum, grade) => sum + grade, 0) / grades.length) * 100) / 100;
      }
    });

    return {
      averageGradesBySubject,
      creditHours: {
        total: totalCredits,
        completed: completedCredits,
        inProgress: totalCredits - completedCredits
      },
      yearLevel: this.determineYearLevel(completedCredits)
    };
  }

  private getGradePoint(grade: string): number {
    const gradePoints: Record<string, number> = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    return gradePoints[grade] ?? -1;
  }

  private determineYearLevel(creditHours: number): string {
    if (creditHours < 30) return 'Freshman';
    if (creditHours < 60) return 'Sophomore';
    if (creditHours < 90) return 'Junior';
    return 'Senior';
  }

  private generateAcademicInsights(courses: Course[]): { strengths: string[]; weaknesses: string[] } {
    const subjectPerformance: Record<string, { avg: number; count: number }> = {};
    
    courses.forEach(course => {
      if (course.grade && course.grade !== 'W') {
        const gradePoint = this.getGradePoint(course.grade);
        if (gradePoint >= 0) {
          if (!subjectPerformance[course.subject]) {
            subjectPerformance[course.subject] = { avg: 0, count: 0 };
          }
          subjectPerformance[course.subject].avg += gradePoint;
          subjectPerformance[course.subject].count += 1;
        }
      }
    });

    // Calculate averages
    Object.keys(subjectPerformance).forEach(subject => {
      subjectPerformance[subject].avg /= subjectPerformance[subject].count;
    });

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    Object.entries(subjectPerformance).forEach(([subject, perf]) => {
      if (perf.count >= 2) { // Only consider subjects with 2+ courses
        if (perf.avg >= 3.5) {
          strengths.push(`${subject} (${perf.avg.toFixed(2)} avg)`);
        } else if (perf.avg <= 2.5) {
          weaknesses.push(`${subject} (${perf.avg.toFixed(2)} avg)`);
        }
      }
    });

    return { strengths, weaknesses };
  }

  private async analyzeMajorProgress(courses: Course[]): Promise<StudentProfile['majorProgress']> {
    const completed = courses.filter(course => 
      course.grade && !['W', 'I', 'IP', 'F'].includes(course.grade)
    );

    // This would ideally connect to a curriculum database
    const remaining = this.estimateRemainingCourses(completed);
    const completionPercentage = this.calculateCompletionPercentage(completed);

    return {
      completed,
      remaining,
      completionPercentage
    };
  }

  private estimateRemainingCourses(completed: Course[]): string[] {
    // This is a simplified estimation - in production, this would use curriculum data
    const majorCourses = completed.filter(course => this.isMajorCourse(course.subject));
    const totalMajorCredits = majorCourses.reduce((sum, course) => sum + course.creditHours, 0);
    
    if (totalMajorCredits < 40) {
      return ['Advanced major courses', 'Capstone project', 'Electives'];
    } else if (totalMajorCredits < 60) {
      return ['Capstone project', 'Advanced electives'];
    } else {
      return ['Final capstone requirements'];
    }
  }

  private calculateCompletionPercentage(completed: Course[]): number {
    const totalCredits = completed.reduce((sum, course) => sum + course.creditHours, 0);
    return Math.min(Math.round((totalCredits / 120) * 100), 100); // Assuming 120 credits for graduation
  }

  async generateAIContext(courses: Course[], enhancementLevel: 'basic' | 'advanced' | 'comprehensive' = 'comprehensive'): Promise<AIContextData> {
    const studentProfile = await this.generateStudentProfile(courses);
    const contextPrompt = this.buildContextPrompt(studentProfile, enhancementLevel);

    const contextData: AIContextData = {
      studentProfile,
      contextPrompt,
      enhancementLevel
    };

    // Cache for performance
    this.contextCache.set('current_student', contextData);
    
    return contextData;
  }

  private buildContextPrompt(profile: StudentProfile, level: string): string {
    const baseContext = `
STUDENT ACADEMIC PROFILE:
- Overall GPA: ${profile.gpa.overall}
- Major GPA: ${profile.gpa.major}
- Year Level: ${profile.performanceMetrics.yearLevel}
- Total Credits: ${profile.performanceMetrics.creditHours.completed}/${profile.performanceMetrics.creditHours.total}
- Completion: ${profile.majorProgress.completionPercentage}%

ACADEMIC STRENGTHS:
${profile.academicStrengths.map(strength => `- ${strength}`).join('\n')}

AREAS FOR IMPROVEMENT:
${profile.academicWeaknesses.map(weakness => `- ${weakness}`).join('\n')}

COURSES COMPLETED:
${profile.courses.slice(0, 20).map(course => 
  `- ${course.subject} ${course.number}: ${course.title} (${course.grade}, ${course.creditHours} credits)`
).join('\n')}
${profile.courses.length > 20 ? `... and ${profile.courses.length - 20} more courses` : ''}

SUBJECT PERFORMANCE:
${Object.entries(profile.performanceMetrics.averageGradesBySubject).map(([subject, avg]) => 
  `- ${subject}: ${avg} average`
).join('\n')}
    `;

    if (level === 'comprehensive') {
      return `${baseContext}

CONTEXT AWARENESS INSTRUCTIONS:
You are an intelligent academic advisor with full knowledge of this student's academic history. Use this information to:

1. PERSONALIZED ADVISING: Provide advice based on their actual performance in specific courses and subjects
2. CODO EVALUATION: When asked about major changes, evaluate their transcript against requirements
3. CONTEXTUAL AWARENESS: 
   - Stay on topic when discussing academics
   - Smoothly transition between topics based on user queries
   - Remember this context across our entire conversation
   - Reference specific courses and grades when relevant
4. CONTINUOUS IMPROVEMENT: Learn from each interaction to provide better advice
5. SMART RECOMMENDATIONS: Base suggestions on their strengths and areas for improvement

Always maintain this context while also being able to discuss general topics. When academic topics come up, leverage this student-specific knowledge for highly personalized and accurate advice.`;
    }

    return baseContext;
  }

  async evaluateCODOEligibility(courses: Course[], targetMajor: string): Promise<{
    eligible: boolean;
    requirements: Record<string, { met: boolean; details: string }>;
    recommendations: string[];
  }> {
    // This would integrate with actual CODO requirements
    const analysis = {
      eligible: false,
      requirements: {} as Record<string, { met: boolean; details: string }>,
      recommendations: [] as string[]
    };

    // Example for Computer Science CODO
    if (targetMajor.toLowerCase().includes('computer science')) {
      const mathCourses = courses.filter(c => c.subject === 'MA' || c.subject === 'MATH');
      const csCourses = courses.filter(c => c.subject === 'CS');
      const gpaCalc = this.calculateGPA(courses);

      analysis.requirements = {
        'GPA Requirement': {
          met: gpaCalc.overall >= 3.0,
          details: `Overall GPA: ${gpaCalc.overall} (requires 3.0+)`
        },
        'Math Prerequisites': {
          met: mathCourses.some(c => c.number >= '161'),
          details: `Completed: ${mathCourses.map(c => `${c.subject} ${c.number}`).join(', ')}`
        },
        'CS Prerequisites': {
          met: csCourses.some(c => c.number >= '180'),
          details: `Completed: ${csCourses.map(c => `${c.subject} ${c.number} (${c.grade})`).join(', ')}`
        }
      };

      analysis.eligible = Object.values(analysis.requirements).every(req => req.met);

      if (!analysis.eligible) {
        analysis.recommendations = [
          'Focus on improving overall GPA above 3.0',
          'Complete prerequisite mathematics courses',
          'Consider retaking CS courses with grades below B-',
          'Meet with CS academic advisor for personalized plan'
        ];
      }
    }

    return analysis;
  }

  getCachedContext(): AIContextData | null {
    return this.contextCache.get('current_student') || null;
  }

  clearCache(): void {
    this.contextCache.clear();
  }
}

export default TranscriptContextService.getInstance();