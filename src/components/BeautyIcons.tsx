import React from 'react';

export interface IconProps {
  className?: string;
}

export const IconCrown: React.FC<IconProps> = ({ className = '' }) => (
  <svg viewBox="0 0 100 54" fill="currentColor" className={className} aria-hidden="true">
    <path d="M8 44 L14 14 L34 30 L50 6 L66 30 L86 14 L92 44 Z" />
    <circle cx="14" cy="12" r="4" />
    <circle cx="50" cy="4" r="4" />
    <circle cx="86" cy="12" r="4" />
  </svg>
);

export const IconTiara: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 40"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M8 32c14-4 34-4 48 0" />
    <path d="M10 32L14 18l10 8 8-18 8 18 10-8 4 14" />
    <circle cx="32" cy="6" r="2.2" fill="currentColor" />
    <circle cx="14" cy="15" r="1.8" fill="currentColor" />
    <circle cx="50" cy="15" r="1.8" fill="currentColor" />
  </svg>
);

export const IconBrows: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7 18c8-8 26-8 34 0" />
    <path d="M9 29c9 8 21 8 30 0" />
    <path d="M15 32l-3 5M24 35v6M33 32l3 5" />
  </svg>
);

export const IconBrowsArch: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7 22c6-9 17-12 29-4 3 2 5 4 6 5" />
    <path d="M10 32c8-5 19-5 27 0-8 5-19 5-27 0z" />
    <circle cx="24" cy="32" r="3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconManicure: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 42V14a4 4 0 0 1 8 0v14l8-4a4 4 0 0 1 3 7l-8 11" />
    <path d="M20 14c1.5 1.5 3.5 1.5 4.5 0" strokeWidth="1.8" />
  </svg>
);

export const IconNailPolish: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="19" y="6" width="10" height="14" rx="2" />
    <path d="M14 24a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V24z" />
    <path d="M19 30h10" />
  </svg>
);

export const IconPedicure: React.FC<IconProps> = ({ className = '' }) => (
  <svg viewBox="0 0 48 48" fill="currentColor" className={className} aria-hidden="true">
    <ellipse cx="22" cy="30" rx="8.5" ry="13.5" />
    <circle cx="13" cy="10" r="3" />
    <circle cx="21" cy="7" r="2.6" />
    <circle cx="28" cy="8" r="2.3" />
    <circle cx="34" cy="12" r="2" />
  </svg>
);

export const IconSpaFoot: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <ellipse cx="16" cy="28" rx="4.5" ry="8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r="1.7" fill="currentColor" stroke="none" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="15" r="1.4" fill="currentColor" stroke="none" />
    <ellipse cx="32" cy="31" rx="4.5" ry="8" fill="currentColor" stroke="none" />
    <circle cx="28" cy="18" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="32" cy="17" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="36" cy="18" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLotus: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M24 40c-10-2-16-8-16-16 6 0 11 2 16 8 5-6 10-8 16-8 0 8-6 14-16 16z" />
    <path d="M24 32V10" />
    <path d="M24 10c4 5 6 11 4 17" />
    <path d="M24 10c-4 5-6 11-4 17" />
  </svg>
);

export const IconDiamond: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 8h24l8 10-20 24L4 18z" />
    <path d="M4 18h40M18 8l6 34 6-34" />
  </svg>
);

export const IconHeartOutline: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M24 42S6 30 6 18a9 9 0 0 1 18-2 9 9 0 0 1 18 2c0 12-18 24-18 24z" />
  </svg>
);

export const IconSparkles: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M24 6l3.5 11.5L39 21l-11.5 3.5L24 36l-3.5-11.5L9 21l11.5-3.5L24 6z" />
    <path d="M37 8v6M34 11h6M11 33v5M8.5 35.5h5" />
  </svg>
);

export const IconWhatsApp: React.FC<IconProps> = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.4z" />
  </svg>
);

export const LOGO_ICON_OPTIONS = [
  { id: 'crown', label: 'Corona Clásica' },
  { id: 'tiara', label: 'Tiara Real' },
  { id: 'lotus', label: 'Flor de Loto' },
  { id: 'diamond', label: 'Diamante' },
  { id: 'heart', label: 'Corazón' },
  { id: 'sparkles', label: 'Destellos' },
] as const;

export const SERVICE_ICON_OPTIONS = [
  { id: 'brows', label: 'Cejas y Pestañas' },
  { id: 'brows_arch', label: 'Arco de Ceja' },
  { id: 'manicure', label: 'Manicura (Mano)' },
  { id: 'nail_polish', label: 'Esmalte de Uñas' },
  { id: 'pedicure', label: 'Pedicura (Huella)' },
  { id: 'spa_foot', label: 'Pedicura Spa' },
  { id: 'lotus', label: 'Flor de Loto' },
  { id: 'diamond', label: 'Diamante VIP' },
  { id: 'heart', label: 'Corazón' },
  { id: 'crown', label: 'Corona' },
  { id: 'sparkles', label: 'Brillo / Arte' },
] as const;

const ICON_COMPONENTS: Record<string, React.ComponentType<IconProps>> = {
  crown: IconCrown,
  tiara: IconTiara,
  brows: IconBrows,
  brows_arch: IconBrowsArch,
  manicure: IconManicure,
  nail_polish: IconNailPolish,
  pedicure: IconPedicure,
  spa_foot: IconSpaFoot,
  lotus: IconLotus,
  diamond: IconDiamond,
  heart: IconHeartOutline,
  sparkles: IconSparkles,
};

export const isCustomIconImage = (iconKey?: string): boolean => {
  const v = String(iconKey || '').trim();
  return v.startsWith('data:image/') || v.startsWith('http://') || v.startsWith('https://');
};

export const defaultIconForCategory = (category?: string): string => {
  if (category === 'manicura') return 'manicure';
  if (category === 'pedicura') return 'pedicure';
  if (category === 'cejas') return 'brows';
  return 'sparkles';
};

export const renderBeautyIcon = (
  iconKey?: string,
  className = 'w-11 h-11',
  fallbackCategory?: string
): React.ReactNode => {
  const key = String(iconKey || '').trim();
  if (isCustomIconImage(key)) {
    return (
      <img
        src={key}
        alt=""
        referrerPolicy="no-referrer"
        className={`${className} object-cover rounded-full`}
      />
    );
  }
  const resolvedKey = ICON_COMPONENTS[key] ? key : defaultIconForCategory(fallbackCategory);
  const IconComp = ICON_COMPONENTS[resolvedKey] || IconSparkles;
  return <IconComp className={className} />;
};
