import { useState, useRef, useEffect } from 'react'
import type { RDZAProject, IntentionProjet, ZonagePLU, TopographiePente, RDZAAPIResponse } from '../types'
import { INTENTION_LABELS, ZONAGE_LABELS, TOPOGRAPHIE_LABELS } from '../types'

interface Props {
  project: RDZAProject
  onChange: (p: RDZAProject) => void
}

type FetchStatus = 'idle' | 'loading' | 'full' | 'partial' | 'error'

export function RDZAForm({ project, onChange }: Props) {
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [fetchMessage, setFetchMessage] = useState<string | null>(null)
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())
  const [geoInfo, setGeoInfo] = useState<{ ville: string; codePostal: string; altitude: number | null } | null>(null)
  const [orthophotoUrl, setOrthophotoUrl] = useState<string | null>(null)
  const [supCount, setSupCount] = useState<number | null>(null)
  const [supList, setSupList] = useState<{ type: string; categorie: string; description: string }[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = <K extends keyof RDZAProject>(key: K, value: RDZAProject[K]) => {
    onChange({ ...project, [key]: value })
  }

  const filledCount = [
    project.syntheseArchitecte,
    project.adresseSite,
    project.parcelleCadastrale,
    project.contexteUrbain,
    project.stationnementAccess,
  ].filter(Boolean).length + (project.surfaceTerrain != null ? 1 : 0)

  const fetchData = async () => {
    if (!project.adresseSite.trim()) {
      setFetchStatus('error')
      setFetchMessage('Saisissez une adresse avant de lancer la recherche.')
      return
    }
    if (abortRef.current) abortRef.current.abort()
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const controller = new AbortController()
    abortRef.current = controller

    setFetchStatus('loading')
    setFetchMessage(null)
    setGeoInfo(null)
    setOrthophotoUrl(null)
    setSupCount(null)
    try {
      const res = await fetch('/api/rdza-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresse: project.adresseSite.trim() }),
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      const data: RDZAAPIResponse = await res.json()
      if (abortRef.current !== controller) return
      if (!res.ok || data.erreur) {
        setFetchStatus('error')
        setFetchMessage(data.erreur || 'Erreur lors de la récupération des données.')
        return
      }
      const filled = new Set<string>()
      const updates: Partial<RDZAProject> = {}
      if (data.parcelle) {
        updates.parcelleCadastrale = data.parcelle
        filled.add('parcelleCadastrale')
      }
      if (data.surface != null) {
        updates.surfaceTerrain = data.surface
        filled.add('surfaceTerrain')
      }
      if (data.altitude != null) {
        filled.add('altitude')
      }
      if (data.zonagePLU && (Object.keys(ZONAGE_LABELS) as string[]).includes(data.zonagePLU)) {
        updates.zonagePLU = data.zonagePLU as ZonagePLU
        filled.add('zonagePLU')
      }
      if (data.orthophotoUrl) {
        updates.orthophotoUrl = data.orthophotoUrl
      }
      onChange({ ...project, ...updates })
      setAutoFilled(filled)
      setGeoInfo({
        ville: data.ville || '',
        codePostal: data.codePostal || '',
        altitude: data.altitude,
      })
      setOrthophotoUrl(data.orthophotoUrl)
      setSupCount(data.supData?.length ?? null)
      setSupList(data.supData?.length ? data.supData : null)
      if (filled.size === 0) {
        setFetchStatus('partial')
        setFetchMessage('Géocodage réussi, mais aucune donnée cadastrale ou PLU trouvée pour cette adresse.')
      } else if (filled.size < 2) {
        setFetchStatus('partial')
        setFetchMessage('Données partiellement récupérées. Complétez les champs manquants.')
      } else {
        setFetchStatus('full')
        setFetchMessage('Données récupérées avec succès !')
      }
      timerRef.current = setTimeout(() => { setFetchMessage(null); timerRef.current = null }, 8000)
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setFetchStatus('error')
      setFetchMessage('Impossible de contacter le service. Vérifiez votre connexion.')
    }
  }

  const handleAdresseChange = (value: string) => {
    if (value !== project.adresseSite) {
      setFetchStatus('idle')
      setFetchMessage(null)
      setAutoFilled(new Set())
      setGeoInfo(null)
      setOrthophotoUrl(null)
      setSupCount(null)
      onChange({
        ...project,
        adresseSite: value,
        parcelleCadastrale: '',
        surfaceTerrain: null,
        zonagePLU: 'U',
      })
      return
    }
    set('adresseSite', value)
  }

  const isAuto = (field: string) => autoFilled.has(field)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return (
    <div>
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-pill available">
          {filledCount}/6 champs textuels remplis
        </div>
        <div className="stat-pill degraded">
          Méthode RDZA
        </div>
        {fetchStatus !== 'idle' && (
          <div className={`stat-pill ${
            fetchStatus === 'error' ? 'error' : fetchStatus === 'partial' ? 'warning' : 'healthy'
          }`}>
            {fetchStatus === 'loading' && 'Recherche en cours...'}
            {fetchStatus === 'full' && 'Données récupérées'}
            {fetchStatus === 'partial' && 'Partiellement rempli'}
            {fetchStatus === 'error' && 'Erreur'}
          </div>
        )}
        {geoInfo && (
          <div className="stat-pill available">
            📍 {geoInfo.ville} {geoInfo.codePostal}
          </div>
        )}
        {supCount != null && supCount > 0 && (
          <div className="stat-pill warning">
            ⚠️ {supCount} servitude{supCount > 1 ? 's' : ''} SUP
          </div>
        )}
      </div>

      {supList && supList.length > 0 && (
        <div className="form-card" style={{ marginBottom: 16, padding: 12 }}>
          <h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 8 }}>⚠️ Servitudes d&apos;Utilité Publique (SUP)</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--font-size-sm)' }}>
            {supList.map((s, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>{s.type || s.categorie}</strong>
                {s.description ? `: ${s.description}` : ''}
              </li>
            ))}
          </ul>
          <small className="form-hint" style={{ marginTop: 8, display: 'block' }}>
            📡 Source : IGN API Carto GPU — Ces servitudes impactent la constructibilité.
          </small>
        </div>
      )}

      {fetchMessage && (
        <div className={`fetch-banner ${fetchStatus}`}>
          {fetchMessage}
        </div>
      )}

      <div className="form-card">
        <h2 className="section-title">1. Identification du site</h2>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Adresse du site *</label>
            <div className="input-with-button">
              <input
                className="form-input"
                type="text"
                value={project.adresseSite}
                onChange={e => handleAdresseChange(e.target.value)}
                placeholder="Ex: 12 rue de Rivoli, 75001 Paris"
              />
              <button
                className={`btn btn-sm fetch-btn ${fetchStatus === 'loading' ? 'loading' : ''}`}
                onClick={fetchData}
                disabled={fetchStatus === 'loading' || !project.adresseSite.trim()}
                title="Récupérer les données publiques (cadastre, PLU, orthophoto, SUP) à partir de l'adresse"
              >
                {fetchStatus === 'loading' ? 'Recherche...' : 'Récupérer'}
              </button>
            </div>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Intention de projet</label>
            <select
              className="form-select"
              value={project.intentionProjet}
              onChange={e => set('intentionProjet', e.target.value as IntentionProjet)}
            >
              {(Object.keys(INTENTION_LABELS) as IntentionProjet[]).map(k => (
                <option key={k} value={k}>{INTENTION_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="section-title">2. Données cadastrales et géographiques</h2>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              {isAuto('parcelleCadastrale') && <span className="auto-badge">🛰️ API</span>}
              Parcelle cadastrale
            </label>
            <input
              className={`form-input ${isAuto('parcelleCadastrale') ? 'auto-filled' : ''}`}
              type="text"
              value={project.parcelleCadastrale}
              onChange={e => set('parcelleCadastrale', e.target.value)}
              placeholder="Ex: 000 AB 123"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              {isAuto('surfaceTerrain') && <span className="auto-badge">🛰️ API</span>}
              Surface terrain (m²)
            </label>
            <input
              className={`form-input ${isAuto('surfaceTerrain') ? 'auto-filled' : ''}`}
              type="number"
              value={project.surfaceTerrain ?? ''}
              onChange={e => set('surfaceTerrain', e.target.value ? Number(e.target.value) : null)}
              placeholder="Ex: 850"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              {isAuto('zonagePLU') && <span className="auto-badge">🛰️ API</span>}
              Zonage PLU
            </label>
            <select
              className={`form-select ${isAuto('zonagePLU') ? 'auto-filled' : ''}`}
              value={project.zonagePLU}
              onChange={e => set('zonagePLU', e.target.value as ZonagePLU)}
            >
              {(Object.keys(ZONAGE_LABELS) as ZonagePLU[]).map(k => (
                <option key={k} value={k}>{ZONAGE_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Topographie / Pente</label>
            <select
              className="form-select"
              value={project.topographiePente}
              onChange={e => set('topographiePente', e.target.value as TopographiePente)}
            >
              {(Object.keys(TOPOGRAPHIE_LABELS) as TopographiePente[]).map(k => (
                <option key={k} value={k}>{TOPOGRAPHIE_LABELS[k]}</option>
              ))}
            </select>
            {isAuto('altitude') && geoInfo?.altitude != null && (
              <small className="form-hint">
                ⛰️ Altitude : {Math.round(geoInfo.altitude)} m (IGN RGE ALTI)
              </small>
            )}
            {!isAuto('altitude') && (
              <small className="form-hint">
                La pente sera calculée automatiquement en V3 via le profil altimétrique IGN.
              </small>
            )}
          </div>
        </div>

        {/* Orthophoto IGN */}
        {orthophotoUrl && (
          <div className="orthophoto-section" style={{ marginTop: 16, marginBottom: 8 }}>
            <label className="form-label">
              <span className="auto-badge">🛰️ API</span>
              Orthophoto IGN
            </label>
            <img
              src={orthophotoUrl}
              alt="Orthophoto IGN du site"
              className="orthophoto-img"
              onError={(e) => {
                const target = e.currentTarget as HTMLElement
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = 'block'
              }}
              style={{
                width: '100%',
                maxHeight: 300,
                objectFit: 'cover',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
              }}
            />
            <div style={{ display: 'none', padding: '20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 'var(--font-size-sm)' }}>
              📡 Orthophoto IGN non disponible pour cette zone.
            </div>
            <small className="form-hint" style={{ marginTop: 4 }}>
              📡 Orthophotographie aérienne IGN — Géoportail WMS
            </small>
          </div>
        )}

        <h2 className="section-title">3. Lecture architecturale</h2>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Contexte urbain et typologies</label>
            <textarea
              className="form-textarea"
              value={project.contexteUrbain}
              onChange={e => set('contexteUrbain', e.target.value)}
              placeholder="Décrivez le tissu urbain environnant, les gabarits, les typologies bâties, les alignements..."
              rows={3}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Stationnement et accessibilité</label>
            <textarea
              className="form-textarea"
              value={project.stationnementAccess}
              onChange={e => set('stationnementAccess', e.target.value)}
              placeholder="Stationnement existant, accès véhicules, transports en commun, dessertes..."
              rows={3}
            />
          </div>
        </div>

        <h2 className="section-title">4. Synthèse architecte</h2>
        <div className="form-group">
          <label className="form-label">
            Synthèse et interprétation RDZA
            <span className="field-counter">{project.syntheseArchitecte ? '✓ Rempli' : 'En attente'}</span>
          </label>
          <textarea
            className="form-textarea"
            value={project.syntheseArchitecte}
            onChange={e => set('syntheseArchitecte', e.target.value)}
            placeholder="Votre lecture globale du site : potentiel, contraintes, premières orientations programme, points de vigilance..."
            rows={4}
            style={{ minHeight: 120, fontSize: 'var(--font-size-base)' }}
          />
        </div>
      </div>

      <div className="info-banner">
        <strong>🛰️ Méthode RDZA</strong> — Les données sont récupérées automatiquement
        via les API publiques françaises (data.geopf.fr, apicarto.ign.fr) :
        géocodage, cadastre, urbanisme (PLU), altimétrie, orthophoto IGN et servitudes SUP.
        <br />
        <small>⚠️ Les réseaux enterrés (gaz, électricité, eau, télécom) ne sont pas accessibles via API publique.
        Une déclaration DT-DICT est obligatoire sur reseaux-et-canalisations.ineris.fr.</small>
      </div>
    </div>
  )
}
