'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageSquare, User, Settings, LogOut, Shield, Activity } from 'lucide-react'

export default function AppDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [conversations, setConversations] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-yellow-500 text-xl">🚂 Loading Boiler AI...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/signin' })
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">BA</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-100">BoilerAI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-neutral-300">{session.user?.email}</span>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-100 mb-2">
            Welcome back, {session.user?.name?.split(' ')[0] || 'Student'}!
          </h2>
          <p className="text-neutral-400">
            Ready to supercharge your academic journey with AI assistance.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300">Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-100">{conversations}</div>
              <p className="text-xs text-neutral-500">AI-powered academic help</p>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300">Account Status</CardTitle>
              <User className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">Active</div>
              <p className="text-xs text-neutral-500">Purdue verified account</p>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-300">Privacy Status</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">Secure</div>
              <p className="text-xs text-neutral-500">Data stays on your device</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-neutral-900 border-neutral-800 hover:border-yellow-500 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-yellow-500 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Start New Conversation
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Get help with coursework, research, or study questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-neutral-900">
                Launch AI Assistant
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-neutral-300 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Privacy Settings
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Manage your data preferences and privacy controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Manage Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Privacy Notice */}
        <Alert className="border-yellow-800 bg-yellow-900/20">
          <Shield className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            <strong>Privacy-First Design:</strong> Your academic conversations and data remain on your device. 
            BoilerAI processes requests server-side but doesn't store personal content or transcripts.
          </AlertDescription>
        </Alert>

        {/* Recent Activity Placeholder */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-neutral-200 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-yellow-500" />
            Recent Activity
          </h3>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="pt-6">
              <div className="text-center text-neutral-400 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
                <p className="text-lg font-medium">No conversations yet</p>
                <p className="text-sm mt-2">Start your first AI-powered academic session above!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}





