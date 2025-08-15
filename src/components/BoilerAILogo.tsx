import React from 'react';
import logoFull from '@/assets/logo-full.png';

interface BoilerAILogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'default' | 'white' | 'dark' | 'icon';
}

export const BoilerAILogo: React.FC<BoilerAILogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = '',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto', 
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl', 
    xl: 'text-4xl'
  };

  const getColors = () => {
    switch (variant) {
      case 'white':
        return {
          textGold: 'text-[#CFB991]',
          textWhite: 'text-white'
        };
      case 'dark':
        return {
          textGold: 'text-[#CFB991]',
          textWhite: 'text-black'
        };
      default:
        return {
          textGold: 'text-[#CFB991]',
          textWhite: 'text-white'
        };
    }
  };

  const colors = getColors();

  // If variant is 'icon', show only the "B" part
  if (variant === 'icon') {
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

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Full BAI Logo from uploaded image */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <img 
          src={logoFull} 
          alt="BoilerAI" 
          className={`${sizeClasses[size]} object-contain`}
        />
      </div>

      {/* Optional additional text (usually not shown since logo includes text) */}
      {showText && (
        <div className={`flex items-center space-x-1 font-semibold ${textSizeClasses[size]} ml-2`}>
          <span className={colors.textGold}>Boiler</span>
          <span className={colors.textWhite}>AI</span>
        </div>
      )}
    </div>
  );
};

export default BoilerAILogo;
