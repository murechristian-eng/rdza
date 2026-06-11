import { useState, useRef, useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import type { RDZAProject, RDZAAPIResponse, SUPItem } from '../types'
import { INTENTION_LABELS, ZONAGE_LABELS, TOPOGRAPHIE_LABELS } from '../types'

/* ═══════════════════════════════════════════════
   RDZAForm V3 — Canvas-First avec carte Leaflet
   ═══════════════════════════════════════════════ */

interface Props {
  project: RDZAProject
  onChange: (project: RDZAProject) => void
}

type FetchStatus = 'idle' | 'loading' | 'full' | 'partial' | 'error'

// ─── IGN WMTS Layers (gratuits, sans clé) ───
const IGN_PLAN = 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
const IGN_ORTHO = 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
const IGN_CADASTRE = 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=bdparcellaire_o&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'

export function RDZAForm({ project, onChange }: Props) {
  // ─── API State ───
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [fetchMessage, setFetchMessage] = useState('')
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())
  const [geoInfo, setGeoInfo] = useState<{ ville: string; codePostal: string; altitude: number } | null>(null)
  const [orthophotoUrl, setOrthophotoUrl] = useState<string | null>(null)
  const [supCount, setSupCount] = useState<number | null>(null)
  const [supList, setSupList] = useState<SUPItem[] | null>(null)
  const [cadastreGeometry, setCadastreGeometry] = useState<unknown | null>(null)
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Map layer toggles ───
  const [mapLayer, setMapLayer] = useState<'plan' | 'ortho' | 'cadastre'>('plan')

  // ─── Elevation Profile state ───
  const [drawMode, setDrawMode] = useState(false)
  const [profileResult, setProfileResult] = useState<import('../types').ElevationProfileResult | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // ─── Croquis d'emprise state ───
  const [sketchMode, setSketchMode] = useState(false)
  const [sketchResult, setSketchResult] = useState<{ area: number; ratio: number } | null>(null)

  // ─── Cleanup ───
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // ─── filledCount ───
  const filledCount = [
    project.syntheseArchitecte,
    project.adresseSite,
    project.parcelleCadastrale,
    project.contexteUrbain,
    project.stationnementAccess,
  ].filter(Boolean).length + (project.surfaceTerrain != null ? 1 : 0)

  // ─── fetchData ───
  const fetchData = async () => {
    const adresse = project.adresseSite.trim()
    if (!adresse) return

    if (abortRef.current) abortRef.current.abort()
    if (timerRef.current) clearTimeout(timerRef.current)

    const controller = new AbortController()
    abortRef.current = controller

    setFetchStatus('loading')
    setFetchMessage('Recherche...')
    setGeoInfo(null)
    setOrthophotoUrl(null)
    setSupCount(null)
    setSupList(null)
    setCadastreGeometry(null)
    setCoordinates(null)
    setProfileResult(null)
    setSketchResult(null)
    setSketchMode(false)
    setDrawMode(false)

    const timer = setTimeout(() => { setFetchMessage('') }, 8000)
    timerRef.current = timer

    try {
      const res = await fetch('/api/rdza-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresse }),
        signal: controller.signal,
      })

      if (abortRef.current !== controller) return

      if (!res.ok) {
        setFetchStatus('error')
        if (res.status === 404) {
          setFetchMessage('Adresse introuvable. Verifiez votre saisie.')
        } else {
          setFetchMessage('Erreur lors de la récupération des données.')
        }
        return
      }

      const data: RDZAAPIResponse = await res.json()
      if (abortRef.current !== controller) return

      const updates: Partial<RDZAProject> = {}
      const newAuto = new Set<string>()

      if (data.ville) {
        setGeoInfo({ ville: data.ville, codePostal: data.codePostal, altitude: data.altitude ?? 0 })
        setCoordinates([data.coordonnees.lon, data.coordonnees.lat])
      }

      if (data.parcelle) {
        updates.parcelleCadastrale = data.parcelle
        newAuto.add('parcelleCadastrale')
      }
      if (data.surface != null) {
        updates.surfaceTerrain = data.surface
        newAuto.add('surfaceTerrain')
      }
      if (data.geometry) {
        setCadastreGeometry(data.geometry)
      }

      if (data.zonagePLU && (Object.keys(ZONAGE_LABELS) as string[]).includes(data.zonagePLU)) {
        updates.zonagePLU = data.zonagePLU as RDZAProject['zonagePLU']
        newAuto.add('zonagePLU')
      }

      if (data.orthophotoUrl) {
        setOrthophotoUrl(data.orthophotoUrl)
        updates.orthophotoUrl = data.orthophotoUrl
      }

      if (data.supData && data.supData.length > 0) {
        setSupCount(data.supData.length)
        setSupList(data.supData)
      }

      // PLU Document context for AI
      if (data.pluDocumentUrl) {
        updates.pluDocumentUrl = data.pluDocumentUrl
        updates.pluDocumentType = data.pluDocumentType || undefined
      }
      // pluTexte est telecharge a la demande par api/ai.ts

      if (data.altitude != null && geoInfo) {
        setGeoInfo(prev => prev ? { ...prev, altitude: data.altitude! } : null)
      } else if (data.altitude != null && data.ville) {
        setGeoInfo({ ville: data.ville, codePostal: data.codePostal, altitude: data.altitude })
      }

      onChange({ ...project, ...updates })
      setAutoFilled(newAuto)

      const hasParcelle = !!data.parcelle
      const hasSurface = data.surface != null
      const hasPLU = !!data.zonagePLU
      const allOk = hasParcelle && hasSurface && hasPLU
      const anyOk = hasParcelle || hasSurface || hasPLU

      if (allOk) {
        setFetchStatus('full')
        setFetchMessage('Données publiques récupérées avec succès')
      } else if (anyOk) {
        setFetchStatus('partial')
        setFetchMessage('Données partiellement récupérées')
      } else {
        setFetchStatus('error')
        setFetchMessage('Aucune donnée trouvée pour cette adresse.')
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setFetchStatus('error')
      setFetchMessage('Erreur réseau — vérifiez votre connexion.')
    }
  }

  // ─── handleAdresseChange ───
  const handleAdresseChange = (value: string) => {
    setFetchStatus('idle')
    setFetchMessage('')
    setGeoInfo(null)
    setOrthophotoUrl(null)
    setSupCount(null)
    setSupList(null)
    setCadastreGeometry(null)
    setCoordinates(null)
    setProfileResult(null)
    setSketchResult(null)
    onChange({
      ...project,
      adresseSite: value,
      parcelleCadastrale: '',
      surfaceTerrain: null,
      zonagePLU: 'autre',
      orthophotoUrl: undefined,
      pluDocumentUrl: undefined,
      pluDocumentType: undefined,
    })
    setAutoFilled(new Set())
  }

  const isAuto = (field: string) => autoFilled.has(field)
  const updateField = <K extends keyof RDZAProject>(key: K, value: RDZAProject[K]) => {
    onChange({ ...project, [key]: value })
  }

  const fetchDisabled = fetchStatus === 'loading' || !project.adresseSite.trim()

  return (
    <div className="canvas-shell">
      {/* COLONNE 1 — CARTE */}
      <div className="canvas-map">
        {coordinates ? (
          <>
            <LeafletMapDisplay
              coordinates={coordinates}
              layer={mapLayer}
              geometry={cadastreGeometry}
              planUrl={IGN_PLAN}
              orthoUrl={IGN_ORTHO}
              cadastreUrl={IGN_CADASTRE}
              drawMode={drawMode}
              sketchMode={sketchMode}
              surfaceTerrain={project.surfaceTerrain}
              onProfileComplete={async (lonlats: [number, number][]) => {
                setProfileLoading(true)
                setDrawMode(false)
                try {
                  const res = await fetch('/api/rdza-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'elevationProfile', lonlats }),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    setProfileResult(data.points?.length > 0 ? data : null)
                  }
                } catch {}
                setProfileLoading(false)
              }}
              onSketchComplete={(area: number, ratio: number, geojson: unknown) => {
                setSketchMode(false)
                setSketchResult({ area, ratio })
                onChange({ ...project, empriseSurface: Math.round(area), empriseGeojson: geojson })
              }}
            />
            <div className="map-controls">
              <button className={`map-control-btn ${mapLayer === 'plan' ? 'active' : ''}`} onClick={() => setMapLayer('plan')}>
                🗺️ Plan IGN
              </button>
              <button className={`map-control-btn ${mapLayer === 'ortho' ? 'active' : ''}`} onClick={() => setMapLayer('ortho')}>
                🛰️ Orthophoto
              </button>
              {cadastreGeometry != null && (
                <button className={`map-control-btn ${mapLayer === 'cadastre' ? 'active' : ''}`} onClick={() => setMapLayer('cadastre')}>
                  🏛️ Cadastre
                </button>
              )}
              <button
                className={`map-control-btn ${drawMode ? 'active' : ''}`}
                onClick={() => {
                if (!drawMode) { setSketchMode(false); setSketchResult(null) }
                setDrawMode(!drawMode)
                if (drawMode) setProfileResult(null)
              }}
                style={{ marginTop: '8px', borderTop: '1px solid var(--border-primary)', paddingTop: '8px' }}
              >
                {drawMode ? '🔴 Stop' : '📐 Profil topo'}
              </button>
              <button
                className={`map-control-btn ${sketchMode ? 'active' : ''}`}
                onClick={() => {
                  if (!sketchMode) { setDrawMode(false); setProfileResult(null) }
                  setSketchMode(!sketchMode)
                  if (sketchMode) setSketchResult(null)
                }}
              >
                {sketchMode ? '🔴 Stop' : '✏️ Croquis'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-muted)', fontSize: 'var(--font-size-sm)', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>🗺️</span>
            <span>Saisissez une adresse et cliquez sur <strong>Recuperer</strong></span>
            <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.5 }}>pour afficher la carte interactive IGN</span>
          </div>
        )}
      </div>

      {/* COLONNE 2 — PANNEAU */}
      <div className="canvas-sidebar">
        {/* Stats Row */}
        <div className="stats-row">
          <span className="stat-item">
            <span className={`stat-badge ${filledCount === 6 ? 'success' : filledCount >= 3 ? 'warning' : 'info'}`}>
              {filledCount}/6
            </span>
            <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--font-size-xs)' }}>champs</span>
          </span>
          <span className="stat-badge info">RDZA</span>
          {fetchStatus === 'loading' && <span className="stat-badge warning">⏳ Recherche...</span>}
          {fetchStatus === 'full' && <span className="stat-badge success">OK</span>}
          {fetchStatus === 'partial' && <span className="stat-badge warning">Partiel</span>}
          {fetchStatus === 'error' && <span className="stat-badge error">Erreur</span>}
          {geoInfo && (
            <span className="stat-badge info">
              📍 {geoInfo.ville} {geoInfo.codePostal}
              {geoInfo.altitude ? ' · ⛰️ ' + Math.round(geoInfo.altitude) + 'm' : ''}
            </span>
          )}
          {supCount != null && (
            <span className="stat-badge error">⚠️ {supCount} servitude{supCount > 1 ? 's' : ''}</span>
          )}
        </div>

        {/* SUP List */}
        {supList && supList.length > 0 && (
          <div className="sup-list">
            {supList.map((s, i) => (
              <div key={i} className="sup-item">
                <strong>{s.type || s.categorie}</strong>
                {s.description && <span> — {s.description}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Fetch Banner */}
        {fetchMessage && (
          <div className={`fetch-banner ${fetchStatus === 'full' ? 'success' : fetchStatus === 'partial' ? 'partial' : fetchStatus === 'error' ? 'error' : 'loading'}`}>
            {fetchMessage}
          </div>
        )}

        {/* SECTION 1 : Identification */}
        <div className="tool-card">
          <div className="tool-card-header">
            <span className="section-icon">📍</span> Identification du site
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Adresse</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input type="text" value={project.adresseSite} onChange={(e) => handleAdresseChange(e.target.value)} placeholder="12 rue de Rivoli, 75001 Paris" style={{ flex: 1 }} />
                <button className={`btn btn-fetch ${fetchStatus === 'loading' ? 'loading' : ''}`} onClick={fetchData} disabled={fetchDisabled}>
                  {fetchStatus === 'loading' ? '⏳' : '🛰️'} Recuperer
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Intention de projet</label>
              <select value={project.intentionProjet} onChange={(e) => updateField('intentionProjet', e.target.value as RDZAProject['intentionProjet'])}>
                {Object.entries(INTENTION_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2 : Cadastre & Geo */}
        <div className="tool-card">
          <div className="tool-card-header">
            <span className="section-icon">🏛️</span> Cadastre & Géographie
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Parcelle cadastrale {isAuto('parcelleCadastrale') && <span className="api-badge">🛰️ API</span>}</label>
              <input type="text" value={project.parcelleCadastrale} onChange={(e) => { updateField('parcelleCadastrale', e.target.value); setAutoFilled(prev => { const s = new Set(prev); s.delete('parcelleCadastrale'); return s }) }} placeholder="000 AB 123" />
            </div>
            <div className="form-group">
              <label>Surface terrain (m²) {isAuto('surfaceTerrain') && <span className="api-badge">🛰️ API</span>}</label>
              <input type="number" value={project.surfaceTerrain ?? ''} onChange={(e) => { updateField('surfaceTerrain', e.target.value ? Number(e.target.value) : null); setAutoFilled(prev => { const s = new Set(prev); s.delete('surfaceTerrain'); return s }) }} placeholder="850" />
            </div>
            <div className="form-group">
              <label>Zonage PLU {isAuto('zonagePLU') && <span className="api-badge">🛰️ API</span>}</label>
              <select value={project.zonagePLU} onChange={(e) => { updateField('zonagePLU', e.target.value as RDZAProject['zonagePLU']); setAutoFilled(prev => { const s = new Set(prev); s.delete('zonagePLU'); return s }) }}>
                {Object.entries(ZONAGE_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
            <div className="form-group">
              <label>Topographie / Pente</label>
              <select value={project.topographiePente} onChange={(e) => updateField('topographiePente', e.target.value as RDZAProject['topographiePente'])}>
                {Object.entries(TOPOGRAPHIE_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
          </div>
          {geoInfo?.altitude != null && (
            <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--accent-altitude)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              ⛰️ Altitude : <strong>{Math.round(geoInfo.altitude)} m</strong> (IGN RGE ALTI)
            </div>
          )}
        </div>

        {/* Orthophoto preview */}
        {orthophotoUrl && (
          <div className="ortho-preview">
            <img src={orthophotoUrl} alt="Orthophoto IGN" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}

        {/* SECTION 3 : Lecture architecturale */}
        <div className="tool-card">
          <div className="tool-card-header">
            <span className="section-icon">🏗️</span> Lecture architecturale
          </div>
          <div className="form-group full-width">
            <label>Contexte urbain et typologies</label>
            <textarea value={project.contexteUrbain} onChange={(e) => updateField('contexteUrbain', e.target.value)} placeholder="Décrivez le tissu urbain environnant : hauteurs dominantes, typologies de bâti, matériaux, implantation par rapport à la rue..." rows={4} />
          </div>
          <div className="form-group full-width" style={{ marginTop: 'var(--space-3)' }}>
            <label>Stationnement et accessibilité</label>
            <textarea value={project.stationnementAccess} onChange={(e) => updateField('stationnementAccess', e.target.value)} placeholder="Accès véhicules, transports en commun, stationnement existant, contraintes de desserte..." rows={4} />
          </div>
        </div>

        {/* SECTION 4 : Synthese */}
        <div className="tool-card">
          <div className="tool-card-header">
            <span className="section-icon">✍️</span> Synthèse architecte
          </div>
          <div className="form-group full-width">
            <textarea value={project.syntheseArchitecte} onChange={(e) => updateField('syntheseArchitecte', e.target.value)} placeholder="Votre synthese : coherence urbaine, qualite d'insertion, potentiel cache, strategie de projet recommandee..." rows={5} style={{ fontSize: 'var(--font-size-base)' }} />
          </div>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <strong>🛰️ Sources :</strong> IGN Geoportail (géocodage, altimétrie RGE ALTI, orthophotos, plan cadastral) · IGN Apicarto (cadastre, urbanisme/PLU, servitudes SUP). Données publiques gratuites.<br />
          <strong>⚠️ DT-DICT obligatoire :</strong> avant tous travaux, déclarez-vous sur <em>protocole-dt-dict.fr</em>. L'API réseaux enterrés n'est pas accessible au public.
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LeafletMapDisplay — Carte IGN interactive
   ═══════════════════════════════════════════════ */

interface LeafletMapProps {
  coordinates: [number, number]
  layer: 'plan' | 'ortho' | 'cadastre'
  geometry: unknown | null
  planUrl: string
  orthoUrl: string
  cadastreUrl: string
  drawMode: boolean
  sketchMode: boolean
  surfaceTerrain: number | null
  onProfileComplete: (lonlats: [number, number][]) => void
  onSketchComplete: (area: number, ratio: number, geojson: unknown) => void
}

// ─── Polygon area calculation (shoelace formula + lat→meters conversion) ───
function computePolygonArea(latlngs: any[]): number {
  if (latlngs.length < 3) return 0
  const points = latlngs.map((ll: any) => [ll.lng, ll.lat] as [number, number])
  
  // Shoelace formula in degrees²
  let areaDeg2 = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    areaDeg2 += points[i][0] * points[j][1]
    areaDeg2 -= points[j][0] * points[i][1]
  }
  areaDeg2 = Math.abs(areaDeg2) / 2
  
  // Convert degrees² to m² using the latitude
  const avgLat = points.reduce((s, p) => s + p[1], 0) / points.length
  const latRad = avgLat * Math.PI / 180
  const mPerDegLat = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad) - 0.0023 * Math.cos(6 * latRad)
  const mPerDegLon = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad) + 0.118 * Math.cos(5 * latRad)
  
  return areaDeg2 * mPerDegLat * mPerDegLon
}

function LeafletMapDisplay({ coordinates, layer, geometry, planUrl, orthoUrl, cadastreUrl, drawMode, sketchMode, surfaceTerrain, onProfileComplete, onSketchComplete }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileRef = useRef<any>(null)
  const geoRef = useRef<any>(null)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    import('leaflet').then(mod => {
      if (!cancelled) setL(mod.default ?? mod)
    }).catch(() => { console.warn('Leaflet not available') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current, {
      center: [coordinates[1], coordinates[0]],
      zoom: 18,
      zoomControl: true,
      attributionControl: false,
    })
    mapInstanceRef.current = map
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [L])

  useEffect(() => {
    if (!L || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    if (tileRef.current) map.removeLayer(tileRef.current)
    const url = layer === 'plan' ? planUrl : layer === 'ortho' ? orthoUrl : cadastreUrl
    const tile = L.tileLayer(url, { maxZoom: 21, attribution: 'IGN — Geoportail' })
    tile.addTo(map)
    tileRef.current = tile
  }, [L, layer, planUrl, orthoUrl, cadastreUrl])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setView([coordinates[1], coordinates[0]], 18, { animate: true })
  }, [coordinates])

  useEffect(() => {
    if (!L || !mapInstanceRef.current || !geometry) return
    const map = mapInstanceRef.current
    if (geoRef.current) map.removeLayer(geoRef.current)
    try {
      const geo = L.geoJSON(geometry, {
        style: { color: '#58A6FF', weight: 3, opacity: 0.9, fillColor: '#58A6FF', fillOpacity: 0.15 },
      })
      geo.addTo(map)
      geoRef.current = geo
      try { const b = geo.getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 19 }) } catch {}
    } catch { console.warn('Could not render cadastre geometry') }
  }, [L, geometry])

  // Leaflet CSS imported statically above

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}


/* ═══════════════════════════════════════════════
   ElevationProfileChart — Canvas 2D profile
   ═══════════════════════════════════════════════ */

interface ElevationChartProps {
  profile: import('../types').ElevationProfileResult
  onClose: () => void
}

function ElevationProfileChart({ profile, onClose }: ElevationChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { points, penteMax, penteMoy, denivele } = profile

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || points.length < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const pad = { top: 20, right: 20, bottom: 30, left: 50 }
    const pw = W - pad.left - pad.right
    const ph = H - pad.top - pad.bottom

    // Échelles
    const zMin = Math.min(...points.map(p => p.z))
    const zMax = Math.max(...points.map(p => p.z))
    const zRange = zMax - zMin || 1
    const dMax = points[points.length - 1].dist
    const dRange = dMax || 1

    const x = (dist: number) => pad.left + (dist / dRange) * pw
    const y = (z: number) => pad.top + ph - ((z - zMin) / zRange) * ph

    // Fond
    ctx.fillStyle = '#0D1117'
    ctx.fillRect(0, 0, W, H)

    // Grille
    ctx.strokeStyle = 'rgba(48,54,61,0.5)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const gy = pad.top + (i / 5) * ph
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = '#30363D'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, H - pad.bottom); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad.left, H - pad.bottom); ctx.lineTo(W - pad.right, H - pad.bottom); ctx.stroke()

    // Courbe de profil
    ctx.strokeStyle = '#58A6FF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x(points[0].dist), y(points[0].z))
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(x(points[i].dist), y(points[i].z))
    }
    ctx.stroke()

    // Remplissage sous la courbe
    ctx.fillStyle = 'rgba(88,166,255,0.08)'
    ctx.beginPath()
    ctx.moveTo(x(points[0].dist), H - pad.bottom)
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(x(points[i].dist), y(points[i].z))
    }
    ctx.lineTo(x(points[points.length - 1].dist), H - pad.bottom)
    ctx.closePath()
    ctx.fill()

    // Labels axes
    ctx.fillStyle = '#8B949E'
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(dMax)} m`, pad.left + pw / 2, H - 5)
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(zMin)} m`, pad.left - 5, H - pad.bottom)
    ctx.fillText(`${Math.round(zMax)} m`, pad.left - 5, pad.top + 10)
  }, [points])

  return (
    <div style={{
      position: 'absolute',
      bottom: 'var(--space-3)',
      left: 'var(--space-3)',
      right: 'var(--space-3)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3)',
      zIndex: 999,
      boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--fg-primary)' }}>
          ⛰️ Profil altimétrique (IGN RGE ALTI)
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      <canvas ref={canvasRef} width={600} height={200} style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-md)' }} />
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--fg-muted)' }}>
        {denivele != null && <span>📏 Dénivelé : <strong style={{ color: 'var(--fg-secondary)' }}>{denivele > 0 ? '+' : ''}{denivele} m</strong></span>}
        {penteMax != null && <span>🔴 Pente max : <strong style={{ color: 'var(--accent-alerte)' }}>{penteMax}%</strong></span>}
        {penteMoy != null && <span>🟡 Pente moy : <strong style={{ color: 'var(--accent-ia)' }}>{penteMoy}%</strong></span>}
        <span>📍 Profil : {Math.round(points[points.length - 1].dist)} m</span>
      </div>
    </div>
  )
}
