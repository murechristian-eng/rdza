# 🤖 Freebuff — Intégration VS Code

> **Assistant IA de codage intégré directement dans VS Code pour le projet RDZA Test.**

---

## 🎯 Qu'est-ce que Freebuff ?

Freebuff (basé sur Codebuff) est un assistant IA en ligne de commande qui t'aide à **coder plus vite** :

- 🧠 **Compréhension du code** — Analyse ton projet et comprend le contexte
- ✍️ **Modifications intelligentes** — Édite les fichiers en respectant les conventions
- 🔍 **Recherche & diagnostic** — Explore le codebase et trouve les bugs
- 🚀 **Orchestration** — Lance des agents spécialisés (build, test, review) en parallèle

---

## ⌨️ Raccourcis VS Code

| Raccourci | Action |
|-----------|--------|
| `Ctrl+K Ctrl+L` | 🚀 **Lancer Freebuff** — Ouvre une session de codage assisté |
| `Ctrl+K Ctrl+B` | 📦 **Build Production** — Compile TypeScript + bundle Vite |
| `Ctrl+K Ctrl+T` | 🔍 **Typecheck** — Vérifie les types sans build complet |
| `Ctrl+K Ctrl+V` | 🖥️ **Dev Server** — Lance Vite en mode développement |

> **Note** : Ces raccourcis sont définis dans `.vscode/keybindings.json`.
> Si un raccourci entre en conflit avec un existant, VS Code t'en avertira.

---

## 🚀 Méthodes de lancement

### Méthode 1 — Via la palette de commandes (Ctrl+Shift+P)

1. Ouvre la palette : `Ctrl+Shift+P`
2. Tape : `Tasks: Run Task`
3. Choisis : `🚀 Lancer Freebuff`

### Méthode 2 — Via le raccourci clavier

Appuie sur `Ctrl+K Ctrl+L` (si configuré dans keybindings.json).

### Méthode 3 — Via le terminal intégré

```powershell
# Lancement simple
.\launch-freebuff.ps1

# Mode développement (Vite + Freebuff en parallèle)
.\launch-freebuff.ps1 -Dev

# Skip la vérification des prérequis
.\launch-freebuff.ps1 -SkipCheck
```

---

## 📋 Tâches VS Code disponibles

Toutes les tâches sont accessibles via `Ctrl+Shift+P` → `Tasks: Run Task` :

| Tâche | Description | Terminal |
|-------|-------------|----------|
| 🚀 **Lancer Freebuff** | Lance l'assistant IA de codage | Dédié |
| 📦 **Build Production** | Compile TS + bundle Vite → `dist/` | Partagé |
| 🔍 **Typecheck** | Vérifie les types TypeScript | Partagé |
| 🖥️ **Dev Server (Vite)** | Lance le serveur de développement | Dédié |
| 🌐 **Dev Server + API (Vercel)** | Vite + fonctions API Vercel | Dédié |
| 🚢 **Déployer sur Vercel** | Déploie en production sur Vercel | Dédié |
| 🧹 **Installer dépendances** | `npm install` | Partagé |

---

## ⚙️ Configuration VS Code

Le fichier `.vscode/settings.json` configure automatiquement :

- **Tabulation** : 2 espaces (standard React/TypeScript)
- **Police** : Cascadia Code avec ligatures (si installée)
- **Formatage** : Auto-organisation des imports à la sauvegarde
- **Terminal** : PowerShell par défaut, Cascadia Code, 13px
- **Thème** : Palette sombre assortie au thème Odysséus (`#1a1b26`)
- **TypeScript** : Utilise le tsdk local (`node_modules/typescript`)

### Extensions recommandées

Le fichier `.vscode/extensions.json` te suggérera d'installer :

| Extension | Pourquoi |
|-----------|----------|
| **Error Lens** | Affiche les erreurs en ligne, pas dans un panneau |
| **Todo Tree** | Surligne les `TODO`, `FIXME`, `HACK` dans le code |
| **GitLens** | Blame, historique, comparaison Git superposés |
| **Material Icon Theme** | Icônes de fichiers dans l'explorateur |

---

## 🛠️ Le script PowerShell `launch-freebuff.ps1`

Ce script fait plus que simplement lancer Freebuff :

```
✅ Vérification Node.js
✅ Vérification npm
✅ Vérification TypeScript
✅ Vérification node_modules (propose npm install si absent)
✅ Mode développement : Vite + Freebuff en parallèle
✅ Nettoyage automatique à la fin
```

### Options

| Flag | Effet |
|------|-------|
| `-Dev` | Lance Vite en arrière-plan avant Freebuff |
| `-SkipCheck` | Saute la vérification des prérequis |

---

## 📂 Fichiers créés

```
rdza-test/
├── .vscode/
│   ├── tasks.json          ← Tâches VS Code (7 tâches)
│   ├── settings.json       ← Configuration éditeur + TS
│   ├── keybindings.json    ← Raccourcis clavier
│   └── extensions.json     ← Extensions recommandées
├── launch-freebuff.ps1     ← Script PowerShell de lancement
└── README-Freebuff.md      ← Ce fichier
```

---

## 🔧 Personnalisation

Pour changer le raccourci Freebuff, modifie `.vscode/keybindings.json` :

```json
{
  "key": "ctrl+shift+espace",   // ← Change ce raccourci
  "command": "workbench.action.tasks.runTask",
  "args": "🚀 Lancer Freebuff"
}
```

Pour ajouter une nouvelle tâche, modifie `.vscode/tasks.json`.

---

## ❓ FAQ

**Freebuff ne se lance pas ?**
- Vérifie que Codebuff est installé : `npm list -g codebuff`
- Sinon : `npm install -g codebuff`

**Les raccourcis ne fonctionnent pas ?**
- Vérifie qu'ils ne sont pas en conflit avec d'autres extensions
- Ouvre `File > Preferences > Keyboard Shortcuts` et cherche `Lancer Freebuff`

**Le terminal PowerShell ne trouve pas npm ?**
- Redémarre VS Code après avoir installé Node.js
- Vérifie que Node.js est dans le PATH système

---

> *« Le bon outil ne remplace pas le bon développeur — il le rend 10x plus rapide. »*

---

*RDZA Test · Intégration Freebuff · 2026*
