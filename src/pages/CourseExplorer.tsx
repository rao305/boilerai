import React, { useState, useMemo } from "react";
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
import { 
  Search, 
  Filter, 
  BookOpen, 
  Users, 
  Calendar,
  Plus,
  Grid3X3,
  List,
  Star
} from "lucide-react";
import allCourses from "@/data/purdue_courses_complete.json";

interface Course {
  department_code: string;
  course_number: string;
  full_course_code: string;
  course_title: string;
  credit_hours: string;
  description: string | null;
  prerequisites: string | null;
  corequisites: string | null;
  restrictions: string | null;
  instructor: string | null;
  term: string;
  course_level: string;
  url: string;
}

const CourseExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState({
    department: "",
    credits: "",
    level: "",
  });
  const [sortOption, setSortOption] = useState("relevance");

  const departments = useMemo(() => {
    const uniqueDepartments = [...new Set(allCourses.map(course => course.department_code))];
    return uniqueDepartments.sort().map(dept => ({ value: dept, label: dept }));
  }, []);
  
  const creditOptions = [
    { value: "1", label: "1 Credit" },
    { value: "2", label: "2 Credits" },
    { value: "3", label: "3 Credits" },
    { value: "4", label: "4 Credits" },
    { value: "5+", label: "5+ Credits" },
  ];

  const levelOptions = [
    { value: "1", label: "10000 Level" },
    { value: "2", label: "20000 Level" },
    { value: "3", label: "30000 Level" },
    { value: "4", label: "40000 Level" },
    { value: "5", label: "50000+ Level" },
  ];

  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "course_code", label: "Course Code" },
    { value: "credits_high", label: "Credits (High to Low)" },
    { value: "credits_low", label: "Credits (Low to High)" },
  ];

  const filteredCourses = useMemo(() => {
    let courses = allCourses.filter(course => {
      const searchTermLower = searchTerm.toLowerCase();
      const titleMatch = course.course_title.toLowerCase().includes(searchTermLower);
      const codeMatch = course.full_course_code.toLowerCase().includes(searchTermLower);
      const descriptionMatch = course.description?.toLowerCase().includes(searchTermLower) ?? false;
      
      const departmentMatch = !filters.department || course.department_code === filters.department;
      
      const creditMatch = !filters.credits || (
        filters.credits === '5+' 
          ? parseFloat(course.credit_hours) >= 5
          : parseFloat(course.credit_hours).toString() === filters.credits
      );

      const levelMatch = !filters.level || course.course_number.startsWith(filters.level);

      return (titleMatch || codeMatch || descriptionMatch) && departmentMatch && creditMatch && levelMatch;
    });

    // Apply sorting
    if (sortOption === "course_code") {
      courses.sort((a, b) => a.full_course_code.localeCompare(b.full_course_code));
    } else if (sortOption === "credits_high") {
      courses.sort((a, b) => parseFloat(b.credit_hours) - parseFloat(a.credit_hours));
    } else if (sortOption === "credits_low") {
      courses.sort((a, b) => parseFloat(a.credit_hours) - parseFloat(b.credit_hours));
    }
    
    return courses as Course[];
  }, [searchTerm, filters, sortOption]);

  const handleAddToPlan = (courseId: string) => {
    console.log("Added course to plan:", courseId);
  };

  const stats = [
    { label: "Total Courses", value: allCourses.length.toLocaleString() },
    { label: "Departments", value: departments.length },
    { label: "Filtered Results", value: filteredCourses.length.toLocaleString() },
  ];

  return (
    <div className="h-full w-full p-8 overflow-auto">
      <div className="max-w-none space-y-8">
        <PageHeader 
          title="📚 Course Explorer" 
          subtitle="Discover and explore Purdue University courses • Find your perfect classes"
        />

      {/* Search and Filters */}
      <Card title="Search & Filter">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={16} />
            <PurdueInput
              placeholder="Search courses by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PurdueSelect
              options={departments}
              value={filters.department}
              onChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
              placeholder="All Departments"
            />
            <PurdueSelect
              options={creditOptions}
              value={filters.credits}
              onChange={(value) => setFilters(prev => ({ ...prev, credits: value }))}
              placeholder="Any Credits"
            />
            <PurdueSelect
              options={levelOptions}
              value={filters.level}
              onChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
              placeholder="Any Level"
            />
            <PurdueSelect
              options={sortOptions}
              value={sortOption}
              onChange={setSortOption}
              placeholder="Sort By"
            />
          </div>

          {/* View Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">
              Showing {filteredCourses.length} of {allCourses.length} courses
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">View:</span>
              <div className="flex border border-neutral-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 text-sm ${viewMode === "grid" 
                    ? "bg-neutral-800 text-neutral-100" 
                    : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 text-sm ${viewMode === "list" 
                    ? "bg-neutral-800 text-neutral-100" 
                    : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <StatsGrid stats={stats} />

      {/* Course Results */}
      <Card title="Courses" right={<Badge>{filteredCourses.length} results</Badge>}>
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-neutral-600 mb-4" />
            <h3 className="text-neutral-400 text-lg mb-2">No courses found</h3>
            <p className="text-neutral-500 text-sm">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            viewMode === "grid" 
              ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1"
          }`}>
            {filteredCourses.slice(0, 50).map((course) => (
              <ItemCard
                key={course.full_course_code}
                title={`${course.full_course_code} • ${course.course_title}`}
                subtitle={course.description ? course.description.substring(0, 120) + "..." : "No description available"}
                details={[
                  `Credits: ${course.credit_hours}`,
                  course.instructor ? `Instructor: ${course.instructor}` : "",
                  course.prerequisites ? `Prerequisites: ${course.prerequisites}` : "",
                ].filter(Boolean)}
                badges={[
                  course.department_code,
                  `Level ${course.course_number.charAt(0)}`,
                  `${course.credit_hours} cr`
                ]}
                actions={
                  <PurdueButton 
                    size="small"
                    onClick={() => handleAddToPlan(course.full_course_code)}
                  >
                    <Plus size={14} className="mr-1" />
                    Add to Plan
                  </PurdueButton>
                }
              />
            ))}
          </div>
        )}
        
        {filteredCourses.length > 50 && (
          <div className="mt-6 text-center">
            <PurdueButton variant="secondary">
              Load More Courses ({filteredCourses.length - 50} remaining)
            </PurdueButton>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
};

export default CourseExplorer;