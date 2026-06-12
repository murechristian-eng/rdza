// Vercel Serverless Function — Cadastre + Altimétrie
// Prend lon/lat, retourne parcelle + altitude. ~3-4s max.

import { fetchWithTimeout } from './_utils'

const APICARTO_CADASTRE = 'https://apicarto.ign.fr/api/cadastre/parcelle'
const GEOPF_ALTI = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json'

export async function POST(req: Request): Promise<Response> {
  try {
    const { lon, lat } = await req.json()
    if (lon == null || lat == null) {
      return Response.json({ erreur: 'Coordonnées requises' }, { status: 400 })
    }

    const [cad, alt] = await Promise.all([
      (async () => {
        try {
          const url = `${APICARTO_CADASTRE}?lon=${lon}&lat=${lat}&distance=50&srid=4326`
          const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 5000)
          if (!res.ok) return { parcelle: null, surface: null, geometry: null }
          const json = await res.json()
          const features = json.features || []
          if (features.length === 0) return { parcelle: null, surface: null, geometry: null }
          const props = features[0].properties || {}
          const parcelle = props.section && props.numero
            ? `${props.section} ${props.numero}`
            : props.id || null
          return {
            parcelle,
            surface: props.contenance || null,
            geometry: features[0].geometry || null,
          }
        } catch {
          return { parcelle: null, surface: null, geometry: null }
        }
      })(),
      (async () => {
        try {
          const url = `${GEOPF_ALTI}?lon=${lon}&lat=${lat}&resource=ign_rge_alti_wld&delimiter=|&indent=false`
          const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 5000)
          if (!res.ok) return { altitude: null }
          const json = await res.json()
          const z = json.elevations?.[0]?.z
          return { altitude: z != null ? z : null }
        } catch {
          return { altitude: null }
        }
      })(),
    ])

    return Response.json({
      parcelle: cad.parcelle,
      surface: cad.surface,
      geometry: cad.geometry,
      altitude: alt.altitude,
    })
  } catch {
    return Response.json({ erreur: 'Erreur serveur' }, { status: 500 })
  }
}
