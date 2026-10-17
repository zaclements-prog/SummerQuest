/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, clamp, ease, lerp, progress, pulse, spring, wobble } from '../anim'
import { Badge, Brace, Burst, Camera, Chip, Equation, Fade, Hop, NumberLine, Paper, Pop, Ring, T, Title, Twinkle, VBrace, Words } from '../kit'
import { lineX, tokenXs } from '../layout'
import { DEEP, M } from '../palette'
import { Apple, Frog } from '../shapes'
import type { Scene, SceneProps } from '../types'

/*
 * Multiplication colour code (whole lesson):
 *   each group / row has its own colour (red, yellow, green apples on a tinted ring)
 *   the NUMBER OF GROUPS (3) is blue, the NUMBER IN EACH GROUP (4) is orange,
 *   the total is ink with a gold ring.
 */
const GROUP = [
  { apple: '#f2766b', ring: '#fde1dc', edge: M.coral, ink: DEEP.coral },
  { apple: '#ffcf4d', ring: '#fff1c4', edge: M.gold, ink: DEEP.gold },
  { apple: '#7fd36b', ring: '#e1f5d9', edge: '#7fd36b', ink: DEEP.leaf },
  { apple: '#8ab8ff', ring: '#e1ecff', edge: '#8ab8ff', ink: DEEP.blue },
]
const NGROUPS = DEEP.blue
const NEACH = DEEP.orange

/** A falling-in offset: drops `h` px with gravity from `at`, then squashes on landing. */
function drop(t: number, at: number, h = 260) {
  const k = progress(t, at, 0.38)
  return { dy: -h * (1 - ease.inQuad(k)), sq: wobble(t, at + 0.38, { amp: 0.22, freq: 2.6, decay: 7 }), on: t >= at }
}

/** An apple drawn with a squash (sq > 0 = flatter) around its base. */
function SqApple({ x, y, r, color, sq = 0 }: { x: number; y: number; r: number; color: string; sq?: number }) {
  return (
    <g transform={`translate(${x} ${y + r * 0.86}) scale(${1 + sq} ${1 - sq}) translate(${-x} ${-y - r * 0.86})`}>
      <Apple x={x} y={y} r={r} color={color} />
    </g>
  )
}

// ── groups (intro) layout ────────────────────────────────────────────────────
const RING_X = [210, 480, 750]
const RING_Y = 300
const RING_R = 106
const IN_RING: [number, number][] = [
  [-36, -30],
  [36, -30],
  [-36, 36],
  [36, 36],
]

/**
 * multiplication/intro — "Multiplication means adding equal groups. When we say
 * three times four, we mean three groups with four in each group."
 * Three empty rings appear (equal groups); "3 × 4" types on; the rings get
 * counted 1-2-3 as the 3 glows; then four apples drop into each ring as the 4
 * glows; a "+" joins the groups: 4 + 4 + 4.
 */
const intro: Scene = ({ t, cue }: SceneProps) => {
  const equal = cue('equal groups')
  const say = cue('three times four')
  const times = cue('times four')
  const four = cue('four,')
  const groups = cue('three groups')
  const each = cue('four in each group')
  const xs = tokenXs(['3', '×', '4'], 480, 84, 0.3)
  const sum = each + 1.6
  // opener: a big × spins in, then bows out as the groups arrive
  const xin = spring(t, 0.1, { stiffness: 170, damping: 11 })
  const xout = ease.inOutCubic(progress(t, equal - 0.45, 0.45))
  return (
    <>
      <Paper />
      <T x={480} y={250} s={xin * (1 - xout)} r={(1 - xin) * -120 + xout * 90}>
        <circle r={110} fill={M.pink} opacity={0.25} />
        <Title x={0} y={8} size={220} color={DEEP.pink} stroke={M.white}>
          ×
        </Title>
      </T>
      <Words t={t} at={0.35} text="multiplication" x={480} y={430} size={52} out={equal - 0.4} />
      <Words t={t} at={equal - 0.1} text="equal groups" x={480} y={84} size={52} out={say - 0.3} />
      {/* the rings */}
      {RING_X.map((x, g) => {
        const bump = 1 + 0.08 * Math.sin(Math.PI * progress(t, groups + g * 0.25, 0.35))
        return (
          <Pop key={g} t={t} at={equal + 0.15 + g * 0.15} x={x} y={RING_Y} bounce={11}>
            <g transform={`translate(${x} ${RING_Y}) scale(${bump}) translate(${-x} ${-RING_Y})`}>
              <circle cx={x} cy={RING_Y + 6} r={RING_R} fill={M.ink} opacity={0.08} />
              <circle cx={x} cy={RING_Y} r={RING_R} fill={GROUP[g].ring} stroke={GROUP[g].edge} strokeWidth={6} strokeDasharray="16 10" strokeLinecap="round" />
            </g>
          </Pop>
        )
      })}
      {/* count the groups */}
      {RING_X.map((x, g) => (
        <Badge key={g} t={t} at={groups + g * 0.25} x={x} y={RING_Y - RING_R - 8} text={g + 1} r={22} ring={NGROUPS} ink={NGROUPS} />
      ))}
      {/* apples drop in: four in each group */}
      {RING_X.map((x, g) =>
        IN_RING.map(([dx, dy], j) => {
          const d = drop(t, each - 0.1 + g * 0.3 + j * 0.09)
          if (!d.on) return null
          return <SqApple key={`${g}-${j}`} x={x + dx} y={RING_Y + dy + d.dy} r={27} color={GROUP[g].apple} sq={d.sq} />
        }),
      )}
      {RING_X.map((x, g) => (
        <Chip key={g} t={t} at={each + 0.5 + g * 0.3} x={x} y={RING_Y + RING_R + 34} text="4" color={M.white} ink={NEACH} size={30} />
      ))}
      {/* 4 + 4 + 4 */}
      {[0, 1].map((k) => (
        <Pop key={k} t={t} at={sum + k * 0.2} x={(RING_X[k] + RING_X[k + 1]) / 2} y={RING_Y}>
          <Title x={(RING_X[k] + RING_X[k + 1]) / 2} y={RING_Y} size={64} color={M.ink} stroke={M.white}>
            +
          </Title>
        </Pop>
      ))}
      {/* 3 × 4 */}
      <Equation
        t={t}
        x={480}
        y={84}
        size={84}
        gap={0.3}
        tokens={[
          { text: '3', color: NGROUPS, at: say },
          { text: '×', at: times },
          { text: '4', color: NEACH, at: four },
        ]}
      />
      <Ring t={t} at={groups} x={xs[0]} y={84} r={46} color={NGROUPS} out={each} />
      <Ring t={t} at={each} x={xs[2]} y={84} r={46} color={M.coral} out={sum + 0.6} />
      <Twinkle t={t} at={sum + 0.8} x={480} y={RING_Y} r={330} n={6} />
    </>
  )
}

// ── the 3 × 4 array ──────────────────────────────────────────────────────────
const AX = 430
const AY = 272
const SX = 100
const SY = 94
const cellX = (c: number, cx = AX, sx = SX) => cx + (c - 1.5) * sx
const cellY = (r: number, cy = AY, sy = SY) => cy + (r - 1) * sy

/**
 * multiplication/count — "Look at the rows. Count them all: four, eight,
 * twelve. Three rows of four make twelve. So three times four equals twelve."
 * The three groups' apples fly into rows (same colours: each row is a group);
 * each row flashes as we skip count 4, 8, 12; braces show 3 rows and 4 in each
 * row; the running 12 flies down into 3 × 4 = 12.
 */
const count: Scene = ({ t, cue }: SceneProps) => {
  const four = cue('four,')
  const eight = cue('eight')
  const twelve = cue('twelve')
  const rows3 = cue('Three rows')
  const ofFour = cue('of four make')
  const so = cue('So three')
  const times = cue('times four equals')
  const four3 = cue('four equals')
  const eq = cue('equals twelve')
  const counts = [four, eight, twelve]
  const eqXs = tokenXs(['3', '×', '4', '=', '12'], 480, 68, 0.26)
  const fly12 = eq + 0.25
  const k12 = ease.inOutCubic(progress(t, fly12, 0.7))
  return (
    <>
      <Paper />
      <Camera t={t} keys={[{ at: 0, x: 480, y: 270, zoom: 1 }, { at: four, x: 470, y: 252, zoom: 1.07 }, { at: so, x: 480, y: 270, zoom: 1 }]}>
        {/* the rings dissolve as the apples leave */}
        {RING_X.map((x, g) => {
          const k = progress(t, 0.1, 0.6)
          return k < 1 && <circle key={g} cx={x} cy={RING_Y} r={RING_R * (1 - 0.3 * k)} fill={GROUP[g].ring} stroke={GROUP[g].edge} strokeWidth={6} strokeDasharray="16 10" opacity={1 - k} />
        })}
        {/* rows light up as they're counted */}
        {[0, 1, 2].map((r) => {
          const w = ease.outCubic(progress(t, 0.9 + r * 0.12, 0.5))
          const flash = Math.sin(Math.PI * progress(t, counts[r], 0.45))
          return (
            w > 0 && (
              <rect key={r} x={cellX(0) - 52} y={cellY(r) - 42} width={(SX * 3 + 104) * w} height={84} rx={42} fill={GROUP[r].ring} stroke={GROUP[r].edge} strokeWidth={3 + 4 * flash} />
            )
          )
        })}
        {/* apples: from their group rings into rows */}
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => {
            const from: [number, number] = [RING_X[r] + IN_RING[c][0], RING_Y + IN_RING[c][1]]
            const to: [number, number] = [cellX(c), cellY(r)]
            const k = ease.inOutCubic(progress(t, 0.15 + r * 0.12 + c * 0.05, 0.75))
            const [x, y] = arc(from, to, 30, k)
            const bump = 1 + 0.16 * Math.sin(Math.PI * progress(t, counts[r] + c * 0.04, 0.35))
            return (
              <T key={`${r}-${c}`} x={x} y={y} s={bump}>
                <Apple x={0} y={0} r={30} color={GROUP[r].apple} />
              </T>
            )
          }),
        )}
        {/* skip count: 4, 8, 12 */}
        {[0, 1, 2].map((r) => {
          const x = r === 2 ? lerp(720, eqXs[4], k12) : 720
          const y = r === 2 ? arc([720, cellY(2)], [eqXs[4], 470], 60, k12)[1] : cellY(r)
          const s = r === 2 ? lerp(56 / 68, 1, k12) : 1
          return (
            <Pop key={r} t={t} at={counts[r]} x={720} y={cellY(r)} bounce={10}>
              <T x={x} y={y} s={s}>
                <Title x={0} y={0} size={68} color={r === 2 && k12 > 0.5 ? M.ink : GROUP[r].ink} stroke={M.white}>
                  {(r + 1) * 4}
                </Title>
              </T>
            </Pop>
          )
        })}
        {[0, 1].map((r) => (
          <Pop key={r} t={t} at={counts[r + 1] - 0.05} x={790} y={(cellY(r) + cellY(r + 1)) / 2}>
            <Title x={790} y={(cellY(r) + cellY(r + 1)) / 2} size={30} color={NEACH} stroke={M.white}>
              +4
            </Title>
          </Pop>
        ))}
        {/* 3 rows, 4 in each row */}
        <VBrace t={t} at={rows3} x={cellX(0) - 66} y0={cellY(0) - 36} y1={cellY(2) + 36} dir="left" label="3 rows" labelColor={NGROUPS} color={NGROUPS} labelSize={34} />
        <Brace t={t} at={ofFour} x0={cellX(0) - 30} x1={cellX(3) + 30} y={cellY(0) - 54} dir="up" label="4 in each row" labelColor={NEACH} color={NEACH} labelSize={34} />
        {/* 3 × 4 = 12 */}
        <Equation
          t={t}
          x={480}
          y={470}
          size={68}
          gap={0.26}
          tokens={[
            { text: '3', color: NGROUPS, at: so },
            { text: '×', at: times },
            { text: '4', color: NEACH, at: four3 },
            { text: '=', at: eq },
            { text: '12', at: eq, o: 0 },
          ]}
        />
        <Ring t={t} at={fly12 + 0.7} x={eqXs[4]} y={470} r={50} color={M.gold} />
        <Burst t={t} at={fly12 + 0.65} x={eqXs[4]} y={470} color={M.gold} r={80} />
        <Twinkle t={t} at={fly12 + 1.2} x={eqXs[4]} y={470} r={70} n={4} />
      </Camera>
    </>
  )
}

/**
 * multiplication/commutative — "Here is a trick. Three times four and four
 * times three give the same answer. You can flip the numbers to make it easier."
 * The 3-row array turns a quarter turn into 4 rows of 3 (same 12 apples, rows
 * become columns) while the 3 and 4 swap places; both make 12. Then it flips
 * back and forth: same answer either way.
 */
const commutative: Scene = ({ t, cue }: SceneProps) => {
  const a = cue('Three times four')
  const b = cue('four times three')
  const same = cue('same answer')
  const flip = cue('flip the numbers')
  const cx = 300
  const cy = 284
  const s = 80
  // quarter turn on "four times three"; on "flip" it turns back, then forward again
  const rot = 90 * (spring(t, b, { stiffness: 120, damping: 13 }) - spring(t, flip, { stiffness: 120, damping: 13 }) + spring(t, flip + 1.3, { stiffness: 120, damping: 13 }))
  const line1 = 214
  const line2 = 344
  const ex = 700
  const xs1 = tokenXs(['3', '×', '4', '=', '12'], ex, 64, 0.26)
  const swap = ease.inOutCubic(progress(t, b + 0.1, 0.8))
  const twist = 1 + 0.06 * Math.sin(Math.PI * progress(t, b, 0.9))
  return (
    <>
      <Paper />
      <Words t={t} at={0.15} text="a trick!" x={cx} y={70} size={46} colors={[undefined, DEEP.pink]} out={b} />
      {/* the array (apples stay upright while it turns) */}
      <Pop t={t} at={0.1} x={cx} y={cy} bounce={13}>
        <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${twist})`}>
          <rect x={-2.5 * s} y={-1.95 * s} width={5 * s} height={3.9 * s} rx={30} fill={M.white} stroke={M.ink} strokeWidth={4} opacity={0.9} />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => {
              const x = (c - 1.5) * s
              const y = (r - 1) * s * 1.05
              return (
                <g key={`${r}-${c}`} transform={`translate(${x} ${y}) rotate(${-rot})`}>
                  <Apple x={0} y={0} r={29} color={GROUP[r].apple} />
                </g>
              )
            }),
          )}
        </g>
      </Pop>
      {/* row labels while it turns */}
      <Fade t={t} at={a + 0.3} out={b}>
        <Title x={cx} y={cy + 2.5 * s + 26} size={30} color={NGROUPS} stroke={M.white}>
          3 rows of 4
        </Title>
      </Fade>
      <Fade t={t} at={b + 0.9} out={flip}>
        <Title x={cx} y={cy + 2.5 * s + 26} size={30} color={NEACH} stroke={M.white}>
          4 rows of 3
        </Title>
      </Fade>
      <Fade t={t} at={flip + 2.3}>
        <Title x={cx} y={cy + 2.5 * s + 26} size={30} color={M.inkSoft} stroke={M.white}>
          still 12 apples
        </Title>
      </Fade>
      {/* the turn arrow */}
      <Fade t={t} at={b - 0.1} out={b + 1.1}>
        <path d={`M ${cx + 1.6 * s} ${cy - 2.3 * s} A ${2.6 * s} ${2.6 * s} 0 0 1 ${cx + 2.75 * s} ${cy - 0.9 * s}`} fill="none" stroke={M.ink} strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${cx + 2.75 * s - 18} ${cy - 0.9 * s - 12} L ${cx + 2.75 * s} ${cy - 0.9 * s} L ${cx + 2.75 * s + 10} ${cy - 0.9 * s - 20}`} fill="none" stroke={M.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      </Fade>
      {/* 3 × 4 */}
      <Equation
        t={t}
        x={ex}
        y={line1}
        size={64}
        gap={0.26}
        tokens={[
          { text: '3', color: NGROUPS, at: a },
          { text: '×', at: a + 0.25 },
          { text: '4', color: NEACH, at: a + 0.45 },
          { text: '=', at: same },
          { text: '12', at: same + 0.2 },
        ]}
      />
      {/* 4 × 3: the 3 and the 4 hop down and trade places */}
      {t > b + 0.1 &&
        [
          { text: '4', color: NEACH, from: xs1[2], to: xs1[0], lift: 70 },
          { text: '3', color: NGROUPS, from: xs1[0], to: xs1[2], lift: 20 },
        ].map((tk, i) => {
          const [x, y] = arc([tk.from, line1], [tk.to, line2], tk.lift, swap)
          return (
            <Title key={i} x={x} y={y} size={64} color={tk.color} stroke={M.white}>
              {tk.text}
            </Title>
          )
        })}
      <Equation
        t={t}
        x={ex}
        y={line2}
        size={64}
        gap={0.26}
        tokens={[
          { text: '4', at: b, o: 0 },
          { text: '×', at: b + 0.5 },
          { text: '3', at: b, o: 0 },
          { text: '=', at: same + 0.15 },
          { text: '12', at: same + 0.35 },
        ]}
      />
      <Ring t={t} at={same + 0.5} x={xs1[4]} y={line1} r={44} color={M.gold} />
      <Ring t={t} at={same + 0.6} x={xs1[4]} y={line2} r={44} color={M.gold} />
      <Burst t={t} at={same + 0.4} x={xs1[4] + 60} y={(line1 + line2) / 2} color={M.gold} r={70} />
      <Words t={t} at={flip} text="flip it: same answer" x={ex} y={470} size={40} colors={[DEEP.pink, DEEP.pink]} />
      <Twinkle t={t} at={flip + 2.4} x={xs1[4]} y={(line1 + line2) / 2} r={90} n={4} />
    </>
  )
}

/**
 * multiplication/skip — "For the harder facts, skip count. For seven times
 * three, count by sevens: seven, fourteen, twenty-one."
 * A frog sits at 0 on a number line; 7 × 3 appears; it hops three jumps of 7
 * (7, 14, 21) — each jump leaves a bar of 7 blocks above it — and lands on 21.
 */
const skip: Scene = ({ t, cue }: SceneProps) => {
  const skipC = cue('skip count')
  const seven = cue('seven times three')
  const times = cue('times three')
  const three = cue('three,')
  const by = cue('count by sevens')
  const lands = [cue('seven,'), cue('fourteen'), cue('twenty-one')]
  const x0 = 110
  const x1 = 850
  const ly = 420
  const X = (v: number) => lineX(v, 0, 21, x0, x1)
  const HOP = 0.48
  // where is the frog?
  let fv = 0
  let fy = 0
  let squash = 0
  for (let g = 0; g < 3; g++) {
    const st = lands[g] - HOP * 0.75
    const k = progress(t, st, HOP)
    if (t >= st) {
      fv = 7 * g + 7 * ease.inOutSine(k)
      fy = -90 * Math.sin(Math.PI * k)
      squash = k >= 1 ? wobble(t, st + HOP, { amp: 0.25, freq: 2.4, decay: 6 }) : -0.12 * Math.sin(Math.PI * k)
    }
  }
  // a little hop of excitement on "skip count"
  const excite = -26 * Math.sin(Math.PI * progress(t, skipC, 0.4))
  const idle = t > lands[2] + 1 ? -6 * Math.max(0, Math.sin((t - lands[2]) * 3)) : 0
  const done = lands[2] + 0.6
  return (
    <>
      <Paper />
      <NumberLine t={t} at={0.2} x0={x0} x1={x1} y={ly} min={0} max={21} labels={[0, 7, 14, 21]} major={[0, 7, 14, 21]} size={30} tickGap={0.02} />
      <Words t={t} at={skipC - 0.1} text="skip count!" x={480} y={84} size={56} colors={[DEEP.leaf, DEEP.leaf]} out={seven - 0.2} />
      {/* a bar of 7 for each hop */}
      {[0, 1, 2].map((g) =>
        Array.from({ length: 7 }, (_, i) => {
          const at = lands[g] - HOP * 0.75 + ((i + 0.5) / 7) * HOP
          const x = X(7 * g + i + 0.5)
          return (
            <Pop key={`${g}-${i}`} t={t} at={at} x={x} y={229} bounce={13}>
              <rect x={x - 15} y={214} width={30} height={30} rx={7} fill={M.set[g === 2 ? 2 : g]} stroke={M.ink} strokeWidth={3} />
            </Pop>
          )
        }),
      )}
      {[0, 1, 2].map((g) => (
        <Hop key={g} t={t} at={lands[g] - HOP * 0.75} from={[X(7 * g), ly - 10]} to={[X(7 * g + 7), ly - 10]} lift={180} dur={HOP} color={GROUP[g].ink} label="+7" labelColor={GROUP[g].ink} width={5} labelSize={38} />
      ))}
      {/* landing glows */}
      {[0, 1, 2].map((g) => (
        <g key={g}>
          <Burst t={t} at={lands[g] + 0.05} x={X(7 * g + 7)} y={ly} color={M.set[g]} r={46} />
          <Pop t={t} at={lands[g] + 0.05} x={X(7 * g + 7)} y={ly + 50}>
            <circle cx={X(7 * g + 7)} cy={ly + 52} r={30} fill={GROUP[g].ring} stroke={GROUP[g].ink} strokeWidth={4} />
            <Title x={X(7 * g + 7)} y={ly + 53} size={34} color={GROUP[g].ink}>
              {7 * (g + 1)}
            </Title>
          </Pop>
        </g>
      ))}
      {/* the frog */}
      <Pop t={t} at={0.5} x={X(0)} y={ly - 30} bounce={10}>
        <Frog x={X(fv)} y={ly - 6 + fy + excite + idle} r={28} squash={squash} />
      </Pop>
      {/* 7 × 3 = 21 */}
      <Equation
        t={t}
        x={480}
        y={84}
        size={76}
        gap={0.26}
        tokens={[
          { text: '7', color: DEEP.leaf, at: seven },
          { text: '×', at: times },
          { text: '3', color: NGROUPS, at: three },
          { text: '=', at: done },
          { text: '21', at: done + 0.2 },
        ]}
      />
      <Ring t={t} at={by} x={tokenXs(['7', '×', '3', '=', '21'], 480, 76, 0.26)[0]} y={84} r={46} color={M.leaf} out={done} />
      <Ring t={t} at={done + 0.4} x={tokenXs(['7', '×', '3', '=', '21'], 480, 76, 0.26)[4]} y={84} r={54} color={M.gold} />
      <Twinkle t={t} at={done + 0.8} x={X(21)} y={ly - 60} r={70} n={4} />
      {/* the "3" counts the hops */}
      {t > lands[0] &&
        [0, 1, 2].map((g) => (
          <Fade key={g} t={t} at={lands[g]}>
            <circle cx={X(7 * g + 3.5)} cy={176 - 20 * clamp(1 - progress(t, lands[g], 0.3))} r={16} fill={NGROUPS} />
            <Title x={X(7 * g + 3.5)} y={177 - 20 * clamp(1 - progress(t, lands[g], 0.3))} size={20} color={M.white}>
              {g + 1}
            </Title>
          </Fade>
        ))}
      {/* subtle breathing of the finished answer */}
      {t > done + 1 && <circle cx={X(21)} cy={ly + 52} r={34 + 4 * pulse(t, 1.3)} fill="none" stroke={M.gold} strokeWidth={3} opacity={0.6} />}
    </>
  )
}

export const multiplicationScenes: Record<string, Scene> = { intro, count, commutative, skip }
