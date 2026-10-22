/* eslint-disable react-refresh/only-export-components -- a registry of drawings (data) plus their drawing; not an HMR boundary */
import type { ReactNode } from 'react'
import { M } from '../../tutoring/motion/palette'
import { THING_BASE, allShareArt, outline, polyPath, shareArtName, shares, type Point, type ShareArt, type ShareThing } from './shareGeometry'

/**
 * Fair Share Falls' drawings (1st grade, 1.G.3): a pizza, a pie, a sandwich,
 * a cake or a garden seen from above, cut into shares with ink lines, maybe
 * one share coloured in (blue). Flat and ink-outlined in the 100 × 100 box
 * like every other card picture, nothing to read. The shares come from
 * ./shareGeometry, so equal shares are exactly equal.
 *
 * Every share drawing is in the `art` registry under its name
 * (`shareArtName`), and `ShareFigure` draws one with tappable shares.
 */

const INK = M.ink
/** A share coloured in. */
export const SHARE_COLOR = '#6aa7ff'

/** What a thing looks like under its cut lines. */
function Food({ thing }: { thing: ShareThing }): ReactNode {
  const base = THING_BASE[thing]
  const out = polyPath(outline(base))
  switch (thing) {
    case 'pizza':
      return (
        <>
          <path d={out} fill="#e9a95b" />
          <circle cx={50} cy={50} r={33} fill="#ffd36b" />
          {[22.5, 112.5, 202.5, 292.5].map((deg) => {
            const a = (deg * Math.PI) / 180
            return <circle key={deg} cx={50 + Math.cos(a) * 21} cy={50 + Math.sin(a) * 21} r={4.6} fill="#e0564a" stroke={INK} strokeWidth={1.4} />
          })}
          {[67.5, 157.5, 247.5, 337.5].map((deg) => {
            const a = (deg * Math.PI) / 180
            return <circle key={deg} cx={50 + Math.cos(a) * 11} cy={50 + Math.sin(a) * 11} r={3.4} fill="#e0564a" stroke={INK} strokeWidth={1.2} />
          })}
        </>
      )
    case 'pie':
      return (
        <>
          <path d={out} fill="#d8934a" />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2
            return <circle key={i} cx={50 + Math.cos(a) * 37} cy={50 + Math.sin(a) * 37} r={3.2} fill="#e8a95e" />
          })}
          <circle cx={50} cy={50} r={31} fill="#f4c76f" />
          <circle cx={50} cy={50} r={22} fill="#f7d68f" opacity={0.6} />
        </>
      )
    case 'sandwich':
      return (
        <>
          <path d={out} fill="#c98a4b" />
          <rect x={19} y={19} width={62} height={62} fill="#f8deb0" />
          <rect x={19} y={19} width={62} height={62} fill="none" stroke="#e7c48c" strokeWidth={2} />
        </>
      )
    case 'cake':
      return (
        <>
          <path d={out} fill="#f7a1c4" />
          <rect x={11} y={27} width={78} height={46} fill="#fcd0e2" />
          {[0, 1, 2, 3, 4, 5].map((c) =>
            [0, 1, 2].map((r) => (
              <rect key={`${c}${r}`} x={17 + c * 13.6} y={33 + r * 14} width={5} height={2.4} rx={1.2} fill={['#8ab8ff', '#ffcf4d', '#74d3bd'][(c + r) % 3]} transform={`rotate(${(c * 37 + r * 23) % 60 - 30} ${19.5 + c * 13.6} ${34.2 + r * 14})`} />
            )),
          )}
        </>
      )
    case 'garden':
      return (
        <>
          <path d={out} fill="#a8714a" />
          <rect x={11} y={27} width={78} height={46} fill="#bf8a5c" />
          {[0, 1, 2, 3, 4, 5].map((c) =>
            [0, 1, 2].map((r) => {
              const x = 18 + c * 13
              const y = 38 + r * 14
              // a little sprout: a stem and two leaves
              return (
                <g key={`${c}${r}`}>
                  <path d={`M ${x} ${y + 1} L ${x} ${y - 3}`} stroke="#3c9446" strokeWidth={1.8} strokeLinecap="round" />
                  <ellipse cx={x - 2.4} cy={y - 4.2} rx={2.4} ry={1.3} fill="#5fb85a" transform={`rotate(-30 ${x - 2.4} ${y - 4.2})`} />
                  <ellipse cx={x + 2.4} cy={y - 4.2} rx={2.4} ry={1.3} fill="#5fb85a" transform={`rotate(30 ${x + 2.4} ${y - 4.2})`} />
                </g>
              )
            }),
          )}
        </>
      )
  }
}

export interface ShareFigureProps extends ShareArt {
  /** Extra drawn on a share (a glow, a badge), by index; drawn under the cut lines. */
  under?: (i: number, poly: Point[]) => ReactNode
  /** Each share as a tap target: its props (role, handlers, data attributes). */
  regionProps?: (i: number) => Record<string, unknown>
}

/** A thing cut into shares (one maybe coloured in), drawn into the 100 × 100 box (a `<g>`, for an `<svg>` of your own). */
export function ShareFigure({ thing, cut, colored, turn = 0, under, regionProps }: ShareFigureProps) {
  const base = THING_BASE[thing]
  const parts = shares(base, cut, turn)
  const out = polyPath(outline(base))
  const clipId = `share-clip-${thing}`
  return (
    <g data-share={`${thing}-${cut}`}>
      <defs>
        <clipPath id={clipId}>
          <path d={out} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <Food thing={thing} />
        {parts.map((p, i) => (
          <g key={`u${i}`}>
            {i === colored && <path d={polyPath(p)} fill={SHARE_COLOR} opacity={0.82} data-colored="" />}
            {under?.(i, p)}
          </g>
        ))}
      </g>
      {/* the cut lines: each share's edge */}
      {parts.map((p, i) => (
        <path key={`l${i}`} d={polyPath(p)} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      ))}
      <path d={out} fill="none" stroke={INK} strokeWidth={3.6} strokeLinejoin="round" />
      {regionProps && parts.map((p, i) => <path key={`t${i}`} d={polyPath(p)} fill="transparent" {...regionProps(i)} />)}
    </g>
  )
}

/** Every share drawing, by name, for the `art` registry (src/games/listenPlay/drawings.tsx). */
export const G1_SHARE_DRAWINGS: Record<string, () => ReactNode> = Object.fromEntries(allShareArt().map((a) => [shareArtName(a), () => <ShareFigure {...a} />]))
