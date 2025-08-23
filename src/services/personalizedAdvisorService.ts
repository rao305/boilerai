import { apiService } from './apiService';

export interface TranscriptStatus {
  hasTranscript: boolean;
  lastUpdated?: string;
  studentName?: string;
  gpa?: number;
  completedCourses?: number;
  eligibleTracks?: string[];
}

export interface PersonalizedSuggestion {
  type: 'course_recommendation' | 'track_eligibility' | 'degree_progress' | 'codo_eligibility';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

class PersonalizedAdvisorService {
  private static instance: PersonalizedAdvisorService;
  private transcriptContext: any = null;
  private baseUrl = '/api/transcript-context';

  static getInstance(): PersonalizedAdvisorService {
    if (!PersonalizedAdvisorService.instance) {
      PersonalizedAdvisorService.instance = new PersonalizedAdvisorService();
    }
    return PersonalizedAdvisorService.instance;
  }

  /**
   * Save transcript data to AI context for personalized responses
   */
  async saveTranscriptToAI(transcriptData: any): Promise<boolean> {
    try {
      const response = await apiService.post(`${this.baseUrl}/save`, {
        transcriptData,
        timestamp: new Date().toISOString()
      });
      
      if (response.success) {
        this.transcriptContext = response.context;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save transcript to AI context:', error);
      return false;
    }
  }

  /**
   * Get current transcript status for UI display
   */
  async getTranscriptStatus(): Promise<TranscriptStatus> {
    try {
      const response = await apiService.get(`${this.baseUrl}/status`);
      return response.data || { hasTranscript: false };
    } catch (error) {
      console.error('Failed to get transcript status:', error);
      return { hasTranscript: false };
    }
  }

  /**
   * Get personalized suggestions based on transcript
   */
  async getPersonalizedSuggestions(): Promise<PersonalizedSuggestion[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/suggestions`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get personalized suggestions:', error);
      return [];
    }
  }

  /**
   * Send chat message with transcript context
   */
  async sendChatWithContext(message: string, provider: string = 'gemini'): Promise<any> {
    try {
      const response = await apiService.post(`${this.baseUrl}/chat`, {
        message,
        provider,
        includeContext: true
      });
      return response;
    } catch (error) {
      console.error('Failed to send chat with context:', error);
      throw error;
    }
  }

  /**
   * Get personalized greeting for user
   */
  async getPersonalizedGreeting(): Promise<string> {
    const status = await this.getTranscriptStatus();
    
    if (status.hasTranscript && status.studentName) {
      const greetings = [
        `Welcome back, ${status.studentName}! Ready for some personalized academic planning?`,
        `Hi ${status.studentName}! I have your transcript loaded and ready to help.`,
        `Hello ${status.studentName}! Let's continue planning your academic journey.`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    return "Hi there! I see you haven't uploaded your transcript yet. Would you like to do that for personalized academic advice?";
  }

  /**
   * Check if user is in transcript mode
   */
  async isTranscriptModeActive(): Promise<boolean> {
    const status = await this.getTranscriptStatus();
    return status.hasTranscript;
  }

  /**
   * Clear transcript context (for logout or privacy)
   */
  async clearTranscriptContext(): Promise<void> {
    try {
      await apiService.delete(`${this.baseUrl}/clear`);
      this.transcriptContext = null;
    } catch (error) {
      console.error('Failed to clear transcript context:', error);
    }
  }

  /**
   * Get academic summary for display
   */
  async getAcademicSummary(): Promise<string> {
    const status = await this.getTranscriptStatus();
    
    if (!status.hasTranscript) {
      return "No transcript data available";
    }

    const parts = [];
    if (status.gpa) parts.push(`GPA: ${status.gpa}`);
    if (status.completedCourses) parts.push(`${status.completedCourses} courses completed`);
    if (status.eligibleTracks && status.eligibleTracks.length > 0) {
      parts.push(`Eligible for: ${status.eligibleTracks.join(', ')}`);
    }

    return parts.join(' • ') || "Academic data processing...";
  }

  /**
   * Chat with transcript context integration
   */
  async chatWithTranscriptContext(message: string, useContext: boolean = true): Promise<any> {
    try {
      const response = await this.sendChatWithContext(message);
      
      const status = await this.getTranscriptStatus();
      
      return {
        success: true,
        response: response.content || response.data?.content || 'No response received',
        hasTranscriptContext: status.hasTranscript,
        contextUsed: useContext && status.hasTranscript,
        provider: response.provider || 'gemini',
        isPersonalized: status.hasTranscript,
        studentName: status.studentName
      };
    } catch (error) {
      console.error('Chat with transcript context failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        hasTranscriptContext: false,
        contextUsed: false
      };
    }
  }

  /**
   * Format personalized prefix for messages
   */
  formatPersonalizedPrefix(hasContext: boolean, contextUsed: boolean): string {
    if (!hasContext) {
      return "";
    }

    if (contextUsed) {
      return "📊 **Personalized Response Based on Your Transcript** 📊\n\n";
    }

    return "ℹ️ *General response - your transcript context wasn't used for this query*\n\n";
  }
}

export const personalizedAdvisorService = PersonalizedAdvisorService.getInstance();