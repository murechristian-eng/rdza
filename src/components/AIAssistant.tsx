import { useState, useRef, useEffect } from 'react'
import type { RDZAProject, ChatMessage } from '../types'
import { INTENTION_LABELS, ZONAGE_LABELS, TOPOGRAPHIE_LABELS } from '../types'

interface Props {
  project: RDZAProject
}

// ─── SYSTEM PROMPT V3 : Transparence radicale ───
const SYSTEM_PROMPT = `Tu es RDZA, co-pilote architectural expert en pré-faisabilité. Tu travailles AVEC l'architecte, pas à sa place.

RÈGLES IMPÉRATIVES :
1. Structure TOUJOURS ta réponse en 3 blocs :
   [INTERPRÉTATION] — ton analyse concise du sujet
   [SOURCE] — la référence exacte qui fonde ton avis (article du Code de l'urbanisme, règle PLU, donnée IGN, principe architectural établi). Si tu n'as pas de source précise, écris "[SOURCE] ⚠️ Avis indicatif — à vérifier avec le service urbanisme."
   [CONFIANCE] — un niveau de confiance parmi : 🟢 Élevée (>80%) | 🟡 Modérée (50-80%) (précise pourquoi) | 🔴 Faible (<50%) (précise pourquoi)

2. Ne JAMAIS inventer un article du PLU. Si tu ne connais pas le règlement exact de la commune, dis-le clairement et oriente vers le Géoportail de l'Urbanisme.

3. Cite les données du projet quand elles sont disponibles (surface, zonage, altitude, etc.).

4. Sois concis, technique, actionnable. Réponds en français.

Tu es un expert en : zonage PLU, droit à construire, potentiel opérationnel, insertion urbaine, contraintes techniques, risques, et stratégie de projet.`

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
  const pluInfo = project.pluDocumentUrl 
    ? `
• Document PLU : ${project.pluDocumentType || 'PLU'} (${project.pluDocumentUrl})`
    : ''

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

  const callAI = async (prompt: string): Promise<string> => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          system: SYSTEM_PROMPT,
          context: projectContext,
          pluContext: pluInfo.trim() || undefined,
          pluDocumentUrl: project.pluDocumentUrl || undefined,
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
  ]

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


// ─── Mock architectural responses V3 — Format structuré ───
function mockArchitecturalResponse(prompt: string, project: RDZAProject): string {
  const lower = prompt.toLowerCase()
  const z = project.zonagePLU
  const surf = project.surfaceTerrain
  const zLabel = ZONAGE_LABELS[z]
  const addr = project.adresseSite || 'Site'

  if (lower.includes('zonage') || lower.includes('plu')) {
    let analyse = ''
    let source = ''
    if (z === 'U') {
      analyse = 'Zone urbaine — droits à construire généralement favorables. Vérifier le règlement de zone pour les hauteurs maximales (articles R.111-17 et suivants du Code de l\'urbanisme), les prospects, et le COS/emprise au sol.'
      source = 'Code de l\'urbanisme — articles R.111-1 à R.111-53 (règles générales d\'urbanisme). ⚠️ Le règlement spécifique de la commune doit être consulté sur le Géoportail de l\'Urbanisme (geoportail-urbanisme.gouv.fr).'
    } else if (z === 'UH') {
      analyse = 'Zone urbaine à dominante habitat — constructibilité favorable pour du logement. Vérifier les hauteurs (souvent R+2 à R+4 en UH), les retraits par rapport aux limites séparatives, et les obligations de stationnement.'
      source = 'Code de l\'urbanisme — articles R.111-17 (hauteur) et R.111-19 (prospects). ⚠️ Consulter le règlement de zone UH du PLU communal sur le Géoportail de l\'Urbanisme.'
    } else if (z === 'AU') {
      analyse = 'Zone à urbaniser — soumise à procédure (modification/révision PLU ou projet urbain partenarial). Vérifier si la zone est ouverte à l\'urbanisation (AU « ouverte » ou « fermée »). Les droits à construire dépendent de l\'OAP (Orientation d\'Aménagement et de Programmation).'
      source = 'Code de l\'urbanisme — articles L.151-1 et suivants (PLU) et L.151-6 (OAP). ⚠️ Vérifier le statut exact de la zone AU auprès du service urbanisme communal.'
    } else if (z === 'A') {
      analyse = 'Zone agricole — constructibilité très limitée, réservée aux exploitations agricoles et aux STECAL (Secteurs de Taille Et de Capacité d\'Accueil Limitées).'
      source = 'Code de l\'urbanisme — article L.151-11 (zone A) et L.151-13 (STECAL). ⚠️ Toute construction non agricole nécessite une dérogation ou une modification du PLU.'
    } else if (z === 'N') {
      analyse = 'Zone naturelle — constructibilité quasi nulle, sauf exceptions listées au règlement (équipements publics, aménagements légers).'
      source = 'Code de l\'urbanisme — article L.151-12 (zone N). ⚠️ Toute construction est soumise à une justification stricte de son intégration environnementale.'
    } else {
      analyse = 'Vérifier le règlement de zone pour les contraintes spécifiques. Consulter le PLU communal pour les règles de hauteur, prospect, emprise au sol et stationnement.'
      source = '⚠️ Avis indicatif — consulter le service urbanisme de la commune et le Géoportail de l\'Urbanisme pour le règlement exact.'
    }

    return `[INTERPRÉTATION]
${analyse}

Points de vigilance complémentaires :
• Vérifier les servitudes d\'utilité publique (SUP) applicables
• Consulter le règlement écrit ET graphique du PLU
• Vérifier si une OAP s\'applique sur le secteur
• Contrôler les risques naturels (PPRI, cavités) sur Géorisques (georisques.gouv.fr)

[SOURCE]
${source}

[CONFIANCE]
🟡 Modérée (50-80%) — L\'analyse s\'appuie sur les principes généraux du Code de l\'urbanisme (${zLabel}). Le règlement spécifique du PLU communal peut contenir des dispositions particulières. Consulter le document d\'urbanisme officiel pour confirmer.`
  }

  if (lower.includes('potentiel') || lower.includes('opérationnel')) {
    let analyseSurf = 'Surface non renseignée.'
    if (surf && surf > 2000) analyseSurf = 'Grande emprise (>2000 m²) — potentiel de découpage parcellaire ou opération d\'ensemble. Permet des programmes mixtes ou plusieurs bâtiments.'
    else if (surf && surf > 500) analyseSurf = 'Emprise moyenne (500-2000 m²) — projet possible avec optimisation de l\'implantation. Vérifier les prospects pour maximiser la constructibilité.'
    else if (surf) analyseSurf = 'Petite emprise (<500 m²) — vérifier les prospects minimums et les hauteurs autorisées. Optimiser l\'implantation au plus près des limites autorisées.'

    return `[INTERPRÉTATION]
${analyseSurf}

Croisement réglementaire :
• Intention : ${INTENTION_LABELS[project.intentionProjet]}
• Zonage : ${zLabel}
• Topographie : ${TOPOGRAPHIE_LABELS[project.topographiePente]}
• Surface : ${surf ? surf + ' m²' : 'Non renseignée'}

Compatibilité intention × zonage : ${z === 'U' || z === 'UH' || z === 'UC' ? '✅ Favorable — le zonage urbain permet ce type de programme.' : z === 'AU' ? '🟡 Conditionnelle — vérifier l\'ouverture à l\'urbanisation.' : '🔴 Défavorable — le zonage limite fortement ce type de programme.'}

Points de blocage potentiels :
• Servitudes d\'utilité publique (réseaux, monuments historiques, etc.)
• Risques naturels (inondation, retrait-gonflement des argiles, cavités)
• Prescriptions architecturales ou patrimoniales (ABF, site inscrit/classé)
• ${project.topographiePente === 'fort' ? '🔴 Pente forte : étude géotechnique recommandée, surcoût fondations.' : '🟢 Topographie compatible.'}

[SOURCE]
Code de l\'urbanisme — articles L.151-1 et suivants (PLU/Zonage). Guide de la constructibilité — Ministère de la Transition Écologique. ⚠️ Analyse indicative — le règlement communal prime.

[CONFIANCE]
🟡 Modérée (50-80%) — L\'analyse croise les données disponibles (surface, zonage, topographie) mais le potentiel réel dépend du règlement de zone spécifique et des servitudes locales.`
  }

  if (lower.includes('synthèse') || lower.includes('rédiger')) {
    return `[INTERPRÉTATION]
Projet de synthèse architecte RDZA pour le site ${addr}.

Programme : ${INTENTION_LABELS[project.intentionProjet]}
Surface terrain : ${surf ? surf + ' m²' : 'À renseigner'}
Zonage : ${zLabel}
Topographie : ${TOPOGRAPHIE_LABELS[project.topographiePente]}

Cohérence urbaine : ${project.contexteUrbain
  ? 'Le projet s\'inscrit dans un contexte ' + project.contexteUrbain.slice(0, 120) + '...'
  : 'À évaluer sur site (relevé du bâti environnant, hauteurs, gabarits, matériaux).'}

Potentiel : ${z === 'U' || z === 'UH' || z === 'UC'
  ? '✅ Favorable — zone urbaine constructible. Vérifier les règles de hauteur et prospects pour optimiser l\'emprise.'
  : '🟡 À vérifier selon les contraintes de zonage et le règlement communal.'}

Stratégie proposée :
1. Consulter le règlement écrit et graphique du PLU
2. Réaliser un relevé topographique précis si pente > 5%
3. Vérifier les servitudes (SUP) et réseaux (DT-DICT obligatoire)
4. Étudier l\'insertion dans le gabarit urbain environnant

[SOURCE]
Méthode RDZA — Analyse architecturale standardisée. ⚠️ La synthèse définitive nécessite une visite de site et la consultation des documents d\'urbanisme officiels.

[CONFIANCE]
🟡 Modérée (50-80%) — Synthèse basée sur les données disponibles. La visite de site et la consultation du PLU communal sont indispensables pour finaliser l\'analyse.`
  }

  return `[INTERPRÉTATION]
Je suis RDZA, votre co-pilote architectural. Pour le site « ${addr} », je suis prêt à vous assister sur :
• L\'analyse du zonage PLU et des droits à construire
• L\'évaluation du potentiel opérationnel
• La rédaction d\'une synthèse architecte structurée
• L\'identification des risques et points de vigilance

Remplissez d\'abord les champs dans l\'onglet Étude, puis utilisez les boutons d\'action rapide ou posez-moi une question.

[SOURCE]
Méthode RDZA — outil d\'analyse architecturale et de pré-faisabilité.

[CONFIANCE]
🟢 Élevée (>80%) — Assistance générale sans analyse réglementaire spécifique.`
}
