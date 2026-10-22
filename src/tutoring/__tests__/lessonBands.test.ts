import { describe, it, expect } from 'vitest'
import { getZone, zoneStages } from '../../curriculum'
import type { Stage, Zone } from '../../curriculum/types'
import { DEFAULT_GRADE, GRADE_LEVELS } from '../../lib/gradeTiers'
import { bandFallbacks, contentBand } from '../../lib/gradeBand'
import { allLessons, everyLesson, g24Lessons, g5Lessons, getLesson, isLessonFor, k1Lessons, lessonBand, lessonsFor, zoneLessonFor } from '../lessons'
import { practiceHref, practiceStageFor } from '../lessonLinks'
import { focusRows, lessonRows } from '../../world/hubContent'
import { SKILLS } from '../skills'

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
  'kMeasure',
  'kSorting',
  'kScience',
  'kTowers',
]
const ids = (ls: { id: string }[]) => ls.map((l) => l.id)
/** 1st grade's own lessons (phase 2b), in their order, each for a zone 1st grade has its own set for. */
const G1_OWN: Record<string, string> = {
  // Word Reef, Writing Workshop
  g1Reading: 'reading-reef',
  g1Writing: 'writing-workshop',
  // Tens Plateau, Fair Share Falls, Shape Grove
  g1Tens: 'place-value-plateau',
  g1Shares: 'fraction-falls',
  g1Shapes: 'geometry-grove',
  // Measure Marsh, Graph Delta, Sky Summit
  g1Measure: 'measurement-marsh',
  g1Graphs: 'data-delta',
  g1Science: 'science-summit',
  // Adding Mesa, Take-Away Dunes, Story Woods
  g1Adding: 'multiplication-mesa',
  g1Subtract: 'division-dunes',
  g1StoryMath: 'word-problem-woods',
}
/** 5th grade's own lessons (phase 3), each for a zone 5th grade has its own set for. */
const G5_OWN: Record<string, string> = {
  // Fraction Falls, Place Value Plateau
  g5Fractions: 'fraction-falls',
  g5Decimals: 'place-value-plateau',
  // Multiplication Mesa, Division Dunes, Word Problem Woods
  g5Multiplication: 'multiplication-mesa',
  g5Division: 'division-dunes',
  g5Expressions: 'word-problem-woods',
}
/** 1st grade's lessons: its own, then kindergarten's for the zones it has none of its own for. */
const G1_LESSONS = [...Object.keys(G1_OWN), ...K_PILOT.filter((id) => !Object.values(G1_OWN).includes(getLesson(id)!.zoneId))]

describe('lessons by grade band', () => {
  it('K and grade 1 see only the K–1 lessons (1st grade its own first, then kindergarten’s for the other zones)', () => {
    expect(ids(lessonsFor(0))).toEqual(K_PILOT)
    // (1st grade: its own lessons where it has them, kindergarten's for the rest)
    expect(ids(lessonsFor(1))).toEqual(G1_LESSONS)
  })

  it('1st grade’s own lessons (phase 2b): band g1, their zones, practised in the zone’s first 1st-grade stage', () => {
    for (const [id, zoneId] of Object.entries(G1_OWN)) {
      const l = getLesson(id)!
      expect(l, id).toBeDefined()
      expect(l).toMatchObject({ band: 'g1', zoneId })
      expect(zoneLessonFor(zoneId, 1)?.id).toBe(id)
      expect(zoneStages(getZone(zoneId)!, 1)[0].id).toBe(l.practiceStageId)
      expect(isLessonFor(id, 0)).toBe(false)
      expect(isLessonFor(id, 3)).toBe(false)
    }
    expect(zoneLessonFor('place-value-plateau', 0)?.id).toBe('kTeens')
  })

  it("grades 2–4 see today's eleven lessons, unchanged", () => {
    for (const g of [2, 3, 4]) expect(ids(lessonsFor(g))).toEqual(TODAY)
    expect(ids(g24Lessons)).toEqual(TODAY)
    expect(ids(allLessons)).toEqual(TODAY)
  })

  it("grade 5: its own lesson for a zone where it has one, else the 2–4 one", () => {
    const g5 = lessonsFor(5)
    const own = new Set(g5.filter((l) => lessonBand(l) === 'g5').map((l) => l.zoneId))
    for (const l of g5) expect(['g5', 'g24'], l.id).toContain(lessonBand(l))
    for (const l of g5) if (lessonBand(l) === 'g24') expect(own.has(l.zoneId), l.id).toBe(false)
    // every zone grades 2–4 have a lesson for, grade 5 has one for too
    const g5Zones = new Set(g5.map((l) => l.zoneId))
    for (const l of g24Lessons) expect(g5Zones.has(l.zoneId), l.zoneId).toBe(true)
    // (until it has any of its own, exactly today's eleven)
    if (own.size === 0) expect(ids(g5)).toEqual(TODAY)
  })

  it('5th grade’s own lessons (phase 3): band g5, their zones, practised in the zone’s first 5th-grade stage, never offered to 2–4', () => {
    for (const [id, zoneId] of Object.entries(G5_OWN)) {
      const l = getLesson(id)!
      expect(l, id).toBeDefined()
      expect(l).toMatchObject({ band: 'g5', zoneId })
      expect(zoneLessonFor(zoneId, 5)?.id).toBe(id)
      expect(zoneStages(getZone(zoneId)!, 5)[0].id).toBe(l.practiceStageId)
      expect(practiceHref(l, undefined, 5)).toBe(`/play/${zoneId}/${l.practiceStageId}`)
      for (const g of [0, 1, 2, 3, 4]) expect(isLessonFor(id, g), `${id} @ ${g}`).toBe(false)
    }
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
    // (5th grade has its own Division Dunes lesson: phase 3)
    expect(isLessonFor('division', 5)).toBe(false)
    // (…and its own Fraction Falls lesson; grades 2–4 keep theirs)
    expect(isLessonFor('fractions', 5)).toBe(false)
    expect(isLessonFor('fractions', 4)).toBe(true)
    expect(zoneLessonFor('reading-reef', 0)?.id).toBe('kLetters')
    expect(zoneLessonFor('reading-reef', 3)?.id).toBe('reading')
    // (K complete, phase 2a: Number Dunes has its own K lesson; 1st grade, phase 2b, its own: Take-Away Dunes)
    expect(zoneLessonFor('division-dunes', 0)?.id).toBe('kCompare')
    expect(zoneLessonFor('division-dunes', 1)?.id).toBe('g1Subtract')
    expect(zoneLessonFor('place-value-plateau', 0)?.id).toBe('kTeens')
    expect(zoneLessonFor('no-such-zone', 1)).toBeUndefined()
  })
})

describe('5th grade’s own lessons (phase 3)', () => {
  it('band g5, their zones, practised in the zone’s first 5th-grade stage; offered to 5th grade only', () => {
    for (const [id, zoneId] of Object.entries(G5_OWN)) {
      const l = getLesson(id)!
      expect(l, id).toBeDefined()
      expect(l).toMatchObject({ band: 'g5', zoneId })
      expect(zoneLessonFor(zoneId, 5)?.id).toBe(id)
      expect(zoneStages(getZone(zoneId)!, 5)[0].id).toBe(l.practiceStageId)
      expect(practiceHref(l, undefined, 5)).toBe(`/play/${zoneId}/${l.practiceStageId}`)
      for (const g of [0, 1, 2, 3, 4]) expect(isLessonFor(id, g), `${id} at grade ${g}`).toBe(false)
    }
    // 5th grade keeps the 2–4 lesson where it has none of its own
    expect(zoneLessonFor('fraction-falls', 5)?.id).toBeDefined()
    expect(lessonsFor(5).filter((l) => lessonBand(l) === 'g5').map((l) => l.id)).toEqual(expect.arrayContaining(Object.keys(G5_OWN)))
  })
})

describe('the hub (World) lesson lists', () => {
  it('list the grade band’s lessons', () => {
    const p = { attempts: [], sessions: [] }
    expect(ids(lessonRows({ ...p, grade: 0 }))).toEqual(K_PILOT)
    expect(ids(lessonRows({ ...p, grade: 3 })).sort()).toEqual([...TODAY].sort())
    // (5th grade: its own lessons where a zone has one, the 2–4 one elsewhere)
    expect(ids(lessonRows({ ...p, grade: 5 })).sort()).toEqual(ids(lessonsFor(5)).sort())
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
      // K complete (phase 2a)
      kMeasure: ['k-measure-1', 'k-measure-2', 'k-measure-3'],
      kSorting: ['k-sort-1', 'k-sort-2', 'k-sort-3'],
      kScience: ['k-science-1', 'k-science-2', 'k-science-3'],
      kTowers: ['k-towers-1', 'k-towers-2', 'k-towers-3'],
    }
    for (const l of k1Lessons.filter((x) => fixed[x.id])) {
      const zone = withK1(getZone(l.zoneId)!, fixed[l.id])
      // a K child goes straight to the lesson's practice stage once it is open (the first of the
      // K set is; a later one, after the stage before it has a star; before that, the first)
      const first = fixed[l.id][0]
      const before = fixed[l.id][fixed[l.id].indexOf(l.practiceStageId) - 1]
      const opened = before ? { stages: { [before]: { stars: 1 } } } : undefined
      expect(practiceStageFor(l, opened, 0, zone)).toBe(l.practiceStageId)
      // (1st grade plays a K stage only in a zone with no 1st-grade set of its own: phase 2b)
      if (!zone.stagesByBand?.g1?.length) expect(practiceStageFor(l, opened, 1, zone)).toBe(l.practiceStageId)
      expect(practiceStageFor(l, undefined, 0, zone)).toBe(before ? first : l.practiceStageId)
      // a grade-3 child who opens a K lesson lands on a grade 2–4 stage, never a K one
      const g24 = zone.stages.map((s) => s.id)
      expect(g24).toContain(practiceStageFor(l, undefined, 3, zone))
      // and a K child who opens a 2–4 lesson of the zone lands on a K stage (Tower Battlefront has none)
      const old = g24Lessons.find((o) => o.zoneId === l.zoneId)
      if (old) expect(fixed[l.id]).toContain(practiceStageFor(old, undefined, 0, zone))
    }
  })

  it('the 1st-grade lessons practice their own first stages, and never cross bands', () => {
    const fixed: Record<string, string[]> = {
      // Measure Marsh, Graph Delta, Sky Summit
      g1Measure: ['g1-measure-1', 'g1-measure-2', 'g1-measure-3'],
      g1Graphs: ['g1-graphs-1', 'g1-graphs-2', 'g1-graphs-3'],
      g1Science: ['g1-science-1', 'g1-science-2', 'g1-science-3'],
    }
    for (const [id, stages] of Object.entries(fixed)) {
      const l = getLesson(id)!
      expect(l, id).toBeDefined()
      expect(lessonBand(l)).toBe('g1')
      expect(l.practiceStageId).toBe(stages[0])
      const zone = getZone(l.zoneId)!
      expect(zoneStages(zone, 1).map((s) => s.id)).toEqual(stages)
      expect(practiceHref(l, undefined, 1)).toBe(`/play/${l.zoneId}/${stages[0]}`)
      // a kindergartner (or a 3rd grader) who opens it lands in their own band's set
      expect(zoneStages(zone, 0).map((s) => s.id)).toContain(practiceStageFor(l, undefined, 0))
      expect(zone.stages.map((s) => s.id)).toContain(practiceStageFor(l, undefined, 3))
    }
  })
})

/** 5th grade's own lessons (phase 3): each for a zone with a grade-5 set, practised in its first grade-5 stage. */
const G5_REEF_WORKSHOP_SUMMIT: Record<string, string> = {
  g5Reading: 'reading-reef',
  g5Writing: 'writing-workshop',
  g5Science: 'science-summit',
}

describe('5th grade’s own lessons: Reading Reef, Writing Workshop, Science Summit (phase 3)', () => {
  it('band g5, their zones, practised in the zone’s first grade-5 stage; offered only to 5th grade', () => {
    for (const [id, zoneId] of Object.entries(G5_REEF_WORKSHOP_SUMMIT)) {
      const l = getLesson(id)!
      expect(l, id).toBeDefined()
      expect(l).toMatchObject({ band: 'g5', zoneId })
      expect(zoneLessonFor(zoneId, 5)?.id).toBe(id)
      expect(zoneStages(getZone(zoneId)!, 5)[0].id).toBe(l.practiceStageId)
      expect(practiceHref(l, undefined, 5)).toBe(`/play/${zoneId}/${l.practiceStageId}`)
      for (const g of [0, 1, 2, 3, 4]) expect(isLessonFor(id, g), `${id} at grade ${g}`).toBe(false)
      // a 3rd grader who opens it lands on a 2–4 stage
      expect(getZone(zoneId)!.stages.map((s) => s.id)).toContain(practiceStageFor(l, undefined, 3))
    }
    // the 2–4 lessons of these zones are not offered at grade 5; the other zones' still are
    expect(isLessonFor('reading', 5)).toBe(false)
    expect(isLessonFor('writing', 5)).toBe(false)
    expect(isLessonFor('science', 5)).toBe(false)
    expect(isLessonFor('division', 5) || isLessonFor('g5Division', 5)).toBe(true)
  })
})

describe('5th grade’s own lessons (phase 3): Measurement Marsh, Geometry Grove, Data Delta', () => {
  const OWN: Record<string, [string, string]> = {
    g5Volume: ['measurement-marsh', 'g5-measure-1'],
    g5Coordinates: ['geometry-grove', 'g5-geo-1'],
    g5LinePlots: ['data-delta', 'g5-data-1'],
  }

  it('band g5, in g5Lessons, practised in the zone’s first 5th-grade stage, offered to 5th grade only', () => {
    for (const [id, [zoneId, first]] of Object.entries(OWN)) {
      const l = getLesson(id)!
      expect(l, id).toBeDefined()
      expect(l).toMatchObject({ band: 'g5', zoneId, practiceStageId: first })
      expect(ids(g5Lessons)).toContain(id)
      expect(zoneLessonFor(zoneId, 5)?.id).toBe(id)
      expect(zoneStages(getZone(zoneId)!, 5)[0].id).toBe(first)
      expect(practiceHref(l, undefined, 5)).toBe(`/play/${zoneId}/${first}`)
      for (const g of [0, 1, 2, 3, 4]) expect(isLessonFor(id, g), `${id} at grade ${g}`).toBe(false)
      // a 3rd grader who opens it lands on a 2nd–4th grade stage
      expect(getZone(zoneId)!.stages.map((s) => s.id)).toContain(practiceStageFor(l, undefined, 3))
    }
    // the 2nd–4th grade lessons of these zones are not 5th grade's any more
    for (const old of ['measurement', 'geometry', 'dataGraph']) expect(isLessonFor(old, 5)).toBe(false)
    expect(isLessonFor('measurement', 4)).toBe(true)
  })

  it('every step has a narration, the checks have one right answer among different options, and every skill is registered', () => {
    for (const id of Object.keys(OWN)) {
      const l = getLesson(id)!
      expect(l.steps.length).toBeGreaterThanOrEqual(4)
      expect(l.steps.filter((s) => s.check).length).toBeGreaterThanOrEqual(3)
      for (const s of l.steps) {
        expect(s.narration.length, s.id).toBeGreaterThan(40)
        if (!s.check) continue
        expect(new Set(s.check.options.map(String)).size, s.id).toBe(s.check.options.length)
        expect(s.check.options.filter((o) => o === s.check!.answer), s.id).toHaveLength(1)
      }
      for (const sk of l.skillIds) expect(SKILLS[sk]?.lessonId, sk).toBe(id)
    }
  })
})
