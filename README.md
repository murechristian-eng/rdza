# 🏛️ RDZA — Analyse architecturale & pré-faisabilité

Assistant d'analyse architecturale pour les professionnels du bâtiment. Saisie, lecture contextualisée du territoire, et génération de fiche de synthèse.

## 🎯 Workflow

1. **📋 Saisie** — Adresse + intention de projet
2. **📐 Données** — Parcelle, surface, zonage PLU, topographie (V1 : saisie manuelle)
3. **🏗️ Lecture** — Contexte urbain, stationnement, potentiel, risques
4. **✍️ Synthèse** — Interprétation architecte
5. **🖨️ Export** — Fiche PDF imprimable

## 📋 Les 9 champs

| # | Champ | Type |
|---|-------|------|
| 1 | Adresse du site | Texte |
| 2 | Intention de projet | Choix multiple |
| 3 | Parcelle cadastrale | Texte |
| 4 | Surface terrain (m²) | Nombre |
| 5 | Zonage PLU | Choix multiple |
| 6 | Topographie / Pente | Choix multiple |
| 7 | Contexte urbain et typologies | Texte long |
| 8 | Stationnement et accessibilité | Texte long |
| 9 | Synthèse architecte RDZA | Texte long |

## 🚀 Déploiement Vercel

```bash
npm run build
npx vercel --prod
```

## 🛠️ Développement local

```bash
npm install
npm run dev
npm run typecheck
```

## 🤖 Assistant IA

Chatbot intégré spécialisé en analyse architecturale : zonage PLU, potentiel opérationnel, synthèse. Fonctionne en mode mocké par défaut. Ajouter `GEMINI_API_KEY` dans Vercel pour l'IA réelle.

## 🔮 Roadmap

- V1 ✅ Méthode stabilisée (saisie manuelle)
- V2 ⏳ Récupération automatique des données (APIs cadastre, IGN, Géoportail)
- V3 ⏳ Interprétation IA RDZA
- V4 ⏳ Génération automatique des dossiers PDF
- V5 ⏳ Mémoire de projets et intelligence contextuelle

---

*RDZA · Outil de pré-faisabilité architecturale · v1.0*
