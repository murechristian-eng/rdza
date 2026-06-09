# 🔴 RDZA Test — Odysséus

Version de test allégée du cockpit Odysséus, hébergée gratuitement sur Vercel.

## 🎯 Fonctionnalités

| Onglet | Contenu |
|--------|---------|
| 🧩 **Outils** | Badges RDZA mockés (✓ Dispo / ⚠ Dégradé / ✗ Rouge), modifiables, avec suggestions de Fix |
| 📝 **Feedback** | Formulaire structuré (catégorie, sévérité, description, étapes) + historique des soumissions |
| ✅ **Checklist QA** | 12 items de validation répartis en 6 sections, avec cases à cocher et commentaires |
| 🤖 **Assistant IA** | Chatbot intégré + analyse intelligente des feedbacks (fonctionne en mocké par défaut) |

## 🚀 Déploiement sur Vercel

### 1. Prérequis

- Un compte [Vercel](https://vercel.com) (gratuit)
- Un compte GitHub/GitLab/Bitbucket
- (Optionnel) Une clé API [Google Gemini](https://aistudio.google.com/apikey) pour l'assistant IA

### 2. Déploiement en 3 commandes

```bash
cd C:/Users/chris/rdza-test
git init
git add .
git commit -m "feat: RDZA Test initial"
```

Puis :

```bash
npx vercel
```

Réponds aux questions :
- `Set up and deploy?` → **Y**
- `Which scope?` → ton compte Vercel
- `Link to existing project?` → **N**
- `What's your project's name?` → `rdza-test` (ou ce que tu veux)
- `In which directory is your code?` → `./`
- `Want to override settings?` → **N**

L'URL sera : `https://rdza-test.vercel.app`

### 3. Activer l'IA réelle (optionnel)

1. Va sur [Google AI Studio](https://aistudio.google.com/apikey) → Crée une clé API
2. Dans le dashboard Vercel → `rdza-test` → Settings → Environment Variables
3. Ajoute :
   - **Key** : `GEMINI_API_KEY`
   - **Value** : ta clé API
4. Redéploie : `npx vercel --prod`

Sans cette clé, l'assistant IA fonctionne en mode **mocké** (réponses prédéfinies intelligentes).

## 🛠️ Développement local

```bash
npm install
npm run dev        # → http://localhost:5173
npx vercel dev     # → http://localhost:3000 (avec fonctions API)
npm run typecheck  # Vérification TypeScript
npm run build      # Build production
```

## 📂 Structure

```
rdza-test/
├── api/
│   └── ai.ts              # Vercel Function → Gemini API
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Shell avec tabs
│   ├── App.css            # Thème Odysséus sombre
│   ├── types.ts           # Types TS
│   └── components/
│       ├── ToolDashboard.tsx   # Badges RDZA
│       ├── FeedbackForm.tsx    # Formulaire feedback
│       ├── QAChecklist.tsx     # Checklist QA
│       └── AIAssistant.tsx     # Chat IA
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🔗 Liens

- [Odysséus — Projet principal](https://github.com/...) 
- [Vercel — Documentation](https://vercel.com/docs)
- [Gemini API — Gratuit (15 req/min)](https://ai.google.dev/gemini-api/docs)

---

*RDZA Test · v0.1.0 · Cockpit IA pour testeurs*
