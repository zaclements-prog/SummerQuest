/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { clamp, ease, interpolate, mixColor, progress, spring } from '../anim'
import { Burst, Camera, Chip, Draw, Fade, Kinetic, Paper, Pop, Ring, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Backdrop, Badge, idleRamp, lerp, lerpPt, polyD, trace, wedgePath, type Pt } from './_b2kit'

// ── colour coding (whole lesson) ─────────────────────────────────────────────
// area = mint tiles, length = gold, width = blue, perimeter = coral trail,
// hour = coral (short hand), minutes = blue (long hand), dollars = green, cents = blue
const MINT_TXT = '#23926a'
const GOLD_TXT = '#b77f00'
const BLUE = M.sea
const BLUE_TXT = '#2a7fb0'
const CORAL_TXT = '#d9534a'
const WOOD = '#f6d9a8'
const GREEN = '#7fcb73'
const GREEN_TXT = '#3a8f4b'

// One 4 × 3 rectangle for area and perimeter, in the same spot on both steps.
const U = 72
const COLS = 4
const ROWS = 3
const X0 = 130
const Y0 = 160
const X1 = X0 + COLS * U
const Y1 = Y0 + ROWS * U
const RECT: Pt[] = [
  [X0, Y0],
  [X1, Y0],
  [X1, Y1],
  [X0, Y1],
]

/** A wooden ruler of `n` units (unit = U px) along +x from its 0 mark at (0,0); ticks hang from the bottom edge. */
function Ruler({ n, lit = () => 0, flip = false }: { n: number; lit?: (i: number) => number; flip?: boolean }) {
  const len = n * U
  const h = 42
  return (
    <g filter="url(#sq-shadow)">
      <rect x={-16} y={-h} width={len + 32} height={h} rx={7} fill={WOOD} stroke={M.ink} strokeWidth={3} />
      {Array.from({ length: n * 2 + 1 }, (_, i) => {
        const x = (i * U) / 2
        const major = i % 2 === 0
        return <line key={i} x1={x} y1={0} x2={x} y2={major ? -18 : -10} stroke={M.ink} strokeWidth={major ? 3.5 : 2.5} strokeLinecap="round" />
      })}
      {Array.from({ length: n + 1 }, (_, i) => {
        const g = lit(i)
        return (
          <g key={i}>
            {g > 0.01 && <circle cx={i * U} cy={-h + 14} r={13 * g} fill={M.gold} />}
            <g transform={flip ? `translate(${i * U} ${-h + 15}) scale(1 -1) rotate(-90) translate(${-i * U} ${h - 15})` : undefined}>
              <Title x={i * U} y={-h + 15} size={19} weight={700}>
                {i}
              </Title>
            </g>
          </g>
        )
      })}
    </g>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/**
 * measurement/area — "Area is the amount of space inside a shape. You can count
 * all the little squares that fit inside, or take a shortcut and multiply the
 * length times the width. Four times three equals twelve!"
 * A rectangle draws; mint floods the space inside. Little squares fill it row by
 * row, counted 1–12. Then rulers slide along the top (4) and side (3), and the
 * 4 and 3 fly into "4 × 3 = 12".
 */
const area: Scene = ({ t, cue, reduced }: SceneProps) => {
  const inside = cue('space inside')
  const count = cue('count all')
  const fit = cue('fit inside')
  const shortcut = cue('shortcut')
  const length = cue('the length')
  const width = cue('the width')
  const four = cue('four times')
  const times = cue('times three')
  const three = cue('three equals')
  const equals = cue('equals twelve')
  const twelve = cue('twelve')
  const idle = idleRamp(t, twelve + 1.2, reduced)
  const tileAt = (r: number, c: number) => count + 0.3 + (r * COLS + c) * 0.13
  const counted = Array.from({ length: 12 }, (_, i) => i).filter((i) => t >= tileAt(Math.floor(i / COLS), i % COLS)).length
  const flood = ease.inOutCubic(progress(t, inside, 0.8)) * (1 - progress(t, count + 0.3, 1.6))
  const numsOut = 1 - progress(t, shortcut, 0.4)
  const topIn = ease.outCubic(progress(t, shortcut + 0.1, 0.8))
  const sideIn = ease.outCubic(progress(t, shortcut + 0.4, 0.8))
  const litTop = (i: number) => (i === 0 ? 0 : interpolate(t, [length + 0.1 + (i - 1) * 0.16, length + 0.2 + (i - 1) * 0.16], [0, 1]))
  const litSide = (i: number) => (i === 0 ? 0 : interpolate(t, [width + 0.1 + (i - 1) * 0.16, width + 0.2 + (i - 1) * 0.16], [0, 1]))
  const sweep = (t % 3.4) / 3.4
  // equation tokens (size 76 at y 262)
  const EQ_Y = 262
  const badge4: Pt = [X1 + 44, Y0 - 34]
  const badge3: Pt = [X0 - 72, Y1 + 30]
  const fly = (from: Pt, to: Pt, at: number) => {
    const k = ease.inOutCubic(progress(t, at, 0.6))
    const p = lerpPt(from, to, k)
    return { x: p[0], y: p[1] - Math.sin(k * Math.PI) * 60, k }
  }
  const f4 = fly(badge4, [552, EQ_Y], four)
  const f3 = fly(badge3, [680, EQ_Y], three)
  const bob = Math.sin(t * 1.7) * 4 * idle

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 440, y: 268, zoom: 1.06 },
          { at: shortcut + 0.4, x: 470, y: 268, zoom: 1 },
        ]}
      >
        <Backdrop t={t} at={0.05} x={(X0 + X1) / 2} y={(Y0 + Y1) / 2} r={235} color={'#dff6ec'} reduced={reduced} />
        {/* inside flood */}
        {flood > 0.01 && <rect x={X0} y={Y0} width={COLS * U * flood} height={ROWS * U} fill={M.mint} opacity={0.6} />}
        {/* grid guides */}
        <Fade t={t} at={count} dur={0.4}>
          {Array.from({ length: COLS - 1 }, (_, i) => (
            <line key={`c${i}`} x1={X0 + (i + 1) * U} y1={Y0} x2={X0 + (i + 1) * U} y2={Y1} stroke={M.ink} strokeWidth={2} strokeDasharray="6 8" opacity={0.3} />
          ))}
          {Array.from({ length: ROWS - 1 }, (_, i) => (
            <line key={`r${i}`} x1={X0} y1={Y0 + (i + 1) * U} x2={X1} y2={Y0 + (i + 1) * U} stroke={M.ink} strokeWidth={2} strokeDasharray="6 8" opacity={0.3} />
          ))}
        </Fade>
        {/* the little squares, row by row */}
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS)
          const c = i % COLS
          const x = X0 + c * U
          const y = Y0 + r * U
          const wave = interpolate(t, [fit + (r + c) * 0.08, fit + (r + c) * 0.08 + 0.18, fit + (r + c) * 0.08 + 0.5], [0, 1, 0])
          const shimmer = idle * Math.max(0, 1 - Math.abs(sweep * 9 - (r + c) - 1) / 1.2)
          const lenGlow = r === 0 ? litTop(c + 1) * (1 - progress(t, width, 0.4)) : 0
          const widGlow = c === 0 ? litSide(r + 1) * (1 - progress(t, four, 0.4)) : 0
          return (
            <Pop key={i} t={t} at={tileAt(r, c)} x={x + U / 2} y={y + U / 2} bounce={16}>
              <g transform={`translate(${x + U / 2} ${y + U / 2}) scale(${1 + 0.1 * wave}) translate(${-(x + U / 2)} ${-(y + U / 2)})`}>
                <rect x={x + 4} y={y + 4} width={U - 8} height={U - 8} rx={9} fill={mixColor(M.mint, M.white, 0.35 * shimmer)} stroke={lenGlow > 0.02 ? GOLD_TXT : widGlow > 0.02 ? BLUE_TXT : M.ink} strokeWidth={2.5 + 2 * Math.max(lenGlow, widGlow)} />
                {numsOut > 0 && (
                  <g opacity={numsOut}>
                    <Title x={x + U / 2} y={y + U / 2 + 1} size={26} color={MINT_TXT}>
                      {i + 1}
                    </Title>
                  </g>
                )}
              </g>
            </Pop>
          )
        })}
        {/* the rectangle */}
        <Draw t={t} at={0.1} dur={0.9} d={polyD(RECT)} width={6} />
        {/* rulers */}
        {topIn > 0 && (
          <g transform={`translate(${X0 - (1 - topIn) * 520} ${Y0 - 4})`} opacity={clamp(topIn * 3)}>
            <Ruler n={COLS} lit={litTop} />
          </g>
        )}
        {sideIn > 0 && (
          <g transform={`translate(${X0 - 4} ${Y0 - (1 - sideIn) * 420}) rotate(90) scale(1 -1)`} opacity={clamp(sideIn * 3)}>
            <Ruler n={ROWS} lit={litSide} flip />
          </g>
        )}
        {/* length + width */}
        <Badge t={t} at={length + 0.75} x={badge4[0]} y={badge4[1]} label="4" color={M.gold} r={27} size={34} out={four + 0.05} />
        <Badge t={t} at={width + 0.6} x={badge3[0]} y={badge3[1]} label="3" color={BLUE} r={27} size={34} out={three + 0.05} />
        <Fade t={t} at={length + 0.75} out={four}>
          <Title x={badge4[0]} y={badge4[1] - 46} size={24} color={GOLD_TXT}>
            length
          </Title>
        </Fade>
        <Fade t={t} at={width + 0.6} out={three}>
          <Title x={badge3[0]} y={badge3[1] + 46} size={24} color={BLUE_TXT}>
            width
          </Title>
        </Fade>

        {/* right panel */}
        <Kinetic t={t} at={0.15} text="Area" x={700} y={92} size={64} color={MINT_TXT} />
        <Fade t={t} at={inside}>
          <Title x={700} y={146} size={28} color={M.inkSoft}>
            space inside
          </Title>
        </Fade>
        <Fade t={t} at={count + 0.3} out={shortcut} dur={0.3}>
          {counted > 0 && (
            <g transform={`translate(700 ${EQ_Y}) scale(${1 + 0.25 * (1 - ease.outCubic(progress(t, tileAt(Math.floor((counted - 1) / COLS), (counted - 1) % COLS), 0.3)))}) translate(-700 ${-EQ_Y})`}>
              <Title x={700} y={EQ_Y} size={120} color={MINT_TXT} stroke={M.white}>
                {counted}
              </Title>
            </g>
          )}
          <Title x={700} y={EQ_Y + 82} size={28} color={M.inkSoft}>
            little squares
          </Title>
        </Fade>
        {/* 4 × 3 = 12 */}
        <g transform={`translate(0 ${bob})`}>
          {f4.k > 0 && (
            <Title x={f4.x} y={f4.y} size={lerp(34, 76, f4.k)} color={GOLD_TXT} stroke={M.white}>
              4
            </Title>
          )}
          <Pop t={t} at={times} x={616} y={EQ_Y}>
            <Title x={616} y={EQ_Y} size={64} stroke={M.white}>
              ×
            </Title>
          </Pop>
          {f3.k > 0 && (
            <Title x={f3.x} y={f3.y} size={lerp(34, 76, f3.k)} color={BLUE_TXT} stroke={M.white}>
              3
            </Title>
          )}
          <Pop t={t} at={equals} x={742} y={EQ_Y}>
            <Title x={742} y={EQ_Y} size={64} stroke={M.white}>
              =
            </Title>
          </Pop>
          <Pop t={t} at={twelve} x={832} y={EQ_Y} bounce={9}>
            <Title x={832} y={EQ_Y} size={80} color={MINT_TXT} stroke={M.white}>
              12
            </Title>
          </Pop>
        </g>
        <Burst t={t} at={twelve + 0.05} x={832} y={EQ_Y} color={M.mint} r={80} />
        <Chip t={t} at={twelve + 0.45} x={700} y={366} text="12 squares" color={M.mint} size={28} />
      </Camera>
      <Kinetic t={t} at={twelve + 1.1} text="area = length × width" x={480} y={492} size={38} />
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/** A flat ladybug (top view) facing +x, centred on (0,0). */
function Ladybug({ s = 1, legs = 0 }: { s?: number; legs?: number }) {
  const lp = Math.sin(legs) * 4
  return (
    <g transform={`scale(${s})`}>
      {[-12, 0, 12].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={-14} x2={x + (i % 2 ? lp : -lp)} y2={-27} stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
          <line x1={x} y1={14} x2={x + (i % 2 ? -lp : lp)} y2={27} stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
        </g>
      ))}
      <line x1={22} y1={-6} x2={36} y2={-15} stroke={M.ink} strokeWidth={3} strokeLinecap="round" />
      <line x1={22} y1={6} x2={36} y2={15} stroke={M.ink} strokeWidth={3} strokeLinecap="round" />
      <circle cx={20} cy={0} r={11} fill={M.ink} />
      <ellipse cx={-2} cy={0} rx={23} ry={20} fill="#e8574c" stroke={M.ink} strokeWidth={3.5} />
      <line x1={-25} y1={0} x2={14} y2={0} stroke={M.ink} strokeWidth={3} />
      {[
        [-10, -9],
        [-10, 9],
        [4, -10],
        [4, 10],
        [-19, -3],
        [-19, 3],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i > 3 ? 2.5 : 4} fill={M.ink} />
      ))}
      <circle cx={-6} cy={-12} r={3.5} fill={M.white} opacity={0.6} />
    </g>
  )
}

/**
 * measurement/perimeter — "Perimeter is the distance all the way around a shape,
 * like walking around the edge of a yard. Add up every side: four plus three
 * plus four plus three equals fourteen."
 * The same 4 × 3 rectangle, now a little grassy yard. A ladybug walks all the
 * way round its edge, leaving a coral trail. Then each side lights up as it's
 * named and its length flies into 4 + 3 + 4 + 3 = 14.
 */
const perimeter: Scene = ({ t, cue, reduced }: SceneProps) => {
  const around = cue('all the way around')
  const yard = cue('edge of a yard')
  const addUp = cue('add up every side')
  const sideAt = [cue('four plus', 0), cue('three plus'), cue('four plus', 1), cue('three equals')]
  const equals = cue('equals fourteen')
  const fourteen = cue('fourteen')
  const idle = idleRamp(t, fourteen + 1.2, reduced)
  const walkFrom = around + 0.3
  const walkDur = Math.max(2.4, yard + 0.5 - walkFrom)
  const walkK = ease.inOutSine(progress(t, walkFrom, walkDur))
  const lapT = reduced ? 0 : Math.max(0, t - (fourteen + 1.6))
  const lapK = (lapT / 9) % 1 // slow idle lap after the narration
  const bugK = t < fourteen + 1.6 ? walkK : lapK
  const tr = trace(RECT, bugK)
  const trail = trace(RECT, walkK)
  const lens = [COLS, ROWS, COLS, ROWS]
  const sideMid = (i: number): Pt => {
    const a = RECT[i]
    const b = RECT[(i + 1) % 4]
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  }
  const out: Pt[] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]
  const badgeAt = (i: number): Pt => [sideMid(i)[0] + out[i][0] * 44, sideMid(i)[1] + out[i][1] * 44]
  const slots: Pt[] = [
    [530, 250],
    [632, 250],
    [734, 250],
    [836, 250],
  ]
  const fly = (i: number) => {
    const k = ease.inOutCubic(progress(t, sideAt[i] + 0.1, 0.55))
    const p = lerpPt(badgeAt(i), slots[i], k)
    return { x: p[0], y: p[1] - Math.sin(k * Math.PI) * 50, k }
  }
  const glowAll = interpolate(t, [fourteen, fourteen + 0.2, fourteen + 1.2], [0, 1, 0])
  const dash = reduced ? 0 : -t * 40
  const bob = Math.sin(t * 1.7) * 4 * idle

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 440, y: 268, zoom: 1.06 },
          { at: addUp + 0.3, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Backdrop t={t} at={0.05} x={(X0 + X1) / 2} y={(Y0 + Y1) / 2} r={235} color={'#fde3dc'} reduced={reduced} />
        {/* the yard */}
        <Pop t={t} at={0.15} x={(X0 + X1) / 2} y={(Y0 + Y1) / 2} bounce={14}>
          <g filter="url(#sq-shadow)">
            <path d={polyD(RECT)} fill="#dcf2c8" stroke={M.ink} strokeWidth={5} strokeLinejoin="round" />
          </g>
          {/* bushes and flowers */}
          {[
            [X0 + 70, Y0 + 70, 26],
            [X0 + 100, Y0 + 82, 20],
            [X1 - 70, Y1 - 60, 24],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={M.leaf} stroke={M.ink} strokeWidth={3} />
          ))}
          {[
            [X1 - 80, Y0 + 70],
            [X0 + 80, Y1 - 50],
            [X0 + 160, Y0 + 130],
          ].map(([x, y], i) => (
            <g key={i}>
              {[0, 1, 2, 3, 4].map((p) => (
                <circle key={p} cx={x + 8 * Math.cos((p / 5) * Math.PI * 2)} cy={y + 8 * Math.sin((p / 5) * Math.PI * 2)} r={6} fill={i === 1 ? M.pink : M.white} stroke={M.ink} strokeWidth={1.5} />
              ))}
              <circle cx={x} cy={y} r={5} fill={M.gold} />
            </g>
          ))}
        </Pop>
        {/* the coral trail around the edge */}
        {walkK > 0 && (
          <>
            {glowAll > 0.01 && <path d={polyD(RECT)} fill="none" stroke={M.gold} strokeWidth={14 + 22 * glowAll} strokeLinejoin="round" opacity={0.6 * glowAll} />}
            <path d={polyD(trail.pts, false)} fill="none" stroke={M.ink} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
            <path d={polyD(trail.pts, false)} fill="none" stroke={M.coral} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
            {walkK >= 1 && idle > 0 && <path d={polyD(RECT)} fill="none" stroke={M.white} strokeWidth={4} strokeDasharray="10 22" strokeDashoffset={dash} opacity={0.75 * idle} />}
          </>
        )}
        {/* each side lights up as it's named */}
        {RECT.map((a, i) => {
          const b = RECT[(i + 1) % 4]
          const g = interpolate(t, [sideAt[i], sideAt[i] + 0.12, sideAt[i] + 0.9], [0, 1, 0.25]) * (1 - progress(t, fourteen, 0.4))
          return g > 0.01 ? <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={M.gold} strokeWidth={11} strokeLinecap="round" opacity={g} /> : null
        })}
        {/* unit ticks */}
        <Fade t={t} at={addUp}>
          {RECT.map((a, i) => {
            const b = RECT[(i + 1) % 4]
            return Array.from({ length: lens[i] - 1 }, (_, j) => {
              const p = lerpPt(a, b, (j + 1) / lens[i])
              const vert = i % 2 === 1
              return <line key={`${i}-${j}`} x1={p[0] - (vert ? 10 : 0)} y1={p[1] - (vert ? 0 : 10)} x2={p[0] + (vert ? 10 : 0)} y2={p[1] + (vert ? 0 : 10)} stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
            })
          })}
        </Fade>
        {/* the walker */}
        {(walkK > 0 || t > around) && (
          <Pop t={t} at={around} x={tr.tip[0]} y={tr.tip[1]}>
            <g transform={`translate(${tr.tip[0]} ${tr.tip[1]}) rotate(${(tr.ang * 180) / Math.PI})`}>
              <Ladybug s={0.95} legs={t * 18 * (walkK > 0 && walkK < 1 ? 1 : lapT > 0 ? 0.6 : 0)} />
            </g>
          </Pop>
        )}
        {/* side lengths */}
        {RECT.map((_, i) => (
          <Badge key={i} t={t} at={sideAt[i]} x={badgeAt(i)[0]} y={badgeAt(i)[1]} label={lens[i]} color={M.white} r={24} size={30} />
        ))}

        {/* right panel */}
        <Kinetic t={t} at={0.15} text="Perimeter" x={690} y={92} size={58} color={CORAL_TXT} />
        <Fade t={t} at={around}>
          <Title x={690} y={146} size={28} color={M.inkSoft}>
            all the way around
          </Title>
        </Fade>
        <g transform={`translate(0 ${bob})`}>
          {[0, 1, 2, 3].map((i) => {
            const f = fly(i)
            return (
              <g key={i}>
                {f.k > 0 && (
                  <Title x={f.x} y={f.y} size={lerp(30, 66, f.k)} color={M.ink} stroke={M.white}>
                    {lens[i]}
                  </Title>
                )}
                {i < 3 && (
                  <Pop t={t} at={sideAt[i] + 0.45} x={slots[i][0] + 51} y={250}>
                    <Title x={slots[i][0] + 51} y={250} size={52} color={CORAL_TXT} stroke={M.white}>
                      +
                    </Title>
                  </Pop>
                )}
              </g>
            )
          })}
          <Pop t={t} at={equals} x={620} y={350}>
            <Title x={620} y={350} size={70} stroke={M.white}>
              =
            </Title>
          </Pop>
          <Pop t={t} at={fourteen} x={730} y={350} bounce={9}>
            <Title x={730} y={350} size={96} color={CORAL_TXT} stroke={M.white}>
              14
            </Title>
          </Pop>
        </g>
        <Burst t={t} at={fourteen + 0.05} x={730} y={350} color={M.coral} r={85} />
      </Camera>
      <Kinetic t={t} at={fourteen + 1.1} text="perimeter = all the sides added up" x={480} y={494} size={34} />
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
const CLK: Pt = [292, 278]
const CR = 190
const HOUR = '#e8574c'
const MIN = '#3d9ad1'
/** A point on the clock at `deg` degrees clockwise from 12, distance r. */
const onClock = (deg: number, r: number): Pt => [CLK[0] + r * Math.sin((deg * Math.PI) / 180), CLK[1] - r * Math.cos((deg * Math.PI) / 180)]

function Hand({ deg, len, w, color, glow = 0 }: { deg: number; len: number; w: number; color: string; glow?: number }) {
  if (len <= 0.5) return null
  const tip = onClock(deg, len)
  const tail = onClock(deg + 180, Math.min(22, len * 0.2))
  return (
    <>
      {glow > 0.01 && <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} stroke={M.gold} strokeWidth={w + 22 * glow} strokeLinecap="round" opacity={0.55 * glow} />}
      <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} stroke={M.ink} strokeWidth={w + 7} strokeLinecap="round" />
      <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
    </>
  )
}

/**
 * measurement/time — "On a clock, the short hand points to the hour. The long
 * hand points to the minutes, and it counts by fives: five, ten, fifteen. The
 * short hand is just past the eight, so it is eight fifteen!"
 * A clock pops together. The short coral hand grows toward the 8 (hour), the long
 * blue hand toward the 12 (minutes). The long hand clicks 12 → 1 → 2 → 3 as
 * 5, 10, 15 pop beside the numbers (the short hand creeps just past the 8);
 * then a digital 8:15 assembles in the same colours.
 */
const time: Scene = ({ t, cue, reduced }: SceneProps) => {
  const short = cue('short hand')
  const hour = cue('the hour')
  const long = cue('long hand')
  const minutes = cue('the minutes')
  const fives = cue('by fives')
  const steps = [cue('five,'), cue('ten,'), cue('fifteen')]
  const past = cue('just past')
  const eight15 = cue('eight fifteen')
  const idle = idleRamp(t, eight15 + 1.3, reduced)
  // minutes shown: 0 → 5 → 10 → 15, one springy click per spoken number
  const m = steps.reduce((acc, at) => acc + 5 * clamp(spring(t, at, { stiffness: 260, damping: 16 }), 0, 1.15), 0)
  const minDeg = m * 6
  const hourDeg = 240 + m * 0.5
  const hourLen = 86 * spring(t, short + 0.1, { stiffness: 160, damping: 12 })
  const minLen = 124 * spring(t, long + 0.1, { stiffness: 160, damping: 12 })
  const hourGlow = Math.max(interpolate(t, [short + 0.2, short + 0.4, short + 1.4], [0, 1, 0]), interpolate(t, [past, past + 0.2, past + 1.6], [0, 1, 0]))
  const minGlow = interpolate(t, [long + 0.2, long + 0.4, long + 1.4], [0, 1, 0])
  const bob = Math.sin(t * 1.6) * 3 * idle
  const blink = reduced ? 1 : t > eight15 + 1 ? (Math.floor(t * 1.25) % 2 === 0 ? 1 : 0.25) : 1

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 420, y: 278, zoom: 1.06 },
          { at: fives, x: 430, y: 272, zoom: 1.06 },
          { at: past, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Backdrop t={t} at={0.05} x={CLK[0]} y={CLK[1]} r={250} color={'#dcecfa'} reduced={reduced} />
        <g transform={`translate(0 ${bob})`}>
          <Pop t={t} at={0.1} x={CLK[0]} y={CLK[1]} bounce={11}>
            <g filter="url(#sq-shadow)">
              <circle cx={CLK[0]} cy={CLK[1]} r={CR + 16} fill={BLUE} stroke={M.ink} strokeWidth={5} />
              <circle cx={CLK[0]} cy={CLK[1]} r={CR} fill={M.white} stroke={M.ink} strokeWidth={3} />
            </g>
            {Array.from({ length: 60 }, (_, i) => {
              const big = i % 5 === 0
              const a = onClock(i * 6, CR - 6)
              const b = onClock(i * 6, CR - (big ? 22 : 13))
              return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={M.ink} strokeWidth={big ? 4 : 2} strokeLinecap="round" opacity={big ? 1 : 0.55} />
            })}
          </Pop>
          {/* minutes swept so far */}
          {m > 0.05 && <path d={wedgePath(CLK, CR - 26, -Math.PI / 2, -Math.PI / 2 + (minDeg * Math.PI) / 180)} fill={M.sky} opacity={0.75} />}
          {/* numbers */}
          {Array.from({ length: 12 }, (_, i) => {
            const n = i + 1
            const [x, y] = onClock(n * 30, CR - 46)
            const ring = n === 8 ? Math.max(interpolate(t, [hour, hour + 0.2, hour + 1.3], [0, 1, 0]), interpolate(t, [past + 0.1, past + 0.3, past + 1.6], [0, 1, 0])) : 0
            return (
              <Pop key={n} t={t} at={0.35 + i * 0.045} x={x} y={y}>
                {ring > 0.01 && <circle cx={x} cy={y} r={30 + 6 * ring} fill={M.coral} opacity={0.35 * ring} stroke={HOUR} strokeWidth={4 * ring} />}
                <Title x={x} y={y + 1} size={38} color={n === 8 && t > hour ? CORAL_TXT : M.ink}>
                  {n}
                </Title>
              </Pop>
            )
          })}
          {/* 5, 10, 15 bubbles outside the rim */}
          {[1, 2, 3].map((n, i) => {
            const [x, y] = onClock(n * 30, CR + 52)
            return <Badge key={n} t={t} at={steps[i] + 0.05} x={x} y={y} label={n * 5} color={MIN} ink={M.white} r={28} size={26} />
          })}
          {/* just past the 8 */}
          {t > past && (
            <path d={`M ${onClock(240, CR - 88)[0]} ${onClock(240, CR - 88)[1]} A ${CR - 88} ${CR - 88} 0 0 1 ${onClock(hourDeg + 4, CR - 88)[0]} ${onClock(hourDeg + 4, CR - 88)[1]}`} fill="none" stroke={HOUR} strokeWidth={8} strokeLinecap="round" opacity={clamp((t - past) * 3)} />
          )}
          <Hand deg={minDeg} len={minLen} w={12} color={MIN} glow={minGlow} />
          <Hand deg={hourDeg} len={hourLen} w={20} color={HOUR} glow={hourGlow} />
          <Pop t={t} at={0.3} x={CLK[0]} y={CLK[1]}>
            <circle cx={CLK[0]} cy={CLK[1]} r={14} fill={M.gold} stroke={M.ink} strokeWidth={4} />
          </Pop>
        </g>

        {/* right panel: legend + digital time */}
        {(() => {
          const ib = (ph: number) => Math.sin(t * 1.6 + ph) * 3 * idle
          return (
            <>
              <Pop t={t} at={hour} x={700} y={130}>
                <g transform={`translate(0 ${ib(0)})`}>
                  <line x1={612} y1={130} x2={652} y2={130} stroke={M.ink} strokeWidth={27} strokeLinecap="round" />
                  <line x1={612} y1={130} x2={652} y2={130} stroke={HOUR} strokeWidth={20} strokeLinecap="round" />
                  <Title x={680} y={131} size={40} color={CORAL_TXT} anchor="start">
                    hour
                  </Title>
                </g>
              </Pop>
              <Pop t={t} at={minutes} x={700} y={205}>
                <g transform={`translate(0 ${ib(1)})`}>
                  <line x1={600} y1={205} x2={664} y2={205} stroke={M.ink} strokeWidth={19} strokeLinecap="round" />
                  <line x1={600} y1={205} x2={664} y2={205} stroke={MIN} strokeWidth={12} strokeLinecap="round" />
                  <Title x={680} y={206} size={40} color={BLUE_TXT} anchor="start">
                    minutes
                  </Title>
                </g>
              </Pop>
              <Pop t={t} at={eight15} x={725} y={350} bounce={10}>
                <g transform={`translate(0 ${ib(2)})`} filter="url(#sq-shadow)">
                  <rect x={590} y={292} width={270} height={118} rx={26} fill={M.white} stroke={M.ink} strokeWidth={4} />
                  <Title x={672} y={353} size={92} color={CORAL_TXT} anchor="end">
                    8
                  </Title>
                  <g opacity={blink}>
                    <Title x={694} y={347} size={84} color={M.ink}>
                      :
                    </Title>
                  </g>
                  <Title x={716} y={353} size={92} color={BLUE_TXT} anchor="start">
                    15
                  </Title>
                </g>
              </Pop>
            </>
          )
        })()}
        <Burst t={t} at={eight15 + 0.1} x={725} y={350} color={M.gold} r={110} />
        <Ring t={t} at={steps[2] + 0.1} x={onClock(90, CR + 52)[0]} y={onClock(90, CR + 52)[1]} r={36} color={MIN} out={past} />
      </Camera>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
const COIN_R = 52
function Coin({ x, y, rot = 0, glint = -1 }: { x: number; y: number; rot?: number; glint?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <circle cx={0} cy={5} r={COIN_R} fill={M.ink} opacity={0.2} />
      <circle cx={0} cy={0} r={COIN_R} fill="#d9dee6" stroke={M.ink} strokeWidth={4} />
      <circle cx={0} cy={0} r={COIN_R - 9} fill="none" stroke="#aab3c0" strokeWidth={3} strokeDasharray="3 5" />
      {glint >= 0 && glint <= 1 && <ellipse cx={-COIN_R + glint * COIN_R * 2} cy={0} rx={10} ry={COIN_R * Math.sqrt(Math.max(0, 1 - (glint * 2 - 1) ** 2)) * 0.9} fill={M.white} opacity={0.7} transform={`rotate(25 ${-COIN_R + glint * COIN_R * 2} 0)`} />}
      <Title x={0} y={2} size={30} color={M.ink}>
        25¢
      </Title>
    </g>
  )
}

function Bill({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  const w = 280
  const h = 136
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} filter="url(#sq-shadow)">
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={14} fill={GREEN} stroke={M.ink} strokeWidth={4} />
      <rect x={-w / 2 + 12} y={-h / 2 + 12} width={w - 24} height={h - 24} rx={8} fill="none" stroke="#4f9f50" strokeWidth={3} />
      <ellipse cx={0} cy={0} rx={44} ry={46} fill="#b9e6a8" stroke="#4f9f50" strokeWidth={3} />
      <Title x={0} y={3} size={46} color={GREEN_TXT}>
        $1
      </Title>
      {[
        [-w / 2 + 34, -h / 2 + 32],
        [w / 2 - 34, h / 2 - 32],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={18} fill="#b9e6a8" stroke="#4f9f50" strokeWidth={2.5} />
          <Title x={cx} y={cy + 1} size={22} color={GREEN_TXT}>
            1
          </Title>
        </g>
      ))}
    </g>
  )
}

/**
 * measurement/money — "When you count money, count the dollars first: one
 * dollar. Then count the cents: twenty-five, fifty, seventy-five. Put them
 * together, and you have one dollar and seventy-five cents!"
 * A dollar bill slides in ("$1"); three quarters roll in one per spoken number
 * as the cents count 25¢, 50¢, 75¢; then everything slides together and
 * "$1 + 75¢" snaps into "$1.75".
 */
const money: Scene = ({ t, cue, reduced }: SceneProps) => {
  const dollarsFirst = cue('the dollars first')
  const oneDollar = cue('one dollar')
  const cents = cue('the cents')
  const coinAt = [cue('twenty-five'), cue('fifty'), cue('seventy-five')]
  const together = cue('together')
  const total = cue('one dollar and')
  const idle = idleRamp(t, total + 2, reduced)
  const join = ease.inOutCubic(progress(t, together + 0.1, 0.9))
  const billIn = ease.outBack(progress(t, dollarsFirst + 0.1, 0.8))
  const billX = lerp(lerp(-220, 250, billIn), 330, join)
  const billRot = lerp(lerp(-22, -4, billIn), -6, join)
  const coinHome: Pt[] = [
    [520, 222],
    [645, 222],
    [770, 222],
  ]
  const coinJoin: Pt[] = [
    [500, 250],
    [560, 214],
    [620, 178],
  ]
  const glintK = shineK(t, idle)
  const bob = Math.sin(t * 1.7) * 4 * idle
  // the total line
  const tk = ease.inOutCubic(progress(t, together + 0.2, 0.8))
  const size = lerp(92, 112, tk)
  const dollarEnd = lerp(372, 470, tk)
  const centsStart = lerp(496, 500, tk)

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 420, y: 250, zoom: 1.1 },
          { at: together + 0.6, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Backdrop t={t} at={0.05} x={480} y={230} r={330} color={'#e3f4d9'} opacity={0.6} reduced={reduced} />
        {/* the bill */}
        {billIn > 0 && <Bill x={billX} y={222 + Math.sin(t * 1.5) * 3 * idle} rot={billRot} />}
        {/* the quarters roll in from the right */}
        {coinAt.map((at, i) => {
          const k = ease.outCubic(progress(t, at - 0.55, 0.6))
          if (k <= 0) return null
          const home = lerpPt(coinHome[i], coinJoin[i], join)
          const x = lerp(1060, coinHome[i][0], k) + (home[0] - coinHome[i][0])
          const y = home[1] - Math.abs(Math.sin(k * Math.PI * 2)) * 18 * (1 - k) + Math.sin(t * 1.5 + i) * 3 * idle
          const rot = (-(lerp(1060, coinHome[i][0], k) - coinHome[i][0]) / COIN_R) * (180 / Math.PI)
          return <Coin key={i} x={x} y={y} rot={rot} glint={glintK(i)} />
        })}
        {/* running totals above */}
        <Badge t={t} at={oneDollar} x={250} y={110} label="$1" color={GREEN} ink={M.ink} r={38} size={32} out={together} />
        {coinAt.map((at, i) => (
          <Badge key={i} t={t} at={at + 0.1} x={coinHome[i][0]} y={110} label={`${(i + 1) * 25}¢`} color={BLUE} ink={M.ink} r={38} size={26} out={together} />
        ))}
        {/* +25 hops between the running totals */}
        <Fade t={t} at={coinAt[1]} out={together} dur={0.3}>
          {coinAt.map((at, i) =>
            i > 0 ? (
              <g key={i}>
                <Draw t={t} at={at + 0.15} dur={0.3} d={`M ${coinHome[i - 1][0] + 30} 80 Q ${(coinHome[i - 1][0] + coinHome[i][0]) / 2} 50 ${coinHome[i][0] - 34} 80`} stroke={BLUE_TXT} width={4} />
                <Fade t={t} at={at + 0.3}>
                  <Title x={(coinHome[i - 1][0] + coinHome[i][0]) / 2} y={44} size={20} color={BLUE_TXT}>
                    +25
                  </Title>
                </Fade>
              </g>
            ) : null,
          )}
        </Fade>

        <Fade t={t} at={dollarsFirst + 0.5} out={together} dur={0.3}>
          <Title x={250} y={322} size={30} color={GREEN_TXT}>
            dollars
          </Title>
        </Fade>
        <Fade t={t} at={cents} out={together} dur={0.3}>
          <Title x={645} y={322} size={30} color={BLUE_TXT}>
            cents
          </Title>
        </Fade>
        {/* the total: $1 + 75¢ → $1.75 */}
        <g transform={`translate(0 ${bob})`}>
          <Pop t={t} at={oneDollar + 0.15} x={dollarEnd - 50} y={420}>
            <Title x={dollarEnd} y={420} size={size} color={GREEN_TXT} stroke={M.white} anchor="end">
              $1
            </Title>
          </Pop>
          <Fade t={t} at={coinAt[2] + 0.1} out={together} dur={0.3}>
            <Title x={434} y={420} size={70} color={M.inkSoft} stroke={M.white}>
              +
            </Title>
          </Fade>
          <Pop t={t} at={coinAt[2] + 0.2} x={centsStart + 60} y={420}>
            <Title x={centsStart} y={420} size={size} color={BLUE_TXT} stroke={M.white} anchor="start">
              75
              <tspan fillOpacity={1 - progress(t, together + 0.1, 0.3)} strokeOpacity={1 - progress(t, together + 0.1, 0.3)}>
                ¢
              </tspan>
            </Title>
          </Pop>
          <Pop t={t} at={together + 0.8} x={485} y={440}>
            <circle cx={485} cy={448} r={10} fill={M.ink} />
          </Pop>
        </g>
        <Burst t={t} at={total} x={485} y={420} color={M.gold} r={150} rays={14} />
        <Fade t={t} at={total + 0.2}>
          <Title x={485} y={500} size={28} color={M.inkSoft}>
            1 dollar and 75 cents
          </Title>
        </Fade>
      </Camera>
      <Fade t={t} at={0.2} out={dollarsFirst - 0.1} dur={0.3}>
        <Kinetic t={t} at={0.2} text="count the money!" x={480} y={250} size={56} color={GREEN_TXT} />
      </Fade>
    </>
  )
}

/** Idle glints that sweep across each coin in turn (−1 = none). */
function shineK(t: number, idle: number) {
  return (i: number) => {
    if (idle <= 0) return -1
    const p = ((t + i * 0.5) % 3.5) / 0.9
    return p <= 1 ? p : -1
  }
}

export const measurementScenes: Record<string, Scene> = { area, perimeter, time, money }

