// Vercel Serverless Function — Proxy vers Google Gemini API
// RDZA : Assistant d'analyse architecturale et pré-faisabilité

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { prompt, system, context } = body

    if (!prompt) {
      return Response.json({ error: 'prompt requis' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return Response.json({
        text: `⚠️ L'assistant IA fonctionne en mode mocké.\n\nPour l'analyse complète, ajoute GEMINI_API_KEY dans les variables d'environnement Vercel.\n\nEn attendant, voici des pistes d'analyse pour votre projet :\n\n1. 📐 Consultez le PLU de la commune sur Géoportail Urbanisme\n2. 📋 Vérifiez la parcelle cadastrale sur cadastre.gouv.fr\n3. ⚠️ Identifiez les servitudes (SUP) via le portail de l'urbanisme\n4. 🏗️ Analysez le contexte urbain sur les orthophotos IGN`,
        mock: true,
      })
    }

    const fullPrompt = [
      system ? `Instructions système : ${system}` : '',
      context ? `Contexte du projet : ${context}` : '',
      `Demande : ${prompt}`,
    ].filter(Boolean).join('\n\n')

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
        },
      }),
    })

    if (!geminiRes.ok) {
      return Response.json({
        text: `⚠️ L'API Gemini a retourné une erreur (${geminiRes.status}). L'assistant fonctionne en mode dégradé.`,
        mock: true,
      })
    }

    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée.'

    return Response.json({ text, mock: false })
  } catch (e: any) {
    return Response.json({
      text: "⚠️ L'assistant IA rencontre une erreur. Vérifie que GEMINI_API_KEY est configuré dans les Variables d'environnement Vercel.",
      mock: true,
      error: e.message,
    })
  }
}
