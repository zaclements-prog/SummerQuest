/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import type { ReactNode } from 'react'
import { ease, progress, pulse, spring } from '../anim'
import { Arrow, Burst, Camera, Draw, Fade, Kinetic, Paper } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Book, Bug, Frog, IndexCard, Leaf, Magnifier, Pond } from './_b3art'
import { Cross, FlowArrow, FlyTag, Loop, Marker, MarkerRuns, Scale, Sparkles, ThoughtBubble, Tick, Twinkle, Txt, arc, ep, layoutText, popS, runs, textW, type WBox } from './_b3kit'

// ── the frog passage ─────────────────────────────────────────────────────────
// "Frogs are amphibians. They live near ponds and eat insects. They can jump very far."
const PASSAGE = 'Frogs are amphibians. They live near ponds and eat insects. They can jump very far.'
const S1: [number, number] = [0, 2]
const S2: [number, number] = [3, 9]
const S3: [number, number] = [10, 14]
const SUBJECTS = [0, 3, 10]
const SENT_COLORS = [M.mint, '#9fd3ff', M.lilac]
/** One sentence per line (wrapping inside), so every sentence's subject sits on the left margin. */
const PASSAGE_LINES = PASSAGE.replace(/\. /g, '.\n')

/** Passage words laid out on a page, with each word rising in line by line from `at`. */
function PassageText({ t, at, words, size, color = M.ink, bold = [] as number[] }: { t: number; at: number; words: WBox[]; size: number; color?: string; bold?: number[] }) {
  return (
    <>
      {words.map((b) => {
        const k = ep(t, at + b.line * 0.12 + b.i * 0.015, 0.45)
        if (k <= 0) return null
        return (
          <Txt key={b.i} x={b.x} y={b.y + (1 - k) * 12} size={size} weight={bold.includes(b.i) ? 700 : 600} color={color} opacity={k}>
            {b.text}
          </Txt>
        )
      })}
    </>
  )
}

/** The left-page picture: a pond, a reed or two, the frog and a buzzing bug. */
function FrogPage({ t, at, x, y, s = 1, hop = 0, bugAt, look = 0 }: { t: number; at: number; x: number; y: number; s?: number; hop?: number; bugAt?: number; look?: number }) {
  const blink = Math.max(0, 1 - Math.abs(((t + 0.3) % 3.1) - 0.1) * 10)
  const pop = popS(t, at, 11)
  const bugK = bugAt === undefined ? 1 : ep(t, bugAt, 0.4)
  const bx = x + 90 + Math.sin(t * 1.3) * 60
  const by = y - 140 + Math.sin(t * 2.6) * 22
  return (
    <>
      <Scale s={pop} x={x} y={y + 80}>
        <Pond x={x} y={y + 78} w={300} h={62} />
        {[-128, -112, 128].map((dx, i) => (
          <g key={i}>
            <path d={`M ${x + dx} ${y + 70} Q ${x + dx - 6} ${y + 10} ${x + dx + (i - 1) * 6} ${y - 30 + i * 12}`} fill="none" stroke={M.leaf} strokeWidth={6} strokeLinecap="round" />
            <ellipse cx={x + dx + (i - 1) * 6} cy={y - 30 + i * 12} rx={6} ry={16} fill={M.wood} stroke={M.ink} strokeWidth={2.5} />
          </g>
        ))}
        <Frog x={x - 10} y={y + 18 - hop * 40} s={s} blink={blink} look={look} crouch={Math.max(0, -hop) * 0} />
      </Scale>
      {bugK > 0 && (
        <g opacity={bugK}>
          <Bug x={bx} y={by} s={0.8} flap={t * 40} />
        </g>
      )}
    </>
  )
}

// ── mainidea ─────────────────────────────────────────────────────────────────
const MI_BOOK = { x: 480, y: 96, w: 820, h: 350 }
const MI_SIZE = 31
const MI_WORDS = layoutText(PASSAGE_LINES, { x: 518, y: 212, size: MI_SIZE, maxW: 356, lh: 1.55, weight: 600 })
const MI_FROG = { x: 270, y: 300 }

/**
 * reading/mainidea — "Good readers look for the main idea: what the whole
 * passage is mostly about. Read each sentence and ask, who or what is it about?
 * Frogs. Frogs. Frogs! So this passage is mostly about frogs."
 * A storybook opens. "Main idea" pins to the top; the whole passage gets
 * framed; each sentence is swept with a marker as it's "read"; then on each
 * spoken "Frogs" the sentence's subject is looped and an arrow flies from it to
 * the frog on the facing page — three arrows, one frog — and the main-idea
 * ribbon unfurls: "Mostly about: frogs!"
 */
const mainidea: Scene = ({ t, cue }: SceneProps) => {
  const main = cue('main idea')
  const whole = cue('whole passage')
  const mostly = cue('mostly about')
  const each = cue('Read each sentence')
  const who = cue('who or what')
  const frogs = [cue('Frogs.', 0), cue('Frogs.', 1), cue('Frogs!')]
  const so = cue('So this passage')
  const final = cue('about frogs')
  const bookS = popS(t, 0.1, 15)
  const first = MI_WORDS[0]
  const lastW = MI_WORDS[MI_WORDS.length - 1]
  const textL = first.x - 18
  const textT = first.y - 30
  const textR = Math.max(...MI_WORDS.map((b) => b.x + b.w)) + 18
  const textB = lastW.y + 30
  const happy = frogs.reduce((a, f) => a + Math.max(0, Math.sin(Math.PI * progress(t, f + 0.35, 0.45))), 0)
  const finalHop = Math.sin(Math.PI * progress(t, final, 0.6))
  const ribbon = ep(t, so + 0.2, 0.7, ease.outBack)
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: whole + 0.4, x: 630, y: 256, zoom: 1.16 },
          { at: who - 0.2, x: 630, y: 256, zoom: 1.16 },
          { at: frogs[0] + 0.3, x: 480, y: 276, zoom: 1 },
        ]}
      >
        <Scale s={bookS} x={480} y={300}>
          <Book x={MI_BOOK.x} y={MI_BOOK.y} w={MI_BOOK.w} h={MI_BOOK.h} cover={M.sea} />
          <Txt x={first.x} y={150} size={34} color={M.coral}>
            The Frog
          </Txt>
        </Scale>
        <FrogPage t={t} at={0.5} x={MI_FROG.x} y={MI_FROG.y} s={0.9} hop={0.25 * happy + 0.9 * finalHop} look={-0.6} />
        {/* frame the whole passage */}
        <Draw t={t} at={whole} dur={0.7} d={`M ${textL + 18} ${textT} L ${textR - 18} ${textT} Q ${textR} ${textT} ${textR} ${textT + 18} L ${textR} ${textB - 18} Q ${textR} ${textB} ${textR - 18} ${textB} L ${textL + 18} ${textB} Q ${textL} ${textB} ${textL} ${textB - 18} L ${textL} ${textT + 18} Q ${textL} ${textT} ${textL + 18} ${textT} Z`} stroke={M.sea} width={4} dash="12 9" />
        {/* read each sentence */}
        {[S1, S2, S3].map(([a, b], i) => (
          <MarkerRuns key={i} t={t} at={each + 0.15 + i * 0.6} boxes={MI_WORDS} a={a} b={b} dur={0.5} h={38} color={SENT_COLORS[i]} opacity={0.6} />
        ))}
        <PassageText t={t} at={0.45} words={MI_WORDS} size={MI_SIZE} bold={SUBJECTS} />
        {/* who or what? → the subjects, each one is frogs */}
        {SUBJECTS.map((wi, i) => {
          const b = MI_WORDS[wi]
          return <Loop key={wi} t={t} at={frogs[i] - 0.15} dur={0.45} cx={b.cx} cy={b.y + 1} rx={b.w / 2 + 9} ry={22} color={M.coral} width={4} seed={i + 1} />
        })}
        {/* three arrows, one frog ("They" = frogs rides on the arrow) */}
        {SUBJECTS.map((wi, i) => {
          const b = MI_WORDS[wi]
          const from: [number, number] = [b.x - 22, b.y + 2]
          const to: [number, number] = [MI_FROG.x + 84, MI_FROG.y - 34 + i * 30]
          const bend = 0.2 - i * 0.14
          const mx = (from[0] + to[0]) / 2 - (to[1] - from[1]) * bend
          const my = (from[1] + to[1]) / 2 + (to[0] - from[0]) * bend
          const lx = 0.25 * from[0] + 0.5 * mx + 0.25 * to[0]
          const ly = 0.25 * from[1] + 0.5 * my + 0.25 * to[1]
          return (
            <g key={wi}>
              <Arrow t={t} at={frogs[i] + 0.05} dur={0.45} from={from} to={to} bend={bend} color={M.coral} width={4.5} />
              {wi !== 0 && (
                <Scale s={popS(t, frogs[i] + 0.35, 12)} x={lx} y={ly}>
                  <rect x={lx - 50} y={ly - 17} width={100} height={34} rx={17} fill={M.coral} stroke={M.ink} strokeWidth={2.5} />
                  <Txt x={lx} y={ly + 1} size={21} anchor="middle" color={M.white}>
                    = frogs
                  </Txt>
                </Scale>
              )}
            </g>
          )
        })}
        {/* who or what? — a sticky note on the picture page */}
        <Scale s={popS(t, who - 0.05, 11)} x={170} y={156} rot={-4}>
          <rect x={92} y={124} width={156} height={66} rx={8} fill={M.gold} stroke={M.ink} strokeWidth={3} />
          <Txt x={170} y={146} size={21} anchor="middle">
            Who or what
          </Txt>
          <Txt x={170} y={170} size={21} anchor="middle">
            is it about?
          </Txt>
        </Scale>
        {/* the main idea header */}
        <Scale s={popS(t, main, 11)} x={352} y={50}>
          <rect x={250} y={28} width={204} height={46} rx={23} fill={M.gold} stroke={M.ink} strokeWidth={3.5} />
          <Txt x={352} y={52} size={28} anchor="middle">
            Main idea
          </Txt>
        </Scale>
        <Kinetic t={t} at={mostly} text="= what it's mostly about" x={468} y={53} size={27} anchor="start" color={M.inkSoft} />
        {/* mostly about: frogs! */}
        {ribbon > 0.01 && (
          <g transform={`translate(480 492) scale(${ribbon} 1) translate(-480 -492)`}>
            <path d="M 250 470 L 710 470 L 690 492 L 710 514 L 250 514 L 270 492 Z" fill={M.coral} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
            <rect x={280} y={462} width={400} height={60} rx={14} fill={M.gold} stroke={M.ink} strokeWidth={4} />
          </g>
        )}
        <Kinetic t={t} at={so + 0.45} text="Mostly about: frogs!" x={480} y={493} size={34} color={M.ink} stroke={M.gold} />
        <Burst t={t} at={final} x={MI_FROG.x} y={MI_FROG.y - 40} color={M.gold} r={110} />
        <Sparkles t={t} at={final + 0.1} x={480} y={490} r={240} n={10} seed={5} size={12} />
        <Twinkle t={t} at={final + 1} x={692} y={466} r={11} />
        <Twinkle t={t} at={final + 1} x={268} y={520} r={9} phase={0.4} color={M.pink} />
      </Camera>
    </>
  )
}

// ── supports (main idea = tabletop, details = legs) ──────────────────────────
const SU_WORDS = layoutText(PASSAGE, { x: 480, y: 44, size: 25, maxW: 820, lh: 1.32, weight: 600, align: 'center' })
const DETAILS: { a: number; b: number; label: string; color: string; x: number }[] = [
  { a: 4, b: 6, label: 'live near ponds', color: '#9fd3ff', x: 250 },
  { a: 8, b: 9, label: 'eat insects', color: M.mint, x: 480 },
  { a: 12, b: 14, label: 'jump very far', color: M.lilac, x: 710 },
]
const TOP_Y = 210
const TOP_H = 54
const FLOOR = 452
const LEG_W = 194
const WOOD = '#d9a066'
const WOOD_DARK = '#a8714a'

/** One table leg (a detail) growing up from the floor; `k` 0..1. */
function Leg({ x, k, color, glow = 0, children }: { x: number; k: number; color: string; glow?: number; children?: ReactNode }) {
  if (k <= 0.001) return null
  const top = TOP_Y + TOP_H
  const h = (FLOOR - top) * k
  return (
    <>
      {glow > 0 && <rect x={x - LEG_W / 2 - 10} y={FLOOR - h - 6} width={LEG_W + 20} height={h + 12} rx={22} fill={M.gold} opacity={0.45 * glow} />}
      <rect x={x - LEG_W / 2} y={FLOOR - h} width={LEG_W} height={h} rx={16} fill={color} stroke={M.ink} strokeWidth={4} />
      <rect x={x - LEG_W / 2 + 12} y={FLOOR - h + 10} width={12} height={Math.max(0, h - 30)} rx={6} fill="#fff" opacity={0.45} />
      <g opacity={k > 0.85 ? 1 : 0}>{children}</g>
    </>
  )
}

/**
 * reading/supports — "Think of the main idea as a tabletop. The details are the
 * legs that hold it up. Frogs live near ponds. Frogs eat insects. Frogs can
 * jump far. Each detail tells us more about frogs."
 * The main idea "Frogs!" pops as a chip and morphs into a wobbly tabletop with
 * a frog on it. Dashed leg outlines appear; then each detail is swept in the
 * passage, flies down, and grows into a leg (pond, bug, big jump) until the
 * table thunks steady. Arrows rise from every leg into the tabletop.
 */
const supports: Scene = ({ t, cue }: SceneProps) => {
  const main = cue('main idea')
  const top = cue('tabletop')
  const details = cue('The details')
  const holdUp = cue('hold it up')
  const dAt = [cue('live near ponds'), cue('eat insects'), cue('jump far')]
  const each = cue('Each detail')
  const more = cue('more about frogs')
  const legAt = dAt.map((d) => d + 0.55)
  const legK = legAt.map((a) => ep(t, a, 0.55, ease.outBack))
  const support = legK.reduce((s, k) => s + Math.min(1, k), 0) / 3
  const steady = legAt[2] + 0.55
  const thunk = Math.sin(Math.PI * progress(t, steady, 0.35)) * (t < steady + 0.35 ? 1 : 0)
  const morph = ep(t, top, 0.7, ease.inOutCubic)
  const chip = popS(t, main, 11)
  // it wobbles (harder on "hold it up") until all three legs are in
  const shake = 1 + 0.8 * ep(t, holdUp - 0.2, 0.4)
  const wob = (1 - support) * (t > top ? 1 : 0)
  const rot = Math.sin(t * 2.4) * 3.5 * wob * shake
  // "each detail tells us more": the legs push up together and the top lifts
  const push = Math.sin(Math.PI * progress(t, more, 0.55))
  const bob = Math.sin(t * 1.8) * 7 * wob + thunk * 6 - push * 12
  const plankW = 214 + (680 - 214) * morph
  const plankH = 64 + (TOP_H - 64) * morph
  const plankY = TOP_Y + (TOP_H - plankH) / 2
  const plankColor = morph < 0.5 ? M.gold : WOOD
  const happy = Math.sin(Math.PI * progress(t, more + 0.2, 0.6))
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: details + 0.3, x: 480, y: 274, zoom: 1.03 },
          { at: each, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {/* the passage, on a strip of paper */}
        <Scale s={popS(t, 0.1, 14)} x={480} y={60}>
          <rect x={44} y={14} width={872} height={92} rx={14} fill={M.white} stroke={M.ink} strokeWidth={4} filter="url(#sq-shadow)" />
          {DETAILS.map((d, i) => (
            <MarkerRuns key={i} t={t} at={dAt[i] - 0.05} boxes={SU_WORDS} a={d.a} b={d.b} dur={0.4} h={32} color={d.color} opacity={0.75} />
          ))}
          {SU_WORDS.map((b) => (
            <Txt key={b.i} x={b.x} y={b.y} size={25} weight={600}>
              {b.text}
            </Txt>
          ))}
        </Scale>
        {/* floor + shadow */}
        <ellipse cx={480} cy={FLOOR + 8} rx={380 * Math.min(1, 0.4 + support)} ry={14} fill={M.ink} opacity={0.1} />
        <Draw t={t} at={0.3} dur={0.6} d={`M 70 ${FLOOR + 2} L 890 ${FLOOR + 2}`} stroke={M.inkSoft} width={4} />
        {/* dashed leg outlines: where the details will go */}
        {DETAILS.map((d, i) => (
          <g key={i} opacity={ep(t, details + i * 0.15, 0.3) * (1 - ep(t, legAt[i], 0.2))}>
            <rect x={d.x - LEG_W / 2} y={TOP_Y + TOP_H + 4} width={LEG_W} height={FLOOR - TOP_Y - TOP_H - 4} rx={16} fill="none" stroke={M.inkSoft} strokeWidth={3.5} strokeDasharray="12 10" />
            <Txt x={d.x} y={(TOP_Y + TOP_H + FLOOR) / 2} size={40} anchor="middle" color={M.inkSoft} opacity={0.6}>
              ?
            </Txt>
          </g>
        ))}
        {/* the legs */}
        {DETAILS.map((d, i) => {
          const glow = Math.sin(Math.PI * progress(t, each + i * 0.25, 0.5))
          return (
            <Leg key={i} x={d.x} k={legK[i] * (1 + (push * 12) / (FLOOR - TOP_Y - TOP_H))} color={d.color} glow={Math.max(glow, push)}>
              {i === 0 && <Pond x={d.x} y={TOP_Y + TOP_H + 64} w={130} h={40} />}
              {i === 1 && <Bug x={d.x} y={TOP_Y + TOP_H + 66 + Math.sin(t * 3) * 6} s={1.5} flap={t * 40} />}
              {i === 2 && (
                <>
                  <path d={`M ${d.x - 60} ${TOP_Y + TOP_H + 92} Q ${d.x} ${TOP_Y + TOP_H + 10} ${d.x + 56} ${TOP_Y + TOP_H + 88}`} fill="none" stroke={M.ink} strokeWidth={3.5} strokeDasharray="7 8" strokeLinecap="round" />
                  <Frog x={d.x + 2} y={TOP_Y + TOP_H + 48 + Math.sin(t * 3) * 4} s={0.3} legs={0.8} />
                </>
              )}
            </Leg>
          )
        })}
        {/* the details fly down out of the passage into their legs */}
        {DETAILS.map((d, i) => {
          const r0 = runs(SU_WORDS, d.a, d.b)[0]
          const from: [number, number] = [r0.x + r0.w / 2, r0.y]
          return <FlyTag key={i} t={t} at={dAt[i] + 0.15} dur={0.65} text={d.label} from={from} to={[d.x, FLOOR - 56]} fromSize={25} toSize={23} color={M.white} lift={30} />
        })}
        {/* the tabletop: the main idea */}
        <g transform={`translate(0 ${bob}) rotate(${rot} 480 ${TOP_Y + TOP_H / 2})`}>
          <Scale s={chip} x={480} y={TOP_Y + TOP_H / 2}>
            <rect x={480 - plankW / 2} y={plankY + 7} width={plankW} height={plankH} rx={30 - 16 * morph} fill={M.ink} opacity={0.9} />
            <rect x={480 - plankW / 2} y={plankY} width={plankW} height={plankH} rx={30 - 16 * morph} fill={plankColor} stroke={M.ink} strokeWidth={4} />
            {morph > 0.5 && <path d={`M ${480 - plankW / 2 + 24} ${plankY + 14} L ${480 + plankW / 2 - 140} ${plankY + 14}`} stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.35} />}
            {morph > 0.5 && <path d={`M ${480 - plankW / 2 + 60} ${plankY + plankH - 14} q 40 -6 80 0 M ${480 + 120} ${plankY + plankH - 16} q 50 -5 90 0`} stroke={WOOD_DARK} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.6} />}
            <Txt x={480 - 6 * morph} y={TOP_Y + TOP_H / 2 + 2} size={36} anchor="middle" color={M.ink}>
              {morph > 0.5 ? 'Main idea: frogs!' : 'Frogs!'}
            </Txt>
          </Scale>
          {/* a frog sits on the table */}
          <Scale s={popS(t, top + 0.6, 11)} x={760} y={TOP_Y - 4}>
            <Frog x={760} y={TOP_Y - 29 - happy * 26} s={0.42} blink={Math.max(0, 1 - Math.abs(((t + 1.1) % 2.9) - 0.1) * 10)} look={-0.5} />
          </Scale>
        </g>
        {/* dust puffs as the table lands steady */}
        {[0, 1, 2].map((i) =>
          [-1, 1].map((sd) => {
            const k = progress(t, steady, 0.6)
            if (k <= 0 || k >= 1) return null
            return <circle key={`${i}${sd}`} cx={DETAILS[i].x + sd * (LEG_W / 2 + 6 + 30 * k)} cy={FLOOR - 6 - 10 * k} r={10 * (1 - k) + 2} fill={M.white} stroke={M.inkSoft} strokeWidth={2} opacity={1 - k} />
          }),
        )}
        <Burst t={t} at={more + 0.2} x={480} y={TOP_Y + TOP_H / 2 - 12} color={M.gold} r={140} rays={14} />
        <Kinetic t={t} at={each + 0.2} text="Details hold up the main idea" x={480} y={500} size={36} color={M.ink} />
        <Sparkles t={t} at={more + 0.5} x={480} y={TOP_Y + 20} r={260} n={10} seed={2} size={12} />
        <Twinkle t={t} at={more + 1.2} x={840} y={TOP_Y - 70} r={11} />
        <Twinkle t={t} at={more + 1.2} x={120} y={TOP_Y + 10} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

// ── detail (go back and find the exact words) ────────────────────────────────
const PAGE = { x: 372, y: 64, w: 556, h: 392 }
const DT_SIZE = 35
const DT_WORDS = layoutText('Frogs are amphibians.\nThey live near ponds\nand eat insects.\nThey can jump very far.', { x: 416, y: 196, size: DT_SIZE, lh: 1.6, weight: 600 })
const W_EAT = 8
const W_INSECTS = 9
const QCARD = { x: 36, y: 206, w: 300, h: 262 }
const Q_WORDS = layoutText('What do\nfrogs eat?', { x: 62, y: 300, size: 42, lh: 1.25 })
const Q_PHRASES = ['What do frogs', 'do frogs', 'frogs eat?', 'eat?']

/** A single storybook page (with a couple of pages peeking out behind it). */
function Page({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x + 12} y={y + 12} width={w} height={h} rx={18} fill="#f3ead8" stroke={M.ink} strokeWidth={3} />
      <rect x={x + 6} y={y + 6} width={w} height={h} rx={18} fill="#fbf5e8" stroke={M.ink} strokeWidth={3} />
      <rect x={x} y={y} width={w} height={h} rx={18} fill="#fffdf7" stroke={M.ink} strokeWidth={4} filter="url(#sq-shadow)" />
      <rect x={x} y={y} width={22} height={h} rx={11} fill={M.sea} opacity={0.35} />
    </>
  )
}

/**
 * reading/detail — "For a detail question, go back into the text and find the
 * exact words. Don't guess from memory! What do frogs eat? Find the clue word,
 * eat, in the passage. There it is: they eat insects."
 * A question card and the storybook page. An arrow sends us back into the text
 * and a magnifier scans it line by line; a memory bubble of guesses (fish?
 * leaves?) gets crossed out. The question is read, its clue word "eat" looped,
 * and a dashed line links it to the same word in the passage; then "eat
 * insects" is swept gold and "insects" flies into the answer slot.
 */
const detail: Scene = ({ t, cue }: SceneProps) => {
  const dq = cue('detail question')
  const goBack = cue('go back into the text')
  const exact = cue('find the exact words')
  const guess = cue('guess from memory')
  const memory = cue('from memory')
  const qTimes = Q_PHRASES.map((p) => cue(p))
  const clueWord = cue('clue word')
  const inPassage = cue('in the passage')
  const there = cue('There it is')
  const eatIns = cue('eat insects')
  const eatW = DT_WORDS[W_EAT]
  const insW = DT_WORDS[W_INSECTS]
  const qEat = Q_WORDS[3]
  // the magnifier: scans each line, then glides to the clue word
  const lines = Array.from(new Set(DT_WORDS.map((b) => b.line)))
  const scan = progress(t, exact, 1.7)
  const li = Math.min(lines.length - 1, Math.floor(scan * lines.length))
  const inLine = DT_WORDS.filter((b) => b.line === li)
  const lf = scan * lines.length - li
  const scanX = inLine[0].x + 20 + (inLine[inLine.length - 1].x + inLine[inLine.length - 1].w - inLine[0].x - 40) * ease.inOutSine(Math.min(1, lf))
  const scanY = inLine[0].y
  const toEat = ep(t, inPassage + 0.2, 0.7, ease.inOutCubic)
  const away = ep(t, eatIns - 0.3, 0.55, ease.inOutCubic)
  const parkX = PAGE.x + PAGE.w - 70
  const parkY = PAGE.y + PAGE.h - 66
  let mx = t < exact ? 640 : scanX
  let my = t < exact ? 120 : scanY
  if (t > exact + 1.7) {
    const k = ep(t, exact + 1.7, 0.6, ease.inOutCubic)
    mx = scanX + (parkX - scanX) * k
    my = scanY + (parkY - scanY) * k
  }
  mx += (eatW.cx - mx) * toEat
  my += (eatW.y - my) * toEat
  // …and steps aside once the answer is found, so the gold sweep reads clearly
  mx += (parkX - mx) * away
  my += (parkY - my) * away
  const linkFrom: [number, number] = [qEat.x + qEat.w + 14, qEat.y + 6]
  const linkTo: [number, number] = [eatW.cx - 2, eatW.y + 24]
  const linkC2: [number, number] = [eatW.cx - 60, eatW.y + 34]
  const magS = popS(t, goBack + 0.5, 12)
  const bubble = spring(t, guess - 0.1, { stiffness: 170, damping: 13 })
  const shake = t > memory && t < memory + 0.6 ? Math.sin((t - memory) * 40) * 5 * (1 - (t - memory) / 0.6) : 0
  const ansAt = eatIns + 0.45
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: exact + 0.2, x: 640, y: 262, zoom: 1.12 },
          { at: guess + 0.3, x: 300, y: 262, zoom: 1.1 },
          { at: clueWord + 0.4, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {/* the storybook page */}
        <Scale s={popS(t, 0.1, 15)} x={PAGE.x + PAGE.w / 2} y={PAGE.y + PAGE.h / 2}>
          <Page {...PAGE} />
          <Txt x={DT_WORDS[0].x} y={PAGE.y + 60} size={34} color={M.coral}>
            The Frog
          </Txt>
        </Scale>
        <MarkerRuns t={t} at={eatIns - 0.05} boxes={DT_WORDS} a={W_EAT} b={W_INSECTS} dur={0.45} h={44} color={M.gold} opacity={0.7} />
        {/* clue word → the same word in the text (drawn under the words) */}
        <FlowArrow t={t} at={inPassage} dur={0.6} d={`M ${linkFrom[0]} ${linkFrom[1]} C ${linkFrom[0] + 60} ${linkFrom[1] - 8} ${linkC2[0]} ${linkC2[1]} ${linkTo[0]} ${linkTo[1]}`} end={linkTo} endAng={Math.atan2(linkTo[1] - linkC2[1], linkTo[0] - linkC2[0])} color={M.coral} width={4.5} dash="3 11" />
        <PassageText t={t} at={0.35} words={DT_WORDS} size={DT_SIZE} />
        <Loop t={t} at={inPassage + 0.55} dur={0.45} cx={eatW.cx} cy={eatW.y + 1} rx={eatW.w / 2 + 12} ry={24} color={M.coral} width={4.5} seed={3} />
        <Sparkles t={t} at={there} x={eatW.cx} y={eatW.y} r={56} n={7} seed={6} />

        {/* the question card */}
        <Scale s={popS(t, 0.3, 14)} x={QCARD.x + QCARD.w / 2} y={QCARD.y + QCARD.h / 2} rot={-2}>
          <IndexCard x={QCARD.x} y={QCARD.y} w={QCARD.w} h={QCARD.h} lines={3} />
          <Marker t={t} at={dq} dur={0.35} x={QCARD.x + 26} y={QCARD.y + 24} w={textW('Detail question', 22, 600)} h={30} color={M.mint} opacity={0.8} />
          <Txt x={QCARD.x + 26} y={QCARD.y + 24} size={22} weight={600} color={M.inkSoft}>
            Detail question
          </Txt>
          {Q_WORDS.map((b, i) => {
            const k = ep(t, qTimes[i] - 0.05, 0.25)
            const isEat = i === 3
            const bump = isEat ? 1 + 0.25 * Math.sin(Math.PI * progress(t, clueWord, 0.4)) : 1
            return (
              <g key={i} transform={`translate(${b.cx} ${b.y}) scale(${bump}) translate(${-b.cx} ${-b.y})`}>
                <Txt x={b.x} y={b.y} size={42} color={isEat && t > clueWord ? M.coral : M.ink} opacity={0.45 + 0.55 * k}>
                  {b.text}
                </Txt>
              </g>
            )
          })}
          <Loop t={t} at={clueWord + 0.05} dur={0.45} cx={qEat.cx - 6} cy={qEat.y + 1} rx={qEat.w / 2 + 6} ry={28} color={M.coral} width={4.5} seed={1} />
          <Txt x={QCARD.x + 26} y={QCARD.y + QCARD.h - 36} size={24} weight={600} color={M.inkSoft}>
            Answer:
          </Txt>
          <line x1={QCARD.x + 124} y1={QCARD.y + QCARD.h - 22} x2={QCARD.x + QCARD.w - 24} y2={QCARD.y + QCARD.h - 22} stroke={M.inkSoft} strokeWidth={3} strokeLinecap="round" opacity={1 - ep(t, ansAt + 0.3, 0.3)} />
        </Scale>
        <Scale s={popS(t, clueWord + 0.35, 12) * (1 - ep(t, eatIns + 0.2, 0.3))} x={qEat.cx - 4} y={qEat.y + 46}>
          <rect x={qEat.cx - 65} y={qEat.y + 30} width={122} height={32} rx={16} fill={M.coral} stroke={M.ink} strokeWidth={2.5} />
          <Txt x={qEat.cx - 4} y={qEat.y + 47} size={20} anchor="middle" color={M.white}>
            clue word
          </Txt>
        </Scale>

        {/* go back into the text */}
        <Fade t={t} at={goBack - 0.45} out={guess - 0.3}>
          <Arrow t={t} at={goBack} dur={0.6} from={[260, 196]} to={[394, 132]} bend={-0.35} color={M.coral} width={6} />
        </Fade>
        <Fade t={t} at={goBack + 0.3} out={guess - 0.3}>
          <Txt x={238} y={150} size={26} anchor="middle" color={M.coral} stroke={M.paper}>
            go back!
          </Txt>
        </Fade>

        {/* don't guess from memory */}
        <g transform={`translate(${shake} 0)`} opacity={1 - 0.55 * ep(t, memory + 0.6, 0.4)}>
          <ThoughtBubble cx={190} cy={104} w={290} h={150} dots={[[286, 200, 6], [270, 186, 9]]} grow={bubble} />
          {bubble > 0.5 && (
            <>
              <Scale s={popS(t, guess + 0.1, 12)} x={136} y={104}>
                <path d="M 102 104 Q 130 76 166 104 Q 130 132 102 104 Z" fill={M.sea} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
                <path d="M 166 104 L 184 88 L 184 120 Z" fill={M.sea} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
                <circle cx={118} cy={100} r={4} fill={M.ink} />
              </Scale>
              <Scale s={popS(t, guess + 0.3, 12)} x={232} y={104}>
                <Leaf x={204} y={112} len={58} ang={-24} />
              </Scale>
              <Txt x={186} y={146} size={24} anchor="middle" color={M.inkSoft}>
                ? ?
              </Txt>
            </>
          )}
          <Cross t={t} at={memory} x={136} y={104} s={1.1} />
          <Cross t={t} at={memory + 0.2} x={232} y={100} s={1.1} />
        </g>

        {/* the magnifier */}
        <Scale s={magS} x={mx} y={my}>
          <Magnifier x={mx} y={my} r={40} rot={35} />
        </Scale>

        {/* the answer lands on the card */}
        <FlyTag t={t} at={eatIns + 0.1} dur={0.65} text="insects" from={[insW.cx, insW.y]} to={[QCARD.x + 214, QCARD.y + QCARD.h - 38]} fromSize={DT_SIZE} toSize={28} color={M.gold} lift={60} />
        <Tick t={t} at={ansAt + 0.35} x={QCARD.x + QCARD.w + 6} y={QCARD.y + QCARD.h - 40} s={1.1} color={M.leaf} width={7} />
        <Sparkles t={t} at={ansAt + 0.3} x={QCARD.x + 214} y={QCARD.y + QCARD.h - 38} r={70} n={8} seed={8} />
        <g opacity={ep(t, ansAt + 0.6, 0.4)}>
          <Bug x={QCARD.x + 240 + Math.sin(t * 1.7) * 40} y={QCARD.y + QCARD.h + 44 + Math.sin(t * 3.1) * 10} s={0.9} flap={t * 40} />
        </g>
        <Twinkle t={t} at={ansAt + 1.2} x={eatW.cx + 90} y={eatW.y - 40} r={10} />
      </Camera>
    </>
  )
}

// ── infer (clue + what I know = inference) ───────────────────────────────────
const IN_PAGE = { x: 456, y: 18, w: 478, h: 198 }
const IN_WORDS = layoutText(PASSAGE_LINES, { x: 486, y: 92, size: 24, maxW: 430, lh: 1.42, weight: 600 })
const IN_JUMP: [number, number] = [12, 14]
const PAD_A: [number, number] = [104, 424]
const PAD_B: [number, number] = [352, 424]
const FROG_S = 0.62
const BOX_X = 456
const BOX_W = 478
const BOX_TAB = 136
const BOXES = [
  { y: 236, h: 62, tab: 'Clue', color: M.mint },
  { y: 336, h: 62, tab: 'I know', color: '#9fd3ff' },
  { y: 436, h: 70, tab: 'Inference', color: M.gold },
]

/** A labelled box of the inference "equation" that slides in from the right. */
function InfBox({ t, at, i, glow = 0 }: { t: number; at: number; i: number; glow?: number }) {
  const b = BOXES[i]
  const k = ep(t, at, 0.6, ease.outBack)
  if (k <= 0) return null
  const dx = (1 - k) * 120
  return (
    <g transform={`translate(${dx} 0)`} opacity={Math.min(1, k * 2)}>
      {glow > 0 && <rect x={BOX_X - 10} y={b.y - 10} width={BOX_W + 20} height={b.h + 20} rx={24} fill={M.gold} opacity={0.4 * glow} />}
      <rect x={BOX_X} y={b.y + 5} width={BOX_W} height={b.h} rx={18} fill={M.ink} />
      <rect x={BOX_X} y={b.y} width={BOX_W} height={b.h} rx={18} fill={M.white} stroke={M.ink} strokeWidth={4} />
      <path d={`M ${BOX_X + 18} ${b.y} L ${BOX_X + BOX_TAB} ${b.y} L ${BOX_X + BOX_TAB} ${b.y + b.h} L ${BOX_X + 18} ${b.y + b.h} Q ${BOX_X} ${b.y + b.h} ${BOX_X} ${b.y + b.h - 18} L ${BOX_X} ${b.y + 18} Q ${BOX_X} ${b.y} ${BOX_X + 18} ${b.y} Z`} fill={b.color} stroke={M.ink} strokeWidth={4} />
      <Txt x={BOX_X + BOX_TAB / 2} y={b.y + b.h / 2 + 1} size={i === 2 ? 22 : 24} anchor="middle">
        {b.tab}
      </Txt>
    </g>
  )
}

/**
 * reading/infer — "Sometimes the answer is not written down, so you use clues.
 * The text says frogs can jump very far. What do you know about jumping far? It
 * takes strong legs! Clues plus what you know make an inference."
 * Asked "Are a frog's legs strong?", the magnifier searches the page and a
 * NOT IN THE TEXT stamp slams down. Then the clue is swept ("They can jump very
 * far") while the frog makes a huge leap across the pond, and the clue flies
 * into a box; "I know" adds big jumps need strong legs; the frog's legs glow;
 * and Clue + I know = Inference snaps together: frogs have strong legs!
 */
const infer: Scene = ({ t, cue }: SceneProps) => {
  const notWritten = cue('not written down')
  const useClues = cue('use clues')
  const textSays = cue('The text says')
  const jumpFar = cue('jump very far')
  const know = cue('What do you know')
  const aboutJ = cue('about jumping far')
  const strong = cue('strong legs')
  const plus = cue('plus')
  const make = cue('make an')
  const inference = cue('inference')
  // magnifier search for "legs" (it isn't there)
  const search = progress(t, 0.9, 1.6)
  const lines = Array.from(new Set(IN_WORDS.map((b) => b.line)))
  const li = Math.min(lines.length - 1, Math.floor(search * lines.length))
  const ln = IN_WORDS.filter((b) => b.line === li)
  const lf = search * lines.length - li
  const magX = ln[0].x + 10 + (ln[ln.length - 1].x + ln[ln.length - 1].w - ln[0].x - 20) * ease.inOutSine(Math.min(1, lf))
  const magY = ln[0].y
  const magOut = ep(t, useClues, 0.4)
  const stamp = ep(t, notWritten + 0.7, 0.25, ease.outCubic)
  const stampOut = ep(t, textSays - 0.2, 0.4)
  // the frog's big leap
  const launch = jumpFar - 0.35
  const crouch = Math.sin(Math.PI * progress(t, launch - 0.3, 0.3)) + Math.sin(Math.PI * progress(t, launch + 1.0, 0.3)) * 0.7
  const fly = ease.inOutSine(progress(t, launch, 1.0))
  const airborne = fly > 0 && fly < 1
  const frogBase: [number, number] = [0, -(66 * FROG_S) + 6]
  const [fx, fy] = arc(fly, [PAD_A[0], PAD_A[1] + frogBase[1]], [PAD_B[0], PAD_B[1] + frogBase[1]], 230)
  const legs = airborne ? Math.pow(Math.sin(Math.PI * fly), 0.6) : 0
  const tilt = airborne ? -18 + 36 * fly : 0
  const glowLegs = t > strong ? 0.6 + 0.4 * pulse(t - strong, 1.2) : 0
  const blink = Math.max(0, 1 - Math.abs(((t + 0.6) % 3.3) - 0.1) * 10)
  const jw = runs(IN_WORDS, IN_JUMP[0], IN_JUMP[1])[0]
  const box3Glow = t > inference + 0.5 ? pulse(t - inference, 1.8) : 0
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: textSays + 0.6, x: 480, y: 274, zoom: 1.02 },
          { at: plus, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {/* the question */}
        <Scale s={popS(t, 0.2, 13)} x={228} y={62}>
          <rect x={26} y={26} width={404} height={72} rx={16} fill={M.white} stroke={M.ink} strokeWidth={4} filter="url(#sq-shadow)" />
          <Txt x={228} y={63} size={29} anchor="middle">
            Are a frog’s legs strong?
          </Txt>
        </Scale>
        <Tick t={t} at={inference + 0.6} x={408} y={44} s={1.1} color={M.leaf} width={7} />

        {/* the pond and the big jump */}
        <Scale s={popS(t, 0.4, 13)} x={220} y={470}>
          <path d="M -20 420 Q 40 408 100 420 T 220 420 T 340 420 Q 412 426 432 468 Q 446 510 436 560 L -20 560 Z" fill={M.sea} stroke={M.ink} strokeWidth={4} />
          <path d="M 40 470 q 20 -8 40 0 M 260 492 q 20 -8 40 0 M 150 512 q 18 -7 36 0" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.6} />
          {[PAD_A, PAD_B].map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y + 4} rx={66} ry={17} fill={M.leaf} stroke={M.ink} strokeWidth={4} />
              <path d={`M ${x} ${y + 4} L ${x + 30} ${y - 8}`} stroke={M.ink} strokeWidth={3.5} />
            </g>
          ))}
        </Scale>
        <Draw t={t} at={launch} dur={1.0} d={`M ${PAD_A[0]} ${PAD_A[1] - 30} Q ${(PAD_A[0] + PAD_B[0]) / 2} ${PAD_A[1] - 30 - 460} ${PAD_B[0]} ${PAD_B[1] - 30}`} stroke={M.inkSoft} width={4} dash="4 12" easing={ease.inOutSine} />
        <Scale s={popS(t, launch + 0.55, 12)} x={(PAD_A[0] + PAD_B[0]) / 2} y={154}>
          <rect x={(PAD_A[0] + PAD_B[0]) / 2 - 70} y={136} width={140} height={38} rx={19} fill={M.lilac} stroke={M.ink} strokeWidth={3} />
          <Txt x={(PAD_A[0] + PAD_B[0]) / 2} y={156} size={24} anchor="middle">
            very far!
          </Txt>
        </Scale>
        <Scale s={popS(t, 0.55, 12)} x={PAD_A[0]} y={PAD_A[1]}>
          <g transform={`rotate(${tilt} ${fx} ${fy})`}>
            <Frog x={fx} y={fy} s={FROG_S} crouch={Math.max(0, crouch)} legs={legs} glowLegs={glowLegs} blink={airborne ? 0 : blink} look={0.5} />
          </g>
        </Scale>
        {/* strong legs! */}
        {[0, 1, 2].map((i) => {
          const k = progress(t, strong + 0.1 + i * 0.12, 0.5)
          if (k <= 0 || k >= 1) return null
          const a = -0.4 - i * 0.5
          return <line key={i} x1={PAD_B[0] + 50 + Math.cos(a) * (30 + 30 * k)} y1={PAD_B[1] - 20 + Math.sin(a) * (30 + 30 * k)} x2={PAD_B[0] + 50 + Math.cos(a) * (50 + 30 * k)} y2={PAD_B[1] - 20 + Math.sin(a) * (50 + 30 * k)} stroke={M.gold} strokeWidth={6} strokeLinecap="round" opacity={1 - k} />
        })}
        <Scale s={popS(t, strong + 0.15, 11)} x={PAD_B[0] - 6} y={290}>
          <rect x={PAD_B[0] - 92} y={270} width={172} height={42} rx={21} fill={M.gold} stroke={M.ink} strokeWidth={3} />
          <Txt x={PAD_B[0] - 6} y={292} size={26} anchor="middle">
            strong legs!
          </Txt>
        </Scale>

        {/* the page */}
        <Scale s={popS(t, 0.1, 15)} x={IN_PAGE.x + IN_PAGE.w / 2} y={IN_PAGE.y + IN_PAGE.h / 2}>
          <Page {...IN_PAGE} />
          <Txt x={IN_WORDS[0].x} y={IN_PAGE.y + 36} size={26} color={M.coral}>
            The Frog
          </Txt>
        </Scale>
        <MarkerRuns t={t} at={jumpFar - 0.1} boxes={IN_WORDS} a={10} b={14} dur={0.5} h={32} color={M.mint} opacity={0.8} />
        <PassageText t={t} at={0.3} words={IN_WORDS} size={24} />
        {/* searching for "legs"… not written! */}
        {t > 0.7 && magOut < 1 && (
          <g opacity={1 - magOut}>
            <Scale s={popS(t, 0.7, 12)} x={magX} y={magY}>
              <Magnifier x={magX} y={magY} r={30} rot={35} />
              <rect x={magX + 26} y={magY - 62} width={78} height={30} rx={15} fill={M.white} stroke={M.ink} strokeWidth={2.5} />
              <Txt x={magX + 65} y={magY - 46} size={19} anchor="middle" color={M.coral}>
                legs?
              </Txt>
            </Scale>
          </g>
        )}
        {stamp > 0 && stampOut < 1 && (
          <g transform={`translate(${IN_PAGE.x + IN_PAGE.w / 2} ${IN_PAGE.y + IN_PAGE.h / 2 + 10}) rotate(-9) scale(${1.7 - 0.7 * stamp})`} opacity={stamp * (1 - stampOut)}>
            <rect x={-170} y={-32} width={340} height={64} rx={12} fill={M.paper} fillOpacity={0.85} stroke={M.coral} strokeWidth={6} />
            <Txt x={0} y={2} size={32} anchor="middle" color={M.coral}>
              NOT IN THE TEXT
            </Txt>
          </g>
        )}
        <Fade t={t} at={useClues - 0.45} out={jumpFar - 0.3}>
          <Kinetic t={t} at={useClues} text="Use clues!" x={694} y={300} size={48} color={M.ink} />
        </Fade>

        {/* clue + what I know = inference */}
        <InfBox t={t} at={jumpFar + 0.2} i={0} />
        <FlyTag t={t} at={jumpFar + 0.3} dur={0.7} text="can jump very far" from={[jw.x + jw.w / 2, jw.y]} to={[BOX_X + BOX_TAB + (BOX_W - BOX_TAB) / 2, BOXES[0].y + BOXES[0].h / 2]} fromSize={24} toSize={27} pill={false} lift={20} />
        <InfBox t={t} at={know} i={1} />
        <Kinetic t={t} at={aboutJ + 0.3} text="big jumps need strong legs" x={BOX_X + BOX_TAB + (BOX_W - BOX_TAB) / 2} y={BOXES[1].y + BOXES[1].h / 2 + 1} size={26} gap={0.12} stroke={M.white} />
        <Scale s={popS(t, plus, 10)} x={BOX_X + BOX_W / 2} y={BOXES[0].y + BOXES[0].h + 19}>
          <circle cx={BOX_X + BOX_W / 2} cy={BOXES[0].y + BOXES[0].h + 19} r={17} fill={M.white} stroke={M.ink} strokeWidth={3.5} />
          <Txt x={BOX_X + BOX_W / 2} y={BOXES[0].y + BOXES[0].h + 20} size={30} anchor="middle">
            +
          </Txt>
        </Scale>
        <Scale s={popS(t, make, 10)} x={BOX_X + BOX_W / 2} y={BOXES[1].y + BOXES[1].h + 19}>
          <circle cx={BOX_X + BOX_W / 2} cy={BOXES[1].y + BOXES[1].h + 19} r={17} fill={M.white} stroke={M.ink} strokeWidth={3.5} />
          <Txt x={BOX_X + BOX_W / 2} y={BOXES[1].y + BOXES[1].h + 20} size={30} anchor="middle">
            =
          </Txt>
        </Scale>
        <InfBox t={t} at={inference - 0.1} i={2} glow={box3Glow} />
        <Kinetic t={t} at={inference + 0.25} text="Frogs have strong legs!" x={BOX_X + BOX_TAB + (BOX_W - BOX_TAB) / 2} y={BOXES[2].y + BOXES[2].h / 2 + 1} size={28} gap={0.1} stroke={M.white} />
        <Burst t={t} at={inference + 0.3} x={BOX_X + BOX_W - 40} y={BOXES[2].y + 10} color={M.gold} r={80} />
        <Sparkles t={t} at={inference + 0.35} x={BOX_X + BOX_W / 2} y={BOXES[2].y + 34} r={200} n={10} seed={3} />
        <Twinkle t={t} at={inference + 1.2} x={BOX_X + BOX_W + 6} y={BOXES[2].y - 4} r={11} />
        <Twinkle t={t} at={inference + 1.2} x={PAD_B[0] + 70} y={PAD_B[1] - 110} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

export const readingScenes: Record<string, Scene> = { mainidea, supports, detail, infer }
