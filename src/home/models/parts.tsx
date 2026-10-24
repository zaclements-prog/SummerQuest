/* eslint-disable react-refresh/only-export-components -- shared model helpers (components + tiny math utils), not an HMR boundary */
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { TorusGeometry } from 'three'
import type { ColorRepresentation, Group } from 'three'
import { TBox, TCapsule, TSphere } from '../../toon/shapes'
import type { Vec3 } from '../../toon/shapes'
import { toonMaterial } from '../../toon/materials'
import { TOON } from '../../toon/palette'
import { useWalkState } from './walkState'
import { Outline } from '../../toon/outline'
import type { PetStage } from '../../lib/pets/types'
import { PetRoot, bodyTilt, usePet } from './petRig'
import type { PetCtx, PetOptions } from './petRig'
import { cyclePeriod, legPhase, legSlot, legSwing, splayToFloor, tipPoint } from './gaits'
import type { PetRig, Posture } from './gaits'

export type { Vec3 }
export { PetBody, PetHead } from './petRig'
export type { PetRig } from './gaits'

/**
 * The building blocks every creature and accessory is made of: a soft-toon
 * chibi toy kit layered on `src/toon`. Everything here is allocation-free per
 * frame (animated parts only write numbers into an existing group's rotation).
 */

const CADENCE = 9 // walk-cycle speed: matches the avatar's step bob (sin(t * 9))

// ── Growth stages ────────────────────────────────────────────────────────────

/** Props every creature model takes. */
export interface CreatureProps {
  /** The growth stage to draw (see `PetStage`); avatars are adults, the default. */
  stage?: PetStage
  /**
   * `avatar` (default): the upright chibi the player walks as. `pet`: the same
   * model re-posed as the animal it is, with its own gait and idles (see
   * `gaits.ts`). Pet mode needs the model's walk state to be the pet's own.
   */
  posture?: Posture
  /** pet mode: scene options (calm idles, a fixed seed for renders) */
  pet?: PetOptions
}

/**
 * Picks a creature's model for its growth stage. A stage without its own model
 * shows the kid model instead (a baby at 60 % size), so a creature can gain its
 * baby and adult art one at a time. As a pet (`posture="pet"`) the model is
 * wrapped in its `PetRoot`, using the rig authored for that stage (`rigs`) and
 * the gait profile for `id` (`GAITS`).
 */
export function Staged({
  id,
  stage = 'adult',
  posture = 'avatar',
  pet,
  rigs,
  baby: Baby,
  kid: Kid,
  adult: Adult,
}: {
  /** the creature id (its gait profile) */
  id?: string
  stage?: PetStage
  posture?: Posture
  pet?: PetOptions
  /** pet-mode rigs per stage (a stage without one stands upright) */
  rigs?: Partial<Record<PetStage, PetRig>>
  baby?: () => ReactNode
  kid: () => ReactNode
  adult?: () => ReactNode
}) {
  let model: ReactNode
  if (stage === 'baby') {
    model = Baby ? <Baby /> : (
      <group scale={0.6}>
        <Kid />
      </group>
    )
  } else if (stage === 'adult' && Adult) model = <Adult />
  else model = <Kid />
  if (posture !== 'pet') return model
  return (
    <PetRoot id={id ?? ''} stage={stage} rig={rigs?.[stage]} options={pet}>
      {model}
    </PetRoot>
  )
}

// ── Line work ────────────────────────────────────────────────────────────────

/** Outline weight for creatures and accessories, in CSS pixels. */
export const INK_PX = 2

/**
 * A thin, warm-dark ink line around the parent mesh (drei inverted hull). Put it
 * as the child of a toon shape: `<TSphere …><Ink /></TSphere>`.
 *
 * The thickness is given in screen pixels (drei's default, non-`screenspace`
 * mode offsets the hull in clip space), so the line stays crisp and even from
 * the far iso World camera to the close-up studio — and on a scaled or squashed
 * ellipsoid. `crease` re-smooths normals first; use it on shapes with hard rims
 * (cylinders, cones) so the hull doesn't split at the cap edge.
 */
export function Ink({ px = INK_PX, crease = false }: { px?: number; crease?: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr)
  return <Outline thickness={px * dpr} color={TOON.outline} crease={crease} />
}

// ── Surface helpers (pure math, used while authoring) ────────────────────────

/**
 * z of the FRONT surface of an ellipsoid (radii rx, ry, rz) at offset (dx, dy)
 * from its centre. Lets features (eyes, cheeks, noses) sit exactly on a head.
 */
export function frontZ(rx: number, ry: number, rz: number, dx: number, dy: number): number {
  const k = 1 - (dx / rx) ** 2 - (dy / ry) ** 2
  return rz * Math.sqrt(Math.max(0, k))
}

/** Yaw that turns a feature at (dx, z) on a round face toward the surface normal. */
export function yawOn(dx: number, z: number): number {
  return Math.atan2(dx, Math.max(1e-3, z))
}

type V3 = readonly [number, number, number]

/**
 * A point on the front surface of a head ellipsoid (centre `c`, radii `r`) at
 * offset (dx, dy) from its centre, pushed out along z by `lift`.
 */
export function onFace(c: V3, r: V3, dx: number, dy: number, lift = 0): Vec3 {
  return [c[0] + dx, c[1] + dy, c[2] + frontZ(r[0], r[1], r[2], dx, dy) + lift]
}

/** Yaw for a feature at offset dx on the front of a head ellipsoid (c, r). */
export function faceYaw(_c: V3, r: V3, dx: number, dy: number): number {
  return yawOn(dx * (r[2] / r[0]) ** 2, frontZ(r[0], r[1], r[2], dx, dy))
}

// ── Body parts ───────────────────────────────────────────────────────────────

/**
 * A soft rounded box (toon). Kept for compatibility with older callers; new
 * creature code prefers spheres/capsules.
 */
export function Part({
  position,
  args,
  color,
  radius,
  emissive,
  emissiveIntensity,
  castShadow = true,
  rotation,
  outline,
}: {
  position?: Vec3
  args: [number, number, number]
  color: ColorRepresentation
  radius?: number
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  castShadow?: boolean
  rotation?: Vec3
  outline?: boolean
}) {
  return (
    <TBox
      size={args}
      radius={radius ?? Math.min(...args) * 0.32}
      position={position}
      rotation={rotation}
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      castShadow={castShadow}
    >
      {outline && <Ink />}
    </TBox>
  )
}

/**
 * A big glossy chibi eye: a dark rounded eyeball (slightly tall, flattened onto
 * the face) with a large and a tiny white catch-light. `size` is the eye's
 * height radius. Point it with `yaw`/`pitch` so it hugs a round head. `iris`
 * adds a lighter lower crescent (amber owl eyes, etc.).
 */
export function Eye({
  position,
  size = 0.06,
  yaw = 0,
  pitch = 0,
  color = TOON.eye,
  iris,
  wide = 0.8,
}: {
  position: Vec3
  size?: number
  yaw?: number
  pitch?: number
  color?: ColorRepresentation
  iris?: ColorRepresentation
  /** width / height of the eye */
  wide?: number
}) {
  const s = size
  return (
    <group position={position} rotation={[pitch, yaw, 0, 'YXZ']}>
      <TSphere scale={[s * wide, s, s * 0.5]} color={color} segments={16} castShadow={false} />
      {iris && (
        <TSphere
          position={[0, -s * 0.36, s * 0.16]}
          scale={[s * wide * 0.72, s * 0.5, s * 0.36]}
          color={iris}
          segments={12}
          castShadow={false}
        />
      )}
      {/* catch-lights */}
      <TSphere
        position={[s * wide * 0.32, s * 0.4, s * 0.4]}
        scale={[s * 0.3, s * 0.3, s * 0.14]}
        color={TOON.white}
        emissive={TOON.white}
        emissiveIntensity={1}
        segments={8}
        castShadow={false}
      />
      <TSphere
        position={[-s * wide * 0.3, -s * 0.38, s * 0.4]}
        scale={[s * 0.13, s * 0.13, s * 0.08]}
        color={TOON.white}
        emissive={TOON.white}
        emissiveIntensity={1}
        segments={6}
        castShadow={false}
      />
    </group>
  )
}

/** A soft pink blush oval lying on the cheek (turn it with `yaw`). */
export function Blush({
  position,
  yaw = 0,
  size = 0.05,
  color = TOON.blush,
}: {
  position: Vec3
  yaw?: number
  size?: number
  color?: ColorRepresentation
}) {
  return (
    <TSphere
      position={position}
      rotation={[0, yaw, 0]}
      scale={[size, size * 0.6, size * 0.3]}
      color={color}
      emissive={color}
      emissiveIntensity={0.25}
      segments={10}
      castShadow={false}
    />
  )
}

// Half-rings for little smiles, one per line-weight ratio, shared by every creature.
const smileCache = new Map<number, TorusGeometry>()
function smileGeometry(tube: number): TorusGeometry {
  const k = Math.round(tube * 50) / 50
  let g = smileCache.get(k)
  if (!g) {
    g = new TorusGeometry(1, k, 6, 14, Math.PI)
    smileCache.set(k, g)
  }
  return g
}

/**
 * A tiny curved smile (half ring, opening upward). `width` is the half-width
 * and `thickness` the line weight (world units). `cat` draws the "ω" cat mouth
 * (two small arcs side by side).
 */
export function Smile({
  position,
  width = 0.035,
  thickness = 0.009,
  yaw = 0,
  pitch = 0,
  cat = false,
  color = TOON.eye,
}: {
  position: Vec3
  width?: number
  thickness?: number
  yaw?: number
  pitch?: number
  cat?: boolean
  color?: ColorRepresentation
}) {
  const mat = toonMaterial(color)
  if (cat) {
    const w = width / 2
    const g = smileGeometry(thickness / w)
    return (
      <group position={position} rotation={[pitch, yaw, 0]}>
        <mesh geometry={g} material={mat} position={[-w, 0, 0]} rotation={[0, 0, Math.PI]} scale={[w, w, w * 0.8]} />
        <mesh geometry={g} material={mat} position={[w, 0, 0]} rotation={[0, 0, Math.PI]} scale={[w, w, w * 0.8]} />
      </group>
    )
  }
  return (
    <mesh
      geometry={smileGeometry(thickness / width)}
      material={mat}
      position={position}
      rotation={[pitch, yaw, Math.PI]}
      scale={[width, width * 0.8, width * 0.6]}
    />
  )
}

/**
 * A stubby leg that pivots at the hip `(x, y, z)` and swings while the creature
 * walks (reads the creature's walk state, see `useWalkState`). The leg hangs straight down to the floor
 * (y = 0) and ends in a rounded foot that pokes forward. Give the two legs
 * opposite phases (0 and π).
 */
function AvatarLeg({
  x,
  y,
  z = 0,
  color,
  footColor,
  radius = 0.065,
  foot = [0.08, 0.055, 0.1],
  phase = 0,
  swing = 0.6,
  outline = true,
}: {
  x: number
  /** hip height (top of the leg) */
  y: number
  z?: number
  color: ColorRepresentation
  footColor?: ColorRepresentation
  radius?: number
  /** foot ellipsoid radii; its sole rests on the floor */
  foot?: Vec3
  phase?: number
  swing?: number
  outline?: boolean
}) {
  const hip = useRef<Group>(null)
  const walk = useWalkState()
  useFrame(() => {
    const g = hip.current
    if (!g) return
    g.rotation.x = walk.moving ? Math.sin(walk.t * CADENCE + phase) * swing : 0
  })
  const len = Math.max(0.001, y - foot[1] - radius * 0.5)
  return (
    <group ref={hip} position={[x, y, z]}>
      <TCapsule radius={radius} length={len} position={[0, -len / 2, 0]} color={color} segments={10}>
        {outline && <Ink />}
      </TCapsule>
      <TSphere
        position={[0, -y + foot[1], foot[2] * 0.3]}
        scale={foot}
        color={footColor ?? color}
        segments={14}
      >
        {outline && <Ink />}
      </TSphere>
    </group>
  )
}

/**
 * A little arm hanging from the shoulder `(x, y, z)`, splayed out to its side
 * and swinging opposite the same-side leg while walking. Ends in a round paw.
 */
function AvatarArm({
  x,
  y,
  z = 0,
  color,
  pawColor,
  radius = 0.05,
  length = 0.1,
  splay = 0.45,
  pitch = 0,
  phase = 0,
  swing = 0.5,
  outline = true,
}: {
  x: number
  y: number
  z?: number
  color: ColorRepresentation
  pawColor?: ColorRepresentation
  radius?: number
  length?: number
  splay?: number
  /** tilt the arm forward (+) at rest */
  pitch?: number
  phase?: number
  swing?: number
  outline?: boolean
}) {
  const side = x >= 0 ? 1 : -1
  const sh = useRef<Group>(null)
  const walk = useWalkState()
  useFrame(() => {
    const g = sh.current
    if (!g) return
    g.rotation.x = -pitch + (walk.moving ? Math.sin(walk.t * CADENCE + phase) * swing : 0)
  })
  return (
    <group position={[x, y, z]} rotation={[0, 0, side * splay]}>
      <group ref={sh} rotation={[-pitch, 0, 0]}>
        <TCapsule radius={radius} length={length} position={[0, -length / 2, 0]} color={color} segments={10}>
          {outline && <Ink />}
        </TCapsule>
        {pawColor && (
          <TSphere position={[0, -length - radius * 0.2, 0]} scale={radius * 1.12} color={pawColor} segments={12} />
        )}
      </group>
    </group>
  )
}

/**
 * A wing that flaps gently and continuously (winged creatures look alive even at
 * rest) and faster while walking. Pivots at the shoulder `(x, y, z)`; `rest`
 * is the resting [pitch, sweep-back yaw, raise roll]. Children are the wing shape, authored for the
 * RIGHT side (+x) — the left wing is mirrored automatically.
 */
function AvatarWing({
  x,
  y,
  z,
  side,
  rest = [0, 0.5, 0.35],
  flap = 0.35,
  children,
}: {
  x: number
  y: number
  z: number
  side: 1 | -1
  rest?: Vec3
  flap?: number
  children: ReactNode
}) {
  const root = useRef<Group>(null)
  const walk = useWalkState()
  useFrame(() => {
    const g = root.current
    if (!g) return
    const speed = walk.moving ? 14 : 5
    const f = Math.sin(walk.t * speed) * flap
    g.rotation.z = rest[2] + f
  })
  // The left wing is the right one mirrored (scale −1 on x), so the same roll
  // flaps both wings symmetrically.
  return (
    <group position={[x, y, z]} scale={[side, 1, 1]}>
      <group rotation={[rest[0], rest[1], 0]}>
        <group ref={root} rotation={[0, 0, rest[2]]}>
          {children}
        </group>
      </group>
    </group>
  )
}

/**
 * A tail root that wags side to side (around y) all the time, a little faster
 * while walking. Children are the tail, authored pointing back (−z) from the
 * root at `position`.
 */
function AvatarWag({
  position,
  rotation,
  amp = 0.3,
  speed = 3,
  children,
}: {
  position: Vec3
  rotation?: Vec3
  amp?: number
  speed?: number
  children: ReactNode
}) {
  const g = useRef<Group>(null)
  const walk = useWalkState()
  useFrame(() => {
    const r = g.current
    if (!r) return
    r.rotation.y = Math.sin(walk.t * (walk.moving ? speed * 2.4 : speed)) * amp
  })
  return (
    <group position={position} rotation={rotation}>
      <group ref={g}>{children}</group>
    </group>
  )
}

/**
 * A curling octopus tentacle: a chain of shrinking beads hanging from `(x, y, z)`
 * and splayed out along `yaw`. Each bead joint bends a little, rippling with a
 * phase so the arms wiggle softly at rest and paddle while walking.
 */
function AvatarTentacle({
  x,
  y,
  z,
  yaw,
  color,
  tipColor,
  phase = 0,
  radius = 0.078,
  outline = true,
}: {
  x: number
  y: number
  z: number
  yaw: number
  color: ColorRepresentation
  tipColor?: ColorRepresentation
  phase?: number
  radius?: number
  outline?: boolean
}) {
  const j0 = useRef<Group>(null)
  const j1 = useRef<Group>(null)
  const j2 = useRef<Group>(null)
  const walk = useWalkState()
  useFrame(() => {
    const m = walk.moving
    const t = walk.t * (m ? 9 : 2.6) + phase
    const a = m ? 0.32 : 0.14
    if (j0.current) j0.current.rotation.x = 0.55 + Math.sin(t) * a
    if (j1.current) j1.current.rotation.x = 0.5 + Math.sin(t - 0.9) * a
    if (j2.current) j2.current.rotation.x = 0.6 + Math.sin(t - 1.8) * a * 1.2
  })
  const r = radius
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <group ref={j0}>
        <TSphere position={[0, -r * 0.6, 0]} scale={[r, r * 1.15, r]} color={color} segments={12}>
          {outline && <Ink />}
        </TSphere>
        <group ref={j1} position={[0, -r * 1.3, 0]}>
          <TSphere position={[0, -r * 0.55, 0]} scale={[r * 0.82, r, r * 0.82]} color={color} segments={12}>
            {outline && <Ink />}
          </TSphere>
          <group ref={j2} position={[0, -r * 1.1, 0]}>
            <TSphere position={[0, -r * 0.45, 0]} scale={r * 0.62} color={tipColor ?? color} segments={10}>
              {outline && <Ink />}
            </TSphere>
          </group>
        </group>
      </group>
    </group>
  )
}

/**
 * A baby's nub foot: one round pad under the hip that paddles like a `Leg`
 * while the baby toddles (no shin: the hip is barely off the floor).
 */
function AvatarNub({ x, phase, color, size }: { x: number; phase: number; color: ColorRepresentation; size: Vec3 }) {
  const hip = useRef<Group>(null)
  const walk = useWalkState()
  useFrame(() => {
    if (hip.current) hip.current.rotation.x = walk.moving ? Math.sin(walk.t * 9 + phase) * 0.6 : 0
  })
  return (
    <group ref={hip} position={[x, 0.075, 0.01]}>
      <TSphere position={[0, -0.04, 0.022]} scale={size} color={color} segments={12}>
        <Ink />
      </TSphere>
    </group>
  )
}

// ── Pet mode ─────────────────────────────────────────────────────────────────
// The exported limbs below pick the avatar part (unchanged) or its pet-mode
// twin, depending on whether the model sits in a `PetRoot` (see `petRig.tsx`).

type LegProps = Parameters<typeof AvatarLeg>[0]
type ArmProps = Parameters<typeof AvatarArm>[0]
type WingProps = Parameters<typeof AvatarWing>[0]
type WagProps = Parameters<typeof AvatarWag>[0]
type TentacleProps = Parameters<typeof AvatarTentacle>[0]

/**
 * A stubby leg that pivots at the hip `(x, y, z)` and swings while the creature
 * walks (reads the creature's walk state, see `useWalkState`). The leg hangs
 * straight down to the floor (y = 0) and ends in a rounded foot that pokes
 * forward. Give the two legs opposite phases (0 and π). As a pet it is a hind
 * leg in the gait (see `PetLimb`).
 */
export function Leg(props: LegProps) {
  const pet = usePet()
  if (!pet) return <AvatarLeg {...props} />
  return (
    <PetLimb
      pet={pet}
      front={false}
      x={props.x}
      y={props.y}
      z={props.z ?? 0}
      color={props.color}
      footColor={props.footColor}
      radius={props.radius ?? 0.065}
      foot={props.foot ?? [0.08, 0.055, 0.1]}
      swing={props.swing ?? 0.6}
      outline={props.outline ?? true}
    />
  )
}

/**
 * A little arm hanging from the shoulder `(x, y, z)`, splayed out to its side
 * and swinging opposite the same-side leg while walking. Ends in a round paw.
 * As a four-legged pet (`rig.frontLegs`) it becomes a front leg reaching the
 * floor; otherwise it swings on the pet's stride.
 */
export function Arm(props: ArmProps) {
  const pet = usePet()
  if (!pet) return <AvatarArm {...props} />
  if (pet.rig.frontLegs && !pet.inHead) {
    const r = props.radius ?? 0.05
    return (
      <PetLimb
        pet={pet}
        front
        x={props.x}
        y={props.y}
        z={props.z ?? 0}
        color={props.color}
        footColor={props.pawColor ?? props.color}
        radius={r * 1.05}
        foot={[r * 1.22, r * 0.9, r * 1.42]}
        swing={props.swing ?? 0.5}
        outline={props.outline ?? true}
      />
    )
  }
  return <PetArm pet={pet} {...props} />
}

/** A baby's nub foot (see `AvatarNub`); as a pet, a stubby hind leg. */
export function Nub({ x, phase, color, size = [0.052, 0.036, 0.064] }: { x: number; phase: number; color: ColorRepresentation; size?: Vec3 }) {
  const pet = usePet()
  if (!pet) return <AvatarNub x={x} phase={phase} color={color} size={size} />
  return <PetLimb pet={pet} front={false} x={x} y={0.075} z={0.01} color={color} radius={size[0] * 0.62} foot={size} swing={0.55} outline />
}

/**
 * Front feet for a pet whose baby model has no arms (they'd stand on its two
 * legs alone): a pair of stubby front legs at the shoulders `(±x, y, z)` of
 * the tipped body. Draws nothing for the avatar. Put it inside `PetBody`.
 */
export function FrontFeet({
  x,
  y,
  z = 0,
  color,
  footColor,
  radius,
  foot,
}: {
  x: number
  y: number
  z?: number
  color: ColorRepresentation
  footColor?: ColorRepresentation
  radius: number
  foot: Vec3
}) {
  const pet = usePet()
  if (!pet || !pet.rig.frontLegs) return null
  return (
    <>
      {[-1, 1].map((s) => (
        <PetLimb key={s} pet={pet} front x={s * x} y={y} z={z} color={color} footColor={footColor} radius={radius} foot={foot} swing={0.5} outline />
      ))}
    </>
  )
}

/**
 * A wing that flaps gently and continuously (winged creatures look alive even at
 * rest) and faster while walking. Pivots at the shoulder `(x, y, z)`; `rest`
 * is the resting [pitch, sweep-back yaw, raise roll]. Children are the wing shape, authored for the
 * RIGHT side (+x) — the left wing is mirrored automatically. As a pet it
 * folds (dragons) or flutters on each hop (birds).
 */
export function Wing(props: WingProps) {
  const pet = usePet()
  if (!pet) return <AvatarWing {...props} />
  return <PetWing pet={pet} {...props} />
}

/**
 * A tail root that wags side to side (around y) all the time, a little faster
 * while walking. Children are the tail, authored pointing back (−z) from the
 * root at `position`. As a pet it keeps its authored angle while the body
 * tips, and swishes with the stride.
 */
export function Wag(props: WagProps) {
  const pet = usePet()
  if (!pet) return <AvatarWag {...props} />
  return <PetWag pet={pet} {...props} />
}

/**
 * A curling octopus tentacle: a chain of shrinking beads hanging from `(x, y, z)`
 * and splayed out along `yaw`. Each bead joint bends a little, rippling with a
 * phase so the arms wiggle softly at rest and paddle while walking. As a pet
 * the arms stream out behind in a travelling wave as it glides (`dir`: the
 * arm's outward heading, 0 = ahead, when it sits in a turned group).
 */
export function Tentacle({ dir, ...props }: TentacleProps & { dir?: number }) {
  const pet = usePet()
  if (!pet) return <AvatarTentacle {...props} />
  return <PetTentacle pet={pet} dir={dir} {...props} />
}

const _tip: [number, number] = [0, 0]

/**
 * One leg of a pet: a hind leg at the hip (`front` false) or a front leg at
 * the shoulder of the tipped body (`front`: an arm turned leg). Its length is
 * fitted once so the foot stands on the floor; each frame it swings on its
 * slot's phase of the gait, lifts its foot mid-swing, stretches a touch to
 * keep a planted foot down, and splays out to keep its foot on the floor as
 * the pet lies down.
 */
function PetLimb({
  pet,
  front,
  x,
  y,
  z,
  color,
  footColor,
  radius,
  foot,
  swing,
  outline,
}: {
  pet: PetCtx
  front: boolean
  x: number
  y: number
  z: number
  color: ColorRepresentation
  footColor?: ColorRepresentation
  radius: number
  foot: Vec3
  swing: number
  outline: boolean
}) {
  const hip = useRef<Group>(null)
  const shin = useRef<Group>(null)
  const sole = useRef<Group>(null)
  const rig = pet.rig
  const rides = front && !pet.inHead
  // where the joint ends up on the re-posed pet, and the leg that reaches the floor from there
  const jointY = rides ? tipPoint(rig, y, z, _tip)[0] : y + (rig.shift?.[1] ?? 0)
  const reach = Math.max(0.02, jointY - foot[1])
  const len = Math.max(0.001, reach - radius * 0.5)
  const dz = (front ? rig.frontZ : rig.hindZ) ?? 0
  // a front leg rides the tipped body: its z nudge is along the floor, so turn it into body space
  const pos: Vec3 = rides ? [x, y + dz * Math.sin(rig.pitch), z + dz * Math.cos(rig.pitch)] : [x, y, z + dz]
  const slot = legSlot(front, x)
  useFrame(() => {
    const g = hip.current
    if (!g) return
    const p = pet.pose
    const gait = pet.gait
    const q = p.q + legPhase(gait.kind, slot)
    const sw = legSwing(q, gait.swing * pet.tempo.swing * (swing / 0.55), gait.lift, front ? gait.prance : 0)
    let a = sw.angle * p.walk
    const lift = sw.lift * p.walk
    // hops: hind legs fling back in the air and gather under for the crouch; front legs reach ahead
    if (gait.hop) a += front ? -p.legs * 0.55 : p.legs * (gait.kind === 'hop' ? 1.15 : 0.3)
    // lying down: splay out so the foot stays on the floor as the body sinks
    // (four-legged: front paws forward, hind legs back; two-legged: feet forward, sitting)
    const drop = (rig.lie ?? 0) * p.lie
    if (drop > 0) {
      const sp = splayToFloor(jointY - drop, foot[1], reach)
      a = a * (1 - p.lie) + (front || gait.body !== 'quad' ? -sp : sp)
    }
    // a planted foot stays on the floor through the bob and the swing; a swinging one lifts
    const c = Math.max(0.3, Math.cos(a))
    let k = (jointY - drop + p.bob - foot[1]) / (reach * c)
    k = Math.min(1.3, Math.max(0.55, k)) * (1 - lift)
    g.rotation.x = (rides ? -bodyTilt(pet) : 0) + a
    if (shin.current) shin.current.scale.y = k
    if (sole.current) sole.current.position.y = -reach * k
  })
  return (
    <group ref={hip} position={pos}>
      <group ref={shin}>
        <TCapsule radius={radius} length={len} position={[0, -len / 2, 0]} color={color} segments={10}>
          {outline && <Ink />}
        </TCapsule>
      </group>
      <group ref={sole} position={[0, -reach, 0]}>
        <TSphere position={[0, 0, foot[2] * 0.3]} scale={foot} color={footColor ?? color} segments={14}>
          {outline && <Ink />}
        </TSphere>
      </group>
    </group>
  )
}

/** A pet's arm that stays an arm (the trex's little arms, the baby octopus' nubs): it swings on the stride. */
function PetArm({
  pet,
  x,
  y,
  z = 0,
  color,
  pawColor,
  radius = 0.05,
  length = 0.1,
  splay = 0.45,
  pitch = 0,
  phase = 0,
  swing = 0.5,
  outline = true,
}: ArmProps & { pet: PetCtx }) {
  const side = x >= 0 ? 1 : -1
  const sh = useRef<Group>(null)
  useFrame(() => {
    const g = sh.current
    if (!g) return
    const p = pet.pose
    g.rotation.x = -pitch + Math.sin(p.q + phase) * swing * p.walk + Math.sin(p.clock * 2.6 + phase) * 0.12 * (1 - p.walk)
  })
  return (
    <group position={[x, y, z]} rotation={[0, 0, side * splay]}>
      <group ref={sh} rotation={[-pitch, 0, 0]}>
        <TCapsule radius={radius} length={length} position={[0, -length / 2, 0]} color={color} segments={10}>
          {outline && <Ink />}
        </TCapsule>
        {pawColor && (
          <TSphere position={[0, -length - radius * 0.2, 0]} scale={radius * 1.12} color={pawColor} segments={12} />
        )}
      </group>
    </group>
  )
}

/** Wing roll and extra sweep-back when folded against the body. */
const WING_FOLD = { roll: -0.12, sweep: 0.55 } as const
/**
 * A dragon's hop-glide: wings out to the side and close to level (`roll`),
 * swept a little back (`sweep`), stroking slowly ±`beat` (see `glideWing`).
 */
const WING_GLIDE = { roll: 0.12, sweep: 0.32, beat: 0.3 } as const
/**
 * A bird's hop: wings raised `raise` away from the body and tipped `back`
 * and `sweep` toward the tail (so it shows from the side too), flapping
 * ±`beat` (see `hopWing`).
 */
const WING_HOP = { raise: 1.25, back: 1.1, sweep: 0.45, beat: 0.4 } as const

/**
 * A pet's wing: held level while the body tips; dragons keep theirs folded
 * while they walk and spread them out wide for a hop-glide; birds lift theirs
 * away from the body on each hop. A gentle breathing flap otherwise. The pose
 * (`wing`, `beat`) drives it, so it follows the gait's own clock.
 */
function PetWing({ pet, x, y, z, side, rest = [0, 0.5, 0.35], flap = 0.35, children }: WingProps & { pet: PetCtx }) {
  const lvl = useRef<Group>(null)
  const sweep = useRef<Group>(null)
  const root = useRef<Group>(null)
  const ph = useRef(0)
  useFrame((_, dt) => {
    const p = pet.pose
    ph.current += Math.min(dt, 0.1) * 5
    const breathe = Math.sin(ph.current) * flap
    if (lvl.current) lvl.current.rotation.x = pet.inHead ? 0 : -bodyTilt(pet)
    const sw = sweep.current
    const r = root.current
    if (!sw || !r) return
    if (pet.gait.foldWings) {
      const open = p.wing
      const fold = 1 - open
      sw.rotation.x = rest[0]
      sw.rotation.y = (rest[1] + WING_FOLD.sweep) * fold + WING_GLIDE.sweep * open
      r.rotation.z = WING_FOLD.roll * fold + WING_GLIDE.roll * open + WING_GLIDE.beat * p.beat + 0.15 * breathe * fold
    } else {
      sw.rotation.x = rest[0] + WING_HOP.back * p.wing
      sw.rotation.y = rest[1] + WING_HOP.sweep * p.wing
      r.rotation.z = rest[2] + WING_HOP.raise * p.wing + WING_HOP.beat * p.beat + 0.75 * breathe * (1 - p.wing)
    }
  })
  return (
    <group position={[x, y, z]} scale={[side, 1, 1]}>
      <group ref={lvl}>
        <group ref={sweep} rotation={[rest[0], rest[1], 0]}>
          <group ref={root} rotation={[0, 0, rest[2]]}>
            {children}
          </group>
        </group>
      </group>
    </group>
  )
}

/**
 * A pet's tail: it keeps its authored angle as the body tips (raised by the
 * rig's `tailLift`), swishes once per stride while walking, and wags fast for
 * the wag idle.
 */
function PetWag({ pet, position, rotation, amp = 0.3, speed = 3, children }: WagProps & { pet: PetCtx }) {
  const lvl = useRef<Group>(null)
  const g = useRef<Group>(null)
  const ph = useRef(0)
  useFrame((_, dt) => {
    const p = pet.pose
    const w = p.walk
    const strideRate = (Math.PI * 2) / cyclePeriod(pet.gait, pet.tempo)
    const rate = speed * (1 - w) + strideRate * w
    ph.current += Math.min(dt, 0.1) * rate * (1 + 1.8 * p.wag)
    const a = (amp * (1 - w) + pet.gait.tail * w) * (1 + 1.1 * p.wag)
    if (g.current) g.current.rotation.y = Math.sin(ph.current) * a
    if (lvl.current) lvl.current.rotation.x = pet.inHead ? 0 : -bodyTilt(pet) + (pet.rig.tailLift ?? 0)
  })
  return (
    <group position={position}>
      <group ref={lvl}>
        <group rotation={rotation}>
          <group ref={g}>{children}</group>
        </group>
      </group>
    </group>
  )
}

/**
 * A pet octopus arm: while it glides the arms stream back (the front ones
 * sweep under and back, the back ones trail out) and a wave runs down each
 * arm and from the front arms to the back.
 */
function PetTentacle({
  pet,
  x,
  y,
  z,
  yaw,
  dir,
  color,
  tipColor,
  phase = 0,
  radius = 0.078,
  outline = true,
}: TentacleProps & { pet: PetCtx; dir?: number }) {
  const j0 = useRef<Group>(null)
  const j1 = useRef<Group>(null)
  const j2 = useRef<Group>(null)
  const ph = useRef(0)
  // how far ahead this arm points (+1 straight ahead, −1 straight back); it bends out along −z of its yaw
  const ahead = dir !== undefined ? Math.cos(dir) : -Math.cos(yaw)
  useFrame((_, dt) => {
    const p = pet.pose
    const w = p.walk
    ph.current += Math.min(dt, 0.1) * (2.6 * (1 - w) + ((Math.PI * 2) / cyclePeriod(pet.gait, pet.tempo)) * w)
    const t = ph.current + phase * 0.35 + 1.4 * ahead * w
    const a = 0.14 + 0.16 * w
    const trail = 0.6 * w
    if (j0.current) j0.current.rotation.x = 0.55 - trail * ahead + Math.sin(t) * a
    if (j1.current) j1.current.rotation.x = 0.5 - trail * 0.7 * ahead + Math.sin(t - 0.9) * a
    if (j2.current) j2.current.rotation.x = 0.6 - trail * 0.3 * ahead + Math.sin(t - 1.8) * a * 1.2
  })
  const r = radius
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <group ref={j0}>
        <TSphere position={[0, -r * 0.6, 0]} scale={[r, r * 1.15, r]} color={color} segments={12}>
          {outline && <Ink />}
        </TSphere>
        <group ref={j1} position={[0, -r * 1.3, 0]}>
          <TSphere position={[0, -r * 0.55, 0]} scale={[r * 0.82, r, r * 0.82]} color={color} segments={12}>
            {outline && <Ink />}
          </TSphere>
          <group ref={j2} position={[0, -r * 1.1, 0]}>
            <TSphere position={[0, -r * 0.45, 0]} scale={r * 0.62} color={tipColor ?? color} segments={10}>
              {outline && <Ink />}
            </TSphere>
          </group>
        </group>
      </group>
    </group>
  )
}
