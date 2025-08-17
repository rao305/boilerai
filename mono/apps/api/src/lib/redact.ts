import crypto from 'crypto'

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
const PHONE_REGEX = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
const SSN_REGEX = /\b\d{3}-?\d{2}-?\d{4}\b/g
const CREDIT_CARD_REGEX = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
const STUDENT_ID_REGEX = /\b\d{8,10}\b/g

export interface RedactionOptions {
  emails?: boolean
  phones?: boolean
  ssns?: boolean
  creditCards?: boolean
  studentIds?: boolean
  customPatterns?: RegExp[]
}

export function redactText(
  text: string,
  options: RedactionOptions = {}
): string {
  let redacted = text

  const {
    emails = true,
    phones = true,
    ssns = true,
    creditCards = true,
    studentIds = true,
    customPatterns = [],
  } = options

  if (emails) {
    redacted = redacted.replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
  }

  if (phones) {
    redacted = redacted.replace(PHONE_REGEX, '[PHONE_REDACTED]')
  }

  if (ssns) {
    redacted = redacted.replace(SSN_REGEX, '[SSN_REDACTED]')
  }

  if (creditCards) {
    redacted = redacted.replace(CREDIT_CARD_REGEX, '[CARD_REDACTED]')
  }

  if (studentIds) {
    redacted = redacted.replace(STUDENT_ID_REGEX, '[ID_REDACTED]')
  }

  // Apply custom patterns
  for (const pattern of customPatterns) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }

  return redacted
}

export function hashIntent(text: string): string {
  // Normalize text for intent hashing
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256').update(normalized).digest('hex')
  return `sha256:${hash}`
}

export function createRedactedExample(
  originalText: string,
  maxLength: number = 200
): string {
  const redacted = redactText(originalText)
  
  if (redacted.length <= maxLength) {
    return redacted
  }

  // Truncate and add ellipsis
  return redacted.substring(0, maxLength - 3) + '...'
}

export function isContentSafe(text: string): boolean {
  // Check for potentially sensitive content patterns
  const sensitivePatterns = [
    EMAIL_REGEX,
    PHONE_REGEX,
    SSN_REGEX,
    CREDIT_CARD_REGEX,
    /password/i,
    /secret/i,
    /api[_\s]?key/i,
    /token/i,
  ]

  return !sensitivePatterns.some(pattern => pattern.test(text))
}

export const redactor = {
  redactText,
  hashIntent,
  createRedactedExample,
  isContentSafe,
}