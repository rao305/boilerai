import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle, Clock, Lightbulb } from 'lucide-react';
import { ThinkingStep, EnhancedMessage } from '@/types/thinking';

interface ThinkingMessageProps {
  message: EnhancedMessage;
  onComplete?: () => void;
}

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ message, onComplete }) => {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Animate thinking steps appearing one by one
  useEffect(() => {
    if (!message.reasoning?.steps) return;

    const steps = message.reasoning.steps;
    let currentStep = 0;

    const showNextStep = () => {
      if (currentStep < steps.length) {
        setVisibleSteps(currentStep + 1);
        currentStep++;
        
        // Simulate step processing time
        setTimeout(() => {
          if (currentStep <= steps.length) {
            showNextStep();
          } else if (message.reasoning?.isComplete && onComplete) {
            onComplete();
          }
        }, 800 + Math.random() * 1200); // Random delay between 800-2000ms
      }
    };

    // Start showing steps
    const initialDelay = setTimeout(() => {
      showNextStep();
    }, 500);

    return () => {
      clearTimeout(initialDelay);
    };
  }, [message.reasoning?.steps, onComplete]);

  const getStepIcon = (step: ThinkingStep, index: number) => {
    if (index >= visibleSteps) {
      return <Clock size={10} className="text-neutral-600" />;
    }
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle size={10} className="text-neutral-500" />;
      case 'processing':
        return (
          <div className="w-2.5 h-2.5 border border-neutral-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Clock size={10} className="text-neutral-500" />;
    }
  };

  const getStepTitle = (step: ThinkingStep) => {
    // Map generic titles to more contextual ones
    const titleMap: Record<string, string> = {
      'analyze': '🔍 Analyzing your query',
      'understand': '🔍 Understanding your question',
      'context': '🎯 Applying student context',
      'formulate': '🧠 Formulating response',
      'finalize': '📝 Finalizing answer',
      'reason': '🧠 Processing information', 
      'validate': '✓ Validating accuracy',
      'synthesize': '💡 Synthesizing response',
      'contextualize': '🎯 Applying context'
    };
    
    return titleMap[step.title.toLowerCase()] || step.title;
  };

  if (!message.reasoning?.steps) {
    return (
      <div className="flex items-center gap-2 text-neutral-400 py-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
        <span className="text-xs">AI is thinking...</span>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/30 border border-neutral-700/30 rounded-lg p-3 mb-3 backdrop-blur-sm">
      {/* Minimalist Header - DeepSeek Style */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-neutral-800/50">
            <Brain size={12} className="text-neutral-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-400">Thinking...</div>
            <div className="text-xs text-neutral-500">{Math.floor(Math.random() * 5) + 3}s</div>
          </div>
          {message.metadata?.confidence_score && (
            <div className="px-1.5 py-0.5 rounded text-xs text-neutral-500 bg-neutral-800/30">
              {Math.round(message.metadata.confidence_score * 100)}%
            </div>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors px-1.5 py-0.5 rounded hover:bg-neutral-800/30"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* DeepSeek-style Grayed Out Thinking Steps */}
      {isExpanded && (
        <div className="space-y-2">
          {message.reasoning.steps.slice(0, visibleSteps).map((step, index) => (
            <div
              key={step.id}
              className={`relative px-3 py-2 rounded transition-all duration-300 ${
                index < visibleSteps - 1 
                  ? 'bg-neutral-800/20 opacity-60' 
                  : 'bg-neutral-800/30 opacity-80'
              }`}
            >
              {/* Subtle connector line */}
              {index < message.reasoning.steps.length - 1 && (
                <div className="absolute left-3 top-6 w-px h-4 bg-neutral-600/30"></div>
              )}
              
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    index < visibleSteps - 1
                      ? 'bg-neutral-700/50 text-neutral-500'
                      : 'bg-neutral-600/50 text-neutral-400'
                  }`}>
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium mb-1 ${
                    index < visibleSteps - 1 ? 'text-neutral-500' : 'text-neutral-400'
                  }`}>
                    {getStepTitle(step)}
                  </div>
                  {step.content && (
                    <div className={`text-xs leading-relaxed ${
                      index < visibleSteps - 1 ? 'text-neutral-600' : 'text-neutral-500'
                    }`}>
                      {step.content}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {getStepIcon(step, index)}
                </div>
              </div>
            </div>
          ))}
          
          {/* Minimal processing indicator */}
          {visibleSteps < message.reasoning.steps.length && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-neutral-800/20">
              <div className="flex-shrink-0">
                <div className="w-4 h-4 rounded-full bg-neutral-700/50 flex items-center justify-center">
                  <div className="w-2 h-2 border border-neutral-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-neutral-500">
                  Step {visibleSteps + 1}/{message.reasoning.steps.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minimal completion indicator */}
      {message.reasoning.isComplete && visibleSteps >= message.reasoning.steps.length && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-700/30">
          <div className="flex items-center gap-1">
            <div className="p-0.5 rounded bg-neutral-700/50">
              <Lightbulb size={10} className="text-neutral-500" />
            </div>
            <span className="text-xs text-neutral-500">
              Complete
            </span>
          </div>
          {message.metadata?.reasoning_time && (
            <span className="text-xs text-neutral-600">
              {message.metadata.reasoning_time}ms
            </span>
          )}
        </div>
      )}
      
      {/* Subdued Thinking Summary */}
      {message.metadata?.thinkingSummary && (
        <div className="mt-2 pt-2 border-t border-neutral-700/20">
          <div className="text-xs text-neutral-600 italic">
            {message.metadata.thinkingSummary}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingMessage;
