import { seededRng } from '../../../lib/random'
import { TOON } from '../../../toon/palette'
import type { Part } from '../word-problem-woods/instancing'

const CORAL_COLORS = [TOON.flowerPink, TOON.coral, TOON.lilac, TOON.flowerYellow, TOON.mint, '#ff7fb6', TOON.flowerPurple]

/**
 * One candy-colored coral cluster at (x, y, z), size `k`, deterministic from
 * `seed`: branchy fingers (for a unit capsule geometry, radius 0.5, length 1)
 * and round brain / flat fan coral (for a unit blob). Appends to the lists.
 */
export function coralCluster(x: number, y: number, z: number, k: number, seed: string, fingers: Part[], blobs: Part[]): void {
  const r = seededRng(seed)
  const c1 = CORAL_COLORS[Math.floor(r() * CORAL_COLORS.length)]
  const c2 = CORAL_COLORS[Math.floor(r() * CORAL_COLORS.length)]
  const n = 3 + Math.floor(r() * 3)
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2
    const tilt = 0.15 + r() * 0.45
    const h = (0.5 + r() * 0.45) * k
    const d = r() * 0.22 * k
    const lean = Math.sin(tilt) * h * 0.45
    fingers.push({
      p: [x + Math.cos(a) * (d + lean), y + Math.cos(tilt) * h * 0.45, z + Math.sin(a) * (d + lean)],
      r: [0, -a, -tilt],
      s: [0.2 * k, 0.5 * h, 0.2 * k],
      c: i % 2 ? c1 : c2,
    })
  }
  blobs.push({ p: [x + (r() - 0.5) * 0.4 * k, y + 0.1 * k, z + (r() - 0.5) * 0.4 * k], s: [0.26 * k, 0.2 * k, 0.26 * k], r: [0, r() * 6, 0], c: c2 })
  if (r() < 0.6) {
    const a = r() * Math.PI * 2
    blobs.push({ p: [x + Math.cos(a) * 0.35 * k, y + 0.3 * k, z + Math.sin(a) * 0.35 * k], s: [0.3 * k, 0.32 * k, 0.06 * k], r: [0, a, 0], c: c1 })
  }
}
