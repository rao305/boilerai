// Chat store with IndexedDB for local-only storage
// Private by default, optional E2EE sync

import { IndexedDBVault } from '@/lib/vault/indexeddb'
import { vault } from '@/lib/vault/client'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: number
  conversationId: string
  metadata?: {
    model?: string
    tokens?: number
    confidence?: number
    sources?: string[]
  }
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  lastMessageAt: number
  messageCount: number
  metadata?: {
    model?: string
    totalTokens?: number
    category?: string
  }
}

export interface ChatSettings {
  syncEnabled: boolean
  retentionDays: number // 0 = keep forever, >0 = auto-delete after N days
  exportEnabled: boolean
}

export class ChatStore {
  private indexedDB: IndexedDBVault
  private isInitialized = false
  private settings: ChatSettings = {
    syncEnabled: false, // Private by default
    retentionDays: 0, // Keep forever by default
    exportEnabled: true,
  }

  constructor() {
    this.indexedDB = new IndexedDBVault()
  }

  async init(): Promise<void> {
    if (this.isInitialized) return

    await this.indexedDB.init()
    
    // Load settings from vault
    try {
      const savedSettings = await vault.getItem<ChatSettings>('CHAT_SETTINGS')
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings }
      }
    } catch (error) {
      console.warn('Could not load chat settings:', error)
    }

    // Clean up old conversations if retention is enabled
    if (this.settings.retentionDays > 0) {
      await this.cleanupOldConversations()
    }

    this.isInitialized = true
  }

  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<string> {
    await this.init()

    const conversation: Conversation = {
      id: this.generateId(),
      title: title || 'New Conversation',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messageCount: 0,
    }

    await this.indexedDB.storeConversation(conversation)
    return conversation.id
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    metadata?: ChatMessage['metadata']
  ): Promise<string> {
    await this.init()

    const message: ChatMessage = {
      id: this.generateId(),
      content,
      role,
      timestamp: Date.now(),
      conversationId,
      metadata,
    }

    // Store message locally
    await this.indexedDB.storeMessage(message)

    // Update conversation metadata
    await this.updateConversationMetadata(conversationId)

    // Optionally sync to server (E2EE)
    if (this.settings.syncEnabled) {
      await this.syncConversationToServer(conversationId)
    }

    return message.id
  }

  /**
   * Get all messages for a conversation
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    await this.init()
    return await this.indexedDB.getMessages(conversationId)
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<Conversation[]> {
    await this.init()
    return await this.indexedDB.getConversations()
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const conversations = await this.getConversations()
    return conversations.find(c => c.id === conversationId) || null
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const conversation = await this.getConversation(conversationId)
    if (!conversation) throw new Error('Conversation not found')

    const updated: Conversation = {
      ...conversation,
      title,
    }

    await this.indexedDB.storeConversation(updated)

    if (this.settings.syncEnabled) {
      await this.syncConversationToServer(conversationId)
    }
  }

  /**
   * Delete conversation and all messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.init()
    
    await this.indexedDB.deleteConversation(conversationId)

    // Remove from server if sync enabled
    if (this.settings.syncEnabled) {
      try {
        await this.deleteConversationFromServer(conversationId)
      } catch (error) {
        console.warn('Failed to delete conversation from server:', error)
      }
    }
  }

  /**
   * Search messages across all conversations
   */
  async searchMessages(query: string): Promise<{
    conversation: Conversation
    message: ChatMessage
  }[]> {
    await this.init()

    const conversations = await this.getConversations()
    const results: { conversation: Conversation; message: ChatMessage }[] = []

    for (const conversation of conversations) {
      const messages = await this.getMessages(conversation.id)
      const matchingMessages = messages.filter(message =>
        message.content.toLowerCase().includes(query.toLowerCase()) ||
        (message.metadata?.sources?.some(source => 
          source.toLowerCase().includes(query.toLowerCase())
        ))
      )

      for (const message of matchingMessages) {
        results.push({ conversation, message })
      }
    }

    // Sort by relevance and recency
    results.sort((a, b) => b.message.timestamp - a.message.timestamp)

    return results
  }

  /**
   * Export conversation as JSON
   */
  async exportConversation(conversationId: string): Promise<{
    conversation: Conversation
    messages: ChatMessage[]
  }> {
    if (!this.settings.exportEnabled) {
      throw new Error('Export is disabled')
    }

    const conversation = await this.getConversation(conversationId)
    if (!conversation) throw new Error('Conversation not found')

    const messages = await this.getMessages(conversationId)

    return { conversation, messages }
  }

  /**
   * Export all conversations
   */
  async exportAllConversations(): Promise<{
    conversations: Conversation[]
    messages: Record<string, ChatMessage[]>
  }> {
    if (!this.settings.exportEnabled) {
      throw new Error('Export is disabled')
    }

    const conversations = await this.getConversations()
    const messages: Record<string, ChatMessage[]> = {}

    for (const conversation of conversations) {
      messages[conversation.id] = await this.getMessages(conversation.id)
    }

    return { conversations, messages }
  }

  /**
   * Update chat settings
   */
  async updateSettings(newSettings: Partial<ChatSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings }
    
    // Save to vault
    try {
      await vault.setItem('CHAT_SETTINGS', this.settings)
    } catch (error) {
      console.warn('Could not save chat settings:', error)
    }

    // Handle sync toggle
    if (newSettings.syncEnabled !== undefined) {
      if (newSettings.syncEnabled) {
        await this.enableSync()
      } else {
        await this.disableSync()
      }
    }
  }

  /**
   * Get current settings
   */
  getSettings(): ChatSettings {
    return { ...this.settings }
  }

  /**
   * Enable E2EE sync for chat history
   */
  private async enableSync(): Promise<void> {
    // Export all conversations for sync
    const allData = await this.exportAllConversations()
    
    // Store encrypted on server via vault
    try {
      await vault.setItem('CHAT_HISTORY', allData)
    } catch (error) {
      console.error('Failed to enable chat sync:', error)
      throw error
    }
  }

  /**
   * Disable sync and remove from server
   */
  private async disableSync(): Promise<void> {
    try {
      // Clear from vault (will delete server copy)
      await vault.setItem('CHAT_HISTORY', null)
    } catch (error) {
      console.warn('Could not clear chat history from server:', error)
    }
  }

  /**
   * Sync specific conversation to server (E2EE)
   */
  private async syncConversationToServer(conversationId: string): Promise<void> {
    if (!this.settings.syncEnabled) return

    try {
      const conversationData = await this.exportConversation(conversationId)
      
      // Get existing server data
      const existingData = await vault.getItem('CHAT_HISTORY') || {
        conversations: [],
        messages: {},
      }

      // Update with new conversation data
      const updatedData = { ...existingData }
      const existingIndex = updatedData.conversations.findIndex(c => c.id === conversationId)
      
      if (existingIndex >= 0) {
        updatedData.conversations[existingIndex] = conversationData.conversation
      } else {
        updatedData.conversations.push(conversationData.conversation)
      }
      
      updatedData.messages[conversationId] = conversationData.messages

      // Store encrypted
      await vault.setItem('CHAT_HISTORY', updatedData)
    } catch (error) {
      console.warn('Failed to sync conversation to server:', error)
    }
  }

  /**
   * Delete conversation from server
   */
  private async deleteConversationFromServer(conversationId: string): Promise<void> {
    try {
      const existingData = await vault.getItem('CHAT_HISTORY')
      if (!existingData) return

      // Remove conversation and messages
      const updatedData = {
        conversations: existingData.conversations.filter((c: Conversation) => c.id !== conversationId),
        messages: { ...existingData.messages },
      }
      delete updatedData.messages[conversationId]

      await vault.setItem('CHAT_HISTORY', updatedData)
    } catch (error) {
      console.warn('Failed to delete conversation from server:', error)
    }
  }

  /**
   * Update conversation metadata (message count, last message time)
   */
  private async updateConversationMetadata(conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId)
    if (!conversation) return

    const messages = await this.getMessages(conversationId)
    const updated: Conversation = {
      ...conversation,
      messageCount: messages.length,
      lastMessageAt: Date.now(),
    }

    await this.indexedDB.storeConversation(updated)
  }

  /**
   * Clean up old conversations based on retention policy
   */
  private async cleanupOldConversations(): Promise<void> {
    if (this.settings.retentionDays <= 0) return

    const cutoff = Date.now() - (this.settings.retentionDays * 24 * 60 * 60 * 1000)
    const conversations = await this.getConversations()

    const oldConversations = conversations.filter(c => c.lastMessageAt < cutoff)
    
    for (const conversation of oldConversations) {
      await this.deleteConversation(conversation.id)
    }

    if (oldConversations.length > 0) {
      console.log(`Cleaned up ${oldConversations.length} old conversations`)
    }
  }

  /**
   * Clear all chat data (privacy/logout)
   */
  async clearAll(): Promise<void> {
    await this.indexedDB.clearAll()
    this.settings = {
      syncEnabled: false,
      retentionDays: 0,
      exportEnabled: true,
    }
    this.isInitialized = false
  }

  /**
   * Generate secure random ID
   */
  private generateId(): string {
    if (typeof window !== 'undefined' && window.crypto) {
      const array = new Uint8Array(16)
      window.crypto.getRandomValues(array)
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    }
    
    // Fallback for environments without crypto
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    conversationCount: number
    messageCount: number
    estimatedSizeKB: number
    oldestConversation: number | null
    newestConversation: number | null
  }> {
    await this.init()

    const conversations = await this.getConversations()
    let totalMessages = 0
    let estimatedSize = 0
    let oldest: number | null = null
    let newest: number | null = null

    for (const conversation of conversations) {
      const messages = await this.getMessages(conversation.id)
      totalMessages += messages.length

      // Estimate size (rough calculation)
      estimatedSize += JSON.stringify(conversation).length
      messages.forEach(msg => {
        estimatedSize += JSON.stringify(msg).length
      })

      if (!oldest || conversation.createdAt < oldest) {
        oldest = conversation.createdAt
      }
      if (!newest || conversation.lastMessageAt > newest) {
        newest = conversation.lastMessageAt
      }
    }

    return {
      conversationCount: conversations.length,
      messageCount: totalMessages,
      estimatedSizeKB: Math.round(estimatedSize / 1024),
      oldestConversation: oldest,
      newestConversation: newest,
    }
  }
}

// Global instance
export const chatStore = new ChatStore()