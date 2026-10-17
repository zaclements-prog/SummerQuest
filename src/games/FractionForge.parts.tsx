/* eslint-disable react-refresh/only-export-components -- the yard layout + slab grid constants (BAR/TABLE/PAD/slotWorld) describe exactly what these parts draw; co-located on purpose, not an HMR boundary */
import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { geo } from '../toon/geometry'
import { TOON } from '../toon/palette'
import { TBlob, TBox, TCapsule, TCone, TCyl, TSphere, TTorus } from '../toon/shapes'
import { Bush, Lamp, Rock, Stump } from '../toon/props'
import { ScatterTrees, ToonInstances, type InstanceSpec, type TreeSpot } from '../toon/Scatter'
import { Instances } from '../world/town/kit'
import { chalkText } from '../world/town/chalk'
import { ChibiFace, Decal } from '../world/areas/fraction-falls/kit'
import { blobDisc, fernGeometry } from '../world/areas/fraction-falls/shapes'
import { useSquash } from './_juice/useSquash'
import { fitChalk } from './_shared/chalkBoard'

/**
 * Visual pieces for Fraction Forge's fun pass (docs/superpowers/specs/
 * 2026-10-17-mini-games-fun-pass.md). Dumb and presentational: the flow lives
 * in FractionForge.tsx.
 *
 * Every bar shares ONE grid: the recipe strip (a/b chunks), the ruler ticks,
 * the mold's slots and the slabs the press stamps are all cut from the same
 * `BAR` span, so pouring is a real length comparison. The mold is exactly the
 * recipe's length: its gold gate sits under the end of the shaded chunks.
 */

// ── layout (world units; the camera looks from +z) ───────────────────────────

/** The whole bar's length; a `1/d` slab is `BAR / d` long. */
export const BAR = 3.6
export const cellW = (denom: number) => BAR / denom
/** The mold table, centred, facing the camera. */
export const TABLE: [number, number] = [0.75, -2.45]
export const TABLE_TOP = 0.98
/** The mold trough's centreline, local z on the table. */
const MOLD_Z = 0.16
export const SLAB_Y = TABLE_TOP + 0.11
/** The slab press (machine) and its stamping pad, where the kid stands. */
export const PRESS: [number, number] = [-2.95, -0.95]
export const PAD = { x: -2.95, z: 0.42, r: 0.75 }
/** The Beaver's snack mat: stand on it and he eats the top slab of your stack. */
export const CHOMP = { x: -4.75, z: 0.65, r: 0.6 }
export const BEAVER_AT: [number, number, number] = [-4.85, 0, -0.75]
/** Walk in here with a stack to pour it into the mold. */
export const POUR = { x: 0.75, z: -1.12, r: 1.0 }
/** Where customers wait for their candy (end of the conveyor). */
export const CUSTOMER_AT: [number, number, number] = [4.05, 0, -1.3]
export const SPAWN: [number, number] = [0.5, 1.35]
/** Where the stamped slab pops out of the press. */
export const ANVIL: [number, number, number] = [PRESS[0], 0.52, PRESS[1] + 0.48]
export const BEAVER_MOUTH: [number, number, number] = [BEAVER_AT[0], 0.98 * 1.35, BEAVER_AT[2] + 0.4]
/** The candy vat the press draws from (and where tipped-out slabs go back). */
export const VAT: [number, number] = [-5.0, -3.4]

/** World position of mold slot `k` (0 = leftmost) for `1/denom` slabs. */
export function slotWorld(k: number, denom: number): [number, number, number] {
  return [TABLE[0] - BAR / 2 + (k + 0.5) * cellW(denom), SLAB_Y, TABLE[1] + MOLD_Z]
}

export const CANDY = '#efb15f'
export const CANDY_GOLD = '#ffcf4d'
const CREAM = '#f7e7c6'
const SLATE = '#3c4657'
const WRAP = '#f7a1c4'

// ── small helpers ───────────────────────────────────────────────────────────

/** One flat caramel slab (lying in the mold / on the pile). */
export function Slab({ w, color = CANDY, position }: { w: number; color?: string; position?: [number, number, number] }) {
  return <TBox size={[Math.max(0.06, w), 0.11, 0.4]} radius={0.035} position={position} color={color} castShadow={false} />
}

/** A chalk label on a slate plate (white on dark reads at play distance). */
function ChalkPlate({ text, w, h, position, rotation }: { text: string; w: number; h: number; position: [number, number, number]; rotation?: [number, number, number] }) {
  const items = useMemo(() => {
    const f = fitChalk(text, w - 0.16)
    return chalkText(text, { y: 0, z: 0.05, w: Math.min(f.w, h * 0.42), h: h * 0.62, t: 0.05, gap: f.gap, color: '#fff3c4' })
  }, [text, w, h])
  return (
    <group position={position} rotation={rotation}>
      <TBox size={[w, h, 0.07]} radius={0.06} color={SLATE} castShadow={false} />
      <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#fff3c4'} items={items} />
    </group>
  )
}

/** A bouncing guide arrow over the next place to go (warm-up only). */
export function GuideArrow({ x, z, y = 2.3, color = TOON.gold }: { x: number; z: number; y?: number; color?: string }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    m.position.y = y + Math.abs(Math.sin(clock.elapsedTime * 4)) * 0.35
    m.rotation.y = clock.elapsedTime * 1.5
  })
  return (
    <group ref={g} position={[x, y, z]}>
      <TCone radius={0.26} height={0.42} rotation={[Math.PI, 0, 0]} color={color} emissive={color} emissiveIntensity={0.45} outline castShadow={false} />
      <TCyl radiusTop={0.09} height={0.32} position={[0, 0.34, 0]} color={color} emissive={color} emissiveIntensity={0.45} castShadow={false} />
    </group>
  )
}

/** A floating icon badge over a spot (pad, mat, mold): icons, not words. */
export function SpotBadge({ x, z, y = 1.9, icon, dim = false }: { x: number; z: number; y?: number; icon: string; dim?: boolean }) {
  return (
    <Html position={[x, y, z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          fontSize: 26,
          lineHeight: 1,
          padding: '4px 8px',
          borderRadius: 999,
          background: '#fffaf0',
          border: '3px solid #3a2c38',
          whiteSpace: 'nowrap',
          opacity: dim ? 0.45 : 1,
          transform: dim ? 'scale(.8)' : 'scale(1)',
          transition: 'opacity .3s, transform .3s',
        }}
      >
        {icon}
      </div>
    </Html>
  )
}

/** A soft chalk ring on the ground marking a spot. `glow` pulses it. */
export function SpotRing({ x, z, r, color = '#fff6cf', glow = false, opacity = 0.6 }: { x: number; z: number; r: number; color?: string; glow?: boolean; opacity?: number }) {
  const m = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const mesh = m.current
    if (!mesh) return
    const mat = mesh.material as MeshBasicMaterial
    mat.opacity = glow ? opacity * (0.65 + 0.35 * Math.sin(clock.elapsedTime * 5)) : opacity
    const s = glow ? 1 + Math.sin(clock.elapsedTime * 5) * 0.03 : 1
    mesh.scale.set(s, s, s)
  })
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, z]}>
      <ringGeometry args={[r - 0.09, r, 48]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

// ── the slab press ──────────────────────────────────────────────────────────

/**
 * The press: stand on its pad and it stamps one `1/denom` slab per beat. The
 * piston lifts (wind-up) then slams (impact) on every new `stamp` token. Its
 * slate plate names the slab it makes.
 */
export function Press({ denom, stamp, active }: { denom: number; stamp: number; active: boolean }) {
  const head = useRef<Group>(null)
  const t = useRef(99)
  const slammed = useRef(true)
  const [sq, kick] = useSquash()
  useEffect(() => {
    if (stamp > 0) {
      t.current = 0
      slammed.current = false
    }
  }, [stamp])
  useFrame((_, rawDt) => {
    const h = head.current
    if (!h) return
    t.current += Math.min(rawDt, 0.05)
    const k = t.current
    // rest 1.75; wind-up to 1.95 (0..0.09s); slam to 0.7 (0.09..0.15s); hold; rise (0.22..0.45s)
    let y = 1.75
    if (k < 0.09) y = 1.75 + (k / 0.09) * 0.2
    else if (k < 0.15) y = 1.95 - ((k - 0.09) / 0.06) * 1.25
    else if (k < 0.22) y = 0.7
    else if (k < 0.45) y = 0.7 + ((k - 0.22) / 0.23) * 1.05
    h.position.y = y
    if (k >= 0.15 && !slammed.current) {
      slammed.current = true
      kick(0.5)
    }
  })
  return (
    <group position={[PRESS[0], 0, PRESS[1]]}>
      <group ref={sq}>
        {/* base + anvil */}
        <TBox size={[1.7, 0.36, 1.3]} radius={0.08} position={[0, 0.18, 0]} color={TOON.brick} outline />
        <TBox size={[0.95, 0.12, 0.62]} radius={0.04} position={[0, 0.42, 0.42]} color={TOON.metal} outline />
        {/* posts + crossbar */}
        <TCyl radiusTop={0.11} height={2.5} position={[-0.68, 1.45, 0]} color={TOON.woodDark} outline segments={8} />
        <TCyl radiusTop={0.11} height={2.5} position={[0.68, 1.45, 0]} color={TOON.woodDark} outline segments={8} />
        <TBox size={[1.75, 0.26, 0.42]} radius={0.06} position={[0, 2.7, 0]} color={TOON.wood} outline />
        {/* hopper on top, fed by the pipe from the vat */}
        <TCone radius={0.42} height={0.5} position={[0, 3.05, -0.05]} rotation={[Math.PI, 0, 0]} color={TOON.roofOrange} outline segments={10} />
        <TSphere position={[0, 3.32, -0.05]} scale={[0.36, 0.12, 0.36]} color={CANDY} castShadow={false} />
        {/* the piston */}
        <group ref={head} position={[0, 1.75, 0.42]}>
          <TCyl radiusTop={0.07} height={1.1} position={[0, 0.65, 0]} color={TOON.metal} segments={8} castShadow={false} />
          <TBox size={[0.9, 0.26, 0.56]} radius={0.06} color={active ? TOON.gold : TOON.flowerYellow} outline emissive={active ? TOON.gold : undefined} emissiveIntensity={active ? 0.25 : undefined} />
        </group>
        {/* the slab this press makes: 1/d, big on the base front */}
        <ChalkPlate text={`1/${denom}`} w={1.3} h={0.5} position={[0, 0.2, 0.69]} rotation={[-0.15, 0, 0]} />
        {/* a sample slab on the shelf, its true size */}
        <Slab w={cellW(denom) - 0.03} color={CANDY} position={[0, 0.54, 0.42]} />
      </group>
    </group>
  )
}

// ── the mold table ──────────────────────────────────────────────────────────

export type MoldFx = 'none' | 'exact' | 'short' | 'over'

/**
 * The measuring table: the recipe board (chalk equation + the recipe bar cut
 * into `baseDenom` chunks, `baseNum` shaded), the ruler ticks (`1/targetDenom`
 * cells over the WHOLE bar; shown in warm-ups and as a hint), and the candy
 * mold, exactly as long as the recipe's shade, ending at a gold gate. `mold`
 * slabs sit in it.
 */
export function MoldTable({
  baseNum,
  baseDenom,
  targetDenom,
  mold,
  target,
  equation,
  ruler,
  fx,
  fxToken,
}: {
  baseNum: number
  baseDenom: number
  targetDenom: number
  mold: number
  target: number
  equation: string
  ruler: boolean
  fx: MoldFx
  fxToken: number
}) {
  const chunk = cellW(baseDenom)
  const step = cellW(targetDenom)
  const moldLen = (BAR * baseNum) / baseDenom
  const x0 = -BAR / 2
  const gateX = x0 + moldLen
  const gate = useRef<Group>(null)
  const slabs = useRef<Group>(null)
  const gapRef = useRef<Group>(null)
  const fxT = useRef(99)
  useEffect(() => {
    fxT.current = 0
  }, [fxToken])
  useFrame(({ clock }, rawDt) => {
    fxT.current += Math.min(rawDt, 0.05)
    const k = fxT.current
    const g = gate.current
    if (g) {
      const pulse = fx === 'exact' && k < 1.6 ? 1 + Math.sin(k * 14) * 0.12 * (1 - k / 1.6) : 1
      g.scale.set(1, pulse, pulse)
    }
    const s = slabs.current
    if (s) {
      if (fx === 'exact' && k < 0.5) {
        const p = Math.sin((k / 0.5) * Math.PI)
        s.scale.set(1, 1 + p * 0.5, 1)
        s.position.y = p * 0.06
      } else if (fx === 'short' && k < 0.6) {
        s.position.x = Math.sin(k * 30) * 0.03 * (1 - k / 0.6)
        s.scale.set(1, 1, 1)
      } else {
        s.position.set(0, 0, 0)
        s.scale.set(1, 1, 1)
      }
    }
    const gp = gapRef.current
    if (gp) gp.visible = fx === 'short' && k < 2.4 && Math.sin(clock.elapsedTime * 10) > -0.2
  })
  const chalkItems = useMemo(() => {
    const f = fitChalk(equation, BAR - 0.2)
    return chalkText(equation, { y: 0, z: 0.05, w: Math.min(0.26, f.w), h: 0.42, t: 0.06, gap: f.gap, color: TOON.white })
  }, [equation])
  const fitted = Math.min(mold, target)
  return (
    <group position={[TABLE[0], 0, TABLE[1]]}>
      {/* table */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <TCyl key={`${sx}${sz}`} radiusTop={0.09} height={TABLE_TOP - 0.08} position={[sx * (BAR / 2 + 0.35), (TABLE_TOP - 0.08) / 2, sz * 0.55]} color={TOON.woodDark} segments={8} />),
      )}
      <TBox size={[BAR + 1.1, 0.16, 1.45]} radius={0.06} position={[0, TABLE_TOP - 0.08, 0]} color={TOON.woodLight} outline receiveShadow />

      {/* the recipe board, standing at the back of the table */}
      <group position={[0, TABLE_TOP, -0.52]} rotation={[-0.12, 0, 0]}>
        <TCyl radiusTop={0.07} height={1.9} position={[-(BAR / 2 + 0.32), 0.95, -0.02]} color={TOON.woodDark} segments={8} />
        <TCyl radiusTop={0.07} height={1.9} position={[BAR / 2 + 0.32, 0.95, -0.02]} color={TOON.woodDark} segments={8} />
        <TBox size={[BAR + 0.5, 1.45, 0.1]} radius={0.06} position={[0, 1.1, 0]} color={TOON.wood} outline />
        {/* chalk equation strip */}
        <TBox size={[BAR + 0.2, 0.62, 0.06]} radius={0.03} position={[0, 1.45, 0.05]} color={'#3f6b5a'} castShadow={false} />
        <group position={[0, 1.45, 0.06]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={TOON.white} items={chalkItems} />
        </group>
        {/* the recipe bar: baseDenom chunks, baseNum shaded */}
        {Array.from({ length: baseDenom }, (_, i) => (
          <TBox
            key={i}
            size={[chunk - 0.06, 0.38, 0.08]}
            radius={0.04}
            position={[x0 + (i + 0.5) * chunk, 0.72, 0.07]}
            color={i < baseNum ? CANDY : CREAM}
            castShadow={false}
          />
        ))}
        {/* a gold line down from the shade's end to the mold's gate */}
        <TBox size={[0.06, 0.62, 0.05]} radius={0.02} position={[gateX, 0.42, 0.1]} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={0.4} castShadow={false} />
      </group>

      {/* ruler ticks along the front lip: 1/targetDenom over the whole bar */}
      {ruler &&
        Array.from({ length: targetDenom + 1 }, (_, i) => (
          <TBox key={i} size={[0.05, 0.05, i % targetDenom === 0 ? 0.34 : 0.26]} radius={0.01} position={[x0 + i * step, TABLE_TOP + 0.03, MOLD_Z + 0.38]} color={SLATE} castShadow={false} />
        ))}
      {ruler &&
        Array.from({ length: targetDenom }, (_, i) => (
          <TBox key={`c${i}`} size={[step - 0.06, 0.03, 0.2]} radius={0.01} position={[x0 + (i + 0.5) * step, TABLE_TOP + 0.02, MOLD_Z + 0.38]} color={i % 2 ? '#d9b26f' : '#fff3d6'} castShadow={false} />
        ))}

      {/* the mold: exactly the recipe's length, ending at the gold gate */}
      <TBox size={[moldLen, 0.05, 0.52]} radius={0.02} position={[x0 + moldLen / 2, TABLE_TOP + 0.02, MOLD_Z]} color={SLATE} castShadow={false} />
      <TBox size={[moldLen + 0.08, 0.14, 0.06]} radius={0.02} position={[x0 + moldLen / 2, TABLE_TOP + 0.07, MOLD_Z - 0.29]} color={TOON.woodDark} castShadow={false} />
      <TBox size={[moldLen + 0.08, 0.14, 0.06]} radius={0.02} position={[x0 + moldLen / 2, TABLE_TOP + 0.07, MOLD_Z + 0.29]} color={TOON.woodDark} castShadow={false} />
      <TBox size={[0.06, 0.14, 0.64]} radius={0.02} position={[x0 - 0.03, TABLE_TOP + 0.07, MOLD_Z]} color={TOON.woodDark} castShadow={false} />
      <group ref={gate} position={[gateX + 0.05, TABLE_TOP + 0.16, MOLD_Z]}>
        <TBox size={[0.1, 0.32, 0.7]} radius={0.03} color={TOON.gold} emissive={TOON.gold} emissiveIntensity={fx === 'exact' ? 0.7 : 0.25} outline castShadow={false} />
      </group>

      {/* slabs in the mold (plus any over-pour lying past the gate) */}
      <group ref={slabs}>
        {Array.from({ length: mold }, (_, k) => (
          <Slab
            key={k}
            w={step - 0.035}
            color={fx === 'exact' ? CANDY_GOLD : k >= target ? TOON.flowerRed : CANDY}
            position={[x0 + (k + 0.5) * step, SLAB_Y + (k >= target ? 0.06 : 0), MOLD_Z]}
          />
        ))}
      </group>
      {/* the gap a short pour leaves, blinking */}
      <group ref={gapRef} visible={false}>
        {Array.from({ length: Math.max(0, target - fitted) }, (_, i) => (
          <mesh key={i} position={[x0 + (fitted + i + 0.5) * step, SLAB_Y, MOLD_Z]}>
            <boxGeometry args={[step - 0.06, 0.09, 0.38]} />
            <meshBasicMaterial color={'#ff6b6b'} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* conveyor from the table's right end to the customer */}
      <group position={[BAR / 2 + 0.55, 0, 0.3]} rotation={[0, -0.55, 0]}>
        <TBox size={[1.35, 0.12, 0.6]} radius={0.04} position={[0.6, TABLE_TOP - 0.1, 0]} color={'#59606f'} castShadow={false} />
        {[0.05, 0.6, 1.15].map((x) => (
          <TCyl key={x} radiusTop={0.08} height={0.64} rotation={[Math.PI / 2, 0, 0]} position={[x, TABLE_TOP - 0.1, 0]} color={TOON.metal} segments={8} castShadow={false} />
        ))}
        <TCyl radiusTop={0.07} height={TABLE_TOP - 0.1} position={[1.15, (TABLE_TOP - 0.1) / 2, 0]} color={TOON.woodDark} segments={6} />
      </group>
    </group>
  )
}

// ── the stack the kid carries ───────────────────────────────────────────────

/** Pile height step and where it rides above the creature. */
export const PILE = { y: 1.75, step: 0.12 }

/**
 * The slabs the kid has stamped, piled on a little tray over their head, with
 * a big count badge. A new slab pops in from the press with a squash.
 */
export function Pile({ avatarRef, count, denom }: { avatarRef: RefObject<Group | null>; count: number; denom: number }) {
  const g = useRef<Group>(null)
  const top = useRef<Group>(null)
  const pop = useRef(99)
  const prev = useRef(count)
  const sway = useRef({ px: 0, pz: 0, x: 0, z: 0, vx: 0, vz: 0, init: false })
  const [sq, kick] = useSquash()
  useEffect(() => {
    if (count > prev.current) {
      pop.current = 0
      kick(0.55)
    } else if (count < prev.current) kick(-0.35)
    prev.current = count
  }, [count, kick])
  useFrame(({ clock }, rawDt) => {
    const a = avatarRef.current
    const m = g.current
    if (!a || !m) return
    m.position.set(a.position.x, a.position.y + PILE.y + Math.sin(clock.elapsedTime * 4) * 0.03, a.position.z)
    // a wobbly tower: the pile leans back against the walk and springs upright
    const dt = Math.max(1e-3, Math.min(rawDt, 0.05))
    const w = sway.current
    if (!w.init) {
      w.px = a.position.x
      w.pz = a.position.z
      w.init = true
    }
    const velX = (a.position.x - w.px) / dt
    const velZ = (a.position.z - w.pz) / dt
    w.px = a.position.x
    w.pz = a.position.z
    const lean = Math.min(1, 0.25 + count * 0.06)
    w.vx += (-180 * w.x - 9 * w.vx - Math.max(-6, Math.min(6, velX)) * 2.2 * lean) * dt
    w.vz += (-180 * w.z - 9 * w.vz - Math.max(-6, Math.min(6, velZ)) * 2.2 * lean) * dt
    w.x += w.vx * dt
    w.z += w.vz * dt
    m.rotation.set(Math.max(-0.4, Math.min(0.4, w.z * 0.6)), 0, Math.max(-0.4, Math.min(0.4, -w.x * 0.6)))
    pop.current += Math.min(rawDt, 0.05)
    const t = top.current
    if (t) {
      const k = Math.min(1, pop.current / 0.18)
      const s = k < 1 ? 0.2 + k * 1.05 : 1 + Math.max(0, 0.25 - (pop.current - 0.18) * 1.5) * 0.4
      t.scale.set(s, s, s)
    }
  })
  const w = Math.max(0.22, cellW(denom) - 0.04)
  return (
    <group ref={g}>
      <group ref={sq}>
        {count > 0 && <TBox size={[Math.max(0.62, w + 0.24), 0.07, 0.56]} radius={0.03} position={[0, 0, 0]} color={TOON.woodLight} outline castShadow={false} />}
        {Array.from({ length: Math.max(0, count - 1) }, (_, i) => (
          <Slab key={i} w={w} position={[0, 0.09 + i * PILE.step, 0]} color={i % 2 ? '#f2bd72' : CANDY} />
        ))}
        {count > 0 && (
          <group ref={top} position={[0, 0.09 + (count - 1) * PILE.step, 0]}>
            <Slab w={w} color={(count - 1) % 2 ? '#f2bd72' : CANDY} />
          </group>
        )}
      </group>
      {count > 0 && (
        <Html position={[0.55, 0.25 + count * PILE.step, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <div
            key={count}
            className="kid-text"
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: '#fff',
              WebkitTextStroke: '2px #3a2c38',
              paintOrder: 'stroke fill',
              textShadow: '0 3px 0 rgba(58,44,56,.35)',
              animation: 'ffpop .25s ease-out',
              whiteSpace: 'nowrap',
            }}
          >
            {count}
          </div>
        </Html>
      )}
    </group>
  )
}

// ── flights (pour, chomp, tip-out) ──────────────────────────────────────────

export interface Flight {
  id: number
  from: [number, number, number]
  to: [number, number, number]
  w: number
  color: string
  /** seconds before it launches */
  delay: number
  dur: number
  arc: number
  /** shrink to nothing as it arrives (eaten / back into the vat) */
  shrink?: boolean
}

function FlightSlab({ f, onLand }: { f: Flight; onLand: (id: number) => void }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const done = useRef(false)
  const a = useMemo(() => new Vector3(...f.from), [f.from])
  const b = useMemo(() => new Vector3(...f.to), [f.to])
  useFrame((_, rawDt) => {
    const m = g.current
    if (!m) return
    t.current += Math.min(rawDt, 0.05)
    const k = Math.min(1, Math.max(0, (t.current - f.delay) / f.dur))
    m.visible = t.current >= f.delay && !done.current
    m.position.lerpVectors(a, b, k)
    m.position.y += Math.sin(k * Math.PI) * f.arc
    m.rotation.z = f.shrink ? k * 6 : Math.sin(k * Math.PI) * 0.4
    const s = f.shrink ? 1 - k * 0.9 : 1
    m.scale.set(s, s, s)
    if (k >= 1 && !done.current) {
      done.current = true
      m.visible = false
      onLand(f.id)
    }
  })
  return (
    <group ref={g} visible={false}>
      <Slab w={f.w} color={f.color} />
    </group>
  )
}

/** Cosmetic slab flights; each reports its landing once (the pour counts on it). */
export function Flyers({ flights, onLand }: { flights: Flight[]; onLand: (id: number) => void }) {
  return (
    <>
      {flights.map((f) => (
        <FlightSlab key={f.id} f={f} onLand={onLand} />
      ))}
    </>
  )
}

/**
 * The silly candy spill: over-poured slabs tumble off the front of the table,
 * bounce on the ground and wobble to a stop (then fade).
 */
export function Spill({ slabs, token }: { slabs: { from: [number, number, number]; w: number }[]; token: number }) {
  const g = useRef<Group>(null)
  const sim = useRef<{ p: Vector3; v: Vector3; r: number; vr: number }[]>([])
  const t = useRef(0)
  useEffect(() => {
    t.current = 0
    sim.current = slabs.map((s, i) => ({
      p: new Vector3(...s.from),
      v: new Vector3(0.6 + (i % 3) * 0.35, 2.4 + (i % 2) * 0.8, 1.6 + ((i * 0.37) % 1) * 1.2),
      r: 0,
      vr: 6 + (i % 4) * 2,
    }))
  }, [slabs, token])
  useFrame((_, rawDt) => {
    const m = g.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    t.current += dt
    for (let i = 0; i < m.children.length; i++) {
      const s = sim.current[i]
      const c = m.children[i]
      if (!s) continue
      s.v.y -= 9 * dt
      s.p.addScaledVector(s.v, dt)
      if (s.p.y < 0.07) {
        s.p.y = 0.07
        s.v.y = Math.abs(s.v.y) * 0.38
        s.v.x *= 0.6
        s.v.z *= 0.6
        s.vr *= 0.5
      }
      s.r += s.vr * dt
      c.position.copy(s.p)
      c.rotation.set(s.r * 0.6, s.r * 0.2, s.r)
      const fade = t.current > 1.6 ? Math.max(0, 1 - (t.current - 1.6) / 0.5) : 1
      c.scale.setScalar(fade)
    }
  })
  return (
    <group ref={g}>
      {slabs.map((s, i) => (
        <group key={i} position={s.from}>
          <Slab w={s.w} color={TOON.flowerRed} />
        </group>
      ))}
    </group>
  )
}

/**
 * A served candy: the mold's slabs, wrapped, ride the conveyor to the
 * customer and hop into their arms.
 */
export function CandyDelivery({ len, startX, token, onArrive }: { len: number; startX: number; token: number; onArrive: () => void }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const done = useRef(false)
  const path = useMemo(
    () => [new Vector3(startX, SLAB_Y + 0.12, TABLE[1] + MOLD_Z), new Vector3(TABLE[0] + BAR / 2 + 1.1, SLAB_Y + 0.05, TABLE[1] + 0.75), new Vector3(CUSTOMER_AT[0] - 0.3, 1.2, CUSTOMER_AT[2] + 0.1)],
    [startX],
  )
  useEffect(() => {
    t.current = 0
    done.current = false
  }, [token])
  useFrame((_, rawDt) => {
    const m = g.current
    if (!m) return
    t.current += Math.min(rawDt, 0.05)
    const k = Math.min(1, t.current / 1.25)
    if (k < 0.45) m.position.lerpVectors(path[0], path[1], k / 0.45)
    else {
      const u = (k - 0.45) / 0.55
      m.position.lerpVectors(path[1], path[2], u)
      m.position.y += Math.sin(u * Math.PI) * 0.6
    }
    m.rotation.y = k * 0.6
    if (k >= 1 && !done.current) {
      done.current = true
      onArrive()
    }
    m.visible = !done.current
  })
  return (
    <group ref={g}>
      <TBox size={[Math.max(0.5, len), 0.2, 0.42]} radius={0.08} color={WRAP} outline castShadow={false} />
      <TBox size={[Math.max(0.2, len * 0.3), 0.21, 0.43]} radius={0.06} color={TOON.white} castShadow={false} />
      <TCone radius={0.16} height={0.24} rotation={[0, 0, Math.PI / 2]} position={[Math.max(0.5, len) / 2 + 0.1, 0, 0]} color={WRAP} castShadow={false} segments={6} />
      <TCone radius={0.16} height={0.24} rotation={[0, 0, -Math.PI / 2]} position={[-Math.max(0.5, len) / 2 - 0.1, 0, 0]} color={WRAP} castShadow={false} segments={6} />
    </group>
  )
}

// ── customers ───────────────────────────────────────────────────────────────

export type CritterKind = 'bunny' | 'bear'
export type CritterMood = 'wait' | 'happy' | 'leave'

/**
 * A customer at the counter: a pastel bunny (or the Big Bear for the finale).
 * Walks in, bobs while waiting (fidgets when patience runs low), hops for joy
 * when served, then walks off.
 */
export function Critter({ kind, color, mood, impatient }: { kind: CritterKind; color: string; mood: CritterMood; impatient: boolean }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const enter = useRef(0)
  const leaveT = useRef(0)
  const lastMood = useRef<CritterMood>(mood)
  const [sq, kick] = useSquash()
  useEffect(() => {
    if (mood === lastMood.current) return
    lastMood.current = mood
    if (mood === 'happy') kick(0.8)
    leaveT.current = 0
  }, [mood, kick])
  useFrame((_, rawDt) => {
    const m = g.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    t.current += dt
    enter.current = Math.min(1, enter.current + dt / 1.1)
    const e = 1 - Math.pow(1 - enter.current, 2)
    let x = 3.6 * (1 - e)
    let y = enter.current < 1 ? Math.abs(Math.sin(t.current * 9)) * 0.12 : 0
    let rot = enter.current < 1 ? Math.PI * 0.5 : -0.9
    if (mood === 'wait' && enter.current >= 1) y = Math.abs(Math.sin(t.current * (impatient ? 9 : 2.5))) * (impatient ? 0.08 : 0.03)
    if (mood === 'happy') y = Math.abs(Math.sin(t.current * 8)) * 0.35
    if (mood === 'leave') {
      leaveT.current += dt
      x = leaveT.current * 3.2
      y = Math.abs(Math.sin(t.current * 9)) * 0.12
      rot = Math.PI * 0.5
    }
    m.position.set(CUSTOMER_AT[0] + x, y, CUSTOMER_AT[2])
    m.rotation.y = rot
    m.visible = leaveT.current < 1.6
  })
  const big = kind === 'bear'
  return (
    <group ref={g} position={CUSTOMER_AT} scale={big ? 1.45 : 1}>
      <group ref={sq}>
        <TSphere position={[-0.12, 0.05, 0.06]} scale={[0.1, 0.06, 0.13]} color={color} castShadow={false} />
        <TSphere position={[0.12, 0.05, 0.06]} scale={[0.1, 0.06, 0.13]} color={color} castShadow={false} />
        <TCapsule radius={big ? 0.3 : 0.24} length={0.12} position={[0, 0.38, 0]} color={color} outline />
        <TSphere position={[0, 0.34, 0.16]} scale={[0.15, 0.18, 0.1]} color={TOON.flowerWhite} castShadow={false} />
        <TSphere position={[0, 0.85, 0.02]} scale={0.29} color={color} outline segments={14} />
        {big ? (
          <>
            <TSphere position={[-0.22, 1.1, -0.02]} scale={0.09} color={color} outline />
            <TSphere position={[0.22, 1.1, -0.02]} scale={0.09} color={color} outline />
            <TSphere position={[0, 0.78, 0.25]} scale={[0.13, 0.1, 0.1]} color={'#f1d2a8'} castShadow={false} />
            <TSphere position={[0, 0.82, 0.34]} scale={[0.05, 0.04, 0.03]} color={TOON.eye} castShadow={false} />
          </>
        ) : (
          <>
            <TCapsule radius={0.06} length={0.3} position={[-0.11, 1.25, -0.02]} rotation={[0, 0, 0.18]} color={color} outline />
            <TCapsule radius={0.06} length={0.3} position={[0.11, 1.25, -0.02]} rotation={[0, 0, -0.18]} color={color} outline />
            <TCapsule radius={0.03} length={0.2} position={[-0.11, 1.25, 0.03]} rotation={[0, 0, 0.18]} color={TOON.blossom} castShadow={false} />
            <TCapsule radius={0.03} length={0.2} position={[0.11, 1.25, 0.03]} rotation={[0, 0, -0.18]} color={TOON.blossom} castShadow={false} />
            <TSphere position={[0, 0.79, 0.27]} scale={[0.04, 0.03, 0.03]} color={TOON.flowerPink} castShadow={false} />
          </>
        )}
        <ChibiFace eyeY={0.9} eyeX={0.1} eyeZ={0.25} eyeR={0.045} blushY={0.8} blushX={0.17} blushZ={0.22} />
        <TSphere position={[0, 0.3, -0.27]} scale={0.08} color={TOON.white} castShadow={false} />
      </group>
    </group>
  )
}

// ── the yard ────────────────────────────────────────────────────────────────

const FALL_WATER = '#b5ecfa'

/** One stream of the falls: a column with a bright band sliding down it. */
function Stream({ x, z, top, bottom, width, phase = 0 }: { x: number; z: number; top: number; bottom: number; width: number; phase?: number }) {
  const band = useRef<Group>(null)
  const h = top - bottom
  useFrame(({ clock }) => {
    if (band.current) band.current.position.y = top - 0.15 - ((clock.elapsedTime * 1.4 + phase) % 1) * (h - 0.3)
  })
  return (
    <group>
      <TBox size={[width, h, 0.18]} radius={Math.min(width, 0.18) * 0.45} position={[x, bottom + h / 2, z]} color={FALL_WATER} castShadow={false} />
      <group ref={band} position={[x, top, z + 0.1]}>
        <TBox size={[width * 0.55, 0.22, 0.05]} radius={0.02} color={'#effdff'} castShadow={false} />
      </group>
      <TBlob position={[x, bottom + 0.05, z + 0.12]} scale={[width * 0.55 + 0.15, 0.1, 0.24]} color={TOON.foam} castShadow={false} />
    </group>
  )
}

/** Smoke puffs looping out of the vat's chimney. */
function Smoke({ origin }: { origin: [number, number, number] }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    for (let i = 0; i < m.children.length; i++) {
      const ph = (clock.elapsedTime * 0.35 + i / m.children.length) % 1
      const c = m.children[i]
      c.position.set(Math.sin(ph * 5 + i) * 0.18 + ph * 0.4, ph * 2.2, 0)
      c.scale.setScalar(0.18 + ph * 0.4)
    }
  })
  return (
    <group ref={g} position={origin}>
      {[0, 1, 2, 3].map((i) => (
        <TBlob key={i} scale={0.2} color={TOON.foam} castShadow={false} flat={false} />
      ))}
    </group>
  )
}

/** Bunting strung between two posts. */
function Bunting({ from, to, sag = 0.4 }: { from: [number, number, number]; to: [number, number, number]; sag?: number }) {
  const flags = useMemo(() => {
    const n = 9
    const cols = [TOON.flowerRed, TOON.flowerYellow, TOON.flowerBlue, TOON.mint, TOON.flowerPink]
    return Array.from({ length: n }, (_, i) => {
      const k = (i + 0.5) / n
      return {
        p: [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * sag - 0.12, from[2] + (to[2] - from[2]) * k] as [number, number, number],
        c: cols[i % cols.length],
      }
    })
  }, [from, to, sag])
  const yaw = Math.atan2(-(to[2] - from[2]), to[0] - from[0])
  return (
    <group>
      {flags.map((f, i) => (
        <TCone key={i} radius={0.13} height={0.26} position={f.p} rotation={[Math.PI, yaw, 0]} color={f.c} segments={3} castShadow={false} />
      ))}
    </group>
  )
}

/**
 * The candy forge's yard: a sandy work floor on Fraction Falls' meadow, the
 * tiered falls (1 → ½ → ¼, like the World's) behind the shop, their river,
 * the candy vat puffing smoke, a striped market stall for customers, bunting,
 * lamps, ferns and a forest ring out to the horizon.
 */
export function ForgeYard() {
  const trees = useMemo<TreeSpot[]>(() => {
    const out: TreeSpot[] = []
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + (i % 3) * 0.07
      const r = 12.5 + (i % 4) * 2.4 + ((i * 7) % 5) * 0.6
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r - 2
      if (z > 4 && Math.abs(x) < 12) continue // keep the camera side open
      out.push({ x, z, scale: 1.1 + ((i * 13) % 7) * 0.12, kind: i % 4 === 0 ? 'pine' : i % 5 === 0 ? 'blossom' : 'round', seed: 40 + i })
    }
    out.push({ x: -7.6, z: -1.5, scale: 1.4, kind: 'round', seed: 3 }, { x: 8.2, z: -0.4, scale: 1.3, kind: 'blossom', seed: 4 }, { x: -8.4, z: 3.0, scale: 1.2, kind: 'pine', seed: 5 }, { x: 8.6, z: 3.4, scale: 1.25, kind: 'round', seed: 6 })
    return out
  }, [])
  const ferns = useMemo<InstanceSpec[]>(
    () =>
      [
        [-6.6, 1.7, 1.0],
        [-6.9, -2.2, 0.9],
        [6.4, 1.6, 0.9],
        [6.9, -2.9, 1.1],
        [-1.8, -6.5, 1.0],
        [4.6, -6.7, 0.9],
        [2.6, 3.4, 0.7],
        [-2.8, 3.2, 0.8],
      ].map(([x, z, s], i) => ({ x, z, s, rot: i * 1.7, color: i % 3 === 0 ? TOON.leaf : i % 3 === 1 ? TOON.leafDark : TOON.pine })),
    [],
  )
  return (
    <group>
      {/* work floor + meadow patches */}
      <Decal geometry={blobDisc(7.4, 0.12, 7, 48)} color={TOON.sand} position={[0, 0.006, -0.8]} scale={[1.18, 1, 0.82]} />
      <Decal geometry={blobDisc(6.2, 0.1, 8, 44)} color={'#f9e6bb'} position={[0.2, 0.01, -0.9]} scale={[1.15, 1, 0.78]} />
      <Decal geometry={blobDisc(3.2, 0.2, 12, 32)} color={TOON.grassLight} position={[-9, 0.004, 4]} />
      <Decal geometry={blobDisc(2.6, 0.2, 13, 32)} color={TOON.grassLight} position={[9.5, 0.004, 3]} />

      {/* the falls behind the shop: one stream → two → four, into a pool */}
      <group position={[1.8, 0, -9.6]}>
        <TBlob position={[0, 2.8, -1.4]} scale={[4.6, 3.4, 1.9]} color={'#c6c5cb'} outline />
        <TBlob position={[-3.9, 1.8, -0.8]} scale={[2.3, 2.3, 1.7]} color={TOON.rockLight} outline />
        <TBlob position={[4.0, 1.6, -0.8]} scale={[2.4, 2.1, 1.7]} color={'#b3b6c1'} outline />
        <TBlob position={[0, 5.9, -1.5]} scale={[3.6, 0.55, 1.5]} color={TOON.grass} />
        <TBlob position={[-3.9, 3.9, -0.9]} scale={[1.8, 0.45, 1.3]} color={TOON.grassLight} />
        <TBlob position={[4.0, 3.55, -0.9]} scale={[1.8, 0.45, 1.3]} color={TOON.grass} />
        <Stream x={0} z={0.45} top={5.6} bottom={3.6} width={1.3} />
        <TBox size={[2.9, 0.34, 1.1]} radius={0.12} position={[0, 3.45, 0.8]} color={TOON.stone} outline />
        <Stream x={-0.75} z={1.4} top={3.4} bottom={1.7} width={0.6} phase={0.3} />
        <Stream x={0.75} z={1.4} top={3.4} bottom={1.7} width={0.6} phase={0.65} />
        <TBox size={[3.4, 0.3, 1.0]} radius={0.12} position={[0, 1.55, 1.7]} color={TOON.stone} outline />
        {[-1.3, -0.45, 0.45, 1.3].map((x, i) => (
          <Stream key={x} x={x} z={2.3} top={1.5} bottom={0.05} width={0.3} phase={0.15 + i * 0.27} />
        ))}
        <Decal geometry={blobDisc(3.4, 0.08, 3)} color={TOON.water} position={[0, 0.02, 3.6]} scale={[1.3, 1, 0.7]} />
        <Decal geometry={blobDisc(1.6, 0.2, 6)} color={TOON.waterShallow} position={[0.3, 0.024, 3.9]} scale={[1.6, 1, 0.6]} />
      </group>
      {/* the river runs off to the east past the stall */}
      {[
        [5.2, -6.2, 1.5],
        [6.6, -4.9, 1.3],
        [7.6, -3.2, 1.2],
        [8.6, -1.4, 1.3],
        [9.8, 0.4, 1.4],
        [11.2, 2.2, 1.5],
      ].map(([x, z, r], i) => (
        <Decal key={i} geometry={blobDisc(r, 0.14, 20 + i, 24)} color={TOON.water} position={[x, 0.014, z]} />
      ))}

      {/* the candy vat + chimney (the press's pipe runs from it) */}
      <group position={[VAT[0], 0, VAT[1]]}>
        <TCyl radiusTop={0.95} radiusBottom={0.8} height={1.1} position={[0, 0.55, 0]} color={TOON.stone} outline segments={14} />
        <TCyl radiusTop={0.98} height={0.12} position={[0, 1.12, 0]} color={TOON.stoneDark} segments={14} castShadow={false} />
        <TSphere scale={[0.78, 0.25, 0.78]} position={[0, 1.08, 0]} color={CANDY} segments={14} />
        <TCyl radiusTop={0.2} radiusBottom={0.25} height={2.2} position={[-0.8, 1.7, -0.55]} color={TOON.brick} outline segments={8} />
        <Smoke origin={[-0.8, 2.9, -0.55]} />
        {/* pipe to the press hopper */}
        <TCyl radiusTop={0.09} height={2.6} position={[1.15, 2.4, 1.15]} rotation={[0.72, 0, -0.62]} color={TOON.metal} segments={8} castShadow={false} />
      </group>

      {/* the customer stall: striped awning over the counter */}
      <group position={[CUSTOMER_AT[0] + 0.55, 0, CUSTOMER_AT[2] - 1.2]}>
        <TBox size={[1.9, 0.9, 0.7]} radius={0.06} position={[0, 0.45, 0]} color={TOON.wallCream} outline />
        <TBox size={[2.0, 0.1, 0.8]} radius={0.04} position={[0, 0.95, 0]} color={TOON.wood} castShadow={false} />
        <TCyl radiusTop={0.06} height={2.2} position={[-0.9, 1.1, 0.35]} color={TOON.woodDark} segments={6} />
        <TCyl radiusTop={0.06} height={2.2} position={[0.9, 1.1, 0.35]} color={TOON.woodDark} segments={6} />
        {[0, 1, 2, 3, 4].map((i) => (
          <TBox key={i} size={[0.42, 0.08, 1.1]} radius={0.03} position={[-0.84 + i * 0.42, 2.2, 0.15]} rotation={[0.35, 0, 0]} color={i % 2 ? TOON.white : TOON.flowerRed} castShadow={false} />
        ))}
        {/* jars of candy on the counter */}
        {[-0.6, 0, 0.6].map((x, i) => (
          <group key={x} position={[x, 1.12, 0]}>
            <TCyl radiusTop={0.16} height={0.3} color={'#dff4ff'} opacity={0.75} castShadow={false} segments={10} />
            <TSphere scale={0.11} position={[0, -0.02, 0]} color={[TOON.flowerPink, CANDY, TOON.mint][i]} castShadow={false} />
          </group>
        ))}
      </group>

      {/* bunting over the yard */}
      <TCyl radiusTop={0.07} height={3.2} position={[-6.4, 1.6, -2.4]} color={TOON.woodDark} segments={6} />
      <TCyl radiusTop={0.07} height={3.2} position={[6.6, 1.6, -3.4]} color={TOON.woodDark} segments={6} />
      <Bunting from={[-6.4, 3.15, -2.4]} to={[6.6, 3.15, -3.4]} sag={0.55} />

      <Lamp position={[-2.0, 0, 1.9]} />
      <Lamp position={[3.4, 0, 1.5]} />
      <Stump position={[-6.6, 0, 2.4]} scale={1.1} />
      <Rock position={[6.3, 0, 0.9]} scale={1.1} seed={3} outline />
      <Rock position={[-7.4, 0, -4.6]} scale={1.4} seed={7} outline />
      <Rock position={[3.6, 0, -5.5]} scale={1.0} seed={9} />
      <Bush position={[-1.8, 0, -5.2]} scale={1.2} seed={4} />
      <Bush position={[7.4, 0, -1.6]} scale={1.1} seed={14} />
      <Bush position={[-7.8, 0, 0.6]} scale={1.1} seed={8} />
      <ToonInstances geometry={fernGeometry()} color={TOON.white} items={ferns} />
      <ScatterTrees trees={trees} />
      {/* candy-stripe sign post by the path */}
      <group position={[2.6, 0, 2.6]}>
        <TCyl radiusTop={0.06} height={1.3} position={[0, 0.65, 0]} color={TOON.woodDark} segments={6} />
        <TTorus radius={0.32} tube={0.07} position={[0, 1.5, 0]} color={TOON.flowerRed} segments={16} castShadow={false} />
        <TCyl radiusTop={0.3} height={0.06} rotation={[Math.PI / 2, 0, 0]} position={[0, 1.5, 0]} color={TOON.flowerWhite} segments={16} castShadow={false} />
      </group>
    </group>
  )
}
