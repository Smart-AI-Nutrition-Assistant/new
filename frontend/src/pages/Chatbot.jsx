import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Trash2, Sparkles, MessageSquare, Flame, Moon, Dumbbell } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';

export const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const history = await chatService.getHistory();
      setMessages(history);
    } catch (err) {
      toast.error("Impossible de récupérer l'historique du chat");
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    setInput('');
    // User message
    const userMsg = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await chatService.sendMessage(textToSend, messages);
      // Assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      toast.error("L'assistant IA a rencontré une erreur.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    const loadId = toast.loading("Effacement de l'historique...");
    try {
      await chatService.clearHistory();
      setMessages([]);
      toast.success("Historique effacé !", { id: loadId });
    } catch (err) {
      toast.error("Erreur lors de l'effacement de l'historique", { id: loadId });
    }
  };

  const quickPrompts = [
    {
      label: "Générer mon plan repas",
      text: "Génère mon plan repas personnalisé pour cette semaine.",
      icon: Flame,
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    },
    {
      label: "Guide Mode Ramadan",
      text: "Active un plan Ramadan avec Shour, Iftar, snack post-Tarawih et hydratation.",
      icon: Moon,
      color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    },
    {
      label: "Trouver une salle",
      text: "Trouve la salle de sport la plus proche de ma localisation et adaptée à mon budget.",
      icon: Dumbbell,
      color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    },
  ];

  if (initLoading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] bg-slate-950">
      {/* Header bar */}
      <div className="px-6 py-4 glass border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              Assistant Virtuel IA
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
            </h2>
            <p className="text-xs text-slate-400">LLM outillé avec vectorstore FAISS, RAG & agents</p>
          </div>
        </div>

        <button
          onClick={handleClear}
          disabled={messages.length === 0}
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 px-3 py-2 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        >
          <Trash2 size={13} /> Effacer historique
        </button>
      </div>

      {/* Chat scroll content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
            <div className="h-16 w-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/10 mx-auto">
              🤖
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-250">Comment puis-je vous aider aujourd'hui ?</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                Posez vos questions sur vos repas, votre hydratation en période de Ramadan ou trouvez les meilleures salles de sport tunisiennes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 max-w-xl mx-auto">
              {quickPrompts.map((q, idx) => {
                const Icon = q.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(q.text)}
                    className={`p-4 rounded-2xl border text-left flex flex-col gap-2.5 transition-all hover:scale-[1.02] active:scale-95 ${q.color}`}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-bold text-slate-200 leading-snug">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role !== 'user' && (
                  <div className="h-9 w-9 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-md">
                    🤖
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm shadow-md leading-relaxed border transition-all ${
                    m.role === 'user'
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none border-emerald-400/20'
                      : 'glass text-slate-200 rounded-tl-none border-slate-800'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <article className="prose prose-invert prose-emerald max-w-none text-xs leading-relaxed space-y-3">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </article>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="h-9 w-9 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 shadow-md">
                    U
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="h-9 w-9 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-md">
                  🤖
                </div>
                <div className="glass border border-slate-800 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1.5">L'IA réfléchit...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input container */}
      <div className="px-6 py-4 glass border-t border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto flex gap-3 relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Posez votre question (ex: plan repas, ramadan guide, gyms tunisiennes)..."
            className="flex-1 bg-slate-900/60 border border-slate-800 focus:border-emerald-500/80 rounded-2xl pl-5 pr-14 py-3.5 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-650 shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 h-10 w-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-md shadow-emerald-500/10"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[10px] text-slate-600 text-center mt-2.5 font-medium">
          L'intelligence artificielle peut générer des réponses inexactes. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
};
export default Chatbot;
