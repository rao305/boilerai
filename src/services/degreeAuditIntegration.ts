/**
 * Degree Audit Integration Service
 * 
 * This service integrates transcript data with degree audit requirements
 * to provide real-time graduation prediction and academic progression tracking.
 */

export interface ParsedCourse {
  id: string;
  subject: string;
  courseNumber: string;
  courseCode: string;
  courseTitle: string;
  level: string;
  credits: number;
  grade: string;
  gradePoints: number;
  qualityPoints: number;
  semester: string;
  year: number;
  status: 'completed' | 'in_progress' | 'withdrawn';
  repeatIndicator?: 'R' | 'I' | 'E' | null;
  matchStatus: 'verified' | 'probable' | 'unrecognized';
  matchConfidence: number;
  verified: boolean;
  purdueCourseMatch?: string;
  classification?: 'foundation' | 'math_requirement' | 'general_education' | 'elective' | 'unclassified';
}

export interface TranscriptData {
  studentInfo: {
    name: string;
    studentId: string;
    program: string;
    college: string;
    campus: string;
  };
  completedCourses: {
    [semesterKey: string]: {
      semester: string;
      year: number;
      academicStanding: string;
      courses: ParsedCourse[];
      semesterGpa: number;
      semesterCredits: number;
    };
  };
  coursesInProgress: ParsedCourse[];
  gpaSummary: {
    cumulativeGPA: number;
    totalCreditsAttempted: number;
    totalCreditsEarned: number;
    totalQualityPoints: number;
    majorGPA: number;
  };
  uploadDate: Date;
  verificationStatus: 'pending' | 'verified' | 'needs_review';
}

export interface DegreeRequirement {
  category: string;
  description: string;
  icon: any;
  completed: number;
  total: number;
  percentage: number;
  status: string;
  creditHours: { completed: number; total: number };
  courses: Array<{
    code: string;
    title: string;
    status: 'completed' | 'in-progress' | 'planned' | 'not-taken';
    grade?: string | null;
    credits: number;
    semester?: string;
    year?: number;
  }>;
}

export interface GraduationPrediction {
  expectedGraduation: {
    semester: 'Fall' | 'Spring' | 'Summer';
    year: number;
    dateString: string;
  };
  remainingCredits: number;
  remainingCourses: number;
  completionPercentage: number;
  onTrack: boolean;
  warnings: string[];
  recommendations: string[];
  projectedGPA: number;
  semestersRemaining: number;
}

export interface AcademicProgression {
  currentSemester: string;
  totalCreditsCompleted: number;
  totalCreditsRequired: number;
  creditProgressPercentage: number;
  courseProgressPercentage: number;
  majorGPA: number;
  cumulativeGPA: number;
  academicStanding: string;
  yearLevel: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
  graduationPrediction: GraduationPrediction;
}

// Course classification mappings for Purdue CS degree
const COURSE_MAPPINGS = {
  // Foundation Courses
  'CS 18000': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 18200': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 24000': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 25000': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 25100': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 25200': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 30700': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 34800': { category: 'Core Computer Science', classification: 'foundation', required: true },
  'CS 38100': { category: 'Core Computer Science', classification: 'foundation', required: true },

  // Mathematics Requirements
  'MA 16100': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true, equivalent: ['MA 16500'] },
  'MA 16200': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true, equivalent: ['MA 16600'] },
  'MA 16500': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true, equivalent: ['MA 16100'] },
  'MA 16600': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true, equivalent: ['MA 16200'] },
  'MA 26100': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true },
  'MA 26500': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true },
  'MA 26600': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true },
  'STAT 35000': { category: 'Mathematics Foundation', classification: 'math_requirement', required: true },

  // Science Requirements
  'PHYS 17200': { category: 'Science Requirements', classification: 'science_requirement', required: true },
  'PHYS 24100': { category: 'Science Requirements', classification: 'science_requirement', required: true },
  'CHEM 11500': { category: 'Science Requirements', classification: 'science_requirement', required: false },
  'BIOL 11000': { category: 'Science Requirements', classification: 'science_requirement', required: false },

  // General Education (UCC)
  'ENGL 10600': { category: 'University Core Curriculum', classification: 'general_education', required: true },
  'ENGL 42000': { category: 'University Core Curriculum', classification: 'general_education', required: false },
  'COM 11400': { category: 'University Core Curriculum', classification: 'general_education', required: true },
  'SCLA 10100': { category: 'University Core Curriculum', classification: 'general_education', required: true },
  'SCLA 10200': { category: 'University Core Curriculum', classification: 'general_education', required: true },

  // Machine Intelligence Concentration
  'CS 37300': { category: 'Machine Intelligence Concentration', classification: 'concentration', required: false },
  'CS 47100': { category: 'Machine Intelligence Concentration', classification: 'concentration', required: false },
  'CS 49000': { category: 'Machine Intelligence Concentration', classification: 'concentration', required: false },
  'STAT 41600': { category: 'Machine Intelligence Concentration', classification: 'concentration', required: false },

  // Technical Electives
  'CS 33400': { category: 'Technical Electives', classification: 'technical_elective', required: false },
  'CS 39000': { category: 'Technical Electives', classification: 'technical_elective', required: false },
  'CS 42200': { category: 'Technical Electives', classification: 'technical_elective', required: false },
  'CS 42600': { category: 'Technical Electives', classification: 'technical_elective', required: false },
  'CS 45600': { category: 'Technical Electives', classification: 'technical_elective', required: false },
  'CS 47300': { category: 'Technical Electives', classification: 'technical_elective', required: false },
  'CS 49700': { category: 'Technical Electives', classification: 'technical_elective', required: false },
};

// Credit hour requirements for Purdue CS degree
const DEGREE_REQUIREMENTS = {
  totalCreditsRequired: 128,
  categories: {
    'Core Computer Science': { required: 48, courses: 12 },
    'Mathematics Foundation': { required: 18, courses: 6 },
    'Science Requirements': { required: 8, courses: 2 },
    'University Core Curriculum': { required: 32, courses: 8 },
    'Machine Intelligence Concentration': { required: 18, courses: 6 },
    'Technical Electives': { required: 18, courses: 6 },
    'Free Electives': { required: 18, courses: 6 }
  }
};

/**
 * Maps transcript courses to degree audit requirements
 */
export function mapTranscriptToRequirements(
  transcriptData: TranscriptData,
  degreeRequirements: DegreeRequirement[]
): DegreeRequirement[] {
  console.log('🔄 Mapping transcript data to degree requirements...');
  
  if (!transcriptData || !transcriptData.completedCourses) {
    console.warn('⚠️ No transcript data available for mapping');
    return degreeRequirements;
  }

  // Flatten all completed courses
  const allCompletedCourses: ParsedCourse[] = Object.values(transcriptData.completedCourses)
    .flatMap(semester => semester.courses);
  
  // Add in-progress courses
  const allCourses = [...allCompletedCourses, ...transcriptData.coursesInProgress];
  
  console.log(`📚 Processing ${allCourses.length} courses from transcript`);

  // Create a map of updated requirements
  const updatedRequirements = degreeRequirements.map(requirement => {
    const updatedCourses = requirement.courses.map(reqCourse => {
      // Find matching course in transcript
      const transcriptMatch = allCourses.find(transcriptCourse => {
        const normalizedTranscriptCode = transcriptCourse.courseCode.replace(/\s+/g, ' ').trim();
        const normalizedReqCode = reqCourse.code.replace(/\s+/g, ' ').trim();
        
        // Direct match
        if (normalizedTranscriptCode === normalizedReqCode) {
          return true;
        }
        
        // Check for equivalent courses
        const mapping = COURSE_MAPPINGS[normalizedReqCode];
        if (mapping && mapping.equivalent) {
          return mapping.equivalent.some(equiv => 
            normalizedTranscriptCode === equiv.replace(/\s+/g, ' ').trim()
          );
        }
        
        return false;
      });

      if (transcriptMatch) {
        return {
          ...reqCourse,
          status: transcriptMatch.status === 'completed' ? 'completed' : 
                  transcriptMatch.status === 'in_progress' ? 'in-progress' : reqCourse.status,
          grade: transcriptMatch.grade || reqCourse.grade,
          semester: transcriptMatch.semester,
          year: transcriptMatch.year
        };
      }
      
      return reqCourse;
    });

    // Calculate updated statistics
    const completedCount = updatedCourses.filter(course => course.status === 'completed').length;
    const inProgressCount = updatedCourses.filter(course => course.status === 'in-progress').length;
    const totalCount = updatedCourses.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const completedCredits = updatedCourses
      .filter(course => course.status === 'completed')
      .reduce((sum, course) => sum + course.credits, 0);
    
    const status = percentage === 100 ? 'completed' : 
                  inProgressCount > 0 ? 'in-progress' : 'not-started';

    return {
      ...requirement,
      courses: updatedCourses,
      completed: completedCount,
      percentage,
      status,
      creditHours: {
        ...requirement.creditHours,
        completed: completedCredits
      }
    };
  });

  console.log('✅ Transcript mapping completed');
  return updatedRequirements;
}

/**
 * Calculates graduation prediction based on current progress
 */
export function calculateGraduationPrediction(
  transcriptData: TranscriptData,
  degreeRequirements: DegreeRequirement[],
  plannedCourses: any = {}
): GraduationPrediction {
  console.log('🎓 Calculating graduation prediction...');
  
  // Calculate current progress
  const totalCreditsCompleted = Object.values(transcriptData.completedCourses)
    .reduce((sum, semester) => sum + semester.semesterCredits, 0);
  
  const totalCreditsInProgress = transcriptData.coursesInProgress
    .reduce((sum, course) => sum + course.credits, 0);
  
  const currentCredits = totalCreditsCompleted + totalCreditsInProgress;
  const remainingCredits = Math.max(0, DEGREE_REQUIREMENTS.totalCreditsRequired - currentCredits);
  
  // Calculate remaining courses needed
  const completedCourses = degreeRequirements.reduce((sum, req) => sum + req.completed, 0);
  const totalRequiredCourses = degreeRequirements.reduce((sum, req) => sum + req.total, 0);
  const remainingCourses = Math.max(0, totalRequiredCourses - completedCourses);
  
  // Calculate completion percentage
  const completionPercentage = Math.round((currentCredits / DEGREE_REQUIREMENTS.totalCreditsRequired) * 100);
  
  // Estimate semesters remaining (assuming 15 credits per semester)
  const avgCreditsPerSemester = 15;
  const semestersRemaining = Math.ceil(remainingCredits / avgCreditsPerSemester);
  
  // Calculate expected graduation date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Determine current semester
  let semesterOffset = 0;
  if (currentMonth >= 8) { // Fall semester
    semesterOffset = 0;
  } else if (currentMonth >= 1) { // Spring semester
    semesterOffset = 1;
  } else { // Summer semester
    semesterOffset = 2;
  }
  
  const totalSemestersToAdd = semestersRemaining;
  const graduationSemesterIndex = (semesterOffset + totalSemestersToAdd) % 3;
  const graduationYear = currentYear + Math.floor((semesterOffset + totalSemestersToAdd) / 3);
  
  const semesters = ['Fall', 'Spring', 'Summer'] as const;
  const graduationSemester = semesters[graduationSemesterIndex];
  
  // Create graduation date string
  const semesterMonths = {
    'Fall': 'December',
    'Spring': 'May',
    'Summer': 'August'
  };
  const graduationDateString = `${semesterMonths[graduationSemester]} ${graduationYear}`;
  
  // Check if on track
  const expectedCreditsPerYear = 30; // 15 credits per semester, 2 semesters per year
  const yearsInProgram = Math.max(1, currentYear - 2023); // Assuming started in 2023
  const expectedCredits = yearsInProgram * expectedCreditsPerYear;
  const onTrack = currentCredits >= expectedCredits * 0.9; // 90% threshold
  
  // Generate warnings and recommendations
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (transcriptData.gpaSummary.cumulativeGPA < 2.0) {
    warnings.push('Cumulative GPA below 2.0 - academic probation risk');
    recommendations.push('Meet with academic advisor to discuss GPA improvement strategies');
  }
  
  if (remainingCredits > 60) {
    warnings.push('More than 60 credits remaining - may need additional semesters');
    recommendations.push('Consider summer courses to accelerate graduation timeline');
  }
  
  if (!onTrack) {
    warnings.push('Behind expected progress for degree completion');
    recommendations.push('Schedule meeting with academic advisor to review graduation plan');
  }
  
  // Check for missing prerequisites
  const missingPrereqs = checkMissingPrerequisites(transcriptData, degreeRequirements);
  if (missingPrereqs.length > 0) {
    warnings.push(`Missing prerequisites: ${missingPrereqs.join(', ')}`);
    recommendations.push('Complete missing prerequisites before enrolling in advanced courses');
  }
  
  // Projected GPA calculation
  const projectedGPA = calculateProjectedGPA(transcriptData, remainingCredits);
  
  console.log(`🎯 Graduation prediction: ${graduationDateString}, ${remainingCredits} credits remaining`);
  
  return {
    expectedGraduation: {
      semester: graduationSemester,
      year: graduationYear,
      dateString: graduationDateString
    },
    remainingCredits,
    remainingCourses,
    completionPercentage,
    onTrack,
    warnings,
    recommendations,
    projectedGPA,
    semestersRemaining
  };
}

/**
 * Tracks academic progression over time
 */
export function trackAcademicProgression(transcriptData: TranscriptData): AcademicProgression {
  console.log('📈 Tracking academic progression...');
  
  const totalCreditsCompleted = Object.values(transcriptData.completedCourses)
    .reduce((sum, semester) => sum + semester.semesterCredits, 0);
  
  const creditProgressPercentage = Math.round((totalCreditsCompleted / DEGREE_REQUIREMENTS.totalCreditsRequired) * 100);
  
  // Determine year level based on credits
  let yearLevel: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
  if (totalCreditsCompleted < 30) yearLevel = 'Freshman';
  else if (totalCreditsCompleted < 60) yearLevel = 'Sophomore';
  else if (totalCreditsCompleted < 90) yearLevel = 'Junior';
  else yearLevel = 'Senior';
  
  // Get current semester
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  let currentSemester: string;
  if (currentMonth >= 8) currentSemester = `Fall ${currentYear}`;
  else if (currentMonth >= 1) currentSemester = `Spring ${currentYear}`;
  else currentSemester = `Summer ${currentYear}`;
  
  // Calculate graduation prediction
  const graduationPrediction = calculateGraduationPrediction(transcriptData, []);
  
  return {
    currentSemester,
    totalCreditsCompleted,
    totalCreditsRequired: DEGREE_REQUIREMENTS.totalCreditsRequired,
    creditProgressPercentage,
    courseProgressPercentage: creditProgressPercentage, // Simplified
    majorGPA: transcriptData.gpaSummary.majorGPA,
    cumulativeGPA: transcriptData.gpaSummary.cumulativeGPA,
    academicStanding: determineAcademicStanding(transcriptData.gpaSummary.cumulativeGPA),
    yearLevel,
    graduationPrediction
  };
}

/**
 * Helper function to check missing prerequisites
 */
function checkMissingPrerequisites(transcriptData: TranscriptData, degreeRequirements: DegreeRequirement[]): string[] {
  const completedCourses = Object.values(transcriptData.completedCourses)
    .flatMap(semester => semester.courses)
    .map(course => course.courseCode);
  
  const missingPrereqs: string[] = [];
  
  // Define prerequisite chains
  const prerequisites = {
    'CS 25000': ['CS 18000', 'CS 18200'],
    'CS 25100': ['CS 25000'],
    'CS 25200': ['CS 25100'],
    'CS 30700': ['CS 25100'],
    'CS 34800': ['CS 25100'],
    'CS 38100': ['CS 25100', 'STAT 35000'],
    'MA 16200': ['MA 16100'],
    'MA 26100': ['MA 16200'],
    'MA 26500': ['MA 26100'],
    'STAT 35000': ['MA 16200']
  };
  
  // Check each prerequisite chain
  Object.entries(prerequisites).forEach(([course, prereqs]) => {
    const hasAllPrereqs = prereqs.every(prereq => 
      completedCourses.includes(prereq) || 
      // Check for equivalent courses
      (COURSE_MAPPINGS[prereq]?.equivalent || []).some(equiv => completedCourses.includes(equiv))
    );
    
    if (!hasAllPrereqs && !completedCourses.includes(course)) {
      const missingFromChain = prereqs.filter(prereq => 
        !completedCourses.includes(prereq) &&
        !(COURSE_MAPPINGS[prereq]?.equivalent || []).some(equiv => completedCourses.includes(equiv))
      );
      missingPrereqs.push(...missingFromChain);
    }
  });
  
  return [...new Set(missingPrereqs)]; // Remove duplicates
}

/**
 * Calculates projected GPA
 */
function calculateProjectedGPA(transcriptData: TranscriptData, remainingCredits: number): number {
  const currentGPA = transcriptData.gpaSummary.cumulativeGPA;
  const currentCredits = transcriptData.gpaSummary.totalCreditsEarned;
  
  // Assume average grade of B (3.0) for remaining courses
  const assumedGradePoints = 3.0;
  const currentQualityPoints = currentGPA * currentCredits;
  const projectedQualityPoints = remainingCredits * assumedGradePoints;
  
  const totalCredits = currentCredits + remainingCredits;
  const totalQualityPoints = currentQualityPoints + projectedQualityPoints;
  
  return totalCredits > 0 ? Math.round((totalQualityPoints / totalCredits) * 100) / 100 : currentGPA;
}

/**
 * Determines academic standing based on GPA
 */
function determineAcademicStanding(gpa: number): string {
  if (gpa >= 3.5) return 'Dean\'s List';
  if (gpa >= 3.0) return 'Good Standing';
  if (gpa >= 2.0) return 'Academic Notice';
  return 'Academic Probation';
}

/**
 * Integrates transcript data with degree audit and returns updated requirements
 */
export function integrateTranscriptWithDegreeAudit(
  transcriptData: TranscriptData | null,
  baseDegreeRequirements: DegreeRequirement[]
): {
  degreeRequirements: DegreeRequirement[];
  academicProgression: AcademicProgression | null;
  graduationPrediction: GraduationPrediction | null;
} {
  console.log('🔗 Integrating transcript with degree audit...');
  
  if (!transcriptData) {
    console.log('ℹ️ No transcript data available - returning base requirements');
    return {
      degreeRequirements: baseDegreeRequirements,
      academicProgression: null,
      graduationPrediction: null
    };
  }
  
  try {
    // Map transcript courses to degree requirements
    const updatedRequirements = mapTranscriptToRequirements(transcriptData, baseDegreeRequirements);
    
    // Calculate academic progression
    const academicProgression = trackAcademicProgression(transcriptData);
    
    // Calculate graduation prediction
    const graduationPrediction = calculateGraduationPrediction(transcriptData, updatedRequirements);
    
    console.log('✅ Transcript integration completed successfully');
    
    return {
      degreeRequirements: updatedRequirements,
      academicProgression,
      graduationPrediction
    };
    
  } catch (error) {
    console.error('❌ Error integrating transcript with degree audit:', error);
    
    // Return base data on error
    return {
      degreeRequirements: baseDegreeRequirements,
      academicProgression: null,
      graduationPrediction: null
    };
  }
}

export default {
  mapTranscriptToRequirements,
  calculateGraduationPrediction,
  trackAcademicProgression,
  integrateTranscriptWithDegreeAudit,
  COURSE_MAPPINGS,
  DEGREE_REQUIREMENTS
};