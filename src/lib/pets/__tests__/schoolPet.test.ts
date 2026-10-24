import { describe, it, expect } from 'vitest'
import type { SkillAttempt } from '../../../store/progress'
import { localDayKey } from '../../dates'
import {
  RAVEN_ADULT_POINTS,
  RAVEN_HATCH_DAILIES,
  RAVEN_KID_POINTS,
  applyDaily,
  applyFocusChange,
  cleanSchoolPet,
  emptySchoolPet,
  focusChange,
  focusSkillIds,
  ravenGrowth,
  schoolPetStatus,
  skillRecovered,
} from '../schoolPet'
import { allPetStages, hatchedPets, pendingMoments } from '../growth'
import { PET_IDS, isPetId, petEgg } from '../catalog'
import { homePetIds } from '../roster'
import { computeBadges } from '../../badges'

const DAY = 86_400_000
const NOW = new Date(2026, 9, 21, 12).getTime()
let n = 0
/** `right` correct and `wrong` wrong answers on a skill, an hour apart, ending at `at`. */
function tries(skillId: string, right: number, wrong: number, at = NOW): SkillAttempt[] {
  const out: SkillAttempt[] = []
  const flags = [...Array(wrong).fill(false), ...Array(right).fill(true)]
  flags.forEach((correct, i) => {
    out.push({ id: `a${n++}`, at: at - (flags.length - i) * 3_600_000, zoneId: 'multiplication-mesa', topic: 't', skillId, skillLabel: skillId, correct })
  })
  return out
}
const one = (skillId: string, correct: boolean, at = NOW): SkillAttempt => ({ id: `a${n++}`, at, zoneId: 'multiplication-mesa', topic: 't', skillId, skillLabel: skillId, correct })

describe('the raven grows from Schoolhouse practice', () => {
  it(`egg → baby on the first cleared skill or the ${RAVEN_HATCH_DAILIES}rd Daily Challenge, whichever comes first`, () => {
    expect(RAVEN_HATCH_DAILIES).toBe(3)
    expect(ravenGrowth(null)).toBe('egg')
    expect(ravenGrowth({ clears: 0, dailies: 2, fullClears: 0 })).toBe('egg')
    expect(ravenGrowth({ clears: 0, dailies: 3, fullClears: 0 })).toBe('baby')
    expect(ravenGrowth({ clears: 1, dailies: 0, fullClears: 0 })).toBe('baby')
  })

  it('hatching is an event: counters that meet the rule without it (a migrated save) are still an egg', () => {
    expect(ravenGrowth({ clears: 0, dailies: 9, fullClears: 0, hatched: false })).toBe('egg')
    expect(schoolPetStatus({ clears: 0, dailies: 9, fullClears: 0, hatched: false }).next).toEqual({ stage: 'baby', more: 1, fullClear: false })
  })

  it('the 3rd daily (once a day) hatches it, and so does a clear', () => {
    let p = emptySchoolPet()
    p = applyDaily(p, '2026-10-19', '2026-10-20')
    p = applyDaily(p, '2026-10-20', '2026-10-20') // same day: not counted
    p = applyDaily(p, '2026-10-20', '2026-10-21')
    expect(p).toMatchObject({ dailies: 2, hatched: false })
    p = applyDaily(p, '2026-10-21', '2026-10-22')
    expect(p).toMatchObject({ dailies: 3, hatched: true })
    expect(ravenGrowth(p)).toBe('baby')
    expect(applyFocusChange(emptySchoolPet(), { cleared: ['s1'], emptied: false }, NOW).next.hatched).toBe(true)
  })

  it('a migrated egg with 3+ dailies hatches on the next daily or the next clear', () => {
    const migrated = { ...emptySchoolPet(), dailies: 3 }
    expect(ravenGrowth(migrated)).toBe('egg')
    expect(ravenGrowth(applyDaily(migrated, '2026-10-01', '2026-10-22'))).toBe('baby')
    expect(ravenGrowth(applyFocusChange(migrated, { cleared: ['s1'], emptied: false }, NOW).next)).toBe('baby')
    // a non-event (an answer that clears nothing) doesn't hatch it
    expect(applyFocusChange(migrated, { cleared: [], emptied: false }, NOW).next).toBe(migrated)
  })

  it(`kid at ${RAVEN_KID_POINTS} points (Daily Challenges + cleared skills)`, () => {
    expect(ravenGrowth({ clears: 1, dailies: RAVEN_KID_POINTS - 2, fullClears: 0 })).toBe('baby')
    expect(ravenGrowth({ clears: 1, dailies: RAVEN_KID_POINTS - 1, fullClears: 0 })).toBe('kid')
    expect(ravenGrowth({ clears: RAVEN_KID_POINTS, dailies: 0, fullClears: 0 })).toBe('kid')
  })

  it(`adult needs ${RAVEN_ADULT_POINTS} points AND a full clear`, () => {
    expect(ravenGrowth({ clears: 5, dailies: 20, fullClears: 0 })).toBe('kid')
    expect(ravenGrowth({ clears: 2, dailies: RAVEN_ADULT_POINTS - 3, fullClears: 1 })).toBe('kid')
    expect(ravenGrowth({ clears: 2, dailies: RAVEN_ADULT_POINTS - 2, fullClears: 1 })).toBe('adult')
  })

  it('status says what comes next', () => {
    expect(schoolPetStatus(null).next).toEqual({ stage: 'baby', more: 3, fullClear: false })
    expect(schoolPetStatus({ clears: 0, dailies: 2, fullClears: 0 }).next).toEqual({ stage: 'baby', more: 1, fullClear: false })
    expect(schoolPetStatus({ clears: 1, dailies: 1, fullClears: 0 })).toMatchObject({ stage: 'baby', points: 2, goal: 5, next: { stage: 'kid', more: 3 } })
    expect(schoolPetStatus({ clears: 3, dailies: 12, fullClears: 0 }).next).toEqual({ stage: 'adult', more: 0, fullClear: true })
    expect(schoolPetStatus({ clears: 3, dailies: 3, fullClears: 1 }).next).toEqual({ stage: 'adult', more: 9, fullClear: false })
    expect(schoolPetStatus({ clears: 3, dailies: 12, fullClears: 1 }).next).toBeNull()
  })

  it('is a pet like the others: hatched, celebrated, in the Home room first after the buddy', () => {
    expect(PET_IDS).toHaveLength(13)
    expect(PET_IDS[12]).toBe('raven')
    expect(isPetId('raven')).toBe(true)
    expect(petEgg('raven')).toBeTruthy()
    const stages = allPetStages({ zones: {}, lessonsDone: {}, schoolPet: { clears: 1, dailies: 0, fullClears: 0 } })
    expect(stages.raven).toBe('baby')
    expect(hatchedPets(stages)).toEqual(['raven'])
    expect(pendingMoments(stages, {})).toEqual([{ creatureId: 'raven', from: 'egg', to: 'baby' }])
    const many = ['lion', 'trex', 'frog', 'unicorn', 'bear', 'panda', 'fox', 'raven']
    expect(homePetIds(many, 'fox', null)).toEqual(['fox', 'raven', 'lion', 'trex', 'frog', 'unicorn'])
    expect(homePetIds(many, null, 'raven')).not.toContain('raven')
  })
})

describe("This Week's Focus, before and after an answer", () => {
  it('an answer that lifts a skill to 80 % clears it, and an emptied list is a full clear', () => {
    // 3 of 4 right = 75 %: on the list
    const before = tries('mult-f6_9', 3, 1)
    expect(focusSkillIds(before, 3, NOW)).toEqual(['mult-f6_9'])
    const after = [...before, one('mult-f6_9', true)] // 4 of 5 = 80 %
    expect(skillRecovered(after, 'mult-f6_9', NOW)).toBe(true)
    expect(focusChange(before, after, 3, NOW)).toEqual({ cleared: ['mult-f6_9'], emptied: true })
  })

  it('a wrong answer, or clearing one of two, is not a full clear', () => {
    const before = [...tries('mult-f6_9', 3, 1), ...tries('mult-f2_5', 1, 3)]
    expect(focusChange(before, [...before, one('mult-f6_9', false)], 3, NOW)).toEqual({ cleared: [], emptied: false })
    expect(focusChange(before, [...before, one('mult-f6_9', true)], 3, NOW)).toEqual({ cleared: ['mult-f6_9'], emptied: false })
  })

  it('time passing never clears anything: a skill aging out of the week is not a clear', () => {
    const old = tries('mult-f6_9', 3, 1, NOW - 6.9 * DAY)
    // a week later the old tries are out of the window: the list is already empty before the answer
    const later = NOW + 0.5 * DAY
    expect(focusSkillIds(old, 3, later)).toEqual([])
    expect(focusChange(old, [...old, one('mult-f6_9', true, later)], 3, later)).toEqual({ cleared: [], emptied: false })
  })
})

describe('counting clears and the "finished everything" reward', () => {
  const full = { cleared: ['s1'], emptied: true }
  it('a full clear pays the reward once per week; the counters still grow', () => {
    const a = applyFocusChange(emptySchoolPet(), full, NOW)
    expect(a.reward).toBe(true)
    expect(a.next).toMatchObject({ clears: 1, fullClears: 1, rewardDay: localDayKey(NOW), rewardPending: true })
    // again 3 days later (another skill): no second reward this week
    const b = applyFocusChange({ ...a.next, rewardPending: false }, { cleared: ['s2'], emptied: true }, NOW + 3 * DAY)
    expect(b.reward).toBe(false)
    expect(b.next).toMatchObject({ clears: 2, fullClears: 2, rewardDay: localDayKey(NOW), rewardPending: false })
    // a week after the first: paid again
    const c = applyFocusChange(b.next, { cleared: ['s3'], emptied: true }, NOW + 7 * DAY)
    expect(c.reward).toBe(true)
    expect(c.next.rewardDay).toBe(localDayKey(NOW + 7 * DAY))
  })

  it('the same skill counts again only after 7 days', () => {
    const a = applyFocusChange(emptySchoolPet(), { cleared: ['s1'], emptied: false }, NOW).next
    expect(applyFocusChange(a, { cleared: ['s1'], emptied: false }, NOW + 2 * DAY).next.clears).toBe(1)
    expect(applyFocusChange(a, { cleared: ['s1'], emptied: false }, NOW + 7 * DAY).next.clears).toBe(2)
  })

  it('a Daily Challenge counts once a day', () => {
    const p = emptySchoolPet()
    expect(applyDaily(p, '2026-10-20', '2026-10-21').dailies).toBe(1)
    expect(applyDaily(p, '2026-10-21', '2026-10-21')).toBe(p)
  })

  it('nothing changed → the same record (no store write)', () => {
    const p = emptySchoolPet()
    expect(applyFocusChange(p, { cleared: [], emptied: false }, NOW)).toEqual({ next: p, reward: false })
  })

  it('the Focus Finisher badge comes with the first full clear', () => {
    const ctx = { zones: {}, stats: { problemsAnswered: 0, streakDays: 0 }, totalCoinsEarned: 0, grade: 3 as const }
    expect(computeBadges(ctx).find((b) => b.id === 'focus-finisher')?.earned).toBe(false)
    expect(computeBadges({ ...ctx, focusClears: 1 }).find((b) => b.id === 'focus-finisher')?.earned).toBe(true)
  })

  it('a malformed save cleans to nothing yet', () => {
    expect(cleanSchoolPet('junk')).toEqual(emptySchoolPet())
    expect(cleanSchoolPet({ clears: -3, dailies: 2.7, fullClears: NaN, rewardDay: 'soon', rewardPending: 'yes', clearedSkills: { a: '2026-10-01', b: 5 } })).toEqual({
      clearedSkills: { a: '2026-10-01' },
      clears: 0,
      dailies: 2,
      fullClears: 0,
      rewardDay: null,
      rewardPending: false,
      hatched: false,
    })
    // a record from before `hatched`: a clear proves it hatched; dailies alone don't
    expect(cleanSchoolPet({ clears: 1 }).hatched).toBe(true)
    expect(cleanSchoolPet({ dailies: 5 }).hatched).toBe(false)
    expect(cleanSchoolPet({ dailies: 5, hatched: true }).hatched).toBe(true)
  })
})
