import { describe, it, expect } from 'vitest'
import { getZone, zoneStages } from '../../curriculum'
import type { Stage, Zone } from '../../curriculum/types'
import { DEFAULT_GRADE, GRADE_LEVELS } from '../../lib/gradeTiers'
import { bandFallbacks, contentBand } from '../../lib/gradeBand'
import { allLessons, everyLesson, g24Lessons, getLesson, isLessonFor, k1Lessons, lessonBand, lessonsFor, zoneLessonFor } from '../lessons'
import { practiceHref, practiceStageFor } from '../lessonLinks'
import { focusRows, lessonRows } from '../../world/hubContent'

/** Today's eleven lessons, in their order: grades 2–4 must see exactly these. */
const TODAY = ['multiplication', 'division', 'fractions', 'placeValue', 'measurement', 'geometry', 'dataGraph', 'wordProblem', 'reading', 'writing', 'science']
const K_PILOT = [
  'kCounting',
  'kShapes',
  'kLetters',
  'kRhymes',
  'kTracing',
  // (K complete, phase 2a)
  'kAddTake',
  'kStoryMath',
  'kCompare',
  'kTeens',
]
const ids = (ls: { id: string }[]) => ls.map((l) => l.id)

describe('lessons by grade band', () => {
  it('K and grade 1 see only the K–1 lessons', () => {
    expect(ids(lessonsFor(0))).toEqual(K_PILOT)
    expect(ids(lessonsFor(1))).toEqual(K_PILOT)
  })

  it("grades 2–4 see today's eleven lessons, unchanged", () => {
    for (const g of [2, 3, 4]) expect(ids(lessonsFor(g))).toEqual(TODAY)
    expect(ids(g24Lessons)).toEqual(TODAY)
    expect(ids(allLessons)).toEqual(TODAY)
  })

  it("grade 5 borrows the 2–4 lessons until it has its own", () => {
    expect(ids(lessonsFor(5))).toEqual(TODAY)
  })

  it('a missing grade counts as the default grade', () => {
    expect(ids(lessonsFor(undefined))).toEqual(ids(lessonsFor(DEFAULT_GRADE)))
    expect(ids(lessonsFor(null))).toEqual(ids(lessonsFor(DEFAULT_GRADE)))
  })

  it('every lesson has one band, and every grade gets lessons of its own band (or the 2–4 fallback)', () => {
    expect(new Set(ids(everyLesson)).size).toBe(everyLesson.length)
    for (const l of g24Lessons) expect(lessonBand(l), l.id).toBe('g24')
    for (const l of k1Lessons) expect(l.band, l.id).toBe('k1')
    for (const g of GRADE_LEVELS) {
      // (1st grade borrows kindergarten's lesson for a zone it has none of its own for)
      const bands = [...bandFallbacks(contentBand(g)), 'g24']
      for (const l of lessonsFor(g)) expect(bands).toContain(lessonBand(l))
    }
  })

  it('1st grade: its own lesson for a zone where it has one, else kindergarten’s', () => {
    const own = new Set(lessonsFor(1).filter((l) => lessonBand(l) === 'g1').map((l) => l.zoneId))
    for (const l of lessonsFor(1)) if (lessonBand(l) === 'k1') expect(own.has(l.zoneId), l.id).toBe(false)
    // every zone kindergarten has a lesson for, 1st grade has one for too
    const kZones = new Set(lessonsFor(0).map((l) => l.zoneId))
    const g1Zones = new Set(lessonsFor(1).map((l) => l.zoneId))
    for (const z of kZones) expect(g1Zones.has(z), z).toBe(true)
  })

  it('getLesson finds a lesson of any band; the band helpers agree with lessonsFor', () => {
    for (const l of everyLesson) expect(getLesson(l.id)).toBe(l)
    expect(isLessonFor('kCounting', 0)).toBe(true)
    expect(isLessonFor('kCounting', 3)).toBe(false)
    expect(isLessonFor('division', 0)).toBe(false)
    expect(isLessonFor('division', 5)).toBe(true)
    expect(zoneLessonFor('reading-reef', 0)?.id).toBe('kLetters')
    expect(zoneLessonFor('reading-reef', 3)?.id).toBe('reading')
    // (K complete, phase 2a: Number Dunes has its own K lesson)
    expect(zoneLessonFor('division-dunes', 1)?.id).toBe('kCompare')
    expect(zoneLessonFor('place-value-plateau', 0)?.id).toBe('kTeens')
    expect(zoneLessonFor('no-such-zone', 1)).toBeUndefined()
  })
})

describe('the hub (World) lesson lists', () => {
  it('list the grade band’s lessons', () => {
    const p = { attempts: [], sessions: [] }
    expect(ids(lessonRows({ ...p, grade: 0 }))).toEqual(K_PILOT)
    expect(ids(lessonRows({ ...p, grade: 3 })).sort()).toEqual([...TODAY].sort())
    expect(ids(lessonRows({ ...p, grade: 5 })).sort()).toEqual([...TODAY].sort())
    expect(lessonRows({ ...p, grade: 0 })[0].href).toBe('/tutor/kCounting')
  })

  it("the Library's reading and writing lessons follow the band", () => {
    const p = { attempts: [], sessions: [] }
    const library = ['reading-reef', 'writing-workshop']
    expect(ids(lessonRows({ ...p, grade: 0 }, library))).toEqual(['kLetters', 'kRhymes', 'kTracing'])
    expect(ids(lessonRows({ ...p, grade: 3 }, library)).sort()).toEqual(['reading', 'writing'])
  })

  it("This Week's Focus only offers lessons of the child's band", () => {
    const now = Date.now()
    const misses = Array.from({ length: 6 }, (_, i) => ({
      id: `a${i}`, at: now - i * 1000, zoneId: 'division-dunes', topic: 'division',
      skillId: 'div-basic', skillLabel: 'basic division facts', correct: false,
    }))
    expect(focusRows({ zones: {}, attempts: misses, sessions: [], grade: 3 }, 3, now)[0]).toMatchObject({ learnHref: '/tutor/division' })
    expect(focusRows({ zones: {}, attempts: misses, sessions: [], grade: 0 }, 3, now)).toEqual([])
  })
})

/** A copy of a zone with a K–1 stage set (the shape the K stage-set work adds). */
function withK1(zone: Zone, stageIds: string[]): Zone {
  const stage = (id: string, i: number): Stage => ({ ...zone.stages[0], id, title: id, kind: i === 0 ? 'concept' : i === 1 ? 'practice' : 'mastery', gameId: 'listenPlay' })
  return { ...zone, stagesByBand: { ...zone.stagesByBand, k1: stageIds.map(stage) } }
}

describe('practice links stay in the band', () => {
  it("every grade's lessons practice on a stage of that grade's stage set", () => {
    for (const g of GRADE_LEVELS) {
      for (const l of lessonsFor(g)) {
        const zone = getZone(l.zoneId)!
        const set = zoneStages(zone, g).map((s) => s.id)
        // fresh, and with every stage cleared
        const cleared = { stages: Object.fromEntries(set.map((id) => [id, { stars: 3 }])) }
        expect(set, `${l.id} @ grade ${g}`).toContain(practiceStageFor(l, undefined, g))
        expect(set, `${l.id} @ grade ${g}`).toContain(practiceStageFor(l, cleared, g))
        expect(practiceHref(l, undefined, g)).toBe(`/play/${l.zoneId}/${practiceStageFor(l, undefined, g)}`)
        // the lesson's own practice stage is in its band's set (K–1: once the zone has its K–1 set)
        if (lessonBand(l) === contentBand(g) && (contentBand(g) === 'g24' || zone.stagesByBand?.k1?.length)) {
          expect(set, `${l.id}'s practice stage @ grade ${g}`).toContain(l.practiceStageId)
        }
      }
    }
  })

  it('the K lessons practice their fixed K stages, and never cross bands', () => {
    const fixed: Record<string, string[]> = {
      kCounting: ['k-count-1', 'k-count-parade', 'k-count-3'],
      kShapes: ['k-shapes-1', 'k-shapes-2', 'k-shapes-3'],
      kLetters: ['k-letters-1', 'k-letters-2', 'k-letters-3'],
      // (Letter Reef's literacy stages sit between the letter ones: Rhyme time is second)
      kRhymes: ['k-letters-1', 'k-rhyme-1', 'k-letters-2', 'k-syllables-1', 'k-letters-3', 'k-rhyme-2', 'k-blend-1', 'k-sight-1'],
      kTracing: ['k-trace-1', 'k-trace-2', 'k-trace-3', 'k-story-1'],
      // (K complete, phase 2a)
      kAddTake: ['k-addsub-1', 'k-addsub-2', 'k-addsub-3'],
      kStoryMath: ['k-woods-1', 'k-woods-2', 'k-woods-3'],
      kCompare: ['k-dunes-1', 'k-dunes-2', 'k-dunes-3'],
      kTeens: ['k-teens-1', 'k-teens-2', 'k-teens-3'],
    }
    for (const l of k1Lessons.filter((x) => fixed[x.id])) {
      const zone = withK1(getZone(l.zoneId)!, fixed[l.id])
      // a K child goes straight to the lesson's practice stage once it is open (the first of the
      // K set is; a later one, after the stage before it has a star; before that, the first)
      const first = fixed[l.id][0]
      const before = fixed[l.id][fixed[l.id].indexOf(l.practiceStageId) - 1]
      const opened = before ? { stages: { [before]: { stars: 1 } } } : undefined
      expect(practiceStageFor(l, opened, 0, zone)).toBe(l.practiceStageId)
      expect(practiceStageFor(l, opened, 1, zone)).toBe(l.practiceStageId)
      expect(practiceStageFor(l, undefined, 0, zone)).toBe(before ? first : l.practiceStageId)
      // a grade-3 child who opens a K lesson lands on a grade 2–4 stage, never a K one
      const g24 = zone.stages.map((s) => s.id)
      expect(g24).toContain(practiceStageFor(l, undefined, 3, zone))
      // and a K child who opens a 2–4 lesson of the zone lands on a K stage
      const old = g24Lessons.find((o) => o.zoneId === l.zoneId)!
      expect(fixed[l.id]).toContain(practiceStageFor(old, undefined, 0, zone))
    }
  })
})
