// Unit tests for WebCrypto vault system

import { VaultCrypto } from '@/lib/vault/crypto'

// Mock WebCrypto for Node.js environment
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    wrapKey: jest.fn(),
    unwrapKey: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
    digest: jest.fn(),
    deriveKey: jest.fn(),
  },
  getRandomValues: jest.fn(),
}

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
})

// Mock window for browser environment tests
Object.defineProperty(global, 'window', {
  value: { crypto: mockCrypto },
  writable: true,
})

describe('VaultCrypto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock behaviors
    mockCrypto.getRandomValues.mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    })
  })

  describe('generateDEK', () => {
    test('should generate AES-GCM key with correct parameters', async () => {
      const mockKey = { type: 'secret', algorithm: { name: 'AES-GCM' } }
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKey)

      const dek = await VaultCrypto.generateDEK()

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          length: 256,
        },
        false, // non-extractable
        ['encrypt', 'decrypt']
      )
      expect(dek).toBe(mockKey)
    })

    test('should throw error if WebCrypto not available', async () => {
      const originalCrypto = global.window.crypto
      global.window.crypto = undefined

      await expect(VaultCrypto.generateDEK()).rejects.toThrow('WebCrypto not available')

      global.window.crypto = originalCrypto
    })
  })

  describe('encrypt and decrypt', () => {
    const mockDEK = { type: 'secret', algorithm: { name: 'AES-GCM' } }
    const plaintext = 'test data'
    const mockCiphertext = new ArrayBuffer(16)
    const mockNonce = new Uint8Array(12)

    beforeEach(() => {
      mockCrypto.getRandomValues.mockReturnValue(mockNonce)
      mockCrypto.subtle.encrypt.mockResolvedValue(mockCiphertext)
      mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode(plaintext))
    })

    test('should encrypt data correctly', async () => {
      const result = await VaultCrypto.encrypt(plaintext, mockDEK as any)

      expect(result.ciphertext).toBe(mockCiphertext)
      expect(result.nonce).toBe(mockNonce.buffer)
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: mockNonce,
          additionalData: undefined,
        },
        mockDEK,
        expect.any(Uint8Array)
      )
    })

    test('should encrypt with AAD when provided', async () => {
      const aad = 'additional-data'
      await VaultCrypto.encrypt(plaintext, mockDEK as any, aad)

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalData: expect.any(Uint8Array),
        }),
        mockDEK,
        expect.any(Uint8Array)
      )
    })

    test('should decrypt data correctly', async () => {
      const encryptedData = {
        ciphertext: mockCiphertext,
        nonce: mockNonce.buffer,
      }

      const result = await VaultCrypto.decrypt(encryptedData, mockDEK as any)

      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: mockNonce,
          additionalData: undefined,
        },
        mockDEK,
        mockCiphertext
      )
      expect(result).toEqual(expect.any(ArrayBuffer))
    })

    test('should decrypt text correctly', async () => {
      const encryptedData = {
        ciphertext: mockCiphertext,
        nonce: mockNonce.buffer,
      }

      const result = await VaultCrypto.decryptText(encryptedData, mockDEK as any)

      expect(result).toBe(plaintext)
    })
  })

  describe('key wrapping', () => {
    const mockDEK = { type: 'secret' }
    const mockWrappingKey = { type: 'secret', algorithm: { name: 'AES-KW' } }
    const mockWrappedKey = new ArrayBuffer(32)
    const mockExportedKey = new ArrayBuffer(32)

    beforeEach(() => {
      mockCrypto.subtle.importKey.mockResolvedValue(mockWrappingKey)
      mockCrypto.subtle.exportKey.mockResolvedValue(mockExportedKey)
      mockCrypto.subtle.wrapKey.mockResolvedValue(mockWrappedKey)
      mockCrypto.subtle.unwrapKey.mockResolvedValue(mockDEK)
    })

    test('should wrap DEK correctly', async () => {
      const result = await VaultCrypto.wrapDEK(mockDEK as any)

      expect(result.wrappedKey).toBe(mockWrappedKey)
      expect(result.wrappingKey).toBe(mockExportedKey)
      expect(mockCrypto.subtle.wrapKey).toHaveBeenCalledWith(
        'raw',
        mockDEK,
        mockWrappingKey,
        'AES-KW'
      )
    })

    test('should unwrap DEK correctly', async () => {
      const result = await VaultCrypto.unwrapDEK(mockWrappedKey, mockExportedKey)

      expect(result).toBe(mockDEK)
      expect(mockCrypto.subtle.unwrapKey).toHaveBeenCalledWith(
        'raw',
        mockWrappedKey,
        mockWrappingKey,
        'AES-KW',
        { name: 'AES-GCM' },
        false, // non-extractable
        ['encrypt', 'decrypt']
      )
    })
  })

  describe('key derivation', () => {
    const password = 'test-password'
    const salt = new ArrayBuffer(16)
    const iterations = 100000
    const mockKeyMaterial = { type: 'secret' }
    const mockDerivedKey = { type: 'secret' }

    beforeEach(() => {
      mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial)
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey)
    })

    test('should derive key from password correctly', async () => {
      const result = await VaultCrypto.deriveKey(password, salt, iterations)

      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      )

      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt,
          iterations,
          hash: 'SHA-256',
        },
        mockKeyMaterial,
        {
          name: 'AES-GCM',
          length: 256,
        },
        false,
        ['encrypt', 'decrypt']
      )

      expect(result).toBe(mockDerivedKey)
    })
  })

  describe('utility functions', () => {
    test('should convert ArrayBuffer to base64', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer // "Hello"
      const result = VaultCrypto.arrayBufferToBase64(buffer)
      expect(result).toBe('SGVsbG8=')
    })

    test('should convert base64 to ArrayBuffer', () => {
      const base64 = 'SGVsbG8=' // "Hello"
      const result = VaultCrypto.base64ToArrayBuffer(base64)
      const decoded = new TextDecoder().decode(result)
      expect(decoded).toBe('Hello')
    })

    test('should generate secure ID', () => {
      const id = VaultCrypto.generateSecureId()
      expect(id).toHaveLength(64) // 32 bytes * 2 hex chars
      expect(id).toMatch(/^[a-f0-9]+$/) // Only hex characters
    })

    test('should generate secure ID with custom length', () => {
      const id = VaultCrypto.generateSecureId(16)
      expect(id).toHaveLength(32) // 16 bytes * 2 hex chars
    })
  })

  describe('error handling', () => {
    test('should handle crypto.subtle errors gracefully', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Crypto error'))

      await expect(VaultCrypto.generateDEK()).rejects.toThrow('Crypto error')
    })

    test('should handle invalid base64 input', () => {
      const invalidBase64 = 'invalid-base64!'
      expect(() => VaultCrypto.base64ToArrayBuffer(invalidBase64)).toThrow()
    })
  })
})