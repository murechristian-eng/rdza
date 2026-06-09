<#
.SYNOPSIS
    🚀 Lance Freebuff pour le projet RDZA Test.
.DESCRIPTION
    Script de lancement professionnel pour Freebuff (Codebuff).
    Configure l'environnement, vérifie les prérequis, et lance la session.
.NOTES
    Projet : RDZA Test — Odysséus
    Auteur : Chris
    Version : 1.0.0
.EXAMPLE
    ./launch-freebuff.ps1
    Lance Freebuff avec la configuration par défaut.
.EXAMPLE
    ./launch-freebuff.ps1 -Dev
    Lance en mode développement avec le serveur Vite en arrière-plan.
#>

param(
    [switch]$Dev = $false,
    [switch]$SkipCheck = $false
)

# ═══════════════════════════════════════════
# 🎨 Configuration
# ═══════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$Banner = @"

    ╔══════════════════════════════════════════╗
    ║   🔴  RDZA TEST — Freebuff Launcher   ║
    ║   Cockpit IA · Odysséus Suite          ║
    ╚══════════════════════════════════════════╝

"@

Write-Host $Banner -ForegroundColor Cyan

# ═══════════════════════════════════════════
# ✅ Vérification des prérequis
# ═══════════════════════════════════════════

if (-not $SkipCheck) {
    Write-Host "📋 Vérification des prérequis..." -ForegroundColor Gray
    Write-Host ""

    # Node.js
    try {
        $nodeVersion = (node --version 2>&1)
        Write-Host "   ✅ Node.js   : $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Node.js   : Non trouvé — https://nodejs.org" -ForegroundColor Red
        exit 1
    }

    # npm
    try {
        $npmVersion = (npm --version 2>&1)
        Write-Host "   ✅ npm       : v$npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ npm       : Non trouvé" -ForegroundColor Red
        exit 1
    }

    # TypeScript (local, pas de téléchargement npx)
    $tscPath = "$ProjectRoot\node_modules\.bin\tsc.cmd"
    if (Test-Path $tscPath) {
        try {
            $tscVersion = (& $tscPath --version 2>&1)
            Write-Host "   ✅ TypeScript: $tscVersion (local)" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  TypeScript: Erreur de version" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  TypeScript: Non trouvé (npm install requis)" -ForegroundColor Yellow
    }

    # node_modules
    if (Test-Path "$ProjectRoot\node_modules") {
        Write-Host "   ✅ node_modules : Présent" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  node_modules : Absent — Exécute 'npm install' d'abord" -ForegroundColor Yellow
        Write-Host ""
        $response = Read-Host "   Lancer npm install ? (o/N)"
        if ($response -eq 'o' -or $response -eq 'O') {
            Write-Host ""
            Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
            npm install
        } else {
            Write-Host "❌ Abandon — node_modules requis." -ForegroundColor Red
            exit 1
        }
    }

    # Codebuff / Freebuff
    Write-Host ""
    $codebuffFound = $false
    if (Get-Command codebuff -ErrorAction SilentlyContinue) {
        Write-Host "   ✅ Freebuff   : Trouvé (global)" -ForegroundColor Green
        $codebuffFound = $true
    } elseif (Test-Path "$ProjectRoot\node_modules\.bin\codebuff.cmd") {
        Write-Host "   ✅ Freebuff   : Trouvé (local)" -ForegroundColor Green
        $codebuffFound = $true
    } else {
        Write-Host "   ⚠️  Freebuff   : Non trouvé — 'npm install -g codebuff' requis" -ForegroundColor Yellow
    }

    Write-Host ""
    if ($codebuffFound) {
        Write-Host "   ✅ Tous les prérequis sont satisfaits." -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Lancement possible mais Freebuff risque de ne pas fonctionner." -ForegroundColor Yellow
    }
    Write-Host ""
}

# ═══════════════════════════════════════════
# 🚀 Lancement
# ═══════════════════════════════════════════

if ($Dev) {
    Write-Host "🖥️  Mode Développement : Vite dev server + Freebuff" -ForegroundColor Cyan
    Write-Host ""

    # Lancer Vite en arrière-plan (Start-Job fonctionne sur Windows PowerShell 5.1)
    $viteJob = Start-Job -ScriptBlock {
        Set-Location $using:ProjectRoot
        npm run dev 2>&1
    }

    Write-Host "   Vite dev server lancé (Job ID: $($viteJob.Id))" -ForegroundColor Gray
    Start-Sleep -Seconds 3
    Write-Host "   ➜  http://localhost:5173" -ForegroundColor Magenta
    Write-Host ""
}

Write-Host "🤖 Lancement de Freebuff..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Lancer Freebuff avec fallback intelligent
try {
    if (Get-Command codebuff -ErrorAction SilentlyContinue) {
        codebuff
    } elseif (Test-Path "$ProjectRoot\node_modules\.bin\codebuff.cmd") {
        & "$ProjectRoot\node_modules\.bin\codebuff.cmd"
    } else {
        Write-Host "⚠️  Freebuff non trouvé. Tentative via npx..." -ForegroundColor Yellow
        npx codebuff
    }
} catch {
    Write-Host ""
    Write-Host "⚠️  Freebuff n'a pas pu être lancé." -ForegroundColor Yellow
    Write-Host "   Vérifie que Freebuff est installé :" -ForegroundColor Gray
    Write-Host "   npm install -g codebuff" -ForegroundColor Gray
    Write-Host "   ou" -ForegroundColor Gray
    Write-Host "   npm install --save-dev codebuff" -ForegroundColor Gray
}

# Nettoyage
if ($Dev -and $viteJob) {
    Write-Host ""
    Write-Host "🛑 Arrêt du serveur Vite..." -ForegroundColor Yellow
    Stop-Job -Job $viteJob
    Remove-Job -Job $viteJob
}

Write-Host ""
Write-Host "✅ Session Freebuff terminée." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor DarkGray
