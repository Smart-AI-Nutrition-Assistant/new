import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { docService, profileService } from '../services/api';
import { Loader } from '../components/Loader';
import { User, Shield, Moon, Droplet, FileText, Upload, Compass, Scale, Activity, Award, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TUNISIA_CITIES = [
  "Tunis", "Sfax", "Sousse", "Ettadhamen", "Kairouan", "Bizerte", "Gabes", 
  "Aryanah", "Gafsa", "La Marsa", "Ben Arous", "Kasserine", "Monastir", 
  "Houmt El Souk", "Tataouine", "Medenine", "Beja", "Nabeul", "El Kef", "Mahdia"
];

export const UserProfile = () => {
  const { user, saveProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
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

  const [files, setFiles] = useState([]);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const profile = await profileService.getProfile();
        if (profile) {
          setFormData({
            age: profile.age || 24,
            gender: profile.gender || 'homme',
            weight: profile.weight_kg || profile.weight || 72,
            height: profile.taille_cm || profile.height || 175,
            activity: profile.activite || profile.activity || 'modere',
            objectif: profile.objectif || 'perdre_poids',
            allergies: profile.allergies || '',
            foodPreferences: profile.foodPreferences || '',
            ramadanMode: profile.ramadan_mode || profile.ramadanMode || false,
            ville: profile.ville || 'Tunis',
            latitude: profile.user_latitude || profile.latitude || 36.8065,
            longitude: profile.user_longitude || profile.longitude || 10.1957,
          });
        }
      } catch (err) {
        toast.error("Erreur lors de la récupération des données de profil");
      }
    };
    loadProfileData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Mise à jour de votre profil...');
    try {
      await saveProfile(formData);
      toast.success('Profil mis à jour avec succès !', { id: toastId });
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du profil', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    const toastId = toast.loading("Recherche de votre position GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lon }));
        toast.success("Position GPS mise à jour !", { id: toastId });
      },
      (error) => {
        toast.error(`Localisation indisponible : ${error.message}`, { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUploadDocs = async () => {
    if (files.length === 0) {
      toast.error("Veuillez sélectionner au moins un fichier");
      return;
    }
    setUploading(true);
    const toastId = toast.loading("Upload et reconstruction de l'index RAG FAISS...");
    try {
      const res = await docService.uploadDocs(files);
      toast.success(res.message || "Base de connaissances RAG réindexée !", { id: toastId });
      setFiles([]);
    } catch (err) {
      toast.error("Erreur lors de l'upload ou de l'indexation", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-emerald-950/20 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-200">Mon Profil & Objectifs ⚙️</h2>
          <p className="text-slate-400 text-sm mt-0.5">Ajustez vos préférences et mettez à jour vos données de suivi corporel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Profile Settings form */}
        <div className="lg:col-span-2 glass border border-slate-800 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider mb-6 flex items-center gap-1.5 pb-3 border-b border-slate-850">
            <User size={16} className="text-emerald-400" />
            Paramètres Généraux
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Âge
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Sexe
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none"
                >
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Poids Actuel (kg)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Scale size={16} />
                  </span>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none"
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
                    <Compass size={16} />
                  </span>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Activité Physique
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Activity size={16} />
                  </span>
                  <select
                    name="activity"
                    value={formData.activity}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none"
                  >
                    <option value="sedentaire">Sédentaire</option>
                    <option value="leger">Légèrement actif</option>
                    <option value="modere">Modérément actif</option>
                    <option value="intense">Très actif</option>
                    <option value="athlete">Athlète</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Objectif Final
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Award size={16} />
                  </span>
                  <select
                    name="objectif"
                    value={formData.objectif}
                    onChange={handleChange}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none"
                  >
                    <option value="perdre_poids">Perdre du poids</option>
                    <option value="maintenir">Maintenir sa forme</option>
                    <option value="prendre_masse">Prendre de la masse</option>
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
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none"
                >
                  {TUNISIA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Position GPS
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${formData.latitude}, ${formData.longitude}`}
                    disabled
                    className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 outline-none"
                  />
                  <button
                    onClick={captureLocation}
                    type="button"
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-emerald-400 text-xs px-3 rounded-xl transition-all active:scale-95"
                  >
                    📍 Localiser
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Allergies
                </label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none"
                  placeholder="Ex: Gluten"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Préférences Alimentaires
                </label>
                <input
                  type="text"
                  name="foodPreferences"
                  value={formData.foodPreferences}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none"
                  placeholder="Ex: Végétarien"
                />
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                  <Moon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-250 text-sm">🌙 Mode Ramadan Quotidien</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Adaptation nocturne macro-nutritionnelle</p>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-xs flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader size="sm" /> : <CheckCircle2 size={16} />}
              {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </button>
          </form>
        </div>

        {/* FAISS reindexing / documents upload container */}
        <div className="glass border border-slate-800 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={16} className="text-emerald-400" />
              Base de Connaissances RAG
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ajoutez vos documents nutrition (PDF, TXT, MD) dans data/ et reconstruisez l'index vectoriel FAISS.
            </p>
          </div>

          <div className="space-y-4">
            <div
              className="w-full h-36 border-2 border-dashed border-slate-800 hover:border-slate-700/80 rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all bg-slate-900/10"
              onClick={() => document.getElementById('docs-input').click()}
            >
              <input
                id="docs-input"
                type="file"
                multiple
                className="hidden"
                accept=".txt,.md,.pdf"
                onChange={handleFileChange}
              />
              <Upload size={20} className="text-slate-500 mb-2" />
              <span className="text-xs font-bold text-slate-350">Sélectionner des documents</span>
              <span className="text-[10px] text-slate-500 mt-1">PDF, TXT ou Markdown</span>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fichiers à indexer ({files.length}) :</p>
                <div className="max-h-24 overflow-y-auto space-y-1.5">
                  {files.map((file, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-850 px-3 py-1.5 rounded-xl text-[10px] text-slate-300 font-medium truncate">
                      📄 {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleUploadDocs}
              disabled={uploading || files.length === 0}
              className="w-full bg-slate-900 hover:bg-slate-850 hover:text-slate-200 border border-slate-800 disabled:opacity-50 disabled:pointer-events-none text-xs font-bold text-slate-400 py-3 rounded-xl transition-all active:scale-95"
            >
              {uploading ? 'Reconstruction FAISS...' : 'Indexation FAISS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UserProfile;
