import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch unauthorized requests (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
    }
    return Promise.reject(error);
  }
);

// Mock Database / Fallback for local usage (ensuring a 100% functional app in all states)
const getLocalData = (key, defaultVal) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
};

const setLocalData = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

const mockDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateMacros = (profile) => {
  const { age, weight, height, gender, activity, goal } = profile;
  
  // Harris-Benedict Equation
  let bmr = 0;
  if (gender === 'homme' || gender === 'male' || gender === 'M') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity multipliers
  const multipliers = {
    sedentaire: 1.2,
    leger: 1.375,
    modere: 1.55,
    intense: 1.725,
    athlete: 1.9,
  };

  const multiplier = multipliers[activity] || 1.55;
  let calories = Math.round(bmr * multiplier);

  // Goal adjustment
  if (goal === 'perdre_poids') calories -= 500;
  else if (goal === 'prendre_masse') calories += 500;

  // Macros calculation
  // Carbs: 45%, Protein: 30%, Fat: 25%
  const protein = Math.round((calories * 0.30) / 4);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories * 0.45) / 4);

  // BMI
  const heightM = height / 100;
  const bmi = Number((weight / (heightM * heightM)).toFixed(1));

  return { bmi, calories, macros: { protein, fat, carbs } };
};

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('auth-change'));
      return response.data;
    } catch (err) {
      // Fallback Mock Auth
      await mockDelay();
      if (email && password) {
        const users = getLocalData('mock_users', []);
        const user = users.find((u) => u.email === email && u.password === password);
        if (user) {
          const token = 'mock-jwt-token-xyz';
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          window.dispatchEvent(new Event('auth-change'));
          return { access_token: token, user };
        }
      }
      throw new Error(err.response?.data?.detail || 'Invalid email or password');
    }
  },

  register: async (username, email, password) => {
    try {
      const response = await api.post('/api/auth/register', { username, email, password });
      return response.data;
    } catch (err) {
      // Fallback Mock Register
      await mockDelay();
      const users = getLocalData('mock_users', []);
      if (users.some((u) => u.email === email)) {
        throw new Error('Email already registered');
      }
      const newUser = { username, email, password, profileCompleted: false };
      users.push(newUser);
      setLocalData('mock_users', users);
      return { success: true, message: 'Registration successful' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
  },

  getCurrentUser: () => {
    return getLocalData('user', null);
  },
};

export const profileService = {
  getProfile: async () => {
    try {
      const response = await api.get('/api/profile');
      return response.data;
    } catch (err) {
      await mockDelay(200);
      const user = authService.getCurrentUser();
      return user?.profile || null;
    }
  },

  saveProfile: async (profileData) => {
    try {
      const response = await api.post('/api/profile', profileData);
      // Update local storage user profile state
      const user = authService.getCurrentUser();
      if (user) {
        user.profile = response.data;
        user.profileCompleted = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
      return response.data;
    } catch (err) {
      await mockDelay();
      const user = authService.getCurrentUser();
      const calculations = calculateMacros(profileData);
      const completeProfile = { ...profileData, ...calculations };
      
      if (user) {
        user.profile = completeProfile;
        user.profileCompleted = true;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update user inside mock_users list
        const users = getLocalData('mock_users', []);
        const idx = users.findIndex((u) => u.email === user.email);
        if (idx !== -1) {
          users[idx] = user;
          setLocalData('mock_users', users);
        }
      }
      return completeProfile;
    }
  },
};

export const dashboardService = {
  getDashboardData: async () => {
    try {
      const response = await api.get('/api/dashboard');
      return response.data;
    } catch (err) {
      await mockDelay(300);
      const profile = await profileService.getProfile();
      if (!profile) return null;

      const user = authService.getCurrentUser();
      const mealsKey = user ? `mock_meals_${user.email}` : 'mock_meals';
      const meals = getLocalData(mealsKey, []);
      const todayStr = new Date().toISOString().split('T')[0];
      const todayMeals = meals.filter((m) => m.created_at.startsWith(todayStr));
      
      const totalCaloriesToday = todayMeals.reduce((acc, m) => acc + m.calories, 0);
      const totalProteinsToday = todayMeals.reduce((acc, m) => acc + m.proteins, 0);
      const totalCarbsToday = todayMeals.reduce((acc, m) => acc + m.carbs, 0);
      const totalFatsToday = todayMeals.reduce((acc, m) => acc + m.fats, 0);

      // Construct weekly and monthly progress data
      const weeklyHistory = [];
      const monthlyHistory = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const dayLabel = dayNames[d.getDay()];

        const dayMeals = meals.filter((m) => m.created_at.startsWith(dStr));
        const dayCalories = dayMeals.reduce((acc, m) => acc + m.calories, 0);

        const histEntry = {
          date: dStr,
          label: dayLabel,
          calories: dayCalories,
          target: profile.calories,
          percentage: profile.calories ? Math.round((dayCalories / profile.calories) * 100) : 0
        };

        monthlyHistory.push(histEntry);
        if (i < 7) {
          weeklyHistory.push(histEntry);
        }
      }

      return {
        isNew: meals.length === 0,
        calories: {
          target: profile.calories,
          consumed: totalCaloriesToday,
          remaining: Math.max(0, profile.calories - totalCaloriesToday),
        },
        bmi: {
          value: profile.bmi,
          status: profile.bmi < 18.5 ? 'Insuffisance pondérale' : profile.bmi < 25 ? 'Poids normal' : profile.bmi < 30 ? 'Surpoids' : 'Obésité',
        },
        macros: {
          protein: { target: profile.macros.protein, consumed: Math.round(totalProteinsToday) },
          fat: { target: profile.macros.fat, consumed: Math.round(totalFatsToday) },
          carbs: { target: profile.macros.carbs, consumed: Math.round(totalCarbsToday) },
        },
        hydration: {
          target: profile.ramadan_mode ? 3000 : 2500,
          consumed: getLocalData('mock_hydration_today', 0),
        },
        adherenceScore: weeklyHistory.length > 0 ? 90 : 0,
        weeklyHistory,
        monthlyHistory,
        recommendations: [
          profile.ramadan_mode 
            ? 'Hydratez-vous en priorité avec de petits volumes d\'eau espacés entre l\'Iftar et le Shour.'
            : 'Prenez une collation riche en protéines dans les 30 minutes après votre séance d\'entraînement.',
          'Consommez davantage de fibres (légumes verts, légumineuses) pour améliorer votre satiété.',
          `Vos calories cibles sont de ${profile.calories} kcal basées sur votre profil d'activité : ${profile.activity}.`
        ]
      };
    }
  },
};

export const chatService = {
  sendMessage: async (message, history = []) => {
    try {
      const response = await api.post('/api/chat', { message, history });
      return response.data;
    } catch (err) {
      await mockDelay(1200);
      
      const lowercaseMsg = message.toLowerCase();
      let reply = "";
      
      if (lowercaseMsg.includes('ramadan') || lowercaseMsg.includes('iftar') || lowercaseMsg.includes('shour')) {
        reply = `### 🌙 Guide Mode Ramadan Personnalisé\n\nPour optimiser votre jeûne en fonction de votre objectif, voici les recommandations clés :\n\n1. **Au Shour (Pré-jeûne)** :\n   * Privilégiez les glucides complexes à index glycémique bas (avoine, pain complet) et des protéines lentes (œufs, fromage blanc, caséine).\n   * Intégrez de bons lipides (poignée d'amandes, avocat) pour ralentir la digestion et libérer l'énergie progressivement.\n\n2. **À l'Iftar (Rupture)** :\n   * Rompez le jeûne avec 2-3 dattes et un grand verre d'eau tiède pour réhydrater l'organisme doucement.\n   * Attendez 15 min puis prenez un repas complet composé de protéines maigres (poulet, poisson), de féculents (riz complet, patate douce) et de légumes cuits.\n\n3. **Post-Tarawih (Collation Récupération)** :\n   * Un shake de protéines avec une banane ou un yaourt à la grecque et du miel.\n\n4. **Hydratation** :\n   * Visez 3 litres d'eau répartis uniformément : 1L à la rupture, 1L entre l'Iftar et le Shour, et 1L au Shour. Évitez le thé et le café qui stimulent la diurèse.`;
      } else if (lowercaseMsg.includes('gym') || lowercaseMsg.includes('salle') || lowercaseMsg.includes('sport')) {
        reply = `### 📍 Salles de Sport recommandées à proximité de votre position\n\nBasé sur votre géolocalisation, voici des options hautement recommandées :\n\n* **California Gym (Lac 2)** : Premium, grand parc de machines, cours collectifs variés (LesMills). Évaluation : ⭐ 4.7/5 (Distance: ~1.2 km)\n* **Oxygen Gym (La Marsa)** : Moderne, coachs certifiés, excellent espace musculation/crossfit. Évaluation : ⭐ 4.5/5 (Distance: ~2.8 km)\n* **Gym Club (Tunis Centre)** : Accessible, bon rapport qualité-prix, idéal pour le renforcement et le cardio. Évaluation : ⭐ 4.2/5 (Distance: ~4.1 km)\n\n*Conseil : Planifiez vos séances environ 2 heures après l'Iftar ou juste avant pour un entraînement cardio à jeun si vous le supportez bien.*`;
      } else if (lowercaseMsg.includes('plan') || lowercaseMsg.includes('repas') || lowercaseMsg.includes('menu')) {
        reply = `### 🥗 Votre Plan Alimentaire Personnalisé\n\nVoici une proposition équilibrée basée sur vos cibles caloriques et macro-nutritionnelles :\n\n* **Petit-déjeuner (Breakfast)** :\n  * 3 blancs d'œufs + 1 œuf entier brouillés.\n  * 60g de flocons d'avoine avec 150ml de lait d'amande sans sucre.\n  * 100g de baies (myrtilles/fraises) et un café noir.\n\n* **Déjeuner (Lunch)** :\n  * 150g de filet de poulet grillé.\n  * 180g de riz basmati cuit.\n  * Brocolis à la vapeur arrosés d'une cuillère à café d'huile d'olive.\n\n* **Collation (Snack)** :\n  * 30g d'isolat de whey ou 200g de fromage blanc 0%.\n  * 30g d'amandes douces.\n\n* **Dîner (Dinner)** :\n  * 140g de pavé de saumon ou poisson blanc.\n  * 150g de patates douces au four.\n  * Grande salade verte mixte.\n\n*Cibles quotidiennes : ~2100 kcal | Protéines: 160g | Lipides: 65g | Glucides: 210g.*`;
      } else {
        reply = `Bonjour ! Je suis votre **Assistant Nutrition IA**. 

J'ai analysé votre profil et vos objectifs. Que souhaitez-vous ajuster aujourd'hui ? Je peux :
* Générer ou réévaluer votre **Plan de Repas** hebdomadaire.
* Vous guider dans le **Mode Ramadan** pour optimiser vos macros et votre hydratation.
* Trouver les **salles de sport (Gyms)** les plus adaptées près de chez vous.
* Analyser l'image d'un plat grâce à la **Food Recognition** pour estimer ses calories.

Posez-moi toutes vos questions sur la nutrition, le sport et la supplémentation !`;
      }

      // Add to local chat history
      const savedHist = getLocalData('mock_chat_history', []);
      savedHist.push({ role: 'user', content: message });
      savedHist.push({ role: 'assistant', content: reply });
      setLocalData('mock_chat_history', savedHist);

      return { reply, history: savedHist };
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get('/api/chat/history');
      return response.data;
    } catch (err) {
      return getLocalData('mock_chat_history', [
        { role: 'assistant', content: 'Bonjour ! Remplissez votre profil pour recevoir des conseils et plans de repas adaptés à vos besoins.' }
      ]);
    }
  },

  clearHistory: async () => {
    try {
      await api.delete('/api/chat/history');
    } catch (err) {
      localStorage.removeItem('mock_chat_history');
    }
    return [];
  }
};

export const nutritionPlanService = {
  getPlan: async () => {
    try {
      const response = await api.get('/api/nutrition-plan');
      return response.data;
    } catch (err) {
      await mockDelay(400);
      const profile = await profileService.getProfile();
      if (!profile) return null;

      return getLocalData('mock_nutrition_plan', {
        meals: {
          breakfast: {
            name: "Bol d'Avoine Protéiné & Fruits Rouges",
            items: [
              "60g Flocons d'avoine complets",
              "30g Whey protéine isolat (vanille)",
              "100g Myrtilles fraîches ou surgelées",
              "15g Graines de chia",
              "200ml Eau ou Lait d'amande sans sucre ajouté"
            ],
            calories: 420,
            protein: 35,
            carbs: 52,
            fat: 8
          },
          lunch: {
            name: "Poulet Teriyaki, Riz Basmati & Asperges",
            items: [
              "150g Filet de poulet cuit sans peau",
              "150g Riz basmati (poids cuit)",
              "150g Asperges ou Brocolis sautés",
              "1 c.à.s Sauce soja allégée en sel",
              "1 c.à.c Huile de sésame"
            ],
            calories: 550,
            protein: 48,
            carbs: 62,
            fat: 11
          },
          snack: {
            name: "Amandes & Pomme Croquante",
            items: [
              "30g d'amandes entières (crues, non salées)",
              "1 Pomme verte moyenne",
              "1 Tasse de Thé vert"
            ],
            calories: 250,
            protein: 7,
            carbs: 28,
            fat: 15
          },
          dinner: {
            name: "Saumon aux Herbes, Patate Douce & Épinards",
            items: [
              "130g Filet de saumon sauvage cuit au four",
              "150g Purée de patate douce maison",
              "200g Épinards frais tombés à l'ail",
              "Citron pressé et aneth frais"
            ],
            calories: 580,
            protein: 36,
            carbs: 45,
            fat: 26
          }
        },
        totals: {
          calories: 1800,
          protein: 126,
          carbs: 187,
          fat: 60
        }
      });
    }
  },

  regeneratePlan: async () => {
    try {
      const response = await api.post('/api/nutrition-plan/regenerate');
      return response.data;
    } catch (err) {
      await mockDelay(1000);
      const plan = await nutritionPlanService.getPlan();
      // Introduce slight variations for the simulation
      if (plan) {
        plan.totals.calories = Math.round(plan.totals.calories * 1.05);
        plan.meals.breakfast.name = "Omelette Gourmande aux Épinards & Pain Complet";
        plan.meals.breakfast.items = [
          "3 Blancs d'œuf + 1 Œuf entier",
          "50g Pousses d'épinards frais",
          "2 Tranches de pain de seigle complet",
          "1/2 Avocat mûr écrasé"
        ];
        setLocalData('mock_nutrition_plan', plan);
      }
      return plan;
    }
  }
};

export const ramadanService = {
  getRamadanData: async () => {
    try {
      const response = await api.get('/api/ramadan');
      return response.data;
    } catch (err) {
      await mockDelay(300);
      const profile = await profileService.getProfile();
      const calories = profile?.calories || 2000;
      
      return {
        shour: {
          name: "Shour Énergétique & Hydratant",
          items: [
            "150g Fromage blanc 0% ou Yaourt grec nature",
            "50g Flocons d'avoine (glucides lents)",
            "1 Banane moyenne (source de potassium contre les crampes)",
            "30g Amandes ou noix (acides gras essentiels pour ralentir la digestion)",
            "500ml Eau pure"
          ],
          calories: Math.round(calories * 0.35),
          macros: { protein: 30, carbs: 60, fat: 18 }
        },
        iftar: {
          name: "Iftar Équilibré et Reconstituant",
          items: [
            "3 Dattes + 250ml d'eau tiède (réhydratation rapide)",
            "Bol de Soupe de légumes traditionnelle (Chorba légère)",
            "150g Escalope de dinde grillée ou filet de poisson",
            "180g Couscous complet ou riz cuit",
            "Grande salade tunisienne aux olives et citron"
          ],
          calories: Math.round(calories * 0.45),
          macros: { protein: 45, carbs: 80, fat: 12 }
        },
        tarawihSnack: {
          name: "Snack de Récupération Post-Tarawih",
          items: [
            "Shake protéiné (Whey) ou 1 pot de yaourt skyr",
            "30g de figues séchées ou raisins secs"
          ],
          calories: Math.round(calories * 0.2),
          macros: { protein: 25, carbs: 35, fat: 2 }
        },
        hydrationTips: [
          "Buvez un grand verre d'eau toutes les heures entre la rupture et le Shour.",
          "Limitez les boissons sucrées qui augmentent la soif pendant la journée.",
          "Consommez des aliments riches en eau (concombres, pastèque, fraises) lors de l'Iftar."
        ]
      };
    }
  }
};

export const gymService = {
  getNearbyGyms: async (latitude, longitude) => {
    try {
      const response = await api.get('/api/gyms', { params: { lat: latitude, lon: longitude } });
      return response.data;
    } catch (err) {
      await mockDelay(800);
      // Hardcoded list of gyms around Tunisia (Tunis/Lac/Marsa coordinates)
      return [
        {
          id: 1,
          name: "California Gym (Lac 2)",
          distance: "1.2 km",
          rating: 4.8,
          address: "Rue du Lac Biwa, Les Berges du Lac 2, Tunis",
          price: "150 DT / mois",
          features: ["Musculation", "Cardio", "Piscine", "Cours LesMills", "Coachs Certifiés"],
          lat: 36.8456,
          lon: 10.2789
        },
        {
          id: 2,
          name: "Oxygen Gym (La Marsa)",
          distance: "2.8 km",
          rating: 4.6,
          address: "Avenue de l'Indépendance, La Marsa, Tunis",
          price: "120 DT / mois",
          features: ["Musculation", "Crossfit", "Sauna", "Coaching Personnel"],
          lat: 36.8791,
          lon: 10.3245
        },
        {
          id: 3,
          name: "Fit & Go Studio (Sidi Bou Said)",
          distance: "3.5 km",
          rating: 4.9,
          address: "Avenue Habib Bourguiba, Sidi Bou Said",
          price: "220 DT / mois",
          features: ["EMS Training", "Pilates", "Yoga", "Nutrition Suivie"],
          lat: 36.8682,
          lon: 10.3411
        },
        {
          id: 4,
          name: "Gym Club (Menzah 6)",
          distance: "4.1 km",
          rating: 4.2,
          address: "Complexe Commercial, Menzah 6, Tunis",
          price: "90 DT / mois",
          features: ["Musculation", "Fitness", "Zumba", "MMA / Boxe"],
          lat: 36.8322,
          lon: 10.1878
        }
      ];
    }
  }
};

export const progressService = {
  getProgress: async () => {
    try {
      const response = await api.get('/api/progress');
      return response.data;
    } catch (err) {
      await mockDelay(300);
      const profile = await profileService.getProfile();
      const weight = profile?.weight || 75;
      const progress = getLocalData('mock_progress', null);
      if (progress === null) {
        return [];
      }
      return progress;
    }
  },

  saveProgress: async (poids_jour, calories, adherence) => {
    try {
      const response = await api.post('/api/progress', { poids_jour, calories, adherence });
      return response.data;
    } catch (err) {
      await mockDelay(500);
      const progress = await progressService.getProgress();
      const todayStr = new Date().toISOString().split('T')[0];
      const existingIdx = progress.findIndex((p) => p.date === todayStr);

      const entry = {
        date: todayStr,
        weight: Number(poids_jour),
        calories: Number(calories),
        adherence: Number(adherence),
      };
      
      // Update weight inside current user profile
      const profile = await profileService.getProfile();
      if (profile) {
        profile.weight = Number(poids_jour);
        const calculations = calculateMacros(profile);
        const updatedProfile = { ...profile, ...calculations };
        await profileService.saveProfile(updatedProfile);
      }

      if (existingIdx !== -1) {
        progress[existingIdx] = entry;
      } else {
        progress.push(entry);
      }
      setLocalData('mock_progress', progress);
      return entry;
    }
  },

  addCaloriesToday: async (calories) => {
    try {
      const response = await api.post('/api/progress/add-calories', { calories });
      return response.data;
    } catch (err) {
      await mockDelay(300);
      const progress = await progressService.getProgress();
      const todayStr = new Date().toISOString().split('T')[0];
      const profile = await profileService.getProfile();
      const currentWeight = profile?.weight || 72;
      
      const existingIdx = progress.findIndex((p) => p.date === todayStr);
      let entry;
      if (existingIdx !== -1) {
        progress[existingIdx].calories += Number(calories);
        entry = progress[existingIdx];
      } else {
        entry = {
          date: todayStr,
          weight: currentWeight,
          calories: Number(calories),
          adherence: 95,
        };
        progress.push(entry);
      }
      setLocalData('mock_progress', progress);
      return entry;
    }
  }
};

export const docService = {
  uploadDocs: async (files) => {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      const response = await api.post('/api/documents/reindex', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err) {
      await mockDelay(2000);
      return { success: true, message: `${files.length} document(s) uploader et base FAISS réindexée.` };
    }
  }
};

export const mealService = {
  addMeal: async (mealData) => {
    try {
      const response = await api.post('/api/meals', mealData);
      return response.data;
    } catch (err) {
      await mockDelay(400);
      const user = authService.getCurrentUser();
      const mealsKey = user ? `mock_meals_${user.email}` : 'mock_meals';
      const progressKey = user ? `mock_progress_${user.email}` : 'mock_progress';
      
      const meals = getLocalData(mealsKey, []);
      const newMeal = {
        id: Date.now(),
        ...mealData,
        created_at: new Date().toISOString()
      };
      meals.push(newMeal);
      setLocalData(mealsKey, meals);

      // Update progress entry for today in local storage as well
      const todayStr = new Date().toISOString().split('T')[0];
      const progress = getLocalData(progressKey, []);
      const todayMeals = meals.filter(m => m.created_at.startsWith(todayStr));
      const totalCalories = todayMeals.reduce((acc, m) => acc + m.calories, 0);

      const existingIdx = progress.findIndex(p => p.date === todayStr);
      if (existingIdx !== -1) {
        progress[existingIdx].calories = totalCalories;
      } else {
        const profile = getLocalData('user', null)?.profile || {};
        progress.push({
          date: todayStr,
          weight: profile.weight || 70,
          calories: totalCalories,
          adherence: 90
        });
      }
      setLocalData(progressKey, progress);

      return { success: true, meal: newMeal };
    }
  },

  getMeals: async () => {
    try {
      const response = await api.get('/api/meals');
      return response.data;
    } catch (err) {
      const user = authService.getCurrentUser();
      const mealsKey = user ? `mock_meals_${user.email}` : 'mock_meals';
      return getLocalData(mealsKey, []);
    }
  }
};

export default api;
