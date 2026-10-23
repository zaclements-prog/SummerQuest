import { describe, it, expect } from 'vitest'
import { getZone, zoneStages, zoneTitle } from '../../curriculum'
import { computeBadges, ZONE_BADGES, type BadgeCtx } from '../badges'
import type { GradeLevel } from '../gradeTiers'

const ctx = (grade: GradeLevel, zones: BadgeCtx['zones'] = {}): BadgeCtx => ({
  zones,
  stats: { problemsAnswered: 0, streakDays: 0 },
  totalCoinsEarned: 0,
  grade,
})
const badge = (c: BadgeCtx, id: string) => computeBadges(c).find((b) => b.id === id)!
const mesa = getZone('multiplication-mesa')!

describe('zone badge names follow the grade', () => {
  it('2nd–5th grade keep the classic names', () => {
    for (const g of [2, 3, 4, 5] as const) {
      expect(badge(ctx(g), 'zone-multiplication-mesa')).toMatchObject({ emoji: '✖️', title: 'Multiplication Master' })
      expect(badge(ctx(g), 'zone-division-dunes')).toMatchObject({ emoji: '➗', title: 'Division Dynamo' })
    }
  })

  it('a 1st grader is never a "Multiplication Master" for adding: the badge takes the zone’s 1st-grade name', () => {
    const add = badge(ctx(1), 'zone-multiplication-mesa')
    expect(add.title).toBe(`${zoneTitle(mesa, 1)} Hero`)
    expect(add.title).toBe('Adding Mesa Hero')
    expect(add.emoji).toBe(mesa.emoji)
    expect(add.description).toContain('Adding Mesa')
    expect(badge(ctx(1), 'zone-division-dunes').title).toBe('Take-Away Dunes Hero')
    expect(badge(ctx(0), 'zone-multiplication-mesa').title).toBe('Counting Mesa Hero')
    // no K–1 badge mentions multiplication or division
    for (const g of [0, 1] as const) {
      for (const b of computeBadges(ctx(g)).filter((b) => b.category === 'zone')) {
        expect(b.title).not.toMatch(/Multiplication|Division|✖️|➗/)
        expect(['✖️', '➗']).not.toContain(b.emoji)
      }
    }
  })

  it('badge ids never change with the grade (seen badges are saved by id)', () => {
    const ids = (g: GradeLevel) => computeBadges(ctx(g)).map((b) => b.id)
    for (const g of [0, 1, 2, 3, 4, 5] as const) expect(ids(g)).toEqual(ids(3))
    expect(ids(1)).toContain('zone-multiplication-mesa')
    expect(ZONE_BADGES.map((z) => `zone-${z.zoneId}`).every((id) => ids(0).includes(id))).toBe(true)
  })

  it('the rule stays "a star on every stage" (clearing them all), so a badge already earned stays earned', () => {
    // The 1st-grade playtest earned Adding Mesa's badge with 1 star per stage (5/9): that is the stated rule.
    const oneEach = { stages: Object.fromEntries(zoneStages(mesa, 1).map((s) => [s.id, { stars: 1 }])) }
    expect(badge(ctx(1, { [mesa.id]: oneEach }), 'zone-multiplication-mesa').earned).toBe(true)
    const missingOne = { stages: Object.fromEntries(zoneStages(mesa, 1).slice(1).map((s) => [s.id, { stars: 3 }])) }
    expect(badge(ctx(1, { [mesa.id]: missingOne }), 'zone-multiplication-mesa').earned).toBe(false)
  })
})
