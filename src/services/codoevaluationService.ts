/**
 * CODO (Change of Degree Objective) Evaluation Service
 * Evaluates Computer Science CODO eligibility from transcript data
 */

interface CODORequirement {
  courseOptions: string[];
  requiredGrade: string;
  requirementName: string;
  creditsInfo: string;
}

interface CODOEvaluation {
  eligible: boolean;
  overallGpa: number;
  purdueCredits: number;
  requirementsMet: Record<string, boolean>;
  missingRequirements: string[];
  gradeDeficiencies: string[];
  recommendations: string[];
  confidence: number;
  competitiveScore?: number;
  competitiveness?: string;
}

export class CODOEvaluationService {
  private codoRequirements: Record<string, CODORequirement>;
  private gradePoints: Record<string, number>;

  constructor() {
    this.codoRequirements = this.initializeCODORequirements();
    this.gradePoints = this.initializeGradeScale();
  }

  private initializeCODORequirements(): Record<string, CODORequirement> {
    return {
      cs_programming: {
        courseOptions: ["CS18000"],
        requiredGrade: "B",
        requirementName: "Problem Solving and Object-Oriented Programming",
        creditsInfo: "4.00 credits"
      },
      calculus_requirement: {
        courseOptions: [
          "MA16100", "MA16500",  // Calc I options
          "MA16200", "MA16600",  // Calc II options
          "MA26100", "MA27101",  // Multivariate options
          "MA26500", "MA35100"   // Linear Algebra options
        ],
        requiredGrade: "B", 
        requirementName: "Calculus Mathematics (any level)",
        creditsInfo: "3-5 credits depending on course"
      }
    };
  }

  private initializeGradeScale(): Record<string, number> {
    return {
      "A+": 4.0, "A": 4.0, "A-": 3.7,
      "B+": 3.3, "B": 3.0, "B-": 2.7,
      "C+": 2.3, "C": 2.0, "C-": 1.7,
      "D+": 1.3, "D": 1.0, "D-": 0.7,
      "F": 0.0, "W": 0.0, "WU": 0.0
    };
  }

  async evaluateEligibility(transcriptData: any): Promise<CODOEvaluation> {
    try {
      const courses = transcriptData?.courses || transcriptData?.parsed_courses || [];
      
      // Calculate GPA and credits
      const gpaInfo = this.calculateGpaAndCredits(courses);
      
      // Check course requirements
      const requirementsAnalysis = this.evaluateCourseRequirements(courses);
      
      // Determine eligibility
      const eligible = this.determineEligibility(gpaInfo, requirementsAnalysis);
      
      // Calculate competitive standing
      const competitiveAnalysis = this.calculateCompetitiveStanding(courses, gpaInfo);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        eligible, 
        gpaInfo, 
        requirementsAnalysis, 
        competitiveAnalysis
      );

      return {
        eligible,
        overallGpa: gpaInfo.overallGpa,
        purdueCredits: gpaInfo.purdueCredits,
        requirementsMet: requirementsAnalysis.requirementsMet,
        missingRequirements: requirementsAnalysis.missingRequirements,
        gradeDeficiencies: requirementsAnalysis.gradeDeficiencies,
        recommendations,
        confidence: this.calculateConfidence(gpaInfo, requirementsAnalysis),
        competitiveScore: competitiveAnalysis.score,
        competitiveness: competitiveAnalysis.level
      };

    } catch (error) {
      console.error('CODO evaluation error:', error);
      return {
        eligible: false,
        overallGpa: 0,
        purdueCredits: 0,
        requirementsMet: {},
        missingRequirements: ["Evaluation error occurred"],
        gradeDeficiencies: [],
        recommendations: ["Please contact academic advisor for manual review"],
        confidence: 0
      };
    }
  }

  private calculateGpaAndCredits(courses: any[]): any {
    let totalPoints = 0;
    let totalCredits = 0;
    let purdueCredits = 0;
    const courseGrades: Record<string, string> = {};

    courses.forEach(course => {
      const courseCode = course.course_code || course.courseCode || '';
      const grade = course.grade || '';
      const credits = course.credits || 0;
      const institution = (course.institution || '').toLowerCase();

      courseGrades[courseCode] = grade;

      // Only count Purdue courses for GPA
      if (institution.includes('purdue') || !institution) {
        if (credits && grade in this.gradePoints) {
          const gradePoints = this.gradePoints[grade];
          totalPoints += gradePoints * credits;
          totalCredits += credits;
          purdueCredits += credits;
        }
      }
    });

    const overallGpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return {
      overallGpa: Math.round(overallGpa * 1000) / 1000,
      totalCredits,
      purdueCredits,
      courseGrades,
      meetsGpaRequirement: overallGpa >= 2.75,
      meetsCreditRequirement: purdueCredits >= 12
    };
  }

  private evaluateCourseRequirements(courses: any[]): any {
    const courseGrades: Record<string, string> = {};
    courses.forEach(course => {
      const courseCode = course.course_code || course.courseCode || '';
      const grade = course.grade || '';
      courseGrades[courseCode] = grade;
    });

    const requirementsMet: Record<string, boolean> = {};
    const missingRequirements: string[] = [];
    const gradeDeficiencies: string[] = [];

    Object.entries(this.codoRequirements).forEach(([reqKey, requirement]) => {
      const { met, deficiency } = this.checkSingleRequirement(requirement, courseGrades);
      requirementsMet[reqKey] = met;

      if (!met) {
        missingRequirements.push(requirement.requirementName);
        if (deficiency) {
          gradeDeficiencies.push(deficiency);
        }
      }
    });

    return {
      requirementsMet,
      missingRequirements,
      gradeDeficiencies
    };
  }

  private checkSingleRequirement(requirement: CODORequirement, courseGrades: Record<string, string>): { met: boolean; deficiency?: string } {
    const requiredGradeValue = this.gradePoints[requirement.requiredGrade] || 3.0;

    for (const courseOption of requirement.courseOptions) {
      if (courseOption in courseGrades) {
        const studentGrade = courseGrades[courseOption];
        const studentGradeValue = this.gradePoints[studentGrade] || 0;

        if (studentGradeValue >= requiredGradeValue) {
          return { met: true };
        } else {
          return { 
            met: false, 
            deficiency: `${courseOption}: ${studentGrade} (need ${requirement.requiredGrade} or better)` 
          };
        }
      }
    }

    return { met: false };
  }

  private calculateCompetitiveStanding(courses: any[], gpaInfo: any): { score: number; level: string } {
    const courseGrades = gpaInfo.courseGrades;
    
    // CS18000 performance (40% weight)
    const cs18000Grade = courseGrades["CS18000"] || "F";
    const cs18000Value = this.gradePoints[cs18000Grade] || 0;
    const cs18000Score = (cs18000Value / 4.0) * 40;

    // Best math performance (30% weight)
    const mathCourses = this.codoRequirements.calculus_requirement.courseOptions;
    let bestMathGrade = 0;
    mathCourses.forEach(course => {
      if (courseGrades[course]) {
        const gradeValue = this.gradePoints[courseGrades[course]] || 0;
        bestMathGrade = Math.max(bestMathGrade, gradeValue);
      }
    });
    const mathScore = (bestMathGrade / 4.0) * 30;

    // Overall GPA (30% weight)
    const gpaScore = (Math.min(gpaInfo.overallGpa, 4.0) / 4.0) * 30;

    const totalScore = Math.round(cs18000Score + mathScore + gpaScore);
    
    let level: string;
    if (totalScore >= 85) level = "highly_competitive";
    else if (totalScore >= 75) level = "competitive";  
    else if (totalScore >= 65) level = "moderately_competitive";
    else level = "minimally_competitive";

    return { score: totalScore, level };
  }

  private determineEligibility(gpaInfo: any, requirementsAnalysis: any): boolean {
    return gpaInfo.meetsGpaRequirement && 
           gpaInfo.meetsCreditRequirement && 
           Object.values(requirementsAnalysis.requirementsMet).every(Boolean);
  }

  private generateRecommendations(eligible: boolean, gpaInfo: any, requirementsAnalysis: any, competitiveAnalysis: any): string[] {
    const recommendations: string[] = [];

    if (eligible) {
      recommendations.push(
        "✅ You meet the basic CODO requirements for Computer Science!",
        `📊 Competitive Score: ${competitiveAnalysis.score}/100 (${competitiveAnalysis.level})`,
        "",
        "🎯 Next Steps:",
        "• Submit CODO application during next application period",
        "• Note: Space is extremely limited (space-available basis)",
        "• Priority given to highest grades in CS18000, Calculus, and GPA"
      );
    } else {
      recommendations.push(
        "❌ Current transcript doesn't meet CODO requirements",
        "",
        "📋 Action items:"
      );

      if (!gpaInfo.meetsGpaRequirement) {
        recommendations.push(`📈 Raise overall GPA to 2.75 (current: ${gpaInfo.overallGpa.toFixed(2)})`);
      }

      if (!gpaInfo.meetsCreditRequirement) {
        recommendations.push(`📚 Complete ${12 - gpaInfo.purdueCredits} more Purdue credit hours`);
      }

      requirementsAnalysis.gradeDeficiencies.forEach((deficiency: string) => {
        recommendations.push(`📖 ${deficiency}`);
      });

      requirementsAnalysis.missingRequirements.forEach((missing: string) => {
        recommendations.push(`➕ Complete: ${missing}`);
      });
    }

    return recommendations;
  }

  private calculateConfidence(gpaInfo: any, requirementsAnalysis: any): number {
    let confidence = 0.9;
    
    if (gpaInfo.totalCredits < 12) confidence -= 0.2;
    if (requirementsAnalysis.gradeDeficiencies.length > 2) confidence -= 0.1;
    
    return Math.max(0.1, confidence);
  }

  // Public method for general CODO information
  getCODORequirements(): any {
    return {
      generalRequirements: {
        minimumSemesters: 1,
        minimumPurdueCredits: 12,
        minimumGpa: 2.75,
        academicStanding: "Good standing (not on academic notice)"
      },
      courseRequirements: {
        cs18000: "CS 18000 - Problem Solving and Object-Oriented Programming (B or better)",
        mathematics: "One math course: Calc I/II, Multivariate Calc, or Linear Algebra (B or better)"
      },
      importantNotes: [
        "Admission is SPACE AVAILABLE BASIS ONLY - extremely limited spots",
        "Priority given to students with strongest grades in CS 18000, Calculus, and overall GPA",
        "All CS and Math courses must be taken for letter grade at Purdue campus",
        "Only first or second attempt of required courses considered"
      ]
    };
  }
}

export const codoEvaluationService = new CODOEvaluationService();