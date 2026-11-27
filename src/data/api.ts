// Servicio API para comunicarse con el servidor Express
const API_BASE = '/api';

// ==================== SESIÓN STAFF ====================
// El token lo emite el servidor tras validar el PIN (POST /api/staff/login).
const STAFF_TOKEN_KEY = 'bjbeauty_staff_token';
export const STAFF_UNAUTHORIZED_EVENT = 'bjbeauty:staff-unauthorized';
export const CONFIG_UPDATED_EVENT = 'bjbeauty:config-updated';
export const SERVICES_UPDATED_EVENT = 'bjbeauty:services-updated';

export const normalizeWhatsAppDigits = (raw?: string, fallback = '34611296406'): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return fallback;
  if (digits.length === 9 && /^[6789]/.test(digits)) return `34${digits}`;
  return digits;
};

export const formatPhoneDisplay = (raw?: string, fallback = '611 296 406'): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return fallback;
  const local = digits.startsWith('34') && digits.length === 11 ? digits.slice(2) : digits;
  if (local.length === 9) {
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return String(raw || '').trim() || fallback;
};

export const staffSession = {
  getToken: () => sessionStorage.getItem(STAFF_TOKEN_KEY) || '',
  setToken: (token: string) => sessionStorage.setItem(STAFF_TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(STAFF_TOKEN_KEY)
};

// fetch con el token Staff adjunto (si existe). Un 401 con sesión activa la invalida.
const apiFetch = async (url: string, init: RequestInit = {}) => {
  const token = staffSession.getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && token) {
    staffSession.clear();
    window.dispatchEvent(new Event(STAFF_UNAUTHORIZED_EVENT));
  }
  return res;
};

export interface SiteContentResponse {
  content: Record<string, string>;
  defaults: Record<string, string>;
  updatedAt: string | null;
}

export const apiService = {
  // STAFF
  async staffLogin(pin: string): Promise<{ success?: boolean; token?: string; error?: string; retryAfter?: number; remaining?: number }> {
    try {
      const res = await fetch(`${API_BASE}/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.token) {
        staffSession.setToken(data.token);
        return { success: true };
      }
      return { error: data?.error || 'No se pudo iniciar sesión', retryAfter: data?.retryAfter, remaining: data?.remaining };
    } catch (err) {
      console.error('Error en login Staff:', err);
      return { error: 'No se pudo contactar con el servidor' };
    }
  },

  async staffCheckSession(): Promise<boolean> {
    if (!staffSession.getToken()) return false;
    try {
      const res = await apiFetch(`${API_BASE}/staff/session`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async staffLogout() {
    try {
      if (staffSession.getToken()) await apiFetch(`${API_BASE}/staff/logout`, { method: 'POST' });
    } catch { /* la sesión local se elimina igualmente */ }
    staffSession.clear();
  },

  // CONTENIDOS
  async getContent(): Promise<SiteContentResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/content`);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.error('Error fetching content:', err);
      return null;
    }
  },

  async updateContent(content: Record<string, string>): Promise<(SiteContentResponse & { success?: boolean; error?: string }) | { error: string }> {
    try {
      const res = await apiFetch(`${API_BASE}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      return res.json();
    } catch (err) {
      console.error('Error updating content:', err);
      return { error: 'No se pudo contactar con el servidor' };
    }
  },

  // CRM
  async getCrmCustomers() {
    try { const res = await apiFetch(`${API_BASE}/crm/customers`); return res.ok ? res.json() : []; }
    catch (err) { return []; }
  },
  async saveCrmCustomer(customer: any) {
    try {
      const res = await apiFetch(`${API_BASE}/crm/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer) });
      const data = await res.json(); return res.ok ? data : { error: data.error || 'No se pudo guardar el cliente.' };
    } catch (err) { return { error: 'No se pudo conectar con el servidor.' }; }
  },
  async getCrmInvoices() {
    try { const res = await apiFetch(`${API_BASE}/crm/invoices`); return res.ok ? res.json() : []; }
    catch (err) { return []; }
  },
  async createCrmInvoice(invoice: any) {
    try {
      const res = await apiFetch(`${API_BASE}/crm/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice) });
      const data = await res.json(); return res.ok ? data : { error: data.error || 'No se pudo crear la factura.' };
    } catch (err) { return { error: 'No se pudo conectar con el servidor.' }; }
  },
  async updateCrmInvoiceStatus(id: string, status: string) {
    try {
      const res = await apiFetch(`${API_BASE}/crm/invoices/${encodeURIComponent(id)}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await res.json(); return res.ok ? data : { error: data.error || 'No se pudo actualizar la factura.' };
    } catch (err) { return { error: 'No se pudo conectar con el servidor.' }; }
  },

  // CITAS
  async getAppointments() {
    try {
      const res = await apiFetch(`${API_BASE}/appointments`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching appointments:', err);
      return [];
    }
  },

  async createAppointment(appointment: any) {
    try {
      const res = await apiFetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      return res.json();
    } catch (err) {
      console.error('Error creating appointment:', err);
      return { error: err };
    }
  },

  async updateAppointment(id: string, data: any) {
    try {
      const res = await apiFetch(`${API_BASE}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating appointment:', err);
      return { error: err };
    }
  },

  async deleteAppointment(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/appointments/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      return { error: err };
    }
  },

  // PORTAL CLIENTE Y SOLICITUDES DE CANCELACIÓN
  async getCustomerAppointments(locator: string, phone: string) {
    try {
      const params = new URLSearchParams({ locator, phone });
      const res = await fetch(`${API_BASE}/customer/appointments?${params.toString()}`);
      const data = await res.json();
      return res.ok ? data : { error: data.error || 'No se pudieron consultar las citas.' };
    } catch (err) { return { error: 'No se pudo conectar con el servidor.' }; }
  },

  async requestAppointmentCancellation(id: string, data: { locator: string; phone: string; reason: string }) {
    try {
      const res = await fetch(`${API_BASE}/customer/appointments/${encodeURIComponent(id)}/cancellation-requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      const result = await res.json();
      return res.ok ? result : { error: result.error || 'No se pudo enviar la solicitud.' };
    } catch (err) { return { error: 'No se pudo conectar con el servidor.' }; }
  },

  async getCancellationRequests() {
    try {
      const res = await apiFetch(`${API_BASE}/cancellation-requests`);
      return res.ok ? res.json() : [];
    } catch (err) { return []; }
  },

  async decideCancellationRequest(id: string, decision: 'Aceptada' | 'Rechazada', decisionNotes = '') {
    try {
      const res = await apiFetch(`${API_BASE}/cancellation-requests/${encodeURIComponent(id)}/decision`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decisionNotes })
      });
      const result = await res.json();
      return res.ok ? result : { error: result.error || 'No se pudo guardar la decisión.' };
    } catch (err) { return { error: 'No se pudo conectar con el servidor.' }; }
  },

  // DISEÑOS
  async getDesigns() {
    try {
      const res = await apiFetch(`${API_BASE}/designs`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching designs:', err);
      return [];
    }
  },

  async createDesign(design: any) {
    try {
      const res = await apiFetch(`${API_BASE}/designs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(design)
      });
      return res.json();
    } catch (err) {
      console.error('Error creating design:', err);
      return { error: err };
    }
  },

  async updateDesign(id: string, data: any) {
    try {
      const res = await apiFetch(`${API_BASE}/designs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating design:', err);
      return { error: err };
    }
  },

  async deleteDesign(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/designs/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting design:', err);
      return { error: err };
    }
  },

  // CONFIGURACIÓN
  async getConfig() {
    try {
      const res = await apiFetch(`${API_BASE}/config`);
      return res.json();
    } catch (err) {
      console.error('Error fetching config:', err);
      return {};
    }
  },

  async updateConfig(config: any) {
    try {
      const res = await apiFetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data?.success) {
        window.dispatchEvent(new Event(CONFIG_UPDATED_EVENT));
      }
      return data;
    } catch (err) {
      console.error('Error updating config:', err);
      return { error: err };
    }
  },

  // SERVICIOS
  async getServices() {
    try {
      const res = await apiFetch(`${API_BASE}/services`);
      return res.json();
    } catch (err) {
      console.error('Error fetching services:', err);
      return [];
    }
  },

  async createService(service: any) {
    try {
      const res = await apiFetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      });
      const data = await res.json();
      if (data?.success) window.dispatchEvent(new Event(SERVICES_UPDATED_EVENT));
      return data;
    } catch (err) {
      console.error('Error creating service:', err);
      return { error: err };
    }
  },

  async updateService(id: string, service: any) {
    try {
      const res = await apiFetch(`${API_BASE}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      });
      const data = await res.json();
      if (data?.success) window.dispatchEvent(new Event(SERVICES_UPDATED_EVENT));
      return data;
    } catch (err) {
      console.error('Error updating service:', err);
      return { error: err };
    }
  },

  async deleteService(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/services/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data?.success) window.dispatchEvent(new Event(SERVICES_UPDATED_EVENT));
      return data;
    } catch (err) {
      console.error('Error deleting service:', err);
      return { error: err };
    }
  },

  // ESPECIALISTAS
  async getSpecialists() {
    try {
      const res = await apiFetch(`${API_BASE}/specialists`);
      return res.json();
    } catch (err) {
      console.error('Error fetching specialists:', err);
      return [];
    }
  },

  async createSpecialist(specialist: any) {
    try {
      const res = await apiFetch(`${API_BASE}/specialists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialist)
      });
      return res.json();
    } catch (err) {
      console.error('Error creating specialist:', err);
      return { error: err };
    }
  },

  async updateSpecialist(id: string, specialist: any) {
    try {
      const res = await apiFetch(`${API_BASE}/specialists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialist)
      });
      return res.json();
    } catch (err) {
      console.error('Error updating specialist:', err);
      return { error: err };
    }
  },

  async deleteSpecialist(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/specialists/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting specialist:', err);
      return { error: err };
    }
  },

  // GALERÍA
  async getGallery() {
    try {
      const res = await apiFetch(`${API_BASE}/gallery`);
      return res.json();
    } catch (err) {
      console.error('Error fetching gallery:', err);
      return [];
    }
  },

  async uploadPhoto(photo: any) {
    try {
      const res = await apiFetch(`${API_BASE}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photo)
      });
      return res.json();
    } catch (err) {
      console.error('Error uploading photo:', err);
      return { error: err };
    }
  },

  async deletePhoto(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/gallery/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting photo:', err);
      return { error: err };
    }
  },

  // SOLICITUDES DE CITA
  async submitBookingRequest(request: any) {
    try {
      const res = await apiFetch(`${API_BASE}/booking-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      return res.json();
    } catch (err) {
      console.error('Error submitting booking request:', err);
      return { error: err };
    }
  },

  async getBookingRequests() {
    try {
      const res = await apiFetch(`${API_BASE}/booking-requests`);
      return res.json();
    } catch (err) {
      console.error('Error fetching booking requests:', err);
      return [];
    }
  },

  async updateBookingRequest(id: string, status: string) {
    try {
      const res = await apiFetch(`${API_BASE}/booking-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return res.json();
    } catch (err) {
      console.error('Error updating booking request:', err);
      return { error: err };
    }
  },

  async deleteBookingRequest(id: string) {
    try {
      const res = await apiFetch(`${API_BASE}/booking-requests/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    } catch (err) {
      console.error('Error deleting booking request:', err);
      return { error: err };
    }
  },

  // SALUD
  async checkHealth() {
    try {
      const res = await apiFetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
};
