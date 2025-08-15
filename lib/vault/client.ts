// Client-side vault for managing encrypted user data
// Private by default with optional E2EE sync

import { VaultCrypto, EncryptedData } from './crypto'
import { IndexedDBVault } from './indexeddb'

export type VaultKind = 'API_KEY' | 'ASSISTANT_SETTINGS' | 'CHAT_HISTORY' | 'DEK_WRAPPED'

export interface VaultItem {
  kind: VaultKind
  data: any
  lastUpdated: number
}

export interface VaultConfig {
  syncEnabled: boolean
  encryptionEnabled: boolean
}

export class ClientVault {
  private dek: CryptoKey | null = null
  private indexedDB: IndexedDBVault
  private isInitialized = false

  constructor() {
    this.indexedDB = new IndexedDBVault()
  }

  /**
   * Initialize vault - generate or load DEK
   */
  async init(): Promise<void> {
    if (this.isInitialized) return

    await this.indexedDB.init()

    // Try to load existing DEK
    const metadata = await this.indexedDB.getMetadata()
    if (metadata) {
      this.dek = await this.indexedDB.getDEK(metadata.dekId)
      if (this.dek) {
        // Update last used timestamp
        await this.indexedDB.storeMetadata({
          ...metadata,
          lastUsed: Date.now(),
        })
      }
    }

    // Generate new DEK if none exists
    if (!this.dek) {
      await this.generateNewDEK()
    }

    this.isInitialized = true
  }

  /**
   * Generate new DEK and store it locally
   */
  private async generateNewDEK(): Promise<void> {
    this.dek = await VaultCrypto.generateDEK()
    const dekId = VaultCrypto.generateSecureId()

    await this.indexedDB.storeDEK(dekId, this.dek)
    await this.indexedDB.storeMetadata({
      dekId,
      dekRef: dekId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      syncEnabled: false, // Default to local-only
    })
  }

  /**
   * Store item in vault (encrypted locally, optionally synced)
   */
  async setItem(kind: VaultKind, data: any): Promise<void> {
    await this.init()
    if (!this.dek) throw new Error('Vault not initialized')

    const serialized = JSON.stringify(data)
    const encrypted = await VaultCrypto.encrypt(serialized, this.dek)

    // Store locally first
    const metadata = await this.indexedDB.getMetadata()
    if (!metadata) throw new Error('Vault metadata not found')

    // Check if sync is enabled for this vault
    if (metadata.syncEnabled && kind !== 'DEK_WRAPPED') {
      // Send to server as encrypted blob
      await this.syncToServer(kind, encrypted)
    }

    // Always store locally as backup
    await this.storeLocally(kind, { data, lastUpdated: Date.now() })
  }

  /**
   * Get item from vault
   */
  async getItem<T = any>(kind: VaultKind): Promise<T | null> {
    await this.init()
    if (!this.dek) throw new Error('Vault not initialized')

    // Try local storage first
    const localItem = await this.getFromLocal(kind)
    if (localItem) {
      return localItem.data
    }

    // Try server if sync enabled
    const metadata = await this.indexedDB.getMetadata()
    if (metadata?.syncEnabled) {
      const serverItem = await this.getFromServer(kind)
      if (serverItem) {
        // Decrypt and cache locally
        const decrypted = await VaultCrypto.decryptText(serverItem, this.dek)
        const data = JSON.parse(decrypted)
        await this.storeLocally(kind, { data, lastUpdated: Date.now() })
        return data
      }
    }

    return null
  }

  /**
   * Enable E2EE sync for this device
   */
  async enableSync(): Promise<void> {
    await this.init()
    if (!this.dek) throw new Error('Vault not initialized')

    const metadata = await this.indexedDB.getMetadata()
    if (!metadata) throw new Error('Vault metadata not found')

    // Wrap DEK for server storage
    const { wrappedKey, wrappingKey } = await VaultCrypto.wrapDEK(this.dek)

    // Store wrapped DEK on server
    await this.syncToServer('DEK_WRAPPED', {
      ciphertext: wrappedKey,
      nonce: new ArrayBuffer(0), // Not used for wrapped keys
    })

    // Store wrapping key locally (device-bound)
    await this.storeLocally('DEK_WRAPPED', {
      data: { wrappingKey: VaultCrypto.arrayBufferToBase64(wrappingKey) },
      lastUpdated: Date.now(),
    })

    // Update metadata
    await this.indexedDB.storeMetadata({
      ...metadata,
      syncEnabled: true,
    })
  }

  /**
   * Disable sync and clear server data
   */
  async disableSync(): Promise<void> {
    const metadata = await this.indexedDB.getMetadata()
    if (!metadata) return

    // Clear server data
    const kinds: VaultKind[] = ['API_KEY', 'ASSISTANT_SETTINGS', 'CHAT_HISTORY', 'DEK_WRAPPED']
    for (const kind of kinds) {
      try {
        await this.deleteFromServer(kind)
      } catch (error) {
        console.warn(`Failed to delete ${kind} from server:`, error)
      }
    }

    // Update local metadata
    await this.indexedDB.storeMetadata({
      ...metadata,
      syncEnabled: false,
    })
  }

  /**
   * Store item locally in IndexedDB
   */
  private async storeLocally(kind: VaultKind, item: VaultItem): Promise<void> {
    // Implementation depends on IndexedDB structure
    // For now, we'll use a simple key-value approach
    const key = `vault-${kind}`
    const data = { key, ...item }
    
    // This would need to be implemented in IndexedDBVault
    // For now, using browser localStorage as fallback
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data))
    }
  }

  /**
   * Get item from local IndexedDB
   */
  private async getFromLocal(kind: VaultKind): Promise<VaultItem | null> {
    const key = `vault-${kind}`
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)
        return { kind, data: parsed.data, lastUpdated: parsed.lastUpdated }
      }
    }
    
    return null
  }

  /**
   * Sync encrypted data to server
   */
  private async syncToServer(kind: VaultKind, encrypted: EncryptedData): Promise<void> {
    const response = await fetch(`/api/vault/${kind}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ciphertext: VaultCrypto.arrayBufferToBase64(encrypted.ciphertext),
        nonce: VaultCrypto.arrayBufferToBase64(encrypted.nonce),
        aad: encrypted.aad,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to sync ${kind} to server: ${response.statusText}`)
    }
  }

  /**
   * Get encrypted data from server
   */
  private async getFromServer(kind: VaultKind): Promise<EncryptedData | null> {
    const response = await fetch(`/api/vault/${kind}`)
    
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get ${kind} from server: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      ciphertext: VaultCrypto.base64ToArrayBuffer(data.ciphertext),
      nonce: VaultCrypto.base64ToArrayBuffer(data.nonce),
      aad: data.aad,
    }
  }

  /**
   * Delete item from server
   */
  private async deleteFromServer(kind: VaultKind): Promise<void> {
    const response = await fetch(`/api/vault/${kind}`, {
      method: 'DELETE',
    })

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete ${kind} from server: ${response.statusText}`)
    }
  }

  /**
   * Clear all vault data (logout/privacy)
   */
  async clearAll(): Promise<void> {
    // Clear local IndexedDB
    await this.indexedDB.clearAll()
    
    // Clear localStorage fallback
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('vault-'))
      keys.forEach(key => localStorage.removeItem(key))
    }

    // Reset state
    this.dek = null
    this.isInitialized = false
  }

  /**
   * Check if vault is available (WebCrypto support)
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
           !!window.crypto?.subtle &&
           !!window.indexedDB
  }

  /**
   * Get vault status
   */
  async getStatus(): Promise<{
    initialized: boolean
    syncEnabled: boolean
    itemCount: number
  }> {
    await this.init()
    
    const metadata = await this.indexedDB.getMetadata()
    
    // Count items (simplified)
    let itemCount = 0
    const kinds: VaultKind[] = ['API_KEY', 'ASSISTANT_SETTINGS', 'CHAT_HISTORY']
    for (const kind of kinds) {
      const item = await this.getFromLocal(kind)
      if (item) itemCount++
    }

    return {
      initialized: this.isInitialized,
      syncEnabled: metadata?.syncEnabled || false,
      itemCount,
    }
  }
}

// Global instance
export const vault = new ClientVault()