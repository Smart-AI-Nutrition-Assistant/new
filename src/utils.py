from __future__ import annotations

import math
import re
from typing import Iterable


ACTIVITY_FACTORS = {
    "sedentaire": 1.2,
    "leger": 1.375,
    "modere": 1.55,
    "intense": 1.725,
    "athlete": 1.9,
}


GOAL_ADJUSTMENTS = {
    "perdre_poids": -450,
    "maintenir": 0,
    "prendre_masse": 300,
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def activity_factor(activity: str) -> float:
    return ACTIVITY_FACTORS.get(normalize_text(activity), 1.55)


def goal_adjustment(goal: str) -> int:
    return GOAL_ADJUSTMENTS.get(normalize_text(goal), 0)


def mifflin_st_jeor_kcal(age: int, weight_kg: float, height_cm: float, sex: str) -> float:
    sex_norm = normalize_text(sex)
    base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    return base + 5 if sex_norm in {"homme", "male", "m"} else base - 161


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def macro_split(target_kcal: float, protein_ratio: float = 0.3, carb_ratio: float = 0.4, fat_ratio: float = 0.3) -> dict:
    protein_g = (target_kcal * protein_ratio) / 4
    carb_g = (target_kcal * carb_ratio) / 4
    fat_g = (target_kcal * fat_ratio) / 9
    return {
        "calories": round(target_kcal),
        "protein_g": round(protein_g),
        "carbs_g": round(carb_g),
        "fat_g": round(fat_g),
    }


def lexical_overlap_score(query_tokens: set[str], text: str) -> float:
    doc_tokens = set(re.findall(r"[a-zA-Z0-9\u00C0-\u024F]+", text.lower()))
    if not doc_tokens:
        return 0.0
    inter = query_tokens.intersection(doc_tokens)
    union = query_tokens.union(doc_tokens)
    return len(inter) / len(union) if union else 0.0


def tokenize(value: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z0-9\u00C0-\u024F]+", value.lower()))


def rolling_average(values: Iterable[float]) -> float:
    v = list(values)
    return 0.0 if not v else round(sum(v) / len(v), 2)


def bmi(weight_kg: float, height_cm: float) -> float:
    m = height_cm / 100
    return round(weight_kg / (m * m), 2) if m > 0 else 0.0


def safe_int(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def round_up_to_50(value: float) -> int:
    return int(math.ceil(value / 50) * 50)


DEFAULT_TUNISIA_CITIES = [
    "Tunis",
    "Sfax",
    "Sousse",
    "Kairouan",
    "Bizerte",
    "Gabes",
    "Ariana",
    "Gafsa",
    "Monastir",
    "Ben Arous",
    "Nabeul",
    "Kasserine",
    "Medenine",
    "Mahdia",
    "Tozeur",
    "Mannouba",
    "Siliana",
    "Zaghouan",
    "Kebili",
    "Jendouba",
    "Kef",
    "Tataouine",
    "Beja",
]


def get_tunisian_cities(max_items: int = 200) -> list[str]:
    try:
        import geonamescache
    except ImportError:
        return DEFAULT_TUNISIA_CITIES

    try:
        gc = geonamescache.GeonamesCache()
        all_cities = gc.get_cities().values()
        filtered = [c for c in all_cities if c.get("countrycode") == "TN" and c.get("name")]
    except (AttributeError, TypeError, KeyError):
        return DEFAULT_TUNISIA_CITIES

    ranked = sorted(
        filtered,
        key=lambda c: (-int(c.get("population", 0) or 0), str(c.get("name", "")).lower()),
    )

    unique_names: list[str] = []
    seen: set[str] = set()
    for city in ranked:
        name = str(city.get("name", "")).strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        unique_names.append(name)
        if len(unique_names) >= max_items:
            break

    return unique_names or DEFAULT_TUNISIA_CITIES

