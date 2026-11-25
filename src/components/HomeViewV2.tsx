import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, ArrowRight, Palette, MessageCircle } from 'lucide-react';
import { BJLogo } from './BJLogo';
import { apiService } from '../data/api';

type PublicService = { id: string; name: string; description?: string; shortDescription?: string; duration?: number | null; durationMinutes?: number; price?: number | null; active?: number | boolean; sortOrder?: number; };
type GalleryItem = { id: string; photoBase64?: string; title?: string; caption?: string; };

// Textos por defecto (idénticos a SITE_CONTENT_DEFAULTS de server.js). Staff > Contenidos los sobrescribe.
const DEFAULT_CONTENT: Record<string, string> = {
  hero_kicker: 'BJ Beauty · Estética y Bienestar',
  hero_title: 'Tu belleza,',
  hero_title_highlight: 'nuestra pasión.',
  hero_subtitle: 'Diseño y laminado de cejas · Manicura · Pedicura. Cuida tus detalles, realza tu belleza.',
  hero_cta_booking: 'Solicitar cita',
  hero_cta_instagram: 'WhatsApp 611 296 406',
  services_kicker: 'Servicios',
  services_title: 'Cuida tus detalles',
  services_intro: 'Cejas, manos y pies con la calidad que mereces.',
  services_empty: 'No hay servicios activos publicados.',
  gallery_kicker: 'Galería',
  gallery_title: 'Resultados que enamoran',
  gallery_cta: 'Reservar',
  gallery_empty_title: 'La galería está pendiente de fotografías.',
  gallery_empty_text: 'Añade las imágenes reales desde Staff y aparecerán aquí.',
  closing_title: 'Realza tu belleza.',
  closing_subtitle: 'Calidad en cada servicio · Tu belleza, nuestra prioridad',
  closing_cta_booking: 'Solicitar cita',
  instagram_handle: 'WhatsApp 611 296 406',
  instagram_url: 'https://wa.me/34611296406'
};

interface HomeViewProps { setActiveTab: (tab: string) => void; setSelectedLookStyle?: (styleId: string) => void; }

export const HomeViewV2: React.FC<HomeViewProps> = ({ setActiveTab }) => {
  const [services, setServices] = useState<PublicService[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT);
  const c = (key: string) => content[key] || DEFAULT_CONTENT[key] || '';

  useEffect(() => {
    let cancelled = false;
    apiService.getContent().then(data => {
      if (!cancelled && data?.content) setContent({ ...DEFAULT_CONTENT, ...data.content });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiService.getServices(), apiService.getGallery()]).then(([serviceData, galleryData]) => {
      if (cancelled) return;
      setServices((Array.isArray(serviceData) ? serviceData : []).filter((s: PublicService) => s.active !== 0 && s.active !== false).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
      setGallery(Array.isArray(galleryData) ? galleryData.filter((g: GalleryItem) => Boolean(g.photoBase64)) : []);
    }).catch(() => { if (!cancelled) { setServices([]); setGallery([]); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return <div className="min-h-screen bg-[#FDEEF3] text-[#111111]">
    <section className="relative overflow-hidden bg-[#2B0F1E] text-white px-5 py-16 sm:py-24">
      <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#E0407F]/10 blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[#B8923A]/20 blur-3xl" />
      <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
        <div className="space-y-7">
          <p className="text-[#F27AA8] text-xs font-bold uppercase tracking-[.22em]">{c('hero_kicker')}</p>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05]">{c('hero_title')} <span className="text-[#E0407F]">{c('hero_title_highlight')}</span></h1>
          <p className="max-w-2xl text-base sm:text-lg text-white/80 leading-relaxed">{c('hero_subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setActiveTab('booking')} className="px-7 py-4 bg-[#E0407F] text-[#111111] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#F27AA8] transition-colors flex items-center justify-center gap-2"><Calendar className="w-4 h-4" /> {c('hero_cta_booking')}</button>
            <a href={c('instagram_url')} target="_blank" rel="noreferrer" className="px-7 py-4 border border-[#F27AA8]/70 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4 text-[#F27AA8]" /> {c('hero_cta_instagram')}</a>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end"><div className="bj-glow rounded-full"><BJLogo size={300} className="justify-center text-white" /></div></div>
      </div>
    </section>

    <section id="servicios" className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
      <div className="max-w-2xl mb-10"><p className="text-[#B8923A] text-xs font-bold uppercase tracking-[.2em]">{c('services_kicker')}</p><h2 className="font-display text-3xl sm:text-4xl font-bold text-[#2B0F1E] mt-2">{c('services_title')}</h2><p className="text-[#7A5C6B] mt-3">{c('services_intro')}</p></div>
      {loading ? <p className="text-sm text-[#7A5C6B]">Cargando…</p> : services.length === 0 ? <div className="bg-white border border-[#E0407F]/25 rounded-xl p-7 text-[#7A5C6B]">{c('services_empty')}</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{services.map(s => <article key={s.id} className="bg-white border border-[#E0407F]/25 border-t-4 border-t-[#E0407F] p-6 rounded-xl shadow-sm hover:-translate-y-1 transition-all"><Sparkles className="w-6 h-6 text-[#B8923A] mb-5" /><h3 className="font-display text-xl font-bold text-[#2B0F1E]">{s.name}</h3><p className="text-sm text-[#7A5C6B] mt-3 leading-relaxed">{s.description || s.shortDescription || 'Consulta los detalles de este servicio.'}</p><div className="mt-5 pt-4 border-t border-[#E0407F]/20 flex items-center justify-between gap-3 text-sm"><span className="text-[#7A5C6B]">{Number(s.duration ?? s.durationMinutes) > 0 ? `${Number(s.duration ?? s.durationMinutes)} min` : 'Duración a consultar'}</span><strong className="text-[#2B0F1E]">{s.price != null && s.price !== '' ? `${Number(s.price).toLocaleString('es-ES')} €` : 'Precio a consultar'}</strong></div></article>)}</div>}
    </section>

    <section className="bg-white border-y border-[#E0407F]/15"><div className="max-w-6xl mx-auto px-5 py-16 sm:py-20"><div className="flex items-end justify-between gap-5 mb-10"><div><p className="text-[#B8923A] text-xs font-bold uppercase tracking-[.2em]">{c('gallery_kicker')}</p><h2 className="font-display text-3xl sm:text-4xl font-bold text-[#2B0F1E] mt-2">{c('gallery_title')}</h2></div><button onClick={() => setActiveTab('booking')} className="text-xs font-bold uppercase tracking-widest text-[#A32A5F] flex items-center gap-2">{c('gallery_cta')} <ArrowRight className="w-4 h-4" /></button></div>{gallery.length === 0 ? <div className="min-h-56 flex flex-col items-center justify-center border border-dashed border-[#B8923A]/30 rounded-xl bg-[#FDEEF3] text-center px-6"><Palette className="w-8 h-8 text-[#B8923A] mb-3" /><p className="font-semibold text-[#2B0F1E]">{c('gallery_empty_title')}</p><p className="text-sm text-[#7A5C6B] mt-1">{c('gallery_empty_text')}</p></div> : <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">{gallery.map((g, i) => <figure key={g.id} className={`group overflow-hidden rounded-xl bg-[#FDEEF3] ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}><img src={g.photoBase64} alt={g.title || g.caption || 'Trabajo de BJ Beauty'} loading="lazy" className="w-full h-full min-h-48 object-cover group-hover:scale-105 transition-transform duration-500" /><figcaption className="p-3 text-sm text-[#2B0F1E]">{g.title || g.caption || 'BJ Beauty'}</figcaption></figure>)}</div>}</div></section>

    <section className="bg-[#2B0F1E] text-white px-5 py-16 sm:py-20"><div className="max-w-4xl mx-auto text-center space-y-6"><BJLogo size={84} className="justify-center mx-auto text-white" /><h2 className="font-display text-3xl sm:text-5xl font-bold">{c('closing_title')}</h2><p className="text-white/75 max-w-2xl mx-auto">{c('closing_subtitle')}</p><div className="flex flex-col sm:flex-row justify-center gap-3"><button onClick={() => setActiveTab('booking')} className="px-7 py-4 bg-[#E0407F] text-[#111111] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#F27AA8]">{c('closing_cta_booking')}</button><a href={c('instagram_url')} target="_blank" rel="noreferrer" className="px-7 py-4 border border-white/30 rounded-lg text-xs font-bold uppercase tracking-widest hover:border-[#F27AA8]">{c('instagram_handle')}</a></div></div></section>
  </div>;
};
