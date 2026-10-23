import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { paradeBanner } from '../CritterParade.banners'
import { Caption, FinaleReadout, LevelEndCard, ListenParadeResults, RevealChips, type LevelEnd } from '../CritterParade.hud'
import { cageSignWords, gangSignWords } from '../CritterParade.parts'
import { ScoreChip } from '../_juice/JuiceHud'
import { isWord } from '../../test/textBudget'
import { visibleWords } from '../../test/textBudget'
import type { Decision, GatePair } from '../../lib/gates'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Critter Parade's K–1 cards: stars, big icons and numbers, nothing to read; grades 2–5 keep theirs. */

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const gate = (k: number, result: number) => ({ op: { kind: 'sub' as const, k }, label: `−${k}`, speech: `minus ${k}`, result })
const pair = { left: gate(1, 14), right: gate(5, 10), winner: 'left', goal: 'keep', gap: 4, trap: null, maker: 'test', key: 'k', count: 15 } as unknown as GatePair
const worst: Decision = { picked: 'right', smart: false, tie: false, result: 10, other: 14, pair }
const lost: LevelEnd = { outcome: { win: false, margin: -3 } as LevelEnd['outcome'], smart: 3, gates: 5, hint: 'With 15, −1 kept 14 but −5 kept 10. Work out both before you pick!', joined: 12, worst }

describe('Critter Parade, K–1 cards', () => {
  it('the end-of-parade card: the parade size big, a dot per gate, the tip as a picture, icon buttons; no words', () => {
    act(() => root.render(<LevelEndCard end={lost} level={0} last={false} onNext={() => {}} onRematch={() => {}} listen />))
    expect(visibleWords(container)).toEqual([])
    expect(container.textContent).toContain('12')
    expect(container.querySelectorAll('[data-smart]')).toHaveLength(3)
    const hint = container.querySelector('[data-parade-hint]')!
    expect(hint.textContent).toContain('15')
    expect(hint.querySelector('[data-better]')!.textContent).toMatch(/−1.*14/)
    expect(container.querySelector('button[aria-label="Rematch"]')).not.toBeNull()
    expect(container.querySelector('button[aria-label="Next parade"]')).not.toBeNull()
  })

  it('the results card: stars, the biggest parade, the smart picks and a big ▶; no words', () => {
    act(() => root.render(<ListenParadeResults stars={2} biggest={36} smart={11} total={13} onCollect={() => {}} />))
    expect(visibleWords(container)).toEqual([])
    expect(container.textContent).toContain('36')
    expect(container.querySelectorAll('[data-smart]')).toHaveLength(11)
    expect(container.querySelector('[data-guide="parade-collect"]')).not.toBeNull()
  })

  it('grades 2–5 keep their card with its words and the printed tip', () => {
    act(() => root.render(<LevelEndCard end={lost} level={0} last={false} onNext={() => {}} onRematch={() => {}} />))
    expect(container.textContent).toContain('smart picks')
    expect(container.textContent).toContain('Work out both before you pick!')
  })

  it('the HUD while the parade plays: banners, reveal chips, tug-of-war readout, score and caption; no words', () => {
    for (const k of ['start', 'level', 'full', 'join', 'tug', 'slow'] as const) expect(isWord(paradeBanner(k, true, 3)), k).toBe(false)
    for (const k of ['start', 'full', 'tug'] as const) expect(isWord(paradeBanner(k, false, 3)), k).toBe(true)
    const outcomes = [
      { win: true, margin: 12 },
      { win: true, margin: 0 },
      { win: false, margin: -4 },
    ] as LevelEnd['outcome'][]
    act(() =>
      root.render(
        <div>
          <FinaleReadout ours={37} gang={25} result={null} listen />
          {outcomes.map((o, i) => (
            <FinaleReadout key={i} ours={37} gang={25} result={o} listen />
          ))}
          <RevealChips reveal={{ got: '+3 → 8', other: '−1 → 4', tone: 'weak', key: 1 }} />
          <ScoreChip score={240} best={300} pictureBest />
          <Caption text="Which gate gives us more?" listen />
        </div>,
      ),
    )
    expect(visibleWords(container)).toEqual([])
    expect(container.textContent).toContain('37 > 25')
    expect(container.textContent).toContain('300')
    // the caption is still there for a screen reader
    expect(container.querySelector('[data-parade-caption]')!.textContent).toBe('Which gate gives us more?')
  })

  it('the 3D signs (the cage, the Grumble Gang) carry numbers and faces, no words', () => {
    for (const n of [3, 10, 14]) for (const dots of [true, false]) expect(isWord(cageSignWords(n, dots, false)), `${n} ${dots}`).toBe(false)
    for (const happy of [true, false]) expect(isWord(gangSignWords(happy, false))).toBe(false)
    // grades 2–5 keep theirs
    expect(cageSignWords(14, false, true)).toBe('friends join!')
    expect(gangSignWords(false, true)).toBe('Grumble Gang')
  })
})
