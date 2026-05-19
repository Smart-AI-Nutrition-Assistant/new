from __future__ import annotations

from functools import lru_cache
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

from src.config import settings
from src.rag_chain import NutritionRAGChain
from src.retriever import AdvancedNutritionRetriever
from src.tools import (
    calculer_besoins_caloriques,
    calculer_calories_repas,
    generer_plan_repas,
    mode_ramadan,
    recommander_gym_locale,
    register_rag_chain,
    rechercher_documents_nutrition,
)
from src.vectorstore import build_vectorstore


AGENT_SYSTEM_PROMPT = (
    "Tu es AI Nutrition Assistant, un nutritionniste clinicien et coach de fitness expert du contexte tunisien et du Ramadan. "
    "Tu es chaleureux, encourageant et hautement professionnel. "
    "Règles d'or pour tes réponses :\n"
    "1) Pour TOUTE question factuelle ou de conseil général en nutrition/santé, utilise SYSTÉMATIQUEMENT l'outil `rechercher_documents_nutrition` en premier afin d'interroger la base de connaissances locale (RAG). Fonde rigoureusement tes conseils sur ces informations pour bannir toute hallucination.\n"
    "2) Intègre parfaitement l'historique de la conversation. Réfère-toi à ce que l'utilisateur a dit plus haut pour une expérience fluide, cohérente et progressive.\n"
    "3) Adapte tes conseils aux spécificités culturelles tunisiennes (ex. valoriser le thon, poisson frais, salade méchouia, pain complet, huile d'olive avec modération) et au mode Ramadan (structurer l'apport entre Shour, Iftar, collation post-Tarawih et répartition optimale de l'hydratation).\n"
    "4) Structure tes réponses avec de superbes titres Markdown, des listes claires, et mets en gras les valeurs clés (calories, macros).\n"
    "5) Pour la recherche de salles de sport (`recommander_gym_locale`), sers-toi des coordonnées GPS (latitude/longitude) présentes dans le profil de l'utilisateur pour une précision géographique live optimale.\n"
    "6) Reste synthétique, positif et évite d'utiliser du JSON brut dans tes explications directes à l'utilisateur."
)


@lru_cache(maxsize=1)
def get_llm() -> ChatGroq:
    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY manquante. Ajoutez-la dans votre fichier .env.")
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.model_name,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
    )


@lru_cache(maxsize=1)
def _init_rag_once() -> None:
    llm = get_llm()
    vectorstore = build_vectorstore()
    retriever = AdvancedNutritionRetriever(vectorstore=vectorstore)
    rag_chain = NutritionRAGChain(llm=llm, retriever=retriever)
    register_rag_chain(rag_chain)


def _select_tools(user_input: str) -> list:
    q = (user_input or "").lower()
    tools = [calculer_besoins_caloriques, generer_plan_repas, calculer_calories_repas]
    if any(k in q for k in ["ramadan", "iftar", "shour", "suhoor", "tarawih"]):
        tools.append(mode_ramadan)
    if any(k in q for k in ["gym", "salle", "fitness", "proche", "nearest"]):
        tools.append(recommander_gym_locale)
    if any(k in q for k in ["source", "document", "etude", "preuve", "reference", "référence"]):
        tools.append(rechercher_documents_nutrition)
    # Keep one fallback retrieval tool for general factual nutrition queries.
    if rechercher_documents_nutrition not in tools:
        tools.append(rechercher_documents_nutrition)
    return tools


def get_agent_executor(user_input: str):
    _init_rag_once()
    return create_react_agent(model=get_llm(), tools=_select_tools(user_input))


def _trim_text(value: Any, max_chars: int) -> str:
    text = str(value or "").strip()
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars]} ...[tronqué]"


def _compact_profile(user_profile: dict | None, ramadan_mode: bool) -> str:
    p = user_profile or {}
    compact = {
        "age": p.get("age"),
        "poids_kg": p.get("poids_kg"),
        "taille_cm": p.get("taille_cm"),
        "sexe": p.get("sexe"),
        "activite": p.get("activite"),
        "objectif": p.get("objectif"),
        "ville": p.get("ville"),
        "user_latitude": p.get("user_latitude"),
        "user_longitude": p.get("user_longitude"),
        "ramadan_mode": ramadan_mode,
    }
    return f"Profil utilisateur (résumé): {compact}"


def run_nutrition_agent(
    user_input: str,
    chat_history: list[dict[str, str]] | None = None,
    user_profile: dict | None = None,
    ramadan_mode: bool = False,
) -> str:
    graph = get_agent_executor(user_input)
    history_messages = []
    total_chars = 0
    # Retain up to 6000 characters of past messages for deep conversational memory
    for msg in reversed(chat_history or []):
        content = _trim_text(msg.get("content", ""), 2500)
        if not content:
            continue
        if total_chars + len(content) > 6000:
            break
        total_chars += len(content)
        role = msg.get("role", "user")
        if role == "assistant":
            history_messages.insert(0, AIMessage(content=content))
        else:
            history_messages.insert(0, HumanMessage(content=content))

    profile_text = _compact_profile(user_profile, ramadan_mode)
    messages = [
        SystemMessage(content=AGENT_SYSTEM_PROMPT),
        SystemMessage(content=profile_text),
        *history_messages,
        HumanMessage(content=_trim_text(user_input, 1500)),
    ]
    result = graph.invoke({"messages": messages})
    final_msg = result["messages"][-1]
    return final_msg.content if hasattr(final_msg, "content") else str(final_msg)

