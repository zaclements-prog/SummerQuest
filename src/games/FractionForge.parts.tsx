/* eslint-disable react-refresh/only-export-components -- the slab grid constants (BAR/cellW/slabW) describe exactly what these components draw; co-located on purpose, not an HMR boundary */
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Group, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { geo } from '../toon/geometry'
import { TOON } from '../toon/palette'
import { TBlob, TBox, TCyl, TSphere } from '../toon/shapes'
import { Instances } from '../world/town/kit'
import { chalkText } from '../world/town/chalk'
import { slabOffsets } from '../lib/forge/fractionCore'

/**
 * Visual pieces for the Fraction Forge (docs/superpowers/specs/
 * 2026-10-16-fraction-forge-design.md). Dumb and presentational: the flow
 * lives in FractionForge.tsx.
 *
 * Every bar in the game shares ONE cell grid (`cellW`): the recipe strip is cut
 * into the base fraction's chunks, the gauge into `denom` sockets, and racks
 * hold their slabs at the same pitch — so "how long is this row" is a real
 * visual comparison, and the measuring slide is a straight translation.
 */

/** The shared bar grid: total length + slab height. */
export const BAR = { span: 2.7, h: 0.26 } as const
/** One gauge cell's width for `denom`. */
export const cellW = (denom: number) => BAR.span / denom
/** A slab's visible width in a `denom` grid (a hair narrower than its cell). */
export const slabW = (denom: number) => Math.max(0.05, cellW(denom) - 0.045)
/** Widest single row a rack may draw on the street (2.67 spacing, minus deck margin). */
export const MAX_ROW = 2.3
/** How many stacked sub-rows a tray of `n` slabs needs to stay market-sized. */
export const wrapRows = (n: number, denom: number) => Math.max(1, Math.ceil((n * cellW(denom)) / MAX_ROW))

export const CANDY = '#efb15f'
export const SLATE = '#3c4657'
const CREAM = '#f7e7c6'

/** One caramel slab. */
export function Slab({ x, y, z, w, color = CANDY }: { x: number; y: number; z: number; w: number; color?: string }) {
  return <TBox size={[w, BAR.h, 0.14]} radius={0.03} position={[x, y, z]} color={color} castShadow={false} />
}

/** A horizontal row of `n` slabs. `anchor: 'left'` = gauge fill; centered = a rack/recipe row. */
export function SlabRow({
  n,
  denom,
  y,
  z,
  anchor = 'center',
  color = CANDY,
}: {
  n: number
  denom: number
  y: number
  z: number
  anchor?: 'center' | 'left'
  color?: string
}) {
  const step = cellW(denom)
  const w = slabW(denom)
  const xs = useMemo(
    () => (anchor === 'left' ? Array.from({ length: n }, (_, i) => -BAR.span / 2 + (i + 0.5) * step) : slabOffsets(n, BAR.span)),
    [n, step, anchor],
  )
  return (
    <>
      {xs.map((x, i) => (
        <Slab key={i} x={x} y={y} z={z} w={w} color={color} />
      ))}
    </>
  )
}

/**
 * A tray of `n` slabs, wrapped into stacked sub-rows when one row would be too
 * wide for the market street (distractors can reach 15 slabs). Sub-rows share
 * the gauge pitch, so pieces still sit on the same grid — the count card is
 * what names the number, and the measuring moment is what proves it.
 */
export function StackedRow({
  n,
  denom,
  y,
  z,
  color = CANDY,
}: {
  n: number
  denom: number
  y: number
  z: number
  color?: string
}) {
  const rows = wrapRows(n, denom)
  const per = Math.ceil(n / rows)
  const gap = BAR.h + 0.06
  return (
    <>
      {Array.from({ length: rows }, (_, ri) => {
        const cnt = Math.min(per, n - ri * per)
        if (cnt <= 0) return null
        return (
          <group key={ri} position={[0, y + ri * gap, z]}>
            <SlabRow n={cnt} denom={denom} y={0} z={0} color={color} />
          </group>
        )
      })}
    </>
  )
}

/**
 * The recipe: a bar the same length as everything else, cut into `denom` big
 * chunks with `num` filled — `2/3` reads as 2 of 3 chunks. It must NOT be cut
 * into the target denominator, or the answer (how many small cells) would be
 * countable straight off the recipe.
 */
export function RecipeStrip({ num, denom, y, z }: { num: number; denom: number; y: number; z: number }) {
  const step = cellW(denom)
  const w = Math.max(0.05, step - 0.05)
  return (
    <group position={[0, y, z]}>
      <TBox size={[BAR.span + 0.34, BAR.h + 0.3, 0.12]} radius={0.05} color={TOON.wood} outline />
      {Array.from({ length: denom }, (_, i) => (
        <TBox
          key={i}
          size={[w, BAR.h, 0.1]}
          radius={0.03}
          position={[(i - (denom - 1) / 2) * step, 0, 0.05]}
          color={i < num ? CANDY : CREAM}
          castShadow={false}
        />
      ))}
    </group>
  )
}

/**
 * The measuring gauge: `denom` empty dark sockets on the same grid, plus the
 * slabs measured into it (`fill`) and a translucent curtain marking the
 * recipe's shade boundary (shown while a result is on screen — the fill either
 * stops short of it, crosses it, or meets it exactly). `fillFx` animates the
 * measured row as it resolves: a pop when exact, a wobble when not.
 */
export function Gauge({
  denom,
  fill = 0,
  fillFx = null,
  fillColor = CANDY,
  curtainAt,
  y,
  z,
}: {
  denom: number
  fill?: number
  fillFx?: 'pop' | 'shake' | null
  fillColor?: string
  curtainAt?: number | null
  y: number
  z: number
}) {
  const step = cellW(denom)
  const w = slabW(denom)
  const gap = curtainAt != null ? -BAR.span / 2 + curtainAt * step : 0
  const fx = useRef<Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    const m = fx.current
    if (!m || !fillFx || fill === 0) {
      t.current = 0
      return
    }
    t.current = Math.min(1, t.current + Math.min(dt, 0.05) / 0.3)
    const k = t.current
    if (fillFx === 'pop') {
      const s = 0.55 + 0.45 * k + Math.sin(k * Math.PI) * 0.14
      m.scale.set(s, s, s)
      m.rotation.z = 0
    } else {
      m.scale.set(1, 1, 1)
      m.rotation.z = Math.sin(k * 22) * 0.035 * (1 - k)
    }
  })
  return (
    <group position={[0, y, z]}>
      <TBox size={[BAR.span + 0.34, BAR.h + 0.3, 0.12]} radius={0.05} color={TOON.wood} outline />
      {Array.from({ length: denom }, (_, i) => (
        <TBox key={i} size={[w, BAR.h * 0.86, 0.06]} radius={0.02} position={[(i - (denom - 1) / 2) * step, 0, 0.06]} color={SLATE} castShadow={false} />
      ))}
      {fill > 0 &&
        (() => {
          // over-picks (distractors can exceed `denom`) fill the gauge, then
          // PILE the excess on top — never spilling off the bench sideways
          const inGauge = Math.min(fill, denom)
          const pile = fill - inGauge
          const pivotX = -(BAR.span / 2) + (inGauge * step) / 2
          return (
            // pivot at the row's own centre so the pop grows from the fill, not the frame
            <group position={[pivotX, 0, 0.13]}>
              <group ref={fx}>
                <group position={[-pivotX, 0, 0]}>
                  <SlabRow n={inGauge} denom={denom} y={0} z={0} anchor="left" color={fillColor} />
                  {pile > 0 && <SlabRow n={pile} denom={denom} y={BAR.h + 0.05} z={0} anchor="left" color={fillColor} />}
                </group>
              </group>
            </group>
          )
        })()}
      {curtainAt != null && (
        // spans the gap between gauge and recipe: the exact fill target
        <mesh position={[gap, 0.47, 0.16]}>
          <boxGeometry args={[0.045, 1.24, 0.05]} />
          <meshBasicMaterial color={TOON.flowerYellow} transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}

/**
 * A market rack holding `n` slabs of `1/denom` at the gauge's own pitch, with
 * the count on a slate card leaning on the front (white chalk on pastel slabs
 * was unreadable; the card is the same trick the arena's pedestals use).
 * `held` = this rack's row is off with the player; the card stays behind.
 */
export function TrayRack({ n, denom, held, position, rotation = 0 }: { n: number; denom: number; held: boolean; position: [number, number]; rotation?: number }) {
  const per = Math.ceil(n / wrapRows(n, denom))
  const rowW = Math.max(0.62, per * cellW(denom))
  const label = String(n)
  const cardW = label.length > 1 ? 0.72 : 0.56
  const cardChalk = useMemo(() => chalkText(label, { y: 0, z: 0, w: 0.19, h: 0.28, t: 0.048, gap: 0.07, color: '#fff3c4' }), [label])
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <TBox size={[rowW + 0.4, 0.1, 0.52]} radius={0.05} position={[0, 0.32, 0]} color={TOON.woodLight} outline />
      <TBox size={[rowW + 0.4, 0.44, 0.09]} radius={0.04} position={[0, 0.56, -0.26]} color={TOON.wood} castShadow={false} />
      {held ? null : <StackedRow n={n} denom={denom} y={0.52} z={-0.12} />}
      <group position={[0, 0.52, 0.5]} rotation={[-0.42, 0, 0]}>
        <TBox size={[cardW, 0.52, 0.07]} radius={0.08} color={SLATE} castShadow={false} />
        <group position={[0, 0, 0.05]}>
          <Instances geometry={geo.box(1, 1, 1, 0.2)} color={'#fff3c4'} items={cardChalk} />
        </group>
      </group>
    </group>
  )
}

/** The rack's slab row carried over the creature's head. */
export function HeldTray({ n, denom, avatarRef }: { n: number; denom: number; avatarRef: RefObject<Group | null> }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    const a = avatarRef.current
    const m = g.current
    if (!a || !m) return
    m.position.set(a.position.x, a.position.y + 1.85 + Math.sin(clock.elapsedTime * 4) * 0.05, a.position.z)
  })
  const per = Math.ceil(n / wrapRows(n, denom))
  return (
    <group ref={g} scale={0.8}>
      <TBox size={[Math.max(0.62, per * cellW(denom)) + 0.34, 0.09, 0.46]} radius={0.04} position={[0, 0.28, 0]} color={TOON.woodLight} outline />
      <StackedRow n={n} denom={denom} y={0.46} z={-0.1} />
    </group>
  )
}

/** The row in flight to the gauge; reports landing once. */
export function MeasureFlight({ from, to, n, denom, onLanded }: { from: Vector3; to: [number, number, number]; n: number; denom: number; onLanded: () => void }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const done = useRef(false)
  const start = useMemo(() => from.clone(), [from])
  const end = useMemo(() => new Vector3(...to), [to])
  useFrame((_, dt) => {
    const m = g.current
    if (!m) return
    t.current += Math.min(dt, 0.05) / 0.5
    const k = Math.min(t.current, 1)
    m.position.lerpVectors(start, end, k)
    m.position.y += Math.sin(k * Math.PI) * 1.0
    if (k >= 1 && !done.current) {
      done.current = true
      onLanded()
    }
  })
  return (
    <group ref={g}>
      <StackedRow n={n} denom={denom} y={0} z={0} />
    </group>
  )
}

/** Yard decor: the candy vat (with its brick flue) and the falls behind the table. */
export function ForgeYard() {
  return (
    <group>
      {/* candy vat */}
      <group position={[-4.7, 0, -3.4]}>
        <TCyl radiusTop={0.78} radiusBottom={0.66} height={0.95} position={[0, 0.48, 0]} color={TOON.stone} outline segments={12} />
        <TSphere scale={[0.62, 0.3, 0.62]} position={[0, 0.94, 0]} color={CANDY} segments={12} />
        <TCyl radiusTop={0.14} radiusBottom={0.18} height={1.5} position={[-0.72, 1.35, -0.5]} rotation={[0, 0, 0.12]} color={'#e58b6d'} outline segments={8} />
      </group>
      {/* the falls */}
      <group position={[3.5, 0, -5.9]}>
        <TBlob position={[-1.25, 0.85, 0]} scale={[2.1, 1.7, 1.7]} color={TOON.rockLight} outline />
        <TBlob position={[1.35, 0.6, 0.25]} scale={[1.5, 1.2, 1.3]} color={'#b3b6c1'} outline />
        <TBox size={[1.5, 2.0, 0.22]} position={[0.15, 0.95, 0.62]} color={TOON.water} castShadow={false} />
        <TBox size={[1.62, 0.14, 0.34]} position={[0.15, 0.05, 0.72]} color={TOON.foam} castShadow={false} />
      </group>
    </group>
  )
}
