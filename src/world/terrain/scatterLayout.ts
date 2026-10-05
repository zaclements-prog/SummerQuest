import { seededRng } from '../../lib/random'
import { TOON } from '../../toon/palette'
import type { InstanceSpec, TreeSpot } from '../../toon/Scatter'
import { scatterClear } from '../worldLayout'

/**
 * Deterministic island-wide decor between the destinations: groves of trees that
 * thicken toward the coast (pines up north, blossom trees in the sunny south),
 * bushes, rocks, flower dots and grass tufts — all instanced, all kept off the
 * paths, river, town and areas by `scatterClear`.
 */
export function buildScatter(seed = 'island-v1') {
  const r = seededRng(seed)
  const trees: TreeSpot[] = []
  const bushes: InstanceSpec[] = []
  const rocks: InstanceSpec[] = []
  const flowers: InstanceSpec[] = []
  const tufts: InstanceSpec[] = []
  const STEP = 2.1
  for (let gx = -36; gx <= 36; gx += STEP) {
    for (let gz = -36; gz <= 36; gz += STEP) {
      const x = gx + (r() - 0.5) * STEP * 0.9
      const z = gz + (r() - 0.5) * STEP * 0.9
      const dist = Math.hypot(x, z)
      const roll = r()
      if (!scatterClear(x, z)) continue
      // groves thicken toward the coast; the open middle stays meadow
      const treeChance = dist > 25 ? 0.55 : dist > 19 ? 0.28 : 0.1
      if (roll < treeChance && scatterClear(x, z, 0.6)) {
        const kind: TreeSpot['kind'] = z < -18 ? (r() < 0.7 ? 'pine' : 'round') : z > 14 && r() < 0.35 ? 'blossom' : r() < 0.15 ? 'pine' : 'round'
        trees.push({ x, z, scale: 0.85 + r() * 0.45, kind, seed: Math.floor(r() * 1e6) })
      } else if (roll < treeChance + 0.12) {
        const s = 0.32 + r() * 0.22
        const rot = r() * 6
        bushes.push({ x, y: s * 0.75, z, s: [s * 1.3, s, s * 1.1], rot, color: r() < 0.5 ? TOON.leaf : TOON.leafDark })
        bushes.push({ x: x + 0.35, y: s * 0.6, z: z + 0.15, s: s * 0.8, rot, color: TOON.leafLight })
      } else if (roll < treeChance + 0.17) {
        const s = 0.25 + r() * 0.3
        rocks.push({ x, y: s * 0.35, z, s: [s * 1.3, s * 0.7, s], rot: r() * 6, color: r() < 0.5 ? TOON.rock : TOON.rockLight })
      } else if (roll < treeChance + 0.32) {
        const colors = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerPink, TOON.flowerWhite, TOON.flowerPurple, TOON.flowerBlue]
        const c = colors[Math.floor(r() * colors.length)]
        for (let i = 0; i < 4; i++) {
          flowers.push({ x: x + (r() - 0.5) * 1.2, y: 0.14, z: z + (r() - 0.5) * 1.2, s: 0.075, color: c })
        }
      } else if (roll < treeChance + 0.5) {
        tufts.push({ x, y: 0.12, z, s: [0.07, 0.26, 0.07], rot: r() * 6, color: r() < 0.5 ? TOON.grassDark : TOON.leafDark })
      }
    }
  }
  return { trees, bushes, rocks, flowers, tufts }
}
