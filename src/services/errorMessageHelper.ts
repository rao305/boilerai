// Enhanced error message helper for API quota and rate limit issues
import { logger } from '@/utils/logger';

interface ErrorAnalysis {
  type: 'rate_limit' | 'quota_exceeded' | 'api_key_invalid' | 'service_unavailable' | 'unknown';
  provider?: 'gemini' | 'openai';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalDetails: string;
  actionItems: string[];
  waitTime?: number; // in seconds
  retryable: boolean;
}

class ErrorMessageHelper {
  
  analyzeError(error: any, provider?: string): ErrorAnalysis {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.code;
    
    // Determine error type
    let type: ErrorAnalysis['type'] = 'unknown';
    let severity: ErrorAnalysis['severity'] = 'medium';
    let waitTime: number | undefined;
    let retryable = true;

    // Rate limit detection
    if (this.isRateLimitError(error)) {
      type = 'rate_limit';
      severity = 'medium';
      waitTime = this.extractWaitTime(message) || 60;
      retryable = true;
    }
    // Quota exceeded detection
    else if (this.isQuotaError(error)) {
      type = 'quota_exceeded';
      severity = 'high';
      waitTime = this.isMinuteQuota(message) ? 60 : 3600; // 1 minute or 1 hour
      retryable = true;
    }
    // API key issues
    else if (this.isApiKeyError(error)) {
      type = 'api_key_invalid';
      severity = 'high';
      retryable = false;
    }
    // Service unavailable
    else if (status >= 500 || message.includes('service unavailable') || message.includes('internal error')) {
      type = 'service_unavailable';
      severity = 'medium';
      waitTime = 300; // 5 minutes
      retryable = true;
    }

    const analysis: ErrorAnalysis = {
      type,
      provider: provider as any,
      severity,
      userMessage: this.generateUserMessage(type, provider, waitTime),
      technicalDetails: this.generateTechnicalDetails(error, type),
      actionItems: this.generateActionItems(type, provider, waitTime),
      waitTime,
      retryable
    };

    logger.warn('Error analysis completed', 'ERROR_HELPER', {
      originalError: error.message,
      analysis: {
        type: analysis.type,
        provider: analysis.provider,
        severity: analysis.severity,
        waitTime: analysis.waitTime,
        retryable: analysis.retryable
      }
    });

    return analysis;
  }

  private isRateLimitError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.code;
    
    return (
      status === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('requests per minute') ||
      message.includes('tokens per minute') ||
      (message.includes('quota') && message.includes('minute'))
    );
  }

  private isQuotaError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    
    return (
      message.includes('quota exceeded') ||
      message.includes('current quota') ||
      message.includes('billing') ||
      message.includes('free tier') ||
      message.includes('daily limit') ||
      message.includes('check your plan')
    );
  }

  private isApiKeyError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.code;
    
    return (
      status === 401 ||
      status === 403 ||
      message.includes('api_key_invalid') ||
      message.includes('unauthorized') ||
      message.includes('invalid key') ||
      message.includes('authentication')
    );
  }

  private isMinuteQuota(message: string): boolean {
    return message.includes('minute') || message.includes('per minute');
  }

  private extractWaitTime(message: string): number | undefined {
    // Try to extract wait time from error message
    const matches = message.match(/(\d+)\s*(second|minute|hour)/);
    if (matches) {
      const value = parseInt(matches[1]);
      const unit = matches[2];
      
      switch (unit) {
        case 'second': return value;
        case 'minute': return value * 60;
        case 'hour': return value * 3600;
      }
    }
    return undefined;
  }

  private generateUserMessage(type: ErrorAnalysis['type'], provider?: string, waitTime?: number): string {
    const providerName = provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'AI service';
    
    switch (type) {
      case 'rate_limit':
        return `You're sending requests too quickly to ${providerName}. Please wait ${waitTime ? Math.ceil(waitTime / 60) : 1} minute(s) before trying again.`;
      
      case 'quota_exceeded':
        const quotaType = waitTime && waitTime <= 60 ? 'minute' : 'daily';
        return `Your personal ${providerName} API key has reached its ${quotaType} quota limit. ${waitTime ? `Please wait ${Math.ceil(waitTime / 60)} minute(s) before trying again.` : 'Please check your usage limits at the provider\'s dashboard.'}`;
      
      case 'api_key_invalid':
        return `Your ${providerName} API key appears to be invalid or unauthorized. Please check your API key configuration.`;
      
      case 'service_unavailable':
        return `${providerName} is temporarily unavailable. This is usually a temporary issue that resolves automatically.`;
      
      default:
        return `There was an issue communicating with ${providerName}. Please try again in a moment.`;
    }
  }

  private generateTechnicalDetails(error: any, type: ErrorAnalysis['type']): string {
    return `Error Type: ${type}\nStatus: ${error?.status || 'Unknown'}\nMessage: ${error?.message || 'No message'}\nTimestamp: ${new Date().toISOString()}`;
  }

  private generateActionItems(type: ErrorAnalysis['type'], provider?: string, waitTime?: number): string[] {
    const actions: string[] = [];
    
    switch (type) {
      case 'rate_limit':
        actions.push(`Wait ${waitTime ? Math.ceil(waitTime / 60) : 1} minute(s) before sending another request`);
        actions.push('Consider spacing out your requests more');
        actions.push('The system will automatically retry with proper delays');
        if (provider === 'gemini') {
          actions.push('Gemini 2.0 Flash allows 1000 requests per minute - check if you have exceeded daily limits');
        }
        break;
      
      case 'quota_exceeded':
        if (provider === 'gemini') {
          actions.push('Visit https://console.cloud.google.com/apis/api/generativeai.googleapis.com to check your usage');
          actions.push('Gemini API provides generous free tier limits (1,500 requests/day)');
          actions.push('Consider upgrading to a paid plan for higher quotas');
        } else if (provider === 'openai') {
          actions.push('Visit https://platform.openai.com/usage to check your usage');
          actions.push('Add billing information to increase your quota');
          actions.push('Consider upgrading your plan for higher rate limits');
        }
        actions.push(`Wait ${waitTime ? Math.ceil(waitTime / 60) : 60} minute(s) for quota to reset`);
        actions.push('The system will automatically switch to backup providers if available');
        break;
      
      case 'api_key_invalid':
        actions.push('Go to Settings and verify your API key');
        if (provider === 'gemini') {
          actions.push('Get a new API key from https://aistudio.google.com/app/apikey');
        } else if (provider === 'openai') {
          actions.push('Get a new API key from https://platform.openai.com/api-keys');
        }
        actions.push('Make sure the API key has the correct permissions');
        actions.push('Check that the API key is not expired');
        break;
      
      case 'service_unavailable':
        actions.push('Wait a few minutes and try again');
        actions.push('Check the provider\'s status page for known issues');
        actions.push('The system will automatically retry with exponential backoff');
        actions.push('Consider using an alternative provider if available');
        break;
      
      default:
        actions.push('Try again in a few moments');
        actions.push('Check your internet connection');
        actions.push('Verify your API key configuration');
        actions.push('Contact support if the issue persists');
        break;
    }
    
    return actions;
  }

  // Generate a comprehensive error response for users
  generateErrorResponse(error: any, provider?: string): string {
    const analysis = this.analyzeError(error, provider);
    
    let response = `${analysis.userMessage}\n\n`;
    
    // Add severity indicator
    const severityEmoji = {
      low: '💡',
      medium: '⚠️', 
      high: '🚨',
      critical: '🔴'
    };
    
    response += `${severityEmoji[analysis.severity]} What to do:\n`;
    analysis.actionItems.forEach((action, index) => {
      response += `${index + 1}. ${action}\n`;
    });
    
    // Add provider-specific help
    if (analysis.provider === 'gemini') {
      response += `\n💡 About Gemini API:\n`;
      response += `• Free tier: 60 requests/minute, 1,500 requests/day\n`;
      response += `• Very generous token limits (32K tokens/minute)\n`;
      response += `• Upgrade available for higher limits\n`;
    } else if (analysis.provider === 'openai') {
      response += `\n💡 About OpenAI API:\n`;
      response += `• Pay-as-you-go pricing\n`;
      response += `• Rate limits depend on your tier\n`;
      response += `• Higher tiers get better rate limits\n`;
    }
    
    // Add automatic recovery info
    if (analysis.retryable) {
      response += `\n🔄 Automatic Recovery:\n`;
      response += `The system will automatically retry when possible and switch to backup providers when available.\n`;
      
      if (analysis.waitTime) {
        response += `Estimated recovery time: ${Math.ceil(analysis.waitTime / 60)} minute(s)\n`;
      }
    }
    
    return response;
  }
}

export const errorMessageHelper = new ErrorMessageHelper();
export type { ErrorAnalysis };