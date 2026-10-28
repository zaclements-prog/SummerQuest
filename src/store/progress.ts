import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SESSION_SECONDS, SESSIONS_PER_DAY, SESSION_BONUS_COINS } from '../lib/dailyGoal'
import type { Slot } from '../home/models/anchors'
import { accessoryById } from '../lib/home/accessories'
import { addDays, localDayKey } from '../lib/dates'
import { migrateV0toV1, migrateV2toV3, migrateV3toV4, migrateV4toV5, type PersistedProgressV0 } from './migrations'
import { recordFactAnswer, type FactStats } from '../lib/adaptive'
import type { Problem } from '../lib/problem'
import { isGradeLevel, type GradeLevel } from '../lib/gradeTiers'
import { adultPets, allPetStages, growthRank, hatchedPets, isPetGrowth, zoneStarTotals, type PetGrowth } from '../lib/pets/growth'
import { getZone, zoneStages } from '../curriculum'
import { isPetId } from '../lib/pets/catalog'
import {
  FOCUS_REWARD_COINS,
  applyDaily,
  applyFocusChange,
  cleanSchoolPet,
  emptySchoolPet,
  focusChange,
  type SchoolPetProgress,
} from '../lib/pets/schoolPet'
import type { QuestReason } from '../lib/quest'

export interface AvatarChoice {
  emoji: string
  color: string
  name: string
  /** Static difficulty tier (see lib/gradeTiers + the grade-tiers spec). */
  grade: GradeLevel
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
  /** Longest streak ever reached (never decreases) — so streak badges stay earned. */
  bestStreak?: number
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
  /** "Show me how" was opened on this question before it was answered (a right answer still counts). */
  helped?: boolean
}

/** "Show me how" opens for one skill (the Parent Dashboard's "Asked for help" list). Local only. */
export interface HelpAsk {
  label: string
  count: number
  /** When it was last opened (ms). */
  lastAt: number
}

export interface PlacedItem { uid: string; itemId: string; gx: number; gz: number; rot: number }

/**
 * 3D graphics quality (the ⚙️ toggle in the World): 'auto' measures the machine
 * the first time the World opens each session, 'high' is "Pretty", 'low' is
 * "Fast" (no shadows or outlines, pixel ratio 1). See world/graphicsQuality.ts.
 */
export type GraphicsQuality = 'auto' | 'high' | 'low'
const GRAPHICS_QUALITIES: readonly GraphicsQuality[] = ['auto', 'high', 'low']
const isGraphicsQuality = (v: unknown): v is GraphicsQuality =>
  typeof v === 'string' && (GRAPHICS_QUALITIES as readonly string[]).includes(v)

/**
 * The World's suggested quest for one day (lib/quest picks it): the first
 * quest after setup, then "today's quest" on each new day. Earning a star on
 * its stage completes it (+QUEST_BONUS coins); the World celebrates it once.
 */
export interface DailyQuest {
  day: string
  zoneId: string
  stageId: string
  reason: QuestReason
  doneAt?: number
  celebrated?: boolean
  /** The big first-quest card was put away ("Look around first"); the small one stays. */
  dismissed?: boolean
}

export const QUEST_BONUS = 10

const QUEST_REASONS: readonly QuestReason[] = ['first', 'missedFacts', 'almostStar', 'nextStage', 'moreStars']

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
  /** skillId → how often "Show me how" was opened on it, and when last. */
  helpAsks: Record<string, HelpAsk>
  /** Per-fact record ("mult:6x8" → attempts/misses/streak) behind adaptive practice. Capped. */
  factStats: FactStats
  soundEnabled: boolean
  /** A device setting: kept when the player is reset. */
  graphicsQuality: GraphicsQuality
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
  /** Avatars you can play as: the starter, any bought before pets, and every grown-up pet. */
  ownedCreatures: string[]
  activeCreature: string | null
  ownedHomeItems: Record<string, number>
  placedItems: PlacedItem[]
  /** lessonId → when it was first finished (the lesson-complete card showed). Hatches its zone's pet. */
  lessonsDone: Record<string, number>
  /**
   * creatureId → the pet stage last celebrated. A pet whose derived stage
   * (lib/pets/growth) is ahead of it has a celebration waiting. Missing = egg.
   */
  petsSeen: Record<string, PetGrowth>
  /** The pet that follows you in the World (null: none). The first pet to hatch becomes it. */
  buddyPet: string | null
  /** K–1 guided tours already given (e.g. 'world'): each plays once, then 🔊 brings it back. */
  toursSeen: string[]
  /** The World's suggested quest (null: none picked yet). */
  quest: DailyQuest | null
  /**
   * The Schoolhouse raven's record (lib/pets/schoolPet): skills cleared off This
   * Week's Focus, Daily Challenges, whole-list clears, and the weekly
   * "finished everything" reward.
   */
  schoolPet: SchoolPetProgress

  // actions
  setAvatar: (avatar: AvatarChoice) => void
  /** Change the difficulty grade (Parent Dashboard only, behind the grown-up check). */
  setGrade: (grade: GradeLevel) => void
  resetPlayer: () => void
  awardStage: (
    zoneId: string,
    stageId: string,
    stars: number,
    score: number,
  ) => void
  addCoins: (n: number) => void
  spendCoins: (n: number) => boolean
  /** Count an answer; pass the problem so a fact problem (with `factId`) updates `factStats`. */
  recordAnswer: (correct: boolean, problem?: Pick<Problem, 'factId'> | null) => void
  addPlayTime: (seconds: number) => void
  bumpStreakIfNeeded: () => void
  markZoneMastered: (zoneId: string) => void
  toggleSound: () => void
  setGraphicsQuality: (q: GraphicsQuality) => void
  markBadgesSeen: (ids: string[]) => void
  claimDaily: () => void
  buyAccessory: (id: string, price: number) => boolean
  equipAccessory: (id: string) => void
  unequipSlot: (slot: Slot) => void
  recordSession: (rec: Omit<SessionRecord, 'id' | 'at'> & { at?: number }) => void
  recordAttempt: (a: Omit<SkillAttempt, 'id' | 'at'> & { at?: number }) => void
  /** "Show me how" was opened on a question of this skill. */
  recordHelpAsk: (skillId: string, skillLabel: string, at?: number) => void
  tickPlay: (seconds: number) => void
  clearTimeCelebration: () => void
  buyHomeItem: (id: string, price: number) => boolean
  placeItem: (itemId: string, gx: number, gz: number, rot: number) => string | null
  moveItem: (uid: string, gx: number, gz: number, rot: number) => void
  removeItem: (uid: string) => void
  becomeCreature: (id: string) => void
  /** The lesson-complete card showed: remember the lesson (first time only). */
  markLessonDone: (lessonId: string) => void
  /** These pets' growth has been celebrated (a stage never goes backwards). */
  markPetsSeen: (seen: Record<string, PetGrowth>) => void
  /** Choose the World buddy (a hatched pet), or null to leave every pet at home. */
  setBuddyPet: (creatureId: string | null) => void
  /** A K–1 guided tour has been given (it doesn't play by itself again). */
  markTourSeen: (id: string) => void
  /** Today's pick (replaces any earlier one). */
  setQuest: (q: Pick<DailyQuest, 'day' | 'zoneId' | 'stageId' | 'reason'>) => void
  dismissQuestCard: () => void
  markQuestCelebrated: () => void
  /** The "finished everything" celebration has shown. */
  markFocusRewardCelebrated: () => void
}

type PetSlice = Pick<ProgressState, 'zones' | 'lessonsDone' | 'ownedCreatures' | 'buddyPet'> & {
  /** The Schoolhouse raven's record (missing: an egg). */
  schoolPet?: SchoolPetProgress | null
  /** The child's grade (it no longer changes a pet's stage: kept for callers that pass a whole state). */
  player?: Pick<AvatarChoice, 'grade'> | null
}

/**
 * What changes when progress grows the pets: grown-up pets join the avatars,
 * and the very first pet to hatch becomes the World buddy (unless one is set).
 * `before` is the state the change started from. A pet's stage is the best it
 * reaches in any of its zone's bands (lib/pets/growth), so new stars or a
 * finished lesson (2–4 or K–1) can grow it, and a grade change never shrinks
 * it; a grown-up pet stays an avatar for good. The Schoolhouse raven grows
 * from its own record (`schoolPet`) and joins the same way.
 */
export function petSyncPatch(before: PetSlice, after: PetSlice): Partial<Pick<PetSlice, 'ownedCreatures' | 'buddyPet'>> {
  const stages = allPetStages(after)
  const patch: Partial<Pick<PetSlice, 'ownedCreatures' | 'buddyPet'>> = {}
  const newAdults = adultPets(stages).filter((id) => !after.ownedCreatures.includes(id))
  if (newAdults.length) patch.ownedCreatures = [...after.ownedCreatures, ...newAdults]
  if (after.buddyPet == null && hatchedPets(allPetStages(before)).length === 0) {
    const first = hatchedPets(stages)[0]
    if (first) patch.buddyPet = first
  }
  return patch
}

const todayKey = () => localDayKey()

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
      helpAsks: {},
      factStats: {},
      soundEnabled: true,
      graphicsQuality: 'auto',
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
      lessonsDone: {},
      petsSeen: {},
      buddyPet: null,
      toursSeen: [],
      quest: null,
      schoolPet: emptySchoolPet(),

      setAvatar: (avatar) => set({ player: avatar }),

      setGrade: (grade) => {
        const before = get()
        const p = before.player
        if (!p) return
        // Stars are kept per stage id, so nothing is lost: a new band's zones
        // just read their own stages. Pets and badges keep their best band.
        const player = { ...p, grade }
        set({ player, ...petSyncPatch(before, { ...before, player }) })
      },

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
          helpAsks: {},
          factStats: {},
          playDate: undefined,
          playSecondsToday: 0,
          sessionsRewardedToday: 0,
          timeSessionJustCompleted: null,
          ownedCreatures: [],
          activeCreature: null,
          ownedHomeItems: {},
          placedItems: [],
          lessonsDone: {},
          petsSeen: {},
          buddyPet: null,
          toursSeen: [],
          quest: null,
          schoolPet: emptySchoolPet(),
          // (soundEnabled and graphicsQuality are device settings: kept)
        }),

      awardStage: (zoneId, stageId, stars, score) => {
        const zones = { ...get().zones }
        const prevZone = zones[zoneId] ?? { zoneId, stages: {} }
        const prev = prevZone.stages[stageId]
        const nextStars = Math.max(prev?.stars ?? 0, stars)
        const nextScore = Math.max(prev?.bestScore ?? 0, score)
        // New zone object (don't mutate the previous state) so `s.zones[zoneId]`
        // selectors see the change.
        zones[zoneId] = {
          ...prevZone,
          stages: {
            ...prevZone.stages,
            [stageId]: {
              stageId,
              stars: nextStars,
              bestScore: nextScore,
              attempts: (prev?.attempts ?? 0) + 1,
              completedAt: Date.now(),
            },
          },
        }
        const before = get()
        // Earning a star on today's quest stage completes it.
        const q = before.quest
        const questPatch: Partial<ProgressState> =
          q && !q.doneAt && stars > 0 && q.zoneId === zoneId && q.stageId === stageId
            ? {
                quest: { ...q, doneAt: Date.now() },
                coins: before.coins + QUEST_BONUS,
                totalCoinsEarned: before.totalCoinsEarned + QUEST_BONUS,
              }
            : {}
        set({ zones, ...petSyncPatch(before, { ...before, zones }), ...questPatch })
      },

      addCoins: (n) => {
        // Never let a bad value (NaN/Infinity) poison the saved balance.
        if (!Number.isFinite(n)) return
        set({
          coins: get().coins + n,
          totalCoinsEarned: get().totalCoinsEarned + Math.max(0, n),
        })
      },

      spendCoins: (n) => {
        const { coins } = get()
        if (coins < n) return false
        set({ coins: coins - n })
        return true
      },

      recordAnswer: (correct, problem) => {
        const now = Date.now()
        const { stats, factStats } = get()
        set({
          stats: {
            ...stats,
            problemsAnswered: stats.problemsAnswered + 1,
            problemsCorrect: stats.problemsCorrect + (correct ? 1 : 0),
            lastPlayedAt: now,
          },
          ...(problem?.factId
            ? { factStats: recordFactAnswer(factStats, problem.factId, correct, now) }
            : {}),
        })
      },

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
        if (stats.lastStreakDate && stats.lastStreakDate >= today) return
        const newStreak =
          stats.lastStreakDate === addDays(today, -1) ? stats.streakDays + 1 : 1
        set({
          stats: {
            ...stats,
            streakDays: newStreak,
            bestStreak: Math.max(stats.bestStreak ?? 0, stats.streakDays, newStreak),
            lastStreakDate: today,
          },
        })
      },

      markZoneMastered: (zoneId) => {
        const zone = get().zones[zoneId]
        if (!zone || zone.masteredAt) return
        set({ zones: { ...get().zones, [zoneId]: { ...zone, masteredAt: Date.now() } } })
      },

      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),

      setGraphicsQuality: (q) => {
        if (isGraphicsQuality(q)) set({ graphicsQuality: q })
      },

      markBadgesSeen: (ids) =>
        set({ seenBadges: Array.from(new Set([...get().seenBadges, ...ids])) }),

      claimDaily: () => {
        // A finished Daily Challenge also grows the Schoolhouse raven (once a day).
        const before = get()
        const today = todayKey()
        const schoolPet = applyDaily(before.schoolPet, before.dailyClaimedDate, today)
        set({ dailyClaimedDate: today, schoolPet, ...petSyncPatch(before, { ...before, schoolPet }) })
      },

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
      becomeCreature: (id) => {
        if (!get().ownedCreatures.includes(id)) return
        set({ activeCreature: id })
      },

      markLessonDone: (lessonId) => {
        const before = get()
        if (!lessonId || before.lessonsDone[lessonId] != null) return
        const lessonsDone = { ...before.lessonsDone, [lessonId]: Date.now() }
        set({ lessonsDone, ...petSyncPatch(before, { ...before, lessonsDone }) })
      },
      markPetsSeen: (seen) => {
        const petsSeen = { ...get().petsSeen }
        let changed = false
        for (const [id, stage] of Object.entries(seen)) {
          if (!isPetId(id) || !isPetGrowth(stage)) continue
          if (growthRank(stage) > growthRank(petsSeen[id])) {
            petsSeen[id] = stage
            changed = true
          }
        }
        if (changed) set({ petsSeen })
      },
      setBuddyPet: (creatureId) => {
        if (creatureId === null) {
          set({ buddyPet: null })
          return
        }
        // only a hatched pet can come along
        if (!isPetId(creatureId) || allPetStages(get())[creatureId] === 'egg') return
        set({ buddyPet: creatureId })
      },
      markTourSeen: (id) => {
        if (!id || get().toursSeen.includes(id)) return
        set({ toursSeen: [...get().toursSeen, id] })
      },
      setQuest: ({ day, zoneId, stageId, reason }) => set({ quest: { day, zoneId, stageId, reason } }),
      dismissQuestCard: () => {
        const q = get().quest
        if (q && !q.dismissed) set({ quest: { ...q, dismissed: true } })
      },
      markQuestCelebrated: () => {
        const q = get().quest
        if (q?.doneAt && !q.celebrated) set({ quest: { ...q, celebrated: true } })
      },
      markFocusRewardCelebrated: () => {
        const sp = get().schoolPet
        if (sp.rewardPending) set({ schoolPet: { ...sp, rewardPending: false } })
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
        const before = get()
        const attempts = [...before.attempts, entry].slice(-MAX_ATTEMPTS)
        // Did this answer clear a skill off This Week's Focus (or the whole list)? Judged at
        // this moment, before vs after, so only practice counts (lib/pets/schoolPet).
        const change = focusChange(before.attempts, attempts, before.player?.grade, at)
        const { next: schoolPet, reward } = applyFocusChange(before.schoolPet, change, at)
        if (schoolPet === before.schoolPet) {
          set({ attempts })
          return
        }
        set({
          attempts,
          schoolPet,
          ...petSyncPatch(before, { ...before, schoolPet }),
          ...(reward
            ? { coins: before.coins + FOCUS_REWARD_COINS, totalCoinsEarned: before.totalCoinsEarned + FOCUS_REWARD_COINS }
            : {}),
        })
      },

      recordHelpAsk: (skillId, skillLabel, at = Date.now()) => {
        const { helpAsks } = get()
        const prev = helpAsks[skillId]
        set({ helpAsks: { ...helpAsks, [skillId]: { label: skillLabel || prev?.label || skillId, count: (prev?.count ?? 0) + 1, lastAt: at } } })
      },

      tickPlay: (seconds) => {
        const add = Math.max(0, seconds)
        if (add <= 0) return
        // Learning right now counts toward today's streak, even if the tab has
        // been open since yesterday.
        get().bumpStreakIfNeeded()
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
      // v1: local-time day keys + furniture re-fit to the 10×10 room (see migrations.ts).
      // v2: grade tiers — an existing player without a grade becomes grade 4
      //     (matches the pre-grade "3rd → 4th" content). Enforced in `merge` below.
      // v3: pets — lessonsDone, petsSeen (starting at every pet's current stage, so
      //     nothing is celebrated twice), buddyPet; grown-up pets join ownedCreatures.
      // v4: the World's first / today's quest (`quest`, none yet: the World picks one).
      // v5: the Schoolhouse raven (`schoolPet`): Daily Challenges already played count.
      // (`helpAsks`, the "Show me how" record, needs no version: `merge` starts any save
      //  without it, or with a malformed one, at {} — nothing to recover from older saves.)
      version: 5,
      migrate: (persisted, version) => {
        let p = (persisted ?? {}) as PersistedProgressV0
        if (version < 1) p = migrateV0toV1(p)
        if (version < 3) p = migrateV2toV3(p)
        if (version < 4) p = migrateV3toV4(p)
        if (version < 5) p = migrateV4toV5(p)
        return p as unknown as ProgressState
      },
      // Shallow-merge like the default, but deep-merge equippedAccessories so a save
      // that predates (or partially has) those slots always keeps all four defined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressState>
        const c = current as ProgressState
        // Grade tiers: any player saved before the grade field (or with a corrupt
        // value) falls back to grade 4 — exactly the content they had before.
        const player: AvatarChoice | null =
          p.player == null
            ? null
            : !isGradeLevel(p.player.grade)
              ? { ...p.player, grade: 4 as GradeLevel }
              : p.player
        return {
          ...c,
          ...p,
          player,
          equippedAccessories: { ...c.equippedAccessories, ...(p.equippedAccessories ?? {}) },
          // Saves from before the graphics setting (or with a bad value) start on 'auto'.
          graphicsQuality: isGraphicsQuality(p.graphicsQuality) ? p.graphicsQuality : c.graphicsQuality,
          // Saves from before adaptive practice have no factStats (→ the empty default).
          factStats:
            p.factStats && typeof p.factStats === 'object' && !Array.isArray(p.factStats)
              ? p.factStats
              : c.factStats,
          // "Show me how" opens: saves from before them (or a malformed record) have none.
          helpAsks: cleanHelpAsks(p.helpAsks),
          // Pets: anything malformed falls back to "nothing yet" (missing: keep what's here).
          lessonsDone: p.lessonsDone === undefined ? c.lessonsDone : cleanLessonsDone(p.lessonsDone),
          petsSeen: p.petsSeen === undefined ? c.petsSeen : cleanPetsSeen(p.petsSeen),
          buddyPet: p.buddyPet === undefined ? c.buddyPet : isPetId(p.buddyPet) ? p.buddyPet : null,
          ownedCreatures: Array.isArray(p.ownedCreatures)
            ? p.ownedCreatures.filter((id): id is string => typeof id === 'string')
            : c.ownedCreatures,
          // K–1 tours: saves from before them (or a bad value) have seen none.
          toursSeen: Array.isArray(p.toursSeen) ? p.toursSeen.filter((id): id is string => typeof id === 'string') : c.toursSeen,
          // Quest: a malformed one is dropped (the World picks a new one).
          quest: cleanQuest(p.quest),
          // The Schoolhouse raven: anything malformed counts as nothing yet.
          schoolPet: p.schoolPet === undefined ? c.schoolPet : cleanSchoolPet(p.schoolPet),
        }
      },
    },
  ),
)

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}
/** Keep only well-formed help records (a save from before "Show me how" has none: {}). */
export function cleanHelpAsks(v: unknown): Record<string, HelpAsk> {
  const out: Record<string, HelpAsk> = {}
  if (!isRecord(v)) return out
  for (const [id, r] of Object.entries(v)) {
    if (!isRecord(r)) continue
    const { label, count, lastAt } = r
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 1) continue
    if (typeof lastAt !== 'number' || !Number.isFinite(lastAt)) continue
    out[id] = { label: typeof label === 'string' ? label : id, count: Math.floor(count), lastAt }
  }
  return out
}
function cleanLessonsDone(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (isRecord(v)) for (const [k, at] of Object.entries(v)) if (typeof at === 'number' && Number.isFinite(at)) out[k] = at
  return out
}
function cleanQuest(v: unknown): DailyQuest | null {
  if (!isRecord(v)) return null
  const { day, zoneId, stageId, reason, doneAt, celebrated, dismissed } = v
  if (typeof day !== 'string' || typeof zoneId !== 'string' || typeof stageId !== 'string') return null
  if (!QUEST_REASONS.includes(reason as QuestReason)) return null
  return {
    day,
    zoneId,
    stageId,
    reason: reason as QuestReason,
    ...(typeof doneAt === 'number' && Number.isFinite(doneAt) ? { doneAt } : {}),
    ...(celebrated === true ? { celebrated } : {}),
    ...(dismissed === true ? { dismissed } : {}),
  }
}
function cleanPetsSeen(v: unknown): Record<string, PetGrowth> {
  const out: Record<string, PetGrowth> = {}
  if (isRecord(v)) for (const [k, g] of Object.entries(v)) if (isPetId(k) && isPetGrowth(g)) out[k] = g
  return out
}

/**
 * A zone's stars, each stage counted up to its `starsToEarn` (the same count
 * that grows its pet): the stages of the zone's set for `grade` (default: the
 * player's grade).
 */
export function zoneStars(zoneId: string, grade: GradeLevel | null | undefined = useProgress.getState().player?.grade): number {
  const progress = useProgress.getState().zones[zoneId]
  if (!progress) return 0
  const zone = getZone(zoneId)
  if (zone) return zoneStarTotals(zone, progress, grade).earned
  return Object.values(progress.stages).reduce((sum, s) => sum + s.stars, 0)
}

/**
 * Every stage of the zone's set for `grade` (default: the player's grade) has a
 * star. Another band's stars don't count here (they count again back in that band).
 */
export function zoneMastered(zoneId: string, grade: GradeLevel | null | undefined = useProgress.getState().player?.grade): boolean {
  const progress = useProgress.getState().zones[zoneId]
  const zone = getZone(zoneId)
  if (!progress || !zone) return false
  const stages = zoneStages(zone, grade)
  return stages.length > 0 && stages.every((s) => (progress.stages[s.id]?.stars ?? 0) > 0)
}

/** The child's per-fact record right now — fact providers read it at draw time. */
export function currentFactStats(): FactStats {
  return useProgress.getState().factStats ?? {}
}
