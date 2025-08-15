// Core API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  classStatus: string;
  major: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
  needsVerification?: boolean;
  previewUrl?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  classStatus: string;
  major: string;
  emailVerified?: boolean;
}

// Course and Academic Types
export interface Course {
  id: string;
  subject: string;
  courseNumber: string;
  courseCode: string;
  courseTitle: string;
  level: 'Undergraduate' | 'Graduate';
  credits: number;
  grade?: string;
  gradePoints?: number;
  qualityPoints?: number;
  semester: string;
  year: number;
  status: 'completed' | 'in_progress' | 'planned';
  matchStatus: 'verified' | 'pending' | 'unmatched';
  matchConfidence: number;
  verified: boolean;
  purdueCourseMatch: string;
  classification: 'foundation' | 'core' | 'elective' | 'general_education';
}

export interface SemesterData {
  semester: string;
  year: number;
  academicStanding?: string;
  courses: Course[];
  semesterGpa: number;
  semesterCredits: number;
}

export interface StudentInfo {
  name: string;
  studentId: string;
  program: string;
  college?: string;
  campus: string;
}

export interface GpaSummary {
  cumulativeGPA: number;
  totalCreditsAttempted: number;
  totalCreditsEarned: number;
  totalQualityPoints: number;
  majorGPA: number;
}

export interface TranscriptData {
  studentInfo: StudentInfo;
  completedCourses: Record<string, SemesterData>;
  coursesInProgress: Course[];
  gpaSummary: GpaSummary;
  uploadDate: string;
  verificationStatus: 'pending' | 'verified' | 'mock_data';
  processingNote?: string;
}

export interface TranscriptProcessingResult {
  success: boolean;
  data: TranscriptData;
  rawAIResponse: string;
  isMockData?: boolean;
}

// Transcript Processing Types
export interface TranscriptUploadRequest {
  file?: File;
  transcriptText?: string;
  apiKey?: string;
  model?: string;
}

// Academic Planning Types
export interface AcademicPlan {
  id: string;
  userId: string;
  semesters: PlannedSemester[];
  targetGraduation: string;
  totalCredits: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedSemester {
  id: string;
  semester: string;
  year: number;
  courses: PlannedCourse[];
  targetCredits: number;
}

export interface PlannedCourse {
  courseCode: string;
  courseTitle: string;
  credits: number;
  isRequired: boolean;
  prerequisites?: string[];
}

// Form Types
export interface CourseFormData {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  semester: string;
  year: number;
}

// API Service Types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Component Props Types
export interface CourseCardProps {
  course: Course;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
}

export interface SemesterCardProps {
  semester: SemesterData;
  semesterKey: string;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface FormErrors {
  [key: string]: string | undefined;
}

// Table Types for CourseVerificationTable
export interface CourseTableRow {
  id: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  semester: string;
  year: number;
  status: Course['status'];
  matchStatus: Course['matchStatus'];
  verified: boolean;
}

// AI Assistant Types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface AiAssistantState {
  messages: ChatMessage[];
  isTyping: boolean;
  error?: string;
}