import React, { useState, useEffect } from 'react';
import { ramadanService } from '../services/api';
import { Loader } from '../components/Loader';
import { Moon, Star, Flame, Droplet, Coffee, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export const RamadanMode = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRamadanData = async () => {
    try {
      const res = await ramadanService.getRamadanData();
      setData(res);
    } catch (err) {
      toast.error('Impossible de charger le mode Ramadan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRamadanData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-sm">Veuillez activer le mode Ramadan dans votre profil pour voir ces recommandations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Sacred Aesthetic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-amber-950/40 to-slate-900/60 border border-amber-500/10 p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-3xl text-amber-400">
            🌙
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
              Mode Ramadan Activé
              <Star size={14} className="text-amber-400 fill-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">Optimisation des repas de nuit pour maximiser l'énergie de journée et la digestion.</p>
          </div>
        </div>
        <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl uppercase tracking-wider self-start md:self-center">
          Jeûne Actif
        </span>
      </div>

      {/* Meals Division: Shour, Iftar, Tarawih Snack */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shour */}
        <div className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-500/25 transition-all group">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Coffee size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-200">Le Shour</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Repas de pré-jeûne</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-slate-900 border border-slate-850 text-amber-400 px-3 py-1 rounded-full flex items-center gap-1">
                <Flame size={12} /> {data.shour.calories} kcal
              </span>
            </div>

            <p className="text-xs font-semibold text-amber-400 mb-4">{data.shour.name}</p>

            <ul className="space-y-3 mb-6">
              {data.shour.items.map((item, idx) => (
                <li key={idx} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                  <Star size={10} className="text-amber-500 shrink-0 mt-0.5 fill-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">PROT</span>
              <span className="font-bold text-emerald-450 mt-0.5 block">{data.shour.macros.protein}g</span>
            </div>
            <div className="border-x border-slate-900">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">CARB</span>
              <span className="font-bold text-blue-450 mt-0.5 block">{data.shour.macros.carbs}g</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">LIP</span>
              <span className="font-bold text-amber-450 mt-0.5 block">{data.shour.macros.fat}g</span>
            </div>
          </div>
        </div>

        {/* Iftar */}
        <div className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-500/25 transition-all group">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-200">L'Iftar</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Rupture du jeûne</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-slate-900 border border-slate-850 text-amber-400 px-3 py-1 rounded-full flex items-center gap-1">
                <Flame size={12} /> {data.iftar.calories} kcal
              </span>
            </div>

            <p className="text-xs font-semibold text-emerald-400 mb-4">{data.iftar.name}</p>

            <ul className="space-y-3 mb-6">
              {data.iftar.items.map((item, idx) => (
                <li key={idx} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                  <Star size={10} className="text-emerald-500 shrink-0 mt-0.5 fill-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">PROT</span>
              <span className="font-bold text-emerald-450 mt-0.5 block">{data.iftar.macros.protein}g</span>
            </div>
            <div className="border-x border-slate-900">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">CARB</span>
              <span className="font-bold text-blue-450 mt-0.5 block">{data.iftar.macros.carbs}g</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">LIP</span>
              <span className="font-bold text-amber-450 mt-0.5 block">{data.iftar.macros.fat}g</span>
            </div>
          </div>
        </div>

        {/* Post-Tarawih Snack */}
        <div className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-500/25 transition-all group">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:scale-105 transition-transform">
                  <Heart size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-200">Post-Tarawih</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Collation de récupération</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-slate-900 border border-slate-850 text-amber-400 px-3 py-1 rounded-full flex items-center gap-1">
                <Flame size={12} /> {data.tarawihSnack.calories} kcal
              </span>
            </div>

            <p className="text-xs font-semibold text-violet-400 mb-4">{data.tarawihSnack.name}</p>

            <ul className="space-y-3 mb-6">
              {data.tarawihSnack.items.map((item, idx) => (
                <li key={idx} className="text-xs text-slate-400 flex items-start gap-2 leading-relaxed">
                  <Star size={10} className="text-violet-500 shrink-0 mt-0.5 fill-violet-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">PROT</span>
              <span className="font-bold text-emerald-450 mt-0.5 block">{data.tarawihSnack.macros.protein}g</span>
            </div>
            <div className="border-x border-slate-900">
              <span className="block text-[9px] font-bold text-slate-500 uppercase">CARB</span>
              <span className="font-bold text-blue-450 mt-0.5 block">{data.tarawihSnack.macros.carbs}g</span>
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase">LIP</span>
              <span className="font-bold text-amber-450 mt-0.5 block">{data.tarawihSnack.macros.fat}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hydration Tips Banner */}
      <div className="glass border border-slate-800 rounded-3xl p-6">
        <h3 className="text-base font-bold text-amber-400 uppercase tracking-wider mb-5 flex items-center gap-2">
          <Droplet size={18} /> Hydratation nocturne intelligente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.hydrationTips.map((tip, index) => (
            <div key={index} className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl flex items-start gap-3.5">
              <span className="h-6 w-6 bg-amber-500/10 text-amber-400 font-black rounded-lg text-xs flex items-center justify-center shrink-0 border border-amber-500/20">
                💧
              </span>
              <p className="text-xs leading-relaxed text-slate-400 font-medium">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default RamadanMode;
