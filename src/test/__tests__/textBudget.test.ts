import { describe, expect, it } from 'vitest'
import { expectTextBudget, visibleWords } from '../textBudget'

function dom(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('text budget', () => {
  it('counts printed words, not numerals, emoji or symbols', () => {
    const root = dom('<p>Tap the 7!</p><span>🍎 🍎</span><b>+12</b><i>×</i><svg><text>10</text><text>cat</text></svg>')
    expect(visibleWords(root)).toEqual(['Tap', 'the', 'cat'])
  })

  it('ignores what nobody sees: sr-only, hidden, display none, svg titles, labels', () => {
    const root = dom(
      '<span class="sr-only">How many apples?</span><span hidden>secret</span><span style="display:none">gone</span>' +
        '<svg><title>a tooltip</title></svg><button aria-label="Say it again">🔊</button><span>Go</span>',
    )
    expect(visibleWords(root)).toEqual(['Go'])
  })

  it('passes and fails against a budget', () => {
    expectTextBudget(dom('<p>One word</p>'), 2)
    expect(() => expectTextBudget(dom('<p>far too many words here</p>'), 2)).toThrow(/5 visible words \(budget 2\): far too many words here/)
  })
})
