// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useProgress } from '../../store/progress'
import { createProvider } from '../../lib/providers'

/**
 * The writing pad's feedback card: a grade-5 piece can go back to the pad
 * with its text kept ("Revise"), instead of only "Finish ✓".
 */

vi.mock('../../lib/llm', async (orig) => ({ ...(await orig<object>()), isLLMAvailable: async () => false, generateText: async () => null }))

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

const PIECE =
  'Our town should build a new library instead of a skate park. A library is free for everybody, so kids, parents and grandparents could all use it every day. ' +
  'My little brother learned to read at story time in the old library. A new library could also have quiet study rooms where students finish projects after school.'

const buttons = () => [...container.querySelectorAll('button')]
const button = (re: RegExp) => buttons().find((b) => re.test(b.textContent ?? ''))
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

async function mount(params: Record<string, unknown>, provider = createProvider({ kind: 'g5Writing', mode: 'opinion' })) {
  const { default: WritingPad } = await import('../WritingPad')
  const onComplete = vi.fn()
  act(() => root.render(<WritingPad provider={provider} params={params} onComplete={onComplete} onExit={() => {}} />))
  await flush()
  return onComplete
}

function type(text: string) {
  const area = container.querySelector('textarea')!
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(area, text)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  useProgress.getState().resetPlayer()
  useProgress.getState().setAvatar({ emoji: '🦊', color: '#f97316', name: 'T', grade: 5 })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
})

describe('WritingPad: Revise', () => {
  it('grade 5: Revise goes back to the pad with the text kept; Finish still finishes', async () => {
    const onComplete = await mount({ kind: 'opinion', questionCount: 1, minWords: 80 })
    type(PIECE)
    await act(async () => button(/Submit/)!.click())
    await flush()
    expect(button(/Finish/)).toBeTruthy()
    expect(button(/Revise/)).toBeTruthy()

    await act(async () => button(/Revise/)!.click())
    expect(container.querySelector('textarea')!.value).toBe(PIECE)
    expect(button(/Submit/)).toBeTruthy() // (the card fades out on its own)

    type(PIECE + ' A skate park only helps the kids who skate, but a library helps the whole town learn something new.')
    await act(async () => button(/Submit/)!.click())
    await flush()
    await act(async () => button(/Finish/)!.click())
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('grades 2–4 keep the single Finish button', async () => {
    await mount({ kind: 'sentence', questionCount: 1, minWords: 6 }, createProvider({ kind: 'writingPrompt', writingKind: 'sentence', source: 'static' }))
    type('The big dog ran fast to the park.')
    await act(async () => button(/Submit/)!.click())
    await flush()
    expect(button(/Finish/)).toBeTruthy()
    expect(button(/Revise/)).toBeFalsy()
  })
})
