// ─────────────────────────────────────────
// RDZA — Analyse architecturale & pré-faisabilité
// ─────────────────────────────────────────

// Reponse de l'API RDZA Data (Vercel Function)
export interface RDZAAPIResponse {
  adresse: string
  coordonnees: { lon: number; lat: number }
  ville: string
  codePostal: string
  parcelle: string | null
  surface: number | null
  altitude: number | null
  topographiePente: string | null
  zonagePLU: string | null
  orthophotoUrl: string | null
  supData: SUPItem[] | null
  geometry: unknown | null
  pluDocumentUrl: string | null
  pluDocumentType: string | null
  pluDocumentDate: string | null
  note: string | null
  noteReseaux: string | null
  erreur?: string
}

export interface SUPItem {
  type: string
  categorie: string
  description: string
}

export interface ElevationProfilePoint {
  lon: number
  lat: number
  z: number
  dist: number
}

export interface ElevationProfileResult {
  points: ElevationProfilePoint[]
  penteMax: number | null
  penteMoy: number | null
  denivele: number | null
}

export interface RDZAProject {
  // Étape 1 : Saisie
  adresseSite: string
  intentionProjet: IntentionProjet

  // Données automatisables (V1 : saisie manuelle)
  parcelleCadastrale: string
  surfaceTerrain: number | null
  zonagePLU: ZonagePLU
  topographiePente: TopographiePente

  // Données visuelles et réglementaires (V2)
  orthophotoUrl?: string

  // Document PLU (V3.5)
  pluDocumentUrl?: string
  pluDocumentType?: string

  // Lecture architecturale
  contexteUrbain: string
  stationnementAccess: string

  // Croquis d'emprise (V3.5)
  empriseSurface?: number
  empriseGeojson?: unknown

  // Synthèse
  syntheseArchitecte: string
}

export type IntentionProjet =
  | 'logement_collectif'
  | 'maison_individuelle'
  | 'tertiaire'
  | 'mixte'
  | 'equipement_public'
  | 'industriel'
  | 'renovation'
  | 'autre'

export type ZonagePLU =
  | 'U'
  | 'AU'
  | 'A'
  | 'N'
  | 'UH'
  | 'UC'
  | 'UE'
  | 'UZ'
  | 'autre'

export type TopographiePente =
  | 'plat'
  | 'leger'
  | 'moyen'
  | 'fort'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type AppView = 'form' | 'summary' | 'ai'

export const INTENTION_LABELS: Record<IntentionProjet, string> = {
  logement_collectif: '🏢 Logement collectif',
  maison_individuelle: '🏠 Maison individuelle',
  tertiaire: '🏬 Tertiaire / Bureaux',
  mixte: '🏗️ Mixte',
  equipement_public: '🏫 Équipement public',
  industriel: '🏭 Industriel',
  renovation: '🔧 Rénovation',
  autre: '📋 Autre',
}

export const ZONAGE_LABELS: Record<ZonagePLU, string> = {
  U: 'U — Urbain',
  AU: 'AU — À Urbaniser',
  A: 'A — Agricole',
  N: 'N — Naturel',
  UH: 'UH — Urbain Habitat',
  UC: 'UC — Urbain Centre',
  UE: 'UE — Urbain Économique',
  UZ: 'UZ — Urbain Zone',
  autre: '📋 Autre',
}

export const TOPOGRAPHIE_LABELS: Record<TopographiePente, string> = {
  plat: '🟢 Plat (< 3 %)',
  leger: '🟡 Léger (3–8 %)',
  moyen: '🟠 Moyen (8–15 %)',
  fort: '🔴 Fort (> 15 %)',
}
