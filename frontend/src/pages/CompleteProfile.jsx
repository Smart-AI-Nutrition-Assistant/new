import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, Activity, Apple, Award, Moon, Compass, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const TUNISIA_CITIES = [
  "Tunis", "Sfax", "Sousse", "Ettadhamen", "Kairouan", "Bizerte", "Gabes", 
  "Aryanah", "Gafsa", "La Marsa", "Ben Arous", "Kasserine", "Monastir", 
  "Houmt El Souk", "Tataouine", "Medenine", "Beja", "Nabeul", "El Kef", "Mahdia"
];

export const CompleteProfile = () => {
  const { saveProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: 24,
    gender: 'homme',
    weight: 72,
    height: 175,
    activity: 'modere',
    objectif: 'perdre_poids',
    allergies: '',
    foodPreferences: '',
    ramadanMode: false,
    ville: 'Tunis',
    latitude: 36.8065,
    longitude: 10.1957,
  });

  // Calculate live estimates
  const [estimates, setEstimates] = useState({ bmi: 23.5, calories: 2100, protein: 158, fat: 58, carbs: 236 });

  useEffect(() => {
    // Live estimate macros
    const { age, weight, height, gender, activity, objectif } = formData;
    let bmr = 0;
    if (gender === 'homme') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }

    const multipliers = {
      sedentaire: 1.2,
      leger: 1.375,
      modere: 1.55,
      intense: 1.725,
      athlete: 1.9,
    };

    const mult = multipliers[activity] || 1.55;
    let kcal = Math.round(bmr * mult);

    if (objectif === 'perdre_poids') kcal -= 500;
    else if (objectif === 'prendre_masse') kcal += 500;

    const p = Math.round((kcal * 0.3) / 4);
    const f = Math.round((kcal * 0.25) / 9);
    const c = Math.round((kcal * 0.45) / 4);
    const bmiVal = Number((weight / ((height / 100) * (height / 100))).toFixed(1));

    setEstimates({ bmi: bmiVal, calories: kcal, protein: p, fat: f, carbs: c });
  }, [formData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSliderChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    toast.loading("Recherche de votre position...", { id: 'geo' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lon }));
        toast.success("Position capturée avec succès !", { id: 'geo' });
      },
      (error) => {
        toast.error(`Erreur de localisation : ${error.message}`, { id: 'geo' });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async () => {
    const loadId = toast.loading("Sauvegarde de votre profil...");
    try {
      await saveProfile(formData);
      toast.success("Profil complété avec succès !", { id: loadId });
      navigate('/');
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde du profil", { id: loadId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background blurs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-3xl glass border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
            Étape {step} sur 3
          </span>
          <h2 className="text-3xl font-extrabold text-slate-100 mt-2 bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Configuration de votre profil
          </h2>
          <p className="text-slate-400 text-sm mt-1">Personnalisons vos métriques pour calibrer l'intelligence artificielle</p>
        </div>

        {/* Step Indicator Line */}
        <div className="w-full h-1.5 bg-slate-900 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        {/* Step 1: Physical Parameters */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Âge ({formData.age} ans)
                </label>
                <input
                  type="range"
                  min="14"
                  max="90"
                  value={formData.age}
                  onChange={(e) => handleSliderChange('age', e.target.value)}
                  className="w-full accent-emerald-500 bg-slate-850 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>14 ans</span>
                  <span>90 ans</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Sexe Biologique
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, gender: 'homme' }))}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${formData.gender === 'homme' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    Homme
                  </button>
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, gender: 'femme' }))}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${formData.gender === 'femme' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    Femme
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Poids (kg)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Scale size={18} />
                  </span>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none"
                    placeholder="72"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Taille (cm)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Compass size={18} />
                  </span>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none"
                    placeholder="175"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Activity & Objectives */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Niveau d'Activité
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Activity size={18} />
                  </span>
                  <select
                    name="activity"
                    value={formData.activity}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none appearance-none"
                  >
                    <option value="sedentaire">Sédentaire (Bureau, peu de sport)</option>
                    <option value="leger">Légèrement actif (1-2 séances/semaine)</option>
                    <option value="modere">Modérément actif (3-5 séances/semaine)</option>
                    <option value="intense">Très actif (6-7 séances intensives)</option>
                    <option value="athlete">Athlète professionnel / Travail très physique</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Objectif Nutritionnel
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Award size={18} />
                  </span>
                  <select
                    name="objectif"
                    value={formData.objectif}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none appearance-none"
                  >
                    <option value="perdre_poids">Perdre du poids / Sécher</option>
                    <option value="maintenir">Maintenir sa forme / Recomposition</option>
                    <option value="prendre_masse">Prendre de la masse / Bulk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Ville (Tunisie)
                </label>
                <select
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none appearance-none"
                >
                  {TUNISIA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Localisation (GPS Salles de sport)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${formData.latitude}, ${formData.longitude}`}
                    disabled
                    className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-400 outline-none"
                  />
                  <button
                    onClick={captureLocation}
                    type="button"
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 text-xs px-3 rounded-xl transition-all active:scale-95"
                  >
                    📍 Capturer
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold px-6 py-3 rounded-xl transition-all"
              >
                Retour
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Food Preferences, Ramadan & Live Auto-Calculates */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Allergies Alimentaires
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Apple size={18} />
                  </span>
                  <input
                    type="text"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    placeholder="Ex: Gluten, Arachides (Optionnel)"
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Préférences Alimentaires
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Sparkles size={18} />
                  </span>
                  <input
                    type="text"
                    name="foodPreferences"
                    value={formData.foodPreferences}
                    onChange={handleChange}
                    placeholder="Ex: Végétarien, Keto, Riche en Protéines"
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-650"
                  />
                </div>
              </div>
            </div>

            {/* Ramadan Mode Toggle */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                  <Moon size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">🌙 Mode Ramadan</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Activez le plan repas spécifique Shour/Iftar et l'hydratation de nuit</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="ramadanMode"
                  checked={formData.ramadanMode}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950"></div>
              </label>
            </div>

            {/* LIVE AUTO CALCULATE REVEAL CARD */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-400" />
                Calculs Auto Estimés
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">IMC</p>
                  <p className="text-lg font-black text-emerald-400 mt-1">{estimates.bmi}</p>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Calories</p>
                  <p className="text-lg font-black text-emerald-400 mt-1">{estimates.calories} kcal</p>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Protéines</p>
                  <p className="text-lg font-black text-emerald-400 mt-1">{estimates.protein}g</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold px-6 py-3 rounded-xl transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Finaliser Profil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CompleteProfile;
