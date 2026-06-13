// Vercel Serverless Function — Telegram Bot Webhook
// Reçoit les messages Telegram, les traite avec Gemini, répond
// Config : définir TELEGRAM_BOT_TOKEN dans les env vars Vercel
// Setup : https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://rdza-test.vercel.app/api/telegram

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

// ─── Types ───
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number; type: string; first_name?: string; username?: string }
    text?: string
    date: number
    entities?: { type: string; offset: number; length: number }[]
  }
}

interface MemoryEntry {
  date: string
  chatId: number
  userName: string
  messages: { role: 'user' | 'assistant'; text: string }[]
}

// ─── Mémoire éphémère (conversation en cours) ───
// Sur Vercel, elle survit le temps d'une conversation active
// Pour une persistance durable, utiliser Vercel KV
const conversationMemory = new Map<number, { role: string; text: string }[]>()

const MAX_HISTORY = 20 // nombre max de messages conservés en mémoire

// ─── Messages de démarrage ───
const START_TEXT = `👋 **Bienvenue sur RDZA Bot !**

Je suis votre assistant architectural propulsé par Gemini.

**Commandes disponibles :**
• \`/start\` — Afficher ce message
• \`/help\` — Aide détaillée
• \`/rdza\` — Analyse RDZA d'un site
• \`/memory\` — Voir le résumé de la conversation

Ou posez-moi directement une question sur un projet architectural.`

const HELP_TEXT = `🤖 **RDZA Bot — Aide**

Je peux vous aider sur :
• 📐 **Analyse PLU** — zonage, droits à construire
• 🏗️ **Potentiel opérationnel** — constructibilité, optimisation
• ⚠️ **Risques** — servitudes, points de blocage
• ✍️ **Synthèse architecte** — argumentée et sourcée

**Fonctionnalités :**
• Mémoire de conversation (derniers ${MAX_HISTORY} messages)
• Réponses structurées [INTERPRÉTATION] + [SOURCE] + [CONFIANCE]
• Analyse basée sur les principes du Code de l'urbanisme

→ Pour analyser une adresse précise, utilise \`/rdza <adresse>\`
→ Pour toute question, écrivez-la directement.`

// ─── Envoi d'un message Telegram ───
async function sendMessage(chatId: number, text: string) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    })
  } catch (e) {
    console.error('sendMessage error:', e)
  }
}

// ─── Envoi d'un indicateur "typing..." ───
async function sendChatAction(chatId: number) {
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })
  } catch {}
}

// ─── Appel à l'API Gemini ───
async function callGemini(prompt: string, history: { role: string; text: string }[]): Promise<string> {
  try {
    // Construire l'historique des messages pour Gemini
    const messages = history.map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.text,
    }))
    messages.push({ role: 'user', content: prompt })

    // Déterminer l'URL de l'API (locale ou production)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5173'

    const res = await fetch(`${baseUrl}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        system: `Tu es RDZA, assistant architectural expert en pré-faisabilité. Tu travailles AVEC l'architecte.

STRUCTURE OBLIGATOIRE :
[INTERPRÉTATION] — analyse concise
[SOURCE] — référence précise. Si incertain : "[SOURCE] ⚠️ Avis indicatif"
[CONFIANCE] — 🟢 Élevée | 🟡 Modérée | 🔴 Faible

RÈGLES :
• Ne JAMAIS inventer un article du PLU
• Cite les données disponibles
• Sois concis, technique, actionnable. Réponds en français.`,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return `⚠️ Erreur API (${res.status}). ${errBody.substring(0, 200)}`
    }

    const data = await res.json()
    return data.text || "Je n'ai pas pu générer de réponse."
  } catch (e: any) {
    return `⚠️ Erreur de connexion : ${e.message || 'service indisponible'}`
  }
}

// ─── Gestion d'une commande ───
async function handleCommand(chatId: number, command: string, args: string): Promise<string> {
  switch (command) {
    case '/start':
      return START_TEXT
    case '/help':
      return HELP_TEXT
    case '/rdza':
      if (!args) {
        return `⚠️ Utilisation : \`/rdza <adresse>\`\n\nExemple : \`/rdza 10 rue de Rivoli, Paris\``
      }
      return `🔍 Analyse RDZA pour : ${args}\n\nFonctionnalité disponible depuis l'interface web RDZA.\nUtilisez l'Assistant IA sur [rdza-test.vercel.app](https://rdza-test.vercel.app) pour une analyse complète avec carte interactive.`
    case '/memory':
      const mem = conversationMemory.get(chatId)
      if (!mem || mem.length === 0) {
        return '📭 Aucun historique de conversation pour cette session.'
      }
      const summary = mem.map((m, i) =>
        `${m.role === 'user' ? '👤' : '🤖'} ${m.text.substring(0, 80)}${m.text.length > 80 ? '...' : ''}`
      ).join('\n')
      return `📝 **Mémoire de conversation (${mem.length} messages) :**\n\n${summary}`
    default:
      return `Commande inconnue : ${command}\n\nUtilisez /help pour voir les commandes disponibles.`
  }
}

// ─── Handler principal ───
export async function POST(req: Request): Promise<Response> {
  try {
    // Vérifier le token
    if (!BOT_TOKEN) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN non configuré' }, { status: 500 })
    }

    const update: TelegramUpdate = await req.json()

    // Ignorer les updates sans message
    if (!update.message?.text) {
      return new Response('OK', { status: 200 })
    }

    const chatId = update.message.chat.id
    const text = update.message.text.trim()
    const userName = update.message.chat.first_name || update.message.chat.username || 'Utilisateur'

    // Initialiser la mémoire pour ce chat
    if (!conversationMemory.has(chatId)) {
      conversationMemory.set(chatId, [])
    }

    // Envoyer l'indicateur "typing..."
    sendChatAction(chatId)

    // Vérifier si c'est une commande
    const firstWord = text.split(' ')[0]
    if (firstWord.startsWith('/')) {
      const args = text.substring(firstWord.length).trim()
      const response = await handleCommand(chatId, firstWord, args)

      // Sauvegarder en mémoire
      const history = conversationMemory.get(chatId)!
      history.push({ role: 'user', text })
      history.push({ role: 'assistant', text: response })
      // Limiter la taille de l'historique
      if (history.length > MAX_HISTORY) {
        conversationMemory.set(chatId, history.slice(-MAX_HISTORY))
      }

      await sendMessage(chatId, response)
      return new Response('OK', { status: 200 })
    }

    // Message normal → appeler Gemini
    const history = conversationMemory.get(chatId)!
    const reply = await callGemini(text, history)

    // Sauvegarder en mémoire
    history.push({ role: 'user', text })
    history.push({ role: 'assistant', text: reply })
    if (history.length > MAX_HISTORY) {
      conversationMemory.set(chatId, history.slice(-MAX_HISTORY))
    }

    await sendMessage(chatId, reply)
    return new Response('OK', { status: 200 })
  } catch (e: any) {
    console.error('Telegram webhook error:', e)
    return new Response('OK', { status: 200 }) // Toujours répondre 200 à Telegram
  }
}
