import { useMemo } from 'react'
import type { QAChecklistItem } from '../types'

interface Props {
  items: QAChecklistItem[]
  onUpdate: (items: QAChecklistItem[]) => void
}

export function QAChecklist({ items, onUpdate }: Props) {
  const sections = useMemo(() => {
    const map = new Map<string, QAChecklistItem[]>()
    items.forEach(i => {
      const existing = map.get(i.section) || []
      existing.push(i)
      map.set(i.section, existing)
    })
    return Array.from(map.entries())
  }, [items])

  const toggle = (id: string) => {
    onUpdate(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  const setComment = (id: string, comment: string) => {
    onUpdate(items.map(i => i.id === id ? { ...i, comment } : i))
  }

  const checkedCount = items.filter(i => i.checked).length
  const pct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0

  return (
    <div>
      <div className="stats-row">
        <div className="stat-pill available">✅ {checkedCount}/{items.length} validés</div>
        <div className="stat-pill degraded">📊 {pct}% complété</div>
      </div>

      {sections.map(([section, sectionItems]) => (
        <div key={section} className="checklist-section">
          <h3>{section}</h3>
          {sectionItems.map(item => (
            <div key={item.id} className="checklist-item">
              <div className="checklist-row">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggle(item.id)}
                />
                <span
                  className={`checklist-label ${item.checked ? 'checked' : ''}`}
                  onClick={() => toggle(item.id)}
                >
                  {item.label}
                </span>
              </div>
              <textarea
                className="checklist-comment"
                value={item.comment}
                onChange={(e) => setComment(item.id, e.target.value)}
                placeholder="Commentaire optionnel..."
                rows={2}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
