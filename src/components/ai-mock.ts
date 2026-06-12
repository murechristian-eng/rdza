import type { RDZAProject } from '../types'
import { INTENTION_LABELS, ZONAGE_LABELS, TOPOGRAPHIE_LABELS } from '../types'

export function mockArchitecturalResponse(prompt: string, project: RDZAProject): string {
  const lower = prompt.toLowerCase()
  const z = project.zonagePLU
  const surf = project.surfaceTerrain
  const zLabel = ZONAGE_LABELS[z]
  const addr = project.adresseSite || 'Site'

  if (lower.includes('zonage') || lower.includes('plu')) {
    return mockZonage(z, zLabel)
  }

  if (lower.includes('potentiel') || lower.includes('opérationnel')) {
    return mockPotentiel(surf, z, zLabel, project)
  }

  if (lower.includes('synthèse') || lower.includes('rédiger')) {
    return mockSynthese(addr, project, surf, z, zLabel)
  }

  return mockDefault(addr)
}

function mockZonage(z: string, zLabel: string): string {
  const analyses: Record<string, { analyse: string; source: string }> = {
    U: {
      analyse: "Zone urbaine — droits à construire généralement favorables. Vérifier le règlement de zone pour les hauteurs maximales (articles R.111-17 et suivants du Code de l'urbanisme), les prospects, et le COS/emprise au sol.",
      source: "Code de l'urbanisme — articles R.111-1 à R.111-53 (règles générales d'urbanisme). ⚠️ Le règlement spécifique de la commune doit être consulté sur le Géoportail de l'Urbanisme (geoportail-urbanisme.gouv.fr).",
    },
    UH: {
      analyse: "Zone urbaine à dominante habitat — constructibilité favorable pour du logement. Vérifier les hauteurs (souvent R+2 à R+4 en UH), les retraits par rapport aux limites séparatives, et les obligations de stationnement.",
      source: "Code de l'urbanisme — articles R.111-17 (hauteur) et R.111-19 (prospects). ⚠️ Consulter le règlement de zone UH du PLU communal sur le Géoportail de l'Urbanisme.",
    },
    AU: {
      analyse: "Zone à urbaniser — soumise à procédure (modification/révision PLU ou projet urbain partenarial). Vérifier si la zone est ouverte à l'urbanisation (AU « ouverte » ou « fermée »). Les droits à construire dépendent de l'OAP (Orientation d'Aménagement et de Programmation).",
      source: "Code de l'urbanisme — articles L.151-1 et suivants (PLU) et L.151-6 (OAP). ⚠️ Vérifier le statut exact de la zone AU auprès du service urbanisme communal.",
    },
    A: {
      analyse: "Zone agricole — constructibilité très limitée, réservée aux exploitations agricoles et aux STECAL (Secteurs de Taille Et de Capacité d'Accueil Limitées).",
      source: "Code de l'urbanisme — article L.151-11 (zone A) et L.151-13 (STECAL). ⚠️ Toute construction non agricole nécessite une dérogation ou une modification du PLU.",
    },
    N: {
      analyse: "Zone naturelle — constructibilité quasi nulle, sauf exceptions listées au règlement (équipements publics, aménagements légers).",
      source: "Code de l'urbanisme — article L.151-12 (zone N). ⚠️ Toute construction est soumise à une justification stricte de son intégration environnementale.",
    },
  }

  const entry = analyses[z]
  if (!entry) {
    return `[INTERPRÉTATION]
Vérifier le règlement de zone pour les contraintes spécifiques. Consulter le PLU communal pour les règles de hauteur, prospect, emprise au sol et stationnement.

Points de vigilance complémentaires :
• Vérifier les servitudes d'utilité publique (SUP) applicables
• Consulter le règlement écrit ET graphique du PLU
• Vérifier si une OAP s'applique sur le secteur
• Contrôler les risques naturels (PPRI, cavités) sur Géorisques (georisques.gouv.fr)

[SOURCE]
⚠️ Avis indicatif — consulter le service urbanisme de la commune et le Géoportail de l'Urbanisme pour le règlement exact.

[CONFIANCE]
🟡 Modérée (50-80%) — L'analyse s'appuie sur les principes généraux du Code de l'urbanisme (${zLabel}). Le règlement spécifique du PLU communal peut contenir des dispositions particulières.`
  }

  return `[INTERPRÉTATION]
${entry.analyse}

Points de vigilance complémentaires :
• Vérifier les servitudes d'utilité publique (SUP) applicables
• Consulter le règlement écrit ET graphique du PLU
• Vérifier si une OAP s'applique sur le secteur
• Contrôler les risques naturels (PPRI, cavités) sur Géorisques (georisques.gouv.fr)

[SOURCE]
${entry.source}

[CONFIANCE]
🟡 Modérée (50-80%) — L'analyse s'appuie sur les principes généraux du Code de l'urbanisme (${zLabel}). Le règlement spécifique du PLU communal peut contenir des dispositions particulières. Consulter le document d'urbanisme officiel pour confirmer.`
}

function mockPotentiel(surf: number | null, z: string, zLabel: string, project: RDZAProject): string {
  let analyseSurf = 'Surface non renseignée.'
  if (surf && surf > 2000) analyseSurf = "Grande emprise (>2000 m²) — potentiel de découpage parcellaire ou opération d'ensemble. Permet des programmes mixtes ou plusieurs bâtiments."
  else if (surf && surf > 500) analyseSurf = "Emprise moyenne (500-2000 m²) — projet possible avec optimisation de l'implantation. Vérifier les prospects pour maximiser la constructibilité."
  else if (surf) analyseSurf = "Petite emprise (<500 m²) — vérifier les prospects minimums et les hauteurs autorisées. Optimiser l'implantation au plus près des limites autorisées."

  return `[INTERPRÉTATION]
${analyseSurf}

Croisement réglementaire :
• Intention : ${INTENTION_LABELS[project.intentionProjet]}
• Zonage : ${zLabel}
• Topographie : ${TOPOGRAPHIE_LABELS[project.topographiePente]}
• Surface : ${surf ? surf + ' m²' : 'Non renseignée'}

Compatibilité intention × zonage : ${z === 'U' || z === 'UH' || z === 'UC' ? '✅ Favorable — le zonage urbain permet ce type de programme.' : z === 'AU' ? '🟡 Conditionnelle — vérifier l\'ouverture à l\'urbanisation.' : '🔴 Défavorable — le zonage limite fortement ce type de programme.'}

Points de blocage potentiels :
• Servitudes d'utilité publique (réseaux, monuments historiques, etc.)
• Risques naturels (inondation, retrait-gonflement des argiles, cavités)
• Prescriptions architecturales ou patrimoniales (ABF, site inscrit/classé)
• ${project.topographiePente === 'fort' ? '🔴 Pente forte : étude géotechnique recommandée, surcoût fondations.' : '🟢 Topographie compatible.'}

[SOURCE]
Code de l'urbanisme — articles L.151-1 et suivants (PLU/Zonage). Guide de la constructibilité — Ministère de la Transition Écologique. ⚠️ Analyse indicative — le règlement communal prime.

[CONFIANCE]
🟡 Modérée (50-80%) — L'analyse croise les données disponibles (surface, zonage, topographie) mais le potentiel réel dépend du règlement de zone spécifique et des servitudes locales.`
}

function mockSynthese(addr: string, project: RDZAProject, surf: number | null, z: string, zLabel: string): string {
  return `[INTERPRÉTATION]
Projet de synthèse architecte RDZA pour le site ${addr}.

Programme : ${INTENTION_LABELS[project.intentionProjet]}
Surface terrain : ${surf ? surf + ' m²' : 'À renseigner'}
Zonage : ${zLabel}
Topographie : ${TOPOGRAPHIE_LABELS[project.topographiePente]}

Cohérence urbaine : ${project.contexteUrbain
  ? "Le projet s'inscrit dans un contexte " + project.contexteUrbain.slice(0, 120) + '...'
  : "À évaluer sur site (relevé du bâti environnant, hauteurs, gabarits, matériaux)."}

Potentiel : ${z === 'U' || z === 'UH' || z === 'UC'
  ? "✅ Favorable — zone urbaine constructible. Vérifier les règles de hauteur et prospects pour optimiser l'emprise."
  : '🟡 À vérifier selon les contraintes de zonage et le règlement communal.'}

Stratégie proposée :
1. Consulter le règlement écrit et graphique du PLU
2. Réaliser un relevé topographique précis si pente > 5%
3. Vérifier les servitudes (SUP) et réseaux (DT-DICT obligatoire)
4. Étudier l'insertion dans le gabarit urbain environnant

[SOURCE]
Méthode RDZA — Analyse architecturale standardisée. ⚠️ La synthèse définitive nécessite une visite de site et la consultation des documents d'urbanisme officiels.

[CONFIANCE]
🟡 Modérée (50-80%) — Synthèse basée sur les données disponibles. La visite de site et la consultation du PLU communal sont indispensables pour finaliser l'analyse.`
}

function mockDefault(addr: string): string {
  return `[INTERPRÉTATION]
Je suis RDZA, votre co-pilote architectural. Pour le site « ${addr} », je suis prêt à vous assister sur :
• L'analyse du zonage PLU et des droits à construire
• L'évaluation du potentiel opérationnel
• La rédaction d'une synthèse architecte structurée
• L'identification des risques et points de vigilance

Remplissez d'abord les champs dans l'onglet Étude, puis utilisez les boutons d'action rapide ou posez-moi une question.

[SOURCE]
Méthode RDZA — outil d'analyse architecturale et de pré-faisabilité.

[CONFIANCE]
🟢 Élevée (>80%) — Assistance générale sans analyse réglementaire spécifique.`
}
