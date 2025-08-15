// Integration tests for API endpoints

import { createMocks } from 'node-mocks-http'
import { POST as vaultPOST, GET as vaultGET, DELETE as vaultDELETE } from '@/app/api/vault/[kind]/route'
import { POST as signalsIngest, GET as signalsDoc } from '@/app/api/signals/ingest/route'
import { POST as shareExample } from '@/app/api/share-example/route'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vaultItem: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    signalMetric: {
      upsert: jest.fn(),
    },
    redactedExample: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: () => () => Promise.resolve({ success: true }),
}))

const { getServerSession } = require('next-auth')
const { prisma } = require('@/lib/prisma')

describe('Vault API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/vault/[kind]', () => {
    test('should store encrypted vault item', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })
      prisma.vaultItem.upsert.mockResolvedValue({
        id: 'item123',
        updatedAt: new Date(),
      })

      const { req } = createMocks({
        method: 'POST',
        body: {
          ciphertext: 'base64EncodedCiphertext',
          nonce: 'base64EncodedNonce',
          aad: 'additional-data',
        },
      })

      const response = await vaultPOST(req as any, { params: { kind: 'API_KEY' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(prisma.vaultItem.upsert).toHaveBeenCalledWith({
        where: {
          userId_kind: {
            userId: 'user123',
            kind: 'API_KEY',
          },
        },
        update: expect.objectContaining({
          ciphertext: expect.any(Buffer),
          nonce: expect.any(Buffer),
        }),
        create: expect.objectContaining({
          userId: 'user123',
          kind: 'API_KEY',
          ciphertext: expect.any(Buffer),
          nonce: expect.any(Buffer),
        }),
      })
    })

    test('should reject unauthenticated requests', async () => {
      getServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: {
          ciphertext: 'base64EncodedCiphertext',
          nonce: 'base64EncodedNonce',
        },
      })

      const response = await vaultPOST(req as any, { params: { kind: 'API_KEY' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should validate vault kind', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })

      const { req } = createMocks({
        method: 'POST',
        body: {
          ciphertext: 'base64EncodedCiphertext',
          nonce: 'base64EncodedNonce',
        },
      })

      const response = await vaultPOST(req as any, { params: { kind: 'INVALID_KIND' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid')
    })

    test('should validate encrypted data format', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })

      const { req } = createMocks({
        method: 'POST',
        body: {
          // Missing required fields
        },
      })

      const response = await vaultPOST(req as any, { params: { kind: 'API_KEY' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid')
    })
  })

  describe('GET /api/vault/[kind]', () => {
    test('should retrieve encrypted vault item', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })
      prisma.vaultItem.findUnique.mockResolvedValue({
        ciphertext: Buffer.from('encrypted-data'),
        nonce: Buffer.from('nonce-data'),
        aad: 'additional-data',
        updatedAt: new Date(),
      })

      const { req } = createMocks({ method: 'GET' })

      const response = await vaultGET(req as any, { params: { kind: 'API_KEY' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ciphertext).toBeDefined()
      expect(data.nonce).toBeDefined()
      expect(data.lastUpdated).toBeDefined()
    })

    test('should return 404 for non-existent items', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })
      prisma.vaultItem.findUnique.mockResolvedValue(null)

      const { req } = createMocks({ method: 'GET' })

      const response = await vaultGET(req as any, { params: { kind: 'API_KEY' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Item not found')
    })
  })

  describe('DELETE /api/vault/[kind]', () => {
    test('should delete vault item', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })
      prisma.vaultItem.delete.mockResolvedValue({ id: 'item123' })

      const { req } = createMocks({ method: 'DELETE' })

      const response = await vaultDELETE(req as any, { params: { kind: 'API_KEY' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.vaultItem.delete).toHaveBeenCalledWith({
        where: {
          userId_kind: {
            userId: 'user123',
            kind: 'API_KEY',
          },
        },
      })
    })
  })
})

describe('Signals Ingestion API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/signals/ingest', () => {
    test('should accept valid DP batch', async () => {
      prisma.$transaction.mockResolvedValue([{ id: 'metric123' }])

      const validBatch = {
        batchId: 'test-batch-123',
        timestamp: Date.now(),
        metrics: {
          thumbs_down: {
            name: 'thumbs_down',
            noisyCount: 3,
            epsilon: 0.5,
          },
        },
      }

      const { req } = createMocks({
        method: 'POST',
        body: validBatch,
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await signalsIngest(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metricsCount).toBe(1)
    })

    test('should reject batch with raw events', async () => {
      const invalidBatch = {
        batchId: 'test-batch-123',
        timestamp: Date.now(),
        metrics: {
          thumbs_down: {
            name: 'thumbs_down',
            noisyCount: 3,
            epsilon: 0.5,
            rawEvents: ['event1', 'event2'], // Should be rejected
          },
        },
      }

      const { req } = createMocks({
        method: 'POST',
        body: invalidBatch,
      })

      const response = await signalsIngest(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('RAW_EVENTS_DETECTED')
    })

    test('should reject invalid metric names', async () => {
      const invalidBatch = {
        batchId: 'test-batch-123',
        timestamp: Date.now(),
        metrics: {
          invalid_metric: {
            name: 'invalid_metric',
            noisyCount: 3,
            epsilon: 0.5,
          },
        },
      }

      const { req } = createMocks({
        method: 'POST',
        body: invalidBatch,
      })

      const response = await signalsIngest(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('INVALID_METRIC_NAME')
    })

    test('should reject invalid epsilon values', async () => {
      const invalidBatch = {
        batchId: 'test-batch-123',
        timestamp: Date.now(),
        metrics: {
          thumbs_down: {
            name: 'thumbs_down',
            noisyCount: 3,
            epsilon: 0, // Invalid epsilon
          },
        },
      }

      const { req } = createMocks({
        method: 'POST',
        body: invalidBatch,
      })

      const response = await signalsIngest(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('INVALID_EPSILON')
    })
  })

  describe('GET /api/signals/ingest', () => {
    test('should return API documentation', async () => {
      const { req } = createMocks({ method: 'GET' })

      const response = await signalsDoc(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toContain('Signals Ingestion API')
      expect(data.allowedMetrics).toBeInstanceOf(Array)
      expect(data.requirements).toBeDefined()
    })
  })
})

describe('Share Example API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/share-example', () => {
    test('should accept valid redacted example', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })
      prisma.redactedExample.create.mockResolvedValue({
        id: 'example123',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const validExample = {
        textRedacted: 'The AI failed to answer my question about [COURSE] requirements',
        category: 'academic_planning',
        tag: 'no_answer',
        description: 'AI could not help with degree planning',
      }

      const { req } = createMocks({
        method: 'POST',
        body: validExample,
      })

      const response = await shareExample(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.exampleId).toBe('example123')
      expect(prisma.redactedExample.create).toHaveBeenCalledWith({
        data: {
          textRedacted: validExample.textRedacted,
          category: validExample.category,
          tag: validExample.tag,
          expiresAt: expect.any(Date),
        },
      })
    })

    test('should reject unauthenticated requests', async () => {
      getServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: {
          textRedacted: 'Some text',
          category: 'academic_planning',
          tag: 'no_answer',
        },
      })

      const response = await shareExample(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('UNAUTHORIZED')
    })

    test('should validate required fields', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })

      const { req } = createMocks({
        method: 'POST',
        body: {
          // Missing required fields
        },
      })

      const response = await shareExample(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('MISSING_REQUIRED_FIELDS')
    })

    test('should validate category and tag values', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })

      const { req } = createMocks({
        method: 'POST',
        body: {
          textRedacted: 'Some text',
          category: 'invalid_category',
          tag: 'invalid_tag',
        },
      })

      const response = await shareExample(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('INVALID_')
    })

    test('should validate text length limits', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })

      const { req } = createMocks({
        method: 'POST',
        body: {
          textRedacted: 'x'.repeat(20000), // Too long
          category: 'academic_planning',
          tag: 'no_answer',
        },
      })

      const response = await shareExample(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('TEXT_TOO_LONG')
    })

    test('should detect potential PII in redacted text', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user123' } })

      const { req } = createMocks({
        method: 'POST',
        body: {
          textRedacted: 'Contact john.doe@purdue.edu for help', // Contains email
          category: 'academic_planning',
          tag: 'no_answer',
        },
      })

      const response = await shareExample(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('REDACTION_INCOMPLETE')
    })
  })
})

describe('Error handling', () => {
  test('should handle database errors gracefully', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user123' } })
    prisma.vaultItem.upsert.mockRejectedValue(new Error('Database connection failed'))

    const { req } = createMocks({
      method: 'POST',
      body: {
        ciphertext: 'base64EncodedCiphertext',
        nonce: 'base64EncodedNonce',
      },
    })

    const response = await vaultPOST(req as any, { params: { kind: 'API_KEY' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  test('should handle malformed JSON requests', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user123' } })

    const { req } = createMocks({
      method: 'POST',
      body: 'invalid json',
    })

    // Mock JSON parsing error
    req.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

    const response = await vaultPOST(req as any, { params: { kind: 'API_KEY' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid')
  })
})