import React, { useState } from 'react';
import { CalendarPlus, Search, XCircle, Lock, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../data/api';

type CancellationRequest = { id: string; status: string; reason?: string; createdAt: string; decidedAt?: string; decisionNotes?: string };
type CustomerAppointment = {
  id: string; locator: string; clientName: string; clientPhone: string;
  serviceIds: string[]; addonIds?: string[]; date: string; time: string;
  totalPrice?: number; totalDuration?: number; status: string;
  cancellationRequests?: CancellationRequest[];
};

export const MyBookingsView: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const [locator, setLocator] = useState('');
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setNotice(''); setLoading(true);
    const result: any = await apiService.getCustomerAppointments(locator, phone);
    setLoading(false);
    if (!Array.isArray(result)) { setAppointments([]); setError(result?.error || 'No encontramos citas con esos datos.'); return; }
    setAppointments(result);
  };

  const requestCancellation = async (appt: CustomerAppointment) => {
    if (!window.confirm('¿Enviar una solicitud de cancelación? La cita seguirá confirmada hasta que el salón responda.')) return;
    setRequestingId(appt.id); setError('');
    const result: any = await apiService.requestAppointmentCancellation(appt.id, { locator, phone, reason: reasonById[appt.id] || '' });
    setRequestingId(null);
    if (!result?.success) { setError(result?.error || 'No se pudo enviar la solicitud.'); return; }
    setNotice('Solicitud enviada. La cita sigue confirmada hasta que el salón tome una decisión.');
    const refreshed: any = await apiService.getCustomerAppointments(locator, phone);
    if (Array.isArray(refreshed)) setAppointments(refreshed);
  };

  const downloadCalendar = (appt: CustomerAppointment) => {
    const start = new Date(appt.date + 'T' + appt.time + ':00');
    const end = new Date(start.getTime() + (Math.max(15, Number(appt.totalDuration) || 60) * 60000));
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
    const content = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BJ Beauty//Citas//ES','BEGIN:VEVENT',
      'UID:' + appt.id + '@bjbeauty.local','DTSTAMP:' + fmt(new Date()),'DTSTART:' + fmt(start),'DTEND:' + fmt(end),
      'SUMMARY:Cita - BJ Beauty','DESCRIPTION:Localizador ' + appt.locator,'END:VEVENT','END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'cita_' + appt.locator + '.ics'; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FDEEF3] pb-24 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <span className="text-xs font-bold uppercase tracking-widest text-[#B8923A]">Portal de Cliente</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2B0F1E] mt-2">Mis Citas</h1>
          <p className="text-neutral-600 mt-2">Consulta tus reservas con el localizador y el teléfono facilitado al reservar.</p>
        </header>
        <form onSubmit={lookup} className="bg-white rounded-3xl border border-[#E0407F]/25 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#2B0F1E] font-semibold"><Lock className="w-4 h-4 text-[#B8923A]"/> Verifica tu reserva</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-[#2B0F1E] space-y-2">Localizador
              <input required value={locator} onChange={e => setLocator(e.target.value.toUpperCase())} placeholder="LGN-4821" className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm"/>
            </label>
            <label className="text-xs font-semibold text-[#2B0F1E] space-y-2">Teléfono completo
              <input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono usado al reservar" className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm"/>
            </label>
          </div>
          <button disabled={loading} className="px-6 py-3 bg-[#2B0F1E] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-60 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>} Consultar mis citas
          </button>
          <p className="text-[11px] text-neutral-500">Solo se muestran reservas cuyo localizador y teléfono coinciden.</p>
        </form>
        {error && <div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</div>}
        {notice && <div role="status" className="p-4 rounded-xl bg-[#E0407F]/15 text-[#2B0F1E] text-sm">{notice}</div>}
        {appointments.length > 0 && <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Tus reservas</h2>
          {appointments.map(appt => {
            const latest = appt.cancellationRequests?.[0];
            return <article key={appt.id} className="bg-white rounded-3xl border border-[#E0407F]/30 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono font-bold text-[#A32A5F]">{appt.locator}</span>
                <span className={'px-3 py-1 rounded-full text-[10px] uppercase font-bold ' + (appt.status === 'Confirmada' ? 'bg-[#E0407F]/20 text-[#2B0F1E]' : appt.status === 'Completada' ? 'bg-neutral-100 text-neutral-700' : 'bg-rose-100 text-rose-700')}>{appt.status}</span>
              </div>
              <div><h3 className="font-display text-xl font-bold text-[#2B0F1E]">{appt.clientName}</h3><p className="text-sm text-neutral-600 mt-1">Servicios: {appt.serviceIds.join(', ')}</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FDEEF3] rounded-2xl p-4 text-sm">
                <div><span className="block text-[10px] uppercase text-neutral-500">Fecha</span><strong>{appt.date}</strong></div>
                <div><span className="block text-[10px] uppercase text-neutral-500">Hora</span><strong>{appt.time}</strong></div>
                <div><span className="block text-[10px] uppercase text-neutral-500">Duración</span><strong>{appt.totalDuration || 60} min</strong></div>
                <div><span className="block text-[10px] uppercase text-neutral-500">Importe</span><strong>{Number(appt.totalPrice || 0).toLocaleString('es-ES')} €</strong></div>
              </div>
              {latest && <div className={'rounded-xl p-4 text-sm ' + (latest.status === 'Pendiente' ? 'bg-amber-50 text-amber-900' : latest.status === 'Aceptada' ? 'bg-rose-50 text-rose-800' : 'bg-neutral-100 text-neutral-700')}>
                <strong>Solicitud de cancelación: {latest.status}</strong>
                {latest.status === 'Pendiente' && <p className="mt-1">El salón todavía no ha tomado una decisión. Tu cita sigue confirmada.</p>}
                {latest.status === 'Aceptada' && <p className="mt-1">El salón ha aceptado la cancelación.</p>}
                {latest.status === 'Rechazada' && <p className="mt-1">El salón ha rechazado la solicitud. La cita conserva su estado.</p>}
                {latest.decisionNotes && <p className="mt-1">Respuesta: {latest.decisionNotes}</p>}
              </div>}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                {appt.status === 'Confirmada' && latest?.status !== 'Pendiente' && <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#2B0F1E]">Motivo (opcional)
                    <textarea rows={2} maxLength={500} value={reasonById[appt.id] || ''} onChange={e => setReasonById(prev => ({...prev, [appt.id]: e.target.value}))} className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm" placeholder="Cuéntanos brevemente el motivo…"/>
                  </label>
                  <button type="button" onClick={() => requestCancellation(appt)} disabled={requestingId === appt.id} className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold disabled:opacity-60 flex items-center gap-2">
                    {requestingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4"/>} Solicitar cancelación
                  </button>
                </div>}
                <button type="button" onClick={() => downloadCalendar(appt)} className="px-4 py-2 bg-[#2B0F1E] text-white rounded-xl text-xs font-semibold flex items-center gap-2"><CalendarPlus className="w-4 h-4"/> Añadir al calendario</button>
              </div>
            </article>;
          })}
        </section>}
        <div className="text-center"><button type="button" onClick={() => setActiveTab('booking')} className="text-sm font-semibold text-[#A32A5F] hover:underline">Solicitar una nueva cita</button></div>
      </div>
    </div>
  );
};
