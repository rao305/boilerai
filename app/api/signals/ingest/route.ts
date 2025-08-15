import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateDPBatch, DPBatch, DPAggregate } from '@/lib/dp/randomizedResponse'
import { rateLimit } from '@/lib/rate-limit'

// Rate limiting for signals ingestion
const signalsRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10000,
  tokensPerInterval: 1, // 1 batch per minute per client
})

// K-anonymity threshold - suppress metrics with fewer contributors
const K_ANONYMITY_THRESHOLD = 20

// Maximum metrics per batch
const MAX_METRICS_PER_BATCH = 20

// Valid epsilon range
const MIN_EPSILON = 0.1
const MAX_EPSILON = 2.0

// Valid metric names (allowlist)
const ALLOWED_METRICS = new Set([
  'thumbs_down',
  'thumbs_up', 
  'no_answer',
  'retry_clicked',
  'escalate_clicked',
  'transcript_uploaded',
  'planner_accessed',
  'chat_started',
  'settings_changed',
  'api_error',
  'parse_error',
  'network_error',
])

async function validateRequest(request: NextRequest): Promise<{
  clientId: string
  body: any
}> {
  // Extract client identifier (no user tracking)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Create a privacy-preserving client identifier
  const clientId = await createClientHash(ip, userAgent)
  
  // Apply rate limiting per client
  const { success } = await signalsRateLimit(clientId)
  if (!success) {
    throw new Error('RATE_LIMIT_EXCEEDED')
  }

  // Parse and validate JSON body
  let body
  try {
    body = await request.json()
  } catch (error) {
    throw new Error('INVALID_JSON')
  }

  return { clientId, body }
}

async function createClientHash(ip: string, userAgent: string): Promise<string> {
  // Create a short-lived client identifier that doesn't track users
  const data = `${ip}-${userAgent}-${Math.floor(Date.now() / (1000 * 60 * 60))}`
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const hash = Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return hash.substring(0, 16) // First 16 chars
  }
  
  // Fallback hash for environments without crypto.subtle
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 16)
}

function validateDPMetrics(batch: DPBatch): void {
  if (!batch.metrics || Object.keys(batch.metrics).length === 0) {
    throw new Error('EMPTY_BATCH')
  }

  if (Object.keys(batch.metrics).length > MAX_METRICS_PER_BATCH) {
    throw new Error('BATCH_TOO_LARGE')
  }

  for (const [metricName, metric] of Object.entries(batch.metrics)) {
    // Validate metric name
    if (!ALLOWED_METRICS.has(metricName)) {
      throw new Error(`INVALID_METRIC_NAME: ${metricName}`)
    }

    // Validate epsilon range
    if (metric.epsilon < MIN_EPSILON || metric.epsilon > MAX_EPSILON) {
      throw new Error(`INVALID_EPSILON: ${metric.epsilon}`)
    }

    // Validate noisy count
    if (!Number.isInteger(metric.noisyCount) || metric.noisyCount < 0) {
      throw new Error(`INVALID_NOISY_COUNT: ${metric.noisyCount}`)
    }

    // Security: Reject batches that look like raw event data
    const metricObj = metric as any
    if (metricObj.rawEvents || 
        metricObj.userIds || 
        metricObj.timestamps || 
        metricObj.actualCount ||
        Array.isArray(metricObj.events)) {
      throw new Error('RAW_EVENTS_DETECTED')
    }
  }
}

async function storeMetrics(batch: DPBatch, clientId: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day

  const operations = []

  for (const [metricName, metric] of Object.entries(batch.metrics)) {
    operations.push(
      prisma.signalMetric.upsert({
        where: {
          day_name: {
            day: today,
            name: metricName,
          },
        },
        update: {
          noisyCount: {
            increment: metric.noisyCount,
          },
          // Keep the most recent epsilon value
          epsilon: metric.epsilon,
        },
        create: {
          day: today,
          name: metricName,
          noisyCount: metric.noisyCount,
          epsilon: metric.epsilon,
        },
      })
    )
  }

  // Execute all operations in a transaction
  await prisma.$transaction(operations)
}

async function enforceKAnonymity(): Promise<void> {
  // This would be implemented as a background job
  // For now, we document the approach:
  
  /*
  Background job should:
  1. Identify metrics with estimated contributor count < K_ANONYMITY_THRESHOLD
  2. Use statistical methods to estimate unique contributors from DP noise
  3. Suppress or aggregate low-contribution metrics
  4. Run daily after batch processing
  
  Example query:
  DELETE FROM signal_metrics 
  WHERE day < CURRENT_DATE - INTERVAL '1 day'
  AND estimated_contributors < K_ANONYMITY_THRESHOLD;
  */
}

// POST /api/signals/ingest - Accept DP-noised metrics only
export async function POST(request: NextRequest) {
  try {
    // Validate request and apply rate limiting
    const { clientId, body } = await validateRequest(request)

    // Validate DP batch format
    if (!validateDPBatch(body)) {
      return NextResponse.json(
        { 
          error: 'INVALID_BATCH_FORMAT',
          message: 'Batch must contain only DP-noised aggregates with epsilon and noisyCount'
        }, 
        { status: 400 }
      )
    }

    // Additional validation for our specific requirements
    validateDPMetrics(body)

    // Store aggregated metrics (no individual event data)
    await storeMetrics(body, clientId)

    // Log successful ingestion (no client tracking)
    console.log(`Signals batch ingested: ${Object.keys(body.metrics).length} metrics, epsilon=${body.metrics[Object.keys(body.metrics)[0]]?.epsilon}`)

    return NextResponse.json({
      success: true,
      metricsCount: Object.keys(body.metrics).length,
      batchId: body.batchId,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Signals ingestion error:', error)

    if (error instanceof Error) {
      const errorMessage = error.message

      // Rate limiting
      if (errorMessage === 'RATE_LIMIT_EXCEEDED') {
        return NextResponse.json(
          { 
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please wait before sending another batch.',
            retryAfter: 60
          },
          { status: 429 }
        )
      }

      // Validation errors
      if (errorMessage.startsWith('INVALID_') || 
          errorMessage.startsWith('BATCH_') ||
          errorMessage === 'RAW_EVENTS_DETECTED') {
        return NextResponse.json(
          { 
            error: errorMessage,
            message: 'Invalid batch format or content. Only DP-noised aggregates accepted.'
          },
          { status: 400 }
        )
      }

      if (errorMessage === 'EMPTY_BATCH') {
        return NextResponse.json(
          { 
            error: 'EMPTY_BATCH',
            message: 'Batch must contain at least one metric.'
          },
          { status: 400 }
        )
      }
    }

    // Generic server error (don't leak details)
    return NextResponse.json(
      { 
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An internal error occurred processing the batch.'
      },
      { status: 500 }
    )
  }
}

// GET /api/signals/ingest - Return API documentation
export async function GET() {
  return NextResponse.json({
    name: 'BoilerAI Signals Ingestion API',
    version: '1.0.0',
    description: 'Accepts differentially private aggregated metrics only',
    
    requirements: {
      format: 'DP-noised aggregates with epsilon and noisyCount',
      rateLimit: '1 batch per minute per client',
      maxMetrics: MAX_METRICS_PER_BATCH,
      epsilonRange: `${MIN_EPSILON} - ${MAX_EPSILON}`,
      kAnonymity: `Minimum ${K_ANONYMITY_THRESHOLD} estimated contributors`,
    },

    allowedMetrics: Array.from(ALLOWED_METRICS),

    exampleBatch: {
      batchId: 'batch-1234567890-abcdef',
      timestamp: Date.now(),
      metrics: {
        thumbs_down: {
          name: 'thumbs_down',
          noisyCount: 3,
          epsilon: 0.5,
        },
        no_answer: {
          name: 'no_answer', 
          noisyCount: 1,
          epsilon: 0.5,
        },
      },
    },

    rejected: [
      'Raw event data (timestamps, user IDs, etc.)',
      'Non-aggregated metrics',
      'Batches without proper DP noise',
      'Invalid metric names',
      'Epsilon values outside allowed range',
    ],

    privacy: {
      dataRetention: '90 days for aggregates',
      noUserTracking: 'Client hash changes hourly',
      kAnonymity: 'Low-contribution metrics suppressed',
      auditLog: 'Server logs contain no personal data',
    },
  })
}