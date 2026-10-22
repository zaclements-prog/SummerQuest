/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, progress } from '../anim'
import { Brace, Burst, Chip, Equation, Fade, Pop, Ring, Title, Twinkle, Words } from '../kit'
import { tokenXs } from '../layout'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'

/*
 * 5th-grade Word Problem Woods (g5Expressions). Grouping symbols are lilac,
 * the step being done is gold-ringed, each step's result is green.
 */
const GRP = DEEP.lilac
const RES = DEEP.leaf

/** The order of operations as three stacked rungs (lit one at a time). */
function Ladder({ t, at, lit }: { t: number; at: number; lit: number }) {
  const rungs = ['( ) and [ ] first', '× and ÷ next', '+ and − last']
  return (
    <>
      {rungs.map((r, i) => (
        <Pop key={i} t={t} at={at + i * 0.25} x={780} y={140 + i * 70}>
          <rect x={650} y={112 + i * 70} width={260} height={56} rx={16} fill={lit === i ? '#fff1c4' : M.white} stroke={lit === i ? M.gold : M.ink} strokeWidth={lit === i ? 6 : 3} />
          <Title x={780} y={142 + i * 70} size={28} color={i === 0 ? GRP : M.ink}>
            {r}
          </Title>
        </Pop>
      ))}
    </>
  )
}

/** g5Expressions/order — the rules as a ladder; 3 + 4 × 5: 4 × 5 = 20 first, then 3 + 20 = 23. */
const order: Scene = ({ t, cue }: SceneProps) => {
  const grp = cue('grouping symbols first')
  const mul = cue('then multiply and divide')
  const add = cue('then add and subtract')
  const ex = cue('In three plus four')
  const twenty = cue('is twenty')
  const end = cue('is twenty-three')
  const xs = tokenXs(['3', '+', '4', '×', '5'], 300, 64)
  const lit = t >= add && t < ex ? 2 : t >= mul && t < add ? 1 : t >= grp && t < mul ? 0 : t >= twenty ? 1 : -1
  return (
    <>
      <Ladder t={t} at={grp - 0.3} lit={t >= end ? 2 : lit} />
      <Equation t={t} x={300} y={200} size={64} tokens={[{ text: '3', at: ex }, { text: '+', at: ex + 0.15 }, { text: '4', at: ex + 0.3 }, { text: '×', at: ex + 0.45 }, { text: '5', at: ex + 0.6 }]} />
      <Ring t={t} at={twenty - 0.6} x={(xs[2] + xs[4]) / 2} y={196} r={70} color={M.gold} out={end} />
      <Equation t={t} x={300} y={310} size={64} tokens={[{ text: '3', at: twenty }, { text: '+', at: twenty }, { text: '20', color: RES, at: twenty + 0.2 }]} />
      <Equation t={t} x={300} y={420} size={72} tokens={[{ text: '23', color: RES, at: end + 0.3 }]} />
      <Burst t={t} at={end + 0.4} x={300} y={420} color={M.gold} r={70} />
    </>
  )
}

/** g5Expressions/grouping — (3 + 4) × 5: the parentheses glow, 7 × 5 = 35; brackets wrap around parentheses. */
const grouping: Scene = ({ t, cue }: SceneProps) => {
  const put = cue('in parentheses')
  const first = cue('Now we add first')
  const seven = cue('seven times five')
  const br = cue('Brackets work')
  return (
    <>
      <Equation t={t} x={480} y={130} size={68} tokens={[{ text: '(', color: GRP, at: put }, { text: '3', at: 0.2 }, { text: '+', at: 0.3 }, { text: '4', at: 0.4 }, { text: ')', color: GRP, at: put }, { text: '×', at: 0.5 }, { text: '5', at: 0.6 }]} />
      <Ring t={t} at={first} x={tokenXs(['(', '3', '+', '4', ')', '×', '5'], 480, 68)[2]} y={126} r={86} color={M.gold} out={seven} />
      <Equation t={t} x={480} y={250} size={68} tokens={[{ text: '7', color: RES, at: first + 0.6 }, { text: '×', at: first + 0.7 }, { text: '5', at: first + 0.8 }]} />
      <Equation t={t} x={480} y={350} size={72} tokens={[{ text: '35', color: RES, at: seven + 0.6 }]} />
      <Burst t={t} at={seven + 0.7} x={480} y={350} color={M.gold} r={70} />
      <Fade t={t} at={br}>
        <Title x={480} y={460} size={52} color={M.ink} stroke={M.white}>
          <tspan fill={GRP}>[</tspan>2 × <tspan fill={GRP}>(</tspan>9 − 4<tspan fill={GRP}>)</tspan>
          <tspan fill={GRP}>]</tspan> + 7
        </Title>
      </Fade>
    </>
  )
}

/** g5Expressions/write — the words, then the expression built from them; a bar twice as long as 8 + 7. */
const write: Scene = ({ t, cue }: SceneProps) => {
  const words = cue('Add eight and seven')
  const first = cue('The adding happens first')
  const two = cue('we write two times')
  const twice = cue('twice as large')
  return (
    <>
      <Words t={t} at={words} text="add 8 and 7, then multiply by 2" x={480} y={90} size={40} colors={[undefined, DEEP.coral, undefined, DEEP.coral, undefined, DEEP.blue, undefined, DEEP.blue]} />
      <Equation t={t} x={480} y={220} size={72} tokens={[{ text: '2', color: DEEP.blue, at: two }, { text: '×', at: two + 0.2 }, { text: '(', color: GRP, at: first }, { text: '8', color: DEEP.coral, at: first + 0.2 }, { text: '+', at: first + 0.3 }, { text: '7', color: DEEP.coral, at: first + 0.4 }, { text: ')', color: GRP, at: first }]} />
      {[0, 1].map((k) => {
        const g = ease.outCubic(progress(t, twice + k * 0.3, 0.5))
        return g > 0 && <rect key={k} x={230 + k * 250} y={330} width={250 * g} height={56} rx={12} fill={k ? '#cdeccf' : '#ffe3a6'} stroke={M.ink} strokeWidth={3} />
      })}
      <Fade t={t} at={twice + 0.4}>
        <Title x={355} y={360} size={32} color={M.ink}>
          8 + 7
        </Title>
        <Title x={605} y={360} size={32} color={M.ink}>
          8 + 7
        </Title>
      </Fade>
      <Brace t={t} at={twice + 0.8} x0={230} x1={730} y={400} dir="down" label="twice as large" labelColor={RES} color={RES} labelSize={32} />
    </>
  )
}

/** g5Expressions/patterns — the two patterns grow term by term; arrows show × 2 between matching terms. */
const patterns: Scene = ({ t, cue }: SceneProps) => {
  const a = cue('Pattern A starts')
  const b = cue('Pattern B starts')
  const twice = cue('twice the matching term')
  const colX = (i: number) => 330 + i * 150
  return (
    <>
      <Title x={140} y={170} size={40} color={DEEP.coral} stroke={M.white}>
        A: +3
      </Title>
      <Title x={140} y={350} size={40} color={DEEP.blue} stroke={M.white}>
        B: +6
      </Title>
      {[0, 3, 6, 9].map((v, i) => (
        <Pop key={`a${i}`} t={t} at={a + 0.8 + i * 0.35} x={colX(i)} y={170}>
          <circle cx={colX(i)} cy={170} r={44} fill="#ffe3dc" stroke={DEEP.coral} strokeWidth={4} />
          <Title x={colX(i)} y={172} size={40} color={M.ink}>
            {v}
          </Title>
        </Pop>
      ))}
      {[0, 6, 12, 18].map((v, i) => (
        <Pop key={`b${i}`} t={t} at={b + 0.8 + i * 0.35} x={colX(i)} y={350}>
          <circle cx={colX(i)} cy={350} r={44} fill="#e1ecff" stroke={DEEP.blue} strokeWidth={4} />
          <Title x={colX(i)} y={352} size={40} color={M.ink}>
            {v}
          </Title>
        </Pop>
      ))}
      {[1, 2, 3].map((i) => (
        <Fade key={i} t={t} at={twice + i * 0.25}>
          <path d={`M ${colX(i)} 218 V 300`} stroke={RES} strokeWidth={5} strokeLinecap="round" />
          <path d={`M ${colX(i) - 10} 290 L ${colX(i)} 304 L ${colX(i) + 10} 290`} fill="none" stroke={RES} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <Title x={colX(i) + 40} y={262} size={28} color={RES} stroke={M.white}>
            × 2
          </Title>
        </Fade>
      ))}
      <Chip t={t} at={twice + 1} x={480} y={470} text="each B is 2 times its A" ink={RES} color={M.white} size={32} />
    </>
  )
}

/** g5Expressions/multiStep — six packs of 24 stack into 144, then 30 fly away: 6 × 24 − 30 = 114. */
const multiStep: Scene = ({ t, cue }: SceneProps) => {
  const buys = cue('buys six packs')
  const away = cue('gives thirty away')
  const mult = cue('First multiply')
  const sub = cue('Then subtract thirty')
  const left = cue('markers are left')
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <Pop key={i} t={t} at={buys + i * 0.12} x={150 + i * 75} y={160}>
          <rect x={120 + i * 75} y={110} width={60} height={100} rx={10} fill={M.set[i % M.set.length]} stroke={M.ink} strokeWidth={3} />
          <Title x={150 + i * 75} y={160} size={26} color={M.ink}>
            24
          </Title>
        </Pop>
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const k = ease.inOutCubic(progress(t, away + i * 0.1, 0.8))
        if (k <= 0) return null
        const [x, y] = arc([300, 160], [820 + i * 20, 90], 80, k)
        return <rect key={i} x={x - 6} y={y - 20} width={12} height={40} rx={5} fill={M.coral} stroke={M.ink} strokeWidth={2} opacity={1 - 0.6 * k} />
      })}
      <Equation t={t} x={480} y={320} size={60} tokens={[{ text: '6', at: mult }, { text: '×', at: mult + 0.1 }, { text: '24', at: mult + 0.2 }, { text: '=', at: mult + 0.4 }, { text: '144', color: RES, at: mult + 0.6 }]} />
      <Equation t={t} x={480} y={420} size={60} tokens={[{ text: '144', at: sub }, { text: '−', at: sub + 0.1 }, { text: '30', color: DEEP.coral, at: sub + 0.2 }, { text: '=', at: sub + 0.4 }, { text: '114', color: RES, at: left }]} />
      <Ring t={t} at={left + 0.2} x={tokenXs(['144', '−', '30', '=', '114'], 480, 60)[4]} y={420} r={58} color={M.gold} />
      <Twinkle t={t} at={left + 0.5} x={640} y={420} r={60} n={4} />
      <Words t={t} at={buys - 0.4} text="two steps, one story" x={480} y={500} size={34} out={mult} />
    </>
  )
}

export const g5ExpressionsScenes: Record<string, Scene> = { order, grouping, write, patterns, multiStep }
