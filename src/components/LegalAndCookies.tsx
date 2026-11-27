import React, { useEffect, useState } from 'react';
import { apiService } from '../data/api';

type LegalConfig = { legalTitular?: string; legalNif?: string; legalAddress?: string; legalEmail?: string; legalPhone?: string; legalRegistry?: string; legalCustomNotice?: string; privacyCustomText?: string; cookiesCustomText?: string };
type LegalKind = 'legal' | 'privacy' | 'cookies';
const CONSENT_KEY = 'bjbeauty_cookie_consent_v1';

export const LegalAndCookies: React.FC = () => {
  const [config, setConfig] = useState<LegalConfig>({});
  const [page, setPage] = useState<LegalKind | null>(null);
  const [banner, setBanner] = useState(false);
  const [preferences, setPreferences] = useState({ necessary: true, analytics: false, marketing: false });
  useEffect(() => {
    apiService.getConfig().then((data: LegalConfig) => setConfig(data || {}));
    const openPrivacy = () => setPage('privacy'); window.addEventListener('bjbeauty:open-privacy', openPrivacy);
    try { if (!localStorage.getItem(CONSENT_KEY)) setBanner(true); } catch { setBanner(true); }
    return () => window.removeEventListener('bjbeauty:open-privacy', openPrivacy);
  }, []);
  const save = (choice: typeof preferences) => {
    const value = { ...choice, necessary: true, savedAt: new Date().toISOString() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
    setPreferences(value); setBanner(false);
  };
  const rows = [
    ['Titular', config.legalTitular], ['NIF/CIF', config.legalNif], ['Domicilio', config.legalAddress],
    ['Email', config.legalEmail], ['Teléfono', config.legalPhone], ['Datos registrales', config.legalRegistry]
  ].filter(([, value]) => typeof value === 'string' && value.trim());
  const heading = page === 'legal' ? 'Aviso Legal' : page === 'privacy' ? 'Política de Privacidad' : 'Política de Cookies';
  return <>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#FDEEF3]/70">
      <button type="button" onClick={() => setPage('legal')} className="hover:text-white underline underline-offset-4">Aviso Legal</button>
      <button type="button" onClick={() => setPage('privacy')} className="hover:text-white underline underline-offset-4">Política de Privacidad</button>
      <button type="button" onClick={() => setPage('cookies')} className="hover:text-white underline underline-offset-4">Política de Cookies</button>
      <button type="button" onClick={() => setBanner(true)} className="hover:text-white underline underline-offset-4">Preferencias de cookies</button>
    </div>
    {page && <div className="fixed inset-0 z-[100] bg-black/60 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={heading}>
      <section className="bg-white text-[#2B0F1E] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex justify-between gap-4 items-center mb-5"><h2 className="font-display text-2xl font-bold">{heading}</h2><button onClick={() => setPage(null)} aria-label="Cerrar" className="text-2xl">×</button></div>
        {page === 'legal' && <><div className="space-y-2 text-sm">{rows.map(([label,value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}</div>{config.legalCustomNotice?.trim() && <p className="mt-4 whitespace-pre-wrap text-sm">{config.legalCustomNotice}</p>}</>}
        {page === 'privacy' && <><p className="text-sm leading-relaxed">Los datos personales facilitados mediante los formularios se utilizan para gestionar solicitudes de cita, atender consultas y mantener la relación con el cliente. La base jurídica es la gestión de la solicitud y, cuando corresponda, el consentimiento. Los datos se conservarán durante el tiempo necesario para atender la solicitud y cumplir las obligaciones legales. Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad contactando con el responsable mediante los datos que figuran en el Aviso Legal.</p>{config.legalEmail?.trim() && <p className="mt-3 text-sm">Contacto de privacidad: {config.legalEmail}</p>}{config.privacyCustomText?.trim() && <p className="mt-4 whitespace-pre-wrap text-sm">{config.privacyCustomText}</p>}</>}
        {page === 'cookies' && <><p className="text-sm leading-relaxed">Este sitio utiliza almacenamiento técnico necesario para recordar las preferencias de consentimiento. Las cookies o tecnologías no necesarias solo deben activarse con tu autorización. Puedes aceptar, rechazar o configurar tus preferencias en cualquier momento desde el enlace del pie de página.</p>{config.cookiesCustomText?.trim() && <p className="mt-4 whitespace-pre-wrap text-sm">{config.cookiesCustomText}</p>}</>}
        <button onClick={() => setPage(null)} className="mt-6 px-5 py-3 rounded-xl bg-[#2B0F1E] text-white text-xs font-bold uppercase">Cerrar</button>
      </section>
    </div>}
    {banner && <div className="fixed bottom-4 left-4 right-4 z-[110] mx-auto max-w-3xl bg-white text-[#2B0F1E] rounded-2xl shadow-2xl border border-[#E0407F]/30 p-5">
      <h3 className="font-display text-lg font-bold">Preferencias de cookies</h3>
      <p className="text-sm mt-1">Utilizamos almacenamiento necesario para el funcionamiento del sitio. Puedes aceptar, rechazar o configurar las categorías opcionales.</p>
      <div className="flex flex-wrap gap-3 mt-3 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked disabled /> Necesarias</label><label className="flex items-center gap-2"><input type="checkbox" checked={preferences.analytics} onChange={e=>setPreferences(p=>({...p,analytics:e.target.checked}))}/> Analítica</label><label className="flex items-center gap-2"><input type="checkbox" checked={preferences.marketing} onChange={e=>setPreferences(p=>({...p,marketing:e.target.checked}))}/> Marketing</label></div>
      <div className="flex flex-wrap gap-2 mt-4"><button onClick={()=>save({necessary:true,analytics:true,marketing:true})} className="px-4 py-2 rounded-lg bg-[#2B0F1E] text-white text-xs font-bold">Aceptar</button><button onClick={()=>save({necessary:true,analytics:false,marketing:false})} className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold">Rechazar</button><button onClick={()=>save(preferences)} className="px-4 py-2 rounded-lg bg-[#E0407F]/15 text-xs font-bold">Guardar preferencias</button><button onClick={()=>{setBanner(false);setPage('cookies')}} className="px-4 py-2 text-xs underline">Más información</button></div>
    </div>}
  </>;
};
