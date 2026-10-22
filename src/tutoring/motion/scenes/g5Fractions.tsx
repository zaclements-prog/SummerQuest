/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring } from '../anim'
import { Arrow, Burst, Chip, Draw, Fade, Glow, Paper, Pop, Ring, T, Title } from '../kit'
import { DEEP, M } from '../palette'
import { Friend } from '../shapes'
import type { Scene, SceneProps } from '../types'

/*
 * Fraction Falls, 5th grade (lesson g5Fractions). Colour code for the whole
 * lesson: the FIRST fraction is mint, the SECOND coral; their overlap / their
 * sum's pieces keep those colours; the answer gets a gold glow and a burst.
 * Bars are long rectangles cut into equal cells, like the forge's recipe bar.
 */

const A = { fill: M.mint, ink: DEEP.mint }
const B = { fill: M.coral, ink: DEEP.coral }

/** A stacked fraction centred at (x, y). */
function Frac({ x, y, n, d, size = 46, color = M.ink }: { x: number; y: number; n: number | string; d: number | string; size?: number; color?: string }) {
  const w = Math.max(String(n).length, String(d).length) * size * 0.62 + size * 0.3
  return (
    <g>
      <Title x={x} y={y - size * 0.58} size={size} color={color} stroke={M.white}>
        {n}
      </Title>
      <rect x={x - w / 2} y={y - size * 0.06} width={w} height={size * 0.12} rx={size * 0.06} fill={color} />
      <Title x={x} y={y + size * 0.62} size={size} color={color} stroke={M.white}>
        {d}
      </Title>
    </g>
  )
}

/** A bar of `d` equal cells; `fill(i)` gives a cell's colour and how full it is (0…1). */
function Bar({ x, y, w, h = 64, d, fill }: { x: number; y: number; w: number; h?: number; d: number; fill?: (i: number) => { color: string; k: number } | null }) {
  const cw = w / d
  return (
    <g filter="url(#sq-shadow)">
      <rect x={x} y={y} width={w} height={h} rx={12} fill={M.white} stroke={M.ink} strokeWidth={4} />
      {Array.from({ length: d }, (_, i) => {
        const f = fill?.(i)
        return f && f.k > 0.001 ? <rect key={i} x={x + i * cw + 4} y={y + 4} width={(cw - 8) * f.k} height={h - 8} rx={8} fill={f.color} /> : null
      })}
      {Array.from({ length: d - 1 }, (_, i) => (
        <line key={i} x1={x + (i + 1) * cw} y1={y} x2={x + (i + 1) * cw} y2={y + h} stroke={M.ink} strokeWidth={4} />
      ))}
    </g>
  )
}

/** Thin cut lines drawn down a bar at every `1/d` (the "cut into sixths" moment). */
function Cuts({ t, at, x, y, w, h = 64, d, skip = 1 }: { t: number; at: number; x: number; y: number; w: number; h?: number; d: number; skip?: number }) {
  return (
    <>
      {Array.from({ length: d - 1 }, (_, i) =>
        (i + 1) % skip === 0 ? null : (
          <Draw key={i} t={t} at={at + i * 0.06} dur={0.35} d={`M ${x + ((i + 1) * w) / d} ${y + 4} L ${x + ((i + 1) * w) / d} ${y + h - 4}`} stroke={M.ink} width={3} dash="6 5" />
        ),
      )}
    </>
  )
}

const grow = (t: number, at: number, i = 0, gap = 0.18) => ease.outCubic(progress(t, at + i * gap, 0.35))

// ── 1. common denominators ──────────────────────────────────────────────────

/**
 * g5Fractions/common — a half bar (mint) and a third bar (coral). On "Cut
 * both into sixths" dashed sixth-lines draw down both; "three sixths" and
 * "two sixths" label them; on "five sixths" a third bar fills 3 mint + 2
 * coral sixths and 5/6 pops with a burst.
 */
const common: Scene = ({ t, cue }: SceneProps) => {
  const half = cue('one half')
  const third = cue('one third')
  const cut = cue('Cut both into sixths')
  const threeSix = cue('three sixths')
  const twoSix = cue('two sixths')
  const sum = cue('is five sixths')
  const X = 250
  const BW = 540
  return (
    <>
      <Paper />
      <Pop t={t} at={half} x={X + BW / 2} y={115}>
        <Bar x={X} y={84} w={BW} d={2} fill={(i) => (i === 0 ? { color: A.fill, k: grow(t, half + 0.2) } : null)} />
        <Frac x={150} y={116} n={1} d={2} color={A.ink} />
      </Pop>
      <Pop t={t} at={third} x={X + BW / 2} y={215}>
        <Bar x={X} y={184} w={BW} d={3} fill={(i) => (i === 0 ? { color: B.fill, k: grow(t, third + 0.2) } : null)} />
        <Frac x={150} y={216} n={1} d={3} color={B.ink} />
      </Pop>
      <Cuts t={t} at={cut} x={X} y={84} w={BW} d={6} skip={3} />
      <Cuts t={t} at={cut + 0.3} x={X} y={184} w={BW} d={6} skip={2} />
      <Pop t={t} at={threeSix} x={860} y={116}>
        <Frac x={860} y={116} n={3} d={6} color={A.ink} />
      </Pop>
      <Pop t={t} at={twoSix} x={860} y={216}>
        <Frac x={860} y={216} n={2} d={6} color={B.ink} />
      </Pop>
      <Fade t={t} at={sum - 0.4}>
        <Bar x={X} y={330} w={BW} d={6} fill={(i) => (i < 3 ? { color: A.fill, k: grow(t, sum - 0.3, i, 0.12) } : i < 5 ? { color: B.fill, k: grow(t, sum - 0.3, i, 0.12) } : null)} />
      </Fade>
      <Glow t={t} at={sum + 0.3} x={480} y={460} r={80} />
      <Pop t={t} at={sum + 0.3} x={480} y={462}>
        <Frac x={480} y={462} n={5} d={6} size={56} />
      </Pop>
      <Burst t={t} at={sum + 0.5} x={480} y={462} r={90} />
    </>
  )
}

// ── 2. mixed numbers ────────────────────────────────────────────────────────

/** A whole as a full square tile (`k` = how much of it is drawn). */
function Whole({ x, y, s = 70, color }: { x: number; y: number; s?: number; color: string }) {
  return <rect x={x} y={y} width={s} height={s} rx={10} fill={color} stroke={M.ink} strokeWidth={4} />
}

/**
 * g5Fractions/mixed — 2½ (two mint squares and a half bar) and 1⅓ (one coral
 * square and a third bar). On "add the whole numbers" the squares slide
 * together and 3 pops; on "then add the fractions" the half and third become
 * sixths and 5/6 pops; on "three and five sixths" the answer glows; on
 * "trade one whole" a square splits into a chip "1 = 6/6".
 */
const mixed: Scene = ({ t, cue }: SceneProps) => {
  const wholes = cue('add the whole numbers')
  const fracs = cue('then add the fractions')
  const answer = cue('three and five sixths')
  const trade = cue('trade one whole')
  const slide = ease.inOutCubic(progress(t, wholes + 0.2, 0.7))
  const squares: [number, number, string][] = [
    [90, 90, M.mint],
    [175, 90, M.mint],
    [90, 260, M.coral],
  ]
  return (
    <>
      <Paper />
      {squares.map(([x, y, c], i) => (
        <Pop key={i} t={t} at={0.2 + i * 0.15} x={x + 35} y={y + 35}>
          <Whole x={lerp(x, 120 + i * 85, slide)} y={lerp(y, 400, slide)} color={c} />
        </Pop>
      ))}
      <Pop t={t} at={0.6} x={430} y={125}>
        <Bar x={300} y={92} w={260} d={2} fill={(i) => (i === 0 ? { color: A.fill, k: 1 } : null)} />
      </Pop>
      <Pop t={t} at={0.75} x={430} y={295}>
        <Bar x={300} y={262} w={260} d={3} fill={(i) => (i === 0 ? { color: B.fill, k: 1 } : null)} />
      </Pop>
      <Pop t={t} at={wholes + 0.9} x={470} y={435}>
        <Title x={470} y={450} size={72} color={DEEP.blue} stroke={M.white}>
          3
        </Title>
      </Pop>
      <Fade t={t} at={fracs}>
        <Bar x={600} y={180} w={300} d={6} fill={(i) => (i < 3 ? { color: A.fill, k: grow(t, fracs + 0.2, i, 0.1) } : i < 5 ? { color: B.fill, k: grow(t, fracs + 0.2, i, 0.1) } : null)} />
      </Fade>
      <Pop t={t} at={fracs + 0.9} x={600} y={440}>
        <Title x={540} y={450} size={60} color={M.ink} stroke={M.white}>
          +
        </Title>
        <Frac x={620} y={440} n={5} d={6} size={52} />
      </Pop>
      <Glow t={t} at={answer} x={560} y={440} r={150} />
      <Burst t={t} at={answer + 0.2} x={560} y={440} r={120} />
      <Pop t={t} at={trade} x={790} y={330}>
        <Chip t={t} at={trade} x={790} y={330} text="1 = 6/6" color={M.gold} size={34} />
      </Pop>
    </>
  )
}

// ── 3. benchmarks ───────────────────────────────────────────────────────────

/**
 * g5Fractions/estimate — a number line 0 … ½ … 1. 2/5 lands just left of ½;
 * an arrow of length ½ hops on to 9/10, just short of 1 ("a little less than
 * one whole"); on "three sevenths" a coral 3/7 marker appears far to the left
 * and gets a cross.
 */
const estimate: Scene = ({ t, cue }: SceneProps) => {
  const twoFifths = cue('Two fifths')
  const add = cue('Add one half')
  const less = cue('a little less than one whole')
  const wrong = cue('three sevenths')
  const x0 = 120
  const x1 = 840
  const y = 300
  const X = (v: number) => lerp(x0, x1, v)
  const at = (v: number) => X(v)
  return (
    <>
      <Paper />
      <Draw t={t} at={0.1} d={`M ${x0} ${y} L ${x1} ${y}`} width={6} />
      {[
        [0, '0'],
        [0.5, '1/2'],
        [1, '1'],
      ].map(([v, s], i) => (
        <Fade key={i} t={t} at={0.3 + i * 0.15}>
          <line x1={X(v as number)} y1={y - 20} x2={X(v as number)} y2={y + 20} stroke={M.ink} strokeWidth={5} />
          <Title x={X(v as number)} y={y + 62} size={38}>
            {s}
          </Title>
        </Fade>
      ))}
      <Pop t={t} at={twoFifths} x={at(0.4)} y={y}>
        <circle cx={at(0.4)} cy={y} r={14} fill={M.mint} stroke={M.ink} strokeWidth={4} />
        <Frac x={at(0.4)} y={y - 90} n={2} d={5} size={40} color={A.ink} />
      </Pop>
      <Arrow t={t} at={add} from={[at(0.4), y - 20]} to={[at(0.9), y - 20]} bend={0.5} color={B.ink} width={6} />
      <Pop t={t} at={add + 0.5} x={at(0.65)} y={y - 150}>
        <Chip t={t} at={add + 0.5} x={at(0.65)} y={y - 160} text="+ 1/2" color={M.coral} size={32} />
      </Pop>
      <Pop t={t} at={less} x={at(0.9)} y={y}>
        <circle cx={at(0.9)} cy={y} r={16} fill={M.gold} stroke={M.ink} strokeWidth={4} />
      </Pop>
      <Ring t={t} at={less + 0.2} x={at(0.95)} y={y} r={48} color={M.gold} />
      <Pop t={t} at={wrong} x={at(3 / 7)} y={y + 130}>
        <Frac x={at(3 / 7)} y={y + 140} n={3} d={7} size={38} color={B.ink} />
        <path d={`M ${at(3 / 7) - 40} ${y + 100} L ${at(3 / 7) + 40} ${y + 180} M ${at(3 / 7) + 40} ${y + 100} L ${at(3 / 7) - 40} ${y + 180}`} stroke={DEEP.coral} strokeWidth={9} strokeLinecap="round" />
      </Pop>
    </>
  )
}

// ── 4. the area model ───────────────────────────────────────────────────────

/**
 * g5Fractions/area — a unit square. On "three fourths of a square" three of
 * four columns fill mint; on "two thirds of it" two of three rows wash coral;
 * on "The overlap" the six shared cells turn lilac and glow; on "Multiply the
 * tops" 2 × 3 / 3 × 4 = 6/12 builds on the right; on "one half" = 1/2 pops.
 */
const area: Scene = ({ t, cue }: SceneProps) => {
  const cols = cue('three fourths of a square')
  const rows = cue('two thirds of it')
  const overlap = cue('The overlap')
  const tops = cue('Multiply the tops')
  const half = cue('which is one half')
  const S = 330
  const x = 110
  const y = 110
  const cw = S / 4
  const rh = S / 3
  const cells = []
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 3; r++) {
      const inA = c < 3
      const inB = r < 2
      const kA = inA ? grow(t, cols, c, 0.15) : 0
      const kB = inB ? grow(t, rows, r, 0.2) : 0
      const kO = inA && inB ? grow(t, overlap, c + r, 0.06) : 0
      cells.push(
        <g key={`${c}${r}`}>
          {kA > 0 && <rect x={x + c * cw} y={y + r * rh} width={cw} height={rh * kA} fill={M.mint} />}
          {kB > 0 && <rect x={x + c * cw} y={y + r * rh} width={cw * kB} height={rh} fill={M.coral} opacity={0.55} />}
          {kO > 0 && <rect x={x + c * cw + 3} y={y + r * rh + 3} width={cw - 6} height={rh - 6} fill={M.lilac} opacity={kO} />}
        </g>,
      )
    }
  return (
    <>
      <Paper />
      <Glow t={t} at={overlap} x={x + (3 * cw) / 2} y={y + rh} r={170} breathe={false} />
      <rect x={x} y={y} width={S} height={S} fill={M.white} stroke={M.ink} strokeWidth={5} filter="url(#sq-shadow)" />
      {cells}
      {Array.from({ length: 3 }, (_, i) => (
        <line key={`c${i}`} x1={x + (i + 1) * cw} y1={y} x2={x + (i + 1) * cw} y2={y + S} stroke={M.ink} strokeWidth={3} opacity={grow(t, cols - 0.3)} />
      ))}
      {Array.from({ length: 2 }, (_, i) => (
        <line key={`r${i}`} x1={x} y1={y + (i + 1) * rh} x2={x + S} y2={y + (i + 1) * rh} stroke={M.ink} strokeWidth={3} opacity={grow(t, rows - 0.3)} />
      ))}
      <rect x={x} y={y} width={S} height={S} fill="none" stroke={M.ink} strokeWidth={5} />
      <Pop t={t} at={cols + 0.4} x={x + S / 2} y={y + S + 60}>
        <Frac x={x + (3 * cw) / 2} y={y + S + 60} n={3} d={4} size={36} color={A.ink} />
      </Pop>
      <Pop t={t} at={rows + 0.4} x={x - 50} y={y + rh}>
        <Frac x={x - 50} y={y + rh} n={2} d={3} size={36} color={B.ink} />
      </Pop>
      <Pop t={t} at={tops} x={650} y={250}>
        <Frac x={590} y={250} n="2 × 3" d="3 × 4" size={46} />
        <Title x={712} y={262} size={52}>
          =
        </Title>
        <Frac x={790} y={250} n={6} d={12} size={50} color={DEEP.lilac} />
      </Pop>
      <Pop t={t} at={half} x={700} y={420}>
        <Title x={640} y={432} size={52}>
          =
        </Title>
        <Frac x={720} y={420} n={1} d={2} size={56} color={DEEP.blue} />
      </Pop>
      <Burst t={t} at={half + 0.2} x={720} y={420} r={90} />
    </>
  )
}

// ── 5. a fraction of a whole number ─────────────────────────────────────────

/**
 * g5Fractions/whole — eight apples-as-dots in a row. On "four equal groups"
 * they slide into four pairs with rings; on "Three of those groups" three
 * pairs glow gold; on "make six" a 6 pops with a burst.
 */
const whole: Scene = ({ t, cue }: SceneProps) => {
  const eight = cue('three fourths of eight')
  const groups = cue('four equal groups')
  const three = cue('Three of those groups')
  const six = cue('make six')
  const m = ease.inOutCubic(progress(t, groups, 0.8))
  return (
    <>
      <Paper />
      <Pop t={t} at={0.2} x={480} y={90}>
        <Frac x={420} y={92} n={3} d={4} size={44} color={A.ink} />
        <Title x={500} y={104} size={50}>
          × 8
        </Title>
      </Pop>
      {Array.from({ length: 8 }, (_, i) => {
        const g = Math.floor(i / 2)
        const from: [number, number] = [150 + i * 90, 280]
        const to: [number, number] = [150 + g * 200 + (i % 2) * 70, 280]
        const s = spring(t, eight + i * 0.08, { stiffness: 230, damping: 13 })
        if (s <= 0.001) return null
        const lit = g < 3 && t >= three + g * 0.3
        return (
          <T key={i} x={lerp(from[0], to[0], m)} y={lerp(from[1], to[1], m)} s={s}>
            {lit && <circle r={40} fill={M.gold} opacity={0.5} />}
            <circle r={26} fill={M.coral} stroke={M.ink} strokeWidth={4} />
          </T>
        )
      })}
      {Array.from({ length: 4 }, (_, g) => (
        <Fade key={g} t={t} at={groups + 0.7 + g * 0.1}>
          <rect x={150 + g * 200 - 45} y={225} width={160} height={110} rx={30} fill="none" stroke={g < 3 && t >= three + g * 0.3 ? DEEP.gold : M.inkSoft} strokeWidth={4} strokeDasharray="10 8" />
        </Fade>
      ))}
      <Pop t={t} at={six} x={480} y={440}>
        <Title x={480} y={460} size={90} color={DEEP.gold} stroke={M.white}>
          6
        </Title>
      </Pop>
      <Burst t={t} at={six + 0.2} x={480} y={440} r={110} />
    </>
  )
}

// ── 6. a fraction is a division ─────────────────────────────────────────────

/**
 * g5Fractions/share — three pizzas over four friends. On "Cut each pizza into
 * fourths" each pizza gets its cross; on "one fourth of each pizza" one slice
 * of every pizza flies to the first friend; on "three fourths in all" 3/4 pops
 * over that friend; on "Three divided by four" 3 ÷ 4 = 3/4 builds along the top.
 */
const share: Scene = ({ t, cue }: SceneProps) => {
  const pizzas = cue('Three pizzas')
  const friends = cue('four friends')
  const cut = cue('Cut each pizza into fourths')
  const each = cue('one fourth of each pizza')
  const inAll = cue('three fourths in all')
  const division = cue('Three divided by four')
  const R = 62
  const px = (i: number) => 230 + i * 250
  const PY = 180
  return (
    <>
      <Paper />
      {[0, 1, 2].map((i) => (
        <Pop key={i} t={t} at={pizzas + i * 0.15} x={px(i)} y={PY}>
          <circle cx={px(i)} cy={PY} r={R} fill="#f2b866" stroke={M.ink} strokeWidth={4} />
          <circle cx={px(i)} cy={PY} r={R - 10} fill="#ffd96a" />
          <Draw t={t} at={cut + i * 0.2} dur={0.4} d={`M ${px(i)} ${PY - R} L ${px(i)} ${PY + R} M ${px(i) - R} ${PY} L ${px(i) + R} ${PY}`} width={4} />
        </Pop>
      ))}
      {[0, 1, 2].map((i) => {
        const k = ease.inOutCubic(progress(t, each + i * 0.25, 0.7))
        if (k <= 0) return null
        const x = lerp(px(i) + R / 2.4, 150, k)
        const y = lerp(PY - R / 2.4, 400 - i * 26, k)
        return <path key={i} d={`M ${x - 24} ${y + 24} L ${x - 24} ${y - 24} A 48 48 0 0 1 ${x + 24} ${y + 24} Z`} fill="#ffd96a" stroke={M.ink} strokeWidth={3} />
      })}
      {[0, 1, 2, 3].map((i) => (
        <Pop key={i} t={t} at={friends + i * 0.12} x={150 + i * 220} y={470}>
          <Friend x={150 + i * 220} y={470} r={36} color={M.set[i + 2]} />
        </Pop>
      ))}
      <Pop t={t} at={inAll} x={270} y={380}>
        <Frac x={270} y={380} n={3} d={4} size={48} color={DEEP.gold} />
      </Pop>
      <Pop t={t} at={division} x={700} y={350}>
        <Title x={640} y={362} size={56}>
          3 ÷ 4 =
        </Title>
        <Frac x={790} y={350} n={3} d={4} size={50} color={DEEP.blue} />
      </Pop>
      <Burst t={t} at={division + 0.3} x={790} y={350} r={80} />
    </>
  )
}

export const g5FractionsScenes: Record<string, Scene> = { common, mixed, estimate, area, whole, share }
