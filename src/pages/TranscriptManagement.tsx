import React, { useState } from 'react';
import { 
  PageHeader, 
  Card, 
  Badge, 
  PurdueButton, 
  StatsGrid
} from "@/components/PurdueUI";
import { TranscriptUploader } from '@/components/TranscriptUploader';
import { CourseVerificationTable } from '@/components/CourseVerificationTable';
import { useAcademicPlan } from '@/contexts/AcademicPlanContext';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  BarChart3,
  Calendar,
  GraduationCap,
  TrendingUp
} from 'lucide-react';

export default function TranscriptManagement() {
  const [activeTab, setActiveTab] = useState('upload');
  const { transcriptData } = useAcademicPlan();
  const navigate = useNavigate();

  const handleUploadComplete = () => {
    setActiveTab('verification');
  };

  const handleTransferToPlanner = () => {
    navigate('/planner');
  };

  const renderUploadSection = () => (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        <ErrorBoundary>
          <TranscriptUploader onUploadComplete={handleUploadComplete} />
        </ErrorBoundary>
      </div>
      
      {/* Instructions */}
      <Card title="How Transcript Processing Works" subtitle="Powered by OpenAI for accurate course recognition">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-lg border border-neutral-800 bg-neutral-900/30">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(207, 185, 145, 0.1)" }}>
              <Upload className="h-6 w-6" style={{ color: "#CFB991" }} />
            </div>
            <h4 className="font-medium text-neutral-200 mb-2">1. Upload Transcript</h4>
            <p className="text-sm text-neutral-400">
              Upload your official Purdue transcript in PDF format or paste the text directly
            </p>
          </div>
          <div className="text-center p-4 rounded-lg border border-neutral-800 bg-neutral-900/30">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(207, 185, 145, 0.1)" }}>
              <CheckCircle className="h-6 w-6" style={{ color: "#CFB991" }} />
            </div>
            <h4 className="font-medium text-neutral-200 mb-2">2. OpenAI Processing</h4>
            <p className="text-sm text-neutral-400">
              Advanced AI intelligently extracts and matches courses with high accuracy
            </p>
          </div>
          <div className="text-center p-4 rounded-lg border border-neutral-800 bg-neutral-900/30">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(207, 185, 145, 0.1)" }}>
              <Calendar className="h-6 w-6" style={{ color: "#CFB991" }} />
            </div>
            <h4 className="font-medium text-neutral-200 mb-2">3. Academic Planning</h4>
            <p className="text-sm text-neutral-400">
              Verified courses seamlessly integrate into your personalized academic planner
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-neutral-800">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>FERPA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>OpenAI Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span>Intelligent Recognition</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderAcademicHistory = () => {
    if (!transcriptData) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
          <h3 className="text-lg font-medium text-neutral-200 mb-2">No Academic History</h3>
          <p className="text-neutral-400 mb-4">Upload a transcript to view your academic history</p>
          <PurdueButton onClick={() => setActiveTab('upload')}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Transcript
          </PurdueButton>
        </div>
      );
    }

    const allCompletedCourses = Object.values(transcriptData.completedCourses).flatMap(sem => sem.courses);
    const semesterKeys = Object.keys(transcriptData.completedCourses).sort((a, b) => {
      // Sort semesters chronologically
      const semesterA = transcriptData.completedCourses[a];
      const semesterB = transcriptData.completedCourses[b];
      
      if (semesterA.year !== semesterB.year) return semesterA.year - semesterB.year;
      
      const semesterOrder = { fall: 1, spring: 2, summer: 3 };
      return (semesterOrder[semesterA.semester.toLowerCase() as keyof typeof semesterOrder] || 0) - 
             (semesterOrder[semesterB.semester.toLowerCase() as keyof typeof semesterOrder] || 0);
    });

    return (
      <div className="space-y-6">
        {/* Student Info */}
        <Card title="Academic Summary" right={
          <PurdueButton variant="secondary" size="small">
            <Download className="h-4 w-4 mr-2" />
            Export Transcript
          </PurdueButton>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Student:</span>
                <span className="font-medium text-neutral-200">{transcriptData.studentInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Student ID:</span>
                <span className="font-medium text-neutral-200">{transcriptData.studentInfo.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Program:</span>
                <span className="font-medium text-neutral-200">{transcriptData.studentInfo.program}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">College:</span>
                <span className="font-medium text-neutral-200">{transcriptData.studentInfo.college}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Cumulative GPA:</span>
                <span className="font-medium text-lg text-neutral-200">{transcriptData.gpaSummary.cumulativeGPA}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Major GPA:</span>
                <span className="font-medium text-neutral-200">{transcriptData.gpaSummary.majorGPA}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Credits Attempted:</span>
                <span className="font-medium text-neutral-200">{transcriptData.gpaSummary.totalCreditsAttempted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Credits Earned:</span>
                <span className="font-medium text-neutral-200">{transcriptData.gpaSummary.totalCreditsEarned}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Semester History */}
        {semesterKeys.map(semesterKey => {
          const semesterData = transcriptData.completedCourses[semesterKey];
          const courses = semesterData.courses;

          return (
            <Card key={semesterKey} title={
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-neutral-400" />
                <span>{semesterData.semester} {semesterData.year}</span>
                {semesterData.semester === 'Fall' && semesterData.year === 2024 && (
                  <Badge>Current</Badge>
                )}
                <Badge>{semesterData.academicStanding}</Badge>
              </div>
            } right={
              <div className="text-right">
                <div className="text-sm text-neutral-400">Semester GPA</div>
                <div className="text-lg font-semibold text-neutral-200">{semesterData.semesterGpa.toFixed(2)}</div>
              </div>
            }>

              <div className="text-sm text-neutral-400 mb-4">
                {semesterData.semesterCredits} credit hours • {courses.length} courses
              </div>

              <div className="space-y-3">
                {courses.map(course => (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-800">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-neutral-200">{course.subject} {course.courseNumber}</span>
                        {course.matchStatus === 'verified' && (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        )}
                        {course.matchStatus === 'probable' && (
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                        )}
                        {course.repeatIndicator && (
                          <Badge className="text-xs">
                            {course.repeatIndicator}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400">{course.courseTitle}</p>
                      {course.classification && (
                        <Badge className="text-xs mt-1">
                          {course.classification.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-neutral-400">{course.credits} cr</span>
                      <Badge>
                        {course.grade}
                      </Badge>
                      <span className="font-medium text-neutral-200">{course.qualityPoints.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Semester Summary</span>
                  <span className="font-medium text-neutral-200">
                    Credits: {semesterData.semesterCredits} | GPA: {semesterData.semesterGpa.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}

        {/* In-Progress Courses */}
        {Array.isArray(transcriptData.coursesInProgress) && transcriptData.coursesInProgress.length > 0 && (
          <Card title={
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-neutral-400" />
              <span>Courses in Progress</span>
              <Badge>In Progress</Badge>
            </div>
          }>

            <div className="space-y-3">
              {transcriptData.coursesInProgress.map(course => (
                <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-600 bg-blue-900/10">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-neutral-200">{course.subject} {course.courseNumber}</span>
                      {course.matchStatus === 'verified' && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                      {course.matchStatus === 'probable' && (
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                      )}
                      <Badge className="text-xs">
                        {course.semester} {course.year}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-400">{course.courseTitle}</p>
                    {course.classification && (
                      <Badge className="text-xs mt-1">
                        {course.classification.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-neutral-400">{course.credits} cr</span>
                    <Badge>In Progress</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Transcript Management" 
        subtitle="Upload, view, and manage your academic transcripts securely"
      />

      {/* Status and Navigation Combined */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            {transcriptData ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-900/20">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-green-200">Transcript Processed Successfully!</div>
                  <div className="text-sm text-green-300/80">
                    {Object.values(transcriptData.completedCourses).flatMap(sem => sem.courses).length + (Array.isArray(transcriptData.coursesInProgress) ? transcriptData.coursesInProgress.length : 0)} courses found and ready for verification
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-800">
                  <Upload className="h-5 w-5 text-neutral-400" />
                </div>
                <div>
                  <div className="font-medium text-neutral-200">Ready to Process Transcript</div>
                  <div className="text-sm text-neutral-400">
                    Upload your Purdue transcript to get started with course verification
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <PurdueButton 
              variant={activeTab === 'upload' ? 'primary' : 'secondary'}
              onClick={() => {
                setActiveTab('upload');
                // Trigger file selection if no transcript data exists
                if (!transcriptData) {
                  setTimeout(() => {
                    document.getElementById('transcript-upload')?.click();
                  }, 100);
                }
              }}
              size="small"
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </PurdueButton>
            <PurdueButton 
              variant={activeTab === 'verification' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('verification')}
              disabled={!transcriptData}
              size="small"
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Verify</span>
            </PurdueButton>
            <PurdueButton 
              variant={activeTab === 'history' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('history')}
              disabled={!transcriptData}
              size="small"
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>History</span>
            </PurdueButton>
          </div>
        </div>
      </Card>

      {/* Tab Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {renderUploadSection()}
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            <Card title="Course Verification" subtitle="Review AI-matched courses and transfer verified courses to your academic planner" right={
              <PurdueButton onClick={handleTransferToPlanner}>
                <Calendar className="h-4 w-4 mr-2" />
                Go to Planner
              </PurdueButton>
            }>
              <CourseVerificationTable onTransferToPlanner={handleTransferToPlanner} />
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <Card title="Academic History" subtitle="Complete semester-by-semester breakdown of your academic record" right={
              transcriptData && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-400">GPA:</span>
                    <span className="font-medium text-neutral-200">{transcriptData.gpaSummary.cumulativeGPA}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GraduationCap className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-400">Credits:</span>
                    <span className="font-medium text-neutral-200">{transcriptData.gpaSummary.totalCreditsEarned}</span>
                  </div>
                </div>
              )
            } />
            {renderAcademicHistory()}
          </div>
        )}
      </div>
    </div>
  );
}