// Regex patterns for client-side PII redaction
// Protects Purdue student data and general PII

export interface RedactionPattern {
  name: string
  pattern: RegExp
  replacement: string
  confidence: number // 0-1, how confident we are this is PII
  category: 'pii' | 'academic' | 'contact' | 'financial' | 'location'
}

// Core PII patterns
export const PII_PATTERNS: RedactionPattern[] = [
  // Email addresses
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
    confidence: 0.95,
    category: 'contact',
  },

  // Phone numbers (various formats)
  {
    name: 'phone_us',
    pattern: /\b(?:\+1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: '[PHONE]',
    confidence: 0.90,
    category: 'contact',
  },

  // Social Security Numbers
  {
    name: 'ssn',
    pattern: /\b(?:SSN|ssn|Social Security|social security)?\s*:?\s*\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    replacement: '[SSN]',
    confidence: 0.98,
    category: 'pii',
  },

  // Credit card numbers (basic pattern)
  {
    name: 'credit_card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    replacement: '[CARD]',
    confidence: 0.95,
    category: 'financial',
  },
]

// Academic-specific patterns
export const ACADEMIC_PATTERNS: RedactionPattern[] = [
  // Purdue Student ID (10 digits)
  {
    name: 'purdue_student_id',
    pattern: /\b(?:Student ID|student id|ID|id|PUID|puid)\s*:?\s*\d{10}\b/gi,
    replacement: '[STUDENT_ID]',
    confidence: 0.92,
    category: 'academic',
  },

  // Course codes (CS 180, MATH 261, etc.)
  {
    name: 'course_code',
    pattern: /\b[A-Z]{2,4}\s+\d{3}[A-Z]?\b/g,
    replacement: '[COURSE]',
    confidence: 0.85,
    category: 'academic',
  },

  // Grade point averages
  {
    name: 'gpa',
    pattern: /\b(?:GPA|gpa|Grade Point Average)\s*:?\s*[0-4]\.\d{1,3}\b/gi,
    replacement: '[GPA]',
    confidence: 0.90,
    category: 'academic',
  },

  // Semester/Year combinations
  {
    name: 'semester',
    pattern: /\b(?:Fall|Spring|Summer)\s+20\d{2}\b/gi,
    replacement: '[SEMESTER]',
    confidence: 0.75,
    category: 'academic',
  },

  // Credit hours
  {
    name: 'credit_hours',
    pattern: /\b\d{1,2}\s+(?:credit|credits|hours|credit hours|cr\.?)\b/gi,
    replacement: '[CREDITS]',
    confidence: 0.80,
    category: 'academic',
  },
]

// Personal information patterns
export const PERSONAL_PATTERNS: RedactionPattern[] = [
  // Full names (basic pattern - first and last name)
  {
    name: 'full_name',
    pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    replacement: '[NAME]',
    confidence: 0.70, // Lower confidence due to false positives
    category: 'pii',
  },

  // Addresses (basic pattern)
  {
    name: 'address',
    pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way)\b/gi,
    replacement: '[ADDRESS]',
    confidence: 0.85,
    category: 'location',
  },

  // ZIP codes
  {
    name: 'zip_code',
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[ZIP]',
    confidence: 0.75,
    category: 'location',
  },

  // Dates (MM/DD/YYYY, MM-DD-YYYY, etc.)
  {
    name: 'date',
    pattern: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    replacement: '[DATE]',
    confidence: 0.80,
    category: 'pii',
  },

  // Times (HH:MM format)
  {
    name: 'time',
    pattern: /\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*[AP]M)?\b/gi,
    replacement: '[TIME]',
    confidence: 0.70,
    category: 'pii',
  },
]

// Financial patterns
export const FINANCIAL_PATTERNS: RedactionPattern[] = [
  // Bank account numbers (8-17 digits)
  {
    name: 'bank_account',
    pattern: /\b(?:Account|account|Acct|acct)?\s*#?\s*\d{8,17}\b/gi,
    replacement: '[ACCOUNT]',
    confidence: 0.85,
    category: 'financial',
  },

  // Dollar amounts
  {
    name: 'dollar_amount',
    pattern: /\$[\d,]+\.?\d{0,2}/g,
    replacement: '[AMOUNT]',
    confidence: 0.60, // Lower confidence as amounts aren't always sensitive
    category: 'financial',
  },

  // Tuition/fee related amounts
  {
    name: 'tuition',
    pattern: /\b(?:tuition|fees?|payment)\s*:?\s*\$?[\d,]+\.?\d{0,2}\b/gi,
    replacement: '[TUITION]',
    confidence: 0.85,
    category: 'financial',
  },
]

// Numbers that could be sensitive (catch-all)
export const NUMERIC_PATTERNS: RedactionPattern[] = [
  // Long numeric sequences (5+ digits, could be IDs)
  {
    name: 'long_number',
    pattern: /\b\d{5,}\b/g,
    replacement: '[NUMBER]',
    confidence: 0.50, // Low confidence, many false positives
    category: 'pii',
  },

  // ID-like patterns (letters + numbers)
  {
    name: 'alphanumeric_id',
    pattern: /\b[A-Z]{1,3}\d{6,}\b/g,
    replacement: '[ID]',
    confidence: 0.75,
    category: 'academic',
  },
]

// All patterns combined
export const ALL_REDACTION_PATTERNS = [
  ...PII_PATTERNS,
  ...ACADEMIC_PATTERNS,
  ...PERSONAL_PATTERNS,
  ...FINANCIAL_PATTERNS,
  ...NUMERIC_PATTERNS,
]

// Pattern categories for UI
export const PATTERN_CATEGORIES = {
  pii: 'Personal Information',
  academic: 'Academic Data',
  contact: 'Contact Information', 
  financial: 'Financial Information',
  location: 'Location Data',
} as const

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: keyof typeof PATTERN_CATEGORIES): RedactionPattern[] {
  return ALL_REDACTION_PATTERNS.filter(pattern => pattern.category === category)
}

/**
 * Get high-confidence patterns only
 */
export function getHighConfidencePatterns(minConfidence: number = 0.8): RedactionPattern[] {
  return ALL_REDACTION_PATTERNS.filter(pattern => pattern.confidence >= minConfidence)
}

/**
 * Custom pattern for specific use cases
 */
export function createCustomPattern(
  name: string,
  pattern: RegExp,
  replacement: string,
  confidence: number,
  category: RedactionPattern['category']
): RedactionPattern {
  return {
    name,
    pattern,
    replacement,
    confidence,
    category,
  }
}

/**
 * Test if text matches any high-risk patterns
 */
export function containsSensitiveData(text: string): boolean {
  const highRiskPatterns = getHighConfidencePatterns(0.85)
  return highRiskPatterns.some(pattern => pattern.pattern.test(text))
}

/**
 * Get statistics about what patterns match in text
 */
export function getMatchStatistics(text: string): {
  pattern: string
  matches: number
  category: string
  confidence: number
}[] {
  return ALL_REDACTION_PATTERNS.map(pattern => {
    const matches = (text.match(pattern.pattern) || []).length
    return {
      pattern: pattern.name,
      matches,
      category: pattern.category,
      confidence: pattern.confidence,
    }
  }).filter(stat => stat.matches > 0)
}