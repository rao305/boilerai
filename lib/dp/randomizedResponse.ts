// Differential Privacy - Randomized Response Mechanism
// ε-configurable privacy protection for anonymous metrics

export interface DPConfig {
  epsilon: number // Privacy parameter (default: 0.5)
  sensitivity: number // Global sensitivity (default: 1)
}

export interface DPEvent {
  name: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface DPAggregate {
  name: string
  noisyCount: number
  epsilon: number
  trueCount?: number // Only for testing/validation
}

export interface DPBatch {
  metrics: Record<string, DPAggregate>
  batchId: string
  timestamp: number
}

/**
 * Randomized Response Mechanism for Local Differential Privacy
 * 
 * For a binary event (occurred/not occurred), the mechanism:
 * 1. With probability p = e^ε / (e^ε + 1), report truthfully
 * 2. With probability 1-p, report random bit (1/2 each)
 * 
 * This provides ε-differential privacy with:
 * - Bias: (e^ε - 1) / (e^ε + 1) * true_rate
 * - Variance: depends on sample size and ε
 */
export class RandomizedResponse {
  private config: DPConfig
  private rng: () => number

  constructor(config: Partial<DPConfig> = {}) {
    this.config = {
      epsilon: 0.5, // Conservative default
      sensitivity: 1,
      ...config,
    }

    // Use crypto.getRandomValues if available, fallback to Math.random
    this.rng = typeof window !== 'undefined' && window.crypto
      ? this.cryptoRandom.bind(this)
      : Math.random
  }

  /**
   * Cryptographically secure random number generator
   */
  private cryptoRandom(): number {
    const array = new Uint32Array(1)
    window.crypto.getRandomValues(array)
    return array[0] / 0xFFFFFFFF
  }

  /**
   * Apply randomized response to a single binary event
   */
  applyNoise(actualValue: boolean): boolean {
    const p = Math.exp(this.config.epsilon) / (Math.exp(this.config.epsilon) + 1)
    
    if (this.rng() < p) {
      // Report truthfully with probability p
      return actualValue
    } else {
      // Report random bit with probability 1-p
      return this.rng() < 0.5
    }
  }

  /**
   * Apply noise to a count (for frequency events)
   * Uses Laplace mechanism for counting queries
   */
  applyCountNoise(trueCount: number): number {
    const sensitivity = this.config.sensitivity
    const scale = sensitivity / this.config.epsilon

    // Generate Laplace noise
    const u = this.rng() - 0.5
    const noise = -Math.sign(u) * scale * Math.log(1 - 2 * Math.abs(u))
    
    const noisyCount = Math.round(trueCount + noise)
    return Math.max(0, noisyCount) // Ensure non-negative
  }

  /**
   * Estimate true probability from noisy responses
   * Used for analysis/debugging only - not sent to server
   */
  estimateTrueProbability(noisyRate: number): number {
    const p = Math.exp(this.config.epsilon) / (Math.exp(this.config.epsilon) + 1)
    return (noisyRate - 0.5 * (1 - p)) / p
  }

  /**
   * Get theoretical bias and variance for this ε value
   */
  getTheoricalProperties(sampleSize: number): {
    bias: number
    variance: number
    standardError: number
  } {
    const p = Math.exp(this.config.epsilon) / (Math.exp(this.config.epsilon) + 1)
    
    // For randomized response mechanism
    const bias = 0.5 * (1 - p) // Bias towards 0.5
    const variance = (0.25 - bias * bias) / sampleSize
    const standardError = Math.sqrt(variance)

    return { bias, variance, standardError }
  }

  /**
   * Update epsilon value
   */
  updateEpsilon(epsilon: number): void {
    if (epsilon <= 0) {
      throw new Error('Epsilon must be positive')
    }
    this.config.epsilon = epsilon
  }

  /**
   * Get current configuration
   */
  getConfig(): DPConfig {
    return { ...this.config }
  }
}

/**
 * DP Event Collector - batches and applies noise to events
 */
export class DPEventCollector {
  private dp: RandomizedResponse
  private events: Map<string, number> = new Map()
  private batchSize: number
  private batchInterval: number
  private lastBatch: number = 0
  private onBatchReady?: (batch: DPBatch) => void

  constructor(
    dpConfig: Partial<DPConfig> = {},
    options: {
      batchSize?: number
      batchIntervalMs?: number
      onBatchReady?: (batch: DPBatch) => void
    } = {}
  ) {
    this.dp = new RandomizedResponse(dpConfig)
    this.batchSize = options.batchSize || 50
    this.batchInterval = options.batchIntervalMs || 60 * 60 * 1000 // 1 hour
    this.onBatchReady = options.onBatchReady

    // Set up automatic batching
    this.startBatchTimer()
  }

  /**
   * Record an event (will be batched and noised)
   */
  recordEvent(eventName: string): void {
    const current = this.events.get(eventName) || 0
    this.events.set(eventName, current + 1)

    // Check if we should create a batch
    if (this.shouldCreateBatch()) {
      this.createBatch()
    }
  }

  /**
   * Record multiple events at once
   */
  recordEvents(events: string[]): void {
    events.forEach(event => {
      const current = this.events.get(event) || 0
      this.events.set(event, current + 1)
    })

    if (this.shouldCreateBatch()) {
      this.createBatch()
    }
  }

  /**
   * Force creation of a batch with current events
   */
  createBatch(): DPBatch {
    const batch: DPBatch = {
      metrics: {},
      batchId: this.generateBatchId(),
      timestamp: Date.now(),
    }

    // Apply DP noise to each event count
    for (const [eventName, trueCount] of this.events.entries()) {
      const noisyCount = this.dp.applyCountNoise(trueCount)
      batch.metrics[eventName] = {
        name: eventName,
        noisyCount,
        epsilon: this.dp.getConfig().epsilon,
        // Don't include trueCount in production
        ...(process.env.NODE_ENV === 'development' && { trueCount }),
      }
    }

    // Clear events for next batch
    this.events.clear()
    this.lastBatch = Date.now()

    // Callback if provided
    if (this.onBatchReady) {
      this.onBatchReady(batch)
    }

    return batch
  }

  /**
   * Check if we should create a batch
   */
  private shouldCreateBatch(): boolean {
    const totalEvents = Array.from(this.events.values()).reduce((sum, count) => sum + count, 0)
    const timeSinceLastBatch = Date.now() - this.lastBatch

    return totalEvents >= this.batchSize || timeSinceLastBatch >= this.batchInterval
  }

  /**
   * Start automatic batch timer
   */
  private startBatchTimer(): void {
    setInterval(() => {
      if (this.events.size > 0) {
        this.createBatch()
      }
    }, this.batchInterval)
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    if (typeof window !== 'undefined' && window.crypto) {
      const array = new Uint8Array(16)
      window.crypto.getRandomValues(array)
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    }
    return `batch-${Date.now()}-${Math.random().toString(36).substring(2)}`
  }

  /**
   * Get current event counts (for debugging)
   */
  getCurrentCounts(): Record<string, number> {
    return Object.fromEntries(this.events)
  }

  /**
   * Update DP configuration
   */
  updateConfig(config: Partial<DPConfig>): void {
    const newConfig = { ...this.dp.getConfig(), ...config }
    this.dp = new RandomizedResponse(newConfig)
  }

  /**
   * Get current configuration
   */
  getConfig(): DPConfig {
    return this.dp.getConfig()
  }

  /**
   * Clear all pending events
   */
  clear(): void {
    this.events.clear()
  }
}

/**
 * Validate that a batch contains only DP-noised data
 * Used by server to reject raw event data
 */
export function validateDPBatch(data: any): data is DPBatch {
  if (!data || typeof data !== 'object') {
    return false
  }

  if (!data.batchId || !data.timestamp || !data.metrics) {
    return false
  }

  // Check each metric
  for (const [key, metric] of Object.entries(data.metrics)) {
    if (!metric || typeof metric !== 'object') {
      return false
    }

    const m = metric as any

    // Must have required DP fields
    if (typeof m.noisyCount !== 'number' || typeof m.epsilon !== 'number') {
      return false
    }

    // Must NOT have raw event data
    if (m.events || m.rawCount || m.userIds || m.timestamps) {
      return false
    }

    // Epsilon must be reasonable
    if (m.epsilon <= 0 || m.epsilon > 10) {
      return false
    }
  }

  return true
}

/**
 * Common event names for BoilerAI
 */
export const DP_EVENTS = {
  // User interaction events
  THUMBS_DOWN: 'thumbs_down',
  THUMBS_UP: 'thumbs_up',
  NO_ANSWER: 'no_answer',
  RETRY_CLICKED: 'retry_clicked',
  ESCALATE_CLICKED: 'escalate_clicked',
  
  // Feature usage
  TRANSCRIPT_UPLOADED: 'transcript_uploaded',
  PLANNER_ACCESSED: 'planner_accessed',
  CHAT_STARTED: 'chat_started',
  SETTINGS_CHANGED: 'settings_changed',
  
  // Error events
  API_ERROR: 'api_error',
  PARSE_ERROR: 'parse_error',
  NETWORK_ERROR: 'network_error',
} as const