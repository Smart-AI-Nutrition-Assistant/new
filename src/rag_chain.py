from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from src.retriever import AdvancedNutritionRetriever


RAG_SYSTEM_PROMPT = """Tu es un nutritionniste IA expert du contexte tunisien.
Règles strictes:
1) Réponds en français clair, pratique et motivant.
2) Base-toi uniquement sur le contexte fourni + principes nutritionnels sûrs.
3) Si l'info manque, dis-le clairement sans inventer.
4) Donne des conseils actionnables et culturellement adaptés (Tunisie, Ramadan).
5) Cite les sources à la fin sous format [S1], [S2], etc.
"""


RAG_USER_PROMPT = """Historique conversation:
{history}

Question:
{question}

Contexte:
{context}

Réponds avec:
- Une réponse structurée
- Une mini section "Sources" avec les labels [Sx].
"""


@dataclass(slots=True)
class RAGResult:
    answer: str
    sources: list[dict[str, Any]]


class NutritionRAGChain:
    def __init__(self, llm: BaseChatModel, retriever: AdvancedNutritionRetriever) -> None:
        self.llm = llm
        self.retriever = retriever
        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", RAG_SYSTEM_PROMPT),
                ("human", RAG_USER_PROMPT),
            ]
        )

    @staticmethod
    def _format_history(chat_history: list[dict[str, str]] | None) -> str:
        if not chat_history:
            return "Aucun historique."
        lines = [f"{m.get('role','user')}: {m.get('content','')}" for m in chat_history[-8:]]
        return "\n".join(lines)

    @staticmethod
    def _format_context(docs: list) -> tuple[str, list[dict[str, Any]]]:
        context_chunks: list[str] = []
        sources: list[dict[str, Any]] = []

        for i, d in enumerate(docs, start=1):
            source = d.metadata.get("source", "inconnu")
            label = f"S{i}"
            context_chunks.append(f"[{label}] {d.page_content}")
            sources.append(
                {
                    "label": label,
                    "source": source,
                    "file_name": d.metadata.get("file_name", "unknown"),
                    "score": d.metadata.get("hybrid_score", 0.0),
                }
            )
        return "\n\n".join(context_chunks), sources

    def answer(self, question: str, chat_history: list[dict[str, str]] | None = None) -> RAGResult:
        docs = self.retriever.retrieve(question)
        context, sources = self._format_context(docs)
        payload = {
            "history": self._format_history(chat_history),
            "question": question,
            "context": context or "Aucun document pertinent trouvé.",
        }
        response = self.llm.invoke(self.prompt.format_messages(**payload))
        return RAGResult(answer=response.content if hasattr(response, "content") else str(response), sources=sources)

