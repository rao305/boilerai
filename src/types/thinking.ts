// Types for AI thinking and reasoning feature
export interface ThinkingStep {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'processing' | 'completed';
  timestamp: Date;
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
