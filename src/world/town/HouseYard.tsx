import { Shape } from 'three'
import { seededRng } from '../../lib/random'
import { TOON } from '../../toon/palette'
import { toonMaterial } from '../../toon/materials'
import { faceted, geo } from '../../toon/geometry'
import { TBlob, TBox, TCone, TCyl, TSphere } from '../../toon/shapes'
import { Instances, type Inst } from './kit'
import { HOUSE_C, HOUSE_YARD } from './townData'
import { roofGeometry, useBuildingFade } from './buildingStyle'

const FLOWERS = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerPink, TOON.flowerWhite, TOON.flowerPurple, TOON.flowerBlue]
const FRONT = HOUSE_C[1] + 5 // the House's front (+z) wall line

// ── Instanced bits, built once ───────────────────────────────────────────────
const bedPlants = (() => {
  const leaves: Inst[] = []
  const flowers: Inst[] = []
  const pickets: Inst[] = []
  HOUSE_YARD.beds.forEach((b, bi) => {
    const r = seededRng(`house-bed:${bi}`)
    const [cx, cz] = b.c
    for (let i = 0; i < 6; i++) {
      const x = cx - b.w / 2 + 0.25 + (i * (b.w - 0.5)) / 5
      leaves.push({ x, y: 0.3, z: cz + (r() - 0.5) * 0.15, s: [0.24, 0.16, 0.2], ry: r() * 6, color: i % 2 ? TOON.leaf : TOON.leafDark })
    }
    for (let i = 0; i < 14; i++) {
      flowers.push({
        x: cx - b.w / 2 + 0.15 + r() * (b.w - 0.3),
        y: 0.4 + r() * 0.12,
        z: cz + (r() - 0.5) * (b.d - 0.2),
        s: 0.075 + r() * 0.025,
        color: FLOWERS[Math.floor(r() * FLOWERS.length)],
      })
    }
    // white picket fence: a front run plus a short return at the outer end
    const fz = cz + b.d / 2 + 0.13
    for (let x = cx - b.w / 2; x <= cx + b.w / 2 + 1e-6; x += 0.22) pickets.push({ x, y: 0.23, z: fz })
    const outer = cx + (Math.sign(cx) * b.w) / 2
    for (let z = fz - 0.22; z > FRONT + 0.25; z -= 0.22) pickets.push({ x: outer, y: 0.23, z })
  })
  return { leaves, flowers, pickets }
})()

const veg = (() => {
  const leaves: Inst[] = []
  const carrots: Inst[] = []
  const pumpkins: Inst[] = []
  HOUSE_YARD.veg.forEach((b, bi) => {
    const r = seededRng(`house-veg:${bi}`)
    const [cx, cz] = b.c
    for (const row of [-0.2, 0.2]) {
      for (let i = 0; i < 6; i++) {
        const x = cx - b.w / 2 + 0.3 + (i * (b.w - 0.6)) / 5
        const z = cz + row
        if (bi === 0) {
          // carrots: orange shoulders and a feathery green top
          carrots.push({ x, y: 0.21, z, s: [0.07, 0.12, 0.07], rx: Math.PI, color: TOON.autumn })
          leaves.push({ x, y: 0.33, z, s: [0.09, 0.16, 0.09], ry: r() * 6, color: TOON.leafLight })
        } else if ((i + (row > 0 ? 1 : 0)) % 3 === 0) {
          pumpkins.push({ x, y: 0.28, z, s: [0.2, 0.15, 0.2], color: TOON.roofOrange })
          leaves.push({ x: x + 0.12, y: 0.24, z: z - 0.08, s: [0.1, 0.05, 0.1], ry: r() * 6, color: TOON.leafDark })
        } else {
          // cabbages
          leaves.push({ x, y: 0.29, z, s: [0.18, 0.14, 0.18], ry: r() * 6, color: i % 2 ? TOON.leaf : TOON.leafLight })
        }
      }
    }
  })
  return { leaves, carrots, pumpkins }
})()

const dormerGable = (() => {
  const s = new Shape()
  s.moveTo(-0.66, 0)
  s.lineTo(0.66, 0)
  s.lineTo(0, 0.5)
  s.closePath()
  return s
})()

/**
 * Gabled dormer windows on the front roof slope (House-local coordinates), so
 * the big roof reads as a cosy attic. They fade with the roof.
 */
export function Dormers({ size, xs, wall, roof, trim }: { size: number; xs: number[]; wall: string; roof: string; trim: string }) {
  const fade = useBuildingFade('house')
  const o = fade.roof
  const solid = o >= 1
  const g = roofGeometry(size)
  const zf = size * 0.34 // front face of the dormer
  const surface = g.baseY + 0.135 + (g.run - zf) * Math.tan(g.pitch)
  const top = surface + 1.05
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, 0, zf]}>
          <TBox size={[1.3, 1.6, 1.5]} radius={0.06} position={[0, top - 0.8, -0.75]} color={wall} opacity={o} outline={solid} castShadow={solid} />
          <TBox size={[0.74, 0.74, 0.08]} radius={0.04} position={[0, surface + 0.47, 0.02]} color={trim} opacity={o} castShadow={false} />
          <TBox size={[0.56, 0.56, 0.06]} radius={0.03} position={[0, surface + 0.47, 0.05]} color={TOON.windowGlow} emissive={TOON.windowGlow} emissiveIntensity={0.55} opacity={o} castShadow={false} />
          <TBox size={[0.05, 0.56, 0.04]} radius={0.015} position={[0, surface + 0.47, 0.09]} color={trim} opacity={o} castShadow={false} />
          <TBox size={[0.56, 0.05, 0.04]} radius={0.015} position={[0, surface + 0.47, 0.09]} color={trim} opacity={o} castShadow={false} />
          <mesh position={[0, top, 0.001]} material={toonMaterial(wall, { opacity: o, doubleSide: true })}>
            <shapeGeometry args={[dormerGable]} />
          </mesh>
          {[-1, 1].map((s) => (
            <TBox key={s} size={[0.93, 0.12, 1.75]} radius={0.04} position={[s * 0.37, top + 0.3, -0.78]} rotation={[0, 0, -s * 0.6]} color={roof} opacity={o} outline={solid} castShadow={solid} />
          ))}
        </group>
      ))}
    </group>
  )
}

/** A little lantern on a bracket, mounted on the House's front wall. */
function WallLantern({ x, opacity }: { x: number; opacity: number }) {
  return (
    <group position={[x, 1.72, FRONT + 0.15]}>
      <TBox size={[0.07, 0.07, 0.24]} radius={0.02} position={[0, 0.12, 0.1]} color={TOON.woodDark} opacity={opacity} castShadow={false} />
      <TBox size={[0.2, 0.26, 0.2]} radius={0.05} position={[0, -0.04, 0.22]} color={TOON.lantern} emissive={TOON.lantern} emissiveIntensity={0.9} opacity={opacity} castShadow={false} />
      <TCone radius={0.17} height={0.12} segments={4} rotation={[0, Math.PI / 4, 0]} position={[0, 0.15, 0.22]} color={TOON.woodDark} opacity={opacity} castShadow={false} />
    </group>
  )
}

/**
 * The player's front garden and back plot: wall lanterns by the door, a potted
 * topiary, a mailbox, a welcome mat, flower beds behind white picket fences,
 * and a vegetable patch with a scarecrow between the back wall and the river.
 */
export default function HouseYard() {
  const fade = useBuildingFade('house')
  const [px, pz] = HOUSE_YARD.pot
  const [mx, mz] = HOUSE_YARD.mailbox
  const [sx, sz] = HOUSE_YARD.scarecrow
  return (
    <group>
      <WallLantern x={-1.45} opacity={fade.wall} />
      <WallLantern x={1.45} opacity={fade.wall} />

      {/* potted topiary */}
      <group position={[px, 0, pz]}>
        <TCyl radiusTop={0.27} radiusBottom={0.2} height={0.38} position={[0, 0.19, 0]} color={TOON.brick} outline segments={10} />
        <TCyl radiusTop={0.3} height={0.08} position={[0, 0.39, 0]} color={TOON.coral} castShadow={false} segments={10} />
        <TCyl radiusTop={0.035} height={0.3} position={[0, 0.55, 0]} color={TOON.bark} castShadow={false} segments={5} />
        <TBlob position={[0, 0.8, 0]} scale={0.3} color={TOON.leaf} outline />
        <TBlob position={[0, 1.13, 0]} scale={0.18} color={TOON.leafLight} outline />
      </group>

      {/* mailbox with its flag up */}
      <group position={[mx, 0, mz]} rotation={[0, 0.25, 0]}>
        <TBox size={[0.1, 0.78, 0.1]} radius={0.03} position={[0, 0.39, 0]} color={TOON.woodDark} />
        <TBox size={[0.32, 0.3, 0.46]} radius={0.13} position={[0, 0.9, 0]} color={TOON.roofBlue} outline />
        <TBox size={[0.24, 0.2, 0.03]} radius={0.02} position={[0, 0.88, 0.235]} color={TOON.wallBlue} castShadow={false} />
        <TBox size={[0.03, 0.26, 0.03]} radius={0.01} position={[0.18, 1.0, -0.05]} color={TOON.woodDark} castShadow={false} />
        <TBox size={[0.03, 0.11, 0.15]} radius={0.02} position={[0.18, 1.08, 0.02]} color={TOON.flowerRed} castShadow={false} />
      </group>

      {/* welcome mat */}
      <group position={[HOUSE_YARD.mat[0], 0, HOUSE_YARD.mat[1]]}>
        <TBox size={[1.1, 0.03, 0.5]} radius={0.012} position={[0, 0.03, 0]} color={TOON.coral} castShadow={false} receiveShadow />
        <TBox size={[0.82, 0.032, 0.26]} radius={0.012} position={[0, 0.033, 0]} color={TOON.flowerYellow} castShadow={false} receiveShadow />
      </group>

      {/* front flower beds */}
      {HOUSE_YARD.beds.map((b) => (
        <group key={b.c[0]} position={[b.c[0], 0, b.c[1]]}>
          <TBox size={[b.w, 0.24, b.d]} radius={0.06} position={[0, 0.12, 0]} color={TOON.stoneDark} receiveShadow />
          <TBox size={[b.w - 0.12, 0.04, b.d - 0.12]} radius={0.015} position={[0, 0.24, 0]} color={TOON.dirtDark} castShadow={false} />
          <TBox size={[b.w + 0.02, 0.06, 0.04]} radius={0.015} position={[0, 0.31, b.d / 2 + 0.1]} color={TOON.flowerWhite} castShadow={false} />
        </group>
      ))}
      <Instances geometry={faceted(geo.blob(1))} items={bedPlants.leaves} castShadow />
      <Instances geometry={geo.sphere(8)} items={bedPlants.flowers} />
      <Instances geometry={geo.box(0.09, 0.46, 0.05, 0.04)} color={TOON.flowerWhite} items={bedPlants.pickets} castShadow />

      {/* vegetable patch + scarecrow behind the house */}
      {HOUSE_YARD.veg.map((b) => (
        <group key={b.c[0]} position={[b.c[0], 0, b.c[1]]}>
          <TBox size={[b.w + 0.1, 0.14, b.d + 0.1]} radius={0.05} position={[0, 0.07, 0]} color={TOON.woodLight} receiveShadow castShadow={false} />
          <TBox size={[b.w - 0.05, 0.08, b.d - 0.05]} radius={0.04} position={[0, 0.15, 0]} color={TOON.dirt} receiveShadow castShadow={false} />
        </group>
      ))}
      <Instances geometry={faceted(geo.blob(1))} items={veg.leaves} castShadow />
      <Instances geometry={geo.cone(1, 1, 6)} items={veg.carrots} />
      <Instances geometry={geo.sphere(10)} items={veg.pumpkins} castShadow />
      <group position={[sx, 0, sz]} rotation={[0, 0.5, 0]}>
        <TCyl radiusTop={0.05} height={1.35} position={[0, 0.68, 0]} color={TOON.woodDark} segments={6} />
        <TCyl radiusTop={0.04} height={1.05} position={[0, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} color={TOON.woodDark} segments={6} castShadow={false} />
        <TBox size={[0.46, 0.44, 0.24]} radius={0.08} position={[0, 0.95, 0]} color={TOON.flowerBlue} outline />
        <TBox size={[0.16, 0.12, 0.25]} radius={0.04} position={[0.1, 0.84, 0.01]} color={TOON.flowerRed} castShadow={false} />
        {[-1, 1].map((s) => (
          <TCone key={s} radius={0.07} height={0.16} position={[s * 0.56, 1.0, 0]} rotation={[0, 0, (s * Math.PI) / 2]} color={TOON.flowerYellow} castShadow={false} segments={5} />
        ))}
        <TSphere position={[0, 1.36, 0]} scale={0.19} color={TOON.sandWet} outline />
        <TSphere position={[-0.06, 1.39, 0.17]} scale={0.025} color={TOON.eye} castShadow={false} segments={6} />
        <TSphere position={[0.06, 1.39, 0.17]} scale={0.025} color={TOON.eye} castShadow={false} segments={6} />
        <TCyl radiusTop={0.3} height={0.04} position={[0, 1.5, 0]} rotation={[0.12, 0, 0]} color={TOON.gold} outline segments={12} />
        <TCyl radiusTop={0.13} radiusBottom={0.16} height={0.18} position={[0, 1.6, -0.01]} color={TOON.gold} segments={10} />
      </group>
    </group>
  )
}
