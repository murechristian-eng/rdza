# 🏛️ RDZA — Analyse architecturale & pré-faisabilité

**RDZA** est un outil web interactif d'aide à la décision pour les architectes, urbanistes et porteurs de projet. Il croise les données publiques IGN (Institut National de l'Information Géographique et Forestière) pour produire une analyse rapide de pré-faisabilité d'un site.

🔗 **Version en ligne :** [rdza-test.vercel.app](https://rdza-test.vercel.app)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 📍 **Géocodage IGN** | Saisissez une adresse → obtention des coordonnées GPS |
| 🏛️ **Cadastre** | Identification de la parcelle, surface, géométrie |
| ⛰️ **Altimétrie** | Altitude via le RGE ALTI (modèle numérique de terrain) |
| 🗺️ **Zonage PLU** | Détection du zonage PLU via Apicarto |
| ⚠️ **Servitudes SUP** | Servitudes d'utilité publique (réseaux, monuments, etc.) |
| 📄 **Document PLU** | Lien vers le document d'urbanisme de la commune |
| 🛰️ **Carte interactive** | Calques IGN : Plan, Orthophoto, Cadastre |
| 📐 **Profil topographique** | Tracé d'un profil altimétrique sur la carte |
| ✏️ **Croquis d'emprise** | Dessin de l'emprise au sol avec calcul de surface |
| 🤖 **Assistant IA** | Analyse réglementaire assistée (Gemini / mode mocké) |
| 📊 **Fiche de synthèse** | Export PDF de l'analyse complète |

---

## 🚀 Démarrage rapide

```bash
# Prérequis : Node.js 18+
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173) dans le navigateur.

### Build production

```bash
npm run build    # → dist/
npm run preview  # prévisualisation locale
```

---

## 🏗️ Architecture

### Stack technique

- **Frontend :** React 19 + TypeScript + Vite
- **Carte :** Leaflet + IGN WMTS/WMS (gratuits, sans clé)
- **API :** Vercel Serverless Functions (4 endpoints)
- **IA :** Google Gemini 2.0 Flash (proxy serverless)

### API endpoints

| Endpoint | Source | Rôle |
|----------|--------|------|
| `/api/geocode` | IGN Geoportail | Adresse → lon/lat/ville |
| `/api/cadastre-alti` | IGN Apicarto + RGE ALTI | Parcelle, surface, altitude |
| `/api/urbanisme` | IGN Apicarto | PLU, SUP, document PLU |
| `/api/ai` | Google Gemini | Assistant IA |

### Flux de données

```
Adresse saisie
  → /api/geocode (lon, lat, ville)
  → /api/cadastre-alti (parcelle, surface, géométrie, altitude)
  → /api/urbanisme (zonage PLU, SUP, document PLU)
```

Chaque étape met à jour l'interface progressivement.

---

## 🔧 Configuration

### Variables d'environnement (Vercel)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Clé API Google Gemini (optionnelle, mode mocké sans) |

### Déploiement

```bash
npm run build
vercel --prod --yes
```

Le fichier `vercel.json` configure :
- SPA rewrites (tout → `index.html` sauf `/api/`)
- `maxDuration: 10s` par endpoint serverless

---

## 📡 Sources de données

Toutes les données proviennent d'API publiques gratuites de l'IGN :

- **Géocodage :** `data.geopf.fr/geocodage`
- **Cadastre :** `apicarto.ign.fr/api/cadastre/parcelle`
- **Altimétrie :** `data.geopf.fr/altimetrie` (RGE ALTI)
- **Plan IGN :** WMTS Plan IGN V2
- **Orthophoto :** WMTS Orthophotos
- **Urbanisme/PLU :** Apicarto Urbanisme
- **Servitudes :** Apicarto GPU

---

## 📜 Licence

Ce projet est en cours de licence — voir le fichier [LICENSE](LICENSE).

---

## 💬 Contribuer

Des suggestions ? Une idée d'amélioration ? Ouvre une discussion sur GitHub :

👉 [github.com/murechristian-eng/rdza/discussions](https://github.com/murechristian-eng/rdza/discussions)
