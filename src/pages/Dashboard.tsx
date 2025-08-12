import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileUp,
  Brain,
  BookOpen,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";

// Purdue palette
const PURDUE_GOLD = "#CFB991";

// Generate GPA data from transcript or use sample data
const getSemesterGpaData = (transcriptData: any) => {
  if (transcriptData?.completedCourses) {
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
  
  // Fallback sample data
  return [
    { term: "F22", gpa: 3.1 },
    { term: "S23", gpa: 3.35 },
    { term: "F23", gpa: 3.45 },
    { term: "S24", gpa: 3.6 },
    { term: "F24", gpa: 3.62 },
    { term: "S25", gpa: 3.71 },
  ];
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
  return (
    <div className="rounded-2xl bg-neutral-900/70 ring-1 ring-neutral-800 shadow-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-wide text-neutral-200">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { getCurrentSemesterCourses, getCurrentSemesterCredits, transcriptData } = useAcademicPlan();
  const [userName, setUserName] = useState("Alex");

  useEffect(() => {
    if (user?.name) {
      const firstName = user.name.split(' ')[0];
      setUserName(firstName);
    } else if (transcriptData?.studentInfo?.name) {
      const firstName = transcriptData.studentInfo.name.split(' ')[0];
      setUserName(firstName);
    }
  }, [user, transcriptData]);

  const currentCourses = getCurrentSemesterCourses();
  const currentCredits = getCurrentSemesterCredits();
  const gpaData = getSemesterGpaData(transcriptData);

  const handleAskAI = (question: string) => {
    console.log("AI Question:", question);
  };

  return (
    <div className="h-full w-full p-8 overflow-auto">
      <div className="max-w-none">
        {/* Personalized Welcome */}
        <div className="mb-8">
          <div className="rounded-2xl bg-gradient-to-r from-neutral-900/70 to-neutral-800/70 ring-1 ring-neutral-800 shadow-lg p-8">
            <h1 className="text-3xl font-bold text-neutral-100 mb-4">
              Hello, {userName}! Welcome back to BoilerFN 👋
            </h1>
            <div className="flex flex-wrap gap-6 text-base text-neutral-300">
              <span>{transcriptData?.studentInfo?.program || 'Computer Science'} • {transcriptData?.studentInfo?.college || 'Junior'}</span>
              <span>Current GPA: {transcriptData?.gpaSummary?.cumulativeGPA?.toFixed(2) || '3.71'}</span>
              <span>{transcriptData?.gpaSummary?.totalCreditsEarned || '95'} Credits Completed</span>
              <span>Expected Graduation: May 2026</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">

      {/* Ask the Assistant */}
      <Card title="Ask the Assistant" right={<Badge>AI</Badge>}>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.querySelector("input[name=advisorq]") as HTMLInputElement;
            const v = input ? input.value.trim() : "";
            if (!v) return;
            handleAskAI(v);
            if (input) input.value = "";
          }}
        >
          <input 
            name="advisorq" 
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-500" 
            placeholder="e.g., Build me a CS + STAT plan for Spring 2026" 
          />
          <button className="rounded-xl px-3 py-2 text-sm text-neutral-900" style={{ background: PURDUE_GOLD }}>
            Ask
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {["Am I eligible for CS 38100?", "Suggest a 15-credit Fall schedule", "Which electives help for ML?"].map((q) => (
            <button 
              key={q} 
              onClick={() => handleAskAI(q)} 
              className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-300 hover:bg-neutral-900/70"
            >
              {q}
            </button>
          ))}
        </div>
      </Card>

      {/* GPA Progress Chart */}
      <Card title="Academic Progress" right={<Badge>72% complete</Badge>}>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gpaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="term" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 4]} tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #262626" }} labelStyle={{ color: "#d4d4d4" }} />
              <Line type="monotone" dataKey="gpa" stroke={PURDUE_GOLD} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 text-sm text-neutral-400">GPA trend over recent terms</div>
      </Card>

      {/* Course Recommendations */}
      <Card title="Recommendations" right={<Badge>AI</Badge>}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {[
            { code: "CS 37300", name: "Data Mining & ML", why: "aligns with interest in AI" },
            { code: "CS 38100", name: "Intro to AI", why: "prereq chain clears S26" },
            { code: "STAT 41600", name: "Probability", why: "strengthen ML math" },
            { code: "CS 34800", name: "Info Sys", why: "broadens DB skills" },
          ].map((r) => (
            <div key={r.code} className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
              <div className="text-sm font-medium text-neutral-200">{r.code}</div>
              <div className="text-xs text-neutral-300">{r.name}</div>
              <div className="text-xs text-neutral-400">Why: {r.why}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Current Semester Overview */}
      <Card title={`Current Semester (${currentCredits} credits)`} right={<Badge>In Progress</Badge>}>
        <div className="space-y-2">
          {currentCourses.length > 0 ? (
            currentCourses.map((course, index) => (
              <div key={course.id || index} className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-200">{course.code}</span>
                  <Badge>{course.credits} cr</Badge>
                </div>
                <div className="text-neutral-400 text-sm">{course.title}</div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-neutral-400 text-sm mb-3">No courses planned for current semester</p>
              <button className="rounded-xl px-4 py-2 text-sm text-neutral-900" style={{ background: PURDUE_GOLD }}>
                Plan Semester
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Academic Stats */}
      <Card title="Academic Stats">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <div className="text-neutral-400 text-sm">Credits Completed</div>
            <div className="text-xl font-semibold text-neutral-100">{transcriptData?.gpaSummary?.totalCreditsEarned || '95'}</div>
          </div>
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <div className="text-neutral-400 text-sm">Credits Remaining</div>
            <div className="text-xl font-semibold text-neutral-100">{transcriptData ? Math.max(0, 128 - (transcriptData.gpaSummary?.totalCreditsEarned || 0)) : '33'}</div>
          </div>
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <div className="text-neutral-400 text-sm">Degree Progress</div>
            <div className="text-xl font-semibold text-neutral-100">{transcriptData ? Math.round(((transcriptData.gpaSummary?.totalCreditsEarned || 0) / 128) * 100) : '72'}%</div>
          </div>
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <div className="text-neutral-400 text-sm">Current GPA</div>
            <div className="text-xl font-semibold text-neutral-100">{transcriptData?.gpaSummary?.cumulativeGPA?.toFixed(2) || '3.71'}</div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { icon: FileUp, label: "Upload Transcript" },
            { icon: Brain, label: "AI Plan Next Term" },
            { icon: BookOpen, label: "Open Explorer" },
            { icon: ShieldCheck, label: "Run Audit" },
          ].map(({ icon: I, label }) => (
            <button
              key={label}
              className="flex items-center gap-2 rounded-xl bg-neutral-950/60 px-3 py-2 ring-1 ring-neutral-800 hover:ring-neutral-700"
            >
              <I size={16} style={{ color: PURDUE_GOLD }} />
              <span className="text-neutral-200">{label}</span>
            </button>
          ))}
        </div>
      </Card>
        </div>
      </div>
    </div>
  );
}