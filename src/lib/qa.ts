/**
 * Structured QA Client - ONLY route for frontend LLM queries
 * 
 * This helper ensures ALL AI queries go through our structured pipeline:
 * Frontend -> Node Backend -> FastAPI Gateway -> T2SQL/Planner
 * 
 * NEVER call LLM providers directly from the frontend
 */

interface QAOptions {
  provider?: 'gemini' | 'openai';
  key?: string;
  model?: string;
  profile_json?: any;
  userId?: string;
  sessionId?: string;
}

interface StructuredResponse {
  success: boolean;
  data?: {
    mode: 't2sql' | 'planner' | 'general_chat';
    rows?: any[];
    sql?: string;
    ast?: any;
    plan?: any;
    response?: string;
    provider?: string;
    model?: string;
    timestamp?: string;
    routing?: {
      service: string;
      mode: string;
      endpoint: string;
    };
  };
  error?: string;
  detail?: string;
  fallback?: boolean;
  retry?: boolean;
}

/**
 * Main QA helper - routes through structured pipeline
 * @param question - User question/query
 * @param opts - Optional provider settings and context
 * @returns Promise<StructuredResponse> - Structured response with mode field
 */
export async function askAdvisor(
  question: string,
  opts?: QAOptions
): Promise<StructuredResponse> {
  if (!question?.trim()) {
    throw new Error('Question is required');
  }

  try {
    const response = await fetch('/api/advisor/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward BYO provider credentials via headers (never in browser storage)
        ...(opts?.provider ? { 'X-LLM-Provider': opts.provider } : {}),
        ...(opts?.key ? { 'X-LLM-Api-Key': opts.key } : {}),
        ...(opts?.model ? { 'X-LLM-Model': opts.model } : {}),
      },
      body: JSON.stringify({
        question: question.trim(),
        profile_json: opts?.profile_json,
        userId: opts?.userId,
        sessionId: opts?.sessionId
      })
    });

    const result = await response.json() as StructuredResponse;

    // Validate structured response
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response format from backend');
    }

    if (!result.success && result.error) {
      throw new Error(result.error);
    }

    if (result.success && (!result.data || !result.data.mode)) {
      throw new Error('Backend returned non-structured response - this should not happen');
    }

    // Additional mode validation
    if (result.data) {
      const validModes = ['t2sql', 'planner', 'general_chat'];
      if (!validModes.includes(result.data.mode)) {
        console.warn('Unexpected mode received:', result.data.mode);
      }
    }

    return result;
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof Error) {
      throw new Error(`QA request failed: ${error.message}`);
    }
    throw new Error('QA request failed with unknown error');
  }
}

/**
 * Legacy compatibility wrapper
 * @deprecated Use askAdvisor instead
 */
export async function sendMessage(
  message: string,
  options?: { apiKey?: string; provider?: string; model?: string }
): Promise<any> {
  console.warn('sendMessage is deprecated - use askAdvisor for structured responses');
  
  const result = await askAdvisor(message, {
    key: options?.apiKey,
    provider: options?.provider as 'gemini' | 'openai',
    model: options?.model
  });

  // Return in legacy format for backward compatibility
  if (result.success && result.data) {
    return {
      response: result.data,
      mode: result.data.mode,
      structured: true
    };
  } else {
    throw new Error(result.error || 'Request failed');
  }
}

/**
 * Health check for the structured QA system
 */
export async function checkQAHealth(): Promise<{ healthy: boolean; details: any }> {
  try {
    const response = await fetch('/api/advisor/health');
    const health = await response.json();
    return { healthy: response.ok, details: health };
  } catch (error) {
    return { 
      healthy: false, 
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Type guards for structured responses
 */
export function isT2SQLResponse(data: any): data is { mode: 't2sql'; rows: any[]; sql: string; ast: any } {
  return data?.mode === 't2sql' && Array.isArray(data.rows);
}

export function isPlannerResponse(data: any): data is { mode: 'planner'; plan: any } {
  return data?.mode === 'planner' && data.plan;
}

export function isGeneralChatResponse(data: any): data is { mode: 'general_chat'; response: string } {
  return data?.mode === 'general_chat' && typeof data.response === 'string';
}