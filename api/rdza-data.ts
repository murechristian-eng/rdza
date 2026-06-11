// Vercel Serverless Function — Orchestrateur RDZA
// Récupère automatiquement les données publiques à partir d'une adresse
// APIs : Géocodage, Cadastre, Altimétrie, Urbanisme (IGN Géoportail/Apicarto)
// V2.1 : + Orthophotos WMS, + Servitudes d'Utilité Publique (SUP)

const GEOPF_GEOCODE = 'https://data.geopf.fr/geocodage/search'
const APICARTO_CADASTRE = 'https://apicarto.ign.fr/api/cadastre/parcelle'
const GEOPF_ALTI = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json'
const GEOPF_ALTI_LINE = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevationLine.json'
const APICARTO_URBANISME = 'https://apicarto.ign.fr/api/urbanisme/zone-urba'
const GEOPF_WMS = 'https://data.geopf.fr/wms-r/wms'
const APICARTO_GPU_SUP_S = 'https://apicarto.ign.fr/api/gpu/generateur-sup-s'
const APICARTO_GPU_SUP_L = 'https://apicarto.ign.fr/api/gpu/generateur-sup-l'
const APICARTO_GPU_SUP_P = 'https://apicarto.ign.fr/api/gpu/generateur-sup-p'
const APICARTO_GPU_DOC = 'https://apicarto.ign.fr/api/gpu/doc-urba'
// ─── Helper : fetch avec timeout ───
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPostWithTimeout(url: string, body: URLSearchParams, timeoutMs = 5000): Promise<Response> {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, timeoutMs)
}



interface GeocodeResult {
  lon: number
  lat: number
  ville: string
  codePostal: string
}

interface CadastreResult {
  parcelle: string | null
  surface: number | null
  geometry: unknown | null
}

interface PluDocumentResult {
  url: string | null
  type: string | null
  dateApprobation: string | null
  commune: string
}

interface ElevationResult {
  altitude: number | null
}

interface ElevationProfilePoint {
  lon: number
  lat: number
  z: number
  dist: number
}

interface ElevationProfileResult {
  points: ElevationProfilePoint[]
  penteMax: number | null  // pourcentage
  penteMoy: number | null
  denivele: number | null
}

interface SUPItem {
  type: string
  categorie: string
  description: string
}

async function geocode(adresse: string): Promise<GeocodeResult> {
  const url = `${GEOPF_GEOCODE}?q=${encodeURIComponent(adresse)}&limit=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Géocodage échoué')
  const json = await res.json()
  const features = json.features || []
  if (features.length === 0) throw new Error('Adresse introuvable')
  const feat = features[0]
  const [lon, lat] = feat.geometry?.coordinates || [0, 0]
  const props = feat.properties || {}
  return {
    lon,
    lat,
    ville: props.city || props.commune || '',
    codePostal: props.postcode || props.code_postal || '',
  }
}

async function cadastre(lon: number, lat: number): Promise<CadastreResult> {
  try {
    const url = `${APICARTO_CADASTRE}?lon=${lon}&lat=${lat}&distance=50&srid=4326`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return { parcelle: null, surface: null, geometry: null }
    const json = await res.json()
    const features = json.features || []
    if (features.length === 0) return { parcelle: null, surface: null, geometry: null }
    const props = features[0].properties || {}
    const parcelle = props.section && props.numero
      ? `${props.section} ${props.numero}`
      : props.id || null
    const surface = props.contenance || null
    const geometry = features[0].geometry || null
    return { parcelle, surface, geometry }
  } catch {
    return { parcelle: null, surface: null, geometry: null }
  }
}

async function elevation(lon: number, lat: number): Promise<ElevationResult> {
  try {
    const url = `${GEOPF_ALTI}?lon=${lon}&lat=${lat}&resource=ign_rge_alti_wld&delimiter=|&indent=false`
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return { altitude: null }
    const json = await res.json()
    const z = json.elevations?.[0]?.z
    return { altitude: z != null ? z : null }
  } catch {
    return { altitude: null }
  }
}

// Convertit une géométrie GeoJSON en WKT (Well-Known Text)
// requis par les APIs Apicarto (urbanisme, GPU/SUP)
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
      const polyStrs = polys.map(polyRings => '(' + polyRings.map(ringToWkt).join(', ') + ')')
      return `MULTIPOLYGON(${polyStrs.join(', ')})`
    }
    default:
      // Fallback : JSON.stringify (l'API acceptera peut-être)
      return JSON.stringify(gj)
  }
}

async function urbanisme(geometry: unknown): Promise<string | null> {
  try {
    const geomStr = geoJsonToWkt(geometry)
    const body = new URLSearchParams({ geom: geomStr })
    const res = await fetch(APICARTO_URBANISME, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    })
    if (!res.ok) return null
    const json = await res.json()
    const features = json.features || []
    if (features.length === 0) return null
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
}

function buildOrthophotoUrl(lon: number, lat: number): string {
  // Bounding box ~200m autour du point
  const delta = 0.001 // ~100m en degrés (approximation)
  const bbox = [lat - delta, lon - delta, lat + delta, lon + delta].join(',') // WMS 1.3.0 : lat avant lon
  return `${GEOPF_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS&BBOX=${bbox}&WIDTH=400&HEIGHT=300&CRS=EPSG:4326&FORMAT=image/jpeg&STYLES=`
}

async function sup(geometry: unknown): Promise<SUPItem[]> {
  if (!geometry) return []
  const geomStr = geoJsonToWkt(geometry)
  const items: SUPItem[] = []
  const endpoints = [APICARTO_GPU_SUP_S, APICARTO_GPU_SUP_L, APICARTO_GPU_SUP_P]

  for (const endpoint of endpoints) {
    try {
      const body = new URLSearchParams({ geom: geomStr })
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
      })
      if (!res.ok) continue
      const json = await res.json()
      const features = json.features || []
      for (const feat of features) {
        const props = feat.properties || {}
        const nom = props.nom || props.libelle || props.type || ''
        const categorie = props.categorie || props.famille || ''
        const description = props.description || props.acte || props.reference || ''
        if (nom || categorie || description) {
          items.push({ type: nom, categorie, description })
        }
      }
    } catch {
      // Échec silencieux : une API SUP peut ne rien retourner
    }
  }
  return items
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    
    // ─── Profil altimetrique (action separée) ───
    if (body.action === 'elevationProfile' && body.lonlats) {
      const profile = await elevationProfile(body.lonlats)
      return Response.json(profile)
    }
    
    const { adresse } = body
    if (!adresse?.trim()) {
    let pluTexte: string | null = null
    if (pluDocUrl) {
      pluTexte = await downloadAndParsePlu(pluDocUrl)
    }

    return Response.json({ erreur: 'Adresse requise' }, { status: 400 })
    }

    // ─── Étape 1 : Géocodage (séquentiel, obligatoire) ───
    let lon: number, lat: number, ville: string, codePostal: string
    try {
      const geo = await geocode(adresse.trim())
      lon = geo.lon
      lat = geo.lat
      ville = geo.ville
      codePostal = geo.codePostal
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Géocodage échoué'
    let pluTexte: string | null = null
    if (pluDocUrl) {
      pluTexte = await downloadAndParsePlu(pluDocUrl)
    }

    return Response.json({ erreur: msg }, { status: 404 })
    }

    // ─── Étape 2 : Appels parallèles (cadastre + altimétrie) ───
    // Ces 2 appels sont indépendants : ils ne dépendent que des coordonnées
    const [cad, alt] = await Promise.all([
      cadastre(lon, lat).catch(() => ({ parcelle: null, surface: null, geometry: null })),
      elevation(lon, lat).catch(() => ({ altitude: null })),
    ])

    // ─── Étape 3 : Orthophoto (synchrone, pas d'appel réseau) ───
    const orthophotoUrl = buildOrthophotoUrl(lon, lat)

    // ─── Étape 4 : Appels parallèles conditionnés à la géométrie ───
    // Urbanisme, SUP, et PLU Document nécessitent la géométrie cadastrale
    let zonagePLU: string | null = null
    let supData: SUPItem[] = []
    let pluDocUrl: string | null = null
    let pluDocType: string | null = null
    let pluDocDate: string | null = null

    if (cad.geometry) {
      const [pluZone, supResult, pluDoc] = await Promise.all([
        urbanisme(cad.geometry).catch(() => null),
        sup(cad.geometry).catch(() => [] as SUPItem[]),
        pluDocument(cad.geometry, ville).catch(() => ({ url: null, type: null, dateApprobation: null, commune: ville })),
      ])
      zonagePLU = pluZone
      supData = supResult
      pluDocUrl = pluDoc.url
      pluDocType = pluDoc.type
      pluDocDate = pluDoc.dateApprobation
    } else {
      // Fallback PLU Document sans geometrie
      const pluDoc = await pluDocument(null, ville).catch(() => ({ url: null, type: null, dateApprobation: null, commune: ville }))
      pluDocUrl = pluDoc.url
      pluDocType = pluDoc.type
      pluDocDate = pluDoc.dateApprobation
    }

    // ─── Construction de la réponse ───
    const notes: string[] = []
    if (alt.altitude == null) notes.push('Données altimétriques non disponibles pour cette zone.')
    if (cad.parcelle == null) notes.push('Parcelle cadastrale non trouvée.')
    if (zonagePLU == null && cad.geometry) notes.push('Zonage PLU non disponible.')
    if (supData.length === 0 && cad.geometry) notes.push('Aucune servitude SUP trouvée.')

    let pluTexte: string | null = null
    if (pluDocUrl) {
      pluTexte = await downloadAndParsePlu(pluDocUrl)
    }

    return Response.json({
      adresse: adresse.trim(),
      coordonnees: { lon, lat },
      ville,
      codePostal,
      parcelle: cad.parcelle,
      surface: cad.surface,
      altitude: alt.altitude,
      topographiePente: null,
      zonagePLU,
      orthophotoUrl,
      supData: supData.length > 0 ? supData : null,
      pluDocumentUrl: pluDocUrl,
      pluDocumentType: pluDocType,
      pluDocumentDate: pluDocDate
      noteReseaux: 'Les réseaux enterrés (gaz, électricité, eau, télécom) ne sont pas accessibles via API publique. Ils nécessitent une déclaration DT-DICT sur reseaux-et-canalisations.ineris.fr.',
      note: notes.length > 0 ? notes.join(' ') : null,
    })
  } catch {
    let pluTexte: string | null = null
    if (pluDocUrl) {
      pluTexte = await downloadAndParsePlu(pluDocUrl)
    }

    return Response.json({ erreur: 'Erreur serveur lors de la récupération des données.' }, { status: 500 })
  }
}
