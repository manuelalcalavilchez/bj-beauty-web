import React from 'react';
import { Home, Plus, Sparkles, BookmarkCheck } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FDEEF3]/95 backdrop-blur-lg border-t border-[#E0407F]/20 px-3 py-2 flex items-center justify-around shadow-2xl">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${activeTab === 'home' ? 'text-[#E0407F]' : 'text-[#2B0F1E]/60 hover:text-[#2B0F1E]'}`}
      >
        <Home className="w-5 h-5" />
        <span>Inicio</span>
      </button>


      {/* Elevated center button */}
      <button
        onClick={() => setActiveTab('booking')}
        className="relative -top-4 w-14 h-14 bg-[#2B0F1E] hover:bg-[#A32A5F] text-[#FDEEF3] rounded-full shadow-xl flex items-center justify-center border-4 border-[#FDEEF3] transition-transform active:scale-95"
        title="Reservar Cita"
      >
        <Plus className="w-7 h-7 text-[#E0407F]" />
      </button>

      <button
        onClick={() => { setActiveTab('home'); window.setTimeout(() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }}
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${false ? 'text-[#E0407F]' : 'text-[#2B0F1E]/60 hover:text-[#2B0F1E]'}`}
      >
        <Sparkles className="w-5 h-5" />
        <span>Servicios</span>
      </button>

      <button
        onClick={() => setActiveTab('mybookings')}
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${activeTab === 'mybookings' ? 'text-[#E0407F]' : 'text-[#2B0F1E]/60 hover:text-[#2B0F1E]'}`}
      >
        <BookmarkCheck className="w-5 h-5" />
        <span>Mis Citas</span>
      </button>
    </div>
  );
};

