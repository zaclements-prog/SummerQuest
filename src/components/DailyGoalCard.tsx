import { useProgress } from '../store/progress'
import { computeDailyGoal, SESSION_SECONDS } from '../lib/dailyGoal'
import { todayStr } from '../lib/daily'

/**
 * The "2 × 15-minute sessions" daily learning-time goal. Two segment bars fill
 * sequentially as the play clock accumulates active time; resets each day.
 * Framer-free so it's always visible. `variant` swaps theming for the
 * (dark) WorldMap vs the (light) Parent Dashboard.
 */
export default function DailyGoalCard({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const playDate = useProgress((s) => s.playDate)
  const playSecondsToday = useProgress((s) => s.playSecondsToday)
  const secondsToday = playDate === todayStr() ? playSecondsToday : 0
  const goal = computeDailyGoal(secondsToday)

  const light = variant === 'light'
  const wrap = light ? 'bg-ocean-50 text-ocean-900' : 'bg-white/15 text-white'
  const track = light ? 'bg-ocean-100' : 'bg-white/20'
  const sub = light ? 'text-gray-500' : 'text-white/80'

  return (
    <div className={`rounded-3xl p-3 kid-text ${wrap}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm flex items-center gap-1">
          🕐 Today's learning goal · 2 × 15 min
        </span>
        <span className={`text-sm ${goal.goalMet ? 'text-correct-600' : ''}`}>
          {goal.goalMet ? '🏆 Goal complete!' : `${goal.minutesToday} / ${goal.goalMinutes} min`}
        </span>
      </div>
      <div className="flex gap-2">
        {goal.segments.map((seg) => {
          const pct = Math.round((seg.seconds / SESSION_SECONDS) * 100)
          return (
            <div key={seg.index} className="flex-1">
              <div className={`h-3 rounded-full overflow-hidden ${track}`}>
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${seg.full ? 'bg-correct-500' : 'bg-quest-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={`text-[11px] text-center mt-0.5 ${sub}`}>
                Session {seg.index + 1} {seg.full ? '✓' : `· ${seg.minutes}/15`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
