# RDZA Test — Mémo de reprise

**Date :** 13 juin 2026
**Site :** https://rdza-test.vercel.app
**Vercel :** Projet `rdza-test` (prj_peki5aniNSmxXSNlxnnkfkQqE2Uq)
**GitHub :** https://github.com/murechristian-eng/rdza
**Obsidian :** `C:\Users\chris\Documents\OBSIDIAN\My Brain\_MEMORY\`

---

## Architecture actuelle

### API Vercel (5 endpoints serverless)

| Fichier | Rôle | Temps moyen |
|---------|------|-------------|
| `api/geocode.ts` | Géocodage IGN (adresse → lon/lat/ville) | ~2s |
| `api/cadastre-alti.ts` | Cadastre + altimétrie (lon/lat → parcelle, altitude) | ~5s |
| `api/urbanisme.ts` | PLU + SUP + Doc PLU (géométrie → zonage, servitudes) | ~3.5s |
| `api/ai.ts` | Assistant IA Gemini — historique conversationnel, retry 429 | ~2s |
| `api/telegram.ts` | **Bot Telegram** — webhook vers Gemini | ~2s |

### Frontend (React + Vite + Leaflet)

- `src/App.tsx` — Point d'entrée, navigation par onglets
- `src/components/RDZAForm.tsx` — Formulaire principal + carte Leaflet, orchestre 3 appels API
- `src/components/RDZASummary.tsx` — Fiche de synthèse imprimable
- `src/components/AIAssistant.tsx` — Chat IA avec historique conversationnel (useMemo/useCallback)
- `src/components/ai-mock.ts` — Réponses mockées extraites (fallback)
- `src/types.ts` — Types + constantes
- `src/App.css` — Design system dark

### Mémoire persistante

| Emplacement | Rôle |
|------------|------|
| `_MEMORY/INDEX.md` | Index du système de mémoire |
| `_MEMORY/PROJET.md` | État du projet, décisions, roadmap |
| `_MEMORY/CHANGELOG.md` | Journal des modifications |
| `_MEMORY/CONVERSATIONS.md` | Résumé des conversations |
| `MEMO.md` | Ce fichier — mémo de reprise technique |

### Flux de données

```
Adresse saisie
  → /api/geocode (lon, lat, ville)
  → /api/cadastre-alti (parcelle, surface, géométrie, altitude)
  → /api/urbanisme (zonage PLU, SUP, document PLU)

Telegram → /api/telegram → /api/ai → Gemini
```

Chaque étape met à jour l'UI progressivement.

---

## Configuration Vercel

- **Fichier :** `vercel.json`
  - SPA rewrites (tout → index.html sauf /api/)
  - `maxDuration: 10s` par endpoint
  - Build : `npm run build`, output : `dist`

### Variables d'environnement

| Nom | État |
|-----|------|
| `gemini` (minuscule) | ✅ Configurée (Production + Preview) |
| `GEMINI_API_KEY` | ✅ Configurée (fallback) |
| `TELEGRAM_BOT_TOKEN` | ❌ **À configurer** (créer le bot via @BotFather) |

---

## État actuel

### ✅ Fonctionnel
- Géocodage IGN : OK
- Cadastre : OK
- Altimétrie : OK
- SUP (servitudes) : OK
- Orthophoto WMS : OK
- Assistant IA (chat avec historique + retry) : OK
- Déploiement Vercel : OK
- GitHub push : OK
- Note Obsidian + _MEMORY/ : OK

### 🆕 Nouveautés
- **Bot Telegram** (`api/telegram.ts`) — webhook prêt, nécessite token BotFather
- **Mémoire persistante** — dossier `_MEMORY/` dans Obsidian, mise à jour automatique
- **Optimisations IA** — historique conversationnel, retry 429, memoïsation React

### ⚠️ Attention
- **Gemini :** Quota 429 (gratuit épuisé). Solution : nouvelle clé sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Telegram Bot :** En attente du token @BotFather pour activer le webhook
- **Zonage PLU :** null sur petites communes (Apicarto partiel)
- **Accessibilité :** ~8 warnings labels/id

---

## Commandes utiles

```bash
# Dev local
cd C:\Users\chris\rdza-test
npm run dev          # → localhost:5173

# Build + déploiement
npm run build
npx vercel --prod --yes

# Logs Vercel
npx vercel logs rdza-test.vercel.app

# Test API
curl -X POST https://rdza-test.vercel.app/api/geocode -H "Content-Type: application/json" -d '{"adresse":"10 rue de la paix lyon"}'
curl -X POST https://rdza-test.vercel.app/api/ai -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"test"}]}'

# Setup Telegram webhook (après déploiement)
# https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://rdza-test.vercel.app/api/telegram
```

---

## Prochaines étapes possibles

1. **Configurer Telegram Bot** — créer le bot via @BotFather, ajouter TELEGRAM_BOT_TOKEN dans Vercel
2. **Nouvelle clé Gemini** — créer une clé sur AI Studio pour débloquer l'IA
3. **Vercel KV** — pour une mémoire persistante du bot Telegram (au lieu de Map éphémère)
4. **Extraire les utilitaires** — `fetchWithTimeout` et `geoJsonToWkt` dupliqués dans 3 fichiers → `api/_utils.ts`
5. **Ajouter des labels/ID** — Corriger les warnings d'accessibilité
6. **Améliorer la couverture PLU** — Explorer d'autres sources

---

## Derniers commits

```
d317898 optimize: IA conversationnelle avec historique, retry 429, memoïsation, extraction mock
[commit suivant] feat: Telegram bot webhook + mémoire persistante _MEMORY/
[précédent] cleanup: supprimer api/rdza-data.ts
[précédent] fix: PLU Document timeout 3000 -> 5000ms
```
