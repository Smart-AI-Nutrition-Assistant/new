import React, { useState, useEffect } from 'react';
import { progressService, profileService } from '../services/api';
import { Loader } from '../components/Loader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Flame, Award, Calendar, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Progress = () => {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);

  // Form states
  const [weightInput, setWeightInput] = useState('');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [adherenceInput, setAdherenceInput] = useState(80);

  const fetchProgress = async () => {
    try {
      const pData = await progressService.getProgress();
      setProgress(pData);
      
      const prof = await profileService.getProfile();
      setProfile(prof);
      if (prof) {
        setWeightInput(prof.weight || '');
        setCaloriesInput(prof.calories || '');
      }
    } catch (err) {
      toast.error('Impossible de charger votre progression');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weightInput || !caloriesInput) {
      toast.error('Veuillez remplir le poids et les calories');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Enregistrement de votre progression...');
    try {
      const entry = await progressService.saveProgress(
        Number(weightInput),
        Number(caloriesInput),
        Number(adherenceInput)
      );
      toast.success('Progression enregistrée ! Poids et macros mis à jour.', { id: toastId });
      setProgress((prev) => [...prev, entry]);
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  // Weight Chart Data
  const labels = progress.map((p) => p.date);
  
  const weightChartData = {
    labels,
    datasets: [
      {
        label: 'Poids (kg)',
        data: progress.map((p) => p.weight),
        borderColor: '#10b981', // emerald-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointHoverRadius: 7,
      }
    ],
  };

  // Calories Chart Data
  const caloriesChartData = {
    labels,
    datasets: [
      {
        label: 'Calories Consommées (kcal)',
        data: progress.map((p) => p.calories),
        borderColor: '#3b82f6', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointHoverRadius: 7,
      },
      {
        label: 'Objectif Calories (kcal)',
        data: progress.map(() => profile?.calories || 2000),
        borderColor: '#f59e0b', // amber-500
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#9ca3af', font: { family: 'system-ui', weight: 'bold' } }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        titleColor: '#f3f4f6',
        bodyColor: '#10b981',
        padding: 12,
        boxPadding: 6,
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#6b7280' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#6b7280' }
      }
    }
  };

  const adherenceScore = progress.length > 0
    ? Math.round(progress.reduce((acc, curr) => acc + curr.adherence, 0) / progress.length)
    : 0;

  return (
    <div className="space-y-8 p-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-emerald-950/20 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-200">Suivi Analytique de Progression 📈</h2>
          <p className="text-slate-400 text-sm mt-0.5">Visualisez vos variations de poids, de calories et votre régularité.</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl shrink-0">
          <Award className="text-emerald-400" size={20} />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">Adhérence Globale</span>
            <span className="text-base font-black text-emerald-400 leading-none mt-1 block">{adherenceScore}%</span>
          </div>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="glass border border-slate-800 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider mb-5 flex items-center gap-1.5">
          <Calendar size={16} className="text-emerald-400" />
          Enregistrer les métriques du jour
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Poids du Jour (kg)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Scale size={16} />
              </span>
              <input
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="72.0"
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Calories Consommées
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Flame size={16} />
              </span>
              <input
                type="number"
                value={caloriesInput}
                onChange={(e) => setCaloriesInput(e.target.value)}
                placeholder="2100"
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Adhérence au plan ({adherenceInput}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={adherenceInput}
              onChange={(e) => setAdherenceInput(e.target.value)}
              className="w-full accent-emerald-500 bg-slate-850 h-2 rounded-lg cursor-pointer my-3"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-xs flex items-center justify-center gap-1.5 font-bold"
          >
            <TrendingUp size={16} />
            {saving ? 'Enregistrement...' : 'Valider Entrée'}
          </button>
        </form>
      </div>

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Line Chart */}
        <div className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
              <Scale size={16} className="text-emerald-400" />
              Courbe de Poids
            </h3>
            <p className="text-xs text-slate-500">Fluctuations de masse corporelle (kg) sur la période.</p>
          </div>
          <div className="h-72 w-full">
            <Line data={weightChartData} options={chartOptions} />
          </div>
        </div>

        {/* Calories Line Chart */}
        <div className="glass border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={16} className="text-blue-400" />
              Historique Calorique vs Objectif
            </h3>
            <p className="text-xs text-slate-500">Vérification de la conformité de vos repas vis-à-vis du plan.</p>
          </div>
          <div className="h-72 w-full">
            <Line data={caloriesChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default Progress;
