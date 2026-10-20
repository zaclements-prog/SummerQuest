/* eslint-disable react-refresh/only-export-components -- scene art helpers, not an HMR boundary */
import { M } from '../palette'
import { shade, tint } from '../layout'

/**
 * Art for the kindergarten lessons (kCounting, kShapes, kLetters): big, flat,
 * ink-outlined props that read at a glance, drawn centred on (0, 0) so a scene
 * moves them with a transform (<T>). No text but numerals and letters.
 */

const OUT = 4

/** The picture cards' sticker colours (src/games/listenPlay/PictureCard), so a stage shape matches its card. */
export const STICKER = {
  coral: '#f2766b',
  gold: '#ffcf4d',
  mint: '#74d3bd',
  blue: '#8ab8ff',
  lilac: '#b79af0',
  pink: '#f7a1c4',
} as const

/**
 * A pointing hand, fingertip at (0, 0), finger pointing down. `press` 0…1
 * curls it a little (a tap). About 7 elements.
 */
export function PointerHand({ press = 0 }: { press?: number }) {
  const skin = '#f6d2ad'
  const dy = -press * 6
  return (
    <g transform={`translate(0 ${dy})`}>
      {/* sleeve */}
      <rect x={-26} y={-168} width={62} height={34} rx={10} fill={M.sea} stroke={M.ink} strokeWidth={OUT} />
      {/* palm */}
      <rect x={-30} y={-140} width={66} height={64} rx={26} fill={skin} stroke={M.ink} strokeWidth={OUT} />
      {/* thumb */}
      <ellipse cx={-30} cy={-104} rx={13} ry={20} fill={skin} stroke={M.ink} strokeWidth={OUT} transform="rotate(-24 -30 -104)" />
      {/* pointing finger */}
      <rect x={-12} y={-92} width={24} height={92} rx={12} fill={skin} stroke={M.ink} strokeWidth={OUT} />
      <path d="M -6 -16 Q 0 -12 6 -16" fill="none" stroke={shade(skin, 0.35)} strokeWidth={3} strokeLinecap="round" />
      {/* curled fingers */}
      <path d="M 14 -86 Q 34 -84 34 -98" fill="none" stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
    </g>
  )
}

/** A fish facing left (length ~ 2.2 r). */
export function Fish({ r = 34, color = STICKER.coral, flip = false }: { r?: number; color?: string; flip?: boolean }) {
  return (
    <g transform={flip ? 'scale(-1 1)' : undefined}>
      <path d={`M ${r * 0.8} 0 L ${r * 1.45} ${-r * 0.62} L ${r * 1.38} ${r * 0.62} Z`} fill={shade(color, 0.12)} stroke={M.ink} strokeWidth={OUT} strokeLinejoin="round" />
      <ellipse cx={0} cy={0} rx={r} ry={r * 0.68} fill={color} stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${r * 0.1} ${-r * 0.62} Q ${r * 0.35} ${-r * 0.95} ${r * 0.62} ${-r * 0.52}`} fill={shade(color, 0.12)} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={-r * 0.5} cy={-r * 0.14} r={r * 0.15} fill={M.ink} />
      <circle cx={-r * 0.54} cy={-r * 0.19} r={r * 0.05} fill={M.white} />
    </g>
  )
}

/**
 * A letter on a cream tile (the picture cards' letter tile). `s` = tile size;
 * `k` (0…1+) grows the letter in, so a blank tile can get its letter as it is named.
 */
export function LetterTile({ ch, s = 160, color = STICKER.coral, k = 1 }: { ch: string; s?: number; color?: string; k?: number }) {
  const r = s * 0.22
  return (
    <g>
      <rect x={-s / 2} y={-s / 2 + s * 0.05} width={s} height={s} rx={r} fill="#ecc28f" stroke={M.ink} strokeWidth={OUT} />
      <rect x={-s / 2} y={-s / 2} width={s} height={s * 0.97} rx={r} fill="#fdf3dc" stroke={M.ink} strokeWidth={OUT} />
      {k > 0.001 && (
      <text
        transform={Math.abs(k - 1) > 0.002 ? `scale(${k})` : undefined}
        x={0}
        y={-s * 0.02}
        fontFamily={M.font}
        fontWeight={700}
        fontSize={s * 0.72}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        stroke={M.ink}
        strokeWidth={Math.min(8, s * 0.036)}
        strokeLinejoin="round"
        paintOrder="stroke fill"
      >
        {ch}
      </text>
      )}
    </g>
  )
}

/** A numeral in a gold disc (the counted number). */
export function NumDisc({ n, r = 30, fill = M.gold, ink = M.ink }: { n: number | string; r?: number; fill?: string; ink?: string }) {
  return (
    <g>
      <circle r={r} fill={fill} stroke={M.ink} strokeWidth={OUT} />
      <text y={r * 0.06} fontFamily={M.font} fontWeight={700} fontSize={r * 1.25} textAnchor="middle" dominantBaseline="central" fill={ink}>
        {n}
      </text>
    </g>
  )
}

/** A bouncy red ball with a gold stripe (radius r). */
export function Ball({ r = 60 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill={STICKER.coral} stroke={M.ink} strokeWidth={OUT} />
      <path d={`M ${-r * 0.94} ${-r * 0.1} Q 0 ${r * 0.42} ${r * 0.94} ${-r * 0.1}`} fill="none" stroke={STICKER.gold} strokeWidth={r * 0.24} strokeLinecap="butt" />
      <circle r={r} fill="none" stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={-r * 0.4} cy={-r * 0.42} rx={r * 0.2} ry={r * 0.12} fill={M.white} opacity={0.75} transform={`rotate(-35 ${-r * 0.4} ${-r * 0.42})`} />
    </g>
  )
}

/** A friendly bear face (radius r). */
export function Bear({ r = 60 }: { r?: number }) {
  const fur = '#c7955f'
  const snout = '#f1d9a6'
  return (
    <g>
      <circle cx={-r * 0.72} cy={-r * 0.72} r={r * 0.32} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <circle cx={r * 0.72} cy={-r * 0.72} r={r * 0.32} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <circle r={r} fill={fur} stroke={M.ink} strokeWidth={OUT} />
      <ellipse cx={0} cy={r * 0.34} rx={r * 0.42} ry={r * 0.32} fill={snout} stroke={M.ink} strokeWidth={3} />
      <ellipse cx={0} cy={r * 0.2} rx={r * 0.14} ry={r * 0.1} fill={M.ink} />
      <circle cx={-r * 0.36} cy={-r * 0.12} r={r * 0.09} fill={M.ink} />
      <circle cx={r * 0.36} cy={-r * 0.12} r={r * 0.09} fill={M.ink} />
      <path d={`M ${-r * 0.12} ${r * 0.44} Q 0 ${r * 0.54} ${r * 0.12} ${r * 0.44}`} fill="none" stroke={M.ink} strokeWidth={3} strokeLinecap="round" />
    </g>
  )
}

/** A little school-bus-yellow bus, side view (width w). */
export function Bus({ w = 170 }: { w?: number }) {
  const h = w * 0.56
  const body = STICKER.gold
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.2} fill={body} stroke={M.ink} strokeWidth={OUT} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={-w / 2 + w * 0.08 + i * w * 0.24} y={-h / 2 + h * 0.14} width={w * 0.19} height={h * 0.3} rx={6} fill={tint(M.sea, 0.45)} stroke={M.ink} strokeWidth={3} />
      ))}
      <rect x={w / 2 - w * 0.17} y={-h / 2 + h * 0.14} width={w * 0.11} height={h * 0.58} rx={5} fill={tint(M.sea, 0.45)} stroke={M.ink} strokeWidth={3} />
      <circle cx={-w * 0.28} cy={h / 2} r={h * 0.2} fill="#4a3c48" stroke={M.ink} strokeWidth={OUT} />
      <circle cx={w * 0.28} cy={h / 2} r={h * 0.2} fill="#4a3c48" stroke={M.ink} strokeWidth={OUT} />
    </g>
  )
}

/** An ear with two sound waves (listen!); `waves` 0…1 grows them. */
export function Ear({ r = 54, waves = 1 }: { r?: number; waves?: number }) {
  const skin = '#f6d2ad'
  return (
    <g>
      <path
        d={`M ${r * 0.1} ${r * 0.95} C ${-r * 0.75} ${r * 0.95} ${-r * 0.8} ${-r} ${r * 0.05} ${-r} C ${r * 0.85} ${-r} ${r * 0.95} ${-r * 0.1} ${r * 0.45} ${r * 0.3} C ${r * 0.2} ${r * 0.5} ${r * 0.45} ${r * 0.95} ${r * 0.1} ${r * 0.95} Z`}
        fill={skin}
        stroke={M.ink}
        strokeWidth={OUT}
        strokeLinejoin="round"
      />
      <path d={`M ${-r * 0.15} ${r * 0.2} C ${-r * 0.35} ${-r * 0.55} ${r * 0.45} ${-r * 0.6} ${r * 0.3} ${-r * 0.05}`} fill="none" stroke={shade(skin, 0.35)} strokeWidth={5} strokeLinecap="round" />
      {waves > 0.01 &&
        [0, 1].map((i) => {
          const rr = r * (1.25 + i * 0.4)
          return (
            <path
              key={i}
              d={`M ${-rr * 0.5} ${-rr * 0.87} A ${rr} ${rr} 0 0 0 ${-rr * 0.5} ${rr * 0.87}`}
              transform={`translate(${-r * 0.35} 0)`}
              fill="none"
              stroke={M.sea}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={waves}
            />
          )
        })}
    </g>
  )
}

/** A cube in the picture cards' look (front face s × s), centred on its front face. */
export function Cube({ s = 150, color = STICKER.blue }: { s?: number; color?: string }) {
  const d = s * 0.34
  const h = s / 2
  return (
    <g strokeLinejoin="round">
      <polygon points={`${-h},${-h} ${-h + d},${-h - d} ${h + d},${-h - d} ${h},${-h}`} fill={tint(color, 0.45)} stroke={M.ink} strokeWidth={OUT} />
      <polygon points={`${h},${-h} ${h + d},${-h - d} ${h + d},${h - d} ${h},${h}`} fill={shade(color, 0.22)} stroke={M.ink} strokeWidth={OUT} />
      <rect x={-h} y={-h} width={s} height={s} fill={color} stroke={M.ink} strokeWidth={OUT} />
    </g>
  )
}

/** A soft ink shadow on the ground under something (an ellipse). */
export function GroundShadow({ w = 120, o = 0.18 }: { w?: number; o?: number }) {
  return <ellipse cx={0} cy={0} rx={w / 2} ry={w * 0.09} fill={M.ink} opacity={o} />
}
