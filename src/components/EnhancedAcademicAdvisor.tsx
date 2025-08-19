/**
 * Enhanced Academic Advisor Component
 * React component that integrates the anti-looping advisor service
 */

import React, { useState, useEffect, useRef } from 'react';
import { proactiveAdvisorService } from '../services/proactiveAdvisorService';
import { enhancedAcademicAdvisor } from '../services/enhancedAcademicAdvisor';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, MessageCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface CourseRecommendation {
  code: string;
  title: string;
  credits: number;
  rationale: string;
  prerequisites?: string[];
}

interface AdvisorMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  recommendations?: CourseRecommendation[];
  metadata?: {
    antiLoopingTriggered: boolean;
    questionsAsked: number;
    provider: string;
  };
}

interface EnhancedAcademicAdvisorProps {
  userId?: string;
  studentProfile?: {
    major?: string;
    track?: string;
    academicLevel?: string;
    gradYear?: string;
    completedCourses?: string[];
  };
  onProfileUpdate?: (profile: any) => void;
}

export const EnhancedAcademicAdvisor: React.FC<EnhancedAcademicAdvisorProps> = ({
  userId = 'default',
  studentProfile,
  onProfileUpdate
}) => {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    questionsAsked: 0,
    transcriptPrompted: false,
    hasProvidedAdvice: false,
    conversationTurn: 0
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with a welcome message
    setMessages([{
      id: '1',
      text: "Hello! I'm BoilerAI, your academic advisor for Purdue University. I can help you plan courses, choose tracks, and navigate your degree requirements. What would you like to discuss about your academic journey?",
      isUser: false,
      timestamp: new Date()
    }]);

    // Update session stats
    updateSessionStats();
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateSessionStats = () => {
    const stats = proactiveAdvisorService.getSessionStats(userId);
    setSessionStats(stats);
  };

  const handleSendMessage = async () => {
    if (!currentQuery.trim() || isLoading) return;

    const userMessage: AdvisorMessage = {
      id: Date.now().toString(),
      text: currentQuery,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuery('');
    setIsLoading(true);

    try {
      const response = await proactiveAdvisorService.provideProactiveGuidance(
        currentQuery,
        userId,
        studentProfile
      );

      const advisorMessage: AdvisorMessage = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        recommendations: response.recommendations,
        metadata: response.metadata
      };

      setMessages(prev => [...prev, advisorMessage]);
      updateSessionStats();

      // Update profile if new information was gathered
      if (onProfileUpdate) {
        const updatedProfile = enhancedAcademicAdvisor.getStudentProfile(userId);
        if (updatedProfile) {
          onProfileUpdate(updatedProfile);
        }
      }

    } catch (error) {
      console.error('Error getting advisor response:', error);
      
      const errorMessage: AdvisorMessage = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I'm having trouble processing your request right now. Please try again, or you can ask me about course planning, track selection, or graduation requirements.",
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetSession = () => {
    proactiveAdvisorService.resetUserSession(userId);
    setMessages([{
      id: 'reset',
      text: "Session reset! I'm ready to help you with fresh academic guidance. What would you like to discuss?",
      isUser: false,
      timestamp: new Date()
    }]);
    updateSessionStats();
  };

  const renderCourseRecommendations = (recommendations: CourseRecommendation[]) => {
    if (!recommendations || recommendations.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
          <BookOpen className="w-4 h-4 mr-2" />
          Course Recommendations
        </h4>
        <div className="space-y-3">
          {recommendations.map((course, index) => (
            <div key={index} className="bg-white p-3 rounded border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{course.code}</h5>
                <Badge variant="secondary">{course.credits} credits</Badge>
              </div>
              <p className="text-sm text-gray-700 font-medium mb-1">{course.title}</p>
              <p className="text-sm text-gray-600">{course.rationale}</p>
              {course.prerequisites && course.prerequisites.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Prerequisites: {course.prerequisites.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMetadata = (metadata?: AdvisorMessage['metadata']) => {
    if (!metadata) return null;

    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        {metadata.antiLoopingTriggered && (
          <Badge variant="outline" className="text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Anti-loop Active
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          <MessageCircle className="w-3 h-3 mr-1" />
          {metadata.provider}
        </Badge>
        {metadata.questionsAsked > 0 && (
          <Badge variant="outline" className="text-xs">
            Questions: {metadata.questionsAsked}/2
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header with session stats */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              BoilerAI Academic Advisor
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Questions: {sessionStats.questionsAsked}/2
              </Badge>
              {sessionStats.hasProvidedAdvice && (
                <Badge variant="outline" className="text-xs text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Advice Given
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={resetSession}>
                Reset Session
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {!message.isUser && renderCourseRecommendations(message.recommendations || [])}
                  {!message.isUser && renderMetadata(message.metadata)}
                  <div className="flex items-center mt-2 gap-2">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-4 rounded-lg max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">BoilerAI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about courses, tracks, graduation requirements, or academic planning..."
              className="flex-1 min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!currentQuery.trim() || isLoading}
              className="self-end"
            >
              Send
            </Button>
          </div>
          
          {/* Quick action buttons */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuery("I'm a sophomore CS major. What courses should I take next semester?")}
              disabled={isLoading}
            >
              Course Planning
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuery("Help me choose between Machine Intelligence and Software Engineering tracks.")}
              disabled={isLoading}
            >
              Track Selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuery("Give me general course advice without transcript.")}
              disabled={isLoading}
            >
              General Advice
            </Button>
          </div>
          
          {sessionStats.questionsAsked >= 2 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Anti-looping active: I'll focus on providing direct recommendations without asking more questions.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};