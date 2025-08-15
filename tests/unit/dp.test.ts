// Unit tests for Differential Privacy implementation

import { 
  RandomizedResponse, 
  DPEventCollector,
  validateDPBatch,
  DP_EVENTS 
} from '@/lib/dp/randomizedResponse'

describe('RandomizedResponse', () => {
  let dp: RandomizedResponse

  beforeEach(() => {
    dp = new RandomizedResponse({ epsilon: 0.5 })
  })

  test('should initialize with correct default epsilon', () => {
    const config = dp.getConfig()
    expect(config.epsilon).toBe(0.5)
    expect(config.sensitivity).toBe(1)
  })

  test('should apply noise to binary values', () => {
    const results = []
    for (let i = 0; i < 100; i++) {
      results.push(dp.applyNoise(true))
    }

    // Should have some noise (not all true)
    const trueCount = results.filter(r => r).length
    expect(trueCount).toBeGreaterThan(50) // Should be biased towards true
    expect(trueCount).toBeLessThan(100) // But not all true due to noise
  })

  test('should apply noise to counts', () => {
    const originalCount = 10
    const noisyCount = dp.applyCountNoise(originalCount)
    
    // Should be close to original but with some noise
    expect(noisyCount).toBeGreaterThanOrEqual(0)
    expect(Math.abs(noisyCount - originalCount)).toBeLessThan(20) // Reasonable noise range
  })

  test('should calculate theoretical properties correctly', () => {
    const sampleSize = 1000
    const properties = dp.getTheoricalProperties(sampleSize)
    
    expect(properties.bias).toBeGreaterThanOrEqual(0)
    expect(properties.variance).toBeGreaterThanOrEqual(0)
    expect(properties.standardError).toBe(Math.sqrt(properties.variance))
  })

  test('should update epsilon correctly', () => {
    dp.updateEpsilon(1.0)
    expect(dp.getConfig().epsilon).toBe(1.0)
  })

  test('should reject invalid epsilon values', () => {
    expect(() => dp.updateEpsilon(0)).toThrow('Epsilon must be positive')
    expect(() => dp.updateEpsilon(-1)).toThrow('Epsilon must be positive')
  })

  test('should estimate true probability from noisy rate', () => {
    const noisyRate = 0.6
    const estimated = dp.estimateTrueProbability(noisyRate)
    
    expect(estimated).toBeGreaterThanOrEqual(0)
    expect(estimated).toBeLessThanOrEqual(1)
  })
})

describe('DPEventCollector', () => {
  let collector: DPEventCollector
  let batches: any[] = []

  beforeEach(() => {
    batches = []
    collector = new DPEventCollector(
      { epsilon: 0.5 },
      {
        batchSize: 5,
        batchIntervalMs: 1000,
        onBatchReady: (batch) => batches.push(batch)
      }
    )
  })

  test('should record events correctly', () => {
    collector.recordEvent(DP_EVENTS.THUMBS_DOWN)
    collector.recordEvent(DP_EVENTS.THUMBS_DOWN)
    
    const counts = collector.getCurrentCounts()
    expect(counts[DP_EVENTS.THUMBS_DOWN]).toBe(2)
  })

  test('should record multiple events at once', () => {
    collector.recordEvents([
      DP_EVENTS.THUMBS_DOWN,
      DP_EVENTS.NO_ANSWER,
      DP_EVENTS.THUMBS_DOWN
    ])
    
    const counts = collector.getCurrentCounts()
    expect(counts[DP_EVENTS.THUMBS_DOWN]).toBe(2)
    expect(counts[DP_EVENTS.NO_ANSWER]).toBe(1)
  })

  test('should create batch when size threshold reached', () => {
    for (let i = 0; i < 6; i++) {
      collector.recordEvent(DP_EVENTS.THUMBS_DOWN)
    }
    
    expect(batches).toHaveLength(1)
    const batch = batches[0]
    expect(batch.metrics[DP_EVENTS.THUMBS_DOWN]).toBeDefined()
    expect(batch.metrics[DP_EVENTS.THUMBS_DOWN].noisyCount).toBeGreaterThanOrEqual(0)
  })

  test('should create valid batch format', () => {
    collector.recordEvent(DP_EVENTS.THUMBS_DOWN)
    const batch = collector.createBatch()
    
    expect(batch.batchId).toBeDefined()
    expect(batch.timestamp).toBeDefined()
    expect(batch.metrics).toBeDefined()
    expect(typeof batch.metrics[DP_EVENTS.THUMBS_DOWN].noisyCount).toBe('number')
    expect(typeof batch.metrics[DP_EVENTS.THUMBS_DOWN].epsilon).toBe('number')
  })

  test('should clear events after batch creation', () => {
    collector.recordEvent(DP_EVENTS.THUMBS_DOWN)
    collector.createBatch()
    
    const counts = collector.getCurrentCounts()
    expect(Object.keys(counts)).toHaveLength(0)
  })

  test('should update configuration correctly', () => {
    collector.updateConfig({ epsilon: 1.0 })
    const config = collector.getConfig()
    expect(config.epsilon).toBe(1.0)
  })
})

describe('validateDPBatch', () => {
  test('should accept valid DP batch', () => {
    const validBatch = {
      batchId: 'test-batch',
      timestamp: Date.now(),
      metrics: {
        thumbs_down: {
          noisyCount: 3,
          epsilon: 0.5,
        }
      }
    }
    
    expect(validateDPBatch(validBatch)).toBe(true)
  })

  test('should reject batch with missing required fields', () => {
    const invalidBatch = {
      batchId: 'test-batch',
      // Missing timestamp and metrics
    }
    
    expect(validateDPBatch(invalidBatch)).toBe(false)
  })

  test('should reject batch with raw event data', () => {
    const invalidBatch = {
      batchId: 'test-batch',
      timestamp: Date.now(),
      metrics: {
        thumbs_down: {
          noisyCount: 3,
          epsilon: 0.5,
          rawCount: 5, // Should be rejected
          events: ['event1', 'event2'] // Should be rejected
        }
      }
    }
    
    expect(validateDPBatch(invalidBatch)).toBe(false)
  })

  test('should reject batch with invalid epsilon', () => {
    const invalidBatch = {
      batchId: 'test-batch',
      timestamp: Date.now(),
      metrics: {
        thumbs_down: {
          noisyCount: 3,
          epsilon: 0, // Invalid epsilon
        }
      }
    }
    
    expect(validateDPBatch(invalidBatch)).toBe(false)
  })

  test('should reject batch with non-numeric noisyCount', () => {
    const invalidBatch = {
      batchId: 'test-batch',
      timestamp: Date.now(),
      metrics: {
        thumbs_down: {
          noisyCount: 'three', // Should be number
          epsilon: 0.5,
        }
      }
    }
    
    expect(validateDPBatch(invalidBatch)).toBe(false)
  })
})

describe('DP_EVENTS constants', () => {
  test('should have all required event types', () => {
    expect(DP_EVENTS.THUMBS_DOWN).toBe('thumbs_down')
    expect(DP_EVENTS.THUMBS_UP).toBe('thumbs_up')
    expect(DP_EVENTS.NO_ANSWER).toBe('no_answer')
    expect(DP_EVENTS.RETRY_CLICKED).toBe('retry_clicked')
    expect(DP_EVENTS.ESCALATE_CLICKED).toBe('escalate_clicked')
  })

  test('should have consistent naming convention', () => {
    Object.values(DP_EVENTS).forEach(eventName => {
      expect(eventName).toMatch(/^[a-z_]+$/) // Should be lowercase with underscores
      expect(eventName).not.toContain(' ') // No spaces
    })
  })
})