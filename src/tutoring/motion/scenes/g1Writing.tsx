/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Paper, Pop, T } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { pointAlong, type Pt } from '../../../lib/trace/geometry'
import { DOT_R, LOWER_RULING, glyph, strokeArrows, type Glyph } from '../../../lib/trace/glyphs'
import { LetterTile, NumDisc, PointerHand, STICKER } from './_kart'

/*
 * Writing Workshop (1st grade) colour code (whole lesson): the same picture as
 * the 1st-grade Writing Workshop screens. Lowercase letters stand on four
 * writing lines (top, dashed middle, base, and the line a tail reaches); a
 * letter being traced is a light path with a GREEN start dot and an ORANGE
 * arrow, its ink crayon blue (the strokes come from the same data the game
 * checks, src/lib/trace/glyphs.ts). Tiles drop into dashed slots; a CORAL
 * glow marks the capital and the period. The only print is the letters and
 * words being written (in Andika).
 */

const INK = DEEP.blue
const GREEN = '#36c35a'
const ARROW = '#ff8a3d'
const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"
const { top: LT, mid: LM, base: LB, desc: LD = 96 } = LOWER_RULING

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** The four writing lines across the stage (box units → stage via `s`, `x0`, `y0`), `hi` 0–1 lighting the top, dashed or tail line. */
function Ruling({ s, y0, hi = {} }: { s: number; y0: number; hi?: { top?: number; mid?: number; desc?: number } }) {
  const y = (v: number) => y0 + v * s
  const line = (v: number, k: number | undefined, base: string, dash?: string, w = 3) => (
    <g>
      {k !== undefined && k > 0.01 && <line x1={40} x2={920} y1={y(v)} y2={y(v)} stroke={M.coral} strokeWidth={14} strokeLinecap="round" opacity={0.45 * k} />}
      <line x1={40} x2={920} y1={y(v)} y2={y(v)} stroke={base} strokeWidth={w} strokeDasharray={dash} />
    </g>
  )
  return (
    <g>
      {line(LT, hi.top, '#a9cdea')}
      {line(LM, hi.mid, '#a9cdea', '12 10')}
      {line(LB, undefined, '#7fb0da', undefined, 4)}
      {line(LD, hi.desc, '#a9cdea')}
    </g>
  )
}

/** A lowercase glyph at (x0, y0) in box units × s: the light path, its ink so far (`ink[i]` 0–1), the current stroke's dot and arrow. */
function LowerGlyph({ g, x0, y0, s, ink, current = -1, guide = true }: { g: Glyph; x0: number; y0: number; s: number; ink: number[]; current?: number; guide?: boolean }) {
  const cur = current >= 0 ? g.strokes[current] : null
  return (
    <T x={x0} y={y0} s={s}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {guide && g.strokes.map((st, i) => <path key={`o${i}`} d={st.path} stroke={i === current ? INK : '#dccbb0'} strokeOpacity={i === current ? 0.45 : 1} strokeWidth={12.5} />)}
        {guide && g.strokes.map((st, i) => <path key={`i${i}`} d={st.path} stroke={i === current ? '#ffffff' : '#f5ecdd'} strokeWidth={9.6} />)}
        {g.strokes.map((st, i) => {
          const k = ink[i] ?? 0
          if (k <= 0.001) return null
          const len = st.sampled.length
          return <path key={`k${i}`} d={st.path} stroke={INK} strokeWidth={8} opacity={0.92} strokeDasharray={`${len} ${len + 20}`} strokeDashoffset={len * (1 - Math.min(1, k))} />
        })}
      </g>
      {cur &&
        strokeArrows(cur).map((a, i) => {
          const n = { x: -a.dir.y, y: a.dir.x }
          const tip = { x: a.p.x + a.dir.x * 4.6, y: a.p.y + a.dir.y * 4.6 }
          const back = { x: a.p.x - a.dir.x * 3.1, y: a.p.y - a.dir.y * 3.1 }
          const pts = [tip, { x: back.x + n.x * 4.3, y: back.y + n.y * 4.3 }, { x: a.p.x - a.dir.x * 0.7, y: a.p.y - a.dir.y * 0.7 }, { x: back.x - n.x * 4.3, y: back.y - n.y * 4.3 }]
          return <polygon key={i} points={pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} fill={ARROW} stroke={M.ink} strokeWidth={0.9} strokeLinejoin="round" />
        })}
      {cur && (
        <g transform={`translate(${cur.start.x} ${cur.start.y})`}>
          <circle r={DOT_R} fill={GREEN} stroke={M.ink} strokeWidth={1.1} />
          <circle cx={-1.6} cy={-1.7} r={1.5} fill="#fff" opacity={0.85} />
        </g>
      )}
    </T>
  )
}

const A_ = glyph('lower', 'a')
const B_ = glyph('lower', 'b')
const G_ = glyph('lower', 'g')

/**
 * g1Writing/lines — "Little letters live on the lines. Tall ones touch the top
 * line. Small ones start at the dashed line." Four writing lines draw across;
 * b, a and g write themselves on them; on "Tall ones" the b hops and the top
 * line glows; on "Small ones" the a hops and the dashed line glows.
 */
const lines: Scene = ({ t, cue }: SceneProps) => {
  const live = cue('live on the lines')
  const tall = cue('Tall ones')
  const small = cue('Small ones')
  const s = 4.4
  const y0 = 270 - 51 * s
  const drawIn = (at: number) => [ease.inOutCubic(progress(t, at, 0.7)), ease.inOutCubic(progress(t, at + 0.6, 0.7))]
  const glowTop = ease.outCubic(progress(t, tall + 0.3, 0.3)) * (1 - ease.outCubic(progress(t, small - 0.2, 0.3)))
  const glowMid = ease.outCubic(progress(t, small + 0.3, 0.3))
  return (
    <>
      <Paper />
      <Ruling s={s} y0={y0} hi={{ top: glowTop, mid: glowMid }} />
      <T x={0} y={-bump(t, tall + 0.2) * 22}>
        <LowerGlyph g={B_} x0={220 - 50 * s} y0={y0} s={s} ink={drawIn(live)} guide={false} />
      </T>
      <T x={0} y={-bump(t, small + 0.2) * 22}>
        <LowerGlyph g={A_} x0={480 - 50 * s} y0={y0} s={s} ink={drawIn(live + 0.5)} guide={false} />
      </T>
      <LowerGlyph g={G_} x0={740 - 50 * s} y0={y0} s={s} ink={drawIn(live + 1)} guide={false} />
    </>
  )
}

/** Where along stroke `i` of `g` the finger is, `k` of the way. */
const along = (g: Glyph, i: number, k: number) => pointAlong(g.strokes[i].sampled, Math.min(1, Math.max(0, k)) * g.strokes[i].sampled.length).p

/**
 * g1Writing/traceA — "Let's trace a little a. Around like a C. Then a little
 * line down." A big little a waits on the lines with its green dot; on
 * "Around" the hand traces the bowl, counter-clockwise, laying down ink; on
 * "line down" the dot moves to the top of the line and the hand draws it.
 */
const traceA: Scene = ({ t, cue }: SceneProps) => {
  const land = cue('trace')
  const around = cue('Around')
  const down = cue('line down')
  const s = 5.4
  const x0 = 480 - 50 * s
  const y0 = 300 - 51 * s
  const k1 = ease.inOutCubic(progress(t, around, 1.6))
  const k2 = ease.inOutCubic(progress(t, down - 0.1, 1.0))
  const current = k2 >= 1 ? -1 : k1 >= 1 ? 1 : 0
  const fingerAt: Pt = k1 < 1 ? along(A_, 0, k1) : along(A_, 1, k2)
  const handIn = spring(t, around - 0.5, { stiffness: 160, damping: 14 })
  const done = cue('line down') + 1.1
  return (
    <>
      <Paper />
      <Pop t={t} at={land} x={480} y={300} bounce={12}>
        <Ruling s={s} y0={y0} />
        <LowerGlyph g={A_} x0={x0} y0={y0} s={s} ink={[k1, k2]} current={current} />
      </Pop>
      {handIn > 0.001 && t < done + 0.6 && (
        <T x={x0 + fingerAt.x * s} y={y0 + fingerAt.y * s} s={0.6} r={155}>
          <PointerHand press={k1 > 0 && k1 < 1 ? 0.4 : 0} />
        </T>
      )}
      <Burst t={t} at={done} x={480} y={300} r={130} />
    </>
  )
}

/** A dashed slot for a tile, centred on (x, y). */
function Slot({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={22} fill="#eaf6ff" stroke="#74b7e8" strokeWidth={4} strokeDasharray="14 10" />
}

/**
 * g1Writing/spell — "To spell a word, say it slowly. Cat. Kuh… aa… tuh. Three
 * sounds, three letters!" A cat pops in beside three dashed slots; as each
 * sound is said its letter tile drops into its slot; on "Three sounds" a
 * numbered disc pops over each.
 */
const spell: Scene = ({ t, cue }: SceneProps) => {
  const slowly = cue('say it slowly')
  const cat = cue('Cat.')
  const sounds = [cue('Kuh'), cue('aa…'), cue('tuh')]
  const three = cue('Three sounds')
  const xs = [490, 650, 810]
  return (
    <>
      <Paper />
      <Pop t={t} at={cat} x={200} y={280} bounce={10}>
        <T x={200} y={280}>
          <text x={0} y={8} fontSize={200} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
            🐱
          </text>
        </T>
      </Pop>
      {xs.map((x, i) => (
        <Pop key={`s${i}`} t={t} at={slowly + i * 0.12} x={x} y={300} bounce={13}>
          <Slot x={x} y={300} w={150} h={150} />
        </Pop>
      ))}
      {xs.map((x, i) => {
        const k = spring(t, sounds[i], { stiffness: 220, damping: 13 })
        if (k <= 0.001) return null
        return (
          <T key={`t${i}`} x={x} y={lerp(-120, 300, Math.min(1.04, k))}>
            <LetterTile ch={['c', 'a', 't'][i]} s={136} color={[STICKER.blue, STICKER.coral, STICKER.mint][i]} />
          </T>
        )
      })}
      {xs.map((x, i) => (
        <Pop key={`n${i}`} t={t} at={three + 0.2 + i * 0.25} x={x} y={150} bounce={10}>
          <T x={x} y={150}>
            <NumDisc n={i + 1} r={32} />
          </T>
        </Pop>
      ))}
      <Burst t={t} at={three + 1.1} x={650} y={300} r={140} />
    </>
  )
}

/** A word tile (Andika) centred on (0, 0). */
function WordTile({ text, w, color = M.ink, glow = 0 }: { text: string; w: number; color?: string; glow?: number }) {
  return (
    <g>
      {glow > 0.01 && <rect x={-w / 2 - 12} y={-62} width={w + 24} height={124} rx={30} fill={M.coral} opacity={0.35 * glow} />}
      <rect x={-w / 2} y={-48} width={w} height={96} rx={22} fill="#fdf3dc" stroke={M.ink} strokeWidth={4} />
      <text x={0} y={2} fontFamily={M.letters} fontWeight={700} fontSize={62} textAnchor="middle" dominantBaseline="central" fill={color}>
        {text}
      </text>
    </g>
  )
}

/**
 * g1Writing/sentence — "A sentence starts with a capital letter. It ends with
 * a period. The dog ran." Three word tiles sit in a row: the, dog, ran. On
 * "capital letter" the first one flips to The (glowing coral); on "period" a
 * period tile drops in at the end (glowing); then each word lights up as the
 * sentence is read.
 */
const sentence: Scene = ({ t, cue }: SceneProps) => {
  const starts = cue('A sentence')
  const capital = cue('capital letter')
  const period = cue('a period')
  const read = [cue('The dog'), cue('dog ran'), cue('ran.')]
  const ws = [180, 170, 160]
  const xs = [250, 460, 660]
  const flip = progress(t, capital + 0.2, 0.42)
  const first = flip < 0.5 ? 'the' : 'The'
  const sy = flip < 0.5 ? 1 - ease.inOutCubic(flip * 2) : spring(t, capital + 0.41, { stiffness: 320, damping: 14 })
  const capGlow = ease.outCubic(progress(t, capital + 0.4, 0.3)) * (1 - ease.outCubic(progress(t, period, 0.4)))
  const dot = spring(t, period + 0.2, { stiffness: 220, damping: 12 })
  const dotGlow = ease.outCubic(progress(t, period + 0.4, 0.3)) * (1 - ease.outCubic(progress(t, read[0], 0.3)))
  const lit = (i: number) => ease.outCubic(progress(t, read[i] - 0.05, 0.15)) * (1 - ease.outCubic(progress(t, (read[i + 1] ?? read[2] + 0.8) - 0.05, 0.2)))
  return (
    <>
      <Paper />
      {xs.map((x, i) => (
        <Pop key={i} t={t} at={starts + i * 0.15} x={x} y={270} bounce={12}>
          {lit(i) > 0.01 && <rect x={x - ws[i] / 2 - 10} y={270 - 58} width={ws[i] + 20} height={116} rx={28} fill="#ffe066" opacity={lit(i)} />}
          <T x={x} y={270} sy={i === 0 ? Math.max(0.001, sy) : 1}>
            <WordTile text={i === 0 ? first : ['the', 'dog', 'ran'][i]} w={ws[i]} glow={i === 0 ? capGlow : 0} />
          </T>
        </Pop>
      ))}
      {dot > 0.001 && (
        <T x={820} y={lerp(-80, 270, Math.min(1.04, dot))}>
          {dotGlow > 0.01 && <circle r={64} fill={M.coral} opacity={0.35 * dotGlow} />}
          <rect x={-44} y={-48} width={88} height={96} rx={22} fill="#fdf3dc" stroke={M.ink} strokeWidth={4} />
          <circle cx={0} cy={20} r={11} fill={M.ink} />
        </T>
      )}
      <Pop t={t} at={read[2] + 0.5} x={880} y={500} bounce={11}>
        <T x={880} y={500} r={-30 + wobble(t, read[2] + 0.8, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand />
        </T>
      </Pop>
    </>
  )
}

export const g1WritingScenes: Record<string, Scene> = { lines, traceA, spell, sentence }
