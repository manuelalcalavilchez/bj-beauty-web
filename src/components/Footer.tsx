import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { IconWhatsApp } from './BeautyIcons';
import { BJLogo } from './BJLogo';
import {
  apiService,
  CONFIG_UPDATED_EVENT,
  formatPhoneDisplay,
  normalizeWhatsAppDigits,
} from '../data/api';

export const Footer: React.FC = () => {
  const [contactConfig, setContactConfig] = useState({
    phone: '611296406',
    whatsapp: '34611296406',
  });

  useEffect(() => {
    let cancelled = false;
    const loadConfig = () => {
      apiService.getConfig().then((cfg) => {
        if (!cancelled && cfg && typeof cfg === 'object') {
          setContactConfig({
            phone: String(cfg.phone || '611296406'),
            whatsapp: String(cfg.whatsapp || '34611296406'),
          });
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

  const whatsappDigits = normalizeWhatsAppDigits(contactConfig.whatsapp, '34611296406');
  const whatsappDisplay = formatPhoneDisplay(contactConfig.whatsapp, '611 296 406');
  const directPhoneDigits =
    String(contactConfig.phone || '611296406').replace(/[^\d+]/g, '') || '611296406';
  const directPhoneDisplay = formatPhoneDisplay(contactConfig.phone, '611 296 406');

  return (
    <footer className="border-t border-[#E3C77A] bg-[#FFF7FA]/85 text-[#5D4A57] pt-10 pb-24 lg:pb-10 px-4 lg:px-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <BJLogo variant="compact" />
          <p className="text-xs text-[#5D4A57]">
            Estética y Bienestar · Diseño y laminado de cejas · Manicura · Pedicura
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <a
            href={`tel:${directPhoneDigits}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#14101A] hover:text-[#E0407F] transition-colors whitespace-nowrap"
          >
            <Phone className="w-4 h-4 text-[#B8923A]" aria-hidden="true" />
            <span>Directo:</span>
            <span className="tabular-nums">{directPhoneDisplay}</span>
          </a>

          <a
            href={`https://wa.me/${whatsappDigits}?text=Hola%2C%20quiero%20pedir%20cita%20en%20BJ%20Beauty`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#14101A] hover:text-[#E0407F] transition-colors whitespace-nowrap"
          >
            <IconWhatsApp className="w-4 h-4 text-[#E0407F]" />
            <span>Agente Virtual:</span>
            <span className="tabular-nums">{whatsappDisplay}</span>
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-6 pt-5 border-t border-[#E3C77A]/40 text-center text-xs text-[#5D4A57]">
        © 2026 BJ Beauty · Estética y Bienestar · Tu belleza, nuestra pasión
      </div>
    </footer>
  );
};
