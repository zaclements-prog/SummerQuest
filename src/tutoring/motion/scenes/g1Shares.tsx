/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { useId } from 'react'
import { ease, lerp, progress, spring } from '../anim'
import { Burst, Draw, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { NumDisc, PointerHand } from './_kart'
import { ShareFigure, SHARE_COLOR } from '../../../games/listenPlay/sharesArt'
import { centroid, outline, polyPath, shares, type Point, type ShareCut } from '../../../games/listenPlay/shareGeometry'

/*
 * 1st grade equal shares (whole lesson): the pizza is Fair Share Falls' own
 * drawing, scaled up; a share being talked about glows gold, a share "taken"
 * is coloured blue (the cards' colour). Two friends watch. No words.
 */

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A pizza cut this way, its 100 × 100 drawing scaled `k` about (x, y). Shares can glow and spread apart. */
function Pizza({ x, y, k, cut, colored, glow = [], spread = 0, gk = 1 }: { x: number; y: number; k: number; cut: ShareCut; colored?: number; glow?: number[]; spread?: number; gk?: number }) {
  const parts = shares('circle', cut)
  // each share moves out from the middle by `spread` (in drawing units)
  if (spread > 0.01) {
    return (
      <g transform={`translate(${x - 50 * k} ${y - 50 * k}) scale(${k})`}>
        {parts.map((p, i) => {
          const c = centroid(p)
          const dx = c[0] - 50
          const dy = c[1] - 50
          const d = Math.hypot(dx, dy) || 1
          return (
            <g key={i} transform={`translate(${((dx / d) * spread).toFixed(2)} ${((dy / d) * spread).toFixed(2)})`}>
              <Slice poly={p} colored={i === colored} glow={glow.includes(i) ? gk : 0} />
            </g>
          )
        })}
      </g>
    )
  }
  return (
    <g transform={`translate(${x - 50 * k} ${y - 50 * k}) scale(${k})`}>
      <ShareFigure thing="pizza" cut={cut} colored={colored} under={(i, p) => (glow.includes(i) ? <path d={polyPath(p)} fill={M.gold} opacity={0.55 * gk} /> : null)} />
    </g>
  )
}

/** One share of the pizza on its own (cheese, crust edge, pepperoni clipped to it). */
function Slice({ poly, colored, glow }: { poly: Point[]; colored: boolean; glow: number }) {
  const id = `g1sl-${useId().replace(/:/g, '')}`
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={polyPath(poly)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <circle cx={50} cy={50} r={40} fill="#e9a95b" />
        <circle cx={50} cy={50} r={33} fill="#ffd36b" />
        {[22.5, 112.5, 202.5, 292.5].map((deg) => {
          const a = (deg * Math.PI) / 180
          return <circle key={deg} cx={50 + Math.cos(a) * 21} cy={50 + Math.sin(a) * 21} r={4.6} fill="#e0564a" stroke={M.ink} strokeWidth={1.4} />
        })}
        {colored && <path d={polyPath(poly)} fill={SHARE_COLOR} opacity={0.82} />}
        {glow > 0 && <path d={polyPath(poly)} fill={M.gold} opacity={0.55 * glow} />}
      </g>
      <path d={polyPath(poly)} fill="none" stroke={M.ink} strokeWidth={2.6} strokeLinejoin="round" />
      {/* the share being talked about: a gold edge (gold on cheese alone would hardly show) */}
      {glow > 0 && <path d={polyPath(poly)} fill="none" stroke="#ffb703" strokeWidth={3.2} strokeLinejoin="round" opacity={glow} />}
    </g>
  )
}

/** A friend: a round face, happy (1) or not so happy (0). */
function Friend({ x, y, happy = 1, color }: { x: number; y: number; happy?: number; color: string }) {
  const mouth = lerp(-6, 10, happy)
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={56} fill={color} stroke={M.ink} strokeWidth={4} />
      <circle cx={-19} cy={-10} r={6} fill={M.ink} />
      <circle cx={19} cy={-10} r={6} fill={M.ink} />
      <path d={`M -20 20 Q 0 ${20 + mouth} 20 20`} fill="none" stroke={M.ink} strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={-34} cy={10} r={7} fill={M.pink} opacity={0.6} />
      <circle cx={34} cy={10} r={7} fill={M.pink} opacity={0.6} />
    </g>
  )
}

const PX = 480
const PY = 280
const PK = 3.4

/**
 * g1Shares/fair — "Two friends share one pizza. Is this fair? No! One share
 * is too big. Fair shares are the same size. They are equal shares!" Two
 * friends either side of a pizza; on "Is this fair?" it is cut off the middle
 * and the shares spread apart; the big one glows on "too big", the friend
 * with the small one frowns; on "same size" it is cut through the middle
 * instead; both halves glow and both friends smile on "equal shares".
 */
const fair: Scene = ({ t, cue }: SceneProps) => {
  const friends = cue('Two friends')
  const isFair = cue('Is this fair')
  const tooBig = cue('too big')
  const same = cue('same size')
  const equal = cue('equal shares')
  const fixed = t >= same
  const spread = fixed ? 6 * ease.outCubic(progress(t, same + 0.3, 0.5)) : 6 * ease.outCubic(progress(t, isFair + 0.4, 0.5))
  const cut: ShareCut = t < isFair ? 'h2' : fixed ? 'h2' : 'u2'
  const plain = t < isFair
  return (
    <>
      <Paper />
      <Pop t={t} at={friends} x={120} y={300}>
        <Friend x={120} y={300} color="#ffd9c7" happy={fixed ? 1 : t >= tooBig ? 0 : 1} />
      </Pop>
      <Pop t={t} at={friends + 0.15} x={840} y={300}>
        <Friend x={840} y={300} color="#d6ecff" happy={1} />
      </Pop>
      <Glow t={t} at={equal} x={PX} y={PY} r={190} breathe={false} />
      <Pop t={t} at={friends + 0.3} x={PX} y={PY}>
        {plain ? (
          // the whole pizza, not cut yet
          <g transform={`translate(${PX - 50 * PK} ${PY - 50 * PK}) scale(${PK})`}>
            <Slice poly={outline('circle')} colored={false} glow={0} />
          </g>
        ) : (
          <Pizza x={PX} y={PY} k={PK} cut={cut} spread={spread} glow={fixed ? (t >= equal ? [0, 1] : []) : t >= tooBig ? [1] : []} />
        )}
      </Pop>
      <Burst t={t} at={equal + 0.2} x={PX} y={PY - 150} r={120} />
    </>
  )
}

/**
 * g1Shares/halves — "Two equal shares are called halves. Each share is one
 * half. Your turn!" A pizza cut in half; both halves glow on "halves"; on
 * "one half" one half lifts out and turns blue; a hand points on "Your turn".
 */
const halves: Scene = ({ t, cue }: SceneProps) => {
  const two = cue('Two equal')
  const called = cue('halves')
  const one = cue('one half')
  const turn = cue('Your turn')
  const lift = ease.outCubic(progress(t, one, 0.5))
  return (
    <>
      <Paper />
      <Pop t={t} at={two - 0.2} x={PX} y={PY}>
        <Pizza x={PX} y={PY} k={PK} cut="h2" spread={2 + 7 * lift} colored={t >= one ? 0 : undefined} glow={t >= called && t < one ? [0, 1] : []} />
      </Pop>
      {[0, 1].map((i) => (
        <Pop key={i} t={t} at={called + i * 0.25} x={PX + (i ? 90 : -90)} y={PY}>
          <T x={PX + (i ? 90 : -90)} y={PY}>
            <NumDisc n={i + 1} r={26} fill={M.white} />
          </T>
        </Pop>
      ))}
      {t >= turn && (
        <T x={PX + 200} y={PY + 30 + bump(t, turn + 0.6, 0.4) * 12} r={-30}>
          <PointerHand press={bump(t, turn + 0.6, 0.4)} />
        </T>
      )}
    </>
  )
}

/**
 * g1Shares/fourths — "Now cut each half again. Four equal shares! They are
 * called fourths, or quarters." A pizza cut in half; on "cut each half again"
 * a second line draws across it; the four shares spread a little and get 1–4
 * on "Four equal shares"; one turns blue on "fourths".
 */
const fourths: Scene = ({ t, cue }: SceneProps) => {
  const cutAt = cue('cut each half')
  const four = cue('Four equal')
  const called = cue('fourths')
  const after = t >= cutAt + 0.8
  const spread = 5 * ease.outCubic(progress(t, four, 0.5))
  const parts = shares('circle', 'q4')
  return (
    <>
      <Paper />
      {after ? (
        <Pizza x={PX} y={PY} k={PK} cut="q4" spread={spread} colored={t >= called ? 1 : undefined} glow={t >= four && t < called ? [0, 1, 2, 3] : []} />
      ) : (
        <>
          <Pizza x={PX} y={PY} k={PK} cut="h2" />
          <g transform={`translate(${PX - 50 * PK} ${PY - 50 * PK}) scale(${PK})`}>
            <Draw t={t} at={cutAt} dur={0.7} d="M 9 50 L 91 50" width={2.6} />
          </g>
        </>
      )}
      {parts.map((p, i) => {
        const c = centroid(p)
        const d = Math.hypot(c[0] - 50, c[1] - 50) || 1
        const x = PX + (c[0] - 50 + ((c[0] - 50) / d) * spread) * PK
        const y = PY + (c[1] - 50 + ((c[1] - 50) / d) * spread) * PK
        return (
          <Pop key={i} t={t} at={four + 0.15 + i * 0.2} x={x} y={y}>
            <T x={x} y={y}>
              <NumDisc n={i + 1} r={24} fill={M.white} />
            </T>
          </Pop>
        )
      })}
    </>
  )
}

/**
 * g1Shares/smaller — "More shares make smaller shares. A fourth is smaller
 * than a half. Your turn!" Two pizzas: one in halves with a half blue, one in
 * fourths with a fourth blue. On "A fourth" the blue fourth glows; on
 * "smaller than a half" a copy of it slides across onto the blue half, where
 * it covers only half of it.
 */
const smaller: Scene = ({ t, cue }: SceneProps) => {
  const more = cue('More shares')
  const fourth = cue('A fourth')
  const than = cue('than a half')
  const turn = cue('Your turn')
  const LX = 250
  const RX = 710
  const K = 2.6
  const fq = shares('circle', 'q4')[0]
  const slide = ease.inOutCubic(progress(t, than, 0.9))
  const s = spring(t, more, { stiffness: 200, damping: 14 })
  return (
    <>
      <Paper />
      <T x={0} y={0} o={Math.min(1, s * 1.5)}>
        <Pizza x={LX} y={PY} k={K} cut="h2" colored={0} />
        <Pizza x={RX} y={PY} k={K} cut="q4" colored={0} glow={t >= fourth && t < than ? [0] : []} />
      </T>
      {t >= than && (
        // the blue fourth, copied over onto the blue half: it covers just half of it
        <g transform={`translate(${lerp(RX, LX, slide) - 50 * K} ${PY - 50 * K - Math.sin(slide * Math.PI) * 40}) scale(${K})`}>
          <path d={polyPath(fq)} fill={SHARE_COLOR} stroke={M.ink} strokeWidth={2.6} strokeLinejoin="round" opacity={0.95} />
        </g>
      )}
      {t >= turn && (
        <T x={480} y={470 - bump(t, turn + 0.6, 0.4) * 12}>
          <PointerHand press={bump(t, turn + 0.6, 0.4)} />
        </T>
      )}
    </>
  )
}

export const g1SharesScenes: Record<string, Scene> = { fair, halves, fourths, smaller }
