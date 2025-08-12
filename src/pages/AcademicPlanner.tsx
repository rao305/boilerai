import React, { useState } from "react";
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
  Clock
} from "lucide-react";

// Sample course data (replace with real data)
const sampleCourses = {
  "Fall 2024": [
    { id: "cs180", code: "CS 180", title: "Problem Solving and OOP", credits: 4, status: "completed" },
    { id: "ma16100", code: "MA 161", title: "Plane Analytic Geometry", credits: 5, status: "completed" },
    { id: "engl10600", code: "ENGL 106", title: "First-Year Composition", credits: 4, status: "completed" },
  ],
  "Spring 2025": [
    { id: "cs251", code: "CS 251", title: "Data Structures", credits: 4, status: "in-progress" },
    { id: "cs240", code: "CS 240", title: "Programming in C", credits: 4, status: "in-progress" },
    { id: "ma16200", code: "MA 162", title: "Plane Analytic Geometry", credits: 5, status: "in-progress" },
    { id: "phys17200", code: "PHYS 172", title: "Modern Mechanics", credits: 4, status: "in-progress" },
  ],
  "Fall 2025": [
    { id: "cs252", code: "CS 252", title: "Systems Programming", credits: 4, status: "planned" },
    { id: "cs250", code: "CS 250", title: "Computer Architecture", credits: 4, status: "planned" },
    { id: "ma26500", code: "MA 265", title: "Linear Algebra", credits: 3, status: "planned" },
    { id: "stat35000", code: "STAT 350", title: "Intro to Statistics", credits: 3, status: "planned" },
  ],
  "Spring 2026": [
    { id: "cs307", code: "CS 307", title: "Software Engineering", credits: 3, status: "planned" },
    { id: "cs348", code: "CS 348", title: "Information Systems", credits: 3, status: "planned" },
    { id: "ma35100", code: "MA 351", title: "Elementary Linear Algebra", credits: 3, status: "planned" },
  ],
};

const availableCourses = [
  { id: "cs381", code: "CS 381", title: "Intro to Analysis of Algorithms", credits: 3 },
  { id: "cs373", code: "CS 373", title: "Data Structures and Algorithms", credits: 3 },
  { id: "cs380", code: "CS 380", title: "Introduction to Machine Learning", credits: 3 },
  { id: "cs390", code: "CS 390", title: "Competitive Programming", credits: 1 },
];

export default function AcademicPlanner() {
  const { user } = useAuth();
  const { plannedCourses, setPlannedCourses } = useAcademicPlan();
  const [selectedSemester, setSelectedSemester] = useState("Spring 2025");
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const semesters = Object.keys(sampleCourses);
  const semesterOptions = semesters.map(sem => ({ value: sem, label: sem }));

  const getTotalCredits = (semester: string) => {
    return sampleCourses[semester as keyof typeof sampleCourses]?.reduce((total, course) => total + course.credits, 0) || 0;
  };

  const getAllStats = () => {
    const allCourses = Object.values(sampleCourses).flat();
    const completedCourses = allCourses.filter(c => c.status === "completed");
    const totalCredits = allCourses.reduce((total, course) => total + course.credits, 0);
    const completedCredits = completedCourses.reduce((total, course) => total + course.credits, 0);
    
    return [
      { label: "Total Credits Planned", value: totalCredits },
      { label: "Credits Completed", value: completedCredits },
      { label: "Remaining Credits", value: Math.max(0, 128 - totalCredits), sublabel: "to graduation" },
      { label: "Current GPA", value: "3.71" },
    ];
  };

  const handleAIAssistance = () => {
    // TODO: Integrate with AI service
    console.log("AI assistance requested");
  };

  const handleAddCourse = (courseId: string) => {
    console.log("Add course to", selectedSemester, ":", courseId);
  };

  const handleRemoveCourse = (semesterId: string, courseId: string) => {
    console.log("Remove course", courseId, "from", semesterId);
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
          subtitle="Plan your academic journey and track your progress"
          actions={
            <div className="flex gap-3">
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

      {/* Overall Progress */}
      <StatsGrid stats={getAllStats()} />

      {/* Semester Planning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester Cards */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Semester Plan" right={
            <div className="flex items-center gap-2">
              <PurdueButton
                variant={isEditMode ? "primary" : "secondary"}
                size="small"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Edit size={14} className="mr-1" />
                {isEditMode ? "Save Changes" : "Edit Mode"}
              </PurdueButton>
            </div>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {semesters.map((semester) => (
                <div 
                  key={semester}
                  className="rounded-2xl bg-neutral-950/60 p-4 ring-1 ring-neutral-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-neutral-200">{semester}</h3>
                    <Badge>{getTotalCredits(semester)} credits</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {sampleCourses[semester as keyof typeof sampleCourses].map((course) => (
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
                      <button className="w-full p-2 border-2 border-dashed border-neutral-700 rounded-lg text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors">
                        <Plus size={16} className="inline mr-1" />
                        Add Course
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Course Library */}
          <Card title="Course Library">
            <div className="space-y-3">
              <PurdueInput
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <PurdueSelect
                options={semesterOptions}
                value={selectedSemester}
                onChange={setSelectedSemester}
                placeholder="Select semester to add to"
              />
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableCourses
                  .filter(course => 
                    course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    course.title.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((course) => (
                    <div 
                      key={course.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-neutral-800"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-neutral-200">{course.code}</div>
                        <div className="text-xs text-neutral-400">{course.title}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">{course.credits}cr</span>
                        <PurdueButton 
                          size="small" 
                          onClick={() => handleAddCourse(course.id)}
                        >
                          <Plus size={12} />
                        </PurdueButton>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          {/* AI Suggestions */}
          <Card title="AI Recommendations" right={<Badge>AI</Badge>}>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-neutral-950/60 ring-1 ring-neutral-800">
                <div className="text-sm font-medium text-neutral-200 mb-1">Optimize Schedule</div>
                <div className="text-xs text-neutral-400 mb-2">Consider moving CS 307 to Fall 2025 for better prerequisite flow</div>
                <PurdueButton size="small" variant="secondary">Apply Suggestion</PurdueButton>
              </div>
              
              <div className="p-3 rounded-lg bg-neutral-950/60 ring-1 ring-neutral-800">
                <div className="text-sm font-medium text-neutral-200 mb-1">Course Recommendation</div>
                <div className="text-xs text-neutral-400 mb-2">CS 381 (Algorithms) would complement your current path</div>
                <PurdueButton size="small" variant="secondary">Add to Plan</PurdueButton>
              </div>

              <PurdueButton onClick={handleAIAssistance} className="w-full">
                <Brain size={16} className="mr-2" />
                Get More Suggestions
              </PurdueButton>
            </div>
          </Card>

          {/* Progress Summary */}
          <Card title="Graduation Progress">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Progress to Degree</span>
                <span className="text-neutral-200">72%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2">
                <div 
                  className="h-2 rounded-full" 
                  style={{ width: "72%", background: "#CFB991" }}
                />
              </div>
              <div className="text-xs text-neutral-500">
                Expected graduation: Spring 2026
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
  );
}