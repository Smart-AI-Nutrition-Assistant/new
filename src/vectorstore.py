from __future__ import annotations

from pathlib import Path
from typing import Iterable

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from src.config import settings
from src.embeddings import get_embeddings


SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".csv"}


def _load_single_file(path: Path) -> list[Document]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return PyPDFLoader(str(path)).load()
    return TextLoader(str(path), encoding="utf-8").load()


def load_documents(data_dir: Path | None = None) -> list[Document]:
    base = data_dir or settings.data_dir
    docs: list[Document] = []
    if not base.exists():
        return docs

    for file_path in base.rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            loaded = _load_single_file(file_path)
            for d in loaded:
                d.metadata = d.metadata or {}
                d.metadata["source"] = str(file_path)
                d.metadata["file_name"] = file_path.name
            docs.extend(loaded)
    return docs


def split_documents(documents: Iterable[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    return splitter.split_documents(list(documents))


def build_vectorstore(force_rebuild: bool = False) -> FAISS:
    embeddings = get_embeddings()
    index_dir = settings.vectorstore_dir / "faiss_index"

    if index_dir.exists() and not force_rebuild:
        return FAISS.load_local(
            str(index_dir),
            embeddings=embeddings,
            allow_dangerous_deserialization=True,
        )

    raw_docs = load_documents()
    if not raw_docs:
        raw_docs = [
            Document(
                page_content=(
                    "Nutrition de base: equilibrer proteines, glucides complexes, lipides sains, "
                    "fibres et hydratation. Adapter aux habitudes tunisiennes et au Ramadan."
                ),
                metadata={"source": "builtin_seed", "file_name": "builtin_seed"},
            )
        ]

    chunks = split_documents(raw_docs)
    vs = FAISS.from_documents(chunks, embedding=embeddings)
    vs.save_local(str(index_dir))
    return vs

