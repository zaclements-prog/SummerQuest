/**
 * Wraps a static problem provider with an LLM-backed cache layer.
 *
 * Behavior:
 *   - On construction, queues an async batch generation.
 *   - next() serves from the cache. If cache is empty, falls back to the static provider.
 *   - When cache drops below refillThreshold, kicks off another batch (non-blocking).
 *   - If LLM is disabled or fails, just uses static provider — never blocks.
 */

import type { Problem, ProblemProvider } from './problem'
import { generateProblemBatch, isLLMAvailable } from './llm'
import { useSettings } from '../store/settings'

interface LlmCachedProviderOpts {
  /** Underlying static provider used for cache misses and as fallback. */
  staticProvider: ProblemProvider
  /** Topic tag for the LLM. */
  topic: string
  /** Prompt template name registered in src/lib/prompts/. */
  template: string
  /** Variables passed to the prompt. */
  variables: Record<string, string | number>
  /** Initial batch size to generate on construction. */
  initialBatch?: number
  /** Refill threshold — when cache drops below this, kick off a new batch. */
  refillThreshold?: number
  /** Refill batch size. */
  refillBatch?: number
}

export function makeLlmCachedProvider(opts: LlmCachedProviderOpts): ProblemProvider {
  const initialBatch = opts.initialBatch ?? 6
  const refillThreshold = opts.refillThreshold ?? 3
  const refillBatch = opts.refillBatch ?? 6
  const cache: Problem[] = []
  let refilling = false
  let initialPromise: Promise<void> | null = null

  function llmEnabledForUser(): boolean {
    try {
      return useSettings.getState().llmEnabled
    } catch {
      return false
    }
  }

  async function fetchBatch(count: number) {
    if (refilling) return
    if (!llmEnabledForUser()) return
    if (!(await isLLMAvailable())) return
    refilling = true
    try {
      const problems = await generateProblemBatch({
        template: opts.template,
        variables: opts.variables,
        count,
        topic: opts.topic,
      })
      for (const p of problems) cache.push(p)
    } finally {
      refilling = false
    }
  }

  // kick off initial generation (don't block)
  initialPromise = fetchBatch(initialBatch)

  return {
    topic: opts.topic,
    async next(): Promise<Problem> {
      // first call: wait for initial generation (with a timeout fallback)
      if (initialPromise) {
        const p = initialPromise
        initialPromise = null
        await Promise.race([p, new Promise((r) => setTimeout(r, 20_000))])
      }
      // serve from cache if available
      if (cache.length > 0) {
        const problem = cache.shift()!
        if (cache.length < refillThreshold) {
          // fire-and-forget refill
          void fetchBatch(refillBatch)
        }
        return problem
      }
      // fallback to static — also kick a background refill
      void fetchBatch(refillBatch)
      return Promise.resolve(opts.staticProvider.next())
    },
  }
}
