
import React, { useState } from 'react';
import { Sparkles, Search, UserCircle, Menu, X, LayoutDashboard, Terminal, BarChart2, MessageSquare, Briefcase } from 'lucide-react';
import { View } from '../types';

interface NavigationProps {
  currentView: View;
  onNavigate: (view: View) => void;
  userEmail?: string;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, userEmail, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'DASHBOARD' as View, label: 'Nebulamarket', icon: LayoutDashboard },
    { id: 'TERMINAL' as View, label: 'Terminal', icon: Terminal },
    { id: 'INTELLIGENCE' as View, label: 'Analytics', icon: BarChart2 },
    { id: 'ASSISTANT' as View, label: 'Assistant', icon: MessageSquare },
    { id: 'PORTFOLIO' as View, label: 'Portfolio', icon: Briefcase },
  ];

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-[100] px-3 sm:px-6 py-2">
        <div className="max-w-[1600px] mx-auto glass-card rounded-full px-4 sm:px-8 py-2 flex items-center justify-between border-blue-500/10 bg-black/60 backdrop-blur-3xl transition-all duration-500 hover:border-blue-500/30">
          <div className="flex items-center gap-4 lg:gap-12">
            {/* Official Nebulamarket Logo & Brand */}
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => handleNavigate('DASHBOARD')}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm sm:text-lg tracking-tight text-white font-mono uppercase group-hover:text-blue-400 transition-colors">
                Nebula<span className="text-blue-500 group-hover:text-white transition-colors">market</span>
              </span>
            </div>

            {/* Desktop Nav Items */}
            <div className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`text-xs font-bold uppercase tracking-widest transition-all duration-300 relative py-1 hover:-translate-y-0.5 ${
                    currentView === item.id 
                      ? 'text-white' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {item.label}
                  {currentView === item.id && (
                    <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:flex items-center gap-4 text-zinc-500">
              <Search size={16} className="cursor-pointer hover:text-blue-400 hover:scale-110 transition-all duration-300" />
              <div className="w-px h-3 bg-white/10"></div>
              {userEmail && (
                <div 
                  className={`flex items-center gap-2 group cursor-pointer p-1.5 rounded-full transition-all ${currentView === 'PROFILE' ? 'bg-blue-600/10 border border-blue-500/20' : 'hover:bg-white/5'}`}
                  onClick={() => handleNavigate('PROFILE')}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${currentView === 'PROFILE' ? 'bg-blue-600 border-white/20' : 'bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500'}`}>
                    <UserCircle size={14} className={currentView === 'PROFILE' ? 'text-white' : 'text-blue-400 group-hover:text-blue-300'} />
                  </div>
                  <span className={`text-[10px] font-mono hidden xl:block uppercase tracking-wider transition-colors ${currentView === 'PROFILE' ? 'text-blue-400' : 'text-zinc-400 group-hover:text-white'}`}>
                    {userEmail.split('@')[0]}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {userEmail ? (
                <button 
                  onClick={onLogout}
                  className="hidden sm:block px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest border border-white/5 active:scale-95"
                >
                  Sign Out
                </button>
              ) : (
                <button 
                  onClick={() => handleNavigate('TERMINAL')}
                  className="hidden sm:block px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest border border-white/5 active:scale-95"
                >
                  Sign In
                </button>
              )}
              <button 
                onClick={() => handleNavigate('TERMINAL')}
                className="px-4 sm:px-6 py-2.5 rounded-full text-[9px] sm:text-[10px] font-bold text-white bg-blue-600 hover:bg-white hover:text-blue-600 uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                Start Trading
              </button>
            </div>
            
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute right-0 top-0 h-full w-[280px] bg-[#0b0c10] border-l border-white/10 p-6 pt-24 flex flex-col gap-4 shadow-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 px-2">Navigation Menu</div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 ${
                  currentView === item.id 
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
            
            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-3">
              {userEmail && (
                <button
                  onClick={() => handleNavigate('PROFILE')}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 ${
                    currentView === 'PROFILE' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <UserCircle size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Profile</span>
                </button>
              )}
              {userEmail ? (
                <button 
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full px-4 py-4 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all uppercase tracking-widest text-left"
                >
                  Sign Out
                </button>
              ) : (
                <button 
                  onClick={() => handleNavigate('TERMINAL')}
                  className="w-full px-4 py-4 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-500/10 transition-all uppercase tracking-widest text-left"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
