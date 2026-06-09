import { useState } from 'react'
import type { AppView, ToolStatus, FeedbackEntry, QAChecklistItem } from './types'
import { ToolDashboard } from './components/ToolDashboard'
import { FeedbackForm } from './components/FeedbackForm'
import { QAChecklist } from './components/QAChecklist'
import { AIAssistant } from './components/AIAssistant'

const initialTools: ToolStatus[] = [
  { id: 'python', name: 'Python', icon: '🐍', category: 'runtime', availability: 'available', notes: '3.12.2', fixSuggestion: 'winget install python' },
  { id: 'git', name: 'Git', icon: '🔀', category: 'system', availability: 'available', notes: 'branche main', fixSuggestion: 'winget install git.git' },
  { id: 'aider', name: 'Aider', icon: '🤖', category: 'agent', availability: 'degraded', notes: 'Version 0.75 — mettre à jour', fixSuggestion: 'pip install --upgrade aider-chat' },
  { id: 'codebuff', name: 'Codebuff', icon: '🦾', category: 'agent', availability: 'available', notes: 'Session active', fixSuggestion: 'npm install -g codebuff' },
  { id: 'miroflow', name: 'MiroFlow', icon: '🔀', category: 'framework', availability: 'unavailable', notes: 'Dossier introuvable', fixSuggestion: 'git clone https://github.com/.../MiroFlow' },
  { id: 'mneme', name: 'Mneme', icon: '🧠', category: 'memory', availability: 'available', notes: '4 sessions · 16 KB', fixSuggestion: 'Vérifier C:/Architeture/MEMORY/' },
  { id: 'terminal', name: 'Terminal', icon: '💻', category: 'system', availability: 'available', notes: 'PTY opérationnel', fixSuggestion: 'npm install node-pty' },
]

const initialChecklist: QAChecklistItem[] = [
  { id: 'c1', section: 'Dashboard', label: 'Les badges RDZA s’affichent correctement (✓ ⚠ ✗)', checked: false, comment: '' },
  { id: 'c2', section: 'Dashboard', label: 'Le statut global (Python, Git, outils) est visible', checked: false, comment: '' },
  { id: 'c3', section: 'Dashboard', label: 'Le compteur d’outils en bas de page est exact', checked: false, comment: '' },
  { id: 'c4', section: 'Navigation', label: 'La sidebar permet de naviguer entre toutes les vues', checked: false, comment: '' },
  { id: 'c5', section: 'Navigation', label: 'La TopBar affiche les badges de statut des outils', checked: false, comment: '' },
  { id: 'c6', section: 'Terminal', label: 'Le terminal xterm.js s’ouvre et accepte des commandes', checked: false, comment: '' },
  { id: 'c7', section: 'Terminal', label: 'Le resize du terminal fonctionne', checked: false, comment: '' },
  { id: 'c8', section: 'Mneme', label: 'La liste des sessions s’affiche', checked: false, comment: '' },
  { id: 'c9', section: 'Mneme', label: 'Le contenu d’une session est lisible', checked: false, comment: '' },
  { id: 'c10', section: 'MiroFlow', label: 'La détection MiroFlow fonctionne', checked: false, comment: '' },
  { id: 'c11', section: 'Cycle de vie', label: 'L’app se cache dans le tray (✕ → hide)', checked: false, comment: '' },
  { id: 'c12', section: 'Cycle de vie', label: 'Double-clic tray → l’app réapparaît', checked: false, comment: '' },
]

export default function App() {
  const [view, setView] = useState<AppView>('tools')
  const [tools, setTools] = useState<ToolStatus[]>(initialTools)
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([])
  const [checklist, setChecklist] = useState<QAChecklistItem[]>(initialChecklist)

  const tabs: { id: AppView; label: string; icon: string }[] = [
    { id: 'tools', label: 'Outils', icon: '🧩' },
    { id: 'feedback', label: 'Feedback', icon: '📝' },
    { id: 'checklist', label: 'Checklist QA', icon: '✅' },
    { id: 'ai', label: 'Assistant IA', icon: '🤖' },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1 className="topbar-title">🔴 RDZA Test — Odysséus</h1>
        <span className="topbar-version">v0.1.0 · Mode Test</span>
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
            {t.id === 'feedback' && feedbacks.length > 0 && (
              <span className="tab-badge">{feedbacks.length}</span>
            )}
          </button>
        ))}
      </nav>
      <main className="content-area">
        {view === 'tools' && (
          <ToolDashboard tools={tools} onUpdate={setTools} />
        )}
        {view === 'feedback' && (
          <FeedbackForm feedbacks={feedbacks} onAdd={(f) => setFeedbacks([...feedbacks, f])} />
        )}
        {view === 'checklist' && (
          <QAChecklist items={checklist} onUpdate={setChecklist} />
        )}
        {view === 'ai' && (
          <AIAssistant feedbacks={feedbacks} tools={tools} />
        )}
      </main>
      <footer className="footer">
        <span>RDZA Test — Cockpit IA</span>
        <span className="footer-sep">·</span>
        <span>🔧 {tools.filter(t => t.availability === 'available').length}/{tools.length} tools</span>
        <span className="footer-sep">·</span>
        <span>{new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
