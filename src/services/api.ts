const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Transcript processing
  async processTranscript(file: File, apiKey?: string, model?: string): Promise<any> {
    const formData = new FormData();
    formData.append('transcript', file);
    if (apiKey) formData.append('apiKey', apiKey);
    if (model) formData.append('model', model);

    const response = await fetch(`${this.baseURL}/transcript/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async processTranscriptText(
    transcriptText: string,
    apiKey?: string,
    model?: string
  ): Promise<any> {
    return this.request('/transcript/process-text', {
      method: 'POST',
      body: JSON.stringify({
        transcriptText,
        apiKey,
        model,
      }),
    });
  }

  // Courses
  async getCourses(): Promise<any> {
    return this.request('/courses');
  }

  async searchCourses(query: string, filters?: any): Promise<any> {
    const params = new URLSearchParams({ query, ...filters });
    return this.request(`/courses/search?${params}`);
  }

  // Academic Planner
  async getAcademicPlan(): Promise<any> {
    return this.request('/planner');
  }

  async saveAcademicPlan(plan: any): Promise<any> {
    return this.request('/planner', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  // Authentication
  async login(email: string, password: string): Promise<any> {
    console.log('🌐 API Service login - calling:', `${this.baseURL}/auth/login`);
    console.log('🌐 API Service login - data:', { email });
    
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    console.log('🌐 API Service login - result:', result);
    return result;
  }

  async register(email: string, password: string, name: string): Promise<any> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getProfile(): Promise<any> {
    return this.request('/auth/profile');
  }

  // Email verification
  async verifyEmail(token: string): Promise<any> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string): Promise<any> {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async checkVerificationStatus(email: string): Promise<any> {
    return this.request(`/auth/verification-status/${encodeURIComponent(email)}`);
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request('/health');
  }
}

export const apiService = new ApiService(); 