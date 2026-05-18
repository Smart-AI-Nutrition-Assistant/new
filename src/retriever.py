from __future__ import annotations

from dataclasses import dataclass

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from src.config import settings
from src.utils import lexical_overlap_score, tokenize


@dataclass(slots=True)
class RetrievedChunk:
    document: Document
    dense_score: float
    lexical_score: float
    final_score: float


class AdvancedNutritionRetriever:
    def __init__(self, vectorstore: FAISS, alpha: float | None = None) -> None:
        self.vectorstore = vectorstore
        self.alpha = settings.hybrid_alpha if alpha is None else alpha

    def _all_docs(self) -> list[Document]:
        store = getattr(self.vectorstore, "docstore", None)
        if not store:
            return []
        data = getattr(store, "_dict", {})
        return [doc for doc in data.values() if isinstance(doc, Document)]

    def retrieve(self, query: str, k: int | None = None) -> list[Document]:
        top_k = k or settings.top_k
        dense = self.vectorstore.similarity_search_with_relevance_scores(query, k=max(top_k, 8))
        dense_map: dict[str, RetrievedChunk] = {}

        for doc, rel_score in dense:
            key = f"{doc.metadata.get('source','')}-{hash(doc.page_content)}"
            dense_map[key] = RetrievedChunk(
                document=doc,
                dense_score=float(rel_score),
                lexical_score=0.0,
                final_score=0.0,
            )

        query_tokens = tokenize(query)
        lexical_candidates = self._all_docs()
        for doc in lexical_candidates[:1500]:
            key = f"{doc.metadata.get('source','')}-{hash(doc.page_content)}"
            lex = lexical_overlap_score(query_tokens, doc.page_content)
            if key in dense_map:
                dense_map[key].lexical_score = max(dense_map[key].lexical_score, lex)
            elif lex > 0:
                dense_map[key] = RetrievedChunk(document=doc, dense_score=0.0, lexical_score=lex, final_score=0.0)

        for item in dense_map.values():
            item.final_score = (self.alpha * item.dense_score) + ((1 - self.alpha) * item.lexical_score)

        ranked = sorted(dense_map.values(), key=lambda x: x.final_score, reverse=True)[:top_k]
        results: list[Document] = []
        for rank, item in enumerate(ranked, start=1):
            item.document.metadata["retrieval_rank"] = rank
            item.document.metadata["dense_score"] = round(item.dense_score, 4)
            item.document.metadata["lexical_score"] = round(item.lexical_score, 4)
            item.document.metadata["hybrid_score"] = round(item.final_score, 4)
            results.append(item.document)
        return results

