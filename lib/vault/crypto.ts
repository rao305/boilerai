// Client-side WebCrypto utilities for AES-GCM encryption
// DEK (Data Encryption Key) management with device-bound keys

export interface EncryptedData {
  ciphertext: ArrayBuffer
  nonce: ArrayBuffer
  aad?: string
}

export class VaultCrypto {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256 // bits
  private static readonly NONCE_LENGTH = 96 // bits (12 bytes)

  /**
   * Generate a new Data Encryption Key (DEK) that stays on device
   * Key is non-extractable for security
   */
  static async generateDEK(): Promise<CryptoKey> {
    if (!window.crypto?.subtle) {
      throw new Error('WebCrypto not available')
    }

    return await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false, // non-extractable - key cannot leave device
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt data with DEK using AES-GCM
   */
  static async encrypt(
    plaintext: string | ArrayBuffer,
    dek: CryptoKey,
    aad?: string
  ): Promise<EncryptedData> {
    const nonce = window.crypto.getRandomValues(new Uint8Array(this.NONCE_LENGTH / 8))
    
    const plaintextBuffer = typeof plaintext === 'string' 
      ? new TextEncoder().encode(plaintext)
      : new Uint8Array(plaintext)

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: nonce,
        additionalData: aad ? new TextEncoder().encode(aad) : undefined,
      },
      dek,
      plaintextBuffer
    )

    return {
      ciphertext,
      nonce: nonce.buffer,
      aad,
    }
  }

  /**
   * Decrypt data with DEK using AES-GCM
   */
  static async decrypt(
    encryptedData: EncryptedData,
    dek: CryptoKey
  ): Promise<ArrayBuffer> {
    return await window.crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: new Uint8Array(encryptedData.nonce),
        additionalData: encryptedData.aad 
          ? new TextEncoder().encode(encryptedData.aad)
          : undefined,
      },
      dek,
      encryptedData.ciphertext
    )
  }

  /**
   * Decrypt and return as UTF-8 string
   */
  static async decryptText(
    encryptedData: EncryptedData,
    dek: CryptoKey
  ): Promise<string> {
    const decrypted = await this.decrypt(encryptedData, dek)
    return new TextDecoder().decode(decrypted)
  }

  /**
   * Wrap DEK with a random wrapping key for optional sync
   * Returns both the wrapped key and the wrapping key
   */
  static async wrapDEK(dek: CryptoKey): Promise<{
    wrappedKey: ArrayBuffer
    wrappingKey: ArrayBuffer
  }> {
    // Generate a random wrapping key
    const wrappingKeyMaterial = window.crypto.getRandomValues(new Uint8Array(32))
    
    const wrappingKey = await window.crypto.subtle.importKey(
      'raw',
      wrappingKeyMaterial,
      { name: 'AES-KW' },
      true, // extractable for storage
      ['wrapKey', 'unwrapKey']
    )

    const wrappedKey = await window.crypto.subtle.wrapKey(
      'raw',
      dek,
      wrappingKey,
      'AES-KW'
    )

    const exportedWrappingKey = await window.crypto.subtle.exportKey('raw', wrappingKey)

    return {
      wrappedKey,
      wrappingKey: exportedWrappingKey,
    }
  }

  /**
   * Unwrap DEK using the wrapping key
   */
  static async unwrapDEK(
    wrappedKey: ArrayBuffer,
    wrappingKey: ArrayBuffer
  ): Promise<CryptoKey> {
    const wrappingCryptoKey = await window.crypto.subtle.importKey(
      'raw',
      wrappingKey,
      { name: 'AES-KW' },
      false,
      ['unwrapKey']
    )

    return await window.crypto.subtle.unwrapKey(
      'raw',
      wrappedKey,
      wrappingCryptoKey,
      'AES-KW',
      { name: this.ALGORITHM },
      false, // Keep non-extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Derive key from password (for optional password-based encryption)
   * Not used by default - DEK is device-bound
   */
  static async deriveKey(
    password: string,
    salt: ArrayBuffer,
    iterations: number = 100000
  ): Promise<CryptoKey> {
    const passwordBuffer = new TextEncoder().encode(password)
    
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Convert ArrayBuffer to base64 for storage/transmission
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
    return btoa(binary)
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Secure random string generation for IDs
   */
  static generateSecureId(length: number = 32): string {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}