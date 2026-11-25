import { ServiceItem, AddonItem, Specialist } from '../types';

export const SERVICES: ServiceItem[] = [
  {
    id: 's1',
    name: 'Diseño y Laminado de Cejas',
    category: 'cejas',
    durationMinutes: 45,
    durationEstimate: '45 min aprox.',
    price: 0,
    description: 'Diseño personalizado y laminado para unas cejas definidas y duraderas.'
  },
  {
    id: 's2',
    name: 'Manicura',
    category: 'manicura',
    durationMinutes: 60,
    durationEstimate: '45 - 60 min aprox.',
    price: 0,
    description: 'Acabados impecables: francesa, diseños y decoración personalizada.'
  },
  {
    id: 's3',
    name: 'Pedicura',
    category: 'pedicura',
    durationMinutes: 60,
    durationEstimate: '60 min aprox.',
    price: 0,
    description: 'Pies cuidados, suaves y con un esmaltado que enamora.'
  }
];

export const ADDONS: AddonItem[] = [];

export const SPECIALISTS: Specialist[] = [
  { id: 'any', name: 'Cualquiera Disponible', role: 'Equipo BJ Beauty', avatar: '✨' }
];

export const LOOKBOOK_ITEMS: any[] = [];

export const NAIL_STYLES_CATALOG = [
  {
    id: 'emerald_gold',
    name: 'Strass & Cristales VIP',
    bgGradient: 'from-[#2B0F1E] via-[#A32A5F] to-[#4A1630]',
    accent: '#E0407F',
    badge: 'Promo 20€'
  },
  {
    id: 'russian_glazed',
    name: 'Esmaltado Permanente 10€',
    bgGradient: 'from-[#FDEEF3] via-[#e5dfd3] to-[#d4cfc2]',
    accent: '#2B0F1E',
    badge: 'Promo 10€'
  },
  {
    id: 'cat_eye',
    name: 'Rosa & Oro',
    bgGradient: 'from-[#2B0F1E] via-[#3A1226] to-[#6B2145]',
    accent: '#E0407F',
    badge: 'Tendencia'
  },
  {
    id: 'burgundy_noir',
    name: 'Borgoña & Oro',
    bgGradient: 'from-[#2B0C15] via-[#4a1525] to-[#2B0C15]',
    accent: '#E0407F',
    badge: 'Elegante'
  }
];

