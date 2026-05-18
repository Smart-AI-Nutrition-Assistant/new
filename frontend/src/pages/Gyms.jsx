import React, { useState, useEffect } from 'react';
import { gymService, profileService } from '../services/api';
import { Loader } from '../components/Loader';
import { Dumbbell, Star, MapPin, Compass, DollarSign, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export const Gyms = () => {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState({ lat: 36.8065, lon: 10.1957 }); // Default Tunis
  const [locating, setLocating] = useState(false);

  const fetchGyms = async (lat, lon) => {
    setLoading(true);
    try {
      const data = await gymService.getNearbyGyms(lat, lon);
      setGyms(data);
    } catch (err) {
      toast.error('Impossible de charger les salles de sport');
    } finally {
      setLoading(false);
    }
  };

  const getPosition = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setLocating(true);
    const toastId = toast.loading("Recherche de votre position GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        setCoords({ lat, lon });
        toast.success("Localisation détectée avec succès !", { id: toastId });
        setLocating(false);
        fetchGyms(lat, lon);
      },
      (error) => {
        toast.error(`Localisation refusée : ${error.message}. Fallback Tunisie par défaut.`, { id: toastId });
        setLocating(false);
        fetchGyms(coords.lat, coords.lon);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    // Load based on profile coordinates first
    const loadProfileCoords = async () => {
      try {
        const profile = await profileService.getProfile();
        if (profile && profile.user_latitude && profile.user_longitude) {
          setCoords({ lat: profile.user_latitude, lon: profile.user_longitude });
          fetchGyms(profile.user_latitude, profile.user_longitude);
        } else {
          fetchGyms(coords.lat, coords.lon);
        }
      } catch (err) {
        fetchGyms(coords.lat, coords.lon);
      }
    };
    loadProfileCoords();
  }, []);

  return (
    <div className="space-y-8 p-6">
      {/* Header with location detection triggers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-emerald-950/20 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-200">Salles de Sport à proximité 📍</h2>
          <p className="text-slate-400 text-sm mt-0.5">Salles adaptées proches de votre position géographique ({coords.lat}, {coords.lon}).</p>
        </div>
        <button
          onClick={getPosition}
          disabled={locating}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm shrink-0"
        >
          <Compass size={16} className={locating ? 'animate-spin' : ''} />
          {locating ? 'Détection GPS...' : 'Détecter ma position live'}
        </button>
      </div>

      {loading ? (
        <div className="h-full flex items-center justify-center py-20">
          <Loader size="lg" />
        </div>
      ) : gyms.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Aucune salle de sport trouvée dans cette région.
        </div>
      ) : (
        /* Gym Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gyms.map((gym) => (
            <div key={gym.id} className="glass border border-slate-800 hover:border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-between hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all">
              <div>
                <div className="flex justify-between items-start gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                      <Dumbbell size={18} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-200">{gym.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-rose-450" /> {gym.distance} de vous
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full shrink-0">
                    <Star size={12} className="fill-amber-400 text-amber-400" /> {gym.rating}
                  </span>
                </div>

                <div className="text-xs text-slate-400 space-y-2 mt-4">
                  <p className="flex items-center gap-2 font-medium">
                    <Compass size={14} className="text-slate-500" /> {gym.address}
                  </p>
                  <p className="flex items-center gap-2 font-medium">
                    <DollarSign size={14} className="text-emerald-500" /> Prix Indicatif : <span className="font-bold text-slate-200">{gym.price}</span>
                  </p>
                </div>

                {/* Features Badges */}
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {gym.features.map((feat, idx) => (
                    <span key={idx} className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex gap-2">
                <button
                  onClick={() => toast.success(`Contact direct simulé pour ${gym.name} ! 📞`)}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 hover:text-slate-200 border border-slate-800 text-xs font-bold text-slate-400 py-3 rounded-xl transition-all active:scale-95"
                >
                  Contacter la salle
                </button>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${gym.name}+${gym.address}`, '_blank')}
                  className="bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:text-emerald-350 p-3 rounded-xl transition-all active:scale-95"
                  title="Voir sur Google Maps"
                >
                  <MapPin size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Gyms;
