import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgress } from '../store/progress'
import { levelFromProgress } from '../lib/levels'
import { usePlayClock } from '../lib/usePlayClock'
import { SESSIONS_PER_DAY, SESSION_BONUS_COINS } from '../lib/dailyGoal'

// Stat chips in the top bar: pastel fill, ink text, the warm toon outline.
const chipBase = 'flex border-2 border-line text-ink-900 whitespace-nowrap shadow-ledge-sm'
const chip = `${chipBase} items-center gap-1 sm:gap-1.5 h-10 px-2 sm:px-3 rounded-full text-sm sm:text-base`

// Round icon buttons on the right (48px touch targets).
const iconBtn = [
  'grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-full text-xl',
  'bg-paper border-2 border-line shadow-ledge-sm',
  'transition-[translate,background-color] duration-100 hover:bg-cream-100 hover:-translate-y-0.5 active:translate-y-0.5',
  'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
].join(' ')

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
      <header className="relative z-30 px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 bg-paper/95 backdrop-blur border-b-[3px] border-line shadow-[0_6px_18px_-10px_rgb(58_44_56/0.45)] text-ink-900">
        <Link
          to="/"
          className="kid-text font-bold text-xl sm:text-2xl flex items-center gap-2 flex-shrink-0 rounded-full pr-1 outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
          aria-label="SummerQuest home"
        >
          <span
            className="grid place-items-center w-10 h-10 rounded-full bg-quest-300 border-2 border-line text-2xl leading-none"
            aria-hidden="true"
          >
            🌞
          </span>
          <span className="hidden sm:inline tracking-tight">
            Summer<span className="text-wrong-700">Quest</span>
          </span>
        </Link>

        {player && !isParent && (
          <div className="flex items-center gap-1.5 sm:gap-2 kid-text flex-1 justify-center min-w-0">
            <span
              className={`${chipBase} bg-monster-200 flex-col items-stretch gap-1 px-3 py-1.5 min-w-[64px] rounded-2xl`}
              title={`${level.title} — ${level.xp} XP${level.isMax ? '' : ` (${level.xpForLevel - level.xpIntoLevel} to next)`}`}
            >
              <span className="flex items-center justify-center gap-1 leading-none text-xs sm:text-sm">
                <span aria-hidden="true">⭐</span>
                <span>Lv {level.level}</span>
                <span className="hidden lg:inline">· {level.title}</span>
              </span>
              <span className="h-2 w-full rounded-full bg-paper border border-line overflow-hidden">
                <span
                  className="block h-full bg-quest-400 rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </span>
            </span>
            <span className={`${chip} bg-quest-300`} title="Quest Coins">
              <span aria-hidden="true">🪙</span>
              <span className="tabular-nums">{coins}</span>
            </span>
            <span className={`${chip} bg-wrong-300`} title="Day streak">
              <span aria-hidden="true">🔥</span>
              <span className="tabular-nums">{stats.streakDays}</span>
            </span>
            <span className={`${chipBase} hidden sm:flex items-center gap-1.5 h-10 pl-1 pr-1 md:pr-3 rounded-full text-base bg-paper min-w-0`}>
              <span
                className="grid place-items-center w-8 h-8 rounded-full border-2 border-line text-lg leading-none shrink-0"
                style={{ background: player.color }}
              >
                {player.emoji}
              </span>
              <span className="hidden md:inline truncate">{player.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
          <button
            onClick={toggleSound}
            className={iconBtn}
            title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <Link to="/parent" className={iconBtn} title="Grown-ups" aria-label="Parent dashboard">
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
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 cursor-pointer w-[min(92vw,22rem)]"
          >
            <div className="bg-paper text-ink-900 rounded-toon px-6 py-4 shadow-pop kid-text text-center border-[3px] border-line">
              <div
                className="mx-auto -mt-10 mb-1 grid place-items-center w-14 h-14 rounded-full bg-quest-300 border-[3px] border-line text-3xl"
                aria-hidden="true"
              >
                {timeSessionJustCompleted >= SESSIONS_PER_DAY ? '🏆' : '🎉'}
              </div>
              <div className="text-xl font-bold">
                {timeSessionJustCompleted >= SESSIONS_PER_DAY
                  ? 'Daily goal complete!'
                  : `Session ${timeSessionJustCompleted} done!`}
              </div>
              <div className="text-sm text-ink-700">
                15 minutes of learning · +{SESSION_BONUS_COINS} 🪙
              </div>
              <Link
                to="/home"
                onClick={() => clearTimeCelebration()}
                className="mt-3 inline-flex items-center min-h-[44px] kid-text text-base px-4 rounded-full bg-quest-400 border-2 border-line shadow-ledge-sm text-ink-900"
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
