import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Sun, Moon, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = ({ darkMode, setDarkMode }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-30 w-full glass border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-emerald-500/20">
          🥗
        </div>
        <div>
          <span className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            AI Nutrition
          </span>
          <span className="text-xs block text-slate-400 font-medium">Smart Health Coach</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Dark/Light mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
          title="Toggle Theme"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications mock */}
        <button className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-all relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 border border-slate-900 rounded-full"></span>
        </button>

        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="h-9 w-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-200">
                <User size={16} />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-200 leading-tight">
                  {user.username || 'User'}
                </p>
                <p className="text-xs text-emerald-400 font-medium leading-none">
                  {user.profileCompleted ? `${user.profile.calories} kcal` : 'Complete Profile'}
                </p>
              </div>
            </Link>

            <button
              onClick={logout}
              className="p-2 ml-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
