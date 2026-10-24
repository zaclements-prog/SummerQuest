import { TCone, TSphere } from '../../../toon/shapes'
import type { Vec3 } from '../../../toon/shapes'
import { Blush, Eye, Ink, Leg, PetBody, PetHead, Staged, Wag, Wing, faceYaw, onFace } from '../parts'
import type { CreatureProps, PetRig } from '../parts'

// One palette for all three ages: an inky indigo bird (a raven's black, kept
// light enough to read in toon shading), a violet sheen on the wings, a soft
// slate chest, pale lavender eye patches so the dark eyes still show, and a
// silvery-grey beak and feet.
const PLUME = '#4b4f7a'
const PLUME_DARK = '#383b61'
const SHEEN = '#6f6aae'
const CHEST = '#666b9a'
const EYE_PATCH = '#e9e5ff'
const BEAK = '#a19fb6'
const BEAK_DARK = '#7f7d96'

type P3 = readonly [number, number, number]

/**
 * A raven's strong beak: an upper cone from `base` (on the face) pointing
 * forward and drooping a little (`droop`, radians), over a smaller, darker
 * lower one. Flattened so it's wider than tall.
 */
function Beak({ base, length, radius, droop = 0.28 }: { base: Vec3; length: number; radius: number; droop?: number }) {
  const dir = [0, -Math.sin(droop), Math.cos(droop)] as const
  const at = (h: number, down = 0): Vec3 => [base[0], base[1] + dir[1] * h - down, base[2] + dir[2] * h]
  return (
    <>
      <TCone position={at(length / 2)} rotation={[Math.PI / 2 + droop, 0, 0]} radius={radius} height={length} segments={10} scale={[1, 1, 0.72]} color={BEAK}>
        <Ink crease />
      </TCone>
      <TCone position={at(length * 0.32, radius * 0.55)} rotation={[Math.PI / 2 + droop + 0.18, 0, 0]} radius={radius * 0.7} height={length * 0.62} segments={8} scale={[1, 1, 0.6]} color={BEAK_DARK}>
        <Ink crease />
      </TCone>
    </>
  )
}

/** The pale eye patch and the big glossy eye on it, on a head ellipsoid (c, r). */
function RavenEye({ c, r, dx, dy, size, patch }: { c: P3; r: P3; dx: number; dy: number; size: number; patch: number }) {
  const yaw = faceYaw(c, r, dx, dy)
  return (
    <>
      <TSphere position={onFace(c, r, dx, dy, -0.014)} rotation={[0, yaw, 0]} scale={[patch, patch * 1.08, 0.03]} color={EYE_PATCH} emissive={EYE_PATCH} emissiveIntensity={0.12} segments={16} castShadow={false} />
      <Eye position={onFace(c, r, dx, dy, -0.004)} size={size} wide={0.86} yaw={yaw} />
    </>
  )
}

// ── Kid ──────────────────────────────────────────────────────────────────────

const HC = [0, 0.7, 0.03] as const
const HR = [0.265, 0.235, 0.245] as const

/**
 * Raven — a round chibi raven: an indigo egg of a body under a big sleek head
 * with a little swept-back crest, pale eye patches round big glossy eyes, a
 * strong grey beak over a shaggy throat ruff, a slate chest, violet-tipped
 * wings that flap and a wedge of a tail.
 */
function RavenKid() {
  return (
    <group>
      <Leg x={-0.095} y={0.12} color={BEAK} radius={0.042} foot={[0.068, 0.038, 0.095]} phase={0} />
      <Leg x={0.095} y={0.12} color={BEAK} radius={0.042} foot={[0.068, 0.038, 0.095]} phase={Math.PI} />
      <PetBody>

      {/* egg body + slate chest */}
      <TSphere position={[0, 0.37, 0]} scale={[0.24, 0.26, 0.225]} color={PLUME} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.34, 0.1]} scale={[0.16, 0.18, 0.14]} color={CHEST} segments={16} castShadow={false} />

      {/* wedge tail */}
      <Wag position={[0, 0.2, -0.17]} amp={0.12} speed={2.5}>
        <TSphere position={[0, -0.05, -0.08]} rotation={[-0.6, 0, 0]} scale={[0.085, 0.024, 0.13]} color={PLUME_DARK} segments={12}>
          <Ink />
        </TSphere>
      </Wag>

      {/* wings: an indigo covert over a violet flight feather */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.225} y={0.47} z={-0.02} side={s} rest={[0, 0.28, 0.2]} flap={0.24}>
          <TSphere position={[0.03, -0.17, -0.04]} rotation={[0.25, 0, 0.1]} scale={[0.055, 0.15, 0.09]} color={SHEEN} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0.022, -0.1, 0]} rotation={[0, 0, 0.12]} scale={[0.07, 0.14, 0.11]} color={PLUME_DARK} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      <PetHead>
      {/* head */}
      <TSphere position={[...HC]} scale={[...HR]} color={PLUME} segments={24}>
        <Ink />
      </TSphere>
      {/* swept-back crest */}
      {[
        [0.94, 0.0, 0.055, 0.15, -0.55],
        [0.92, -0.08, 0.045, 0.12, -0.9],
      ].map(([y, z, r, h, tilt]) => (
        <TCone key={z} position={[0, y, z]} rotation={[tilt, 0, 0]} radius={r} height={h} segments={8} scale={[0.6, 1, 1]} color={PLUME_DARK}>
          <Ink crease />
        </TCone>
      ))}
      {/* shaggy throat ruff */}
      {[-1, 0, 1].map((s) => (
        <TCone key={`ruff${s}`} position={onFace(HC, HR, s * 0.05, -0.2, -0.03)} rotation={[Math.PI - 0.55, 0, s * 0.35]} radius={0.04} height={0.085} segments={6} scale={[1, 1, 0.5]} color={PLUME} castShadow={false}>
          <Ink crease />
        </TCone>
      ))}

      {[-1, 1].map((s) => (
        <group key={s}>
          <RavenEye c={HC} r={HR} dx={s * 0.1} dy={0.025} size={0.058} patch={0.074} />
          <Blush position={onFace(HC, HR, s * 0.19, -0.075, -0.004)} yaw={faceYaw(HC, HR, s * 0.19, -0.075)} size={0.042} />
        </group>
      ))}
      <Beak base={onFace(HC, HR, 0, -0.06, -0.025)} length={0.2} radius={0.06} />
      </PetHead>
      </PetBody>
    </group>
  )
}

// ── Baby ─────────────────────────────────────────────────────────────────────

const BC = [0, 0.34, 0.02] as const
const BR = [0.21, 0.18, 0.19] as const

/**
 * Baby raven (21 shapes) — a downy indigo puff: a huge round head on a little
 * fluffy bean, a wispy fluff tuft on top, enormous eyes on pale patches, a
 * stubby beak, wing nubs that flutter fast, a slate tummy and grey feet.
 */
function RavenBaby() {
  return (
    <group>
      <Leg x={-0.068} y={0.075} color={BEAK} radius={0.03} foot={[0.05, 0.03, 0.064]} phase={0} />
      <Leg x={0.068} y={0.075} color={BEAK} radius={0.03} foot={[0.05, 0.03, 0.064]} phase={Math.PI} />
      <PetBody>

      {/* fluffy bean + slate tummy */}
      <TSphere position={[0, 0.155, 0]} scale={[0.15, 0.13, 0.14]} color={PLUME} segments={18}>
        <Ink />
      </TSphere>
      <TSphere position={[0, 0.13, 0.07]} scale={[0.1, 0.085, 0.08]} color={CHEST} segments={14} castShadow={false} />

      {/* a stub of a tail */}
      <TCone position={[0, 0.1, -0.135]} rotation={[-2.2, 0, 0]} radius={0.05} height={0.08} segments={4} scale={[1, 1, 0.35]} color={PLUME_DARK}>
        <Ink crease />
      </TCone>

      {/* wing nubs */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.14} y={0.205} z={-0.005} side={s} rest={[0, 0.2, 0.3]} flap={0.42}>
          <TSphere position={[0.012, -0.05, 0]} rotation={[0, 0, 0.15]} scale={[0.04, 0.065, 0.06]} color={SHEEN} segments={12}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      <PetHead>
      {/* huge round head */}
      <TSphere position={[...BC]} scale={[...BR]} color={PLUME} segments={24}>
        <Ink />
      </TSphere>
      {/* wispy fluff tuft */}
      {[-1, 1].map((s) => (
        <TCone key={`tuft${s}`} position={[s * 0.025, 0.525, -0.01]} rotation={[-0.25, 0, -s * 0.45]} radius={0.03} height={0.075} segments={8} color={PLUME_DARK}>
          <Ink crease />
        </TCone>
      ))}

      {[-1, 1].map((s) => (
        <group key={s}>
          <RavenEye c={BC} r={BR} dx={s * 0.08} dy={-0.01} size={0.058} patch={0.07} />
          <Blush position={onFace(BC, BR, s * 0.145, -0.08, -0.004)} yaw={faceYaw(BC, BR, s * 0.145, -0.08)} size={0.034} />
        </group>
      ))}
      <Beak base={onFace(BC, BR, 0, -0.07, -0.02)} length={0.11} radius={0.042} droop={0.32} />
      </PetHead>
      </PetBody>
    </group>
  )
}

// ── Adult ────────────────────────────────────────────────────────────────────

const AC = [0, 1.04, 0.04] as const
const AR = [0.26, 0.235, 0.25] as const
// the tall egg body and its slate chest
const TC = [0, 0.64, 0] as const
const TR = [0.24, 0.32, 0.225] as const
const CC = [0, 0.62, 0.095] as const
const CR = [0.165, 0.235, 0.15] as const

/**
 * Grown-up raven (37 shapes) — tall and clever: a tall indigo body on long
 * grey legs, a slate chest, a long shaggy throat ruff, big layered wings (an
 * indigo covert over two long violet flight feathers whose tips cross behind)
 * folded at the sides, a long diamond wedge of a tail, a sleek head with a
 * tall swept-back crest, pale eye patches round big glossy eyes and a long,
 * strong, slightly hooked beak.
 */
function RavenAdult() {
  return (
    <group>
      <Leg x={-0.095} y={0.43} color={BEAK} radius={0.042} foot={[0.08, 0.045, 0.12]} phase={0} />
      <Leg x={0.095} y={0.43} color={BEAK} radius={0.042} foot={[0.08, 0.045, 0.12]} phase={Math.PI} />
      <PetBody>

      {/* tall egg body + slate chest */}
      <TSphere position={[...TC]} scale={[...TR]} color={PLUME} segments={22}>
        <Ink />
      </TSphere>
      <TSphere position={[...CC]} scale={[...CR]} color={CHEST} segments={18} castShadow={false} />

      {/* long wedge of a tail with a diamond tip */}
      <Wag position={[0, 0.42, -0.19]} amp={0.1} speed={2.5}>
        <TSphere position={[0, -0.08, -0.13]} rotation={[-0.6, 0, 0]} scale={[0.11, 0.028, 0.21]} color={PLUME_DARK} segments={14}>
          <Ink />
        </TSphere>
        <TCone position={[0, -0.225, -0.335]} rotation={[-2.17, 0, 0]} radius={0.075} height={0.1} segments={4} scale={[1, 1, 0.3]} color={PLUME_DARK}>
          <Ink crease />
        </TCone>
      </Wag>

      {/* layered wings: indigo covert over two long violet flight feathers */}
      {([-1, 1] as const).map((s) => (
        <Wing key={s} x={s * 0.22} y={0.86} z={-0.02} side={s} rest={[0, 0.26, 0.18]} flap={0.2}>
          <TSphere position={[0.02, -0.36, -0.1]} rotation={[0.35, 0, 0.12]} scale={[0.045, 0.2, 0.08]} color={SHEEN} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0.032, -0.24, -0.04]} rotation={[0.2, 0, 0.1]} scale={[0.062, 0.2, 0.105]} color={SHEEN} segments={14}>
            <Ink />
          </TSphere>
          <TSphere position={[0.022, -0.1, 0.004]} rotation={[0, 0, 0.12]} scale={[0.075, 0.135, 0.12]} color={PLUME_DARK} segments={14}>
            <Ink />
          </TSphere>
        </Wing>
      ))}

      {/* long shaggy throat ruff */}
      {[
        [-0.065, 0.83, 0.045],
        [0.065, 0.83, 0.045],
        [0, 0.81, 0.055],
      ].map(([x, y, r]) => (
        <TCone
          key={`${x}${y}`}
          position={[x, y, onFace(AC, AR, x, y - AC[1], -0.035)[2]]}
          rotation={[Math.PI - 0.5, 0, x * 5]}
          radius={r}
          height={r * 2.1}
          segments={6}
          scale={[1, 1, 0.45]}
          color={PLUME}
          castShadow={false}
        >
          <Ink crease />
        </TCone>
      ))}

      <PetHead>
      {/* head */}
      <TSphere position={[...AC]} scale={[...AR]} color={PLUME} segments={24}>
        <Ink />
      </TSphere>
      {/* tall swept-back crest */}
      {[
        [1.3, 0.03, 0.06, 0.2, -0.5],
        [1.28, -0.06, 0.055, 0.17, -0.85],
        [1.22, -0.15, 0.045, 0.13, -1.2],
      ].map(([y, z, r, h, tilt]) => (
        <TCone key={z} position={[0, y, z]} rotation={[tilt, 0, 0]} radius={r} height={h} segments={8} scale={[0.6, 1, 1]} color={PLUME_DARK}>
          <Ink crease />
        </TCone>
      ))}

      {[-1, 1].map((s) => (
        <group key={s}>
          <RavenEye c={AC} r={AR} dx={s * 0.1} dy={0.03} size={0.056} patch={0.072} />
          <Blush position={onFace(AC, AR, s * 0.19, -0.075, -0.004)} yaw={faceYaw(AC, AR, s * 0.19, -0.075)} size={0.044} />
        </group>
      ))}
      <Beak base={onFace(AC, AR, 0, -0.065, -0.025)} length={0.26} radius={0.068} droop={0.3} />
      </PetHead>
      </PetBody>
    </group>
  )
}

// As a pet the raven hop-waddles like the owl (`BIRD_HOP` in `gaits.ts`), with the same rig.
const RIGS: Record<'baby' | 'kid' | 'adult', PetRig> = {
  baby: { pivot: [0, 0.075, 0], pitch: 0.08, neck: [0, 0.22, 0], lie: 0.03 },
  kid: { pivot: [0, 0.12, 0], pitch: 0.12, neck: [0, 0.55, 0], lie: 0.07 },
  adult: { pivot: [0, 0.43, 0], pitch: 0.12, neck: [0, 0.9, 0], lie: 0.22 },
}

/** Raven (the Schoolhouse pet): baby, kid and adult (see `Staged`); `posture="pet"` re-poses it as a pet. */
export function Raven({ stage, posture, pet }: CreatureProps) {
  return <Staged id="raven" stage={stage} posture={posture} pet={pet} rigs={RIGS} baby={RavenBaby} kid={RavenKid} adult={RavenAdult} />
}
