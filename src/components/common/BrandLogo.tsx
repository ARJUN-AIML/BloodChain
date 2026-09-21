import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export function BrandLogo({
  size = 'md',
  showTagline = true,
  className,
  theme = 'light',
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const tagSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-[11px]',
  };

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      {/* Refined Vector Crest */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-lg p-1 transition-transform duration-200 flex-shrink-0',
          theme === 'dark'
            ? 'bg-stone-900 border border-stone-800'
            : 'bg-white border border-stone-200/90 shadow-2xs',
          iconSizes[size]
        )}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Subtle Arterial Life Drop */}
          <path
            d="M16 4C12.5 4 9 8 9 14C9 20 14.5 27 16 28C17.5 27 23 20 23 14C23 8 19.5 4 16 4Z"
            fill="#841A2B"
          />
          {/* Internal Minimal Cross */}
          <path
            d="M16 10V18M12 14H20"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Core Safe-Node Pip */}
          <circle cx="21" cy="9" r="2.5" fill="#1C1917" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      </div>

      {/* Brand Typographic Identity */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center">
          <span
            className={cn(
              'font-serif font-bold tracking-tight',
              theme === 'dark' ? 'text-white' : 'text-stone-900',
              titleSizes[size]
            )}
          >
            Blood<span className="text-[#841A2B]">Chain</span>
          </span>
        </div>
        {showTagline && (
          <span
            className={cn(
              'font-sans font-medium tracking-[0.2em] uppercase mt-1',
              theme === 'dark' ? 'text-stone-400' : 'text-stone-500',
              tagSizes[size]
            )}
          >
            Tiruchirappalli Region
          </span>
        )}
      </div>
    </div>
  );
}
