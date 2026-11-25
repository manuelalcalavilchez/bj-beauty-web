import React from 'react';

export interface IconProps {
  className?: string;
}

/* === Iconos personalizados (línea limpia / relleno sólido, color por currentColor). === */

export const IconBrows: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
  >
    <path d="M10 27 C17 18 25 16 32 22 C38 26 43 24 48 27" />
    <path d="M16 33 C23 26 30 24 38 30" />
    <path d="M24 32 C35 25 48 32" />
    <g strokeWidth="1.8">
      <path d="M38 35 q-7 -6 -3 -8" />
      <path d="M34 36 q-5 -5 -2 -7" />
      <path d="M30 37 q-4 -5 1 -8" />
    </g>
  </svg>
);

export const IconManicure: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
  >
    <g fill="currentColor" stroke="none">
      <path d="M11 46 C7 45 7 40 13 39 C17 37 23 35 27 36 C30 37 32 39 33 41 C34 43 33 46 32 46 C31 46 24 47 18 47 L14 47 C12 47 11 46 11 46 Z" />
      <rect x="18" y="31" width="7" height="15" rx="3.5" />
      <rect x="26" y="27" width="11" height="18" rx="5.5" />
      <rect x="36" y="27" width="10" height="17" rx="5" />
      <rect x="46" y="30" width="8" height="15" rx="4" />
    </g>
    <g fill="currentColor" stroke="none">
      <ellipse cx="21" cy="43" rx="5" ry="3" transform="rotate(18,21,43)" />
      <ellipse cx="30" cy="40" rx="5.5" ry="3" transform="rotate(18,30,40)" />
      <ellipse cx="41" cy="41" rx="5" ry="3" transform="rotate(16,41,41)" />
      <ellipse cx="48" cy="44" rx="4.5" ry="2.8" transform="rotate(16,48,44)" />
    </g>
  </svg>
);

export const IconPedicure: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
  >
    <g fill="currentColor" stroke="none">
      <path d="M12 47 C10 45 10 42 15 41 C18 40 23 38 27 39 C29 40 30 41 31 42 C32 43 28 45 25 45 L22 45 l-2 1 q-2 4 -3 6 q0 4 2 6 l6 2 q6 1 11 9 q0 6 -2 8 l-6 2 q-3 1 -5 -2 z" />
      <path d="M36 47 C34 45 34 42 39 41 C42 40 47 38 51 39 C53 40 54 41 55 42 C56 43 52 45 49 45 L46 45 l-2 1 q-2 4 -3 6 q0 4 2 6 l6 2 q6 1 11 9 q0 6 -2 8 l-6 2 q-3 1 -5 -2 z" />
    </g>
    <g fill="currentColor" stroke="none">
      <ellipse cx="22" cy="41" rx="3" ry="2" />
      <ellipse cx="26" cy="41" rx="3" ry="2" />
      <ellipse cx="30" cy="41" rx="3" ry="2" />
      <ellipse cx="34" cy="41" rx="2.5" ry="1.8" />
      <ellipse cx="38" cy="41" rx="2.5" ry="1.8" />
      <ellipse cx="46" cy="41" rx="3" ry="2" />
      <ellipse cx="50" cy="41" rx="3" ry="2" />
      <ellipse cx="54" cy="41" rx="2.8" ry="2" />
    </g>
  </svg>
);

export const IconLotus: React.FC<IconProps> = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" fill="currentColor" stroke="none" className={className} aria-hidden="true">
    <g transform="translate(32 30)">
      <ellipse cx="0" cy="0" rx="6" ry="10" transform="rotate(0)" />
      <ellipse cx="0" cy="0" rx="6" ry="10" transform="rotate(72)" />
      <ellipse cx="0" cy="0" rx="6" ry="10" transform="rotate(144)" />
      <ellipse cx="0" cy="0" rx="6" ry="10" transform="rotate(216)" />
      <ellipse cx="0" cy="0" rx="6" ry="10" transform="rotate(288)" />
    </g>
    <circle cx="0" cy="0" r="5" fill="currentColor" />
  </svg>
);

export const IconDiamond: React.FC<IconProps> = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" fill="currentColor" stroke="none" className={className} aria-hidden="true">
    <path d="M32 10 L48 24 L32 38 L16 24 Z" />
    <path d="M32 16 L32 28 L40 36 L32 40 L24 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="24" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconHeartOutline: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6"
    strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
  >
    <path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" />
    <path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" />
  </svg>
);
