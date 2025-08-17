// Clado Search & Enrichment API Service
// Free tier: 20 requests/minute for Search People endpoint
// 5 credits per successful search request

export interface CladoUserProfile {
  id: string;
  name: string;
  location?: string;
  location_country?: string;
  location_regions?: string[];
  headline?: string;
  description?: string;
  linkedin_url?: string;
  picture_permalink?: string;
  connections_count?: number;
  followers_count?: number;
  is_working?: boolean;
  is_decision_maker?: boolean;
  total_experience_duration_months?: number;
  projected_total_salary?: number;
  post_count?: number;
  posts?: string;
  liked_posts?: string;
  recommendations?: string;
  recommendations_count?: number;
  skills?: string[];
}

export interface CladoExperience {
  title?: string;
  company_name?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  location?: string;
}

export interface CladoEducation {
  degree?: string;
  field_of_study?: string;
  school_name?: string;
  start_date?: string;
  end_date?: string;
}

export interface CladoPost {
  text?: string;
  totalReactionCount?: number;
  likeCount?: number;
  appreciationCount?: number;
  empathyCount?: number;
  InterestCount?: number;
  praiseCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  postUrl?: string;
  postedAt?: string;
  postedDate?: string;
  postedDateTimestamp?: number;
  reposted?: boolean;
  urn?: string;
  author?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    url?: string;
  };
}

export interface CladoUserResult {
  profile: CladoUserProfile;
  experience?: CladoExperience[];
  education?: CladoEducation[];
  posts?: CladoPost[];
}

export interface CladoSearchResponse {
  results: CladoUserResult[];
  total: number;
  query: string;
}

export interface CladoSearchParams {
  query: string;
  limit?: number; // 1-100, default 30
  company?: string[];
  school?: string[];
}

export interface CladoErrorResponse {
  detail: string;
}

// Rate limiting for free tier
interface RateLimitInfo {
  requestCount: number;
  windowStart: number;
  windowDurationMs: number;
  maxRequests: number;
}

class CladoService {
  private baseUrl = 'https://search.clado.ai';
  // Embedded API key - Note: This key may need renewal
  private readonly EMBEDDED_API_KEY = 'sk-MDE5OGIwOGYtMTliNC03MDAwLTk2NTct';
  private isEnabled: boolean = false; // Start disabled, enable with /clado command
  
  // Free tier rate limiting: 20 requests per minute
  private rateLimit: RateLimitInfo = {
    requestCount: 0,
    windowStart: Date.now(),
    windowDurationMs: 60 * 1000, // 1 minute
    maxRequests: 20 // Free tier limit
  };

  constructor() {
    // Load enabled state from localStorage
    this.isEnabled = localStorage.getItem('clado_enabled') === 'true';
  }

  // Toggle Clado mode on/off
  toggleEnabled(): boolean {
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('clado_enabled', this.isEnabled.toString());
    return this.isEnabled;
  }

  // Check if Clado is enabled
  isEnabledMode(): boolean {
    return this.isEnabled;
  }

  // Enable Clado mode
  enable(): void {
    this.isEnabled = true;
    localStorage.setItem('clado_enabled', 'true');
  }

  // Disable Clado mode
  disable(): void {
    this.isEnabled = false;
    localStorage.setItem('clado_enabled', 'false');
  }

  // Get API key status (now always true if service is available)
  hasApiKey(): boolean {
    return (this.EMBEDDED_API_KEY.startsWith('lk_') || this.EMBEDDED_API_KEY.startsWith('sk-')) && this.EMBEDDED_API_KEY.length > 10;
  }

  // Check if we can make a request (rate limiting)
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.rateLimit.windowStart >= this.rateLimit.windowDurationMs) {
      this.rateLimit.requestCount = 0;
      this.rateLimit.windowStart = now;
    }
    
    return this.rateLimit.requestCount < this.rateLimit.maxRequests;
  }

  // Get time until next request is allowed
  private getTimeUntilNextRequest(): number {
    if (this.canMakeRequest()) return 0;
    
    const windowEnd = this.rateLimit.windowStart + this.rateLimit.windowDurationMs;
    return Math.max(0, windowEnd - Date.now());
  }

  // Increment request count
  private incrementRequestCount(): void {
    this.rateLimit.requestCount++;
  }

  // Get current rate limit status
  getRateLimitStatus(): {
    canMakeRequest: boolean;
    requestsRemaining: number;
    timeUntilReset: number;
    windowStart: Date;
  } {
    const canMake = this.canMakeRequest();
    return {
      canMakeRequest: canMake,
      requestsRemaining: Math.max(0, this.rateLimit.maxRequests - this.rateLimit.requestCount),
      timeUntilReset: this.getTimeUntilNextRequest(),
      windowStart: new Date(this.rateLimit.windowStart)
    };
  }

  // Search for LinkedIn profiles using natural language
  async searchPeople(params: CladoSearchParams): Promise<CladoSearchResponse> {
    if (!this.isEnabled) {
      throw new Error('Clado mode is disabled. Use "/clado" to enable LinkedIn search.');
    }

    if (!this.hasApiKey()) {
      throw new Error('Clado API key is not configured properly. Please check the embedded API key.');
    }

    if (!this.canMakeRequest()) {
      const waitTime = Math.ceil(this.getTimeUntilNextRequest() / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before making another request.`);
    }

    // Validate parameters
    if (!params.query.trim()) {
      throw new Error('Search query is required');
    }

    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }

    try {
      // Build query parameters
      const searchParams = new URLSearchParams();
      searchParams.append('query', params.query);
      
      if (params.limit) {
        searchParams.append('limit', params.limit.toString());
      }
      
      if (params.company && params.company.length > 0) {
        params.company.forEach(company => {
          searchParams.append('company', company);
        });
      }
      
      if (params.school && params.school.length > 0) {
        params.school.forEach(school => {
          searchParams.append('school', school);
        });
      }

      console.log(`🔍 Searching Clado for: "${params.query}"`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.baseUrl}/api/search?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.EMBEDDED_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Increment request count for successful API call
      this.incrementRequestCount();

      if (!response.ok) {
        let errorMessage = `Clado API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorData: CladoErrorResponse = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Use default error message if can't parse JSON
        }

        if (response.status === 401) {
          throw new Error('⚠️ **Clado API Key Issue**\n\nThe LinkedIn search feature is temporarily unavailable due to an expired API key. This is a known issue that the development team is working to resolve.\n\n**Alternative Options:**\n- Use the regular AI assistant for career advice\n- Visit [LinkedIn](https://linkedin.com) directly for networking\n- Try rephrasing as a general career question');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making another request.');
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorMessage}`);
        } else if (response.status >= 500) {
          throw new Error(`Clado service error: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }

      const data: CladoSearchResponse = await response.json();
      console.log(`✅ Found ${data.results.length} profiles for query: "${params.query}"`);
      
      return data;

    } catch (error) {
      console.error('Clado search failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Search request timed out. Please try again with a simpler query.');
        }
        throw error;
      }
      
      throw new Error('Failed to search Clado API. Please try again.');
    }
  }

  // Helper method to format search results for display
  formatSearchResults(response: CladoSearchResponse): string {
    if (response.results.length === 0) {
      return `No profiles found for "${response.query}". Try refining your search terms.`;
    }

    let formatted = `Found ${response.total} profiles for "${response.query}":\n\n`;
    
    response.results.forEach((result, index) => {
      const profile = result.profile;
      formatted += `${index + 1}. **${profile.name}**\n`;
      
      if (profile.headline) {
        formatted += `   ${profile.headline}\n`;
      }
      
      if (profile.location) {
        formatted += `   📍 ${profile.location}\n`;
      }
      
      if (profile.connections_count) {
        formatted += `   🔗 ${profile.connections_count}+ connections\n`;
      }
      
      if (result.experience && result.experience.length > 0) {
        const currentJob = result.experience[0];
        if (currentJob.company_name) {
          formatted += `   🏢 ${currentJob.company_name}`;
          if (currentJob.title) {
            formatted += ` - ${currentJob.title}`;
          }
          formatted += '\n';
        }
      }
      
      if (profile.skills && profile.skills.length > 0) {
        formatted += `   💡 Skills: ${profile.skills.slice(0, 5).join(', ')}`;
        if (profile.skills.length > 5) {
          formatted += ` (+${profile.skills.length - 5} more)`;
        }
        formatted += '\n';
      }
      
      if (profile.linkedin_url) {
        formatted += `   🔗 ${profile.linkedin_url}\n`;
      }
      
      formatted += '\n';
    });

    // Add rate limit info
    const rateLimitStatus = this.getRateLimitStatus();
    formatted += `\n📊 API Usage: ${rateLimitStatus.requestsRemaining} requests remaining this minute`;
    
    return formatted;
  }

  // Get current status
  getStatus(): {
    enabled: boolean;
    hasValidKey: boolean;
    rateLimitStatus: {
      canMakeRequest: boolean;
      requestsRemaining: number;
      timeUntilReset: number;
    };
  } {
    return {
      enabled: this.isEnabled,
      hasValidKey: this.hasApiKey(),
      rateLimitStatus: this.getRateLimitStatus()
    };
  }
}

// Create singleton instance
export const cladoService = new CladoService();