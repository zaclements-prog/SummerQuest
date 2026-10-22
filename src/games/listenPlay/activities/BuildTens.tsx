/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { countAlongOffsets } from '../../../lib/numberWords'
import { sfx } from '../../../lib/sound'
import { Rod, UnitCube } from '../../../tutoring/motion/shapes'
import { M } from '../../../tutoring/motion/palette'
import { voiceText } from '../../../voice/registry'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { BigNumeral, type BlockMarks } from './baseTen'
import { countBlocksLines, onesOf, sayTens, tensOf, type BuildTensSpec } from './tensSpecs'
import { nap } from './numberKit'
import './tens.css'

/**
 * The `buildTens` activity (Tens Plateau, 1.NBT.2): the number to make (a big
 * numeral), a place-value mat (the tens' side mint, the ones' side gold, a
 * rod and a cube drawn at the top of each: no words), a rod button, a cube
 * button, ⟲ and ✓. "Make thirty-six: three tens and six ones! Then tap the
 * check." Each tap puts a rod (a ten) or a cube (a one) on the mat and says
 * the running count; a tap on a block on the mat takes it back. A tenth cube
 * snaps the ten cubes into a rod ("Ten ones make a ten!", 1.NBT.2a). ✓ says
 * "that's it" (no timers, nothing sent on its own).
 *
 * After a miss the help clears the mat, puts the rods down one by one as the
 * tens are counted ("Ten, twenty, thirty."), the cubes as the ones are counted
 * on ("Thirty-one!…"), and says "Three tens and six ones: thirty-six." The
 * next try starts with the tens in place.
 *
 * Guide ids: `tens-number` (the numeral), `tens-mat`, `tens-add-rod`,
 * `tens-add-cube`, `tens-check`.
 */

export const TENS_NUMBER = 'tens-number'
export const TENS_MAT = 'tens-mat'
export const TENS_ADD_ROD = 'tens-add-rod'
export const TENS_ADD_CUBE = 'tens-add-cube'
export const TENS_CHECK = 'tens-check'

const MAX_RODS = 9
const MAX_ONES = 9

interface Blocks {
  rods: number
  ones: number
}

function BuildTens({ problem, spec, phase, active, misses, onAttempt, registerHelp }: ListenActivityProps<BuildTensSpec>) {
  // the blocks of this try: a new try (misses + 1) starts with the tens in place
  const round = useMemo(() => ({ problem, misses }), [problem, misses])
  const start: Blocks = misses > 0 ? { rods: tensOf(spec.n), ones: 0 } : { rods: 0, ones: 0 }
  const [state, setState] = useState<{ round: typeof round } & Blocks>({ round, ...start })
  const blocks: Blocks = state.round === round ? { rods: state.rods, ones: state.ones } : start
  // the help's count: each block gets its number until the next try
  const [marks, setMarks] = useState<{ round: typeof round; m: BlockMarks }>({ round, m: {} })
  const [helping, setHelping] = useState(false)
  // the rod a tenth cube just made (it pops in)
  const [snapped, setSnapped] = useState<number | null>(null)

  const set = useCallback((b: Blocks) => setState({ round, rods: Math.max(0, Math.min(MAX_RODS, b.rods)), ones: Math.max(0, Math.min(MAX_ONES, b.ones)) }), [round])

  // the help after a miss: the rods counted by tens as they go down, then the cubes counted on
  useEffect(() => {
    const help = async () => {
      setHelping(true)
      setSnapped(null)
      setMarks({ round, m: {} })
      set({ rods: 0, ones: 0 })
      const t = tensOf(spec.n)
      const c = countBlocksLines(spec.n)
      const mark = (key: string, num: number) => setMarks((x) => ({ round, m: { ...(x.round === round ? x.m : {}), [key]: num } }))
      const steps: GuideStep[] = [{ voice: { line: 'g1-tens/letsMake' }, target: TENS_MAT, hand: false, pad: 8, pause: 0.3 }]
      if (c.tens) {
        steps.push({
          voice: c.tens,
          target: TENS_MAT,
          hand: false,
          pad: 8,
          pause: 0.3,
          events: countAlongOffsets(voiceText(c.tens)).map((char, k) => ({
            char,
            run: () => {
              set({ rods: k + 1, ones: 0 })
              mark(`r${k}`, (k + 1) * 10)
            },
          })),
        })
      }
      c.ones.forEach((voice, k) =>
        steps.push({
          voice,
          target: TENS_MAT,
          hand: false,
          pad: 8,
          pause: 0.1,
          events: [
            {
              char: 0,
              run: () => {
                set({ rods: t, ones: k + 1 })
                mark(`o${k}`, t * 10 + k + 1)
              },
            },
          ],
        }),
      )
      steps.push({ voice: c.is, target: TENS_MAT, hand: false, pad: 8, pause: 0.45 })
      await guide.sequence(steps, { repeatable: false })
      await nap(200)
      setHelping(false)
    }
    registerHelp(help)
    return () => registerHelp(null)
  }, [registerHelp, spec, set, round])

  const can = active && !helping
  const total = blocks.rods * 10 + blocks.ones
  function addRod() {
    if (!can || blocks.rods >= MAX_RODS) return
    sfx.pop()
    setSnapped(null)
    set({ ...blocks, rods: blocks.rods + 1 })
    void guide.say(sayTens(total + 10))
  }
  function addCube() {
    if (!can) return
    if (blocks.ones >= MAX_ONES) {
      // ten ones make a ten: the cubes snap into a rod
      if (blocks.rods >= MAX_RODS) return
      sfx.pop()
      setSnapped(blocks.rods)
      set({ rods: blocks.rods + 1, ones: 0 })
      void guide.sequence([{ voice: { line: 'g1-tens/tenOnesMakeTen' }, target: TENS_MAT, hand: false, pad: 8, pause: 0.2 }, { voice: sayTens(total + 1), target: TENS_MAT, hand: false, pad: 8 }], { repeatable: false })
      return
    }
    sfx.pop()
    set({ ...blocks, ones: blocks.ones + 1 })
    void guide.say(sayTens(total + 1))
  }
  function takeRod() {
    if (!can || !blocks.rods) return
    sfx.tick()
    setSnapped(null)
    set({ ...blocks, rods: blocks.rods - 1 })
  }
  function takeCube() {
    if (!can || !blocks.ones) return
    sfx.tick()
    set({ ...blocks, ones: blocks.ones - 1 })
  }
  function reset() {
    if (!can || !total) return
    sfx.whoosh()
    setSnapped(null)
    set({ rods: 0, ones: 0 })
  }
  function done() {
    if (!can || !total) return
    sfx.pop()
    onAttempt(total === spec.n)
  }

  const right = phase === 'praise' || phase === 'done' || phase === 'loading'
  const m = marks.round === round ? marks.m : {}
  return (
    <div
      className="flex-1 min-h-0 min-w-0 flex flex-col landscape:flex-row items-stretch justify-center gap-4 short:gap-3 roomy:gap-6"
      data-tens-build={import.meta.env.DEV ? spec.n : undefined}
      data-tens-rods={blocks.rods}
      data-tens-ones={blocks.ones}
      data-state={right ? 'right' : phase === 'oops' ? 'look' : 'idle'}
    >
      {/* the number to make */}
      <div className="shrink-0 flex landscape:flex-col items-center justify-center">
        <div data-guide={TENS_NUMBER} className="relative w-28 h-28 short:w-32 short:h-32 roomy:w-40 roomy:h-40 bg-paper border-[3px] border-line rounded-[1.75rem] shadow-card">
          <span className="absolute inset-[10%]">
            <BigNumeral n={spec.n} />
          </span>
        </div>
      </div>

      {/* the mat: tens on the left, ones on the right */}
      {/* (upright, the mat keeps its own shape instead of stretching tall) */}
      <div data-guide={TENS_MAT} className="tq-mat relative min-h-0 min-w-0 portrait:w-full portrait:aspect-[340/190] portrait:max-h-full portrait:self-center landscape:flex-1 bg-paper border-[3px] border-line rounded-[2rem] shadow-card overflow-hidden">
        <Mat blocks={blocks} marks={m} snapped={snapped} onRod={can ? takeRod : undefined} onCube={can ? takeCube : undefined} />
      </div>

      {/* a rod, a cube, ⟲ and ✓ */}
      <div className="shrink-0 grid grid-cols-4 landscape:grid-cols-2 items-center justify-items-center gap-3 roomy:gap-4">
        <BinButton label="Add a ten" guideId={TENS_ADD_ROD} onClick={addRod} disabled={!can || blocks.rods >= MAX_RODS}>
          <Rod x={44} y={6} s={8.4} />
        </BinButton>
        <BinButton label="Add a one" guideId={TENS_ADD_CUBE} onClick={addCube} disabled={!can || (blocks.ones >= MAX_ONES && blocks.rods >= MAX_RODS)}>
          <UnitCube x={30} y={40} s={30} />
        </BinButton>
        <RoundButton icon="⟲" label="Start over" onClick={reset} disabled={!can || !total} />
        <RoundButton icon="✓" label="Done" onClick={done} disabled={!can || !total} guide={TENS_CHECK} big />
      </div>
    </div>
  )
}

// ── the mat ──────────────────────────────────────────────────────────────────

const MW = 340
const MH = 190
const S = 13
const ROD_PITCH = 24
const ROD_TOP = 40
const TENS_W = 226

/** The place-value mat: rods stand on the tens' side (mint), cubes sit in two columns on the ones' side (gold). Tap one to take it back. */
function Mat({ blocks, marks, snapped, onRod, onCube }: { blocks: Blocks; marks: BlockMarks; snapped: number | null; onRod?: () => void; onCube?: () => void }) {
  const key = (f?: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      f?.()
    }
  }
  const badge = (x: number, y: number, n: number) => (
    <g transform={`translate(${x} ${y})`}>
      <g className="lp-badge">
        <circle r={9.5} fill="#ffcf4d" stroke={M.ink} strokeWidth={2.2} />
        <text y={0.8} fontFamily={M.font} fontWeight={700} fontSize={n > 99 ? 8 : 10} textAnchor="middle" dominantBaseline="central" fill={M.ink}>
          {n}
        </text>
      </g>
    </g>
  )
  return (
    <svg viewBox={`0 0 ${MW} ${MH}`} className="block w-full h-full" role="group" aria-label="mat">
      {/* the two sides, in the blocks' own colours (no words) */}
      <rect x={6} y={6} width={TENS_W} height={MH - 12} rx={14} fill="#d9f4ea" stroke={M.ink} strokeOpacity={0.35} strokeWidth={2} />
      <rect x={TENS_W + 12} y={6} width={MW - TENS_W - 18} height={MH - 12} rx={14} fill="#fff1c9" stroke={M.ink} strokeOpacity={0.35} strokeWidth={2} />
      {/* the rods */}
      {Array.from({ length: blocks.rods }, (_, k) => {
        const x = 18 + k * ROD_PITCH
        const y = ROD_TOP
        const n = marks[`r${k}`]
        return (
          <g
            key={`r${k}`}
            className={`lp-obj ${snapped === k ? 'tq-snap' : 'tq-land'}`}
            data-mat-rod={k}
            data-marked={n !== undefined ? '' : undefined}
            role={onRod ? 'button' : undefined}
            tabIndex={onRod ? 0 : undefined}
            aria-label={onRod ? 'take back' : undefined}
            onClick={onRod}
            onKeyDown={onRod ? key(onRod) : undefined}
            style={onRod ? { cursor: 'pointer' } : undefined}
          >
            {onRod && <rect x={x - 5} y={y - 10} width={ROD_PITCH} height={S * 10 + 16} fill="transparent" />}
            {n !== undefined && <rect x={x - 4} y={y - 8} width={S + 12} height={S * 10 + 14} rx={5} fill="#ffe594" stroke="#ffcf4d" strokeWidth={2.5} />}
            <Rod x={x} y={y} s={S} />
            {n !== undefined && badge(x + S / 2 + 2, y - 14, n)}
          </g>
        )
      })}
      {/* the cubes: two columns of five, filled from the bottom */}
      {Array.from({ length: blocks.ones }, (_, k) => {
        const col = Math.floor(k / 5)
        const x = TENS_W + 40 + col * 36
        const y = ROD_TOP + S * 10 - S - (k % 5) * 24
        const n = marks[`o${k}`]
        return (
          <g
            key={`o${k}`}
            className="lp-obj tq-land"
            data-mat-cube={k}
            data-marked={n !== undefined ? '' : undefined}
            role={onCube ? 'button' : undefined}
            tabIndex={onCube ? 0 : undefined}
            aria-label={onCube ? 'take back' : undefined}
            onClick={onCube}
            onKeyDown={onCube ? key(onCube) : undefined}
            style={onCube ? { cursor: 'pointer' } : undefined}
          >
            {onCube && <rect x={x - 9} y={y - 8} width={S + 18} height={S + 14} fill="transparent" />}
            {n !== undefined && <rect x={x - 4} y={y - 8} width={S + 12} height={S + 12} rx={5} fill="#ffe594" stroke="#ffcf4d" strokeWidth={2.5} />}
            <UnitCube x={x} y={y} s={S} />
            {/* (the badge beside its column: left of the first, right of the second) */}
            {n !== undefined && badge(col === 0 ? x - 13 : x + S + 16, y + S / 2 - 2, n)}
          </g>
        )
      })}
    </svg>
  )
}

function BinButton({ label, guideId, onClick, disabled, children }: { label: string; guideId: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-guide={guideId}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={[
        'grid place-items-center shrink-0 rounded-[1.4rem] bg-paper border-[3px] border-line shadow-ledge w-20 h-20 roomy:w-24 roomy:h-24',
        'transition-[translate,box-shadow,opacity] duration-100 outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
        disabled ? 'opacity-45 cursor-default' : 'active:translate-y-[3px] active:shadow-ledge-sm cursor-pointer',
      ].join(' ')}
    >
      <svg viewBox="0 0 100 100" className="block w-[86%] h-[86%]" aria-hidden="true">
        {children}
      </svg>
    </button>
  )
}

function RoundButton({ icon, label, onClick, disabled, guide: guideId, big = false }: { icon: string; label: string; onClick: () => void; disabled: boolean; guide?: string; big?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-guide={guideId}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={[
        'grid place-items-center shrink-0 rounded-full leading-none select-none font-bold text-ink-900 [text-shadow:none]',
        'border-[3px] border-line shadow-ledge transition-[translate,box-shadow,opacity] duration-100',
        disabled ? 'opacity-45 cursor-default' : 'active:translate-y-[3px] active:shadow-ledge-sm cursor-pointer',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
        big ? 'bg-correct-400 w-20 h-20 text-4xl roomy:w-24 roomy:h-24 roomy:text-5xl' : 'bg-paper w-16 h-16 text-3xl roomy:w-[4.5rem] roomy:h-[4.5rem]',
      ].join(' ')}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

/** The number as the line starts, the mat a moment later, the rod and cube buttons on "tens" / "ones", ✓ on "check". */
function askSteps(problem: ListenProblem, spec: BuildTensSpec): GuideStep[] {
  const text = problem.speech ? voiceText(problem.speech) : ''
  const has = (p: string) => text.toLowerCase().includes(p)
  return [
    { voice: problem.speech ?? null, target: TENS_NUMBER, hand: false, pad: 8 },
    ...(tensOf(spec.n) && has(tensOf(spec.n) === 1 ? ' ten' : ' tens') ? [{ target: TENS_ADD_ROD, cue: tensOf(spec.n) === 1 ? ' ten' : ' tens', hand: 'tap' as const, pad: 8 }] : []),
    ...(onesOf(spec.n) && has(' one') ? [{ target: TENS_ADD_CUBE, cue: onesOf(spec.n) === 1 ? ' one!' : ' ones', hand: 'tap' as const, pad: 8 }] : []),
    { target: TENS_CHECK, cue: 'check', hand: 'tap', pad: 10 },
  ]
}

export const buildTensActivity: ListenActivityDef<BuildTensSpec> = { Component: BuildTens, askSteps }
