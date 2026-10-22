/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, wobble } from '../anim'
import { Burst, Paper, Pop, T } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { LetterTile, PointerHand, STICKER } from './_kart'

/*
 * Word Reef (1st grade) colour code (whole lesson): the letters and words
 * being learned are printed in Andika, the beginning-reader font, as on the
 * Word Reef screens; the sound being said lights up MARKER YELLOW behind its
 * letters (as the voice reads, on screen too); a letter team is two tiles
 * joined by a CORAL band. Pictures are the emoji the cards show. Nothing else
 * is printed.
 */

const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"
const MARKER = '#ffe066'

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** An emoji picture, centred on (0, 0), `s` across. */
function Pic({ emoji, s = 150 }: { emoji: string; s?: number }) {
  return (
    <text x={0} y={s * 0.04} fontSize={s * 0.8} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
      {emoji}
    </text>
  )
}

/**
 * A printed piece (a letter, a letter team, a word) in Andika, centred on
 * (x, y), with a marker-yellow glow behind it while `lit` (0–1).
 */
function Print({ text, x, y, size, lit = 0, w, color = M.ink }: { text: string; x: number; y: number; size: number; lit?: number; w: number; color?: string }) {
  return (
    <g>
      {lit > 0.01 && <rect x={x - w / 2} y={y - size * 0.55} width={w} height={size * 1.1} rx={size * 0.18} fill={MARKER} opacity={Math.min(1, lit)} />}
      <text x={x} y={y + size * 0.03} fontFamily={M.letters} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={color}>
        {text}
      </text>
    </g>
  )
}

/** How lit something is at t: on from `at` (fading in), off again at `off`. */
const litAt = (t: number, at: number, off = Infinity) => ease.outCubic(progress(t, at - 0.05, 0.15)) * (1 - ease.outCubic(progress(t, off - 0.05, 0.2)))

/**
 * g1Reading/middle — "Listen to the middle of a word. Cat. Kuh… aa… tuh. The
 * A in the middle says aa!" A cat pops in; the tiles c, a, t pop in as each
 * sound is said, each glowing; on "middle" the a bounces with a coral ring.
 */
const middle: Scene = ({ t, cue }: SceneProps) => {
  const cat = cue('Cat.')
  const sounds = [cue('Kuh'), cue('aa…'), cue('tuh')]
  const mid = cue('in the middle')
  const says = cue('says aa')
  const xs = [470, 640, 810]
  return (
    <>
      <Paper />
      <Pop t={t} at={cat} x={190} y={270} bounce={10}>
        <T x={190} y={270 - bump(t, says + 0.2) * 24}>
          <Pic emoji="🐱" s={230} />
        </T>
      </Pop>
      {xs.map((x, i) => {
        const glow = litAt(t, sounds[i], i < 2 ? sounds[i + 1] : mid)
        const midGlow = i === 1 ? litAt(t, mid) : 0
        return (
          <Pop key={i} t={t} at={sounds[i]} x={x} y={270} bounce={11}>
            <T x={x} y={270 - (i === 1 ? bump(t, mid + 0.1, 0.4) * 34 + bump(t, says + 0.1) * 20 : 0)}>
              {(glow > 0.01 || midGlow > 0.01) && <rect x={-86} y={-86} width={172} height={172} rx={40} fill={MARKER} opacity={Math.max(glow, midGlow)} />}
              <LetterTile ch={['c', 'a', 't'][i]} s={150} color={i === 1 ? STICKER.coral : STICKER.blue} />
              {i === 1 && midGlow > 0.01 && <circle r={104} fill="none" stroke={M.coral} strokeWidth={8} opacity={midGlow} />}
            </T>
          </Pop>
        )
      })}
      <Burst t={t} at={says + 0.3} x={640} y={150} r={80} />
    </>
  )
}

/**
 * g1Reading/teams — "Some letters team up to make one sound. S and H say shh,
 * like ship and shell!" Two tiles, s and h, pop in apart; on "team up" they
 * slide together and a coral band joins them; on "shh" a breath of air puffs
 * out; a ship and a shell pop in as they are named.
 */
const teams: Scene = ({ t, cue }: SceneProps) => {
  const letters = cue('letters')
  const team = cue('team up')
  const shh = cue('say shh')
  const ship = cue('ship')
  const shell = cue('shell')
  const k = ease.inOutCubic(progress(t, team, 0.7))
  const sx = lerp(300, 395, k)
  const hx = lerp(660, 565, k)
  const band = ease.outBack(progress(t, team + 0.6, 0.4))
  const puff = progress(t, shh + 0.2, 0.9)
  return (
    <>
      <Paper />
      {band > 0.01 && <rect x={300} y={115} width={360} height={190} rx={50} fill="none" stroke={M.coral} strokeWidth={10} opacity={Math.min(1, band)} transform={`translate(480 210) scale(${0.9 + 0.1 * band}) translate(-480 -210)`} />}
      <Pop t={t} at={letters} x={sx} y={210} bounce={11}>
        <T x={sx} y={210 - bump(t, shh) * 18}>
          <LetterTile ch="s" s={150} color={STICKER.coral} />
        </T>
      </Pop>
      <Pop t={t} at={letters + 0.25} x={hx} y={210} bounce={11}>
        <T x={hx} y={210 - bump(t, shh) * 18}>
          <LetterTile ch="h" s={150} color={STICKER.coral} />
        </T>
      </Pop>
      {puff > 0 && puff < 1 && (
        <g opacity={1 - puff} fill="none" stroke={M.sea} strokeWidth={7} strokeLinecap="round">
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M ${690 + puff * 60} ${160 + i * 45} q 30 -14 60 0`} />
          ))}
        </g>
      )}
      <Pop t={t} at={ship} x={330} y={430} bounce={10}>
        <T x={330} y={430}>
          <Pic emoji="🚢" s={150} />
        </T>
      </Pop>
      <Pop t={t} at={shell} x={630} y={430} bounce={10}>
        <T x={630} y={430}>
          <Pic emoji="🐚" s={140} />
        </T>
      </Pop>
    </>
  )
}

/**
 * g1Reading/read — "Now read a word. Sound it out: shh… ih… puh. Put the
 * sounds together. Ship!" The word ship is printed big, its pieces apart:
 * sh, i, p glow as each sound is said; on "together" they slide together;
 * on "Ship!" the whole word glows and a ship sails in.
 */
const read: Scene = ({ t, cue }: SceneProps) => {
  const word = cue('read a word')
  const sounds = [cue('shh…'), cue('ih…'), cue('puh')]
  const together = cue('together')
  const ship = cue('Ship!')
  const k = ease.inOutCubic(progress(t, together, 0.7))
  const gap = lerp(70, 0, k)
  // the pieces' widths at size 150 (Andika): sh, i, p
  const ws = [150, 52, 86]
  const total = ws.reduce((a, b) => a + b, 0) + gap * 2
  let x = 480 - total / 2
  const xs = ws.map((w) => {
    const c = x + w / 2
    x += w + gap
    return c
  })
  const all = litAt(t, ship)
  const sail = ease.outCubic(progress(t, ship, 0.9))
  return (
    <>
      <Paper />
      <Pop t={t} at={word} x={480} y={250} bounce={12}>
        {all > 0.01 && <rect x={480 - total / 2 - 20} y={250 - 90} width={total + 40} height={180} rx={34} fill={MARKER} opacity={all} />}
        {['sh', 'i', 'p'].map((u, i) => (
          <Print key={i} text={u} x={xs[i]} y={250 - bump(t, sounds[i]) * 16} size={150} w={ws[i] + 18} lit={all > 0.01 ? 0 : litAt(t, sounds[i], i < 2 ? sounds[i + 1] : together)} />
        ))}
      </Pop>
      {sail > 0.001 && (
        <T x={lerp(1080, 480, sail)} y={440 + wobble(t, ship + 0.9, { amp: 6, freq: 0.8, decay: 0.4 })}>
          <Pic emoji="🚢" s={150} />
        </T>
      )}
      <Burst t={t} at={ship + 0.5} x={480} y={250} r={150} />
    </>
  )
}

/**
 * g1Reading/along — "When we read along, each word lights up. The cat is on
 * the mat. Your turn!" A sentence strip lands; each word lights up marker
 * yellow as it is said; on "Your turn!" the hand waves in under it.
 */
const along: Scene = ({ t, cue }: SceneProps) => {
  const land = cue('read along')
  const words = ['The', 'cat', 'is', 'on', 'the', 'mat.']
  const at = [cue('The cat'), cue('cat is'), cue('is on'), cue('on the'), cue('the mat'), cue('mat.')]
  const turn = cue('Your turn')
  // word widths at size 70 (Andika), and the strip
  const ws = words.map((w) => w.length * 36 + 18)
  const gap = 22
  const total = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1)
  let x = 480 - total / 2
  const xs = ws.map((w) => {
    const c = x + w / 2
    x += w + gap
    return c
  })
  return (
    <>
      <Paper />
      <Pop t={t} at={land} x={480} y={240} bounce={12}>
        <rect x={480 - total / 2 - 36} y={240 - 72} width={total + 72} height={144} rx={30} fill={M.white} stroke={M.ink} strokeWidth={4} />
        {words.map((w, i) => (
          <Print key={i} text={w} x={xs[i]} y={240} size={70} w={ws[i]} lit={litAt(t, at[i], i < words.length - 1 ? at[i + 1] : turn)} />
        ))}
      </Pop>
      <Pop t={t} at={at[1]} x={300} y={430} bounce={10}>
        <T x={300} y={430}>
          <Pic emoji="🐱" s={120} />
        </T>
      </Pop>
      <Pop t={t} at={turn} x={760} y={505} bounce={11}>
        <T x={760} y={505} r={-30 + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand />
        </T>
      </Pop>
      <Burst t={t} at={turn} x={480} y={240} r={90} color={DEEP.gold} />
    </>
  )
}

export const g1ReadingScenes: Record<string, Scene> = { middle, teams, read, along }
