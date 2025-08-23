import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { Settings, Brain, Key, MessageSquare, Send, Users, Search, Zap, BookOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { apiService } from "@/services/apiService";
import { cladoService } from "@/services/cladoService";
import { intelligentRagService, type StudentContext, type IntelligentRagRequest } from "@/services/intelligentRagService";
import { personalizedAdvisorService } from "@/services/personalizedAdvisorService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ThinkingMessage from "@/components/ThinkingMessage";
import { deepThinkingService } from "@/services/deepThinkingService";
import { AIReasoningResponse, EnhancedMessage, DEEPTHINK_CONFIG } from "@/types/thinking";

// Purdue palette
const PURDUE_GOLD = "#CFB991";

// Extract first name from user email or full name
const getFirstName = (user: any): string => {
  if (!user) return '';
  
  // Try to get from display name first
  if (user.name) {
    const firstName = user.name.split(' ')[0];
    if (firstName && firstName.length > 0) {
      return firstName;
    }
  }
  
  // Fallback to email prefix if name not available
  if (user.email && user.email.includes('@purdue.edu')) {
    const emailPrefix = user.email.split('@')[0];
    // Handle common patterns like firstname.lastname or firstlast
    if (emailPrefix.includes('.')) {
      return emailPrefix.split('.')[0];
    }
    // Return email prefix as fallback
    return emailPrefix;
  }
  
  return '';
};

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  provider?: string;
  model?: string;
  service?: 'clado' | 'ai';
  mode?: 't2sql' | 'planner' | 'general_chat';
  structured?: boolean;
  reasoning?: AIReasoningResponse;
  isThinking?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: Date;
  messageCount: number;
  service: ServiceType;
}

type ServiceType = 'clado' | 'ai' | 'transcript';

export default function AIAssistant() {
  const { user } = useAuth();
  const { isApiKeyValid } = useApiKey();
  
  // Service toggle state
  const [currentService, setCurrentService] = useState<ServiceType>('ai');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat management state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  
  // DeepThink is enabled but thinking process is hidden by default for cleaner user experience
  const [showThinkingProcess, setShowThinkingProcess] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  
  // Transcript mode state
  const [hasTranscriptData, setHasTranscriptData] = useState(false);
  const [transcriptSummary, setTranscriptSummary] = useState<any>(null);
  const [personalizedGreeting, setPersonalizedGreeting] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Check if we have valid API keys from settings
  const hasValidAPIConfig = isApiKeyValid;
  
  useEffect(() => {
    // Check URL parameters for transcript mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'transcript') {
      setCurrentService('transcript');
      // Clear URL parameter after setting mode
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Load service preference from localStorage
      const savedService = localStorage.getItem('preferred_service') as ServiceType;
      if (savedService && (savedService === 'clado' || savedService === 'ai' || savedService === 'transcript')) {
        setCurrentService(savedService);
      }
    }
    
    // Load chat sessions from localStorage
    loadChatSessions();
    
    // Check for transcript data and load personalized greeting
    initializeTranscriptData();
  }, []);

  const initializeTranscriptData = async () => {
    try {
      const status = await personalizedAdvisorService.getTranscriptStatus();
      setHasTranscriptData(status.hasTranscript);
      setTranscriptSummary(status);
      
      if (status.hasTranscript) {
        const greeting = await personalizedAdvisorService.getPersonalizedGreeting();
        setPersonalizedGreeting(greeting);
      }
      
      // Load initial suggestions
      loadSuggestions();
    } catch (error) {
      console.error('Error initializing transcript data:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const newSuggestions = await getSuggestions();
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions(intelligentRagService.getIntelligentSuggestions());
    }
  };
  
  const loadChatSessions = () => {
    const saved = localStorage.getItem('chat_sessions');
    if (saved) {
      const sessions = JSON.parse(saved).map((session: any) => ({
        ...session,
        lastMessage: new Date(session.lastMessage)
      }));
      setChatSessions(sessions);
      
      // Load current chat if exists
      const currentId = localStorage.getItem('current_chat_id');
      if (currentId && sessions.find((s: ChatSession) => s.id === currentId)) {
        setCurrentChatId(currentId);
        loadChatMessages(currentId);
      }
    }
  };
  
  const saveChatSessions = (sessions: ChatSession[]) => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    setChatSessions(sessions);
  };
  
  const loadChatMessages = (chatId: string) => {
    const saved = localStorage.getItem(`chat_messages_${chatId}`);
    if (saved) {
      const messages = JSON.parse(saved).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(messages);
    }
  };
  
  const saveChatMessages = (chatId: string, messages: ChatMessage[]) => {
    localStorage.setItem(`chat_messages_${chatId}`, JSON.stringify(messages));
  };
  
  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newSession: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      lastMessage: new Date(),
      messageCount: 0,
      service: currentService
    };
    
    const updatedSessions = [newSession, ...chatSessions];
    saveChatSessions(updatedSessions);
    setCurrentChatId(newChatId);
    localStorage.setItem('current_chat_id', newChatId);
    setMessages([]);
  };
  
  const switchToChat = (chatId: string) => {
    // Save current chat messages
    if (currentChatId) {
      saveChatMessages(currentChatId, messages);
    }
    
    setCurrentChatId(chatId);
    localStorage.setItem('current_chat_id', chatId);
    loadChatMessages(chatId);
    
    // Update service to match chat session
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
      setCurrentService(session.service);
    }
  };
  
  const deleteChat = (chatId: string) => {
    const updatedSessions = chatSessions.filter(s => s.id !== chatId);
    saveChatSessions(updatedSessions);
    
    // Remove messages from localStorage
    localStorage.removeItem(`chat_messages_${chatId}`);
    
    // If deleting current chat, switch to another or create new
    if (currentChatId === chatId) {
      if (updatedSessions.length > 0) {
        switchToChat(updatedSessions[0].id);
      } else {
        setCurrentChatId(null);
        setMessages([]);
        localStorage.removeItem('current_chat_id');
      }
    }
  };
  
  const renameChat = (chatId: string, newTitle: string) => {
    const updatedSessions = chatSessions.map(s => 
      s.id === chatId ? { ...s, title: newTitle } : s
    );
    saveChatSessions(updatedSessions);
    setEditingChatId(null);
  };
  
  const updateCurrentSession = (messages: ChatMessage[]) => {
    if (!currentChatId) return;
    
    const session = chatSessions.find(s => s.id === currentChatId);
    if (!session) return;
    
    const updatedSession = {
      ...session,
      lastMessage: new Date(),
      messageCount: messages.length,
      title: session.title === 'New Chat' && messages.length > 0 ? 
        messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? '...' : '') : 
        session.title
    };
    
    const updatedSessions = chatSessions.map(s => 
      s.id === currentChatId ? updatedSession : s
    );
    saveChatSessions(updatedSessions);
  };
  
  const handleServiceToggle = (service: ServiceType) => {
    setCurrentService(service);
    localStorage.setItem('preferred_service', service);
    // Don't clear messages automatically - let user decide
    
    // Reload suggestions when service changes
    setTimeout(loadSuggestions, 100);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // For ai (uses knowledge base), we don't need API keys since they use backend authentication
    if (currentService === 'clado' && !hasValidAPIConfig) return;
    
    setIsLoading(true);
    const trimmedInput = input.trim();
    const messageId = Date.now().toString();
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: messageId,
      content: trimmedInput,
      role: 'user',
      timestamp: new Date(),
      service: currentService
    };
    
    // Ensure we have a current chat
    let chatId = currentChatId;
    if (!chatId) {
      createNewChat();
      chatId = Date.now().toString(); // This will be the new chat ID
      setCurrentChatId(chatId);
    }
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    try {
      let assistantMessage: ChatMessage;
      
      if (currentService === 'transcript') {
        // Handle Transcript-aware AI Assistant
        try {
          const transcriptResponse = await personalizedAdvisorService.chatWithTranscriptContext(
            trimmedInput,
            true // Always use transcript context in transcript mode
          );

          if (transcriptResponse.success) {
            const prefix = personalizedAdvisorService.formatPersonalizedPrefix(
              transcriptResponse.hasTranscriptContext,
              transcriptResponse.contextUsed
            );

            assistantMessage = {
              id: `${messageId}_response`,
              content: prefix + transcriptResponse.response,
              role: 'assistant',
              timestamp: new Date(),
              service: 'transcript',
              provider: transcriptResponse.hasTranscriptContext && transcriptResponse.contextUsed 
                ? `📊 Personalized Academic Advisor • ${transcriptSummary?.studentName}` 
                : 'AI Assistant (No Context)',
              structured: true
            };
          } else {
            throw new Error(transcriptResponse.error || 'Transcript chat failed');
          }
        } catch (transcriptError) {
          console.error('Transcript chat error:', transcriptError);
          
          assistantMessage = {
            id: `${messageId}_response`,
            content: `⚠️ I couldn't access your transcript data right now. ${transcriptError instanceof Error ? transcriptError.message : 'Unknown error'}\n\nPlease try:\n• Refreshing the page\n• Switching to regular AI mode\n• Re-uploading your transcript if needed`,
            role: 'assistant',
            timestamp: new Date(),
            service: 'transcript',
            provider: 'Error Handler'
          };
        }
      } else if (currentService === 'clado') {
        // Handle Clado LinkedIn search
        if (!cladoService.isEnabledMode()) {
          cladoService.enable();
        }
        
        try {
          const cladoResponse = await cladoService.searchPeople({
            query: trimmedInput,
            limit: 5
          });
          
          const formattedResult = cladoService.formatSearchResults(cladoResponse);
          
          assistantMessage = {
            id: `${messageId}_response`,
            content: formattedResult,
            role: 'assistant',
            timestamp: new Date(),
            service: 'clado',
            provider: 'Clado LinkedIn Search'
          };
        } catch (cladoError) {
          // Handle Clado errors without fallback to maintain API key isolation
          console.log('Clado search failed:', cladoError);
          
          assistantMessage = {
            id: `${messageId}_response`,
            content: `⚠️ LinkedIn search failed: ${cladoError instanceof Error ? cladoError.message : 'Unknown error'}\n\nClado mode uses only the Clado API key and does not fall back to other AI services. Please try:\n• Checking your query format\n• Waiting if you've hit rate limits\n• Switching to AI Assistant mode for general questions`,
            role: 'assistant',
            timestamp: new Date(),
            service: 'clado',
            provider: 'Clado Error Handler'
          };
        }
      } else {
        // Handle AI Assistant with DeepThink (always enabled)
        try {
          // Show thinking process first
          const thinkingMessage: ChatMessage = {
            id: `${messageId}_thinking`,
            content: '',
            role: 'assistant',
            timestamp: new Date(),
            service: 'ai',
            provider: 'DeepThink Engine',
            isThinking: true
          };
          
          setMessages(prev => [...prev, thinkingMessage]);
          
          // Get DeepThink response with full contextual analysis
          const deepResponse = await deepThinkingService.processWithDeepThinking(
            trimmedInput,
            user?.id || 'anonymous',
            {
              studentProfile: user,
              transcriptData: null, // Enhanced with actual transcript data in production
              academicRules: [
                'Prerequisites must be met before enrollment',
                'GPA requirements apply for track progression', 
                'Credit limits enforced per semester',
                'Core courses required before electives',
                'Track-specific course sequencing applies'
              ]
            }
          );
          
          // Create enhanced message with reasoning
          const enhancedMessage: EnhancedMessage = {
            id: `${messageId}_response`,
            role: 'assistant',
            content: deepResponse.final_response,
            timestamp: new Date(),
            isThinking: false,
            reasoning: {
              steps: deepResponse.thinking_steps,
              isComplete: true,
              currentStep: deepResponse.thinking_steps.length
            },
            metadata: {
              confidence_score: deepResponse.confidence_score,
              reasoning_time: deepResponse.reasoning_time,
              model_used: deepResponse.model_used,
              thinkingSummary: `${DEEPTHINK_CONFIG.name} analysis with contextual awareness`
            }
          };
          
          // Remove thinking message and add final response
          const finalMessages = messages.filter(m => m.id !== `${messageId}_thinking`).concat({
            id: enhancedMessage.id,
            content: enhancedMessage.content,
            role: enhancedMessage.role,
            timestamp: enhancedMessage.timestamp,
            service: 'ai',
            provider: `DeepThink • Contextual AI`,
            reasoning: deepResponse,
            structured: true
          });
          
          setMessages(finalMessages);
          
          // Update current session and save
          if (currentChatId) {
            updateCurrentSession(finalMessages);
            saveChatMessages(currentChatId, finalMessages);
          }
          
          return; // Exit early since we handled the response
          
        } catch (deepThinkingError) {
          console.error('DeepThink processing failed:', deepThinkingError);
          
          // Fallback to standard RAG if DeepThink fails
          const ragRequest: IntelligentRagRequest = {
            query: trimmedInput,
            reasoning_level: 'auto',
            include_recommendations: true,
            format: 'detailed'
          };

          const ragResponse = await intelligentRagService.ask(ragRequest);
          const formattedContent = intelligentRagService.formatIntelligentResponse(ragResponse);
          
          assistantMessage = {
            id: `${messageId}_response`,
            content: formattedContent,
            role: 'assistant',
            timestamp: new Date(),
            service: 'ai',
            provider: 'AI Assistant',
            structured: true,
            mode: ragResponse.reasoning_level as any
          };
        }
      }
      
      const finalMessages = [...messages, assistantMessage];
      setMessages(finalMessages);
      
      // Update current session and save
      if (currentChatId) {
        updateCurrentSession(finalMessages);
        saveChatMessages(currentChatId, finalMessages);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `${messageId}_error`,
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'assistant',
        timestamp: new Date(),
        service: currentService
      };
      
      const finalMessages = [...messages, errorMessage];
      setMessages(finalMessages);
      
      // Update current session and save
      if (currentChatId) {
        updateCurrentSession(finalMessages);
        saveChatMessages(currentChatId, finalMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const getSuggestions = async () => {
    if (currentService === 'clado') {
      return [
        'Software engineers at Google',
        'Purdue alumni in machine learning', 
        'Data scientists in San Francisco',
        'Product managers with MBA'
      ];
    } else if (currentService === 'transcript' && hasTranscriptData) {
      try {
        return await personalizedAdvisorService.getContextualSuggestions();
      } catch (error) {
        console.error('Error getting contextual suggestions:', error);
        return intelligentRagService.getIntelligentSuggestions();
      }
    } else {
      return intelligentRagService.getIntelligentSuggestions();
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden bg-neutral-900/40 border-r border-neutral-800 flex-shrink-0 relative`}>
        {isSidebarOpen && (
          <div className="sidebar-content flex flex-col h-full p-4 transition-all duration-300 ease-in-out opacity-100">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-200">Chat History</h2>
              <Button
                onClick={createNewChat}
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white transition-all duration-200 hover:scale-105"
              >
                <MessageSquare size={14} className="mr-1" />
                New
              </Button>
            </div>
            
            {/* Chat Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`chat-session-item p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentChatId === session.id
                      ? 'bg-purple-900/30 border border-purple-700/50 shadow-md'
                      : 'bg-neutral-800/50 hover:bg-neutral-700/50 hover:shadow-sm'
                  }`}
                  onClick={() => switchToChat(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {editingChatId === session.id ? (
                        <input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              renameChat(session.id, editingTitle);
                            }
                          }}
                          onBlur={() => renameChat(session.id, editingTitle)}
                          className="bg-neutral-700 text-neutral-200 text-sm rounded px-2 py-1 w-full"
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-sm font-medium text-neutral-200 truncate">
                          {session.title}
                        </h3>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-500">
                          {session.messageCount} messages
                        </span>
                        <span className="text-xs text-neutral-500">•</span>
                        <span className="text-xs text-neutral-500">
                          {session.lastMessage.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-neutral-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(session.id);
                          setEditingTitle(session.title);
                        }}
                      >
                        <Search size={12} className="text-neutral-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-600 text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(session.id);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {session.service === 'ai' ? (
                      <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                        <Brain size={10} />
                        AI
                      </span>
                    ) : (
                      <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                        <Users size={10} />
                        LinkedIn
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {chatSessions.length === 0 && (
                <div className="text-center text-neutral-500 text-sm py-8">
                  No chat history yet.
                  Start a new conversation!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        <div className="flex bg-neutral-900/60 ring-1 ring-neutral-800 transition-all duration-300 ease-in-out rounded-none w-full h-full">
          <div className="flex flex-col w-full h-full">
            {/* Header with Service Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0 transition-all duration-300 ease-in-out">
              <div className="flex items-center gap-4">
                {/* Sidebar Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`chat-toggle-btn text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all duration-200 ${
                    !isSidebarOpen ? 'bg-neutral-800/50 text-purple-400 hover:text-purple-300' : ''
                  }`}
                  title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {isSidebarOpen ? (
                    <PanelLeftClose size={16} />
                  ) : (
                    <PanelLeftOpen size={16} />
                  )}
                </Button>
                
                <div className="text-lg font-medium text-neutral-200">
                  {personalizedGreeting || (() => {
                    const firstName = getFirstName(user);
                    if (firstName) {
                      return `Welcome ${firstName}!`;
                    }
                    return "AI Assistant";
                  })()}
                </div>
                
                {/* Service Toggle */}
                <div className="flex items-center gap-2 p-1 bg-neutral-800 rounded-lg">
                  <Button
                    variant={currentService === 'ai' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleServiceToggle('ai')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                      currentService === 'ai' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                    }`}
                  >
                    <Brain size={14} />
                    AI Assistant
                  </Button>
                  <Button
                    variant={currentService === 'transcript' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleServiceToggle('transcript')}
                    disabled={!hasTranscriptData}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                      currentService === 'transcript' 
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-sm' 
                        : hasTranscriptData
                          ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                          : 'text-neutral-600 cursor-not-allowed'
                    }`}
                    title={hasTranscriptData ? 'Personalized advice based on your transcript' : 'Upload a transcript first'}
                  >
                    <BookOpen size={14} />
                    Transcript
                    {!hasTranscriptData && <span className="text-xs text-neutral-500">(!)</span>}
                  </Button>
                  <Button
                    variant={currentService === 'clado' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleServiceToggle('clado')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                      currentService === 'clado' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                    }`}
                  >
                    <Users size={14} />
                    Clado (LinkedIn)
                  </Button>
                </div>
                
                {/* Status Indicator */}
                {(hasValidAPIConfig || currentService === 'ai' || (currentService === 'transcript' && hasTranscriptData)) && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                    currentService === 'transcript' 
                      ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/50' 
                      : 'bg-purple-900/30 border border-purple-700/50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      currentService === 'transcript' ? 'bg-yellow-400' : 'bg-purple-400'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      currentService === 'transcript' ? 'text-yellow-300' : 'text-purple-300'
                    }`}>
                      {currentService === 'clado' ? 'LinkedIn Search Active' : 
                       currentService === 'transcript' ? 
                         `📊 Personalized • ${transcriptSummary?.studentName?.split(' ')[0] || 'Student'}` :
                         `DeepThink • ${DEEPTHINK_CONFIG.name}`}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Link to="/settings">
                  <Button variant="ghost" size="sm">
                    <Settings size={16} />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (currentChatId) {
                      const updatedMessages: ChatMessage[] = [];
                      setMessages(updatedMessages);
                      saveChatMessages(currentChatId, updatedMessages);
                      updateCurrentSession(updatedMessages);
                    }
                  }}
                  disabled={messages.length === 0}
                >
                  Clear Chat
                </Button>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 transition-all duration-300 ease-in-out">
              {messages.length === 0 ? (
                <div className="flex flex-col h-full">
                  {/* Compact Welcome Section */}
                  <div className="text-center py-8">
                    <div className="mb-4">
                      {currentService === 'clado' ? (
                        <Users size={32} className="text-blue-400 mx-auto mb-2" />
                      ) : currentService === 'transcript' ? (
                        <BookOpen size={32} className="text-yellow-400 mx-auto mb-2" />
                      ) : (
                        <Brain size={32} className="text-blue-400 mx-auto mb-2" />
                      )}
                      <h3 className="text-base font-medium text-neutral-300 mb-1">
                        {currentService === 'clado' ? 'LinkedIn Search' : 
                         currentService === 'transcript' ? 'Personalized Academic Advisor' :
                         'AI Assistant'}
                      </h3>
                      <p className="text-xs text-neutral-500 max-w-md mx-auto">
                        {currentService === 'clado' 
                          ? "Search for professionals and connections on LinkedIn."
                          : currentService === 'transcript'
                            ? hasTranscriptData 
                              ? `Personalized advice based on ${transcriptSummary?.studentName}'s academic transcript.`
                              : "Upload your transcript to get personalized academic advice."
                            : "Advanced AI with contextual reasoning and CS track guidance."
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Suggestions */}
                  <div className="bg-neutral-800/30 rounded-lg p-4 mb-4">
                    <p className="font-medium mb-3 text-neutral-300 text-sm">
                      {currentService === 'transcript' && hasTranscriptData ? 'Ask me about:' : 'Try asking:'}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(suggestion)}
                          className={`text-left px-3 py-2 rounded text-sm transition-colors text-neutral-300 ${
                            currentService === 'transcript' 
                              ? 'bg-gradient-to-r from-yellow-800/20 to-orange-800/20 hover:from-yellow-700/30 hover:to-orange-700/30 border border-yellow-800/30'
                              : 'bg-neutral-700/50 hover:bg-neutral-600/50'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Deep Thinking Feature (Compact) */}
                  {currentService === 'ai' && (
                    <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain size={14} className="text-purple-400" />
                          <span className="text-sm font-medium text-purple-300">
                            DeepThink Reasoning
                          </span>
                        </div>
                        <div className="text-xs text-purple-200">
                          Always enabled
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* DeepThink is always enabled - no demo needed */}
                  
                  {messages.map((message) => {
                    // Show thinking process for AI messages with reasoning
                    if (message.role === 'assistant' && message.reasoning && !message.isThinking) {
                      const enhancedMessage: EnhancedMessage = {
                        id: message.id,
                        role: message.role,
                        content: message.content,
                        timestamp: message.timestamp,
                        isThinking: false,
                        reasoning: {
                          steps: message.reasoning.thinking_steps,
                          isComplete: true,
                          currentStep: message.reasoning.thinking_steps.length
                        },
                        metadata: {
                          confidence_score: message.reasoning.confidence_score,
                          reasoning_time: message.reasoning.reasoning_time,
                          model_used: message.reasoning.model_used,
                          thinkingSummary: message.reasoning.thinkingSummary
                        }
                      };
                      
                      return (
                        <div key={message.id} className="space-y-3">
                          {/* Thinking Process */}
                          {showThinkingProcess && (
                            <ThinkingMessage 
                              message={enhancedMessage}
                              showDetailedReasoning={true}
                              thinkingMode="contextual"
                            />
                          )}
                          
                          {/* Final Response */}
                          <div className="flex justify-start">
                            <Card className="max-w-[80%] bg-neutral-800 text-neutral-100">
                              <CardContent className="p-3">
                                <div className="whitespace-pre-wrap break-words">
                                  {message.content}
                                </div>
                                {/* Technical metadata hidden for cleaner user experience */}
                                {/*<div className="mt-2 text-xs opacity-70 flex items-center gap-2">
                                  <span className="bg-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                    <Brain size={10} />
                                    DeepThink • Contextual AI
                                  </span>
                                  {message.reasoning.confidence_score && (
                                    <span className="bg-green-700 px-2 py-1 rounded">
                                      {Math.round(message.reasoning.confidence_score * 100)}% confidence
                                    </span>
                                  )}
                                  {message.reasoning.reasoning_time && (
                                    <span className="bg-neutral-700 px-2 py-1 rounded">
                                      {message.reasoning.reasoning_time}ms
                                    </span>
                                  )}
                                </div>*/}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      );
                    }
                    
                    // Handle thinking messages (loading state)
                    if (message.isThinking) {
                      return (
                        <div key={message.id} className="flex justify-start">
                          <div className="bg-neutral-900/30 border border-neutral-700/30 rounded-lg p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded bg-neutral-800/50">
                                <Brain size={16} className="text-purple-400 animate-pulse" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-neutral-300">
                                  DeepThink in progress...
                                </div>
                                <div className="text-xs text-neutral-500">
                                  Analyzing your question with {DEEPTHINK_CONFIG.step_count} contextual reasoning steps
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                              </div>
                              <span className="text-xs text-neutral-500">Processing contextual factors...</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Standard message rendering
                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <Card className={`max-w-[80%] ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-neutral-800 text-neutral-100'
                        }`}>
                          <CardContent className="p-3">
                            <div className="whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                            {message.role === 'assistant' && (message.provider || message.service) && (
                              <div className="mt-2 text-xs opacity-70 flex items-center gap-2">
                                {message.service === 'clado' && (
                                  <span className="bg-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                    <Search size={10} />
                                    LinkedIn Search
                                  </span>
                                )}
                                {message.service === 'ai' && (
                                  <span className="bg-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                    <Brain size={10} />
                                    AI Assistant
                                  </span>
                                )}
                                {message.provider && message.service !== 'clado' && (
                                  <span className="bg-blue-600 px-2 py-1 rounded">
                                    {message.provider}
                                  </span>
                                )}
                                {message.model && (
                                  <span className="bg-neutral-700 px-2 py-1 rounded">
                                    {message.model}
                                  </span>
                                )}
                                {message.structured && message.mode && (
                                  <span className="bg-green-700 px-2 py-1 rounded flex items-center gap-1">
                                    <Brain size={10} />
                                    {`Reasoning: ${message.mode}`}
                                  </span>
                                )}
                                {message.role === 'assistant' && !message.structured && message.service !== 'clado' && (
                                  <span className="bg-red-700 px-2 py-1 rounded flex items-center gap-1">
                                    ⚠️ Non-structured (blocked)
                                  </span>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="border-t border-neutral-800 p-4 flex-shrink-0 bg-neutral-900/80 backdrop-blur-sm transition-all duration-300 ease-in-out">
              {/* DeepThink is always enabled - show simple control */}
              {currentService === 'ai' && (
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-neutral-400">
                      <input
                        type="checkbox"
                        checked={showThinkingProcess}
                        onChange={(e) => setShowThinkingProcess(e.target.checked)}
                        className="rounded"
                      />
                      Show Reasoning Steps
                    </label>
                  </div>
                  
                  <div className="text-xs text-neutral-500">
                    {DEEPTHINK_CONFIG.description}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    currentService === 'clado' 
                      ? "Search for professionals, alumni, or connections..."
                      : currentService === 'transcript'
                        ? hasTranscriptData
                          ? `Ask ${transcriptSummary?.studentName?.split(' ')[0] || 'me'} about your courses, GPA, track eligibility, or next steps...`
                          : "Ask about CS tracks, courses, or requirements (upload transcript for personalized advice)..."
                        : "Ask about CS tracks, courses, requirements, or get personalized advice..."
                  }
                  className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-200 outline-none placeholder:text-neutral-500 focus:border-neutral-600 transition-colors disabled:opacity-50"
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && (currentService !== 'clado' || hasValidAPIConfig) && handleSendMessage()}
                  disabled={isLoading || (currentService === 'clado' && !hasValidAPIConfig)}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading || (currentService === 'clado' && !hasValidAPIConfig)}
                  className="rounded-xl px-6 py-3"
                  style={{ 
                    background: (!input.trim() || isLoading || (currentService === 'clado' && !hasValidAPIConfig)) ? "#9ca3af" : PURDUE_GOLD,
                    color: "#000"
                  }}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-neutral-700 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={16} />
                  )}
                </Button>
              </div>
              
              {!hasValidAPIConfig && currentService === 'clado' && (
                <div className="mt-3 text-xs text-neutral-500 text-center">
                  <Link to="/settings" className="text-blue-400 hover:underline">
                    Configure your API key in Settings
                  </Link> to start using the assistant
                </div>
              )}
              {currentService === 'ai' && (
                <div className="mt-3 text-xs text-neutral-500 text-center">
                  🧠 <span className="text-blue-400">AI Assistant</span> powered by advanced reasoning • Multi-level intelligence • Personalized CS guidance
                </div>
              )}
              {currentService === 'transcript' && (
                <div className="mt-3 text-xs text-neutral-500 text-center">
                  {hasTranscriptData ? (
                    <span>
                      📊 <span className="text-yellow-400">Personalized Academic Advisor</span> • Based on {transcriptSummary?.studentName}'s transcript • 
                      <Link to="/transcript-management" className="text-blue-400 hover:underline ml-1">Update transcript</Link>
                    </span>
                  ) : (
                    <span>
                      📋 <span className="text-neutral-400">Transcript mode</span> • 
                      <Link to="/transcript-management" className="text-blue-400 hover:underline ml-1">Upload your transcript</Link> for personalized advice
                    </span>
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