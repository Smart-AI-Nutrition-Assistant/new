from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


@dataclass(slots=True)
class Settings:
    project_name: str = "AI Nutrition Assistant"
    base_dir: Path = field(default_factory=lambda: Path(__file__).resolve().parent.parent)
    data_dir: Path = field(init=False)
    vectorstore_dir: Path = field(init=False)

    groq_api_key: str = field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))
    model_name: str = field(default_factory=lambda: os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))
    llm_temperature: float = field(default_factory=lambda: float(os.getenv("LLM_TEMPERATURE", "0.6")))
    llm_max_tokens: int = field(default_factory=lambda: int(os.getenv("LLM_MAX_TOKENS", "700")))
    embedding_model_name: str = field(
        default_factory=lambda: os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    )

    chunk_size: int = field(default_factory=lambda: int(os.getenv("CHUNK_SIZE", "900")))
    chunk_overlap: int = field(default_factory=lambda: int(os.getenv("CHUNK_OVERLAP", "180")))
    top_k: int = field(default_factory=lambda: int(os.getenv("TOP_K", "6")))
    hybrid_alpha: float = field(default_factory=lambda: float(os.getenv("HYBRID_ALPHA", "0.65")))

    openroute_api_key: str = field(default_factory=lambda: os.getenv("OPENROUTE_SERVICE_API_KEY", ""))

    def __post_init__(self) -> None:
        self.data_dir = self.base_dir / "data"
        self.vectorstore_dir = self.base_dir / ".vectorstore"
        self.vectorstore_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
