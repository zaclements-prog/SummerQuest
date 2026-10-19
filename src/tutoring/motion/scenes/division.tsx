/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, clamp, ease, lerp, progress, pulse, spring, wobble } from '../anim'
import { Arrow, Burst, Camera, Chip, Equation, Fade, Flip, Paper, Pop, Ring, T, Title, Twinkle, Words } from '../kit'
import { tokenXs } from '../layout'
import { DEEP, M } from '../palette'
import { Cookie, Friend, Plate } from '../shapes'
import type { Scene, SceneProps } from '../types'

/*
 * Division colour code (whole lesson):
 *   each friend (and their share) has a colour: blue, pink, green shirts;
 *   the TOTAL (12) is ink, the NUMBER OF GROUPS (3 friends) is blue,
 *   the SHARE EACH GETS (4) is orange — same as "groups" and "in each" in
 *   Multiplication, because division undoes it.
 */
const SHIRT = ['#8ab8ff', M.pink, '#7fd36b']
const SHIRT_TINT = ['#e1ecff', '#fde4ef', '#e1f5d9']
const NGROUPS = DEEP.blue
const NEACH = DEEP.orange

// ── the shared table: a pile of 12 cookies, three friends with plates ─────────
const FX = [210, 480, 750]
const HEAD_Y = 326
const TABLE_Y = 404
const PLATE_Y = 448
const PILE_X = 480
const PILE_Y = 176
/** Pile slot of cookie i (a tidy 4 × 3 heap). */
const pileAt = (i: number): [number, number] => {
  const r = Math.floor(i / 4)
  const c = i % 4
  return [PILE_X + (c - 1.5) * 50 + (r % 2 ? 12 : -12), PILE_Y + (r - 1) * 40]
}
/** Plate slot k (0…3) of friend f. */
const plateAt = (f: number, k: number): [number, number] => [FX[f] + (k - 1.5) * 40, PLATE_Y - 16 - (k % 2) * 6]

/** Three friends sitting behind a wooden table, each with a plate. */
function Table({ t, tableAt = -1, friendsAt = -1, smile = () => 0.6, bounce = () => 0, look = 0 }: { t: number; tableAt?: number; friendsAt?: number; smile?: (f: number) => number; bounce?: (f: number) => number; look?: number }) {
  const rise = (1 - ease.outCubic(progress(t, tableAt, 0.6))) * 180
  return (
    <>
      {FX.map((x, f) => {
        // friends pop up from behind the table
        const up = spring(t, friendsAt + f * 0.18, { stiffness: 190, damping: 12 })
        if (up <= 0.001) return null
        return (
          <g key={f} transform={`translate(0 ${(1 - up) * 120 + bounce(f)})`}>
            <Friend x={x} y={HEAD_Y} r={42} color={SHIRT[f]} skin={f} smile={smile(f)} look={look} blink={t % 4.2 > 4.05 + f * 0.03} />
          </g>
        )
      })}
      <g transform={`translate(0 ${rise})`}>
        <rect x={24} y={TABLE_Y + 26} width={912} height={160} rx={18} fill="#d9a466" stroke={M.ink} strokeWidth={4} />
        <rect x={24} y={TABLE_Y} width={912} height={44} rx={18} fill="#f1cf98" stroke={M.ink} strokeWidth={4} />
        {FX.map((x, f) => (
          <Pop key={f} t={t} at={friendsAt + 0.1 + f * 0.18} x={x} y={PLATE_Y}>
            <Plate x={x} y={PLATE_Y} w={176} rim={SHIRT[f]} />
          </Pop>
        ))}
      </g>
    </>
  )
}

/**
 * division/share — "Division is sharing fairly. Twelve cookies shared with three
 * friends. How many does each friend get?"
 * "sharing fairly" types on; twelve cookies tumble into a heap (counted to 12);
 * three friends pop up with empty plates; question marks bob over the plates
 * and 12 ÷ 3 = ? appears.
 */
const share: Scene = ({ t, cue }: SceneProps) => {
  const fair = cue('sharing fairly')
  const twelve = cue('Twelve cookies')
  const shared = cue('shared with')
  const three = cue('three friends')
  const how = cue('How many')
  const each = cue('each friend get')
  // opener: a big ÷ spins in, then bows out as the cookies arrive
  const din = spring(t, 0.1, { stiffness: 170, damping: 11 })
  const dout = ease.inOutCubic(progress(t, twelve - 0.45, 0.45))
  return (
    <>
      <Paper />
      <T x={480} y={240} s={din * (1 - dout)} r={(1 - din) * -120 + dout * 90}>
        <circle r={110} fill={M.sky} />
        <Title x={0} y={8} size={220} color={DEEP.blue} stroke={M.white}>
          ÷
        </Title>
      </T>
      <Words t={t} at={fair - 0.2} text="sharing fairly" x={480} y={70} size={54} colors={[undefined, DEEP.pink]} out={how - 0.3} />
      {/* cookies tumble in */}
      {Array.from({ length: 12 }, (_, i) => {
        const at = twelve - 0.1 + i * 0.07
        const k = progress(t, at, 0.45)
        if (t < at) return null
        const [x, y] = pileAt(i)
        const sq = wobble(t, at + 0.45, { amp: 0.18, freq: 2.5, decay: 7 })
        return (
          <g key={i} transform={`translate(${x} ${y - 300 * (1 - ease.inQuad(k))}) scale(${1 + sq} ${1 - sq})`}>
            <Cookie x={0} y={0} r={23} rot={i * 47 + 200 * (1 - k)} />
          </g>
        )
      })}
      <Pop t={t} at={twelve + 0.9} x={PILE_X + 150} y={PILE_Y}>
        <circle cx={PILE_X + 150} cy={PILE_Y} r={32} fill={M.white} stroke={M.ink} strokeWidth={4} />
        <Title x={PILE_X + 150} y={PILE_Y + 2} size={34}>
          12
        </Title>
      </Pop>
      {/* three friends */}
      <Table t={t} tableAt={twelve + 0.6} friendsAt={three - 0.1} look={t > shared ? -0.2 : 0} smile={() => 0.5 + 0.3 * pulse(t, 2.5)} />
      {/* how many each? */}
      {FX.map((x, f) => {
        const s = spring(t, how + f * 0.15, { stiffness: 220, damping: 11 })
        if (s <= 0.001) return null
        const y = PLATE_Y - 30 + Math.sin(t * 3 + f) * 5
        return (
          <g key={f} transform={`translate(${x} ${y}) scale(${s})`}>
            <circle r={26} fill={M.white} stroke={M.ink} strokeWidth={3.5} />
            <Title x={0} y={2} size={36} color={NEACH}>
              ?
            </Title>
          </g>
        )
      })}
      <Equation
        t={t}
        x={480}
        y={70}
        size={64}
        gap={0.26}
        tokens={[
          { text: '12', at: how },
          { text: '÷', at: how + 0.15 },
          { text: '3', color: NGROUPS, at: how + 0.3 },
          { text: '=', at: each },
          { text: '?', color: NEACH, at: each + 0.15 },
        ]}
      />
    </>
  )
}

/**
 * division/answer — "Let's deal them out fairly: one for you, one for you, one
 * for you, and again, until they are all gone. Each of the three friends gets
 * four cookies. So twelve divided by three equals four."
 * The cookies are dealt round and round — one to each friend per round, the
 * first three on the words — until the heap is gone; each plate gets counted
 * (4, 4, 4) and 12 ÷ 3 = 4 builds on the words.
 */
const answer: Scene = ({ t, cue }: SceneProps) => {
  const one = [cue('one for you'), cue('one for you', 1), cue('one for you', 2)]
  const again = cue('and again')
  const gone = cue('all gone')
  const fourC = cue('four cookies')
  const so = cue('So twelve')
  const div = cue('divided by')
  const byThree = cue('by three')
  const eq = cue('equals four')
  const DUR = 0.55
  // when cookie i leaves the heap: the first three on the words, then faster
  const dealAt = (i: number) => (i < 3 ? one[i] - 0.15 : lerp(again - 0.1, gone + 0.45, (i - 3) / 8))
  const landed = (f: number) => {
    let n = 0
    for (let i = f; i < 12; i += 3) if (t >= dealAt(i) + DUR) n++
    return n
  }
  const xs = tokenXs(['12', '÷', '3', '=', '4'], 480, 70, 0.26)
  return (
    <>
      <Paper />
      <Camera t={t} keys={[{ at: 0, x: 480, y: 270, zoom: 1 }, { at: fourC + 0.3, x: 480, y: 372, zoom: 1.12 }, { at: so + 0.7, x: 480, y: 270, zoom: 1 }]}>
        <Words t={t} at={0.1} text="one for you…" x={480} y={70} size={46} out={so - 0.4} colors={[NEACH]} />
        <Table
          t={t}
          friendsAt={-1}
          look={-0.15}
          smile={(f) => 0.45 + 0.12 * landed(f) + (t > fourC ? 0.3 : 0)}
          bounce={(f) => {
            let b = 0
            for (let i = f; i < 12; i += 3) b += wobble(t, dealAt(i) + DUR, { amp: -10, freq: 2, decay: 7 })
            return b
          }}
        />
        {/* the cookies */}
        {Array.from({ length: 12 }, (_, i) => {
          const f = i % 3
          const k = ease.inOutCubic(progress(t, dealAt(i), DUR))
          const from = pileAt(11 - i) // deal from the top of the heap
          const to = plateAt(f, Math.floor(i / 3))
          const [x, y] = arc(from, to, 70, k)
          const rot = (11 - i) * 47 + k * 360
          const lift = k > 0 && k < 1 ? 1.12 : 1
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${lift})`}>
              <Cookie x={0} y={0} r={k > 0.5 ? 21 : 23} rot={rot} />
            </g>
          )
        })}
        {/* each plate: 4 */}
        {FX.map((x, f) => (
          <Pop key={f} t={t} at={fourC + f * 0.2} x={x + 98} y={PLATE_Y - 62}>
            <circle cx={x + 98} cy={PLATE_Y - 62} r={27} fill={M.white} stroke={NEACH} strokeWidth={4} />
            <Title x={x + 98} y={PLATE_Y - 60} size={34} color={NEACH}>
              4
            </Title>
          </Pop>
        ))}
        <Chip t={t} at={gone + 0.9} x={PILE_X} y={PILE_Y} text="all gone!" color={M.sky} out={so} />
        {/* 12 ÷ 3 = 4 */}
        <Equation
          t={t}
          x={480}
          y={92}
          size={70}
          gap={0.26}
          tokens={[
            { text: '12', at: so + 0.15 },
            { text: '÷', at: div },
            { text: '3', color: NGROUPS, at: byThree + 0.1 },
            { text: '=', at: eq },
            { text: '4', color: NEACH, at: eq + 0.3 },
          ]}
        />
        <Ring t={t} at={eq + 0.5} x={xs[4]} y={92} r={40} color={M.gold} />
        <Burst t={t} at={eq + 0.4} x={xs[4]} y={92} color={M.gold} r={80} />
        <Twinkle t={t} at={eq + 1} x={480} y={PLATE_Y - 30} r={330} n={6} />
        {/* check it: the three shares add back up to 12 */}
        <Fade t={t} at={eq + 1.1}>
          <Title x={480} y={196} size={30} color={M.inkSoft}>
            check: 4 + 4 + 4 = 12
          </Title>
        </Fade>
      </Camera>
    </>
  )
}

/**
 * division/inverse — "Division is the opposite of multiplication. Because three
 * times four is twelve, twelve divided by three is four. Use your times tables
 * backwards!"
 * × and ÷ swing like a see-saw; three rows of 4 cookies slide together into 12
 * as 3 × 4 = 12 builds; then the very same numbers hop down and rearrange into
 * 12 ÷ 3 = 4 while the 12 splits back into 3 rows of 4; a rewind arrow: times
 * tables backwards.
 */
const inverse: Scene = ({ t, cue }: SceneProps) => {
  const opp = cue('opposite of multiplication')
  const three = cue('three times')
  const times = cue('times four')
  const isT = cue('is twelve')
  const twelveD = cue('twelve divided')
  const div = cue('divided by')
  const byThree = cue('by three is')
  const isF = cue('is four')
  const back = cue('times tables backwards')
  // the cookie rows: apart → together (×) → apart again (÷)
  const join = ease.inOutCubic(progress(t, three, 0.8))
  const split = ease.inOutCubic(progress(t, twelveD, 0.8))
  const gapY = lerp(lerp(104, 62, join), 112, split)
  const ax = 255
  const ay = 300
  const ex = 690
  const l1 = 228
  const l2 = 364
  const size = 64
  const xs1 = tokenXs(['3', '×', '4', '=', '12'], ex, size, 0.26)
  const xs2 = tokenXs(['12', '÷', '3', '=', '4'], ex, size, 0.26)
  // see-saw for "opposite"
  const tilt = 14 * Math.sin(Math.PI * 2 * progress(t, opp, 1.6)) * (1 - progress(t, opp + 0.8, 0.8))
  // tokens that hop from line 1 to line 2
  const movers = [
    { text: '12', color: M.ink, from: 4, to: 0, at: twelveD },
    { text: '3', color: NGROUPS, from: 0, to: 2, at: byThree },
    { text: '=', color: M.ink, from: 3, to: 3, at: isF - 0.15 },
    { text: '4', color: NEACH, from: 2, to: 4, at: isF + 0.1 },
  ]
  return (
    <>
      <Paper />
      {/* × ⇄ ÷ */}
      <Pop t={t} at={0.15} x={480} y={74} bounce={12}>
        <g transform={`rotate(${tilt} 480 74)`}>
          <rect x={300} y={70} width={360} height={10} rx={5} fill={M.wood} stroke={M.ink} strokeWidth={3} />
          <rect x={286} y={20} width={84} height={56} rx={16} fill={M.mint} stroke={M.ink} strokeWidth={4} />
          <Title x={328} y={50} size={50}>
            ×
          </Title>
          <rect x={590} y={20} width={84} height={56} rx={16} fill={M.coral} stroke={M.ink} strokeWidth={4} />
          <Title x={632} y={50} size={50}>
            ÷
          </Title>
        </g>
        <path d="M 466 108 L 480 82 L 494 108 Z" fill={M.wood} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      </Pop>
      <Fade t={t} at={opp + 0.3} out={three}>
        <Title x={480} y={140} size={30} color={M.inkSoft}>
          opposites
        </Title>
      </Fade>

      {/* the cookies: 3 rows of 4 */}
      {[0, 1, 2].map((r) => {
        const y = ay + (r - 1) * gapY
        const trayO = 1 - join + split
        return (
          <g key={r}>
            <Pop t={t} at={0.3 + r * 0.12} x={ax} y={y}>
              <rect x={ax - 118} y={y - 34} width={236} height={68} rx={34} fill={SHIRT_TINT[r]} stroke={SHIRT[r]} strokeWidth={4} opacity={clamp(trayO)} />
              {[0, 1, 2, 3].map((c) => (
                <Cookie key={c} x={ax + (c - 1.5) * 54} y={y} r={22} rot={r * 90 + c * 40} />
              ))}
            </Pop>
            <Pop t={t} at={twelveD + 0.9 + r * 0.15} x={ax + 150} y={y}>
              <Title x={ax + 150} y={y + 2} size={34} color={NEACH} stroke={M.white}>
                4
              </Title>
            </Pop>
          </g>
        )
      })}
      <Fade t={t} at={isT} out={twelveD}>
        <rect x={ax - 128} y={ay - 62 * 1.5 - 18} width={256} height={62 * 3 + 36} rx={26} fill="none" stroke={M.gold} strokeWidth={6} />
        <Title x={ax} y={ay + 62 * 1.5 + 50} size={34} color={M.ink} stroke={M.white}>
          12 in all
        </Title>
      </Fade>
      <Burst t={t} at={isT + 0.1} x={ax} y={ay} color={M.gold} r={150} rays={12} />

      {/* line 1: 3 × 4 = 12 */}
      <Equation
        t={t}
        x={ex}
        y={l1}
        size={size}
        gap={0.26}
        tokens={[
          { text: '3', color: NGROUPS, at: three },
          { text: '×', at: times - 0.15 },
          { text: '4', color: NEACH, at: times + 0.2 },
          { text: '=', at: isT },
          { text: '12', at: isT + 0.15 },
        ]}
      />
      {/* line 2: the same numbers hop down into 12 ÷ 3 = 4 */}
      {movers.map((m, i) => {
        if (t < m.at) return null
        const k = ease.inOutCubic(progress(t, m.at, 0.65))
        const [x, y] = arc([xs1[m.from], l1], [xs2[m.to], l2], 40 + 30 * i, k)
        return (
          <Title key={i} x={x} y={y} size={size} color={m.color} stroke={M.white}>
            {m.text}
          </Title>
        )
      })}
      {t > div - 0.1 && <Flip t={t} at={div} x={xs2[1]} y={l2} from="×" to="÷" size={size} />}
      <Ring t={t} at={isF + 0.9} x={xs2[4]} y={l2} r={38} color={M.gold} />

      {/* backwards */}
      <Arrow t={t} at={back} from={[xs1[4] + 10, l1 + 46]} to={[xs1[0] - 10, l1 + 46]} bend={-0.12} color={DEEP.pink} width={6} dur={0.8} />
      <Words t={t} at={back} text="times tables backwards!" x={ex - 30} y={470} size={40} colors={[undefined, undefined, DEEP.pink]} />
      <Twinkle t={t} at={back + 1.2} x={ex} y={(l1 + l2) / 2} r={150} n={5} />
    </>
  )
}

export const divisionScenes: Record<string, Scene> = { share, answer, inverse }
