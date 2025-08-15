import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { redactionEngine } from '@/lib/redact/apply'

// Rate limiting for example sharing (3 per hour)
const shareExampleRateLimit = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 1000,
  tokensPerInterval: 3, // Max 3 examples per hour per user
})

interface ShareExampleRequest {
  textRedacted: string
  category: string
  tag: string
  description?: string
}

// Valid categories and tags
const VALID_CATEGORIES = new Set([
  'academic_planning',
  'course_help',
  'transcript_parsing',
  'general_question',
  'technical_issue',
])

const VALID_TAGS = new Set([
  'no_answer',
  'wrong_answer',
  'unhelpful',
  'unclear',
  'missing_context',
  'other',
])

async function validateRequest(request: NextRequest): Promise<{
  userId: string
  body: ShareExampleRequest
}> {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED')
  }

  // Apply rate limiting
  const identifier = `share-example:${session.user.id}`
  const { success } = await shareExampleRateLimit(identifier)
  if (!success) {
    throw new Error('RATE_LIMIT_EXCEEDED')
  }

  // Parse and validate body
  let body: ShareExampleRequest
  try {
    body = await request.json()
  } catch (error) {
    throw new Error('INVALID_JSON')
  }

  // Validate required fields
  if (!body.textRedacted || !body.category || !body.tag) {
    throw new Error('MISSING_REQUIRED_FIELDS')
  }

  // Validate field values
  if (!VALID_CATEGORIES.has(body.category)) {
    throw new Error('INVALID_CATEGORY')
  }

  if (!VALID_TAGS.has(body.tag)) {
    throw new Error('INVALID_TAG')
  }

  // Validate text length
  if (body.textRedacted.length > 10000) { // 10KB max
    throw new Error('TEXT_TOO_LONG')
  }

  if (body.textRedacted.length < 10) {
    throw new Error('TEXT_TOO_SHORT')
  }

  // Validate description length
  if (body.description && body.description.length > 1000) {
    throw new Error('DESCRIPTION_TOO_LONG')
  }

  return { userId: session.user.id, body }
}

async function validateRedaction(text: string): Promise<void> {
  // Additional server-side validation to ensure no PII leaked through
  const validation = redactionEngine.validateRedaction('', text)
  
  if (!validation.isValid) {
    console.warn('Potentially unsafe redacted text submitted:', validation.issues)
    // Log for analysis but don't block - client-side redaction is primary
  }

  // Check for obvious PII patterns that should have been caught
  const dangerousPatterns = [
    /\b[A-Za-z0-9._%+-]+@purdue\.edu\b/i, // Purdue emails
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN format
    /\b4[0-9]{15}\b/, // Credit card starting with 4
    /\bPUID\s*:?\s*\d{10}\b/i, // Purdue student ID
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      throw new Error('POTENTIAL_PII_DETECTED')
    }
  }
}

async function storeExample(
  textRedacted: string,
  category: string,
  tag: string,
  description?: string
): Promise<string> {
  // Calculate expiration date (30 days)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const example = await prisma.redactedExample.create({
    data: {
      textRedacted,
      category,
      tag,
      // Note: description is not stored separately to minimize data retention
      expiresAt,
    },
  })

  return example.id
}

// POST /api/share-example - Submit redacted example
export async function POST(request: NextRequest) {
  try {
    const { userId, body } = await validateRequest(request)
    
    // Server-side redaction validation
    await validateRedaction(body.textRedacted)

    // Store the example (no user ID stored with the example)
    const exampleId = await storeExample(
      body.textRedacted,
      body.category,
      body.tag,
      body.description
    )

    // Log successful submission (no personal data)
    console.log(`Example submitted: ${exampleId}, category: ${body.category}, tag: ${body.tag}, length: ${body.textRedacted.length}`)

    return NextResponse.json({
      success: true,
      exampleId,
      message: 'Thank you for helping improve BoilerAI!',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { status: 201 })

  } catch (error) {
    console.error('Share example error:', error)

    if (error instanceof Error) {
      const message = error.message

      // Authentication errors
      if (message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Please sign in to share examples.' },
          { status: 401 }
        )
      }

      // Rate limiting
      if (message === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json(
          { 
            error: 'RATE_LIMIT_EXCEEDED', 
            message: 'You can share up to 3 examples per hour. Please try again later.',
            retryAfter: 3600 // 1 hour
          },
          { status: 429 }
        )
      }

      // Validation errors
      if (message.startsWith('INVALID_') || 
          message.startsWith('MISSING_') ||
          message.startsWith('TEXT_') ||
          message === 'DESCRIPTION_TOO_LONG') {
        return NextResponse.json(
          { 
            error: message,
            message: 'Please check your input and try again.'
          },
          { status: 400 }
        )
      }

      // Security validation
      if (message === 'POTENTIAL_PII_DETECTED') {
        return NextResponse.json(
          { 
            error: 'REDACTION_INCOMPLETE',
            message: 'Please review your text and remove any remaining personal information.'
          },
          { status: 400 }
        )
      }
    }

    // Generic error (don't leak details)
    return NextResponse.json(
      { 
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while processing your example.'
      },
      { status: 500 }
    )
  }
}

// GET /api/share-example - Return API documentation  
export async function GET() {
  return NextResponse.json({
    name: 'BoilerAI Share Example API',
    version: '1.0.0',
    description: 'Submit redacted examples to help improve BoilerAI responses',
    
    requirements: {
      authentication: 'Required - must be signed in with Purdue account',
      rateLimit: '3 examples per hour per user',
      textLength: '10-10,000 characters',
      dataRetention: '30 days automatic deletion',
    },

    validCategories: Array.from(VALID_CATEGORIES),
    validTags: Array.from(VALID_TAGS),

    requestFormat: {
      textRedacted: 'string (required) - The redacted example text',
      category: 'string (required) - Example category',
      tag: 'string (required) - Issue type/failure reason',
      description: 'string (optional) - Additional context, max 1000 chars',
    },

    privacy: {
      userTracking: 'No user IDs stored with examples',
      dataRetention: '30 days automatic deletion',
      redactionValidation: 'Server performs additional PII checks',
      rateLimit: 'Prevents spam while allowing legitimate use',
    },

    security: {
      validation: 'Server validates redaction quality',
      sanitization: 'Text is scanned for remaining PII',
      rateLimit: 'Prevents abuse and spam',
      expiration: 'All examples auto-delete after 30 days',
    },
  })
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}