import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMicrosoftAuth } from "@/contexts/MicrosoftAuthContext";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  FileUp,
  Brain,
  BookOpen,
  ShieldCheck,
  MessageCircle,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

// Purdue palette
const PURDUE_GOLD = "#CFB991";

// Generate GPA data from actual transcript - no fallback dummy data
const getSemesterGpaData = (transcriptData: any) => {
  if (transcriptData?.completedCourses && Object.keys(transcriptData.completedCourses).length > 0) {
    return Object.values(transcriptData.completedCourses)
      .map((semester: any) => ({
        term: `${semester.semester.charAt(0)}${String(semester.year).slice(-2)}`,
        gpa: Number(semester.semesterGpa.toFixed(2))
      }))
      .sort((a, b) => {
        const aYear = parseInt(`20${a.term.slice(1)}`);
        const bYear = parseInt(`20${b.term.slice(1)}`);
        const aSeason = a.term.charAt(0) === 'F' ? 1 : 0; // Fall comes after Spring
        const bSeason = b.term.charAt(0) === 'F' ? 1 : 0;
        
        return aYear !== bYear ? aYear - bYear : aSeason - bSeason;
      });
  }
  
  // Return empty array if no real transcript data - no fake data
  return [];
};

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${className}`}
      style={{ borderColor: PURDUE_GOLD, color: PURDUE_GOLD }}
    >
      {children}
    </span>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <div className={`rounded-2xl shadow-lg p-6 ring-1 ${
      theme === 'light' 
        ? 'bg-white ring-neutral-200' 
        : 'bg-neutral-900/70 ring-neutral-800'
    }`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-base font-semibold tracking-wide ${
          theme === 'light' ? 'text-neutral-800' : 'text-neutral-200'
        }`}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { user: microsoftUser } = useMicrosoftAuth();
  const { getCurrentSemesterCourses, getCurrentSemesterCredits, transcriptData } = useAcademicPlan();
  const { theme, toggleTheme } = useTheme();
  const [userName, setUserName] = useState("User");
  
  // Check if user is developer (for settings shortcut)
  const isDeveloper = user?.email?.includes('dev') || user?.email?.includes('admin');

  useEffect(() => {
    console.log('🐛 Dashboard user data:', { 
      microsoftUser: microsoftUser?.name, 
      user: user?.name, 
      transcript: transcriptData?.studentInfo?.name 
    });
    
    // Check Microsoft user first (most common case)
    if (microsoftUser?.name) {
      const firstName = microsoftUser.name.split(' ')[0];
      console.log('✅ Using Microsoft user:', firstName);
      setUserName(firstName);
    } 
    // Then check regular auth user
    else if (user?.name) {
      const firstName = user.name.split(' ')[0];
      console.log('✅ Using regular user:', firstName);
      setUserName(firstName);
    } 
    // Finally check transcript data
    else if (transcriptData?.studentInfo?.name) {
      const firstName = transcriptData.studentInfo.name.split(' ')[0];
      console.log('✅ Using transcript user:', firstName);
      setUserName(firstName);
    } else {
      console.log('❌ No user name found, using default');
    }
  }, [microsoftUser, user, transcriptData]);

  const currentCourses = getCurrentSemesterCourses();
  const currentCredits = getCurrentSemesterCredits();
  const gpaData = getSemesterGpaData(transcriptData);

  const handleAskAI = (question: string) => {
    console.log("AI Question:", question);
  };

  return (
    <div className={`h-full w-full p-8 overflow-auto ${
      theme === 'light' ? 'bg-neutral-50' : 'bg-neutral-950'
    }`}>
      <div className="max-w-none">

        {/* Enhanced Header with Controls */}
        <div className="mb-8">
          <div className={`rounded-2xl shadow-lg p-8 ring-2 ${
            theme === 'light' 
              ? 'bg-gradient-to-r from-amber-50 to-yellow-50 ring-yellow-200'
              : 'bg-gradient-to-r from-neutral-900/70 to-neutral-800/70 ring-yellow-600/30'
          }`} style={{ 
            background: theme === 'light' 
              ? 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)'
              : undefined 
          }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className={`text-3xl font-bold mb-4 ${
                  theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
                }`} style={{ 
                  color: theme === 'light' ? '#000000' : undefined,
                  textShadow: theme === 'light' ? '0 1px 2px rgba(0,0,0,0.1)' : undefined 
                }}>
                  Hello, {userName}! Welcome back to <span style={{ color: '#CFB991' }}>Boiler AI</span> 👋
                </h1>
                <div className={`flex flex-wrap gap-6 text-base ${
                  theme === 'light' ? 'text-neutral-600' : 'text-neutral-300'
                }`}>
                  <span>{transcriptData?.studentInfo?.program || 'Program not loaded'} • {transcriptData?.studentInfo?.college || 'College not loaded'}</span>
                  <span>Current GPA: {transcriptData?.gpaSummary?.cumulativeGPA?.toFixed(2) || 'Upload transcript'}</span>
                  <span>{transcriptData?.gpaSummary?.totalCreditsEarned || '0'} Credits Completed</span>
                  <span>Expected Graduation: {transcriptData ? 'Calculated from transcript' : 'Upload transcript to calculate'}</span>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">

      {/* GPA Progress Chart */}
      <Card title="🎯 Academic Progress" right={<Badge>{transcriptData ? Math.round(((transcriptData.gpaSummary?.totalCreditsEarned || 0) / 128) * 100) : '72'}% complete</Badge>}>
        <div className="space-y-4">
          {/* GPA Trend Visualization */}
          <div className="h-32">
            {gpaData.length > 0 ? (
              <div className="relative h-full">
                <div className="flex items-end justify-between h-full space-x-1">
                  {gpaData.map((semester, index) => (
                    <div key={semester.term} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                        style={{ 
                          height: `${(semester.gpa / 4.0) * 100}%`,
                          backgroundColor: semester.gpa >= 3.5 ? '#22c55e' : semester.gpa >= 3.0 ? PURDUE_GOLD : '#ef4444',
                          minHeight: '8px'
                        }}
                      />
                      <div className={`text-xs mt-1 ${theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {semester.term}
                      </div>
                      <div className={`text-xs font-medium ${theme === 'light' ? 'text-neutral-800' : 'text-neutral-200'}`}>
                        {semester.gpa.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`absolute left-0 top-0 text-xs ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  4.0
                </div>
                <div className={`absolute left-0 bottom-8 text-xs ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  0.0
                </div>
              </div>
            ) : (
              <div className={`h-full flex items-center justify-center rounded-lg ${
                theme === 'light' ? 'bg-neutral-100' : 'bg-neutral-800'
              }`}>
                <div className="text-center">
                  <p className={`text-sm ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    Upload transcript to see GPA progress
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Current Semester GPA Projection */}
          {currentCourses.length > 0 && (
            <div className={`p-3 rounded-lg ${
              theme === 'light' ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-blue-950/30 ring-1 ring-blue-800'
            }`}>
              <div className={`text-sm font-medium mb-1 ${
                theme === 'light' ? 'text-blue-800' : 'text-blue-200'
              }`}>
                Current Semester Projection
              </div>
              <div className={`text-xs ${
                theme === 'light' ? 'text-blue-600' : 'text-blue-300'
              }`}>
                {currentCredits} credits planned • Maintain {transcriptData?.gpaSummary?.cumulativeGPA?.toFixed(2) || '3.71'} GPA
              </div>
            </div>
          )}
        </div>
        <div className={`mt-3 text-sm ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
          GPA trend over recent terms
        </div>
      </Card>


      {/* Current Semester Overview */}
      <Card title={`📅 Current Semester (${currentCredits} credits)`} right={<Badge>In Progress</Badge>}>
        <div className="space-y-2">
          {currentCourses.length > 0 ? (
            currentCourses.map((course, index) => (
              <div key={course.id || index} className={`rounded-xl p-3 ring-1 ${
                theme === 'light'
                  ? 'bg-neutral-50 ring-neutral-200'
                  : 'bg-neutral-950/60 ring-neutral-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    theme === 'light' ? 'text-neutral-800' : 'text-neutral-200'
                  }`}>{course.code}</span>
                  <Badge>{course.credits} cr</Badge>
                </div>
                <div className={`text-sm ${
                  theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
                }`}>{course.title}</div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className={`text-sm mb-3 ${
                theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
              }`}>No courses planned for current semester</p>
              <button className="rounded-xl px-4 py-2 text-sm text-neutral-900" style={{ background: PURDUE_GOLD }}>
                Plan Semester
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Academic Stats */}
      <Card title="📊 Academic Stats">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className={`rounded-xl p-3 ring-1 ${
            theme === 'light'
              ? 'bg-neutral-50 ring-neutral-200'
              : 'bg-neutral-950/60 ring-neutral-800'
          }`}>
            <div className={`text-sm ${
              theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
            }`}>Credits Completed</div>
            <div className={`text-xl font-semibold ${
              theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
            }`}>{transcriptData?.gpaSummary?.totalCreditsEarned || '0'}</div>
          </div>
          <div className={`rounded-xl p-3 ring-1 ${
            theme === 'light'
              ? 'bg-neutral-50 ring-neutral-200'
              : 'bg-neutral-950/60 ring-neutral-800'
          }`}>
            <div className={`text-sm ${
              theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
            }`}>Credits Remaining</div>
            <div className={`text-xl font-semibold ${
              theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
            }`}>{transcriptData ? Math.max(0, 128 - (transcriptData.gpaSummary?.totalCreditsEarned || 0)) : '128'}</div>
          </div>
          <div className={`rounded-xl p-3 ring-1 ${
            theme === 'light'
              ? 'bg-neutral-50 ring-neutral-200'
              : 'bg-neutral-950/60 ring-neutral-800'
          }`}>
            <div className={`text-sm ${
              theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
            }`}>Degree Progress</div>
            <div className={`text-xl font-semibold ${
              theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
            }`}>{transcriptData ? Math.round(((transcriptData.gpaSummary?.totalCreditsEarned || 0) / 128) * 100) : '0'}%</div>
          </div>
          <div className={`rounded-xl p-3 ring-1 ${
            theme === 'light'
              ? 'bg-neutral-50 ring-neutral-200'
              : 'bg-neutral-950/60 ring-neutral-800'
          }`}>
            <div className={`text-sm ${
              theme === 'light' ? 'text-neutral-600' : 'text-neutral-400'
            }`}>Current GPA</div>
            <div className={`text-xl font-semibold ${
              theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'
            }`}>{transcriptData?.gpaSummary?.cumulativeGPA?.toFixed(2) || 'N/A'}</div>
          </div>
        </div>
      </Card>

      {/* Degree Audit Progress - Dynamic based on actual data */}
      <Card title="🎓 Degree Requirements" right={transcriptData?.studentInfo?.program ? <Badge>{transcriptData.studentInfo.program}</Badge> : <Badge>No Program Data</Badge>}>
        <div className="space-y-3">
          {transcriptData ? (
            <>
              {/* Real Progress based on transcript */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}`}>
                    Courses Completed
                  </span>
                  <span className={`text-xs ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    {Object.values(transcriptData.completedCourses).reduce((total, sem) => total + (sem.courses?.length || 0), 0)} courses
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 ${theme === 'light' ? 'bg-neutral-200' : 'bg-neutral-700'}`}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (transcriptData.gpaSummary?.totalCreditsEarned || 0) / 128 * 100)}%`,
                      backgroundColor: PURDUE_GOLD
                    }}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${theme === 'light' ? 'text-neutral-700' : 'text-neutral-300'}`}>
                    Credit Hours Progress
                  </span>
                  <span className={`text-xs ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    {transcriptData.gpaSummary?.totalCreditsEarned || 0}/128
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 ${theme === 'light' ? 'bg-neutral-200' : 'bg-neutral-700'}`}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (transcriptData.gpaSummary?.totalCreditsEarned || 0) / 128 * 100)}%`,
                      backgroundColor: transcriptData.gpaSummary?.cumulativeGPA >= 3.0 ? '#22c55e' : '#ef4444'
                    }}
                  />
                </div>
              </div>
              
              {/* Overall Progress */}
              <div className={`pt-3 border-t ${theme === 'light' ? 'border-neutral-200' : 'border-neutral-700'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-neutral-800' : 'text-neutral-200'}`}>
                    Degree Progress
                  </span>
                  <span className={`text-lg font-bold ${theme === 'light' ? 'text-neutral-900' : 'text-neutral-100'}`}>
                    {Math.round((transcriptData.gpaSummary?.totalCreditsEarned || 0) / 128 * 100)}%
                  </span>
                </div>
                <div className={`text-xs ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {transcriptData.gpaSummary?.totalCreditsEarned || 0} of 128 credits completed
                </div>
              </div>
            </>
          ) : (
            <div className={`text-center py-6 ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
              <p className="text-sm">Upload transcript to see degree progress</p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card title="⚡ Quick Actions">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { icon: FileUp, label: "Upload Transcript", action: "transcript" },
            { icon: Brain, label: "AI Plan Next Term", action: "ai" },
            { icon: BookOpen, label: "Open Planner", action: "planner" },
            { icon: ShieldCheck, label: "Run Audit", action: "audit" },
          ].map(({ icon: I, label, action }) => (
            <button
              key={label}
              onClick={() => {
                // Navigate to different sections based on action
                if (action === 'transcript') window.location.href = '/transcript';
                else if (action === 'ai') window.location.href = '/ai-assistant';
                else if (action === 'planner') window.location.href = '/planner';
                else if (action === 'audit') window.location.href = '/degree-audit';
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-1 transition-colors hover:scale-105 ${
                theme === 'light'
                  ? 'bg-neutral-50 ring-neutral-200 hover:ring-neutral-300'
                  : 'bg-neutral-950/60 ring-neutral-800 hover:ring-neutral-700'
              }`}
            >
              <I size={16} style={{ color: PURDUE_GOLD }} />
              <span className={theme === 'light' ? 'text-neutral-800' : 'text-neutral-200'}>{label}</span>
            </button>
          ))}
        </div>
      </Card>
        </div>
      </div>
    </div>
  );
}