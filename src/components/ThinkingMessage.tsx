import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle, Clock, Lightbulb, Search, Users, Shield, BarChart3, Target, AlertTriangle } from 'lucide-react';
import { ThinkingStep, EnhancedMessage } from '@/types/thinking';
import CitationChip, { CitationGroup } from './CitationChip';
import ViolationBadge, { ViolationList } from './ViolationBadge';
import { PrivacyStatus } from './PrivacyConsentToggle';

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
    // Map generic titles to more contextual ones for SmartCourse reasoning loop
    const titleMap: Record<string, string> = {
      'analyze': '🔍 Analyzing your query',
      'understand': '🔍 Understanding your question',
      'context': '🎯 Applying student context',
      'formulate': '🧠 Formulating response',
      'finalize': '📝 Finalizing answer',
      'reason': '🧠 Processing information', 
      'validate': '✓ Validating accuracy',
      'synthesize': '💡 Synthesizing response',
      'contextualize': '🎯 Applying context',
      // SmartCourse reasoning steps
      'retrieve': '🔍 Retrieving relevant information',
      'verify': '⚖️ Verifying policy compliance',
      'revise': '🔄 Revising recommendations',
      'respond': '💬 Preparing response'
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
      {/* Enhanced Header with SmartCourse Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-neutral-800/50">
            <Brain size={12} className="text-neutral-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-400">
              {message.reasoning.isComplete ? 'SmartCourse Analysis Complete' : 'SmartCourse Reasoning...'}
            </div>
            <div className="text-xs text-neutral-500">
              {message.metadata?.reasoning_time ? `${message.metadata.reasoning_time}ms` : `${Math.floor(Math.random() * 5) + 3}s`}
            </div>
          </div>
          
          {/* Confidence and quality indicators */}
          <div className="flex items-center gap-1">
            {message.metadata?.confidence_score && (
              <div className="px-1.5 py-0.5 rounded text-xs text-neutral-500 bg-neutral-800/30">
                {Math.round(message.metadata.confidence_score * 100)}% confidence
              </div>
            )}
            
            {message.metadata?.retrieval_hit_rate && (
              <div className="px-1.5 py-0.5 rounded text-xs text-neutral-500 bg-neutral-800/30">
                {Math.round(message.metadata.retrieval_hit_rate * 100)}% hit rate
              </div>
            )}
            
            {message.metadata?.privacy_redacted && (
              <div className="p-0.5 rounded bg-neutral-800/30">
                <Shield size={10} className="text-green-500" />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Step progress indicator */}
          {message.reasoning?.steps && (
            <div className="text-xs text-neutral-500 px-1.5 py-0.5">
              {visibleSteps}/{message.reasoning.steps.length}
            </div>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors px-1.5 py-0.5 rounded hover:bg-neutral-800/30"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
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
                    <div className={`text-xs leading-relaxed mb-2 ${
                      index < visibleSteps - 1 ? 'text-neutral-600' : 'text-neutral-500'
                    }`}>
                      {step.content}
                    </div>
                  )}

                  {/* Show retrieval results for retrieve step */}
                  {step.title.toLowerCase() === 'retrieve' && step.metadata?.retrieval_results && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Target className="w-3 h-3" />
                        <span>Found {step.metadata.retrieval_results.length} sources</span>
                        {step.metadata.hit_rate && (
                          <span className="text-neutral-400">
                            • {Math.round(step.metadata.hit_rate * 100)}% relevance
                          </span>
                        )}
                      </div>
                      {step.metadata.top_sources && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.metadata.top_sources.slice(0, 2).map((source: any, idx: number) => (
                            <CitationChip
                              key={idx}
                              citation={{
                                source: source.title || source.name,
                                section: source.section || 'General',
                                authority_level: source.authority_level || 'derived',
                                url: source.url
                              }}
                              size="sm"
                              className="text-xs"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show policy violations for verify step */}
                  {step.title.toLowerCase() === 'verify' && step.metadata?.violations && step.metadata.violations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        <span>{step.metadata.violations.length} issue{step.metadata.violations.length > 1 ? 's' : ''} found</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {step.metadata.violations.slice(0, 2).map((violation: any, idx: number) => (
                          <ViolationBadge
                            key={idx}
                            violation={violation}
                            variant="compact"
                            showRemediation={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show citations for reasoning steps */}
                  {step.metadata?.citations && step.metadata.citations.length > 0 && (
                    <div className="mt-2">
                      <CitationGroup
                        citations={step.metadata.citations}
                        maxVisible={2}
                        title=""
                        className="text-xs"
                      />
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

      {/* Enhanced completion indicator with privacy status */}
      {message.reasoning.isComplete && visibleSteps >= message.reasoning.steps.length && (
        <div className="mt-3 pt-2 border-t border-neutral-700/30 space-y-2">
          <div className="flex items-center justify-between">
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
          
          {/* Privacy status */}
          {message.metadata?.user_id && (
            <div className="flex items-center justify-end">
              <PrivacyStatus 
                userId={message.metadata.user_id} 
                className="text-xs"
              />
            </div>
          )}
          
          {/* Overall citations if available */}
          {message.metadata?.citations && message.metadata.citations.length > 0 && (
            <div className="pt-1">
              <CitationGroup
                citations={message.metadata.citations}
                maxVisible={3}
                title="Sources Used"
                className="text-xs"
              />
            </div>
          )}
          
          {/* Overall violations summary if any */}
          {message.metadata?.policy_violations && message.metadata.policy_violations.length > 0 && (
            <div className="pt-1">
              <ViolationList
                violations={message.metadata.policy_violations}
                maxVisible={3}
                className="text-xs"
              />
            </div>
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
