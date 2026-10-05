/**
 * Word Problem Woods — cozy forest clearing gateway
 *
 * Center: (-12, -8) world xz.  NPC at (-12, -5.5) world xz.
 * Trees: see woodsTrees.ts (each one is also a collider).
 *
 * Approach: player walks north from the house, enters from the south
 * (positive-z direction in world space), so the path opens from z≈-5.5
 * down to z≈-6.5 and the clearing fans out beyond.  NPC sits at the
 * clearing's heart (slight north of center) so it's the first thing your
 * eye finds after you step through the tree ring.
 */

import type { RefObject } from 'react'
import { Vector3 } from 'three'
import { Sparkles } from '@react-three/drei'
import Npc from '../Npc'
import { areaById } from '../worldLayout'
import { WOODS_TREES } from './woodsTrees'
import {
  VoxTree,
  Bush,
  Fern,
  FlowerPatch,
  Mushroom,
  Rock,
  Boulder,
  Log,
  Lantern,
  Signpost,
} from '../voxel/props'
import { Scatter } from '../voxel/Vox'
import { field } from '../voxel/fields'
import { PALETTE } from '../voxel/palette'

// ── Grass-tuft scatter items (clearing floor) ────────────────────────────────
// Centered on clearing center, avoid the entrance corridor (z > -6.5)
const GRASS_ITEMS = field([-12, -9.5], 5, 3.5, 52, 77, {
  y: 0,
  minScale: 0.6,
  maxScale: 1.1,
})

// Sparse flower dots scattered through clearing
const FLOWER_ITEMS = field([-12, -9.5], 4.5, 3.0, 28, 113, {
  y: 0,
  minScale: 0.5,
  maxScale: 0.9,
})

// A second flower color layer (pinks / purples)
const FLOWER_ITEMS_2 = field([-12, -9.2], 4.2, 2.8, 20, 137, {
  y: 0,
  minScale: 0.45,
  maxScale: 0.85,
})

export default function WordProblemWoods({ posRef }: { posRef: RefObject<Vector3> }) {
  const a = areaById('word-problem-woods')!
  const npc = a.npc!
  // World position of the NPC
  const npcX = a.worldPos[0] + npc.offset[0]  // -12
  const npcZ = a.worldPos[1] + npc.offset[1]  // -5.5

  return (
    <group>
      {/* ────────────────────────────────────────────────────────────────────
          RING OF TREES — dense varied ring around the clearing.
          The south gap (z ≈ -5.5 to -6.5) is intentionally left open as the
          entrance path. Every tree is solid: positions live in woodsTrees.ts,
          which also generates the colliders in worldLayout.ts.
      ──────────────────────────────────────────────────────────────────── */}
      {WOODS_TREES.map((t) => (
        <VoxTree key={t.seed} position={[t.pos[0], 0, t.pos[1]]} variant={t.variant} seed={t.seed} />
      ))}

      {/* ────────────────────────────────────────────────────────────────────
          UNDERGROWTH RING — bushes, ferns, mushrooms between the trees
      ──────────────────────────────────────────────────────────────────── */}

      {/* West side undergrowth */}
      <Bush      position={[-15.5, 0, -8.5]}  seed={101} />
      <Fern      position={[-14.5, 0, -7.5]}  seed={102} />
      <Mushroom  position={[-15.0, 0, -9.5]}  seed={103} />
      <Bush      position={[-16.0, 0, -10.5]} seed={104} />
      <Fern      position={[-13.5, 0, -11.5]} seed={105} />

      {/* East side undergrowth */}
      <Bush      position={[-8.5,  0, -8.0]}  seed={111} />
      <Fern      position={[-9.0,  0, -7.0]}  seed={112} />
      <Mushroom  position={[-8.0,  0, -10.0]} seed={113} />
      <Bush      position={[-7.5,  0, -6.5]}  seed={114} />
      <Fern      position={[-9.5,  0, -10.5]} seed={115} />

      {/* North side undergrowth (behind clearing, away from path) */}
      <Bush      position={[-11.5, 0, -12.5]} seed={121} />
      <Fern      position={[-13.0, 0, -12.0]} seed={122} />
      <Bush      position={[-14.5, 0, -11.5]} seed={123} />
      <Mushroom  position={[-10.5, 0, -12.0]} seed={124} />
      <Fern      position={[-12.0, 0, -13.0]} seed={125} />

      {/* Entrance flanks — tight frame, not blocking the path corridor */}
      <Fern      position={[-14.5, 0, -5.8]}  seed={131} />
      <Fern      position={[-9.5,  0, -5.8]}  seed={132} />
      <Mushroom  position={[-15.2, 0, -5.5]}  seed={133} />
      <Mushroom  position={[-8.8,  0, -5.5]}  seed={134} />

      {/* ────────────────────────────────────────────────────────────────────
          CLEARING FLOOR — grass tufts + flower patches
      ──────────────────────────────────────────────────────────────────── */}

      {/* Instanced grass tufts */}
      <Scatter
        items={GRASS_ITEMS}
        color={PALETTE.grass}
        jitterAmount={0.1}
        size={[0.07, 0.25, 0.07]}
        roughness={0.9}
      />

      {/* Instanced yellow/white flower dots */}
      <Scatter
        items={FLOWER_ITEMS}
        color={PALETTE.flowerYellow}
        jitterAmount={0.15}
        size={0.12}
        roughness={0.75}
      />

      {/* Instanced pink/purple flower dots */}
      <Scatter
        items={FLOWER_ITEMS_2}
        color={PALETTE.flowerPink}
        jitterAmount={0.2}
        size={0.10}
        roughness={0.75}
      />

      {/* Named flower patches (component-level, richer detail) */}
      <FlowerPatch position={[-13.5, 0, -9.0]} seed={201} count={7} />
      <FlowerPatch position={[-10.5, 0, -10.0]} seed={202} count={6} />
      <FlowerPatch position={[-11.0, 0, -7.5]} seed={203} count={5} />

      {/* ────────────────────────────────────────────────────────────────────
          FEATURE PROPS — logs, boulders, rocks inside the clearing
      ──────────────────────────────────────────────────────────────────── */}

      {/* Mossy log — left side of clearing, near west tree ring */}
      <Log position={[-14.0, 0, -8.5]} seed={301} length={1.8} />

      {/* Smaller log tucked in NE corner */}
      <Log position={[-9.5, 0, -11.0]} seed={302} length={1.3} />

      {/* Boulder pair — NW quadrant, away from path */}
      <Boulder position={[-15.2, 0, -10.5]} seed={311} />

      {/* Smaller rock cluster — NE side */}
      <Rock position={[-8.8,  0, -10.5]} seed={321} />
      <Rock position={[-8.2,  0, -9.8]}  seed={322} />

      {/* A few rocks in the clearing for texture (not blocking walk) */}
      <Rock position={[-14.0, 0, -7.0]}  seed={331} />
      <Rock position={[-10.2, 0, -9.5]}  seed={332} />

      {/* ────────────────────────────────────────────────────────────────────
          FOCAL POINT — signpost + lantern near the NPC
          Signpost is a step north-east of the NPC so it's visible on approach.
          Lantern is directly beside the NPC, casting warm glow.
      ──────────────────────────────────────────────────────────────────── */}

      {/* "Word Problem Woods" signpost — faces south so player reads it on entry */}
      <Signpost
        position={[-13.5, 0, -6.5]}
        facing={Math.PI * 0.15}   /* slight angle toward the clearing center */
      />

      {/* Warm lantern right next to the NPC */}
      <Lantern
        position={[npcX - 1.0, 0, npcZ + 0.5]}
        height={1.5}
      />

      {/* Second lantern on the other side for symmetry + more glow */}
      <Lantern
        position={[npcX + 1.1, 0, npcZ + 0.5]}
        height={1.4}
      />

      {/* ────────────────────────────────────────────────────────────────────
          FIREFLIES — drei <Sparkles> for that enchanted-forest feel.
          Floating just above ground level, warm amber, slow drift.
      ──────────────────────────────────────────────────────────────────── */}
      <Sparkles
        position={[-12, 0.5, -9]}
        count={28}
        scale={[9, 2.5, 8]}
        size={2.5}
        speed={0.18}
        opacity={0.7}
        color="#ffe070"
        noise={0.4}
      />

      {/* Denser cluster of fireflies near the NPC / lanterns */}
      <Sparkles
        position={[npcX, 0.4, npcZ]}
        count={14}
        scale={[3.5, 1.8, 3.5]}
        size={3.5}
        speed={0.22}
        opacity={0.85}
        color="#ffd44a"
        noise={0.6}
      />

      {/* ────────────────────────────────────────────────────────────────────
          NPC — unchanged call, preserved exactly
      ──────────────────────────────────────────────────────────────────── */}
      <Npc
        areaId={a.id}
        zoneId={a.zoneId}
        label={a.label}
        position={[npcX, 0, npcZ]}
        posRef={posRef}
      />
    </group>
  )
}
