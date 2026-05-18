import React, { useState, useEffect } from 'react';
import { dashboardService, progressService, mealService } from '../services/api';
import { MetricCard } from '../components/Card';
import { Loader } from '../components/Loader';
import { Flame, Droplet, Target, Scale, Plus, Sparkles, MessageSquare, Utensils, Moon, RefreshCw, AlertCircle, Apple } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingWater, setAddingWater] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('weekly');

  // Meal Form State
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProteins, setMealProteins] = useState('');
  const [mealCarbs, setMealCarbs] = useState('');
  const [mealFats, setMealFats] = useState('');
  const [addingMeal, setAddingMeal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await dashboardService.getDashboardData();
      setData(res);
    } catch (err) {
      toast.error('Impossible de charger les données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAddWater = async (amount) => {
    setAddingWater(true);
    try {
      const current = data.hydration.consumed;
      const target = data.hydration.target;
      const nextVal = Math.min(target * 2, current + amount);
      
      localStorage.setItem('mock_hydration_today', JSON.stringify(nextVal));
      setData((prev) => ({
        ...prev,
        hydration: { ...prev.hydration, consumed: nextVal }
      }));
      toast.success(`+${amount}ml d'eau enregistrés ! 💧`);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de l'eau");
    } finally {
      setAddingWater(false);
    }
  };

  const handleMealSubmit = async (e) => {
    e.preventDefault();
    if (!mealName.trim() || !mealCalories) {
      toast.error("Veuillez saisir le nom du repas et son apport calorique");
      return;
    }

    setAddingMeal(true);
    const toastId = toast.loading(`Enregistrement de "${mealName.trim()}"...`);
    try {
      await mealService.addMeal({
        name: mealName.trim(),
        calories: parseInt(mealCalories),
        proteins: parseFloat(mealProteins || 0),
        carbs: parseFloat(mealCarbs || 0),
        fats: parseFloat(mealFats || 0)
      });
      toast.success(`${mealName.trim()} enregistré avec succès ! 🍲`, { id: toastId });
      
      // Reset form
      setMealName('');
      setMealCalories('');
      setMealProteins('');
      setMealCarbs('');
      setMealFats('');
      
      // Reload stats and charts instantly
      fetchDashboardData();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du repas", { id: toastId });
    } finally {
      setAddingMeal(false);
    }
  };

  const handleQuickMealPreset = async (name, calories, proteins, carbs, fats) => {
    setAddingMeal(true);
    const toastId = toast.loading(`Enregistrement : ${name}...`);
    try {
      await mealService.addMeal({ name, calories, proteins, carbs, fats });
      toast.success(`${name} enregistré ! 🍲`, { id: toastId });
      fetchDashboardData();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement", { id: toastId });
    } finally {
      setAddingMeal(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 px-4">
        <div className="h-16 w-16 bg-slate-900 border border-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          ⚙️
        </div>
        <h3 className="text-xl font-bold text-slate-350">Profil incomplet</h3>
        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
          Complétez vos objectifs physiques pour débloquer le tableau de bord d'activité IA personnalisé.
        </p>
        <Link
          to="/profile"
          className="mt-6 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all"
        >
          Configurer le profil
        </Link>
      </div>
    );
  }

  const calorieProgress = Math.min(100, (data.calories.consumed / data.calories.target) * 100);
  const hydrationProgress = Math.min(100, (data.hydration.consumed / data.hydration.target) * 100);

  // Set chart history depending on weekly vs monthly tab toggle
  const historyData = activeChartTab === 'weekly' ? data.weeklyHistory : data.monthlyHistory;
  const chartLabels = historyData?.map((h) => {
    if (activeChartTab === 'monthly') {
      // Return date suffix (DD/MM) for monthly line chart
      return h.date.substring(8, 10) + '/' + h.date.substring(5, 7);
    }
    return h.label;
  }) || [];
  const chartValues = historyData?.map((h) => h.calories) || [];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Calories Consommées (kcal)',
        data: chartValues,
        backgroundColor: chartValues.map((val) => val > data.calories.target ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.45)'),
        borderColor: chartValues.map((val) => val > data.calories.target ? '#ef4444' : '#10b981'),
        borderWidth: 2,
        borderRadius: activeChartTab === 'weekly' ? 8 : 4,
        hoverBackgroundColor: 'rgba(16, 185, 129, 0.65)',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        titleColor: '#f3f4f6',
        bodyColor: '#10b981',
        padding: 10,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#9ca3af', 
          font: { family: 'system-ui', weight: '600', size: activeChartTab === 'weekly' ? 10 : 8 },
          maxRotation: 45,
          autoSkip: activeChartTab === 'monthly'
        }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#6b7280', font: { size: 9 } }
      }
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Welcome header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-emerald-950/20 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-200">Votre suivi du jour Suivi dynamique 🔥</h2>
          <p className="text-slate-400 text-sm mt-0.5">L'intelligence artificielle a ajusté vos macros. Voici votre statut actuel.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/chat"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all text-sm shadow-md"
          >
            <MessageSquare size={16} /> Parler à l'IA
          </Link>
          <Link
            to="/plan"
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
          >
            <Utensils size={16} /> Repas
          </Link>
        </div>
      </div>

      {/* Main Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Calories Consommées"
          value={`${data.calories.consumed}`}
          unit={`/ ${data.calories.target} kcal`}
          icon={Flame}
          color="emerald"
          progress={calorieProgress}
          detail={`Il reste ${data.calories.remaining} kcal`}
        />

        <MetricCard
          title="Indice de Masse Corporelle"
          value={data.bmi.value}
          icon={Scale}
          color="blue"
          detail={data.bmi.status}
        />

        <MetricCard
          title="Hydratation Quotidienne"
          value={`${(data.hydration.consumed / 1000).toFixed(2)} L`}
          unit={`/ ${(data.hydration.target / 1000).toFixed(1)} L`}
          icon={Droplet}
          color="blue"
          progress={hydrationProgress}
          detail={hydrationProgress >= 100 ? 'Hydratation optimale atteinte ! 🌟' : 'Rappel : buvez régulièrement'}
        />

        <MetricCard
          title="Adhérence au plan"
          value={`${data.adherenceScore}`}
          unit="%"
          icon={Target}
          color="violet"
          progress={data.adherenceScore}
          detail={data.isNew ? "Pas encore de données" : "Données historiques actives"}
        />
      </div>

      {/* Empty state alert for new users */}
      {data.isNew && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 p-6 rounded-3xl flex items-start gap-4 animate-pulse">
          <div className="p-3 bg-emerald-500/10 text-emerald-450 border border-emerald-500/25 rounded-2xl shrink-0">
            <AlertCircle size={22} />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-200">Bienvenue dans votre espace nutrition ! 🎉</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              C'est votre premier jour ou aucun repas n'est enregistré. Votre compteur démarre à <strong>0 / {data.calories.target} kcal</strong>.
              Saisissez votre premier repas dans le module interactif ci-dessous pour lancer vos graphiques et vos statistiques en temps réel !
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calories historical charts (Weekly / Monthly toggles) */}
        <div className="lg:col-span-2 glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <Flame size={16} className="text-emerald-400" />
                Historique Calorique Consommé
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Apports caloriques journaliers vs Objectif ({data.calories.target} kcal).</p>
            </div>
            
            {/* Chart toggle switch */}
            <div className="flex bg-slate-950/85 p-1 rounded-xl border border-slate-800 self-start sm:self-center">
              <button
                onClick={() => setActiveChartTab('weekly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeChartTab === 'weekly'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setActiveChartTab('monthly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeChartTab === 'monthly'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mois (30j)
              </button>
            </div>
          </div>

          <div className="h-64 w-full relative">
            {data.isNew ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-slate-950/20 rounded-2xl">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Aucune donnée historique</p>
                <p className="text-[10px] text-slate-600 mt-1 max-w-xs">Enregistrez vos repas à droite pour tracer vos premiers points.</p>
              </div>
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Dynamic Meal Logger Panel */}
        <div className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Apple size={16} className="text-emerald-400" /> Ajouter un Repas (Meal Logger)
            </h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              Enregistrez vos apports alimentaires pour mettre à jour vos statistiques et vos graphiques instantanément.
            </p>

            {/* Quick presets recipes */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                disabled={addingMeal}
                onClick={() => handleQuickMealPreset("Poulet Riz Basmati 🍗", 550, 42, 65, 12)}
                className="p-2 bg-slate-900/60 hover:bg-slate-850 hover:text-emerald-400 hover:border-emerald-500/20 border border-slate-800/80 text-[10px] font-bold text-slate-350 rounded-xl transition-all flex flex-col items-start gap-0.5 active:scale-95 disabled:opacity-50 text-left cursor-pointer"
              >
                <span className="truncate">Poulet Riz Basmati</span>
                <span className="text-[9px] text-slate-500 font-semibold">+550 kcal (42g P)</span>
              </button>
              <button
                disabled={addingMeal}
                onClick={() => handleQuickMealPreset("Avoine Whey Banane 🥣", 420, 32, 55, 8)}
                className="p-2 bg-slate-900/60 hover:bg-slate-850 hover:text-emerald-400 hover:border-emerald-500/20 border border-slate-800/80 text-[10px] font-bold text-slate-350 rounded-xl transition-all flex flex-col items-start gap-0.5 active:scale-95 disabled:opacity-50 text-left cursor-pointer"
              >
                <span className="truncate">Avoine Whey Banane</span>
                <span className="text-[9px] text-slate-500 font-semibold">+420 kcal (32g P)</span>
              </button>
              <button
                disabled={addingMeal}
                onClick={() => handleQuickMealPreset("Omelette Avocat Toast 🍳", 480, 24, 30, 26)}
                className="p-2 bg-slate-900/60 hover:bg-slate-850 hover:text-emerald-400 hover:border-emerald-500/20 border border-slate-800/80 text-[10px] font-bold text-slate-350 rounded-xl transition-all flex flex-col items-start gap-0.5 active:scale-95 disabled:opacity-50 text-left cursor-pointer"
              >
                <span className="truncate">Omelette Avocat</span>
                <span className="text-[9px] text-slate-500 font-semibold">+480 kcal (24g P)</span>
              </button>
              <button
                disabled={addingMeal}
                onClick={() => handleQuickMealPreset("Snack Olives Amandes 🌰", 200, 6, 8, 16)}
                className="p-2 bg-slate-900/60 hover:bg-slate-850 hover:text-emerald-400 hover:border-emerald-500/20 border border-slate-800/80 text-[10px] font-bold text-slate-350 rounded-xl transition-all flex flex-col items-start gap-0.5 active:scale-95 disabled:opacity-50 text-left cursor-pointer"
              >
                <span className="truncate">Olives & Amandes</span>
                <span className="text-[9px] text-slate-500 font-semibold">+200 kcal (6g P)</span>
              </button>
            </div>

            {/* Custom Add Meal Form */}
            <form onSubmit={handleMealSubmit} className="mt-4 space-y-2.5">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nom du repas / Aliment
                </label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="Ex: Salade thon oeuf"
                  disabled={addingMeal}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-650"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    value={mealCalories}
                    onChange={(e) => setMealCalories(e.target.value)}
                    placeholder="Ex: 350"
                    disabled={addingMeal}
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Protéines (g)
                  </label>
                  <input
                    type="number"
                    value={mealProteins}
                    onChange={(e) => setMealProteins(e.target.value)}
                    placeholder="Ex: 25"
                    disabled={addingMeal}
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Glucides (g)
                  </label>
                  <input
                    type="number"
                    value={mealCarbs}
                    onChange={(e) => setMealCarbs(e.target.value)}
                    placeholder="Ex: 40"
                    disabled={addingMeal}
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Lipides (g)
                  </label>
                  <input
                    type="number"
                    value={mealFats}
                    onChange={(e) => setMealFats(e.target.value)}
                    placeholder="Ex: 12"
                    disabled={addingMeal}
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingMeal}
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <Plus size={14} /> Enregistrer le repas
              </button>
            </form>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 mt-4 text-[11px] text-slate-400 text-center font-medium flex justify-between px-4">
            <span>Consommé: <span className="font-bold text-emerald-400">{data.calories.consumed} kcal</span></span>
            <span>Objectif: <span className="font-bold text-slate-350">{data.calories.target} kcal</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Macros breakdown (Daily Nutrition Summary) */}
        <div className="lg:col-span-2 glass border border-slate-800 rounded-3xl p-6">
          <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-6">Répartition Nutritionnelle du jour</h3>
          <div className="space-y-5">
            {/* Protein */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Protéines (30%)
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {data.macros.protein.consumed}g / {data.macros.protein.target}g
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.macros.protein.target ? (data.macros.protein.consumed / data.macros.protein.target) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span> Glucides (45%)
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {data.macros.carbs.consumed}g / {data.macros.carbs.target}g
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.macros.carbs.target ? (data.macros.carbs.consumed / data.macros.carbs.target) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Lipides (25%)
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {data.macros.fat.consumed}g / {data.macros.fat.target}g
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.macros.fat.target ? (data.macros.fat.consumed / data.macros.fat.target) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick water tracker */}
        <div className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Droplet size={16} className="text-blue-400" /> Hydratation Rapide
            </h3>
            <p className="text-xs text-slate-400">Ajoutez de l'eau en un clic pour maintenir vos objectifs rénaux.</p>

            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <button
                disabled={addingWater}
                onClick={() => handleAddWater(250)}
                className="py-3 bg-slate-900 hover:bg-slate-850 hover:text-blue-400 hover:border-blue-500/20 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl transition-all flex flex-col items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Plus size={14} /> 250ml
                <span className="text-[10px] text-slate-500 font-semibold">1 Verre</span>
              </button>
              <button
                disabled={addingWater}
                onClick={() => handleAddWater(500)}
                className="py-3 bg-slate-900 hover:bg-slate-850 hover:text-blue-400 hover:border-blue-500/20 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl transition-all flex flex-col items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Plus size={14} /> 500ml
                <span className="text-[10px] text-slate-500 font-semibold">Petite Bouteille</span>
              </button>
              <button
                disabled={addingWater}
                onClick={() => handleAddWater(1000)}
                className="py-3 bg-slate-900 hover:bg-slate-850 hover:text-blue-400 hover:border-blue-500/20 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl transition-all flex flex-col items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Plus size={14} /> 1.0 L
                <span className="text-[10px] text-slate-500 font-semibold">Grande Bouteille</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 mt-4 text-[11px] text-slate-400 text-center font-medium">
            🎯 Cible actuelle : <span className="font-bold text-blue-400">{data.hydration.target}ml</span>
          </div>
        </div>
      </div>

      {/* AI Recommendations List */}
      <div className="glass border border-slate-800 rounded-3xl p-6">
        <h3 className="text-base font-bold text-slate-350 uppercase tracking-wider mb-5 flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-400" />
          Recommandations Nutritionnelles de l'IA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.recommendations.map((rec, index) => (
            <div key={index} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-start gap-3.5">
              <span className="h-6 w-6 bg-emerald-500/10 text-emerald-450 font-black rounded-lg text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
                {index + 1}
              </span>
              <p className="text-xs leading-relaxed text-slate-400 font-medium">{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
