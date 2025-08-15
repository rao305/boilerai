import React, { useState, useEffect, useRef } from "react";
import { openaiChatService } from "@/services/openaiChatService";
import { cladoService } from "@/services/cladoService";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { Maximize2, Minimize2, MessageSquare, Plus, Edit3, Trash2, Sidebar, AlertCircle, Settings, ExternalLink, Brain, Key, FileText, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import ThinkingMessage from "@/components/ThinkingMessage";
import SimpleEloRating from "@/components/SimpleEloRating";
import { EnhancedMessage, ChatSession, AIReasoningResponse } from "@/types/thinking";
import { pureAIFallback } from "@/services/pureAIFallback";
import { eloTrackingService } from "@/services/eloTrackingService";
import transcriptContextService from "@/services/transcriptContextService";
import contextualMemoryService from "@/services/contextualMemoryService";

// Purdue palette
const PURDUE_GOLD = "#CFB991";

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AIAssistant() {
  const { transcriptData } = useAcademicPlan();
  const { user } = useAuth();
  const { isApiKeyValid, setApiKeyValid } = useApiKey();
  const [input, setInput] = useState("");
  const [focus, setFocus] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [aiService, setAiService] = useState<'clado' | 'openai'>('openai'); // Toggle between Clado and OpenAI
  const [reasoningMode, setReasoningMode] = useState(true); // Enable reasoning by default
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [transcriptIntegrated, setTranscriptIntegrated] = useState(false);
  const [isIntegratingTranscript, setIsIntegratingTranscript] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Track implicit feedback through user behavior (simplified for ELO system)
  useEffect(() => {
    // Track conversation continuation when new messages are added
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user' && messages.length > 2) {
        // User continued conversation - positive implicit signal
        const previousAIMessage = messages[messages.length - 3];
        if (previousAIMessage?.role === 'assistant') {
          console.log('📈 Implicit positive signal: conversation continued after AI response');
        }
      }
    }
  }, [messages]);

  // Track scrolling behavior for engagement (simplified)
  const handleScroll = () => {
    // Simple engagement tracking - no complex collector needed
    console.log('👁️ User scrolling - engagement signal');
  };

  // Simple page unload tracking
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('👋 Session ending with', messages.filter(m => m.role === 'assistant' && !m.isThinking).length, 'AI messages');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, user?.id]);

  // Auto-enable Clado service when Clado AI is selected
  useEffect(() => {
    if (aiService === 'clado') {
      cladoService.enable();
    } else {
      cladoService.disable();
    }
  }, [aiService]);

  // Update OpenAI reasoning mode when changed
  useEffect(() => {
    openaiChatService.setReasoningMode(reasoningMode);
  }, [reasoningMode]);

  // Initialize chats - always start with new chat, load history in sidebar
  useEffect(() => {
    const initializeChats = async () => {
      const savedChats = localStorage.getItem(`chatSessions_${user?.id || 'anonymous'}`);
      
      // Create new chat for current session
      const newChat = await createNewChat();
      setCurrentChatId(newChat.id);
      setMessages(newChat.messages);
      
      if (savedChats) {
        const parsed = JSON.parse(savedChats);
        // Convert string timestamps back to Date objects
        const hydratedChats = parsed.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          lastMessageAt: new Date(chat.lastMessageAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        
        // Set new chat first, then add saved chats to sidebar
        setChatSessions([newChat, ...hydratedChats]);
      } else {
        setChatSessions([newChat]);
      }
    };

    initializeChats();
  }, [user?.id]);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem(`chatSessions_${user?.id || 'anonymous'}`, JSON.stringify(chatSessions));
    }
  }, [chatSessions, user?.id]);

  const createNewChat = async (): Promise<ChatSession> => {
    const newChat: ChatSession = {
      id: generateId(),
      name: "New Chat",
      messages: [], // Will add AI-generated greeting if available
      createdAt: new Date(),
      lastMessageAt: new Date()
    };

    // Skip automatic greeting generation to reduce API calls
    // Users can start the conversation when they're ready
    console.log('💬 Starting with empty chat to avoid unnecessary API calls');
    
    // Note: Automatic greeting generation has been disabled to prevent rate limiting
    // The AI will provide a personalized greeting when the user first interacts

    return newChat;
  };

  const handleNewChat = async () => {
    const newChat = await createNewChat();
    setChatSessions(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages(newChat.messages);
  };

  const handleDeleteChat = (chatId: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId);
      if (filtered.length === 0) {
        createNewChat().then(newChat => {
          setCurrentChatId(newChat.id);
          setMessages(newChat.messages);
          setChatSessions([newChat]);
        });
        return [];
      }
      if (currentChatId === chatId) {
        setCurrentChatId(filtered[0].id);
        setMessages(filtered[0].messages);
      }
      return filtered;
    });
  };

  const handleRenameChat = (chatId: string, newName: string) => {
    setChatSessions(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, name: newName } : chat
    ));
    setEditingChatId(null);
    setEditingName("");
  };

  const switchToChat = (chatId: string) => {
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  // Helper function to detect LinkedIn search queries
  const isLinkedInSearchQuery = (message: string): boolean => {
    const linkedInKeywords = [
      'software engineer', 'developers', 'data scientist', 'product manager',
      'alumni', 'professionals', 'engineers', 'managers', 'analysts',
      'at google', 'at apple', 'at microsoft', 'at meta', 'at amazon',
      'in silicon valley', 'in san francisco', 'in new york', 'in bay area',
      'purdue alumni', 'purdue graduates', 'computer science', 'networking',
      'find people', 'connect me', 'career', 'mentors'
    ];
    
    const lowerMessage = message.toLowerCase();
    return linkedInKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Helper function to send message to Python AI backend with Claude integration
  const sendToAIBackend = async (message: string, userId: string): Promise<string> => {
    try {
      // Try Pure AI service first (port 5003)
      const response = await window.fetch('http://localhost:5003/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          context: {
            userId: userId,
            timestamp: new Date().toISOString(),
            hasTranscript: transcriptData !== null
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response && !data.error) {
          return data.response;
        }
      }
      
      // If Pure AI fails, try other bridge services
      const fallbackPorts = [5001, 5002];
      for (const port of fallbackPorts) {
        try {
          const fallbackResponse = await window.fetch(`http://localhost:${port}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context: { userId } })
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.response && !fallbackData.error) {
              return fallbackData.response;
            }
          }
        } catch (error) {
          console.log(`Fallback service on port ${port} unavailable`);
        }
      }
      
      throw new Error('All AI backend services unavailable');
    } catch (error) {
      console.error('AI Backend connection failed:', error);
      // Final fallback to OpenAI service
      return await openaiChatService.sendMessage(message, userId);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    const timestamp = new Date();
    const trimmedInput = input.trim();
    
    // Handle /clado command - switch to Clado service
    if (trimmedInput === '/clado') {
      setAiService('clado');
      const aiMessage: EnhancedMessage = { 
        id: generateId(),
        role: "assistant", 
        content: "Switched to Clado AI mode! I can now search LinkedIn profiles and provide networking insights. Try asking about professionals, companies, or career paths.", 
        timestamp: new Date() 
      };
      
      const newMessages = [...messages];
      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      if (currentChatId) {
        setChatSessions(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: finalMessages, lastMessageAt: new Date() }
            : chat
        ));
      }
      
      setIsLoading(false);
      return;
    }
    
    // Add user message
    const userMessage: EnhancedMessage = { 
      id: generateId(),
      role: "user", 
      content: trimmedInput, 
      timestamp 
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // Add AI thinking indicator with detailed process display for ALL responses
    const thinkingMessage: EnhancedMessage = {
      id: generateId(),
      role: "assistant",
      content: "AI is analyzing your query...",
      timestamp: new Date(),
      isThinking: true,
              reasoning: {
          steps: [
            { id: 'understand', title: 'understand', content: `Analyzing your query: "${trimmedInput.substring(0, 50)}${trimmedInput.length > 50 ? '...' : ''}"`, status: 'processing', timestamp: new Date() },
            { id: 'context', title: 'context', content: transcriptData ? 'Applying your transcript data and academic history' : 'Gathering Purdue academic knowledge', status: 'pending', timestamp: new Date() },
            { id: 'formulate', title: 'formulate', content: 'Formulating personalized academic guidance and recommendations', status: 'pending', timestamp: new Date() },
            { id: 'finalize', title: 'finalize', content: 'Finalizing response with actionable next steps', status: 'pending', timestamp: new Date() }
          ],
          isComplete: false,
          currentStep: 0
        }
    };
    
    const messagesWithThinking = [...newMessages, thinkingMessage];
    setMessages(messagesWithThinking);
    setInput("");

    // Update current chat session
    if (currentChatId) {
      setChatSessions(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: newMessages,
              lastMessageAt: timestamp,
              name: chat.name === "New Chat" ? trimmedInput.slice(0, 30) + (trimmedInput.length > 30 ? "..." : "") : chat.name
            }
          : chat
      ));
    }

    try {
      const userId = user?.id || 'anonymous';
      let aiMessage: EnhancedMessage;
      
      // Route based on service selection
              // Update thinking message to show processing for ALL responses
        const updatedThinkingMessage: EnhancedMessage = {
          ...thinkingMessage,
          reasoning: {
            steps: thinkingMessage.reasoning!.steps.map((step, index) => ({
              ...step,
              status: 'completed' as const,
              content: index === 0 ? step.content : 
                      index === 1 ? `Applied ${transcriptData ? 'your transcript data and' : ''} Purdue academic knowledge` :
                      index === 2 ? 'Generated personalized academic guidance and recommendations' :
                      'Reviewed response for accuracy, helpfulness, and actionable next steps'
            })),
            isComplete: true,
            currentStep: 4
          }
        };
      
      // Show thinking process for a moment
      setMessages([...newMessages, updatedThinkingMessage]);
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (aiService === 'clado') {
        // Use Clado service for all queries (LinkedIn + general AI)
        console.log('🔗 Using Clado AI service:', trimmedInput);
        
        let aiResponseText: string;
        
        // Check if this is a LinkedIn search query
        if (trimmedInput.toLowerCase().startsWith('/clado') || isLinkedInSearchQuery(trimmedInput)) {
          // Use Clado API for LinkedIn searches
          try {
            const cladoResponse = await cladoService.searchPeople({
              query: trimmedInput.replace('/clado', '').trim() || trimmedInput,
              limit: 10
            });
            aiResponseText = cladoService.formatSearchResults(cladoResponse);
          } catch (error) {
            console.error('Clado search failed:', error);
            aiResponseText = `LinkedIn search error: ${error.message}. Try rephrasing your search or check if Clado is enabled.`;
          }
        } else {
          // Use Clado backend for general AI chat
          aiResponseText = await sendToAIBackend(trimmedInput, userId);
        }

        aiMessage = { 
          id: generateId(),
          role: "assistant", 
          content: aiResponseText, 
          timestamp: new Date(),
                      metadata: {
              thinkingSummary: `Processed via Clado AI: analyzed query → applied ${transcriptData ? 'your academic context and' : ''} professional networking knowledge → generated career-focused guidance`
            }
        };
      } else {
        // Use OpenAI service
        console.log('🤖 Using OpenAI service:', trimmedInput);
        
        let aiResponseText: string;
        let metadata: any = {};

        try {
          if (reasoningMode) {
            // Get reasoning response
            const reasoningResponse: AIReasoningResponse = await openaiChatService.sendMessageWithReasoning(trimmedInput, userId, currentChatId || undefined);
            aiResponseText = reasoningResponse.final_response;
            metadata = {
              confidence_score: reasoningResponse.confidence_score,
              reasoning_time: reasoningResponse.reasoning_time,
              model_used: reasoningResponse.model_used,
              thinkingSummary: reasoningResponse.thinkingSummary || `Applied structured reasoning: analyzed query → retrieved knowledge → validated against Purdue policies → synthesized personalized guidance`
            };
          } else {
            // Direct response
            aiResponseText = await openaiChatService.sendMessage(trimmedInput, userId, currentChatId || undefined);
            metadata = {
              thinkingSummary: `Generated response: analyzed query → applied ${transcriptData ? 'your academic profile and' : ''} Purdue knowledge → formulated guidance → reviewed for accuracy`
            };
          }
        } catch (error: any) {
          if (error.message === 'AI_COMPLETELY_UNAVAILABLE') {
            // AI is completely unavailable - show an empty state or prompt for API key
            throw error; // Re-throw to be handled by outer catch block
          }
          throw error;
        }
        
        aiMessage = { 
          id: generateId(),
          role: "assistant", 
          content: aiResponseText, 
          timestamp: new Date(),
          metadata
        };
      }
      
      // Remove thinking indicator and add AI response
      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      // Update chat session with AI response
      if (currentChatId) {
        setChatSessions(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: finalMessages, lastMessageAt: new Date() }
            : chat
        ));
      }
    } catch (error: any) {
      console.error('AI response failed:', error);
      
      if (error.message === 'AI_COMPLETELY_UNAVAILABLE') {
        // AI is completely unavailable - remove thinking indicator and show empty state
        setMessages(newMessages);
        setIsLoading(false);
        
        // Show a toast or modal asking to configure API key
        console.log('🚨 AI service is completely unavailable. Please configure your API key or check service status.');
        return;
      }
      
      try {
        // Try to use AI to generate contextual error response
        const aiErrorResponse = await pureAIFallback.generateErrorResponse(
          trimmedInput, 
          'general', 
          'AI service connection issue'
        );
        
        const errorMessage: EnhancedMessage = { 
          id: generateId(),
          role: "assistant", 
          content: aiErrorResponse,
          timestamp: new Date(),
          metadata: {
            thinkingSummary: `Generated error response: detected service issue → applied fallback AI → formulated helpful guidance despite limitations`
          }
        };
        
        const errorMessages = [...newMessages, errorMessage];
        setMessages(errorMessages);
        
        // Update chat session with error message
        if (currentChatId) {
          setChatSessions(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: errorMessages, lastMessageAt: new Date() }
              : chat
          ));
        }
      } catch (fallbackError) {
        // Even fallback AI failed - just remove thinking indicator
        setMessages(newMessages);
        console.log('🚨 All AI services unavailable. Please check your configuration.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate personalized AI greeting based on context
  const generatePersonalizedGreeting = async (): Promise<string> => {
    try {
      // Build context for greeting
      const context = {
        studentData: transcriptData ? {
          name: transcriptData.studentInfo?.name,
          program: transcriptData.studentInfo?.program,
          gpa: transcriptData.gpaSummary?.cumulativeGPA,
          credits: transcriptData.gpaSummary?.totalCreditsEarned,
          recentCourses: Object.values(transcriptData.completedCourses).slice(-1).flatMap(sem => 
            sem.courses?.slice(-3).map(c => c.courseCode) || []
          )
        } : null,
        timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
        hasTranscript: transcriptData !== null
      };

      // Generate personalized greeting
      const greetingPrompt = `Generate a warm, personalized greeting for a Purdue University student using this academic advisor. Be natural, conversational, and personable - like a real advisor who genuinely cares.

Student Context: ${JSON.stringify(context.studentData)}
Time: ${context.timeOfDay}
Has Transcript: ${context.hasTranscript}

Requirements:
- Address them by name if available, otherwise use a friendly general greeting
- Reference their academic situation naturally if transcript data is available
- Be encouraging and supportive
- Keep it conversational and natural - no markdown formatting
- Be brief but personable (2-3 sentences max)
- Sound like a real human advisor, not a chatbot

Generate a greeting that feels authentic and caring, like you're meeting with a student during office hours.`;

      const response = await openaiChatService.sendMessage(greetingPrompt, user?.id || 'anonymous');
      
      // Clean up the response and ensure it's natural
      return response.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.error('Failed to generate personalized greeting:', error);
      return "Hi there! How can I help you with your academic journey at Purdue today?";
    }
  };

  // Generate AI-powered contextual suggestions - no hardcoded templates
  const generateContextualSuggestions = async (): Promise<string[]> => {
    if (!isApiKeyValid) return [];
    
    try {
      // Build context for AI suggestion generation
      const context = {
        studentData: transcriptData ? {
          program: transcriptData.studentInfo?.program,
          gpa: transcriptData.gpaSummary?.cumulativeGPA,
          credits: transcriptData.gpaSummary?.totalCreditsEarned,
          recentCourses: Object.values(transcriptData.completedCourses).slice(-2).flatMap(sem => 
            sem.courses?.map(c => c.courseCode) || []
          )
        } : null,
        aiService: aiService,
        currentTime: new Date().toISOString()
      };

      // Only generate suggestions if we have actual student context
      if (!context.studentData || !context.studentData.program) {
        return []; // Don't generate generic suggestions - return empty array
      }

      // Use AI to generate contextual suggestions
      const suggestionPrompt = `Based on this specific Purdue student's context, generate 4 actionable questions they should ask their academic advisor right now.

Student Context: ${JSON.stringify(context.studentData)}

Requirements:
- Generate questions specific to THIS student's actual academic situation
- Focus on actionable next steps based on their program and progress
- Each suggestion should be 6-10 words maximum
- Return ONLY a JSON array of strings
- No explanatory text, just the array

Example format: ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]`;

      const response = await openaiChatService.sendMessage(suggestionPrompt, user?.id || 'anonymous');
      
      try {
        const suggestions = JSON.parse(response);
        return Array.isArray(suggestions) ? suggestions.slice(0, 4) : [];
      } catch {
        // If AI response isn't JSON, extract suggestions manually
        const lines = response.split('\n').filter(line => line.trim().length > 0);
        return lines.slice(0, 4).map(line => line.replace(/^[-*"'\d\.\s]+/, '').replace(/['"]*$/, ''));
      }
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      return []; // Return empty array instead of fallback suggestions
    }
  };

  // Load AI-generated suggestions when context changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (isApiKeyValid && !loadingSuggestions) {
        setLoadingSuggestions(true);
        try {
          const aiSuggestions = await generateContextualSuggestions();
          setSuggestions(aiSuggestions);
        } catch (error) {
          console.error('Failed to load AI suggestions:', error);
          setSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
        }
      }
    };

    loadSuggestions();
  }, [transcriptData, aiService, isApiKeyValid]);

  // Upload transcript context when available
  useEffect(() => {
    if (transcriptData && transcriptData.studentInfo?.name) {
      console.log('📝 Setting transcript context for AI...');
      // Convert transcriptData to compatible format by casting
      openaiChatService.setTranscriptContext(transcriptData as any);
      console.log('✅ Transcript context set for AI assistant');
    }
  }, [transcriptData, user?.id]);

  const currentChat = chatSessions.find(chat => chat.id === currentChatId);

  // Handle transcript integration for AI context
  const handleTranscriptIntegration = async () => {
    if (!transcriptData || !transcriptData.completedCourses || isIntegratingTranscript) {
      console.log('No transcript data available or already integrating');
      return;
    }

    setIsIntegratingTranscript(true);

    try {
      // Convert transcript data to course format
      const courses = Object.values(transcriptData.completedCourses)
        .flatMap(semester => semester.courses || [])
        .map(course => ({
          subject: course.courseCode?.split(' ')[0] || '',
          number: course.courseCode?.split(' ')[1] || '',
          title: course.title || '',
          creditHours: course.credits || 3,
          grade: course.grade || 'A',
          term: course.term || 'Unknown'
        }));

      // Generate AI context with student profile
      const contextData = await transcriptContextService.generateAIContext(courses, 'comprehensive');
      
      // Update OpenAI service with enhanced context
      openaiChatService.setEnhancedContext({
        studentProfile: contextData.studentProfile,
        contextPrompt: contextData.contextPrompt,
        transcriptData: transcriptData
      });

      // Initialize contextual memory for this session
      openaiChatService.setContextualMemory(user?.id || 'anonymous', currentChatId || 'default');

      // Add system message to current chat explaining the integration
      const systemMessage: EnhancedMessage = {
        id: generateId(),
        role: "assistant",
        content: `🎓 **Transcript Context Integrated!**

I now have full access to your academic profile:
- **Overall GPA**: ${contextData.studentProfile.gpa.overall}
- **Major GPA**: ${contextData.studentProfile.gpa.major}
- **Year Level**: ${contextData.studentProfile.performanceMetrics.yearLevel}
- **Completed Credits**: ${contextData.studentProfile.performanceMetrics.creditHours.completed}
- **Academic Strengths**: ${contextData.studentProfile.academicStrengths.join(', ')}

I can now provide:
✅ **Personalized Academic Advice** based on your actual performance
✅ **CODO Evaluation** for major changes using your transcript
✅ **Course Recommendations** aligned with your strengths and weaknesses
✅ **Smart Context Awareness** across our entire conversation
✅ **Continuous Learning** to improve advice quality

Ask me anything about your academic progress, course planning, or major requirements - I'll use your complete academic history to provide the most relevant guidance!`,
        timestamp: new Date(),
        metadata: {
          thinkingSummary: `Integrated transcript: analyzed course data → built student profile → initialized enhanced AI context → enabled personalized academic guidance`
        }
      };

      const updatedMessages = [...messages, systemMessage];
      setMessages(updatedMessages);

      if (currentChatId) {
        setChatSessions(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: updatedMessages, lastMessageAt: new Date() }
            : chat
        ));
      }

      setTranscriptIntegrated(true);
      console.log('✅ Transcript context successfully integrated');
      
    } catch (error) {
      console.error('❌ Failed to integrate transcript context:', error);
      
      const errorMessage: EnhancedMessage = {
        id: generateId(),
        role: "assistant",
        content: "⚠️ Failed to integrate transcript data. The AI will still work with basic functionality. Please try again or continue with general academic questions.",
        timestamp: new Date(),
        metadata: {
          thinkingSummary: `Failed transcript integration: attempted data processing → encountered error → gracefully degraded to basic functionality → maintained AI assistance`
        }
      };

      const errorMessages = [...messages, errorMessage];
      setMessages(errorMessages);

      if (currentChatId) {
        setChatSessions(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: errorMessages, lastMessageAt: new Date() }
            : chat
        ));
      }
    } finally {
      setIsIntegratingTranscript(false);
    }
  };

  // Check for transcript context on page load
  useEffect(() => {
    if (transcriptData && Object.keys(transcriptData.completedCourses || {}).length > 0) {
      const cachedContext = transcriptContextService.getCachedContext();
      if (cachedContext) {
        setTranscriptIntegrated(true);
      }
    }
  }, [transcriptData]);

  return (
    <div className="flex h-full w-full p-6">
      <div className="flex flex-col w-full space-y-4">
        {/* Compact API Key Setup Prompt */}
        {!isApiKeyValid && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/50">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-900/30">
                <Brain size={16} className="text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-200">AI Assistant Ready</h4>
                <p className="text-xs text-blue-300/80">Configure OpenAI API key in Settings to unlock chat features</p>
              </div>
            </div>
          </div>
        )}



        <div className={`flex bg-neutral-900/60 ring-1 ring-neutral-800 transition-all duration-300 rounded-2xl w-full h-full ${
          showSidebar ? "flex" : "w-full"
        }`}>
        
        {/* Chat History Sidebar - Smaller and Compact */}
        {showSidebar && (
          <div className="w-72 bg-neutral-900/95 border-r border-neutral-800 rounded-l-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium text-neutral-100">History</h2>
                <button 
                  onClick={() => setShowSidebar(false)}
                  className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <Minimize2 size={18} />
                </button>
              </div>
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium text-neutral-200 transition-colors"
              >
                <Plus size={16} />
                New Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatSessions.slice(1).map((chat) => ( // Skip first chat (current new chat)
                <div key={chat.id} className={`group rounded-lg p-3 cursor-pointer transition-colors ${
                  chat.id === currentChatId 
                    ? "bg-neutral-800 ring-1 ring-neutral-700" 
                    : "hover:bg-neutral-800/50"
                }`}>
                  <div onClick={() => switchToChat(chat.id)} className="flex-1">
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRenameChat(chat.id, editingName)}
                        onKeyPress={(e) => e.key === 'Enter' && handleRenameChat(chat.id, editingName)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-neutral-200"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-neutral-200 truncate mb-1">{chat.name}</h3>
                    )}
                    <p className="text-xs text-neutral-500">
                      {chat.lastMessageAt.toLocaleDateString()} • {chat.messages.length} msgs
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChatId(chat.id);
                        setEditingName(chat.name);
                      }}
                      className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Main Chat Area */}
        <div className={`flex flex-col ${showSidebar ? "flex-1" : "w-full"} h-full`}>
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Sidebar size={16} /> {showSidebar ? 'Hide' : 'History'}
                </span>
              </button>
              <div className="flex items-center gap-3">
                <div className="text-lg font-medium text-neutral-200">
                  {currentChat?.name || "New Chat"}
                </div>
                
                {/* AI Service Toggle */}
                <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                  <button
                    onClick={() => setAiService('clado')}
                    className={`px-2 py-1 text-xs rounded ${
                      aiService === 'clado' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    } transition-colors`}
                  >
                    Clado
                  </button>
                  <button
                    onClick={() => setAiService('openai')}
                    className={`px-2 py-1 text-xs rounded ${
                      aiService === 'openai' 
                        ? 'bg-green-600 text-white' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    } transition-colors`}
                  >
                    OpenAI
                  </button>
                </div>

                {/* Reasoning Mode Toggle - Only for OpenAI */}
                {aiService === 'openai' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                    <Brain size={14} className="text-blue-400" />
                    <button
                      onClick={() => setReasoningMode(!reasoningMode)}
                      className={`px-2 py-1 text-xs rounded ${
                        reasoningMode 
                          ? 'bg-blue-600 text-white' 
                          : 'text-neutral-400 hover:text-neutral-200'
                      } transition-colors`}
                    >
                      Thinking
                    </button>
                  </div>
                )}

                {/* Transcript Integration Button */}
                {transcriptData && Object.keys(transcriptData.completedCourses || {}).length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                    <FileText size={14} className={transcriptIntegrated ? "text-green-400" : "text-orange-400"} />
                    <button
                      onClick={handleTranscriptIntegration}
                      disabled={isIntegratingTranscript || transcriptIntegrated}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        transcriptIntegrated
                          ? 'bg-green-600 text-white cursor-default'
                          : isIntegratingTranscript
                          ? 'bg-neutral-600 text-neutral-300 cursor-not-allowed'
                          : 'bg-orange-600 text-white hover:bg-orange-500'
                      }`}
                    >
                      {isIntegratingTranscript ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border border-neutral-300 border-t-transparent rounded-full animate-spin"></div>
                          <span>Integrating...</span>
                        </div>
                      ) : transcriptIntegrated ? (
                        'Integrated'
                      ) : (
                        'Integrate Transcript'
                      )}
                    </button>
                  </div>
                )}
                
                {aiService === 'clado' && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 border border-blue-700/50 rounded-md">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-xs text-blue-300 font-medium">LinkedIn Search</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Scrollable Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0" onScroll={handleScroll}>
            <div className="space-y-4 pb-4">
              {messages.map((m) => (
                <div key={m.id}>
                  {/* User message */}
                  {m.role === "user" && (
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-xl px-4 py-3 text-sm bg-neutral-200 text-neutral-900">
                        <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                        <div className="text-xs opacity-50 mt-2">
                          {m.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI message with thinking support */}
                  {m.role === "assistant" && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] w-full">
                        {/* Show thinking message if it has reasoning */}
                        {m.isThinking && m.reasoning ? (
                          <ThinkingMessage 
                            message={m} 
                            onComplete={() => {
                              // Thinking animation complete
                              console.log('Reasoning animation completed');
                            }}
                          />
                        ) : m.isThinking ? (
                          /* Simple thinking indicator for non-reasoning modes */
                          <div className="bg-neutral-950/60 text-neutral-200 ring-1 ring-neutral-800 rounded-xl px-4 py-3 text-sm">
                            <div className="flex items-center gap-2 text-neutral-400">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                              </div>
                              <span className="text-xs">AI is thinking...</span>
                            </div>
                          </div>
                        ) : (
                          /* Regular AI response with RLHF feedback */
                          <div className="bg-neutral-950/60 text-neutral-200 ring-1 ring-neutral-800 rounded-xl px-4 py-3 text-sm">
                            <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-xs opacity-50">
                                {m.timestamp.toLocaleTimeString()}
                              </div>
                              {m.metadata?.confidence_score && (
                                <div className="text-xs text-blue-400">
                                  {Math.round(m.metadata.confidence_score * 100)}% confidence
                                </div>
                              )}
                            </div>
                            
                            {/* Simple ELO Rating */}
                            {!m.isThinking && (() => {
                              // Find the user message that triggered this AI response
                              const messageIndex = messages.findIndex(msg => msg.id === m.id);
                              const triggeringQuery = messageIndex > 0 && messages[messageIndex - 1]?.role === 'user'
                                ? messages[messageIndex - 1].content
                                : 'Unknown query';
                              
                              return (
                                <div>
                                  <SimpleEloRating
                                    messageId={m.id}
                                    query={triggeringQuery}
                                    response={m.content}
                                    context={{
                                      hasTranscript: transcriptData !== null,
                                      aiService: aiService,
                                      reasoningMode: reasoningMode,
                                      sessionId: currentChatId,
                                      userLevel: user?.id ? 'authenticated' : 'anonymous',
                                      messageTimestamp: m.timestamp,
                                      conversationLength: messages.length,
                                      transcriptIntegrated: transcriptIntegrated,
                                      enhancedContext: openaiChatService.getEnhancedContext() !== null
                                    }}
                                    userId={user?.id || 'anonymous'}
                                    onRatingSubmitted={(rating) => {
                                      console.log(`📊 ELO Rating: ${rating} for query: "${triggeringQuery.substring(0, 50)}..." (Session: ${currentChatId})`);
                                      
                                      // Log comprehensive analytics for debugging
                                      const analytics = eloTrackingService.getComprehensiveAnalytics(
                                        user?.id || 'anonymous', 
                                        currentChatId || undefined
                                      );
                                      console.log('📈 Comprehensive Analytics:', analytics);
                                    }}
                                  />
                                  
                                  {/* Thinking Summary Display - DeepSeek style subdued */}
                                  {m.metadata?.thinkingSummary && (
                                    <div className="mt-2 pt-2 border-t border-neutral-800/30">
                                      <div className="text-xs text-neutral-600 italic opacity-70">
                                        {m.metadata.thinkingSummary}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Fixed Input Area */}
          <div className="border-t border-neutral-800 p-4 flex-shrink-0 bg-neutral-900/80 backdrop-blur-sm">
            {!isApiKeyValid && (
              <div className="mb-3 p-2 rounded-lg bg-amber-900/20 border border-amber-800/50 text-center">
                <p className="text-xs text-amber-300">Using basic AI processing. Configure OpenAI API in Settings for enhanced features.</p>
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isApiKeyValid ? "Ask about courses, professors, or plans…" : "Ask questions (using basic AI processing)…"}
                className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-200 outline-none placeholder:text-neutral-500 focus:border-neutral-600 transition-colors disabled:opacity-50"
                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                className="rounded-xl px-6 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50 hover:opacity-90 transition-opacity min-w-[80px] flex items-center justify-center"
                style={{ background: isLoading ? "#9ca3af" : PURDUE_GOLD }}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-neutral-700 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Send"
                )}
              </button>
            </div>
            
            {isApiKeyValid && (
              <div className="flex flex-wrap gap-2 text-xs">
                {loadingSuggestions ? (
                  <div className="text-neutral-500 text-xs">Generating personalized suggestions...</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((q) => (
                    <button 
                      key={q} 
                      onClick={() => setInput(q)} 
                      className="rounded-full border border-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-900/70 transition-colors"
                      disabled={isLoading}
                    >
                      {q}
                    </button>
                  ))
                ) : (
                  <div className="text-neutral-500 text-xs">AI suggestions will appear here based on your academic context</div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}