import React, { useState, useEffect, useCallback } from "react";
import { 
  PageHeader, 
  Card, 
  Badge, 
  PurdueButton, 
  PurdueInput, 
  PurdueSelect, 
  ItemCard,
  StatsGrid
} from "@/components/PurdueUI";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { parseTranscriptWithEnhancedParser } from "@/services/enhancedTranscriptParser";
import { academicPlanningService, type DegreeProgress, type TranscriptData } from "@/services/academicPlanningService";
import { comprehensiveDegreeRequirements } from "@/data/comprehensive_degree_requirements";
import { 
  Calendar, 
  Plus, 
  Download, 
  Save,
  BookOpen,
  Trash2,
  Edit,
  ArrowUpDown,
  Zap,
  Target,
  Brain,
  GraduationCap,
  Clock,
  Search,
  Filter,
  ChevronDown,
  GripVertical,
  Upload,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Generate comprehensive course catalog from degree requirements
const generateCourseCatalog = () => {
  const allCourses: any[] = [];
  const degreePrograms = comprehensiveDegreeRequirements;
  
  Object.values(degreePrograms).forEach((program: any) => {
    // Extract courses from different program structures
    const courseLists = [
      program.foundation_courses?.courses,
      program.core_courses?.courses,
      program.mathematics_requirements?.courses,
      program.required_major_courses?.courses,
      program.mathematics_foundation?.courses,
      program.major_courses?.required_courses,
      program.required_courses,
      program.cs_selectives?.options,
      program.statistics_selective?.options,
      program.ethics_selective?.options,
      program.elective_options?.cs_selective_i?.options,
      program.elective_options?.cs_selective_ii?.options,
      program.electives?.choose_from
    ].filter(Boolean);
    
    courseLists.forEach(courseList => {
      if (Array.isArray(courseList)) {
        courseList.forEach(course => {
          if (typeof course === 'object' && course.code) {
            const courseId = course.code.replace(/\s+/g, '').toLowerCase();
            if (!allCourses.find(c => c.id === courseId)) {
              allCourses.push({
                id: courseId,
                code: course.code,
                title: course.title || 'Course Title',
                credits: course.credits || 3,
                prerequisites: course.prerequisites || [],
                typical_semester: course.typical_semester || 'any',
                department: course.code.split(' ')[0] || 'MISC'
              });
            }
          } else if (typeof course === 'string') {
            const courseId = course.replace(/\s+/g, '').toLowerCase();
            if (!allCourses.find(c => c.id === courseId)) {
              allCourses.push({
                id: courseId,
                code: course,
                title: `Course ${course}`,
                credits: 3,
                prerequisites: [],
                typical_semester: 'any',
                department: course.split(' ')[0] || 'MISC'
              });
            }
          }
        });
      }
    });
  });
  
  return allCourses.sort((a, b) => a.code.localeCompare(b.code));
};

// Initial sample course data structure
type SemesterCourses = Record<string, Course[]>;

const initialSampleCourses: SemesterCourses = {
  "Fall 2024": [
    { id: "cs18000", code: "CS 18000", title: "Problem Solving and OOP", credits: 4, status: "completed" },
    { id: "ma16100", code: "MA 16100", title: "Plane Analytic Geometry I", credits: 5, status: "completed" },
    { id: "engl10600", code: "ENGL 106", title: "First-Year Composition", credits: 4, status: "completed" },
  ],
  "Spring 2025": [
    { id: "cs25100", code: "CS 25100", title: "Data Structures", credits: 4, status: "in-progress" },
    { id: "cs24000", code: "CS 24000", title: "Programming in C", credits: 4, status: "in-progress" },
    { id: "ma16200", code: "MA 16200", title: "Plane Analytic Geometry II", credits: 5, status: "in-progress" },
    { id: "phys17200", code: "PHYS 17200", title: "Modern Mechanics", credits: 4, status: "in-progress" },
  ],
  "Fall 2025": [
    // Empty for now - user can add courses
  ]
};

// Semester and year options
const semesterOptions = [
  { value: "Fall", label: "Fall" },
  { value: "Spring", label: "Spring" },
  { value: "Summer", label: "Summer" }
];

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 1; i <= currentYear + 6; i++) {
    years.push({ value: i.toString(), label: i.toString() });
  }
  return years;
};

// Course interface
interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  status: 'completed' | 'in-progress' | 'planned';
  department?: string;
  semester?: string;
  year?: number;
  grade?: string;
}


export default function AcademicPlanner() {
  const { user } = useAuth();
  const { plannedCourses, setPlannedCourses } = useAcademicPlan();
  
  // Clear any old localStorage data that might have wrong semester ordering
  useEffect(() => {
    const clearOldData = () => {
      try {
        const savedSemesters = localStorage.getItem('academicPlanSemesters');
        if (savedSemesters) {
          const parsed = JSON.parse(savedSemesters);
          // Check if we have the wrong "Fall 2026" instead of "Fall 2025"
          const hasFall2026 = parsed.some((sem: any) => sem.name === 'Fall 2026' || (sem.season === 'Fall' && sem.year === 2026));
          if (hasFall2026) {
            console.log('🧹 Clearing old semester data with incorrect Fall 2026');
            localStorage.removeItem('academicPlanSemesters');
            localStorage.removeItem('academicPlan');
          }
        }
      } catch (error) {
        console.error('Error checking localStorage:', error);
      }
    };
    clearOldData();
  }, []);
  
  const [sampleCourses, setSampleCourses] = useState<SemesterCourses>(initialSampleCourses);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("Spring");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByPrereq, setFilterByPrereq] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [courseLibraryExpanded, setCourseLibraryExpanded] = useState(true);
  const [draggedCourse, setDraggedCourse] = useState<any>(null);
  const [degreeProgress, setDegreeProgress] = useState<DegreeProgress | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [showTranscriptUpload, setShowTranscriptUpload] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  
  // Initialize course catalog
  useEffect(() => {
    const catalog = generateCourseCatalog();
    setAvailableCourses(catalog);
    
    // Check if transcript data exists in localStorage
    const savedTranscriptData = localStorage.getItem('transcriptData');
    if (savedTranscriptData) {
      const parsedData = JSON.parse(savedTranscriptData);
      setTranscriptData(parsedData);
      importCoursesFromTranscript(parsedData);
    }
  }, []);
  
  // Create semester key from selected semester and year
  const selectedSemesterKey = `${selectedSemester} ${selectedYear}`;
  
  // Add new semester to planning if it doesn't exist
  const addSemesterIfNeeded = useCallback((semesterKey: string) => {
    setSampleCourses(prev => {
      if (!prev[semesterKey as keyof typeof prev]) {
        return {
          ...prev,
          [semesterKey]: []
        };
      }
      return prev;
    });
  }, []);

  const addSpecificSemester = (season: 'Spring' | 'Summer' | 'Fall', year: number | string) => {
    const numericYear = typeof year === 'string' ? parseInt(year) : year;
    const key = `${season} ${numericYear}`;
    addSemesterIfNeeded(key);
    setSelectedSemester(season);
    setSelectedYear(String(numericYear));
  };

  const semesters = Object.keys(sampleCourses).sort((a, b) => {
    const [semA, yearAStr] = a.split(' ');
    const [semB, yearBStr] = b.split(' ');
    const yearA = parseInt(yearAStr);
    const yearB = parseInt(yearBStr);
    if (yearA !== yearB) return yearA - yearB;
    // Chronological within the same calendar year: Spring -> Summer -> Fall
    const semOrder: Record<string, number> = { 'Spring': 1, 'Summer': 2, 'Fall': 3 };
    return (semOrder[semA] || 0) - (semOrder[semB] || 0);
  });
  
  const yearOptions = generateYearOptions();

  const getTotalCredits = (semester: string) => {
    const list = sampleCourses[semester] || [];
    return list.reduce((total: number, course: Course) => total + (course.credits || 0), 0);
  };

  const getAllStats = () => {
    if (degreeProgress) {
      return [
        { label: "Degree Progress", value: `${Math.round(degreeProgress.percentage)}%`, sublabel: degreeProgress.major },
        { label: "Credits Completed", value: degreeProgress.completedCredits },
        { label: "Remaining Credits", value: degreeProgress.remainingCredits, sublabel: "to graduation" },
        { label: "Current GPA", value: degreeProgress.gpa.toFixed(2) },
        { label: "Expected Graduation", value: degreeProgress.estimatedGraduation },
      ];
    }
    
    const allCourses = Object.values(sampleCourses).flat();
    const completedCourses = allCourses.filter(c => c.status === "completed");
    const totalCredits = allCourses.reduce((total, course) => total + course.credits, 0);
    const completedCredits = completedCourses.reduce((total, course) => total + course.credits, 0);
    const estimatedGraduation = semesters.length > 0 ? semesters[semesters.length - 1] : 'TBD';
    
    // Combine all stats into single consolidated widget
    return [
      { 
        label: "Academic Overview", 
        value: `${completedCredits}/${totalCredits}`, 
        sublabel: `${Math.max(0, 120 - totalCredits)} remaining • ${estimatedGraduation}`,
        type: "consolidated"
      }
    ];
  };

  const handleAIAssistance = () => {
    // TODO: Integrate with AI service
    console.log("AI assistance requested");
  };

  // Import courses from transcript data using the new service
  const importCoursesFromTranscript = useCallback((transcriptData: TranscriptData) => {
    if (!transcriptData) return;
    
    console.log('📚 Importing courses from transcript data...');
    
    try {
      // Convert transcript data to academic planner format
      const plannerCourses = academicPlanningService.convertToAcademicPlannerFormat(transcriptData);
      
      // Merge with existing courses
      setSampleCourses(prev => ({ ...prev, ...plannerCourses }));
      
      // Calculate degree progress
      const progress = academicPlanningService.calculateDegreeProgress(transcriptData);
      setDegreeProgress(progress);
      
      // Generate AI recommendations
      const recommendations = academicPlanningService.generateAIRecommendations(transcriptData, progress);
      setAiRecommendations(recommendations);
      
      console.log('✅ Successfully imported courses and calculated progress');
    } catch (error) {
      console.error('❌ Failed to import courses:', error);
    }
  }, []);


  // Handle transcript file upload
  const handleTranscriptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const parsedData = await parseTranscriptWithEnhancedParser(text);
      
      setTranscriptData(parsedData);
      localStorage.setItem('transcriptData', JSON.stringify(parsedData));
      
      importCoursesFromTranscript(parsedData);
      setShowTranscriptUpload(false);
      
      console.log('✅ Transcript uploaded and processed successfully');
    } catch (error) {
      console.error('❌ Failed to process transcript:', error);
      alert('Failed to process transcript. Please check the file format and try again.');
    }
  };

  const handleAddCourse = (courseId: string) => {
    const course = availableCourses.find(c => c.id === courseId);
    if (!course) return;
    
    addSemesterIfNeeded(selectedSemesterKey);
    
    setSampleCourses(prev => {
      const newCourses = { ...prev };
      if (!newCourses[selectedSemesterKey]) {
        newCourses[selectedSemesterKey] = [];
      }
      
      // Check if course already exists in this semester
      const exists = newCourses[selectedSemesterKey].find(c => c.id === courseId);
      if (!exists) {
        newCourses[selectedSemesterKey] = [
          ...newCourses[selectedSemesterKey],
          {
            id: course.id,
            code: course.code,
            title: course.title,
            credits: course.credits,
            status: "planned" as const
          }
        ];
      }
      
      return newCourses;
    });
  };

  const handleRemoveCourse = (semesterId: string, courseId: string) => {
    setSampleCourses(prev => {
      const newCourses = { ...prev };
      if (newCourses[semesterId]) {
        newCourses[semesterId] = newCourses[semesterId].filter(c => c.id !== courseId);
      }
      return newCourses;
    });
  };

  const handleAddNewSemester = () => {
    // Add the next chronological semester after the last one in the plan
    if (semesters.length === 0) {
      const start = `${selectedSemester} ${selectedYear}`;
      addSemesterIfNeeded(start);
      return;
    }
    const last = semesters[semesters.length - 1];
    const [lastSem, lastYearStr] = last.split(' ');
    const lastYear = parseInt(lastYearStr);
    const order = ['Spring', 'Summer', 'Fall'] as const;
    const idx = order.indexOf(lastSem as any);
    if (idx < 0) {
      const fallback = `Spring ${lastYear}`;
      addSemesterIfNeeded(fallback);
      return;
    }
    if (idx < order.length - 1) {
      const nextKey = `${order[idx + 1]} ${lastYear}`;
      addSemesterIfNeeded(nextKey);
    } else {
      const nextKey = `Spring ${lastYear + 1}`;
      addSemesterIfNeeded(nextKey);
    }
  };

  // Get unique departments for filtering
  const departments = [...new Set(availableCourses.map(c => c.department))].sort();
  
  // Filter available courses based on search, department, and prerequisites
  const filteredCourses = availableCourses.filter(course => {
    const matchesSearch = 
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !departmentFilter || course.department === departmentFilter;
    
    if (!matchesSearch || !matchesDepartment) return false;
    
    // If filter by prerequisites is enabled, only show courses with met prerequisites
    if (filterByPrereq) {
      const completedCourses = Object.values(sampleCourses)
        .flat()
        .filter(c => c.status === "completed")
        .map(c => c.code);
      
      return course.prerequisites?.every((prereq: string) => 
        completedCourses.includes(prereq)
      ) ?? true;
    }
    
    return true;
  }).slice(0, 100); // Limit results for performance

  // Drag and drop handlers
  const handleDragStart = (course: any) => {
    setDraggedCourse(course);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSemester: string) => {
    e.preventDefault();
    if (draggedCourse) {
      handleAddCourse(draggedCourse.id);
      setDraggedCourse(null);
      // Set target semester for the drop
      const [sem, year] = targetSemester.split(' ');
      setSelectedSemester(sem);
      setSelectedYear(year);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400";
      case "in-progress": return "text-blue-400";
      case "planned": return "text-yellow-400";
      default: return "text-neutral-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return "✓ Completed";
      case "in-progress": return "→ In Progress";
      case "planned": return "○ Planned";
      default: return status;
    }
  };

  return (
    <div className="h-full w-full p-8 overflow-auto">
      <div className="max-w-none space-y-8">
        <PageHeader 
          title="Academic Planner" 
          subtitle="Plan your academic journey with transcript integration and AI recommendations"
          actions={
            <div className="flex gap-3">
              {!transcriptData && (
                <PurdueButton 
                  variant="secondary"
                  onClick={() => setShowTranscriptUpload(true)}
                >
                  <Upload size={18} className="mr-2" />
                  Import Transcript
                </PurdueButton>
              )}
              <PurdueButton variant="secondary">
                <Download size={18} className="mr-2" />
                Export Plan
              </PurdueButton>
              <PurdueButton onClick={handleAIAssistance}>
                <Brain size={18} className="mr-2" />
                AI Recommendations
              </PurdueButton>
            </div>
          }
        />

      {/* Transcript Upload Modal */}
      {showTranscriptUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card title="Import Transcript" className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-200">Import Transcript</h3>
              <button
                onClick={() => setShowTranscriptUpload(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Upload your Purdue transcript to automatically import completed courses and calculate degree progress.
              </p>
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleTranscriptUpload}
                className="w-full p-3 border border-neutral-700 rounded-lg bg-neutral-900 text-neutral-200"
              />
              <div className="text-xs text-neutral-500">
                Supported formats: TXT, PDF (unofficial transcripts)
              </div>
            </div>
          </Card>
        </div>
      )}


      {/* Main Academic Planning Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester Planning - Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Semester Plan" right={
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <PurdueButton variant="secondary" size="small">
                    <Plus size={14} className="mr-1" />
                    Add Semester
                  </PurdueButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAddNewSemester}>
                    Add next semester
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSpecificSemester('Spring', selectedYear)}>
                    Spring {selectedYear}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSpecificSemester('Summer', selectedYear)}>
                    Summer {selectedYear}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSpecificSemester('Fall', selectedYear)}>
                    Fall {selectedYear}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <PurdueButton
                variant={isEditMode ? "primary" : "secondary"}
                size="small"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Edit size={14} className="mr-1" />
                {isEditMode ? "Exit Edit" : "Edit Mode"}
              </PurdueButton>
            </div>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {semesters.map((semester) => {
                const semesterCourses = sampleCourses[semester as keyof typeof sampleCourses] || [];
                return (
                  <div 
                    key={semester}
                    className="rounded-2xl bg-neutral-950/60 p-4 ring-1 ring-neutral-800 min-h-[200px] transition-all hover:ring-neutral-700"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, semester)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-neutral-200">{semester}</h3>
                      <div className="flex items-center gap-2">
                        <Badge>{getTotalCredits(semester)} credits</Badge>
                        {isEditMode && (
                          <button
                            onClick={() => {
                              // Remove entire semester
                              setSampleCourses(prev => {
                                const newCourses = { ...prev };
                                delete newCourses[semester];
                                return newCourses;
                              });
                            }}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Remove semester"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {semesterCourses.map((course) => (
                        <div 
                          key={course.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-neutral-200">
                                {course.code}
                              </span>
                              <span className={`text-xs ${getStatusColor(course.status)}`}>
                                {getStatusBadge(course.status)}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-400">{course.title}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500">{course.credits}cr</span>
                            {isEditMode && (
                              <button
                                onClick={() => handleRemoveCourse(semester, course.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {isEditMode && (
                        <button 
                          className="w-full p-2 border-2 border-dashed border-neutral-700 rounded-lg text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
                          onClick={() => {
                            // Auto-set the semester selection to current semester for quick add
                            const [sem, year] = semester.split(' ');
                            setSelectedSemester(sem);
                            setSelectedYear(year);
                            setCourseLibraryExpanded(true);
                          }}
                        >
                          <Plus size={16} className="inline mr-1" />
                          Add Course to {semester}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Course Library - Main Feature */}
        <div className="lg:col-span-1 space-y-4">
          {/* Course Library */}
          <Card 
            title="Course Library" 
            right={
              <button
                onClick={() => setCourseLibraryExpanded(!courseLibraryExpanded)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${courseLibraryExpanded ? 'rotate-180' : ''}`} 
                />
              </button>
            }
          >
            {courseLibraryExpanded && (
              <div className="space-y-3">
                {/* Search and Filters */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                  <PurdueInput
                    placeholder="Search courses by code or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Filter Options */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setFilterByPrereq(!filterByPrereq)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        filterByPrereq 
                          ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" 
                          : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                      }`}
                    >
                      <Filter size={12} />
                      Prerequisites Met
                    </button>
                    {searchTerm && (
                      <span className="text-xs text-neutral-500">
                        {filteredCourses.length} courses found
                      </span>
                    )}
                  </div>
                  
                  {/* Department Filter */}
                  <PurdueSelect
                    options={[
                      { value: "", label: "All Departments" },
                      ...departments.map(dept => ({ value: dept, label: dept }))
                    ]}
                    value={departmentFilter}
                    onChange={setDepartmentFilter}
                    placeholder="Filter by department"
                  />
                </div>
                
                {/* Semester Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <PurdueSelect
                    options={semesterOptions}
                    value={selectedSemester}
                    onChange={setSelectedSemester}
                    placeholder="Semester"
                  />
                  <PurdueSelect
                    options={yearOptions}
                    value={selectedYear}
                    onChange={setSelectedYear}
                    placeholder="Year"
                  />
                </div>
                
                <div className="text-xs text-neutral-500 mb-2">
                  Adding to: {selectedSemesterKey}
                </div>
                
                {/* Course List */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-4 text-neutral-500">
                      {searchTerm ? 'No courses found' : 'Start typing to search courses'}
                    </div>
                  ) : (
                    filteredCourses.map((course) => {
                      const alreadyScheduled = Object.values(sampleCourses)
                        .flat()
                        .some(c => c.code === course.code);
                      
                      return (
                        <div 
                          key={course.id}
                          draggable
                          onDragStart={() => handleDragStart(course)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-move ${
                            alreadyScheduled 
                              ? "border-green-800 bg-green-900/20" 
                              : "border-neutral-800 hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <GripVertical size={14} className="text-neutral-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-neutral-200">{course.code}</span>
                                <span className="text-xs text-neutral-500">({course.department})</span>
                                {alreadyScheduled && (
                                  <Badge>Scheduled</Badge>
                                )}
                              </div>
                              <div className="text-xs text-neutral-400">{course.title}</div>
                              {course.prerequisites?.length > 0 && (
                                <div className="text-xs text-neutral-500 mt-1">
                                  Prerequisites: {course.prerequisites.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500">{course.credits}cr</span>
                            <PurdueButton 
                              size="small" 
                              onClick={() => handleAddCourse(course.id)}
                              disabled={alreadyScheduled}
                            >
                              <Plus size={12} />
                            </PurdueButton>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="text-xs text-neutral-400 mt-2 p-2 bg-neutral-900/50 rounded">
                  💡 Tip: Drag courses directly onto semester cards or use the + button
                </div>
              </div>
            )}
          </Card>

        </div>
      </div>

      {/* Secondary Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {/* Quick Stats Cards */}
        {getAllStats().map((stat, index) => (
          <Card key={index} title={stat.label} className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-200 mb-1">{stat.value}</div>
              {stat.sublabel && (
                <div className="text-xs text-neutral-500 mt-1">{stat.sublabel}</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* AI Recommendations and Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Enhanced Degree Progress Section */}
        {degreeProgress && (
          <Card title="Degree Progress Analysis">
            <div className="space-y-4">
              {/* Progress Chart */}
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-neutral-700"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-yellow-500"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={`${degreeProgress.percentage}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-neutral-200">
                      {Math.round(degreeProgress.percentage)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="text-lg font-semibold text-neutral-200 mb-2">
                    {degreeProgress.major}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-neutral-400">Foundation:</span>
                      <span className="text-neutral-200 ml-1">
                        {degreeProgress.requirements.foundation.completed}/{degreeProgress.requirements.foundation.required}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Core:</span>
                      <span className="text-neutral-200 ml-1">
                        {degreeProgress.requirements.core.completed}/{degreeProgress.requirements.core.required}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400">GPA:</span>
                      <span className="text-neutral-200 ml-1">{degreeProgress.gpa.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Graduation:</span>
                      <span className="text-yellow-400 ml-1 text-xs">{degreeProgress.estimatedGraduation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* AI Recommendations - Compact Widget */}
        <Card title="Smart Recommendations" right={<Badge>AI</Badge>}>
          <div className="space-y-2">
            {aiRecommendations.length > 0 ? (
              aiRecommendations.slice(0, 1).map((rec, index) => (
                <div key={index} className="p-2 rounded-lg bg-blue-950/30 ring-1 ring-blue-800">
                  <div className="text-sm font-medium text-blue-200 mb-1">{rec.title}</div>
                  <div className="text-xs text-neutral-400">{rec.description}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-neutral-400">
                Import transcript for AI recommendations
              </div>
            )}
            
            <div className="flex gap-1 mt-3">
              <PurdueButton onClick={handleAIAssistance} size="small">
                <Brain size={12} className="mr-1" />
                AI Help
              </PurdueButton>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
  );
}