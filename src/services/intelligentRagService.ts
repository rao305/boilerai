import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface StudentContext {
  completed_courses?: string[];
  track?: 'machine_intelligence' | 'software_engineering';
  target_graduation?: string;
  interests?: string[];
  career_goals?: string[];
  current_semester?: 'fall' | 'spring' | 'summer';
}

export interface IntelligentRagRequest {
  query: string;
  student_context?: StudentContext;
  reasoning_level?: 'surface' | 'analytical' | 'strategic' | 'contextual' | 'auto';
  include_recommendations?: boolean;
  format?: 'concise' | 'detailed';
}

export interface IntelligentRagResponse {
  answer: string;
  reasoning_level: string;
  confidence: number;
  sources: Array<{
    type: string;
    title: string;
    relevance_score: number;
    snippet: string;
  }>;
  reasoning_chain: string[];
  contextual_factors: string[];
  recommendations: string[];
  follow_up_questions: string[];
  course_recommendations?: Array<{
    course_id: string;
    type: string;
    priority: string;
    reasoning: string;
  }>;
  metadata?: {
    processing_time: string;
    knowledge_base_version: string;
    reasoning_engine: string;
  };
}

export interface LearningPathRequest {
  track: 'machine_intelligence' | 'software_engineering';
  completed_courses?: string[];
  target_graduation?: string;
  preferences?: Record<string, any>;
  current_semester?: 'fall' | 'spring' | 'summer';
}

export interface TrackAnalysisParams {
  completed_courses?: string[];
  interests?: string[];
  career_goals?: string[];
}

export interface CourseRecommendationsRequest {
  track: string;
  completed_courses?: string[];
  current_semester?: 'fall' | 'spring' | 'summer';
  max_credits?: number;
  difficulty_preference?: 'easy' | 'intermediate' | 'challenging';
  interests?: string[];
}

class IntelligentRagService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Send an intelligent RAG query with advanced reasoning
   */
  async ask(request: IntelligentRagRequest): Promise<IntelligentRagResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/intelligent-rag/ask`,
        request,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get intelligent response');
      }
    } catch (error: any) {
      console.error('Intelligent RAG ask error:', error);
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to process intelligent query'
      );
    }
  }

  /**
   * Generate personalized learning path
   */
  async generateLearningPath(request: LearningPathRequest) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/intelligent-rag/learning-path`,
        request,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to generate learning path');
      }
    } catch (error: any) {
      console.error('Learning path generation error:', error);
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to generate learning path'
      );
    }
  }

  /**
   * Analyze track fit (MI vs SE)
   */
  async analyzeTrackFit(params: TrackAnalysisParams) {
    try {
      const queryParams = new URLSearchParams();
      if (params.completed_courses) {
        queryParams.append('completed_courses', params.completed_courses.join(','));
      }
      if (params.interests) {
        queryParams.append('interests', params.interests.join(','));
      }
      if (params.career_goals) {
        queryParams.append('career_goals', params.career_goals.join(','));
      }

      const response = await axios.get(
        `${API_BASE_URL}/intelligent-rag/track-analysis?${queryParams.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to analyze track fit');
      }
    } catch (error: any) {
      console.error('Track analysis error:', error);
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to analyze track fit'
      );
    }
  }

  /**
   * Get smart course recommendations
   */
  async getCourseRecommendations(request: CourseRecommendationsRequest) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/intelligent-rag/course-recommendations`,
        request,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get course recommendations');
      }
    } catch (error: any) {
      console.error('Course recommendations error:', error);
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to get course recommendations'
      );
    }
  }

  /**
   * Get demo response (no auth required)
   */
  async getDemo(query?: string) {
    try {
      const queryParams = query ? `?query=${encodeURIComponent(query)}` : '';
      const response = await axios.get(
        `${API_BASE_URL}/intelligent-rag/demo${queryParams}`
      );

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to get demo response');
      }
    } catch (error: any) {
      console.error('Demo request error:', error);
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to get demo response'
      );
    }
  }

  /**
   * Format intelligent response for display
   */
  formatIntelligentResponse(response: IntelligentRagResponse): string {
    let formatted = `**${response.answer}**\n\n`;
    
    if (response.reasoning_level && response.confidence) {
      formatted += `🧠 **Reasoning:** ${response.reasoning_level} level (${(response.confidence * 100).toFixed(0)}% confidence)\n\n`;
    }

    if (response.recommendations && response.recommendations.length > 0) {
      formatted += `💡 **Recommendations:**\n${response.recommendations.map(r => `• ${r}`).join('\n')}\n\n`;
    }

    if (response.course_recommendations && response.course_recommendations.length > 0) {
      formatted += `📚 **Course Suggestions:**\n${response.course_recommendations.map(c => 
        `• **${c.course_id}** (${c.priority} priority): ${c.reasoning}`
      ).join('\n')}\n\n`;
    }

    if (response.follow_up_questions && response.follow_up_questions.length > 0) {
      formatted += `❓ **Follow-up Questions:**\n${response.follow_up_questions.map(q => `• ${q}`).join('\n')}`;
    }

    return formatted;
  }

  /**
   * Get intelligent suggestions based on service type
   */
  getIntelligentSuggestions(): string[] {
    return [
      'What are the CS core requirements?',
      'Compare Machine Intelligence vs Software Engineering tracks',
      'Suggest courses for next semester',
      'Help me plan my graduation timeline',
      'What prerequisites do I need for CS 47100?',
      'Should I choose MI or SE track for AI career?',
      'Generate my personalized learning path',
      'What courses fit my interests in data science?'
    ];
  }
}

export const intelligentRagService = new IntelligentRagService();