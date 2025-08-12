import React, { useState } from "react";
import { 
  PageHeader, 
  Card, 
  Badge, 
  PurdueButton, 
  StatsGrid,
  ItemCard
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
  Star
} from "lucide-react";

// Sample degree audit data
const degreeRequirements = {
  "Core CS Courses": {
    required: 12,
    completed: 8,
    inProgress: 1,
    courses: [
      { code: "CS 180", title: "Problem Solving and OOP", status: "completed", credits: 4 },
      { code: "CS 240", title: "Programming in C", status: "completed", credits: 4 },
      { code: "CS 251", title: "Data Structures", status: "in-progress", credits: 4 },
      { code: "CS 252", title: "Systems Programming", status: "planned", credits: 4 },
      { code: "CS 307", title: "Software Engineering", status: "needed", credits: 3 },
      { code: "CS 348", title: "Information Systems", status: "needed", credits: 3 },
    ]
  },
  "Mathematics": {
    required: 6,
    completed: 5,
    inProgress: 1,
    courses: [
      { code: "MA 161", title: "Plane Analytic Geometry", status: "completed", credits: 5 },
      { code: "MA 162", title: "Plane Analytic Geometry", status: "completed", credits: 5 },
      { code: "MA 265", title: "Linear Algebra", status: "in-progress", credits: 3 },
      { code: "STAT 350", title: "Intro to Statistics", status: "needed", credits: 3 },
    ]
  },
  "Science": {
    required: 4,
    completed: 2,
    inProgress: 1,
    courses: [
      { code: "PHYS 172", title: "Modern Mechanics", status: "completed", credits: 4 },
      { code: "PHYS 272", title: "Electric & Magnetic Interactions", status: "in-progress", credits: 4 },
      { code: "CHEM 115", title: "General Chemistry", status: "needed", credits: 4 },
    ]
  },
  "General Education": {
    required: 8,
    completed: 6,
    inProgress: 0,
    courses: [
      { code: "ENGL 106", title: "First-Year Composition", status: "completed", credits: 4 },
      { code: "COM 114", title: "Fundamentals of Speech", status: "completed", credits: 3 },
      { code: "ECON 251", title: "Microeconomics", status: "needed", credits: 3 },
      { code: "PHIL 110", title: "Introduction to Philosophy", status: "needed", credits: 3 },
    ]
  },
  "Technical Electives": {
    required: 5,
    completed: 1,
    inProgress: 1,
    courses: [
      { code: "CS 381", title: "Analysis of Algorithms", status: "completed", credits: 3 },
      { code: "CS 373", title: "Data Structures and Algorithms", status: "in-progress", credits: 3 },
      { code: "CS 380", title: "Introduction to ML", status: "planned", credits: 3 },
    ]
  }
};

export default function DegreeAudit() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Calculate overall statistics
  const totalRequired = Object.values(degreeRequirements).reduce((sum, cat) => sum + cat.required, 0);
  const totalCompleted = Object.values(degreeRequirements).reduce((sum, cat) => sum + cat.completed, 0);
  const totalInProgress = Object.values(degreeRequirements).reduce((sum, cat) => sum + cat.inProgress, 0);
  const totalRemaining = totalRequired - totalCompleted - totalInProgress;
  const completionPercentage = Math.round((totalCompleted / totalRequired) * 100);

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

  const stats = [
    { label: "Overall Progress", value: `${completionPercentage}%`, sublabel: `${totalCompleted}/${totalRequired} courses` },
    { label: "Completed", value: totalCompleted, sublabel: "courses finished" },
    { label: "In Progress", value: totalInProgress, sublabel: "current semester" },
    { label: "Remaining", value: totalRemaining, sublabel: "courses needed" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Degree Audit" 
        subtitle="Track your progress toward graduation requirements"
        actions={
          <div className="flex gap-2">
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

      {/* Overall Progress */}
      <StatsGrid stats={stats} />

      {/* Progress Bar */}
      <Card title="Degree Completion Progress">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-neutral-300">Progress to Graduation</span>
            <span className="text-2xl font-bold text-neutral-100">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-3">
            <div 
              className="h-3 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%`, background: "#CFB991" }}
            />
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-neutral-400">Completed ({totalCompleted})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span className="text-neutral-400">In Progress ({totalInProgress})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span className="text-neutral-400">Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-neutral-400">Needed ({totalRemaining})</span>
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
                {degreeRequirements[selectedCategory as keyof typeof degreeRequirements].courses.map((course) => (
                  <div 
                    key={course.code}
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(course.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-200">{course.code}</span>
                          <span className={`text-xs ${getStatusColor(course.status)}`}>
                            {getStatusLabel(course.status)}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-400">{course.title}</div>
                      </div>
                    </div>
                    <Badge>{course.credits} cr</Badge>
                  </div>
                ))}
                
                {degreeRequirements[selectedCategory as keyof typeof degreeRequirements].courses
                  .filter(c => c.status === "needed").length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-red-400" />
                      <span className="text-sm font-medium text-red-300">Action Required</span>
                    </div>
                    <p className="text-xs text-red-200">
                      You need to complete the remaining courses in this category to meet graduation requirements.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-neutral-600 mb-4" />
                <h3 className="text-neutral-400 text-lg mb-2">Select a Requirement Category</h3>
                <p className="text-neutral-500 text-sm">Click on a category above to view detailed course requirements</p>
              </div>
            )}
          </Card>

          {/* Next Steps */}
          <Card title="Recommended Next Steps" right={<Badge>AI</Badge>}>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-neutral-950/60 ring-1 ring-neutral-800">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="text-yellow-400" size={16} />
                  <span className="text-sm font-medium text-neutral-200">Priority Course</span>
                </div>
                <div className="text-xs text-neutral-400 mb-2">
                  Complete CS 252 (Systems Programming) to unlock advanced CS courses
                </div>
                <PurdueButton size="small" variant="secondary">Add to Next Semester</PurdueButton>
              </div>
              
              <div className="p-3 rounded-lg bg-neutral-950/60 ring-1 ring-neutral-800">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="text-green-400" size={16} />
                  <span className="text-sm font-medium text-neutral-200">On Track</span>
                </div>
                <div className="text-xs text-neutral-400">
                  You're progressing well! Expected graduation: Spring 2026
                </div>
              </div>

              <PurdueButton className="w-full">
                <Calculator size={16} className="mr-2" />
                View Detailed Graduation Plan
              </PurdueButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}