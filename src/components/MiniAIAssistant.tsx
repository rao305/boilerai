import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Maximize2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface MiniAIAssistantProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export function MiniAIAssistant({ isExpanded = false, onToggleExpanded }: MiniAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    // No hardcoded welcome message - let AI generate contextual greeting
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const navigate = useNavigate();

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage("");

    // Direct to full AI Assistant for real responses instead of hardcoded simulation
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'd be happy to help! Click the expand button to access the full AI Assistant for detailed academic guidance on the Computer Science undergraduate program.",
        sender: "ai",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleGoToFullAI = () => {
    navigate("/ai-assistant");
  };

  if (!isExpanded) {
    // Main widget view - using more space
    return (
      <Card className="p-6 bg-card border-border h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="rounded-md bg-primary p-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">AI Academic Assistant</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-8 w-8 p-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col h-full space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              Need help with course planning, requirements, or academic guidance?
            </p>
            
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium text-foreground mb-2">I can help you with:</p>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>• Plan your next semester</li>
                  <li>• Check degree requirements</li>
                  <li>• Find prerequisite courses</li>
                  <li>• Academic study tips</li>
                  <li>• Course recommendations</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={onToggleExpanded}
              variant="default" 
              className="w-full"
            >
              Start Quick Chat
            </Button>
            <Button 
              onClick={handleGoToFullAI}
              variant="outline"
              className="w-full"
            >
              Open Full AI Assistant
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Expanded overlay view
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col bg-background">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="rounded-md bg-primary p-2">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">AI Academic Assistant</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoToFullAI}
              className="flex items-center space-x-2"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Open Full AI</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <div className={`rounded-full p-2 ${
                  message.sender === "ai" ? "bg-primary" : "bg-muted"
                }`}>
                  {message.sender === "ai" ? (
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`rounded-lg p-3 ${
                    message.sender === "ai" 
                      ? "bg-muted text-foreground" 
                      : "bg-primary text-primary-foreground"
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-6 border-t">
          <div className="flex space-x-3">
            <Input
              placeholder="Ask about courses, requirements, or planning..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}