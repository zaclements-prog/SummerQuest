import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SESSION_SECONDS, SESSIONS_PER_DAY, SESSION_BONUS_COINS } from '../lib/dailyGoal'
import type { Slot } from '../home/models/anchors'
import { accessoryById } from '../lib/home/accessories'

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

export interface PlacedItem { uid: string; itemId: string; gx: number; gz: number; rot: number }

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
  ownedAccessories: string[]
  equippedAccessories: Record<Slot, string | null>
  /** Daily learning-time goal (2 × 15 min). Resets each calendar day. */
  playDate?: string
  playSecondsToday: number
  sessionsRewardedToday: number
  /** Transient: the session # (1 or 2) that just completed, for a one-time celebration. */
  timeSessionJustCompleted: number | null
  ownedCreatures: string[]
  activeCreature: string | null
  ownedHomeItems: Record<string, number>
  placedItems: PlacedItem[]

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
  buyAccessory: (id: string, price: number) => boolean
  equipAccessory: (id: string) => void
  unequipSlot: (slot: Slot) => void
  recordSession: (rec: Omit<SessionRecord, 'id' | 'at'> & { at?: number }) => void
  recordAttempt: (a: Omit<SkillAttempt, 'id' | 'at'> & { at?: number }) => void
  tickPlay: (seconds: number) => void
  clearTimeCelebration: () => void
  buyHomeItem: (id: string, price: number) => boolean
  placeItem: (itemId: string, gx: number, gz: number, rot: number) => string | null
  moveItem: (uid: string, gx: number, gz: number, rot: number) => void
  removeItem: (uid: string) => void
  buyCreature: (id: string, price: number) => boolean
  becomeCreature: (id: string) => void
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
      ownedAccessories: [],
      equippedAccessories: { head: null, face: null, back: null, body: null },
      playSecondsToday: 0,
      sessionsRewardedToday: 0,
      timeSessionJustCompleted: null,
      ownedCreatures: [],
      activeCreature: null,
      ownedHomeItems: {},
      placedItems: [],

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
          ownedAccessories: [],
          equippedAccessories: { head: null, face: null, back: null, body: null },
          sessions: [],
          attempts: [],
          playDate: undefined,
          playSecondsToday: 0,
          sessionsRewardedToday: 0,
          timeSessionJustCompleted: null,
          ownedCreatures: [],
          activeCreature: null,
          ownedHomeItems: {},
          placedItems: [],
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

      buyAccessory: (id, price) => {
        const { coins, ownedAccessories } = get()
        if (ownedAccessories.includes(id)) return true
        if (coins < price) return false
        set({ coins: coins - price, ownedAccessories: [...ownedAccessories, id] })
        return true
      },
      equipAccessory: (id) => {
        const acc = accessoryById(id)
        if (!acc || !get().ownedAccessories.includes(id)) return
        const eq = get().equippedAccessories
        set({ equippedAccessories: { ...eq, [acc.slot]: eq[acc.slot] === id ? null : id } })
      },
      unequipSlot: (slot) =>
        set({ equippedAccessories: { ...get().equippedAccessories, [slot]: null } }),

      buyHomeItem: (id, price) => {
        const { coins, ownedHomeItems } = get()
        if (coins < price) return false
        set({ coins: coins - price, ownedHomeItems: { ...ownedHomeItems, [id]: (ownedHomeItems[id] ?? 0) + 1 } })
        return true
      },
      placeItem: (itemId, gx, gz, rot) => {
        const { ownedHomeItems, placedItems } = get()
        if ((ownedHomeItems[itemId] ?? 0) <= 0) return null
        const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
        set({
          ownedHomeItems: { ...ownedHomeItems, [itemId]: ownedHomeItems[itemId] - 1 },
          placedItems: [...placedItems, { uid, itemId, gx, gz, rot }],
        })
        return uid
      },
      moveItem: (uid, gx, gz, rot) =>
        set({ placedItems: get().placedItems.map((p) => (p.uid === uid ? { ...p, gx, gz, rot } : p)) }),
      removeItem: (uid) => {
        const { placedItems, ownedHomeItems } = get()
        const item = placedItems.find((p) => p.uid === uid)
        if (!item) return
        set({
          placedItems: placedItems.filter((p) => p.uid !== uid),
          ownedHomeItems: { ...ownedHomeItems, [item.itemId]: (ownedHomeItems[item.itemId] ?? 0) + 1 },
        })
      },
      buyCreature: (id, price) => {
        const { coins, ownedCreatures } = get()
        if (ownedCreatures.includes(id)) return true
        if (coins < price) return false
        set({ coins: coins - price, ownedCreatures: [...ownedCreatures, id] })
        return true
      },
      becomeCreature: (id) => {
        if (!get().ownedCreatures.includes(id)) return
        set({ activeCreature: id })
      },

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
