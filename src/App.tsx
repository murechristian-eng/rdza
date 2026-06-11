import { useState } from 'react'
import type { AppView, RDZAProject } from './types'
import { RDZAForm } from './components/RDZAForm'
import { RDZASummary } from './components/RDZASummary'
import { AIAssistant } from './components/AIAssistant'

const emptyProject: RDZAProject = {
  adresseSite: '',
  intentionProjet: 'logement_collectif',
  parcelleCadastrale: '',
  surfaceTerrain: null,
  zonagePLU: 'U',
  topographiePente: 'plat',
  contexteUrbain: '',
  stationnementAccess: '',
  syntheseArchitecte: '',
  orthophotoUrl: undefined,
    pluDocumentUrl: undefined,
    pluDocumentType: undefined
}

export default function App() {
  const [view, setView] = useState<AppView>('form')
  const [project, setProject] = useState<RDZAProject>(emptyProject)

  const tabs: { id: AppView; label: string; icon: string }[] = [
    { id: 'form', label: 'Étude', icon: '📋' },
    { id: 'summary', label: 'Synthèse', icon: '📊' },
    { id: 'ai', label: 'Assistant IA', icon: '🤖' },
  ]

  const resetProject = () => setProject(emptyProject)

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1 className="topbar-title">🏛️ RDZA — Analyse architecturale & pré-faisabilité</h1>
        <span className="topbar-version">v1.0 · Méthode stabilisée</span>
      </header>
      <nav className="tab-bar">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${view === t.id ? 'active' : ''}`}
            onClick={() => setView(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="content-area">
        {view === 'form' && (
          <RDZAForm project={project} onChange={setProject} />
        )}
        {view === 'summary' && (
          <RDZASummary project={project} onReset={resetProject} />
        )}
        {view === 'ai' && (
          <AIAssistant project={project} />
        )}
      </main>
      <footer className="footer">
        <span>RDZA — Outil de pré-faisabilité architecturale</span>
        <span className="footer-sep">·</span>
        <span>{project.adresseSite || 'Aucune adresse saisie'}</span>
        <span className="footer-sep">·</span>
        <span>{new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
