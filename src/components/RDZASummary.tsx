import { useMemo } from 'react'
import type { RDZAProject } from '../types'
import { INTENTION_LABELS, ZONAGE_LABELS, TOPOGRAPHIE_LABELS } from '../types'

interface Props {
  project: RDZAProject
  onReset: () => void
}

function printPDF() {
  window.print()
}

function autoGenerateRisques(project: RDZAProject): string {
  const warnings: string[] = []
  if (project.zonagePLU !== 'U') warnings.push(`Zonage ${ZONAGE_LABELS[project.zonagePLU]} — vérifier les contraintes du règlement de zone`)
  if (project.topographiePente === 'fort') warnings.push('Pente forte (>15%) — étude géotechnique recommandée')
  if (project.topographiePente === 'moyen') warnings.push('Pente moyenne (8-15%) — vérifier l\'impact sur les fondations')
  if (project.topographiePente === 'leger') warnings.push('Pente légère (3-8%) — contrainte modérée')
  if (!project.parcelleCadastrale) warnings.push('Parcelle non identifiée — vérifier le cadastre')
  if (!warnings.length) warnings.push('Aucun risque majeur identifié avec les données disponibles.')
  return warnings.join('\n')
}

function autoGeneratePotentiel(project: RDZAProject): string {
  const points: string[] = []
  if (project.zonagePLU === 'U' || project.zonagePLU === 'UH' || project.zonagePLU === 'UC') {
    points.push('Zone urbaine — droits à construire généralement favorables')
  }
  if (project.surfaceTerrain) {
    if (project.surfaceTerrain < 500) {
      points.push(`Petite parcelle (${project.surfaceTerrain} m²) — potentiel limité. Vérifier les prospects et gabarits.`)
    } else if (project.surfaceTerrain < 2000) {
      points.push(`Parcelle moyenne (${project.surfaceTerrain} m²) — opération réalisable sous réserve du règlement PLU.`)
    } else {
      points.push(`Grande parcelle (${project.surfaceTerrain} m²) — fort potentiel opérationnel. Vérifier les OAP sectorielles.`)
    }
  } else {
    points.push('Surface non renseignée — potentiel non évaluable.')
  }
  if (!points.length) points.push('Analyse du potentiel à compléter avec les données cadastrales.')
  return points.join('\n')
}

// Sous-composants internes
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="summary-section">
      <h3 className="summary-section-title">
        <span className="summary-icon">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, value, auto }: { label: string; value: string; auto?: boolean }) {
  return (
    <div className="summary-field">
      <span className="summary-field-label">{label}</span>
      <span className={`summary-field-value ${auto ? 'auto-generated' : ''}`}>
        {auto && <span className="auto-badge">🤖</span>}
        {value || '—'}
      </span>
    </div>
  )
}

export function RDZASummary({ project, onReset }: Props) {
  const completeness = useMemo(() => {
    const fields = [
      project.adresseSite,
      project.parcelleCadastrale,
      project.surfaceTerrain,
      project.contexteUrbain,
      project.stationnementAccess,
      project.syntheseArchitecte,
    ]
    const filled = fields.filter(Boolean).length
    return { filled, total: 9, pct: Math.round((filled / 9) * 100) }
  }, [project])

  const hasAdresse = project.adresseSite.trim().length > 0

  if (!hasAdresse) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--fg-muted)' }}>
          📋 Aucune adresse saisie.
        </p>
        <p style={{ color: 'var(--fg-muted)' }}>
          Remplissez le formulaire d'étude pour générer la fiche de synthèse.
        </p>
      </div>
    )
  }

  const risques = autoGenerateRisques(project)
  const potentiel = autoGeneratePotentiel(project)

  return (
    <div id="rdza-fiche">
      <div className="form-card">
        <div className="summary-header">
          <h2>🏛️ Fiche de synthèse RDZA</h2>
          <div className="summary-actions">
            <button className="btn btn-sm" onClick={printPDF}>🖨️ Imprimer / PDF</button>
            <button className="btn btn-sm" onClick={onReset}>🔄 Nouveau projet</button>
          </div>
        </div>

        <div className="stats-row" style={{ marginBottom: 24 }}>
          <div className="stat-pill healthy">{completeness.pct}% complet</div>
          <div className="stat-pill available">{completeness.filled}/{completeness.total} champs</div>
          <div className="stat-pill degraded">Méthode RDZA</div>
        </div>

        {/* 1. Identification */}
        <Section title="1. Identification du site" icon="📍">
          <Field label="Adresse" value={project.adresseSite} />
          <Field label="Intention de projet" value={INTENTION_LABELS[project.intentionProjet]} />
        </Section>

        {/* 2. Géographie et topographie */}
        <Section title="2. Géographie et topographie" icon="🗺️">
          <Field label="Parcelle cadastrale" value={project.parcelleCadastrale} />
          <Field label="Surface terrain" value={project.surfaceTerrain ? `${project.surfaceTerrain} m²` : ''} />
          <Field label="Zonage PLU" value={ZONAGE_LABELS[project.zonagePLU]} />
          <Field label="Topographie / Pente" value={TOPOGRAPHIE_LABELS[project.topographiePente]} />
        </Section>

        {/* 2bis. Orthophoto IGN */}
        {project.orthophotoUrl && (
          <Section title="2bis. Orthophoto IGN" icon="📡">
            <div className="summary-field">
              <img
                src={project.orthophotoUrl}
                alt="Orthophoto IGN"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
              />
            </div>
          </Section>
        )}

        {/* 3. Contexte urbain */}
        <Section title="3. Contexte urbain et typologies" icon="🏘️">
          <Field label="Contexte" value={project.contexteUrbain} />
        </Section>

        {/* 4. Stationnement */}
        <Section title="4. Stationnement et accessibilité" icon="🚗">
          <Field label="Accès et stationnement" value={project.stationnementAccess} />
        </Section>

        {/* 5. Potentiel opérationnel (auto-généré) */}
        <Section title="5. Potentiel opérationnel" icon="📐">
          <Field label="Analyse" value={potentiel} auto />
        </Section>

        {/* 6. Risques (auto-généré) */}
        <Section title="6. Risques et vigilance administrative" icon="⚠️">
          <Field label="Points de vigilance" value={risques} auto />
        </Section>

        {/* 6bis. Servitudes d'Utilité Publique */}
        <Section title="6bis. Servitudes (SUP)" icon="⚠️">
          <Field label="Note" value="Les servitudes d'utilité publique sont consultables dans l'onglet Étude après récupération des données. Elles impactent la constructibilité du site." auto />
        </Section>

        {/* 7. Synthèse architecte */}
        <Section title="7. Synthèse architecte" icon="✍️">
          <Field label="Interprétation" value={project.syntheseArchitecte} />
        </Section>

                      {project.empriseSurface && (
                <div className="summary-section">
                  <div className="summary-section-title">
                    <span className="summary-icon">✏️</span> 2ter. Croquis d'emprise
                  </div>
                  <div className="summary-field">
                    <span className="summary-field-label">Surface emprise au sol</span>
                    <span className="summary-field-value">{project.empriseSurface} m²</span>
                  </div>
                  {project.surfaceTerrain && (
                    <div className="summary-field">
                      <span className="summary-field-label">Ratio emprise/sol</span>
                      <span className="summary-field-value">{((project.empriseSurface / project.surfaceTerrain) * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}
        <div className="summary-footer">
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--fg-muted)' }}>
            Fiche générée le {new Date().toLocaleDateString('fr-FR')} — Méthode RDZA v2.1
          </p>
        </div>
      </div>
    </div>

  )
}
