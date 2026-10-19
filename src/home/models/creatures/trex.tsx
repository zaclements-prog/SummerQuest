import { SphereGeometry } from 'three'
import { TCone, TSphere } from '../../../toon/shapes'
import { TOON } from '../../../toon/palette'
import { toonMaterial } from '../../../toon/materials'
import { Arm, Blush, Eye, Ink, Leg, Smile, Staged, Wag, faceYaw, frontZ, onFace } from '../parts'
import type { CreatureProps } from '../parts'

// One palette for all three ages.
const GREEN = '#68c27a'
const SPOT = '#4fa765'
const BELLY = '#f8f1b4'
const PLATE = '#ffad5a'
const MOUTH = '#7a3148'
const TONGUE = '#ff8ca0'
const SHELL = '#fff7e4'

const HC = [0, 0.71, 0.02] as const
const HR = [0.265, 0.24, 0.25] as const
// the long snout (upper jaw)
const SC = [0, 0.645, 0.18] as const
const SR = [0.2, 0.1, 0.19] as const

/**
 * T-Rex — a chibi dino: a big green head with a long rounded snout and an
 * open, toothy grin (pale jaw, pink tongue, little white teeth), brow ridges
 * and darker spots on the crown, tiny arms held up in front, chunky legs, a
 * pale-yellow tummy, orange plates down the neck and back, and a thick tail
 * that rests on the floor and sways.
 */
function TrexKid() {
  const green = GREEN
  const spot = SPOT
  const belly = BELLY
  const plate = PLATE
  return (
    <group>
      <Leg x={-0.11} y={0.17} color={green} radius={0.075} foot={[0.09, 0.055, 0.12]} phase={0} />
      <Leg x={0.11} y={0.17} color={green} radius={0.075} foot={[0.09, 0.055, 0.12]} phase={Math.PI} />

      <TSphere position={[0, 0.33, -0.02]} scale={[0.22, 0.22, 0.21]} color={green} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.3, 0.085]} scale={[0.15, 0.16, 0.115]} color={belly} emissive={belly} emissiveIntensity={0.22} segments={16} castShadow={false} />

      {/* tiny arms held up in front */}
      <Arm x={-0.14} y={0.43} z={0.12} color={green} radius={0.035} length={0.05} splay={0.25} pitch={0.9} swing={0.3} phase={Math.PI} />
      <Arm x={0.14} y={0.43} z={0.12} color={green} radius={0.035} length={0.05} splay={0.25} pitch={0.9} swing={0.3} phase={0} />

      {/* back plates */}
      {[
        [0.86, -0.18, 0.055],
        [0.53, -0.2, 0.055],
        [0.39, -0.225, 0.05],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.0, 0, 0]} radius={r} height={r * 1.9} segments={8} scale={[0.55, 1, 1]} color={plate}>
          <Ink crease />
        </TCone>
      ))}

      {/* thick tail resting on the floor, swaying */}
      <Wag position={[0, 0.24, -0.17]} amp={0.22} speed={2.4}>
        <group rotation={[-0.3, 0, 0]}>
          <TSphere position={[0, -0.03, -0.1]} scale={[0.13, 0.11, 0.17]} color={green} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.06, -0.27]} scale={[0.075, 0.065, 0.11]} color={green} segments={14}>
            <Ink />
          </TSphere>
          <TCone position={[0, 0.08, -0.15]} rotation={[-1.2, 0, 0]} radius={0.045} height={0.085} segments={8} scale={[0.55, 1, 1]} color={plate}>
            <Ink crease />
          </TCone>
        </group>
      </Wag>

      {/* big head, crown spots */}
      <TSphere position={[...HC]} scale={[...HR]} color={green} segments={24}>
        <Ink />
      </TSphere>
      {[
        [-0.09, 0.9, -0.06, 0.04],
        [0.1, 0.91, -0.03, 0.033],
        [0.0, 0.94, 0.06, 0.028],
      ].map(([x, y, z, r]) => (
        <TSphere key={x} position={[x, y, z]} scale={[r, r * 0.55, r]} color={spot} segments={10} castShadow={false} />
      ))}

      {/* open toothy grin: the long upper snout, a dropped pale jaw, a dark mouth
          between them with a pink tongue, and little white teeth */}
      <TSphere position={[...SC]} scale={[...SR]} color={green} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.575, 0.2]} scale={[0.15, 0.05, 0.14]} color={MOUTH} segments={14} castShadow={false} />
      <group position={[0, 0.535, 0.16]} rotation={[0.16, 0, 0]}>
        <TSphere scale={[0.165, 0.058, 0.165]} color={belly} emissive={belly} emissiveIntensity={0.15} segments={16}>
          <Ink />
        </TSphere>
        <TSphere position={[0, 0.042, 0.1]} scale={[0.065, 0.022, 0.045]} color={TONGUE} segments={10} castShadow={false} />
      </group>
      {[-0.1, -0.04, 0.04, 0.1].map((x) => (
        <TCone
          key={x}
          position={[x, SC[1] - SR[1] * 0.62, SC[2] + frontZ(SR[0], SR[2], SR[2], x, 0) * 0.86]}
          rotation={[Math.PI, 0, 0]}
          radius={0.016}
          height={0.034}
          segments={6}
          color={TOON.white}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={[s * 0.045, 0.705, 0.335]} scale={0.013} color={TOON.eye} segments={6} castShadow={false} />
          {/* little brow ridge over each eye */}
          <TSphere position={onFace(HC, HR, s * 0.12, 0.14, -0.012)} rotation={[0, faceYaw(HC, HR, s * 0.12, 0.14), s * -0.25]} scale={[0.055, 0.022, 0.03]} color={spot} segments={10} castShadow={false} />
          <Eye position={onFace(HC, HR, s * 0.11, 0.08, -0.014)} size={0.06} yaw={faceYaw(HC, HR, s * 0.11, 0.08)} pitch={-0.15} />
          <Blush position={[s * 0.165, 0.67, 0.27]} yaw={s * 0.65} />
        </group>
      ))}
    </group>
  )
}

// ── Baby ─────────────────────────────────────────────────────────────────────

/**
 * The top of a hatched egg: a tall spherical cap whose rim zig-zags where the
 * shell cracked (one open, double-sided mesh, built once and shared).
 */
let shellGeo: SphereGeometry | null = null
function crackedShell(): SphereGeometry {
  if (shellGeo) return shellGeo
  const W = 18 // nine teeth round the rim
  const H = 6
  const g = new SphereGeometry(1, W, H, 0, Math.PI * 2, 0, 1)
  const pos = g.attributes.position
  for (let iy = 0; iy <= H; iy++) {
    for (let ix = 0; ix <= W; ix++) {
      // the rim dips to a point on even columns and notches up on odd ones
      const rim = ix % 2 === 0 ? 1.32 : 1.02
      const theta = (iy / H) * rim
      const phi = (ix / W) * Math.PI * 2
      pos.setXYZ(iy * (W + 1) + ix, -Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta))
    }
  }
  g.computeVertexNormals()
  shellGeo = g
  return g
}

const BC = [0, 0.33, 0.02] as const
const BR = [0.195, 0.168, 0.182] as const
// the short, round snout
const BSC = [0, 0.262, 0.14] as const
const BSR = [0.1, 0.062, 0.09] as const

/**
 * Baby T-Rex (22 shapes) — just hatched and still wearing the top of its egg:
 * a cracked cream eggshell cap tipped on a huge round green head, big low
 * glossy eyes, a short round snout with a happy closed smile, a pale tummy, two
 * tiny arm nubs, one orange back-plate nub and a stubby tail.
 */
function TrexBaby() {
  return (
    <group>
      <Leg x={-0.075} y={0.085} color={GREEN} radius={0.045} foot={[0.058, 0.038, 0.074]} phase={0} />
      <Leg x={0.075} y={0.085} color={GREEN} radius={0.045} foot={[0.058, 0.038, 0.074]} phase={Math.PI} />

      {/* bean body + pale tummy */}
      <TSphere position={[0, 0.15, -0.01]} scale={[0.145, 0.13, 0.14]} color={GREEN} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.13, 0.065]} scale={[0.095, 0.085, 0.075]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={14} castShadow={false} />

      {/* tiny arm nubs */}
      <Arm x={-0.1} y={0.2} z={0.08} color={GREEN} radius={0.026} length={0.025} splay={0.3} pitch={0.9} swing={0.3} phase={Math.PI} />
      <Arm x={0.1} y={0.2} z={0.08} color={GREEN} radius={0.026} length={0.025} splay={0.3} pitch={0.9} swing={0.3} phase={0} />

      {/* one back-plate nub + a stubby tail */}
      <TCone position={[0, 0.25, -0.13]} rotation={[-1.0, 0, 0]} radius={0.035} height={0.065} segments={8} scale={[0.55, 1, 1]} color={PLATE}>
        <Ink crease />
      </TCone>
      <Wag position={[0, 0.11, -0.12]} amp={0.3} speed={3}>
        <TSphere position={[0, -0.03, -0.05]} rotation={[-0.35, 0, 0]} scale={[0.07, 0.06, 0.1]} color={GREEN} segments={14}>
          <Ink />
        </TSphere>
      </Wag>

      {/* huge head + the cracked eggshell cap, tipped to one side */}
      <TSphere position={[...BC]} scale={[...BR]} color={GREEN} segments={24}>
        <Ink />
      </TSphere>
      <mesh
        geometry={crackedShell()}
        material={toonMaterial(SHELL, { doubleSide: true })}
        position={[0.025, 0.37, 0.0]}
        rotation={[-0.12, 0, -0.32]}
        scale={[0.17, 0.2, 0.17]}
        castShadow
      >
        <Ink crease />
      </mesh>

      {/* short round snout + a happy smile */}
      <TSphere position={[...BSC]} scale={[...BSR]} color={GREEN} segments={18}>
        <Ink />
      </TSphere>
      <Smile position={[0, 0.25, BSC[2] + BSR[2] + 0.002]} width={0.034} thickness={0.009} pitch={-0.3} />

      {[-1, 1].map((s) => (
        <group key={s}>
          <Eye position={onFace(BC, BR, s * 0.082, 0.012, -0.012)} size={0.056} wide={0.82} yaw={faceYaw(BC, BR, s * 0.082, 0.012)} />
          <Blush position={onFace(BC, BR, s * 0.14, -0.055, -0.004)} yaw={faceYaw(BC, BR, s * 0.14, -0.055)} size={0.038} />
        </group>
      ))}
    </group>
  )
}

// ── Adult ────────────────────────────────────────────────────────────────────

const AC = [0, 1.06, -0.02] as const
const AR = [0.29, 0.265, 0.27] as const
// the big, friendly upper jaw
const ASC = [0, 0.99, 0.14] as const
const ASR = [0.222, 0.115, 0.205] as const
// torso, leaning a little forward over the hips
const TC = [0, 0.67, -0.05] as const
const TR = [0.225, 0.305, 0.225] as const

/**
 * Grown-up T-Rex (40 shapes) — tall and proud, standing upright: strong
 * haunches on long legs, a deep chest with a pale tummy, the iconic tiny arms
 * held up in front, a big head with a long rounded snout and a big friendly
 * open grin (pale jaw, pink tongue, small blunt teeth), soft brow ridges and
 * crown spots, orange plates from the crown down the back, and a long thick
 * counterweight tail that sweeps to the floor and sways.
 */
function TrexAdult() {
  return (
    <group>
      <Leg x={-0.14} y={0.44} color={GREEN} radius={0.09} foot={[0.11, 0.064, 0.15]} phase={0} />
      <Leg x={0.14} y={0.44} color={GREEN} radius={0.09} foot={[0.11, 0.064, 0.15]} phase={Math.PI} />
      {/* strong haunches */}
      {[-1, 1].map((s) => (
        <TSphere key={`thigh${s}`} position={[s * 0.165, 0.45, -0.05]} rotation={[0.25, 0, s * 0.12]} scale={[0.125, 0.175, 0.17]} color={GREEN} segments={16}>
          <Ink />
        </TSphere>
      ))}

      {/* deep torso + pale tummy */}
      <TSphere position={[...TC]} rotation={[0.12, 0, 0]} scale={[...TR]} color={GREEN} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.63, 0.07]} rotation={[0.12, 0, 0]} scale={[0.16, 0.235, 0.13]} color={BELLY} emissive={BELLY} emissiveIntensity={0.22} segments={18} castShadow={false} />

      {/* the iconic tiny arms, held up in front */}
      <Arm x={-0.165} y={0.8} z={0.09} color={GREEN} radius={0.038} length={0.06} splay={0.3} pitch={0.95} swing={0.3} phase={Math.PI} />
      <Arm x={0.165} y={0.8} z={0.09} color={GREEN} radius={0.038} length={0.06} splay={0.3} pitch={0.95} swing={0.3} phase={0} />

      {/* orange plates from the crown down the back */}
      {[
        [1.18, -0.28, 0.06],
        [0.86, -0.255, 0.066],
        [0.65, -0.29, 0.06],
      ].map(([y, z, r]) => (
        <TCone key={y} position={[0, y, z]} rotation={[-1.0, 0, 0]} radius={r} height={r * 1.9} segments={8} scale={[0.55, 1, 1]} color={PLATE}>
          <Ink crease />
        </TCone>
      ))}

      {/* long, thick counterweight tail sweeping to the floor */}
      <Wag position={[0, 0.5, -0.24]} amp={0.18} speed={2.2}>
        <group rotation={[-0.25, 0, 0]}>
          <TSphere position={[0, -0.04, -0.12]} scale={[0.16, 0.14, 0.21]} color={GREEN} segments={16}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.12, -0.37]} scale={[0.11, 0.095, 0.17]} color={GREEN} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0, -0.19, -0.58]} scale={[0.065, 0.056, 0.13]} color={GREEN} segments={12}>
            <Ink />
          </TSphere>
        </group>
      </Wag>

      {/* big head, crown spots */}
      <TSphere position={[...AC]} scale={[...AR]} color={GREEN} segments={24}>
        <Ink />
      </TSphere>
      {[
        [-0.1, 1.295, -0.08, 0.045],
        [0.09, 1.308, -0.04, 0.037],
      ].map(([x, y, z, r]) => (
        <TSphere key={x} position={[x, y, z]} scale={[r, r * 0.55, r]} color={SPOT} segments={10} castShadow={false} />
      ))}

      {/* big friendly open grin: the long upper snout, a dropped pale jaw, a
          dark mouth between them with a pink tongue, and small blunt teeth */}
      <TSphere position={[...ASC]} scale={[...ASR]} color={GREEN} segments={20}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.912, 0.165]} scale={[0.17, 0.058, 0.16]} color={MOUTH} segments={14} castShadow={false} />
      <group position={[0, 0.866, 0.12]} rotation={[0.16, 0, 0]}>
        <TSphere scale={[0.19, 0.068, 0.18]} color={BELLY} emissive={BELLY} emissiveIntensity={0.15} segments={16}>
          <Ink />
        </TSphere>
        <TSphere position={[0, 0.048, 0.105]} scale={[0.075, 0.025, 0.052]} color={TONGUE} segments={10} castShadow={false} />
      </group>
      {[-0.11, -0.04, 0.04, 0.11].map((x) => (
        <TCone
          key={x}
          position={[x, ASC[1] - ASR[1] * 0.64, ASC[2] + frontZ(ASR[0], ASR[2], ASR[2], x, 0) * 0.86]}
          rotation={[Math.PI, 0, 0]}
          radius={0.019}
          height={0.03}
          segments={6}
          color={TOON.white}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <TSphere position={onFace(ASC, ASR, s * 0.05, 0.05, -0.004)} scale={0.014} color={TOON.eye} segments={6} castShadow={false} />
          {/* soft brow ridge over each eye */}
          <TSphere position={onFace(AC, AR, s * 0.125, 0.16, -0.012)} rotation={[0, faceYaw(AC, AR, s * 0.125, 0.16), s * -0.25]} scale={[0.06, 0.022, 0.03]} color={SPOT} segments={10} castShadow={false} />
          <Eye position={onFace(AC, AR, s * 0.115, 0.088, -0.014)} size={0.058} yaw={faceYaw(AC, AR, s * 0.115, 0.088)} pitch={-0.15} />
          <Blush position={onFace(ASC, ASR, s * 0.15, 0.02, 0.002)} yaw={s * 0.65} />
        </group>
      ))}
    </group>
  )
}

/** Trex: baby, kid and adult (see `Staged`). */
export function Trex({ stage }: CreatureProps) {
  return <Staged stage={stage} baby={TrexBaby} kid={TrexKid} adult={TrexAdult} />
}
