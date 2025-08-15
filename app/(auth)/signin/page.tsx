'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Shield, AlertCircle, ExternalLink } from 'lucide-react'
import Image from 'next/image'

const ERROR_MESSAGES = {
  AccessDenied: 'Access is restricted to Purdue University accounts only.',
  Configuration: 'There is a problem with the server configuration.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during sign in. Please try again.',
}

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errorParam = searchParams.get('error') as keyof typeof ERROR_MESSAGES
  const callbackUrl = searchParams.get('callbackUrl') || '/app'

  useEffect(() => {
    // Check if already authenticated
    getSession().then((session) => {
      if (session) {
        router.replace(callbackUrl)
      }
    })

    // Set error message if provided
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setError(ERROR_MESSAGES[errorParam])
    }
  }, [errorParam, callbackUrl, router])

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('azure-ad', {
        callbackUrl,
        redirect: false,
      })

      if (result?.error) {
        setError(ERROR_MESSAGES[result.error as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.Default)
      } else if (result?.ok) {
        // Successful sign-in, redirect will happen automatically
        router.replace(callbackUrl)
      }
    } catch (err) {
      console.error('Sign-in error:', err)
      setError(ERROR_MESSAGES.Default)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">BA</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-neutral-100 mb-2">BoilerAI</h1>
          <p className="text-neutral-400">AI-powered academic assistant for Purdue</p>
        </div>

        {/* Sign In Card */}
        <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-neutral-100">Welcome back</CardTitle>
            <CardDescription className="text-neutral-400">
              Sign in with your Purdue Microsoft account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert className="border-red-800 bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Microsoft Sign-in Button */}
            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              size="lg"
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-neutral-900 h-12 font-medium"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                  Sign in with Microsoft
                </div>
              )}
            </Button>

            <Separator />

            {/* Privacy Notice */}
            <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <h4 className="font-semibold text-neutral-200 mb-1">Private by Default</h4>
                  <p className="text-neutral-300">
                    Your conversations and academic data stay on your device. 
                    We can't see your chats, transcripts, or grades.
                  </p>
                </div>
              </div>
            </div>

            {/* Access Requirements */}
            <div className="text-sm text-neutral-400 space-y-2">
              <h4 className="font-semibold text-neutral-300">Requirements:</h4>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                  Valid Purdue University account
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                  Email ending in @purdue.edu
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                  Modern browser with JavaScript enabled
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-neutral-500">
            <button 
              onClick={() => window.open('/privacy', '_blank')}
              className="hover:text-neutral-300 flex items-center gap-1"
            >
              Privacy Policy <ExternalLink className="w-3 h-3" />
            </button>
            <button 
              onClick={() => window.open('/terms', '_blank')}
              className="hover:text-neutral-300 flex items-center gap-1"
            >
              Terms of Use <ExternalLink className="w-3 h-3" />
            </button>
            <button 
              onClick={() => window.open('/support', '_blank')}
              className="hover:text-neutral-300 flex items-center gap-1"
            >
              Support <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          
          <p className="text-xs text-neutral-500 mt-4">
            Restricted to Purdue University students, faculty, and staff
          </p>
        </div>

        {/* Development Mode Notice */}
        {process.env.NODE_ENV === 'development' && (
          <Alert className="mt-4 border-yellow-800 bg-yellow-900/20">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300 text-sm">
              <strong>Development Mode:</strong> Using test Azure AD configuration. 
              In production, this will be restricted to Purdue's tenant.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}