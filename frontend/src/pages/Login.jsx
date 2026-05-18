import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Connexion en cours...');
    try {
      const user = await login(email, password);
      toast.success(`Ravi de vous revoir, ${user.username} !`, { id: toastId });
      
      if (user.profileCompleted) {
        navigate('/');
      } else {
        navigate('/complete-profile');
      }
    } catch (err) {
      toast.error(err.message || 'Échec de la connexion', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Visual background blur blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md glass border border-slate-800 p-8 rounded-3xl shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center font-bold text-2xl text-slate-950 mx-auto shadow-lg shadow-emerald-500/20 mb-4">
            🥗
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Bienvenue sur AI Nutrition
          </h2>
          <p className="text-slate-400 text-sm mt-1">Connectez-vous pour continuer votre suivi intelligent</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Adresse Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail size={18} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mot de passe
              </label>
              <a href="#" className="text-xs text-emerald-400 font-semibold hover:underline">
                Oublié ?
              </a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? 'Connexion...' : 'Se Connecter'}
            <LogIn size={18} />
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-slate-400">
          Pas encore de compte ?{' '}
          <Link
            to="/register"
            className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            Créez-en un <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
export default Login;
