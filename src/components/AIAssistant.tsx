import { useState, useRef, useEffect } from 'react'
import type { RDZAProject, ChatMessage } from '../types'
import { INTENTION_LABELS, ZONAGE_LABELS, TOPOGRAPHIE_LABELS } from '../types'

interface Props {
  project: RDZAProject
}

const SYSTEM_PROMPT = `Tu es RDZA, un assistant expert en analyse architecturale et pré-faisabilité pour les professionnels du bâtiment. Tu aides les architectes et promoteurs à analyser un site : zonage PLU, potentiel opérationnel, contraintes, insertion urbaine, risques, et stratégie de projet. Tu t'appuies sur les données du projet en cours. Sois concis, technique mais accessible. Donne des recommandations actionnables. Réponds en français.`

export function AIAssistant({ project }: Props) {
  const projectContext = `Projet RDZA en cours :
• Adresse : ${project.adresseSite || 'Non renseignée'}
• Intention : ${INTENTION_LABELS[project.intentionProjet]}
• Parcelle : ${project.parcelleCadastrale || 'Non renseignée'}
• Surface : ${project.surfaceTerrain ? project.surfaceTerrain + ' m²' : 'Non renseignée'}
• Zonage PLU : ${ZONAGE_LABELS[project.zonagePLU]}
• Topographie : ${TOPOGRAPHIE_LABELS[project.topographiePente]}
• Contexte urbain : ${project.contexteUrbain || '—'}
• Stationnement : ${project.stationnementAccess || '—'}
• Synthèse : ${project.syntheseArchitecte || '—'}`

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `👋 Bonjour, je suis l'assistant RDZA.\n\nJe peux vous aider à :\n• 📐 Interpréter le zonage PLU (contraintes, droits à construire)\n• 🏗️ Analyser le potentiel opérationnel du site\n• ⚠️ Identifier les risques et points de vigilance\n• 📝 Formuler une synthèse architecte\n• 💡 Proposer une stratégie de projet\n\nPosez-moi une question ou demandez-moi d'analyser le projet en cours.`,
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
          context: projectContext,
        }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      return data.text || "Désolé, je n'ai pas pu générer de réponse."
    } catch {
      return mockArchitecturalResponse(prompt, project)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    const reply = await callAI(text)
    const assistantMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: Date.now() }
    setMessages(prev => [...prev, assistantMsg])
    setLoading(false)
    inputRef.current?.focus()
  }

  const hasAdresse = project.adresseSite.trim().length > 0

  const quickActions = [
    {
      label: '📐 Analyser le zonage',
      prompt: `Analyse le zonage PLU de ce projet : ${ZONAGE_LABELS[project.zonagePLU]}. Quelles sont les contraintes, les droits à construire, et les points de vigilance ? Contexte : ${project.contexteUrbain || 'non renseigné'}. Surface : ${project.surfaceTerrain ? project.surfaceTerrain + 'm²' : 'non renseignée'}.`,
      disabled: !hasAdresse,
    },
    {
      label: '⚡ Potentiel opérationnel',
      prompt: `Évalue le potentiel opérationnel de ce terrain : ${project.surfaceTerrain ? project.surfaceTerrain + 'm²' : ''}, zonage ${ZONAGE_LABELS[project.zonagePLU]}, pente ${TOPOGRAPHIE_LABELS[project.topographiePente]}. Intention : ${INTENTION_LABELS[project.intentionProjet]}. Quelles sont les opportunités et les points de blocage ?`,
      disabled: !hasAdresse,
    },
    {
      label: '✍️ Rédiger une synthèse',
      prompt: `Rédige une synthèse architecte RDZA pour ce projet : Adresse ${project.adresseSite || '?'}. ${project.surfaceTerrain ? project.surfaceTerrain + 'm²' : ''}, zonage ${ZONAGE_LABELS[project.zonagePLU]}, ${INTENTION_LABELS[project.intentionProjet]}. Structure : cohérence urbaine, qualité d'insertion, potentiel caché, stratégie de projet.`,
      disabled: !hasAdresse,
    },
  ]

  return (
    <div className="chat-container">
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
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
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


function mockArchitecturalResponse(prompt: string, project: RDZAProject): string {
  const lower = prompt.toLowerCase()
  const z = project.zonagePLU
  const surf = project.surfaceTerrain
  const addr = project.adresseSite || 'Site'

  if (lower.includes('zonage') || lower.includes('plu')) {
    let analyse = 'Verifier le reglement de zone pour les contraintes specifiques.'
    if (z === 'U') analyse = 'Zone urbaine -- droits a construire generalement favorables. Verifier le reglement de zone pour les hauteurs, prospects et COS.'
    else if (z === 'AU') analyse = 'Zone a urbaniser -- soumise a procedure (modification/revision PLU). Verifier si la zone est ouverte a l urbanisation.'
    else if (z === 'A') analyse = 'Zone agricole -- constructibilite tres limitee. Verifier les exceptions (exploitation agricole, STECAL).'
    else if (z === 'N') analyse = 'Zone naturelle -- constructibilite quasi nulle sauf exceptions listees.'
    return 'Analyse du zonage ' + ZONAGE_LABELS[z] + ' :' + '\n\n' + analyse + '\n\nPoints de vigilance :\n- Consulter le reglement ecrit et graphique du PLU\n- Verifier les servitudes d utilite publique (SUP)\n- Verifier si un OAP (Orientation d Amenagement) s applique'
  }

  if (lower.includes('potentiel') || lower.includes('operationnel')) {
    let analyseSurf = 'Surface non renseignee.'
    if (surf && surf > 2000) analyseSurf = 'Grande emprise, potentiel de decoupage parcellaire ou operation d ensemble.'
    else if (surf && surf > 500) analyseSurf = 'Emprise moyenne, projet possible avec optimisation.'
    else if (surf) analyseSurf = 'Petite emprise, verifier les prospects et hauteurs.'
    return 'Potentiel operationnel -- ' + addr + ' :' + '\n\nSurface : ' + (surf ? surf + ' m2 -- ' + analyseSurf : analyseSurf) + '\n\nIntention ' + INTENTION_LABELS[project.intentionProjet] + ' sur zonage ' + ZONAGE_LABELS[z] + ' :\n- Verifier la compatibilite intention x zonage\n- Estimer le nombre de logements / m2 constructibles\n- Identifier les contraintes techniques (pente ' + TOPOGRAPHIE_LABELS[project.topographiePente] + ')\n\nPoints de blocage potentiels a verifier :\n- Servitudes d utilite publique\n- Risques naturels (inondation, cavites)\n- Prescriptions architecturales ou patrimoniales'
  }

  if (lower.includes('synthese') || lower.includes('rediger')) {
    return 'Projet de synthese architecte RDZA :\n\nSite : ' + (project.adresseSite || 'Adresse a renseigner') + '\nProgramme : ' + INTENTION_LABELS[project.intentionProjet] + '\nSurface terrain : ' + (surf ? surf + ' m2' : 'A renseigner') + '\nZonage : ' + ZONAGE_LABELS[z] + '\n\nCoherence urbaine : ' + (project.contexteUrbain ? 'Le projet s inscrit dans un contexte ' + project.contexteUrbain.slice(0, 100) + '...' : 'A evaluer sur site.') + '\n\nPotentiel : ' + (z === 'U' ? 'Favorable -- zone urbaine constructible.' : 'A verifier selon les contraintes de zonage.') + '\n\nPoints de vigilance :\n- ' + (project.topographiePente === 'fort' ? 'Pente forte -- etude geotechnique indispensable.' : 'Topographie compatible.') + '\n- Verifier les reseaux et servitudes.\n- Consulter le service urbanisme de la commune.'
  }

  return 'Je suis l assistant RDZA, expert en analyse architecturale et pre-faisabilite.\n\nPour ce projet (' + (project.adresseSite || 'adresse a renseigner') + '), je peux vous aider a :\n- Analyser le zonage PLU (dites analyse le zonage)\n- Evaluer le potentiel operationnel (dites potentiel)\n- Rediger une synthese architecte (dites synthese)\n- Repondre a toute question sur le projet\n\nRemplissez d abord les champs dans l onglet Etude pour une analyse plus precise.'
}
