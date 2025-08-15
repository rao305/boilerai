// IndexedDB wrapper for local storage of DEK and vault metadata
// Private by default - data stays on device

interface VaultMetadata {
  dekId: string
  dekRef: string // IndexedDB reference to the CryptoKey
  createdAt: number
  lastUsed: number
  syncEnabled: boolean
}

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: number
  conversationId: string
}

interface Conversation {
  id: string
  title: string
  createdAt: number
  lastMessageAt: number
  messageCount: number
}

export class IndexedDBVault {
  private static readonly DB_NAME = 'BoilerAI-Vault'
  private static readonly DB_VERSION = 1
  private static readonly DEK_STORE = 'dek-store'
  private static readonly METADATA_STORE = 'metadata-store'
  private static readonly CHAT_STORE = 'chat-store'
  private static readonly CONVERSATION_STORE = 'conversation-store'

  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDBVault.DB_NAME, IndexedDBVault.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // DEK storage (CryptoKey objects)
        if (!db.objectStoreNames.contains(IndexedDBVault.DEK_STORE)) {
          db.createObjectStore(IndexedDBVault.DEK_STORE, { keyPath: 'id' })
        }

        // Vault metadata
        if (!db.objectStoreNames.contains(IndexedDBVault.METADATA_STORE)) {
          const metadataStore = db.createObjectStore(IndexedDBVault.METADATA_STORE, { keyPath: 'key' })
          metadataStore.createIndex('lastUsed', 'lastUsed')
        }

        // Chat messages (local-only by default)
        if (!db.objectStoreNames.contains(IndexedDBVault.CHAT_STORE)) {
          const chatStore = db.createObjectStore(IndexedDBVault.CHAT_STORE, { keyPath: 'id' })
          chatStore.createIndex('conversationId', 'conversationId')
          chatStore.createIndex('timestamp', 'timestamp')
        }

        // Conversations
        if (!db.objectStoreNames.contains(IndexedDBVault.CONVERSATION_STORE)) {
          const conversationStore = db.createObjectStore(IndexedDBVault.CONVERSATION_STORE, { keyPath: 'id' })
          conversationStore.createIndex('lastMessageAt', 'lastMessageAt')
        }
      }
    })
  }

  /**
   * Store DEK in IndexedDB
   */
  async storeDEK(dekId: string, dek: CryptoKey): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.DEK_STORE], 'readwrite')
    const store = transaction.objectStore(IndexedDBVault.DEK_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put({ id: dekId, key: dek })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Retrieve DEK from IndexedDB
   */
  async getDEK(dekId: string): Promise<CryptoKey | null> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.DEK_STORE], 'readonly')
    const store = transaction.objectStore(IndexedDBVault.DEK_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get(dekId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.key : null)
      }
    })
  }

  /**
   * Store vault metadata
   */
  async storeMetadata(metadata: VaultMetadata): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.METADATA_STORE], 'readwrite')
    const store = transaction.objectStore(IndexedDBVault.METADATA_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put({ key: 'vault-metadata', ...metadata })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get vault metadata
   */
  async getMetadata(): Promise<VaultMetadata | null> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.METADATA_STORE], 'readonly')
    const store = transaction.objectStore(IndexedDBVault.METADATA_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get('vault-metadata')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          const { key, ...metadata } = result
          resolve(metadata as VaultMetadata)
        } else {
          resolve(null)
        }
      }
    })
  }

  /**
   * Store chat message locally
   */
  async storeMessage(message: ChatMessage): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.CHAT_STORE], 'readwrite')
    const store = transaction.objectStore(IndexedDBVault.CHAT_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put(message)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.CHAT_STORE], 'readonly')
    const store = transaction.objectStore(IndexedDBVault.CHAT_STORE)
    const index = store.index('conversationId')

    return new Promise((resolve, reject) => {
      const request = index.getAll(conversationId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const messages = request.result
        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp)
        resolve(messages)
      }
    })
  }

  /**
   * Store conversation metadata
   */
  async storeConversation(conversation: Conversation): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.CONVERSATION_STORE], 'readwrite')
    const store = transaction.objectStore(IndexedDBVault.CONVERSATION_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put(conversation)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction([IndexedDBVault.CONVERSATION_STORE], 'readonly')
    const store = transaction.objectStore(IndexedDBVault.CONVERSATION_STORE)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const conversations = request.result
        // Sort by last message (newest first)
        conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
        resolve(conversations)
      }
    })
  }

  /**
   * Delete conversation and all its messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction(
      [IndexedDBVault.CHAT_STORE, IndexedDBVault.CONVERSATION_STORE],
      'readwrite'
    )

    const chatStore = transaction.objectStore(IndexedDBVault.CHAT_STORE)
    const conversationStore = transaction.objectStore(IndexedDBVault.CONVERSATION_STORE)

    // Delete all messages in the conversation
    const chatIndex = chatStore.index('conversationId')
    const messageRequest = chatIndex.getAll(conversationId)

    return new Promise((resolve, reject) => {
      messageRequest.onsuccess = () => {
        const messages = messageRequest.result
        messages.forEach(message => {
          chatStore.delete(message.id)
        })

        // Delete the conversation
        const deleteRequest = conversationStore.delete(conversationId)
        deleteRequest.onerror = () => reject(deleteRequest.error)
        deleteRequest.onsuccess = () => resolve()
      }
      messageRequest.onerror = () => reject(messageRequest.error)
    })
  }

  /**
   * Clear all local data (for privacy/logout)
   */
  async clearAll(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    const transaction = this.db.transaction(
      [
        IndexedDBVault.DEK_STORE,
        IndexedDBVault.METADATA_STORE,
        IndexedDBVault.CHAT_STORE,
        IndexedDBVault.CONVERSATION_STORE,
      ],
      'readwrite'
    )

    const stores = [
      transaction.objectStore(IndexedDBVault.DEK_STORE),
      transaction.objectStore(IndexedDBVault.METADATA_STORE),
      transaction.objectStore(IndexedDBVault.CHAT_STORE),
      transaction.objectStore(IndexedDBVault.CONVERSATION_STORE),
    ]

    return new Promise((resolve, reject) => {
      let completed = 0
      const total = stores.length

      stores.forEach(store => {
        const request = store.clear()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          completed++
          if (completed === total) {
            resolve()
          }
        }
      })
    })
  }
}