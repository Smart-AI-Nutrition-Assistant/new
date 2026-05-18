import React, { useState, useEffect } from 'react';
import { nutritionPlanService } from '../services/api';
import { Loader } from '../components/Loader';
import { RefreshCw, Flame, Utensils, Apple, Clock, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export const NutritionPlan = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchPlan = async () => {
    try {
      const data = await nutritionPlanService.getPlan();
      setPlan(data);
    } catch (err) {
      toast.error('Impossible de charger le plan repas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    const toastId = toast.loading('Régénération de votre plan par l\'IA...');
    try {
      const data = await nutritionPlanService.regeneratePlan();
      setPlan(data);
      toast.success('Nouveau plan nutritionnel généré ! 🥗', { id: toastId });
    } catch (err) {
      toast.error('Erreur lors de la régénération du plan', { id: toastId });
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 text-sm">Veuillez d'abord configurer votre profil pour générer un plan nutritionnel.</p>
      </div>
    );
  }

  const mealColors = {
    breakfast: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    lunch: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    snack: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    dinner: 'border-violet-500/20 bg-violet-500/5 text-violet-400',
  };

  const mealIcons = {
    breakfast: Apple,
    lunch: Utensils,
    snack: Clock,
    dinner: Layers,
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-emerald-950/20 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-200">Plan Repas Intelligent 🥗</h2>
          <p className="text-slate-400 text-sm mt-0.5">Ce plan a été optimisé par l'IA selon vos besoins en calories et macronutriments.</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm shrink-0"
        >
          <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
          Régénérer le plan
        </button>
      </div>

      {/* Plan Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/40 border border-slate-850 p-6 rounded-3xl text-center">
        <div className="border-r border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Calories Cibles</p>
          <p className="text-2xl font-black text-slate-100 mt-1">{plan.totals.calories} <span className="text-xs text-slate-400 font-semibold">kcal</span></p>
        </div>
        <div className="border-r border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-semibold text-emerald-400">Protéines</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{plan.totals.protein}g</p>
        </div>
        <div className="border-r border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-blue-400">Glucides</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{plan.totals.carbs}g</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-amber-400">Lipides</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{plan.totals.fat}g</p>
        </div>
      </div>

      {/* Meals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(plan.meals).map(([mealKey, meal]) => {
          const Icon = mealIcons[mealKey] || Utensils;
          const colorClass = mealColors[mealKey] || '';
          
          return (
            <div key={mealKey} className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${colorClass}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-200 capitalize">{mealKey}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{meal.name}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-slate-900 border border-slate-800 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1">
                    <Flame size={12} /> {meal.calories} kcal
                  </span>
                </div>

                <ul className="space-y-2 mb-6">
                  {meal.items.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Meal Macros breakdown */}
              <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase">PROT</span>
                  <span className="font-bold text-emerald-400 mt-0.5 block">{meal.protein}g</span>
                </div>
                <div className="border-x border-slate-900">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase">CARB</span>
                  <span className="font-bold text-blue-400 mt-0.5 block">{meal.carbs}g</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase">LIP</span>
                  <span className="font-bold text-amber-400 mt-0.5 block">{meal.fat}g</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default NutritionPlan;
