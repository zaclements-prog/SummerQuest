import { ConeGeometry } from 'three'
import type { BufferGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { TCone, TSphere, TTorus } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { Arm, Blush, Eye, FrontFeet, Ink, Leg, PetBody, PetHead, Smile, Staged, Wag, faceYaw, onFace } from '../parts'
import type { CreatureProps, PetRig } from '../parts'

// Head ellipsoids (centre, radii) of the three growth stages.
const HC = [0, 0.69, 0.02] as const
const HR = [0.27, 0.245, 0.25] as const
const BHC = [0, 0.35, 0.02] as const
const BHR = [0.2, 0.172, 0.18] as const
const AHC = [0, 1.045, 0.02] as const
const AHR = [0.265, 0.25, 0.25] as const

const WHITE = '#fdfaff'
const MUZZLE = '#ffdcec'
const HOOF = '#c6b0ef'
const GOLD = '#ffd36b'
const EYE = '#3a2650'
const NOSTRIL = '#c77a9c'
const PINK = '#ff9fcf'
const LILAC = '#c7a6ff'
const BLUE = '#8fd3ff'
const MINT = '#9fe6c8'
const YELLOW = '#ffe08a'

// Rainbow mane puffs: [x, y, z, radius, color]
const MANE: [number, number, number, number, string][] = [
  [-0.11, 0.9, 0.11, 0.062, PINK], // forelock, beside the horn
  [-0.03, 0.94, 0.02, 0.085, LILAC],
  [0.01, 0.9, -0.12, 0.09, BLUE],
  [0.0, 0.78, -0.22, 0.09, MINT],
  [0.0, 0.63, -0.24, 0.085, YELLOW],
  [0.0, 0.5, -0.19, 0.075, PINK],
]

// The grown-up's mane. The crown puffs [x, y, z, radius, color] sit still from
// forelock to crown; the flowing puffs [x, y, z, radius, color, vertical
// stretch] hang from the back of the head (MANE_PIVOT) down to the shoulders
// and sway like hair.
const ADULT_MANE_CROWN: [number, number, number, number, string][] = [
  [-0.105, 1.24, 0.125, 0.064, PINK],
  [-0.04, 1.3, 0.025, 0.088, LILAC],
  [0.012, 1.275, -0.11, 0.094, BLUE],
]
const ADULT_MANE_FLOW: [number, number, number, number, string, number][] = [
  [0.016, 1.165, -0.215, 0.092, MINT, 1.12],
  [0.012, 1.03, -0.262, 0.088, YELLOW, 1.2],
  [0.004, 0.895, -0.25, 0.08, PINK, 1.25],
  [0.0, 0.775, -0.215, 0.068, LILAC, 1.25],
]
const MANE_PIVOT = [0, 1.24, -0.17] as const

// A long twisted horn: a cone (radius 1, height 1, pointing +y, centred) whose
// surface winds round in two raised spiral ridges. Built once and shared.
let hornGeo: BufferGeometry | null = null
function spiralHorn(): BufferGeometry {
  if (hornGeo) return hornGeo
  const cone = new ConeGeometry(1, 1, 20, 28)
  cone.deleteAttribute('normal')
  cone.deleteAttribute('uv')
  const g = mergeVertices(cone)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const t = y + 0.5 // 0 at the base, 1 at the tip
    const k = 1 + 0.16 * Math.cos(2 * Math.atan2(z, x) - t * Math.PI * 2 * 2.6)
    p.setXYZ(i, x * k, y, z * k)
  }
  g.computeVertexNormals()
  hornGeo = g
  return g
}

/**
 * Unicorn — a chibi unicorn plush: pearly white with a rainbow mane of soft
 * puffs from forelock to shoulders, a golden striped horn with a little glow,
 * pointy ears, a pink muzzle, lilac hooves and a rainbow puff tail.
 */
function UnicornKid() {
  const white = WHITE
  const muzzle = MUZZLE
  const hoof = HOOF
  const gold = GOLD
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={white} footColor={hoof} phase={0} />
      <Leg x={0.1} y={0.17} color={white} footColor={hoof} phase={Math.PI} />
      <PetBody>

      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={white} segments={20}>
        <Ink />
      </TSphere>

      <Arm x={-0.18} y={0.44} z={0.02} color={white} pawColor={hoof} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={white} pawColor={hoof} phase={0} />

      {/* rainbow puff tail */}
      <Wag position={[0, 0.25, -0.17]} amp={0.3}>
        {[
          [0, 0.0, -0.06, 0.08, LILAC],
          [0, 0.03, -0.16, 0.075, BLUE],
          [0, -0.02, -0.24, 0.065, PINK],
        ].map(([x, y, z, r, c]) => (
          <TSphere key={c as string} position={[x as number, y as number, z as number]} scale={r as number} color={c as string} segments={14}>
            <Ink />
          </TSphere>
        ))}
      </Wag>

      <PetHead>
      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={white} segments={24}>
        <Ink />
      </TSphere>
      {/* pointy ears, pink inside */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.17, 0.87, -0.02]} rotation={[-0.1, 0, -s * 0.5]}>
          <TCone radius={0.065} height={0.15} segments={12} scale={[1, 1, 0.55]} position={[0, 0.05, 0]} color={white}>
            <Ink crease />
          </TCone>
          <TCone radius={0.035} height={0.09} segments={10} scale={[1, 1, 0.4]} position={[0, 0.035, 0.02]} color={TOON.flowerPink} castShadow={false} />
        </group>
      ))}
      {/* golden horn with spiral bands */}
      <group position={[0, 0.93, 0.1]} rotation={[0.35, 0, 0]}>
        <TCone radius={0.05} height={0.22} segments={12} position={[0, 0.09, 0]} color={gold} emissive={gold} emissiveIntensity={0.25}>
          <Ink crease />
        </TCone>
        {[0.03, 0.09].map((y, i) => (
          <TTorus key={y} radius={0.042 - i * 0.012} tube={0.011} position={[0, y, 0]} rotation={[Math.PI / 2 + 0.25, 0, 0]} color="#ffbf3d" segments={14} castShadow={false} />
        ))}
      </group>
      {/* rainbow mane */}
      {MANE.map(([x, y, z, r, c]) => (
        <TSphere key={`${x}|${y}|${z}`} position={[x, y, z]} scale={r} color={c} segments={14}>
          <Ink />
        </TSphere>
      ))}

      {/* pink muzzle with nostrils + smile */}
      <TSphere position={[0, 0.605, 0.16]} scale={[0.15, 0.1, 0.12]} color={muzzle} emissive={muzzle} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={[s * 0.045, 0.63, 0.275]} scale={[0.014, 0.01, 0.01]} color={NOSTRIL} segments={6} castShadow={false} />
      ))}
      <Smile position={[0, 0.585, 0.272]} width={0.035} pitch={-0.4} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.1, 0.035, -0.014)} size={0.062} yaw={faceYaw(HC, HR, s * 0.1, 0.035)} color={EYE} />
          {/* lashes */}
          <TSphere
            position={onFace(HC, HR, s * 0.155, 0.08, -0.004)}
            rotation={[0, faceYaw(HC, HR, s * 0.155, 0.08), s * -0.7]}
            scale={[0.026, 0.008, 0.01]}
            color={TOON.eye}
            segments={6}
            castShadow={false}
          />
          <Blush position={onFace(HC, HR, s * 0.19, -0.04, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.04)} />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

/**
 * Baby unicorn — a round little foal, nearly all head: huge low-set eyes, a
 * big pink muzzle, a tiny golden nub of a horn, a wisp of rainbow mane (three
 * puffs curling from forelock to crown) and little lilac hoof nubs. 22 shapes.
 */
function UnicornBaby() {
  const mz = onFace(BHC, BHR, 0, -0.072, -0.05)[2] // muzzle centre z
  return (
    <group>
      <Leg x={-0.07} y={0.08} color={WHITE} footColor={HOOF} radius={0.044} foot={[0.056, 0.044, 0.066]} phase={0} swing={0.5} />
      <Leg x={0.07} y={0.08} color={WHITE} footColor={HOOF} radius={0.044} foot={[0.056, 0.044, 0.066]} phase={Math.PI} swing={0.5} />
      <PetBody>
      <FrontFeet x={0.068} y={0.21} z={0.03} color={WHITE} footColor={HOOF} radius={0.042} foot={[0.052, 0.042, 0.062]} />

      {/* bean body */}
      <TSphere position={[0, 0.16, 0]} scale={[0.13, 0.12, 0.125]} color={WHITE} segments={18}>
        <Ink />
      </TSphere>

      <PetHead>
      {/* big round head */}
      <TSphere position={[...BHC]} scale={[...BHR]} color={WHITE} segments={24}>
        <Ink />
      </TSphere>
      {/* little pointy ears */}
      {[-1, 1].map((s) => (
        <TCone key={`ear${s}`} position={[s * 0.118, 0.49, -0.015]} rotation={[-0.1, 0, -s * 0.5]} radius={0.045} height={0.1} segments={10} scale={[1, 1, 0.55]} color={WHITE}>
          <Ink crease />
        </TCone>
      ))}
      {/* nub horn */}
      <TCone position={[0, 0.528, 0.105]} rotation={[0.42, 0, 0]} radius={0.03} height={0.075} segments={10} color={GOLD} emissive={GOLD} emissiveIntensity={0.25}>
        <Ink crease />
      </TCone>
      {/* a wisp of rainbow mane */}
      {[
        [-0.062, 0.5, 0.085, 0.036, PINK],
        [-0.03, 0.535, -0.005, 0.048, LILAC],
        [0.0, 0.5, -0.1, 0.046, BLUE],
      ].map(([x, y, z, r, c]) => (
        <TSphere key={c as string} position={[x as number, y as number, z as number]} scale={r as number} color={c as string} segments={12}>
          <Ink />
        </TSphere>
      ))}

      {/* big pink muzzle + smile */}
      <TSphere position={[0, BHC[1] - 0.072, mz]} scale={[0.112, 0.07, 0.075]} color={MUZZLE} emissive={MUZZLE} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      <Smile position={[0, BHC[1] - 0.085, mz + 0.072]} width={0.028} thickness={0.008} pitch={-0.4} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(BHC, BHR, s * 0.08, 0.004, -0.012)} size={0.058} yaw={faceYaw(BHC, BHR, s * 0.08, 0.004)} color={EYE} />
          <Blush position={onFace(BHC, BHR, s * 0.138, -0.058, -0.004)} yaw={faceYaw(BHC, BHR, s * 0.138, -0.058)} size={0.04} />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

/**
 * Grown-up unicorn — tall and graceful on long legs with lilac hooves: a long
 * glowing golden horn that twists to its tip, a flowing rainbow mane from
 * forelock down to the shoulders, a long rainbow tail that sweeps toward the
 * ground, a longer pink muzzle and lashed, friendly eyes. 40 shapes.
 */
function UnicornAdult() {
  const mz = onFace(AHC, AHR, 0, -0.1, -0.062)[2] // muzzle centre z
  const mf = mz + 0.13 // muzzle front
  return (
    <group>
      <Leg x={-0.105} y={0.46} color={WHITE} footColor={HOOF} radius={0.074} foot={[0.084, 0.066, 0.094]} phase={0} swing={0.5} />
      <Leg x={0.105} y={0.46} color={WHITE} footColor={HOOF} radius={0.074} foot={[0.084, 0.066, 0.094]} phase={Math.PI} swing={0.5} />
      <PetBody>

      {/* torso */}
      <TSphere position={[0, 0.63, 0]} scale={[0.215, 0.245, 0.188]} color={WHITE} segments={22}>
        <Ink />
      </TSphere>

      <Arm x={-0.172} y={0.79} z={0.02} color={WHITE} pawColor={HOOF} radius={0.056} length={0.205} splay={0.25} phase={Math.PI} swing={0.45} />
      <Arm x={0.172} y={0.79} z={0.02} color={WHITE} pawColor={HOOF} radius={0.056} length={0.205} splay={0.25} phase={0} swing={0.45} />

      {/* long flowing rainbow tail, sweeping back and down */}
      <Wag position={[0, 0.52, -0.15]} amp={0.22}>
        {[
          [0, 0.0, -0.07, 0.085, LILAC, 1],
          [0, -0.07, -0.17, 0.082, BLUE, 1.15],
          [0, -0.17, -0.235, 0.076, PINK, 1.25],
          [0, -0.29, -0.26, 0.066, YELLOW, 1.3],
        ].map(([x, y, z, r, c, k]) => (
          <TSphere
            key={c as string}
            position={[x as number, y as number, z as number]}
            scale={[r as number, (r as number) * (k as number), r as number]}
            color={c as string}
            segments={14}
          >
            <Ink />
          </TSphere>
        ))}
      </Wag>

      <PetHead>
      {/* head */}
      <TSphere position={[...AHC]} scale={[...AHR]} color={WHITE} segments={24}>
        <Ink />
      </TSphere>
      {/* pointy ears, pink inside */}
      {[-1, 1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.168, 1.235, -0.025]} rotation={[-0.1, 0, -s * 0.48]}>
          <TCone radius={0.068} height={0.17} segments={12} scale={[1, 1, 0.55]} position={[0, 0.06, 0]} color={WHITE}>
            <Ink crease />
          </TCone>
          <TCone radius={0.037} height={0.105} segments={10} scale={[1, 1, 0.4]} position={[0, 0.042, 0.021]} color={TOON.flowerPink} castShadow={false} />
        </group>
      ))}
      {/* long twisted golden horn */}
      <group position={[0, 1.245, 0.142]} rotation={[0.38, 0, 0]}>
        <mesh geometry={spiralHorn()} material={toonMaterial(GOLD, { emissive: GOLD, emissiveIntensity: 0.3 })} position={[0, 0.17, 0]} scale={[0.062, 0.36, 0.062]} castShadow>
          <Ink crease />
        </mesh>
      </group>
      {/* flowing rainbow mane: still on the crown, swaying from the back of the head down.
          The Wag is turned on its back (local y = world −z), so its side-to-side
          wag swings the hanging puffs like a pendulum; positions and stretch
          are mapped into that frame: world (x, y, z) → local (x, −z, y). */}
      {ADULT_MANE_CROWN.map(([x, y, z, r, c]) => (
        <TSphere key={`${x}|${y}|${z}`} position={[x, y, z]} scale={[r, r, r * 0.92]} color={c} segments={14}>
          <Ink />
        </TSphere>
      ))}
      <Wag position={[...MANE_PIVOT]} rotation={[-Math.PI / 2, 0, 0]} amp={0.1} speed={2.2}>
        {ADULT_MANE_FLOW.map(([x, y, z, r, c, k]) => (
          <TSphere
            key={`${x}|${y}|${z}`}
            position={[x - MANE_PIVOT[0], -(z - MANE_PIVOT[2]), y - MANE_PIVOT[1]]}
            scale={[r, r * 0.92, r * k]}
            color={c}
            segments={14}
          >
            <Ink />
          </TSphere>
        ))}
      </Wag>

      {/* longer pink muzzle with nostrils + smile */}
      <TSphere position={[0, AHC[1] - 0.1, mz]} scale={[0.155, 0.105, 0.13]} color={MUZZLE} emissive={MUZZLE} emissiveIntensity={0.15} segments={16}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={[s * 0.048, AHC[1] - 0.072, mf - 0.012]} scale={[0.015, 0.011, 0.01]} color={NOSTRIL} segments={6} castShadow={false} />
      ))}
      <Smile position={[0, AHC[1] - 0.122, mf - 0.012]} width={0.04} pitch={-0.4} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AHC, AHR, s * 0.103, 0.038, -0.014)} size={0.056} yaw={faceYaw(AHC, AHR, s * 0.103, 0.038)} color={EYE} />
          {/* lashes */}
          <TSphere
            position={onFace(AHC, AHR, s * 0.155, 0.082, -0.004)}
            rotation={[0, faceYaw(AHC, AHR, s * 0.155, 0.082), s * -0.7]}
            scale={[0.026, 0.008, 0.01]}
            color={TOON.eye}
            segments={6}
            castShadow={false}
          />
          <Blush position={onFace(AHC, AHR, s * 0.19, -0.045, -0.004)} yaw={faceYaw(AHC, AHR, s * 0.19, -0.045)} />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

// As a pet it walks on all fours: the body tips forward about the hips until
// the arms reach the floor as front legs, and the head turns back up.
const RIGS: Record<'baby' | 'kid' | 'adult', PetRig> = {
  baby: { pivot: [0, 0.08, 0], pitch: 1.1, neck: [0, 0.25, 0.02], shift: [0, 0.04, -0.1], headLift: 0.02, frontLegs: true, lie: 0.06 },
  kid: { pivot: [0, 0.17, 0], pitch: 1.35, neck: [0, 0.48, 0], shift: [0, 0.1, -0.16], headLift: 0.05, frontLegs: true, lie: 0.15 },
  adult: { pivot: [0, 0.46, 0], pitch: 1.4, neck: [0, 0.85, 0], shift: [0, -0.06, -0.3], headLift: 0.12, frontLegs: true, lie: 0.3 },
}

/** Unicorn: baby, kid and adult (see `Staged`); `posture="pet"` re-poses it as a pet (see `gaits.ts`). */
export function Unicorn({ stage, posture, pet }: CreatureProps) {
  return <Staged id="unicorn" stage={stage} posture={posture} pet={pet} rigs={RIGS} baby={UnicornBaby} kid={UnicornKid} adult={UnicornAdult} />
}
