import React, { useState, useEffect } from 'react';
import { chatService, progressService, nutritionPlanService } from '../services/api';
import { Loader } from '../components/Loader';
import { MessageSquare, Calendar, History, Trash2, Utensils, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [chatLogs, setChatLogs] = useState([]);
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const chats = await chatService.getHistory();
      setChatLogs(chats);

      const progress = await progressService.getProgress();
      setNutritionLogs(progress);

      const plan = await nutritionPlanService.getPlan();
      setSavedPlans(plan ? [plan] : []);
    } catch (err) {
      toast.error("Erreur lors de la récupération de l'historique");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const handleClearChat = async () => {
    if (window.confirm("Voulez-vous vraiment effacer tout l'historique de discussion ?")) {
      try {
        await chatService.clearHistory();
        setChatLogs([]);
        toast.success("Historique des messages effacé");
      } catch (err) {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-emerald-950/20 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-200">Mon Historique Personnel 📁</h2>
          <p className="text-slate-400 text-sm mt-0.5">Consultez l'historique de vos conversations IA, de vos plans repas et de vos données physiques.</p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800 shrink-0 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'chat'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare size={14} /> Discussions IA ({chatLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('nutrition')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'nutrition'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar size={14} /> Données Corporelles ({nutritionLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'plans'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Utensils size={14} /> Plans Sauvegardés ({savedPlans.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'chat' && (
          <div className="glass border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider">Journaux des Discussions</h3>
              {chatLogs.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-350 font-bold active:scale-95 transition-all"
                >
                  <Trash2 size={13} /> Vider l'historique
                </button>
              )}
            </div>

            {chatLogs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-12">Aucun message enregistré dans votre historique.</p>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {chatLogs.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border ${
                      msg.role === 'user'
                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400 pl-5'
                        : 'bg-slate-900/30 border-slate-800 text-slate-350'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider block mb-1">
                      {msg.role === 'user' ? '👤 Utilisateur' : '🤖 Assistant Nutritionnel'}
                    </span>
                    <p className="text-xs leading-relaxed mt-1.5 font-medium whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="glass border border-slate-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider mb-6 pb-3 border-b border-slate-850">
              Historique des Enregistrements Corporels
            </h3>

            {nutritionLogs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-12">Aucun historique de poids ou de calories enregistré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Date d'Enregistrement</th>
                      <th className="py-3 px-4">Poids Corporel</th>
                      <th className="py-3 px-4">Calories Consommées</th>
                      <th className="py-3 px-4">Score d'Adhérence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutritionLogs.map((log, idx) => (
                      <tr key={idx} className="border-b border-slate-850 hover:bg-slate-900/10 text-slate-300 font-medium">
                        <td className="py-3.5 px-4 font-semibold text-slate-450">{log.date}</td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold">{log.weight} kg</td>
                        <td className="py-3.5 px-4">{log.calories} kcal</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold">
                            {log.adherence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="glass border border-slate-800 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider mb-6 pb-3 border-b border-slate-850">
              Plans Nutritionnels Enregistrés
            </h3>

            {savedPlans.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-12">Aucun plan repas actif.</p>
            ) : (
              <div className="space-y-4">
                {savedPlans.map((plan, idx) => (
                  <div key={idx} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                        <Utensils size={18} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-200">Plan Repas Quotidien Complet</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Valeurs globales : {plan.totals.calories} kcal | Prot: {plan.totals.protein}g | Carb: {plan.totals.carbs}g | Lip: {plan.totals.fat}g
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.success("Plan repas chargé par défaut dans l'onglet nutrition ! 🥗")}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-emerald-500/10"
                    >
                      Charger ce plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default HistoryPage;
