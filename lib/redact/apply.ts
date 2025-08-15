// Apply redaction pipeline - combines regex patterns and NER
// Client-side PII removal before any data leaves the device

import { ALL_REDACTION_PATTERNS, RedactionPattern, getHighConfidencePatterns } from './patterns'
import { ner, NEREntity, NERResult } from './ner'

export interface RedactionMatch {
  text: string
  replacement: string
  start: number
  end: number
  confidence: number
  source: 'pattern' | 'ner'
  category: string
  patternName?: string
  entityLabel?: string
}

export interface RedactionResult {
  originalText: string
  redactedText: string
  matches: RedactionMatch[]
  confidence: number
  stats: {
    totalMatches: number
    highConfidenceMatches: number
    categoryCounts: Record<string, number>
  }
}

export interface RedactionOptions {
  usePatterns: boolean
  useNER: boolean
  minConfidence: number
  enabledCategories: Set<string>
  aggressiveMode: boolean
  preserveFormatting: boolean
}

const DEFAULT_OPTIONS: RedactionOptions = {
  usePatterns: true,
  useNER: true,
  minConfidence: 0.7,
  enabledCategories: new Set(['pii', 'academic', 'contact', 'financial']),
  aggressiveMode: false,
  preserveFormatting: true,
}

export class RedactionEngine {
  private options: RedactionOptions

  constructor(options: Partial<RedactionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Apply full redaction pipeline to text
   */
  redactText(text: string, customOptions?: Partial<RedactionOptions>): RedactionResult {
    const opts = { ...this.options, ...customOptions }
    const matches: RedactionMatch[] = []

    // Step 1: Apply regex patterns
    if (opts.usePatterns) {
      matches.push(...this.applyPatterns(text, opts))
    }

    // Step 2: Apply NER
    if (opts.useNER) {
      matches.push(...this.applyNER(text, opts))
    }

    // Step 3: Resolve conflicts and apply redactions
    const resolvedMatches = this.resolveConflicts(matches)
    const redactedText = this.applyRedactions(text, resolvedMatches, opts)

    // Step 4: Calculate confidence and stats
    const confidence = this.calculateOverallConfidence(resolvedMatches)
    const stats = this.calculateStats(resolvedMatches)

    return {
      originalText: text,
      redactedText,
      matches: resolvedMatches,
      confidence,
      stats,
    }
  }

  /**
   * Apply regex patterns to find PII
   */
  private applyPatterns(text: string, options: RedactionOptions): RedactionMatch[] {
    const matches: RedactionMatch[] = []
    const patterns = options.aggressiveMode 
      ? ALL_REDACTION_PATTERNS 
      : getHighConfidencePatterns(options.minConfidence)

    for (const pattern of patterns) {
      // Skip if category not enabled
      if (!options.enabledCategories.has(pattern.category)) {
        continue
      }

      // Skip if confidence too low
      if (pattern.confidence < options.minConfidence) {
        continue
      }

      // Apply pattern
      let match
      // Reset pattern lastIndex to avoid state issues
      pattern.pattern.lastIndex = 0
      
      while ((match = pattern.pattern.exec(text)) !== null) {
        matches.push({
          text: match[0],
          replacement: pattern.replacement,
          start: match.index,
          end: match.index + match[0].length,
          confidence: pattern.confidence,
          source: 'pattern',
          category: pattern.category,
          patternName: pattern.name,
        })

        // Prevent infinite loops with global patterns
        if (!pattern.pattern.global) {
          break
        }
      }
    }

    return matches
  }

  /**
   * Apply NER to find entities
   */
  private applyNER(text: string, options: RedactionOptions): RedactionMatch[] {
    const nerResult = ner.processText(text)
    return nerResult.entities
      .filter(entity => entity.confidence >= options.minConfidence)
      .map(entity => ({
        text: entity.text,
        replacement: this.getEntityReplacement(entity),
        start: entity.start,
        end: entity.end,
        confidence: entity.confidence,
        source: 'ner' as const,
        category: this.getEntityCategory(entity),
        entityLabel: entity.label,
      }))
  }

  /**
   * Get replacement text for NER entity
   */
  private getEntityReplacement(entity: NEREntity): string {
    const replacements = {
      PERSON: '[NAME]',
      ORG: '[ORGANIZATION]',
      GPE: '[LOCATION]',
      COURSE: '[COURSE]',
      GRADE: '[GRADE]',
      DATE: '[DATE]',
      ID: '[ID]',
    }
    return replacements[entity.label] || '[REDACTED]'
  }

  /**
   * Map NER entity to category
   */
  private getEntityCategory(entity: NEREntity): string {
    const categoryMap = {
      PERSON: 'pii',
      ORG: 'academic',
      GPE: 'location',
      COURSE: 'academic',
      GRADE: 'academic',
      DATE: 'pii',
      ID: 'pii',
    }
    return categoryMap[entity.label] || 'pii'
  }

  /**
   * Resolve overlapping matches (keep highest confidence)
   */
  private resolveConflicts(matches: RedactionMatch[]): RedactionMatch[] {
    // Sort by position
    const sorted = [...matches].sort((a, b) => a.start - b.start)
    const resolved: RedactionMatch[] = []

    for (const match of sorted) {
      let hasOverlap = false
      
      // Check against existing resolved matches
      for (let i = resolved.length - 1; i >= 0; i--) {
        const existing = resolved[i]
        
        if (this.matchesOverlap(match, existing)) {
          hasOverlap = true
          
          // Keep the match with higher confidence
          if (match.confidence > existing.confidence) {
            resolved[i] = match
          }
          break
        }
      }

      if (!hasOverlap) {
        resolved.push(match)
      }
    }

    return resolved.sort((a, b) => a.start - b.start)
  }

  /**
   * Check if two matches overlap
   */
  private matchesOverlap(a: RedactionMatch, b: RedactionMatch): boolean {
    return !(a.end <= b.start || b.end <= a.start)
  }

  /**
   * Apply redactions to text
   */
  private applyRedactions(
    text: string, 
    matches: RedactionMatch[], 
    options: RedactionOptions
  ): string {
    // Sort by position (descending) to avoid index shifts
    const sortedMatches = [...matches].sort((a, b) => b.start - a.start)
    
    let result = text
    for (const match of sortedMatches) {
      let replacement = match.replacement
      
      // Preserve formatting if enabled
      if (options.preserveFormatting) {
        replacement = this.preserveFormatting(match.text, replacement)
      }
      
      result = result.slice(0, match.start) + replacement + result.slice(match.end)
    }

    return result
  }

  /**
   * Preserve original formatting (capitalization, spacing)
   */
  private preserveFormatting(original: string, replacement: string): string {
    // If original is all caps, make replacement caps
    if (original === original.toUpperCase() && original !== original.toLowerCase()) {
      return replacement.toUpperCase()
    }
    
    // If original starts with capital, capitalize replacement
    if (original[0] && original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
    }
    
    return replacement
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(matches: RedactionMatch[]): number {
    if (matches.length === 0) return 1.0

    // Weight by match length and confidence
    let totalWeight = 0
    let weightedSum = 0

    for (const match of matches) {
      const weight = match.end - match.start
      totalWeight += weight
      weightedSum += weight * match.confidence
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 1.0
  }

  /**
   * Calculate redaction statistics
   */
  private calculateStats(matches: RedactionMatch[]) {
    const categoryCounts: Record<string, number> = {}
    let highConfidenceMatches = 0

    for (const match of matches) {
      categoryCounts[match.category] = (categoryCounts[match.category] || 0) + 1
      
      if (match.confidence >= 0.8) {
        highConfidenceMatches++
      }
    }

    return {
      totalMatches: matches.length,
      highConfidenceMatches,
      categoryCounts,
    }
  }

  /**
   * Preview redaction with highlights (for UI)
   */
  previewRedaction(text: string): {
    highlightedText: string
    matches: RedactionMatch[]
  } {
    const result = this.redactText(text)
    
    // Create highlighted version with placeholders
    let highlightedText = text
    const sortedMatches = [...result.matches].sort((a, b) => b.start - a.start)
    
    for (const match of sortedMatches) {
      const highlight = `<mark data-category="${match.category}" data-confidence="${match.confidence}">${match.text}</mark>`
      highlightedText = highlightedText.slice(0, match.start) + highlight + highlightedText.slice(match.end)
    }

    return {
      highlightedText,
      matches: result.matches,
    }
  }

  /**
   * Test if text contains likely PII
   */
  containsPII(text: string): boolean {
    const result = this.redactText(text, { minConfidence: 0.8 })
    return result.stats.highConfidenceMatches > 0
  }

  /**
   * Update redaction options
   */
  updateOptions(newOptions: Partial<RedactionOptions>): void {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * Get current options
   */
  getOptions(): RedactionOptions {
    return { ...this.options }
  }

  /**
   * Get recommended redaction for sharing
   */
  getRecommendedRedaction(text: string): RedactionResult {
    // Use aggressive settings for sharing
    return this.redactText(text, {
      usePatterns: true,
      useNER: true,
      minConfidence: 0.6, // Lower threshold to catch more
      enabledCategories: new Set(['pii', 'academic', 'contact', 'financial', 'location']),
      aggressiveMode: true,
      preserveFormatting: true,
    })
  }

  /**
   * Validate redaction quality
   */
  validateRedaction(original: string, redacted: string): {
    isValid: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check if any high-confidence patterns remain
    const remainingPII = this.redactText(redacted, { minConfidence: 0.9 })
    if (remainingPII.stats.highConfidenceMatches > 0) {
      issues.push('High-confidence PII patterns still detected')
      recommendations.push('Review and manually redact remaining sensitive information')
    }

    // Check for common PII that might be missed
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    if (emailPattern.test(redacted)) {
      issues.push('Email addresses detected')
      recommendations.push('Manually review email addresses')
    }

    // Check for numbers that might be IDs
    const numberPattern = /\b\d{8,}\b/g
    const longNumbers = redacted.match(numberPattern) || []
    if (longNumbers.length > 0) {
      issues.push(`${longNumbers.length} long number(s) detected`)
      recommendations.push('Review long numbers - they might be IDs')
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    }
  }
}

// Global redaction engine instance
export const redactionEngine = new RedactionEngine()

/**
 * Quick redaction function for simple use cases
 */
export function quickRedact(text: string, aggressive: boolean = false): string {
  const options = aggressive 
    ? { aggressiveMode: true, minConfidence: 0.5 }
    : { minConfidence: 0.8 }
  
  return redactionEngine.redactText(text, options).redactedText
}

/**
 * Check if text is safe to share (minimal PII)
 */
export function isSafeToShare(text: string): boolean {
  return !redactionEngine.containsPII(text)
}