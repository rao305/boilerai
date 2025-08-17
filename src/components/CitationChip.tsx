/**
 * Citation Chip Component
 * 
 * Displays source citations for AI responses with authority levels and links
 * Supports hover details and click-through to original sources
 */

import React, { useState } from 'react';
import { ExternalLink, Book, FileText, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

interface Citation {
  source: string;
  section: string;
  url?: string;
  authority_level: 'official' | 'derived' | 'computed';
  last_updated?: string;
  content_preview?: string;
}

interface CitationChipProps {
  citation: Citation;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showAuthorityLevel?: boolean;
  className?: string;
}

const CitationChip: React.FC<CitationChipProps> = ({
  citation,
  size = 'sm',
  variant = 'outline',
  showAuthorityLevel = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getAuthorityIcon = (level: string) => {
    switch (level) {
      case 'official':
        return <Shield className="w-3 h-3 text-green-600" />;
      case 'derived':
        return <FileText className="w-3 h-3 text-blue-600" />;
      case 'computed':
        return <Info className="w-3 h-3 text-orange-600" />;
      default:
        return <Book className="w-3 h-3 text-gray-600" />;
    }
  };

  const getAuthorityColor = (level: string): string => {
    switch (level) {
      case 'official':
        return 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100';
      case 'derived':
        return 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100';
      case 'computed':
        return 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100';
    }
  };

  const formatSource = (source: string): string => {
    // Truncate long source names
    if (source.length > 25) {
      return source.substring(0, 22) + '...';
    }
    return source;
  };

  const handleClick = () => {
    if (citation.url) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
    }
  };

  const chipContent = (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={!citation.url}
      className={`
        ${getAuthorityColor(citation.authority_level)}
        ${size === 'sm' ? 'h-6 px-2 text-xs' : size === 'md' ? 'h-7 px-3 text-sm' : 'h-8 px-4 text-sm'}
        ${citation.url ? 'cursor-pointer' : 'cursor-default'}
        transition-all duration-200
        inline-flex items-center gap-1.5
        max-w-xs
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showAuthorityLevel && getAuthorityIcon(citation.authority_level)}
      
      <span className="truncate font-medium">
        {formatSource(citation.source)}
      </span>
      
      {citation.section && (
        <span className="text-xs opacity-75 truncate">
          • {citation.section}
        </span>
      )}
      
      {citation.url && (
        <ExternalLink className={`
          w-3 h-3 opacity-60 transition-opacity duration-200
          ${isHovered ? 'opacity-100' : ''}
        `} />
      )}
    </Button>
  );

  // If we have detailed info, wrap in hover card
  if (citation.content_preview || citation.last_updated) {
    return (
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          {chipContent}
        </HoverCardTrigger>
        <HoverCardContent 
          className="w-80 p-4" 
          side="top"
          sideOffset={5}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-sm">{citation.source}</h4>
                {citation.section && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Section: {citation.section}
                  </p>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={`
                  ${citation.authority_level === 'official' ? 'border-green-200 text-green-800' : 
                    citation.authority_level === 'derived' ? 'border-blue-200 text-blue-800' : 
                    'border-orange-200 text-orange-800'}
                  text-xs
                `}
              >
                {citation.authority_level}
              </Badge>
            </div>
            
            {citation.content_preview && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Content Preview:
                </p>
                <p className="text-sm leading-relaxed text-gray-700">
                  {citation.content_preview}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {citation.last_updated && (
                <span>Updated: {new Date(citation.last_updated).toLocaleDateString()}</span>
              )}
              {citation.url && (
                <span className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Click to view source
                </span>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return chipContent;
};

// Container component for multiple citations
interface CitationGroupProps {
  citations: Citation[];
  maxVisible?: number;
  className?: string;
  title?: string;
}

export const CitationGroup: React.FC<CitationGroupProps> = ({
  citations,
  maxVisible = 3,
  className = '',
  title = 'Sources'
}) => {
  const [showAll, setShowAll] = useState(false);
  
  const visibleCitations = showAll ? citations : citations.slice(0, maxVisible);
  const hasMore = citations.length > maxVisible;

  if (citations.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          <Book className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {title}:
          </span>
        </div>
      )}
      
      <div className="flex flex-wrap items-center gap-2">
        {visibleCitations.map((citation, index) => (
          <CitationChip
            key={`${citation.source}-${citation.section}-${index}`}
            citation={citation}
            size="sm"
          />
        ))}
        
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {showAll ? 'Show less' : `+${citations.length - maxVisible} more`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CitationChip;