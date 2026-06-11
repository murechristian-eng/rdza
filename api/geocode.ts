// Vercel Serverless Function — Géocodage IGN uniquement
// Rapide : ~1s, bien sous les 10s Vercel Hobby

const GEOPF_GEOCODE = 'https://data.geopf.fr/geocodage/search'

export async function POST(req: Request): Promise<Response> {
  try {
    const { adresse } = await req.json()
    if (!adresse?.trim()) {
      return Response.json({ erreur: 'Adresse requise' }, { status: 400 })
    }

    const url = `${GEOPF_GEOCODE}?q=${encodeURIComponent(adresse.trim())}&limit=1`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        return Response.json({ erreur: 'Géocodage échoué' }, { status: 404 })
      }

      const json = await res.json()
      const features = json.features || []
      if (features.length === 0) {
        return Response.json({ erreur: 'Adresse introuvable' }, { status: 404 })
      }

      const feat = features[0]
      const [lon, lat] = feat.geometry?.coordinates || [0, 0]
      const props = feat.properties || {}

      return Response.json({
        lon,
        lat,
        ville: props.city || props.commune || '',
        codePostal: props.postcode || props.code_postal || '',
      })
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return Response.json({ erreur: 'Erreur serveur' }, { status: 500 })
  }
}
