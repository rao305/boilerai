// Jest setup file for test environment configuration

import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}))

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vaultItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    signalMetric: {
      create: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    redactedExample: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock WebCrypto for Node.js environment
const mockCrypto = {
  subtle: {
    generateKey: jest.fn().mockResolvedValue({ type: 'secret' }),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
    decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
    wrapKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    unwrapKey: jest.fn().mockResolvedValue({ type: 'secret' }),
    importKey: jest.fn().mockResolvedValue({ type: 'secret' }),
    exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    deriveKey: jest.fn().mockResolvedValue({ type: 'secret' }),
  },
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
}

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
})

Object.defineProperty(global, 'window', {
  value: {
    crypto: mockCrypto,
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    indexedDB: {
      open: jest.fn(),
      deleteDatabase: jest.fn(),
    },
  },
  writable: true,
})

// Mock IndexedDB
global.indexedDB = {
  open: jest.fn().mockImplementation(() => ({
    result: {
      createObjectStore: jest.fn(),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          put: jest.fn(),
          get: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn(),
          getAll: jest.fn(),
        })),
      })),
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  })),
  deleteDatabase: jest.fn(),
}

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock

// Mock TextEncoder/TextDecoder
global.TextEncoder = class TextEncoder {
  encode(input: string): Uint8Array {
    return new Uint8Array(Array.from(input).map(char => char.charCodeAt(0)))
  }
}

global.TextDecoder = class TextDecoder {
  decode(input: Uint8Array): string {
    return Array.from(input).map(byte => String.fromCharCode(byte)).join('')
  }
}

// Console spy to reduce noise in tests
global.console = {
  ...console,
  // Suppress console.log, console.warn, etc. in tests
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  NEXTAUTH_SECRET: 'test-secret',
  AZURE_CLIENT_ID: 'test-client-id',
  AZURE_CLIENT_SECRET: 'test-client-secret',
  AZURE_TENANT_ID: 'test-tenant-id',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  UPSTASH_REDIS_REST_URL: 'https://test-redis.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-token',
}

// Global test utilities
declare global {
  var testUtils: {
    createMockSession: (userId?: string) => any
    createMockVaultItem: (kind?: string) => any
    createMockDPBatch: () => any
  }
}

global.testUtils = {
  createMockSession: (userId = 'test-user-123') => ({
    user: {
      id: userId,
      email: 'test@purdue.edu',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }),

  createMockVaultItem: (kind = 'API_KEY') => ({
    id: 'vault-item-123',
    userId: 'test-user-123',
    kind,
    ciphertext: Buffer.from('encrypted-data'),
    nonce: Buffer.from('test-nonce'),
    aad: 'additional-auth-data',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  createMockDPBatch: () => ({
    batchId: `test-batch-${Date.now()}`,
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
  }),
}

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
})