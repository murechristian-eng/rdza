// Vercel Serverless — Shared Utilities
// Réutilisé par cadastre-alti.ts et urbanisme.ts

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export function geoJsonToWkt(geometry: unknown): string {
  if (typeof geometry === 'string') return geometry
  const gj = geometry as Record<string, unknown>
  const type = gj.type as string
  const coords = gj.coordinates as number[][][]

  function ringToWkt(ring: number[][]): string {
    return (
      '(' +
      ring.map(([lon, lat]) => `${lon} ${lat}`).join(', ') +
      ')'
    )
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
      const polyStrs = polys.map(
        (polyRings) =>
          '(' + polyRings.map(ringToWkt).join(', ') + ')'
      )
      return `MULTIPOLYGON(${polyStrs.join(', ')})`
    }
    default:
      return JSON.stringify(gj)
  }
}
