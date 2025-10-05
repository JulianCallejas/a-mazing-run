import React from 'react';
import { GAME_CONFIG } from '../../utils/constants';

interface MedievalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

const MedievalButton: React.FC<MedievalButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const baseClasses = `
    font-cinzel font-semibold text-center transition-all duration-200 
    border-2 rounded-lg shadow-lg transform hover:scale-105 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-b from-amber-600 to-amber-800 
      border-amber-900 text-amber-100 
      hover:from-amber-500 hover:to-amber-700
      shadow-amber-900/30
    `,
    secondary: `
      bg-gradient-to-b from-stone-600 to-stone-800 
      border-stone-900 text-stone-100 
      hover:from-stone-500 hover:to-stone-700
      shadow-stone-900/30
    `,
    danger: `
      bg-gradient-to-b from-red-600 to-red-800 
      border-red-900 text-red-100 
      hover:from-red-500 hover:to-red-700
      shadow-red-900/30
    `
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      role="button"
      tabIndex={0}
    >
      {children}
    </button>
  );
};

export default MedievalButton;