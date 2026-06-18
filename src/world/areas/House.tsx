import Building from '../Building'
import PlacedItems from '../../home/world/PlacedItems'
import { areaById } from '../worldLayout'
import { Vox, Scatter } from '../voxel/Vox'
import { PALETTE } from '../voxel/palette'
import {
  VoxTree,
  Bush,
  FlowerPatch,
  Lantern,
  Fence,
  Signpost,
} from '../voxel/props'
import { field } from '../voxel/fields'

// ── Mailbox (built from Vox) ─────────────────────────────────────────────────
// A small voxel mailbox on a post: base post, body, flag, lid.
function Mailbox({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* post */}
      <Vox position={[0, 0.35, 0]} size={[0.12, 0.7, 0.12]} color={PALETTE.wood} radius={0.04} />
      {/* base */}
      <Vox position={[0, 0.04, 0]} size={[0.28, 0.08, 0.28]} color={PALETTE.rockDark} radius={0.03} />
      {/* mailbox body */}
      <Vox position={[0, 0.78, 0]} size={[0.36, 0.28, 0.56]} color={PALETTE.cottageWallWarm} radius={0.06} />
      {/* rounded lid / top arch */}
      <Vox position={[0, 0.96, 0]} size={[0.32, 0.14, 0.54]} color={PALETTE.roof} radius={0.1} castShadow={false} />
      {/* flag (little red stick on the side) */}
      <Vox position={[0.2, 0.88, 0.12]} size={[0.04, 0.28, 0.04]} color={PALETTE.flowerRed} radius={0.02} castShadow={false} />
      <Vox position={[0.22, 1.0, 0.12]} size={[0.14, 0.1, 0.04]} color={PALETTE.flowerRed} radius={0.02} castShadow={false} />
      {/* front slot */}
      <Vox position={[0, 0.74, 0.29]} size={[0.22, 0.06, 0.04]} color={PALETTE.barkDark} radius={0.02} castShadow={false} />
    </group>
  )
}

// ── Flower box (window box) ──────────────────────────────────────────────────
// Sits against the wall, at wall height, with little flowers poking out.
function FlowerBox({
  position = [0, 0, 0] as [number, number, number],
  seed = 1,
  rotation = [0, 0, 0] as [number, number, number],
}) {
  // 3 flower colors cycle from seed
  const colors = [PALETTE.flowerRed, PALETTE.flowerYellow, PALETTE.flowerPink, PALETTE.flowerPurple, PALETTE.flowerWhite]
  const blooms: { dx: number; col: string }[] = [
    { dx: -0.28, col: colors[seed % colors.length] },
    { dx: 0, col: colors[(seed + 1) % colors.length] },
    { dx: 0.28, col: colors[(seed + 2) % colors.length] },
  ]
  return (
    <group position={position} rotation={rotation}>
      {/* wooden box */}
      <Vox position={[0, 0, 0]} size={[0.72, 0.22, 0.22]} color={PALETTE.woodDark} radius={0.06} />
      {/* soil */}
      <Vox position={[0, 0.1, 0]} size={[0.64, 0.1, 0.18]} color={PALETTE.dirt} radius={0.03} castShadow={false} />
      {/* flowers */}
      {blooms.map((b, i) => (
        <group key={i} position={[b.dx, 0.08, 0]}>
          <Vox position={[0, 0.18, 0]} size={[0.05, 0.22, 0.05]} color={PALETTE.foliageDark} radius={0.02} castShadow={false} />
          <Vox position={[0, 0.32, 0]} size={0.14} color={b.col} radius={0.06} castShadow={false} />
        </group>
      ))}
    </group>
  )
}

// ── Doormat ──────────────────────────────────────────────────────────────────
// A flat decorative stone/wood mat just in front of the door.
function Doormat({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* main mat slab */}
      <Vox position={[0, 0.03, 0]} size={[1.1, 0.06, 0.55]} color={PALETTE.woodDark} radius={0.05} receiveShadow castShadow={false} />
      {/* decorative stripes */}
      <Vox position={[-0.3, 0.06, 0]} size={[0.1, 0.04, 0.45]} color={PALETTE.wood} radius={0.03} castShadow={false} receiveShadow={false} />
      <Vox position={[0, 0.06, 0]} size={[0.1, 0.04, 0.45]} color={PALETTE.wood} radius={0.03} castShadow={false} receiveShadow={false} />
      <Vox position={[0.3, 0.06, 0]} size={[0.1, 0.04, 0.45]} color={PALETTE.wood} radius={0.03} castShadow={false} receiveShadow={false} />
    </group>
  )
}

// ── Garden bed ───────────────────────────────────────────────────────────────
// A small raised soil patch with flowers / herbs along the side walls.
function GardenBed({
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  w = 2.5,
  seed = 1,
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* edging border */}
      <Vox position={[0, 0.06, 0]} size={[w, 0.12, 0.9]} color={PALETTE.wood} radius={0.05} receiveShadow />
      {/* soil fill */}
      <Vox position={[0, 0.12, 0]} size={[w - 0.1, 0.1, 0.76]} color={PALETTE.dirt} radius={0.04} castShadow={false} />
      {/* flowers in the bed */}
      <FlowerPatch position={[0, 0.14, 0]} seed={seed} count={5} />
    </group>
  )
}

// ── Path stones ───────────────────────────────────────────────────────────────
// A short stepping-stone path from the door outward (z direction).
function PathStones({ startZ = 5.5, count = 4 }) {
  const stones = Array.from({ length: count }, (_, i) => ({
    z: startZ + i * 0.8,
    x: (i % 2 === 0 ? -0.18 : 0.18),
    s: 0.7 + (i * 0.07) % 0.3,
  }))
  return (
    <>
      {stones.map((s, i) => (
        <Vox
          key={i}
          position={[s.x, 0.04, s.z]}
          size={[s.s, 0.08, s.s * 0.75]}
          color={i % 2 === 0 ? PALETTE.pebble : PALETTE.sand}
          radius={0.06}
          receiveShadow
          castShadow={false}
          rotation={[0, (i * 0.3), 0]}
        />
      ))}
    </>
  )
}

// ── House exterior dressing ──────────────────────────────────────────────────

export default function House() {
  const a = areaById('house')!

  // Small scatter of grass tufts around the side gardens (not in the door path)
  const leftGrassTufts = field([-6.5, 0], 1.0, 4.0, 8, 101, { y: 0, minScale: 0.7, maxScale: 1.1 })
  const rightGrassTufts = field([6.5, 0], 1.0, 4.0, 8, 202, { y: 0, minScale: 0.7, maxScale: 1.1 })
  const backGrassTufts = field([0, -6.5], 4.5, 0.8, 10, 303, { y: 0, minScale: 0.7, maxScale: 1.1 })
  const frontYardGrass = field([0, 7.5], 2.0, 1.2, 12, 404, { y: 0, minScale: 0.6, maxScale: 1.0 })

  return (
    <>
      {/* ── The Building Shell + Interior (PRESERVED EXACTLY) ── */}
      <Building
        id={a.id}
        cx={a.worldPos[0]}
        cz={a.worldPos[1]}
        size={a.size ?? 10}
        wall={PALETTE.cottageWall}
        roof={PALETTE.roof}
      >
        <PlacedItems />
      </Building>

      {/* ── All exterior dressing lives outside the building footprint (|x|>5 or |z|>5) ── */}
      <group>

        {/* ── FRONT YARD (z > 5): door is at (0, 5), keep x in [-0.8, 0.8] clear ── */}

        {/* Lanterns flanking the door — just outside the front wall, either side of door */}
        <Lantern position={[-1.6, 0, 5.2]} height={1.2} />
        <Lantern position={[1.6, 0, 5.2]} height={1.2} />

        {/* Flower boxes mounted on front wall, either side of the door */}
        {/* Left of door: centered at x=-2.8, sitting at wall face z=5.15, at window height ~1.1 */}
        <FlowerBox position={[-2.8, 1.1, 5.16]} seed={1} />
        <FlowerBox position={[2.8, 1.1, 5.16]} seed={3} />

        {/* Doormat just past the door threshold */}
        <Doormat position={[0, 0, 5.55]} />

        {/* Stepping-stone path from door outward */}
        <PathStones startZ={5.9} count={4} />

        {/* Front fence — spans the yard with a center gap for the path */}
        {/* Left fence segment from x=-4.8 to x=-1.2 */}
        <Fence position={[-3.0, 0, 8.0]} length={3.6} posts={4} />
        {/* Right fence segment from x=1.2 to x=4.8 */}
        <Fence position={[3.0, 0, 8.0]} length={3.6} posts={4} />
        {/* Side fence left: runs along Z from z=5 to z=8 at x=-5 */}
        {/* Fence rails run along X by default; rotate 90deg so they run along Z */}
        <group position={[-4.8, 0, 6.5]} rotation={[0, Math.PI / 2, 0]}>
          <Fence position={[0, 0, 0]} length={3.0} posts={3} />
        </group>
        {/* Side fence right: runs along Z from z=5 to z=8 at x=+5 */}
        <group position={[4.8, 0, 6.5]} rotation={[0, Math.PI / 2, 0]}>
          <Fence position={[0, 0, 0]} length={3.0} posts={3} />
        </group>

        {/* Mailbox — left of path, inside front yard near the fence */}
        <Mailbox position={[-1.8, 0, 7.4]} />

        {/* Small signpost near mailbox — the "home" marker */}
        <Signpost position={[1.8, 0, 7.4]} facing={Math.PI * 0.1} />

        {/* Flower patches in the front yard corners (clear of door path) */}
        <FlowerPatch position={[-3.5, 0, 6.5]} seed={10} count={7} />
        <FlowerPatch position={[3.5, 0, 6.5]} seed={20} count={7} />
        <FlowerPatch position={[-3.5, 0, 7.5]} seed={30} count={5} />
        <FlowerPatch position={[3.5, 0, 7.5]} seed={40} count={5} />

        {/* Bushes by the front corners of the building */}
        <Bush position={[-4.4, 0, 5.8]} seed={1} />
        <Bush position={[4.4, 0, 5.8]} seed={2} />

        {/* Grass tufts in front yard (instanced) */}
        <Scatter items={frontYardGrass} color={PALETTE.grassLight} jitterAmount={0.1} size={[0.07, 0.22, 0.07]} />

        {/* ── LEFT SIDE (x < -5): garden beds along the left wall ── */}

        {/* Garden bed alongside left wall */}
        <GardenBed position={[-5.6, 0, -1.5]} rotation={[0, Math.PI / 2, 0]} w={4.0} seed={5} />

        {/* Fruit tree in the back-left corner */}
        <VoxTree position={[-6.8, 0, -4.5]} variant="fruit" seed={7} />
        <VoxTree position={[-6.5, 0, 4.2]} variant="round" seed={11} />

        {/* Flower patches left side */}
        <FlowerPatch position={[-5.6, 0, 1.5]} seed={50} count={6} />
        <FlowerPatch position={[-5.8, 0, 3.0]} seed={60} count={4} />

        {/* Left side grass tufts */}
        <Scatter items={leftGrassTufts} color={PALETTE.grass} jitterAmount={0.1} size={[0.07, 0.22, 0.07]} />

        {/* ── RIGHT SIDE (x > 5): garden beds along the right wall ── */}

        {/* Garden bed alongside right wall */}
        <GardenBed position={[5.6, 0, -1.5]} rotation={[0, Math.PI / 2, 0]} w={4.0} seed={8} />

        {/* Pine tree at back-right */}
        <VoxTree position={[6.8, 0, -4.2]} variant="pine" seed={9} />
        <VoxTree position={[6.5, 0, 4.2]} variant="round" seed={13} />

        {/* Flower patches right side */}
        <FlowerPatch position={[5.6, 0, 1.5]} seed={70} count={6} />
        <FlowerPatch position={[5.8, 0, 3.0]} seed={80} count={4} />

        {/* Right side grass tufts */}
        <Scatter items={rightGrassTufts} color={PALETTE.grass} jitterAmount={0.1} size={[0.07, 0.22, 0.07]} />

        {/* ── BACK YARD (z < -5) ── */}

        {/* Round tree in back center */}
        <VoxTree position={[0, 0, -7.5]} variant="round" seed={15} />

        {/* Small garden in the back */}
        <GardenBed position={[2.5, 0, -5.6]} w={2.0} seed={12} />
        <GardenBed position={[-2.5, 0, -5.6]} w={2.0} seed={14} />

        {/* Back yard scattered grass tufts */}
        <Scatter items={backGrassTufts} color={PALETTE.grassLight} jitterAmount={0.1} size={[0.07, 0.22, 0.07]} />

        {/* Chimney detail: a small decorative chimney stack on the back roof edge */}
        {/* The building roof is at y=2.4+0.15=2.55; chimney rises from there */}
        <group position={[-1.8, 2.7, -4.2]}>
          {/* chimney shaft */}
          <Vox position={[0, 0.5, 0]} size={[0.55, 1.0, 0.55]} color={PALETTE.rockDark} radius={0.08} />
          {/* chimney cap */}
          <Vox position={[0, 1.08, 0]} size={[0.68, 0.18, 0.68]} color={PALETTE.rock} radius={0.07} />
          {/* smoke puffs (small white voxels drifting up, purely decorative) */}
          <Vox position={[0.05, 1.45, 0.05]} size={0.22} color={PALETTE.cloud} radius={0.1} roughness={1} castShadow={false} receiveShadow={false} />
          <Vox position={[-0.08, 1.78, 0.08]} size={0.17} color={PALETTE.cloud} radius={0.08} roughness={1} castShadow={false} receiveShadow={false} />
          <Vox position={[0.1, 2.05, -0.05]} size={0.13} color={PALETTE.cloud} radius={0.06} roughness={1} castShadow={false} receiveShadow={false} />
        </group>

        {/* Pitched roof ridge detail — two sloping voxel slabs to give a proper pitched roof shape */}
        {/* Sitting atop the flat Building roof slab at y=2.7 */}
        <group position={[0, 2.7, 0]}>
          {/* Left slope */}
          <Vox
            position={[-2.2, 0.45, 0]}
            size={[5.8, 0.22, 10.4]}
            color={PALETTE.roofDark}
            rotation={[0, 0, 0.42]}
            radius={0.08}
          />
          {/* Right slope */}
          <Vox
            position={[2.2, 0.45, 0]}
            size={[5.8, 0.22, 10.4]}
            color={PALETTE.roofDark}
            rotation={[0, 0, -0.42]}
            radius={0.08}
          />
          {/* Ridge beam at the top */}
          <Vox position={[0, 1.48, 0]} size={[0.32, 0.24, 10.5]} color={PALETTE.barkDark} radius={0.08} />
          {/* Ridge end gables (triangular fill voxels) — front gable */}
          <Vox position={[0, 0.75, 5.1]} size={[5.2, 0.9, 0.3]} color={PALETTE.cottageWall} radius={0.1} />
          {/* back gable */}
          <Vox position={[0, 0.75, -5.1]} size={[5.2, 0.9, 0.3]} color={PALETTE.cottageWall} radius={0.1} />
        </group>

      </group>
    </>
  )
}
