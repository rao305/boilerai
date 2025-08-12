import React, { useState, useEffect, useRef } from "react";
import { openaiChatService } from "@/services/openaiChatService";
import { cladoService } from "@/services/cladoService";
import { useAcademicPlan } from "@/contexts/AcademicPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { Maximize2, Minimize2, MessageSquare, Plus, Edit3, Trash2, Sidebar, AlertCircle, Settings, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import ApiKeyManager from "@/components/ApiKeyManager";

// Purdue palette
const PURDUE_GOLD = "#CFB991";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isThinking?: boolean;
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [showApiKeyManager, setShowApiKeyManager] = useState(!isApiKeyValid);
  const [aiService, setAiService] = useState<'clado' | 'openai'>('openai'); // Toggle between Clado and OpenAI
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-enable Clado service when Clado AI is selected
  useEffect(() => {
    if (aiService === 'clado') {
      cladoService.enable();
    } else {
      cladoService.disable();
    }
  }, [aiService]);

  // Initialize chats - always start with new chat, load history in sidebar
  useEffect(() => {
    const savedChats = localStorage.getItem(`chatSessions_${user?.id || 'anonymous'}`);
    
    // Create new chat for current session
    const newChat = createNewChat();
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
  }, [user?.id]);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem(`chatSessions_${user?.id || 'anonymous'}`, JSON.stringify(chatSessions));
    }
  }, [chatSessions, user?.id]);

  const createNewChat = (): ChatSession => {
    const newChat: ChatSession = {
      id: generateId(),
      name: "New Chat",
      messages: [], // Start with empty messages - AI will generate contextual greeting when user starts conversation
      createdAt: new Date(),
      lastMessageAt: new Date()
    };
    return newChat;
  };

  const handleNewChat = () => {
    const newChat = createNewChat();
    setChatSessions(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages(newChat.messages);
  };

  const handleDeleteChat = (chatId: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId);
      if (filtered.length === 0) {
        const newChat = createNewChat();
        setCurrentChatId(newChat.id);
        setMessages(newChat.messages);
        return [newChat];
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
      const response = await fetch('http://localhost:5003/chat', {
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
          const fallbackResponse = await fetch(`http://localhost:${port}/chat`, {
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
      const aiMessage: Message = { 
        id: generateId(),
        role: "assistant", 
        content: "Switched to Clado AI mode! I can now search LinkedIn profiles and provide networking insights. Try asking about professionals, companies, or career paths.", 
        timestamp: new Date() 
      };
      
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
    const userMessage: Message = { 
      id: generateId(),
      role: "user", 
      content: trimmedInput, 
      timestamp 
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // Add AI thinking indicator
    const thinkingMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: "thinking",
      timestamp: new Date(),
      isThinking: true
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
      let aiResponseText: string;
      const userId = user?.id || 'anonymous';
      
      // Route based on service selection
      if (aiService === 'clado') {
        // Use Clado service for all queries (LinkedIn + general AI)
        console.log('🔗 Using Clado AI service:', trimmedInput);
        
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
      } else {
        // Use OpenAI service directly
        console.log('🤖 Using OpenAI service:', trimmedInput);
        aiResponseText = await openaiChatService.sendMessage(trimmedInput, userId);
      }
      
      // Remove thinking indicator and add AI response
      const aiMessage: Message = { 
        id: generateId(),
        role: "assistant", 
        content: aiResponseText, 
        timestamp: new Date() 
      };
      
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
    } catch (error) {
      console.error('AI response failed:', error);
      const errorMessage: Message = { 
        id: generateId(),
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please check your API key in settings and try again.",
        timestamp: new Date()
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
    } finally {
      setIsLoading(false);
    }
  };

  // Upload transcript context when available
  useEffect(() => {
    if (transcriptData && transcriptData.studentInfo?.name) {
      console.log('📝 Setting transcript context for AI...');
      openaiChatService.setTranscriptContext(transcriptData);
      console.log('✅ Transcript context set for AI assistant');
    }
  }, [transcriptData, user?.id]);

  const currentChat = chatSessions.find(chat => chat.id === currentChatId);

  return (
    <div className="flex h-full w-full p-6">
      <div className="flex flex-col w-full space-y-4">
        {/* API Key Warning Banner */}
        {!isApiKeyValid && (
          <div className="p-4 rounded-lg bg-orange-900/20 border border-orange-800">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle size={18} className="text-orange-400" />
              <span className="text-base font-medium text-orange-300">API Key Required</span>
            </div>
            <p className="text-sm text-orange-200 mb-3">
              To use the AI Assistant, please configure your OpenAI API key. 
              Without it, you won't be able to chat with the AI or get personalized academic advice.
            </p>
            <div className="flex gap-2">
              <Link to="/settings">
                <button className="px-3 py-1.5 bg-orange-800/30 hover:bg-orange-700/40 border border-orange-700 text-orange-200 rounded-md text-sm flex items-center gap-1 transition-colors">
                  <Settings size={14} />
                  Configure in Settings
                </button>
              </Link>
              <button 
                onClick={() => setShowApiKeyManager(true)}
                className="px-3 py-1.5 bg-orange-800/30 hover:bg-orange-700/40 border border-orange-700 text-orange-200 rounded-md text-sm transition-colors"
              >
                🔑 Quick Setup
              </button>
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-300 hover:text-orange-200 text-sm flex items-center gap-1"
              >
                Get API Key <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* API Key Manager */}
        {(showApiKeyManager || !isApiKeyValid) && (
          <ApiKeyManager
            isUnlocked={isApiKeyValid}
            onApiKeyValidated={(valid) => {
              setApiKeyValid(valid);
              if (valid) {
                setShowApiKeyManager(false);
              }
            }}
            showWarning={!isApiKeyValid}
            requiredFor="AI Assistant"
          />
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
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="space-y-4 pb-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-neutral-200 text-neutral-900"
                      : "bg-neutral-950/60 text-neutral-200 ring-1 ring-neutral-800"
                  }`}>
                    {m.isThinking ? (
                      <div className="flex items-center gap-2 text-neutral-400">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        <span className="text-xs">AI is thinking...</span>
                      </div>
                    ) : (
                      <>
                        <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>
                        <div className="text-xs opacity-50 mt-2">
                          {m.timestamp.toLocaleTimeString()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Fixed Input Area */}
          <div className="border-t border-neutral-800 p-4 flex-shrink-0 bg-neutral-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about courses, professors, or plans…"
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
            
            <div className="flex flex-wrap gap-2 text-xs">
              {(aiService === 'clado' ? 
                ["Software engineers at Google", "Purdue alumni in machine learning", "Product managers with MBA", "Data scientists in San Francisco"] :
                ["Suggest a 15-credit schedule", "Explain prereqs for CS 38100", "Find STAT courses that fit Monday/Wednesday"]
              ).map((q) => (
                <button 
                  key={q} 
                  onClick={() => setInput(q)} 
                  className="rounded-full border border-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-900/70 transition-colors"
                  disabled={isLoading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}