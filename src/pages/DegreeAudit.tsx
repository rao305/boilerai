import React, { useState, useEffect } from "react";
import { 
  PageHeader, 
  Card, 
  Badge, 
  PurdueButton, 
  StatsGrid,
  ItemCard,
  PurdueSelect,
  PurdueInput
} from "@/components/PurdueUI";
import { 
  GraduationCap, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  FileText,
  Calculator,
  Target,
  TrendingUp,
  BookOpen,
  Star,
  Upload,
  RefreshCw,
  Filter,
  RotateCcw
} from "lucide-react";
import { comprehensiveDegreeRequirements } from "@/data/comprehensive_degree_requirements";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";
import { useTheme } from "@/contexts/ThemeContext";

// Available degree programs - Computer Science only
const availablePrograms = [
  { value: "computer_science", label: "Computer Science (BS)" },
  { value: "computer_science_minor", label: "Computer Science Minor" }
];

// Course completion status interface
interface CourseCompletion {
  [courseCode: string]: {
    completed: boolean;
    grade?: string;
    semester?: string;
    year?: number;
  };
}

// Function to convert degree requirements to audit format
const convertToAuditFormat = (programKey: string, completions: CourseCompletion = {}) => {
  const program = comprehensiveDegreeRequirements[programKey as keyof typeof comprehensiveDegreeRequirements];
  if (!program) return {};

  const auditData: any = {};

  // Handle different program structures
  if (programKey === "computer_science") {
    // Foundation Courses
    auditData["Foundation Courses"] = {
      required: program.foundation_courses?.courses?.length || 0,
      courses: program.foundation_courses?.courses?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };

    // Core Courses
    auditData["Core Courses"] = {
      required: program.core_courses?.courses?.length || 0,
      courses: program.core_courses?.courses?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };

    // Mathematics
    auditData["Mathematics"] = {
      required: program.mathematics_requirements?.courses?.length || 0,
      courses: program.mathematics_requirements?.courses?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };

    // Science Requirements
    auditData["Science Requirements"] = {
      required: program.science_requirements?.options?.length || 0,
      courses: program.science_requirements?.options?.flat().map((courseCode: string) => ({
        code: courseCode,
        title: `Science Course ${courseCode}`,
        credits: 4,
        status: completions[courseCode]?.completed ? "completed" : "needed",
        grade: completions[courseCode]?.grade || ""
      })) || []
    };
  } else if (programKey === "computer_science_minor") {
    // Required Major Courses
    auditData["Required Major Courses"] = {
      required: program.required_major_courses?.courses?.length || 0,
      courses: program.required_major_courses?.courses?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };

    // Mathematics Foundation
    auditData["Mathematics Foundation"] = {
      required: program.mathematics_foundation?.courses?.length || 0,
      courses: program.mathematics_foundation?.courses?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };

    // CS Selectives
    auditData["CS Selectives"] = {
      required: 2,
      courses: program.cs_selectives?.options?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };
  } else if (!programKey.includes("minor")) {
    // Major Courses
    auditData["Major Courses"] = {
      required: program.major_courses?.required_courses?.length || 0,
      courses: program.major_courses?.required_courses?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };

    // CS Selectives
    auditData["CS Selective I"] = {
      required: 2,
      courses: program.elective_options?.cs_selective_i?.options?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };
  } else if (programKey.includes("minor")) {
    // Minor Programs
    auditData["Required Courses"] = {
      required: program.required_courses?.length || 0,
      courses: program.required_courses?.map((course: any) => ({
        code: course.code,
        title: course.title,
        credits: course.credits,
        status: completions[course.code]?.completed ? "completed" : "needed",
        grade: completions[course.code]?.grade || ""
      })) || []
    };

    if (program.electives) {
      auditData["Electives"] = {
        required: program.electives.credits_required / 3, // Assuming 3 credits per course
        courses: program.electives.choose_from?.map((courseCode: string) => ({
          code: courseCode,
          title: `Elective Course ${courseCode}`,
          credits: 3,
          status: completions[courseCode]?.completed ? "completed" : "needed",
          grade: completions[courseCode]?.grade || ""
        })) || []
      };
    }
  }

  // Calculate completion stats for each category
  Object.keys(auditData).forEach(category => {
    const categoryData = auditData[category];
    const completed = categoryData.courses.filter((c: any) => c.status === "completed").length;
    const inProgress = categoryData.courses.filter((c: any) => c.status === "in-progress").length;
    
    categoryData.completed = completed;
    categoryData.inProgress = inProgress;
  });

  return auditData;
};

export default function DegreeAudit() {
  const { theme } = useTheme();
  const { transcriptData, getAllTranscriptCourses } = useAcademicPlan();
  const [selectedProgram, setSelectedProgram] = useState<string>("computer_science");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [courseCompletions, setCourseCompletions] = useState<CourseCompletion>({});
  const [degreeRequirements, setDegreeRequirements] = useState<any>({});
  const [showTranscriptUpload, setShowTranscriptUpload] = useState(false);
  const [autoDetectedMajor, setAutoDetectedMajor] = useState<string | null>(null);

  // Auto-detect major based on transcript courses
  const detectMajorFromTranscript = () => {
    if (!transcriptData) return null;
    
    const allCourses = getAllTranscriptCourses();
    const csCourses = allCourses.filter(course => 
      course.courseCode.startsWith('CS ') || course.subject === 'CS'
    ).length;
    
    const dataScienceCourses = allCourses.filter(course => 
      course.courseCode.includes('STAT') || 
      course.courseCode.includes('DATA') || 
      (course.courseCode.startsWith('CS ') && 
       ['CS 37300', 'CS 34800', 'CS 30100'].includes(course.courseCode))
    ).length;
    
    const aiCourses = allCourses.filter(course => 
      ['CS 37300', 'CS 38100', 'CS 47100', 'CS 57300'].includes(course.courseCode)
    ).length;

    // Simple heuristic for major detection
    // Only Computer Science options available
    if (csCourses >= 4) return 'computer_science';
    
    return null;
  };

  // Sync course completions with transcript data
  const syncWithTranscriptData = () => {
    if (!transcriptData) return;
    
    const allCourses = getAllTranscriptCourses();
    const newCompletions: CourseCompletion = {};
    
    allCourses.forEach(course => {
      if (course.status === 'completed' && course.grade !== 'W') {
        const courseCode = course.purdueCourseMatch || course.courseCode;
        newCompletions[courseCode] = {
          completed: true,
          grade: course.grade,
          semester: course.semester,
          year: course.year
        };
      }
    });
    
    setCourseCompletions(prev => ({ ...prev, ...newCompletions }));
    console.log('🔄 Synced', Object.keys(newCompletions).length, 'courses from transcript');
  };

  // Auto-detect major when transcript data changes
  useEffect(() => {
    if (transcriptData) {
      const detectedMajor = detectMajorFromTranscript();
      if (detectedMajor && detectedMajor !== autoDetectedMajor) {
        setAutoDetectedMajor(detectedMajor);
        setSelectedProgram(detectedMajor);
        console.log('🎓 Auto-detected major:', detectedMajor);
      }
      syncWithTranscriptData();
    }
  }, [transcriptData]);

  // Update degree requirements when program changes
  useEffect(() => {
    const newRequirements = convertToAuditFormat(selectedProgram, courseCompletions);
    setDegreeRequirements(newRequirements);
    setSelectedCategory(null);
  }, [selectedProgram, courseCompletions]);

  // Handle course completion toggle
  const toggleCourseCompletion = (courseCode: string, category: string) => {
    setCourseCompletions(prev => {
      const newCompletions = { ...prev };
      if (newCompletions[courseCode]?.completed) {
        delete newCompletions[courseCode];
      } else {
        newCompletions[courseCode] = {
          completed: true,
          grade: "A", // Default grade
          semester: "Fall",
          year: 2024
        };
      }
      return newCompletions;
    });
  };

  // Handle transcript upload
  const handleTranscriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implement transcript parsing
      console.log("Transcript uploaded:", file.name);
      // For demo, simulate some completions
      setCourseCompletions({
        "CS 18000": { completed: true, grade: "B+", semester: "Fall", year: 2023 },
        "MA 16100": { completed: true, grade: "A", semester: "Fall", year: 2023 },
        "CS 18200": { completed: true, grade: "A-", semester: "Spring", year: 2024 }
      });
    }
  };
  
  // Calculate overall statistics
  const calculateStats = () => {
    const categories = Object.values(degreeRequirements);
    const totalRequired = categories.reduce((sum: number, cat: any) => sum + (cat.required || 0), 0);
    const allCourses = categories.flatMap((cat: any) => cat.courses || []);
    const completedCourses = allCourses.filter((course: any) => courseCompletions[course.code]?.completed);
    const totalCompleted = completedCourses.length;
    const totalInProgress = allCourses.filter((course: any) => course.status === "in-progress" && !courseCompletions[course.code]?.completed).length;
    const totalRemaining = Math.max(0, totalRequired - totalCompleted - totalInProgress);
    const completionPercentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;
    
    return {
      totalRequired,
      totalCompleted,
      totalInProgress,
      totalRemaining,
      completionPercentage
    };
  };
  
  const stats = calculateStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400";
      case "in-progress": return "text-blue-400";
      case "planned": return "text-yellow-400";
      case "needed": return "text-red-400";
      default: return "text-neutral-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle size={16} className="text-green-400" />;
      case "in-progress": return <Clock size={16} className="text-blue-400" />;
      case "planned": return <BookOpen size={16} className="text-yellow-400" />;
      case "needed": return <AlertTriangle size={16} className="text-red-400" />;
      default: return <AlertTriangle size={16} className="text-neutral-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "✓ Completed";
      case "in-progress": return "→ In Progress";
      case "planned": return "○ Planned";
      case "needed": return "! Required";
      default: return status;
    }
  };

  const statsData = [
    { label: "Overall Progress", value: `${stats.completionPercentage}%`, sublabel: `${stats.totalCompleted}/${stats.totalRequired} courses` },
    { label: "Completed", value: stats.totalCompleted, sublabel: "courses finished" },
    { label: "In Progress", value: stats.totalInProgress, sublabel: "current semester" },
    { label: "Remaining", value: stats.totalRemaining, sublabel: "courses needed" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Degree Audit" 
        subtitle={
          autoDetectedMajor 
            ? `Track your progress toward graduation requirements • Auto-detected: ${availablePrograms.find(p => p.value === autoDetectedMajor)?.label}`
            : "Track your progress toward graduation requirements"
        }
        actions={
          <div className="flex gap-2">
            {transcriptData && (
              <PurdueButton 
                variant="secondary" 
                size="small"
                onClick={syncWithTranscriptData}
              >
                <RotateCcw size={16} className="mr-2" />
                Sync with Transcript
              </PurdueButton>
            )}
            <PurdueButton 
              variant="secondary" 
              size="small"
              onClick={() => setShowTranscriptUpload(!showTranscriptUpload)}
            >
              <Upload size={16} className="mr-2" />
              Upload Transcript
            </PurdueButton>
            <PurdueButton variant="secondary" size="small">
              <Download size={16} className="mr-2" />
              Export Report
            </PurdueButton>
            <PurdueButton size="small">
              <FileText size={16} className="mr-2" />
              Official Audit
            </PurdueButton>
          </div>
        }
      />

      {/* Program Selection */}
      <Card title="Select Your Program">
        {autoDetectedMajor && (
          <div className="mb-4 p-3 rounded-lg bg-green-950/60 ring-1 ring-green-800">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="text-green-400" size={16} />
              <span className="text-sm font-medium text-green-200">Auto-Detected Major</span>
            </div>
            <div className="text-xs text-green-300">
              Based on your transcript, we detected: {availablePrograms.find(p => p.value === autoDetectedMajor)?.label}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Degree Program {autoDetectedMajor && <Badge variant="green">Auto-detected</Badge>}
            </label>
            <PurdueSelect
              options={availablePrograms}
              value={selectedProgram}
              onChange={setSelectedProgram}
              placeholder="Select your degree program"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Track (if applicable)
            </label>
            <PurdueSelect
              options={[
                { value: "machine_intelligence", label: "Machine Intelligence" },
                { value: "software_engineering", label: "Software Engineering" }
              ]}
              value=""
              onChange={() => {}}
              placeholder="Select track (CS only)"
              disabled={selectedProgram !== "computer_science"}
            />
          </div>
        </div>
      </Card>

      {/* Transcript Upload */}
      {showTranscriptUpload && (
        <Card title="Upload Transcript">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleTranscriptUpload}
                className="hidden"
                id="transcript-upload"
              />
              <label htmlFor="transcript-upload" className="cursor-pointer">
                <Upload size={48} className="mx-auto text-neutral-500 mb-2" />
                <p className="text-neutral-300">Upload your official transcript</p>
                <p className="text-sm text-neutral-500">Supports PDF, TXT, DOC, DOCX</p>
              </label>
            </div>
            <p className="text-xs text-neutral-400">
              We'll automatically analyze your transcript and mark completed courses. 
              Your transcript data is processed locally and not stored.
            </p>
          </div>
        </Card>
      )}

      {/* Overall Progress */}
      <StatsGrid stats={statsData} />

      {/* Progress Bar */}
      <Card title="Degree Completion Progress">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className={theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}>Progress to Graduation</span>
            <span className={`text-2xl font-bold ${theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'}`}>{stats.completionPercentage}%</span>
          </div>
          <div className={`w-full rounded-full h-3 ${theme === 'light' ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
            <div 
              className="h-3 rounded-full transition-all duration-300" 
              style={{ width: `${stats.completionPercentage}%`, background: "#CFB991" }}
            />
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'}>Completed ({stats.totalCompleted})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'}>In Progress ({stats.totalInProgress})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'}>Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className={theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'}>Needed ({stats.totalRemaining})</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Requirements by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Overview */}
        <div className="space-y-4">
          <Card title="Requirements by Category">
            <div className="space-y-3">
              {Object.entries(degreeRequirements).map(([category, data]) => {
                const progress = Math.round(((data.completed + data.inProgress) / data.required) * 100);
                const isSelected = selectedCategory === category;
                
                return (
                  <div 
                    key={category}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-yellow-400 bg-yellow-400/10" 
                        : "border-neutral-800 hover:border-neutral-700"
                    }`}
                    onClick={() => setSelectedCategory(isSelected ? null : category)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-neutral-200">{category}</h3>
                      <Badge>{data.completed + data.inProgress}/{data.required}</Badge>
                    </div>
                    
                    <div className="w-full bg-neutral-800 rounded-full h-2 mb-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%`, background: "#CFB991" }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>{progress}% complete</span>
                      <span>{data.required - data.completed - data.inProgress} remaining</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Course Details */}
        <div className="space-y-4">
          <Card title={selectedCategory ? `${selectedCategory} Details` : "Select a Category"}>
            {selectedCategory ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-neutral-400">
                    {degreeRequirements[selectedCategory]?.completed || 0} of {degreeRequirements[selectedCategory]?.required || 0} completed
                  </span>
                  <PurdueButton 
                    size="small" 
                    variant="secondary"
                    onClick={() => {
                      // Mark all as completed for demo
                      const courses = degreeRequirements[selectedCategory]?.courses || [];
                      const newCompletions = { ...courseCompletions };
                      courses.forEach((course: any) => {
                        if (!newCompletions[course.code]?.completed) {
                          newCompletions[course.code] = {
                            completed: true,
                            grade: "A",
                            semester: "Fall",
                            year: 2024
                          };
                        }
                      });
                      setCourseCompletions(newCompletions);
                    }}
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Mark All Complete
                  </PurdueButton>
                </div>

                {degreeRequirements[selectedCategory]?.courses?.map((course: any) => (
                  <div 
                    key={course.code}
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Completion Checkbox */}
                      <button
                        onClick={() => toggleCourseCompletion(course.code, selectedCategory)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          courseCompletions[course.code]?.completed
                            ? "bg-green-500 border-green-500"
                            : "border-neutral-600 hover:border-neutral-500"
                        }`}
                      >
                        {courseCompletions[course.code]?.completed && (
                          <CheckCircle size={12} className="text-white" />
                        )}
                      </button>
                      
                      {getStatusIcon(course.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-200">{course.code}</span>
                          <span className={`text-xs ${
                            courseCompletions[course.code]?.completed 
                              ? "text-green-400" 
                              : getStatusColor(course.status)
                          }`}>
                            {courseCompletions[course.code]?.completed 
                              ? `✓ Completed (${courseCompletions[course.code]?.grade || "A"})` 
                              : getStatusLabel(course.status)
                            }
                          </span>
                        </div>
                        <div className="text-sm text-neutral-400">{course.title}</div>
                        {courseCompletions[course.code]?.completed && (
                          <div className="text-xs text-neutral-500">
                            {courseCompletions[course.code]?.semester} {courseCompletions[course.code]?.year}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{course.credits} cr</Badge>
                      {courseCompletions[course.code]?.completed && (
                        <Badge variant="green">✓</Badge>
                      )}
                    </div>
                  </div>
                )) || []}
                
                {/* Missing Courses Alert */}
                {(() => {
                  const courses = degreeRequirements[selectedCategory]?.courses || [];
                  const needed = courses.filter((c: any) => !courseCompletions[c.code]?.completed);
                  return needed.length > 0 ? (
                    <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} className="text-red-400" />
                        <span className="text-sm font-medium text-red-300">Missing Courses</span>
                      </div>
                      <p className="text-xs text-red-200 mb-2">
                        You still need to complete {needed.length} course{needed.length > 1 ? 's' : ''} in this category:
                      </p>
                      <ul className="text-xs text-red-200 space-y-1">
                        {needed.slice(0, 3).map((course: any) => (
                          <li key={course.code}>• {course.code} - {course.title}</li>
                        ))}
                        {needed.length > 3 && (
                          <li>• ... and {needed.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 rounded-lg bg-green-900/20 border border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={16} className="text-green-400" />
                        <span className="text-sm font-medium text-green-300">Category Complete!</span>
                      </div>
                      <p className="text-xs text-green-200">
                        You have completed all requirements in this category.
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-neutral-600 mb-4" />
                <h3 className="text-neutral-400 text-lg mb-2">Select a Requirement Category</h3>
                <p className="text-neutral-500 text-sm">Click on a category above to view detailed course requirements and mark completed courses</p>
              </div>
            )}
          </Card>

          {/* Next Steps */}
          <Card title="Recommended Next Steps" right={<Badge>AI</Badge>}>
            <div className="space-y-3">
              {(() => {
                // Calculate next recommended courses
                const allCourses = Object.values(degreeRequirements).flatMap((category: any) => 
                  category.courses || []
                );
                const incomplete = allCourses.filter((course: any) => 
                  !courseCompletions[course.code]?.completed
                );
                const priorityCourse = incomplete[0];
                
                return (
                  <>
                    {priorityCourse ? (
                      <div className="p-3 rounded-lg bg-neutral-950/60 ring-1 ring-neutral-800">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="text-yellow-400" size={16} />
                          <span className="text-sm font-medium text-neutral-200">Priority Course</span>
                        </div>
                        <div className="text-xs text-neutral-400 mb-2">
                          Complete {priorityCourse.code} ({priorityCourse.title}) next
                        </div>
                        <PurdueButton size="small" variant="secondary">
                          Add to Academic Planner
                        </PurdueButton>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-green-950/60 ring-1 ring-green-800">
                        <div className="flex items-center gap-2 mb-1">
                          <GraduationCap className="text-green-400" size={16} />
                          <span className="text-sm font-medium text-green-200">Degree Complete!</span>
                        </div>
                        <div className="text-xs text-green-300">
                          You have completed all degree requirements. Congratulations!
                        </div>
                      </div>
                    )}
                    
                    <div className="p-3 rounded-lg bg-neutral-950/60 ring-1 ring-neutral-800">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="text-green-400" size={16} />
                        <span className="text-sm font-medium text-neutral-200">Progress Status</span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        {incomplete.length === 0 
                          ? "Ready to graduate!" 
                          : `${incomplete.length} course${incomplete.length > 1 ? 's' : ''} remaining`
                        }
                      </div>
                    </div>

                    <PurdueButton className="w-full">
                      <Calculator size={16} className="mr-2" />
                      View Academic Planner
                    </PurdueButton>
                  </>
                );
              })()}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="space-y-2">
              <PurdueButton 
                variant="secondary" 
                className="w-full justify-start"
                onClick={() => {
                  // Reset all completions
                  setCourseCompletions({});
                }}
              >
                <RefreshCw size={16} className="mr-2" />
                Reset All Completions
              </PurdueButton>
              <PurdueButton 
                variant="secondary" 
                className="w-full justify-start"
                onClick={() => setShowTranscriptUpload(!showTranscriptUpload)}
              >
                <Upload size={16} className="mr-2" />
                {showTranscriptUpload ? "Hide" : "Show"} Transcript Upload
              </PurdueButton>
              <PurdueButton 
                variant="secondary" 
                className="w-full justify-start"
              >
                <Filter size={16} className="mr-2" />
                Filter by Status
              </PurdueButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}