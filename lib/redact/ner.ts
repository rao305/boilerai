// Lightweight Named Entity Recognition for client-side PII detection
// Simple rule-based approach that works offline

export interface NEREntity {
  text: string
  label: 'PERSON' | 'ORG' | 'GPE' | 'COURSE' | 'GRADE' | 'DATE' | 'ID'
  start: number
  end: number
  confidence: number
}

export interface NERResult {
  entities: NEREntity[]
  redactedText: string
  confidence: number
}

// Common first names (subset for size)
const COMMON_FIRST_NAMES = new Set([
  'john', 'jane', 'michael', 'sarah', 'david', 'emily', 'james', 'ashley',
  'robert', 'jessica', 'william', 'amanda', 'christopher', 'stephanie',
  'matthew', 'melissa', 'daniel', 'nicole', 'andrew', 'elizabeth',
  'joshua', 'helen', 'kenneth', 'susan', 'kevin', 'catherine', 'brian',
  'samantha', 'george', 'deborah', 'ronald', 'rachel', 'anthony', 'carolyn',
  'mark', 'janet', 'steven', 'virginia', 'paul', 'maria', 'andrew', 'heather'
])

// Common last names (subset for size)
const COMMON_LAST_NAMES = new Set([
  'smith', 'johnson', 'williams', 'jones', 'brown', 'davis', 'miller',
  'wilson', 'moore', 'taylor', 'anderson', 'thomas', 'jackson', 'white',
  'harris', 'martin', 'thompson', 'garcia', 'martinez', 'robinson',
  'clark', 'rodriguez', 'lewis', 'lee', 'walker', 'hall', 'allen',
  'young', 'hernandez', 'king', 'wright', 'lopez', 'hill', 'scott',
  'green', 'adams', 'baker', 'gonzalez', 'nelson', 'carter', 'mitchell'
])

// Academic terms
const ACADEMIC_TERMS = new Set([
  'professor', 'prof', 'dr', 'instructor', 'ta', 'department', 'college',
  'university', 'course', 'class', 'semester', 'grade', 'gpa', 'credits',
  'major', 'minor', 'degree', 'bachelor', 'master', 'phd', 'thesis',
  'dissertation', 'exam', 'test', 'quiz', 'assignment', 'homework'
])

// Location indicators
const LOCATION_TERMS = new Set([
  'university', 'college', 'hall', 'building', 'room', 'floor', 'street',
  'avenue', 'road', 'drive', 'lane', 'boulevard', 'city', 'state', 'zip'
])

/**
 * Simple NER implementation using rule-based approach
 */
export class SimpleNER {
  private personPatterns: RegExp[]
  private orgPatterns: RegExp[]
  private coursePatterns: RegExp[]

  constructor() {
    this.personPatterns = [
      // Title + Last name (Dr. Smith, Prof. Johnson)
      /\b(?:Dr|Prof|Professor|Mr|Ms|Mrs)\.\s+[A-Z][a-z]{2,}\b/g,
      
      // First Last patterns with academic context
      /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?=\s+(?:said|told|explained|taught|graded))/g,
      
      // Email-like names (john.smith@, sarah.johnson@)
      /\b[a-z]+\.[a-z]+(?=@)/g,
    ]

    this.orgPatterns = [
      // Purdue-specific organizations
      /\b(?:Purdue\s+University|Purdue|PUID|Boilermakers?)\b/gi,
      
      // Generic university terms
      /\b(?:University|College|Department|School)\s+of\s+[A-Z][a-z\s]+/gi,
      
      // Academic departments
      /\b(?:Computer\s+Science|Mathematics|Engineering|Business|Liberal\s+Arts)\s+Department\b/gi,
    ]

    this.coursePatterns = [
      // Course codes (CS 180, MATH 261, etc.)
      /\b[A-Z]{2,4}\s+\d{3}[A-Z]?\b/g,
      
      // Course names with numbers
      /\b(?:Calculus|Physics|Chemistry|Biology|History|English)\s+[IVX1-9]+\b/gi,
    ]
  }

  /**
   * Extract named entities from text
   */
  extractEntities(text: string): NEREntity[] {
    const entities: NEREntity[] = []
    const words = text.split(/\s+/)

    // Find person names
    entities.push(...this.findPersons(text))
    
    // Find organizations
    entities.push(...this.findOrganizations(text))
    
    // Find courses
    entities.push(...this.findCourses(text))
    
    // Find dates
    entities.push(...this.findDates(text))
    
    // Find IDs and grades
    entities.push(...this.findIdsAndGrades(text))

    // Sort by position and remove overlaps
    return this.removeOverlaps(entities.sort((a, b) => a.start - b.start))
  }

  /**
   * Find person names using various heuristics
   */
  private findPersons(text: string): NEREntity[] {
    const entities: NEREntity[] = []

    // Use predefined patterns
    for (const pattern of this.personPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          label: 'PERSON',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8,
        })
      }
    }

    // Find First Last combinations using name lists
    const words = text.split(/\s+/)
    for (let i = 0; i < words.length - 1; i++) {
      const first = words[i].toLowerCase().replace(/[^a-z]/g, '')
      const last = words[i + 1].toLowerCase().replace(/[^a-z]/g, '')

      if (COMMON_FIRST_NAMES.has(first) && COMMON_LAST_NAMES.has(last)) {
        const startPos = text.indexOf(words[i])
        if (startPos !== -1) {
          entities.push({
            text: `${words[i]} ${words[i + 1]}`,
            label: 'PERSON',
            start: startPos,
            end: startPos + words[i].length + words[i + 1].length + 1,
            confidence: 0.7,
          })
        }
      }
    }

    return entities
  }

  /**
   * Find organizations and institutions
   */
  private findOrganizations(text: string): NEREntity[] {
    const entities: NEREntity[] = []

    for (const pattern of this.orgPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          label: 'ORG',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.85,
        })
      }
    }

    return entities
  }

  /**
   * Find course codes and names
   */
  private findCourses(text: string): NEREntity[] {
    const entities: NEREntity[] = []

    for (const pattern of this.coursePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          label: 'COURSE',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.9,
        })
      }
    }

    return entities
  }

  /**
   * Find dates in various formats
   */
  private findDates(text: string): NEREntity[] {
    const entities: NEREntity[] = []
    const datePatterns = [
      /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
    ]

    for (const pattern of datePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          label: 'DATE',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.85,
        })
      }
    }

    return entities
  }

  /**
   * Find IDs, grades, and other academic identifiers
   */
  private findIdsAndGrades(text: string): NEREntity[] {
    const entities: NEREntity[] = []

    // Student IDs and similar
    const idPattern = /\b(?:ID|PUID|Student\s+ID)\s*:?\s*\d{6,}\b/gi
    let match
    while ((match = idPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        label: 'ID',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.95,
      })
    }

    // Grades (A, B+, 3.7 GPA, etc.)
    const gradePatterns = [
      /\b(?:Grade|grade)\s*:?\s*[A-F][+-]?\b/gi,
      /\b(?:GPA|gpa)\s*:?\s*[0-4]\.\d{1,2}\b/gi,
      /\b[A-F][+-]?\s+(?:in|for)\s+[A-Z]{2,4}\s+\d{3}\b/gi,
    ]

    for (const pattern of gradePatterns) {
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          label: 'GRADE',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.9,
        })
      }
    }

    return entities
  }

  /**
   * Remove overlapping entities (keep highest confidence)
   */
  private removeOverlaps(entities: NEREntity[]): NEREntity[] {
    const result: NEREntity[] = []
    
    for (let i = 0; i < entities.length; i++) {
      const current = entities[i]
      let hasOverlap = false

      // Check against already added entities
      for (const existing of result) {
        if (this.entitiesOverlap(current, existing)) {
          hasOverlap = true
          // If current has higher confidence, replace existing
          if (current.confidence > existing.confidence) {
            const index = result.indexOf(existing)
            result.splice(index, 1, current)
          }
          break
        }
      }

      if (!hasOverlap) {
        result.push(current)
      }
    }

    return result
  }

  /**
   * Check if two entities overlap
   */
  private entitiesOverlap(a: NEREntity, b: NEREntity): boolean {
    return !(a.end <= b.start || b.end <= a.start)
  }

  /**
   * Apply redaction to text based on extracted entities
   */
  redactText(text: string, entities: NEREntity[]): string {
    // Sort entities by position (descending) to avoid index shifts
    const sortedEntities = [...entities].sort((a, b) => b.start - a.start)
    
    let redacted = text
    for (const entity of sortedEntities) {
      const replacement = this.getReplacementText(entity)
      redacted = redacted.slice(0, entity.start) + replacement + redacted.slice(entity.end)
    }

    return redacted
  }

  /**
   * Get appropriate replacement text for entity type
   */
  private getReplacementText(entity: NEREntity): string {
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
   * Complete NER pipeline - extract entities and redact text
   */
  processText(text: string): NERResult {
    const entities = this.extractEntities(text)
    const redactedText = this.redactText(text, entities)
    
    // Calculate overall confidence based on entity confidences
    const avgConfidence = entities.length > 0 
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
      : 1.0

    return {
      entities,
      redactedText,
      confidence: avgConfidence,
    }
  }
}

// Global NER instance
export const ner = new SimpleNER()