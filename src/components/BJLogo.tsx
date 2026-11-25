import React from 'react';

interface BJLogoProps {
  className?: string;
  size?: number;
  allowUpload?: boolean;
}

// Logotipo BJ Beauty en SVG: corona dorada, monograma BJ y rótulo. Usa currentColor para el texto.
export const BJLogo: React.FC<BJLogoProps> = ({ className = '', size = 52 }) => (
  <div className={`flex items-center select-none ${className}`}>
    <svg height={size} viewBox="0 0 120 100" role="img" aria-label="BJ Beauty" style={{ width: 'auto' }}>
      <path d="M44 20 L47 6 L54 13 L60 2 L66 13 L73 6 L76 20 Z" fill="#B8923A" />
      <circle cx="60" cy="2.5" r="2" fill="#B8923A" />
      <text x="60" y="76" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontWeight="700" fontSize="62" fill="currentColor">BJ</text>
      <text x="60" y="96" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontSize="11" letterSpacing="5" fill="currentColor">BEAUTY</text>
      <path d="M12 56 a52 52 0 0 1 96 0" fill="none" stroke="#B8923A" strokeWidth="1.2" opacity=".7" />
    </svg>
  </div>
);
