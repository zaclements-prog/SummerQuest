/* eslint-disable react-refresh/only-export-components -- an activity module exports its definition (component + askSteps) for the registry; not an HMR boundary */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { GuideEvent, GuideStep } from '../../../guide/store'
import { guide } from '../../../guide/store'
import { sfx } from '../../../lib/sound'
import { voiceText } from '../../../voice/registry'
import { PictureArt } from '../PictureCard'
import type { ListenActivityDef, ListenActivityProps, ListenProblem } from '../types'
import { TILES_PICTURE, TILES_SLOTS, TILES_TRAY, tilesSlot, tilesTile, type TilesSpec } from './tilesSpec'
import './readTiles.css'

/**
 * The `tiles` activity (Writing Workshop, 1st grade): spell a word from letter
 * tiles, or build a sentence from word tiles and the period (see ./tilesSpec).
 *
 * - A tap on a tile drops it into the next empty slot (a letter says its
 *   name); a tap on a filled slot sends its tile back to the tray.
 * - All slots filled → checked. Right → the slots turn green and the word is
 *   said (a sentence read back, each word lighting), then the try that was
 *   right. Not yet → the slots that are wrong wobble (the right ones stay),
 *   and it is the try that wasn't: the shell says "let's look again", the help
 *   says it again slowly, each slot lighting with the tile that goes there,
 *   and the wrong tiles go back. From the third try the empty slots show
 *   their tile faintly.
 *
 * Never a timer, never failing out. The only printed words are the tiles
 * themselves (the content: `data-tiles`). Guide ids: `tiles-picture`,
 * `tiles-slots`, `tiles-slot-<k>`, `tiles-tray`, `tiles-tile-<i>`. Dev builds
 * mark each tile with the slot it belongs in (`data-want`), for the bot.
 */

type Check = 'build' | 'checking' | 'right' | 'wrong'

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Events lighting slot k as the line reaches `at[k]` (−1: with the one before), and none once it is said. */
function slotEvents(at: readonly number[], light: (k: number) => void, textLength: number): GuideEvent[] {
  const evs: GuideEvent[] = []
  at.forEach((char, k) => {
    if (char >= 0) evs.push({ char, run: () => light(k) })
  })
  evs.push({ char: textLength + 1, run: () => light(-1) })
  return evs
}

function tilesAskSteps(problem: ListenProblem, spec: TilesSpec): GuideStep[] {
  if (spec.mode === 'letters') {
    return [
      { voice: problem.speech ?? null, target: TILES_PICTURE, hand: false, pad: 8 },
      { target: TILES_SLOTS, cue: 'Tap', hand: false, pad: 8 },
      { target: TILES_TRAY, cue: 'letters', hand: 'sweep', pad: 10 },
    ]
  }
  return [
    { voice: problem.speech ?? null, target: TILES_SLOTS, hand: false, pad: 8 },
    { target: TILES_TRAY, cue: 0.55, hand: 'sweep', pad: 10 },
  ]
}

function TileBuild({ spec, active, misses, onAttempt, registerHelp }: ListenActivityProps<TilesSpec>) {
  const [placed, setPlaced] = useState<(number | null)[]>(() => spec.units.map(() => null))
  const [locked, setLocked] = useState<boolean[]>(() => spec.units.map(() => false))
  const [check, setCheck] = useState<Check>('build')
  const [wrong, setWrong] = useState<number[]>([])
  const [lit, setLitSlot] = useState(-1)
  const [ghost, setGhost] = useState(false)
  const mounted = useRef(true)
  const now = useRef({ active, onAttempt })
  useLayoutEffect(() => {
    now.current = { active, onAttempt }
  })
  const owed = useRef<boolean | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  function report(correct: boolean) {
    if (!mounted.current) return
    if (now.current.active) {
      owed.current = null
      now.current.onAttempt(correct)
    } else owed.current = correct
  }
  useEffect(() => {
    if (active && owed.current !== null) report(owed.current)
  })

  const tileAt = (k: number) => {
    const i = placed[k]
    return i === null || i === undefined ? null : spec.tiles[i]
  }
  const used = new Set(placed.filter((i): i is number => i !== null))

  /** A line said with the slots lighting on their words (the done line, the help). */
  async function sayLit(line: TilesSpec['help']) {
    let text: string
    try {
      text = voiceText(line.line)
    } catch {
      text = ''
    }
    const evs = slotEvents(line.at, (k) => mounted.current && setLitSlot(k), text.length)
    await guide.sequence([{ voice: line.line, target: TILES_SLOTS, hand: false, pad: 8, pause: 0.4, events: evs }], { repeatable: false })
    if (mounted.current) setLitSlot(-1)
  }

  // the help after a miss: the tiles in the wrong place go back to the tray, the rule or "let's spell it
  // together", then it said slowly, each slot lighting with its tile (a faint one where the slot is empty)
  useEffect(() => {
    registerHelp(async () => {
      if (!mounted.current) return
      setWrong([])
      setPlaced((p) => p.map((i, k) => (i !== null && spec.tiles[i] === spec.units[k] ? i : null)))
      setGhost(true)
      if (spec.helpIntro) await guide.show({ voice: spec.helpIntro, target: TILES_SLOTS, hand: false, pad: 8 }, { repeatable: false })
      if (!mounted.current) return
      await sayLit(spec.help)
      if (!mounted.current) return
      await wait(250)
      setGhost(false)
      setCheck('build')
    })
    return () => registerHelp(null)
  })

  async function judge(next: (number | null)[]) {
    setCheck('checking')
    await wait(450)
    if (!mounted.current) return
    const ok = next.map((i, k) => i !== null && spec.tiles[i] === spec.units[k])
    if (ok.every(Boolean)) {
      setLocked(spec.units.map(() => true))
      setCheck('right')
      sfx.sparkle()
      if (spec.done) await sayLit(spec.done)
      report(true)
      return
    }
    setLocked(ok)
    setWrong(ok.flatMap((v, k) => (v ? [] : [k])))
    setCheck('wrong')
    report(false)
  }

  function tapTile(i: number) {
    if (!active || check !== 'build' || used.has(i)) return
    const k = placed.findIndex((p) => p === null)
    if (k < 0) return
    sfx.pop()
    const next = placed.map((p, j) => (j === k ? i : p))
    setPlaced(next)
    const speech = spec.tileSpeech[i]
    if (speech) void guide.say(speech)
    if (next.every((p) => p !== null)) void judge(next)
  }

  function tapSlot(k: number) {
    if (!active || check !== 'build' || placed[k] === null || locked[k]) return
    sfx.tick()
    setPlaced(placed.map((p, j) => (j === k ? null : p)))
  }

  const letters = spec.mode === 'letters'
  // sizes: a letter tile is a square; a word tile is as wide as its word
  const unit = letters ? 'min(18vmin, 7.5rem)' : 'min(14vmin, 5.5rem)'
  const font = letters ? `calc(${unit} * 0.62)` : `calc(${unit} * 0.5)`
  const hints = misses >= 2

  return (
    <div
      className="tiles flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center gap-5 short:gap-3 roomy:gap-8 pb-1"
      data-tiles=""
      data-mode={spec.mode}
      data-check={check}
      style={{ ['--tile' as string]: unit }}
    >
      {/* the picture (spelling) and the slots */}
      <div className="flex items-center justify-center gap-5 short:gap-4 max-w-full min-h-0">
        {letters && spec.emoji && (
          <div data-guide={TILES_PICTURE} className="relative shrink-0 aspect-square w-[min(34vmin,14rem)] bg-paper border-[3px] border-line rounded-[1.75rem] shadow-card">
            <div className="absolute inset-[10%]">
              <PictureArt picture={{ kind: 'emoji', emoji: spec.emoji }} />
            </div>
          </div>
        )}
        <div
          data-guide={TILES_SLOTS}
          data-right={check === 'right' ? '' : undefined}
          className="tiles-row flex flex-wrap items-end justify-center gap-[calc(var(--tile)*0.14)] max-w-full p-2 rounded-[1.5rem] bg-paper/60 border-[3px] border-dashed border-line/30"
          role="group"
          aria-label="slots"
        >
          {spec.units.map((u, k) => {
            const t = tileAt(k)
            // a slot is as wide as its word, or as the (wrong) tile put in it when that is longer
            const shown = t !== null && t.length > u.length ? t : u
            const w = letters ? `var(--tile)` : shown === '.' ? `calc(${unit} * 0.7)` : `max(calc(var(--tile) * 1.2), calc(${shown.length + 1.2} * ${font} * 0.62))`
            return (
              <button
                key={k}
                type="button"
                data-guide={tilesSlot(k)}
                data-slot={k}
                data-filled={t !== null ? '' : undefined}
                data-lit={lit === k ? '' : undefined}
                data-wrong={wrong.includes(k) ? '' : undefined}
                aria-label={t ?? 'empty'}
                onClick={() => tapSlot(k)}
                className={[
                  'tiles-slot relative grid place-items-center leading-none rounded-[0.9rem] border-[3px] text-ink-900 outline-none',
                  t !== null ? 'bg-paper border-line shadow-ledge-sm' : 'bg-ocean-50 border-dashed border-ocean-300',
                  locked[k] ? 'cursor-default' : 'cursor-pointer',
                ].join(' ')}
                style={{ width: w, height: unit, fontSize: font }}
              >
                {t !== null ? (
                  <span className="tiles-in" key={`${k}-${placed[k]}`}>
                    {t === '.' ? <PeriodDot /> : t}
                  </span>
                ) : ghost || hints ? (
                  <span className="tiles-ghost">{u === '.' ? <PeriodDot /> : u}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* the tray */}
      <div data-guide={TILES_TRAY} className="flex flex-wrap items-center justify-center gap-[calc(var(--tile)*0.18)] max-w-full px-2" role="group" aria-label="tiles">
        {spec.tiles.map((t, i) => {
          const gone = used.has(i)
          const want = import.meta.env.DEV ? spec.units.findIndex((u, k) => u === t && !spec.units.slice(0, k).includes(u)) : -1
          return (
            <button
              key={i}
              type="button"
              data-guide={tilesTile(i)}
              data-tile={t}
              data-used={gone ? '' : undefined}
              data-want={import.meta.env.DEV && want >= 0 ? want : undefined}
              aria-label={t === '.' ? 'period' : t}
              aria-disabled={gone || !active || check !== 'build' || undefined}
              onClick={() => tapTile(i)}
              className={[
                'tiles-tile grid place-items-center leading-none text-ink-900 border-[3px] border-line shadow-ledge rounded-[0.9rem] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
                i % 3 === 0 ? 'bg-quest-100' : i % 3 === 1 ? 'bg-ocean-100' : 'bg-monster-100',
                gone ? '' : 'cursor-pointer',
              ].join(' ')}
              style={{
                height: unit,
                minWidth: letters || t === '.' ? unit : `calc(${unit} * 1.2)`,
                padding: letters ? 0 : `0 calc(${font} * 0.4)`,
                fontSize: font,
                // (a tile in a slot leaves its place on the tray empty: it keeps the row from jumping)
                visibility: gone ? 'hidden' : undefined,
              }}
            >
              {t === '.' ? <PeriodDot /> : t}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The period: a big round dot, sitting on the line. */
function PeriodDot() {
  return <span className="block w-[0.34em] h-[0.34em] rounded-full bg-ink-900 translate-y-[0.22em]" aria-hidden="true" />
}

export const tilesActivity: ListenActivityDef<TilesSpec> = {
  Component: TileBuild,
  askSteps: tilesAskSteps,
}
