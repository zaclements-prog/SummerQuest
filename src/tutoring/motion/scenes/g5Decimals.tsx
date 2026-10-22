/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress } from '../anim'
import { Arrow, Burst, Chip, Draw, Fade, Glow, Hop, Paper, Pop, Ring, Title, Words } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'

/*
 * Place Value Plateau, 5th grade (lesson g5Decimals). A place-value chart runs
 * through the lesson: ONES | TENTHS | HUNDREDTHS | THOUSANDTHS, each place its
 * own colour (ones blue, tenths mint, hundredths gold, thousandths lilac), the
 * decimal point a big coral dot on the line between ones and tenths. A digit
 * keeps its place's colour wherever it goes.
 */

const PLACE_COLORS = [DEEP.blue, DEEP.mint, DEEP.gold, DEEP.lilac]
const PLACE_FILLS = ['#d6e6ff', '#d7f5e8', '#fff0c2', '#ebe2ff']
const PLACE_NAMES = ['ones', 'tenths', 'hundredths', 'thousandths']

/** Column centres of the chart: ones (index 0) … thousandths (index 3); index −1, −2 = tens, hundreds. */
const COL = (i: number) => 330 + i * 150
const CHART_Y = 150

/** The chart's header and column wash, ones through thousandths. */
function Chart({ t, at, from = 0, to = 3, y = CHART_Y }: { t: number; at: number; from?: number; to?: number; y?: number }) {
  const cols = []
  for (let i = from; i <= to; i++) cols.push(i)
  return (
    <>
      {cols.map((i, k) => (
        <Fade key={i} t={t} at={at + k * 0.12}>
          <rect x={COL(i) - 70} y={y - 40} width={140} height={270} rx={18} fill={i >= 0 ? PLACE_FILLS[i] : '#eef0f4'} />
          <Title x={COL(i)} y={y - 8} size={i === 3 ? 22 : 26} color={i >= 0 ? PLACE_COLORS[i] : M.inkSoft}>
            {i >= 0 ? PLACE_NAMES[i] : i === -1 ? 'tens' : 'hundreds'}
          </Title>
        </Fade>
      ))}
    </>
  )
}

/** A digit in its column (`place`: 0 ones, 1 tenths, …), coloured by the place it started in. */
function Digit({ x, y, d, color, size = 96 }: { x: number; y: number; d: string | number; color: string; size?: number }) {
  return (
    <Title x={x} y={y} size={size} color={color} stroke={M.white}>
      {d}
    </Title>
  )
}

/** The decimal point between ones and tenths. */
function Point({ y = CHART_Y + 130 }: { y?: number }) {
  return <circle cx={(COL(0) + COL(1)) / 2} cy={y} r={11} fill={M.coral} stroke={M.ink} strokeWidth={3} />
}

// ── 1. the places ───────────────────────────────────────────────────────────

/**
 * g5Decimals/places — the chart appears place by place on "tenths,
 * hundredths, thousandths"; ×10 arrows hop leftward between the columns on
 * "ten times"; 3 . 4 7 2 pops in, and each digit glows with its value chip
 * (0.4, 0.07, 0.002) as it is named.
 */
const places: Scene = ({ t, cue }: SceneProps) => {
  const chart = cue('tenths, hundredths, thousandths')
  const times = cue('ten times the place')
  const num = cue('three point four seven two')
  const four = cue('four is four tenths')
  const seven = cue('seven hundredths')
  const two = cue('two thousandths')
  const DY = CHART_Y + 130
  const digits: [number, string][] = [
    [0, '3'],
    [1, '4'],
    [2, '7'],
    [3, '2'],
  ]
  const named = [num, four, seven, two]
  const chips = ['3', '0.4', '0.07', '0.002']
  return (
    <>
      <Paper />
      <Chart t={t} at={chart - 0.6} />
      {[0, 1, 2].map((i) => (
        <Hop key={i} t={t} at={times + i * 0.35} from={[COL(i + 1), CHART_Y + 62]} to={[COL(i), CHART_Y + 62]} lift={22} label="×10" labelColor={DEEP.coral} color={DEEP.coral} />
      ))}
      <Pop t={t} at={num} x={(COL(0) + COL(1)) / 2} y={DY}>
        <Point y={DY} />
      </Pop>
      {digits.map(([i, d], k) => (
        <Pop key={i} t={t} at={num + k * 0.12} x={COL(i)} y={DY}>
          <Glow t={t} at={named[k]} x={COL(i)} y={DY - 30} r={58} breathe={false} />
          <Digit x={COL(i)} y={DY} d={d} color={PLACE_COLORS[i]} />
        </Pop>
      ))}
      {[1, 2, 3].map((i) => (
        <Chip key={i} t={t} at={named[i] + 0.3} x={COL(i)} y={DY + 120} text={chips[i]} color={PLACE_FILLS[i]} ink={PLACE_COLORS[i]} size={30} />
      ))}
    </>
  )
}

// ── 2. reading a decimal ────────────────────────────────────────────────────

/**
 * g5Decimals/names — a big 3.472; its name builds underneath word by word:
 * "three" under the 3, "and" under the point (ringed on "The word and"),
 * "four hundred seventy-two thousandths" under 472, the last digit ringed on
 * "the last digit's place".
 */
const names: Scene = ({ t, cue }: SceneProps) => {
  const read = cue('three and four hundred')
  const and = cue('The word and')
  const last = cue("the last digit's place")
  const Y = 210
  return (
    <>
      <Paper />
      <Pop t={t} at={0.2} x={480} y={Y}>
        <Title x={330} y={Y} size={150} color={PLACE_COLORS[0]} stroke={M.white}>
          3
        </Title>
        <circle cx={410} cy={Y + 40} r={14} fill={M.coral} stroke={M.ink} strokeWidth={3} />
        <Title x={480} y={Y} size={150} color={PLACE_COLORS[1]} stroke={M.white}>
          4
        </Title>
        <Title x={570} y={Y} size={150} color={PLACE_COLORS[2]} stroke={M.white}>
          7
        </Title>
        <Title x={660} y={Y} size={150} color={PLACE_COLORS[3]} stroke={M.white}>
          2
        </Title>
      </Pop>
      <Words t={t} at={read} text="three" x={330} y={Y + 130} size={40} color={PLACE_COLORS[0]} />
      <Words t={t} at={read + 0.35} text="and" x={410} y={Y + 190} size={40} color={DEEP.coral} />
      <Words t={t} at={read + 0.7} text="four hundred seventy-two" x={570} y={Y + 130} size={36} />
      <Words t={t} at={read + 1.4} text="thousandths" x={600} y={Y + 190} size={40} color={PLACE_COLORS[3]} />
      <Ring t={t} at={and} x={410} y={Y + 40} r={36} color={DEEP.coral} />
      <Ring t={t} at={last} x={660} y={Y - 10} r={80} color={PLACE_COLORS[3]} />
    </>
  )
}

// ── 3. comparing ────────────────────────────────────────────────────────────

/**
 * g5Decimals/compare — 0.5 over 0.45, lined up at the point. On "place by
 * place" a highlight sweeps the ones then the tenths column; on "Five tenths
 * beats four tenths" the 5 and the 4 are ringed; on "Writing a zero" a 0 pops
 * after the 5; on "is greater" a big > appears.
 */
const compare: Scene = ({ t, cue }: SceneProps) => {
  const byPlace = cue('place by place')
  const beats = cue('Five tenths beats')
  const greater = cue('is greater')
  const zero = cue('Writing a zero')
  const XS = [380, 470, 560]
  const Y1 = 180
  const Y2 = 340
  const sweep = Math.min(1, Math.floor(progress(t, byPlace, 1.2) * 2))
  const swept = t >= byPlace
  return (
    <>
      <Paper />
      {swept && <rect x={sweep === 0 ? 255 : XS[1] - 45} y={90} width={90} height={330} rx={20} fill={M.gold} opacity={0.3} />}
      <Pop t={t} at={0.2} x={470} y={Y1}>
        <Title x={300} y={Y1} size={110}>
          0
        </Title>
        <circle cx={XS[0] - 30} cy={Y1 + 30} r={12} fill={M.coral} stroke={M.ink} strokeWidth={3} />
        <Title x={XS[1]} y={Y1} size={110} color={PLACE_COLORS[1]} stroke={M.white}>
          5
        </Title>
      </Pop>
      <Pop t={t} at={0.5} x={470} y={Y2}>
        <Title x={300} y={Y2} size={110}>
          0
        </Title>
        <circle cx={XS[0] - 30} cy={Y2 + 30} r={12} fill={M.coral} stroke={M.ink} strokeWidth={3} />
        <Title x={XS[1]} y={Y2} size={110} color={PLACE_COLORS[1]} stroke={M.white}>
          4
        </Title>
        <Title x={XS[2]} y={Y2} size={110} color={PLACE_COLORS[2]} stroke={M.white}>
          5
        </Title>
      </Pop>
      <Ring t={t} at={beats} x={XS[1]} y={Y1 - 10} r={60} color={DEEP.mint} />
      <Ring t={t} at={beats + 0.3} x={XS[1]} y={Y2 - 10} r={60} color={M.coral} />
      <Pop t={t} at={zero} x={XS[2]} y={Y1}>
        <Title x={XS[2]} y={Y1} size={110} color={M.inkSoft} stroke={M.white}>
          0
        </Title>
      </Pop>
      <Pop t={t} at={greater} x={780} y={260}>
        <Title x={780} y={290} size={150} color={DEEP.coral} stroke={M.white}>
          {'>'}
        </Title>
      </Pop>
      <Burst t={t} at={greater + 0.2} x={780} y={260} r={100} />
    </>
  )
}

// ── 4. rounding ─────────────────────────────────────────────────────────────

/**
 * g5Decimals/round — 3.476 on top; a number line from 3.4 to 3.5 (ticks every
 * hundredth) with a dot at 3.476. On "the hundredths digit" the 7 is ringed;
 * on "five or more" the dot is past the halfway mark (3.45 glows); on "round
 * up" it hops to 3.5 and 3.5 pops.
 */
const round: Scene = ({ t, cue }: SceneProps) => {
  const hund = cue('the hundredths digit')
  const five = cue('five or more')
  const up = cue('round up')
  const x0 = 140
  const x1 = 820
  const y = 340
  const X = (v: number) => lerp(x0, x1, (v - 3.4) / 0.1)
  const hop = ease.inOutCubic(progress(t, up, 0.7))
  return (
    <>
      <Paper />
      <Pop t={t} at={0.2} x={480} y={130}>
        <Title x={480} y={150} size={100}>
          3.476
        </Title>
      </Pop>
      <Ring t={t} at={hund} x={537} y={120} r={42} color={DEEP.gold} />
      <Draw t={t} at={0.4} d={`M ${x0} ${y} L ${x1} ${y}`} width={6} />
      {Array.from({ length: 11 }, (_, i) => (
        <Fade key={i} t={t} at={0.6 + i * 0.04}>
          <line x1={X(3.4 + i / 100)} y1={y - (i % 5 === 0 ? 24 : 12)} x2={X(3.4 + i / 100)} y2={y + (i % 5 === 0 ? 24 : 12)} stroke={M.ink} strokeWidth={i % 5 === 0 ? 5 : 3} />
        </Fade>
      ))}
      <Fade t={t} at={0.8}>
        <Title x={X(3.4)} y={y + 70} size={36}>
          3.4
        </Title>
        <Title x={X(3.5)} y={y + 70} size={36}>
          3.5
        </Title>
      </Fade>
      <Fade t={t} at={five}>
        <Title x={X(3.45)} y={y + 70} size={30} color={M.inkSoft}>
          3.45
        </Title>
      </Fade>
      <Glow t={t} at={five} x={X(3.45)} y={y} r={40} breathe={false} />
      <Pop t={t} at={0.9} x={X(3.476)} y={y}>
        <circle cx={lerp(X(3.476), X(3.5), hop)} cy={y - Math.sin(hop * Math.PI) * 60} r={16} fill={M.coral} stroke={M.ink} strokeWidth={4} />
      </Pop>
      <Pop t={t} at={up + 0.7} x={X(3.5)} y={y - 100}>
        <Chip t={t} at={up + 0.7} x={X(3.5)} y={y - 100} text="3.5" color={M.gold} size={40} />
      </Pop>
      <Burst t={t} at={up + 0.8} x={X(3.5)} y={y} r={80} />
    </>
  )
}

// ── 5. powers of ten ────────────────────────────────────────────────────────

/**
 * g5Decimals/powers — 3 . 4 5 in the chart (hundreds through hundredths). On
 * "times ten" the digits slide one column left (34.5); on "times one hundred"
 * one more (345); on "Dividing by ten" they slide back past the start to the
 * right (0.345). The point never moves; the digits do.
 */
const powers: Scene = ({ t, cue }: SceneProps) => {
  const ten = cue('times ten')
  const hundred = cue('times one hundred')
  const divide = cue('Dividing by ten')
  const DY = CHART_Y + 130
  const s1 = ease.inOutCubic(progress(t, ten + 0.2, 0.7))
  const s2 = ease.inOutCubic(progress(t, hundred + 0.2, 0.7))
  // dividing starts from 3.45 again and slides one place right
  const back = ease.inOutCubic(progress(t, divide - 0.2, 0.4))
  const s3 = ease.inOutCubic(progress(t, divide + 0.3, 0.7))
  const shift = (s1 + s2) * (1 - back) - s3
  const digits: [number, string][] = [
    [0, '3'],
    [1, '4'],
    [2, '5'],
  ]
  const label = t >= divide + 0.8 ? '0.345' : t >= hundred + 0.8 ? '345' : t >= ten + 0.8 ? '34.5' : '3.45'
  return (
    <>
      <Paper />
      {/* hundreds through thousandths: scaled to fit the stage */}
      <g transform="translate(90 20) scale(0.85)">
      <Chart t={t} at={0.1} from={-2} to={3} y={CHART_Y} />
      <Point y={DY} />
      {digits.map(([i, d]) => (
        <Pop key={i} t={t} at={0.5 + i * 0.12} x={COL(i)} y={DY}>
          <Digit x={COL(i - shift)} y={DY} d={d} color={PLACE_COLORS[i]} size={90} />
        </Pop>
      ))}
      {t >= divide + 0.8 && (
        <Fade t={t} at={divide + 0.8}>
          <Digit x={COL(0)} y={DY} d={0} color={M.inkSoft} size={90} />
        </Fade>
      )}
      <Arrow t={t} at={ten} from={[COL(1), DY + 90]} to={[COL(0), DY + 90]} color={DEEP.coral} />
      <Arrow t={t} at={divide} from={[COL(0), DY + 90]} to={[COL(1), DY + 90]} color={DEEP.blue} />
      </g>
      <Pop t={t} at={0.6} x={820} y={490}>
        <Title x={480} y={500} size={54} color={M.ink} stroke={M.white}>
          {label}
        </Title>
      </Pop>
    </>
  )
}

// ── 6. adding and multiplying ───────────────────────────────────────────────

/**
 * g5Decimals/operate — 4.50 over 2.37 lined up at the point (the points glow
 * on "line up the decimal points"), a rule, then 6.87 appears digit by digit.
 * On "To multiply" it fades to 0.6 × 0.4; "six times four" shows 6 × 4 = 24;
 * on "make hundredths" the 24 slides into hundredths: 0.24.
 */
const operate: Scene = ({ t, cue }: SceneProps) => {
  const line = cue('line up the decimal points')
  const sum = cue('is six point eight seven')
  const mult = cue('To multiply')
  const sixFour = cue('multiply six times four')
  const hund = cue('make hundredths')
  const answer = cue('the answer is')
  const XS = [330, 430, 520]
  const PX = 380
  const out = mult - 0.2
  const sumDigits = ['6', '8', '7']
  return (
    <>
      <Paper />
      <Fade t={t} at={0.2} out={out}>
        {[
          ['4', '5', '0'],
          ['2', '3', '7'],
        ].map((row, r) => (
          <g key={r}>
            {r === 1 && (
              <Title x={230} y={180 + r * 110} size={90}>
                +
              </Title>
            )}
            {row.map((d, i) => (
              <Title key={i} x={XS[i]} y={180 + r * 110} size={90} color={PLACE_COLORS[i]} stroke={M.white}>
                {d}
              </Title>
            ))}
            <circle cx={PX} cy={205 + r * 110} r={10} fill={M.coral} stroke={M.ink} strokeWidth={3} />
          </g>
        ))}
        <Glow t={t} at={line} x={PX} y={260} r={70} breathe={false} />
        <Draw t={t} at={line + 0.4} d="M 220 345 L 600 345" width={6} />
        {sumDigits.map((d, i) => (
          <Pop key={i} t={t} at={sum + i * 0.2} x={XS[i]} y={420}>
            <Title x={XS[i]} y={420} size={90} color={PLACE_COLORS[i]} stroke={M.white}>
              {d}
            </Title>
          </Pop>
        ))}
        <Pop t={t} at={sum} x={PX} y={445}>
          <circle cx={PX} cy={445} r={10} fill={M.coral} stroke={M.ink} strokeWidth={3} />
        </Pop>
      </Fade>
      <Fade t={t} at={mult}>
        <Title x={480} y={150} size={90}>
          0.6 × 0.4
        </Title>
      </Fade>
      <Fade t={t} at={sixFour}>
        <Title x={480} y={290} size={70} color={DEEP.blue} stroke={M.white}>
          6 × 4 = 24
        </Title>
      </Fade>
      <Fade t={t} at={hund}>
        <Words t={t} at={hund} text="tenths × tenths = hundredths" x={480} y={380} size={34} color={PLACE_COLORS[2]} />
      </Fade>
      <Pop t={t} at={answer} x={480} y={470}>
        <Title x={480} y={480} size={84} color={DEEP.gold} stroke={M.white}>
          0.24
        </Title>
      </Pop>
      <Burst t={t} at={answer + 0.2} x={480} y={470} r={100} />
    </>
  )
}

export const g5DecimalsScenes: Record<string, Scene> = { places, names, compare, round, powers, operate }
