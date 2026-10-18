import { describe, it, expect, afterEach, vi } from 'vitest'
import { generateProblemBatch, generateText, isLLMAvailable } from '../llm'
import { makeLlmCachedProvider } from '../llm-cache'
import { useSettings } from '../../store/settings'

// The app-store build (VITE_STORE=true) has no AI: nothing may reach for the
// local server, whatever the parent setting says. (The bundle itself is
// checked by scripts/check-store-bundle.mjs after `npm run build:store`.)
describe('store build: no local AI', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reports AI unavailable and generates nothing, without a single request', async () => {
    vi.stubEnv('VITE_STORE', 'true')
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetch)
    useSettings.setState({ llmEnabled: true })

    expect(await isLLMAvailable(true)).toBe(false)
    expect(await generateText({ userPrompt: 'hi' })).toBeNull()
    expect(await generateProblemBatch({ template: 'x', variables: {}, count: 3, topic: 't' })).toEqual([])

    // providers wrapped in the LLM cache serve the static problems straight away
    const staticProblem = { id: 's1', prompt: '2 + 2', options: [3, 4], answer: 4, topic: 't' }
    const provider = makeLlmCachedProvider({
      staticProvider: { topic: 't', next: () => staticProblem },
      topic: 't',
      template: 'x',
      variables: {},
    })
    expect(await provider.next()).toBe(staticProblem)
    expect(fetch).not.toHaveBeenCalled()
  })
})
