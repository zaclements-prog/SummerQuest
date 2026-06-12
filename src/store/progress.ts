import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SESSION_SECONDS, SESSIONS_PER_DAY, SESSION_BONUS_COINS } from '../lib/dailyGoal'

export interface AvatarChoice {
  emoji: string
  color: string
  name: string
}

export interface StageRecord {
  stageId: string
  stars: number
  bestScore: number
  attempts: number
  completedAt?: number
}

export interface ZoneProgress {
  zoneId: string
  stages: Record<string, StageRecord>
  masteredAt?: number
}

export interface SessionStats {
  problemsAnswered: number
  problemsCorrect: number
  secondsPlayed: number
  lastPlayedAt?: number
  streakDays: number
  lastStreakDate?: string
}

/** One completed quiz attempt — the unit of the per-session review + trend analysis. */
export interface SessionRecord {
  id: string
  at: number
  zoneId: string
  zoneTitle: string
  zoneEmoji: string
  stageId: string
  stageTitle: string
  kind: 'stage' | 'daily'
  correct: number
  total: number
  stars: number
  score: number
}

/** One per-question skill attempt — the unit of the coach's skill-trend log. */
export interface SkillAttempt {
  id: string
  at: number
  zoneId: string
  topic: string
  skillId: string
  skillLabel: string
  correct: boolean
}

const MAX_SESSIONS = 300
const MAX_ATTEMPTS = 2000

interface ProgressState {
  player: AvatarChoice | null
  coins: number
  /** Cumulative coins ever earned (never decreases) — used for "collector" achievements. */
  totalCoinsEarned: number
  zones: Record<string, ZoneProgress>
  stats: SessionStats
  sessions: SessionRecord[]
  attempts: SkillAttempt[]
  soundEnabled: boolean
  seenBadges: string[]
  dailyClaimedDate?: string
  ownedCosmetics: string[]
  equippedCosmetic: string | null
  /** Daily learning-time goal (2 × 15 min). Resets each calendar day. */
  playDate?: string
  playSecondsToday: number
  sessionsRewardedToday: number
  /** Transient: the session # (1 or 2) that just completed, for a one-time celebration. */
  timeSessionJustCompleted: number | null

  // actions
  setAvatar: (avatar: AvatarChoice) => void
  resetPlayer: () => void
  awardStage: (
    zoneId: string,
    stageId: string,
    stars: number,
    score: number,
  ) => void
  addCoins: (n: number) => void
  spendCoins: (n: number) => boolean
  recordAnswer: (correct: boolean) => void
  addPlayTime: (seconds: number) => void
  bumpStreakIfNeeded: () => void
  toggleSound: () => void
  markBadgesSeen: (ids: string[]) => void
  claimDaily: () => void
  buyCosmetic: (id: string, price: number) => boolean
  equipCosmetic: (id: string | null) => void
  recordSession: (rec: Omit<SessionRecord, 'id' | 'at'> & { at?: number }) => void
  recordAttempt: (a: Omit<SkillAttempt, 'id' | 'at'> & { at?: number }) => void
  tickPlay: (seconds: number) => void
  clearTimeCelebration: () => void
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      player: null,
      coins: 0,
      totalCoinsEarned: 0,
      zones: {},
      stats: {
        problemsAnswered: 0,
        problemsCorrect: 0,
        secondsPlayed: 0,
        streakDays: 0,
      },
      sessions: [],
      attempts: [],
      soundEnabled: true,
      seenBadges: [],
      ownedCosmetics: [],
      equippedCosmetic: null,
      playSecondsToday: 0,
      sessionsRewardedToday: 0,
      timeSessionJustCompleted: null,

      setAvatar: (avatar) => set({ player: avatar }),

      resetPlayer: () =>
        set({
          player: null,
          coins: 0,
          totalCoinsEarned: 0,
          zones: {},
          stats: {
            problemsAnswered: 0,
            problemsCorrect: 0,
            secondsPlayed: 0,
            streakDays: 0,
          },
          seenBadges: [],
          dailyClaimedDate: undefined,
          ownedCosmetics: [],
          equippedCosmetic: null,
          sessions: [],
          attempts: [],
          playDate: undefined,
          playSecondsToday: 0,
          sessionsRewardedToday: 0,
          timeSessionJustCompleted: null,
        }),

      awardStage: (zoneId, stageId, stars, score) => {
        const zones = { ...get().zones }
        const zone = zones[zoneId] ?? { zoneId, stages: {} }
        const prev = zone.stages[stageId]
        const nextStars = Math.max(prev?.stars ?? 0, stars)
        const nextScore = Math.max(prev?.bestScore ?? 0, score)
        zone.stages = {
          ...zone.stages,
          [stageId]: {
            stageId,
            stars: nextStars,
            bestScore: nextScore,
            attempts: (prev?.attempts ?? 0) + 1,
            completedAt: Date.now(),
          },
        }
        zones[zoneId] = zone
        set({ zones })
      },

      addCoins: (n) =>
        set({
          coins: get().coins + n,
          totalCoinsEarned: get().totalCoinsEarned + Math.max(0, n),
        }),

      spendCoins: (n) => {
        const { coins } = get()
        if (coins < n) return false
        set({ coins: coins - n })
        return true
      },

      recordAnswer: (correct) =>
        set({
          stats: {
            ...get().stats,
            problemsAnswered: get().stats.problemsAnswered + 1,
            problemsCorrect:
              get().stats.problemsCorrect + (correct ? 1 : 0),
            lastPlayedAt: Date.now(),
          },
        }),

      addPlayTime: (seconds) =>
        set({
          stats: {
            ...get().stats,
            secondsPlayed: get().stats.secondsPlayed + seconds,
          },
        }),

      bumpStreakIfNeeded: () => {
        const today = todayKey()
        const { stats } = get()
        if (stats.lastStreakDate === today) return
        const yesterday = new Date(Date.now() - 86400000)
          .toISOString()
          .slice(0, 10)
        const newStreak =
          stats.lastStreakDate === yesterday ? stats.streakDays + 1 : 1
        set({
          stats: {
            ...stats,
            streakDays: newStreak,
            lastStreakDate: today,
          },
        })
      },

      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),

      markBadgesSeen: (ids) =>
        set({ seenBadges: Array.from(new Set([...get().seenBadges, ...ids])) }),

      claimDaily: () => set({ dailyClaimedDate: todayKey() }),

      buyCosmetic: (id, price) => {
        const { coins, ownedCosmetics } = get()
        if (ownedCosmetics.includes(id)) return true
        if (coins < price) return false
        set({ coins: coins - price, ownedCosmetics: [...ownedCosmetics, id] })
        return true
      },

      equipCosmetic: (id) => set({ equippedCosmetic: id }),

      recordSession: (rec) => {
        const at = rec.at ?? Date.now()
        const id = `${at.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
        const entry: SessionRecord = { ...rec, id, at }
        set({ sessions: [...get().sessions, entry].slice(-MAX_SESSIONS) })
      },

      recordAttempt: (a) => {
        const at = a.at ?? Date.now()
        const id = `${at.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
        const entry: SkillAttempt = { ...a, id, at }
        set({ attempts: [...get().attempts, entry].slice(-MAX_ATTEMPTS) })
      },

      tickPlay: (seconds) => {
        const add = Math.max(0, seconds)
        if (add <= 0) return
        const today = todayKey()
        const st = get()
        const sameDay = st.playDate === today
        const secs = (sameDay ? st.playSecondsToday : 0) + add
        const rewarded = sameDay ? st.sessionsRewardedToday : 0
        const completed = Math.min(SESSIONS_PER_DAY, Math.floor(secs / SESSION_SECONDS))
        const patch: Partial<ProgressState> = {
          playDate: today,
          playSecondsToday: secs,
          sessionsRewardedToday: Math.max(rewarded, completed),
          stats: { ...st.stats, secondsPlayed: st.stats.secondsPlayed + add },
        }
        if (completed > rewarded) {
          const bonus = (completed - rewarded) * SESSION_BONUS_COINS
          patch.coins = st.coins + bonus
          patch.totalCoinsEarned = st.totalCoinsEarned + bonus
          patch.timeSessionJustCompleted = completed
        }
        set(patch)
      },

      clearTimeCelebration: () => set({ timeSessionJustCompleted: null }),
    }),
    {
      name: 'summerquest-progress-v1',
    },
  ),
)

export function zoneStars(zoneId: string): number {
  const zone = useProgress.getState().zones[zoneId]
  if (!zone) return 0
  return Object.values(zone.stages).reduce((sum, s) => sum + s.stars, 0)
}

export function zoneMastered(zoneId: string, expectedStages: number): boolean {
  const zone = useProgress.getState().zones[zoneId]
  if (!zone) return false
  const cleared = Object.values(zone.stages).filter((s) => s.stars > 0).length
  return cleared >= expectedStages
}
