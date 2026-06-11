// Vercel Serverless Function — Urbanisme (PLU + SUP + PLU Document)
// Optimisé : SUP en parallèle, timeouts 3s

const APICARTO_URBANISME = 'https://apicarto.ign.fr/api/urbanisme/zone-urba'
const APICARTO_GPU_SUP_S = 'https://apicarto.ign.fr/api/gpu/generateur-sup-s'
const APICARTO_GPU_SUP_L = 'https://apicarto.ign.fr/api/gpu/generateur-sup-l'
const APICARTO_GPU_SUP_P = 'https://apicarto.ign.fr/api/gpu/generateur-sup-p'
const APICARTO_GPU_DOC = 'https://apicarto.ign.fr/api/gpu/doc-urba'

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function geoJsonToWkt(geometry: unknown): string {
  if (typeof geometry === 'string') return geometry
  const gj = geometry as Record<string, unknown>
  const type = gj.type as string
  const coords = gj.coordinates as number[][][]

  function ringToWkt(ring: number[][]): string {
    return '(' + ring.map(([lon, lat]) => `${lon} ${lat}`).join(', ') + ')'
  }

  switch (type) {
    case 'Point': {
      const [lon, lat] = coords as unknown as [number, number]
      return `POINT(${lon} ${lat})`
    }
    case 'Polygon': {
      const rings = coords as unknown as number[][][]
      return `POLYGON(${rings.map(ringToWkt).join(', ')})`
    }
    case 'MultiPolygon': {
      const polys = coords as unknown as number[][][][]
      const polyStrs = polys.map((polyRings) => '(' + polyRings.map(ringToWkt).join(', ') + ')')
      return `MULTIPOLYGON(${polyStrs.join(', ')})`
    }
    default:
      return JSON.stringify(gj)
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { geometry, commune } = await req.json()
    if (!geometry && !commune) {
      return Response.json({ erreur: 'Géométrie ou commune requise' }, { status: 400 })
    }

    const geomStr = geometry ? geoJsonToWkt(geometry) : null

    const [zonagePLU, supData, pluDoc] = await Promise.all([
      // PLU Zonage
      (async () => {
        if (!geomStr) return null
        try {
          const body = new URLSearchParams({ geom: geomStr })
          const res = await fetchWithTimeout(APICARTO_URBANISME, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body,
          }, 3000)
          if (!res.ok) return null
          const json = await res.json()
          const features = json.features || []
          for (const feat of features) {
            const props = feat.properties || {}
            const libelle = props.libelle || props.typezone || props.libelle_zone || ''
            if (libelle) {
              const normalized = libelle.trim().toUpperCase()
              const knownKeys = ['UH', 'UC', 'UE', 'UZ', 'AU', 'A', 'N', 'U']
              for (const key of knownKeys) {
                if (normalized.startsWith(key)) return key
              }
              return normalized
            }
          }
          return null
        } catch {
          return null
        }
      })(),
      // SUP — 3 appels en parallèle au lieu de séquentiel
      (async () => {
        if (!geomStr) return []
        const endpoints = [APICARTO_GPU_SUP_S, APICARTO_GPU_SUP_L, APICARTO_GPU_SUP_P]
        const results = await Promise.all(
          endpoints.map(async (endpoint) => {
            try {
              const body = new URLSearchParams({ geom: geomStr })
              const res = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
                body,
              }, 3000)
              if (!res.ok) return []
              const json = await res.json()
              const features = json.features || []
              return features.map((feat: any) => {
                const props = feat.properties || {}
                const nom = props.nom || props.libelle || props.type || ''
                const categorie = props.categorie || props.famille || ''
                const description = props.description || props.acte || props.reference || ''
                return nom || categorie || description
                  ? { type: nom, categorie, description }
                  : null
              }).filter(Boolean)
            } catch {
              return []
            }
          })
        )
        return results.flat() as Array<{ type: string; categorie: string; description: string }>
      })(),
      // PLU Document
      (async () => {
        if (!commune) return { url: null, type: null, dateApprobation: null }
        try {
          const params = new URLSearchParams()
          if (geomStr) params.append('geom', geomStr)
          params.append('commune', commune)
          const res = await fetchWithTimeout(`${APICARTO_GPU_DOC}?${params.toString()}`, {
            headers: { Accept: 'application/json' },
          }, 3000)
          if (!res.ok) return { url: null, type: null, dateApprobation: null }
          const json = await res.json()
          const features = json.features || json || []
          if (Array.isArray(features) && features.length > 0) {
            const doc = features[0].properties || features[0] || {}
            return {
              url: doc.url || doc.lien || null,
              type: doc.type || doc.nature || null,
              dateApprobation: doc.dateapprobation || doc.date_approbation || null,
            }
          }
          return { url: null, type: null, dateApprobation: null }
        } catch {
          return { url: null, type: null, dateApprobation: null }
        }
      })(),
    ])

    return Response.json({
      zonagePLU,
      supData: supData.length > 0 ? supData : null,
      pluDocumentUrl: pluDoc.url,
      pluDocumentType: pluDoc.type,
      pluDocumentDate: pluDoc.dateApprobation,
    })
  } catch {
    return Response.json({ erreur: 'Erreur serveur' }, { status: 500 })
  }
}
