/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, progress, spring, wobble } from '../anim'
import { Burst, Draw, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Ear, NumDisc, PointerHand, STICKER } from './_kart'

/*
 * Kindergarten rhymes and word parts colour code (whole lesson):
 *   a word's END is a coral squiggle under its picture: words that rhyme get
 *   the same squiggle (they sound the same at the end), and a coral arc joins them;
 *   each PART of a word is a hit on the red drum and a gold disc with its number.
 * Nothing on the stage but pictures, numerals and "?".
 */

const OUT = 4

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

// ── art (drawn around 0, 0) ─────────────────────────────────────────────────

/** A cat's face (or, striped and orange, a tiger's). */
function CatFace({ r = 70, fur = '#b8b8c8', stripes = false }: { r?: number; fur?: string; stripes?: boolean }) {
  const ear = (dx: number) => `M ${dx * r * 0.95} ${-r * 0.35} L ${dx * r * 0.78} ${-r * 1.12} L ${dx * r * 0.25} ${-r * 0.86} Z`
  return (
    <g strokeLinejoin="round">
      <path d={ear(-1)} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <path d={ear(1)} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <ellipse rx={r} ry={r * 0.88} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      {stripes && (
        <path
          d={`M 0 ${-r * 0.88} L 0 ${-r * 0.55} M ${-r * 0.3} ${-r * 0.84} L ${-r * 0.22} ${-r * 0.6} M ${r * 0.3} ${-r * 0.84} L ${r * 0.22} ${-r * 0.6} M ${-r * 0.98} ${-r * 0.1} L ${-r * 0.7} ${-r * 0.05} M ${r * 0.98} ${-r * 0.1} L ${r * 0.7} ${-r * 0.05}`}
          stroke={M.ink}
          strokeWidth={6}
          strokeLinecap="round"
        />
      )}
      <ellipse cx={0} cy={r * 0.32} rx={r * 0.36} ry={r * 0.26} fill="#fdf3dc" stroke={M.ink} strokeWidth={3} />
      <circle cx={-r * 0.36} cy={-r * 0.12} r={r * 0.1} fill={M.ink} />
      <circle cx={r * 0.36} cy={-r * 0.12} r={r * 0.1} fill={M.ink} />
      <path d={`M ${-r * 0.1} ${r * 0.2} L ${r * 0.1} ${r * 0.2} L 0 ${r * 0.32} Z`} fill={M.coral} stroke={M.ink} strokeWidth={2.5} />
      <path
        d={`M ${-r * 0.3} ${r * 0.36} L ${-r * 0.95} ${r * 0.26} M ${-r * 0.3} ${r * 0.46} L ${-r * 0.92} ${r * 0.52} M ${r * 0.3} ${r * 0.36} L ${r * 0.95} ${r * 0.26} M ${r * 0.3} ${r * 0.46} L ${r * 0.92} ${r * 0.52}`}
        stroke={M.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  )
}

/** A tall black top hat with a coral band. */
function TopHat({ w = 150 }: { w?: number }) {
  const h = w * 0.62
  return (
    <g strokeLinejoin="round">
      <ellipse cx={0} cy={h * 0.5} rx={w * 0.62} ry={w * 0.12} fill="#4a3c48" stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${-w * 0.36} ${h * 0.5} L ${-w * 0.32} ${-h * 0.62} L ${w * 0.32} ${-h * 0.62} L ${w * 0.36} ${h * 0.5} Z`} fill="#4a3c48" stroke={M.ink} strokeWidth={OUT} />
      <rect x={-w * 0.355} y={h * 0.18} width={w * 0.71} height={h * 0.2} fill={M.coral} stroke={M.ink} strokeWidth={3} />
      <ellipse cx={0} cy={-h * 0.62} rx={w * 0.32} ry={w * 0.06} fill="#6b5a66" stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

/** A friendly bat, wings out. */
function Bat({ w = 190 }: { w?: number }) {
  const s = w / 190
  return (
    <g transform={`scale(${s})`} strokeLinejoin="round">
      <path d="M 0 -6 C -30 -40 -70 -46 -95 -28 C -80 -16 -78 0 -86 14 C -62 4 -46 12 -38 26 C -26 14 -12 14 0 22 C 12 14 26 14 38 26 C 46 12 62 4 86 14 C 78 0 80 -16 95 -28 C 70 -46 30 -40 0 -6 Z" fill="#8461b6" stroke={M.ink} strokeWidth={OUT} />
      <path d="M -16 -26 L -22 -50 L -6 -34 Z M 16 -26 L 22 -50 L 6 -34 Z" fill="#8461b6" stroke={M.ink} strokeWidth={3} />
      <ellipse cx={0} cy={-6} rx={22} ry={26} fill="#a07fd6" stroke={M.ink} strokeWidth={OUT} />
      <circle cx={-8} cy={-12} r={4} fill={M.ink} />
      <circle cx={8} cy={-12} r={4} fill={M.ink} />
      <path d="M -6 2 Q 0 7 6 2" fill="none" stroke={M.ink} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}

/** A golden crescent moon. */
function Moon({ r = 80 }: { r?: number }) {
  return (
    <g>
      {/* the outer edge: a half circle bulging left; the inner edge: a flatter arc back up (the crescent between) */}
      <path d={`M ${r * 0.2} ${-r} A ${r} ${r} 0 1 0 ${r * 0.2} ${r} A ${r * 1.3} ${r * 1.3} 0 0 1 ${r * 0.2} ${-r} Z`} fill={STICKER.gold} stroke={M.ink} strokeWidth={OUT} strokeLinejoin="round" />
      <circle cx={-r * 0.45} cy={-r * 0.2} r={r * 0.09} fill="#e0a800" />
      <circle cx={-r * 0.55} cy={r * 0.32} r={r * 0.12} fill="#e0a800" />
    </g>
  )
}

/** A shiny spoon, standing up. */
function Spoon({ h = 190 }: { h?: number }) {
  return (
    <g strokeLinejoin="round">
      <rect x={-h * 0.055} y={-h * 0.12} width={h * 0.11} height={h * 0.62} rx={h * 0.05} fill="#cfd8e3" stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={0} cy={-h * 0.28} rx={h * 0.19} ry={h * 0.24} fill="#cfd8e3" stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={-h * 0.05} cy={-h * 0.33} rx={h * 0.06} ry={h * 0.1} fill={M.white} opacity={0.8} />
    </g>
  )
}

/** A banana. */
function Banana({ w = 200 }: { w?: number }) {
  const s = w / 200
  return (
    <g transform={`scale(${s})`} strokeLinejoin="round">
      <path d="M -92 -30 C -70 40 40 66 96 -6 C 70 18 -20 30 -72 -40 Z" fill="#ffe066" stroke={M.ink} strokeWidth={OUT} />
      <path d="M -92 -30 L -100 -46 L -84 -48 L -72 -40" fill="#8a6a3f" stroke={M.ink} strokeWidth={3} />
      <path d="M 96 -6 L 104 -12" stroke={M.ink} strokeWidth={6} strokeLinecap="round" />
    </g>
  )
}

/** A toy drum (the "Clap the parts" drum: red shell, gold hoops, cream skin). `squash` 0…1 squashes it (a hit). */
function Drum({ w = 200, squash = 0 }: { w?: number; squash?: number }) {
  const s = w / 200
  return (
    <g transform={`scale(${s} ${s * (1 - squash * 0.08)})`} strokeLinejoin="round">
      <path d="M -82 -40 L -82 26 A 82 26 0 0 0 82 26 L 82 -40 Z" fill="#f2766b" stroke={M.ink} strokeWidth={5} />
      <path d="M -82 -24 L -55 44 L -28 -20 L 0 52 L 28 -20 L 55 44 L 82 -24" fill="none" stroke="#fdf3dc" strokeWidth={6} strokeLinecap="round" />
      <ellipse cx={0} cy={-40} rx={82} ry={26} fill={STICKER.gold} stroke={M.ink} strokeWidth={5} />
      <ellipse cx={0} cy={-42} rx={70} ry={20} fill="#fffaf0" stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

/** The END of a word: a coral squiggle (the same one under words that rhyme). */
function EndSquiggle({ t, at, x, y }: { t: number; at: number; x: number; y: number }) {
  return <Draw t={t} at={at} dur={0.5} d={`M ${x - 54} ${y} q 13.5 -18 27 0 t 27 0 t 27 0 t 27 0`} stroke={M.coral} width={8} />
}

/** One part of a word: a gold disc with its number, popping as the drum is hit. */
function Clap({ t, at, x, y, n }: { t: number; at: number; x: number; y: number; n: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={10}>
      <T x={x} y={y}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          return <line key={i} x1={Math.cos(a) * 44} y1={Math.sin(a) * 44} x2={Math.cos(a) * 56} y2={Math.sin(a) * 56} stroke={M.gold} strokeWidth={6} strokeLinecap="round" />
        })}
        <NumDisc n={n} r={36} />
      </T>
    </Pop>
  )
}

// ── the steps ────────────────────────────────────────────────────────────────

const ROW = [
  { x: 210, art: <CatFace r={72} /> },
  { x: 480, art: <TopHat w={160} /> },
  { x: 750, art: <Bat w={200} /> },
]
const ROW_Y = 290

/**
 * kRhymes/rhyme — "Listen to the end of each word. Cat. Hat. Bat. They sound
 * the same at the end. They rhyme!" An ear listens; a cat, a hat and a bat pop
 * in as they are named; on "the same at the end" the same coral squiggle
 * draws under each one, and on "They rhyme!" an arc joins them as they hop.
 */
const rhyme: Scene = ({ t, cue }: SceneProps) => {
  const listen = cue('Listen')
  const said = [cue('Cat.'), cue('Hat.'), cue('Bat.')]
  const same = cue('same at the end')
  const all = cue('They rhyme')
  const waves = ease.outCubic(progress(t, listen + 0.3, 0.6))
  return (
    <>
      <Paper />
      <Pop t={t} at={listen} x={480} y={110} out={said[0] - 0.2} bounce={11}>
        <T x={480} y={110}>
          <Ear r={56} waves={waves} />
        </T>
      </Pop>
      {ROW.map((w, i) => (
        <Pop key={i} t={t} at={said[i]} x={w.x} y={ROW_Y} bounce={10}>
          <T x={w.x} y={ROW_Y - bump(t, all + 0.3 + i * 0.15) * 30}>
            {w.art}
          </T>
        </Pop>
      ))}
      {ROW.map((w, i) => (
        <EndSquiggle key={`e${i}`} t={t} at={same + i * 0.18} x={w.x} y={428} />
      ))}
      <Draw t={t} at={all - 0.05} dur={0.7} d="M 210 150 Q 345 50 480 150 Q 615 50 750 150" stroke={M.coral} width={8} />
      <Burst t={t} at={all + 0.6} x={480} y={88} r={70} />
    </>
  )
}

/**
 * kRhymes/moon — "Moon and spoon rhyme, too. Moon, spoon! Now you find a
 * rhyme." A moon and a spoon pop in; each hops as it is said again, the same
 * squiggle under both and an arc between them; then a ? and a hand: your turn.
 */
const moon: Scene = ({ t, cue }: SceneProps) => {
  const m = cue('Moon and')
  const s = cue('spoon rhyme')
  const m2 = cue('Moon,')
  const s2 = cue('spoon!')
  const find = cue('find a rhyme')
  return (
    <>
      <Paper />
      <Pop t={t} at={m} x={300} y={260} bounce={10}>
        <T x={300} y={260 - bump(t, m2) * 30}>
          <Moon r={92} />
        </T>
      </Pop>
      <Pop t={t} at={s} x={600} y={270} bounce={10}>
        <T x={600} y={270 - bump(t, s2) * 30}>
          <Spoon h={220} />
        </T>
      </Pop>
      <EndSquiggle t={t} at={m2 + 0.1} x={300} y={430} />
      <EndSquiggle t={t} at={s2 + 0.1} x={600} y={430} />
      <Draw t={t} at={s2 + 0.3} dur={0.6} d="M 300 140 Q 450 40 600 140" stroke={M.coral} width={8} />
      <Pop t={t} at={find} x={810} y={250} bounce={10}>
        <circle cx={810} cy={250} r={62} fill={M.white} stroke={M.ink} strokeWidth={OUT} />
        <Title x={810} y={256} size={84} color={M.sea}>
          ?
        </Title>
      </Pop>
      <Pop t={t} at={find + 0.3} x={872} y={505} bounce={11}>
        <T x={872} y={505} r={-30 + wobble(t, find + 0.6, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand />
        </T>
      </Pop>
    </>
  )
}

/** The drum and its claps: the drum hit (squashed) on each part, a numbered disc popping for each. */
function DrumAndClaps({ t, at, hits, x, y, claps }: { t: number; at: number; hits: number[]; x: number; y: number; claps: { x: number; y: number }[] }) {
  const squash = Math.max(0, ...hits.map((h) => bump(t, h, 0.26)))
  const drop = spring(t, at, { stiffness: 200, damping: 12 })
  return (
    <>
      {drop > 0.001 && (
        <T x={x} y={y - (1 - Math.min(1, drop)) * 300}>
          <Drum w={230} squash={squash} />
        </T>
      )}
      {hits.map((h, i) => (
        <Burst key={`b${i}`} t={t} at={h} x={x} y={y - 60} r={70} color={M.coral} />
      ))}
      {claps.map((c, i) => (
        <Clap key={i} t={t} at={hits[i]} x={c.x} y={c.y} n={i + 1} />
      ))}
    </>
  )
}

/**
 * kRhymes/parts — "Words have parts. Let's clap them! Ti… ger. Tiger has two
 * claps!" A tiger pops in; a drum drops beside it; on "Ti…" and on "ger." the
 * drum is hit and a numbered disc pops (1, 2); on "two claps" they cheer.
 */
const parts: Scene = ({ t, cue }: SceneProps) => {
  const words = cue('Words')
  const clap = cue('clap them')
  const hits = [cue('Ti…'), cue('ger.')]
  const two = cue('two claps')
  return (
    <>
      <Paper />
      <Pop t={t} at={words} x={250} y={290} bounce={10}>
        <T x={250} y={290 - bump(t, two + 0.2) * 26}>
          <CatFace r={96} fur="#f2a65a" stripes />
        </T>
      </Pop>
      <DrumAndClaps t={t} at={clap} hits={hits} x={660} y={360} claps={[{ x: 580, y: 120 }, { x: 740, y: 120 }]} />
      <Burst t={t} at={two + 0.3} x={660} y={120} r={110} />
    </>
  )
}

/**
 * kRhymes/yourTurn — "Your turn! Clap the parts of banana. Ba… na… na!" A
 * hand waves hello; a banana pops in; the drum drops beside it, and on "Ba…",
 * "na…" and "na!" it is hit and a numbered disc pops (1, 2, 3): the three
 * claps the "your turn" counts.
 */
const yourTurn: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const clap = cue('Clap the parts')
  const banana = cue('banana')
  const hits = [cue('Ba…'), cue('na…'), cue('na!')]
  return (
    <>
      <Paper />
      <Pop t={t} at={banana} x={240} y={300} bounce={10}>
        <T x={240} y={300}>
          <Banana w={260} />
        </T>
      </Pop>
      <DrumAndClaps t={t} at={clap} hits={hits} x={640} y={370} claps={[{ x: 520, y: 120 }, { x: 640, y: 120 }, { x: 760, y: 120 }]} />
      <Pop t={t} at={turn} x={884} y={515} bounce={11}>
        <T x={884} y={515} r={-30 + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand />
        </T>
      </Pop>
    </>
  )
}

export const kRhymesScenes: Record<string, Scene> = { rhyme, moon, parts, yourTurn }
