from __future__ import annotations

import json
import inspect
import shutil
from datetime import date
from pathlib import Path
from typing import Any

import gradio as gr

from src.agent import run_nutrition_agent
from src.utils import get_tunisian_cities
from src.vectorstore import build_vectorstore


APP_TITLE = "🥗 AI Nutrition Assistant"
APP_SUBTITLE = "Smart Nutrition • AI Agent • Ramadan Mode • Gym Recommendation"
DATA_DIR = Path(__file__).resolve().parent / "data"
TUNISIA_CITIES = get_tunisian_cities(max_items=200)
DEFAULT_CITY = "Tunis" if "Tunis" in TUNISIA_CITIES else TUNISIA_CITIES[0]
APP_THEME = gr.themes.Soft(primary_hue="emerald", neutral_hue="slate")
APP_CSS = """
body.light-mode, body.light-mode .gradio-container {
    background: #f8fafc !important;
    color: #0f172a !important;
}
body.light-mode .gr-button-primary {
    background: #10b981 !important;
    color: #ffffff !important;
}
"""


def init_knowledge_base() -> None:
    build_vectorstore(force_rebuild=False)


def build_profile(
    age: int,
    poids: float,
    taille: float,
    sexe: str,
    activite: str,
    objectif: str,
    ville: str,
    user_lat: float,
    user_lon: float,
    ramadan_mode: bool,
) -> dict[str, Any]:
    return {
        "age": age,
        "poids_kg": poids,
        "taille_cm": taille,
        "sexe": sexe,
        "activite": activite,
        "objectif": objectif,
        "ville": ville,
        "user_latitude": user_lat,
        "user_longitude": user_lon,
        "ramadan_mode": ramadan_mode,
    }


def send_message(
    message: str,
    chat_state: list[dict[str, str]],
    age: int,
    poids: float,
    taille: float,
    sexe: str,
    activite: str,
    objectif: str,
    ville: str,
    user_lat: float,
    user_lon: float,
    ramadan_mode: bool,
) -> tuple[list[dict[str, str]], list[dict[str, str]], str]:
    if not message or not message.strip():
        return chat_state, chat_state, ""

    profile = build_profile(age, poids, taille, sexe, activite, objectif, ville, user_lat, user_lon, ramadan_mode)
    history_for_model = list(chat_state)
    chat_state.append({"role": "user", "content": message.strip()})

    try:
        response = run_nutrition_agent(
            user_input=message.strip(),
            chat_history=history_for_model,
            user_profile=profile,
            ramadan_mode=ramadan_mode,
        )
    except Exception as exc:
        response = (
            "Le modèle a rencontré une erreur lors de l'appel outil. "
            "Réessayez avec une requête plus courte. "
            f"Détail: {type(exc).__name__}"
        )
    chat_state.append({"role": "assistant", "content": response})
    return chat_state, chat_state, ""


def example_plan() -> str:
    return "Génère mon plan repas personnalisé pour cette semaine."


def example_ramadan() -> str:
    return "Active un plan Ramadan avec Shour, Iftar, snack post-Tarawih et hydratation."


def example_gym() -> str:
    return "Trouve la salle de sport la plus proche de ma localisation et adaptée à mon budget."


def save_progress(
    progress_state: list[dict[str, Any]],
    poids_jour: float,
    calories: int,
    adherence: int,
) -> tuple[list[dict[str, Any]], str]:
    entry = {
        "date": str(date.today()),
        "poids": poids_jour,
        "calories": calories,
        "adherence": adherence,
    }
    progress_state.append(entry)
    return progress_state, json.dumps(entry, ensure_ascii=False, indent=2)


def upload_files_and_reindex(files: list[Any] | None) -> str:
    if not files:
        return "Aucun fichier sélectionné."

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    copied = 0
    for f in files:
        src_path = Path(getattr(f, "name", str(f)))
        if not src_path.exists():
            continue
        dest = DATA_DIR / src_path.name
        shutil.copy2(src_path, dest)
        copied += 1

    build_vectorstore(force_rebuild=True)
    return f"{copied} fichier(s) copiés dans data/ et index FAISS reconstruit."


def profile_json(
    age: int,
    poids: float,
    taille: float,
    sexe: str,
    activite: str,
    objectif: str,
    ville: str,
    user_lat: float,
    user_lon: float,
    ramadan_mode: bool,
) -> str:
    payload = build_profile(age, poids, taille, sexe, activite, objectif, ville, user_lat, user_lon, ramadan_mode)
    return json.dumps(payload, ensure_ascii=False, indent=2)


def clear_chat() -> tuple[list[dict[str, str]], list[dict[str, str]], str]:
    return [], [], ""


def noop_theme_toggle(_: bool) -> None:
    return None


def set_live_location(lat: float, lon: float, status: str) -> tuple[float, float, str]:
    return lat, lon, status


def build_app() -> gr.Blocks:
    with gr.Blocks(title="AI Nutrition Assistant", fill_height=True) as app:
        gr.Markdown(f"# {APP_TITLE}\n\n{APP_SUBTITLE}")

        chat_state = gr.State([])
        progress_state = gr.State([])

        with gr.Row():
            with gr.Column(scale=3):
                chatbot = gr.Chatbot(label="Nutrition Chat", height=560)
                user_message = gr.Textbox(
                    label="Votre message",
                    placeholder="Posez votre question nutrition...",
                    lines=2,
                )
                with gr.Row():
                    send_btn = gr.Button("Envoyer", variant="primary")
                    clear_btn = gr.Button("Effacer le chat")

                gr.Markdown("### Exemples rapides")
                with gr.Row():
                    ex1 = gr.Button("Plan repas personnalisé")
                    ex2 = gr.Button("Mode Ramadan complet")
                    ex3 = gr.Button("Gym proche de moi")

            with gr.Column(scale=2):
                with gr.Tab("Profil & Objectifs"):
                    dark_mode = gr.Checkbox(label="Dark mode", value=True)
                    ramadan_mode = gr.Checkbox(label="🌙 Mode Ramadan", value=False)
                    age = gr.Slider(label="Âge", minimum=14, maximum=90, step=1, value=24)
                    poids = gr.Number(label="Poids (kg)", value=72.0, precision=1)
                    taille = gr.Number(label="Taille (cm)", value=175.0, precision=1)
                    sexe = gr.Dropdown(label="Sexe", choices=["homme", "femme"], value="homme")
                    activite = gr.Dropdown(
                        label="Activité",
                        choices=["sedentaire", "leger", "modere", "intense", "athlete"],
                        value="modere",
                    )
                    objectif = gr.Dropdown(
                        label="Objectif",
                        choices=["perdre_poids", "maintenir", "prendre_masse"],
                        value="perdre_poids",
                    )
                    ville = gr.Dropdown(label="Ville", choices=TUNISIA_CITIES, value=DEFAULT_CITY)
                    user_lat = gr.Number(label="Latitude", value=36.8065, precision=6)
                    user_lon = gr.Number(label="Longitude", value=10.1957, precision=6)
                    locate_btn = gr.Button("📍 Use my live location")
                    location_status = gr.Textbox(label="Location status", interactive=False, value="Manual coordinates in use.")
                    profile_preview = gr.Code(label="Profil JSON", language="json")

                with gr.Tab("📈 Suivi"):
                    calories = gr.Slider(label="Calories consommées aujourd'hui", minimum=0, maximum=8000, step=10, value=0)
                    poids_jour = gr.Number(label="Poids du jour (kg)", value=72.0, precision=1)
                    adherence = gr.Slider(label="Adhérence au plan (%)", minimum=0, maximum=100, step=1, value=80)
                    save_progress_btn = gr.Button("Enregistrer progression")
                    last_progress = gr.Code(label="Dernière entrée", language="json")

                with gr.Tab("📂 Documents"):
                    files = gr.Files(label="Upload docs nutrition (txt/md/pdf)")
                    reindex_btn = gr.Button("Uploader + Reindex FAISS")
                    upload_status = gr.Textbox(label="Statut", interactive=False)

        ex1.click(example_plan, outputs=[user_message])
        ex2.click(example_ramadan, outputs=[user_message])
        ex3.click(example_gym, outputs=[user_message])

        send_inputs = [
            user_message,
            chat_state,
            age,
            poids,
            taille,
            sexe,
            activite,
            objectif,
            ville,
            user_lat,
            user_lon,
            ramadan_mode,
        ]
        send_btn.click(send_message, inputs=send_inputs, outputs=[chatbot, chat_state, user_message])
        user_message.submit(send_message, inputs=send_inputs, outputs=[chatbot, chat_state, user_message])
        clear_btn.click(clear_chat, outputs=[chatbot, chat_state, user_message])

        save_progress_btn.click(
            save_progress,
            inputs=[progress_state, poids_jour, calories, adherence],
            outputs=[progress_state, last_progress],
        )
        reindex_btn.click(upload_files_and_reindex, inputs=[files], outputs=[upload_status])
        locate_btn.click(
            set_live_location,
            inputs=[user_lat, user_lon, location_status],
            outputs=[user_lat, user_lon, location_status],
            js="""
            (lat, lon, status) => new Promise((resolve) => {
                if (!navigator.geolocation) {
                    resolve([lat, lon, "Geolocation is not supported by this browser."]);
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const newLat = Number(position.coords.latitude.toFixed(6));
                        const newLon = Number(position.coords.longitude.toFixed(6));
                        resolve([newLat, newLon, `Live location captured: ${newLat}, ${newLon}`]);
                    },
                    (error) => {
                        resolve([lat, lon, `Location denied/unavailable: ${error.message}`]);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            })
            """,
        )

        profile_inputs = [age, poids, taille, sexe, activite, objectif, ville, user_lat, user_lon, ramadan_mode]
        for comp in profile_inputs:
            comp.change(profile_json, inputs=profile_inputs, outputs=[profile_preview])

        dark_mode.change(
            noop_theme_toggle,
            inputs=[dark_mode],
            outputs=[],
            js="""
            (is_dark) => {
              document.body.classList.toggle("light-mode", !is_dark);
            }
            """,
        )
        app.load(profile_json, inputs=profile_inputs, outputs=[profile_preview])

    return app


if __name__ == "__main__":
    init_knowledge_base()
    demo = build_app()
    launch_sig = inspect.signature(demo.launch).parameters
    launch_kwargs: dict[str, Any] = {}
    if "theme" in launch_sig:
        launch_kwargs["theme"] = APP_THEME
    if "css" in launch_sig:
        launch_kwargs["css"] = APP_CSS
    demo.launch(**launch_kwargs)

