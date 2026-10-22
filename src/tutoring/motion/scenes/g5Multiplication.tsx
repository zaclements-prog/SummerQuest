/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, progress, spring } from '../anim'
import { Brace, Burst, Draw, Equation, Fade, Pop, Ring, T, Title, Twinkle, VBrace, Words } from '../kit'
import { tokenXs } from '../layout'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'

/*
 * 5th-grade Multiplication Mesa (g5Multiplication). Colour code for the whole
 * lesson: the first factor's parts (20, 3) are coral, the second's (10, 4)
 * blue; each row of boxes has its own soft fill; totals are ink with gold.
 */
const ROWC = DEEP.coral
const COLC = DEEP.blue
const FILL = ['#ffe3a6', '#cdeccf']

// the 23 × 14 area model: 20 and 3 down the side, 10 and 4 across the top
const BX = 300
const BY = 150
const CW = [250, 120]
const RH = [190, 90]
const cellX = (j: number) => BX + (j === 0 ? 0 : CW[0])
const cellY = (i: number) => BY + (i === 0 ? 0 : RH[0])
const VALUES = [
  [200, 80],
  [30, 12],
]

/** The model's boxes, edge labels and (on cue) partial products. */
function Model({ t, box, rows, cols, values, glow = [] }: { t: number; box: number; rows: [number, number]; cols: [number, number]; values?: (number | undefined)[][]; glow?: number[][] }) {
  const k = ease.outCubic(progress(t, box, 0.6))
  return (
    <>
      {[0, 1].map((i) =>
        [0, 1].map((j) => {
          const g = glow.find(([a, b]) => a === i && b === j)
          return (
            k > 0 && (
              <rect key={`${i}${j}`} x={cellX(j) + 3} y={cellY(i) + 3} width={(CW[j] - 6) * k} height={RH[i] - 6} rx={12} fill={FILL[i]} stroke={g ? M.gold : M.ink} strokeWidth={g ? 7 : 4} />
            )
          )
        }),
      )}
      {[0, 1].map((i) => (
        <Pop key={`r${i}`} t={t} at={rows[i]} x={BX - 46} y={cellY(i) + RH[i] / 2}>
          <Title x={BX - 46} y={cellY(i) + RH[i] / 2} size={44} color={ROWC} stroke={M.white}>
            {i === 0 ? '20' : '3'}
          </Title>
        </Pop>
      ))}
      {[0, 1].map((j) => (
        <Pop key={`c${j}`} t={t} at={cols[j]} x={cellX(j) + CW[j] / 2} y={BY - 34}>
          <Title x={cellX(j) + CW[j] / 2} y={BY - 34} size={44} color={COLC} stroke={M.white}>
            {j === 0 ? '10' : '4'}
          </Title>
        </Pop>
      ))}
      {values?.map((row, i) =>
        row.map(
          (at, j) =>
            at !== undefined && (
              <Pop key={`v${i}${j}`} t={t} at={at} x={cellX(j) + CW[j] / 2} y={cellY(i) + RH[i] / 2} bounce={10}>
                <Title x={cellX(j) + CW[j] / 2} y={cellY(i) + RH[i] / 2} size={i === 0 && j === 0 ? 60 : 44} color={M.ink} stroke={M.white}>
                  {VALUES[i][j]}
                </Title>
              </Pop>
            ),
        ),
      )}
    </>
  )
}

/**
 * g5Multiplication/split — 23 × 14 at the top; 23 splits into 20 + 3 down the
 * side and 14 into 10 + 4 across the top; the rectangle draws and is cut into
 * four boxes; "area model" names it.
 */
const split: Scene = ({ t, cue }: SceneProps) => {
  const tw = cue('twenty-three is twenty')
  const three = cue('plus three')
  const ten = cue('ten plus four')
  const rect = cue('Draw a rectangle')
  const cut = cue('cut it into four boxes')
  const name = cue('area model')
  return (
    <>
      <Equation t={t} x={760} y={90} size={64} tokens={[{ text: '23', color: ROWC, at: 0.2 }, { text: '×', at: 0.35 }, { text: '14', color: COLC, at: 0.5 }]} />
      <Words t={t} at={tw} text="23 = 20 + 3" x={760} y={190} size={40} colors={[ROWC, undefined, ROWC, undefined, ROWC]} />
      <Words t={t} at={ten} text="14 = 10 + 4" x={760} y={250} size={40} colors={[COLC, undefined, COLC, undefined, COLC]} />
      <Model t={t} box={rect} rows={[tw + 0.4, three]} cols={[ten + 0.2, ten + 0.6]} />
      <Draw t={t} at={cut} d={`M ${BX + CW[0]} ${BY} V ${BY + RH[0] + RH[1]}`} width={6} />
      <Draw t={t} at={cut + 0.3} d={`M ${BX} ${BY + RH[0]} H ${BX + CW[0] + CW[1]}`} width={6} />
      <Words t={t} at={name} text="an area model" x={480} y={500} size={44} colors={[undefined, DEEP.leaf, DEEP.leaf]} />
      <Twinkle t={t} at={name + 0.3} x={BX + 185} y={BY + 140} r={200} n={5} />
    </>
  )
}

/** g5Multiplication/partials — each box gets its partial product on cue; a brace names them. */
const partials: Scene = ({ t, cue }: SceneProps) => {
  const ats = [cue('Twenty times ten'), cue('Twenty times four'), cue('Three times ten'), cue('Three times four')]
  const name = cue('partial products')
  const glow = ats.map((a, k) => (t >= a - 0.2 && t < a + 1 ? [Math.floor(k / 2), k % 2] : null)).filter((x): x is number[] => !!x)
  return (
    <>
      <Equation t={t} x={760} y={80} size={56} tokens={[{ text: '23', color: ROWC, at: 0 }, { text: '×', at: 0 }, { text: '14', color: COLC, at: 0 }]} />
      <Model t={t} box={0} rows={[0, 0]} cols={[0, 0]} values={[[ats[0] + 0.6, ats[1] + 0.6], [ats[2] + 0.6, ats[3] + 0.6]]} glow={glow} />
      {['20 × 10', '20 × 4', '3 × 10', '3 × 4'].map((s, k) => (
        <Fade key={k} t={t} at={ats[k]} out={ats[k] + 1.6}>
          <Title x={800} y={240} size={50} color={M.inkSoft} stroke={M.white}>
            {s}
          </Title>
        </Fade>
      ))}
      <VBrace t={t} at={name} x={BX + CW[0] + CW[1] + 26} y0={BY} y1={BY + RH[0] + RH[1]} dir="right" label="" color={M.gold} />
      <Words t={t} at={name} text="partial products" x={770} y={330} size={42} colors={[DEEP.gold, DEEP.gold]} />
    </>
  )
}

/** g5Multiplication/total — the four partial products fly down into one sum: 200 + 80 + 30 + 12 = 322. */
const total: Scene = ({ t, cue }: SceneProps) => {
  const adds = [cue('two hundred, plus'), cue('plus eighty'), cue('plus thirty'), cue('plus twelve')]
  const makes = cue('makes three hundred')
  const so = cue('So twenty-three')
  const toks = ['200', '+', '80', '+', '30', '+', '12', '=', '322']
  const xs = tokenXs(toks, 480, 56, 0.24)
  const fromXY: [number, number][] = [
    [cellX(0) + CW[0] / 2, cellY(0) + RH[0] / 2],
    [cellX(1) + CW[1] / 2, cellY(0) + RH[0] / 2],
    [cellX(0) + CW[0] / 2, cellY(1) + RH[1] / 2],
    [cellX(1) + CW[1] / 2, cellY(1) + RH[1] / 2],
  ]
  return (
    <>
      <T y={-40}>
        <Model t={t} box={0} rows={[0, 0]} cols={[0, 0]} values={[[0, 0], [0, 0]]} />
      </T>
      {fromXY.map(([fx, fy], k) => {
        const kk = ease.inOutCubic(progress(t, adds[k], 0.6))
        if (kk <= 0) return null
        const [x, y] = arc([fx, fy - 40], [xs[k * 2], 450], 60, kk)
        return (
          <Title key={k} x={x} y={y} size={56} color={M.ink} stroke={M.white}>
            {VALUES[Math.floor(k / 2)][k % 2]}
          </Title>
        )
      })}
      <Equation t={t} x={480} y={450} size={56} gap={0.24} tokens={toks.map((text, i) => ({ text, at: i % 2 === 1 ? adds[Math.min(3, (i + 1) / 2)] : i === 8 ? makes : 1e9, color: i === 8 ? M.ink : undefined }))} />
      <Ring t={t} at={makes + 0.2} x={xs[8]} y={450} r={52} color={M.gold} />
      <Burst t={t} at={makes + 0.1} x={xs[8]} y={450} color={M.gold} r={80} />
      <Equation t={t} x={790} y={110} size={52} tokens={[{ text: '23', color: ROWC, at: so }, { text: '×', at: so + 0.15 }, { text: '14', color: COLC, at: so + 0.3 }, { text: '=', at: so + 0.45 }, { text: '322', at: so + 0.6 }]} />
    </>
  )
}

/**
 * g5Multiplication/algorithm — the standard algorithm, stacked: 23 × 14, the
 * ones row 92, the tens row 230 (its zero glowing), the rows added to 322.
 */
const algorithm: Scene = ({ t, cue }: SceneProps) => {
  const ones = cue('multiply by the ones')
  const r1 = cue('is ninety-two')
  const tens = cue('multiply by the tens')
  const r2 = cue('is two hundred thirty')
  const add = cue('Add the two rows')
  const RX = 560
  const row = (y: number, text: string, at: number, color: string = M.ink) => (
    <Pop t={t} at={at} x={RX - 60} y={y}>
      <Title x={RX} y={y} size={62} color={color} stroke={M.white} anchor="end">
        {text}
      </Title>
    </Pop>
  )
  const hop = ease.outCubic(progress(t, ones, 0.5))
  return (
    <>
      {row(90, '23', 0.2, ROWC)}
      {row(160, '× 14', 0.4, COLC)}
      <Draw t={t} at={0.6} d={`M ${RX - 200} 196 H ${RX + 10}`} width={5} />
      {row(250, '92', r1)}
      {row(320, '230', r2)}
      <Draw t={t} at={add - 0.2} d={`M ${RX - 200} 356 H ${RX + 10}`} width={5} />
      {row(420, '322', add + 0.4)}
      {/* which digit we multiply by */}
      {hop > 0 && t < tens && <circle cx={RX - 19} cy={160} r={34} fill="none" stroke={M.gold} strokeWidth={6} />}
      <Ring t={t} at={tens} x={RX - 57} y={160} r={34} color={M.gold} out={add} />
      <Ring t={t} at={r2 + 0.3} x={RX - 17} y={320} r={30} color={DEEP.leaf} out={add} />
      <Fade t={t} at={ones} out={tens}>
        <Title x={780} y={250} size={42} color={M.inkSoft} stroke={M.white}>
          23 × 4 = 92
        </Title>
      </Fade>
      <Fade t={t} at={tens} out={add}>
        <Title x={780} y={320} size={42} color={M.inkSoft} stroke={M.white}>
          23 × 10 = 230
        </Title>
      </Fade>
      <Brace t={t} at={add} x0={RX - 170} x1={RX + 10} y={440} dir="down" label="same as the area model!" labelColor={DEEP.leaf} color={DEEP.leaf} labelSize={30} />
      <Twinkle t={t} at={add + 0.6} x={RX - 50} y={420} r={70} n={4} />
    </>
  )
}

/**
 * g5Multiplication/powers — a place-value strip: a 6 slides one place left
 * each time it is multiplied by ten (a zero fills in behind it); 10 × 10 × 10
 * collects into 10³ = 1,000; 6 × 10³ = 6,000.
 */
const powers: Scene = ({ t, cue }: SceneProps) => {
  const left = cue('one place to the left')
  const third = cue('Ten to the third power')
  const tttt = cue('ten times ten times ten')
  const thou = cue('which is one thousand')
  const six = cue('So six times')
  const PL = ['thousands', 'hundreds', 'tens', 'ones']
  const colX = (i: number) => 230 + i * 170
  // the 6 starts in the ones and moves left three times
  const shift = [0, 1, 2].reduce((s, k) => s + ease.inOutCubic(progress(t, left + 0.3 + k * 0.7, 0.5)), 0)
  return (
    <>
      {PL.map((p, i) => (
        <g key={p}>
          <rect x={colX(i) - 75} y={120} width={150} height={150} rx={16} fill={i === 3 - Math.round(shift) ? '#fff1c4' : M.white} stroke={M.ink} strokeWidth={4} />
          <Title x={colX(i)} y={100} size={26} color={M.inkSoft}>
            {p}
          </Title>
        </g>
      ))}
      <Title x={colX(3) - shift * 170} y={200} size={90} color={ROWC} stroke={M.white}>
        6
      </Title>
      {[1, 2, 3].map((z) =>
        shift >= z - 0.05 ? (
          <Title key={z} x={colX(3 - z + 1)} y={200} size={90} color={M.ink} stroke={M.white}>
            0
          </Title>
        ) : null,
      )}
      {[0, 1, 2].map((k) => (
        <Fade key={k} t={t} at={left + 0.3 + k * 0.7} out={left + 0.3 + k * 0.7 + 0.8}>
          <Title x={colX(3 - k) - 85} y={300} size={34} color={DEEP.leaf} stroke={M.white}>
            × 10
          </Title>
        </Fade>
      ))}
      <Equation t={t} x={480} y={390} size={54} tokens={[{ text: '10', at: tttt }, { text: '×', at: tttt + 0.2 }, { text: '10', at: tttt + 0.4 }, { text: '×', at: tttt + 0.6 }, { text: '10', at: tttt + 0.8 }, { text: '=', at: thou }, { text: '1,000', at: thou + 0.2 }]} />
      <Pop t={t} at={third} x={120} y={390}>
        <Title x={120} y={390} size={54} color={DEEP.lilac} stroke={M.white}>
          10³
        </Title>
      </Pop>
      <Equation t={t} x={480} y={480} size={54} tokens={[{ text: '6', color: ROWC, at: six }, { text: '×', at: six + 0.15 }, { text: '10³', color: DEEP.lilac, at: six + 0.3 }, { text: '=', at: six + 0.5 }, { text: '6,000', at: six + 0.7 }]} />
      <Ring t={t} at={six + 1} x={tokenXs(['6', '×', '10³', '=', '6,000'], 480, 54)[4]} y={480} r={66} color={M.gold} />
      {spring(t, six + 1) > 0.9 && <Twinkle t={t} at={six + 1.2} x={640} y={470} r={60} n={4} />}
    </>
  )
}

export const g5MultiplicationScenes: Record<string, Scene> = { split, partials, total, algorithm, powers }
