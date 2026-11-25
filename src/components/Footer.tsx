import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { BJLogo } from './BJLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#2B0F1E] text-[#FDEEF3] pt-14 pb-24 lg:pb-14 px-4 lg:px-12 border-t border-[#E0407F]/30">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
        <div>
          <BJLogo size={70} className="mb-5 text-white" />
          <p className="text-sm text-[#FDEEF3]/80 leading-relaxed">
            Estética y bienestar. Tu belleza, nuestra pasión.
          </p>
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold text-[#E0407F] mb-4">Servicios</h4>
          <ul className="space-y-2 text-sm text-[#FDEEF3]/80">
            <li>Diseño y laminado de cejas</li>
            <li>Manicura</li>
            <li>Pedicura</li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold text-[#E0407F] mb-4">Contacto</h4>
          <a
            href="https://wa.me/34611296406"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 text-sm text-[#FDEEF3]/80 hover:text-[#F27AA8] transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#E0407F] shrink-0" />
            <span>611 296 406</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-7 border-t border-[#FDEEF3]/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FDEEF3]/60 gap-3">
        <p>© 2026 BJ Beauty. Todos los derechos reservados.</p>
        <p className="flex items-center gap-1">
          Calidad en cada servicio <Heart className="w-3.5 h-3.5 text-[#E0407F] fill-[#E0407F]" /> Resultados que enamoran.
        </p>
      </div>
    </footer>
  );
};
