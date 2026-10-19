import { describe, it, expect } from 'vitest'
import { backAction, keepsAwake } from '../backButton'

// Amazon's Fire test criteria check the Back button: it must go back a screen,
// and leave the app from its top screen rather than doing nothing.

describe('Fire OS Back button', () => {
  it('leaves the app from the World and from Welcome', () => {
    for (const p of ['/world', '/']) expect(backAction(p, true)).toBe('exit')
  })
  it('goes from creating an explorer back to Welcome', () => {
    expect(backAction('/avatar', true)).toBe('back')
  })
  it('goes back a screen anywhere else', () => {
    expect(backAction('/zone/fraction-falls', true)).toBe('back')
    expect(backAction('/tutor/division', true)).toBe('back')
  })
  it('returns to the World when there is no screen to go back to', () => {
    expect(backAction('/play/fraction-falls/1', false)).toBe('hub')
  })
})

describe('keep-awake', () => {
  it('holds the screen on in a lesson only', () => {
    expect(keepsAwake('/tutor/division')).toBe(true)
    expect(keepsAwake('/tutor')).toBe(false)
    expect(keepsAwake('/world')).toBe(false)
  })
})
