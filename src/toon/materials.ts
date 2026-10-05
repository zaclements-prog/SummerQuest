import { Color, DataTexture, DoubleSide, FrontSide, MeshToonMaterial, NearestFilter, RedFormat } from 'three'
import type { ColorRepresentation, Side } from 'three'
import { TOON } from './palette'

/**
 * Soft cel shading: a 4-band light ramp (shadow → mid → lit → highlight). The
 * bands are close together, so shading reads as gentle steps rather than hard
 * comic-book contrast.
 */
let gradient: DataTexture | null = null
export function toonGradient(): DataTexture {
  if (!gradient) {
    const data = new Uint8Array([120, 175, 222, 255])
    gradient = new DataTexture(data, data.length, 1, RedFormat)
    gradient.minFilter = NearestFilter
    gradient.magFilter = NearestFilter
    gradient.generateMipmaps = false
    gradient.needsUpdate = true
  }
  return gradient
}

export interface ToonMaterialOpts {
  opacity?: number
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  doubleSide?: boolean
}

const cache = new Map<string, MeshToonMaterial>()

/**
 * A shared MeshToonMaterial for this color + options. Materials are cached and
 * reused across every mesh that asks for the same look — never create them per
 * render. Opacity < 1 makes the material transparent without depth writes (used
 * by building walls that fade when you're inside).
 */
export function toonMaterial(color: ColorRepresentation, opts: ToonMaterialOpts = {}): MeshToonMaterial {
  const opacity = opts.opacity ?? 1
  const key = [
    new Color(color).getHexString(),
    opacity.toFixed(2),
    opts.emissive != null ? new Color(opts.emissive).getHexString() : '',
    (opts.emissiveIntensity ?? 1).toFixed(2),
    opts.doubleSide ? 'd' : '',
  ].join('|')
  let m = cache.get(key)
  if (!m) {
    const side: Side = opts.doubleSide ? DoubleSide : FrontSide
    m = new MeshToonMaterial({
      color,
      gradientMap: toonGradient(),
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 0.5,
      side,
    })
    if (opts.emissive != null) {
      m.emissive = new Color(opts.emissive)
      m.emissiveIntensity = opts.emissiveIntensity ?? 1
    }
    cache.set(key, m)
  }
  return m
}

/** Line work: a thin warm-dark inverted-hull outline (drei <Outlines>). */
export const OUTLINE = {
  color: TOON.outline,
  /** World units; ~2–3 px at the default camera distance. */
  thickness: 0.035,
} as const
