import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgress } from '../store/progress'
import { levelFromProgress } from '../lib/levels'
import { usePlayClock } from '../lib/usePlayClock'
import { SESSIONS_PER_DAY, SESSION_BONUS_COINS } from '../lib/dailyGoal'
import { parentGateOpen } from '../lib/parentGateSession'
import ParentGate from './ParentGate'
import PetMoments from '../pets/PetMoments'

/*
 * The top bar lays itself out by its OWN width (a container query on <header>),
 * not the viewport's, so the notch / home-indicator insets of a landscape phone
 * count too. Tiers by the bar's content width:
 *   < 32rem   phones: the avatar (XP ring + level badge) is the home button; coins, streak
 *   @lg       + sun logo, level chip with XP bar, avatar chip
 *   @2xl      + "SummerQuest" wordmark
 *   @3xl      + player name
 *   @5xl      + level title
 */
// Stat chips in the top bar: pastel fill, ink text, the warm toon outline.
const chipBase = 'flex border-2 border-line text-ink-900 whitespace-nowrap shadow-ledge-sm'
const chip = `${chipBase} items-center gap-1 @lg:gap-1.5 h-10 px-1.5 @min-[21rem]:px-2 @lg:px-3 rounded-full text-sm @lg:text-base`

// Round icon buttons on the right (48px touch targets; 44px on short landscape phones).
const iconBtn = [
  'grid place-items-center w-12 h-12 short:w-11 short:h-11 rounded-full text-xl',
  'bg-paper border-2 border-line shadow-ledge-sm',
  'transition-[translate,background-color] duration-100 hover:bg-cream-100 hover:-translate-y-0.5 active:translate-y-0.5',
  'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
].join(' ')

/**
 * 3D screens run edge to edge, under the notch / home indicator; their HUDs pad
 * themselves with the *-safe utilities (src/index.css). Every other screen's
 * content is kept inside the safe area here.
 */
const FULL_BLEED = ['/world', '/home']

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
  const navigate = useNavigate()
  const isParent = pathname.startsWith('/parent')
  // 👨‍👩‍👧 asks the grown-up check right here, over the current screen (Back
  // leaves the kid where they were); a pass in the last 10 minutes goes straight in.
  const [askGrownUp, setAskGrownUp] = useState(false)
  const openParent = () => {
    if (parentGateOpen()) navigate('/parent')
    else setAskGrownUp(true)
  }
  const fullBleed = FULL_BLEED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const level = levelFromProgress(stats.problemsCorrect, zones)
  const showStats = !!player && !isParent
  const levelTitle = `${level.title} — ${level.xp} XP${level.isMax ? '' : ` (${level.xpForLevel - level.xpIntoLevel} to next)`}`
  const levelPct = Math.round(level.progress * 100)

  useEffect(() => {
    if (timeSessionJustCompleted == null) return
    const t = setTimeout(() => clearTimeCelebration(), 6000)
    return () => clearTimeout(t)
  }, [timeSessionJustCompleted, clearTimeCelebration])

  return (
    <div className="min-h-app flex flex-col">
      <header className="app-bar @container relative z-30 flex items-center gap-1 @min-[21rem]:gap-1.5 @lg:gap-3 bg-paper/95 backdrop-blur border-b-[3px] border-line shadow-[0_6px_18px_-10px_rgb(58_44_56/0.45)] text-ink-900">
        <Link
          to="/"
          className="kid-text font-bold text-xl @lg:text-2xl flex items-center gap-2 flex-shrink-0 min-h-12 short:min-h-11 rounded-full pr-1 outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
          aria-label="SummerQuest home"
        >
          {showStats && (
            // Phones: the player's avatar (with an XP ring and level badge) stands in
            // for the sun logo, the level chip and the name chip.
            <span
              className="@lg:hidden relative grid place-items-center w-11 h-11 short:w-10 short:h-10 rounded-full border-2 border-line shadow-ledge-sm"
              style={{ background: `conic-gradient(var(--color-quest-400) ${levelPct}%, var(--color-paper) 0)` }}
              title={`${player.name} · Lv ${level.level} ${levelTitle}`}
            >
              <span
                className="grid place-items-center w-8 h-8 short:w-7 short:h-7 rounded-full border-2 border-line text-lg leading-none"
                style={{ background: player.color }}
                aria-hidden="true"
              >
                {player.emoji}
              </span>
              <span
                className="absolute -bottom-1 -right-1.5 grid place-items-center min-w-5 h-5 px-1 rounded-full bg-monster-200 border-2 border-line text-[11px] leading-none tabular-nums"
                aria-hidden="true"
              >
                {level.level}
              </span>
            </span>
          )}
          <span
            className={`${showStats ? 'hidden @lg:grid' : 'grid'} place-items-center w-10 h-10 rounded-full bg-quest-300 border-2 border-line text-2xl leading-none`}
            aria-hidden="true"
          >
            🌞
          </span>
          <span className="hidden @2xl:inline tracking-tight">
            Summer<span className="text-wrong-700">Quest</span>
          </span>
        </Link>

        {showStats && (
          <div className="flex items-center gap-1 @min-[21rem]:gap-1.5 @lg:gap-2 kid-text flex-1 justify-center min-w-0">
            <span className="sr-only @lg:hidden">
              {player.name}, level {level.level}
            </span>
            <span
              className={`${chipBase} hidden @lg:flex bg-monster-200 flex-col items-stretch gap-1 px-3 py-1.5 min-w-[64px] rounded-2xl`}
              title={levelTitle}
            >
              <span className="flex items-center justify-center gap-1 leading-none text-sm">
                <span aria-hidden="true">⭐</span>
                <span>Lv {level.level}</span>
                <span className="hidden @5xl:inline">· {level.title}</span>
              </span>
              <span className="h-2 w-full rounded-full bg-paper border border-line overflow-hidden">
                <span
                  className="block h-full bg-quest-400 rounded-full transition-[width] duration-500"
                  style={{ width: `${levelPct}%` }}
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
            <span className={`${chipBase} hidden @lg:flex items-center gap-1.5 h-10 pl-1 pr-1 @3xl:pr-3 rounded-full text-base bg-paper min-w-0`}>
              <span
                className="grid place-items-center w-8 h-8 rounded-full border-2 border-line text-lg leading-none shrink-0"
                style={{ background: player.color }}
              >
                {player.emoji}
              </span>
              <span className="hidden @3xl:inline truncate">{player.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 @min-[21rem]:gap-1.5 @lg:gap-2 flex-shrink-0 ml-auto">
          <button
            onClick={toggleSound}
            className={iconBtn}
            title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <button type="button" onClick={openParent} className={iconBtn} title="Grown-ups" aria-label="Parent dashboard (grown-ups only)">
            👨‍👩‍👧
          </button>
        </div>
      </header>

      <main className={`flex-1 flex flex-col${fullBleed ? '' : ' px-safe pb-safe'}`}>{children}</main>

      <AnimatePresence>
        {timeSessionJustCompleted != null && (
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            onClick={() => clearTimeCelebration()}
            className="fixed top-[calc(5rem+var(--safe-top))] left-1/2 -translate-x-1/2 z-50 cursor-pointer w-[min(92vw,22rem)]"
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

      {/* Pet hatch / grow-up celebrations, at calm moments only. */}
      <PetMoments />

      <ParentGate
        open={askGrownUp}
        emoji="👨‍👩‍👧"
        onPass={() => {
          setAskGrownUp(false)
          navigate('/parent')
        }}
        onCancel={() => setAskGrownUp(false)}
      />
    </div>
  )
}
