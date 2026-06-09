import { useState, useRef, useEffect } from 'react'
import type { ToolStatus, FeedbackEntry, ChatMessage } from '../types'

interface Props {
  feedbacks: FeedbackEntry[]
  tools: ToolStatus[]
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de RDZA Test, la version de test du cockpit Odysséus (application Electron + React d'orchestration d'agents IA).

Tu aides les testeurs QA à :
- Comprendre les outils (Python, Git, Aider, Codebuff, MiroFlow, Mneme, Terminal)
- Analyser leurs feedbacks (catégoriser, prioriser, reformuler)
- Naviguer la checklist QA
- Diagnostiquer les états Rouge/Dégradé/Disponible

Sois concis, technique mais accessible. Réponds en français.`


export function AIAssistant({ feedbacks, tools }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `👋 Bienvenue dans l'assistant RDZA Test !\n\nJe peux vous aider à :\n• 📝 Analyser vos feedbacks (catégorie, priorité, reformulation)\n• 🧩 Comprendre les outils et leurs statuts\n• ✅ Naviguer la checklist QA\n• 🔍 Diagnostiquer les problèmes\n\nÉcrivez votre question ou collez un feedback à analyser.`,
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

  const callAI = async (prompt: string): Promise<string> => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          system: SYSTEM_PROMPT,
          context: `Outils actuels:\n${tools.map(t => `- ${t.icon} ${t.name}: ${t.availability} — ${t.notes}`).join('\n')}\n\nFeedbacks: ${feedbacks.length} soumis.`,
        }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      return data.text || 'Désolé, je n\'ai pas pu générer de réponse.'
    } catch (e: any) {
      console.error('AI error:', e)
      return `⚠️ L'assistant IA n'est pas disponible (l'API backend n'est pas encore déployée).\n\nEn production, cette réponse viendra d'une Vercel Function connectée à l'API Google Gemini.\n\nPour l'instant, voici une suggestion mockée :\n• Catégorie probable : bug\n• Priorité : medium\n• Action : vérifier le DashboardView et les statuts des outils.`
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Build the prompt with context about tools and feedbacks
    const contextPrompt = `Contexte :\n${tools.map(t => `- ${t.icon} ${t.name}: ${t.availability} — ${t.notes}`).join('\n')}\n\nFeedbacks soumis : ${feedbacks.length}\n\nQuestion/feedback du testeur : ${text}`

    const reply = await callAI(contextPrompt)
    const assistantMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
    setMessages(prev => [...prev, assistantMsg])
    setLoading(false)
    inputRef.current?.focus()
  }

  const quickActions = [
    {
      label: '📊 Statut global',
      prompt: `Analyse l'état global du système en fonction des outils suivants et donne un résumé RDZA (Rouge/Disponible/Zéro/Attention) :\n${tools.map(t => `- ${t.name}: ${t.availability} (${t.notes})`).join('\n')}`,
    },
    {
      label: '🔍 Analyser tout',
      prompt: `Analyse tous les feedbacks suivants et donne un résumé structuré (tendances, priorités, suggestions) :\n${feedbacks.map((fb, i) => `${i + 1}. [${fb.category}][${fb.severity}] ${fb.title} — ${fb.description}`).join('\n')}`,
    },
    {
      label: '🧹 Recommandations',
      prompt: `Voici l'état des outils Odysséus :\n${tools.map(t => `- ${t.name}: ${t.availability} (${t.notes})`).join('\n')}\n\nDonne 3 recommandations concrètes pour améliorer la stabilité du cockpit.`,
    },
  ]

  return (
    <div className="chat-container">
      <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {quickActions.map((qa, i) => (
          <button key={i} className="btn btn-ghost btn-sm" onClick={() => setInput(qa.prompt)}>
            {qa.label}
          </button>
        ))}
      </div>

      <div className="chat-messages" ref={containerRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            <small>{new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse-dot" /> Analyse en cours...
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
          placeholder="Pose une question ou colle un feedback..."
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
          ▶ Envoyer
        </button>
      </div>
    </div>
  )
}
