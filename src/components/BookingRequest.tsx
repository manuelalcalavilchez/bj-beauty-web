import React, { useEffect, useState } from 'react';
import { apiService } from '../data/api';
import { Send, CheckCircle2, Calendar } from 'lucide-react';

interface BookingRequestProps {
  setActiveTab: (tab: string) => void;
}

export const BookingRequest: React.FC<BookingRequestProps> = ({ setActiveTab }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [services, setServices] = useState<Array<{ id: string; name: string; active?: number | boolean }>>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiService.getServices().then((items: any[]) => {
      if (cancelled) return;
      const active = (Array.isArray(items) ? items : []).filter(item => item.active !== 0 && item.active !== false);
      setServices(active);
      setFormData(prev => ({ ...prev, serviceType: active[0]?.id || '' }));
    }).finally(() => { if (!cancelled) setServicesLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    serviceType: '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.clientPhone || !formData.clientEmail) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);

    try {
      // Enviar al servidor
      const response = await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          serviceType: services.find(service => service.id === formData.serviceType)?.name || '',
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStep('success');
        // Reset form después de 3 segundos
        setTimeout(() => {
          setFormData({
            clientName: '',
            clientPhone: '',
            clientEmail: '',
            serviceType: services[0]?.id || '',
            preferredDate: '',
            preferredTime: '',
            notes: ''
          });
        }, 3000);
      } else {
        alert('Error al enviar la solicitud. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error de conexión. Por favor intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#FDEEF3] pb-24 lg:pb-12 px-4 lg:px-12 py-8 flex items-center justify-center">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#2B0F1E] text-[#E0407F] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          
          <div>
            <h1 className="font-display text-3xl font-bold text-[#2B0F1E] mb-2">
              ¡Solicitud Enviada!
            </h1>
            <p className="text-neutral-600 mb-4">
              Hemos recibido tu solicitud de cita. Nos pondremos en contacto contigo para confirmar los detalles.
            </p>
            <p className="text-sm text-neutral-500">
              Utilizaremos los datos de contacto que has facilitado.
            </p>
          </div>



          <button
            onClick={() => setStep('form')}
            className="px-6 py-3 bg-[#2B0F1E] text-[#FDEEF3] text-xs font-bold uppercase rounded-xl hover:bg-[#A32A5F] transition-all"
          >
            Nueva Solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDEEF3] pb-24 lg:pb-12 px-4 lg:px-12 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#E0407F]">Solicita tu cita</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2B0F1E] mt-1">
            Reserva tu Experiencia
          </h1>
          <p className="text-neutral-600 mt-2">
            Cuéntanos qué deseas y nos pondremos en contacto para confirmar tu cita.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#E0407F]/25 p-8 space-y-6">
          {/* Datos Personales */}
          <div className="space-y-4">
            <h2 className="font-semibold text-[#2B0F1E] text-sm uppercase">Tus Datos</h2>
            
            <div>
              <label className="block text-xs font-bold text-[#2B0F1E] mb-2">Nombre *</label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Tu nombre completo"
                required
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2B0F1E] mb-2">Teléfono *</label>
                <input
                  type="tel"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="Tu teléfono"
                  required
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2B0F1E] mb-2">Email *</label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="tu@correo.com"
                  required
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                />
              </div>
            </div>
          </div>

          {/* Preferencias de Cita */}
          <div className="space-y-4 pt-6 border-t border-neutral-200">
            <h2 className="font-semibold text-[#2B0F1E] text-sm uppercase">Tu Cita</h2>
            
            <div>
              <label className="block text-xs font-bold text-[#2B0F1E] mb-2">Tipo de Servicio</label>
              <select name="serviceType" value={formData.serviceType} onChange={handleChange} disabled={servicesLoading || services.length === 0} required className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F] disabled:bg-neutral-100">
                <option value="">{servicesLoading ? 'Cargando servicios…' : 'Selecciona un servicio'}</option>
                {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
              {!servicesLoading && services.length === 0 && <p className="text-xs text-rose-600 mt-2">No hay servicios activos disponibles en el catálogo.</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2B0F1E] mb-2">Fecha Preferida</label>
                <input
                  type="date"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2B0F1E] mb-2">Hora Preferida</label>
                <input
                  type="time"
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B0F1E] mb-2">Notas Especiales</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Cuéntanos si tienes alguna preferencia o necesidad especial..."
                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F] min-h-24"
              />
            </div>
          </div>

          {/* Botón Enviar */}
          <div className="pt-6 border-t border-neutral-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#2B0F1E] hover:bg-[#A32A5F] disabled:opacity-50 text-[#FDEEF3] text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Enviando...' : 'Enviar Solicitud'}</span>
            </button>
          </div>

          <p className="text-xs text-neutral-500 text-center">
            Tu información está protegida y solo será utilizada para confirmar tu cita.
          </p>
        </form>
      </div>
    </div>
  );
};
