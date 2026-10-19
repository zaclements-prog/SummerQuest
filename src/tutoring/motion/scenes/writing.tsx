/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import type { ReactNode } from 'react'
import { ease, progress, spring } from '../anim'
import { Burst, Camera, Draw, Kinetic, Paper } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Dog, Frog, shade } from './_b3art'
import { Cross, Head, Scale, Sparkles, Tick, Twinkle, Txt, arc, ep, layoutText, popS, puzzlePath, textW } from './_b3kit'

// ── the sentence frame: [ naming part ][ action part ][ . ] ──────────────────
const PIECE_Y = 206
const PIECE_H = 124
const NAMING = { x: 104, w: 330 }
const ACTION = { x: 434, w: 318 }
const PERIOD = { x: 752, w: 104 }
const BLUE = '#8ab8ff'
const BLUE_INK = '#2f6fc4'
const CORAL_INK = '#d0503f'
const PERIOD_COLOR = M.gold
const WORD = 56

/** A puzzle piece of the frame with an optional label pill + caption under it. */
function Piece({ x, w, color, tab, socket, dx = 0, dy = 0, s = 1, glow = 0, children }: { x: number; w: number; color: string; tab?: boolean; socket?: boolean; dx?: number; dy?: number; s?: number; glow?: number; children?: ReactNode }) {
  if (s <= 0.001) return null
  const cx = x + w / 2
  const cy = PIECE_Y + PIECE_H / 2
  return (
    <g transform={`translate(${dx} ${dy}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
      {glow > 0 && <path d={puzzlePath(x - 8, PIECE_Y - 8, w + 16, PIECE_H + 16, { tab, socket, r: 24 })} fill={M.gold} opacity={0.45 * glow} />}
      <path d={puzzlePath(x, PIECE_Y + 7, w, PIECE_H, { tab, socket, r: 20 })} fill={M.ink} />
      <path d={puzzlePath(x, PIECE_Y, w, PIECE_H, { tab, socket, r: 20 })} fill={color} stroke={M.ink} strokeWidth={4.5} strokeLinejoin="round" />
      <path d={`M ${x + (socket ? 40 : 22)} ${PIECE_Y + 16} L ${x + w - 30} ${PIECE_Y + 16}`} stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.4} />
      {children}
    </g>
  )
}

/** A label pill (e.g. "naming part") with a small caption under it. */
function PartLabel({ t, at, x, text, color, caption, captionAt }: { t: number; at: number; x: number; text: string; color: string; caption?: string; captionAt?: number }) {
  const y = PIECE_Y + PIECE_H + 44
  const w = textW(text, 26) + 34
  return (
    <>
      <Scale s={popS(t, at, 12)} x={x} y={y}>
        <rect x={x - w / 2} y={y - 21} width={w} height={42} rx={21} fill={color} stroke={M.ink} strokeWidth={3} />
        <Txt x={x} y={y + 1} size={26} anchor="middle" color={M.white}>
          {text}
        </Txt>
      </Scale>
      {caption && captionAt !== undefined && <Kinetic t={t} at={captionAt} text={caption} x={x} y={y + 48} size={26} color={M.inkSoft} stroke={M.paper} />}
    </>
  )
}

/** Word dropping into place: falls from above with a springy landing. */
function dropIn(t: number, at: number) {
  const s = spring(t, at, { stiffness: 230, damping: 13 })
  return { y: (1 - Math.min(1, s)) * -70 + (s > 1 ? (s - 1) * 30 : 0), o: Math.min(1, s * 2.5), s }
}

// ── parts ────────────────────────────────────────────────────────────────────
/**
 * writing/parts — "A complete sentence has two parts. The naming part tells who
 * or what the sentence is about. The action part tells what they do. And every
 * sentence starts with a capital letter and ends with a punctuation mark."
 * Two puzzle pieces pop in apart. The blue naming piece gets "who or what?" and
 * then "The frog" drops in (a frog hops onto it); the coral action piece gets
 * "what they do" and "jumps" — the frog hops across — and the pieces snap
 * together with a click. Then the T swells gold with sparkles (capital letter)
 * and a period piece slides in and locks on the end (punctuation mark).
 */
const parts: Scene = ({ t, cue }: SceneProps) => {
  const two = cue('two parts')
  const naming = cue('naming part')
  const whoWhat = cue('who or what')
  const about = cue('is about')
  const action = cue('action part')
  const whatDo = cue('what they do')
  const capital = cue('capital letter')
  const punct = cue('punctuation mark')
  const snap = whatDo + 0.9
  const join = ep(t, snap, 0.45, ease.inOutCubic)
  const nPop = popS(t, two + 0.1, 12)
  const aPop = popS(t, two + 0.3, 12)
  const gap = 46 * (1 - join)
  const pPiece = ep(t, punct + 0.1, 0.55, ease.outBack)
  const theW = dropIn(t, about + 0.1)
  const jumpsW = dropIn(t, whatDo + 0.35)
  const nameX = NAMING.x + 40
  const tW = textW('T', WORD)
  const capK = ep(t, capital + 0.05, 0.5, ease.outBack)
  // the frog: hops onto the naming piece, then across to the action piece
  const frogOn = popS(t, about + 0.35, 11)
  const hop = ep(t, whatDo + 0.25, 0.6, ease.inOutSine)
  const fA: [number, number] = [NAMING.x + NAMING.w - 70 - gap, PIECE_Y - 32]
  const fB: [number, number] = [ACTION.x + 150 + gap, PIECE_Y - 32]
  const [fx, fy] = hop > 0 && hop < 1 ? arc(hop, fA, fB, 70) : hop >= 1 ? fB : fA
  const blink = Math.max(0, 1 - Math.abs(((t + 0.4) % 3.2) - 0.1) * 10)
  const done = punct + 1
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: naming + 0.5, x: 340, y: 278, zoom: 1.1 },
          { at: action + 0.6, x: 600, y: 278, zoom: 1.1 },
          { at: snap + 0.3, x: 480, y: 280, zoom: 1.04 },
          { at: done, x: 480, y: 258, zoom: 1 },
        ]}
      >
        <Kinetic t={t} at={0.15} text="A complete sentence" x={480} y={64} size={46} color={M.ink} />
        {/* naming piece */}
        <Piece x={NAMING.x} w={NAMING.w} color={BLUE} tab dx={-gap} s={nPop}>
          <g opacity={1 - ep(t, about, 0.25)}>
            <Scale s={popS(t, whoWhat, 9)} x={NAMING.x + NAMING.w / 2} y={PIECE_Y + PIECE_H / 2}>
              <Txt x={NAMING.x + NAMING.w / 2} y={PIECE_Y + PIECE_H / 2 - 4 * Math.abs(Math.sin(t * 4))} size={70} anchor="middle" color={M.white} stroke={BLUE_INK}>
                ?
              </Txt>
            </Scale>
          </g>
          {t > about && (
            <g transform={`translate(0 ${theW.y})`} opacity={theW.o}>
              {capK > 0 && <circle cx={nameX + tW / 2} cy={PIECE_Y + PIECE_H / 2} r={34 * Math.min(1.1, capK)} fill={M.gold} stroke={M.ink} strokeWidth={3} />}
              <g transform={`translate(${nameX + tW / 2} ${PIECE_Y + PIECE_H / 2}) scale(${1 + 0.25 * capK}) translate(${-(nameX + tW / 2)} ${-(PIECE_Y + PIECE_H / 2)})`}>
                <Txt x={nameX} y={PIECE_Y + PIECE_H / 2} size={WORD} color={capK > 0.3 ? M.ink : M.white} stroke={capK > 0.3 ? undefined : M.ink}>
                  T
                </Txt>
              </g>
              <Txt x={nameX + tW + (capK * tW * 0.25) / 2} y={PIECE_Y + PIECE_H / 2} size={WORD} color={M.white} stroke={M.ink}>
                he frog
              </Txt>
            </g>
          )}
        </Piece>
        {/* action piece */}
        <Piece x={ACTION.x} w={ACTION.w} color={M.coral} socket tab={pPiece > 0} dx={gap} s={aPop}>
          <g opacity={1 - ep(t, whatDo + 0.3, 0.25)}>
            <Scale s={popS(t, action + 0.25, 9)} x={ACTION.x + ACTION.w / 2 + 12} y={PIECE_Y + PIECE_H / 2}>
              <Txt x={ACTION.x + ACTION.w / 2 + 12} y={PIECE_Y + PIECE_H / 2 - 4 * Math.abs(Math.sin(t * 4 + 1))} size={70} anchor="middle" color={M.white} stroke={CORAL_INK}>
                ?
              </Txt>
            </Scale>
          </g>
          {t > whatDo + 0.3 && (
            <g transform={`translate(0 ${jumpsW.y})`} opacity={jumpsW.o}>
              <Txt x={ACTION.x + 56} y={PIECE_Y + PIECE_H / 2} size={WORD} color={M.white} stroke={M.ink}>
                jumps
              </Txt>
            </g>
          )}
        </Piece>
        {/* period piece */}
        {pPiece > 0 && (
          <g transform={`translate(${(1 - pPiece) * 160} 0)`} opacity={Math.min(1, pPiece * 2)}>
            <Piece x={PERIOD.x} w={PERIOD.w} color={PERIOD_COLOR} socket>
              <circle cx={PERIOD.x + PERIOD.w / 2 + 10} cy={PIECE_Y + PIECE_H / 2 + 20} r={13 * (1 + 0.3 * Math.sin(Math.PI * progress(t, punct + 0.55, 0.35)))} fill={M.ink} />
            </Piece>
          </g>
        )}
        <Burst t={t} at={snap + 0.4} x={ACTION.x} y={PIECE_Y + PIECE_H / 2} color={M.gold} r={110} />
        <Sparkles t={t} at={capital + 0.15} x={nameX + tW / 2} y={PIECE_Y + PIECE_H / 2} r={70} n={8} seed={2} />
        <Sparkles t={t} at={punct + 0.6} x={PERIOD.x + PERIOD.w / 2 + 10} y={PIECE_Y + PIECE_H / 2 + 20} r={60} n={7} seed={5} />
        {/* labels */}
        <PartLabel t={t} at={naming} x={NAMING.x + NAMING.w / 2 - gap} text="naming part" color={BLUE_INK} caption="who or what" captionAt={whoWhat + 0.2} />
        <PartLabel t={t} at={action} x={ACTION.x + ACTION.w / 2 + gap} text="action part" color={CORAL_INK} caption="what they do" captionAt={whatDo + 0.1} />
        {/* capital letter / punctuation mark callouts */}
        <Scale s={popS(t, capital + 0.2, 12)} x={nameX + 20} y={150}>
          <rect x={nameX - 70} y={128} width={180} height={42} rx={21} fill={M.gold} stroke={M.ink} strokeWidth={3} />
          <Txt x={nameX + 20} y={150} size={24} anchor="middle">
            capital letter
          </Txt>
        </Scale>
        <Draw t={t} at={capital + 0.35} dur={0.3} d={`M ${nameX + 20} 172 L ${nameX + 20} ${PIECE_Y - 12}`} stroke={M.ink} width={4} />
        {t > capital + 0.65 && <Head x={nameX + 20} y={PIECE_Y - 10} ang={Math.PI / 2} size={13} width={4} />}
        <Scale s={popS(t, punct + 0.5, 12)} x={PERIOD.x + 40} y={150}>
          <rect x={PERIOD.x - 76} y={128} width={232} height={42} rx={21} fill={M.gold} stroke={M.ink} strokeWidth={3} />
          <Txt x={PERIOD.x + 40} y={150} size={24} anchor="middle">
            punctuation mark
          </Txt>
        </Scale>
        <Draw t={t} at={punct + 0.65} dur={0.3} d={`M ${PERIOD.x + 60} 172 L ${PERIOD.x + 60} ${PIECE_Y - 12}`} stroke={M.ink} width={4} />
        {t > punct + 0.95 && <Head x={PERIOD.x + 60} y={PIECE_Y - 10} ang={Math.PI / 2} size={13} width={4} />}
        {/* the frog */}
        <Scale s={frogOn} x={fA[0]} y={fA[1] + 30}>
          <Frog x={fx} y={fy} s={0.42} legs={hop > 0 && hop < 1 ? Math.sin(Math.PI * hop) : 0} blink={blink} look={hop > 0.5 ? -0.6 : 0.6} />
        </Scale>
        <Twinkle t={t} at={done} x={nameX - 22} y={PIECE_Y + 22} r={10} />
        <Twinkle t={t} at={done} x={PERIOD.x + PERIOD.w + 6} y={PIECE_Y + PIECE_H - 10} r={10} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

// ── example ──────────────────────────────────────────────────────────────────
const LINE_Y = PIECE_Y + PIECE_H / 2
const EX_LINE = layoutText('The dog ran fast', { x: 480, y: LINE_Y, size: WORD, align: 'center' })
const EX_DOT_X = EX_LINE[3].x + EX_LINE[3].w + 4
/** Where each word sits inside the frame pieces (left edges). */
const EX_FRAME_X = [NAMING.x + 40, NAMING.x + 40 + textW('The ', WORD) * 1.04, ACTION.x + 52, ACTION.x + 52 + textW('ran ', WORD) * 1.04]
const EX_PHRASES = ['The dog ran', 'dog ran', 'ran fast. The', 'fast. The']

/** A yellow pencil whose tip is at (x, y). */
function Pencil({ x, y, rot = -35 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M 0 0 L 14 -8 L 14 8 Z" fill="#f2c189" stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      <path d="M 0 0 L 5 -3 L 5 3 Z" fill={M.ink} />
      <rect x={14} y={-9} width={92} height={18} fill={M.gold} stroke={M.ink} strokeWidth={3} />
      <line x1={18} y1={0} x2={102} y2={0} stroke={shade(M.gold, 0.25)} strokeWidth={3} />
      <rect x={106} y={-9} width={12} height={18} fill="#c9d3e0" stroke={M.ink} strokeWidth={3} />
      <rect x={118} y={-9} width={16} height={18} rx={6} fill={M.pink} stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

/**
 * writing/example — "Here is an example. The dog ran fast. The naming part is
 * the dog, because that is who the sentence is about, and the action part is
 * ran fast, because that tells what the dog does."
 * A pencil writes the sentence word by word as it's spoken — the capital T and
 * the period pop with sparkles — while the puppy dashes past on "ran fast".
 * Then the words lift into the sentence frame: "The dog" into the blue naming
 * piece (an arrow points to the puppy: who), "ran fast" into the coral action
 * piece, the puppy zooms by again (what it does), and the pieces snap shut
 * with the period locked on the end.
 */
const example: Scene = ({ t, cue }: SceneProps) => {
  const ex = cue('example')
  const wAt = EX_PHRASES.map((p) => cue(p))
  const dotAt = cue('fast. The') + 0.32
  const naming = cue('naming part is')
  const who = cue('who the sentence')
  const action = cue('action part is')
  const does = cue('what the dog does')
  const snap = does + 0.9
  const nK = ep(t, naming + 0.1, 0.7, ease.inOutCubic)
  const aK = ep(t, action + 0.1, 0.7, ease.inOutCubic)
  const join = ep(t, snap, 0.45, ease.inOutCubic)
  const gap = 46 * (1 - join)
  const pK = ep(t, snap + 0.15, 0.55, ease.outBack)
  // the puppy: dashes across on "ran fast", trots back to sit, zooms again on "what the dog does"
  const run1 = progress(t, wAt[2] - 0.3, 1.3)
  const back = ep(t, naming - 0.2, 1.0, ease.outCubic)
  const run2 = progress(t, does, 1.2)
  let dogX = -160
  let speed = 0
  if (run1 > 0 && run1 < 1) {
    dogX = -160 + 1280 * ease.inOutSine(run1)
    speed = 1
  } else if (run1 >= 1) {
    dogX = -160 + 330 * back
    speed = back > 0 && back < 1 ? 0.5 : 0
  }
  if (run2 > 0 && run2 < 1) {
    dogX = 170 + Math.sin(Math.PI * run2) * 520
    speed = 1
  }
  const flip = run2 > 0.5 && run2 < 1 ? -1 : 1
  const dogY = 466
  const writing = t > wAt[0] - 0.2 && t < dotAt + 0.5
  let penX = EX_LINE[0].x
  for (let i = 0; i < 4; i++) if (t > wAt[i]) penX = EX_LINE[i].x + EX_LINE[i].w * Math.min(1, (t - wAt[i]) / 0.35)
  if (t > dotAt) penX = EX_DOT_X + 10
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 290, zoom: 1.12 },
          { at: naming, x: 480, y: 290, zoom: 1.12 },
          { at: naming + 0.9, x: 480, y: 280, zoom: 1.02 },
          { at: snap + 0.4, x: 480, y: 276, zoom: 1.0 },
        ]}
      >
        <Kinetic t={t} at={ex - 0.5} text="Example" x={480} y={92} size={44} color={M.ink} />
        {/* ruled line for writing */}
        <g opacity={1 - nK}>
          <Draw t={t} at={0.2} dur={0.7} d={`M 150 ${LINE_Y + 38} L 810 ${LINE_Y + 38}`} stroke={M.sea} width={4} />
        </g>
        {/* the pieces form behind the words */}
        {nK > 0 && (
          <g opacity={Math.min(1, nK * 2.5)}>
            <Piece x={NAMING.x} w={NAMING.w} color={BLUE} tab dx={-gap} s={0.6 + 0.4 * nK} />
          </g>
        )}
        {aK > 0 && (
          <g opacity={Math.min(1, aK * 2.5)}>
            <Piece x={ACTION.x} w={ACTION.w} color={M.coral} socket tab={pK > 0} dx={gap} s={0.6 + 0.4 * aK} />
          </g>
        )}
        {pK > 0 && (
          <g transform={`translate(${(1 - pK) * 160} 0)`} opacity={Math.min(1, pK * 2)}>
            <Piece x={PERIOD.x} w={PERIOD.w} color={PERIOD_COLOR} socket />
          </g>
        )}
        {/* the words (written on the line, then lifted into the frame) */}
        {EX_LINE.map((b, i) => {
          const d = dropIn(t, wAt[i])
          if (d.o <= 0) return null
          const k = i < 2 ? nK : aK
          const x = b.x + (EX_FRAME_X[i] + (i < 2 ? -gap : gap) - b.x) * k
          const inFrame = k > 0.5
          const isT = i === 0
          const capPop = isT ? Math.sin(Math.PI * progress(t, wAt[0] + 0.15, 0.4)) : 0
          return (
            <g key={i} transform={`translate(0 ${d.y})`} opacity={d.o}>
              {isT && (
                <g transform={`translate(${x + 18} ${LINE_Y}) scale(${1 + 0.35 * capPop}) translate(${-(x + 18)} ${-LINE_Y})`}>
                  <Txt x={x} y={LINE_Y} size={WORD} color={inFrame ? M.white : capPop > 0.05 ? M.coral : M.ink} stroke={inFrame ? M.ink : undefined}>
                    T
                  </Txt>
                </g>
              )}
              <Txt x={isT ? x + textW('T', WORD) : x} y={LINE_Y} size={WORD} color={inFrame ? M.white : M.ink} stroke={inFrame ? M.ink : undefined}>
                {isT ? 'he' : b.text}
              </Txt>
            </g>
          )
        })}
        {/* the period: on the line, then into its own piece */}
        {t > dotAt && (
          <>
            {(() => {
              const s = spring(t, dotAt, { stiffness: 260, damping: 11 })
              // rides along after "fast" into the action piece, then hops into its own piece
              const inAction = EX_FRAME_X[3] + gap + EX_LINE[3].w + 12
              const x0 = EX_DOT_X + 8 + (inAction - EX_DOT_X - 8) * aK
              const x1 = PERIOD.x + PERIOD.w / 2 + 10 + (1 - pK) * 160
              const y0 = LINE_Y + 16
              const y1 = PIECE_Y + PIECE_H / 2 + 20
              const k = pK > 0 ? Math.min(1, pK) : 0
              return <circle cx={x0 + (x1 - x0) * k} cy={y0 + (y1 - y0) * k} r={8 * s + 5 * k} fill={M.ink} />
            })()}
          </>
        )}
        <Sparkles t={t} at={wAt[0] + 0.1} x={EX_LINE[0].x + 18} y={LINE_Y} r={56} n={7} seed={1} />
        <Sparkles t={t} at={dotAt + 0.05} x={EX_DOT_X + 8} y={LINE_Y + 16} r={46} n={6} seed={4} />
        {writing && <Pencil x={penX + 4} y={LINE_Y + 22} />}
        {/* labels */}
        <PartLabel t={t} at={naming + 0.4} x={NAMING.x + NAMING.w / 2 - gap} text="naming part" color={BLUE_INK} />
        <PartLabel t={t} at={action + 0.4} x={ACTION.x + ACTION.w / 2 + gap} text="action part" color={CORAL_INK} />
        {/* who? → the puppy */}
        <Draw t={t} at={who} dur={0.5} d={`M ${NAMING.x + 40 - gap} ${PIECE_Y + PIECE_H + 10} Q ${NAMING.x - 20} ${PIECE_Y + PIECE_H + 80} ${180 - 40} ${dogY - 60}`} stroke={BLUE_INK} width={5} />
        {t > who + 0.5 && <Head x={180 - 40} y={dogY - 60} ang={1.9} color={BLUE_INK} size={15} width={5} />}
        <Scale s={popS(t, who + 0.3, 12)} x={64} y={PIECE_Y + PIECE_H + 92}>
          <rect x={24} y={PIECE_Y + PIECE_H + 74} width={80} height={36} rx={18} fill={M.white} stroke={BLUE_INK} strokeWidth={3} />
          <Txt x={64} y={PIECE_Y + PIECE_H + 93} size={22} anchor="middle" color={BLUE_INK}>
            who?
          </Txt>
        </Scale>
        <Scale s={popS(t, does + 0.2, 12) * (1 - ep(t, snap + 1.5, 0.4))} x={ACTION.x + ACTION.w / 2 + gap} y={PIECE_Y - 34}>
          <rect x={ACTION.x + ACTION.w / 2 + gap - 98} y={PIECE_Y - 54} width={196} height={40} rx={20} fill={M.white} stroke={CORAL_INK} strokeWidth={3} />
          <Txt x={ACTION.x + ACTION.w / 2 + gap} y={PIECE_Y - 33} size={22} anchor="middle" color={CORAL_INK}>
            what it does!
          </Txt>
        </Scale>
        <Burst t={t} at={snap + 0.4} x={ACTION.x} y={LINE_Y} color={M.gold} r={110} />
        <Sparkles t={t} at={snap + 0.55} x={PERIOD.x + 60} y={LINE_Y + 20} r={60} n={7} seed={6} />
        {/* the puppy */}
        <g transform={`translate(${dogX} 0) scale(${flip} 1) translate(${-dogX} 0)`}>
          {speed > 0.6 && (
            <g opacity={0.7}>
              {[0, 1, 2].map((i) => (
                <line key={i} x1={dogX - 80 - i * 6} y1={dogY - 30 + i * 22} x2={dogX - 130 - i * 16} y2={dogY - 30 + i * 22} stroke={M.inkSoft} strokeWidth={5} strokeLinecap="round" />
              ))}
            </g>
          )}
          <Dog x={dogX} y={dogY} s={0.7} run={t * 18} speed={speed} tongue={speed > 0.6 ? 1 : 0.6} wag={t * 12} />
        </g>
        <Twinkle t={t} at={snap + 1.3} x={NAMING.x + 30} y={PIECE_Y + 14} r={10} />
        <Twinkle t={t} at={snap + 1.3} x={PERIOD.x + PERIOD.w} y={PIECE_Y + PIECE_H - 6} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

// ── fragments ────────────────────────────────────────────────────────────────
const FR = 50
/** A dashed "missing piece" outline in frame coordinates, with a bouncing ? and a caption. */
function Ghost({ t, x, w, tab, socket, color, caption, at }: { t: number; x: number; w: number; tab?: boolean; socket?: boolean; color: string; caption: string; at: number }) {
  const cx = x + w / 2 + (socket ? 12 : 0)
  const k = popS(t, at, 11)
  return (
    <>
      <path d={puzzlePath(x, PIECE_Y, w, PIECE_H, { tab, socket, r: 20 })} fill={M.white} fillOpacity={0.6} stroke={color} strokeWidth={4.5} strokeDasharray="14 10" strokeLinejoin="round" />
      <Scale s={k} x={cx} y={PIECE_Y + 50}>
        <Txt x={cx} y={PIECE_Y + 50 - 5 * Math.abs(Math.sin(t * 4))} size={56} anchor="middle" color={color}>
          ?
        </Txt>
      </Scale>
      <Scale s={k} x={cx} y={PIECE_Y + 98}>
        <Txt x={cx} y={PIECE_Y + 98} size={26} anchor="middle" color={color}>
          {caption}
        </Txt>
      </Scale>
    </>
  )
}

/**
 * writing/fragments — "If a part is missing, it is not a complete sentence. The
 * big dog. What did it do? Ran fast. Who ran? Put the parts together: The big
 * dog ran fast. Now it is complete!"
 * Two broken halves: "The big dog." next to an empty dashed action slot (did
 * what?), and "Ran fast." after an empty naming slot (who?) with a dust cloud
 * that nobody made. They fly together and snap: the extra period after "dog"
 * pops away, "Ran" flips to "ran", the period piece locks on, and now the dog
 * can zoom through: Complete!
 */
const fragments: Scene = ({ t, cue }: SceneProps) => {
  const missing = cue('part is missing')
  const notComplete = cue('not a complete sentence')
  const bigDog = cue('The big dog.')
  const didDo = cue('What did it do')
  const ranFast = cue('Ran fast.')
  const whoRan = cue('Who ran')
  const together = cue('Put the parts together')
  const fullFast = cue('fast. Now')
  const complete = cue('Now it is complete')
  const join = ep(t, together + 0.35, 1.0, ease.inOutCubic)
  const snapAt = together + 1.35
  // group transforms: fragment → frame row
  const S = 0.78 + 0.22 * join
  const g1: [number, number] = [40 * (1 - join), -59 * (1 - join)]
  const g2: [number, number] = [237 * (1 - join), 191 * (1 - join)]
  const ghostOut = 1 - ep(t, together + 0.1, 0.35)
  const f1 = popS(t, missing, 12)
  const f2 = popS(t, missing + 0.3, 12)
  // "not a complete sentence": each half gets a red ✗ (gone once they join)
  const xOut = 1 - ep(t, together + 0.2, 0.3)
  const focus1 = t < bigDog - 0.2 || t > together ? 1 : t < ranFast - 0.2 ? 1 : 0.45
  const focus2 = t < ranFast - 0.2 && t > bigDog - 0.2 ? 0.45 : 1
  const dotPop = progress(t, together + 0.6, 0.45)
  const flip = progress(t, snapAt - 0.35, 0.4)
  const flipS = flip < 0.5 ? 1 - flip * 2 : (flip - 0.5) * 2
  const pK = ep(t, fullFast + 0.1, 0.55, ease.outBack)
  const tW = textW('The big dog', FR)
  const nameX = NAMING.x + 36
  const ranX = ACTION.x + 50
  // the dog: sits puzzled, then zooms through once the sentence is whole
  const zoom = progress(t, complete + 0.1, 1.3)
  const dogX = zoom > 0 && zoom < 1 ? 130 + 960 * ease.inOutSine(zoom) : zoom >= 1 ? 820 : 130
  const dogSpeed = zoom > 0 && zoom < 1 ? 1 : 0
  const dogIn = popS(t, bigDog + 0.2, 12)
  const dust = ep(t, ranFast, 0.4) * (1 - ep(t, complete + 0.4, 0.4))
  const done = complete + 0.8
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: bigDog + 0.3, x: 450, y: 250, zoom: 1.06 },
          { at: ranFast + 0.3, x: 510, y: 300, zoom: 1.06 },
          { at: together + 0.6, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <g opacity={1 - ep(t, complete - 0.2, 0.3)}>
          <Kinetic t={t} at={missing - 0.1} text="Missing a part?" x={480} y={52} size={42} color={M.ink} />
        </g>
        <Kinetic t={t} at={complete} text="Complete!" x={480} y={56} size={52} color={M.leaf} stroke={M.white} />
        {/* fragment 1: The big dog. + (did what?) */}
        <g transform={`translate(${g1[0]} ${g1[1]}) scale(${S})`} opacity={0.4 + 0.6 * focus1}>
          <Scale s={f1} x={NAMING.x + NAMING.w / 2} y={PIECE_Y + PIECE_H / 2}>
            {ghostOut > 0 && (
              <g opacity={ghostOut}>
                <Ghost t={t} x={ACTION.x} w={ACTION.w} socket color={CORAL_INK} caption="did what?" at={didDo} />
              </g>
            )}
            <Piece x={NAMING.x} w={NAMING.w} color={BLUE} tab>
              <Txt x={nameX} y={PIECE_Y + PIECE_H / 2} size={FR} color={M.white} stroke={M.ink}>
                The big dog
              </Txt>
            </Piece>
            {dotPop < 1 && <circle cx={nameX + tW + 15 + dotPop * 10} cy={PIECE_Y + PIECE_H / 2 + 14 - dotPop * 40} r={7 * (1 + dotPop)} fill={M.ink} opacity={1 - dotPop} />}
          </Scale>
        </g>
        {/* fragment 2: (who?) + Ran fast. */}
        <g transform={`translate(${g2[0]} ${g2[1]}) scale(${S})`} opacity={0.4 + 0.6 * focus2}>
          <Scale s={f2} x={ACTION.x + ACTION.w / 2} y={PIECE_Y + PIECE_H / 2}>
            {ghostOut > 0 && (
              <g opacity={ghostOut}>
                <Ghost t={t} x={NAMING.x} w={NAMING.w} tab color={BLUE_INK} caption="who?" at={whoRan} />
              </g>
            )}
            <Piece x={ACTION.x} w={ACTION.w} color={M.coral} socket tab={pK > 0}>
              <g transform={`translate(${ranX + 20} ${PIECE_Y + PIECE_H / 2}) scale(1 ${Math.max(0.02, flipS)}) translate(${-(ranX + 20)} ${-(PIECE_Y + PIECE_H / 2)})`}>
                <Txt x={ranX} y={PIECE_Y + PIECE_H / 2} size={FR} color={M.white} stroke={M.ink}>
                  {flip < 0.5 ? 'R' : 'r'}
                </Txt>
              </g>
              <Txt x={ranX + textW(flip < 0.5 ? 'R' : 'r', FR)} y={PIECE_Y + PIECE_H / 2} size={FR} color={M.white} stroke={M.ink}>
                an fast
              </Txt>
            </Piece>
            {(() => {
              const x0 = ranX + textW('Ran fast', FR) + 15
              const x1 = PERIOD.x + PERIOD.w / 2 + 10
              const y0 = PIECE_Y + PIECE_H / 2 + 14
              const y1 = PIECE_Y + PIECE_H / 2 + 20
              const k = Math.min(1, pK)
              return <circle cx={x0 + (x1 - x0) * k} cy={y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * 40} r={7 + 6 * k} fill={M.ink} />
            })()}
          </Scale>
        </g>
        {xOut > 0 && (
          <g opacity={xOut}>
            {[
              [652, 100],
              [848, 352],
            ].map(([x, y], i) => (
              <g key={i}>
                <Scale s={popS(t, notComplete + i * 0.3, 11)} x={x} y={y}>
                  <circle cx={x} cy={y} r={24} fill={M.white} stroke={M.coral} strokeWidth={4} />
                </Scale>
                <Cross t={t} at={notComplete + 0.1 + i * 0.3} x={x} y={y} s={0.55} width={6} />
              </g>
            ))}
          </g>
        )}
        {/* the period piece locks on */}
        {pK > 0 && (
          <g transform={`translate(${(1 - pK) * 160} 0)`} opacity={Math.min(1, pK * 2)}>
            <Piece x={PERIOD.x} w={PERIOD.w} color={PERIOD_COLOR} socket />
            <circle cx={PERIOD.x + PERIOD.w / 2 + 10} cy={PIECE_Y + PIECE_H / 2 + 20} r={13} fill={M.ink} />
          </g>
        )}
        {/* poof for the extra period */}
        {[0, 1, 2, 3].map((i) => {
          const k = progress(t, together + 0.7, 0.5)
          if (k <= 0 || k >= 1) return null
          const a = (i / 4) * Math.PI * 2 + 0.4
          return <circle key={i} cx={nameX + tW + 14 + Math.cos(a) * 24 * k} cy={PIECE_Y + 40 + Math.sin(a) * 24 * k} r={6 * (1 - k)} fill={M.inkSoft} />
        })}
        <Burst t={t} at={snapAt} x={ACTION.x} y={PIECE_Y + PIECE_H / 2} color={M.gold} r={110} />
        <Sparkles t={t} at={snapAt - 0.1} x={ranX + 14} y={PIECE_Y + PIECE_H / 2} r={50} n={6} seed={3} />
        <Sparkles t={t} at={fullFast + 0.5} x={PERIOD.x + 60} y={PIECE_Y + 80} r={60} n={7} seed={6} />
        {/* who ran? a dust cloud with nobody in it */}
        {dust > 0 && (
          <g opacity={dust}>
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={760 + i * 34 + Math.sin(t * 3 + i) * 4} cy={482 - (i % 2) * 16 + Math.cos(t * 2.4 + i) * 3} r={20 + (i % 3) * 6} fill={M.white} stroke={M.inkSoft} strokeWidth={3} />
            ))}
            {[0, 1, 2].map((i) => (
              <line key={i} x1={640 - i * 20} y1={452 + i * 22} x2={720 - i * 10} y2={452 + i * 22} stroke={M.inkSoft} strokeWidth={5} strokeLinecap="round" />
            ))}
          </g>
        )}
        {/* the dog */}
        <Scale s={dogIn} x={130} y={500}>
          <Dog x={dogX} y={470} s={0.78} run={t * 18} speed={dogSpeed} tongue={dogSpeed ? 1 : 0.5} wag={t * (t > done ? 12 : 3)} />
          {t > didDo && t < together + 0.4 && (
            <Scale s={popS(t, didDo + 0.1, 10)} x={dogX + 50} y={378}>
              <Txt x={dogX + 50} y={378 - 4 * Math.abs(Math.sin(t * 3))} size={46} anchor="middle" color={M.coral} stroke={M.white}>
                ?
              </Txt>
            </Scale>
          )}
        </Scale>
        <Tick t={t} at={complete + 0.3} x={PERIOD.x + PERIOD.w + 46} y={PIECE_Y + 30} s={1.4} color={M.leaf} width={9} />
        <Sparkles t={t} at={complete + 0.2} x={480} y={PIECE_Y + PIECE_H / 2} r={300} n={12} seed={8} size={14} />
        <Twinkle t={t} at={done} x={NAMING.x + 20} y={PIECE_Y + 10} r={10} />
        <Twinkle t={t} at={done} x={PERIOD.x + PERIOD.w + 4} y={PIECE_Y + PIECE_H} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

// ── endmarks ─────────────────────────────────────────────────────────────────
type Pt = [number, number]
/** End-mark stroke shapes (relative to the glyph centre, unit = 1): collapsed (.), hook (?), bar (!). */
const MARK_SHAPES: Pt[][] = [
  [[0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14], [0, 14]],
  [[-26, -30], [-26, -64], [29, -68], [27, -32], [26, -10], [0, -8], [0, 13]],
  [[0, -64], [0, -50], [0, -36], [0, -24], [0, -10], [0, 0], [0, 12]],
]
/**
 * A morphing end mark: state 0 = period, 1 = question mark, 2 = exclamation
 * point (fractional states blend), centred on (x, y) at `scale`.
 */
function EndMark({ x, y: y0, state, scale = 1, color = M.ink }: { x: number; y: number; state: number; scale?: number; color?: string }) {
  const s = Math.max(0, Math.min(2, state))
  // a lone period sits centred in its badge; it settles to the baseline as a stroke grows above it
  const y = y0 - 30 * scale * (1 - Math.min(1, s))
  const i = Math.min(1, Math.floor(s))
  const f = s - i
  const pts = MARK_SHAPES[i].map(([ax, ay], k) => {
    const [bx, by] = MARK_SHAPES[i + 1][k]
    return [x + (ax + (bx - ax) * f) * scale, y + (ay + (by - ay) * f) * scale] as Pt
  })
  const d = `M ${pts[0][0]} ${pts[0][1]} C ${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]} ${pts[3][0]} ${pts[3][1]} C ${pts[4][0]} ${pts[4][1]} ${pts[5][0]} ${pts[5][1]} ${pts[6][0]} ${pts[6][1]}`
  const w = 15 * scale * Math.min(1, s * 1.6)
  return (
    <>
      {w > 0.3 && <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />}
      <circle cx={x} cy={y + 36 * scale} r={(10 + 5 * (1 - Math.min(1, s))) * scale} fill={color} />
    </>
  )
}

const CARDS = [
  { x: 36, label: 'telling', color: '#9fd3ff', text: 'I see a frog', mark: '.' },
  { x: 340, label: 'asking', color: M.lilac, text: 'Can frogs swim', mark: '?' },
  { x: 644, label: 'strong feeling', color: M.coral, text: 'Wow, it jumped', mark: '!' },
]
const CARD_W = 280
const CARD_Y = 172
const CARD_H = 300
const SLOT_Y = CARD_Y + 82
const cardCx = (i: number) => CARDS[i].x + CARD_W / 2

/**
 * writing/endmarks — "Every sentence ends with an end mark. A period ends a
 * telling sentence. A question mark ends an asking sentence. And an
 * exclamation point shows a strong feeling, like wow!"
 * One end mark travels and morphs: a dot drops into the "telling" card, then
 * grows a hook as it flies to the "asking" card (. → ?), then straightens into
 * a bar for the "strong feeling" card (? → !). Each card's example sentence
 * types itself in and gets the matching mark; "Wow" bounces on "wow".
 */
const endmarks: Scene = ({ t, cue }: SceneProps) => {
  const endMark = cue('end mark')
  const periodAt = cue('A period')
  const telling = cue('telling sentence')
  const qAt = cue('A question mark')
  const asking = cue('asking sentence')
  const exAt = cue('exclamation point')
  const strong = cue('strong feeling')
  const wow = cue('wow')
  const cardAt = [periodAt, qAt, exAt]
  const labelAt = [telling, asking, strong]
  // the travelling mark: centre top → card 1 (as .), → card 2 (. → ?), → card 3 (? → !)
  const legs = [
    { at: periodAt + 0.2, from: [480, 112] as Pt, to: [cardCx(0), SLOT_Y] as Pt, s0: 0, s1: 0 },
    { at: qAt + 0.2, from: [cardCx(0), SLOT_Y] as Pt, to: [cardCx(1), SLOT_Y] as Pt, s0: 0, s1: 1 },
    { at: exAt + 0.2, from: [cardCx(1), SLOT_Y] as Pt, to: [cardCx(2), SLOT_Y] as Pt, s0: 1, s1: 2 },
  ]
  const LEG = 0.85
  let gx = 480
  let gy = 112
  let gs = 0
  let gScale = 2.3
  let landed = -1
  legs.forEach((l, i) => {
    const k = ease.inOutCubic(progress(t, l.at, LEG))
    if (t >= l.at) {
      ;[gx, gy] = arc(k, l.from, l.to, 110)
      gs = l.s0 + (l.s1 - l.s0) * k
      gScale = i === 0 ? 2.3 - 1.3 * k : 1 + 0.25 * Math.sin(Math.PI * k)
      if (k >= 1) landed = i
    }
  })
  const glyphIn = popS(t, endMark + 0.1, 10)
  // the travelling copy shows while it is introduced and while it flies (cards hold their own marks)
  const travelling = t < legs[0].at + LEG || legs.some((l) => t > l.at && t < l.at + LEG)
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 250, zoom: 1.08 },
          { at: periodAt + 0.6, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Kinetic t={t} at={endMark - 0.15} text="End marks" x={480} y={56} size={48} color={M.ink} />
        {CARDS.map((c, i) => {
          const k = popS(t, cardAt[i], 12)
          const cx = cardCx(i)
          const words = layoutText(c.text, { x: cx - 8, y: CARD_Y + 236, size: 30, align: 'center', maxW: 240 })
          const lastW = words[words.length - 1]
          const markIn = landed >= i || (i < landed + 1 && t > legs[i].at + LEG)
          const markPop = spring(t, legs[i].at + LEG, { stiffness: 260, damping: 10 })
          const shake = i === 2 && t > wow && t < wow + 0.8 ? Math.sin((t - wow) * 30) * 3 * (1 - (t - wow) / 0.8) : 0
          const bob = t > legs[2].at + LEG + 1 ? Math.sin(t * 2 + i * 1.3) * 3 : 0
          return (
            <Scale key={i} s={k} x={cx} y={CARD_Y + CARD_H / 2} rot={shake}>
              <rect x={c.x} y={CARD_Y + 6} width={CARD_W} height={CARD_H} rx={24} fill={M.ink} />
              <rect x={c.x} y={CARD_Y} width={CARD_W} height={CARD_H} rx={24} fill={M.white} stroke={M.ink} strokeWidth={4} />
              <circle cx={cx} cy={SLOT_Y} r={64} fill={c.color} stroke={M.ink} strokeWidth={4} />
              <circle cx={cx - 18} cy={SLOT_Y - 22} r={9} fill="#fff" opacity={0.5} />
              {markIn && (
                <g transform={`translate(0 ${bob})`}>
                  <EndMark x={cx} y={SLOT_Y + 2} state={i} scale={0.84} />
                </g>
              )}
              <Scale s={popS(t, labelAt[i], 12)} x={cx} y={CARD_Y + 166}>
                <rect x={cx - (textW(c.label, 26) + 32) / 2} y={CARD_Y + 145} width={textW(c.label, 26) + 32} height={42} rx={21} fill={c.color} stroke={M.ink} strokeWidth={3} />
                <Txt x={cx} y={CARD_Y + 167} size={26} anchor="middle">
                  {c.label}
                </Txt>
              </Scale>
              {words.map((b, wi) => {
                const at = cardAt[i] + 0.35 + wi * 0.14
                const s = spring(t, at, { stiffness: 240, damping: 14 })
                if (s <= 0.01) return null
                const isWow = i === 2 && wi === 0
                const wb = isWow ? 1 + 0.45 * Math.sin(Math.PI * progress(t, wow - 0.05, 0.5)) : 1
                return (
                  <g key={wi} transform={`translate(${b.cx} ${b.y}) scale(${wb}) translate(${-b.cx} ${-b.y})`} opacity={Math.min(1, s * 2)}>
                    <Txt x={b.x} y={b.y + (1 - Math.min(1, s)) * 16} size={30} color={isWow && wb > 1.05 ? M.coral : M.ink}>
                      {b.text}
                    </Txt>
                  </g>
                )
              })}
              {markPop > 0.01 && (
                <g transform={`translate(${lastW.x + lastW.w + 12} ${lastW.y}) scale(${markPop}) translate(${-(lastW.x + lastW.w + 12)} ${-lastW.y})`}>
                  <Txt x={lastW.x + lastW.w + 1} y={lastW.y} size={34} color={CORAL_INK}>
                    {c.mark}
                  </Txt>
                </g>
              )}
            </Scale>
          )
        })}
        {/* the travelling, morphing mark */}
        {travelling && glyphIn > 0.01 && (
          <Scale s={glyphIn} x={gx} y={gy}>
            <EndMark x={gx} y={gy + 2} state={gs} scale={0.84 * gScale} color={M.ink} />
          </Scale>
        )}
        {legs.map((l, i) => (
          <Sparkles key={i} t={t} at={l.at + LEG} x={cardCx(i)} y={SLOT_Y} r={70} n={8} seed={i + 2} />
        ))}
        <Burst t={t} at={wow} x={cardCx(2)} y={SLOT_Y} color={M.gold} r={90} />
        <Sparkles t={t} at={wow + 0.05} x={cardCx(2) - 60} y={CARD_Y + 236} r={60} n={7} seed={9} />
        <Twinkle t={t} at={wow + 1} x={cardCx(2) + 60} y={SLOT_Y - 52} r={11} />
        <Twinkle t={t} at={wow + 1} x={cardCx(0) - 62} y={SLOT_Y + 40} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

export const writingScenes: Record<string, Scene> = { parts, example, fragments, endmarks }
