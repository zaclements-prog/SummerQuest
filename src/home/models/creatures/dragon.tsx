import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
import { TCapsule, TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { Arm, Blush, Eye, FrontFeet, Ink, Leg, PetBody, PetHead, Smile, Staged, Wag, Wing, faceYaw, onFace } from '../parts'
import type { CreatureProps, PetRig } from '../parts'

// One palette for all three ages.
const RED = '#f0665a'
const RED_DARK = '#cf4b45'
const BELLY = '#ffe3a1'
const HORN = '#fff0c4'
const MEMBRANE = '#ffad5c'
const GOLD = '#ffd04d'
const BLUSH = '#ffb0a8'

const HC = [0, 0.72, 0.03] as const
const HR = [0.275, 0.25, 0.255] as const

/**
 * Dragon — the grand top creature: coral-red scales and a golden tummy, swept
 * cream horns and fin ears, gold-ringed glossy eyes, golden back spikes, a
 * spade-tipped tail, and big orange wings (a bone arm with a scalloped
 * three-lobe membrane) that beat slowly at rest and fast while walking.
 */
function DragonKid() {
  const red = RED
  const redDark = RED_DARK
  const belly = BELLY
  const horn = HORN
  const membrane = MEMBRANE
  const gold = GOLD
  return (
    <group>
      <Leg x={-0.11} y={0.18} color={red} radius={0.07} foot={[0.085, 0.055, 0.11]} phase={0} />
      <Leg x={0.11} y={0.18} color={red} radius={0.07} foot={[0.085, 0.055, 0.11]} phase={Math.PI} />
      <PetBody>

      <TSphere position={[0, 0.35, 0]} scale={[0.235, 0.225, 0.215]} color={red} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.32, 0.105]} scale={[0.16, 0.165, 0.125]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.19} y={0.47} z={0.02} color={red} phase={Math.PI} />
      <Arm x={0.19} y={0.47} z={0.02} color={red} phase={0} />

      {/* golden back spikes */}
      {[
        [0.53, -0.17, 0.05],
        [0.41, -0.21, 0.045],
        [0.29, -0.215, 0.038],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.1, 0, 0]} radius={r} height={r * 2.1} segments={8} scale={[0.6, 1, 1]} color={gold}>
          <Ink crease />
        </TCone>
      ))}

      {/* spade-tipped tail */}
      <Wag position={[0, 0.19, -0.17]} amp={0.3}>
        <group rotation={[1.85, 0, 0]}>
          <TCapsule radius={0.055} length={0.22} position={[0, -0.12, 0]} color={red} segments={10}>
            <Ink />
          </TCapsule>
          <TCone position={[0, -0.28, 0]} rotation={[Math.PI, 0, 0]} radius={0.08} height={0.12} segments={4} scale={[1, 1, 0.35]} color={gold}>
            <Ink crease />
          </TCone>
        </group>
      </Wag>

      {/* big wings */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.11} y={0.52} z={-0.15} side={s} rest={[0, 0.5, 0.5]} flap={0.3}>
          <TCapsule radius={0.028} length={0.24} position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={redDark} segments={8}>
            <Ink />
          </TCapsule>
          <TCone position={[0.275, 0.0, 0]} rotation={[0, 0, -Math.PI / 2]} radius={0.03} height={0.06} segments={8} color={horn} castShadow={false} />
          {[
            [0.07, 0.09, 0.075],
            [0.15, 0.08, 0.075],
            [0.23, 0.06, 0.06],
          ].map(([x, w, h]) => (
            <TSphere key={x} position={[x, -h * 0.85, 0]} scale={[w, h * 1.4, 0.02]} color={membrane} segments={14}>
              <Ink />
            </TSphere>
          ))}
        </Wing>
      ))}

      <PetHead>
      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={red} segments={24}>
        <Ink />
      </TSphere>
      {/* swept horns + fin ears */}
      {[-1, 1].map((s) => (
        <group key={`h${s}`}>
          <TCone position={[s * 0.12, 0.95, -0.05]} rotation={[-0.6, 0, -s * 0.3]} radius={0.05} height={0.17} segments={10} color={horn}>
            <Ink crease />
          </TCone>
          <TCone position={[s * 0.275, 0.78, -0.03]} rotation={[0, 0, -s * 1.0]} radius={0.065} height={0.15} segments={8} scale={[1, 1, 0.35]} color={redDark}>
            <Ink crease />
          </TCone>
        </group>
      ))}
      {/* snout, nostrils, grin */}
      <TSphere position={[0, 0.645, 0.18]} scale={[0.15, 0.095, 0.11]} color={red} segments={16}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={[s * 0.04, 0.675, 0.284]} scale={0.012} color={TOON.eye} segments={6} castShadow={false} />
      ))}
      <Smile position={[0, 0.628, 0.29]} width={0.04} pitch={-0.35} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye
            position={onFace(HC, HR, s * 0.105, 0.035, -0.014)}
            size={0.064}
            yaw={faceYaw(HC, HR, s * 0.105, 0.035)}
            iris={gold}
          />
          <Blush position={onFace(HC, HR, s * 0.19, -0.035, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.035)} color="#ffb0a8" />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

// ── Baby ─────────────────────────────────────────────────────────────────────

const BC = [0, 0.345, 0.03] as const
const BR = [0.205, 0.175, 0.19] as const
// the little round snout
const BSC = [0, 0.262, 0.15] as const
const BSR = [0.095, 0.058, 0.075] as const

/**
 * Baby dragon (22 shapes) — a red hatchling bean under a huge round head: big
 * low eyes still all dark (the gold comes in as it grows), a button snout,
 * cream horn nubs swept back, orange wing nubs that flutter, a gold tummy and a
 * stubby tail.
 */
function DragonBaby() {
  return (
    <group>
      <Leg x={-0.075} y={0.085} color={RED} radius={0.042} foot={[0.055, 0.038, 0.07]} phase={0} />
      <Leg x={0.075} y={0.085} color={RED} radius={0.042} foot={[0.055, 0.038, 0.07]} phase={Math.PI} />
      <PetBody>
      <FrontFeet x={0.072} y={0.22} z={0.03} color={RED} radius={0.04} foot={[0.052, 0.036, 0.066]} />

      {/* bean body + gold tummy */}
      <TSphere position={[0, 0.15, 0]} scale={[0.145, 0.125, 0.135]} color={RED} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.13, 0.07]} scale={[0.095, 0.085, 0.075]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={14} castShadow={false} />

      {/* stubby tail */}
      <Wag position={[0, 0.09, -0.12]} amp={0.4} speed={3.5}>
        <TCone position={[0, 0.0, -0.045]} rotation={[-1.75, 0, 0]} radius={0.05} height={0.13} segments={10} color={RED}>
          <Ink crease />
        </TCone>
      </Wag>

      {/* fluttering wing nubs */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.07} y={0.24} z={-0.1} side={s} rest={[0, 0.55, 0.45]} flap={0.4}>
          <TSphere position={[0.055, -0.01, 0]} rotation={[0, 0, 0.2]} scale={[0.06, 0.045, 0.016]} color={MEMBRANE} segments={12}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      <PetHead>
      {/* huge head */}
      <TSphere position={[...BC]} scale={[...BR]} color={RED} segments={24}>
        <Ink />
      </TSphere>
      {/* horn nubs, swept back like the grown-up's */}
      {[-1, 1].map((s) => (
        <TCone key={`h${s}`} position={[s * 0.09, 0.505, -0.01]} rotation={[-0.55, 0, -s * 0.3]} radius={0.033} height={0.075} segments={10} color={HORN}>
          <Ink crease />
        </TCone>
      ))}
      {/* button snout + smile */}
      <TSphere position={[...BSC]} scale={[...BSR]} color={RED} segments={16}>
        <Ink />
      </TSphere>
      <Smile position={[0, 0.252, BSC[2] + BSR[2] + 0.002]} width={0.03} thickness={0.008} pitch={-0.3} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(BC, BR, s * 0.085, 0.0, -0.012)} size={0.058} wide={0.82} yaw={faceYaw(BC, BR, s * 0.085, 0.0)} />
          <Blush position={onFace(BC, BR, s * 0.148, -0.06, -0.004)} yaw={faceYaw(BC, BR, s * 0.148, -0.06)} size={0.04} color={BLUSH} />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

// ── Adult ────────────────────────────────────────────────────────────────────

type P3 = readonly [number, number, number]

/**
 * A smooth tube through `pts` that tapers from radius `r0` to `r1`: a curved
 * horn or tail in a single mesh. Open at both ends (the root hides inside the
 * body, the tip is a point or capped by a spade). Built once and shared.
 */
function taperTube(pts: readonly P3[], r0: number, r1: number): TubeGeometry {
  const curve = new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x, y, z)))
  const T = 24
  const R = 10
  const g = new TubeGeometry(curve, T, 1, R, false)
  const pos = g.attributes.position
  const c = new Vector3()
  const v = new Vector3()
  for (let i = 0; i <= T; i++) {
    const u = i / T
    curve.getPointAt(u, c)
    const r = r1 + (r0 - r1) * (1 - u) ** 0.85
    for (let j = 0; j <= R; j++) {
      const k = i * (R + 1) + j
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c)
      pos.setXYZ(k, v.x, v.y, v.z)
    }
  }
  return g
}

/** Where a tube ends and the x-roll that points a +y cone along its last stretch. */
function tubeEnd(pts: readonly P3[]): { at: Vector3; dir: Vector3; roll: number } {
  const curve = new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x, y, z)))
  const at = curve.getPointAt(1)
  const dir = curve.getTangentAt(1)
  return { at, dir, roll: Math.atan2(dir.z, dir.y) }
}

// The right horn (the left is mirrored): up from the temple, then swept back.
// Rooted wide enough to clear a hat's crown.
const HORN_PTS: readonly P3[] = [
  [0.16, 1.2, 0.025],
  [0.2, 1.37, -0.005],
  [0.235, 1.48, -0.085],
  [0.255, 1.54, -0.215],
]
// The tail, from its root inside the hips: down to the floor, along it, and a
// lift at the end for the spade.
const TAIL_PTS: readonly P3[] = [
  [0, 0.06, 0.1],
  [0, -0.1, -0.14],
  [0, -0.27, -0.38],
  [0, -0.31, -0.58],
  [0, -0.22, -0.76],
]
let hornGeo: TubeGeometry | null = null
let tailGeo: TubeGeometry | null = null
const horn = () => (hornGeo ??= taperTube(HORN_PTS, 0.064, 0.006))
const tail = () => (tailGeo ??= taperTube(TAIL_PTS, 0.11, 0.032))
const TAIL_END = tubeEnd(TAIL_PTS)
const SPADE_H = 0.17

const AC = [0, 1.07, 0.03] as const
const AR = [0.28, 0.26, 0.265] as const
// the long, rounded smiling snout
const ASC = [0, 0.985, 0.19] as const
const ASR = [0.165, 0.105, 0.13] as const

/**
 * Grown-up dragon (40 shapes) — the grand prize: tall and proud, a deep chest
 * over sturdy hips on long legs, a golden belly plate, long cream horns that
 * rise from the temples and sweep back (one curved tube each), big fin ears,
 * gold-ringed eyes over a long smiling snout, glowing gold spikes down the
 * back, huge scalloped orange wings that beat slowly, and a long tail (one
 * curved tube) that sweeps along the floor and lifts its gold spade.
 */
function DragonAdult() {
  const redMat = toonMaterial(RED)
  const hornMat = toonMaterial(HORN)
  return (
    <group>
      <Leg x={-0.125} y={0.46} color={RED} radius={0.09} foot={[0.105, 0.062, 0.135]} phase={0} />
      <Leg x={0.125} y={0.46} color={RED} radius={0.09} foot={[0.105, 0.062, 0.135]} phase={Math.PI} />
      <PetBody>

      {/* deep chest over sturdy hips (the neck pinches in under the head) + golden belly plate */}
      <TSphere position={[0, 0.74, 0]} scale={[0.205, 0.25, 0.19]} color={RED} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.5, -0.01]} scale={[0.25, 0.205, 0.22]} color={RED} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.6, 0.1]} scale={[0.155, 0.255, 0.125]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={18} castShadow={false} />

      <Arm x={-0.18} y={0.84} z={0.03} color={RED} radius={0.055} length={0.17} splay={0.32} pitch={0.18} phase={Math.PI} />
      <Arm x={0.18} y={0.84} z={0.03} color={RED} radius={0.055} length={0.17} splay={0.32} pitch={0.18} phase={0} />

      {/* glowing gold spikes down the back */}
      {[
        [0.87, -0.175, 0.078],
        [0.64, -0.2, 0.072],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.05, 0, 0]} radius={r} height={r * 2.2} segments={8} scale={[0.6, 1, 1]} color={GOLD} emissive={GOLD} emissiveIntensity={0.18}>
          <Ink crease />
        </TCone>
      ))}

      {/* long tail along the floor, lifting a gold spade */}
      <Wag position={[0, 0.44, -0.15]} amp={0.2} speed={2.2}>
        <mesh geometry={tail()} material={redMat} castShadow>
          <Ink crease />
        </mesh>
        <TCone
          position={[TAIL_END.at.x, TAIL_END.at.y + TAIL_END.dir.y * SPADE_H * 0.4, TAIL_END.at.z + TAIL_END.dir.z * SPADE_H * 0.4]}
          rotation={[TAIL_END.roll, 0, 0]}
          radius={0.105}
          height={SPADE_H}
          segments={4}
          scale={[1, 1, 0.35]}
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={0.18}
        >
          <Ink crease />
        </TCone>
      </Wag>

      {/* huge wings: a bone arm over a scalloped three-lobe membrane */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.12} y={0.92} z={-0.14} side={s} rest={[0.05, 0.55, 0.42]} flap={0.26}>
          <TCapsule radius={0.035} length={0.44} position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={RED_DARK} segments={8}>
            <Ink />
          </TCapsule>
          {[
            [0.11, 0.14, 0.14],
            [0.26, 0.125, 0.13],
            [0.39, 0.09, 0.1],
          ].map(([x, w, h]) => (
            <TSphere key={x} position={[x, -h * 0.85, 0]} scale={[w, h * 1.45, 0.022]} color={MEMBRANE} segments={14}>
              <Ink />
            </TSphere>
          ))}
        </Wing>
      ))}

      <PetHead>
      {/* head */}
      <TSphere position={[...AC]} scale={[...AR]} color={RED} segments={24}>
        <Ink />
      </TSphere>
      {/* long curved horns + big fin ears */}
      {[-1, 1].map((s) => (
        <group key={`h${s}`}>
          <group scale={[s, 1, 1]}>
            <mesh geometry={horn()} material={hornMat} castShadow>
              <Ink crease />
            </mesh>
          </group>
          <TCone position={[s * 0.3, 1.12, -0.03]} rotation={[0, 0, -s * 1.0]} radius={0.078} height={0.19} segments={8} scale={[1, 1, 0.35]} color={RED_DARK}>
            <Ink crease />
          </TCone>
        </group>
      ))}
      {/* long rounded snout, nostrils, smile */}
      <TSphere position={[...ASC]} scale={[...ASR]} color={RED} segments={18}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={onFace(ASC, ASR, s * 0.045, 0.04, -0.004)} scale={0.013} color={TOON.eye} segments={6} castShadow={false} />
      ))}
      <Smile position={onFace(ASC, ASR, 0, -0.015, 0.002)} width={0.048} thickness={0.01} pitch={-0.35} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AC, AR, s * 0.115, 0.05, -0.014)} size={0.058} yaw={faceYaw(AC, AR, s * 0.115, 0.05)} iris={GOLD} />
          <Blush position={onFace(AC, AR, s * 0.195, -0.025, -0.004)} yaw={faceYaw(AC, AR, s * 0.195, -0.025)} color={BLUSH} />
        </group>
      ))}
      </PetHead>
      </PetBody>
    </group>
  )
}

// As a pet it walks on all fours with its wings folded (the body tips forward
// about the hips until the arms reach the floor), and now and then spreads
// them for a hop-glide (see `GAITS`).
const RIGS: Record<'baby' | 'kid' | 'adult', PetRig> = {
  baby: { pivot: [0, 0.085, 0], pitch: 1.1, neck: [0, 0.25, 0.03], shift: [0, 0.04, -0.1], headLift: 0.02, frontLegs: true, lie: 0.06 },
  kid: { pivot: [0, 0.18, 0], pitch: 1.35, neck: [0, 0.5, 0], shift: [0, 0.1, -0.16], headLift: 0.05, frontLegs: true, lie: 0.15 },
  adult: { pivot: [0, 0.46, 0], pitch: 1.4, neck: [0, 0.85, 0], shift: [0, -0.06, -0.3], headLift: 0.12, frontLegs: true, lie: 0.3 },
}

/** Dragon: baby, kid and adult (see `Staged`); `posture="pet"` re-poses it as a pet (see `gaits.ts`). */
export function Dragon({ stage, posture, pet }: CreatureProps) {
  return <Staged id="dragon" stage={stage} posture={posture} pet={pet} rigs={RIGS} baby={DragonBaby} kid={DragonKid} adult={DragonAdult} />
}
