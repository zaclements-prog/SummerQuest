/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import type { ReactNode } from 'react'
import { arc, ease, lerp, mixColor, progress, pulse, wobble } from '../anim'
import { Arrow, Badge, Brace, Burst, Camera, Chip, Draw, Equation, Fade, Glow, Paper, Pop, Ring, T, Title, Twinkle, Words } from '../kit'
import { PV, shade, tint, tokenXs } from '../layout'
import { DEEP, M } from '../palette'
import { BigCube, Flat, Rod, UnitCube } from '../shapes'
import type { Scene, SceneProps } from '../types'

/*
 * Place value colour code (whole lesson), the same on blocks, column tints and
 * digits: ones = gold, tens = mint, hundreds = blue, thousands = lilac.
 */
const PLACES = [
  { name: 'thousands', fill: PV.thousands, ink: DEEP.lilac },
  { name: 'hundreds', fill: PV.hundreds, ink: DEEP.sea },
  { name: 'tens', fill: PV.tens, ink: DEEP.mint },
  { name: 'ones', fill: PV.ones, ink: DEEP.gold },
] as const
const COL_X = [210, 390, 570, 750]
const COL_W = 168
const DIGITS = ['1', '2', '3', '4']

/** The place-value chart: tinted columns with headers, digit tiles. */
function Chart({ t, headAt, tileAt, digitAt, dim = () => 0, headerY = 112, tileY = 206, colTop = 76, colBottom = 500 }: { t: number; headAt: (i: number) => number; tileAt: (i: number) => number; digitAt: (i: number) => number; dim?: (i: number) => number; headerY?: number; tileY?: number; colTop?: number; colBottom?: number }) {
  return (
    <>
      {PLACES.map((p, i) => {
        const x = COL_X[i]
        const h = ease.outCubic(progress(t, headAt(i), 0.5))
        const d = dim(i)
        const dropK = progress(t, digitAt(i), 0.42)
        const sq = wobble(t, digitAt(i) + 0.42, { amp: 0.16, freq: 2.4, decay: 7 })
        return (
          <g key={p.name} opacity={1 - 0.7 * d}>
            {h > 0 && <rect x={x - COL_W / 2} y={colTop + (1 - h) * 30} width={COL_W} height={colBottom - colTop} rx={26} fill={tint(p.fill, 0.62)} opacity={h} />}
            <Pop t={t} at={headAt(i)} x={x} y={headerY}>
              <Title x={x} y={headerY} size={p.name.length > 6 ? 28 : 32} color={p.ink} stroke={M.white}>
                {p.name}
              </Title>
            </Pop>
            <Pop t={t} at={tileAt(i)} x={x} y={tileY} bounce={13}>
              <rect x={x - 62} y={tileY - 62 + 6} width={124} height={124} rx={24} fill={M.ink} opacity={0.12} />
              <rect x={x - 62} y={tileY - 62} width={124} height={124} rx={24} fill={M.white} stroke={M.ink} strokeWidth={4} />
            </Pop>
            {t >= digitAt(i) && (
              <g transform={`translate(${x} ${tileY + 4 - 260 * (1 - ease.inQuad(dropK))}) scale(${1 + sq} ${1 - sq})`}>
                <Title x={0} y={0} size={104} color={p.ink} stroke={M.white}>
                  {DIGITS[i]}
                </Title>
              </g>
            )}
          </g>
        )
      })}
    </>
  )
}

/** The base-ten blocks for one column of 1,234 (thousands → ones), centred at x, top at y. */
function Blocks({ t, i, x, y, at }: { t: number; i: number; x: number; y: number; at: number }) {
  const items: { el: ReactNode; dx: number; dy: number }[] = []
  if (i === 0) items.push({ el: <BigCube x={0} y={0} s={9.5} />, dx: -62, dy: 30 })
  if (i === 1) for (let k = 0; k < 2; k++) items.push({ el: <Flat x={0} y={0} s={9} />, dx: -58 + k * 18, dy: 10 + k * 22 })
  if (i === 2) for (let k = 0; k < 3; k++) items.push({ el: <Rod x={0} y={0} s={14} />, dx: -42 + k * 30, dy: 2 })
  if (i === 3) for (let k = 0; k < 4; k++) items.push({ el: <UnitCube x={0} y={0} s={26} />, dx: -40 + (k % 2) * 44, dy: 30 + Math.floor(k / 2) * 44 })
  return (
    <>
      {items.map((it, k) => (
        <Pop key={k} t={t} at={at + k * 0.12} x={x + it.dx + 20} y={y + it.dy + 30} bounce={12}>
          <g transform={`translate(${x + it.dx} ${y + it.dy})`}>{it.el}</g>
        </Pop>
      ))}
    </>
  )
}

/**
 * placeValue/places — "Every digit sits in a special place. From the right, we
 * have ones, then tens, then hundreds, then thousands. The place a digit sits
 * in tells you its value."
 * Four "houses" appear and the digits of 1234 drop in; an arrow sweeps in from
 * the right and the place names light up right→left (each column tinted in its
 * colour); then base-ten blocks fill each column: 1 thousand-cube, 2 flats,
 * 3 rods, 4 cubes — the place gives the value.
 */
const places: Scene = ({ t, cue }: SceneProps) => {
  const special = cue('special place')
  const right = cue('From the right')
  const heads = [cue('thousands'), cue('hundreds'), cue('tens'), cue('ones')]
  const value = cue('tells you its value')
  return (
    <>
      <Paper />
      <Chart
        t={t}
        headAt={(i) => heads[i]}
        tileAt={(i) => 0.1 + i * 0.1}
        digitAt={(i) => 0.5 + i * 0.16}
        colBottom={510}
        tileY={196}
      />
      {/* shimmer the houses on "special place" */}
      {COL_X.map((x, i) => (
        <Ring key={i} t={t} at={special + i * 0.08} x={x} y={196} r={78} color={M.gold} out={special + 1.2} />
      ))}
      {/* from the right */}
      <Fade t={t} at={right - 0.1} out={heads[0] + 0.8}>
        <Arrow t={t} at={right} from={[858, 300]} to={[118, 300]} bend={-0.03} color={M.coral} width={8} dur={1.1} />
        <circle cx={872} cy={300} r={13} fill={M.coral} stroke={M.ink} strokeWidth={3} />
        <Title x={866} y={342} size={26} color={DEEP.coral} anchor="end">
          start on the right
        </Title>
      </Fade>
      {/* blocks: the place gives the value */}
      {[3, 2, 1, 0].map((i, k) => (
        <Blocks key={i} t={t} i={i} x={COL_X[i]} y={286} at={value + k * 0.35} />
      ))}
      {PLACES.map((p, i) => (
        <Pop key={i} t={t} at={value + 1.6 + (3 - i) * 0.15} x={COL_X[i]} y={474}>
          <Title x={COL_X[i]} y={474} size={34} color={p.ink} stroke={M.white}>
            {['1000', '200', '30', '4'][i]}
          </Title>
        </Pop>
      ))}
      <Twinkle t={t} at={value + 2.4} x={480} y={300} r={330} n={6} />
    </>
  )
}

/**
 * placeValue/regroup — "Here is the secret of place value. Ten ones bundle
 * together to make one ten. Ten tens bundle together to make one hundred. So
 * each place is worth ten times the place to its right."
 * Ten gold cubes pop in a row (counted to 10), fly together and snap into one
 * mint rod (a ten); nine more rods slide in beside it, then all ten squeeze
 * into a blue flat (a hundred); finally hundred | ten | one stand in a row with
 * "×10" hops from each place to the next one left.
 */
const regroup: Scene = ({ t, cue }: SceneProps) => {
  const secret = cue('secret')
  const tenOnes = cue('Ten ones')
  const bundle1 = cue('bundle together')
  const oneTen = cue('make one ten')
  const tenTens = cue('Ten tens')
  const bundle2 = cue('bundle together', 1)
  const oneHundred = cue('make one hundred')
  const each = cue('So each place')
  const tenTimes = cue('ten times')
  const right = cue('to its right')

  const S = 30 // cube size in phase 1
  const rowX = (i: number) => 480 + (i - 4.5) * 64 - S / 2
  const rodX = 480 - S / 2
  const rodTop = 106
  // phase 3: the first rod shrinks to the row of rods
  const s2 = 20
  const shrink = ease.inOutCubic(progress(t, tenTens - 0.3, 0.8))
  const rods10X = (k: number) => 480 - 5 * 34 + k * 34
  // phase 4: rods squeeze into a flat
  const squeeze = ease.inOutCubic(progress(t, oneHundred - 0.15, 0.7))
  const flatOn = t > oneHundred + 0.5
  const bandAt = Math.max(bundle2 + 0.3, tenTens + 0.98)
  // phase 5: hundred | ten | one
  const fin = ease.inOutCubic(progress(t, each - 0.2, 0.9))
  const s3 = 17
  const slotX = [270, 560, 790]
  const baseY = 392
  const phase5 = t > each - 0.2
  return (
    <>
      <Paper />
      <Camera t={t} keys={[{ at: 0, x: 480, y: 262, zoom: 1.12 }, { at: tenTens + 0.4, x: 480, y: 270, zoom: 1 }]}>
        <Words t={t} at={secret - 0.2} text="the secret of place value" x={480} y={56} size={42} colors={[undefined, DEEP.pink, undefined, DEEP.pink, DEEP.pink]} out={tenOnes + 0.2} />

        {/* phase 1–2: ten ones → one ten */}
        {t < oneTen + 0.35 &&
          Array.from({ length: 10 }, (_, i) => {
            const k = ease.inOutCubic(progress(t, bundle1 + i * 0.06, 0.65))
            const from: [number, number] = [rowX(i), 250]
            const to: [number, number] = [rodX, rodTop + i * S]
            const [x, y] = arc(from, to, 50, k)
            return (
              <Pop key={i} t={t} at={0.3 + i * 0.13} x={from[0] + S / 2} y={from[1] + S / 2} bounce={12}>
                <UnitCube x={x} y={y} s={S} color={mixColor(PV.ones, PV.tens, progress(t, oneTen - 0.1, 0.4))} />
              </Pop>
            )
          })}
        {Array.from({ length: 10 }, (_, i) => (
          <Badge key={i} t={t} at={0.3 + i * 0.13 + 0.1} x={rowX(i) + S / 2 + 4} y={312} text={i + 1} r={15} size={17} out={bundle1} />
        ))}
        <Brace t={t} at={tenOnes} x0={rowX(0)} x1={rowX(9) + S + 10} y={196} dir="up" label="10 ones" labelColor={DEEP.gold} color={DEEP.gold} labelSize={32} out={bundle1} />

        {/* the ten (rod) — first alone, then shrinking into a row of ten rods */}
        {t >= oneTen + 0.3 && !flatOn && !phase5 && (
          <>
            {Array.from({ length: 10 }, (_, k) => {
              if (k > 0 && t < tenTens + (k - 1) * 0.06) return null
              const slide = k === 0 ? 1 : ease.outBack(progress(t, tenTens + (k - 1) * 0.06, 0.45))
              const x0 = k === 0 ? lerp(rodX, rods10X(0), shrink) : lerp(980, rods10X(k), slide)
              const x = lerp(x0, 480 - 100 + k * s2, squeeze)
              const s = k === 0 ? lerp(S, s2, shrink) : s2
              const top = k === 0 ? lerp(rodTop, 140, shrink) : 140
              return (
                <g key={k}>
                  <Rod x={x} y={top} s={s} color={mixColor(PV.tens, PV.hundreds, squeeze)} />
                </g>
              )
            })}
          </>
        )}
        {/* the bundle band around the ten tens (it tightens as they squeeze) */}
        {t > bandAt && t < oneHundred + 0.5 && (
          <Pop t={t} at={bandAt} x={480} y={240}>
            <rect x={lerp(rods10X(0) - 12, 370, squeeze)} y={228} width={lerp(rods10X(9) + s2 + 20 - rods10X(0), 236, squeeze)} height={24} rx={8} fill={M.coral} stroke={M.ink} strokeWidth={3.5} />
          </Pop>
        )}
        {flatOn && !phase5 && (
          <Pop t={t} at={oneHundred + 0.45} x={480} y={240} bounce={16}>
            <Flat x={380} y={140} s={s2} />
          </Pop>
        )}
        {/* the bundle band on the ten */}
        {t > oneTen && t < tenTens - 0.3 && (
          <Pop t={t} at={oneTen} x={480} y={rodTop + 5 * S}>
            <rect x={rodX - 8} y={rodTop + 5 * S - 12} width={S + 26} height={24} rx={8} fill={M.coral} stroke={M.ink} strokeWidth={3.5} />
          </Pop>
        )}
        <Chip t={t} at={oneTen + 0.2} x={640} y={rodTop + 5 * S} text="1 ten" color={PV.tens} size={30} out={tenTens - 0.3} />
        <Burst t={t} at={oneTen + 0.05} x={480} y={rodTop + 5 * S} color={M.mint} r={150} rays={12} />
        <Words t={t} at={oneTen + 0.3} text="10 ones = 1 ten" x={480} y={470} size={44} colors={[DEEP.gold, DEEP.gold, undefined, DEEP.mint, DEEP.mint]} out={tenTens - 0.2} />
        <Brace t={t} at={tenTens + 1.0} x0={rods10X(0)} x1={rods10X(9) + s2 + 8} y={380} label="10 tens" labelColor={DEEP.mint} color={DEEP.mint} labelSize={32} out={oneHundred - 0.2} />
        <Chip t={t} at={oneHundred + 0.6} x={700} y={240} text="1 hundred" color={PV.hundreds} size={30} out={each - 0.3} />
        <Burst t={t} at={oneHundred + 0.45} x={480} y={240} color={PV.hundreds} r={170} rays={14} />
        <Words t={t} at={oneHundred + 0.7} text="10 tens = 1 hundred" x={480} y={470} size={44} colors={[DEEP.mint, DEEP.mint, undefined, DEEP.sea, DEEP.sea]} out={each - 0.3} />

        {/* phase 5: hundred | ten | one, ×10 each step left */}
        {phase5 && (
          <>
            <T x={lerp(380, slotX[0] - 85, fin)} y={lerp(140, baseY - 170, fin)} s={lerp(1, s3 / s2, fin)}>
              <Flat x={0} y={0} s={s2} />
            </T>
            <Pop t={t} at={each + 0.2} x={slotX[1]} y={baseY - 85}>
              <Rod x={slotX[1] - s3 / 2} y={baseY - 170} s={s3} />
            </Pop>
            <Glow t={t} at={each + 0.4} x={slotX[2] + 3} y={baseY - 10} r={34} color={M.gold} />
            <Pop t={t} at={each + 0.4} x={slotX[2]} y={baseY - 8}>
              <UnitCube x={slotX[2] - s3 / 2} y={baseY - s3} s={s3} />
            </Pop>
            {[
              ['1 hundred', DEEP.sea],
              ['1 ten', DEEP.mint],
              ['1 one', DEEP.gold],
            ].map(([label, c], i) => (
              <Pop key={i} t={t} at={each + 0.3 + i * 0.15} x={slotX[i]} y={baseY + 40}>
                <Title x={slotX[i]} y={baseY + 40} size={32} color={c} stroke={M.white}>
                  {label}
                </Title>
              </Pop>
            ))}
            {[
              { from: slotX[2] - 4, to: slotX[1] + 30, at: tenTimes - 0.1 },
              { from: slotX[1] - 22, to: slotX[0] + 100, at: tenTimes + 0.6 },
            ].map((a, i) => (
              <g key={i}>
                <Arrow t={t} at={a.at} from={[a.from, 196]} to={[a.to, 196]} bend={0.32} color={M.coral} width={6} dur={0.55} />
                <Pop t={t} at={a.at + 0.3} x={(a.from + a.to) / 2} y={128}>
                  <Title x={(a.from + a.to) / 2} y={128} size={38} color={DEEP.coral} stroke={M.white}>
                    ×10
                  </Title>
                </Pop>
              </g>
            ))}
            <Words t={t} at={right} text="×10 each step to the left" x={480} y={482} size={38} colors={[DEEP.coral]} />
          </>
        )}
        <Twinkle t={t} at={right + 1} x={slotX[0]} y={baseY - 80} r={110} n={4} color={PV.hundreds} />
      </Camera>
    </>
  )
}

/**
 * placeValue/value — "Look at the number one thousand two hundred thirty-four.
 * The two is sitting in the hundreds place, so it is not just two. It really
 * means two hundred."
 * The digits of 1,234 drop into their houses as the number is read; everything
 * but the hundreds dims; "just 2" (two little cubes) gets crossed out; the 2
 * slides down and grows its zeros — 200 — as two hundred-flats land beside it;
 * then the whole number spreads out: 1000 + 200 + 30 + 4.
 */
const value: Scene = ({ t, cue }: SceneProps) => {
  const thousand = cue('one thousand')
  const twoH = cue('two hundred')
  const thirty = cue('thirty-four')
  const two = cue('The two is')
  const place = cue('hundreds place')
  const notJust = cue('not just two')
  const means = cue('really means')
  const twoHundred = cue('means two hundred')
  const digitAt = [thousand, twoH, thirty, thirty + 0.45]
  const focus = ease.inOutCubic(progress(t, two, 0.5))
  const unfocus = ease.inOutCubic(progress(t, twoHundred + 1.6, 0.6))
  const dim = (i: number) => (i === 1 ? 0 : focus * (1 - unfocus))
  const grow = ease.inOutCubic(progress(t, means, 0.7))
  const zeros = ease.outBack(progress(t, twoHundred + 0.1, 0.55))
  const bigX = lerp(COL_X[1], 330, grow)
  const bigY = lerp(206, 372, grow)
  const end = twoHundred + 1.6
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: two + 0.6, x: 400, y: 236, zoom: 1.22 },
          { at: means + 0.5, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Chart t={t} headAt={(i) => 0.15 + i * 0.1} tileAt={(i) => 0.2 + i * 0.1} digitAt={(i) => digitAt[i]} dim={dim} colBottom={276} tileY={196} />
        <Ring t={t} at={place} x={COL_X[1]} y={112} r={72} color={PV.hundreds} out={means} />
        {/* the 2 in the hundreds house glows */}
        <Ring t={t} at={two + 0.2} x={COL_X[1]} y={196} r={72} color={M.gold} out={means} />
        {/* "just 2"? no! */}
        <Fade t={t} at={notJust - 0.1} out={means + 0.2}>
          <g transform={`translate(${wobble(t, notJust + 0.5, { amp: 10, freq: 3, decay: 4 })} 0)`}>
            <Title x={600} y={372} size={70} color={M.inkSoft} stroke={M.white}>
              2
            </Title>
            <UnitCube x={652} y={356} s={30} />
            <UnitCube x={700} y={356} s={30} />
            <Draw t={t} at={notJust + 0.35} dur={0.25} d="M 568 330 L 760 410" stroke={DEEP.coral} width={9} />
            <Draw t={t} at={notJust + 0.5} dur={0.25} d="M 568 410 L 760 330" stroke={DEEP.coral} width={9} />
          </g>
        </Fade>
        {/* the 2 slides down and becomes 200 */}
        {t > means && t < end + 0.4 && (
          <g opacity={1 - progress(t, end, 0.4)}>
            <Title x={bigX - 52 * zeros} y={bigY} size={lerp(104, 120, grow)} color={DEEP.sea} stroke={M.white}>
              2
            </Title>
            {zeros > 0.001 && (
              <g transform={`translate(${bigX - 14} ${bigY}) scale(${zeros})`}>
                <Title x={0} y={0} size={120} color={DEEP.sea} stroke={M.white} anchor="start">
                  00
                </Title>
              </g>
            )}
          </g>
        )}
        {t > means && t < end + 0.4 &&
          [0, 1].map((k) => (
            <Pop key={k} t={t} at={twoHundred + 0.3 + k * 0.2} x={590 + k * 140} y={372} out={end}>
              <Flat x={540 + k * 140} y={318} s={10} />
            </Pop>
          ))}
        <Burst t={t} at={twoHundred + 0.25} x={330} y={372} color={M.gold} r={110} />
      </Camera>
      {/* each digit drops down to what it's worth */}
      {(() => {
        const xs = tokenXs(['1000', '+', '200', '+', '30', '+', '4'], 480, 60, 0.3)
        return PLACES.map((p, i) => (
          <Draw key={i} t={t} at={end + 0.1 + i * 0.15} dur={0.45} d={`M ${COL_X[i]} 270 L ${xs[i * 2]} 368`} stroke={p.ink} width={4} dash="3 9" />
        ))
      })()}
      {/* expanded form */}
      <Equation
        t={t}
        x={480}
        y={410}
        size={60}
        gap={0.3}
        tokens={[
          { text: '1000', color: DEEP.lilac, at: end + 0.2 },
          { text: '+', at: end + 0.35 },
          { text: '200', color: DEEP.sea, at: end + 0.5, s: 1 + 0.08 * pulse(t, 1.4) * (t > end + 1.2 ? 1 : 0) },
          { text: '+', at: end + 0.65 },
          { text: '30', color: DEEP.mint, at: end + 0.8 },
          { text: '+', at: end + 0.95 },
          { text: '4', color: DEEP.gold, at: end + 1.1 },
        ]}
      />
      <Fade t={t} at={end + 1.4}>
        <Title x={480} y={482} size={30} color={M.inkSoft}>
          1,234 is 1 thousand, 2 hundreds, 3 tens and 4 ones
        </Title>
      </Fade>
      <Twinkle t={t} at={end + 1.6} x={480} y={410} r={260} n={5} />
    </>
  )
}

// ── rounding hill ────────────────────────────────────────────────────────────
const HX = (v: number) => 130 + (v - 40) * 70
const HY = (v: number) => 430 - 175 * Math.sin((Math.PI * (v - 40)) / 10)
/** Slope dy/dx of the hill at v. */
const HS = (v: number) => (-175 * Math.cos((Math.PI * (v - 40)) / 10) * (Math.PI / 10)) / 70
/** The hill's outline from a to b (or b back to a when `rev`). */
const hillPath = (a: number, b: number, rev = false) => {
  const pts: string[] = []
  for (let v = a; v <= b + 1e-6; v += 0.25) pts.push(`${HX(v).toFixed(1)} ${HY(v).toFixed(1)}`)
  if (rev) pts.reverse()
  return `M ${pts.join(' L ')}`
}
/** Point r px above the hill at v (along its normal). */
const onHill = (v: number, r: number): [number, number] => {
  const s = HS(v)
  const n = Math.sqrt(1 + s * s)
  return [HX(v) + (s / n) * r, HY(v) - (1 / n) * r]
}

function Ball({ v, r, label, onesColor, rot }: { v: number; r: number; label: string; onesColor: string; rot: number }) {
  const [x, y] = onHill(v, r)
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`rotate(${rot})`}>
        <circle r={r} fill={M.white} stroke={M.ink} strokeWidth={4} />
        <path d={`M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`} fill={shade(M.white, 0.06)} />
        <circle cx={-r * 0.5} cy={-r * 0.55} r={r * 0.12} fill={M.coral} />
      </g>
      <Title x={0} y={2} size={r * 0.95} color={M.ink}>
        <tspan>{label[0]}</tspan>
        <tspan fill={onesColor}>{label[1]}</tspan>
      </Title>
    </g>
  )
}

/** A flag on a pole at hill value v. */
function Flag({ t, at, v, label, color, wave = 0 }: { t: number; at: number; v: number; label: string; color: string; wave?: number }) {
  const x = HX(v)
  const y = HY(v)
  const w = Math.sin(t * 4) * 4 * wave
  return (
    <Pop t={t} at={at} x={x} y={y}>
      <line x1={x} y1={y} x2={x} y2={y - 150} stroke={M.ink} strokeWidth={5} strokeLinecap="round" />
      <path d={`M ${x} ${y - 150} L ${x + 92} ${y - 134 + w} L ${x} ${y - 112} Z`} fill={color} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
      <Title x={x + 34} y={y - 131 + w / 2} size={26} color={M.ink}>
        {label}
      </Title>
    </Pop>
  )
}

/**
 * placeValue/rounding — "To round to the nearest ten, look at the ones digit.
 * If it is five or more, round up to the next ten. If it is less than five,
 * round down and keep the ten you already have."
 * The numbers 40…50 make a hill with 45 at the top and a flag on each ten. A
 * ball marked 46 (the 6 lit) sits on the "5 or more" side and rolls down to
 * 50; a ball marked 43 sits on the "less than 5" side and rolls back to 40.
 */
const rounding: Scene = ({ t, cue }: SceneProps) => {
  const nearest = cue('nearest ten')
  const onesD = cue('ones digit')
  const five = cue('five or more')
  const up = cue('round up')
  const next = cue('next ten')
  const less = cue('less than five')
  const down = cue('round down')
  const keep = cue('keep the ten')
  const have = cue('already have')
  const R = 34
  const rollUp = progress(t, up, 1.0)
  const vA = 46 + 4 * ease.inQuad(rollUp)
  const rollDown = progress(t, down, 1.0)
  const vB = 43 - 3 * ease.inQuad(rollDown)
  const bumpA = wobble(t, up + 1.0, { amp: 6, freq: 2.5, decay: 6 })
  const bumpB = wobble(t, down + 1.0, { amp: 6, freq: 2.5, decay: 6 })
  const rotA = ((HX(vA) - HX(46)) / R) * (180 / Math.PI)
  const rotB = ((HX(vB) - HX(43)) / R) * (180 / Math.PI)
  return (
    <>
      <Paper />
      <Words t={t} at={0.1} text="round to the nearest ten" x={480} y={52} size={40} colors={[undefined, undefined, undefined, DEEP.gold, DEEP.gold]} />
      {/* the hill */}
      <Fade t={t} at={0.3} dur={0.8}>
        <path d={`${hillPath(40, 50)} L ${HX(50)} 540 L ${HX(40)} 540 Z`} fill="#e3f4d9" />
      </Fade>
      {/* slope tints */}
      <Draw t={t} at={five} dur={0.7} d={hillPath(45, 50)} stroke={M.mint} width={22} />
      <Draw t={t} at={less} dur={0.7} d={hillPath(40, 45, true)} stroke="#ffc9c2" width={22} />
      <Draw t={t} at={0.3} dur={1} d={hillPath(40, 50)} stroke={M.ink} width={6} />
      {/* ticks + numbers */}
      {Array.from({ length: 11 }, (_, i) => {
        const v = 40 + i
        const s = HS(v)
        const n = Math.sqrt(1 + s * s)
        const nx = s / n
        const ny = -1 / n
        const x = HX(v)
        const y = HY(v)
        const big = v === 40 || v === 50
        return (
          <Pop key={v} t={t} at={0.8 + i * 0.05} x={x} y={y}>
            <line x1={x - nx * 12} y1={y - ny * 12} x2={x + nx * 12} y2={y + ny * 12} stroke={M.ink} strokeWidth={big || v === 45 ? 5 : 3.5} strokeLinecap="round" />
            {!big && (
              <Title x={x - nx * 36} y={y - ny * 36} size={v === 45 ? 28 : 22} color={v === 45 ? M.ink : M.inkSoft}>
                {v}
              </Title>
            )}
          </Pop>
        )
      })}
      <Flag t={t} at={nearest} v={40} label="40" color={M.gold} wave={t > have ? 1 : 0} />
      <Flag t={t} at={nearest + 0.2} v={50} label="50" color={M.gold} wave={t > next ? 1 : 0} />
      {/* slope labels, painted on the hill along its slope */}
      {[
        { v: 47.2, text: '5 or more: up!', c: DEEP.mint, at: five + 0.2 },
        { v: 42.8, text: 'less than 5: down', c: DEEP.coral, at: less + 0.2 },
      ].map((l) => {
        const s = HS(l.v)
        const n = Math.sqrt(1 + s * s)
        const x = HX(l.v) - (s / n) * 112
        const y = HY(l.v) + (1 / n) * 112
        return (
          <Pop key={l.text} t={t} at={l.at} x={x} y={y}>
            <g transform={`rotate(${(Math.atan(s) * 180) / Math.PI} ${x} ${y})`}>
              <Title x={x} y={y} size={30} color={l.c} stroke="#e3f4d9">
                {l.text}
              </Title>
            </g>
          </Pop>
        )
      })}
      {/* ball 46 → 50 */}
      <Pop t={t} at={onesD - 0.3} x={HX(46)} y={HY(46) - R}>
        <g transform={`translate(0 ${bumpA})`}>
          <Ball v={vA} r={R} label="46" onesColor={DEEP.coral} rot={rotA} />
        </g>
      </Pop>
      {/* the number we're rounding, big, with its ones digit lit */}
      {[
        { n: '46', at: onesD - 0.35, out: less - 0.3, hint: '6 is 5 or more', hintAt: five + 0.1, c: DEEP.mint },
        { n: '43', at: less - 0.1, out: undefined, hint: '3 is less than 5', hintAt: less + 0.4, c: DEEP.coral },
      ].map((b) => (
        <g key={b.n}>
          <Pop t={t} at={b.at} x={440} y={134} out={b.out}>
            <rect x={436} y={100} width={50} height={70} rx={14} fill={M.gold} opacity={0.55 * ease.outCubic(progress(t, b.at + 0.35, 0.3))} />
            <Title x={440} y={136} size={84} color={M.ink} stroke={M.white}>
              <tspan>{b.n[0]}</tspan>
              <tspan fill={DEEP.coral}>{b.n[1]}</tspan>
            </Title>
          </Pop>
          <Pop t={t} at={b.hintAt} x={560} y={136} out={b.out}>
            <Title x={506} y={136} size={32} color={b.c} stroke={M.white} anchor="start">
              {b.hint}
            </Title>
          </Pop>
        </g>
      ))}
      <Burst t={t} at={up + 1.0} x={HX(50)} y={HY(50) - 20} color={M.mint} r={70} />
      <Chip t={t} at={next} x={HX(50) - 10} y={HY(50) + 52} text="46 → 50" color={M.mint} size={26} />
      {/* ball 43 → 40 */}
      <Pop t={t} at={less} x={HX(43)} y={HY(43) - R}>
        <g transform={`translate(0 ${bumpB})`}>
          <Ball v={vB} r={R} label="43" onesColor={DEEP.coral} rot={rotB} />
        </g>
      </Pop>
      <Burst t={t} at={down + 1.0} x={HX(40)} y={HY(40) - 20} color={M.coral} r={70} />
      <Chip t={t} at={keep} x={HX(40) + 10} y={HY(40) + 52} text="43 → 40" color="#ffc9c2" size={26} />
      <Twinkle t={t} at={have + 0.8} x={480} y={HY(45) - 40} r={120} n={4} />
    </>
  )
}

export const placeValueScenes: Record<string, Scene> = { places, regroup, value, rounding }
