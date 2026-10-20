/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, progress, spring, wobble } from '../anim'
import { Burst, Draw, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Ball, Bear, Bus, Ear, LetterTile, PointerHand, STICKER } from './_kart'

/*
 * Kindergarten letters colour code (whole lesson): every letter sits on the
 * picture cards' cream tile, in the card's colour for that letter (A coral,
 * B gold, C mint): "big B", "little b" and the B that ball, bear and bus
 * start with all look like the same letter, on the stage and on the cards.
 * Nothing on the stage but letters and pictures.
 */
const B_COLOR = STICKER.gold
/** The lines from B to the words that start with it (a deeper gold, so they show on paper). */
const B_LINE = '#e0a800'

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A little speech bubble with sound lines over something being named; it pops in and out. */
function SayBubble({ t, at, x, y, out }: { t: number; at: number; x: number; y: number; out: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} out={out} bounce={10}>
      <T x={x} y={y}>
        <path d="M -40 -28 h 80 a 16 16 0 0 1 16 16 v 26 a 16 16 0 0 1 -16 16 h -32 l -14 16 l -2 -16 h -32 a 16 16 0 0 1 -16 -16 v -26 a 16 16 0 0 1 16 -16 Z" fill={M.white} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
        {[-20, 0, 20].map((dx) => (
          <circle key={dx} cx={dx} cy={1} r={6} fill={M.sea} />
        ))}
      </T>
    </Pop>
  )
}

const ABC: { ch: string; x: number; color: string }[] = [
  { ch: 'A', x: 230, color: STICKER.coral },
  { ch: 'B', x: 480, color: B_COLOR },
  { ch: 'C', x: 730, color: STICKER.mint },
]

/**
 * kLetters/names — "Letters have names! Here is the letter A. Here is B. And
 * here is C." Three blank tiles drop in on "names"; then A, B and C grow into
 * them, each with a little speech bubble as its name is said.
 */
const names: Scene = ({ t, cue }: SceneProps) => {
  const nm = cue('names')
  const at = [cue('letter A'), cue('Here is B'), cue('here is C')]
  return (
    <>
      <Paper />
      {ABC.map((l, i) => {
        const drop = spring(t, nm - 0.2 + i * 0.12, { stiffness: 200, damping: 12 })
        if (drop <= 0.001) return null
        const grow = spring(t, at[i] + 0.1, { stiffness: 240, damping: 10 })
        return (
          <g key={l.ch}>
            <T x={l.x} y={310 - (1 - Math.min(1, drop)) * 360 - bump(t, at[i] + 0.1, 0.4) * 22}>
              <LetterTile ch={l.ch} s={190} color={l.color} k={grow} />
            </T>
            <SayBubble t={t} at={at[i]} x={l.x + 74} y={150} out={at[i] + 1.1} />
          </g>
        )
      })}
    </>
  )
}

/**
 * kLetters/bigLittle — "Letters come big and little. This is big B. This is
 * little b. They are both B!" A big circle and a little one; then big B and
 * little b stand side by side on the same line, and an arc joins them.
 */
const bigLittle: Scene = ({ t, cue }: SceneProps) => {
  const bl = cue('big and little')
  const big = cue('big B')
  const little = cue('little b')
  const both = cue('both B')
  return (
    <>
      <Paper />
      {/* big and little */}
      <Pop t={t} at={bl} x={420} y={270} out={big - 0.3} bounce={11}>
        <circle cx={420} cy={270} r={110} fill={M.gold} stroke={M.ink} strokeWidth={4} />
      </Pop>
      <Pop t={t} at={bl + 0.35} x={620} y={325} out={big - 0.3} bounce={11}>
        <circle cx={620} cy={325} r={55} fill={M.gold} stroke={M.ink} strokeWidth={4} />
      </Pop>
      {/* the base line both letters stand on */}
      <Draw t={t} at={big - 0.1} dur={0.5} d="M 150 444 L 810 444" stroke="#d9c39a" width={6} />
      <Pop t={t} at={big + 0.1} x={340} y={315} bounce={11}>
        <T x={340} y={315 - bump(t, both + 0.3) * 26}>
          <LetterTile ch="B" s={250} color={B_COLOR} />
        </T>
      </Pop>
      <Pop t={t} at={little + 0.1} x={660} y={360} bounce={11}>
        <T x={660} y={360 - bump(t, both + 0.42) * 26}>
          <LetterTile ch="b" s={160} color={B_COLOR} />
        </T>
      </Pop>
      <Draw t={t} at={both - 0.05} dur={0.6} d="M 360 172 Q 520 40 660 262" stroke={M.coral} width={8} />
      <Pop t={t} at={both + 0.45} x={660} y={262} bounce={9}>
        <circle cx={660} cy={262} r={10} fill={M.coral} stroke={M.ink} strokeWidth={3} />
      </Pop>
      <Burst t={t} at={both + 0.5} x={500} y={110} r={80} />
    </>
  )
}

const WORDS: { x: number; y: number }[] = [
  { x: 210, y: 360 },
  { x: 480, y: 360 },
  { x: 750, y: 370 },
]

/**
 * kLetters/sounds — "Listen to how these words start. Ball. Bear. Bus. They
 * all start with B!" An ear listens; a ball, a bear and a bus pop in as they
 * are named; then a blue B lands on top and draws a line to each of them.
 */
const sounds: Scene = ({ t, cue }: SceneProps) => {
  const listen = cue('Listen')
  const word = [cue('Ball.'), cue('Bear.'), cue('Bus.')]
  const all = cue('start with B')
  const waves = ease.outCubic(progress(t, listen + 0.3, 0.6))
  return (
    <>
      <Paper />
      <Pop t={t} at={listen} x={480} y={128} out={all - 0.25} bounce={11}>
        <T x={480} y={128}>
          <Ear r={52} waves={waves} />
        </T>
      </Pop>
      {WORDS.map((w, i) => (
        <Draw key={`l${i}`} t={t} at={all + 0.35 + i * 0.15} dur={0.4} d={`M 480 196 L ${w.x} ${w.y - 98}`} stroke={B_LINE} width={6} />
      ))}
      {WORDS.map((w, i) => {
        const hop = bump(t, all + 0.75 + i * 0.15) * 26
        const art = i === 0 ? <Ball r={70} /> : i === 1 ? <Bear r={70} /> : <Bus w={200} />
        return (
          <Pop key={i} t={t} at={word[i]} x={w.x} y={w.y} bounce={10}>
            <T x={w.x} y={w.y - hop}>
              {art}
            </T>
          </Pop>
        )
      })}
      <Pop t={t} at={all} x={480} y={128} bounce={10}>
        <T x={480} y={128}>
          <LetterTile ch="B" s={124} color={B_COLOR} />
        </T>
      </Pop>
    </>
  )
}

/**
 * kLetters/yourTurn — "Your turn! Listen to the start of each word. Does it
 * start like ball?" A hand waves hello; an ear listens; the ball bounces in
 * under its blue B, and a ? asks which picture starts the same way.
 */
const yourTurn: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const listen = cue('Listen')
  const ball = cue('like ball')
  const waves = ease.outCubic(progress(t, listen + 0.3, 0.6))
  const drop = spring(t, ball, { stiffness: 190, damping: 10 })
  return (
    <>
      <Paper />
      <Pop t={t} at={listen} x={210} y={290} bounce={11}>
        <T x={210} y={290}>
          <Ear r={70} waves={waves} />
        </T>
      </Pop>
      {drop > 0.001 && (
        <T x={520} y={350 - (1 - drop) * 320} s={0.9 + 0.1 * Math.min(1, drop)}>
          <Ball r={84} />
        </T>
      )}
      <Pop t={t} at={ball + 0.35} x={520} y={150} bounce={10}>
        <T x={520} y={150}>
          <LetterTile ch="B" s={120} color={B_COLOR} />
        </T>
      </Pop>
      <Pop t={t} at={ball + 0.7} x={760} y={270} bounce={10}>
        <circle cx={760} cy={270} r={58} fill={M.white} stroke={M.ink} strokeWidth={4} />
        <Title x={760} y={275} size={80} color={M.sea}>
          ?
        </Title>
      </Pop>
      <Pop t={t} at={turn} x={872} y={505} bounce={11}>
        <T x={872} y={505} r={-30 + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand />
        </T>
      </Pop>
    </>
  )
}

export const kLettersScenes: Record<string, Scene> = { names, bigLittle, sounds, yourTurn }
