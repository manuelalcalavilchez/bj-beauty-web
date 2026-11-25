import React from 'react';
import { IconHeartOutline } from './BeautyIcons';
import { BJLogo } from './BJLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#2B0F1E] text-[#FDEEF3] pt-14 pb-24 lg:pb-14 px-4 lg:px-12 border-t border-[#E0407F]/30">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <BJLogo variant="compact" />
          </div>
          <p className="text-sm text-[#FDEEF3]/80 leading-relaxed">
            Estética y bienestar. Tu belleza, nuestra pasión.
          </p>
        </div>

        <div>
          <h4 className="font-serif text-lg font-semibold text-[#E83E8C] mb-4">Servicios</h4>
          <ul className="space-y-2 text-sm text-[#FDEEF3]/80">
            <li>Diseño y laminado de cejas</li>
            <li>Manicura</li>
            <li>Pedicura</li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-lg font-semibold text-[#E83E8C] mb-4">Contacto</h4>
          <a
            href="https://wa.me/34611296406"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 text-sm text-[#FDEEF3]/80 hover:text-[#F27AA8] transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-[#F6B8D0] flex items-center justify-center text-[#141414] shrink-0">
              <IconHeartOutline className="w-5 h-5" />
            </span>
            <span className="font-sans">611 296 406</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-7 border-t border-[#FDEEF3]/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FDEEF3]/60 gap-3">
        <p>© 2026 BJ Beauty. Todos los derechos reservados.</p>
        <p className="flex items-center gap-2 font-script text-sm">
          <span className="w-8 h-8 rounded-full bg-[#F6B8D0] flex items-center justify-center text-[#141414]">
            <IconHeartOutline className="w-4 h-4" />
          </span>
          Calidad en cada servicio · Resultados que enamoran.
        </p>
      </div>
    </footer>
  );
};
