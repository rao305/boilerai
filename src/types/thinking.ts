// Types for AI thinking and reasoning feature
export interface ThinkingStep {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'processing' | 'completed';
  timestamp: Date;
  metadata?: {
    // Retrieval step metadata
    retrieval_results?: any[];
    hit_rate?: number;
    top_sources?: Array<{
      title?: string;
      name?: string;
      section?: string;
      authority_level?: 'official' | 'derived' | 'computed';
      url?: string;
    }>;
    
    // Verification step metadata
    violations?: Array<{
      id: string;
      type: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      affected_courses?: string[];
      remediation_steps?: string[];
    }>;
    
    // General metadata
    citations?: Array<{
      source: string;
      section: string;
      authority_level: 'official' | 'derived' | 'computed';
      url?: string;
      content_preview?: string;
    }>;
    processing_time?: number;
    confidence?: number;
  };
}

export interface AIReasoningResponse {
  thinking_steps: ThinkingStep[];
  final_response: string;
  confidence_score?: number;
  reasoning_time?: number;
  model_used?: string;
  thinkingSummary?: string;
}

export interface EnhancedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  reasoning?: {
    steps: ThinkingStep[];
    isComplete: boolean;
    currentStep?: number;
  };
  metadata?: {
    confidence_score?: number;
    reasoning_time?: number;
    model_used?: string;
    thinkingSummary?: string;
    
    // SmartCourse-specific metadata
    retrieval_hit_rate?: number;
    privacy_redacted?: boolean;
    user_id?: string;
    
    // Overall citations and violations
    citations?: Array<{
      source: string;
      section: string;
      authority_level: 'official' | 'derived' | 'computed';
      url?: string;
      content_preview?: string;
      last_updated?: string;
    }>;
    
    policy_violations?: Array<{
      id: string;
      type: 'prerequisite_missing' | 'gpa_insufficient' | 'credit_overload' | 'corequisite_missing' | 'graduation_requirement' | 'policy_violation' | 'schedule_conflict' | 'deadline_warning';
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      affected_courses?: string[];
      remediation_steps?: string[];
      deadline?: string;
      auto_resolvable?: boolean;
    }>;
  };
}

export interface ChatSession {
  id: string;
  name: string;
  messages: EnhancedMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}

export interface ThinkingConfig {
  showSteps: boolean;
  animateSteps: boolean;
  stepDelay: number; // milliseconds between steps
  enableReasoningMode: boolean;
}
