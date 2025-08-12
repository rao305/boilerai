// Enhanced AI Service to connect with CLI BoilerAI via FastAPI bridge
import { TranscriptData } from '@/types';

interface ChatResponse {
  response: string;
  timestamp: string;
  user_id: string;
  session_id?: string;
  fallback_response?: string;
  error?: string;
}

interface HealthResponse {
  status: string;
  cli_process_running: boolean;
  timestamp: string;
  openai_configured: boolean;
  knowledge_base_loaded: boolean;
}

interface SystemStatus {
  initialized: boolean;
  ai_engine_available: boolean;
  conversation_manager_available: boolean;
  knowledge_base_loaded: boolean;
  openai_configured: boolean;
}

class AIService {
  private baseUrl: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy: boolean = false;
  private systemStatus: SystemStatus | null = null;
  private lastHealthCheck: Date | null = null;
  
  constructor() {
    // FastAPI bridge service endpoint
    this.baseUrl = 'http://localhost:5003';
    this.startHealthCheck();
  }

  private startHealthCheck() {
    // Check health every 15 seconds (more frequent for better UX)
    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, 15000);
    
    // Initial health check
    this.checkHealth();
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const health: HealthResponse = await response.json();
      
      // Update system status
      this.systemStatus = {
        initialized: health.cli_process_running,
        ai_engine_available: health.cli_process_running,
        conversation_manager_available: health.cli_process_running,
        knowledge_base_loaded: health.knowledge_base_loaded,
        openai_configured: health.openai_configured
      };
      
      // Service is healthy if CLI is running (even without OpenAI for fallback mode)
      this.isHealthy = health.status === 'healthy' || health.status === 'limited';
      this.lastHealthCheck = new Date();
      
      return this.isHealthy;
      
    } catch (error) {
      this.isHealthy = false;
      this.systemStatus = null;
      this.lastHealthCheck = new Date();
      
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('AI service health check failed:', error.message);
      }
      
      return false;
    }
  }

  async sendMessage(message: string, userId: string = 'anonymous'): Promise<string> {
    try {
      console.log(`🤖 Sending message to BoilerAI: ${message.substring(0, 50)}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for chat
      
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: {
            userId: userId,
            timestamp: new Date().toISOString(),
            hasTranscript: await this.hasUserContext(userId)
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status} ${response.statusText}`);
      }

      const data: ChatResponse = await response.json();
      
      if (data.error) {
        console.error('AI service returned error:', data.error);
        return data.fallback_response || await this.getIntelligentFallback(message);
      }

      console.log(`✅ Received BoilerAI response: ${data.response.substring(0, 100)}...`);
      return data.response;
      
    } catch (error) {
      console.error('BoilerAI communication failed:', error);
      
      // Return context-aware fallback message
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return "Your request is taking longer than expected. The AI might be processing a complex query. Please try a simpler question or try again in a moment.";
        } else if (error.message.includes('Failed to fetch')) {
          return "I'm unable to connect to the BoilerAI service. Please make sure the bridge service is running (python start_bridge.py) and try again.";
        }
      }
      
      return await this.getIntelligentFallback(message);
    }
  }

  private async getIntelligentFallback(message: string): Promise<string> {
    // Use pure AI fallback when bridge service is unavailable
    try {
      const { openaiChatService } = await import('./openaiChatService');
      const response = await openaiChatService.sendMessage(message, 'anonymous');
      return response;
    } catch (error) {
      console.error('OpenAI fallback failed:', error);
      // Only as last resort, generate a contextual response
      const isQuestionAbout = (keywords: string[]) => 
        keywords.some(keyword => message.toLowerCase().includes(keyword));
      
      if (isQuestionAbout(['course', 'class', 'schedule'])) {
        return "I'd be happy to help you with course planning! To give you the best recommendations, could you tell me more about your major, current year, and what specific courses or scheduling challenges you're working with?";
      } else if (isQuestionAbout(['grad', 'graduation', 'timeline'])) {
        return "Let's work on your graduation planning! I can help you map out remaining requirements and create a timeline. What's your current major and approximate graduation timeline you're aiming for?";
      } else if (isQuestionAbout(['prereq', 'requirement'])) {
        return "I can help clarify prerequisite requirements! Which specific course or program requirements are you curious about? The more details you provide, the more specific guidance I can offer.";
      } else {
        return "I'm here to help with your academic planning at Purdue! Whether you need course recommendations, graduation timeline planning, or help understanding requirements, I can provide personalized guidance. What specific academic question can I help you with?";
      }
    }
  }

  private async hasUserContext(userId: string): Promise<boolean> {
    try {
      const contextInfo = await this.getUserContext(userId);
      return contextInfo.hasContext;
    } catch {
      return false;
    }
  }

  // Send transcript data to AI for personalized context
  async uploadTranscriptContext(userId: string, transcript: TranscriptData): Promise<boolean> {
    try {
      console.log(`📝 Uploading transcript context for user ${userId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${this.baseUrl}/transcript/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          transcript: transcript,
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to upload transcript: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Transcript context uploaded to BoilerAI successfully:', data.message);
      return true;
      
    } catch (error) {
      console.error('Failed to upload transcript context to BoilerAI:', error);
      return false;
    }
  }

  // Check if user has context stored
  async getUserContext(userId: string): Promise<{hasContext: boolean; contextKeys?: string[]}> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/context`);
      
      if (!response.ok) {
        return { hasContext: false };
      }

      const data = await response.json();
      return {
        hasContext: data.has_context,
        contextKeys: data.context_keys
      };
      
    } catch (error) {
      console.error('Failed to get user context:', error);
      return { hasContext: false };
    }
  }

  // Get service health status
  getHealthStatus(): boolean {
    return this.isHealthy;
  }

  // Get detailed system status
  getSystemStatus(): SystemStatus | null {
    return this.systemStatus;
  }

  // Get last health check time
  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }

  // Force a health check
  async forceHealthCheck(): Promise<boolean> {
    return await this.checkHealth();
  }

  // Generate personalized graduation plan
  async generatePersonalizedPlan(userId: string, studentProfile: any, preferences?: any): Promise<any> {
    try {
      console.log(`📊 Generating personalized plan for user ${userId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${this.baseUrl}/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          student_profile: studentProfile,
          preferences: preferences
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Plan generation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Personalized plan generated successfully');
      return data;
      
    } catch (error) {
      console.error('Failed to generate personalized plan:', error);
      throw error;
    }
  }

  // Get student academic profile
  async getStudentProfile(userId: string): Promise<any> {
    try {
      console.log(`👤 Getting student profile for user ${userId}`);
      
      const response = await fetch(`${this.baseUrl}/profile/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Profile fetch failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Student profile retrieved successfully');
      return data;
      
    } catch (error) {
      console.error('Failed to get student profile:', error);
      throw error;
    }
  }

  // Get personalized recommendations
  async getPersonalizedRecommendations(userId: string, context: any): Promise<any> {
    try {
      console.log(`💡 Getting personalized recommendations for user ${userId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${this.baseUrl}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          context: context
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Recommendations failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Personalized recommendations retrieved successfully');
      return data;
      
    } catch (error) {
      console.error('Failed to get personalized recommendations:', error);
      throw error;
    }
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Create singleton instance
export const aiService = new AIService();

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    aiService.destroy();
  });
}