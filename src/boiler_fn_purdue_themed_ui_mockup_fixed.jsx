import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Calendar,
  FileUp,
  MessageCircle,
  Settings as SettingsIcon,
  Bell,
  LogOut,
  BookOpen,
  Brain,
  ChevronRight,
  SunMoon,
  ShieldCheck,
  AlertTriangle,
  Mail,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Purdue palette
const PURDUE_BLACK = "#000000";
const PURDUE_GOLD = "#CFB991"; // official athletic gold
const NEAR_BLACK = "#121212";

// ==== NAV: match requested final product structure ====
const tabs = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "chat", label: "AI Assistant", icon: MessageCircle },
  { key: "explorer", label: "Course Explorer", icon: BookOpen },
  { key: "planner", label: "Academic Planner", icon: Calendar },
  { key: "audit", label: "Degree Audit", icon: ShieldCheck },
  { key: "transcript", label: "Transcript", icon: FileUp },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

const gpaData = [
  { term: "F22", gpa: 3.1 },
  { term: "S23", gpa: 3.35 },
  { term: "F23", gpa: 3.45 },
  { term: "S24", gpa: 3.6 },
  { term: "F24", gpa: 3.62 },
  { term: "S25", gpa: 3.71 },
];

const sampleCourses = {
  Completed: [
    { code: "CS 18000", name: "Problem Solving & OOP", credits: 4 },
    { code: "MA 26100", name: "Multivariate Calc", credits: 4 },
    { code: "CS 24000", name: "Prog in C", credits: 3 },
  ],
  "Fall 2025": [
    { code: "CS 25100", name: "Data Structures", credits: 4 },
    { code: "CS 18200", name: "Discrete Math", credits: 3 },
    { code: "STAT 35000", name: "Intro to Stats", credits: 3 },
  ],
  "Spring 2026": [
    { code: "CS 30700", name: "Software Eng I", credits: 3 },
    { code: "CS 25200", name: "Systems Programming", credits: 4 },
    { code: "COMM 11400", name: "Speaking", credits: 3 },
  ],
};

const transcriptRows = [
  { term: "Fall 2023", course: "CS 18000", grade: "A", credits: 4 },
  { term: "Fall 2023", course: "MA 26100", grade: "B+", credits: 4 },
  { term: "Spring 2024", course: "CS 24000", grade: "A-", credits: 3 },
  { term: "Spring 2024", course: "CS 19300", grade: "P", credits: 1 },
  { term: "Fall 2024", course: "MA 35100", grade: "B", credits: 3 },
];

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${className}`}
      style={{ borderColor: PURDUE_GOLD, color: PURDUE_GOLD }}
    >
      {children}
    </span>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl bg-neutral-900/70 ring-1 ring-neutral-800 shadow-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-200">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Sidebar({ current, onSelect }) {
  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col gap-2 p-3">
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = current === key;
        const primary = key === "chat"; // emphasize AI Assistant
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
              active
                ? "bg-neutral-900 ring-1 ring-neutral-800"
                : "hover:bg-neutral-900/60"
            } ${primary ? "border border-[--gold]" : ""}`}
            style={primary ? { ['--gold']: PURDUE_GOLD } : undefined}
          >
            <Icon size={18} className={active ? "text-neutral-100" : "text-neutral-300"} />
            <span className={`text-sm ${active ? "text-neutral-100" : "text-neutral-300"}`}>
              {label}
            </span>
            <span className="ml-auto opacity-60">
              <ChevronRight size={16} />
            </span>
          </button>
        );
      })}

      <div className="mt-2 flex items-center gap-2">
        <Badge>BoilerMaker</Badge>
        <Badge>CS</Badge>
      </div>
    </aside>
  );
}

function Topbar({ onGlobalAsk }) {
  const [q, setQ] = useState("");
  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-neutral-800 px-4 py-3 backdrop-blur" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl" style={{ background: PURDUE_GOLD }} />
        <div className="font-semibold tracking-wide" style={{ color: PURDUE_GOLD }}>BoilerFN</div>
        <span className="ml-2 text-xs uppercase tracking-widest text-neutral-400">Purdue</span>
      </div>

      {/* Global Advisor input */}
      <form
        className="mx-2 flex flex-1 items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          if (!v) return;
          onGlobalAsk(v);
          setQ("");
        }}
      >
        <MessageCircle size={16} className="text-neutral-400" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          placeholder="Ask the AI Assistant… (e.g., ‘Plan a 15-credit Fall schedule’)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="ml-auto hidden items-center gap-2 md:flex">
        <button className="rounded-xl p-2 hover:bg-neutral-900/70" title="Notifications">
          <Bell size={18} className="text-neutral-300" />
        </button>
        <button className="rounded-xl p-2 hover:bg-neutral-900/70" title="Theme">
          <SunMoon size={18} className="text-neutral-300" />
        </button>
        <div className="ml-1 flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-2 py-1">
          <div className="h-6 w-6 rounded-full bg-neutral-700" />
          <span className="text-sm text-neutral-300">Rohit</span>
          <button className="rounded-lg p-1 hover:bg-neutral-800" title="Logout">
            <LogOut size={16} className="text-neutral-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onAsk }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Advisor spotlight card */}
      <Card title="Ask the Assistant" right={<Badge>AI</Badge>}>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.querySelector("input[name=advisorq]");
            const v = input ? input.value.trim() : "";
            if (!v) return;
            onAsk(v);
            if (input) input.value = "";
          }}
        >
          <input name="advisorq" className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-500" placeholder="e.g., Build me a CS + STAT plan for Spring 2026" />
          <button className="rounded-xl px-3 py-2 text-sm text-neutral-900" style={{ background: PURDUE_GOLD }}>Ask</button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {["Am I eligible for CS 38100?", "Suggest a 15-credit Fall schedule", "Which electives help for ML?"].map((q) => (
            <button key={q} onClick={() => onAsk(q)} className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-300 hover:bg-neutral-900/70">{q}</button>
          ))}
        </div>
      </Card>

      <Card title="Progress" right={<Badge>72% complete</Badge>}>
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

      <Card title="Alerts">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2 rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <ShieldCheck size={16} className="mt-0.5" style={{ color: PURDUE_GOLD }} />
            <div>
              <div className="text-neutral-200">Seat opening watch enabled</div>
              <div className="text-neutral-400">CS 25100 • Email when &lt; 5 seats</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <AlertTriangle size={16} className="mt-0.5 text-yellow-500" />
            <div>
              <div className="text-neutral-200">Prereq chain conflict</div>
              <div className="text-neutral-400">CS 25200 requires CS 25100 (planned concurrently)</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <Mail size={16} className="mt-0.5 text-neutral-400" />
            <div>
              <div className="text-neutral-200">Advisor email sent</div>
              <div className="text-neutral-400">Requested override for STAT 35000</div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Recommendations" right={<Badge>AI</Badge>}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {[
            { code: "CS 37300", name: "Data Mining & ML", why: "aligns with interest in AI" },
            { code: "CS 38100", name: "Intro to AI", why: "prereq chain clears S26" },
            { code: "STAT 41600", name: "Probability", why: "strengthen ML math" },
            { code: "CS 34800", name: "Info Sys", why: "broadens DB skills" },
          ].map((r) => (
            <div key={r.code} className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
              <div className="text-sm font-medium text-neutral-200">{r.code} • {r.name}</div>
              <div className="text-xs text-neutral-400">Why: {r.why}</div>
            </div>
          ))}
        </div>
      </Card>

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
  );
}

function AcademicPlanner() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">Academic Planner</h2>
        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900">Export</button>
          <button className="rounded-xl px-3 py-1.5 text-sm text-neutral-900" style={{ background: PURDUE_GOLD }}>AI fill next term</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {Object.entries(sampleCourses).map(([term, list]) => (
          <div key={term} className="rounded-2xl bg-neutral-900/60 p-3 ring-1 ring-neutral-800">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium text-neutral-200">{term}</div>
              <Badge>{list.reduce((a, c) => a + c.credits, 0)} cr</Badge>
            </div>
            <div className="space-y-2">
              {list.map((c) => (
                <div key={c.code} draggable className="cursor-grab rounded-xl bg-neutral-950/60 p-3 text-sm ring-1 ring-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-200">{c.code}</span>
                    <Badge>{c.credits} cr</Badge>
                  </div>
                  <div className="text-neutral-400">{c.name}</div>
                </div>
              ))}
              <button className="w-full rounded-xl border border-dashed border-neutral-700 py-2 text-sm text-neutral-400 hover:text-neutral-200">+ Add course</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DegreeAudit() {
  const requirements = [
    { name: "Core CS", done: 6, total: 8, missing: ["CS 35200", "CS 35400"] },
    { name: "Math/Science", done: 5, total: 6, missing: ["STAT 41600"] },
    { name: "Communication", done: 1, total: 2, missing: ["ENGL 10600/10800"] },
  ];
  const totalDone = requirements.reduce((a, r) => a + r.done, 0);
  const totalReq = requirements.reduce((a, r) => a + r.total, 0);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title="Audit Summary" right={<Badge>{Math.round((totalDone/totalReq)*100)}%</Badge>}>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <div className="text-neutral-400">Completed</div>
            <div className="text-xl font-semibold text-neutral-100">{totalDone}</div>
          </div>
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <div className="text-neutral-400">Required</div>
            <div className="text-xl font-semibold text-neutral-100">{totalReq}</div>
          </div>
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
            <div className="text-neutral-400">Remaining</div>
            <div className="text-xl font-semibold text-neutral-100">{totalReq-totalDone}</div>
          </div>
        </div>
      </Card>

      <Card title="Requirements Progress" right={<Badge>Live</Badge>}>
        <ul className="space-y-3 text-sm">
          {requirements.map((req) => (
            <li key={req.name}>
              <div className="mb-1 flex justify-between text-neutral-300">
                <span>{req.name}</span>
                <span>{req.done}/{req.total}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-800">
                <div className="h-2 rounded-full" style={{ width: `${(req.done / req.total) * 100}%`, background: PURDUE_GOLD }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Missing Courses" right={<button className="text-xs underline">Export</button>}>
        <div className="space-y-2 text-sm">
          {requirements.map((r) => (
            <div key={r.name} className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
              <div className="font-medium text-neutral-200">{r.name}</div>
              <div className="text-neutral-400">{r.missing.join(", ") || "None"}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Transcript() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card title="Upload Transcript (PDF)">
          <div className="rounded-xl border border-dashed border-neutral-700 p-6 text-center">
            <FileUp className="mx-auto" style={{ color: PURDUE_GOLD }} />
            <div className="mt-2 text-sm text-neutral-300">Drag & drop or click to upload</div>
            <div className="text-xs text-neutral-500">Max 20 MB • PDF only</div>
            <button className="mt-3 rounded-xl px-3 py-1.5 text-sm text-neutral-900" style={{ background: PURDUE_GOLD }}>Choose file</button>
          </div>
          <div className="mt-3 text-xs text-neutral-500">Secure parse • PII stripped • AI-ready</div>
        </Card>
        <Card title="Insights" right={<Badge>AI</Badge>}>
          <ul className="space-y-2 text-sm">
            <li className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">Strongest term: <span className="text-neutral-200">Spring 2025</span></li>
            <li className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">GPA booster: <span className="text-neutral-200">CS 24000</span></li>
            <li className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">Eligible now for: <span className="text-neutral-200">CS 25100</span></li>
          </ul>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card title="Parsed Transcript">
          <div className="overflow-auto rounded-xl ring-1 ring-neutral-800">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-900 text-neutral-300">
                <tr>
                  <th className="px-3 py-2 text-left">Term</th>
                  <th className="px-3 py-2 text-left">Course</th>
                  <th className="px-3 py-2 text-left">Grade</th>
                  <th className="px-3 py-2 text-left">Credits</th>
                </tr>
              </thead>
              <tbody>
                {transcriptRows.map((r, i) => (
                  <tr key={i} className="odd:bg-neutral-950/60">
                    <td className="px-3 py-2 text-neutral-300">{r.term}</td>
                    <td className="px-3 py-2 text-neutral-300">{r.course}</td>
                    <td className="px-3 py-2 text-neutral-300">{r.grade}</td>
                    <td className="px-3 py-2 text-neutral-300">{r.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Chat({ messages, setMessages }) {
  const [input, setInput] = useState("");
  const [focus, setFocus] = useState(false);
  const gridClasses = focus ? "grid grid-cols-1" : "grid grid-cols-1 gap-4 lg:grid-cols-3";

  return (
    <div className={gridClasses}>
      <div className={focus ? "rounded-2xl bg-neutral-900/60 p-3 ring-1 ring-neutral-800" : "lg:col-span-2 rounded-2xl bg-neutral-900/60 p-3 ring-1 ring-neutral-800"}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-neutral-400">AI Assistant</div>
          <button onClick={() => setFocus((v) => !v)} className="rounded-lg border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900">
            {focus ? (<span className="inline-flex items-center gap-1"><Minimize2 size={14} /> Exit focus</span>) : (<span className="inline-flex items-center gap-1"><Maximize2 size={14} /> Focus</span>)}
          </button>
        </div>
        <div className="h-[520px] overflow-auto space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-neutral-200 text-neutral-900"
                  : "bg-neutral-950/60 text-neutral-200 ring-1 ring-neutral-800"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about courses, professors, or plans…"
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-500"
          />
          <button
            onClick={() => {
              if (!input.trim()) return;
              setMessages((prev) => [...prev, { role: "user", content: input }]);
              setInput("");
            }}
            className="rounded-xl px-3 py-2 text-sm text-neutral-900 disabled:opacity-50"
            style={{ background: PURDUE_GOLD }}
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {["Suggest a 15-credit schedule", "Explain prereqs for CS 38100", "Find STAT courses that fit Monday/Wednesday"].map((q) => (
            <button key={q} onClick={() => setMessages((prev) => [...prev, { role: "user", content: q }])} className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-300 hover:bg-neutral-900/70">{q}</button>
          ))}
        </div>
      </div>

      {!focus && (
        <div className="lg:col-span-1">
          <Card title="Context">
            <ul className="space-y-2 text-sm">
              <li className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">Using transcript: <span className="text-neutral-200">Spring 2025</span></li>
              <li className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">Catalog: <span className="text-neutral-200">2025–2026</span></li>
              <li className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">Model: <span className="text-neutral-200">Gemini + OpenAI</span></li>
            </ul>
          </Card>
          <Card title="Actions">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <button className="rounded-xl border border-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-900/70">Use Neo4j</button>
              <button className="rounded-xl border border-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-900/70">Email plan</button>
              <button className="rounded-xl border border-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-900/70">Save as draft</button>
              <button className="rounded-xl border border-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-900/70">Export PDF</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CourseExplorer() {
  const [view, setView] = useState("list"); // 'list' | 'graph'
  const [query, setQuery] = useState("");
  const courses = [
    { code: "CS 25100", name: "Data Structures", dept: "CS", level: 200, credits: 4 },
    { code: "CS 25200", name: "Systems Programming", dept: "CS", level: 200, credits: 4 },
    { code: "STAT 41600", name: "Probability", dept: "STAT", level: 400, credits: 3 },
    { code: "CS 38100", name: "Intro to AI", dept: "CS", level: 300, credits: 3 },
  ];
  const filtered = courses.filter((c) =>
    (c.code + " " + c.name).toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200">Course Explorer</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2">
            <Search size={16} className="text-neutral-400" />
            <input value={query} onChange={(e)=>setQuery(e.target.value)} className="bg-transparent text-sm outline-none placeholder:text-neutral-500" placeholder="Search courses…" />
          </div>
          <div className="rounded-xl border border-neutral-800 p-1 text-xs">
            <button onClick={()=>setView("list")} className={`rounded-lg px-2 py-1 ${view==='list' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-300'}`}>List</button>
            <button onClick={()=>setView("graph")} className={`rounded-lg px-2 py-1 ${view==='graph' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-300'}`}>Graph</button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.code} className="rounded-2xl bg-neutral-900/60 p-3 ring-1 ring-neutral-800">
              <div className="flex items-center justify-between">
                <div className="text-neutral-200 font-medium">{c.code} • {c.name}</div>
                <Badge>{c.credits} cr</Badge>
              </div>
              <div className="text-neutral-400 text-sm">Dept: {c.dept} • Level: {c.level}</div>
              <div className="mt-2 flex gap-2 text-xs">
                <button className="rounded-lg border border-neutral-800 px-2 py-1 text-neutral-300 hover:bg-neutral-900">Add to plan</button>
                <button className="rounded-lg border border-neutral-800 px-2 py-1 text-neutral-300 hover:bg-neutral-900">Open prereqs</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Graph />
      )}
    </div>
  );
}

export default function BoilerFNUIMockup() {
  // Default to AI Assistant to make it the hero
  const [current, setCurrent] = useState("chat");

  // Chat state lives here so topbar/dashboard can inject prompts
  const [chatMessages, setChatMessages] = useState([
    // No hardcoded system message - let AI generate contextual responses
    { role: "user", content: "Can I take CS 25200 next spring?" },
    { role: "assistant", content: "You'll need CS 25100 first. I've added it to Fall 2025." },
  ]);

  const onGlobalAsk = (q) => {
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);
    setCurrent("chat");
  };

  const Content = useMemo(() => {
    switch (current) {
      case "dashboard":
        return <Dashboard onAsk={onGlobalAsk} />;
      case "planner":
        return <AcademicPlanner />;
      case "transcript":
        return <Transcript />;
      case "chat":
        return <Chat messages={chatMessages} setMessages={setChatMessages} />;
      case "explorer":
        return <CourseExplorer />;
      case "audit":
        return <DegreeAudit />;
      case "settings":
        return <Settings />;
      default:
        return <Chat messages={chatMessages} setMessages={setChatMessages} />;
    }
  }, [current, chatMessages]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Topbar onGlobalAsk={onGlobalAsk} />
      <div className="mx-auto flex max-w-7xl gap-3 px-3 py-4">
        <Sidebar current={current} onSelect={setCurrent} />
        <main className="min-h-[70vh] flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {Content}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <footer className="mx-auto max-w-7xl px-4 pb-6 pt-2 text-xs text-neutral-500">
        <div className="flex items-center justify-between">
          <div>
            © {new Date().getFullYear()} BoilerFN • Unofficial Purdue-themed mockup
          </div>
          <div className="flex items-center gap-3">
            <span>Black & Gold • Boiler Up!</span>
          </div>
        </div>
      </footer>

      <style>{`
        :root { --purdue-gold: ${PURDUE_GOLD}; }
        * { scrollbar-width: thin; scrollbar-color: #444 transparent; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 8px; }
      `}</style>
    </div>
  );
}

function Settings() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Profile">
        <div className="grid grid-cols-1 gap-3 text-sm">
          <label className="text-neutral-300">
            Name
            <input className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-neutral-200" defaultValue="Rohit Rao" />
          </label>
          <label className="text-neutral-300">
            Email
            <input className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-neutral-200" defaultValue="rrao@purdue.edu" />
          </label>
        </div>
      </Card>
      <Card title="API Keys">
        <div className="grid grid-cols-1 gap-3 text-sm">
          <label className="text-neutral-300">
            OpenAI
            <input className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-neutral-200" placeholder="sk-..." />
          </label>
          <label className="text-neutral-300">
            Gemini
            <input className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-neutral-200" placeholder="AIza..." />
          </label>
        </div>
      </Card>
      <Card title="Notifications">
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 text-neutral-300">
            <input type="checkbox" defaultChecked className="h-4 w-4" /> Seat openings
          </label>
          <label className="flex items-center gap-2 text-neutral-300">
            <input type="checkbox" className="h-4 w-4" /> Degree milestones
          </label>
          <label className="flex items-center gap-2 text-neutral-300">
            <input type="checkbox" defaultChecked className="h-4 w-4" /> Weekly summary
          </label>
        </div>
      </Card>
      <Card title="Security">
        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">2FA: <span className="text-neutral-200">Enabled</span></div>
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">Session timeout: <span className="text-neutral-200">30 min</span></div>
          <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">Allowed origins: <span className="text-neutral-200">boilerfn.app</span></div>
        </div>
      </Card>
    </div>
  );
}

function Graph() {
  // simple static graph mock used inside Course Explorer (Graph view)
  const nodes = [
    { id: "CS 18000", x: 80, y: 120 },
    { id: "CS 24000", x: 220, y: 80 },
    { id: "CS 25100", x: 360, y: 120 },
    { id: "CS 25200", x: 500, y: 160 },
    { id: "CS 38100", x: 360, y: 260 },
  ];
  const edges = [
    ["CS 18000", "CS 24000"],
    ["CS 18000", "CS 25100"],
    ["CS 25100", "CS 25200"],
    ["CS 25100", "CS 38100"],
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <div className="lg:col-span-3 rounded-2xl bg-neutral-900/60 p-3 ring-1 ring-neutral-800">
        <svg viewBox="0 0 640 360" className="h-[420px] w-full">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {edges.map(([a, b], i) => {
            const n1 = nodes.find((n) => n.id === a);
            const n2 = nodes.find((n) => n.id === b);
            if (!n1 || !n2) return null;
            return (
              <line
                key={i}
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={PURDUE_GOLD}
                strokeWidth={1.5}
                opacity={0.6}
              />
            );
          })}
          {nodes.map((n) => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={18} fill={NEAR_BLACK} stroke={PURDUE_GOLD} strokeWidth={1.5} filter="url(#glow)" />
              <text x={n.x} y={n.y + 34} textAnchor="middle" fontSize="10" fill="#d4d4d4">
                {n.id}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="lg:col-span-1">
        <Card title="Filters">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-neutral-300">
              <input type="checkbox" defaultChecked className="h-4 w-4" /> Prerequisites
            </label>
            <label className="flex items-center gap-2 text-neutral-300">
              <input type="checkbox" defaultChecked className="h-4 w-4" /> Corequisites
            </label>
            <label className="flex items-center gap-2 text-neutral-300">
              <input type="checkbox" className="h-4 w-4" /> Instructors
            </label>
            <div className="pt-2">
              <div className="text-xs text-neutral-400">Department</div>
              <select className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-neutral-200">
                <option>CS</option>
                <option>STAT</option>
                <option>ECE</option>
              </select>
            </div>
          </div>
        </Card>
        <Card title="Selection">
          <div className="space-y-2 text-sm">
            <div className="rounded-xl bg-neutral-950/60 p-3 ring-1 ring-neutral-800">
              <div className="text-neutral-200">CS 25100</div>
              <div className="text-neutral-400">Data Structures</div>
              <div className="mt-1 text-xs text-neutral-500">Prereqs: CS 18000</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
