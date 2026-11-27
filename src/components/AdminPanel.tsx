import React, { useState, useEffect } from 'react';
import { Calendar, Users, Palette, CheckCircle2, Clock, XCircle, Phone, Sparkles, Filter, Plus, Eye, BookmarkPlus, Lock, LogOut, Settings, Image, FileText, Trash2, Edit2, Save, X, RotateCcw, Search, Receipt, Printer, UserPlus, Upload } from 'lucide-react';
import { Appointment, CustomDesign, NailCatalogStyle } from '../types';
import { apiService, staffSession, STAFF_UNAUTHORIZED_EVENT } from '../data/api';
import { BJLogo } from './BJLogo';
import { LOGO_ICON_OPTIONS, SERVICE_ICON_OPTIONS, isCustomIconImage, renderBeautyIcon } from './BeautyIcons';

// La autenticación Staff se valida en el servidor (POST /api/staff/login). Aquí solo se guarda el token de sesión.

// Campos editables en Staff > Contenidos (las claves coinciden con SITE_CONTENT_DEFAULTS en server.js)
const CONTENT_SECTIONS: Array<{ title: string; description: string; fields: Array<{ key: string; label: string; multiline?: boolean }> }> = [
  {
    title: 'Portada',
    description: 'Cabecera principal de la página de inicio.',
    fields: [
      { key: 'hero_kicker', label: 'Antetítulo' },
      { key: 'hero_title', label: 'Titular' },
      { key: 'hero_title_highlight', label: 'Titular destacado (en rosa)' },
      { key: 'hero_subtitle', label: 'Subtítulo', multiline: true },
      { key: 'hero_cta_booking', label: 'Botón de cita' },
      { key: 'hero_cta_instagram', label: 'Texto del botón de contacto' }
    ]
  },
  {
    title: 'Servicios',
    description: 'Encabezado del bloque de servicios (las fichas se editan en la pestaña Servicios).',
    fields: [
      { key: 'services_kicker', label: 'Antetítulo' },
      { key: 'services_title', label: 'Título' },
      { key: 'services_intro', label: 'Texto introductorio', multiline: true },
      { key: 'services_empty', label: 'Mensaje sin servicios' }
    ]
  },
  {
    title: 'Galería',
    description: 'Encabezado del bloque de galería (las fotos se gestionan en la pestaña Galería).',
    fields: [
      { key: 'gallery_kicker', label: 'Antetítulo' },
      { key: 'gallery_title', label: 'Título' },
      { key: 'gallery_cta', label: 'Enlace al Atelier' },
      { key: 'gallery_empty_title', label: 'Título sin fotos' },
      { key: 'gallery_empty_text', label: 'Texto sin fotos', multiline: true }
    ]
  },
  {
    title: 'Cierre',
    description: 'Bloque final de la página de inicio.',
    fields: [
      { key: 'closing_title', label: 'Título' },
      { key: 'closing_subtitle', label: 'Subtítulo' },
      { key: 'closing_cta_booking', label: 'Botón de cita' }
    ]
  },
  {
    title: 'Redes sociales',
    description: 'Botón de contacto (WhatsApp) de la portada.',
    fields: [
      { key: 'instagram_handle', label: 'Texto del botón de WhatsApp' },
      { key: 'instagram_url', label: 'Enlace de WhatsApp (https://wa.me/34…)' }
    ]
  }
];

interface SalonConfig {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  whatsapp: string;
  logo: string;
  coverPhoto: string;
  calendarPublic: boolean;
  workingHours: Array<{ day: string; open: string; close: string; enabled: boolean }>;
  blockedSlots: string[];
  vacations: string[];
  nailShapes: string[];
  nailLengths: string[];
  nailStyles: string[];
  products: string[];
  legalTitular: string; legalNif: string; legalAddress: string; legalEmail: string; legalPhone: string;
  legalRegistry: string; legalCustomNotice: string; privacyCustomText: string; cookiesCustomText: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
}

interface AdminPanelProps {
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  customDesigns: CustomDesign[];
  setCustomDesigns: React.Dispatch<React.SetStateAction<CustomDesign[]>>;
  catalogStyles?: NailCatalogStyle[];
  setCatalogStyles?: React.Dispatch<React.SetStateAction<NailCatalogStyle[]>>;
  onAddToCatalog?: (design: CustomDesign) => void;
}

const DEFAULT_WORKING_HOURS = [
  { day: 'Lunes', open: '09:00', close: '19:00', enabled: true },
  { day: 'Martes', open: '09:00', close: '19:00', enabled: true },
  { day: 'Miércoles', open: '09:00', close: '19:00', enabled: true },
  { day: 'Jueves', open: '09:00', close: '19:00', enabled: true },
  { day: 'Viernes', open: '09:00', close: '19:00', enabled: true },
  { day: 'Sábado', open: '09:00', close: '13:00', enabled: true },
  { day: 'Domingo', open: '10:00', close: '14:00', enabled: false }
];

const DEFAULT_CONFIG: SalonConfig = {
  name: 'BJ Beauty',
  description: 'Estética y Bienestar · Diseño y laminado de cejas · Manicura · Pedicura · Tu belleza, nuestra pasión',
  phone: '611296406',
  email: '',
  address: '',
  hours: '',
  whatsapp: '34611296406',
  logo: 'crown',
  coverPhoto: '',
  calendarPublic: true,
  workingHours: DEFAULT_WORKING_HOURS,
  blockedSlots: [],
  vacations: [],
  nailShapes: [],
  nailLengths: [],
  nailStyles: [],
  products: [],
  legalTitular: '', legalNif: '', legalAddress: '', legalEmail: '', legalPhone: '', legalRegistry: '', legalCustomNotice: '', privacyCustomText: '', cookiesCustomText: '',
  colors: {
    primary: '#2B0F1E',
    accent: '#E0407F',
    background: '#FDEEF3'
  }
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  appointments,
  setAppointments,
  customDesigns,
  setCustomDesigns,
  catalogStyles,
  setCatalogStyles,
  onAddToCatalog
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(staffSession.getToken()));
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [pinLoading, setPinLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'contenidos' | 'galeria' | 'servicios' | 'especialistas' | 'agenda' | 'designs' | 'requests' | 'cancellations' | 'crm'>('config');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [selectedDesignModal, setSelectedDesignModal] = useState<CustomDesign | null>(null);

  // Cabina Staff: la API/SQLite es la fuente de verdad. localStorage queda fuera de la persistencia operativa.
  const [salonConfig, setSalonConfig] = useState<SalonConfig>(DEFAULT_CONFIG);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryIds, setGalleryIds] = useState<string[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
  const [crmInvoices, setCrmInvoices] = useState<any[]>([]);
  const [crmSection, setCrmSection] = useState<'clientes' | 'facturas'>('clientes');
  const [crmSearch, setCrmSearch] = useState('');
  const [customerForm, setCustomerForm] = useState<any>({ name: '', phone: '', email: '', taxId: '', address: '', postalCode: '', city: '', notes: '' });
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<any>({ customerId: '', issuerName: '', issuerTaxId: '', issuerAddress: '', issuerPostalCode: '', issuerCity: '', issuerEmail: '', customerName: '', customerTaxId: '', customerAddress: '', customerPostalCode: '', customerCity: '', customerEmail: '', description: 'Servicios de manicura', quantity: 1, unitPrice: 0, taxRate: 21, issueDate: new Date().toISOString().slice(0, 10), status: 'Borrador', paymentMethod: '', notes: '' });
  const [crmMessage, setCrmMessage] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [confirmingRequest, setConfirmingRequest] = useState<any | null>(null);
  const [confirmServices, setConfirmServices] = useState<string[]>([]);
  const [confirmAddons, setConfirmAddons] = useState<string[]>([]);
  const [confirmSpecialist, setConfirmSpecialist] = useState<string>("any");

  // Contenidos de la web
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});
  const [savedContent, setSavedContent] = useState<Record<string, string>>({});
  const [contentDefaults, setContentDefaults] = useState<Record<string, string>>({});
  const [contentUpdatedAt, setContentUpdatedAt] = useState<string | null>(null);
  const [contentSaving, setContentSaving] = useState<boolean>(false);
  const [contentMessage, setContentMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const applyContentResponse = (data: { content?: Record<string, string>; defaults?: Record<string, string>; updatedAt?: string | null } | null) => {
    if (!data?.content) return;
    setSiteContent(data.content);
    setSavedContent(data.content);
    setContentDefaults(data.defaults || {});
    setContentUpdatedAt(data.updatedAt ?? null);
  };

  const contentDirty = Object.keys(siteContent).some(key => (siteContent[key] ?? '') !== (savedContent[key] ?? ''));

  const saveSiteContent = async () => {
    setContentSaving(true);
    setContentMessage(null);
    const result: any = await apiService.updateContent(siteContent);
    setContentSaving(false);
    if (result?.success) {
      applyContentResponse(result);
      setContentMessage({ type: 'ok', text: 'Contenidos guardados. Ya se muestran en la web.' });
    } else {
      setContentMessage({ type: 'error', text: result?.error || 'No se pudieron guardar los contenidos.' });
    }
  };

  const reloadCancellationRequests = async () => {
    const data = await apiService.getCancellationRequests();
    setCancellationRequests(Array.isArray(data) ? data : []);
  };

  const decideCancellation = async (id: string, decision: 'Aceptada' | 'Rechazada') => {
    const action = decision === 'Aceptada' ? 'aceptar la cancelación y liberar el horario' : 'rechazar la solicitud y mantener la cita';
    if (!window.confirm('¿Confirmas ' + action + '?')) return;
    const result = await apiService.decideCancellationRequest(id, decision);
    if (result?.success) { await reloadCancellationRequests(); await reloadStaffData(); }
    else alert(result?.error || 'No se pudo guardar la decisión.');
  };

  const reloadBookingRequests = async () => {
    const data = await apiService.getBookingRequests();
    setBookingRequests(Array.isArray(data) ? data : []);
  };

  const reloadStaffData = async () => {
    setIsLoadingData(true);
    try {
      const [config, apiServices, apiSpecialists, gallery, requests, apiAppointments, apiDesigns, content, cancellations, customers, invoices] = await Promise.all([
        apiService.getStaffConfig(),
        apiService.getServices(),
        apiService.getSpecialists(),
        apiService.getGallery(),
        apiService.getBookingRequests(),
        apiService.getAppointments(),
        apiService.getDesigns(),
        apiService.getContent(),
        apiService.getCancellationRequests(),
        apiService.getCrmCustomers(),
        apiService.getCrmInvoices()
      ]);

      // Citas y diseños son datos privados: solo se obtienen con sesión Staff válida
      setAppointments(Array.isArray(apiAppointments) ? apiAppointments : []);
      setCustomDesigns(Array.isArray(apiDesigns) ? apiDesigns : []);
      applyContentResponse(content);

      if (config && config.id) {
        const parseArray = (value: unknown, fallback: any[] = []) => {
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; }
          }
          return fallback;
        };
        const loaded: SalonConfig = {
          ...DEFAULT_CONFIG,
          ...config,
          logo: !config.logo || config.logo === '/assets/logo.jpg' ? 'crown' : config.logo,
          calendarPublic: config.calendarPublic !== 0,
          workingHours: (() => { const configured = parseArray(config.workingHours); return configured.length ? configured : DEFAULT_WORKING_HOURS; })(),
          blockedSlots: parseArray(config.blockedSlots),
          vacations: parseArray(config.vacations),
          nailShapes: parseArray(config.nailShapes, DEFAULT_CONFIG.nailShapes),
          nailLengths: parseArray(config.nailLengths, DEFAULT_CONFIG.nailLengths),
          nailStyles: parseArray(config.nailStyles, DEFAULT_CONFIG.nailStyles),
          products: parseArray(config.products),
          colors: {
            primary: config.primaryColor || DEFAULT_CONFIG.colors.primary,
            accent: config.accentColor || DEFAULT_CONFIG.colors.accent,
            background: config.backgroundColor || DEFAULT_CONFIG.colors.background
          }
        };
        setSalonConfig(loaded);
        setEditingConfig(loaded);
      } else {
        setEditingConfig(DEFAULT_CONFIG);
      }

      setServices(Array.isArray(apiServices) ? apiServices : []);
      setSpecialists(Array.isArray(apiSpecialists) ? apiSpecialists : []);
      setGalleryPhotos(Array.isArray(gallery) ? gallery.map((g: any) => g.photoBase64).filter(Boolean) : []);
      setGalleryIds(Array.isArray(gallery) ? gallery.map((g: any) => g.id) : []);
      setBookingRequests(Array.isArray(requests) ? requests : []);
      setCancellationRequests(Array.isArray(cancellations) ? cancellations : []);
      setCrmCustomers(Array.isArray(customers) ? customers : []);
      setCrmInvoices(Array.isArray(invoices) ? invoices : []);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Verifica la sesión contra el servidor antes de cargar datos privados
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    apiService.staffCheckSession().then(valid => {
      if (cancelled) return;
      if (valid) reloadStaffData();
      else setIsAuthenticated(false);
    });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Si el servidor rechaza el token (caducado/revocado), se vuelve a pedir el PIN
  useEffect(() => {
    const onUnauthorized = () => {
      setIsAuthenticated(false);
      setPinError('La sesión ha caducado. Vuelve a introducir el PIN.');
    };
    window.addEventListener(STAFF_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(STAFF_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Edit states
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editingSpecialist, setEditingSpecialist] = useState<any | null>(null);
  const [editingConfig, setEditingConfig] = useState<SalonConfig>(DEFAULT_CONFIG);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinLoading) return;
    setPinLoading(true);
    const result = await apiService.staffLogin(pinInput);
    setPinLoading(false);
    setPinInput('');
    if (result.success) {
      setPinError('');
      setIsAuthenticated(true);
    } else {
      const suffix = result.retryAfter
        ? ` Espera ${Math.ceil(result.retryAfter / 60)} min.`
        : typeof result.remaining === 'number' ? ` Intentos restantes: ${result.remaining}.` : '';
      setPinError(`${result.error || 'PIN incorrecto.'}${suffix}`);
    }
  };

  const handleLogout = async () => {
    await apiService.staffLogout();
    setIsAuthenticated(false);
    // No dejar datos privados en memoria tras cerrar sesión
    setAppointments([]);
    setCustomDesigns([]);
    setBookingRequests([]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      const id = `gallery_${Date.now()}`;
      const saved = await apiService.uploadPhoto({
        id,
        photoBase64: result,
        title: '',
        caption: ''
      });
      if (saved?.success) {
        setGalleryPhotos(prev => [result, ...prev]);
        setGalleryIds(prev => [id, ...prev]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfigImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'coverPhoto') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setEditingConfig(prev => ({ ...prev, [field]: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const readIconFile = (file: File | undefined, onLoad: (dataUrl: string) => void) => {
    if (!file) return;
    if (file.size > 1500000) {
      alert('La imagen del icono no debe superar 1,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onLoad(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleQuickServiceIconChange = async (svc: any, nextIcon: string) => {
    const updated = { ...svc, icon: nextIcon };
    const saved = await apiService.updateService(svc.id, updated);
    if (saved?.success) {
      setServices(prev => prev.map(s => s.id === svc.id ? updated : s));
      if (editingService?.id === svc.id) {
        setEditingService(updated);
      }
    } else {
      alert('No se pudo actualizar el icono del servicio.');
    }
  };

  const addService = async () => {
    const newService = {
      id: `s${Date.now()}`,
      name: 'Nuevo Servicio',
      duration: null,
      price: null,
      description: '',
      shortDescription: '',
      longDescription: '',
      category: 'diseno_personalizado',
      icon: 'sparkles',
      featured: false,
      sortOrder: services.length + 1,
      instagramSource: ''
    };
    const saved = await apiService.createService(newService);
    if (saved?.success) {
      setServices(prev => [newService, ...prev]);
      setEditingService(newService);
    }
  };

  const addSpecialist = async () => {
    const newSpecialist = {
      id: `sp${Date.now()}`,
      name: 'Nueva especialista',
      role: 'Esteticista',
      photo: '💅',
      description: ''
    };
    const saved = await apiService.createSpecialist(newSpecialist);
    if (saved?.success) {
      setSpecialists(prev => [newSpecialist, ...prev]);
      setEditingSpecialist(newSpecialist);
    }
  };

  const updateAppointmentStatus = async (id: string, status: 'Confirmada' | 'Completada' | 'Cancelada') => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await apiService.updateAppointment(id, { status });
  };

  const updateDesignStatus = async (id: string, status: 'Pendiente' | 'Preparado en cabina' | 'Realizado') => {
    setCustomDesigns(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    await apiService.updateDesign(id, { status });
  };

  // SOLICITUDES DE CITA
  const generateLocator = () => `LGN-${Math.floor(1000 + Math.random() * 9000)}`;

  const confirmBookingRequest = (request: any) => {
    if (!request.preferredDate || !request.preferredTime) {
      alert('Para confirmar una cita primero hay que tener fecha y hora solicitadas.');
      return;
    }
    setConfirmServices([]);
    setConfirmAddons([]);
    setConfirmSpecialist('any');
    setConfirmingRequest(request);
  };

  const doConfirmBookingRequest = async () => {
    const request = confirmingRequest;
    const locator = generateLocator();

    const totalPrice = [
      ...confirmServices.map(id => services.find((s: any) => s.id === id)?.price || 0),
      ...confirmAddons.map(id => services.find((s: any) => s.id === id)?.price || 0)
    ].reduce((a: number, b: number) => a + b, 0);

    const totalDuration = [
      ...confirmServices.map(id => services.find((s: any) => s.id === id)?.durationMinutes || 0),
      ...confirmAddons.map(id => services.find((s: any) => s.id === id)?.durationMinutes || 0)
    ].reduce((a: number, b: number) => a + b, 0);

    const newAppointment: Appointment = {
      id: `appt_${Date.now()}`,
      locator,
      serviceIds: confirmServices,
      addonIds: confirmAddons,
      specialistId: confirmSpecialist,
      date: request.preferredDate,
      time: request.preferredTime,
      totalPrice,
      totalDuration,
      clientName: request.clientName,
      clientPhone: request.clientPhone,
      clientEmail: request.clientEmail,
      notes: `Solicitud: ${request.serviceType || ''}. ${request.notes || ''}`.trim(),
      status: 'Confirmada',
      createdAt: new Date().toISOString()
    };

    const result = await apiService.createAppointment(newAppointment);
    if (result?.success) {
      setAppointments(prev => [newAppointment, ...prev]);
      await apiService.updateBookingRequest(request.id, 'Confirmada');
      await reloadBookingRequests();
      setConfirmingRequest(null);
    } else {
      alert('No se pudo crear la cita. Comprueba que la API está en marcha.');
    }
  };

  const completeBookingRequest = async (id: string) => {
    await apiService.updateBookingRequest(id, 'Completada');
    await reloadBookingRequests();
  };

  const deleteBookingRequest = async (id: string) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    await apiService.deleteBookingRequest(id);
    await reloadBookingRequests();
  };

  const saveCrmCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiService.saveCrmCustomer(customerForm);
    if (!result?.success) { setCrmMessage(result?.error || 'No se pudo guardar el cliente.'); return; }
    setCustomerForm({ name: '', phone: '', email: '', taxId: '', address: '', postalCode: '', city: '', notes: '' });
    setShowCustomerForm(false);
    setCrmCustomers(await apiService.getCrmCustomers());
    setCrmMessage('Ficha de cliente guardada.');
  };

  const selectInvoiceCustomer = (id: string) => {
    const customer = crmCustomers.find(c => c.id === id);
    setInvoiceForm((prev: any) => ({
      ...prev, customerId: id, customerName: customer?.name || '',
      customerTaxId: customer?.taxId || '', customerAddress: customer?.address || '',
      customerPostalCode: customer?.postalCode || '', customerCity: customer?.city || '',
      customerEmail: customer?.email || ''
    }));
  };

  const createCrmInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiService.createCrmInvoice(invoiceForm);
    if (!result?.success) { setCrmMessage(result?.error || 'No se pudo crear la factura.'); return; }
    setCrmInvoices(await apiService.getCrmInvoices());
    setCrmMessage('Factura ' + result.number + ' guardada como ' + result.status + '.');
    setCrmSection('facturas');
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    const result = await apiService.updateCrmInvoiceStatus(id, status);
    if (!result?.success) { setCrmMessage(result?.error || 'No se pudo actualizar la factura.'); return; }
    setCrmInvoices(await apiService.getCrmInvoices());
    setCrmMessage('Estado de factura actualizado.');
  };

  const printCrmInvoice = (invoice: any) => {
    const htmlEntities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const esc = (value: any) => String(value ?? '').replace(/[&<>"']/g, ch => htmlEntities[ch] || '');
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) { setCrmMessage('Permite las ventanas emergentes para imprimir la factura.'); return; }
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura ${esc(invoice.number)}</title><style>body{font:14px Arial,sans-serif;color:#222;margin:40px}h1{font-size:28px}header{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:20px}.grid{display:flex;justify-content:space-between;margin:35px 0}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:30px}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}.num{text-align:right}.total{margin:25px 0 0 auto;width:260px}.total div{display:flex;justify-content:space-between;padding:6px}.grand{font-size:20px;font-weight:bold;border-top:2px solid #222}.notes{margin-top:40px;color:#555}@media print{button{display:none}}</style></head><body><header><div><h1>FACTURA</h1><strong>${esc(invoice.number)}</strong><p>Fecha: ${esc(invoice.issueDate)}</p></div><div><strong>${esc(invoice.issuerName)}</strong><p>${esc(invoice.issuerTaxId)}</p><p>${esc(invoice.issuerAddress)} · ${esc(invoice.issuerPostalCode)} ${esc(invoice.issuerCity)}</p><p>${esc(invoice.issuerEmail)}</p></div></header><div class="grid"><div><strong>Cliente</strong><p>${esc(invoice.customerName)}</p><p>${esc(invoice.customerTaxId)}</p><p>${esc(invoice.customerAddress)} · ${esc(invoice.customerPostalCode)} ${esc(invoice.customerCity)}</p><p>${esc(invoice.customerEmail)}</p></div><div><strong>Estado: ${esc(invoice.status)}</strong></div></div><table><thead><tr><th>Concepto</th><th class="num">Cantidad</th><th class="num">Precio</th><th class="num">Base</th></tr></thead><tbody><tr><td>${esc(invoice.description)}</td><td class="num">${esc(invoice.quantity)}</td><td class="num">${Number(invoice.unitPrice).toFixed(2)} €</td><td class="num">${Number(invoice.subtotal).toFixed(2)} €</td></tr></tbody></table><div class="total"><div><span>Base imponible</span><strong>${Number(invoice.subtotal).toFixed(2)} €</strong></div><div><span>IVA (${esc(invoice.taxRate)}%)</span><strong>${Number(invoice.taxAmount).toFixed(2)} €</strong></div><div class="grand"><span>Total</span><strong>${Number(invoice.total).toFixed(2)} €</strong></div></div><p class="notes">${esc(invoice.notes)}</p><p class="muted">Documento generado desde el CRM de BJ Beauty. Comprueba los requisitos fiscales antes de emitirlo.</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };

  const pendingRequestsCount = bookingRequests.filter(r => r.status === 'Pendiente').length;
  const pendingCancellationCount = cancellationRequests.filter(r => r.status === 'Pendiente').length;

  const filteredAppointments = selectedTech === 'all' 
    ? appointments 
    : appointments.filter(a => a.specialistId === selectedTech);

  const totalBilling = appointments
    .filter(a => a.status !== 'Cancelada')
    .reduce((acc, a) => acc + a.totalPrice, 0);

  const completedCount = appointments.filter(a => a.status === 'Completada').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#2B0F1E] flex items-center justify-center px-4 py-16">
        <form onSubmit={handlePinSubmit} className="bg-[#FDEEF3] rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center space-y-6 shadow-2xl border border-[#E0407F]/40">
          <div className="w-16 h-16 rounded-2xl bg-[#2B0F1E] text-[#E0407F] flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#E0407F]">Acceso Restringido</span>
            <h1 className="font-display text-2xl font-bold text-[#2B0F1E] mt-1">Panel Administrativo</h1>
            <p className="text-xs text-[#2B0F1E]/60 mt-2">Introduce el PIN para gestionar el salón.</p>
          </div>
          <div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
              placeholder="? ? ? ?"
              className={`w-full text-center tracking-[0.5em] text-lg px-4 py-3 rounded-xl border text-[#2B0F1E] focus:outline-none focus:ring-2 focus:ring-[#E0407F] ${pinError ? 'border-rose-400' : 'border-neutral-300'}`}
            />
            {pinError && <p className="text-xs text-rose-500 font-semibold mt-2">{pinError}</p>}
          </div>
          <button
            type="submit"
            disabled={pinLoading || !pinInput}
            className="w-full py-3.5 bg-[#2B0F1E] hover:bg-[#A32A5F] disabled:opacity-60 disabled:cursor-not-allowed text-[#FDEEF3] text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            {pinLoading ? 'Comprobando…' : 'Acceder'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDEEF3] pb-24 lg:pb-12 px-4 lg:px-12 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#E0407F]">Panel de Control</span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2B0F1E] mt-1">
              {salonConfig.name}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-white border border-neutral-200 text-[#2B0F1E]/60 hover:text-rose-600 hover:border-rose-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-[#FDEEF3] p-2 rounded-2xl overflow-x-auto">
          {[
            { id: 'config', label: 'Configuración', icon: Settings },
            { id: 'contenidos', label: 'Contenidos', icon: FileText },
            { id: 'galeria', label: 'Galería', icon: Image },
            { id: 'servicios', label: 'Servicios', icon: Sparkles },
            { id: 'especialistas', label: 'Especialistas', icon: Users },
            { id: 'requests', label: 'Solicitudes', icon: BookmarkPlus },
            { id: 'cancellations', label: 'Cancelaciones', icon: XCircle },
            { id: 'crm', label: 'CRM', icon: Users },
            { id: 'agenda', label: 'Citas', icon: Calendar },
            { id: 'designs', label: 'Diseños', icon: Palette }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap relative ${
                  activeTab === tab.id ? 'bg-[#2B0F1E] text-[#FDEEF3] shadow-sm' : 'text-[#2B0F1E]/70 hover:text-[#2B0F1E]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'cancellations' && pendingCancellationCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">{pendingCancellationCount}</span>}
                {tab.id === 'requests' && pendingRequestsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONFIGURACIÓN */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E0407F]/25 p-8">
              <h2 className="font-display text-2xl font-bold text-[#2B0F1E] mb-6">Datos del Salón</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Nombre</label>
                    <input
                      type="text"
                      value={editingConfig.name}
                      onChange={(e) => setEditingConfig({...editingConfig, name: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Email</label>
                    <input
                      type="email"
                      value={editingConfig.email}
                      onChange={(e) => setEditingConfig({...editingConfig, email: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Teléfono de contacto directo</label>
                    <input
                      type="tel"
                      value={editingConfig.phone}
                      onChange={(e) => setEditingConfig({...editingConfig, phone: e.target.value})}
                      placeholder="611 296 406"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                    />
                    <p className="mt-1.5 text-[11px] text-neutral-500">Número directo del salón para llamadas o atención personal.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">WhatsApp del agente virtual</label>
                    <input
                      type="tel"
                      value={editingConfig.whatsapp}
                      onChange={(e) => setEditingConfig({...editingConfig, whatsapp: e.target.value})}
                      placeholder="+34 611 296 406"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                    />
                    <p className="mt-1.5 text-[11px] text-neutral-500">Número conectado al agente virtual de WhatsApp para citas (incluye prefijo, ej. 34611296406).</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Dirección</label>
                    <input
                      type="text"
                      value={editingConfig.address}
                      onChange={(e) => setEditingConfig({...editingConfig, address: e.target.value})}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 cursor-pointer md:mt-6">
                    <input
                      type="checkbox"
                      checked={editingConfig.calendarPublic}
                      onChange={(e) => setEditingConfig({...editingConfig, calendarPublic: e.target.checked})}
                      className="w-5 h-5 accent-[#2B0F1E]"
                    />
                    <span>
                      <span className="block text-xs font-bold text-[#2B0F1E] uppercase">Mostrar disponibilidad</span>
                      <span className="block text-[11px] text-neutral-500">Permite que el calendario público muestre disponibilidad.</span>
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Descripción</label>
                  <textarea
                    value={editingConfig.description}
                    onChange={(e) => setEditingConfig({...editingConfig, description: e.target.value})}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F] min-h-24"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Horarios</label>
                  <textarea
                    value={editingConfig.hours}
                    onChange={(e) => setEditingConfig({...editingConfig, hours: e.target.value})}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0407F] min-h-20"
                  />
                </div>

                <div className="rounded-2xl border border-neutral-200 p-5 space-y-4">
                  <div>
              <h3 className="text-sm font-bold text-[#2B0F1E]">Horario operativo por día</h3>
              <p className="text-[11px] text-neutral-500">La cabina podrá usar esta configuración para calcular disponibilidad.</p>
                  </div>
                  <div className="space-y-2">
                    {editingConfig.workingHours.map((item, index) => (
                      <div key={item.day} className="grid grid-cols-[90px_1fr_1fr_auto] gap-2 items-center">
                        <span className="text-xs font-semibold">{item.day}</span>
                        <input type="time" value={item.open} disabled={!item.enabled}
                          onChange={(e) => setEditingConfig(prev => ({...prev, workingHours: prev.workingHours.map((h,i) => i===index ? {...h, open:e.target.value} : h)}))}
                          className="px-2 py-2 border rounded-lg text-xs disabled:bg-neutral-100" />
                        <input type="time" value={item.close} disabled={!item.enabled}
                          onChange={(e) => setEditingConfig(prev => ({...prev, workingHours: prev.workingHours.map((h,i) => i===index ? {...h, close:e.target.value} : h)}))}
                          className="px-2 py-2 border rounded-lg text-xs disabled:bg-neutral-100" />
                        <input type="checkbox" checked={item.enabled}
                          onChange={(e) => setEditingConfig(prev => ({...prev, workingHours: prev.workingHours.map((h,i) => i===index ? {...h, enabled:e.target.checked} : h)}))}
                          className="w-4 h-4 accent-[#2B0F1E]" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Bloqueos de agenda</label>
                    <textarea
                      value={editingConfig.blockedSlots.join('\n')}
                      onChange={(e) => setEditingConfig({...editingConfig, blockedSlots: e.target.value.split('\n').map(v => v.trim()).filter(Boolean)})}
                      placeholder="2026-10-02 14:00-16:00\n2026-10-05"
                      className="w-full px-4 py-3 border rounded-xl min-h-24 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Vacaciones / días cerrados</label>
                    <textarea
                      value={editingConfig.vacations.join('\n')}
                      onChange={(e) => setEditingConfig({...editingConfig, vacations: e.target.value.split('\n').map(v => v.trim()).filter(Boolean)})}
                      placeholder="2026-08-10\n2026-08-11"
                      className="w-full px-4 py-3 border rounded-xl min-h-24 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Color Primario</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingConfig.colors.primary}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, primary: e.target.value}})}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingConfig.colors.primary}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, primary: e.target.value}})}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Color Accent</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingConfig.colors.accent}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, accent: e.target.value}})}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingConfig.colors.accent}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, accent: e.target.value}})}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2B0F1E] mb-2 uppercase">Fondo</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingConfig.colors.background}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, background: e.target.value}})}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingConfig.colors.background}
                        onChange={(e) => setEditingConfig({...editingConfig, colors: {...editingConfig.colors, background: e.target.value}})}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-200 space-y-4">
                  <h3 className="text-sm font-bold text-[#2B0F1E]">Datos legales y privacidad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-xs font-semibold">Titular / razón social<input value={editingConfig.legalTitular} onChange={e=>setEditingConfig({...editingConfig,legalTitular:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                    <label className="text-xs font-semibold">NIF / CIF<input value={editingConfig.legalNif} onChange={e=>setEditingConfig({...editingConfig,legalNif:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                    <label className="text-xs font-semibold">Domicilio<input value={editingConfig.legalAddress} onChange={e=>setEditingConfig({...editingConfig,legalAddress:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                    <label className="text-xs font-semibold">Correo de contacto<input value={editingConfig.legalEmail} onChange={e=>setEditingConfig({...editingConfig,legalEmail:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                    <label className="text-xs font-semibold">Teléfono<input value={editingConfig.legalPhone} onChange={e=>setEditingConfig({...editingConfig,legalPhone:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                    <label className="text-xs font-semibold">Datos registrales<input value={editingConfig.legalRegistry} onChange={e=>setEditingConfig({...editingConfig,legalRegistry:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                  </div>
                  <label className="block text-xs font-semibold">Aviso legal adicional<textarea value={editingConfig.legalCustomNotice} onChange={e=>setEditingConfig({...editingConfig,legalCustomNotice:e.target.value})} rows={3} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                  <label className="block text-xs font-semibold">Información adicional de privacidad<textarea value={editingConfig.privacyCustomText} onChange={e=>setEditingConfig({...editingConfig,privacyCustomText:e.target.value})} rows={3} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                  <label className="block text-xs font-semibold">Información adicional de cookies<textarea value={editingConfig.cookiesCustomText} onChange={e=>setEditingConfig({...editingConfig,cookiesCustomText:e.target.value})} rows={3} className="mt-1 w-full px-3 py-2 border rounded-lg" /></label>
                </div>
                <div className="pt-6 border-t border-neutral-200">
                  <button
                    onClick={async () => {
                      const payload = {
                        ...editingConfig,
                        primaryColor: editingConfig.colors.primary,
                        accentColor: editingConfig.colors.accent,
                        backgroundColor: editingConfig.colors.background
                      };
                      const saved = await apiService.updateConfig(payload);
                      if (saved?.success) {
                        setSalonConfig(editingConfig);
                        alert('Configuración guardada en la base de datos.');
                      } else {
                        alert('No se pudo guardar la configuración.');
                      }
                    }}
                    className="px-6 py-3 bg-[#2B0F1E] text-[#FDEEF3] text-xs font-bold uppercase rounded-xl hover:bg-[#A32A5F] transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Configuración</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ICONOS DEL LOGO Y DE LOS SERVICIOS */}
            <div className="bg-white rounded-3xl border border-[#E0407F]/25 p-8 space-y-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Iconos de la Web (Logo y Servicios)</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Personaliza el emblema del logo principal y los iconos de cada servicio que ven las clientas en la portada.
                </p>
              </div>

              {/* Selector de icono / imagen del Logo */}
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-center p-5 rounded-2xl bg-[#FFF7FA] border border-[#E3C77A]/60">
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-[#E3C77A]/50">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Vista previa Logo</span>
                  <div className="scale-75 origin-center">
                    <BJLogo variant="full" logoIcon={editingConfig.logo} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#2B0F1E] uppercase">Emblema / Icono del Logo</label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E3C77A] bg-white text-[11px] font-semibold text-[#2B0F1E] hover:bg-[#FDEEF3] cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#E0407F]" />
                      <span>Subir imagen propia</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => readIconFile(e.target.files?.[0], (url) => setEditingConfig({ ...editingConfig, logo: url }))}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {LOGO_ICON_OPTIONS.map((opt) => {
                      const active = (editingConfig.logo || 'crown') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEditingConfig({ ...editingConfig, logo: opt.id })}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                            active
                              ? 'border-[#E0407F] bg-[#FDEEF3] text-[#14101A] ring-1 ring-[#E0407F]'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#E3C77A]'
                          }`}
                        >
                          <span className="w-8 h-8 rounded-full bg-[#FFF7FA] border border-[#E3C77A]/60 flex items-center justify-center text-[#B8923A] shrink-0">
                            {renderBeautyIcon(opt.id, 'w-5 h-5')}
                          </span>
                          <span className="text-xs font-semibold truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {isCustomIconImage(editingConfig.logo) ? (
                      <span className="text-[11px] text-[#A32A5F] font-semibold">Imagen personalizada seleccionada (pulsa «Guardar Logo» para aplicar).</span>
                    ) : (
                      <span className="text-[11px] text-neutral-500">Pulsa «Guardar Logo» para aplicarlo en la cabecera, portada y pie de página.</span>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const payload = {
                          ...editingConfig,
                          primaryColor: editingConfig.colors.primary,
                          accentColor: editingConfig.colors.accent,
                          backgroundColor: editingConfig.colors.background
                        };
                        const saved = await apiService.updateConfig(payload);
                        if (saved?.success) {
                          setSalonConfig(editingConfig);
                          alert('Icono del logo actualizado en toda la web.');
                        } else {
                          alert('No se pudo guardar el icono del logo.');
                        }
                      }}
                      className="px-4 py-2 bg-[#2B0F1E] text-[#FDEEF3] text-xs font-bold uppercase rounded-xl hover:bg-[#A32A5F] transition-all flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Logo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Selector rápido de iconos de servicios */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#2B0F1E] uppercase tracking-wider">Iconos de los Servicios</h3>
                  <span className="text-[11px] text-neutral-500">Los cambios en servicios se aplican al instante</span>
                </div>

                {services.length === 0 ? (
                  <p className="text-xs text-neutral-500">No hay servicios activos.</p>
                ) : (
                  <div className="space-y-3">
                    {services.map((svc) => {
                      const currentIcon = svc.icon || '';
                      return (
                        <div key={svc.id} className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="w-11 h-11 rounded-full bg-[#F9C9DA]/60 border border-[#E3C77A] flex items-center justify-center text-[#14101A] overflow-hidden shrink-0">
                                {renderBeautyIcon(currentIcon, 'w-6 h-6', svc.category)}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-[#14101A]">{svc.name}</p>
                                <p className="text-[11px] text-neutral-500">Categoría: {svc.category || 'general'}</p>
                              </div>
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-[11px] font-semibold text-[#2B0F1E] hover:bg-[#FDEEF3] cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-[#E0407F]" />
                              <span>Subir icono propio</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => readIconFile(e.target.files?.[0], (url) => handleQuickServiceIconChange(svc, url))}
                              />
                            </label>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {SERVICE_ICON_OPTIONS.map((opt) => {
                              const isSelected = currentIcon === opt.id || (!currentIcon && renderBeautyIcon('', '', svc.category) && opt.id === (svc.category === 'manicura' ? 'manicure' : svc.category === 'pedicura' ? 'pedicure' : svc.category === 'cejas' ? 'brows' : 'sparkles'));
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  title={opt.label}
                                  onClick={() => handleQuickServiceIconChange(svc, opt.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                                    isSelected
                                      ? 'border-[#E0407F] bg-[#FDEEF3] text-[#14101A] font-semibold'
                                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#E3C77A]'
                                  }`}
                                >
                                  <span className="w-4 h-4 flex items-center justify-center">
                                    {renderBeautyIcon(opt.id, 'w-4 h-4')}
                                  </span>
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDOS */}
        {activeTab === 'contenidos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E0407F]/25 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Textos y Contenidos</h2>
                  <p className="text-sm text-neutral-600 mt-1">Edita los textos de la página de inicio. Un campo vacío vuelve al texto por defecto.</p>
                  {contentUpdatedAt && (
                    <p className="text-xs text-neutral-400 mt-2">Última modificación: {new Date(contentUpdatedAt).toLocaleString('es-ES')}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!contentDirty || contentSaving}
                    onClick={() => { setSiteContent(savedContent); setContentMessage(null); }}
                    className="px-4 py-3 border border-neutral-300 text-[#2B0F1E] text-xs font-bold uppercase rounded-xl hover:bg-[#FDEEF3] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Descartar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!contentDirty || contentSaving}
                    onClick={saveSiteContent}
                    className="px-5 py-3 bg-[#2B0F1E] text-[#FDEEF3] text-xs font-bold uppercase rounded-xl hover:bg-[#A32A5F] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{contentSaving ? 'Guardando…' : 'Guardar'}</span>
                  </button>
                </div>
              </div>
              {contentMessage && (
                <p className={`mt-4 text-xs font-semibold px-4 py-3 rounded-xl ${contentMessage.type === 'ok' ? 'bg-[#E0407F]/15 text-[#2B0F1E]' : 'bg-rose-50 text-rose-700'}`}>
                  {contentMessage.text}
                </p>
              )}
            </div>

            {isLoadingData && Object.keys(siteContent).length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#E0407F]/25 p-8 text-sm text-neutral-500">Cargando contenidos…</div>
            ) : Object.keys(siteContent).length === 0 ? (
              <div className="bg-white rounded-3xl border border-rose-200 p-8 text-sm text-rose-700">No se pudieron cargar los contenidos. Comprueba que la API está en marcha.</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
                <div className="space-y-6">
                  {CONTENT_SECTIONS.map(section => (
                    <section key={section.title} className="bg-white rounded-3xl border border-[#E0407F]/25 p-6 sm:p-8">
                      <h3 className="font-display text-lg font-bold text-[#2B0F1E]">{section.title}</h3>
                      <p className="text-xs text-neutral-500 mt-1 mb-5">{section.description}</p>
                      <div className="space-y-4">
                        {section.fields.map(field => {
                          const value = siteContent[field.key] ?? '';
                          const defaultValue = contentDefaults[field.key] ?? '';
                          const isCustom = value !== defaultValue;
                          const isChanged = value !== (savedContent[field.key] ?? '');
                          const inputClass = 'w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E0407F]';
                          const onChange = (v: string) => setSiteContent(prev => ({ ...prev, [field.key]: v }));
                          return (
                            <div key={field.key}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <label htmlFor={`content-${field.key}`} className="text-xs font-bold text-[#2B0F1E] uppercase flex items-center gap-2">
                                  {field.label}
                                  {isChanged && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] normal-case font-semibold">sin guardar</span>}
                                  {!isChanged && isCustom && <span className="px-1.5 py-0.5 rounded bg-[#E0407F]/20 text-[#2B0F1E] text-[10px] normal-case font-semibold">personalizado</span>}
                                </label>
                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => onChange(defaultValue)}
                                    title={`Restaurar: ${defaultValue}`}
                                    className="text-[11px] font-semibold text-[#A32A5F] hover:text-[#2B0F1E] flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Restaurar</span>
                                  </button>
                                )}
                              </div>
                              {field.multiline ? (
                                <textarea
                                  id={`content-${field.key}`}
                                  rows={3}
                                  maxLength={1000}
                                  value={value}
                                  placeholder={defaultValue}
                                  onChange={(e) => onChange(e.target.value)}
                                  className={`${inputClass} resize-y`}
                                />
                              ) : (
                                <input
                                  id={`content-${field.key}`}
                                  type={field.key === 'instagram_url' ? 'url' : 'text'}
                                  maxLength={1000}
                                  value={value}
                                  placeholder={defaultValue}
                                  onChange={(e) => onChange(e.target.value)}
                                  className={inputClass}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>

                {/* Vista previa de la portada */}
                <aside className="xl:sticky xl:top-6 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#2B0F1E]/60 flex items-center gap-2"><Eye className="w-4 h-4" /> Vista previa portada</p>
                  <div className="rounded-3xl overflow-hidden bg-[#2B0F1E] text-white p-6 space-y-4 shadow-lg">
                    <p className="text-[#F27AA8] text-[10px] font-bold uppercase tracking-[.22em]">{siteContent.hero_kicker || contentDefaults.hero_kicker}</p>
                    <h4 className="font-display text-2xl font-bold leading-tight">
                      {siteContent.hero_title || contentDefaults.hero_title}{' '}
                      <span className="text-[#E0407F]">{siteContent.hero_title_highlight || contentDefaults.hero_title_highlight}</span>
                    </h4>
                    <p className="text-xs text-white/80 leading-relaxed">{siteContent.hero_subtitle || contentDefaults.hero_subtitle}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-2 bg-[#E0407F] text-[#111111] font-bold text-[10px] uppercase tracking-widest rounded-lg">{siteContent.hero_cta_booking || contentDefaults.hero_cta_booking}</span>
                      <span className="px-3 py-2 border border-[#F27AA8]/70 font-bold text-[10px] uppercase tracking-widest rounded-lg">{siteContent.hero_cta_instagram || contentDefaults.hero_cta_instagram}</span>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-white border border-[#E0407F]/25 p-6 space-y-2">
                    <p className="text-[#B8923A] text-[10px] font-bold uppercase tracking-[.2em]">{siteContent.services_kicker || contentDefaults.services_kicker}</p>
                    <h4 className="font-display text-lg font-bold text-[#2B0F1E]">{siteContent.services_title || contentDefaults.services_title}</h4>
                    <p className="text-xs text-[#7A5C6B]">{siteContent.services_intro || contentDefaults.services_intro}</p>
                  </div>
                  <div className="rounded-3xl bg-[#2B0F1E] text-white p-6 text-center space-y-2">
                    <h4 className="font-display text-lg font-bold">{siteContent.closing_title || contentDefaults.closing_title}</h4>
                    <p className="text-xs text-white/75">{siteContent.closing_subtitle || contentDefaults.closing_subtitle}</p>
                  </div>
                </aside>
              </div>
            )}
          </div>
        )}

        {/* GALERÍA */}
        {activeTab === 'galeria' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E0407F]/25 p-8">
              <h2 className="font-display text-2xl font-bold text-[#2B0F1E] mb-6">Galería de Fotos</h2>
              
              <div className="mb-8">
                <label className="block">
                  <div className="border-2 border-dashed border-[#E0407F]/40 rounded-2xl p-8 text-center cursor-pointer hover:bg-[#FDEEF3] transition-all">
                    <Image className="w-8 h-8 mx-auto mb-3 text-[#E0407F]" />
                    <p className="text-sm font-semibold text-[#2B0F1E] mb-1">Sube fotos de tu salón</p>
                    <p className="text-xs text-neutral-500">JPG, PNG - Máx 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {galleryPhotos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleryPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square">
                      <img src={photo} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={async () => {
                          const id = galleryIds[idx];
                          if (id) {
                            const deleted = await apiService.deletePhoto(id);
                            if (!deleted?.success) return;
                          }
                          setGalleryPhotos(prev => prev.filter((_, i) => i !== idx));
                          setGalleryIds(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {activeTab === 'servicios' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Gestión de servicios</h2>
              <button
                onClick={addService}
                className="px-4 py-2 bg-[#2B0F1E] text-[#FDEEF3] text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-[#A32A5F]"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Servicio</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#E0407F]/25 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#FDEEF3] border-b border-neutral-200 text-[#2B0F1E] uppercase font-semibold">
                    <tr>
                      <th className="p-4 text-left">Servicio</th>
                      <th className="p-4 text-center">Duración (min)</th>
                      <th className="p-4 text-center">Precio (€)</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {services.map(svc => (
                      <tr key={svc.id} className="hover:bg-neutral-50">
                        <td className="p-4">
                          {editingService?.id === svc.id ? (
                            <div className="space-y-3 min-w-64">
                              <input
                                type="text"
                                value={editingService.name}
                                onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                                placeholder="Nombre del servicio"
                                className="px-3 py-2 border border-neutral-300 rounded-lg text-xs w-full"
                              />
                              <textarea
                                value={editingService.description ?? editingService.shortDescription ?? ''}
                                onChange={(e) => setEditingService({...editingService, description: e.target.value, shortDescription: e.target.value})}
                                placeholder="Descripción que aparecerá en la página principal"
                                rows={3}
                                className="px-3 py-2 border border-neutral-300 rounded-lg text-xs w-full min-w-56"
                              />
                              <div className="p-2.5 rounded-xl bg-[#FFF7FA] border border-[#E3C77A]/60 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-[#2B0F1E] uppercase">Icono del servicio</span>
                                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-300 bg-white text-[10px] font-semibold cursor-pointer hover:bg-[#FDEEF3]">
                                    <Upload className="w-3 h-3 text-[#E0407F]" />
                                    <span>Subir imagen</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => readIconFile(e.target.files?.[0], (url) => setEditingService({ ...editingService, icon: url }))}
                                    />
                                  </label>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {SERVICE_ICON_OPTIONS.map((opt) => {
                                    const active = (editingService.icon || '') === opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        title={opt.label}
                                        onClick={() => setEditingService({ ...editingService, icon: opt.id })}
                                        className={`p-1.5 rounded-lg border transition-colors ${
                                          active
                                            ? 'border-[#E0407F] bg-[#FDEEF3] text-[#14101A]'
                                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#E3C77A]'
                                        }`}
                                      >
                                        {renderBeautyIcon(opt.id, 'w-4 h-4')}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="w-9 h-9 rounded-full bg-[#F9C9DA]/60 border border-[#E3C77A] flex items-center justify-center text-[#14101A] overflow-hidden shrink-0">
                                {renderBeautyIcon(svc.icon, 'w-5 h-5', svc.category)}
                              </span>
                              <span className="font-semibold text-[#2B0F1E]">{svc.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {editingService?.id === svc.id ? (
                            <input
                              type="number"
                              value={editingService.duration}
                              onChange={(e) => setEditingService({...editingService, duration: parseInt(e.target.value)})}
                              className="px-3 py-2 border border-neutral-300 rounded-lg text-xs w-20 mx-auto"
                            />
                          ) : (
                            svc.duration == null ? '-' : svc.duration
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {editingService?.id === svc.id ? (
                            <input
                              type="number"
                              value={editingService.price}
                              onChange={(e) => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                              className="px-3 py-2 border border-neutral-300 rounded-lg text-xs w-20 mx-auto"
                            />
                          ) : (
                            <span className="font-bold text-[#E0407F]">{svc.price}€</span>
                          )}
                        </td>
                        <td className="p-4 text-center space-x-2">
                          {editingService?.id === svc.id ? (
                            <>
                              <button
                                onClick={async () => {
                                  const saved = await apiService.updateService(editingService.id, editingService);
                                  if (saved?.success) {
                                    setServices(prev => prev.map(s => s.id === editingService.id ? editingService : s));
                                    setEditingService(null);
                                  }
                                }}
                                className="px-2 py-1 bg-[#2B0F1E] text-[#FDEEF3] rounded text-[10px] font-bold hover:bg-[#A32A5F]"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingService(null)}
                                className="px-2 py-1 bg-neutral-200 text-neutral-700 rounded text-[10px] font-bold hover:bg-neutral-300"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingService(svc)}
                                className="px-2 py-1 bg-neutral-100 text-[#2B0F1E] rounded text-[10px] font-bold hover:bg-neutral-200"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={async () => {
                                  const deleted = await apiService.deleteService(svc.id);
                                  if (deleted?.success) setServices(prev => prev.filter(s => s.id !== svc.id));
                                }}
                                className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-[10px] font-bold hover:bg-rose-200"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ESPECIALISTAS */}
        {activeTab === 'especialistas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Equipo de Especialistas</h2>
              <button
                onClick={addSpecialist}
                className="px-4 py-2 bg-[#2B0F1E] text-[#FDEEF3] text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-[#A32A5F]"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Especialista</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {specialists.map(spec => (
                <div key={spec.id} className="bg-white rounded-2xl border border-[#E0407F]/30 p-6 space-y-4">
                  <div className="text-4xl text-center mb-3">{spec.photo}</div>
                  {editingSpecialist?.id === spec.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingSpecialist.name}
                        onChange={(e) => setEditingSpecialist({...editingSpecialist, name: e.target.value})}
                        placeholder="Nombre"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={editingSpecialist.role}
                        onChange={(e) => setEditingSpecialist({...editingSpecialist, role: e.target.value})}
                        placeholder="Cargo"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const saved = await apiService.updateSpecialist(editingSpecialist.id, editingSpecialist);
                            if (saved?.success) {
                              setSpecialists(prev => prev.map(s => s.id === editingSpecialist.id ? editingSpecialist : s));
                              setEditingSpecialist(null);
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-[#2B0F1E] text-[#FDEEF3] rounded-lg text-xs font-bold hover:bg-[#A32A5F]"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingSpecialist(null)}
                          className="flex-1 px-3 py-2 bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-bold text-[#2B0F1E] text-center">{spec.name}</h3>
                        <p className="text-xs text-neutral-500 text-center">{spec.role}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSpecialist(spec)}
                          className="flex-1 px-3 py-2 bg-neutral-100 text-[#2B0F1E] rounded-lg text-xs font-bold hover:bg-neutral-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            const deleted = await apiService.deleteSpecialist(spec.id);
                            if (deleted?.success) setSpecialists(prev => prev.filter(s => s.id !== spec.id));
                          }}
                          className="flex-1 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-200"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOLICITUDES DE CITA */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E0407F]/25 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Solicitudes de Cita</h2>
                <span className="text-xs font-semibold text-neutral-500">{pendingRequestsCount} pendiente(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FDEEF3] border-b border-neutral-200 text-[#2B0F1E] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Servicio</th>
                      <th className="p-4">Fecha/Hora Preferida</th>
                      <th className="p-4">Notas</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {bookingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-neutral-400">
                          No hay solicitudes de cita todavía.
                        </td>
                      </tr>
                    ) : (
                      bookingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-neutral-50/50 transition-colors align-top">
                          <td className="p-4 font-bold text-[#2B0F1E]">{req.clientName}</td>
                          <td className="p-4">
                            <span className="block">{req.clientPhone}</span>
                            <span className="block text-[11px] text-neutral-500">{req.clientEmail}</span>
                          </td>
                          <td className="p-4 font-medium">{req.serviceType}</td>
                          <td className="p-4 font-medium">{req.preferredDate || '—'} {req.preferredTime ? `· ${req.preferredTime}h` : ''}</td>
                          <td className="p-4 max-w-xs truncate text-neutral-600">{req.notes || '—'}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                              req.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'Confirmada' ? 'bg-[#E0407F]/20 text-[#2B0F1E]' :
                              req.status === 'Completada' ? 'bg-[#2B0F1E] text-[#FDEEF3]' :
                              'bg-neutral-100 text-neutral-600'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            {req.status === 'Pendiente' && (
                              <button
                                onClick={() => confirmBookingRequest(req)}
                                className="px-2.5 py-1 bg-[#2B0F1E] text-[#FDEEF3] rounded text-[11px] font-semibold hover:bg-[#A32A5F]"
                              >
                                Confirmar
                              </button>
                            )}
                            {req.status !== 'Completada' && (
                              <button
                                onClick={() => completeBookingRequest(req.id)}
                                className="px-2.5 py-1 bg-[#E0407F]/20 text-[#2B0F1E] rounded text-[11px] font-semibold hover:bg-[#E0407F]/30"
                              >
                                Completar
                              </button>
                            )}
                            <button
                              onClick={() => deleteBookingRequest(req.id)}
                              className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded text-[11px] font-semibold hover:bg-rose-200"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CRM */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-display text-2xl font-bold text-[#2B0F1E]">CRM · Clientes y facturación</h2><p className="text-sm text-neutral-500">Fichas, historial de citas y documentos de facturación.</p></div>
              <div className="flex gap-2"><button onClick={() => setCrmSection('clientes')} className={'px-4 py-2 rounded-xl text-xs font-bold ' + (crmSection === 'clientes' ? 'bg-[#2B0F1E] text-white' : 'bg-white text-[#2B0F1E]')}>Clientes ({crmCustomers.length})</button><button onClick={() => setCrmSection('facturas')} className={'px-4 py-2 rounded-xl text-xs font-bold ' + (crmSection === 'facturas' ? 'bg-[#2B0F1E] text-white' : 'bg-white text-[#2B0F1E]')}>Facturas ({crmInvoices.length})</button></div>
            </div>
            {crmMessage && <div role="status" className="p-3 rounded-xl bg-[#E0407F]/15 text-[#2B0F1E] text-sm">{crmMessage}</div>}
            {crmSection === 'clientes' && <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center justify-between"><div className="relative flex-1 min-w-52"><Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400"/><input value={crmSearch} onChange={e => setCrmSearch(e.target.value)} placeholder="Buscar por nombre, teléfono o email" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm"/></div><button onClick={() => setShowCustomerForm(v => !v)} className="px-4 py-2.5 bg-[#2B0F1E] text-white rounded-xl text-xs font-bold flex items-center gap-2"><UserPlus className="w-4 h-4"/> Nuevo cliente</button></div>
              {showCustomerForm && <form onSubmit={saveCrmCustomer} className="bg-white border border-[#E0407F]/30 rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input required placeholder="Nombre y apellidos *" value={customerForm.name} onChange={e => setCustomerForm({...customerForm,name:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                <input placeholder="Teléfono" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm,phone:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                <input type="email" placeholder="Email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm,email:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                <input placeholder="NIF / CIF" value={customerForm.taxId} onChange={e => setCustomerForm({...customerForm,taxId:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                <input placeholder="Dirección" value={customerForm.address} onChange={e => setCustomerForm({...customerForm,address:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                <input placeholder="Código postal" value={customerForm.postalCode} onChange={e => setCustomerForm({...customerForm,postalCode:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                <input placeholder="Localidad" value={customerForm.city} onChange={e => setCustomerForm({...customerForm,city:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                <textarea placeholder="Notas internas" value={customerForm.notes} onChange={e => setCustomerForm({...customerForm,notes:e.target.value})} className="p-3 border rounded-xl text-sm sm:col-span-2"/>
                <div className="flex gap-2 items-center"><button type="submit" className="px-4 py-3 bg-[#2B0F1E] text-white rounded-xl text-xs font-bold">{customerForm.id ? 'Guardar cambios' : 'Guardar cliente'}</button><button type="button" onClick={() => setShowCustomerForm(false)} className="px-4 py-3 bg-neutral-100 rounded-xl text-xs">Cerrar</button></div>
              </form>}
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#FDEEF3] text-[10px] uppercase text-[#2B0F1E]"><tr><th className="p-4">Cliente</th><th className="p-4">Contacto</th><th className="p-4">Citas</th><th className="p-4">Última cita</th><th className="p-4">Gasto completado</th><th className="p-4">Acción</th></tr></thead><tbody className="divide-y">
                {crmCustomers.filter(c => [c.name,c.phone,c.email].some(v => String(v || '').toLowerCase().includes(crmSearch.toLowerCase()))).map(c => <tr key={c.id}><td className="p-4 font-semibold">{c.name}</td><td className="p-4 text-xs">{c.phone}<br/>{c.email}</td><td className="p-4">{c.appointmentCount || 0}</td><td className="p-4">{c.lastAppointment || '—'}</td><td className="p-4">{Number(c.completedSpend || 0).toFixed(2)} €</td><td className="p-4"><div className="flex gap-3"><button onClick={() => { setCustomerForm({...c}); setShowCustomerForm(true); }} className="text-neutral-600 font-bold text-xs">Editar</button><button onClick={() => { setInvoiceForm((prev: any) => ({...prev, customerId:c.id, customerName:c.name, customerTaxId:c.taxId || '', customerAddress:c.address || '', customerPostalCode:c.postalCode || '', customerCity:c.city || '', customerEmail:c.email || '', issuerName:salonConfig.name || ''})); setCrmSection('facturas'); }} className="text-[#A32A5F] font-bold text-xs">Crear factura</button></div></td></tr>)}
                {crmCustomers.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-neutral-400">No hay clientes todavía. Se importarán automáticamente los contactos de las citas guardadas.</td></tr>}
              </tbody></table></div>
            </div>}
            {crmSection === 'facturas' && <div className="space-y-4">
              <form onSubmit={createCrmInvoice} className="bg-white rounded-2xl border border-[#E0407F]/30 p-5 space-y-4">
                <div className="flex items-center gap-2"><Receipt className="w-5 h-5 text-[#B8923A]"/><h3 className="font-bold text-[#2B0F1E]">Nueva factura / borrador</h3></div>
                <p className="text-xs text-neutral-500">Completa los datos fiscales del emisor. Se guardarán como una copia en el documento.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <input required placeholder="Nombre fiscal del emisor *" value={invoiceForm.issuerName} onChange={e => setInvoiceForm({...invoiceForm,issuerName:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input required placeholder="NIF/CIF emisor *" value={invoiceForm.issuerTaxId} onChange={e => setInvoiceForm({...invoiceForm,issuerTaxId:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input required placeholder="Dirección fiscal emisor *" value={invoiceForm.issuerAddress} onChange={e => setInvoiceForm({...invoiceForm,issuerAddress:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input placeholder="CP" value={invoiceForm.issuerPostalCode} onChange={e => setInvoiceForm({...invoiceForm,issuerPostalCode:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input placeholder="Localidad" value={invoiceForm.issuerCity} onChange={e => setInvoiceForm({...invoiceForm,issuerCity:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input placeholder="Email emisor" value={invoiceForm.issuerEmail} onChange={e => setInvoiceForm({...invoiceForm,issuerEmail:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <select value={invoiceForm.customerId} onChange={e => selectInvoiceCustomer(e.target.value)} className="p-3 border rounded-xl text-sm"><option value="">Seleccionar cliente guardado…</option>{crmCustomers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone || c.email}</option>)}</select>
                  <input required placeholder="Nombre cliente *" value={invoiceForm.customerName} onChange={e => setInvoiceForm({...invoiceForm,customerName:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input placeholder="NIF cliente" value={invoiceForm.customerTaxId} onChange={e => setInvoiceForm({...invoiceForm,customerTaxId:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input placeholder="Dirección cliente" value={invoiceForm.customerAddress} onChange={e => setInvoiceForm({...invoiceForm,customerAddress:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input placeholder="CP cliente" value={invoiceForm.customerPostalCode} onChange={e => setInvoiceForm({...invoiceForm,customerPostalCode:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input placeholder="Localidad cliente" value={invoiceForm.customerCity} onChange={e => setInvoiceForm({...invoiceForm,customerCity:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input type="email" placeholder="Email cliente" value={invoiceForm.customerEmail} onChange={e => setInvoiceForm({...invoiceForm,customerEmail:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input required placeholder="Concepto *" value={invoiceForm.description} onChange={e => setInvoiceForm({...invoiceForm,description:e.target.value})} className="p-3 border rounded-xl text-sm sm:col-span-2"/>
                  <input type="date" required value={invoiceForm.issueDate} onChange={e => setInvoiceForm({...invoiceForm,issueDate:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                  <input type="number" min="0.01" step="0.01" required placeholder="Cantidad" value={invoiceForm.quantity} onChange={e => setInvoiceForm({...invoiceForm,quantity:Number(e.target.value)})} className="p-3 border rounded-xl text-sm"/>
                  <input type="number" min="0" step="0.01" required placeholder="Precio unitario (€)" value={invoiceForm.unitPrice} onChange={e => setInvoiceForm({...invoiceForm,unitPrice:Number(e.target.value)})} className="p-3 border rounded-xl text-sm"/>
                  <input type="number" min="0" max="100" step="0.01" required placeholder="IVA (%)" value={invoiceForm.taxRate} onChange={e => setInvoiceForm({...invoiceForm,taxRate:Number(e.target.value)})} className="p-3 border rounded-xl text-sm"/>
                  <select value={invoiceForm.status} onChange={e => setInvoiceForm({...invoiceForm,status:e.target.value})} className="p-3 border rounded-xl text-sm"><option value="Borrador">Guardar como borrador</option><option value="Emitida">Marcar como emitida</option></select>
                  <input placeholder="Forma de pago (opcional)" value={invoiceForm.paymentMethod} onChange={e => setInvoiceForm({...invoiceForm,paymentMethod:e.target.value})} className="p-3 border rounded-xl text-sm"/>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-neutral-600">Base: <strong>{(Number(invoiceForm.quantity || 0) * Number(invoiceForm.unitPrice || 0)).toFixed(2)} €</strong> · IVA: <strong>{(Number(invoiceForm.quantity || 0) * Number(invoiceForm.unitPrice || 0) * Number(invoiceForm.taxRate || 0) / 100).toFixed(2)} €</strong> · Total: <strong className="text-[#2B0F1E]">{(Number(invoiceForm.quantity || 0) * Number(invoiceForm.unitPrice || 0) * (1 + Number(invoiceForm.taxRate || 0) / 100)).toFixed(2)} €</strong></p><button className="px-5 py-3 bg-[#2B0F1E] text-white rounded-xl text-xs font-bold">Guardar factura</button></div>
              </form>
              <div className="space-y-3">{crmInvoices.map(inv => <article key={inv.id} className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"><div><strong className="text-[#2B0F1E]">{inv.number}</strong><p className="text-sm">{inv.customerName} · {inv.description}</p><p className="text-xs text-neutral-500">{inv.issueDate} · {Number(inv.total).toFixed(2)} € · {inv.status}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => printCrmInvoice(inv)} className="px-3 py-2 bg-[#FDEEF3] rounded-lg text-xs font-semibold flex items-center gap-1"><Printer className="w-3 h-3"/> Imprimir / PDF</button>{inv.status === 'Borrador' && <button onClick={() => updateInvoiceStatus(inv.id,'Emitida')} className="px-3 py-2 bg-[#2B0F1E] text-white rounded-lg text-xs">Marcar emitida</button>}{inv.status === 'Emitida' && <button onClick={() => updateInvoiceStatus(inv.id,'Cobrada')} className="px-3 py-2 bg-[#E0407F]/30 text-[#2B0F1E] rounded-lg text-xs">Marcar cobrada</button>}</div></article>)}{crmInvoices.length === 0 && <p className="text-center p-8 text-neutral-400 bg-white rounded-2xl">Todavía no hay facturas.</p>}</div>
              <p className="text-[11px] text-neutral-500">Aviso: este módulo genera documentos imprimibles y registra estados internos. No implementa numeración fiscal inalterable, firma, envío a AEAT ni cumplimiento Verifactu.</p>
            </div>}
          </div>
        )}
        {/* SOLICITUDES DE CANCELACIÓN */}
        {activeTab === 'cancellations' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-[#E0407F]/25 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Solicitudes de cancelación</h2>
                <span className="text-xs font-semibold text-neutral-500">{pendingCancellationCount} pendiente(s)</span>
              </div>
              <div className="p-6 space-y-4">
                {cancellationRequests.length === 0 ? <p className="text-center text-neutral-400 py-10">No hay solicitudes de cancelación.</p> : cancellationRequests.map((req: any) => (
                  <article key={req.id} className="border border-neutral-200 rounded-2xl p-5 space-y-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div><strong className="text-[#2B0F1E]">{req.clientName || 'Cliente'}</strong><p className="text-xs text-neutral-500">{req.clientPhone} · {req.clientEmail}</p></div>
                      <span className={'h-fit px-3 py-1 rounded-full text-[10px] uppercase font-bold ' + (req.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' : req.status === 'Aceptada' ? 'bg-rose-100 text-rose-700' : 'bg-neutral-100 text-neutral-600')}>{req.status}</span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3 text-sm bg-[#FDEEF3] rounded-xl p-3">
                      <div><span className="block text-[10px] uppercase text-neutral-500">Localizador</span><strong>{req.locator}</strong></div>
                      <div><span className="block text-[10px] uppercase text-neutral-500">Fecha y hora</span><strong>{req.date || '—'} · {req.time || '—'}</strong></div>
                      <div><span className="block text-[10px] uppercase text-neutral-500">Estado de la cita</span><strong>{req.appointmentStatus || 'No disponible'}</strong></div>
                    </div>
                    <p className="text-sm text-neutral-600"><strong>Motivo:</strong> {req.reason || 'No indicado'}</p>
                    {req.decisionNotes && <p className="text-xs text-neutral-500">Nota de resolución: {req.decisionNotes}</p>}
                    {req.status === 'Pendiente' && <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={() => decideCancellation(req.id, 'Aceptada')} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Aceptar cancelación</button>
                      <button onClick={() => decideCancellation(req.id, 'Rechazada')} className="px-4 py-2 bg-[#2B0F1E] text-white rounded-xl text-xs font-bold">Rechazar solicitud</button>
                    </div>}
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* AGENDA - Lo que ya existía */}
        {activeTab === 'agenda' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#E0407F]/30 shadow-sm">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Facturación Acumulada</span>
                <span className="font-display text-3xl font-bold text-[#2B0F1E]">{totalBilling}€</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#E0407F]/30 shadow-sm">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Citas Totales</span>
                <span className="font-display text-3xl font-bold text-[#2B0F1E]">{appointments.length}</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-[#E0407F]/30 shadow-sm">
                <span className="text-xs font-semibold text-neutral-500 block mb-1">Citas Completadas</span>
                <span className="font-display text-3xl font-bold text-[#E0407F]">{completedCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-xs font-semibold text-[#2B0F1E] flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              {[{ id: 'all', name: 'Todas' }, ...specialists.map(s => ({ id: s.id, name: s.name }))].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTech(t.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
                    selectedTech === t.id ? 'bg-[#2B0F1E] text-[#FDEEF3] border-[#2B0F1E]' : 'bg-white text-[#2B0F1E] border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-[#E0407F]/25 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FDEEF3] border-b border-neutral-200 text-[#2B0F1E] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Localizador</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Servicios</th>
                      <th className="p-4">Especialista</th>
                      <th className="p-4">Fecha & Hora</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-neutral-400">
                          No hay citas con este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredAppointments.map((appt) => {
                        const staffObj = specialists.find(s => s.id === appt.specialistId);
                        const serviceNames = appt.serviceIds.map(id => services.find(s => s.id === id)?.name).join(', ');

                        return (
                          <tr key={appt.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="p-4 font-mono font-bold text-[#E0407F]">{appt.locator}</td>
                            <td className="p-4">
                              <span className="font-bold block text-[#2B0F1E]">{appt.clientName}</span>
                              <span className="text-[11px] text-neutral-500">{appt.clientPhone}</span>
                            </td>
                            <td className="p-4 max-w-xs truncate text-neutral-700">{serviceNames}</td>
                            <td className="p-4 font-medium">{staffObj?.name || 'Cualquiera'}</td>
                <td className="p-4 font-medium">{appt.date} · {appt.time}h</td>
                            <td className="p-4 font-bold font-display">{appt.totalPrice}€</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                                appt.status === 'Confirmada' ? 'bg-[#E0407F]/20 text-[#2B0F1E]' :
                                appt.status === 'Completada' ? 'bg-[#2B0F1E] text-[#FDEEF3]' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              {appt.status !== 'Completada' && (
                                <button
                                  onClick={() => updateAppointmentStatus(appt.id, 'Completada')}
                                  className="px-2.5 py-1 bg-[#2B0F1E] text-[#FDEEF3] rounded text-[11px] font-semibold hover:bg-[#A32A5F]"
                                >
                                  Completar
                                </button>
                              )}
                              {appt.status !== 'Cancelada' && (
                                <button
                                  onClick={() => updateAppointmentStatus(appt.id, 'Cancelada')}
                                  className="px-2.5 py-1 bg-neutral-200 text-neutral-800 rounded text-[11px] font-semibold hover:bg-neutral-300"
                                >
                                  Cancelar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DISEÑOS */}
        {activeTab === 'designs' && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold text-[#2B0F1E]">Diseños del Atelier</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {customDesigns.length === 0 ? (
                <div className="col-span-full py-16 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200">
                  No hay diseños personalizados creados.
                </div>
              ) : (
                customDesigns.map((des) => (
                  <div key={des.id} className="bg-white rounded-2xl overflow-hidden border border-[#E0407F]/30 shadow-sm flex flex-col">
                    <div className="aspect-[4/3] bg-neutral-900 relative overflow-hidden flex items-center justify-center p-4">
                      <img 
                        src={des.imageBase64} 
                        alt="Boceto" 
                        className="max-h-full object-contain rounded-lg shadow-md border border-[#E0407F]/40" 
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#2B0F1E] text-[#FDEEF3] font-mono text-[10px] rounded-md">
                        {des.code}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-display font-bold text-[#2B0F1E]">{des.clientName}</h3>
                        </div>
                        <p className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 italic">
                          "{des.notes}"
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-neutral-100">
                        <select
                          value={des.status}
                          onChange={(e) => updateDesignStatus(des.id, e.target.value as any)}
                          className="w-full text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FDEEF3] border border-[#E0407F]/40 text-[#2B0F1E]"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Preparado en cabina">Preparado en cabina</option>
                          <option value="Realizado">Realizado</option>
                        </select>

                        <button
                          onClick={() => setSelectedDesignModal(des)}
                          className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-[#2B0F1E] text-xs font-semibold rounded-xl"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

            {/* Modal diseño */}
        {selectedDesignModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 relative border border-[#E0407F]/40 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-[#2B0F1E]">Diseño {selectedDesignModal.code}</h3>
                <button 
                  onClick={() => setSelectedDesignModal(null)}
                  className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold hover:bg-neutral-200"
                >
                  👁️
                </button>
              </div>

              <div className="bg-neutral-900 p-4 rounded-2xl flex items-center justify-center">
                <img src={selectedDesignModal.imageBase64} alt="Ampliación" className="max-h-96 object-contain rounded-xl" />
              </div>

              <div className="space-y-2 text-xs">
                <p><strong>Cliente:</strong> {selectedDesignModal.clientName}</p>
                <p><strong>Teléfono:</strong> {selectedDesignModal.clientPhone}</p>
                <p><strong>Notas:</strong> {selectedDesignModal.notes}</p>
                <p><strong>Forma:</strong> {selectedDesignModal.shape}</p>
              </div>

              <button
                onClick={() => setSelectedDesignModal(null)}
                className="w-full py-3 bg-[#2B0F1E] text-[#FDEEF3] text-xs font-bold uppercase rounded-xl hover:bg-[#A32A5F]"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmar solicitud con servicios */}
      {confirmingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-[#2B0F1E]">Confirmar cita</h2>
                <p className="text-xs text-neutral-500 mt-0.5">{confirmingRequest.clientName} · {confirmingRequest.preferredDate} {confirmingRequest.preferredTime}h</p>
              </div>
              <button onClick={() => setConfirmingRequest(null)} className="p-2 rounded-xl hover:bg-neutral-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Servicios */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Servicios</p>
                <div className="space-y-2">
                  {services.map((svc: any) => {
                    const checked = confirmServices.includes(svc.id);
                    return (
                      <label key={svc.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-[#E0407F] bg-[#E0407F]/10' : 'border-neutral-200 hover:border-neutral-300'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setConfirmServices(prev => checked ? prev.filter(id => id !== svc.id) : [...prev, svc.id])}
                            className="accent-[#2B0F1E]"
                          />
                          <span className="text-sm font-medium text-[#2B0F1E]">{svc.name}</span>
                        </div>
                        <span className="text-sm font-bold text-[#2B0F1E]">{svc.price}€</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Especialista */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Especialista</p>
                <select
                  value={confirmSpecialist}
                  onChange={e => setConfirmSpecialist(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E0407F]"
                >
                  <option value="any">Cualquiera disponible</option>
                  {specialists.map((sp: any) => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-[#2B0F1E] rounded-2xl">
                <span className="text-sm font-semibold text-[#FDEEF3]">Total</span>
                <span className="font-display text-2xl font-bold text-[#E0407F]">
                  {[
                    ...confirmServices.map(id => services.find((s: any) => s.id === id)?.price || 0),
                  ].reduce((a: number, b: number) => a + b, 0)}€
                </span>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setConfirmingRequest(null)}
                className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-semibold text-sm hover:bg-neutral-200"
              >
                Cancelar
              </button>
              <button
                onClick={doConfirmBookingRequest}
                disabled={confirmServices.length === 0}
                className="flex-1 px-4 py-3 bg-[#2B0F1E] text-[#E0407F] rounded-xl font-semibold text-sm hover:bg-[#A32A5F] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar cita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

