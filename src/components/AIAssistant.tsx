import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import type { RDZAProject, ChatMessage } from '../types'
import { INTENTION_LABELS, ZONAGE_LABELS, TOPOGRAPHIE_LABELS } from '../types'
import { mockArchitecturalResponse } from './ai-mock'

interface Props {
  project: RDZAProject
}

// ─── SYSTEM PROMPT V3 — concis et efficace ───
const SYSTEM_PROMPT = `Tu es RDZA, co-pilote architectural expert en pré-faisabilité. Tu travailles AVEC l'architecte.

STRUCTURE OBLIGATOIRE :
[INTERPRÉTATION] — analyse concise
[SOURCE] — référence précise (article du Code de l'urbanisme, règle PLU, donnée IGN). Si incertain : "[SOURCE] ⚠️ Avis indicatif — à vérifier avec le service urbanisme."
[CONFIANCE] — 🟢 Élevée (>80%) | 🟡 Modérée (50-80%) | 🔴 Faible (<50%)

RÈGLES :
• Ne JAMAIS inventer un article du PLU. Oriente vers le Géoportail de l'Urbanisme si besoin.
• Cite les données du projet (surface, zonage, altitude, etc.).
• Sois concis, technique, actionnable. Réponds en français.`

// ─── Parsing de la réponse structurée ───
interface ParsedResponse {
  interpretation: string
  source: string
  confidence: string
  confidenceLevel: 'high' | 'medium' | 'low'
}

function parseStructuredResponse(text: string): ParsedResponse | null {
  const interpMatch = text.match(/\[INTERPRÉTATION\]\s*([\s\S]*?)(?=\[SOURCE\]|$)/i)
  const sourceMatch = text.match(/\[SOURCE\]\s*([\s\S]*?)(?=\[CONFIANCE\]|$)/i)
  const confMatch = text.match(/\[CONFIANCE\]\s*([\s\S]*?)$/i)

  if (!interpMatch || !sourceMatch || !confMatch) return null

  const confidence = confMatch[1].trim()
  let confidenceLevel: 'high' | 'medium' | 'low' = 'medium'
  if (confidence.includes('Élevée') || confidence.includes('>80%') || confidence.includes('🟢')) confidenceLevel = 'high'
  else if (confidence.includes('Faible') || confidence.includes('<50%') || confidence.includes('🔴')) confidenceLevel = 'low'

  return {
    interpretation: interpMatch[1].trim(),
    source: sourceMatch[1].trim(),
    confidence: confidence.replace(/^(🟢|🟡|🔴)\s*(Élevée|Modérée|Faible)/, '$1 $2'),
    confidenceLevel,
  }
}

export function AIAssistant({ project }: Props) {
  const projectContext = useMemo(() => {
    const lines = [
      `Projet RDZA en cours :`,
      `• Adresse : ${project.adresseSite || 'Non renseignée'}`,
      `• Intention : ${INTENTION_LABELS[project.intentionProjet]}`,
      `• Parcelle : ${project.parcelleCadastrale || 'Non renseignée'}`,
      `• Surface : ${project.surfaceTerrain ? project.surfaceTerrain + ' m²' : 'Non renseignée'}`,
      `• Zonage PLU : ${ZONAGE_LABELS[project.zonagePLU]}`,
      `• Topographie : ${TOPOGRAPHIE_LABELS[project.topographiePente]}`,
    ]
    if (project.contexteUrbain) lines.push(`• Contexte urbain : ${project.contexteUrbain}`)
    if (project.stationnementAccess) lines.push(`• Stationnement : ${project.stationnementAccess}`)
    if (project.pluDocumentUrl) lines.push(`• Document PLU : ${project.pluDocumentType || 'PLU'} (${project.pluDocumentUrl})`)
    return lines.join('\n')
  }, [project.adresseSite, project.intentionProjet, project.parcelleCadastrale, project.surfaceTerrain, project.zonagePLU, project.topographiePente, project.contexteUrbain, project.stationnementAccess, project.pluDocumentUrl, project.pluDocumentType])

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `👋 Bonjour, je suis RDZA, votre co-pilote architectural.

🔍 **Transparence garantie** : chaque analyse cite ses sources et son niveau de confiance.

Je peux vous aider à :
• 📐 **Analyser le zonage PLU** — droits, contraintes, articles clés
• 🏗️ **Évaluer le potentiel opérationnel** — constructibilité, optimisation
• ⚠️ **Identifier les risques** — servitudes, règles spécifiques, points de blocage
• ✍️ **Rédiger une synthèse** — structurée, argumentée, sourceée
• 💡 **Proposer une stratégie** — adaptée au contexte réglementaire

**Posez-moi une question.**`,
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const callAI = useCallback(async (msgs: ChatMessage[]): Promise<string> => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs,
          system: SYSTEM_PROMPT,
          context: projectContext,
        }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      return data.text || "Désolé, je n'ai pas pu générer de réponse."
    } catch {
      const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user')
      return mockArchitecturalResponse(lastUserMsg?.content || 'question générale', project)
    }
  }, [projectContext, project])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    const reply = await callAI(newMessages)
    const assistantMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
    setMessages(prev => [...prev, assistantMsg])
    setLoading(false)
    inputRef.current?.focus()
  }

  const hasAdresse = project.adresseSite.trim().length > 0

  const quickActions = useMemo(() => [
    {
      label: '📐 Analyser le zonage',
      prompt: `Analyse le zonage PLU de ce projet : ${ZONAGE_LABELS[project.zonagePLU]}. Surface : ${project.surfaceTerrain ? project.surfaceTerrain + 'm²' : 'non renseignée'}. Cite les articles types du code de l'urbanisme applicables. Format requis : [INTERPRÉTATION] + [SOURCE] + [CONFIANCE].`,
      disabled: !hasAdresse,
    },
    {
      label: '⚡ Potentiel opérationnel',
      prompt: `Évalue le potentiel opérationnel : ${project.surfaceTerrain ? project.surfaceTerrain + 'm²' : ''}, zonage ${ZONAGE_LABELS[project.zonagePLU]}, pente ${TOPOGRAPHIE_LABELS[project.topographiePente]}, intention ${INTENTION_LABELS[project.intentionProjet]}. Format requis : [INTERPRÉTATION] + [SOURCE] + [CONFIANCE].`,
      disabled: !hasAdresse,
    },
    {
      label: '✍️ Synthèse architecte',
      prompt: `Rédige une synthèse architecte RDZA pour ce projet : ${project.adresseSite || '?'}, ${project.surfaceTerrain ? project.surfaceTerrain + 'm²' : ''}, zonage ${ZONAGE_LABELS[project.zonagePLU]}. Structure ta réponse en [INTERPRÉTATION] + [SOURCE] + [CONFIANCE].`,
      disabled: !hasAdresse,
    },
  ], [project.zonagePLU, project.surfaceTerrain, project.topographiePente, project.intentionProjet, project.adresseSite, hasAdresse])

  const confidenceBadge = (level: 'high' | 'medium' | 'low') => {
    const config = {
      high: { bg: 'rgba(63,185,80,0.15)', border: '#3FB950', text: '#3FB950', emoji: '🟢', label: 'Élevée' },
      medium: { bg: 'rgba(210,168,255,0.15)', border: '#D2A8FF', text: '#D2A8FF', emoji: '🟡', label: 'Modérée' },
      low: { bg: 'rgba(248,81,73,0.15)', border: '#F85149', text: '#F85149', emoji: '🔴', label: 'Faible' },
    }
    const c = config[level]
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;background:${c.bg};color:${c.text};border:1px solid ${c.border};margin-left:6px;">${c.emoji} ${c.label}</span>`
  }

  const renderMessageContent = (content: string) => {
    const parsed = parseStructuredResponse(content)
    if (!parsed) {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
    }
    return (
      <div className="ai-structured-response">
        <div className="ai-section ai-interpretation">
          <div className="ai-section-header">📝 Interprétation</div>
          <div className="ai-section-body">{parsed.interpretation}</div>
        </div>
        <div className="ai-section ai-source">
          <div className="ai-section-header">📚 Source{parsed.source.startsWith('⚠️') ? ' (indicative)' : ''}</div>
          <div className="ai-section-body">{parsed.source}</div>
        </div>
        <div className="ai-section ai-confidence">
          <div className="ai-section-header">
            🎯 Niveau de confiance
            <span
              className="confidence-badge"
              data-level={parsed.confidenceLevel}
              dangerouslySetInnerHTML={{ __html: confidenceBadge(parsed.confidenceLevel) }}
            />
          </div>
          <div className="ai-section-body">{parsed.confidence}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      <div className="transparency-banner">
        <span className="transparency-icon">🔍</span>
        <span><strong>Transparence radicale</strong> — Chaque analyse cite ses sources et son niveau de confiance</span>
      </div>

      <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {quickActions.map((qa, i) => (
          <button key={i} className="btn btn-ghost btn-sm" onClick={() => setInput(qa.prompt)} disabled={qa.disabled}>
            {qa.label}
          </button>
        ))}
        {!hasAdresse && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--fg-muted)', alignSelf: 'center' }}>
            ⚠️ Saisis l'adresse dans l'onglet Étude pour activer l'analyse
          </span>
        )}
      </div>

      <div className="chat-messages" ref={containerRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            {msg.role === 'assistant' && i > 0
              ? renderMessageContent(msg.content)
              : <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            }
            <small>{new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse-dot" /> Analyse architecturale en cours...
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Pose une question sur le projet en cours..."
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
          ▶
        </button>
      </div>
    </div>
  )
}

