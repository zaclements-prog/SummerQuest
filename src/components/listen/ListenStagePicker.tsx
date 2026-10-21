import { useEffect, useRef } from 'react'
import type { CSSProperties, FocusEvent } from 'react'
import { zoneStages, type Stage, type Zone } from '../../curriculum'
import { useProgress } from '../../store/progress'
import { isStageUnlocked } from '../../lib/stageLocks'
import { nextStageToPlay, stagePickerColumns, stagePicture, stageVoice, zoneWelcomeVoice } from '../../lib/listenNav'
import { guide } from '../../guide/store'
import { sfx } from '../../lib/sound'
import { ToonStar } from '../ui'

/**
 * A K–1 zone's stages as big picture buttons (World panel and zone page): a
 * picture each, its stars underneath, no words. A button's title is SAID when
 * it's tapped (then the stage starts) or reached with the keyboard; a locked
 * one says "Play this one first!" and the hand points at the next stage.
 *
 * On mount it says the zone's welcome ("Counting Mesa! Tap a star to play!")
 * with the hand on the next stage to play; 🔊 says it again.
 *
 * Three stages sit in one row, as in the pilot. More (Writing Workshop's four,
 * Letter Reef's eight) share the width evenly in rows of `stagePickerColumns`,
 * a short last row centred; with two rows the pictures shrink with the
 * screen's height, so a sideways tablet shows them all without scrolling.
 */
export function ListenStagePicker({
  zone,
  onPlay,
  size = 'md',
}: {
  zone: Zone
  /** Start a stage (its route). */
  onPlay: (path: string) => void
  /** md: a World panel; lg: the zone page. */
  size?: 'md' | 'lg'
}) {
  const grade = useProgress((s) => s.player?.grade)
  const progress = useProgress((s) => s.zones[zone.id])
  const stages = zoneStages(zone, grade)
  const next = nextStageToPlay(zone, progress, grade)
  const nextId = next?.id ?? null
  const launching = useRef(false)

  useEffect(() => {
    void guide.show({ voice: zoneWelcomeVoice(zone.id, grade), target: nextId ? `stage-${nextId}` : null, cue: 'star' })
    return () => guide.clear({ forget: true })
    // the welcome once per zone (not again as stars come in)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id])

  function say(stage: Stage): Promise<boolean> {
    const v = stageVoice(stage.id)
    return v ? guide.say(v) : Promise.resolve(true)
  }

  async function tap(stage: Stage, locked: boolean) {
    if (launching.current) return
    if (locked) {
      sfx.wrong()
      void guide.show({ voice: { line: 'k-nav/playThisFirst' }, target: nextId ? `stage-${nextId}` : null })
      return
    }
    sfx.click()
    if (!(await say(stage))) return // another tap took over
    launching.current = true
    onPlay(`/play/${zone.id}/${stage.id}`)
  }

  function onFocus(stage: Stage, e: FocusEvent<HTMLButtonElement>) {
    // keyboard / switch access only (a tap says it anyway)
    if (keyboardFocus(e.currentTarget)) void say(stage)
  }

  // three in a row as in the pilot; more share the row evenly (a column count and the gap, as CSS variables)
  const cols = stagePickerColumns(stages.length)
  const shared = stages.length > 3
  const twoRows = stages.length > cols
  const width = shared
    ? `w-[calc((100%_-_(var(--cols)_-_1)_*_var(--gap))_/_var(--cols))] min-w-16 ${size === 'lg' ? 'max-w-[13rem]' : 'max-w-[8.25rem]'}`
    : size === 'lg'
      ? 'w-[min(28vw,13rem)] min-w-[7.5rem]'
      : 'w-[min(28vw,8.25rem)] min-w-24'
  const btn = `${width} ${size === 'lg' ? 'pt-4 pb-3' : 'pt-3 pb-2'} ${twoRows ? 'short:pt-2.5 short:pb-2' : ''}`
  const pic = twoRows
    ? size === 'lg'
      ? 'text-[clamp(2.75rem,min(12vw,11vh),5.5rem)] h-[clamp(3.5rem,min(15vw,14vh),7rem)] short:text-[clamp(2.5rem,13vh,4.5rem)] short:h-[clamp(3rem,17vh,6rem)]'
      : 'text-[clamp(2.25rem,min(10vw,9vh),3.75rem)] h-[clamp(3rem,min(13vw,11vh),4.5rem)] short:text-[clamp(2rem,9vh,3.25rem)] short:h-[clamp(2.75rem,12vh,4rem)]'
    : size === 'lg'
      ? 'text-[clamp(3.5rem,9vw,5.5rem)] h-[clamp(4.5rem,11vw,7rem)]'
      : 'text-[clamp(2.75rem,8vw,3.75rem)] h-[clamp(3.5rem,10vw,4.5rem)]'
  const grid = shared ? 'flex-wrap [--gap:0.75rem] short:[--gap:0.625rem] roomy:[--gap:1.25rem] gap-[var(--gap)]' : 'gap-3 short:gap-2.5 roomy:gap-5'

  return (
    <div
      className={`flex items-stretch justify-center ${grid}`}
      style={shared ? ({ '--cols': cols } as CSSProperties) : undefined}
      data-cols={cols}
      role="group"
      aria-label={`${zone.title} games`}
    >
      {stages.map((stage) => {
        const locked = !isStageUnlocked(zone, stage.id, progress, grade)
        const earned = progress?.stages[stage.id]?.stars ?? 0
        const isNext = stage.id === nextId
        return (
          <button
            key={stage.id}
            type="button"
            data-guide={`stage-${stage.id}`}
            data-stage={stage.id}
            data-locked={locked ? '' : undefined}
            aria-label={locked ? `${stage.title} (locked)` : stage.title}
            title={stage.title}
            onClick={() => void tap(stage, locked)}
            onFocus={(e) => onFocus(stage, e)}
            className={[
              'relative flex flex-col items-center justify-between gap-1.5 rounded-[1.6rem] border-[3px] border-line [text-shadow:none]',
              'transition-[translate,box-shadow,background-color] duration-100 active:translate-y-[3px] active:shadow-ledge-sm',
              'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
              btn,
              locked ? 'bg-cream-100 shadow-ledge-sm' : isNext ? 'bg-quest-200 shadow-ledge hover:bg-quest-100' : 'bg-paper shadow-ledge hover:bg-cream-100',
            ].join(' ')}
          >
            <span
              className={`grid place-items-center leading-none kid-text font-bold text-ink-900 ${pic} ${locked ? 'opacity-45 grayscale' : ''}`}
              aria-hidden="true"
              // (letters as the picture, like "Aa": a picture of letters, not a word to read)
              data-glyph={/\p{L}/u.test(stagePicture(stage)) ? '' : undefined}
            >
              {stagePicture(stage)}
            </span>
            <span className="flex items-center justify-center -space-x-0.5" aria-hidden="true">
              {Array.from({ length: stage.starsToEarn }, (_, i) => (
                <ToonStar key={i} filled={i < earned} px={size === 'lg' ? 30 : 24} />
              ))}
            </span>
            {locked && (
              <span className="absolute -top-3 -right-3 grid place-items-center w-10 h-10 rounded-full bg-paper border-[3px] border-line text-xl" aria-hidden="true">
                🔒
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Focus that came from a keyboard or switch (`:focus-visible`), not a tap. */
function keyboardFocus(el: Element): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    return false
  }
}
