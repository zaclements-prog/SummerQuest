import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { TOON } from '../toon/palette'
import { geo } from '../toon/geometry'
import { TBox, TCyl, TSphere } from '../toon/shapes'
import { Instances, type Inst } from '../world/town/kit'
import { chalkText } from '../world/town/chalk'
import { AREA_PLOT, plotRects } from '../lib/grove/areaCore'
import type { AreaModel } from '../lib/providers/g5Mult'

/**
 * Visual pieces for Times Grove's area-model mode (TimesGroveArea.tsx), in the
 * grove's local frame. Presentational: plain props in, self-animating.
 */

const SOIL = '#c99a66'
const SOIL_ASK = '#f2d79c'
const GRASS = ['#8edb7c', '#a6e08a', '#7fcf6b']
const ROW_INK = '#ffd0c8'
const COL_INK = '#cfe0ff'

/** One chalk number on a slate, centred at the origin. */
function Slate({ text, w, h = 0.5, ink = '#fff3c4', glow = false }: { text: string; w?: number; h?: number; ink?: string; glow?: boolean }) {
  const cw = Math.min(0.22, 0.95 / Math.max(1, text.length))
  const items = useMemo(() => chalkText(text, { y: 0, z: 0, w: cw * 0.78, h: h * 0.56, t: 0.045, gap: cw * 0.28, color: ink }), [text, cw, h, ink])
  const width = w ?? Math.max(0.5, text.length * cw + 0.22)
  return (
    <group>
      <TBox size={[width, h, 0.06]} radius={0.06} color={glow ? '#4a5a78' : '#3c4657'} castShadow={false} outline />
      <group position={[0, 0, 0.045]}>
        <Instances geometry={geo.box(1, 1, 1, 0.2)} color={ink} items={items} mat={glow ? { emissive: ink, emissiveIntensity: 0.45 } : undefined} />
      </group>
    </group>
  )
}

/**
 * The area model laid out on the field: a plot per partial product, the
 * factor parts chalked along the left (rows) and the top (columns). A planted
 * plot turns to meadow with little trees and shows its partial product; the
 * plot being asked glows and shows "?".
 */
export function AreaPlots({ model, solved, active, wilt }: { model: AreaModel; solved: boolean[][]; active: [number, number] | null; wilt: boolean }) {
  const rects = useMemo(() => plotRects(model), [model])
  return (
    <group>
      {rects.map((row, i) =>
        row.map(([x0, x1, z0, z1], j) => (
          <Plot key={`${i}-${j}`} x0={x0} x1={x1} z0={z0} z1={z1} value={model.cells[i][j]} solved={!!solved[i]?.[j]} ask={!!active && active[0] === i && active[1] === j} wilt={wilt} tint={i} />
        )),
      )}
      {/* the parts: rows down the left, columns across the top */}
      {model.rows.map((r, i) => {
        const [, , z0, z1] = rects[i][0]
        return (
          <group key={`r${i}`} position={[AREA_PLOT.x0 - 0.42, 0.42, (z0 + z1) / 2]} rotation={[-0.35, 0, 0]}>
            <Slate text={String(r)} ink={ROW_INK} h={0.42} />
          </group>
        )
      })}
      {model.cols.map((c, j) => {
        const [x0, x1] = rects[0][j]
        return (
          <group key={`c${j}`} position={[(x0 + x1) / 2, 0.42, AREA_PLOT.z0 - 0.38]} rotation={[-0.35, 0, 0]}>
            <Slate text={String(c)} ink={COL_INK} h={0.42} />
          </group>
        )
      })}
    </group>
  )
}

function Plot({ x0, x1, z0, z1, value, solved, ask, wilt, tint }: { x0: number; x1: number; z0: number; z1: number; value: number; solved: boolean; ask: boolean; wilt: boolean; tint: number }) {
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const pulse = useRef<Group>(null)
  // little trees in a grid across a planted plot
  const trees = useMemo(() => {
    const nx = Math.max(1, Math.round(w / 0.42))
    const nz = Math.max(1, Math.round(d / 0.42))
    const trunks: Inst[] = []
    const crowns: Inst[] = []
    for (let a = 0; a < nx; a++)
      for (let b = 0; b < nz; b++) {
        const x = x0 + ((a + 0.5) / nx) * w
        const z = z0 + ((b + 0.5) / nz) * d
        trunks.push({ x, y: 0.2, z, s: [0.05, 0.22, 0.05] })
        crowns.push({ x, y: 0.42, z, s: 0.15 + ((a + b) % 3) * 0.02, color: GRASS[(a + 2 * b) % GRASS.length] })
      }
    return { trunks, crowns }
  }, [x0, z0, w, d])
  useFrame(({ clock }) => {
    const g = pulse.current
    if (!g) return
    const k = ask ? 1 + Math.sin(clock.elapsedTime * 4) * 0.04 : 1
    g.scale.set(k, 1, k)
    g.rotation.z = wilt && ask ? Math.sin(clock.elapsedTime * 18) * 0.03 : 0
  })
  return (
    <group>
      <group ref={pulse} position={[cx, 0, cz]}>
        <TBox size={[w - 0.07, 0.14, d - 0.07]} radius={0.05} position={[0, 0.07, 0]} color={solved ? GRASS[tint % GRASS.length] : ask ? SOIL_ASK : SOIL} receiveShadow castShadow={false} />
      </group>
      {solved && (
        <>
          <Instances geometry={geo.cyl(0.7, 1, 1, 6)} color={TOON.bark} items={trees.trunks} />
          <Instances geometry={geo.blob(1)} items={trees.crowns} castShadow />
        </>
      )}
      {(solved || ask) && (
        <group position={[cx, solved ? 0.78 : 0.5, cz]} rotation={[-0.45, 0, 0]}>
          <Slate text={ask ? '?' : String(value)} ink={ask ? '#ffd75e' : '#fff3c4'} glow={ask} h={0.42} />
        </group>
      )}
    </group>
  )
}

/**
 * A seed post: a stake with a slate of its number and a seed sack on top.
 * `state` colours it: 'wrong' droops it grey (it can't be picked again), 'right' glows.
 */
export function SeedPost({ x, z, n, state }: { x: number; z: number; n: number; state: 'idle' | 'right' | 'wrong' }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    const m = g.current
    if (!m) return
    m.position.y = state === 'right' ? Math.abs(Math.sin(clock.elapsedTime * 8)) * 0.15 : 0
    m.rotation.z = state === 'wrong' ? 0.22 : 0
  })
  return (
    <group position={[x, 0, z]}>
      <TCyl radiusTop={0.42} radiusBottom={0.5} height={0.08} position={[0, 0.04, 0]} color={state === 'right' ? '#ffe58a' : '#e9d3a3'} castShadow={false} segments={16} />
      <group ref={g}>
        <TCyl radiusTop={0.07} radiusBottom={0.08} height={0.9} position={[0, 0.45, 0]} color={state === 'wrong' ? '#9a8a7a' : TOON.wood} segments={8} />
        <TSphere scale={[0.2, 0.22, 0.18]} position={[0, 1.05, 0]} color={state === 'wrong' ? '#b9b0a3' : '#e2c48a'} outline segments={10} />
        <group position={[0, 0.62, 0.12]} rotation={[-0.3, 0, 0]}>
          <Slate text={String(n)} ink={state === 'wrong' ? '#bdb6ac' : '#fff3c4'} h={0.4} />
        </group>
      </group>
    </group>
  )
}
