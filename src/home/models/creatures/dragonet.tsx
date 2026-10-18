import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
import { TCapsule, TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { Arm, Blush, Eye, Ink, Leg, Smile, Staged, Wag, Wing, faceYaw, onFace } from '../parts'
import type { CreatureProps } from '../parts'

// One palette for all three ages.
const AQUA = '#6fc8ea'
const AQUA_DARK = '#4ea6cf'
const BELLY = '#fff3c6'
const HORN = '#fff1d2'
const PINK = '#ff9fc6'

const HC = [0, 0.69, 0.03] as const
const HR = [0.27, 0.245, 0.25] as const

/**
 * Dragonet — a baby dragon: sky-aqua with a butter-cream tummy, a round snout,
 * stubby cream horns, little fin ears, pink back spikes, small flapping pink
 * wings and a wagging tail with a pink spade tip.
 */
function DragonetKid() {
  const aqua = AQUA
  const aquaDark = AQUA_DARK
  const belly = BELLY
  const horn = HORN
  const pink = PINK
  return (
    <group>
      <Leg x={-0.1} y={0.17} color={aqua} phase={0} />
      <Leg x={0.1} y={0.17} color={aqua} phase={Math.PI} />

      <TSphere position={[0, 0.33, 0]} scale={[0.22, 0.21, 0.2]} color={aqua} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.1]} scale={[0.15, 0.155, 0.115]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      <Arm x={-0.18} y={0.44} z={0.02} color={aqua} phase={Math.PI} />
      <Arm x={0.18} y={0.44} z={0.02} color={aqua} phase={0} />

      {/* back spikes */}
      {[
        [0.5, -0.155, 0.045],
        [0.39, -0.2, 0.04],
        [0.28, -0.205, 0.034],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.1, 0, 0]} radius={r} height={r * 2} segments={8} scale={[0.6, 1, 1]} color={pink}>
          <Ink crease />
        </TCone>
      ))}

      {/* tail with a spade tip */}
      <Wag position={[0, 0.17, -0.16]} amp={0.35}>
        <group rotation={[1.95, 0, 0]}>
          <TCapsule radius={0.05} length={0.18} position={[0, -0.1, 0]} color={aqua} segments={10}>
            <Ink />
          </TCapsule>
          <TCone position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]} radius={0.065} height={0.1} segments={4} scale={[1, 1, 0.35]} color={pink}>
            <Ink crease />
          </TCone>
        </group>
      </Wag>

      {/* little flapping wings */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.1} y={0.47} z={-0.15} side={s} rest={[0, 0.55, 0.45]} flap={0.35}>
          <TCapsule radius={0.022} length={0.16} position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={aquaDark} segments={8}>
            <Ink />
          </TCapsule>
          <TSphere position={[0.11, -0.055, 0]} scale={[0.1, 0.07, 0.02]} color={pink} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={aqua} segments={24}>
        <Ink />
      </TSphere>
      {/* stubby horns + fin ears */}
      {[-1, 1].map((s) => (
        <group key={`h${s}`}>
          <TCone position={[s * 0.1, 0.92, -0.04]} rotation={[-0.45, 0, -s * 0.25]} radius={0.042} height={0.13} segments={10} color={horn}>
            <Ink crease />
          </TCone>
          <TCone position={[s * 0.27, 0.76, -0.02]} rotation={[0, 0, -s * 1.05]} radius={0.06} height={0.14} segments={8} scale={[1, 1, 0.35]} color={aquaDark}>
            <Ink crease />
          </TCone>
        </group>
      ))}
      {/* round snout, nostrils, smile */}
      <TSphere position={[0, 0.615, 0.17]} scale={[0.14, 0.09, 0.11]} color={aqua} segments={16}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={[s * 0.035, 0.645, 0.27]} scale={0.011} color={TOON.eye} segments={6} castShadow={false} />
      ))}
      <Smile position={[0, 0.6, 0.28]} width={0.035} pitch={-0.35} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(HC, HR, s * 0.105, 0.03, -0.014)} size={0.064} yaw={faceYaw(HC, HR, s * 0.105, 0.03)} />
          <Blush position={onFace(HC, HR, s * 0.19, -0.04, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.04)} />
        </group>
      ))}
    </group>
  )
}

// ── Baby ─────────────────────────────────────────────────────────────────────

const BC = [0, 0.34, 0.03] as const
const BR = [0.2, 0.172, 0.185] as const
const BSC = [0, 0.258, 0.148] as const
const BSR = [0.09, 0.055, 0.07] as const

/**
 * Baby dragonet (22 shapes) — an aqua hatchling bean under a huge round head:
 * big low glossy eyes, a button snout, two upright cream horn nubs, pink wing
 * nubs that flutter fast, a cream tummy and a stubby pink-tipped tail.
 */
function DragonetBaby() {
  return (
    <group>
      <Leg x={-0.072} y={0.08} color={AQUA} radius={0.04} foot={[0.052, 0.036, 0.066]} phase={0} />
      <Leg x={0.072} y={0.08} color={AQUA} radius={0.04} foot={[0.052, 0.036, 0.066]} phase={Math.PI} />

      {/* bean body + cream tummy */}
      <TSphere position={[0, 0.148, 0]} scale={[0.138, 0.12, 0.13]} color={AQUA} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.13, 0.068]} scale={[0.09, 0.08, 0.072]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={14} castShadow={false} />

      {/* stubby tail, curled up, pink */}
      <Wag position={[0, 0.1, -0.11]} amp={0.45} speed={4}>
        <TCone position={[0, 0.02, -0.045]} rotation={[-1.3, 0, 0]} radius={0.045} height={0.12} segments={10} color={PINK}>
          <Ink crease />
        </TCone>
      </Wag>

      {/* fluttering wing nubs */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.065} y={0.235} z={-0.095} side={s} rest={[0, 0.6, 0.5]} flap={0.5}>
          <TSphere position={[0.05, -0.012, 0]} scale={[0.055, 0.04, 0.015]} color={PINK} segments={12}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* huge head */}
      <TSphere position={[...BC]} scale={[...BR]} color={AQUA} segments={24}>
        <Ink />
      </TSphere>
      {/* upright horn nubs */}
      {[-1, 1].map((s) => (
        <TCone key={`h${s}`} position={[s * 0.075, 0.505, 0.0]} rotation={[-0.25, 0, -s * 0.2]} radius={0.03} height={0.07} segments={10} color={HORN}>
          <Ink crease />
        </TCone>
      ))}
      {/* button snout + smile */}
      <TSphere position={[...BSC]} scale={[...BSR]} color={AQUA} segments={16}>
        <Ink />
      </TSphere>
      <Smile position={[0, 0.248, BSC[2] + BSR[2] + 0.002]} width={0.028} thickness={0.008} pitch={-0.3} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(BC, BR, s * 0.083, 0.0, -0.012)} size={0.058} wide={0.82} yaw={faceYaw(BC, BR, s * 0.083, 0.0)} />
          <Blush position={onFace(BC, BR, s * 0.145, -0.06, -0.004)} yaw={faceYaw(BC, BR, s * 0.145, -0.06)} size={0.04} />
        </group>
      ))}
    </group>
  )
}

// ── Adult ────────────────────────────────────────────────────────────────────

type P3 = readonly [number, number, number]

/**
 * A smooth tube through `pts` that tapers from radius `r0` to `r1`: a curved
 * tail in a single mesh. Open at both ends (the root hides inside the body,
 * the tip is capped by the spade).
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

// The tail, from its root inside the hips: back and down, then flicked up in a
// playful J so the pink spade stands up behind (the dragon's lies long instead).
const TAIL_PTS: readonly P3[] = [
  [0, 0.06, 0.1],
  [0, -0.1, -0.12],
  [0, -0.22, -0.3],
  [0, -0.2, -0.47],
  [0, -0.07, -0.58],
  [0, 0.09, -0.59],
]
let tailGeo: TubeGeometry | null = null
const tail = () => (tailGeo ??= taperTube(TAIL_PTS, 0.085, 0.03))
const TAIL_CURVE = new CatmullRomCurve3(TAIL_PTS.map(([x, y, z]) => new Vector3(x, y, z)))
const TAIL_TIP = TAIL_CURVE.getPointAt(1)
const TAIL_DIR = TAIL_CURVE.getTangentAt(1)
const SPADE_H = 0.14

const AC = [0, 1.02, 0.04] as const
const AR = [0.265, 0.25, 0.255] as const
const ASC = [0, 0.945, 0.19] as const
const ASR = [0.145, 0.095, 0.115] as const

/**
 * Grown-up dragonet (38 shapes) — a lithe sky-and-sea dragon: a slim chest over
 * rounded hips on long legs, a cream tummy, upright cream horns, big frilly fin
 * ears and a pink fin frill down the back of the head, a row of pink fins down
 * the back, rounded petal wings (two pink lobes) that flutter quickly, and a
 * long tail flicked up in a J with a pink spade on top.
 */
function DragonetAdult() {
  return (
    <group>
      <Leg x={-0.11} y={0.44} color={AQUA} radius={0.08} foot={[0.095, 0.058, 0.12]} phase={0} />
      <Leg x={0.11} y={0.44} color={AQUA} radius={0.08} foot={[0.095, 0.058, 0.12]} phase={Math.PI} />

      {/* slim chest over rounded hips + cream tummy */}
      <TSphere position={[0, 0.72, 0]} scale={[0.185, 0.235, 0.175]} color={AQUA} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.49, -0.01]} scale={[0.225, 0.185, 0.2]} color={AQUA} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.59, 0.09]} scale={[0.135, 0.235, 0.11]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={18} castShadow={false} />

      <Arm x={-0.165} y={0.81} z={0.03} color={AQUA} radius={0.048} length={0.15} splay={0.36} pitch={0.15} phase={Math.PI} />
      <Arm x={0.165} y={0.81} z={0.03} color={AQUA} radius={0.048} length={0.15} splay={0.36} pitch={0.15} phase={0} />

      {/* pink back fins */}
      {[
        [0.84, -0.15, 0.05],
        [0.66, -0.175, 0.048],
        [0.5, -0.2, 0.042],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.1, 0, 0]} radius={r} height={r * 2} segments={8} scale={[0.6, 1, 1]} color={PINK}>
          <Ink crease />
        </TCone>
      ))}

      {/* long tail flicked up in a J, pink spade on top */}
      <Wag position={[0, 0.42, -0.13]} amp={0.3} speed={3}>
        <mesh geometry={tail()} material={toonMaterial(AQUA)} castShadow>
          <Ink crease />
        </mesh>
        <TCone
          position={[TAIL_TIP.x, TAIL_TIP.y + TAIL_DIR.y * SPADE_H * 0.4, TAIL_TIP.z + TAIL_DIR.z * SPADE_H * 0.4]}
          rotation={[Math.atan2(TAIL_DIR.z, TAIL_DIR.y), 0, 0]}
          radius={0.085}
          height={SPADE_H}
          segments={4}
          scale={[1, 1, 0.35]}
          color={PINK}
        >
          <Ink crease />
        </TCone>
      </Wag>

      {/* rounded petal wings: a slim bone over two pink lobes */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.1} y={0.87} z={-0.13} side={s} rest={[0.05, 0.55, 0.5]} flap={0.36}>
          <TCapsule radius={0.026} length={0.28} position={[0.155, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={AQUA_DARK} segments={8}>
            <Ink />
          </TCapsule>
          <TSphere position={[0.205, -0.088, 0]} rotation={[0, 0, -0.15]} scale={[0.155, 0.105, 0.022]} color={PINK} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={[0.08, -0.125, -0.004]} rotation={[0, 0, 0.3]} scale={[0.095, 0.085, 0.02]} color={PINK} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* head */}
      <TSphere position={[...AC]} scale={[...AR]} color={AQUA} segments={24}>
        <Ink />
      </TSphere>
      {/* pink fin frill down the back of the head */}
      <TSphere position={[0, 1.13, -0.2]} rotation={[0.55, 0, 0]} scale={[0.026, 0.16, 0.12]} color={PINK} segments={14}>
        <Ink />
      </TSphere>
      {/* upright horns + big frilly fin ears */}
      {[-1, 1].map((s) => (
        <group key={`h${s}`}>
          <TCone position={[s * 0.105, 1.29, -0.03]} rotation={[-0.3, 0, -s * 0.22]} radius={0.046} height={0.19} segments={10} color={HORN}>
            <Ink crease />
          </TCone>
          <TCone position={[s * 0.28, 1.07, -0.03]} rotation={[0.1, 0, -s * 1.1]} radius={0.085} height={0.21} segments={6} scale={[1, 1, 0.3]} color={AQUA_DARK}>
            <Ink crease />
          </TCone>
        </group>
      ))}
      {/* round snout, nostrils, smile */}
      <TSphere position={[...ASC]} scale={[...ASR]} color={AQUA} segments={18}>
        <Ink />
      </TSphere>
      {[-1, 1].map((s) => (
        <TSphere key={`n${s}`} position={onFace(ASC, ASR, s * 0.038, 0.035, -0.004)} scale={0.012} color={TOON.eye} segments={6} castShadow={false} />
      ))}
      <Smile position={onFace(ASC, ASR, 0, -0.02, 0.002)} width={0.04} thickness={0.0095} pitch={-0.35} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(AC, AR, s * 0.11, 0.045, -0.014)} size={0.059} yaw={faceYaw(AC, AR, s * 0.11, 0.045)} />
          <Blush position={onFace(AC, AR, s * 0.19, -0.03, -0.004)} yaw={faceYaw(AC, AR, s * 0.19, -0.03)} />
        </group>
      ))}
    </group>
  )
}

/** Dragonet: baby, kid and adult (see `Staged`). */
export function Dragonet({ stage }: CreatureProps) {
  return <Staged stage={stage} baby={DragonetBaby} kid={DragonetKid} adult={DragonetAdult} />
}
