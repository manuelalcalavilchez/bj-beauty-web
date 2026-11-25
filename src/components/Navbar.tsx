import React, { useState } from 'react';
import { Calendar, UserCheck, BookmarkCheck, Menu, X, Home, Sparkles } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-[#FFF7FA]/90 backdrop-blur-md border-b border-[#E3C77A]/60 px-4 lg:px-12 py-3.5 flex items-center justify-between gap-8">
      <button
        onClick={() => handleNavClick('home')}
        className="text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0407F] rounded-md whitespace-nowrap shrink-0"
        aria-label="Ir al inicio"
      >
        <BJLogo variant="compact" />
      </button>

      <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-7 text-xs uppercase tracking-wider font-semibold text-[#5D4A57]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'border-[#E0407F] text-[#14101A]'
                  : 'border-transparent hover:border-[#E3C77A] hover:text-[#14101A]'
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="text-[11px] font-bold text-[#E0407F] tabular-nums">
                  ({item.badge})
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => handleNavClick('booking')}
          className="px-5 py-2.5 bg-[#E0407F] hover:bg-[#C8326D] text-white text-xs font-semibold uppercase tracking-widest rounded-full shadow-[0_6px_20px_rgba(224,64,127,0.25)] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>Reservar Cita</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2.5 rounded-full border border-[#E3C77A] bg-white/80 text-[#14101A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0407F]"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#FFF7FA] border-b border-[#E3C77A] shadow-xl p-5 lg:hidden flex flex-col gap-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full py-3 px-4 rounded-xl text-left text-xs uppercase font-semibold tracking-wider flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-[#F9C9DA]/60 text-[#14101A] border border-[#E3C77A]'
                    : 'bg-white/80 text-[#5D4A57] border border-[#E3C77A]/40 hover:text-[#14101A]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#E0407F]" />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="text-xs font-bold text-[#E0407F] tabular-nums">
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
