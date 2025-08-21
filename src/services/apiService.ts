// Enhanced API service with automatic LLM header injection
interface LLMConfig {
  provider: 'openai' | 'gemini';
  apiKey: string;
  model?: string;
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requiresLLM?: boolean;  // Whether this request requires LLM headers
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
  }

  /**
   * Get current LLM configuration from existing API key storage system
   */
  private getCurrentLLMConfig(): LLMConfig | null {
    try {
      console.log('🔍 [API Service] Getting LLM configuration...');
      
      // First check if we have a validation status
      const validationStatus = localStorage.getItem('api_key_validation_status');
      console.log('🔍 [API Service] Validation status:', validationStatus);
      if (!validationStatus) {
        console.log('❌ [API Service] No validation status found');
        return null;
      }

      const validation = JSON.parse(validationStatus);
      console.log('🔍 [API Service] Parsed validation:', validation);
      
      // Get user ID from current context if available
      const userId = this.getCurrentUserId();
      console.log('🔍 [API Service] Current user ID:', userId);
      const apiKeys = this.getCurrentApiKeys(userId);
      console.log('🔍 [API Service] Current API keys:', { 
        hasOpenAI: !!apiKeys.openai, 
        hasGemini: !!apiKeys.gemini,
        openAILength: apiKeys.openai?.length,
        geminiLength: apiKeys.gemini?.length
      });

      // Choose provider based on which key is valid and available
      if (validation.gemini && apiKeys.gemini) {
        const config = {
          provider: 'gemini' as const,
          apiKey: apiKeys.gemini,
          model: 'gemini-1.5-flash'
        };
        console.log('✅ [API Service] Using Gemini config:', { provider: config.provider, model: config.model, hasKey: !!config.apiKey });
        return config;
      } else if (validation.openai && apiKeys.openai) {
        const config = {
          provider: 'openai' as const, 
          apiKey: apiKeys.openai,
          model: 'gpt-4o-mini'
        };
        console.log('✅ [API Service] Using OpenAI config:', { provider: config.provider, model: config.model, hasKey: !!config.apiKey });
        return config;
      }

      console.log('❌ [API Service] No valid LLM configuration found');
      return null;
    } catch (error) {
      console.warn('❌ [API Service] Failed to get LLM config from API key storage:', error);
      return null;
    }
  }

  /**
   * Get current user ID (from session manager or localStorage)
   */
  private getCurrentUserId(): string | undefined {
    try {
      // First try to get from current session (Microsoft auth)
      const sessionId = localStorage.getItem('currentSessionId');
      if (sessionId) {
        // Get session data from localStorage (encrypted)
        const sessionData = localStorage.getItem(`session_${sessionId}`);
        if (sessionData) {
          try {
            // Note: Session data is encrypted, but we can also check for plain session info
            const currentSession = localStorage.getItem('currentSessionId');
            // Look for any stored user data that might contain the user ID
            const storedKeys = Object.keys(localStorage);
            for (const key of storedKeys) {
              if (key.startsWith('user_api_keys_')) {
                const userId = key.replace('user_api_keys_', '');
                if (userId && userId.length > 0) {
                  return userId;
                }
              }
            }
          } catch (e) {
            console.log('Session data encrypted, trying alternative methods');
          }
        }
      }

      // Fallback: Try to get from any available user API keys storage
      const storedKeys = Object.keys(localStorage);
      for (const key of storedKeys) {
        if (key.startsWith('user_api_keys_')) {
          const userId = key.replace('user_api_keys_', '');
          if (userId && userId.length > 0) {
            return userId;
          }
        }
      }

      // Last resort: Try legacy auth data
      const authData = localStorage.getItem('microsoft_auth_user');
      if (authData) {
        const userData = JSON.parse(authData);
        return userData.id || userData.oid;
      }

      return undefined;
    } catch (error) {
      console.warn('Failed to get current user ID:', error);
      return undefined;
    }
  }

  /**
   * Get current API keys using the same logic as ApiKeyContext
   */
  private getCurrentApiKeys(userId?: string): { openai: string; gemini: string } {
    if (!userId) return { openai: '', gemini: '' };
    
    // First check session storage (for non-remembered keys)
    const sessionOpenAI = sessionStorage.getItem('current_session_openai_key') || '';
    const sessionGemini = sessionStorage.getItem('current_session_gemini_key') || '';
    
    // Then check user-specific stored keys
    const userKeys = this.getUserApiKeys(userId);
    
    return {
      openai: sessionOpenAI || userKeys.openai || '',
      gemini: sessionGemini || userKeys.gemini || ''
    };
  }

  /**
   * Get user-specific API keys from localStorage
   */
  private getUserApiKeys(userId: string): { openai: string | null; gemini: string | null } {
    // Check if user wants to remember API key
    const rememberKey = localStorage.getItem('remember_api_key') === 'true';
    if (!rememberKey) return { openai: '', gemini: '' };
    
    // Get user-specific API key
    const userKeyData = localStorage.getItem(`user_api_keys_${userId}`);
    if (!userKeyData) return { openai: null, gemini: null };
    
    try {
      const parsed = JSON.parse(userKeyData);
      return {
        openai: parsed.openai || null,
        gemini: parsed.gemini || null
      };
    } catch {
      return { openai: null, gemini: null };
    }
  }

  /**
   * Build headers for API request
   */
  private buildHeaders(options: ApiRequestOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add LLM headers if this request requires LLM functionality
    if (options.requiresLLM) {
      const llmConfig = this.getCurrentLLMConfig();
      if (llmConfig) {
        headers['X-LLM-Provider'] = llmConfig.provider;
        headers['X-LLM-Api-Key'] = llmConfig.apiKey;
        if (llmConfig.model) {
          headers['X-LLM-Model'] = llmConfig.model;
        }
      }
    }

    return headers;
  }

  /**
   * Make an API request with automatic header injection
   */
  async request<T = any>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = this.buildHeaders(options);

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
      credentials: 'include'  // Include cookies for authentication
    };

    // Add body for non-GET requests
    if (options.body && options.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const parsed = JSON.parse(errorData);
          errorMessage = parsed.error || parsed.message || errorMessage;
        } catch {
          // Use raw error data if not JSON
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return response.text() as unknown as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed [${options.method || 'GET'}] ${url}:`, error);
      throw error;
    }
  }

  /**
   * Convenience methods for common HTTP methods
   */

  async get<T = any>(endpoint: string, requiresLLM = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresLLM });
  }

  async post<T = any>(endpoint: string, body?: any, requiresLLM = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresLLM });
  }

  async put<T = any>(endpoint: string, body?: any, requiresLLM = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, requiresLLM });
  }

  async delete<T = any>(endpoint: string, requiresLLM = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresLLM });
  }

  async patch<T = any>(endpoint: string, body?: any, requiresLLM = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, requiresLLM });
  }

  /**
   * LLM-specific convenience methods
   */

  async sendChatMessage(message: string, userId?: string, sessionId?: string) {
    return this.post('/api/advisor/chat', {
      message,
      userId,
      sessionId
    }, true);  // requiresLLM = true
  }

  async sendLegacyChatMessage(message: string, apiKey: string, userId?: string, sessionId?: string) {
    return this.post('/api/advisor/chat-legacy', {
      message,
      apiKey,
      userId,
      sessionId
    }, false);  // Legacy endpoint doesn't use headers
  }

  /**
   * Check if LLM configuration is available
   */
  hasLLMConfig(): boolean {
    return !!this.getCurrentLLMConfig();
  }

  /**
   * Get current LLM provider info
   */
  getLLMInfo(): { provider: string; model?: string; hasKey: boolean } | null {
    const config = this.getCurrentLLMConfig();
    if (!config) return null;

    return {
      provider: config.provider,
      model: config.model,
      hasKey: !!config.apiKey
    };
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;