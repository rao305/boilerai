/**
 * Common TypeScript interfaces to replace 'any' types
 * Improves type safety without changing functionality
 */

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic data container
export interface DataContainer {
  [key: string]: unknown;
}

// Form data types
export interface FormDataType {
  [key: string]: string | number | boolean | null | undefined;
}

// Event handlers
export interface EventHandler<T = Event> {
  (event: T): void;
}

export interface AsyncEventHandler<T = Event> {
  (event: T): Promise<void>;
}

// React component props
export interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

// Configuration objects
export interface ConfigObject {
  [key: string]: string | number | boolean | ConfigObject;
}

// Academic types
export interface AcademicPerformance {
  gpa: number;
  creditHours: {
    completed: number;
    attempted: number;
    total: number;
  };
  standing: 'Good Standing' | 'Probation' | 'Excellent';
}

export interface CoursePerformance {
  bestSubjects: string[];
  strugglingSubjects: string[];
  avgGrade: number;
}

export interface StudentProfile {
  gpa: {
    overall: number;
    major: number;
  };
  performanceMetrics: AcademicPerformance;
  courseHistory: CourseInfo[];
  graduation_goals?: {
    targetDate: string;
    careerGoals: string[];
  };
}

export interface CourseInfo {
  code: string;
  title: string;
  credits: number;
  grade?: string;
  semester?: string;
  year?: string;
}

// Context types
export interface UserContext {
  userId: string;
  sessionId: string;
  preferences: ConfigObject;
  metadata: DataContainer;
}

// Metrics and analytics
export interface PerformanceMetrics {
  averageReward: number;
  totalSessions: number;
  improvementRate: number;
  successRate: number;
  lastUpdated: string;
}

export interface AnalyticsData {
  events: unknown[];
  metrics: PerformanceMetrics;
  insights: string[];
  recommendations: string[];
}

// Search and filtering
export interface SearchFilters {
  [key: string]: string | number | boolean | string[];
}

export interface SearchResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}