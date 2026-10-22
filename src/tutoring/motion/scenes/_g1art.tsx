import { clamp, spring } from '../anim'
import { Title } from '../kit'
import { M } from '../palette'
import { STICKER } from './_kart'

/**
 * Art for the 1st-grade math lessons (g1Adding, g1Subtract, g1StoryMath):
 * the same flat, ink-outlined look as the kindergarten props, drawn centred
 * on (0, 0) so a scene moves them with a transform (<T>). Text is numerals
 * and math signs only.
 */

const OUT = 4

/** A box holding a number (count on from here), `s` px square. */
export function NumBox({ n, s = 150, fill = '#fde7c8', ink = STICKER.coral }: { n: number; s?: number; fill?: string; ink?: string }) {
  const size = String(n).length > 1 ? s * 0.56 : s * 0.68
  return (
    <g>
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.16} fill={fill} stroke={M.ink} strokeWidth={OUT} />
      <text y={s * 0.04} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={ink} stroke={M.ink} strokeWidth={size / 18} paintOrder="stroke fill">
        {n}
      </text>
    </g>
  )
}

/** A stepping stone with its number (a path to count back along), radius `r`. */
export function Stone({ n, r = 46, fill = '#e9e4dc' }: { n: number; r?: number; fill?: string }) {
  return (
    <g>
      <ellipse rx={r} ry={r * 0.72} fill={fill} stroke={M.ink} strokeWidth={OUT} />
      <text y={r * 0.04} fontFamily={M.font} fontWeight={700} fontSize={r * (n > 9 ? 0.78 : 0.95)} textAnchor="middle" dominantBaseline="central" fill={M.ink}>
        {n}
      </text>
    </g>
  )
}

/** A flower: five round petals around a centre (radius r). */
export function Flower({ r = 26, petal = STICKER.pink, centre = STICKER.gold }: { r?: number; petal?: string; centre?: string }) {
  return (
    <g>
      <path d={`M 0 ${r * 0.6} L 0 ${r * 1.7}`} stroke={M.leaf} strokeWidth={r * 0.22} strokeLinecap="round" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        return <circle key={i} cx={Math.cos(a) * r * 0.62} cy={Math.sin(a) * r * 0.62} r={r * 0.45} fill={petal} stroke={M.ink} strokeWidth={3} />
      })}
      <circle r={r * 0.36} fill={centre} stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

/** A crossed-out spot: what was taken away (radius r). */
export function CrossOut({ r = 30, k = 1 }: { r?: number; k?: number }) {
  const d = r * 0.62 * k
  return (
    <g>
      <circle r={r} fill="none" stroke={M.ink} strokeOpacity={0.4} strokeWidth={3} strokeDasharray="7 6" />
      <path d={`M ${-d} ${-d} L ${d} ${d} M ${d} ${-d} L ${-d} ${d}`} stroke={STICKER.coral} strokeWidth={7} strokeLinecap="round" />
    </g>
  )
}

/** A dashed empty spot (radius r). */
export function EmptySpot({ r = 30 }: { r?: number }) {
  return <circle r={r} fill="#fff3c4" stroke={M.ink} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="8 6" />
}

/** A puffy cloud (width w). */
export function Cloud({ w = 220 }: { w?: number }) {
  const h = w * 0.42
  return (
    <path
      d={`M ${-w / 2} ${h * 0.3} Q ${-w / 2} ${-h * 0.2} ${-w * 0.25} ${-h * 0.15} Q ${-w * 0.2} ${-h * 0.62} ${w * 0.05} ${-h * 0.5} Q ${w * 0.3} ${-h * 0.7} ${w * 0.35} ${-h * 0.1} Q ${w / 2} ${-h * 0.1} ${w / 2} ${h * 0.3} Z`}
      fill="#ffffff"
      stroke={M.ink}
      strokeWidth={OUT}
      strokeLinejoin="round"
    />
  )
}

/** The fact-family house's frame: a roof (its peak at y = −h/2) over a body (width w, body height h * 0.6). */
export function House({ w = 560, h = 420 }: { w?: number; h?: number }) {
  const roofH = h * 0.4
  const top = -h / 2
  return (
    <g strokeLinejoin="round">
      <path d={`M ${-w / 2 - 24} ${top + roofH} L 0 ${top} L ${w / 2 + 24} ${top + roofH} Z`} fill="#f2a65a" stroke={M.ink} strokeWidth={OUT + 1} />
      <rect x={-w / 2} y={top + roofH} width={w} height={h - roofH} rx={16} fill="#fffaf0" stroke={M.ink} strokeWidth={OUT + 1} />
    </g>
  )
}

/**
 * A number sentence written token by token ("8 + 3 = ?"): each token springs
 * in at its time (`at`: one time per token, or a start and 0.18 s apart); a
 * `'?'` is a dashed box until `solveAt`, when `answer` pops into it. The
 * layout is fixed from the start, centred on `x`.
 */
export function SentenceLine({
  t,
  x,
  y,
  size = 72,
  tokens,
  at,
  solveAt,
  answer,
  dx,
}: {
  t: number
  x: number
  y: number
  size?: number
  tokens: readonly (number | string)[]
  at: number | readonly number[]
  solveAt?: number
  answer?: number
  /** Per-token sideways offsets (a turn-around: two numbers swap places). */
  dx?: readonly number[]
}) {
  const widths = tokens.map((tk) => (tk === '?' ? size * 1.15 : String(tk).length * size * 0.62 + size * 0.3))
  const total = widths.reduce((a, b) => a + b, 0)
  const lefts = widths.map((_, i) => x - total / 2 + widths.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <>
      {tokens.map((tk, i) => {
        const w = widths[i]
        const mid = lefts[i] + w / 2 + (dx?.[i] ?? 0)
        const when = typeof at === 'number' ? at + i * 0.18 : at[i]
        const s = spring(t, when, { stiffness: 260, damping: 14 })
        if (s <= 0.001) return null
        const o = clamp(s * 2)
        if (tk === '?') {
          const solved = solveAt !== undefined && answer !== undefined && t >= solveAt
          const k = solved ? spring(t, solveAt!, { stiffness: 260, damping: 13 }) : 0
          return (
            <g key={i} transform={`translate(${mid} ${y}) scale(${s})`} opacity={o}>
              <rect x={-w / 2 + 6} y={-size * 0.58} width={w - 12} height={size * 1.16} rx={size * 0.18} fill={solved ? '#d6f5c9' : '#fff3c4'} stroke={M.ink} strokeWidth={4} strokeDasharray={solved ? undefined : '12 9'} />
              {solved ? (
                <g transform={`scale(${k})`}>
                  <Title x={0} y={size * 0.04} size={size * (String(answer).length > 1 ? 0.78 : 0.92)} color={STICKER.mint} stroke={M.ink}>
                    {answer}
                  </Title>
                </g>
              ) : (
                <text y={size * 0.04} fontFamily={M.font} fontWeight={700} fontSize={size * 0.7} textAnchor="middle" dominantBaseline="middle" fill={M.ink} opacity={0.45}>
                  ?
                </text>
              )}
            </g>
          )
        }
        return (
          <g key={i} transform={`translate(${mid} ${y}) scale(${s})`} opacity={o}>
            <Title x={0} y={size * 0.04} size={size} color={M.ink} stroke={M.white}>
              {tk}
            </Title>
          </g>
        )
      })}
    </>
  )
}
