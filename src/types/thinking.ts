// Types for AI thinking and reasoning feature
export interface ThinkingStep {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'processing' | 'completed';
  timestamp: Date;
  reasoning_depth: 'surface' | 'deep' | 'critical';
  confidence_level: number; // 0-1
  context_used: string[]; // What context was considered
  alternatives_considered?: string[]; // Alternative approaches
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
  reasoning_depth: 'quick' | 'standard' | 'deep' | 'critical';
  context_awareness: {
    student_profile_used: boolean;
    transcript_data_used: boolean;
    academic_rules_applied: boolean;
    prerequisites_checked: boolean;
    track_alignment_verified: boolean;
  };
  decision_factors: {
    primary_factors: string[];
    secondary_factors: string[];
    ignored_factors: string[];
  };
  alternatives_explored: Array<{
    option: string;
    reasoning: string;
    confidence: number;
    rejected_because: string;
  }>;
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
  showAlternatives: boolean;
  showContextualFactors: boolean;
  showConfidenceLevels: boolean;
}

// Enhanced DeepThink mode - always enabled for best contextual reasoning
export const DEEPTHINK_CONFIG = {
  name: 'DeepThink',
  description: 'Advanced contextual reasoning with transcript and plan integration',
  step_count: 6, // Optimized based on SmartCourse research
  depth_level: 'contextual' as const,
  context_analysis: true,
  alternative_exploration: true,
  confidence_tracking: true,
  transcript_integration: true,
  plan_awareness: true,
  prerequisite_checking: true
};
