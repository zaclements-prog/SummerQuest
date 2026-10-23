import { useEffect } from 'react'
import { zoneTitle, type Stage, type Zone } from '../curriculum'
import { Button, Celebration, Medallion, ToonStar } from '../components/ui'
import { useListenSay } from '../components/listen/useListenSay'
import { guide } from '../guide/store'
import { stagePicture } from '../lib/listenNav'
import type { QuestReason } from '../lib/quest'
import { sfx } from '../lib/sound'
import { QUEST_BONUS, useProgress, type DailyQuest } from '../store/progress'
import { QUEST_FIRST_LINE, QUEST_TODAY_LINE } from './useTodaysQuest'

export interface TodaysQuest {
  quest: DailyQuest
  zone: Zone
  stage: Stage
}

/** Why this quest, under its name (grades 2–5). */
const REASON: Record<QuestReason, string> = {
  first: 'Your first quest',
  missedFacts: 'Practice the facts you missed',
  almostStar: "You're close to a star!",
  nextStage: 'A new stage is waiting',
  moreStars: 'Go for more stars',
}

const playPath = ({ quest }: TodaysQuest) => `/play/${quest.zoneId}/${quest.stageId}`

// K–1: today's quest is said once a day as the World opens (not on every return from a game).
let announcedDay: string | null = null

/**
 * The big card a new child lands on after setup: their first quest, one tap
 * to start it. "Look around first" puts it away (the small quest button stays).
 */
export function FirstQuestCard({ today, listen, onLaunch }: { today: TodaysQuest; listen: boolean; onLaunch: (path: string) => void }) {
  const grade = useProgress((s) => s.player?.grade)
  const { zone, stage } = today
  const dismiss = () => {
    sfx.click()
    guide.clear({ forget: true })
    useProgress.getState().dismissQuestCard()
  }

  // K–1: the card says what to do and points at the star.
  useEffect(() => {
    if (!listen) return
    const t = window.setTimeout(() => void guide.show(QUEST_FIRST_LINE), 600)
    return () => window.clearTimeout(t)
  }, [listen])

  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center p-4 bg-ink-900/25" data-quest-card="first">
      <div
        role="dialog"
        aria-label="Your first quest"
        className={[
          'relative bg-paper rounded-toon border-[3px] border-line shadow-card p-6 short:p-4',
          // K–1: one row, pictures → star; 2–5: a text card (side by side on a short screen)
          listen
            ? 'flex flex-wrap items-center justify-center gap-4 short:gap-6'
            : 'w-full max-w-md short:max-w-xl text-center short:grid short:grid-cols-[auto_1fr] short:items-center short:gap-x-5 short:text-left',
        ].join(' ')}
      >
        {listen ? (
          <>
            <div className="flex justify-center gap-3" aria-hidden="true">
              <Medallion tone={zone.themeColor} size="xl">{zone.emoji}</Medallion>
              <Medallion size="xl">{stagePicture(stage)}</Medallion>
            </div>
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => onLaunch(playPath(today))}
                data-guide="quest-start"
                aria-label={`Start your first quest: ${stage.title}`}
                className="grid place-items-center w-32 h-32 short:w-28 short:h-28 rounded-full bg-quest-400 hover:bg-quest-300 border-[3px] border-line shadow-[0_5px_0_var(--color-line)] animate-bob active:translate-y-[3px] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
              >
                <ToonStar filled px={84} />
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Look around first"
                title="Look around first"
                className="grid place-items-center w-16 h-16 rounded-full bg-paper hover:bg-cream-100 border-[3px] border-line shadow-ledge text-3xl leading-none active:translate-y-[3px] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
              >
                <span aria-hidden="true">🌍</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-3 short:mb-0" aria-hidden="true">
              <Medallion tone={zone.themeColor} size="xl">{zone.emoji}</Medallion>
            </div>
            <div>
              <p className="kid-text text-lg text-ink-700">Your first quest!</p>
              <h2 className="kid-text font-bold text-3xl short:text-2xl text-ink-900 leading-tight">{stage.title}</h2>
              <p className="kid-text text-lg text-ink-700 mt-1">
                in {zoneTitle(zone, grade)} · {stage.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-5 short:mt-3">
                <Button variant="primary" size="lg" className="flex-1" guide="quest-start" onClick={() => onLaunch(playPath(today))}>
                  ▶ Start my quest
                </Button>
                <Button variant="ghost" size="md" onClick={dismiss}>
                  Look around first
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** The small "today's quest" button in the HUD (or ✓ once it's done). Never in the way of free play. */
export function QuestChip({ today, listen, onLaunch, quiet }: { today: TodaysQuest; listen: boolean; onLaunch: (path: string) => void; quiet: boolean }) {
  const { quest, zone, stage } = today
  const done = !!quest.doneAt
  const tourSeen = useProgress((s) => s.toursSeen.includes('world'))

  // K–1: say it once a day, after the World's first-visit tour.
  useEffect(() => {
    if (!listen || done || quiet || !tourSeen || announcedDay === quest.day) return
    const t = window.setTimeout(() => {
      announcedDay = quest.day
      void guide.show(QUEST_TODAY_LINE)
    }, 1200)
    return () => window.clearTimeout(t)
  }, [listen, done, quiet, tourSeen, quest.day])

  if (done) {
    if (listen) return null
    return (
      <span className="kid-text inline-flex items-center gap-1.5 bg-correct-300/95 text-ink-900 px-3 py-1 rounded-full text-sm border-2 border-line [text-shadow:none]" data-quest-chip="done">
        ✓ Today's quest done
      </span>
    )
  }

  if (listen) {
    return (
      <button
        type="button"
        onClick={() => onLaunch(playPath(today))}
        data-guide="quest-today"
        data-quest-chip=""
        aria-label={`Today's quest: ${stage.title}`}
        title="Today's quest"
        className="pointer-events-auto relative grid place-items-center w-[88px] h-[88px] text-5xl leading-none rounded-full bg-quest-400 hover:bg-quest-300 border-[3px] border-line shadow-ledge active:translate-y-[3px] outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 [text-shadow:none]"
      >
        <span aria-hidden="true">{zone.emoji}</span>
        <span className="absolute -top-2 -right-2" aria-hidden="true">
          <ToonStar filled px={36} />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onLaunch(playPath(today))}
      data-guide="quest-today"
      data-quest-chip=""
      className="pointer-events-auto kid-text inline-flex items-center gap-2.5 max-w-[22rem] text-left bg-quest-400 hover:bg-quest-300 text-ink-900 pl-1.5 pr-4 py-1.5 rounded-full border-[3px] border-line shadow-[0_3px_0_var(--color-line)] [text-shadow:none]"
    >
      <Medallion tone={zone.themeColor} size="sm">{zone.emoji}</Medallion>
      <span className="min-w-0 leading-tight">
        <span className="block text-xs text-ink-700">{quest.reason === 'first' ? REASON.first : `Today's quest · ${REASON[quest.reason]}`}</span>
        <span className="block text-base truncate">{stage.title}</span>
      </span>
      <span aria-hidden="true" className="text-lg">▶</span>
    </button>
  )
}

/** Finishing the quest: the shared celebration card, once (+coins, and said out loud for K–1). */
export function QuestCelebration({ today }: { today: TodaysQuest }) {
  const open = !!today.quest.doneAt && !today.quest.celebrated
  useListenSay(open, { line: 'quest/done' })
  useEffect(() => {
    if (open) sfx.victory()
  }, [open])
  return (
    <Celebration
      open={open}
      onClose={() => useProgress.getState().markQuestCelebrated()}
      title={today.quest.reason === 'first' ? 'First quest done!' : "Today's quest done!"}
      coins={QUEST_BONUS}
    >
      {today.stage.title} {today.zone.emoji}
    </Celebration>
  )
}

