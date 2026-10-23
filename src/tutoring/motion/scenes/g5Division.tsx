/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, progress } from '../anim'
import { Arrow, Burst, Chip, Draw, Equation, Fade, Highlight, Pop, Ring, Title, Twinkle, Words } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'

/*
 * 5th-grade Division Dunes (g5Division). One long division, 672 ÷ 28, worked
 * across three steps on the same board: the divisor is blue, the quotient
 * digits gold-ringed, each product coral, each difference green.
 */
const DIV = DEEP.blue
const PROD = DEEP.coral
const DIFF = DEEP.leaf
const SZ = 64
const DW = 42 // one digit's width at SZ
// the board: the bar's corner, and where each dividend digit sits
const BAR_X = 380
const BAR_Y = 170
const digitX = (i: number) => BAR_X + 34 + i * DW
const row = (k: number) => BAR_Y + 62 + k * 70

/** The bracket and the numbers on it. */
function Board({ t, at = 0 }: { t: number; at?: number }) {
  return (
    <>
      <Draw t={t} at={at} d={`M ${BAR_X} ${BAR_Y + 80} Q ${BAR_X + 16} ${BAR_Y + 30} ${BAR_X} ${BAR_Y - 6} H ${BAR_X + 40 + 3 * DW}`} width={6} />
      <Pop t={t} at={at + 0.3} x={BAR_X - 50} y={row(0)}>
        <Title x={BAR_X - 50} y={row(0)} size={SZ} color={DIV} stroke={M.white}>
          28
        </Title>
      </Pop>
      {['6', '7', '2'].map((d, i) => (
        <Pop key={i} t={t} at={at + 0.5 + i * 0.12} x={digitX(i)} y={row(0)}>
          <Title x={digitX(i)} y={row(0)} size={SZ} color={M.ink} stroke={M.white}>
            {d}
          </Title>
        </Pop>
      ))}
    </>
  )
}

/** A number written one digit per dividend column, starting at column `i0` (a narrow 1 can't drift out of its column). */
function Digits({ text, i0, y, color }: { text: string; i0: number; y: number; color: string }) {
  return (
    <>
      {[...text].map((d, k) => (
        <Title key={k} x={digitX(i0 + k)} y={y} size={SZ} color={color} stroke={M.white}>
          {d}
        </Title>
      ))}
    </>
  )
}

/** A quotient digit above dividend place `i`. */
function QDigit({ t, at, i, d }: { t: number; at: number; i: number; d: string }) {
  return (
    <>
      <Pop t={t} at={at} x={digitX(i)} y={BAR_Y - 40}>
        <Title x={digitX(i)} y={BAR_Y - 40} size={SZ} color={M.ink} stroke={M.white}>
          {d}
        </Title>
      </Pop>
      <Ring t={t} at={at + 0.1} x={digitX(i)} y={BAR_Y - 44} r={34} color={M.gold} />
    </>
  )
}

/** g5Division/setup — the bar draws; 28 outside, 672 inside, each named. */
const setup: Scene = ({ t, cue }: SceneProps) => {
  const lets = cue("Let's divide")
  const out = cue('goes outside the bar')
  const inside = cue('goes inside')
  return (
    <>
      <Words t={t} at={0.2} text="one place at a time" x={480} y={70} size={40} out={lets} />
      <Equation t={t} x={480} y={70} size={56} tokens={[{ text: '672', at: lets + 0.3 }, { text: '÷', at: lets + 0.5 }, { text: '28', color: DIV, at: lets + 0.7 }]} />
      <Board t={t} at={lets + 0.8} />
      <Fade t={t} at={out}>
        <Title x={BAR_X - 50} y={row(0) + 60} size={26} color={DIV} stroke={M.white}>
          divisor
        </Title>
      </Fade>
      <Fade t={t} at={inside}>
        <Title x={digitX(1)} y={row(0) + 60} size={26} color={M.inkSoft} stroke={M.white}>
          dividend
        </Title>
      </Fade>
      <Twinkle t={t} at={inside + 0.5} x={digitX(1)} y={row(0)} r={90} n={4} />
    </>
  )
}

/** g5Division/estimate — 6 is too small; 67 lights; 28 ≈ 30; 2 on top; 56 under; 67 − 56 = 11. */
const estimate: Scene = ({ t, cue }: SceneProps) => {
  const six = cue('does not fit in six')
  const look = cue('look at sixty-seven')
  const close = cue('close to thirty')
  const two = cue('two times.')
  const prod = cue('is fifty-six')
  const minus = cue('Sixty-seven minus')
  return (
    <>
      <Board t={t} />
      <Highlight t={t} at={six} x={digitX(0) - 22} y={row(0)} w={DW + 2} h={70} color={M.coral} out={look} />
      <Highlight t={t} at={look} x={digitX(0) - 22} y={row(0)} w={DW * 2 + 2} h={70} color={M.gold} />
      <Chip t={t} at={close} x={760} y={150} text="28 ≈ 30" ink={DIV} color={M.white} size={34} />
      <Chip t={t} at={close + 0.6} x={760} y={220} text="30 × 2 = 60" ink={M.inkSoft} color={M.white} size={30} />
      <QDigit t={t} at={two} i={1} d="2" />
      <Pop t={t} at={prod} x={digitX(0.5)} y={row(1)}>
        <Title x={digitX(0.5)} y={row(1)} size={SZ} color={PROD} stroke={M.white}>
          − 56
        </Title>
      </Pop>
      <Draw t={t} at={minus} d={`M ${digitX(0) - 40} ${row(1) + 34} H ${digitX(1) + 24}`} width={5} />
      <Pop t={t} at={minus + 0.8} x={digitX(0.5)} y={row(2)}>
        <Digits text="11" i0={0} y={row(2)} color={DIFF} />
      </Pop>
    </>
  )
}

/** g5Division/bringDown — the 2 drops down beside 11 to make 112; 4 on top; 112 − 112 = 0; 672 ÷ 28 = 24. */
const bringDown: Scene = ({ t, cue }: SceneProps) => {
  const bring = cue('Bring down the two')
  const four = cue('four times,')
  const nothing = cue('Nothing is left')
  const so = cue('so six hundred')
  const k = ease.inOutCubic(progress(t, bring, 0.7))
  const [x, y] = arc([digitX(2), row(0)], [digitX(2), row(2)], 30, k)
  return (
    <>
      <Board t={t} />
      <Title x={digitX(1)} y={BAR_Y - 40} size={SZ} color={M.ink} stroke={M.white}>
        2
      </Title>
      <Title x={digitX(0.5)} y={row(1)} size={SZ} color={PROD} stroke={M.white}>
        − 56
      </Title>
      <path d={`M ${digitX(0) - 40} ${row(1) + 34} H ${digitX(1) + 24}`} stroke={M.ink} strokeWidth={5} strokeLinecap="round" />
      <Digits text="11" i0={0} y={row(2)} color={DIFF} />
      {k > 0 && (
        <Title x={x} y={y} size={SZ} color={k >= 1 ? DIFF : M.ink} stroke={M.white}>
          2
        </Title>
      )}
      <Arrow t={t} at={bring} from={[digitX(2) + 34, row(0) + 10]} to={[digitX(2) + 34, row(2) - 30]} bend={0.3} color={M.gold} />
      <QDigit t={t} at={four} i={2} d="4" />
      {/* 112 sits in the 6-7-2 columns, under the 112 above it; its minus stands to the left */}
      <Pop t={t} at={four + 0.6} x={digitX(1)} y={row(3)}>
        <Title x={digitX(-1) - 6} y={row(3)} size={SZ} color={PROD} stroke={M.white}>
          −
        </Title>
        <Digits text="112" i0={0} y={row(3)} color={PROD} />
      </Pop>
      <Draw t={t} at={nothing - 0.3} d={`M ${digitX(0) - 40} ${row(3) + 34} H ${digitX(2) + 24}`} width={5} />
      <Pop t={t} at={nothing} x={digitX(2)} y={row(4)}>
        <Title x={digitX(2)} y={row(4)} size={SZ} color={DIFF} stroke={M.white}>
          0
        </Title>
      </Pop>
      <Equation t={t} x={770} y={300} size={54} tokens={[{ text: '672', at: so }, { text: '÷', at: so + 0.15 }, { text: '28', color: DIV, at: so + 0.3 }, { text: '=', at: so + 0.45 }, { text: '24', at: so + 0.6 }]} />
      <Burst t={t} at={so + 0.7} x={870} y={300} color={M.gold} r={70} />
    </>
  )
}

/**
 * g5Division/remainders — 157 ÷ 24 = 6 R 13; six full buses roll in and a
 * seventh with 13 riders; three signs: round up → 7, drop it → 6, left over → 13.
 */
const remainders: Scene = ({ t, cue }: SceneProps) => {
  const rem = cue('six remainder thirteen')
  const up = cue('round up to seven')
  const full = cue('only for full groups')
  const left = cue('what is left over')
  return (
    <>
      <Equation t={t} x={480} y={80} size={56} tokens={[{ text: '157', at: 0.3 }, { text: '÷', at: 0.45 }, { text: '24', color: DIV, at: 0.6 }, { text: '=', at: rem }, { text: '6 R 13', color: M.ink, at: rem + 0.2 }]} />
      {Array.from({ length: 7 }, (_, i) => {
        const at = rem + 0.3 + i * 0.15
        const k = ease.outCubic(progress(t, at, 0.5))
        if (k <= 0) return null
        const bx = 110 + i * 112 - (1 - k) * 200
        const partial = i === 6
        return (
          <g key={i} opacity={k}>
            <rect x={bx - 46} y={180} width={92} height={56} rx={12} fill={partial ? '#fff1c4' : '#ffd36b'} stroke={partial && t >= up ? M.gold : M.ink} strokeWidth={partial && t >= up ? 6 : 4} />
            <circle cx={bx - 26} cy={240} r={11} fill={M.ink} />
            <circle cx={bx + 26} cy={240} r={11} fill={M.ink} />
            <Title x={bx} y={210} size={26} color={M.ink}>
              {partial ? '13' : '24'}
            </Title>
          </g>
        )
      })}
      <Chip t={t} at={up} x={180} y={360} text="round up → 7 buses" ink={DEEP.gold} color={M.white} size={30} />
      <Chip t={t} at={full} x={480} y={430} text="full groups → 6" ink={DEEP.blue} color={M.white} size={30} />
      <Chip t={t} at={left} x={780} y={360} text="left over → 13" ink={DIFF} color={M.white} size={30} />
      <Twinkle t={t} at={left + 0.6} x={480} y={390} r={300} n={5} />
    </>
  )
}

export const g5DivisionScenes: Record<string, Scene> = { setup, estimate, bringDown, remainders }
