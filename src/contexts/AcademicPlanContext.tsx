import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlannedCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: string;
}

interface Semester {
  id: string;
  name: string;
  season: string;
  year: number;
  current: boolean;
}

interface ParsedCourse {
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

interface TranscriptData {
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

interface AcademicPlanContextType {
  plannedCourses: { [semesterId: string]: PlannedCourse[] };
  semesters: Semester[];
  currentSemesterId: string;
  transcriptData: TranscriptData | null;
  setPlannedCourses: (courses: { [semesterId: string]: PlannedCourse[] }) => void;
  setSemesters: (semesters: Semester[]) => void;
  setTranscriptData: (data: TranscriptData | null) => void;
  addCourseToCurrentSemester: (course: PlannedCourse) => void;
  removeCourseFromCurrentSemester: (courseId: string) => void;
  getCurrentSemesterCourses: () => PlannedCourse[];
  getCurrentSemesterCredits: () => number;
  updateParsedCourse: (courseId: string, updates: Partial<ParsedCourse>) => void;
  verifyCourse: (courseId: string, verified: boolean) => void;
  calculateGPA: (courses: ParsedCourse[]) => number;
  transferCoursesToPlanner: (selectedCourses: ParsedCourse[], shouldOverride?: boolean) => void;
  getAllTranscriptCourses: () => ParsedCourse[];
}

const AcademicPlanContext = createContext<AcademicPlanContextType | undefined>(undefined);

export const useAcademicPlan = () => {
  const context = useContext(AcademicPlanContext);
  if (context === undefined) {
    throw new Error('useAcademicPlan must be used within an AcademicPlanProvider');
  }
  return context;
};

interface AcademicPlanProviderProps {
  children: ReactNode;
}

export const AcademicPlanProvider: React.FC<AcademicPlanProviderProps> = ({ children }) => {
  const [semesters, setSemesters] = useState<Semester[]>(() => {
    try {
      // Load from localStorage if available, otherwise start with minimal default semesters
      const saved = localStorage.getItem('academicPlanSemesters');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📅 Loaded semesters from localStorage:', parsed.length, 'semesters');
        return parsed;
      }
      
      // Start with current semester only
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      // Determine current semester based on month
      let currentSeason = 'Fall';
      if (currentMonth >= 0 && currentMonth <= 4) currentSeason = 'Spring';
      else if (currentMonth >= 5 && currentMonth <= 7) currentSeason = 'Summer';
      
      return [
        { id: `${currentSeason.toLowerCase()}${currentYear}`, name: `${currentSeason} ${currentYear}`, season: currentSeason, year: currentYear, current: true }
      ];
    } catch (error) {
      console.error('❌ Error initializing semesters:', error);
      return [];
    }
  });

  const [plannedCourses, setPlannedCourses] = useState<{ [semesterId: string]: PlannedCourse[] }>(() => {
    try {
      // Load from localStorage if available, otherwise start empty
      const saved = localStorage.getItem('academicPlan');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📚 Loaded planned courses from localStorage:', Object.keys(parsed).length, 'semesters');
        return parsed;
      }
      return {};
    } catch (error) {
      console.error('❌ Error loading planned courses from localStorage:', error);
      return {};
    }
  });

  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(() => {
    try {
      // Load transcript data from localStorage on initialization
      const savedTranscriptData = localStorage.getItem('transcriptData');
      if (savedTranscriptData) {
        const parsed = JSON.parse(savedTranscriptData);
        console.log('📄 Loaded transcript data from localStorage for:', parsed.studentInfo?.name);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading transcript data from localStorage:', error);
      return null;
    }
  });

  const currentSemesterId = semesters.find(sem => sem.current)?.id || "fall2024";

  // Grade points mapping
  const gradePointsMap: { [grade: string]: number } = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  };

  const addCourseToCurrentSemester = (course: PlannedCourse) => {
    setPlannedCourses(prev => {
      const updated = {
        ...prev,
        [currentSemesterId]: [...(prev[currentSemesterId] || []), { ...course, semester: currentSemesterId }]
      };
      
      // Save to localStorage
      try {
        localStorage.setItem('academicPlan', JSON.stringify(updated));
      } catch (error) {
        console.error('❌ Error saving academic plan:', error);
      }
      
      return updated;
    });
  };

  const removeCourseFromCurrentSemester = (courseId: string) => {
    setPlannedCourses(prev => {
      const updated = {
        ...prev,
        [currentSemesterId]: prev[currentSemesterId]?.filter(course => course.id !== courseId) || []
      };
      
      // Save to localStorage
      try {
        localStorage.setItem('academicPlan', JSON.stringify(updated));
      } catch (error) {
        console.error('❌ Error saving academic plan:', error);
      }
      
      return updated;
    });
  };

  const getCurrentSemesterCourses = () => {
    return plannedCourses[currentSemesterId] || [];
  };

  const getCurrentSemesterCredits = () => {
    return getCurrentSemesterCourses().reduce((total, course) => total + course.credits, 0);
  };

  const updateParsedCourse = (courseId: string, updates: Partial<ParsedCourse>) => {
    if (!transcriptData) return;
    
    const updatedCompletedCourses = { ...transcriptData.completedCourses };
    let courseFound = false;

    // Check completed courses
    for (const semesterKey in updatedCompletedCourses) {
      const courseIndex = updatedCompletedCourses[semesterKey].courses.findIndex(course => course.id === courseId);
      if (courseIndex !== -1) {
        updatedCompletedCourses[semesterKey].courses[courseIndex] = {
          ...updatedCompletedCourses[semesterKey].courses[courseIndex],
          ...updates
        };
        courseFound = true;
        break;
      }
    }

    // Check in-progress courses if not found in completed
    const inProgressCoursesArray = Array.isArray(transcriptData.coursesInProgress) 
      ? transcriptData.coursesInProgress 
      : [];
    const updatedInProgressCourses = [...inProgressCoursesArray];
    if (!courseFound) {
      const progressIndex = updatedInProgressCourses.findIndex(course => course.id === courseId);
      if (progressIndex !== -1) {
        updatedInProgressCourses[progressIndex] = {
          ...updatedInProgressCourses[progressIndex],
          ...updates
        };
        courseFound = true;
      }
    }

    if (courseFound) {
      setTranscriptData({
        ...transcriptData,
        completedCourses: updatedCompletedCourses,
        coursesInProgress: updatedInProgressCourses
      });
    }
  };

  const verifyCourse = (courseId: string, verified: boolean) => {
    updateParsedCourse(courseId, { verified });
  };

  const calculateGPA = (courses: ParsedCourse[]): number => {
    const gradedCourses = courses.filter(course => 
      course.grade !== 'W' && course.grade !== 'I' && course.grade !== 'P' && 
      course.grade !== 'S' && course.grade !== 'U' && course.grade !== ''
    );
    if (gradedCourses.length === 0) return 0;

    const totalQualityPoints = gradedCourses.reduce((sum, course) => sum + course.qualityPoints, 0);
    const totalCredits = gradedCourses.reduce((sum, course) => sum + course.credits, 0);

    return totalCredits > 0 ? totalQualityPoints / totalCredits : 0;
  };

  const getAllTranscriptCourses = (): ParsedCourse[] => {
    if (!transcriptData) return [];
    
    const completedCourses = Object.values(transcriptData.completedCourses).flatMap(sem => sem.courses);
    
    // Ensure coursesInProgress is always an array
    const inProgressCourses = Array.isArray(transcriptData.coursesInProgress) 
      ? transcriptData.coursesInProgress 
      : [];
    
    const allCourses = [...completedCourses, ...inProgressCourses];
    
    // Filter out invalid "in progression" entries that aren't real courses
    return allCourses.filter(course => {
      // Exclude entries that are just semester headers or "in progression" text
      const isInvalidEntry = 
        !course.courseCode || 
        course.courseCode.toLowerCase().includes('in progress') ||
        course.courseCode.toLowerCase().includes('progression') ||
        course.courseTitle?.toLowerCase().includes('in progress') ||
        course.courseTitle?.toLowerCase().includes('progression') ||
        // Check if it's just a semester name (e.g., "Summer 2025", "Fall 2025")
        /^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseCode || '') ||
        /^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseTitle || '') ||
        // Filter out course codes that are too short or invalid
        (course.courseCode && course.courseCode.length < 3) ||
        // Filter out empty or placeholder titles
        !course.courseTitle || 
        course.courseTitle.trim() === '' ||
        course.courseTitle.toLowerCase() === 'unknown course';
      
      return !isInvalidEntry;
    });
  };

  const transferCoursesToPlanner = (selectedCourses: ParsedCourse[], shouldOverride: boolean = true) => {
    try {
      console.log('🔄 Starting transfer of', selectedCourses?.length || 0, 'courses to planner...', shouldOverride ? '(Override mode)' : '(Merge mode)');
      
      if (!selectedCourses || !Array.isArray(selectedCourses) || selectedCourses.length === 0) {
        console.warn('⚠️ No valid courses provided for transfer');
        return;
      }

      const coursesToAdd: { [semesterId: string]: PlannedCourse[] } = {};
      const newSemesters: Semester[] = [];
      
      // If override mode, clear existing transcript-sourced courses first
      if (shouldOverride) {
        console.log('🔄 Override mode: Clearing existing transcript courses...');
        setPlannedCourses(prev => {
          const updated = { ...prev };
          for (const semesterId in updated) {
            // Remove courses that were transferred from transcript (have 'transferred_' prefix)
            updated[semesterId] = updated[semesterId].filter(course => 
              !course.id.startsWith('transferred_')
            );
          }
          return updated;
        });
      }

      // Filter out withdrawn courses (W grade) and any other courses we shouldn't include
      const validCourses = selectedCourses.filter((course, index) => {
        if (!course || typeof course !== 'object') {
          console.warn(`⚠️ Invalid course at index ${index}:`, course);
          return false;
        }
        
        // Filter out withdrawn courses
        if (course.grade === 'W' || course.status === 'withdrawn') {
          console.log(`🚫 Skipping withdrawn course: ${course.courseCode} (grade: ${course.grade})`);
          return false;
        }
        
        return true;
      });

      console.log(`📊 Filtered courses: ${selectedCourses.length} → ${validCourses.length} (removed ${selectedCourses.length - validCourses.length} withdrawn courses)`);

      validCourses.forEach((parsedCourse, index) => {
        try {

          // Enhanced semester name normalization
          let season = parsedCourse.semester || 'Unknown';
          const year = parsedCourse.year || new Date().getFullYear();
      
      // Handle various semester formats from transcripts
      const seasonMappings: { [key: string]: string } = {
        'fall': 'Fall',
        'autumn': 'Fall',
        'spring': 'Spring',
        'summer': 'Summer',
        'winter': 'Spring',
        'january': 'Spring',
        'may': 'Summer',
        'maymester': 'Summer'
      };
      
      const normalizedSeason = season.toLowerCase().replace(/\s+/g, '');
      season = seasonMappings[normalizedSeason] || season;

      // Create semester ID
      const targetSemesterId = `${season.toLowerCase()}${year}`;
      
      // Check if semester already exists in current semesters or new semesters
      const existsInCurrent = semesters.find(sem => sem.id === targetSemesterId);
      const existsInNew = newSemesters.find(sem => sem.id === targetSemesterId);

      if (!existsInCurrent && !existsInNew) {
        // Create new semester
        const newSemester: Semester = {
          id: targetSemesterId,
          name: `${season} ${year}`,
          season: season,
          year: year,
          current: false
        };
        newSemesters.push(newSemester);
        console.log('📅 Creating new semester:', newSemester.name);
      }

          // Clean course data and create planned course
          const cleanCode = parsedCourse.courseCode?.replace(/[^A-Z0-9\s]/g, '').trim() || 'UNKNOWN';
          const cleanTitle = parsedCourse.courseTitle?.replace(/[^a-zA-Z0-9\s&-]/g, '').trim() || 'Unknown Course';
          
          const plannedCourse: PlannedCourse = {
            id: `transferred_${parsedCourse.id || Date.now()}_${Date.now()}`,
            code: parsedCourse.purdueCourseMatch || cleanCode,
            title: cleanTitle,
            credits: Number(parsedCourse.credits) || 0,
            semester: targetSemesterId
          };

          if (!coursesToAdd[targetSemesterId]) {
            coursesToAdd[targetSemesterId] = [];
          }
          coursesToAdd[targetSemesterId].push(plannedCourse);
          console.log('📚 Adding course to planner:', plannedCourse.code, 'in', targetSemesterId, '- Status:', parsedCourse.status);
        } catch (courseError) {
          console.error(`❌ Error processing course at index ${index}:`, courseError, parsedCourse);
        }
      });

    // Add new semesters first (sorted by year and season)
    if (newSemesters.length > 0) {
      setSemesters(prev => {
        const combined = [...prev, ...newSemesters];
        // Sort semesters by year and season (academic year order: Fall, Spring, Summer)
        const sorted = combined.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          const seasonOrder = { 'Fall': 0, 'Spring': 1, 'Summer': 2 };
          return (seasonOrder[a.season as keyof typeof seasonOrder] || 3) - 
                 (seasonOrder[b.season as keyof typeof seasonOrder] || 3);
        });
        
        // Save to localStorage
        try {
          localStorage.setItem('academicPlanSemesters', JSON.stringify(sorted));
          console.log('📅 Saved semesters to localStorage');
        } catch (error) {
          console.error('❌ Error saving semesters:', error);
        }
        
        return sorted;
      });
    }

    // Update planned courses
    setPlannedCourses(prev => {
      const updated = { ...prev };
      for (const semesterId in coursesToAdd) {
        // Don't duplicate courses that are already in the planner (unless override mode cleared them)
        const existingCourses = updated[semesterId] || [];
        const newCourses = shouldOverride ? 
          coursesToAdd[semesterId] : // In override mode, add all courses since we cleared transcript ones
          coursesToAdd[semesterId].filter(newCourse => 
            !existingCourses.some(existing => existing.code === newCourse.code)
          );
        updated[semesterId] = [...existingCourses, ...newCourses];
        console.log(`📚 Added ${newCourses.length} new courses to ${semesterId} (${shouldOverride ? 'override mode' : 'duplicates skipped'})`);
      }
      
      // Save to localStorage immediately
      try {
        localStorage.setItem('academicPlan', JSON.stringify(updated));
        console.log('💾 Saved updated academic plan to localStorage');
      } catch (error) {
        console.error('❌ Error saving academic plan:', error);
      }
      
      return updated;
    });
      
      const totalCourses = Object.values(coursesToAdd).flat().length;
      console.log('✅ Successfully transferred', totalCourses, 'courses to planner across', Object.keys(coursesToAdd).length, 'semesters');
    } catch (error) {
      console.error('❌ Error in transferCoursesToPlanner:', error);
      // Don't rethrow - just log the error to prevent crashes
    }
  };

  // Custom setTranscriptData that also saves to localStorage
  const setTranscriptDataWithPersistence = (data: TranscriptData | null) => {
    setTranscriptData(data);
    
    try {
      if (data) {
        localStorage.setItem('transcriptData', JSON.stringify(data));
        console.log('💾 Saved transcript data to localStorage for:', data.studentInfo?.name);
      } else {
        localStorage.removeItem('transcriptData');
        console.log('🗑️ Removed transcript data from localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving transcript data to localStorage:', error);
    }
  };

  // Auto-transfer transcript courses when transcript data is available
  useEffect(() => {
    if (transcriptData) {
      const allTranscriptCourses = getAllTranscriptCourses();
      if (allTranscriptCourses.length > 0) {
        console.log('🔄 Auto-transferring', allTranscriptCourses.length, 'courses from loaded transcript...');
        transferCoursesToPlanner(allTranscriptCourses, false); // Don't override on initial load
      }
    }
  }, [transcriptData]); // Only run when transcriptData changes

  const value: AcademicPlanContextType = {
    plannedCourses,
    semesters,
    currentSemesterId,
    transcriptData,
    setPlannedCourses,
    setSemesters,
    setTranscriptData: setTranscriptDataWithPersistence,
    addCourseToCurrentSemester,
    removeCourseFromCurrentSemester,
    getCurrentSemesterCourses,
    getCurrentSemesterCredits,
    updateParsedCourse,
    verifyCourse,
    calculateGPA,
    transferCoursesToPlanner,
    getAllTranscriptCourses,
  };

  return (
    <AcademicPlanContext.Provider value={value}>
      {children}
    </AcademicPlanContext.Provider>
  );
}; 