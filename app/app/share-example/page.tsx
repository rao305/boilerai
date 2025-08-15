'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { redactionEngine, RedactionResult } from '@/lib/redact/apply'
import { Shield, Eye, Send, AlertTriangle, CheckCircle, X } from 'lucide-react'

interface ShareExampleFormData {
  originalText: string
  category: string
  tag: string
  description: string
}

const FAILURE_CATEGORIES = [
  { value: 'no_answer', label: 'AI gave no answer' },
  { value: 'wrong_answer', label: 'AI gave wrong answer' },
  { value: 'unhelpful', label: 'Answer was unhelpful' },
  { value: 'unclear', label: 'Answer was unclear' },
  { value: 'missing_context', label: 'AI missed important context' },
  { value: 'other', label: 'Other issue' },
]

const EXAMPLE_CATEGORIES = [
  { value: 'academic_planning', label: 'Academic Planning' },
  { value: 'course_help', label: 'Course Help' },
  { value: 'transcript_parsing', label: 'Transcript Parsing' },
  { value: 'general_question', label: 'General Question' },
  { value: 'technical_issue', label: 'Technical Issue' },
]

export default function ShareExamplePage() {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<ShareExampleFormData>({
    originalText: '',
    category: '',
    tag: '',
    description: '',
  })
  const [redactionResult, setRedactionResult] = useState<RedactionResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [manualRedactions, setManualRedactions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('paste')

  // Auto-redact when text changes
  useEffect(() => {
    if (formData.originalText.trim()) {
      const result = redactionEngine.getRecommendedRedaction(formData.originalText)
      setRedactionResult(result)
    } else {
      setRedactionResult(null)
    }
  }, [formData.originalText])

  const handleTextChange = (text: string) => {
    setFormData(prev => ({ ...prev, originalText: text }))
    setSubmitSuccess(false)
  }

  const addManualRedaction = (text: string) => {
    if (text && !manualRedactions.includes(text)) {
      setManualRedactions(prev => [...prev, text])
    }
  }

  const removeManualRedaction = (text: string) => {
    setManualRedactions(prev => prev.filter(item => item !== text))
  }

  const applyManualRedactions = (text: string): string => {
    let result = text
    for (const redaction of manualRedactions) {
      const regex = new RegExp(escapeRegExp(redaction), 'gi')
      result = result.replace(regex, '[REDACTED]')
    }
    return result
  }

  const getFinalRedactedText = (): string => {
    if (!redactionResult) return formData.originalText
    
    let finalText = redactionResult.redactedText
    finalText = applyManualRedactions(finalText)
    return finalText
  }

  const handleSubmit = async () => {
    if (!redactionResult || !formData.category || !formData.tag) {
      return
    }

    setIsSubmitting(true)
    try {
      const finalRedactedText = getFinalRedactedText()
      
      const response = await fetch('/api/share-example', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textRedacted: finalRedactedText,
          category: formData.category,
          tag: formData.tag,
          description: formData.description,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      setSubmitSuccess(true)
      // Clear form after successful submission
      setTimeout(() => {
        setFormData({
          originalText: '',
          category: '',
          tag: '',
          description: '',
        })
        setRedactionResult(null)
        setManualRedactions([])
        setSubmitSuccess(false)
      }, 3000)

    } catch (error) {
      console.error('Failed to submit example:', error)
      alert('Failed to submit example. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to share examples with the BoilerAI team.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-800">Thank You!</CardTitle>
            <CardDescription className="text-green-700">
              Your example has been submitted and will help improve BoilerAI's responses.
              All data is automatically deleted after 30 days.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Share Redacted Example</h1>
        <p className="text-gray-600">
          Help improve BoilerAI by sharing examples where it didn't work well. 
          All personal information is automatically redacted before sending.
        </p>
      </div>

      {/* Privacy Notice */}
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Privacy First:</strong> Your text is automatically scanned and redacted on your device. 
          We never see the original content, only the redacted version you approve.
          Examples are automatically deleted after 30 days.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="paste">1. Paste Text</TabsTrigger>
          <TabsTrigger value="review" disabled={!redactionResult}>
            2. Review Redaction
          </TabsTrigger>
          <TabsTrigger value="send" disabled={!redactionResult || !formData.category || !formData.tag}>
            3. Send
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Paste Text */}
        <TabsContent value="paste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Paste Your Example</span>
              </CardTitle>
              <CardDescription>
                Paste the conversation or text where BoilerAI didn't work as expected.
                Include both your question and the AI's response.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your example here... Include your question and BoilerAI's response."
                value={formData.originalText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={10}
                className="min-h-[200px]"
              />
              
              {formData.originalText && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="text-sm text-gray-600">
                    {formData.originalText.length} characters
                  </span>
                  {redactionResult && (
                    <Button 
                      onClick={() => setActiveTab('review')}
                      size="sm"
                    >
                      Review Redaction →
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Review Redaction */}
        <TabsContent value="review" className="space-y-4">
          {redactionResult && (
            <>
              {/* Redaction Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Automatic Redaction Applied
                  </CardTitle>
                  <CardDescription>
                    We found and redacted {redactionResult.stats.totalMatches} potential privacy issues.
                    Review the changes and add more redactions if needed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(redactionResult.stats.categoryCounts).map(([category, count]) => (
                      <div key={category} className="text-center">
                        <Badge variant="secondary" className="w-full">
                          {category}: {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Side-by-side comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Original */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Original Text</CardTitle>
                    <CardDescription>Your original example (not sent)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-red-50 p-4 rounded-md border border-red-200">
                      <pre className="whitespace-pre-wrap text-sm">
                        {formData.originalText}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                {/* Redacted */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Redacted Version</CardTitle>
                    <CardDescription>What we'll send (with your approval)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-50 p-4 rounded-md border border-green-200">
                      <pre className="whitespace-pre-wrap text-sm">
                        {getFinalRedactedText()}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Manual redaction controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Remove More Information</CardTitle>
                  <CardDescription>
                    Add words or phrases to redact manually. Click on any text in your example.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {manualRedactions.map((item, index) => (
                      <Badge key={index} variant="outline" className="gap-1">
                        {item}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0"
                          onClick={() => removeManualRedaction(item)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type text to redact..."
                      className="flex-1 px-3 py-2 border rounded-md"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addManualRedaction((e.target as HTMLInputElement).value)
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Type text to redact..."]') as HTMLInputElement
                        if (input.value) {
                          addManualRedaction(input.value)
                          input.value = ''
                        }
                      }}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>

                  <Button 
                    onClick={() => setActiveTab('send')} 
                    className="w-full"
                    disabled={!formData.originalText}
                  >
                    Looks Good → Continue to Send
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Step 3: Send */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Ready to Send
              </CardTitle>
              <CardDescription>
                Add some context about the issue and send your redacted example.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  What type of example is this? *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select category...</option>
                  {EXAMPLE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Issue Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  What went wrong? *
                </label>
                <select
                  value={formData.tag}
                  onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select issue...</option>
                  {FAILURE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Optional Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional context (optional)
                </label>
                <Textarea
                  placeholder="Any additional details about what should have happened..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <Separator />

              {/* Final Review */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Final Review</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Category: {formData.category && EXAMPLE_CATEGORIES.find(c => c.value === formData.category)?.label}</div>
                  <div>Issue: {formData.tag && FAILURE_CATEGORIES.find(c => c.value === formData.tag)?.label}</div>
                  <div>Redactions applied: {redactionResult?.stats.totalMatches} + {manualRedactions.length} manual</div>
                  <div>Text length: {getFinalRedactedText().length} characters</div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.category || !formData.tag}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Sending...' : 'Send Example to Improve BoilerAI'}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By sending, you agree that this redacted example can be used to improve BoilerAI.
                All examples are automatically deleted after 30 days.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}