from __future__ import annotations

import json
from urllib.error import URLError
from urllib.request import Request, urlopen
from typing import Any

from langchain_core.tools import tool
from geopy.distance import geodesic

from src.utils import (
    activity_factor,
    bmi,
    clamp,
    goal_adjustment,
    macro_split,
    mifflin_st_jeor_kcal,
    normalize_text,
    round_up_to_50,
    safe_float,
    safe_int,
)


_RAG_CHAIN = None


def register_rag_chain(rag_chain: Any) -> None:
    global _RAG_CHAIN
    _RAG_CHAIN = rag_chain


@tool
def calculer_besoins_caloriques(
    age: int,
    poids_kg: float,
    taille_cm: float,
    sexe: str,
    activite: str,
    objectif: str,
) -> str:
    """Calcule les besoins caloriques journaliers et les macros."""
    bmr = mifflin_st_jeor_kcal(age, poids_kg, taille_cm, sexe)
    tdee = bmr * activity_factor(activite)
    cible = max(1200, tdee + goal_adjustment(objectif))
    macros = macro_split(cible)
    result = {
        "bmr": round(bmr),
        "tdee": round(tdee),
        "objectif": objectif,
        "calories_cible": round(cible),
        "macros": macros,
        "imc": bmi(poids_kg, taille_cm),
    }
    return json.dumps(result, ensure_ascii=False, indent=2)


@tool
def generer_plan_repas(
    age: int = 25,
    poids_kg: float = 70.0,
    taille_cm: float = 170.0,
    sexe: str = "homme",
    activite: str = "modere",
    objectif: str = "maintenir",
    preferences: str = "",
    ramadan: bool = False,
) -> str:
    """Génère un plan repas personnalisé selon profil, préférences et mode Ramadan."""
    age = safe_int(str(age), 25)
    poids = safe_float(str(poids_kg), 70.0)
    taille = safe_float(str(taille_cm), 170.0)
    sexe = str(sexe or "homme")
    activite = str(activite or "modere")
    objectif = str(objectif or "maintenir")

    bmr = mifflin_st_jeor_kcal(age, poids, taille, sexe)
    cible = max(1200, (bmr * activity_factor(activite)) + goal_adjustment(objectif))
    cible = round_up_to_50(cible)

    if ramadan:
        meals = {
            "Shour": int(cible * 0.3),
            "Iftar": int(cible * 0.5),
            "Post-Tarawih Snack": int(cible * 0.2),
        }
    else:
        meals = {
            "Petit-déjeuner": int(cible * 0.25),
            "Déjeuner": int(cible * 0.35),
            "Dîner": int(cible * 0.3),
            "Snack": int(cible * 0.1),
        }

    pref_txt = preferences or "Aucune préférence spécifique."
    suggestions = [
        "Ojja aux légumes + pain complet",
        "Lablabi protéiné (pois chiches + œuf + thon léger)",
        "Salade méchouia + poulet grillé",
        "Couscous complet aux légumes et poisson",
        "Yaourt grec + dattes + amandes (portion contrôlée)",
    ]
    plan = {
        "calories_cible": cible,
        "ramadan": ramadan,
        "preferences": pref_txt,
        "distribution_repas": meals,
        "suggestions_tunisiennes": suggestions,
    }
    return json.dumps(plan, ensure_ascii=False, indent=2)


FOOD_DB_PER_100G = {
    "couscous": {"kcal": 112, "protein": 3.8, "carbs": 23.2, "fat": 0.2},
    "lablabi": {"kcal": 120, "protein": 6.0, "carbs": 17.0, "fat": 3.0},
    "brik": {"kcal": 280, "protein": 10.0, "carbs": 18.0, "fat": 18.0},
    "ojja": {"kcal": 150, "protein": 9.5, "carbs": 6.0, "fat": 9.0},
    "thon": {"kcal": 132, "protein": 29.0, "carbs": 0.0, "fat": 1.0},
    "dattes": {"kcal": 282, "protein": 2.5, "carbs": 75.0, "fat": 0.4},
    "pain_complet": {"kcal": 247, "protein": 13.0, "carbs": 41.0, "fat": 4.2},
    "yaourt_grec": {"kcal": 97, "protein": 9.0, "carbs": 4.0, "fat": 5.0},
}


@tool
def calculer_calories_repas(repas: str) -> str:
    """Analyse les calories d'un repas formaté: aliment:grammes, aliment:grammes."""
    total = {"kcal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    missing: list[str] = []

    for raw_item in repas.split(","):
        part = raw_item.strip()
        if ":" not in part:
            continue
        food_raw, gram_raw = part.split(":", 1)
        food = normalize_text(food_raw).replace(" ", "_")
        grams = clamp(safe_float(gram_raw, 0.0), 0, 2000)
        if food not in FOOD_DB_PER_100G:
            missing.append(food_raw.strip())
            continue
        ratio = grams / 100
        row = FOOD_DB_PER_100G[food]
        total["kcal"] += row["kcal"] * ratio
        total["protein"] += row["protein"] * ratio
        total["carbs"] += row["carbs"] * ratio
        total["fat"] += row["fat"] * ratio

    return json.dumps(
        {
            "analyse_repas": {k: round(v, 2) for k, v in total.items()},
            "aliments_non_reconnus": missing,
            "note": "Base simplifiée; compléter avec votre table locale au besoin.",
        },
        ensure_ascii=False,
        indent=2,
    )


@tool
def mode_ramadan(calories_cible: int, duree_jeune_heures: int = 15, entrainement: str = "leger") -> str:
    """Propose une stratégie nutrition spéciale Ramadan (Shour/Iftar/hydratation)."""
    calories_cible = int(clamp(calories_cible, 1200, 5000))
    hydratation_l = round(clamp((calories_cible / 1000) * 1.0, 1.8, 4.0), 1)
    training_timing = {
        "leger": "30-45 min avant Iftar ou 60-90 min après Iftar",
        "modere": "60-120 min après Iftar",
        "intense": "Après Iftar, avec récupération optimisée",
    }.get(normalize_text(entrainement), "Après Iftar")

    payload = {
        "distribution_calorique": {
            "Shour": int(calories_cible * 0.3),
            "Iftar": int(calories_cible * 0.5),
            "Post_Tarawih": int(calories_cible * 0.2),
        },
        "hydration_litres_entre_iftar_et_shour": hydratation_l,
        "electrolytes": "Ajouter soupe légère, fruits riches en potassium, pincée de sel si besoin.",
        "timing_entrainement": training_timing,
        "duree_jeune_heures": duree_jeune_heures,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


GYM_DB = [
    {
        "name": "California Gym Lac 2",
        "ville": "tunis",
        "prix": "premium",
        "women_friendly": True,
        "lat": 36.8467,
        "lon": 10.2846,
    },
    {
        "name": "UFC Gym Ariana",
        "ville": "ariana",
        "prix": "moyen",
        "women_friendly": True,
        "lat": 36.8663,
        "lon": 10.1647,
    },
    {
        "name": "FitZone Menzah",
        "ville": "tunis",
        "prix": "moyen",
        "women_friendly": True,
        "lat": 36.8357,
        "lon": 10.1686,
    },
    {
        "name": "PowerHouse Sfax",
        "ville": "sfax",
        "prix": "economique",
        "women_friendly": False,
        "lat": 34.7406,
        "lon": 10.7603,
    },
    {
        "name": "Ladies First Bardo",
        "ville": "tunis",
        "prix": "moyen",
        "women_friendly": True,
        "lat": 36.8090,
        "lon": 10.1393,
    },
]


OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"


def _fetch_live_gyms_from_osm(
    user_lat: float,
    user_lon: float,
    search_radius_km: float,
    max_results: int,
) -> list[dict[str, Any]]:
    radius_m = int(clamp(search_radius_km * 1000, 1000, 20000))
    query = f"""
    [out:json][timeout:25];
    (
      node(around:{radius_m},{user_lat},{user_lon})["amenity"="gym"];
      way(around:{radius_m},{user_lat},{user_lon})["amenity"="gym"];
      relation(around:{radius_m},{user_lat},{user_lon})["amenity"="gym"];
      node(around:{radius_m},{user_lat},{user_lon})["leisure"="fitness_centre"];
      way(around:{radius_m},{user_lat},{user_lon})["leisure"="fitness_centre"];
      relation(around:{radius_m},{user_lat},{user_lon})["leisure"="fitness_centre"];
    );
    out center tags;
    """
    payload = query.encode("utf-8")
    req = Request(
        OVERPASS_API_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": "ai-nutrition-assistant"},
        method="POST",
    )

    with urlopen(req, timeout=15) as response:
        data = json.loads(response.read().decode("utf-8"))

    gyms: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in data.get("elements", []):
        tags = item.get("tags", {})
        lat = item.get("lat") or item.get("center", {}).get("lat")
        lon = item.get("lon") or item.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue
        name = tags.get("name") or "Gym sans nom"
        key = f"{name}-{round(lat, 5)}-{round(lon, 5)}"
        if key in seen:
            continue
        seen.add(key)
        gyms.append(
            {
                "name": name,
                "ville": tags.get("addr:city", ""),
                "prix": "indifferent",
                "women_friendly": False,
                "lat": float(lat),
                "lon": float(lon),
                "source": "live_osm",
            }
        )
    gyms = sorted(
        gyms,
        key=lambda g: geodesic((user_lat, user_lon), (g["lat"], g["lon"])).km,
    )
    return gyms[: max(1, min(max_results * 3, 30))]


@tool
def recommander_gym_locale(
    ville: str = "tunis",
    budget: str = "moyen",
    prefere_femmes_only: bool = False,
    user_lat: float | None = None,
    user_lon: float | None = None,
    search_radius_km: float = 6.0,
    max_results: int = 5,
    prefer_live_search: bool = True,
) -> str:
    """Recommande des salles de sport locales (Tunisie) selon ville, budget et proximité GPS."""
    from src.config import settings

    city = normalize_text(ville)
    budget_norm = normalize_text(budget)
    filtered = [dict(g) for g in GYM_DB if normalize_text(g["ville"]) == city]
    if budget_norm != "indifferent":
        filtered = [g for g in filtered if normalize_text(g["prix"]) == budget_norm] or filtered
    if prefere_femmes_only:
        filtered = [g for g in filtered if g["women_friendly"]]

    live_gyms: list[dict[str, Any]] = []
    live_error = ""
    if prefer_live_search and user_lat is not None and user_lon is not None:
        try:
            live_gyms = _fetch_live_gyms_from_osm(
                user_lat=float(user_lat),
                user_lon=float(user_lon),
                search_radius_km=float(search_radius_km),
                max_results=max_results,
            )
        except (URLError, TimeoutError, json.JSONDecodeError, ValueError, TypeError):
            live_error = "Recherche live indisponible temporairement."

    candidates = live_gyms if live_gyms else filtered
    api_used = False
    if user_lat is not None and user_lon is not None:
        if settings.openroute_api_key:
            try:
                import openrouteservice

                client = openrouteservice.Client(key=settings.openroute_api_key)
                for gym in candidates[:12]:
                    route = client.directions(
                        coordinates=[[user_lon, user_lat], [gym["lon"], gym["lat"]]],
                        profile="driving-car",
                    )
                    dist_m = route["routes"][0]["summary"]["distance"]
                    gym["distance_km"] = round(dist_m / 1000, 2)
                api_used = True
            except (ImportError, KeyError, IndexError, TypeError, ValueError):
                api_used = False

        # Fallback local distance if API unavailable or request failed.
        if not api_used:
            for gym in candidates:
                gym["distance_km"] = round(
                    geodesic((user_lat, user_lon), (gym["lat"], gym["lon"])).km,
                    2,
                )

        candidates = sorted(candidates, key=lambda x: x.get("distance_km", 10_000))

    return json.dumps(
        {
            "recommendations": candidates[: max(1, min(max_results, 10))],
            "ville": ville,
            "budget": budget,
            "user_location": (user_lat, user_lon),
            "search_radius_km": search_radius_km,
            "distance_mode": "openrouteservice" if api_used else "geodesic_fallback",
            "data_source": "live_osm" if live_gyms else "local_db",
            "note": live_error,
        },
        ensure_ascii=False,
        indent=2,
    )


@tool
def rechercher_documents_nutrition(question: str) -> str:
    """Interroge le moteur RAG nutrition et retourne réponse + sources."""
    if _RAG_CHAIN is None:
        return "RAG non initialisé."

    result = _RAG_CHAIN.answer(question, chat_history=[])
    src_lines = [f"[{s['label']}] {s['file_name']} ({s['source']})" for s in result.sources]
    return f"{result.answer}\n\nSources:\n" + ("\n".join(src_lines) if src_lines else "Aucune source.")


ALL_TOOLS = [
    calculer_besoins_caloriques,
    generer_plan_repas,
    calculer_calories_repas,
    mode_ramadan,
    recommander_gym_locale,
    rechercher_documents_nutrition,
]

