import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { Settings, Brain, Key, MessageSquare, Send, Users, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { apiService } from "@/services/apiService";
import { cladoService } from "@/services/cladoService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
}

type ServiceType = 'clado' | 'ai';

export default function AIAssistant() {
  const { user } = useAuth();
  const { isApiKeyValid } = useApiKey();
  
  // Service toggle state
  const [currentService, setCurrentService] = useState<ServiceType>('ai');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if we have valid API keys from settings
  const hasValidAPIConfig = isApiKeyValid;
  
  useEffect(() => {
    // Load service preference from localStorage
    const savedService = localStorage.getItem('preferred_service') as ServiceType;
    if (savedService && (savedService === 'clado' || savedService === 'ai')) {
      setCurrentService(savedService);
    }
  }, []);
  
  const handleServiceToggle = (service: ServiceType) => {
    setCurrentService(service);
    localStorage.setItem('preferred_service', service);
    // Clear messages when switching services
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !hasValidAPIConfig) return;
    
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
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    try {
      let assistantMessage: ChatMessage;
      
      if (currentService === 'clado') {
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
          // Fallback to regular AI for non-LinkedIn queries or errors
          console.log('Clado search failed, falling back to AI:', cladoError);
          const response = await apiService.sendChatMessage(
            `LinkedIn search for "${trimmedInput}" is unavailable. Here's general career advice: ${trimmedInput}`,
            user?.id,
            `session_${Date.now()}`
          );
          
          assistantMessage = {
            id: `${messageId}_response`,
            content: `⚠️ LinkedIn search temporarily unavailable. Here's some general guidance:\n\n${response.data.response}`,
            role: 'assistant',
            timestamp: new Date(),
            service: 'clado',
            provider: 'AI Fallback'
          };
        }
      } else {
        // Handle regular AI assistant
        const response = await apiService.sendChatMessage(
          trimmedInput,
          user?.id,
          `session_${Date.now()}`
        );

        assistantMessage = {
          id: `${messageId}_response`,
          content: response.data.response,
          role: 'assistant',
          timestamp: new Date(),
          service: 'ai',
          provider: response.data.provider,
          model: response.data.model
        };
      }
      
      setMessages(prev => [...prev, assistantMessage]);
      
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
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getSuggestions = () => {
    if (currentService === 'clado') {
      return [
        'Software engineers at Google',
        'Purdue alumni in machine learning', 
        'Data scientists in San Francisco',
        'Product managers with MBA'
      ];
    } else {
      return [
        'Suggest a 15-credit schedule',
        'Explain prereqs for CS 38100',
        'Find STAT courses that fit Monday/Wednesday',
        'Help me plan my senior year'
      ];
    }
  };

  return (
    <div className="flex h-full w-full p-6">
      <div className="flex flex-col w-full space-y-4">
        <div className="flex bg-neutral-900/60 ring-1 ring-neutral-800 transition-all duration-300 rounded-2xl w-full h-full">
          <div className="flex flex-col w-full h-full">
            {/* Header with Service Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
              <div className="flex items-center gap-6">
                <div className="text-lg font-medium text-neutral-200">
                  {(() => {
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
                {hasValidAPIConfig && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-900/30 border border-green-700/50 rounded-md">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-green-300 font-medium">
                      {currentService === 'clado' ? 'LinkedIn Search Active' : 'AI Active'}
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
                  onClick={() => setMessages([])}
                  disabled={messages.length === 0}
                >
                  Clear Chat
                </Button>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="mb-4">
                      {currentService === 'clado' ? (
                        <Users size={48} className="text-blue-400 mx-auto mb-4" />
                      ) : (
                        <Brain size={48} className="text-neutral-600 mx-auto mb-4" />
                      )}
                      <h3 className="text-lg font-medium text-neutral-300 mb-2">
                        {currentService === 'clado' ? 'LinkedIn Search' : 'AI Assistant'}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {currentService === 'clado' 
                          ? "Search for professionals, alumni, and connections on LinkedIn to help with networking and career guidance."
                          : hasValidAPIConfig 
                            ? "Ready to help with your academic journey at Purdue! Ask me anything about courses, requirements, or planning."
                            : "Please configure your API key in Settings to start using the AI assistant."
                        }
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-xs text-neutral-600 bg-neutral-800/50 rounded-lg p-3">
                        <p className="font-medium mb-2">Try asking:</p>
                        <div className="flex flex-wrap gap-2">
                          {getSuggestions().map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => setInput(suggestion)}
                              className="text-left bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded text-xs transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
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
                              {message.provider && message.service !== 'clado' && (
                                <span className="bg-neutral-700 px-2 py-1 rounded">
                                  {message.provider}
                                </span>
                              )}
                              {message.model && (
                                <span className="bg-neutral-700 px-2 py-1 rounded">
                                  {message.model}
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="border-t border-neutral-800 p-4 flex-shrink-0 bg-neutral-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    currentService === 'clado' 
                      ? "Search for professionals, alumni, or connections..."
                      : hasValidAPIConfig 
                        ? "Ask about courses, professors, or plans…" 
                        : "Configure API key in Settings first…"
                  }
                  className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-200 outline-none placeholder:text-neutral-500 focus:border-neutral-600 transition-colors disabled:opacity-50"
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && hasValidAPIConfig && handleSendMessage()}
                  disabled={isLoading || !hasValidAPIConfig}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading || !hasValidAPIConfig}
                  className="rounded-xl px-6 py-3"
                  style={{ 
                    background: (!input.trim() || isLoading || !hasValidAPIConfig) ? "#9ca3af" : PURDUE_GOLD,
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
              
              {!hasValidAPIConfig && (
                <div className="mt-3 text-xs text-neutral-500 text-center">
                  <Link to="/settings" className="text-blue-400 hover:underline">
                    Configure your API key in Settings
                  </Link> to start using the assistant
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}