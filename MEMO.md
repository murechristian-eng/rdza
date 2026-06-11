# RDZA Test — Mémo de reprise

**Date :** 11 juin 2026
**Site :** https://rdza-test.vercel.app
**Vercel :** Projet `rdza-test` (prj_peki5aniNSmxXSNlxnnkfkQqE2Uq)

---

## Architecture actuelle

### API Vercel (4 endpoints serverless)

| Fichier | Rôle | Temps moyen |
|---------|------|-------------|
| `api/geocode.ts` | Géocodage IGN (adresse → lon/lat/ville) | ~2s |
| `api/cadastre-alti.ts` | Cadastre + altimétrie (lon/lat → parcelle, altitude) | ~5s |
| `api/urbanisme.ts` | PLU + SUP + Doc PLU (géométrie → zonage, servitudes) | ~3.5s |
| `api/ai.ts` | Assistant IA Gemini (proxy vers Gemini 2.0 Flash) | ~2s |

> L'ancien endpoint monolithique `api/rdza-data.ts` a été **supprimé** (commit `bac6e51`).

### Frontend (React + Vite + Leaflet)

- `src/App.tsx` — Point d'entrée
- `src/components/RDZAForm.tsx` — Formulaire principal, orchestre les 3 appels API en séquentiel
- `src/components/AIAssistant.tsx` — Onglet Assistant IA

### Flux de données

```
Adresse saisie
  → /api/geocode (lon, lat, ville)
  → /api/cadastre-alti (parcelle, surface, géométrie, altitude)
  → /api/urbanisme (zonage PLU, SUP, document PLU)
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
| `GEMINI_API_KEY` | ❌ Non configurée (le code lit `gemini` en fallback) |

> **Attention :** La clé Gemini est sous le nom `gemini` (minuscule), pas `GEMINI_API_KEY`. Le code lit les 3 variantes : `GEMINI_API_KEY || Gemini || gemini`.

---

## État actuel

### ✅ Fonctionnel
- Géocodage IGN : OK
- Cadastre : OK  
- Altimétrie : OK
- SUP (servitudes) : OK
- Orthophoto WMS : OK
- Assistant IA mock : OK
- Déploiement Vercel : OK

### ⚠️ Attention
- **Gemini :** La clé est lue mais retourne **429** (quota gratuit épuisé). Réessayer plus tard ou upgrader le plan Google AI.
- **Zonage PLU :** Souvent `null` pour les petites communes (couverture Apicarto partielle).
- **Accessibilité :** ~8 warnings (labels/ID manquants sur les champs) — pas bloquant.

---

## Commandes utiles

```bash
# Dev local
cd C:\Users\chris\rdza-test
npm run dev          # → localhost:5173

# Build + déploiement
npm run build
vercel --prod --yes

# Logs Vercel
vercel logs rdza-test.vercel.app

# Test API
curl -X POST https://rdza-test.vercel.app/api/geocode -H "Content-Type: application/json" -d '{"adresse":"10 rue de la paix lyon"}'
curl -X POST https://rdza-test.vercel.app/api/ai -H "Content-Type: application/json" -d '{"prompt":"test"}'
```

---

## Prochaines étapes possibles

1. **Extraire les utilitaires** — `fetchWithTimeout` et `geoJsonToWkt` sont dupliqués dans 3 fichiers → créer `api/_utils.ts`
2. **Gérer le 429 Gemini** — Ajouter un message spécifique "Quota épuisé, réessayez" + fallback auto mock
3. **Ajouter des labels/ID** — Corriger les warnings d'accessibilité dans `RDZAForm.tsx`
4. **Pousser vers remote** — `git push` (non fait)
5. **Améliorer la couverture PLU** — Explorer d'autres sources de données PLU

---

## Derniers commits

```
6f77917 fix: ai.ts lit aussi process.env.gemini (minuscule)
b67f7a3 fix: ai.ts lit aussi process.env.Gemini (capital)
bac6e51 cleanup: supprimer api/rdza-data.ts
b044d14 fix: PLU Document timeout 3000 -> 5000ms
cb1bc9a perf: SUP en parallele + timeouts 3000ms dans urbanisme
```
