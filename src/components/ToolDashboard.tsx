import type { ToolStatus } from '../types'

function availabilityLabel(a: ToolStatus['availability']): string {
  switch (a) {
    case 'available': return '✓ DISPO'
    case 'degraded': return '⚠ DÉGRADÉ'
    case 'unavailable': return '✗ ROUGE'
  }
}

function statCounts(tools: ToolStatus[]) {
  return {
    available: tools.filter(t => t.availability === 'available').length,
    degraded: tools.filter(t => t.availability === 'degraded').length,
    unavailable: tools.filter(t => t.availability === 'unavailable').length,
    total: tools.length,
  }
}

interface Props {
  tools: ToolStatus[]
  onUpdate: (tools: ToolStatus[]) => void
}

export function ToolDashboard({ tools, onUpdate }: Props) {
  const counts = statCounts(tools)

  const setAvailability = (id: string, a: ToolStatus['availability']) => {
    onUpdate(tools.map(t => t.id === id ? { ...t, availability: a } : t))
  }
  const setNotes = (id: string, notes: string) => {
    onUpdate(tools.map(t => t.id === id ? { ...t, notes } : t))
  }

  return (
    <div>
      <div className="stats-row">
        <div className="stat-pill available">🟢 {counts.available} dispo</div>
        <div className="stat-pill degraded">🟡 {counts.degraded} dégradé</div>
        <div className="stat-pill unavailable">🔴 {counts.unavailable} rouge</div>
      </div>

      <div className="tool-grid">
        {tools.map(tool => (
          <div key={tool.id} className="tool-card">
            <div className="tool-card-header">
              <div className="tool-card-name">
                <span className="tool-card-icon">{tool.icon}</span>
                {tool.name}
              </div>
              <select
                className={`badge badge-${tool.availability}`}
                value={tool.availability}
                onChange={(e) => setAvailability(tool.id, e.target.value as ToolStatus['availability'])}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <option value="available">✓ DISPO</option>
                <option value="degraded">⚠ DÉGRADÉ</option>
                <option value="unavailable">✗ ROUGE</option>
              </select>
            </div>
            <input
              type="text"
              value={tool.notes}
              onChange={(e) => setNotes(tool.id, e.target.value)}
              placeholder="Notes..."
            />
            {tool.availability !== 'available' && (
              <div style={{ marginTop: 8, fontSize: 'var(--font-size-sm)', color: 'var(--fg-muted)' }}>
                💡 {tool.fixSuggestion}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
