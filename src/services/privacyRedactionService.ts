/**
 * Privacy Redaction Service
 * 
 * Implements Echelon-style privacy-first defaults with redaction middleware
 * Provides automatic PII detection and removal while maintaining utility
 * 
 * Features:
 * - Real-time PII detection and redaction
 * - Configurable redaction levels
 * - Safe aggregation metrics
 * - FERPA-compliant data handling
 * - Zero-trust approach to data persistence
 */

import { logger } from '@/utils/logger';

interface RedactionConfig {
  level: 'minimal' | 'standard' | 'aggressive';
  preserve_context: boolean;
  anonymize_identifiers: boolean;
  redact_academic_details: boolean;
  enable_safe_aggregation: boolean;
}

interface RedactionResult {
  original_text: string;
  redacted_text: string;
  redaction_count: number;
  redacted_entities: Array<{
    type: 'name' | 'email' | 'id' | 'phone' | 'address' | 'academic_record' | 'sensitive_data';
    original: string;
    redacted: string;
    confidence: number;
  }>;
  safety_score: number; // 0-100, higher = safer
}

interface SafeMetric {
  metric_name: string;
  value: number;
  aggregation_type: 'count' | 'average' | 'median' | 'percentile';
  anonymization_applied: boolean;
  differential_privacy_noise: number;
}

interface ConsentSettings {
  allow_anonymous_metrics: boolean;
  allow_redacted_examples: boolean;
  allow_academic_progress_tracking: boolean;
  data_retention_days: number;
  sharing_permissions: {
    academic_advisors: boolean;
    system_improvement: boolean;
    research_anonymized: boolean;
  };
}

class PrivacyRedactionService {
  private redaction_patterns: Map<string, RegExp[]>;
  private replacement_tokens: Map<string, string[]>;
  private consent_settings: Map<string, ConsentSettings>;
  private safe_metrics_cache: Map<string, SafeMetric[]>;
  private redaction_history: Array<{ timestamp: Date; user_id: string; redaction_count: number }>;

  constructor() {
    this.redaction_patterns = new Map();
    this.replacement_tokens = new Map();
    this.consent_settings = new Map();
    this.safe_metrics_cache = new Map();
    this.redaction_history = [];
    
    this.initializeRedactionPatterns();
    this.initializeReplacementTokens();
    this.loadUserConsent();
    
    logger.info('Privacy Redaction Service initialized', 'PRIVACY', {
      patterns_loaded: this.redaction_patterns.size,
      privacy_first: true
    });
  }

  /**
   * Redact PII from text based on configuration
   */
  redactText(
    text: string, 
    user_id: string = 'anonymous', 
    config: Partial<RedactionConfig> = {}
  ): RedactionResult {
    const full_config: RedactionConfig = {
      level: 'standard',
      preserve_context: true,
      anonymize_identifiers: true,
      redact_academic_details: false,
      enable_safe_aggregation: true,
      ...config
    };

    const user_consent = this.getUserConsent(user_id);
    let redacted_text = text;
    const redacted_entities: any[] = [];
    let redaction_count = 0;

    try {
      // Apply redaction patterns based on configuration level
      const patterns_to_apply = this.selectRedactionPatterns(full_config.level);
      
      for (const [entity_type, patterns] of patterns_to_apply) {
        for (const pattern of patterns) {
          const matches = text.match(pattern);
          if (matches) {
            for (const match of matches) {
              const replacement = this.generateReplacement(entity_type, match, full_config);
              redacted_text = redacted_text.replace(match, replacement);
              
              redacted_entities.push({
                type: entity_type,
                original: match,
                redacted: replacement,
                confidence: this.calculateConfidence(entity_type, match)
              });
              
              redaction_count++;
            }
          }
        }
      }

      // Apply academic data redaction if configured
      if (full_config.redact_academic_details) {
        const academic_redaction = this.redactAcademicDetails(redacted_text, user_consent);
        redacted_text = academic_redaction.text;
        redacted_entities.push(...academic_redaction.entities);
        redaction_count += academic_redaction.count;
      }

      // Calculate safety score
      const safety_score = this.calculateSafetyScore(text, redacted_text, redacted_entities);

      // Record redaction for metrics (if consented)
      if (user_consent.allow_anonymous_metrics) {
        this.recordRedactionMetrics(user_id, redaction_count);
      }

      const result: RedactionResult = {
        original_text: text,
        redacted_text,
        redaction_count,
        redacted_entities,
        safety_score
      };

      logger.info('Text redaction completed', 'PRIVACY', {
        user_id: user_id.substring(0, 8) + '...',
        redaction_count,
        safety_score,
        config_level: full_config.level
      });

      return result;

    } catch (error) {
      logger.error('Redaction failed', 'PRIVACY', error);
      // Return safe fallback - heavily redacted version
      return {
        original_text: text,
        redacted_text: '[REDACTED FOR PRIVACY]',
        redaction_count: 1,
        redacted_entities: [{
          type: 'sensitive_data',
          original: text,
          redacted: '[REDACTED FOR PRIVACY]',
          confidence: 1.0
        }],
        safety_score: 100
      };
    }
  }

  /**
   * Process conversation for safe storage with consent checks
   */
  processConversationForStorage(
    user_query: string,
    ai_response: string,
    user_id: string,
    session_id: string
  ): {
    should_store: boolean;
    processed_query: string;
    processed_response: string;
    consent_status: string;
    redaction_summary: { query_redactions: number; response_redactions: number };
  } {
    const user_consent = this.getUserConsent(user_id);
    
    // Default: no storage unless explicitly consented
    if (!user_consent.allow_academic_progress_tracking) {
      return {
        should_store: false,
        processed_query: '[NOT STORED - NO CONSENT]',
        processed_response: '[NOT STORED - NO CONSENT]',
        consent_status: 'storage_not_permitted',
        redaction_summary: { query_redactions: 0, response_redactions: 0 }
      };
    }

    // Apply redaction to conversation content
    const query_redaction = this.redactText(user_query, user_id, {
      level: 'standard',
      preserve_context: true,
      anonymize_identifiers: true,
      redact_academic_details: false
    });

    const response_redaction = this.redactText(ai_response, user_id, {
      level: 'minimal', // Less aggressive for AI responses
      preserve_context: true,
      anonymize_identifiers: false,
      redact_academic_details: false
    });

    return {
      should_store: true,
      processed_query: query_redaction.redacted_text,
      processed_response: response_redaction.redacted_text,
      consent_status: 'consented_with_redaction',
      redaction_summary: {
        query_redactions: query_redaction.redaction_count,
        response_redactions: response_redaction.redaction_count
      }
    };
  }

  /**
   * Generate safe aggregated metrics for admin dashboard
   */
  generateSafeMetrics(
    time_period: 'day' | 'week' | 'month',
    include_differential_privacy: boolean = true
  ): SafeMetric[] {
    const cache_key = `${time_period}_${include_differential_privacy}`;
    const cached = this.safe_metrics_cache.get(cache_key);
    
    if (cached) {
      return cached;
    }

    const metrics: SafeMetric[] = [];

    try {
      // Active user count (anonymized)
      const active_users = this.calculateActiveUsers(time_period);
      const noise = include_differential_privacy ? this.addDifferentialPrivacyNoise(active_users, 0.1) : 0;
      
      metrics.push({
        metric_name: 'active_users',
        value: Math.max(0, active_users + noise),
        aggregation_type: 'count',
        anonymization_applied: true,
        differential_privacy_noise: Math.abs(noise)
      });

      // Average redaction rate
      const avg_redaction_rate = this.calculateAverageRedactionRate(time_period);
      const redaction_noise = include_differential_privacy ? this.addDifferentialPrivacyNoise(avg_redaction_rate, 0.05) : 0;
      
      metrics.push({
        metric_name: 'avg_redaction_rate',
        value: Math.max(0, avg_redaction_rate + redaction_noise),
        aggregation_type: 'average',
        anonymization_applied: true,
        differential_privacy_noise: Math.abs(redaction_noise)
      });

      // System latency (safe - no PII)
      metrics.push({
        metric_name: 'avg_response_time_ms',
        value: 850, // Mock value
        aggregation_type: 'average',
        anonymization_applied: false,
        differential_privacy_noise: 0
      });

      // Retrieval hit rate (safe - no PII)
      metrics.push({
        metric_name: 'retrieval_hit_rate',
        value: 0.78, // Mock value
        aggregation_type: 'average',
        anonymization_applied: false,
        differential_privacy_noise: 0
      });

      // Cache results
      this.safe_metrics_cache.set(cache_key, metrics);
      
      logger.info('Safe metrics generated', 'PRIVACY', {
        time_period,
        metrics_count: metrics.length,
        differential_privacy: include_differential_privacy
      });

      return metrics;

    } catch (error) {
      logger.error('Safe metrics generation failed', 'PRIVACY', error);
      return [];
    }
  }

  /**
   * Update user consent settings
   */
  updateUserConsent(user_id: string, consent: Partial<ConsentSettings>): void {
    const current_consent = this.getUserConsent(user_id);
    const updated_consent: ConsentSettings = { ...current_consent, ...consent };
    
    this.consent_settings.set(user_id, updated_consent);
    
    // Persist consent (in production, this would go to secure storage)
    try {
      localStorage.setItem(
        `boilerai_privacy_consent_${user_id}`,
        JSON.stringify(updated_consent)
      );
      
      logger.info('User consent updated', 'PRIVACY', {
        user_id: user_id.substring(0, 8) + '...',
        anonymous_metrics: updated_consent.allow_anonymous_metrics,
        progress_tracking: updated_consent.allow_academic_progress_tracking
      });
    } catch (error) {
      logger.error('Failed to persist consent settings', 'PRIVACY', error);
    }
  }

  /**
   * Get current user consent settings
   */
  getUserConsent(user_id: string): ConsentSettings {
    if (this.consent_settings.has(user_id)) {
      return this.consent_settings.get(user_id)!;
    }

    // Load from storage
    try {
      const stored = localStorage.getItem(`boilerai_privacy_consent_${user_id}`);
      if (stored) {
        const consent = JSON.parse(stored);
        this.consent_settings.set(user_id, consent);
        return consent;
      }
    } catch (error) {
      logger.warn('Failed to load consent settings', 'PRIVACY', error);
    }

    // Return privacy-first defaults
    const default_consent: ConsentSettings = {
      allow_anonymous_metrics: false,
      allow_redacted_examples: false,
      allow_academic_progress_tracking: false,
      data_retention_days: 0, // No retention by default
      sharing_permissions: {
        academic_advisors: false,
        system_improvement: false,
        research_anonymized: false
      }
    };

    this.consent_settings.set(user_id, default_consent);
    return default_consent;
  }

  /**
   * Clear all stored data for a user (GDPR compliance)
   */
  clearUserData(user_id: string): void {
    try {
      // Remove from memory
      this.consent_settings.delete(user_id);
      
      // Remove from localStorage
      localStorage.removeItem(`boilerai_privacy_consent_${user_id}`);
      localStorage.removeItem(`boilerai_conversation_${user_id}`);
      localStorage.removeItem(`boilerai_academic_profile_${user_id}`);
      
      // Filter out user from redaction history
      this.redaction_history = this.redaction_history.filter(
        entry => entry.user_id !== user_id
      );
      
      logger.info('User data cleared', 'PRIVACY', {
        user_id: user_id.substring(0, 8) + '...',
        compliance: 'GDPR'
      });
      
    } catch (error) {
      logger.error('Failed to clear user data', 'PRIVACY', error);
    }
  }

  /**
   * Generate privacy report for transparency
   */
  generatePrivacyReport(user_id: string): {
    data_stored: boolean;
    consent_status: ConsentSettings;
    redaction_history: { total_redactions: number; last_30_days: number };
    data_retention_status: string;
    privacy_score: number;
  } {
    const consent = this.getUserConsent(user_id);
    
    // Calculate redaction history for user
    const user_redactions = this.redaction_history.filter(entry => entry.user_id === user_id);
    const thirty_days_ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent_redactions = user_redactions.filter(entry => entry.timestamp > thirty_days_ago);
    
    const total_redactions = user_redactions.reduce((sum, entry) => sum + entry.redaction_count, 0);
    const recent_total = recent_redactions.reduce((sum, entry) => sum + entry.redaction_count, 0);
    
    // Calculate privacy score (higher = more private)
    let privacy_score = 100;
    if (consent.allow_anonymous_metrics) privacy_score -= 10;
    if (consent.allow_redacted_examples) privacy_score -= 15;
    if (consent.allow_academic_progress_tracking) privacy_score -= 25;
    if (consent.sharing_permissions.system_improvement) privacy_score -= 20;
    if (consent.sharing_permissions.research_anonymized) privacy_score -= 10;
    
    // Bonus for active redaction use
    if (total_redactions > 10) privacy_score += 5;
    
    const data_stored = consent.allow_academic_progress_tracking || 
                       consent.allow_anonymous_metrics ||
                       consent.allow_redacted_examples;
    
    const retention_status = consent.data_retention_days === 0 ? 'no_retention' : 
                           consent.data_retention_days <= 30 ? 'short_term' :
                           consent.data_retention_days <= 365 ? 'medium_term' : 'long_term';

    return {
      data_stored,
      consent_status: consent,
      redaction_history: {
        total_redactions,
        last_30_days: recent_total
      },
      data_retention_status: retention_status,
      privacy_score: Math.max(0, Math.min(100, privacy_score))
    };
  }

  // Private helper methods

  private initializeRedactionPatterns(): void {
    // Email patterns
    this.redaction_patterns.set('email', [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      /\b[A-Za-z0-9._%+-]+@purdue\.edu\b/g
    ]);
    
    // Name patterns (simple heuristics)
    this.redaction_patterns.set('name', [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last
      /\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+\b/g, // First M. Last
    ]);
    
    // ID patterns
    this.redaction_patterns.set('id', [
      /\b\d{8,10}\b/g, // Student IDs
      /\b[A-Z]{2}\d{6,8}\b/g, // Formatted IDs
    ]);
    
    // Phone patterns
    this.redaction_patterns.set('phone', [
      /\b\d{3}-\d{3}-\d{4}\b/g,
      /\b\(\d{3}\)\s*\d{3}-\d{4}\b/g,
      /\b\d{10}\b/g
    ]);
    
    // Address patterns
    this.redaction_patterns.set('address', [
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b/gi
    ]);
  }

  private initializeReplacementTokens(): void {
    this.replacement_tokens.set('email', ['[EMAIL]', '[EMAIL_ADDRESS]', '[STUDENT_EMAIL]']);
    this.replacement_tokens.set('name', ['[NAME]', '[STUDENT_NAME]', '[PERSON]']);
    this.replacement_tokens.set('id', ['[ID]', '[STUDENT_ID]', '[IDENTIFIER]']);
    this.replacement_tokens.set('phone', ['[PHONE]', '[PHONE_NUMBER]']);
    this.replacement_tokens.set('address', ['[ADDRESS]', '[LOCATION]']);
    this.replacement_tokens.set('academic_record', ['[GRADE]', '[COURSE_GRADE]', '[ACADEMIC_RECORD]']);
  }

  private selectRedactionPatterns(level: string): Map<string, RegExp[]> {
    const patterns = new Map();
    
    // Always redact high-sensitivity items
    patterns.set('email', this.redaction_patterns.get('email'));
    patterns.set('phone', this.redaction_patterns.get('phone'));
    patterns.set('id', this.redaction_patterns.get('id'));
    
    if (level === 'standard' || level === 'aggressive') {
      patterns.set('name', this.redaction_patterns.get('name'));
      patterns.set('address', this.redaction_patterns.get('address'));
    }
    
    return patterns;
  }

  private generateReplacement(entity_type: string, original: string, config: RedactionConfig): string {
    if (!config.preserve_context) {
      return '[REDACTED]';
    }
    
    const tokens = this.replacement_tokens.get(entity_type) || ['[REDACTED]'];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    
    if (config.anonymize_identifiers && entity_type === 'name') {
      // Generate consistent anonymized name
      const hash = this.simpleHash(original);
      return `[STUDENT_${hash.toString(36).toUpperCase().substring(0, 6)}]`;
    }
    
    return token;
  }

  private redactAcademicDetails(text: string, consent: ConsentSettings): {
    text: string;
    entities: any[];
    count: number;
  } {
    if (consent.allow_academic_progress_tracking) {
      return { text, entities: [], count: 0 };
    }
    
    let redacted_text = text;
    const entities: any[] = [];
    let count = 0;
    
    // Grade patterns
    const grade_patterns = [
      /\b[A-F][+-]?\b/g,
      /\bGPA:?\s*\d+\.\d+/gi,
      /\b\d+\.\d+\s*GPA\b/gi
    ];
    
    for (const pattern of grade_patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          redacted_text = redacted_text.replace(match, '[ACADEMIC_RECORD]');
          entities.push({
            type: 'academic_record',
            original: match,
            redacted: '[ACADEMIC_RECORD]',
            confidence: 0.9
          });
          count++;
        }
      }
    }
    
    return { text: redacted_text, entities, count };
  }

  private calculateConfidence(entity_type: string, text: string): number {
    // Simple confidence calculation based on pattern strength
    const confidences: Record<string, number> = {
      email: 0.95,
      phone: 0.90,
      id: 0.85,
      name: 0.70,
      address: 0.75,
      academic_record: 0.80
    };
    
    return confidences[entity_type] || 0.50;
  }

  private calculateSafetyScore(original: string, redacted: string, entities: any[]): number {
    const redaction_ratio = entities.length / (original.split(/\s+/).length + 1);
    const high_confidence_redactions = entities.filter(e => e.confidence > 0.8).length;
    
    let score = 50; // Base score
    score += redaction_ratio * 30; // Bonus for redaction coverage
    score += (high_confidence_redactions / entities.length) * 20; // Bonus for high confidence
    
    return Math.min(100, Math.max(0, score));
  }

  private recordRedactionMetrics(user_id: string, count: number): void {
    this.redaction_history.push({
      timestamp: new Date(),
      user_id,
      redaction_count: count
    });
    
    // Keep only last 1000 entries for memory management
    if (this.redaction_history.length > 1000) {
      this.redaction_history = this.redaction_history.slice(-1000);
    }
  }

  private calculateActiveUsers(time_period: string): number {
    const now = new Date();
    let cutoff_date: Date;
    
    switch (time_period) {
      case 'day':
        cutoff_date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoff_date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoff_date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoff_date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const active_user_ids = new Set(
      this.redaction_history
        .filter(entry => entry.timestamp > cutoff_date)
        .map(entry => entry.user_id)
    );
    
    return active_user_ids.size;
  }

  private calculateAverageRedactionRate(time_period: string): number {
    const recent_entries = this.redaction_history.filter(entry => {
      const age_hours = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60);
      
      switch (time_period) {
        case 'day': return age_hours <= 24;
        case 'week': return age_hours <= 24 * 7;
        case 'month': return age_hours <= 24 * 30;
        default: return age_hours <= 24;
      }
    });
    
    if (recent_entries.length === 0) return 0;
    
    const total_redactions = recent_entries.reduce((sum, entry) => sum + entry.redaction_count, 0);
    return total_redactions / recent_entries.length;
  }

  private addDifferentialPrivacyNoise(value: number, epsilon: number): number {
    // Simple Laplace mechanism for differential privacy
    const sensitivity = 1; // Sensitivity of the query
    const scale = sensitivity / epsilon;
    
    // Generate Laplace noise
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    
    return noise;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private loadUserConsent(): void {
    // This would load consent settings from secure storage in production
    // For now, just initialize with privacy-first defaults
    logger.info('User consent settings loaded with privacy-first defaults', 'PRIVACY');
  }
}

export const privacyRedactionService = new PrivacyRedactionService();
export default privacyRedactionService;