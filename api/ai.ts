// Vercel Serverless Function — Proxy vers Google Gemini API
// RDZA : Assistant d'analyse architecturale et pré-faisabilité — v2 optimisée

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.Gemini || process.env.gemini || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { messages, system, context, pluContext, pluTexte } = body

    const lastMsg = messages?.[messages.length - 1]
    if (!lastMsg?.content) {
      return Response.json({ error: 'prompt requis' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return Response.json({ text: mockFallback(), mock: true })
    }

    // Build the system instruction as the first user message (Gemini system instruction via context)
    const systemBlock = [
      system,
      context ? `Contexte du projet : ${context}` : '',
      pluContext ? `DOCUMENT D'URBANISME DE LA COMMUNE : ${pluContext}` : '',
      pluTexte ? `RÈGLEMENT PLU (extrait) :\n${pluTexte.substring(0, 3000)}` : '',
    ].filter(Boolean).join('\n\n')

    // Build conversation history for Gemini
    const contents = systemBlock
      ? [{ role: 'user', parts: [{ text: systemBlock }] }, { role: 'model', parts: [{ text: 'Compris. Je suis prêt à analyser ce projet.' }] }]
      : []

    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }

    // Retry loop for transient errors
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
      }

      try {
        const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
              topP: 0.9,
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
        })

        if (geminiRes.ok) {
          const data = await geminiRes.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée.'
          return Response.json({ text, mock: false })
        }

        // Handle specific error codes
        if (geminiRes.status === 429) {
          if (attempt < MAX_RETRIES) continue // retry on rate limit
          return Response.json({
            text: `⚠️ **Quota Gemini épuisé** (429). Le plan gratuit a atteint sa limite.\n\n👉 Va sur https://aistudio.google.com/apikey créer une nouvelle clé, puis mets à jour GEMINI_API_KEY dans Vercel.`,
            mock: true,
          })
        }

        if (geminiRes.status === 400 || geminiRes.status === 403) {
          const errBody = await geminiRes.text().catch(() => '')
          return Response.json({
            text: `⚠️ L'API Gemini a refusé la requête (${geminiRes.status}). Vérifie que la clé API est valide et que l'API est activée.\nDétail : ${errBody.substring(0, 300)}`,
            mock: true,
          })
        }

        return Response.json({
          text: `⚠️ L'API Gemini a retourné une erreur ${geminiRes.status}.`,
          mock: true,
        })
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr))
        if (attempt < MAX_RETRIES) continue
      }
    }

    return Response.json({
      text: `⚠️ L'API Gemini est injoignable après ${MAX_RETRIES + 1} tentatives. Vérifie ta connexion.`,
      mock: true,
      error: lastError?.message,
    })
  } catch (e: any) {
    return Response.json({
      text: "⚠️ Erreur technique — vérifie que GEMINI_API_KEY est configuré dans les variables d'environnement Vercel.",
      mock: true,
      error: e.message,
    })
  }
}

function mockFallback(): string {
  return `⚠️ L'assistant IA fonctionne en mode mocké.\n\nPour l'analyse complète, ajoute GEMINI_API_KEY dans les variables d'environnement Vercel.\n\nPistes d'analyse en attendant :\n1. 📐 Consulte le PLU sur Géoportail Urbanisme\n2. 📋 Vérifie la parcelle sur cadastre.gouv.fr\n3. ⚠️ Identifie les servitudes (SUP)\n4. 🏗️ Analyse le contexte urbain sur les orthophotos IGN`
}
