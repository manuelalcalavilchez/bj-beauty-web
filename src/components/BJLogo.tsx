import React, { useEffect, useState } from 'react';
import { apiService, CONFIG_UPDATED_EVENT } from '../data/api';
import { isCustomIconImage, renderBeautyIcon } from './BeautyIcons';

interface BJLogoProps {
  variant?: 'full' | 'compact';
  className?: string;
  size?: number;
  logoIcon?: string;
}

const normalizeLogoValue = (raw?: string): string => {
  const val = String(raw || '').trim();
  if (!val || val === '/assets/logo.jpg') return 'crown';
  return val;
};

export const BJLogo: React.FC<BJLogoProps> = ({ variant = 'full', className = '', logoIcon }) => {
  const [configuredLogo, setConfiguredLogo] = useState<string>('crown');

  useEffect(() => {
    if (logoIcon !== undefined) return;
    let cancelled = false;
    const loadLogo = () => {
      apiService.getConfig().then((cfg) => {
        if (!cancelled && cfg && typeof cfg === 'object') {
          setConfiguredLogo(normalizeLogoValue(cfg.logo));
        }
      });
    };
    loadLogo();
    window.addEventListener(CONFIG_UPDATED_EVENT, loadLogo);
    return () => {
      cancelled = true;
      window.removeEventListener(CONFIG_UPDATED_EVENT, loadLogo);
    };
  }, [logoIcon]);

  const activeLogo = normalizeLogoValue(logoIcon !== undefined ? logoIcon : configuredLogo);
  const customImage = isCustomIconImage(activeLogo);

  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
        {customImage ? (
          <img
            src={activeLogo}
            alt="Logo BJ Beauty"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-[#E3C77A] shrink-0"
          />
        ) : (
          <span className="inline-flex items-center justify-center text-[#B8923A] shrink-0">
            {renderBeautyIcon(activeLogo, 'w-6 h-5', 'crown')}
          </span>
        )}
        <span className="font-serif text-lg font-bold tracking-tight text-[#14101A]">BJ Beauty</span>
      </span>
    );
  }

  if (customImage) {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-[#E3C77A] bg-white/85 p-3 shadow-[0_8px_28px_rgba(224,64,127,0.12)] flex items-center justify-center overflow-hidden mb-3">
          <img
            src={activeLogo}
            alt="Logo BJ Beauty"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain rounded-full"
          />
        </div>
        <span className="font-serif text-lg sm:text-2xl font-semibold uppercase tracking-[0.48em] -mr-[0.48em] text-[#14101A]">
          BEAUTY
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className="relative flex flex-col items-center">
        <div className="text-[#B8923A] -mb-1 flex items-center justify-center">
          {renderBeautyIcon(activeLogo, activeLogo === 'crown' ? 'w-16 sm:w-20 h-auto' : 'w-12 h-12 sm:w-14 sm:h-14', 'crown')}
        </div>

        <div className="relative px-8 pt-1 pb-2">
          <svg
            viewBox="0 0 240 160"
            className="w-48 sm:w-56 h-auto overflow-visible"
            role="img"
            aria-label="Monograma BJ Beauty"
          >
            <defs>
              <linearGradient id="bjGoldArch" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E3C77A" />
                <stop offset="50%" stopColor="#B8923A" />
                <stop offset="100%" stopColor="#E3C77A" />
              </linearGradient>
            </defs>
            <path
              d="M 52 138 A 92 92 0 1 1 188 138"
              fill="none"
              stroke="url(#bjGoldArch)"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <text
              x="120"
              y="118"
              textAnchor="middle"
              fontFamily="Playfair Display, Georgia, serif"
              fontWeight="700"
              fontSize="118"
              letterSpacing="-5"
              fill="currentColor"
            >
              BJ
            </text>
            <path
              d="M 56 105 C 50 99 42 92 42 84 C 42 79 46 75 51 75 C 54 75 56 77 58 80 C 60 77 62 75 65 75 C 70 75 74 79 74 84 C 74 92 66 99 60 105 Z"
              fill="none"
              stroke="#E0407F"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <span className="font-serif text-lg sm:text-2xl font-semibold uppercase tracking-[0.48em] -mr-[0.48em] text-[#14101A]">
        BEAUTY
      </span>
    </div>
  );
};
