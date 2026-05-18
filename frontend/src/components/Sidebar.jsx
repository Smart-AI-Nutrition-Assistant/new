import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Utensils,
  Moon,
  Dumbbell,
  TrendingUp,
  History,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Assistant IA', path: '/chat', icon: MessageSquare },
    { name: 'Plan Nutrition', path: '/plan', icon: Utensils },
    { name: 'Mode Ramadan', path: '/ramadan', icon: Moon, highlight: true },
    { name: 'Salles de Sport', path: '/gyms', icon: Dumbbell },
    { name: 'Progression', path: '/progress', icon: TrendingUp },
    { name: 'Historique', path: '/history', icon: History },

    { name: 'Profil & Objectifs', path: '/profile', icon: User },
  ];

  return (
    <aside className={`relative glass border-r border-slate-800 transition-all duration-300 flex flex-col h-[calc(100vh-73px)] ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 bg-slate-900 border border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400 text-slate-400 p-1 rounded-full transition-all z-10 shadow-md"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex-1 py-6 overflow-y-auto px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium transition-all group relative
                ${isActive
                  ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }
                ${item.highlight ? 'hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]' : ''}
              `}
            >
              <Icon size={20} className={`${item.highlight ? 'text-amber-400 group-hover:scale-110 transition-transform' : 'group-hover:text-emerald-400 transition-colors'}`} />
              {!isCollapsed && (
                <span className="text-sm truncate">
                  {item.name}
                  {item.highlight && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full">
                      RAMADAN
                    </span>
                  )}
                </span>
              )}

              {/* Tooltip on Collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-xs font-semibold text-emerald-400 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all z-50 shadow-xl">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800/60">
        {!isCollapsed ? (
          <div className="bg-slate-900/50 rounded-xl p-3.5 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">Objectif Actif</p>
            <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-wider">Perte de poids</p>
          </div>
        ) : (
          <div className="flex justify-center text-emerald-400 font-bold text-xs uppercase bg-slate-900/50 py-2 rounded-lg border border-slate-800">
            🔥
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
