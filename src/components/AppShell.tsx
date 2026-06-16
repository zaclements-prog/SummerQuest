import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgress } from '../store/progress'
import { levelFromProgress } from '../lib/levels'
import { usePlayClock } from '../lib/usePlayClock'
import { SESSIONS_PER_DAY, SESSION_BONUS_COINS } from '../lib/dailyGoal'

export default function AppShell({ children }: { children: React.ReactNode }) {
  usePlayClock()
  const {
    player,
    coins,
    soundEnabled,
    toggleSound,
    stats,
    zones,
    timeSessionJustCompleted,
    clearTimeCelebration,
  } = useProgress()
  const { pathname } = useLocation()
  const isParent = pathname.startsWith('/parent')
  const level = levelFromProgress(stats.problemsCorrect, zones)

  useEffect(() => {
    if (timeSessionJustCompleted == null) return
    const t = setTimeout(() => clearTimeCelebration(), 6000)
    return () => clearTimeout(t)
  }, [timeSessionJustCompleted, clearTimeCelebration])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-3 py-2 flex items-center gap-2 text-white bg-ocean-700/60 backdrop-blur">
        <Link to="/" className="kid-text text-xl sm:text-2xl flex items-center gap-1 flex-shrink-0">
          <span>🌞</span>
          <span className="hidden sm:inline">SummerQuest</span>
        </Link>

        {player && !isParent && (
          <div className="flex items-center gap-1.5 kid-text flex-1 justify-center min-w-0">
            <span
              className="flex flex-col items-stretch gap-0.5 px-2 py-1 rounded-2xl bg-ocean-500/70 text-white text-xs min-w-[58px]"
              title={`${level.title} — ${level.xp} XP${level.isMax ? '' : ` (${level.xpForLevel - level.xpIntoLevel} to next)`}`}
            >
              <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                <span>⭐</span>
                <span>Lv {level.level}</span>
                <span className="hidden lg:inline">· {level.title}</span>
              </span>
              <span className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
                <span
                  className="block h-full bg-quest-400 rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </span>
            </span>
            <span
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-quest-500 text-quest-900 text-sm"
              title="Quest Coins"
            >
              <span>🪙</span>
              <span>{coins}</span>
            </span>
            <span
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-monster-500/80 text-sm"
              title="Day streak"
            >
              <span>🔥</span>
              <span>{stats.streakDays}</span>
            </span>
            <span
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-sm min-w-0"
              style={{ background: player.color }}
            >
              <span className="relative text-xl leading-none">
                {player.emoji}
              </span>
              <span className="hidden md:inline truncate">{player.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleSound}
            className="px-2 py-1 rounded-full bg-white/20 hover:bg-white/30 text-base"
            title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <Link
            to="/parent"
            className="px-2 py-1 rounded-full bg-white/20 hover:bg-white/30 text-sm"
          >
            👨‍👩‍👧
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <AnimatePresence>
        {timeSessionJustCompleted != null && (
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            onClick={() => clearTimeCelebration()}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
          >
            <div className="bg-white text-ocean-900 rounded-3xl px-6 py-3 shadow-2xl kid-text text-center border-4 border-quest-400">
              <div className="text-3xl">
                {timeSessionJustCompleted >= SESSIONS_PER_DAY ? '🏆' : '🎉'}
              </div>
              <div className="text-lg">
                {timeSessionJustCompleted >= SESSIONS_PER_DAY
                  ? 'Daily goal complete!'
                  : `Session ${timeSessionJustCompleted} done!`}
              </div>
              <div className="text-sm text-gray-500">
                15 minutes of learning · +{SESSION_BONUS_COINS} 🪙
              </div>
              <Link
                to="/home"
                onClick={() => clearTimeCelebration()}
                className="mt-2 inline-block kid-text text-sm px-3 py-1 rounded-full bg-quest-500 text-quest-900"
              >
                🏠 Spend your coins at Home →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
