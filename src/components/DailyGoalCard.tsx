import { useProgress } from '../store/progress'
import { computeDailyGoal, SESSION_SECONDS } from '../lib/dailyGoal'
import { todayStr } from '../lib/daily'

/**
 * The "2 × 15-minute sessions" daily learning-time goal. Two segment bars fill
 * sequentially as the play clock accumulates active time; resets each day.
 * Framer-free so it's always visible. `variant="dark"` is the stand-alone card
 * (on the sky, e.g. the Map); `variant="light"` is the flat inset used inside
 * another card (the Parent Dashboard).
 */
export default function DailyGoalCard({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const playDate = useProgress((s) => s.playDate)
  const playSecondsToday = useProgress((s) => s.playSecondsToday)
  const secondsToday = playDate === todayStr() ? playSecondsToday : 0
  const goal = computeDailyGoal(secondsToday)

  const inset = variant === 'light'
  const wrap = inset
    ? 'bg-cream-100 rounded-[1.25rem] p-3.5'
    : 'bg-paper rounded-toon border-2 border-line/15 shadow-card p-4'

  return (
    <div className={`kid-text text-ink-900 ${wrap}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2.5">
        <span className="text-base flex items-center gap-2">
          <span
            className="grid place-items-center w-8 h-8 rounded-full bg-ocean-200 border-2 border-line text-base leading-none"
            aria-hidden="true"
          >
            🕐
          </span>
          Today's learning goal · 2 × 15 min
        </span>
        <span
          className={[
            'text-sm rounded-full border-2 border-line px-2.5 leading-6',
            goal.goalMet ? 'bg-correct-400' : 'bg-paper',
          ].join(' ')}
        >
          {goal.goalMet ? '🏆 Goal complete!' : `${goal.minutesToday} / ${goal.goalMinutes} min`}
        </span>
      </div>
      <div className="flex gap-3">
        {goal.segments.map((seg) => {
          const pct = Math.round((seg.seconds / SESSION_SECONDS) * 100)
          return (
            <div key={seg.index} className="flex-1">
              <div className="h-4 rounded-full overflow-hidden bg-cream-200 border-2 border-line shadow-[inset_0_2px_0_rgb(58_44_56/0.12)]">
                <div
                  className={[
                    'relative h-full rounded-full transition-[width] duration-700',
                    seg.full ? 'bg-correct-500' : 'bg-quest-400',
                    pct > 0 && pct < 100 ? 'border-r-2 border-line' : '',
                  ].join(' ')}
                  style={{ width: `${pct}%` }}
                >
                  <span className="absolute left-1.5 right-1.5 top-[3px] h-[3px] rounded-full bg-white/55" aria-hidden="true" />
                </div>
              </div>
              <div className="text-xs text-center mt-1 text-ink-700">
                Session {seg.index + 1} {seg.full ? '✓' : `· ${seg.minutes}/15`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
