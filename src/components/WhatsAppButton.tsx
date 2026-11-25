import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { apiService, CONFIG_UPDATED_EVENT, normalizeWhatsAppDigits } from '../data/api';

const DEFAULT_WHATSAPP_NUMBER = '34611296406';

export const WhatsAppButton: React.FC = () => {
  const [whatsappDigits, setWhatsappDigits] = useState(DEFAULT_WHATSAPP_NUMBER);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = () => {
      apiService.getConfig().then((cfg) => {
        if (!cancelled && cfg?.whatsapp !== undefined) {
          setWhatsappDigits(normalizeWhatsAppDigits(cfg.whatsapp, DEFAULT_WHATSAPP_NUMBER));
        }
      });
    };
    loadConfig();
    window.addEventListener(CONFIG_UPDATED_EVENT, loadConfig);
    return () => {
      cancelled = true;
      window.removeEventListener(CONFIG_UPDATED_EVENT, loadConfig);
    };
  }, []);

  const href =
    'https://wa.me/' +
    whatsappDigits +
    '?text=' +
    encodeURIComponent('Hola, quiero pedir cita en BJ Beauty');

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar con el agente virtual por WhatsApp"
      title="Hablar por WhatsApp"
      className="fixed right-5 bottom-24 lg:bottom-7 z-[60] flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3.5 text-white font-bold shadow-[0_10px_30px_rgba(0,0,0,.22)] hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="text-xs uppercase tracking-wider">WhatsApp</span>
    </a>
  );
};
