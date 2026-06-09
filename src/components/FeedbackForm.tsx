import { useState } from 'react'
import type { FeedbackEntry } from '../types'

interface Props {
  feedbacks: FeedbackEntry[]
  onAdd: (f: FeedbackEntry) => void
}

export function FeedbackForm({ feedbacks, onAdd }: Props) {
  const [category, setCategory] = useState<FeedbackEntry['category']>('bug')
  const [severity, setSeverity] = useState<FeedbackEntry['severity']>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      category,
      severity,
      title: title.trim(),
      description: description.trim(),
      steps: steps.trim(),
      timestamp: Date.now(),
    })
    setTitle('')
    setDescription('')
    setSteps('')
  }

  return (
    <div>
      <div className="section">
        <h2 className="section-title">📝 Nouveau feedback</h2>
        <div className="form-card">
          <div className="form-grid">
            <div className="form-group">
              <label>Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as FeedbackEntry['category'])}>
                <option value="bug">🐛 Bug</option>
                <option value="feature">✨ Feature request</option>
                <option value="improvement">🔧 Amélioration</option>
                <option value="question">❓ Question</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sévérité</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as FeedbackEntry['severity'])}>
                <option value="critical">🔴 Critique</option>
                <option value="high">🟠 Haute</option>
                <option value="medium">🟡 Moyenne</option>
                <option value="low">🟢 Basse</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Titre</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Résumé en une phrase..." />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décris le problème ou la suggestion..." style={{ minHeight: 80 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Étapes pour reproduire</label>
            <textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="1. Aller sur...\n2. Cliquer sur...\n3. Constater..." style={{ minHeight: 60 }} />
          </div>
          <button className="btn btn-primary" onClick={handleSubmit}>
            📤 Soumettre le feedback
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">📋 Feedbacks soumis ({feedbacks.length})</h2>
        {feedbacks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p>Aucun feedback pour le moment. Soumets le premier !</p>
          </div>
        ) : (
          feedbacks.map(fb => (
            <div key={fb.id} className="feedback-entry">
              <div className="feedback-entry-header">
                <span className="feedback-entry-title">{fb.title}</span>
                <div className="feedback-entry-meta">
                  <span className={`tag tag-${fb.category}`}>{fb.category}</span>
                  <span className={`tag tag-${fb.severity}`}>{fb.severity}</span>
                </div>
              </div>
              {fb.description && <p>{fb.description}</p>}
              {fb.steps && <p style={{ whiteSpace: 'pre-wrap' }}>📋 {fb.steps}</p>}
              {fb.aiCategory && (
                <div className="ai-suggestion">
                  <div className="ai-suggestion-label">🤖 Suggestion IA</div>
                  {fb.aiCategory && <p>Catégorie suggérée : <span className={`tag tag-${fb.aiCategory}`}>{fb.aiCategory}</span></p>}
                  {fb.aiPriority && <p>Priorité : <span className={`tag tag-${fb.aiPriority}`}>{fb.aiPriority}</span></p>}
                  {fb.aiReformulation && <p style={{ marginTop: 4 }}>« {fb.aiReformulation} »</p>}
                </div>
              )}
              <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: 6 }}>
                {new Date(fb.timestamp).toLocaleString('fr-FR')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
