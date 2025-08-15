// Unit tests for PII redaction pipeline

import { 
  PII_PATTERNS, 
  ACADEMIC_PATTERNS,
  getHighConfidencePatterns,
  containsSensitiveData 
} from '@/lib/redact/patterns'
import { ner } from '@/lib/redact/ner'
import { redactionEngine, quickRedact, isSafeToShare } from '@/lib/redact/apply'

describe('Redaction Patterns', () => {
  describe('PII_PATTERNS', () => {
    test('should detect email addresses', () => {
      const emailPattern = PII_PATTERNS.find(p => p.name === 'email')!
      const text = 'Contact john.doe@purdue.edu for help'
      const matches = text.match(emailPattern.pattern)
      
      expect(matches).toHaveLength(1)
      expect(matches![0]).toBe('john.doe@purdue.edu')
    })

    test('should detect phone numbers', () => {
      const phonePattern = PII_PATTERNS.find(p => p.name === 'phone_us')!
      const testCases = [
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '5551234567',
        '+1-555-123-4567'
      ]

      testCases.forEach(phone => {
        const matches = phone.match(phonePattern.pattern)
        expect(matches).toBeTruthy()
        expect(matches![0]).toContain('555')
      })
    })

    test('should detect SSN patterns', () => {
      const ssnPattern = PII_PATTERNS.find(p => p.name === 'ssn')!
      const testCases = [
        '123-45-6789',
        'SSN: 123-45-6789',
        'Social Security: 123456789'
      ]

      testCases.forEach(ssn => {
        const matches = ssn.match(ssnPattern.pattern)
        expect(matches).toBeTruthy()
      })
    })

    test('should detect credit card numbers', () => {
      const cardPattern = PII_PATTERNS.find(p => p.name === 'credit_card')!
      const testCases = [
        '4532015112830366', // Visa
        '5555555555554444', // Mastercard
        '378282246310005',  // Amex
      ]

      testCases.forEach(card => {
        const matches = card.match(cardPattern.pattern)
        expect(matches).toBeTruthy()
        expect(matches![0]).toBe(card)
      })
    })
  })

  describe('ACADEMIC_PATTERNS', () => {
    test('should detect Purdue student IDs', () => {
      const idPattern = ACADEMIC_PATTERNS.find(p => p.name === 'purdue_student_id')!
      const testCases = [
        'Student ID: 1234567890',
        'PUID 1234567890',
        'ID: 1234567890'
      ]

      testCases.forEach(id => {
        const matches = id.match(idPattern.pattern)
        expect(matches).toBeTruthy()
      })
    })

    test('should detect course codes', () => {
      const coursePattern = ACADEMIC_PATTERNS.find(p => p.name === 'course_code')!
      const testCases = [
        'CS 180',
        'MATH 261',
        'ENGR 131A',
        'PHYS 172'
      ]

      testCases.forEach(course => {
        const matches = course.match(coursePattern.pattern)
        expect(matches).toBeTruthy()
        expect(matches![0]).toBe(course)
      })
    })

    test('should detect GPA values', () => {
      const gpaPattern = ACADEMIC_PATTERNS.find(p => p.name === 'gpa')!
      const testCases = [
        'GPA: 3.75',
        'gpa 2.5',
        'Grade Point Average: 4.0'
      ]

      testCases.forEach(gpa => {
        const matches = gpa.match(gpaPattern.pattern)
        expect(matches).toBeTruthy()
      })
    })
  })

  describe('Pattern utility functions', () => {
    test('should filter high confidence patterns', () => {
      const highConfidence = getHighConfidencePatterns(0.9)
      expect(highConfidence.length).toBeGreaterThan(0)
      highConfidence.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.9)
      })
    })

    test('should detect sensitive data in text', () => {
      const sensitiveText = 'My email is john@purdue.edu and my SSN is 123-45-6789'
      const safeText = 'Hello world, this is just regular text'

      expect(containsSensitiveData(sensitiveText)).toBe(true)
      expect(containsSensitiveData(safeText)).toBe(false)
    })
  })
})

describe('Named Entity Recognition', () => {
  test('should extract person names', () => {
    const text = 'Dr. Smith explained the concept to students'
    const result = ner.processText(text)
    
    const personEntities = result.entities.filter(e => e.label === 'PERSON')
    expect(personEntities.length).toBeGreaterThan(0)
    expect(personEntities[0].text).toContain('Smith')
  })

  test('should extract course information', () => {
    const text = 'I am taking CS 180 this semester'
    const result = ner.processText(text)
    
    const courseEntities = result.entities.filter(e => e.label === 'COURSE')
    expect(courseEntities.length).toBeGreaterThan(0)
    expect(courseEntities[0].text).toBe('CS 180')
  })

  test('should extract organizations', () => {
    const text = 'Purdue University has great programs'
    const result = ner.processText(text)
    
    const orgEntities = result.entities.filter(e => e.label === 'ORG')
    expect(orgEntities.length).toBeGreaterThan(0)
    expect(orgEntities[0].text).toContain('Purdue')
  })

  test('should redact text based on entities', () => {
    const text = 'Dr. Smith teaches CS 180 at Purdue University'
    const result = ner.processText(text)
    
    expect(result.redactedText).toContain('[NAME]')
    expect(result.redactedText).toContain('[COURSE]')
    expect(result.redactedText).toContain('[ORGANIZATION]')
  })

  test('should handle text with no entities', () => {
    const text = 'This is just regular text with no sensitive information'
    const result = ner.processText(text)
    
    expect(result.entities).toHaveLength(0)
    expect(result.redactedText).toBe(text)
    expect(result.confidence).toBe(1.0)
  })
})

describe('Redaction Engine', () => {
  test('should redact PII from text', () => {
    const text = 'Contact me at john.doe@purdue.edu or call (555) 123-4567'
    const result = redactionEngine.redactText(text)
    
    expect(result.redactedText).toContain('[EMAIL]')
    expect(result.redactedText).toContain('[PHONE]')
    expect(result.matches.length).toBeGreaterThan(0)
  })

  test('should handle academic information', () => {
    const text = 'Student ID 1234567890 received A+ in CS 180 with GPA 3.85'
    const result = redactionEngine.redactText(text)
    
    expect(result.redactedText).toContain('[STUDENT_ID]')
    expect(result.redactedText).toContain('[COURSE]')
    expect(result.redactedText).toContain('[GPA]')
  })

  test('should preserve formatting when enabled', () => {
    const text = 'JOHN.DOE@PURDUE.EDU'
    const result = redactionEngine.redactText(text, { preserveFormatting: true })
    
    expect(result.redactedText).toBe('[EMAIL]') // Should preserve caps
  })

  test('should handle overlapping matches correctly', () => {
    const text = 'Dr. John Smith at john.smith@purdue.edu'
    const result = redactionEngine.redactText(text)
    
    // Should handle both NER (person) and pattern (email) matches
    expect(result.matches.length).toBeGreaterThan(0)
    expect(result.redactedText).not.toContain('john.smith@purdue.edu')
  })

  test('should provide preview with highlights', () => {
    const text = 'Email: test@purdue.edu, Phone: 555-1234'
    const preview = redactionEngine.previewRedaction(text)
    
    expect(preview.highlightedText).toContain('<mark')
    expect(preview.matches.length).toBeGreaterThan(0)
  })

  test('should validate redaction quality', () => {
    const original = 'My email is john@purdue.edu'
    const redacted = 'My email is [EMAIL]'
    const stillBad = 'My email is john@purdue.edu'
    
    const goodValidation = redactionEngine.validateRedaction(original, redacted)
    const badValidation = redactionEngine.validateRedaction(original, stillBad)
    
    expect(goodValidation.isValid).toBe(true)
    expect(badValidation.isValid).toBe(false)
    expect(badValidation.issues.length).toBeGreaterThan(0)
  })

  test('should get recommended redaction for sharing', () => {
    const text = 'Student john.doe@purdue.edu in CS 180 scored 95% with GPA 3.8'
    const result = redactionEngine.getRecommendedRedaction(text)
    
    // Should be more aggressive for sharing
    expect(result.redactedText).not.toContain('john.doe@purdue.edu')
    expect(result.redactedText).not.toContain('3.8')
  })
})

describe('Quick redaction functions', () => {
  test('quickRedact should provide simple redaction', () => {
    const text = 'Email: test@purdue.edu, ID: 1234567890'
    const redacted = quickRedact(text)
    
    expect(redacted).not.toContain('test@purdue.edu')
    expect(redacted).toContain('[EMAIL]')
  })

  test('quickRedact with aggressive mode', () => {
    const text = 'Call me at 555-1234 or email test@example.com'
    const conservative = quickRedact(text, false)
    const aggressive = quickRedact(text, true)
    
    // Aggressive mode should catch more patterns
    expect(aggressive.length).toBeLessThanOrEqual(conservative.length)
  })

  test('isSafeToShare should identify risky text', () => {
    const safeText = 'This is just regular text about academics'
    const riskyText = 'My student ID is 1234567890 and email is test@purdue.edu'
    
    expect(isSafeToShare(safeText)).toBe(true)
    expect(isSafeToShare(riskyText)).toBe(false)
  })
})

describe('Edge cases and error handling', () => {
  test('should handle empty text', () => {
    const result = redactionEngine.redactText('')
    expect(result.redactedText).toBe('')
    expect(result.matches).toHaveLength(0)
    expect(result.confidence).toBe(1.0)
  })

  test('should handle very long text', () => {
    const longText = 'Safe text. '.repeat(1000) + 'Unsafe email@purdue.edu'
    const result = redactionEngine.redactText(longText)
    
    expect(result.redactedText).toContain('[EMAIL]')
    expect(result.matches.length).toBeGreaterThan(0)
  })

  test('should handle special characters and Unicode', () => {
    const text = 'Email: tëst@pürdue.edu with émojis 🎓'
    const result = redactionEngine.redactText(text)
    
    // Should still detect the email pattern
    expect(result.matches.length).toBeGreaterThan(0)
  })

  test('should handle malformed patterns gracefully', () => {
    const text = 'This has incomplete email @ or phone 555-'
    const result = redactionEngine.redactText(text)
    
    // Should not crash and should return valid result
    expect(result).toBeDefined()
    expect(result.redactedText).toBeDefined()
  })
})