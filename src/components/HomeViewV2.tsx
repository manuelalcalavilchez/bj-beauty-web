import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Phone } from 'lucide-react';
import {
  apiService,
  CONFIG_UPDATED_EVENT,
  SERVICES_UPDATED_EVENT,
  formatPhoneDisplay,
  normalizeWhatsAppDigits,
} from '../data/api';
import { SERVICES as MOCK_SERVICES } from '../data/mockData';
import {
  IconLotus,
  IconDiamond,
  IconHeartOutline,
  IconWhatsApp,
  IconProps,
  renderBeautyIcon,
} from './BeautyIcons';
import { BJLogo } from './BJLogo';

type PublicService = {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  duration?: number | null;
  durationMinutes?: number;
  durationEstimate?: string;
  price?: number | null;
  active?: number | boolean;
  sortOrder?: number;
  category?: string;
  icon?: string;
};

type GalleryItem = {
  id: string;
  photoBase64?: string;
  title?: string;
  caption?: string;
};

const DEFAULT_CONTENT: Record<string, string> = {
  hero_kicker: 'Estética y Bienestar',
  hero_title: 'Tu belleza,',
  hero_title_highlight: 'nuestra pasión.',
  hero_subtitle: 'Tu belleza, nuestra pasión',
  hero_cta_booking: 'Solicitar cita',
  hero_cta_whatsapp: '611 296 406',
  services_kicker: 'Servicios',
  services_title: 'Nuestros servicios',
  services_subtitle: 'Cuida tus detalles, realza tu belleza',
  services_empty: 'No hay servicios activos publicados.',
  gallery_kicker: 'Galería',
  gallery_title: 'Resultados que enamoran',
  gallery_cta: 'Reservar',
  closing_title: 'Reserva tu cita',
  closing_subtitle: 'Calidad en cada servicio · Tu belleza, nuestra prioridad',
  closing_cta_booking: 'Solicitar cita',
  closing_cta_whatsapp: 'Escríbenos por WhatsApp',
  instagram_url: 'https://wa.me/34611296406?text=Hola%2C%20quiero%20pedir%20cita%20en%20BJ%20Beauty',
};

const PILLARS: { icon: React.ComponentType<IconProps>; label: string }[] = [
  { icon: IconLotus, label: 'Calidad en cada servicio' },
  { icon: IconDiamond, label: 'Resultados que enamoran' },
  { icon: IconHeartOutline, label: 'Tu belleza, nuestra prioridad' },
];

export const HomeViewV2: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const [services, setServices] = useState<PublicService[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT);
  const [contactConfig, setContactConfig] = useState({
    phone: '611296406',
    whatsapp: '34611296406',
  });

  const c = (key: string) => content[key] || DEFAULT_CONTENT[key] || '';

  useEffect(() => {
    let cancelled = false;
    apiService.getContent().then((data) => {
      if (!cancelled && data?.content) {
        setContent({ ...DEFAULT_CONTENT, ...data.content });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = () => {
      Promise.all([apiService.getServices(), apiService.getGallery()])
        .then(([serviceData, galleryData]) => {
          if (cancelled) return;
          const activeApiServices = (Array.isArray(serviceData) ? serviceData : [])
            .filter((s) => s.active !== 0 && s.active !== false)
            .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
          setServices(activeApiServices.length > 0 ? activeApiServices : MOCK_SERVICES);
          setGallery(
            Array.isArray(galleryData) ? galleryData.filter((g) => Boolean(g.photoBase64)) : []
          );
        })
        .catch(() => {
          if (!cancelled) {
            setServices(MOCK_SERVICES);
            setGallery([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    loadCatalog();
    window.addEventListener(SERVICES_UPDATED_EVENT, loadCatalog);
    return () => {
      cancelled = true;
      window.removeEventListener(SERVICES_UPDATED_EVENT, loadCatalog);
    };
  }, []);

  const whatsappDigits = normalizeWhatsAppDigits(contactConfig.whatsapp, '34611296406');
  const whatsappDisplay = formatPhoneDisplay(contactConfig.whatsapp, '611 296 406');
  const directPhoneDigits = String(contactConfig.phone || '611296406').replace(/[^\d+]/g, '') || '611296406';
  const directPhoneDisplay = formatPhoneDisplay(contactConfig.phone, '611 296 406');
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    'Hola, quiero pedir cita en BJ Beauty'
  )}`;

  return (
    <div className="text-[#14101A]">
      {/* Hero luminoso inspirado en la portada BJ Beauty */}
      <section className="max-w-5xl mx-auto px-5 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center">
        <BJLogo variant="full" className="mx-auto text-[#14101A]" />

        <p className="font-script text-[clamp(34px,6vw,54px)] text-[#14101A] leading-tight mt-4">
          {c('hero_kicker')}
        </p>

        <p className="font-editorial italic text-[clamp(21px,3.5vw,28px)] text-[#14101A] mt-4">
          Uñas <span className="text-[#E0407F] not-italic mx-2">♥</span> Pedicura{' '}
          <span className="text-[#E0407F] not-italic mx-2">♥</span> Diseño de Cejas
        </p>

        <p className="text-xs uppercase tracking-[0.3em] text-[#5D4A57] font-medium mt-2">
          {c('hero_subtitle')}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setActiveTab('booking')}
            className="px-8 py-4 bg-[#E0407F] hover:bg-[#C8326D] text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-full shadow-[0_8px_24px_rgba(224,64,127,0.28)] transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>{c('hero_cta_booking')}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="bj-whatsapp-btn inline-flex items-center justify-center gap-3 px-7 py-3 rounded-full font-serif font-bold text-[clamp(20px,3vw,28px)] text-[#14101A] whitespace-nowrap shrink-0"
          >
            <IconWhatsApp className="w-7 h-7 text-[#14101A] shrink-0" />
            <span className="tabular-nums">{whatsappDisplay}</span>
          </a>
        </div>

        <div className="mt-4 flex justify-center">
          <a
            href={`tel:${directPhoneDigits}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5D4A57] hover:text-[#E0407F] transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-[#B8923A]" aria-hidden="true" />
            <span>Contacto directo:</span>
            <span className="font-semibold text-[#14101A] tabular-nums">{directPhoneDisplay}</span>
          </a>
        </div>
      </section>

      {/* Divisor dorado */}
      <div className="max-w-5xl mx-auto px-5">
        <hr className="gold-line" />
      </div>

      {/* Sección de servicios */}
      <section id="servicios" className="max-w-5xl mx-auto px-5 py-14 sm:py-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="font-serif text-[clamp(28px,5vw,40px)] font-bold text-[#14101A] text-balance">
            {c('services_title')}
          </h2>
          <p className="text-sm sm:text-base text-[#5D4A57] mt-1.5">
            {c('services_subtitle')}
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-[#5D4A57]">Cargando servicios…</p>
        ) : services.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md border border-[#E3C77A] rounded-[22px] p-8 text-center text-[#5D4A57]">
            {c('services_empty')}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const mockMatch = MOCK_SERVICES.find(
                (m) =>
                  m.id === s.id ||
                  (s.category && m.category === s.category) ||
                  m.name.toLowerCase() === s.name.toLowerCase()
              );
              const durationVal = Number(s.duration ?? s.durationMinutes ?? mockMatch?.durationMinutes);
              const hasDuration = Number.isFinite(durationVal) && durationVal > 0;
              const durationText =
                s.durationEstimate ||
                (Number(s.duration) > 0
                  ? `${Number(s.duration)} min aprox.`
                  : mockMatch?.durationEstimate || (hasDuration ? `${durationVal} min aprox.` : 'Duración a consultar'));
              const hasPrice = s.price != null && typeof s.price === 'number' && s.price > 0;

              return (
                <article
                  key={s.id}
                  className="bg-white/80 backdrop-blur-md border border-[#E3C77A] rounded-[22px] p-7 text-center transition-transform duration-200 hover:-translate-y-1 flex flex-col"
                >
                  <div className="bj-medallion mx-auto mb-4 overflow-hidden">
                    {renderBeautyIcon(s.icon, 'w-11 h-11', s.category)}
                  </div>
                  <h3 className="font-serif text-[22px] font-bold text-[#14101A] leading-snug">
                    {s.name}
                  </h3>
                  <p className="text-sm text-[#5D4A57] mt-2 leading-relaxed flex-1">
                    {s.description || s.shortDescription || 'Consulta los detalles de este servicio.'}
                  </p>
                  <div className="mt-5 pt-4 border-t border-[#E3C77A]/50 flex items-center justify-between gap-3 text-xs text-[#5D4A57] tabular-nums">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#5D4A57]">
                      <Clock className="w-3.5 h-3.5 text-[#B8923A] shrink-0" aria-hidden="true" />
                      <span>{durationText}</span>
                    </span>
                    <span className="font-semibold text-[#14101A]">
                      {hasPrice ? `${Number(s.price).toLocaleString('es-ES')} €` : 'Precio a consultar'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Galería real de cabina (solo cuando hay fotografías publicadas desde Staff) */}
      {gallery.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 pb-12">
          <div className="text-center max-w-xl mx-auto mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-[#B8923A] font-semibold">
              {c('gallery_kicker')}
            </p>
            <h2 className="font-serif text-[clamp(26px,4.5vw,36px)] font-bold text-[#14101A] mt-1">
              {c('gallery_title')}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <figure
                key={item.id}
                className="bg-white/80 border border-[#E3C77A] rounded-[22px] overflow-hidden"
              >
                <div className="aspect-[4/3] bg-[#F9C9DA]/30 overflow-hidden">
                  <img
                    src={item.photoBase64}
                    alt={item.title || 'Trabajo realizado en BJ Beauty'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                {(item.title || item.caption) && (
                  <figcaption className="p-4 text-center">
                    {item.title && (
                      <p className="font-serif font-semibold text-base text-[#14101A]">{item.title}</p>
                    )}
                    {item.caption && (
                      <p className="text-xs text-[#5D4A57] mt-1">{item.caption}</p>
                    )}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Frase caligráfica y pilares con divisores dorados */}
      <section className="max-w-5xl mx-auto px-5 pt-4 pb-16 text-center">
        <p className="font-script text-[clamp(36px,6.5vw,56px)] text-[#14101A] leading-[1.15] mt-6 mb-10">
          Cuida tus detalles,
          <br />
          realza tu <span className="text-[#E0407F]">belleza</span> ♡
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 my-8">
          {PILLARS.map((pillar, idx) => (
            <div
              key={pillar.label}
              className={`px-5 py-4 text-center text-sm text-[#14101A] flex flex-col items-center gap-2 ${
                idx > 0 ? 'border-t sm:border-t-0 sm:border-l border-[#E3C77A]' : ''
              }`}
            >
              <pillar.icon className="w-9 h-9 text-[#B8923A]" />
              <span className="font-medium">{pillar.label}</span>
            </div>
          ))}
        </div>

        {/* Cierre de reserva */}
        <div className="pt-8 pb-4">
          <p className="font-script text-[clamp(34px,6vw,52px)] text-[#14101A] mb-5">
            {c('closing_title')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setActiveTab('booking')}
              className="px-8 py-4 bg-[#E0407F] hover:bg-[#C8326D] text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-full shadow-[0_8px_24px_rgba(224,64,127,0.28)] transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0"
            >
              <Calendar className="w-4 h-4" />
              <span>{c('closing_cta_booking')}</span>
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="bj-whatsapp-btn inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-full font-serif font-bold text-lg sm:text-xl text-[#14101A] whitespace-nowrap shrink-0"
            >
              <IconWhatsApp className="w-6 h-6 text-[#14101A] shrink-0" />
              <span>{c('closing_cta_whatsapp')}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
