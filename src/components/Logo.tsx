import React from 'react';
import logoFull from '@/assets/logo-full.png';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  size = 'md', 
  className = '' 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-6 w-auto';
      case 'md': return 'h-8 w-auto';
      case 'lg': return 'h-12 w-auto';
      case 'xl': return 'h-16 w-auto';
      default: return 'h-8 w-auto';
    }
  };

  if (variant === 'full') {
    return (
      <div className={`flex items-center ${className}`}>
        <img 
          src={logoFull} 
          alt="BoilerAI" 
          className={getSizeClasses()}
        />
      </div>
    );
  }

  if (variant === 'icon') {
    // For icon-only, we'll create a styled "B" 
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div 
          className={`
            font-bold text-yellow-400 bg-gradient-to-br from-yellow-400 to-yellow-600 
            bg-clip-text text-transparent border-2 border-yellow-400 rounded-lg
            flex items-center justify-center
            ${size === 'sm' ? 'w-6 h-6 text-sm' : ''}
            ${size === 'md' ? 'w-8 h-8 text-lg' : ''}
            ${size === 'lg' ? 'w-12 h-12 text-xl' : ''}
            ${size === 'xl' ? 'w-16 h-16 text-2xl' : ''}
          `}
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #CFB991 0%, #B8A082 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            borderColor: '#CFB991'
          }}
        >
          B
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span 
          className={`
            font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 
            bg-clip-text text-transparent
            ${size === 'sm' ? 'text-lg' : ''}
            ${size === 'md' ? 'text-xl' : ''}
            ${size === 'lg' ? 'text-2xl' : ''}
            ${size === 'xl' ? 'text-3xl' : ''}
          `}
          style={{
            background: 'linear-gradient(135deg, #CFB991 0%, #B8A082 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          B
        </span>
        <span 
          className={`
            font-bold text-white
            ${size === 'sm' ? 'text-lg' : ''}
            ${size === 'md' ? 'text-xl' : ''}
            ${size === 'lg' ? 'text-2xl' : ''}
            ${size === 'xl' ? 'text-3xl' : ''}
          `}
        >
          AI
        </span>
      </div>
    );
  }

  return null;
};

export default Logo;