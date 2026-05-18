# AI Nutrition Assistant

**Plateforme Intelligente de Nutrition basée sur LLM + RAG + Agent IA**  
**Tagline:** Smart Nutrition • AI Agent • Ramadan Mode • Gym Recommendation

## 1) Vue d'ensemble

Projet full-stack IA orienté soutenance universitaire: assistant nutritionnel intelligent avec:

- **RAG avancé** (chunking récursif + récupération hybride dense/lexicale)
- **Agent IA outillé** (LangGraph ReAct + outils métier)
- **Mémoire conversationnelle**
- **Mode Ramadan** (Shour, Iftar, post-Tarawih, hydratation, énergie)
- **Calcul calories/macros**, suivi utilisateur, et recommandations de salles locales (Tunisie)

## 2) Architecture

```text
app.py (Gradio UI)
   └── src/agent.py (LangGraph ReAct Agent + ChatGroq)
       ├── src/tools.py (6 tools métier + outil RAG)
       ├── src/rag_chain.py (prompt RAG + citations)
       │   └── src/retriever.py (hybrid retrieval)
       │       └── src/vectorstore.py (load/split/index docs FAISS)
       │           └── src/embeddings.py (MiniLM embeddings)
       └── src/config.py (paramètres/env)
```

## 3) Arborescence

```text
Bashai-nutrition-assistant/
├── data/
├── src/
│   ├── __init__.py
│   ├── config.py
│   ├── embeddings.py
│   ├── vectorstore.py
│   ├── retriever.py
│   ├── tools.py
│   ├── agent.py
│   ├── rag_chain.py
│   └── utils.py
├── app.py
├── .env.example
├── requirements.txt
└── README.md
```

## 4) Installation

1. Cloner/télécharger le projet.
2. Créer un environnement virtuel.
3. Installer les dépendances.
4. Configurer les variables d'environnement.

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Puis renseigner `GROQ_API_KEY` dans `.env`.

## 5) Lancement

```bash
python app.py
```

## 6) Données RAG

Ajoutez vos fichiers dans `data/`:

- Guides nutrition (PDF/TXT/MD)
- Références Ramadan
- Tables calories/macros
- Notes sport/fitness local

Le moteur charge automatiquement ces documents et construit un index **FAISS**.

## 7) Outils Agent implémentés

1. `calculer_besoins_caloriques(...)`
2. `generer_plan_repas(...)`
3. `calculer_calories_repas(...)`
4. `mode_ramadan(...)`
5. `recommander_gym_locale(...)`
6. `rechercher_documents_nutrition(...)` (RAG + citations)

## 8) Prompt Engineering (qualité soutenance)

- Prompt système orienté sécurité + anti-hallucination
- Règles explicites: utiliser les outils pour calculs, citer les sources RAG
- Format de réponse structuré et actionnable
- Adaptation culturelle tunisienne explicite

## 9) Fonctionnalités UI

- Chat moderne avec historique
- Panneau profil utilisateur (âge, poids, taille, activité, objectif)
- Liste des villes tunisiennes chargée dynamiquement via bibliothèque (`geonamescache`)
- Toggle **Mode Ramadan**
- Suivi de progression (poids, calories, adhérence)
- Exemples de prompts rapides
- Toggle Dark mode
- Upload de fichiers (bonus workflow)
- Reindex FAISS depuis l'interface après upload
- Géolocalisation live navigateur + recherche de gyms proches (OSM) avec fallback local

## 10) Préparation soutenance (15 min)

- Démo 1: calcul besoins + macros
- Démo 2: génération plan repas personnalisé
- Démo 3: question factuelle via RAG avec citations
- Démo 4: mode Ramadan complet
- Démo 5: recommandation salle locale

## 11) Limites & améliorations possibles

- Ajouter une vraie base nutritionnelle tunisienne élargie
- Connecter APIs géolocalisation pour gyms temps réel
- Ajouter authentification + stockage persistant (PostgreSQL)
- Eval RAG systématique (RAGAS / benchmarks internes)
