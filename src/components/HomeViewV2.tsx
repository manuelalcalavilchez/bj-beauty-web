import React, { useEffect, useState } from 'react';
import { apiService } from '../data/api';
import { IconBrows, IconManicure, IconPedicure, IconLotus, IconDiamond, IconHeartOutline, IconProps } from './BeautyIcons';
import { BJLogo } from './BJLogo';

type PublicService = {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  duration?: number | null;
  durationMinutes?: number;
  price?: number | null;
  active?: number | boolean;
  sortOrder?: number;
  category?: string;
};

type GalleryItem = { id: string; photoBase64?: string; title?: string; caption?: string; };

const DEFAULT_CONTENT: Record<string, string> = {
  hero_kicker: 'BJ Beauty',
  hero_title: 'TU BELLEZA, NUESTRA PASIÓN',
  hero_subtitle: 'Cuida tus detalles, realza tu belleza',
  hero_cta_booking: 'Solicitar cita',
  hero_cta_whatsapp: 'WhatsApp 611 296 406',
  services_kicker: 'Servicios',
  services_title: 'Cuida tus detalles',
  services_subtitle: 'Uñas · Pedicura · Diseño de Cejas',
  services_empty: 'No hay servicios activos publicados.',
  gallery_kicker: 'Galería',
  gallery_title: 'Resultados que enamoran',
  gallery_cta: 'Reservar',
  gallery_empty_title: 'La galería está pendiente de fotografías.',
  gallery_empty_text: 'Añade las imágenes reales desde Staff y aparecerán aquí.',
  closing_title: 'Realza tu belleza.',
  closing_subtitle: 'Calidad en cada servicio · Tu belleza, nuestra prioridad',
  closing_cta_booking: 'Solicitar cita',
  closing_cta_whatsapp: 'WhatsApp 611 296 406',
  instagram_handle: 'WhatsApp 611 296 406',
  instagram_url: 'https://wa.me/34611296406',
};

const PILLARS: { icon: React.ComponentType<IconProps>; label: string }[] = [
  { icon: IconLotus, label: 'Calidad en cada servicio' },
  { icon: IconDiamond, label: 'Resultados que enamoran' },
  { icon: IconHeartOutline, label: 'Tu belleza, nuestra prioridad' },
];

const iconByCategory: Record<string, React.ComponentType<IconProps>> = {
  cejas: IconBrows,
  manicura: IconManicure,
  pedicura: IconPedicure,
};

export const HomeViewV2: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const [services, setServices] = useState<PublicService[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT);
  const c = (key: string) => content[key] || DEFAULT_CONTENT[key] || '';

  useEffect(() => {
    let cancelled = false;
    apiService.getContent().then((data) => {
      if (!cancelled && data?.content) setContent({ ...DEFAULT_CONTENT, ...data.content });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiService.getServices(), apiService.getGallery()]).then(([serviceData, galleryData]) => {
      if (cancelled) return;
      setServices((Array.isArray(serviceData) ? serviceData : []).filter((s) => s.active !== 0 && s.active !== false).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
      setGallery(Array.isArray(galleryData) ? galleryData.filter((g) => Boolean(g.photoBase64)) : []);
    }).catch(() => { if (!cancelled) { setServices([]); setGallery([]); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#FCE8F0] text-[#141414]">
      <section className="relative overflow-hidden bg-[#2B0F1E] text-white px-5 py-16 sm:py-24">
        <div className="flor flor-1" />
        <div className="flor flor-2" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,rgba(232,62,140,.10),transparent_60%)]" />
        <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="font-script text-5xl leading-none">BJ Beauty</span>
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F6B8D0] text-[#141414]">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
              </span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="h-[2px] w-14 bg-[#C59B27]/60" />
              <span className="font-serif text-xs uppercase tracking-[.4em] text-white/70">ESTÉTICA Y BIENESTAR</span>
              <span className="h-[2px] w-14 bg-[#C59B27]/60" />
            </div>
            <h1 className="mt-4 font-serif text-3xl sm:text-5xl lg:text-6xl leading-[1.05]">
              {c('hero_title')}
              <span className="ml-2 font-script text-5xl sm:text-6xl lg:text-7xl leading-none leading-tight text-[#F27AA8]">·</span>
            </h1>
            <div className="mt-3 flex justify-center">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#E83E8C]">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
              </span>
            </div>
            <p className="mt-5 font-script text-base sm:text-lg leading-relaxed text-[#F27AA8]">
              {c('hero_subtitle')}
              <span className="signature-underline">
                <span className="signature-line" />
                <span className="signature-heart">
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
                </span>
              </span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <span className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white">{c('hero_title')}</span>
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#E83E8C]">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
              </span>
            </div>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button onClick={() => setActiveTab('booking')} className="px-7 py-4 bg-[#E0407F] text-[#141414] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#F27AA8] transition-colors flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#F6B8D0] flex items-center justify-center">
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-[#141414]" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
                </span>
                {c('hero_cta_booking')}
              </button>
              <a href={c('instagram_url')} target="_blank" rel="noreferrer" className="px-7 py-4 border border-[#F27AA8]/70 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#141411] flex items-center justify-center">
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
                </span>
                {c('hero_cta_whatsapp')}
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="bj-glow rounded-full">
              <BJLogo variant="full" size={300} className="justify-center text-white" />
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
        <div className="max-w-2xl mb-10">
          <p className="font-serif text-xs font-bold uppercase tracking-[.2em] text-[#C59B27]">{c('services_kicker')}</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#141414] mt-2">{c('services_title')}</h2>
          <p className="text-sm text-[#7A5C6B] mt-2">{c('services_subtitle')}</p>
        </div>
        {loading ? <p className="text-sm text-[#7A5C6B]">Cargando…</p> : services.length === 0 ? (
          <div className="bg-white border border-[#E0407F]/25 rounded-xl p-7 text-[#7A5C6B]">{c('services_empty')}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => {
              const Icon = (() => {
                if (s.category === 'manicura') return IconManicure;
                if (s.category === 'pedicura') return IconPedicure;
                return IconBrows;
              })();
              return (
                <article key={s.id} className="bg-white border border-[#E0407F]/25 border-t-4 border-t-[#E0407F] p-6 rounded-xl shadow-sm hover:-translate-y-1 transition-all">
                  <div className="medallion">
                    <Icon />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#141414] mt-4">{s.name}</h3>
                  <p className="text-sm text-[#7A5C6B] mt-3 leading-relaxed">{s.description || s.shortDescription || 'Consulta los detalles de este servicio.'}</p>
                  <div className="mt-5 pt-4 border-t border-[#E0407F]/20 flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#7A5C6B]">{Number(s.duration ?? s.durationMinutes) > 0 ? `${Number(s.duration ?? s.durationMinutes)} min` : 'Duración a consultar'}</span>
                    <strong className="text-[#141414]">{s.price != null && typeof s.price === 'number' ? `${Number(s.price).toLocaleString('es-ES')} €` : 'Precio a consultar'}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white/70 border-y border-[#E0407F]/15">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <div className="text-center">
            <p className="font-serif text-xs font-bold uppercase tracking-[.2em] text-[#C59B27]">Confianza</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#141414] mt-2">Pilares de la marca</h2>
            <p className="font-script text-sm text-[#7A5C6B] mt-1">{c('closing_subtitle')}</p>
          </div>
          <ul className="pillars flex-column flex-wrap justify-center gap-8 sm:gap-0">
            {PILLARS.map((p) => (
              <li key={p.label} className="pillar flex items-center gap-3 px-5 py-6 sm:px-0">
                <div className="w-12 h-12 rounded-full bg-[#F6B8D0] flex items-center justify-center">
                  <p.icon />
                </div>
                <span className="font-serif text-sm text-[#141414]">{p.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={() => setActiveTab('booking')} className="px-7 py-4 bg-[#E0407F] text-[#141414] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#F27AA8] transition-colors flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#F6B8D0] flex items-center justify-center">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-[#141414]" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
              </span>
              {c('closing_cta_booking')}
            </button>
            <a href={c('instagram_url')} target="_blank" rel="noreferrer" className="px-7 py-4 border border-[#F27AA8]/70 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#141411] flex items-center justify-center">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
              </span>
              {c('closing_cta_whatsapp')}
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#2B0F1E] text-white px-5 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <BJLogo variant="full" size={84} className="justify-center mx-auto text-white" />
          <h2 className="font-serif text-3xl sm:text-5xl font-bold">{c('closing_title')}</h2>
          <p className="text-white/75 max-w-2xl mx-auto">{c('closing_subtitle')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={() => setActiveTab('booking')} className="px-7 py-4 bg-[#E0407F] text-[#141414] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#F27AA8] transition-colors flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#F6B8D0] flex items-center justify-center">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-[#141414]" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
              </span>
              {c('closing_cta_booking')}
            </button>
            <a href={c('instagram_url')} target="_blank" rel="noreferrer" className="px-7 py-4 border border-white/30 font-bold text-xs uppercase tracking-widest rounded-lg hover:border-[#F27AA8] transition-colors flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full bg-[#141411] flex items-center justify-center">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white" aria-hidden="true"><path d="M32 47 C20 37 6 25 6 15 C6 9 10 5 16 5 C22 5 26 7 32 21 C38 7 42 5 48 5 C54 5 58 9 58 15 C58 25 44 37 32 47 Z" /><path d="M32 15 L32 38" strokeWidth="1.8" opacity="0.6" /></svg>
              </span>
              {c('instagram_handle')}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
