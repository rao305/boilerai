import React, { useState } from 'react';
import { Card, PurdueButton, PurdueInput, Badge } from '@/components/PurdueUI';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Edit3, 
  Save, 
  X,
  Download,
  Upload
} from 'lucide-react';
import { useAcademicPlan } from '@/contexts/AcademicPlanContext';
import { useToast } from '@/hooks/use-toast';

interface CourseVerificationTableProps {
  onTransferToPlanner?: (selectedCourses: any[]) => void;
}

export const CourseVerificationTable: React.FC<CourseVerificationTableProps> = ({
  onTransferToPlanner
}) => {
  const { transcriptData, updateParsedCourse, verifyCourse, transferCoursesToPlanner, getAllTranscriptCourses } = useAcademicPlan();
  const { toast } = useToast();
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<any>({});

  if (!transcriptData) {
    return (
      <Card title="Course Verification">
        <div className="text-center text-neutral-400 p-2">
          <p>No transcript data available. Please upload a transcript first.</p>
        </div>
      </Card>
    );
  }

  // Filter out invalid "in progression" entries that aren't real courses
  const allCourses = getAllTranscriptCourses().filter(course => {
    // Exclude entries that are just semester headers or "in progression" text
    const isInvalidEntry = 
      !course.courseCode || 
      course.courseCode.toLowerCase().includes('in progress') ||
      course.courseCode.toLowerCase().includes('progression') ||
      course.courseTitle?.toLowerCase().includes('in progress') ||
      course.courseTitle?.toLowerCase().includes('progression') ||
      // Check if it's just a semester name (e.g., "Summer 2025", "Fall 2025")
      /^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseCode || '') ||
      /^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseTitle || '');
    
    return !isInvalidEntry;
  });
  
  const completedCourses = Object.values(transcriptData.completedCourses).flatMap(sem => sem.courses);
  const inProgressCoursesArray = Array.isArray(transcriptData.coursesInProgress) 
    ? transcriptData.coursesInProgress 
    : [];
  const inProgressCourses = inProgressCoursesArray.filter(course => {
    // Apply same filtering to in-progress courses
    const isInvalidEntry = 
      !course.courseCode || 
      course.courseCode.toLowerCase().includes('in progress') ||
      course.courseCode.toLowerCase().includes('progression') ||
      course.courseTitle?.toLowerCase().includes('in progress') ||
      course.courseTitle?.toLowerCase().includes('progression') ||
      /^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseCode || '') ||
      /^(Fall|Spring|Summer|Winter)\s+\d{4}$/i.test(course.courseTitle || '');
    
    return !isInvalidEntry;
  });
  
  const verifiedCourses = allCourses.filter(course => course.verified);
  const unverifiedCourses = allCourses.filter(course => !course.verified);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'probable':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unrecognized':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, confidence: number) => {
    const variant = status === 'verified' ? 'default' : status === 'probable' ? 'secondary' : 'destructive';
    const label = status === 'verified' ? 'Verified' : 
                  status === 'probable' ? `Probable (${Math.round(confidence * 100)}%)` : 
                  'Unrecognized';
    
    return <Badge>{label}</Badge>;
  };

  const getClassificationBadge = (classification?: string) => {
    if (!classification) return null;
    
    const classificationColors = {
      foundation: 'bg-blue-500',
      math_requirement: 'bg-purple-500',
      general_education: 'bg-green-500',
      elective: 'bg-gray-500',
      unclassified: 'bg-orange-500'
    };

    const classificationLabels = {
      foundation: 'Foundation',
      math_requirement: 'Math Req',
      general_education: 'Gen Ed',
      elective: 'Elective',
      unclassified: 'Unclassified'
    };

    return (
      <Badge 
        variant="outline" 
        className={`${classificationColors[classification as keyof typeof classificationColors]} text-white border-0 text-xs`}
      >
        {classificationLabels[classification as keyof typeof classificationLabels]}
      </Badge>
    );
  };

  const getGradeBadge = (grade: string) => {
    if (!grade || grade === 'IP' || grade === 'In Progress') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-neutral-800 text-neutral-300 rounded border border-neutral-700">
          In Progress
        </span>
      );
    }
    
    // Clean the grade - remove any suffixes and normalize
    const cleanGrade = grade.replace(/[^A-F+-]/g, '').trim();
    if (!cleanGrade) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-neutral-800 text-neutral-400 rounded border border-neutral-700">
          —
        </span>
      );
    }
    
    // Simple styling without background colors - just text color and border
    const getGradeStyle = (grade: string) => {
      if (['A+', 'A', 'A-'].includes(grade)) return 'text-green-400 border-green-600';
      if (['B+', 'B', 'B-'].includes(grade)) return 'text-blue-400 border-blue-600';
      if (['C+', 'C', 'C-'].includes(grade)) return 'text-yellow-400 border-yellow-600';
      if (['D+', 'D', 'D-'].includes(grade)) return 'text-orange-400 border-orange-600';
      if (grade === 'F') return 'text-red-400 border-red-600';
      return 'text-neutral-300 border-neutral-600';
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium bg-transparent rounded border ${getGradeStyle(cleanGrade)}`}>
        {cleanGrade}
      </span>
    );
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course.id);
    setEditForm(course);
  };

  const handleSaveEdit = () => {
    if (editingCourse && editForm) {
      updateParsedCourse(editingCourse, editForm);
      setEditingCourse(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setEditForm({});
  };

  const handleVerifyCourse = (courseId: string, verified: boolean) => {
    verifyCourse(courseId, verified);
  };

  const handleSelectCourse = (courseId: string, selected: boolean) => {
    if (selected) {
      setSelectedCourses(prev => [...prev, courseId]);
    } else {
      setSelectedCourses(prev => prev.filter(id => id !== courseId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedCourses(allCourses.map(course => course.id));
    } else {
      setSelectedCourses([]);
    }
  };

  const handleTransferSelected = () => {
    const coursesToTransfer = allCourses.filter(course => 
      selectedCourses.includes(course.id)
    );
    transferCoursesToPlanner(coursesToTransfer);
    
    // Show success message
    console.log('✅ Transferred', coursesToTransfer.length, 'courses to Academic Planner');
    
    toast({
      title: "Courses Transferred!",
      description: `${coursesToTransfer.length} courses have been added to your Academic Planner.`,
    });
    
    if (onTransferToPlanner) {
      onTransferToPlanner(coursesToTransfer);
    }
    
    // Clear selection after transfer
    setSelectedCourses([]);
  };

  const handleSendToAcademicPlanner = () => {
    // Only transfer verified courses
    const verifiedCoursesToTransfer = allCourses.filter(course => 
      course.verified || course.matchStatus === 'verified'
    );
    
    if (verifiedCoursesToTransfer.length === 0) {
      toast({
        title: "No Verified Courses",
        description: "Please verify some courses before sending to Academic Planner.",
      });
      return;
    }
    
    transferCoursesToPlanner(verifiedCoursesToTransfer);
    
    console.log('✅ Sent', verifiedCoursesToTransfer.length, 'verified courses to Academic Planner');
    
    toast({
      title: "Courses Sent to Academic Planner!",
      description: `${verifiedCoursesToTransfer.length} verified courses have been added to your Academic Planner. You can now view them in the planner tab.`,
    });
    
    if (onTransferToPlanner) {
      onTransferToPlanner(verifiedCoursesToTransfer);
    }
  };

  const renderCourseRow = (course: any) => {
    const isEditing = editingCourse === course.id;
    const isSelected = selectedCourses.includes(course.id);
    const isInProgress = course.status === 'in_progress';

    return (
      <tr key={course.id} className={isSelected ? 'bg-neutral-950/40' : ''}>
        <td className="p-3 align-top">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleSelectCourse(course.id, e.target.checked)}
          />
        </td>
        <td className="p-3 align-top">
          <div className="flex items-center space-x-2">
            {getStatusIcon(course.matchStatus)}
            {getStatusBadge(course.matchStatus, course.matchConfidence)}
            {isInProgress && <Badge className="text-xs">In Progress</Badge>}
          </div>
        </td>
        <td className="p-3 align-top">
          {isEditing ? (
            <div className="space-y-1">
              <PurdueInput
                value={editForm.subject || ''}
                onChange={(e) => setEditForm((prev: any) => ({ ...prev, subject: e.target.value }))}
                className="w-16 text-xs"
                placeholder="CS"
              />
              <PurdueInput
                value={editForm.courseNumber || ''}
                onChange={(e) => setEditForm((prev: any) => ({ ...prev, courseNumber: e.target.value }))}
                className="w-20 text-xs"
                placeholder="18000"
              />
            </div>
          ) : (
            <div>
              <span className="font-medium text-neutral-200">
                {(course.subject || '').replace(/[^A-Z]/g, '')} {(course.courseNumber || '').replace(/[^0-9]/g, '')}
              </span>
              {course.repeatIndicator && (
                <Badge className="ml-1 text-xs bg-neutral-700 text-neutral-300">{course.repeatIndicator}</Badge>
              )}
            </div>
          )}
        </td>
        <td className="p-3 align-top">
          {isEditing ? (
            <PurdueInput
              value={editForm.courseTitle || ''}
              onChange={(e) => setEditForm((prev: any) => ({ ...prev, courseTitle: e.target.value }))}
              className="min-w-48"
            />
          ) : (
            <div>
              <span className="text-neutral-200">
                {course.courseTitle?.replace(/\s+(IB|ID|IW|IA|IC|IE|II|III|IV)$/, '').trim() || 'Unknown Course'}
              </span>
              {course.purdueCourseMatch && course.purdueCourseMatch !== course.courseCode && (
                <div className="text-xs text-neutral-400 mt-1">
                  Matches: {course.purdueCourseMatch}
                </div>
              )}
            </div>
          )}
        </td>
        <td className="p-3 align-top">
          {isEditing ? (
            <PurdueInput
              type="number"
              value={editForm.credits || ''}
              onChange={(e) => setEditForm((prev: any) => ({ ...prev, credits: parseFloat(e.target.value) }))}
              className="w-16"
            />
          ) : (
            <span className="text-neutral-300">{course.credits}</span>
          )}
        </td>
        <td className="p-3 align-top">
          {isEditing ? (
            <select
              value={editForm.grade || ''}
              onChange={(e) => setEditForm((prev: any) => ({ ...prev, grade: e.target.value }))}
              className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-200"
            >
              {['', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'W', 'I', 'P', 'S', 'U'].map(grade => (
                <option key={grade} value={grade}>{grade || '—'}</option>
              ))}
            </select>
          ) : (
            getGradeBadge(course.grade)
          )}
        </td>
        <td className="p-3 align-top">
          <span className="text-sm text-neutral-300">{course.semester} {course.year}</span>
        </td>
        <td className="p-3 align-top">
          <div className="flex flex-col space-y-1">
            <span className="font-medium text-neutral-200">{course.qualityPoints?.toFixed(1) || '0.0'}</span>
            {getClassificationBadge(course.classification)}
          </div>
        </td>
        <td className="p-3 align-top">
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <PurdueButton size="small" onClick={handleSaveEdit}>
                  <Save className="h-3 w-3" />
                </PurdueButton>
                <PurdueButton size="small" variant="secondary" onClick={handleCancelEdit}>
                  <X className="h-3 w-3" />
                </PurdueButton>
              </>
            ) : (
              <>
                <PurdueButton 
                  size="small" 
                  variant="ghost" 
                  onClick={() => handleEditCourse(course)}
                >
                  <Edit3 className="h-3 w-3" />
                </PurdueButton>
                {!course.verified && (
                  <PurdueButton
                    size="small"
                    variant="secondary"
                    onClick={() => handleVerifyCourse(course.id, true)}
                  >
                    Verify
                  </PurdueButton>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card title="Total Courses">
          <div className="text-2xl font-bold text-neutral-100">{allCourses.length}</div>
          <div className="text-xs text-neutral-500">
            {completedCourses.length} completed, {inProgressCourses.length} in progress
          </div>
        </Card>
        <Card title="Verified">
          <div className="text-2xl font-bold text-green-400">{verifiedCourses.length}</div>
        </Card>
        <Card title="Need Review">
          <div className="text-2xl font-bold text-yellow-400">{unverifiedCourses.length}</div>
        </Card>
        <Card title="Cumulative GPA">
          <div className="text-2xl font-bold text-neutral-100">{transcriptData.gpaSummary.cumulativeGPA}</div>
        </Card>
        <Card title="Major GPA">
          <div className="text-2xl font-bold text-neutral-100">{transcriptData.gpaSummary.majorGPA}</div>
        </Card>
      </div>

      <Card title="Course Verification" right={
        <div className="flex items-center gap-2">
          <PurdueButton size="small" variant="secondary" onClick={() => handleSelectAll(selectedCourses.length !== allCourses.length)}>
            {selectedCourses.length === allCourses.length ? 'Deselect All' : 'Select All'}
          </PurdueButton>
          {selectedCourses.length > 0 && (
            <PurdueButton size="small" onClick={handleTransferSelected}>
              <Upload className="h-4 w-4 mr-2" />
              Transfer ({selectedCourses.length})
            </PurdueButton>
          )}
          <PurdueButton size="small" onClick={handleSendToAcademicPlanner}>
            <Upload className="h-4 w-4 mr-2" />
            Send to Academic Planner
          </PurdueButton>
          <PurdueButton size="small" variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </PurdueButton>
        </div>
      }>
        <div className="overflow-x-auto rounded-xl ring-1 ring-neutral-800">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr>
                <th className="p-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedCourses.length === allCourses.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="p-3">Status</th>
                <th className="p-3">Course</th>
                <th className="p-3">Title</th>
                <th className="p-3">Credits</th>
                <th className="p-3">Grade</th>
                <th className="p-3">Semester</th>
                <th className="p-3">Points & Type</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allCourses.map(renderCourseRow)}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Academic Summary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="font-medium text-neutral-200 mb-2">GPA Breakdown</div>
            <div className="space-y-2 text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-400">Cumulative GPA:</span>
                <span className="font-medium">{transcriptData.gpaSummary.cumulativeGPA}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Major GPA:</span>
                <span className="font-medium">{transcriptData.gpaSummary.majorGPA}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium text-neutral-200 mb-2">Credit Summary</div>
            <div className="space-y-2 text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-400">Credits Attempted:</span>
                <span className="font-medium">{transcriptData.gpaSummary.totalCreditsAttempted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Credits Earned:</span>
                <span className="font-medium">{transcriptData.gpaSummary.totalCreditsEarned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Quality Points:</span>
                <span className="font-medium">{transcriptData.gpaSummary.totalQualityPoints.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium text-neutral-200 mb-2">Student Information</div>
            <div className="space-y-2 text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-400">Program:</span>
                <span className="font-medium text-sm">{transcriptData.studentInfo.program}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">College:</span>
                <span className="font-medium text-sm">{transcriptData.studentInfo.college}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Processed:</span>
                <span className="font-medium text-sm">{transcriptData.uploadDate ? new Date(transcriptData.uploadDate).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}; 