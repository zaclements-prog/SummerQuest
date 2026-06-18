import { describe, it, expect } from 'vitest'
import {
  subjectTheme,
  accuracyTone,
  accuracyColorClass,
} from '../theme'
import type { Subject } from '../theme'

describe('subjectTheme', () => {
  const subjects: Subject[] = ['island', 'monster', 'ocean', 'quest']

  it.each(subjects)('returns a full class set for %s', (subject) => {
    const theme = subjectTheme(subject)
    expect(theme).toHaveProperty('bg')
    expect(theme).toHaveProperty('ring')
    expect(theme).toHaveProperty('accent')
    expect(theme).toHaveProperty('text')
    expect(theme).toHaveProperty('button')
    // All values should be non-empty strings
    expect(theme.bg.length).toBeGreaterThan(0)
    expect(theme.ring.length).toBeGreaterThan(0)
    expect(theme.accent.length).toBeGreaterThan(0)
    expect(theme.text.length).toBeGreaterThan(0)
    expect(theme.button.length).toBeGreaterThan(0)
  })

  it('defaults to quest theme for unknown subject', () => {
    const fallback = subjectTheme('unknown-subject')
    const quest = subjectTheme('quest')
    expect(fallback).toEqual(quest)
  })

  it('quest theme uses quest palette', () => {
    const theme = subjectTheme('quest')
    expect(theme.bg).toContain('quest')
    expect(theme.button).toContain('quest')
  })

  it('island theme uses island palette', () => {
    const theme = subjectTheme('island')
    expect(theme.bg).toContain('island')
  })

  it('ocean theme uses ocean palette', () => {
    const theme = subjectTheme('ocean')
    expect(theme.bg).toContain('ocean')
  })

  it('monster theme uses monster palette', () => {
    const theme = subjectTheme('monster')
    expect(theme.bg).toContain('monster')
  })
})

describe('accuracyTone', () => {
  it('returns wrong for < 60', () => {
    expect(accuracyTone(0)).toBe('wrong')
    expect(accuracyTone(50)).toBe('wrong')
    expect(accuracyTone(59)).toBe('wrong')
  })

  it('returns quest for 60–84', () => {
    expect(accuracyTone(60)).toBe('quest')
    expect(accuracyTone(75)).toBe('quest')
    expect(accuracyTone(84)).toBe('quest')
  })

  it('returns correct for >= 85', () => {
    expect(accuracyTone(85)).toBe('correct')
    expect(accuracyTone(95)).toBe('correct')
    expect(accuracyTone(100)).toBe('correct')
  })
})

describe('accuracyColorClass', () => {
  it('returns wrong-600 class for low accuracy', () => {
    expect(accuracyColorClass(50)).toBe('text-wrong-600')
  })

  it('returns quest-600 class for mid accuracy', () => {
    expect(accuracyColorClass(75)).toBe('text-quest-600')
  })

  it('returns correct-600 class for high accuracy', () => {
    expect(accuracyColorClass(95)).toBe('text-correct-600')
  })
})
