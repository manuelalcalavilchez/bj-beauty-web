import React from 'react';

interface BJLogoProps {
  variant?: 'full' | 'compact';
  className?: string;
  size?: number;
}

export const BJLogo: React.FC<BJLogoProps> = ({ variant = 'full', className = '', size = 64 }) => {
  const isFull = variant === 'full';
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <div className="flex items-center">
        <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="BJ Beauty" className={`transition-transform ${isFull ? '' : 'rounded-full shadow-lg'}`}>
          <path d="M 38.73 6.88 A 26 26 0 1 1 25.27 57.12" fill="none" stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 38.73 6.88 A 26 26 0 1 1 25.27 57.12" fill="none" stroke="var(--gold-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D4AF37" /><stop offset="1" stopColor="#B8860B" /></linearGradient></defs>
          <path d="M23 12 L41 12 L32 2.5 Z" fill="var(--gold-bright)" stroke="#B8860B" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="23" cy="12" r="1.8" fill="var(--gold-bright)" stroke="#B8860B" strokeWidth="1" />
          <circle cx="41" cy="12" r="1.8" fill="var(--gold-bright)" stroke="#B8860B" strokeWidth="1" />
          <text x="32" y="26" textAnchor="middle" fontSize="30" fontWeight="700" fill="#141414" fontFamily="Playfair Display, Cormorant Garamond, Georgia, serif">B</text>
          <text x="32" y="33" textAnchor="middle" fontSize="30" fontWeight="700" fill="#141414" fontFamily="Playfair Display, Cormorant Garamond, Georgia, serif">J</text>
          <path d="M19 35 C17 31 15 27 18 23 C21 19 24 17 28 17 C32 17 35 19 37 23 C40 27 39 31 36 35 Z" fill="var(--pink)" stroke="#141414" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
      {isFull ? (
        <div className="flex items-baseline gap-3 ml-3">
          <span className="font-serif font-bold tracking-[0.32em] text-[#141414]" style={{ letterSpacing: '0.32em' }}>BEAUTY</span>
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F6B8D0] text-[#141414] text-xs">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-script text-lg leading-none">BJ Beauty</span>
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F6B8D0] text-[#141414] text-xs">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
          </span>
        </div>
      )}
    </div>
  );
};
