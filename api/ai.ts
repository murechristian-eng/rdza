// Vercel Serverless Function — Proxy vers Google Gemini API
// Déployé automatiquement sur Vercel dans /api/ai

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { prompt, system, context } = body

    if (!prompt) {
      return Response.json({ error: 'prompt requis' }, { status: 400 })
    }

    // Si pas de clé API, retourne une réponse mockée utile
    if (!GEMINI_API_KEY) {
      return Response.json({
        text: mockResponse(prompt, system, context),
        mock: true,
      })
    }

    const fullPrompt = [
      system ? `Instructions système : ${system}` : '',
      context ? `Contexte : ${context}` : '',
      `Demande : ${prompt}`,
    ].filter(Boolean).join('\n\n')

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800,
        },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini API error:', geminiRes.status, err)
      return Response.json({
        text: mockResponse(prompt, system, context),
        mock: true,
        error: `Gemini API error ${geminiRes.status}`,
      })
    }

    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée.'

    return Response.json({ text, mock: false })
  } catch (e: any) {
    console.error('AI function error:', e.message)
    return Response.json({
      text: "⚠️ L'assistant IA rencontre une erreur. Vérifie que GEMINI_API_KEY est configuré dans les Variables d'environnement Vercel.",
      mock: true,
      error: e.message,
    })
  }
}

function mockResponse(prompt: string, _system?: string, _context?: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes('rdza') || lowerPrompt.includes('statut global')) {
    return `📊 Analyse RDZA :\n\n🔴 ROUGE — Action requise :\n• MiroFlow : dossier introuvable → git clone dans C:/Architeture/mirolabs/MiroFlow\n\n🟡 ZÉRO — Surveillance :\n• Aider : version obsolète → pip install --upgrade aider-chat\n\n🟢 DISPONIBLE — RAS :\n• Python, Git, Codebuff, Mneme, Terminal sont opérationnels.`
  }

  if (lowerPrompt.includes('feedback') || lowerPrompt.includes('analyser')) {
    return '📝 Analyse des feedbacks :\n\n• Catégorie suggérée : bug (comportement inattendu du dashboard)\n• Priorité : high (affecte la navigation)\n• Reformulation : "Le badge RDZA de MiroFlow reste bloqué sur rouge même après correction du chemin"\n\n🔍 Recommandation : Vérifier le handler miroflow-exists dans electron/main.ts et le refresh du ToolRegistry.'
  }

  if (lowerPrompt.includes('recommand')) {
    return `🧹 3 recommandations pour stabiliser le cockpit :\n\n1. 🔧 Ajouter une vérification de chemin dynamique pour MiroFlow (ne pas hardcoder C:/Architeture)\n2. ⏱️ Réduire le polling à 60s au lieu de 30s pour alléger le CPU\n3. 📊 Ajouter un compteur de sessions Mneme dans le footer`
  }

  return `👋 Je suis l'assistant IA de RDZA Test.\n\nJe peux :\n• 📊 Analyser l'état global du système (dis "statut global")\n• 📝 Analyser des feedbacks QA (colle un feedback)\n• 🧹 Donner des recommandations (dis "recommandations")\n• ❓ Répondre à toute question sur Odysséus\n\nPour l'instant, je fonctionne en mode mocké (pas de connexion à l'API Gemini).\nPour activer l'IA réelle, ajoute GEMINI_API_KEY dans les variables d'environnement Vercel.`
}
