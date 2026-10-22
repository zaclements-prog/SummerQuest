/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress } from '../anim'
import { Burst, Chip, Draw, Equation, Hop, Paper, Pop, Ring, Title } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { ColorWords, Dot, Plane, gx, gy, type Grid } from './_g5mgd'

/*
 * 5th-grade coordinate colour code (whole lesson): x (across) CORAL, y (up)
 * BLUE, the origin GOLD; in the family tree each family keeps one colour.
 */

const X_C = DEEP.coral
const Y_C = DEEP.blue
const G: Grid = { ox: 110, oy: 480, u: 42, n: 10 }

/** coordinates/axes — the x-axis draws across, the y-axis up, and the origin rings: (0, 0). */
const axes: Scene = ({ t, cue }: SceneProps) => {
  const xa = cue('The x-axis')
  const ya = cue('The y-axis')
  const o = cue('the origin')
  const zz = cue('zero, zero')
  return (
    <>
      <Paper />
      <Plane t={t} g={G} xAt={xa} yAt={ya} />
      <Pop t={t} at={xa + 0.4} x={gx(G, 10) + 30} y={G.oy - 30}>
        <Title x={gx(G, 10) + 34} y={G.oy - 30} size={40} color={X_C} stroke={M.white}>
          x
        </Title>
      </Pop>
      <Pop t={t} at={ya + 0.4} x={G.ox + 34} y={gy(G, 10) - 14}>
        <Title x={G.ox + 34} y={gy(G, 10) - 14} size={40} color={Y_C} stroke={M.white}>
          y
        </Title>
      </Pop>
      <ColorWords t={t} at={xa} x={760} y={150} size={40} text="x-axis: across" colors={[X_C, M.ink]} />
      <ColorWords t={t} at={ya} x={760} y={230} size={40} text="y-axis: up" colors={[Y_C, M.ink]} />
      <Ring t={t} at={o} x={G.ox} y={G.oy} r={22} color={M.gold} />
      <Chip t={t} at={zz} x={760} y={340} text="origin (0, 0)" color={M.gold} size={34} />
    </>
  )
}

/** coordinates/plot — a dot walks from the origin across 3, then up 5, and lands on (3, 5). */
const plot: Scene = ({ t, cue }: SceneProps) => {
  const first = cue('The first number')
  const second = cue('The second number')
  const go = cue('across three')
  const up = cue('then up five')
  const kx = ease.inOutCubic(progress(t, go, 0.9))
  const ky = ease.inOutCubic(progress(t, up, 0.9))
  const x = 3 * kx
  const y = 5 * ky
  return (
    <>
      <Paper />
      <Plane t={t} g={G} xAt={-1} yAt={-1} />
      {kx > 0 && <line x1={G.ox} y1={G.oy} x2={gx(G, x)} y2={G.oy} stroke={X_C} strokeWidth={8} strokeLinecap="round" />}
      {ky > 0 && <line x1={gx(G, 3)} y1={G.oy} x2={gx(G, 3)} y2={gy(G, y)} stroke={Y_C} strokeWidth={8} strokeLinecap="round" />}
      <Dot g={G} x={x} y={y} color={M.gold} label={ky >= 1 ? '(3, 5)' : undefined} s={ease.outBack(progress(t, cue('Start at the origin'), 0.4))} />
      <Equation
        t={t}
        x={760}
        y={170}
        size={72}
        tokens={[
          { text: '(', at: first - 0.3 },
          { text: 'x', at: first, color: X_C },
          { text: ',', at: first + 0.2 },
          { text: 'y', at: second, color: Y_C },
          { text: ')', at: second + 0.2 },
        ]}
      />
      <ColorWords t={t} at={first + 0.3} x={760} y={270} size={34} text="across first" colors={[X_C, M.ink]} />
      <ColorWords t={t} at={second + 0.3} x={760} y={330} size={34} text="then up" colors={[M.ink, Y_C]} />
      <Burst t={t} at={up + 0.9} x={gx(G, 3)} y={gy(G, 5)} />
    </>
  )
}

/** coordinates/map — a little town on the grid: the library (1, 2), the park (1, 7), 5 blocks straight up. */
const map: Scene = ({ t, cue }: SceneProps) => {
  const lib = cue('the library is at')
  const park = cue('the park is at')
  const share = cue('share an x-coordinate')
  const count = cue('count straight up')
  const five = cue('five blocks')
  return (
    <>
      <Paper />
      <Plane t={t} g={G} xAt={-1} yAt={-1} />
      {[
        [4, 3],
        [6, 6],
        [8, 2],
        [7, 8],
      ].map(([x, y], i) => (
        <rect key={i} x={gx(G, x) - 14} y={gy(G, y) - 14} width={28} height={28} rx={5} fill={M.lilac} stroke={M.ink} strokeWidth={3} opacity={0.6} />
      ))}
      <Pop t={t} at={lib} x={gx(G, 1)} y={gy(G, 2)}>
        <Dot g={G} x={1} y={2} color={M.coral} label="L (1, 2)" />
      </Pop>
      <Pop t={t} at={park} x={gx(G, 1)} y={gy(G, 7)}>
        <Dot g={G} x={1} y={7} color={M.leaf} label="P (1, 7)" />
      </Pop>
      {progress(t, share, 0.1) > 0 && <Draw t={t} at={share} dur={0.6} d={`M ${gx(G, 1)} ${G.oy} L ${gx(G, 1)} ${gy(G, 10)}`} stroke={X_C} width={4} dash="10 8" />}
      {[3, 4, 5, 6, 7].map((y, i) => (
        <Hop key={y} t={t} at={count + i * 0.35} from={[gx(G, 1), gy(G, y - 1)]} to={[gx(G, 1), gy(G, y)]} lift={12} color={Y_C} label={String(i + 1)} labelColor={Y_C} labelSize={22} />
      ))}
      <Chip t={t} at={five} x={760} y={200} text="7 − 2 = 5 blocks" color={M.sky} size={32} />
    </>
  )
}

// ── the family tree ──────────────────────────────────────────────────────────

const NODES = [
  { id: 'quad', name: 'quadrilateral', x: 480, y: 70, c: M.lilac, d: 'M -38 18 L -22 -20 L 34 -14 L 40 20 Z' },
  { id: 'para', name: 'parallelogram', x: 480, y: 195, c: M.sky, d: 'M -40 18 L -22 -18 L 40 -18 L 22 18 Z' },
  { id: 'rect', name: 'rectangle', x: 250, y: 320, c: M.gold, d: 'M -42 -18 L 42 -18 L 42 18 L -42 18 Z' },
  { id: 'rhom', name: 'rhombus', x: 710, y: 320, c: M.pink, d: 'M -26 18 L -12 -18 L 26 -18 L 12 18 Z' },
  { id: 'sq', name: 'square', x: 480, y: 450, c: M.mint, d: 'M -20 -20 L 20 -20 L 20 20 L -20 20 Z' },
] as const

function Node({ t, at, n }: { t: number; at: number; n: (typeof NODES)[number] }) {
  return (
    <Pop t={t} at={at} x={n.x} y={n.y}>
      <rect x={n.x - 150} y={n.y - 34} width={300} height={68} rx={22} fill={n.c} stroke={M.ink} strokeWidth={4} filter="url(#sq-shadow)" />
      <path d={n.d} transform={`translate(${n.x - 102} ${n.y})`} fill={M.white} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <Title x={n.x - 52} y={n.y + 2} size={26} anchor="start">
        {n.name}
      </Title>
    </Pop>
  )
}

/** coordinates/family — the family tree grows: quadrilateral → parallelogram → rectangle and rhombus → square. */
const family: Scene = ({ t, cue }: SceneProps) => {
  const at = [cue('A quadrilateral'), cue('A parallelogram'), cue('A rectangle'), cue('A rhombus'), cue('A square')]
  const link = (a: number, b: number, when: number) => (
    <Draw t={t} at={when} dur={0.4} d={`M ${NODES[a].x} ${NODES[a].y + 34} L ${NODES[b].x} ${NODES[b].y - 34}`} stroke={M.ink} width={4} />
  )
  return (
    <>
      <Paper />
      {link(0, 1, at[1] - 0.2)}
      {link(1, 2, at[2] - 0.2)}
      {link(1, 3, at[3] - 0.2)}
      {link(2, 4, at[4] - 0.2)}
      {link(3, 4, at[4] - 0.1)}
      {NODES.map((n, i) => (
        <Node key={n.id} t={t} at={at[i]} n={n} />
      ))}
      <Burst t={t} at={cue('is both') + 0.1} x={480} y={450} color={DEEP.mint} r={90} />
    </>
  )
}

/** coordinates/always — a square is a rectangle (four right angles ✓); a long rectangle is not a square. */
const always: Scene = ({ t, cue }: SceneProps) => {
  const sq = cue('every square is a rectangle')
  const corners = cue('four right angles')
  const not = cue('But not every rectangle')
  const sides = cue('do not have to be equal')
  const stretch = ease.inOutCubic(progress(t, not + 0.3, 0.8))
  const w = lerp(150, 260, stretch)
  return (
    <>
      <Paper />
      <Pop t={t} at={sq - 0.4} x={250} y={250}>
        <rect x={250 - 75} y={175} width={150} height={150} fill={M.mint} stroke={M.ink} strokeWidth={5} />
        {[
          [175, 175, 1, 1],
          [325, 175, -1, 1],
          [175, 325, 1, -1],
          [325, 325, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <path key={i} d={`M ${x + sx * 22} ${y} L ${x + sx * 22} ${y + sy * 22} L ${x} ${y + sy * 22}`} fill="none" stroke={M.ink} strokeWidth={3.5} opacity={progress(t, corners + i * 0.15, 0.2)} />
        ))}
      </Pop>
      <Chip t={t} at={corners + 0.6} x={250} y={400} text="square → rectangle ✓" color={M.mint} size={28} />
      <Pop t={t} at={not} x={700} y={250}>
        <rect x={700 - w / 2} y={190} width={w} height={120} fill={M.gold} stroke={M.ink} strokeWidth={5} />
      </Pop>
      <Chip t={t} at={sides} x={700} y={400} text="rectangle → square ✗" color={M.pink} size={28} />
    </>
  )
}

export const g5CoordinatesScenes: Record<string, Scene> = { axes, plot, map, family, always }
