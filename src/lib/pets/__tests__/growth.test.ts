import { describe, it, expect } from 'vitest'
import { curriculum, getZone } from '../../../curriculum'
import { everyLesson, zoneLessonFor } from '../../../tutoring/lessons'
import { CREATURES } from '../../home/catalog'
import { PETS, petById } from '../catalog'
import {
  adultPets,
  growthFromStars,
  growthRank,
  hatchedPets,
  kidStarsFor,
  pendingMoments,
  petStages,
  petStatus,
  petStatuses,
  shownStage,
  zoneStarTotals,
} from '../growth'
import type { ZonesLike } from '../growth'
import { momentText, nextStepShort, nextStepText, stageLabel, zonePetLine } from '../copy'

/** A zones record with these stars per stage (in the zone's stage order). */
function zonesWith(zoneId: string, perStage: number[]): ZonesLike {
  const zone = getZone(zoneId)!
  const stages: Record<string, { stars: number }> = {}
  zone.stages.forEach((s, i) => {
    if (perStage[i] != null) stages[s.id] = { stars: perStage[i] }
  })
  return { [zoneId]: { stages } }
}

const pet = (id: string) => petById(id)!

describe('pet catalog', () => {
  it('has one pet per creature and one per zone', () => {
    expect(PETS).toHaveLength(12)
    expect(new Set(PETS.map((p) => p.creatureId))).toEqual(new Set(CREATURES.map((c) => c.id)))
    expect(new Set(PETS.map((p) => p.zoneId))).toEqual(new Set(curriculum.zones.map((z) => z.id)))
  })

  it('matches the plan’s pet ↔ zone ↔ lessons table (2–4 lesson, then the K–1 pilot’s)', () => {
    const table: [string, string, string[]][] = [
      ['frog', 'fraction-falls', ['fractions', 'kAddTake']],
      ['octopus', 'reading-reef', ['reading', 'kLetters', 'kRhymes']],
      ['owl', 'word-problem-woods', ['wordProblem', 'kStoryMath']],
      ['panda', 'geometry-grove', ['geometry', 'kShapes']],
      ['lion', 'multiplication-mesa', ['multiplication', 'kCounting']],
      ['trex', 'division-dunes', ['division', 'kCompare']],
      ['bear', 'measurement-marsh', ['measurement']],
      ['fox', 'data-delta', ['dataGraph']],
      ['unicorn', 'place-value-plateau', ['placeValue', 'kTeens']],
      ['dragonet', 'writing-workshop', ['writing', 'kTracing']],
      ['tiger', 'science-summit', ['science']],
      ['dragon', 'tower-battlefront', []],
    ]
    for (const [id, zoneId, lessonIds] of table) {
      expect(pet(id)).toMatchObject({ creatureId: id, zoneId, lessonIds })
    }
  })

  it("each lesson belongs to its pet's zone, and every lesson (2–4 and K–1) hatches a pet", () => {
    for (const p of PETS) {
      for (const id of p.lessonIds) {
        const lesson = everyLesson.find((l) => l.id === id)
        expect(lesson, `${p.creatureId}: ${id}`).toBeDefined()
        expect(lesson!.zoneId).toBe(p.zoneId)
      }
    }
    const hatching = new Set(PETS.flatMap((p) => p.lessonIds))
    for (const l of everyLesson) expect(hatching.has(l.id), l.id).toBe(true)
  })

  it('the lesson an egg suggests (its zone’s lesson for the grade) is always one that hatches it', () => {
    for (const p of PETS) {
      for (const g of [0, 1, 2, 3, 4, 5]) {
        const l = zoneLessonFor(p.zoneId, g)
        if (l) expect(p.lessonIds, `${p.creatureId} at grade ${g}`).toContain(l.id)
      }
    }
    expect(zoneLessonFor('multiplication-mesa', 0)?.id).toBe('kCounting')
    expect(zoneLessonFor('multiplication-mesa', 3)?.id).toBe('multiplication')
    // (K complete, phase 2a: the trex and the unicorn hatch from Number Dunes' and Ten Frame Plateau's K lessons)
    expect(zoneLessonFor('division-dunes', 0)?.id).toBe('kCompare')
    expect(zoneLessonFor('place-value-plateau', 0)?.id).toBe('kTeens')
    expect(zoneLessonFor('no-such-zone', 0)).toBeUndefined() // no lesson button
  })

  it('every egg has its own colors', () => {
    for (const p of PETS) {
      expect(p.egg.shell).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.egg.spot).toMatch(/^#[0-9a-f]{6}$/i)
    }
    expect(new Set(PETS.map((p) => p.egg.shell)).size).toBe(PETS.length)
  })
})

describe('zoneStarTotals', () => {
  it("adds up the curriculum's maximums", () => {
    expect(zoneStarTotals(getZone('multiplication-mesa')!, undefined, 3).total).toBe(9)
    expect(zoneStarTotals(getZone('division-dunes')!, undefined, 3).total).toBe(12)
    expect(zoneStarTotals(getZone('tower-battlefront')!, undefined, 3).total).toBe(3)
  })

  it('caps a stage that over-reports its stars', () => {
    const z = zonesWith('multiplication-mesa', [99, 4, 0])
    const t = zoneStarTotals(getZone('multiplication-mesa')!, z['multiplication-mesa'], 3)
    expect(t).toEqual({ earned: 6, total: 9, complete: false })
  })

  it('ignores stages the zone no longer has, and bad values', () => {
    const t = zoneStarTotals(getZone('fraction-falls')!, {
      stages: { 'old-stage': { stars: 3 }, 'frac-practice': { stars: Number.NaN }, 'frac-compare': { stars: -2 } },
    }, 3)
    expect(t.earned).toBe(0)
  })

  it('is complete only at the maximum', () => {
    const zone = getZone('data-delta')!
    expect(zoneStarTotals(zone, zonesWith('data-delta', [3, 3, 2])['data-delta'], 3).complete).toBe(false)
    expect(zoneStarTotals(zone, zonesWith('data-delta', [3, 3, 3])['data-delta'], 3).complete).toBe(true)
    expect(zoneStarTotals({ stages: [] }, undefined, 3).complete).toBe(false)
  })
})

describe('growthFromStars', () => {
  it('kid needs min(5, total − 1) stars, never fewer than one', () => {
    expect(kidStarsFor(9)).toBe(5)
    expect(kidStarsFor(12)).toBe(5)
    expect(kidStarsFor(3)).toBe(2)
    expect(kidStarsFor(2)).toBe(1)
    expect(kidStarsFor(1)).toBe(1)
  })

  it('follows the table for a 9-star zone', () => {
    const at = (n: number, lesson = false) => growthFromStars(n, 9, lesson)
    expect(at(0)).toBe('egg')
    expect(at(0, true)).toBe('baby')
    expect(at(1)).toBe('baby')
    expect(at(4)).toBe('baby')
    expect(at(5)).toBe('kid')
    expect(at(8)).toBe('kid')
    expect(at(9)).toBe('adult')
    expect(at(9, true)).toBe('adult')
  })

  it("Tower Battlefront's 3-star zone: baby at 1, kid at 2, adult at 3", () => {
    expect(growthFromStars(0, 3, false)).toBe('egg')
    expect(growthFromStars(1, 3, false)).toBe('baby')
    expect(growthFromStars(2, 3, false)).toBe('kid')
    expect(growthFromStars(3, 3, false)).toBe('adult')
  })

  it('a zone without stars to earn can only hatch from its lesson', () => {
    expect(growthFromStars(0, 0, false)).toBe('egg')
    expect(growthFromStars(0, 0, true)).toBe('baby')
  })
})

describe('petStatus', () => {
  it('starts as an egg that its lesson or a first star hatches', () => {
    const s = petStatus(pet('frog'), {}, {}, 3)
    expect(s.stage).toBe('egg')
    expect(s.next).toEqual({ stage: 'baby', more: 1, lesson: true })
    expect(petStatus(pet('frog'), {}, { fractions: 1 }, 3).stage).toBe('baby')
    expect(petStatus(pet('frog'), zonesWith('fraction-falls', [1]), {}, 3).stage).toBe('baby')
    // another zone's lesson doesn't count
    expect(petStatus(pet('frog'), {}, { reading: 1 }, 3).stage).toBe('egg')
  })

  it('says how many stars the next stage needs', () => {
    const baby = petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 1]), {}, 3)
    expect(baby).toMatchObject({ stage: 'baby', stars: 4, total: 9, next: { stage: 'kid', more: 1, lesson: false } })
    const kid = petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 3]), {}, 3)
    expect(kid).toMatchObject({ stage: 'kid', stars: 6, next: { stage: 'adult', more: 3 } })
    const adult = petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 3, 3]), {}, 3)
    expect(adult).toMatchObject({ stage: 'adult', next: null })
  })

  it('a lesson-hatched baby still needs every star of the kid stage', () => {
    const s = petStatus(pet('panda'), {}, { geometry: 123 }, 3)
    expect(s).toMatchObject({ stage: 'baby', lessonDone: true, next: { stage: 'kid', more: 5 } })
  })

  it('a 12-star zone (Division Dunes) is a kid at 5 and grown up at 12', () => {
    expect(petStatus(pet('trex'), zonesWith('division-dunes', [3, 2]), {}, 3).stage).toBe('kid')
    expect(petStatus(pet('trex'), zonesWith('division-dunes', [3, 3, 3, 2]), {}, 3).stage).toBe('kid')
    expect(petStatus(pet('trex'), zonesWith('division-dunes', [3, 3, 3, 3]), {}, 3).stage).toBe('adult')
  })

  it('Tower Battlefront: the dragon has no lesson and grows on 1, 2 and 3 stars', () => {
    expect(petStatus(pet('dragon'), {}, {}, 3).next).toEqual({ stage: 'baby', more: 1, lesson: false })
    expect(petStatus(pet('dragon'), zonesWith('tower-battlefront', [1]), {}, 3).stage).toBe('baby')
    expect(petStatus(pet('dragon'), zonesWith('tower-battlefront', [2]), {}, 3)).toMatchObject({ stage: 'kid', next: { stage: 'adult', more: 1 } })
    expect(petStatus(pet('dragon'), zonesWith('tower-battlefront', [3]), {}, 3).stage).toBe('adult')
  })

  it("stages over-reporting stars can't grow a pet past what the zone allows", () => {
    // 99 stars on one stage count as its 3: a baby, not a grown-up
    expect(petStatus(pet('lion'), zonesWith('multiplication-mesa', [99]), {}, 3).stage).toBe('baby')
    // two stages at 5 count as 3 + 3: a kid, three short of grown up
    expect(petStatus(pet('lion'), zonesWith('multiplication-mesa', [5, 5, 0]), {}, 3)).toMatchObject({ stage: 'kid', stars: 6 })
    // Tower Battlefront's one stage at 7 is simply complete
    expect(petStatus(pet('dragon'), zonesWith('tower-battlefront', [7]), {}, 3)).toMatchObject({ stage: 'adult', stars: 3 })
  })

  it('a pet whose zone is missing stays an egg (or a baby from its lesson)', () => {
    const none = () => undefined
    expect(petStatus(pet('frog'), {}, {}, 3, none)).toMatchObject({ stage: 'egg', total: 0 })
    expect(petStatus(pet('frog'), {}, { fractions: 1 }, 3, none)).toMatchObject({ stage: 'baby', next: null })
  })
})

describe('all pets', () => {
  it('petStatuses / petStages cover every pet in catalog order', () => {
    const zones = { ...zonesWith('fraction-falls', [3, 3, 3]), ...zonesWith('reading-reef', [2]) }
    const list = petStatuses(zones, { geometry: 1 }, 3)
    expect(list.map((s) => s.pet.creatureId)).toEqual(PETS.map((p) => p.creatureId))
    const stages = petStages(zones, { geometry: 1 }, 3)
    expect(stages.frog).toBe('adult')
    expect(stages.octopus).toBe('baby')
    expect(stages.panda).toBe('baby')
    expect(stages.lion).toBe('egg')
    expect(adultPets(stages)).toEqual(['frog'])
    expect(hatchedPets(stages)).toEqual(PETS.map((p) => p.creatureId).filter((id) => ['frog', 'octopus', 'panda'].includes(id)))
  })

  it('pendingMoments lists pets ahead of what was celebrated', () => {
    const stages = { frog: 'adult', octopus: 'baby', panda: 'kid', lion: 'egg' } as const
    const seen = { frog: 'kid', octopus: 'baby', panda: 'adult', lion: 'egg' } as const
    expect(pendingMoments(stages, seen)).toEqual([{ creatureId: 'frog', from: 'kid', to: 'adult' }])
    // never seen counts as an egg; a junk saved value too
    expect(pendingMoments({ octopus: 'baby' }, {})).toEqual([{ creatureId: 'octopus', from: 'egg', to: 'baby' }])
    expect(pendingMoments({ octopus: 'kid' }, { octopus: 'huge' as never })).toEqual([{ creatureId: 'octopus', from: 'egg', to: 'kid' }])
  })

  it('Home and the World show a pet as last celebrated', () => {
    expect(shownStage('baby', undefined)).toBe('egg') // hatched, not yet seen hatching: stays inside
    expect(shownStage('kid', 'baby')).toBe('baby') // grew: keeps its old look until the celebration
    expect(shownStage('kid', 'kid')).toBe('kid')
    expect(shownStage('baby', 'adult')).toBe('baby') // never ahead of what it is now
    expect(shownStage('adult', 'junk' as never)).toBe('egg')
  })

  it('growthRank orders the stages', () => {
    expect(['egg', 'baby', 'kid', 'adult'].map(growthRank)).toEqual([0, 1, 2, 3])
    expect(growthRank(undefined)).toBe(0)
    expect(growthRank('dragon')).toBe(0)
  })
})

describe('pet words', () => {
  it('stage labels', () => {
    expect(['egg', 'baby', 'kid', 'adult'].map((g) => stageLabel(g as never))).toEqual(['Egg', 'Baby', 'Kid', 'Grown-up'])
  })

  it('what comes next, in a sentence and in short', () => {
    const lionKid = petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 3]), {}, 3)
    expect(nextStepText(lionKid)).toBe('3 more ⭐ in Multiplication Mesa to grow up!')
    expect(nextStepShort(lionKid)).toBe('3 more ⭐ to grow up')
    const lionBaby = petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 1]), {}, 3)
    expect(nextStepText(lionBaby)).toBe('1 more ⭐ in Multiplication Mesa to grow!')
    expect(nextStepText(petStatus(pet('frog'), {}, {}, 3))).toBe('Finish the lesson or get 1 ⭐ in Fraction Falls to hatch!')
    expect(nextStepText(petStatus(pet('dragon'), {}, {}, 3))).toBe('Get 1 ⭐ in Tower Battlefront to hatch!')
    expect(nextStepShort(petStatus(pet('dragon'), {}, {}, 3))).toBe('1 ⭐ to hatch')
    const adult = petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 3, 3]), {}, 3)
    expect(nextStepText(adult)).toBe('All grown up! You can play as the Lion!')
  })

  it("the line on a zone's page", () => {
    expect(zonePetLine(petStatus(pet('lion'), {}, {}, 3))).toBe('Your Lion egg: get 1 ⭐ here to hatch it!')
    expect(zonePetLine(petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 3]), {}, 3))).toBe('Your kid Lion: 3 more ⭐ here to grow up!')
    expect(zonePetLine(petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 1]), {}, 3))).toBe('Your baby Lion: 1 more ⭐ here to grow!')
    expect(zonePetLine(petStatus(pet('lion'), zonesWith('multiplication-mesa', [3, 3, 3]), {}, 3))).toBe('Your Lion is all grown up!')
  })

  it('celebration words', () => {
    expect(momentText({ creatureId: 'lion', from: 'kid', to: 'adult' })).toEqual({
      title: '🎉 Lion is all grown up!',
      line: 'You can now play as the Lion!',
    })
    expect(momentText({ creatureId: 'frog', from: 'egg', to: 'baby' }).line).toBe('Say hi to your baby Frog!')
    expect(momentText({ creatureId: 'frog', from: 'baby', to: 'kid' }).title).toBe('Frog grew bigger!')
  })
})
