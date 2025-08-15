'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Shield, 
  Eye, 
  Share, 
  Sync, 
  Info, 
  ExternalLink, 
  Database,
  MessageSquare,
  BarChart3,
  Lock,
  Trash2,
  Download
} from 'lucide-react'
import { vault } from '@/lib/vault/client'
import { chatStore } from '@/lib/chat/store'

interface PrivacySettings {
  anonymousMetrics: boolean
  shareRedactedExamples: boolean
  syncChatHistory: boolean
  syncApiKeysSettings: boolean
}

interface StorageStats {
  chatStats: {
    conversationCount: number
    messageCount: number
    estimatedSizeKB: number
  }
  vaultStats: {
    initialized: boolean
    syncEnabled: boolean
    itemCount: number
  }
}

export default function PrivacySettingsPage() {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState<PrivacySettings>({
    anonymousMetrics: false, // OFF by default
    shareRedactedExamples: false, // OFF by default  
    syncChatHistory: false, // OFF by default
    syncApiKeysSettings: true, // ON recommended
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [storageStats, setStorageStats] = useState<StorageStats>({
    chatStats: { conversationCount: 0, messageCount: 0, estimatedSizeKB: 0 },
    vaultStats: { initialized: false, syncEnabled: false, itemCount: 0 },
  })
  const [showIntroModal, setShowIntroModal] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      loadSettings()
      loadStorageStats()
      
      // Show privacy intro for new users
      const hasSeenIntro = localStorage.getItem('privacy-intro-seen')
      if (!hasSeenIntro) {
        setShowIntroModal(true)
      }
    }
  }, [status])

  const loadSettings = async () => {
    try {
      // Load settings from localStorage or vault
      const saved = localStorage.getItem('privacy-settings')
      if (saved) {
        setSettings({ ...settings, ...JSON.parse(saved) })
      }
    } catch (error) {
      console.warn('Could not load privacy settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStorageStats = async () => {
    try {
      const chatStats = await chatStore.getStorageStats()
      const vaultStats = await vault.getStatus()
      
      setStorageStats({
        chatStats: {
          conversationCount: chatStats.conversationCount,
          messageCount: chatStats.messageCount,
          estimatedSizeKB: chatStats.estimatedSizeKB,
        },
        vaultStats: {
          initialized: vaultStats.initialized,
          syncEnabled: vaultStats.syncEnabled,
          itemCount: vaultStats.itemCount,
        },
      })
    } catch (error) {
      console.warn('Could not load storage stats:', error)
    }
  }

  const saveSettings = async (newSettings: PrivacySettings) => {
    setIsSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem('privacy-settings', JSON.stringify(newSettings))
      
      // Apply settings
      if (newSettings.syncChatHistory !== settings.syncChatHistory) {
        await chatStore.updateSettings({ 
          syncEnabled: newSettings.syncChatHistory 
        })
      }

      if (newSettings.syncApiKeysSettings !== settings.syncApiKeysSettings) {
        if (newSettings.syncApiKeysSettings) {
          await vault.enableSync()
        } else {
          await vault.disableSync()
        }
      }

      setSettings(newSettings)
      
      // Refresh stats after changes
      await loadStorageStats()
      
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSettingChange = (key: keyof PrivacySettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    saveSettings(newSettings)
  }

  const handleClearAllData = async () => {
    if (confirm('This will permanently delete ALL your local data including chats, settings, and API keys. This cannot be undone. Continue?')) {
      try {
        await chatStore.clearAll()
        await vault.clearAll()
        localStorage.clear()
        
        alert('All local data has been cleared.')
        window.location.reload()
      } catch (error) {
        console.error('Failed to clear data:', error)
        alert('Failed to clear all data. Please try again.')
      }
    }
  }

  const handleExportData = async () => {
    try {
      const chatData = await chatStore.exportAllConversations()
      const dataBlob = new Blob([JSON.stringify(chatData, null, 2)], { 
        type: 'application/json' 
      })
      
      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `boilerai-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to export data:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  const dismissIntroModal = () => {
    setShowIntroModal(false)
    localStorage.setItem('privacy-intro-seen', 'true')
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to manage your privacy settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Privacy Settings</h1>
          <p className="text-gray-600">
            Control how your data is handled. All features are private by default.
          </p>
        </div>

        <Tabs defaultValue="privacy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="privacy">Privacy Controls</TabsTrigger>
            <TabsTrigger value="data">Your Data</TabsTrigger>
            <TabsTrigger value="about">How It Works</TabsTrigger>
          </TabsList>

          {/* Privacy Controls Tab */}
          <TabsContent value="privacy" className="space-y-6">
            
            {/* Privacy-First Notice */}
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Private by default.</strong> Your chats stay on your device. 
                We can't see your conversations, transcripts, or grades.
              </AlertDescription>
            </Alert>

            {/* Anonymous Metrics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Anonymous Metrics
                      <Badge variant={settings.anonymousMetrics ? "default" : "secondary"}>
                        {settings.anonymousMetrics ? "ON" : "OFF"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Share DP‑noised counts to help us spot blind spots.
                    </CardDescription>
                  </div>
                  <Switch
                    checked={settings.anonymousMetrics}
                    onCheckedChange={(checked) => handleSettingChange('anonymousMetrics', checked)}
                    disabled={isSaving}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    <strong>What's sent:</strong> Only noise-added counts like "3 thumbs down" 
                    (never your actual interactions)
                  </p>
                  <p>
                    <strong>Privacy protection:</strong> Differential privacy with ε=0.5 
                    makes individual actions invisible
                  </p>
                  {settings.anonymousMetrics && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md">
                      <p className="text-green-800 text-sm">
                        ✓ Helping improve BoilerAI while protecting your privacy
                      </p>
                    </div>
                  )}
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Info className="w-4 h-4 mr-2" />
                      Learn how it protects you
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Anonymous Metrics Privacy Protection</DialogTitle>
                      <DialogDescription asChild>
                        <div className="space-y-4 text-sm">
                          <p>
                            Anonymous Metrics uses <strong>Differential Privacy</strong> to protect 
                            your individual actions while still providing useful insights.
                          </p>
                          
                          <div className="bg-gray-50 p-4 rounded-md">
                            <h4 className="font-semibold mb-2">How it works:</h4>
                            <ul className="space-y-1 text-xs">
                              <li>• Your device adds mathematical noise to event counts</li>
                              <li>• Only aggregated, noised counts are sent (never raw events)</li>
                              <li>• Server cannot determine your individual actions</li>
                              <li>• Your IP address is not logged or stored</li>
                            </ul>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-md">
                            <h4 className="font-semibold mb-2">What we learn:</h4>
                            <p className="text-xs">
                              "About 3-5 students had issues with transcript parsing this week" 
                              (helping us fix bugs faster)
                            </p>
                          </div>

                          <div className="bg-red-50 p-4 rounded-md">
                            <h4 className="font-semibold mb-2">What we can't see:</h4>
                            <p className="text-xs">
                              Your specific actions, chat content, when you used features, 
                              or any way to identify you individually.
                            </p>
                          </div>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Share Redacted Examples */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Share className="w-5 h-5" />
                      Share Redacted Examples
                      <Badge variant={settings.shareRedactedExamples ? "default" : "secondary"}>
                        {settings.shareRedactedExamples ? "ON" : "OFF"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Manually review & send redacted snippets to improve answers.
                    </CardDescription>
                  </div>
                  <Switch
                    checked={settings.shareRedactedExamples}
                    onCheckedChange={(checked) => handleSettingChange('shareRedactedExamples', checked)}
                    disabled={isSaving}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    <strong>Full control:</strong> You review every example before sending. 
                    PII is automatically redacted on your device.
                  </p>
                  <p>
                    <strong>Auto-deletion:</strong> Examples are deleted after 30 days. 
                    No user IDs are stored.
                  </p>
                  {settings.shareRedactedExamples && (
                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('/app/share-example', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Share an Example
                      </Button>
                    </div>
                  )}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview before sending
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Example Sharing Process</DialogTitle>
                      <DialogDescription asChild>
                        <div className="space-y-4 text-sm">
                          <div className="bg-gray-50 p-4 rounded-md">
                            <h4 className="font-semibold mb-2">Step 1: Paste Your Example</h4>
                            <p className="text-xs">
                              Copy a conversation where BoilerAI didn't work well
                            </p>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-md">
                            <h4 className="font-semibold mb-2">Step 2: Automatic Redaction</h4>
                            <p className="text-xs">
                              Our system removes names, emails, student IDs, grades, 
                              and other personal information on your device
                            </p>
                          </div>

                          <div className="bg-green-50 p-4 rounded-md">
                            <h4 className="font-semibold mb-2">Step 3: Your Review</h4>
                            <p className="text-xs">
                              You see exactly what will be sent and can remove more 
                              information or cancel entirely
                            </p>
                          </div>

                          <div className="bg-yellow-50 p-4 rounded-md">
                            <h4 className="font-semibold mb-2">Step 4: Send with Context</h4>
                            <p className="text-xs">
                              Add category and description, then send. 
                              Auto-deleted after 30 days.
                            </p>
                          </div>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Separator />

            {/* Sync Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sync & Storage</h3>
              
              {/* Chat History Sync */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Sync encrypted chat history
                        <Badge variant={settings.syncChatHistory ? "default" : "secondary"}>
                          {settings.syncChatHistory ? "ON" : "OFF"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Keep history across sessions with end‑to‑end encryption.
                      </CardDescription>
                    </div>
                    <Switch
                      checked={settings.syncChatHistory}
                      onCheckedChange={(checked) => handleSettingChange('syncChatHistory', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Private:</strong> Chats are encrypted on your device before syncing. 
                      We only store ciphertext.
                    </p>
                    <p className="mt-2">
                      <strong>Current storage:</strong> {storageStats.chatStats.conversationCount} conversations, 
                      {storageStats.chatStats.messageCount} messages 
                      (~{storageStats.chatStats.estimatedSizeKB}KB)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* API Keys & Settings Sync */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Sync encrypted API keys & settings
                        <Badge variant={settings.syncApiKeysSettings ? "default" : "secondary"}>
                          {settings.syncApiKeysSettings ? "ON" : "OFF"}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          Recommended
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Restore keys & settings after logout; we only store ciphertext.
                      </CardDescription>
                    </div>
                    <Switch
                      checked={settings.syncApiKeysSettings}
                      onCheckedChange={(checked) => handleSettingChange('syncApiKeysSettings', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Convenience:</strong> Your API keys and preferences sync across devices 
                      without re-entry.
                    </p>
                    <p className="mt-2">
                      <strong>Vault status:</strong> {storageStats.vaultStats.initialized ? 'Initialized' : 'Not initialized'}, 
                      {storageStats.vaultStats.itemCount} encrypted items stored
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Your Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Your Data Summary
                </CardTitle>
                <CardDescription>
                  Overview of data stored locally and optionally synced
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Local Storage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Chat History</h4>
                    <div className="text-sm text-blue-700 mt-2">
                      <div>Conversations: {storageStats.chatStats.conversationCount}</div>
                      <div>Messages: {storageStats.chatStats.messageCount}</div>
                      <div>Storage: ~{storageStats.chatStats.estimatedSizeKB}KB</div>
                      <div>Location: Your device only</div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900">Encrypted Vault</h4>
                    <div className="text-sm text-green-700 mt-2">
                      <div>Items: {storageStats.vaultStats.itemCount}</div>
                      <div>Sync: {storageStats.vaultStats.syncEnabled ? 'Enabled' : 'Local only'}</div>
                      <div>Encryption: AES-GCM 256-bit</div>
                      <div>Key: Device-bound</div>
                    </div>
                  </div>
                </div>

                {/* Data Controls */}
                <Separator />
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleExportData}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export My Data
                  </Button>
                  
                  <Button
                    onClick={handleClearAllData}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Export:</strong> Downloads your chat history as JSON. 
                    <strong>Clear:</strong> Permanently deletes all local data. 
                    Synced encrypted data on our servers is also removed.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* How It Works Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy-First Design</CardTitle>
                <CardDescription>
                  How BoilerAI protects your privacy by default
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold">Private by Default</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Your chats, transcripts, and grades never leave your device unless 
                        you explicitly enable optional sharing features.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Lock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold">Client-Side Encryption</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        When you enable sync, your data is encrypted on your device 
                        with keys that never leave your browser.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <BarChart3 className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold">Differential Privacy</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Anonymous metrics use mathematical noise to make your 
                        individual actions invisible while still helping us improve.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Eye className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold">Full Transparency</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        When sharing examples, you see exactly what's being sent 
                        and can review or cancel at any time.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-gray-600">
                  <h4 className="font-semibold mb-2">Technical Details</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>AES-GCM 256-bit encryption with device-bound keys</li>
                    <li>Differential privacy with configurable ε parameter</li>
                    <li>No server-side analytics or tracking scripts</li>
                    <li>Row-level security on all user data</li>
                    <li>Automatic data retention limits (30 days for examples)</li>
                    <li>No account enumeration or user profiling</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Privacy Intro Modal */}
      <Dialog open={showIntroModal} onOpenChange={setShowIntroModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Your data stays yours.
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    Chats are saved only on your device by default.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    We don't store transcripts, grades, or logs.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    Help improve answers (optional): Anonymous Metrics (counts only) 
                    or Redacted Examples (you review first).
                  </li>
                </ul>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={dismissIntroModal}
                    className="flex-1"
                  >
                    Keep Private
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={dismissIntroModal}
                    className="flex-1"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}