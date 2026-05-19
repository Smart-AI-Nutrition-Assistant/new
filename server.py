import os
import json
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import jwt
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# JWT Config
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-nutrition-assistant-2026")
JWT_ALGORITHM = "HS256"

# Database Configuration
# Fallback to local SQLite nutrition.db if MySQL is not configured
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DB = os.getenv("MYSQL_DB")

if MYSQL_HOST and MYSQL_USER and MYSQL_DB:
    # Attempt MySQL using pymysql or mysqlconnector
    try:
        DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"
        engine = create_engine(DATABASE_URL, pool_recycle=3600)
        # Check connection
        with engine.connect() as conn:
            pass
        print("Connected successfully to MySQL Database!")
    except Exception as e:
        print(f"Failed to connect to MySQL database: {e}. Falling back to SQLite local database.")
        DATABASE_URL = "sqlite:///nutrition.db"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    DATABASE_URL = "sqlite:///nutrition.db"
    print("MySQL environment variables not provided. Initializing local SQLite database (nutrition.db)")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# DB Models
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    password = Column(String(255))
    profile_completed = Column(Boolean, default=False)
    
    # Profile fields
    age = Column(Integer, nullable=True)
    gender = Column(String(50), nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    activity_level = Column(String(50), nullable=True)
    allergies = Column(String(255), nullable=True)
    food_preferences = Column(String(255), nullable=True)
    nutrition_goal = Column(String(100), nullable=True)
    ramadan_mode = Column(Boolean, default=False)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Calculated values
    bmi = Column(Float, nullable=True)
    calories_target = Column(Integer, nullable=True)
    protein_target = Column(Integer, nullable=True)
    carbs_target = Column(Integer, nullable=True)
    fat_target = Column(Integer, nullable=True)

class MealDB(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String(100))
    calories = Column(Integer)
    proteins = Column(Float)
    carbs = Column(Float)
    fats = Column(Float)
    created_at = Column(DateTime, default=datetime.now)

class ProgressDB(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    date = Column(Date, index=True)
    weight = Column(Float)
    calories = Column(Integer)
    adherence = Column(Integer)

class ChatMessageDB(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    role = Column(String(50)) # "user" or "assistant"
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class RegisterSchema(BaseModel):
    username: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

class ProfileSchema(BaseModel):
    age: int
    gender: str
    weight: float
    height: float
    activity: str
    allergies: Optional[str] = ""
    foodPreferences: Optional[str] = ""
    goal: str
    ramadan_mode: bool
    city: str
    latitude: Optional[float] = 36.8065
    longitude: Optional[float] = 10.1957

class MealSchema(BaseModel):
    name: str
    calories: int
    proteins: float
    carbs: float
    fats: float

class ProgressSchema(BaseModel):
    poids_jour: float
    calories: int
    adherence: int

class ChatSchema(BaseModel):
    message: str
    history: List[dict] = []

# FastAPI Initialization
app = FastAPI(title="AI Nutrition Assistant API Backend")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT helper
def get_current_user_id(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> int:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# Macro Calculations Helper
def calculate_macros(age, weight, height, gender, activity, goal):
    # Harris-Benedict
    if gender in ['homme', 'male', 'M']:
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

    multipliers = {
        'sedentaire': 1.2,
        'leger': 1.375,
        'modere': 1.55,
        'intense': 1.725,
        'athlete': 1.9,
    }
    multiplier = multipliers.get(activity, 1.55)
    calories = int(bmr * multiplier)

    if goal == 'perdre_poids':
        calories -= 500
    elif goal == 'prendre_masse':
        calories += 500

    protein = int((calories * 0.30) / 4)
    fat = int((calories * 0.25) / 9)
    carbs = int((calories * 0.45) / 4)
    bmi = round(weight / ((height / 100) ** 2), 1)

    return bmi, calories, protein, carbs, fat

# REST Routes
@app.post("/api/auth/register")
def register(schema: RegisterSchema, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(UserDB).filter((UserDB.email == schema.email) | (UserDB.username == schema.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    user = UserDB(username=schema.username, email=schema.email, password=schema.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "message": "User registered successfully"}

@app.post("/api/auth/login")
def login(schema: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == schema.email, UserDB.password == schema.password).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    # Generate token
    token = jwt.encode({"user_id": user.id, "email": user.email}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    user_payload = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "profileCompleted": user.profile_completed,
    }
    
    if user.profile_completed:
        user_payload["profile"] = {
            "age": user.age,
            "gender": user.gender,
            "weight": user.weight,
            "height": user.height,
            "activity": user.activity_level,
            "allergies": user.allergies,
            "foodPreferences": user.food_preferences,
            "goal": user.nutrition_goal,
            "ramadan_mode": user.ramadan_mode,
            "city": user.city,
            "latitude": user.latitude,
            "longitude": user.longitude,
            "bmi": user.bmi,
            "calories": user.calories_target,
            "macros": {
                "protein": user.protein_target,
                "carbs": user.carbs_target,
                "fat": user.fat_target
            }
        }
    
    return {"access_token": token, "user": user_payload}

@app.get("/api/profile")
def get_profile(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user or not user.profile_completed:
        return None
    
    return {
        "age": user.age,
        "gender": user.gender,
        "weight": user.weight,
        "height": user.height,
        "activity": user.activity_level,
        "allergies": user.allergies,
        "foodPreferences": user.food_preferences,
        "goal": user.nutrition_goal,
        "ramadan_mode": user.ramadan_mode,
        "city": user.city,
        "latitude": user.latitude,
        "longitude": user.longitude,
        "bmi": user.bmi,
        "calories": user.calories_target,
        "macros": {
            "protein": user.protein_target,
            "carbs": user.carbs_target,
            "fat": user.fat_target
        }
    }

@app.post("/api/profile")
def save_profile(schema: ProfileSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    bmi, calories, protein, carbs, fat = calculate_macros(
        schema.age, schema.weight, schema.height, schema.gender, schema.activity, schema.goal
    )
    
    user.age = schema.age
    user.gender = schema.gender
    user.weight = schema.weight
    user.height = schema.height
    user.activity_level = schema.activity
    user.allergies = schema.allergies
    user.food_preferences = schema.foodPreferences
    user.nutrition_goal = schema.goal
    user.ramadan_mode = schema.ramadan_mode
    user.city = schema.city
    user.latitude = schema.latitude
    user.longitude = schema.longitude
    user.profile_completed = True
    
    user.bmi = bmi
    user.calories_target = calories
    user.protein_target = protein
    user.carbs_target = carbs
    user.fat_target = fat
    
    db.commit()
    db.refresh(user)
    
    return {
        "age": user.age,
        "gender": user.gender,
        "weight": user.weight,
        "height": user.height,
        "activity": user.activity_level,
        "allergies": user.allergies,
        "foodPreferences": user.food_preferences,
        "goal": user.nutrition_goal,
        "ramadan_mode": user.ramadan_mode,
        "city": user.city,
        "latitude": user.latitude,
        "longitude": user.longitude,
        "bmi": user.bmi,
        "calories": user.calories_target,
        "macros": {
            "protein": user.protein_target,
            "carbs": user.carbs_target,
            "fat": user.fat_target
        }
    }

@app.get("/api/dashboard")
def get_dashboard_data(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user or not user.profile_completed:
        raise HTTPException(status_code=400, detail="Profile not completed")
        
    today = date.today()
    
    # 1. Calories reset automatically every new day
    # Consumed calories comes from user meals added during the day
    today_meals = db.query(MealDB).filter(
        MealDB.user_id == user_id,
        MealDB.created_at >= datetime.combine(today, datetime.min.time())
    ).all()
    
    total_calories_today = sum(m.calories for m in today_meals)
    total_proteins_today = sum(m.proteins for m in today_meals)
    total_carbs_today = sum(m.carbs for m in today_meals)
    total_fats_today = sum(m.fats for m in today_meals)
    
    # 2. Get history for weekly / monthly charts
    # Last 30 days history
    weekly_history = []
    monthly_history = []
    
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        day_meals = db.query(MealDB).filter(
            MealDB.user_id == user_id,
            MealDB.created_at >= datetime.combine(day, datetime.min.time()),
            MealDB.created_at <= datetime.combine(day, datetime.max.time())
        ).all()
        
        day_calories = sum(m.calories for m in day_meals)
        day_names = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
        day_label = day_names[day.weekday() if day.weekday() != 6 else 0] # adjust weekday label
        
        hist_entry = {
            "date": str(day),
            "label": day_label,
            "calories": day_calories,
            "target": user.calories_target,
            "percentage": round((day_calories / user.calories_target) * 100) if user.calories_target else 0
        }
        
        monthly_history.append(hist_entry)
        if i < 7:
            weekly_history.append(hist_entry)
            
    # Check if user is brand new (no meals logged at all in history)
    all_meals_count = db.query(MealDB).filter(MealDB.user_id == user_id).count()
    is_new = all_meals_count == 0
    
    # Dynamic advice
    recommendations = [
        "Hydratez-vous en priorité avec de petits volumes d'eau espacés." if user.ramadan_mode else "Prenez une collation riche en protéines dans les 30 minutes après l'effort.",
        "Consommez davantage de fibres pour optimiser votre satiété.",
        f"Votre objectif calorique IA est de {user.calories_target} kcal."
    ]
    
    return {
        "isNew": is_new,
        "calories": {
            "target": user.calories_target,
            "consumed": total_calories_today,
            "remaining": max(0, user.calories_target - total_calories_today),
        },
        "bmi": {
            "value": user.bmi,
            "status": "Insuffisance" if user.bmi < 18.5 else "Normal" if user.bmi < 25 else "Surpoids" if user.bmi < 30 else "Obésité",
        },
        "macros": {
            "protein": {"target": user.protein_target, "consumed": int(total_proteins_today)},
            "fat": {"target": user.fat_target, "consumed": int(total_fats_today)},
            "carbs": {"target": user.carbs_target, "consumed": int(total_carbs_today)},
        },
        "hydration": {
            "target": 3000 if user.ramadan_mode else 2500,
            "consumed": 0, # simulated renal water tracker
        },
        "weeklyHistory": weekly_history,
        "monthlyHistory": monthly_history,
        "recommendations": recommendations
    }

@app.post("/api/meals")
def add_meal(schema: MealSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meal = MealDB(
        user_id=user_id,
        name=schema.name,
        calories=schema.calories,
        proteins=schema.proteins,
        carbs=schema.carbs,
        fats=schema.fats
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    
    # Save a progress entry for the history chart as well
    today = date.today()
    existing_progress = db.query(ProgressDB).filter(ProgressDB.user_id == user_id, ProgressDB.date == today).first()
    
    # Recalculate daily sum
    today_meals = db.query(MealDB).filter(
        MealDB.user_id == user_id,
        MealDB.created_at >= datetime.combine(today, datetime.min.time())
    ).all()
    total_calories = sum(m.calories for m in today_meals)
    
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    
    if existing_progress:
        existing_progress.calories = total_calories
    else:
        progress = ProgressDB(
            user_id=user_id,
            date=today,
            weight=user.weight if user else 70.0,
            calories=total_calories,
            adherence=90
        )
        db.add(progress)
    
    db.commit()
    return {"success": True, "meal": {
        "id": meal.id,
        "name": meal.name,
        "calories": meal.calories,
        "proteins": meal.proteins,
        "carbs": meal.carbs,
        "fats": meal.fats,
        "created_at": meal.created_at.isoformat()
    }}

@app.get("/api/meals")
def get_meals(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    meals = db.query(MealDB).filter(MealDB.user_id == user_id).order_by(MealDB.created_at.desc()).all()
    return [{
        "id": m.id,
        "name": m.name,
        "calories": m.calories,
        "proteins": m.proteins,
        "carbs": m.carbs,
        "fats": m.fats,
        "created_at": m.created_at.isoformat()
    } for m in meals]

@app.post("/api/progress")
def save_progress(schema: ProgressSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    today = date.today()
    existing = db.query(ProgressDB).filter(ProgressDB.user_id == user_id, ProgressDB.date == today).first()
    
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if user:
        user.weight = schema.poids_jour
        db.commit()
        
    if existing:
        existing.weight = schema.poids_jour
        existing.calories = schema.calories
        existing.adherence = schema.adherence
        db.commit()
        db.refresh(existing)
        return existing
    else:
        prog = ProgressDB(
            user_id=user_id,
            date=today,
            weight=schema.poids_jour,
            calories=schema.calories,
            adherence=schema.adherence
        )
        db.add(prog)
        db.commit()
        db.refresh(prog)
        return prog

@app.get("/api/progress")
def get_progress(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    history = db.query(ProgressDB).filter(ProgressDB.user_id == user_id).order_by(ProgressDB.date.asc()).all()
    return [{
        "date": str(p.date),
        "weight": p.weight,
        "calories": p.calories,
        "adherence": p.adherence
    } for p in history]

@app.post("/api/chat")
def chat_interaction(schema: ChatSchema, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    profile_dict = {}
    if user and user.profile_completed:
        profile_dict = {
            "age": user.age,
            "poids_kg": user.weight,
            "taille_cm": user.height,
            "sexe": user.gender,
            "activite": user.activity_level,
            "objectif": user.nutrition_goal,
            "ramadan_mode": user.ramadan_mode,
            "ville": user.city,
            "user_latitude": user.latitude,
            "user_longitude": user.longitude,
        }
    
    # 1. Save user message to database
    user_msg = ChatMessageDB(user_id=user_id, role="user", content=schema.message)
    db.add(user_msg)
    db.commit()

    # 2. Fetch history from DB for this user as context
    history_msgs = db.query(ChatMessageDB).filter(ChatMessageDB.user_id == user_id).order_by(ChatMessageDB.created_at.asc()).all()
    chat_history = [{"role": msg.role, "content": msg.content} for msg in history_msgs if msg.id != user_msg.id]
    
    # Run the real LangChain Agent!
    from src.agent import run_nutrition_agent
    try:
        reply = run_nutrition_agent(
            user_input=schema.message,
            chat_history=chat_history,
            user_profile=profile_dict,
            ramadan_mode=user.ramadan_mode if user else False
        )
    except Exception as e:
        reply = f"Désolé, j'ai rencontré une erreur technique : {e}"
        
    # 3. Save assistant reply to database
    assistant_msg = ChatMessageDB(user_id=user_id, role="assistant", content=reply)
    db.add(assistant_msg)
    db.commit()

    # Format updated history response
    updated_history = chat_history + [
        {"role": "user", "content": schema.message},
        {"role": "assistant", "content": reply}
    ]
    return {"reply": reply, "history": updated_history}

@app.get("/api/chat/history")
def get_chat_history(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    messages = db.query(ChatMessageDB).filter(ChatMessageDB.user_id == user_id).order_by(ChatMessageDB.created_at.asc()).all()
    return [{"role": msg.role, "content": msg.content} for msg in messages]

@app.delete("/api/chat/history")
def clear_chat_history(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    db.query(ChatMessageDB).filter(ChatMessageDB.user_id == user_id).delete()
    db.commit()
    return {"success": True, "message": "Chat history cleared successfully"}

@app.get("/api/chat/suggestions")
def get_chat_suggestions(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    ramadan = user.ramadan_mode if user else False
    
    suggestions = [
        {
            "label": "Plats Tunisiens & Calories",
            "text": "Comment manger équilibré avec des plats typiquement tunisiens comme la salade méchouia et contrôler mes calories ?",
            "category": "nutrition",
            "icon": "Apple"
        },
        {
            "label": "Guide Ramadan Hydratation",
            "text": "Comment répartir mes 3 litres d'eau entre l'Iftar et le Shour d'après nos principes ?",
            "category": "ramadan",
            "icon": "Moon"
        },
        {
            "label": "Plan Protéines & Thon",
            "text": "Donne-moi des idées de repas riches en protéines avec du thon, du poisson et du poulet selon les notes.",
            "category": "diet",
            "icon": "Flame"
        },
        {
            "label": "Optimiser le Shour",
            "text": "Que consommer au Shour pour avoir des protéines lentes et des fibres et tenir toute la journée ?",
            "category": "ramadan",
            "icon": "Activity"
        },
        {
            "label": "Entraînement & Tarawih",
            "text": "Quel est le meilleur moment pour s'entraîner en salle et quelle collation post-Tarawih prendre ?",
            "category": "fitness",
            "icon": "Dumbbell"
        }
    ]
    
    if ramadan:
        suggestions = [s for s in suggestions if s["category"] == "ramadan"] + [s for s in suggestions if s["category"] != "ramadan"]
        
    return suggestions

@app.get("/api/nutrition-plan")
def get_nutrition_plan(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    cals = user.calories_target if (user and user.profile_completed) else 2000
    
    return {
        "meals": {
            "breakfast": {
                "name": "Bol d'Avoine Protéiné & Fruits Rouges",
                "items": ["60g Flocons d'avoine", "30g Whey isolat", "100g Fruits rouges", "15g Graines de chia"],
                "calories": int(cals * 0.25), "protein": int(cals * 0.25 * 0.08), "carbs": int(cals * 0.25 * 0.12), "fat": int(cals * 0.25 * 0.02)
            },
            "lunch": {
                "name": "Poulet Basmati Teriyaki & Brocolis",
                "items": ["150g Filet de poulet", "150g Rice basmati cuit", "150g Brocolis", "Sauce soja"],
                "calories": int(cals * 0.35), "protein": int(cals * 0.35 * 0.08), "carbs": int(cals * 0.35 * 0.12), "fat": int(cals * 0.35 * 0.02)
            },
            "snack": {
                "name": "Poignée d'Amandes & Pomme",
                "items": ["30g Amandes", "1 Pomme"],
                "calories": int(cals * 0.12), "protein": int(cals * 0.12 * 0.08), "carbs": int(cals * 0.12 * 0.12), "fat": int(cals * 0.12 * 0.02)
            },
            "dinner": {
                "name": "Filet de Saumon, Patate Douce & Épinards",
                "items": ["130g Saumon", "150g Purée de patate douce", "200g Épinards", "Citron"],
                "calories": int(cals * 0.28), "protein": int(cals * 0.28 * 0.08), "carbs": int(cals * 0.28 * 0.12), "fat": int(cals * 0.28 * 0.02)
            }
        },
        "totals": {
            "calories": cals,
            "protein": user.protein_target if user else 150,
            "carbs": user.carbs_target if user else 200,
            "fat": user.fat_target if user else 60
        }
    }

@app.post("/api/nutrition-plan/regenerate")
def regenerate_plan(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return get_nutrition_plan(user_id, db)

@app.get("/api/ramadan")
def get_ramadan_data(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    cals = user.calories_target if (user and user.profile_completed) else 2000
    return {
        "shour": {
            "name": "Shour Hydratant & Protéines Lentes",
            "items": ["150g Fromage blanc 0%", "50g Avoine", "1 Banane", "30g Noix"],
            "calories": int(cals * 0.35), "macros": {"protein": 30, "carbs": 60, "fat": 18}
        },
        "iftar": {
            "name": "Iftar Équilibré & Réhydratation",
            "items": ["3 Dattes + Eau", "Bol Chorba", "150g Poulet grillé", "180g Riz", "Salade"],
            "calories": int(cals * 0.45), "macros": {"protein": 45, "carbs": 80, "fat": 12}
        },
        "tarawihSnack": {
            "name": "Collation de Récupération",
            "items": ["Shake de Whey", "Figues séchées"],
            "calories": int(cals * 0.2), "macros": {"protein": 25, "carbs": 35, "fat": 2}
        },
        "hydrationTips": [
            "Buvez un grand verre d'eau toutes les heures entre l'Iftar et le Shour.",
            "Limitez les boissons sucrées.",
            "Consommez des concombres ou pastèque."
        ]
    }

@app.get("/api/gyms")
def get_gyms(lat: float, lon: float):
    # Simulated search based on GPS
    return [
        {"id": 1, "name": "California Gym (Lac 2)", "distance": "1.2 km", "rating": 4.8, "address": "Rue du Lac Biwa, Les Berges du Lac 2, Tunis", "price": "150 DT / mois", "features": ["Musculation", "Cardio", "Piscine", "Cours LesMills"]},
        {"id": 2, "name": "Oxygen Gym (La Marsa)", "distance": "2.8 km", "rating": 4.6, "address": "Avenue de l'Indépendance, La Marsa", "price": "120 DT / mois", "features": ["Musculation", "Crossfit", "Sauna"]},
        {"id": 3, "name": "Fit & Go Studio (Sidi Bou Said)", "distance": "3.5 km", "rating": 4.9, "address": "Avenue Habib Bourguiba, Sidi Bou Said", "price": "220 DT / mois", "features": ["EMS Training", "Pilates", "Yoga"]}
    ]

# Document FAISS reindexing trigger
@app.post("/api/documents/reindex")
def reindex_docs():
    from src.vectorstore import build_vectorstore
    try:
        build_vectorstore(force_rebuild=True)
        return {"success": True, "message": "Base FAISS réindexée avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
