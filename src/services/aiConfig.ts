/**
 * Centralized AI Configuration Service
 * Manages all AI-related settings and provider configurations
 */

export interface AIProviderConfig {
  name: string;
  apiKey?: string;
  model: string;
  enabled: boolean;
}

export interface AIConfig {
  providers: {
    openai: AIProviderConfig;
    anthropic?: AIProviderConfig;
    gemini?: AIProviderConfig;
  };
  activeProvider: string;
  features: {
    reasoning: boolean;
    transcriptProcessing: boolean;
    chatAssistant: boolean;
  };
  endpoints: {
    backend: string;
    api: string;
  };
}

class AIConfigService {
  private config: AIConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AIConfig {
    const defaultConfig: AIConfig = {
      providers: {
        openai: {
          name: 'OpenAI',
          model: import.meta.env.VITE_AI_MODEL || 'gpt-4',
          enabled: import.meta.env.VITE_AI_ASSISTANT_ENABLED === 'true',
          apiKey: this.getStoredApiKey('openai')
        }
      },
      activeProvider: import.meta.env.VITE_AI_PROVIDER || 'openai',
      features: {
        reasoning: true,
        transcriptProcessing: true,
        chatAssistant: true
      },
      endpoints: {
        backend: import.meta.env.VITE_BACKEND_URL || '',
        api: import.meta.env.VITE_API_URL || '/api'
      }
    };

    // Load any saved config from localStorage
    const savedConfig = localStorage.getItem('ai_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        return { ...defaultConfig, ...parsed };
      } catch (error) {
        console.warn('Failed to parse saved AI config, using defaults');
      }
    }

    return defaultConfig;
  }

  private getStoredApiKey(provider: string): string | undefined {
    // Prefer per-user key stored in localStorage
    const key = localStorage.getItem(`${provider}_api_key`);
    if (key && key !== `your_${provider}_api_key_here`) {
      return key;
    }
    // Fallback to environment key if provided
    if (provider === 'openai') {
      const envKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
      if (envKey && envKey !== 'your_openai_api_key_here') return envKey;
    }
    return undefined;
  }

  // Getters
  getConfig(): AIConfig {
    return { ...this.config };
  }

  getActiveProvider(): AIProviderConfig {
    return this.config.providers[this.config.activeProvider as keyof typeof this.config.providers] || this.config.providers.openai;
  }

  getBackendUrl(): string {
    return this.config.endpoints.backend;
  }

  getApiUrl(): string {
    return this.config.endpoints.api;
  }

  isProviderAvailable(provider: string = this.config.activeProvider): boolean {
    const providerConfig = this.config.providers[provider as keyof typeof this.config.providers];
    if (!providerConfig || !providerConfig.enabled) return false;

    const apiKey = this.getStoredApiKey(provider);
    return !!(apiKey && apiKey.length > 10);
  }

  isFeatureEnabled(feature: keyof AIConfig['features']): boolean {
    return this.config.features[feature] && this.isProviderAvailable();
  }

  // Setters
  setProvider(provider: string): void {
    if (this.config.providers[provider as keyof typeof this.config.providers]) {
      this.config.activeProvider = provider;
      this.saveConfig();
    }
  }

  setProviderConfig(provider: string, config: Partial<AIProviderConfig>): void {
    if (this.config.providers[provider as keyof typeof this.config.providers]) {
      this.config.providers[provider as keyof typeof this.config.providers] = {
        ...this.config.providers[provider as keyof typeof this.config.providers],
        ...config
      };
      this.saveConfig();
    }
  }

  setFeature(feature: keyof AIConfig['features'], enabled: boolean): void {
    this.config.features[feature] = enabled;
    this.saveConfig();
  }

  setApiKey(provider: string, apiKey: string): void {
    localStorage.setItem(`${provider}_api_key`, apiKey);
    // Update provider config
    if (this.config.providers[provider as keyof typeof this.config.providers]) {
      this.config.providers[provider as keyof typeof this.config.providers].apiKey = apiKey;
      this.config.providers[provider as keyof typeof this.config.providers].enabled = true;
    }
    this.saveConfig();
  }

  removeApiKey(provider: string): void {
    localStorage.removeItem(`${provider}_api_key`);
    // Update provider config
    if (this.config.providers[provider as keyof typeof this.config.providers]) {
      this.config.providers[provider as keyof typeof this.config.providers].apiKey = undefined;
      this.config.providers[provider as keyof typeof this.config.providers].enabled = false;
    }
    this.saveConfig();
  }

  // Validation
  async validateApiKey(provider: string, apiKey?: string): Promise<boolean> {
    const keyToTest = apiKey || this.getStoredApiKey(provider);
    if (!keyToTest) return false;

    try {
      switch (provider) {
        case 'openai':
          // Use backend validation endpoint to avoid CORS issues
          const boundFetch = window.fetch.bind(window);
          const response = await boundFetch('/api/settings/validate-openai-key', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey: keyToTest })
          });
          
          if (!response.ok) return false;
          
          const result = await response.json();
          return result.success && result.valid;
        
        // Add other providers as needed
        default:
          console.warn(`Validation not implemented for provider: ${provider}`);
          return false;
      }
    } catch (error) {
      console.error(`API key validation failed for ${provider}:`, error);
      return false;
    }
  }

  // Persistence
  private saveConfig(): void {
    try {
      localStorage.setItem('ai_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save AI config:', error);
    }
  }

  // Reset
  reset(): void {
    localStorage.removeItem('ai_config');
    Object.keys(this.config.providers).forEach(provider => {
      localStorage.removeItem(`${provider}_api_key`);
    });
    this.config = this.loadConfig();
  }

  // Development utilities
  isDevelopment(): boolean {
    return import.meta.env.NODE_ENV === 'development';
  }

  getDebugInfo(): object {
    return {
      config: this.config,
      availableProviders: Object.keys(this.config.providers).map(provider => ({
        name: provider,
        available: this.isProviderAvailable(provider),
        hasApiKey: !!this.getStoredApiKey(provider)
      })),
      environment: {
        NODE_ENV: import.meta.env.NODE_ENV,
        AI_ENABLED: import.meta.env.VITE_AI_ASSISTANT_ENABLED,
        AI_PROVIDER: import.meta.env.VITE_AI_PROVIDER,
        AI_MODEL: import.meta.env.VITE_AI_MODEL
      }
    };
  }
}

export const aiConfig = new AIConfigService();
export default aiConfig;