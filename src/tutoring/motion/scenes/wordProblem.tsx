/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, interpolate, progress, pulse, spring } from '../anim'
import { Burst, Camera, Draw, Fade, Kinetic, Paper } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { CRAYONS, Crayon, Fox, IndexCard, shade } from './_b3art'
import { FlyTag, Head, Loop, Marker, Scale, Sparkles, Tag, ThoughtBubble, Tick, Twinkle, Txt, Underline, ep, layoutText, popS, sketchRect, span, textW, type WBox } from './_b3kit'

// ── the story card ───────────────────────────────────────────────────────────
// "A box has 6 rows of 4 crayons. How many crayons are there in all?"
const CARD = { x: 50, y: 112, w: 440, h: 288 }
const TEXT_SIZE = 38
const WORDS = layoutText('A box has 6 rows\nof 4 crayons.\nHow many crayons\nare there in all?', { x: 84, y: 200, size: TEXT_SIZE, lh: 1.3 })
// word index → a narration phrase that starts on that word
const READ_PHRASES = ['A box has', 'box has', 'has six', 'six rows', 'rows of', 'of four', 'four crayons', 'crayons. How', 'How many', 'many crayons', 'crayons are', 'are there', 'there in', 'in all', 'all?']
const W_BOX = 1
const W_SIX = 3
const W_FOUR = 6
const W_CRAYONS = 7

/** The problem card with its words; `ink(i)` = 0..1 how "read" word i is. */
function StoryCard({ t, at, ink, badge }: { t: number; at: number; ink: (i: number) => number; badge?: (i: number) => { k: number; color: string } | null }) {
  const s = popS(t, at, 15)
  const rot = interpolate(t, [at, at + 0.8], [-7, -1.5], ease.outBack)
  return (
    <Scale s={s} x={CARD.x + CARD.w / 2} y={CARD.y + CARD.h / 2} rot={rot}>
      <IndexCard x={CARD.x} y={CARD.y} w={CARD.w} h={CARD.h} lines={4} />
      <Txt x={CARD.x + 30} y={CARD.y + 24} size={22} color={M.inkSoft} weight={600}>
        Word problem
      </Txt>
      {WORDS.map((b, i) => {
        const bd = badge?.(i)
        const k = ink(i)
        const color = bd && bd.k > 0 ? bd.color : M.ink
        const op = 0.3 + 0.7 * k
        if (!bd) {
          return (
            <Txt key={i} x={b.x} y={b.y} size={TEXT_SIZE} color={color} opacity={op}>
              {b.text}
            </Txt>
          )
        }
        const bump = 1 + 0.35 * Math.sin(Math.PI * Math.min(1, bd.k)) * (bd.k < 1 ? 1 : 0)
        return (
          <g key={i}>
            {bd.k > 0 && <circle cx={b.cx} cy={b.y} r={28 * Math.min(1, spring(bd.k, 0, { damping: 11 }))} fill={bd.color} opacity={0.32} />}
            <g transform={`translate(${b.cx} ${b.y}) scale(${bump}) translate(${-b.cx} ${-b.y})`}>
              <Txt x={b.x} y={b.y} size={TEXT_SIZE} color={color} opacity={op}>
                {b.text}
              </Txt>
            </g>
          </g>
        )
      })}
    </Scale>
  )
}

/** Card-space point → stage point (the card is tilted by `rot` degrees about its centre). */
function onCard(x: number, y: number, rot = -1.5): [number, number] {
  const cx = CARD.x + CARD.w / 2
  const cy = CARD.y + CARD.h / 2
  const a = (rot * Math.PI) / 180
  return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]
}

/** A soft reading cursor that glides from word to word as each is spoken. */
function ReadCursor({ t, words, times, until }: { t: number; words: WBox[]; times: number[]; until: number }) {
  if (t < times[0] - 0.15) return null
  let x = words[0].x
  let w = words[0].w
  let y = words[0].y
  for (let j = 1; j < words.length; j++) {
    const k = ep(t, times[j] - 0.06, 0.2, ease.inOutCubic)
    if (k <= 0) break
    x += (words[j].x - x) * k
    w += (words[j].w - w) * k
    y += (words[j].y - y) * k
  }
  return <Marker t={t} at={times[0] - 0.15} dur={0.2} x={x} y={y + 2} w={w} h={44} color={M.gold} opacity={0.5} out={until} />
}

// ── the crayon tray (6 rows of 4, one colour per row) ────────────────────────
const ROWS = 6
const COLS = 4
const CR_LEN = 56
const CR_W = 17
const CR_GAP = 7
const ROW_GAP = 25

/** A lidded crayon tray centred on (x, y); `crayonAt(r, c)` = when each crayon lands. */
function CrayonTray({ t, x, y, crayonAt, wiggle = 0 }: { t: number; x: number; y: number; crayonAt: (r: number, c: number) => number; wiggle?: number }) {
  const innerW = COLS * CR_LEN + (COLS - 1) * CR_GAP
  const innerH = ROWS * ROW_GAP
  const pad = 16
  const l = x - innerW / 2 - pad
  const top = y - innerH / 2 - pad
  const w = innerW + pad * 2
  const h = innerH + pad * 2
  return (
    <g>
      {/* hinged lid, open behind the tray */}
      <path d={`M ${l + 6} ${top + 4} L ${l + 26} ${top - 62} L ${l + w - 26} ${top - 62} L ${l + w - 6} ${top + 4} Z`} fill={M.leaf} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
      <text x={x} y={top - 30} fontFamily={M.font} fontWeight={700} fontSize={26} textAnchor="middle" dominantBaseline="central" fill={M.white} letterSpacing={3}>
        CRAYONS
      </text>
      <rect x={l} y={top} width={w} height={h} rx={14} fill={M.gold} stroke={M.ink} strokeWidth={4} />
      <rect x={l + 9} y={top + 9} width={w - 18} height={h - 18} rx={9} fill="#e9ae35" />
      {Array.from({ length: ROWS - 1 }, (_, r) => (
        <line key={r} x1={l + 14} x2={l + w - 14} y1={y - innerH / 2 + (r + 1) * ROW_GAP} y2={y - innerH / 2 + (r + 1) * ROW_GAP} stroke="#c98a1c" strokeWidth={3} strokeLinecap="round" opacity={0.55} />
      ))}
      {Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => {
          const at = crayonAt(r, c)
          const k = spring(t, at, { stiffness: 260, damping: 16 })
          if (k <= 0.001) return null
          const cx = x - innerW / 2 + CR_LEN / 2 + c * (CR_LEN + CR_GAP)
          const cy = y - innerH / 2 + ROW_GAP / 2 + r * ROW_GAP
          const drop = (1 - k) * -70
          const wig = wiggle * Math.sin(t * 3 + r * 0.9 + c * 1.7) * 2.5
          return (
            <g key={`${r}-${c}`} transform={`translate(0 ${drop})`} opacity={Math.min(1, k * 3)}>
              <Crayon x={cx} y={cy + CR_LEN / 2} w={CR_W} h={CR_LEN} color={CRAYONS[r]} rot={90 + wig} />
            </g>
          )
        }),
      )}
    </g>
  )
}

/** A numbered step heading ("1  Read it slowly") that springs in word by word. */
function StepHead({ t, at, n, text, x, y, color = M.coral }: { t: number; at: number; n: number; text: string; x: number; y: number; color?: string }) {
  const s = popS(t, at - 0.1, 11)
  return (
    <g>
      <Scale s={s} x={x} y={y}>
        <circle cx={x} cy={y} r={22} fill={color} stroke={M.ink} strokeWidth={3.5} />
        <Txt x={x} y={y + 1} size={26} anchor="middle" color={M.white}>
          {n}
        </Txt>
      </Scale>
      <Kinetic t={t} at={at} text={text} x={x + 36} y={y + 2} size={34} anchor="start" />
    </g>
  )
}

/**
 * wordProblem/read — "First, read the problem slowly: A box has six rows of
 * four crayons. How many crayons are there in all? Then picture the story in
 * your mind. See the box, and the crayons lined up inside it."
 * The camera leans in on the story card and a gold reading cursor glides word
 * by word as each is spoken (6 and 4 light up). Then it pulls back to the fox
 * reader, a thought bubble blooms and a pencil sketch starts forming; on "box"
 * the word flies out of the card and the real box pops in, on "crayons" the
 * crayons line up row by row.
 */
const read: Scene = ({ t, cue }: SceneProps) => {
  const readT = cue('read the problem slowly')
  const times = READ_PHRASES.map((p) => cue(p))
  const picture = cue('picture the story')
  const mind = cue('in your mind')
  const seeBox = cue('See the box')
  const crayons = cue('the crayons lined up')
  const lastWord = times[times.length - 1]
  const ink = (i: number) => ep(t, times[i] - 0.05, 0.25)
  const badge = (i: number) => {
    if (i === W_SIX) return { k: progress(t, times[i], 0.5), color: M.coral }
    if (i === W_FOUR) return { k: progress(t, times[i], 0.5), color: '#2f8fc4' }
    return null
  }
  const bubble = spring(t, picture + 0.05, { stiffness: 150, damping: 13 })
  const trayS = popS(t, seeBox + 0.05, 10)
  const tray = { x: 728, y: 300 }
  const crayonAt = (r: number, c: number) => crayons + 0.1 + r * 0.2 + c * 0.05
  const done = crayonAt(ROWS - 1, COLS - 1) + 0.5
  const boxWord = WORDS[W_BOX]
  const crWord = WORDS[W_CRAYONS]
  // the fox looks at the card while reading, then up at its daydream
  const lookUp = ep(t, picture - 0.2, 0.6, ease.inOutCubic)
  const blink = t > 3 ? Math.max(0, 1 - Math.abs(((t + 0.7) % 3.4) - 0.1) * 10) : 0
  const sketch = 1 - ep(t, seeBox, 0.3)
  const trayL = tray.x - 137
  const trayT = tray.y - 91
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: times[0] + 0.1, x: 292, y: 236, zoom: 1.26 },
          { at: lastWord + 0.6, x: 292, y: 236, zoom: 1.26 },
          { at: picture + 0.7, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <StepHead t={t} at={readT} n={1} text="Read it slowly" x={70} y={58} />
        {/* the reader */}
        <Scale s={popS(t, 0.4, 12)} x={150} y={540}>
          <Fox x={150} y={500} s={0.95} look={[0.2 + 0.7 * lookUp, -0.9 + 0.3 * lookUp]} tilt={-4 + 10 * lookUp} blink={blink} />
        </Scale>
        <StoryCard t={t} at={0.15} ink={ink} badge={badge} />
        <g transform={`rotate(-1.5 ${CARD.x + CARD.w / 2} ${CARD.y + CARD.h / 2})`}>
          <ReadCursor t={t} words={WORDS} times={times} until={lastWord + 0.7} />
          <Marker t={t} at={seeBox} x={boxWord.x} y={boxWord.y + 2} w={boxWord.w} color={M.gold} opacity={0.6} />
          <Marker t={t} at={crayons} x={crWord.x} y={crWord.y + 2} w={crWord.w} color={M.pink} opacity={0.55} />
          {/* the marked words redrawn above their markers */}
          {t > seeBox && (
            <Txt x={boxWord.x} y={boxWord.y} size={TEXT_SIZE}>
              {boxWord.text}
            </Txt>
          )}
          {t > crayons && (
            <Txt x={crWord.x} y={crWord.y} size={TEXT_SIZE}>
              {crWord.text}
            </Txt>
          )}
        </g>
        <Sparkles t={t} at={times[W_SIX] + 0.1} x={onCard(WORDS[W_SIX].cx, WORDS[W_SIX].y)[0]} y={onCard(WORDS[W_SIX].cx, WORDS[W_SIX].y)[1]} r={40} n={5} seed={1} size={9} />
        <Sparkles t={t} at={times[W_FOUR] + 0.1} x={onCard(WORDS[W_FOUR].cx, WORDS[W_FOUR].y)[0]} y={onCard(WORDS[W_FOUR].cx, WORDS[W_FOUR].y)[1]} r={40} n={5} seed={2} size={9} />

        {/* picture it */}
        <StepHead t={t} at={picture} n={2} text="Picture it" x={566} y={58} color={M.sea} />
        <ThoughtBubble cx={728} cy={292} w={420} h={360} dots={[[262, 462, 8], [344, 466, 12], [442, 452, 17]]} grow={bubble} />
        {/* the daydream starts as a pencil sketch… */}
        {sketch > 0.01 && (
          <g opacity={0.55 * sketch}>
            <Draw t={t} at={mind} dur={0.7} d={sketchRect(trayL, trayT, 274, 182, 3)} stroke={M.inkSoft} width={3} />
            <Draw t={t} at={mind + 0.45} dur={0.5} d={`M ${trayL + 8} ${trayT - 2} L ${trayL + 30} ${trayT - 60} L ${trayL + 246} ${trayT - 62} L ${trayL + 268} ${trayT}`} stroke={M.inkSoft} width={3} />
            {[0, 1, 2].map((i) => (
              <Draw key={i} t={t} at={mind + 0.7 + i * 0.15} dur={0.35} d={`M ${trayL + 30} ${trayT + 45 + i * 45} L ${trayL + 240} ${trayT + 47 + i * 45}`} stroke={M.inkSoft} width={3} />
            ))}
          </g>
        )}
        {/* …then becomes real */}
        <Scale s={trayS} x={tray.x} y={tray.y + 90}>
          <CrayonTray t={t} x={tray.x} y={tray.y} crayonAt={crayonAt} wiggle={t > done ? 1 : 0} />
        </Scale>
        <Burst t={t} at={seeBox + 0.05} x={tray.x} y={tray.y} color={M.gold} r={160} rays={12} />
        {Array.from({ length: ROWS }, (_, r) => (
          <Sparkles key={r} t={t} at={crayonAt(r, COLS - 1) + 0.1} x={tray.x + 150} y={tray.y - 62 + r * ROW_GAP} r={26} n={3} seed={r + 3} size={7} />
        ))}
        {/* the nouns fly out of the story and label the picture */}
        <FlyTag t={t} at={seeBox} dur={0.6} text="box" from={onCard(boxWord.cx, boxWord.y)} to={[tray.x - 92, tray.y + 128]} fromSize={TEXT_SIZE} toSize={26} color={M.gold} lift={90} />
        <FlyTag t={t} at={crayons} dur={0.6} text="crayons" from={onCard(crWord.cx, crWord.y)} to={[tray.x + 70, tray.y + 128]} fromSize={TEXT_SIZE} toSize={26} color={M.pink} lift={110} />
        <Twinkle t={t} at={done} x={tray.x + 172} y={tray.y - 140} r={12} phase={0} />
        <Twinkle t={t} at={done} x={tray.x - 170} y={tray.y + 60} r={10} phase={0.5} color={M.pink} />
        <Twinkle t={t} at={done} x={tray.x + 176} y={tray.y + 80} r={9} phase={0.25} color={M.sea} />
      </Camera>
    </>
  )
}

// ── operation tiles ──────────────────────────────────────────────────────────
const OPS = ['+', '−', '×', '÷']
const TILE = 82
const TILE_GAP = 18
const TILE_Y = 160
const tileX = (i: number) => 548 + TILE / 2 + i * (TILE + TILE_GAP)

/** A chunky operation key; `pick` 0..1 = chosen (gold, bigger), `dim` 0..1 = ruled out. */
function OpTile({ t, at, i, pick = 0, dim = 0 }: { t: number; at: number; i: number; pick?: number; dim?: number }) {
  const x = tileX(i)
  const y = TILE_Y
  const s = popS(t, at, 12) * (1 + 0.22 * pick - 0.12 * dim)
  const fill = pick > 0.5 ? M.gold : M.white
  return (
    <Scale s={s} x={x} y={y} opacity={1 - 0.6 * dim}>
      {pick > 0 && <circle cx={x} cy={y} r={TILE * 0.8} fill={M.gold} opacity={0.3 * Math.min(1, pick)} />}
      <rect x={x - TILE / 2} y={y - TILE / 2 + 6} width={TILE} height={TILE} rx={20} fill={M.ink} />
      <rect x={x - TILE / 2} y={y - TILE / 2} width={TILE} height={TILE} rx={20} fill={fill} stroke={M.ink} strokeWidth={4} />
      <Txt x={x} y={y + 1} size={60} anchor="middle" color={pick > 0.5 ? M.ink : M.inkSoft}>
        {OPS[i]}
      </Txt>
    </Scale>
  )
}

/** Six rows of four crayons pulled out of the box, each row on its own strip. */
const ARR = { x: 560, y: 262, len: 60, w: 19, gap: 8, rowGap: 36 }
const arrRowY = (r: number) => ARR.y + r * ARR.rowGap
const ARR_W = COLS * ARR.len + (COLS - 1) * ARR.gap

/**
 * A horizontal run of `n` crayons (tips right, centred on y) as two paths:
 * one outlined silhouette for all n bodies, one set of wrapper bands. Same toon
 * read as n detailed Crayon props at a fraction of the element count (B2.4).
 */
function CrayonRun({ x0, y, color, n = COLS, len = ARR.len, w = ARR.w, gap = ARR.gap }: { x0: number; y: number; color: string; n?: number; len?: number; w?: number; gap?: number }) {
  const tip = w * 0.85
  let bodies = ''
  let bands = ''
  for (let i = 0; i < n; i++) {
    const l = x0 + i * (len + gap)
    bodies += `M ${l} ${y - w / 2} L ${l + len - tip} ${y - w / 2} L ${l + len} ${y} L ${l + len - tip} ${y + w / 2} L ${l} ${y + w / 2} Z `
    bands += `M ${l + len - tip} ${y - w / 2 + 2} L ${l + len - tip} ${y + w / 2 - 2} `
  }
  return (
    <g>
      <path d={bodies} fill={color} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      <path d={bands} fill="none" stroke={shade(color, 0.3)} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}

function CrayonRows({ t, rowAt }: { t: number; rowAt: (r: number) => number }) {
  return (
    <g>
      {Array.from({ length: ROWS }, (_, r) => {
        const at = rowAt(r)
        const k = ep(t, at, 0.55, ease.outBack)
        if (k <= 0) return null
        const y = arrRowY(r)
        const slide = (1 - k) * 60
        return (
          <g key={r} transform={`translate(${slide} 0)`} opacity={Math.min(1, k * 2)}>
            <rect x={ARR.x - 12} y={y - 15} width={ARR_W + 24} height={30} rx={15} fill={CRAYONS[r]} opacity={0.22} />
            <CrayonRun x0={ARR.x} y={y} color={CRAYONS[r]} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * wordProblem/plan — "Next, find the question the problem is asking, and then
 * choose the right operation. When the story has equal groups, like rows that
 * are all the same size, that is a clue to multiply."
 * Close on the card: the question gets looped and its asking words underlined.
 * Pull back: four operation keys pop up and a ring hops between them, choosing.
 * The crayon rows slide in as equal groups, each tagged "4" and ticked "same
 * size"; on "multiply" the × key wins, the others fade, and the rule is typed.
 */
const plan: Scene = ({ t, cue }: SceneProps) => {
  const find = cue('find the question')
  const asking = cue('is asking')
  const choose = cue('choose the right operation')
  const equal = cue('equal groups')
  const same = cue('same size')
  const clue = cue('a clue')
  const multiply = cue('multiply')
  const allInk = () => 1
  const badge = (i: number) => (i === W_SIX ? { k: 1, color: M.coral } : i === W_FOUR ? { k: 1, color: '#2f8fc4' } : null)
  const qLine2 = WORDS.filter((b) => b.line === 2)
  const qLine3 = WORDS.filter((b) => b.line === 3)
  const end2 = qLine2[qLine2.length - 1]
  const end3 = qLine3[qLine3.length - 1]
  const qL = qLine2[0].x
  const qR = Math.max(end2.x + end2.w, end3.x + end3.w)
  const qcy = (qLine2[0].y + qLine3[0].y) / 2
  const howMany = span(WORDS, 8, 9)
  const inAll = span(WORDS, 13, 14)
  // the choosing ring hops + − × ÷ then fades; × wins at "multiply"
  const hop = [0, 1, 2, 3].map((i) => choose + 0.75 + i * 0.3)
  const ringOut = hop[3] + 0.5
  const ringX = interpolate(t, [hop[0], hop[1], hop[1] + 0.2, hop[2], hop[2] + 0.2, hop[3], hop[3] + 0.2], [tileX(0), tileX(0), tileX(1), tileX(1), tileX(2), tileX(2), tileX(3)], ease.inOutCubic)
  const pick = ep(t, multiply, 0.5, ease.outBack)
  const dim = ep(t, multiply, 0.5)
  const rowAt = (r: number) => equal + 0.1 + r * 0.16
  const lab = (r: number) => same - 0.1 + r * 0.14
  // one bounded celebratory pulse on the × tile — motion ends (B2.3)
  const breatheWin = ep(t, multiply + 1, 0.4) * (1 - ep(t, multiply + 2.4, 0.6))
  const breathe = 1 + 0.05 * Math.sin(Math.max(0, t - multiply - 1) * 3.14) * breatheWin
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: find + 0.5, x: 262, y: 248, zoom: 1.24 },
          { at: asking + 1.1, x: 262, y: 248, zoom: 1.24 },
          { at: choose + 0.6, x: 480, y: 270, zoom: 1 },
          { at: equal + 0.6, x: 600, y: 282, zoom: 1.06 },
          { at: multiply + 0.4, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <StepHead t={t} at={find - 0.1} n={3} text="Find the question" x={70} y={58} color={M.coral} />
        <StoryCard t={t} at={0.05} ink={allInk} badge={badge} />
        <g transform={`rotate(-1.5 ${CARD.x + CARD.w / 2} ${CARD.y + CARD.h / 2})`}>
          <Marker t={t} at={find + 0.1} dur={0.4} x={qL} y={qLine2[0].y + 2} w={end2.x + end2.w - qL} color={M.mint} opacity={0.6} />
          <Marker t={t} at={find + 0.4} dur={0.4} x={qLine3[0].x} y={qLine3[0].y + 2} w={end3.x + end3.w - qLine3[0].x} color={M.mint} opacity={0.6} />
          {t > find + 0.1 &&
            [...qLine2, ...qLine3].map((b) => (
              <Txt key={b.i} x={b.x} y={b.y} size={TEXT_SIZE}>
                {b.text}
              </Txt>
            ))}
          <Loop t={t} at={find + 0.55} dur={0.7} cx={(qL + qR) / 2} cy={qcy} rx={(qR - qL) / 2 + 34} ry={50} color={M.coral} width={5} seed={2} />
          <Underline t={t} at={asking} x={howMany.x} y={howMany.y + 25} w={howMany.w} color={M.coral} />
          <Underline t={t} at={asking + 0.35} x={inAll.x} y={inAll.y + 25} w={inAll.w} color={M.coral} />
        </g>
        <Scale s={popS(t, asking + 0.1, 10)} x={452} y={128} rot={14 * Math.sin(Math.max(0, t - asking) * 4) * Math.exp(-Math.max(0, t - asking) * 1.6)}>
          <circle cx={452} cy={128} r={30} fill={M.coral} stroke={M.ink} strokeWidth={4} />
          <Txt x={452} y={129} size={40} anchor="middle" color={M.white}>
            ?
          </Txt>
        </Scale>

        {/* choose the operation */}
        <StepHead t={t} at={choose} n={4} text="Choose the operation" x={548} y={58} color={M.sea} />
        {OPS.map((_, i) => (
          <OpTile key={i} t={t} at={choose + 0.15 + i * 0.1} i={i} pick={i === 2 ? pick : 0} dim={i === 2 ? 0 : dim} />
        ))}
        {t > hop[0] - 0.1 && t < ringOut + 0.35 && (
          <g opacity={1 - ep(t, ringOut, 0.3)}>
            <rect x={ringX - TILE / 2 - 9} y={TILE_Y - TILE / 2 - 9} width={TILE + 18} height={TILE + 24} rx={26} fill="none" stroke={M.coral} strokeWidth={5} strokeDasharray="10 8" />
            <Txt x={ringX} y={TILE_Y - 60} size={28} anchor="middle" color={M.coral}>
              ?
            </Txt>
          </g>
        )}

        {/* equal groups — held during "equal groups … same size", gone before the × wins */}
        <Fade t={t} at={equal} out={multiply}>
          <CrayonRows t={t} rowAt={rowAt} />
          {Array.from({ length: ROWS }, (_, r) => {
            const y = arrRowY(r)
            const x = ARR.x + ARR_W + 44
            return (
              <g key={r}>
                <Scale s={popS(t, lab(r), 12)} x={x} y={y}>
                  <circle cx={x} cy={y} r={16} fill={M.white} stroke={M.ink} strokeWidth={3} />
                  <Txt x={x} y={y + 1} size={22} anchor="middle" color="#2f8fc4">
                    4
                  </Txt>
                </Scale>
                <Tick t={t} at={lab(r) + 0.25} x={x + 42} y={y} s={0.75} color={M.leaf} width={6} />
              </g>
            )
          })}
          <Draw t={t} at={same + 0.05} dur={0.6} d={`M ${ARR.x + ARR_W + 16} ${arrRowY(0) - 26} L ${ARR.x + ARR_W + 16} ${arrRowY(ROWS - 1) + 26}`} stroke={M.inkSoft} width={3} dash="8 8" />
          <Txt x={ARR.x + ARR_W / 2} y={arrRowY(ROWS - 1) + 50} size={26} anchor="middle" color={M.inkSoft}>
            6 equal rows
          </Txt>
        </Fade>
        <g transform={`translate(${tileX(2)} ${TILE_Y}) scale(${breathe}) translate(${-tileX(2)} ${-TILE_Y})`}>
          <Burst t={t} at={multiply} x={tileX(2)} y={TILE_Y} color={M.gold} r={90} />
          <Sparkles t={t} at={multiply + 0.15} x={tileX(2)} y={TILE_Y} r={80} n={8} seed={4} />
          <Sparkles t={t} at={multiply + 1} x={tileX(2) + 46} y={TILE_Y - 46} r={22} n={2} seed={5} size={9} />
        </g>
        {/* the rule */}
        <Scale s={popS(t, clue - 0.1, 12)} x={150} y={470}>
          <Tag x={150} y={470} text="equal groups" size={26} color={M.mint} />
        </Scale>
        <Draw t={t} at={clue + 0.15} dur={0.3} d="M 250 470 L 316 470" stroke={M.ink} width={5} />
        {t > clue + 0.45 && <Head x={318} y={470} ang={0} size={16} width={5} />}
        <Scale s={popS(t, multiply, 10)} x={370} y={470}>
          <circle cx={370} cy={470} r={34} fill={M.gold} stroke={M.ink} strokeWidth={4} />
          <Txt x={370} y={472} size={50} anchor="middle">
            ×
          </Txt>
        </Scale>
        <Kinetic t={t} at={multiply + 0.25} text="multiply!" x={416} y={472} size={34} anchor="start" color={M.ink} />
      </Camera>
    </>
  )
}

// ── solve ────────────────────────────────────────────────────────────────────
const SENT = layoutText('A box has 6 rows of 4 crayons.', { x: 480, y: 118, size: 34, align: 'center' })
const S_SIX = 3
const S_FOUR = 6
const EQ_SIZE = 92
const EQ_Y = 300
const EQ_PARTS = ['6', '×', '4', '=', '24']
const EQ_GAP = 26
const EQ_W = EQ_PARTS.map((p) => textW(p, EQ_SIZE))
const EQ_X0 = 714 - (EQ_W.reduce((a, b) => a + b, 0) + EQ_GAP * 4) / 2
/** Centre x of equation part i. */
const eqX = (i: number) => EQ_X0 + EQ_W.slice(0, i).reduce((a, b) => a + b, 0) + EQ_GAP * i + EQ_W[i] / 2
const SROW = { x: 92, y: 214, len: 54, w: 18, gap: 8, rowGap: 46 }
const srowY = (r: number) => SROW.y + r * SROW.rowGap
const SROW_W = COLS * SROW.len + (COLS - 1) * SROW.gap
const COUNT_X = SROW.x + SROW_W + 50
const COUNT_WORDS = ['four, eight', 'eight,', 'twelve', 'sixteen', 'twenty,', 'twenty-four!']

/**
 * wordProblem/solve — "Now solve it. There are six rows, and each row has four
 * crayons, so we multiply six times four. Count by fours: four, eight, twelve,
 * sixteen, twenty, twenty-four! There are twenty-four crayons in all."
 * Concrete → pictorial → symbolic: the 6 and the 4 fly out of the story
 * sentence into an equation as the rows and a row are bracketed; × and = pop
 * in; then each row lights up as it is counted by fours (4, 8, … 24, hopping
 * +4 each time), and the 24 flies into the answer slot on "in all".
 */
const solve: Scene = ({ t, cue }: SceneProps) => {
  const six = cue('six rows')
  const four = cue('four crayons')
  const multiply = cue('multiply')
  const times = cue('six times four')
  const countBy = cue('Count by fours')
  const counts = COUNT_WORDS.map((w) => cue(w))
  const total = cue('twenty-four crayons')
  const inAll = cue('in all')
  const rowsAt = (r: number) => 0.35 + r * 0.09
  const lit = (r: number) => ep(t, counts[r] - 0.05, 0.3)
  const ans = ep(t, total + 0.55, 0.01)
  const sixW = SENT[S_SIX]
  const fourW = SENT[S_FOUR]
  const glow = t > inAll + 0.6 ? pulse(t, 1.8) : 0
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: six + 0.2, x: 450, y: 272, zoom: 1.05 },
          { at: multiply + 0.3, x: 510, y: 272, zoom: 1.05 },
          { at: countBy + 0.4, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <StepHead t={t} at={0.1} n={5} text="Solve it" x={70} y={52} color={M.leaf} />
        {/* the story sentence on a paper strip */}
        <Scale s={popS(t, 0.15, 14)} x={480} y={118}>
          <rect x={SENT[0].x - 30} y={86} width={SENT[SENT.length - 1].x + SENT[SENT.length - 1].w - SENT[0].x + 60} height={64} rx={14} fill={M.white} stroke={M.ink} strokeWidth={4} filter="url(#sq-shadow)" />
          <Marker t={t} at={six - 0.05} x={sixW.x} y={sixW.y + 2} w={sixW.w} h={42} color={M.coral} opacity={0.4} />
          <Marker t={t} at={four - 0.05} x={fourW.x} y={fourW.y + 2} w={fourW.w} h={42} color={M.sea} opacity={0.45} />
          {SENT.map((b) => (
            <Txt key={b.i} x={b.x} y={b.y} size={34} color={b.i === S_SIX ? M.coral : b.i === S_FOUR ? '#2f8fc4' : M.ink}>
              {b.text}
            </Txt>
          ))}
        </Scale>

        {/* the crayon rows */}
        {Array.from({ length: ROWS }, (_, r) => {
          const k = ep(t, rowsAt(r), 0.5, ease.outBack)
          if (k <= 0) return null
          const y = srowY(r)
          const L = lit(r)
          const hop = L > 0 && L < 1 ? -Math.sin(L * Math.PI) * 8 : 0
          return (
            <g key={r} transform={`translate(${(1 - k) * -50} ${hop})`} opacity={Math.min(1, k * 2)}>
              <rect x={SROW.x - 12} y={y - 17} width={SROW_W + 24} height={34} rx={17} fill={CRAYONS[r]} opacity={0.18 + 0.32 * L} stroke={L > 0.5 ? M.ink : 'none'} strokeWidth={L > 0.5 ? 2.5 : 0} />
              {Array.from({ length: COLS }, (_, c) => {
                // the first row's crayons hop one by one on "four crayons"
                const tick = r === 0 ? ep(t, four + 0.2 + c * 0.14, 0.25) : 0
                const jump = tick > 0 && tick < 1 ? -Math.sin(tick * Math.PI) * 10 : 0
                const wig = t > inAll + 0.6 ? Math.sin(t * 3 + r * 0.9 + c * 1.7) * 2 : 0
                return (
                  <g key={c} transform={`translate(0 ${jump})`}>
                    <Crayon x={SROW.x + SROW.len / 2 + c * (SROW.len + SROW.gap)} y={y + SROW.len / 2} w={SROW.w} h={SROW.len} color={CRAYONS[r]} rot={90 + wig} />
                  </g>
                )
              })}
            </g>
          )
        })}
        {/* 6 rows bracket (left) */}
        <Draw t={t} at={six + 0.05} dur={0.5} d={`M ${SROW.x - 26} ${srowY(0) - 14} Q ${SROW.x - 40} ${srowY(0) - 14} ${SROW.x - 40} ${srowY(0) + 6} L ${SROW.x - 40} ${srowY(5) - 6} Q ${SROW.x - 40} ${srowY(5) + 14} ${SROW.x - 26} ${srowY(5) + 14}`} stroke={M.coral} width={5} />
        <Scale s={popS(t, six + 0.3, 11)} x={SROW.x - 62} y={(srowY(0) + srowY(5)) / 2}>
          <circle cx={SROW.x - 62} cy={(srowY(0) + srowY(5)) / 2} r={21} fill={M.coral} stroke={M.ink} strokeWidth={3.5} />
          <Txt x={SROW.x - 62} y={(srowY(0) + srowY(5)) / 2 + 1} size={28} anchor="middle" color={M.white}>
            6
          </Txt>
        </Scale>
        {/* 4 in a row brace (top) */}
        <Draw t={t} at={four + 0.05} dur={0.5} d={`M ${SROW.x - 4} ${srowY(0) - 26} Q ${SROW.x - 4} ${srowY(0) - 38} ${SROW.x + 10} ${srowY(0) - 38} L ${SROW.x + SROW_W - 10} ${srowY(0) - 38} Q ${SROW.x + SROW_W + 4} ${srowY(0) - 38} ${SROW.x + SROW_W + 4} ${srowY(0) - 26}`} stroke="#2f8fc4" width={5} />
        <Scale s={popS(t, four + 0.3, 11)} x={SROW.x + SROW_W / 2} y={srowY(0) - 38}>
          <circle cx={SROW.x + SROW_W / 2} cy={srowY(0) - 38} r={19} fill={M.sea} stroke={M.ink} strokeWidth={3.5} />
          <Txt x={SROW.x + SROW_W / 2} y={srowY(0) - 37} size={26} anchor="middle" color={M.white}>
            4
          </Txt>
        </Scale>

        {/* the equation: numbers fly out of the sentence */}
        <FlyTag t={t} at={six + 0.1} dur={0.7} text="6" from={[sixW.cx, sixW.y]} to={[eqX(0), EQ_Y]} fromSize={34} toSize={EQ_SIZE} color={M.coral} ink={M.coral} lift={60} pill={false} />
        <FlyTag t={t} at={four + 0.1} dur={0.7} text="4" from={[fourW.cx, fourW.y]} to={[eqX(2), EQ_Y]} fromSize={34} toSize={EQ_SIZE} color={M.sea} ink="#2f8fc4" lift={60} pill={false} />
        <Scale s={popS(t, multiply + 0.05, 10)} x={eqX(1)} y={EQ_Y}>
          <Txt x={eqX(1)} y={EQ_Y + 2} size={EQ_SIZE} anchor="middle" stroke={M.white}>
            ×
          </Txt>
        </Scale>
        <Sparkles t={t} at={multiply + 0.1} x={eqX(1)} y={EQ_Y} r={56} n={6} seed={7} />
        <Scale s={popS(t, times + 0.6, 12)} x={eqX(3)} y={EQ_Y}>
          <Txt x={eqX(3)} y={EQ_Y + 2} size={EQ_SIZE} anchor="middle" stroke={M.white}>
            =
          </Txt>
        </Scale>
        {ans < 1 && (
          <Scale s={popS(t, times + 0.8, 12) * (1 - ep(t, total + 0.4, 0.2))} x={eqX(4)} y={EQ_Y}>
            <rect x={eqX(4) - EQ_W[4] / 2 - 8} y={EQ_Y - 54} width={EQ_W[4] + 16} height={108} rx={18} fill={M.white} stroke={M.inkSoft} strokeWidth={4} strokeDasharray="12 9" />
            <Txt x={eqX(4)} y={EQ_Y + 2} size={64} anchor="middle" color={M.inkSoft}>
              ?
            </Txt>
          </Scale>
        )}
        {/* count by fours: each row lights up with its running total */}
        {counts.map((ct, r) => {
          const y = srowY(r)
          const s = popS(t, ct - 0.05, 11)
          return (
            <g key={r}>
              {r > 0 && (
                <g opacity={ep(t, ct - 0.1, 0.2)}>
                  <Draw t={t} at={ct - 0.12} dur={0.3} d={`M ${COUNT_X + 26} ${srowY(r - 1) + 6} Q ${COUNT_X + 58} ${(srowY(r - 1) + y) / 2} ${COUNT_X + 26} ${y - 6}`} stroke={M.leaf} width={3.5} />
                  <Txt x={COUNT_X + 62} y={(srowY(r - 1) + y) / 2} size={20} color={M.leaf}>
                    +4
                  </Txt>
                </g>
              )}
              <Scale s={s} x={COUNT_X} y={y}>
                <circle cx={COUNT_X} cy={y} r={21} fill={r === 5 ? M.gold : M.white} stroke={M.ink} strokeWidth={3.5} />
                <Txt x={COUNT_X} y={y + 1} size={r === 5 ? 22 : 24} anchor="middle">
                  {(r + 1) * 4}
                </Txt>
              </Scale>
            </g>
          )
        })}
        <Fade t={t} at={countBy} out={total}>
          <Txt x={COUNT_X + 44} y={srowY(0) - 40} size={22} anchor="middle" color={M.leaf}>
            count by 4s
          </Txt>
        </Fade>
        {/* the answer lands */}
        <FlyTag t={t} at={total - 0.15} dur={0.7} text="24" from={[COUNT_X, srowY(5)]} to={[eqX(4), EQ_Y]} fromSize={22} toSize={EQ_SIZE} color={M.gold} ink={M.leaf} lift={120} pill={false} />
        <Burst t={t} at={total + 0.55} x={eqX(4)} y={EQ_Y} color={M.gold} r={95} />
        <Sparkles t={t} at={total + 0.6} x={eqX(4)} y={EQ_Y} r={80} n={8} seed={9} />
        <g opacity={0.35 * glow}>
          <ellipse cx={eqX(4)} cy={EQ_Y} rx={EQ_W[4] / 2 + 26} ry={64} fill={M.gold} />
        </g>
        <Underline t={t} at={inAll} x={eqX(4) - EQ_W[4] / 2} y={EQ_Y + 58} w={EQ_W[4]} color={M.leaf} width={6} />
        <Kinetic t={t} at={inAll + 0.15} text="24 crayons in all!" x={714} y={420} size={42} color={M.ink} />
        <Twinkle t={t} at={inAll + 0.8} x={eqX(4) + 60} y={EQ_Y - 56} r={12} />
        <Twinkle t={t} at={inAll + 0.8} x={eqX(0) - 44} y={EQ_Y + 50} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

export const wordProblemScenes: Record<string, Scene> = { read, plan, solve }
