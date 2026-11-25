import React, { useState } from 'react';
import { Calendar, UserCheck, BookmarkCheck, Menu, X, Home } from 'lucide-react';
import { BJLogo } from './BJLogo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bookingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, bookingCount }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'services', label: 'Servicios', icon: Sparkles },
    { id: 'mybookings', label: 'Mis Citas', badge: bookingCount > 0 ? bookingCount : undefined, icon: BookmarkCheck },
    { id: 'admin', label: 'Cabina Staff', icon: UserCheck },
  ];

  const handleNavClick = (tabId: string) => {
    if (tabId === 'services') {
      setActiveTab('home');
      setMobileMenuOpen(false);
      window.setTimeout(() => {
        document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
      return;
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E0407F]/35 px-4 lg:px-12 py-3.5 flex items-center justify-between shadow-xs">
      <button
        onClick={() => handleNavClick('home')}
        className="text-left group cursor-pointer focus:outline-none flex items-center gap-3"
        aria-label="Ir al inicio"
      >
        <BJLogo variant="compact" />
      </button>

      <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-4 text-xs uppercase tracking-wider font-bold text-[#141414]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#2B0F1E] text-white shadow-[0_4px_18px_rgba(232,62,140,.12)]'
                  : 'hover:bg-[#E0407F]/15 text-[#2B0F1E]/80 hover:text-[#2B0F1E]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E83E8C]' : 'text-[#E83E8C]'}`} />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-1 w-4 h-4 rounded-full bg-[#E83E8C] text-[#141414] text-[10px] flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleNavClick('booking')}
          className="px-5 py-2.5 bg-[#E0407F] hover:bg-[#F27AA8] text-[#141414] text-xs font-bold uppercase tracking-widest rounded-lg shadow-[0_6px_20px_rgba(232,62,140,.18)] transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <Calendar className="w-4 h-4" />
          <span>Reservar Cita</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-[#2B0F1E] text-white focus:outline-none"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#FDEEF3] border-b border-[#E0407F]/30 shadow-2xl p-6 lg:hidden flex flex-col gap-3 animate-fadeIn">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full py-3 px-4 rounded-xl text-left text-xs uppercase font-bold tracking-wider flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-[#2B0F1E] text-white'
                    : 'bg-white text-[#141414] border border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#E83E8C]" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="w-5 h-5 rounded-full bg-[#E83E8C] text-[#141414] text-xs flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

const Sparkles = () => <span className="w-4 h-4" />;
