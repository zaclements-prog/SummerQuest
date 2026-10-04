/**
 * LLM integration. Production-shaped, not a stub.
 *
 * Routes via the Vite dev proxy at /api/llm/* → http://localhost:8000/*
 * The proxy injects the Authorization header so the API key never ships in the JS bundle.
 *
 * In production builds (no Vite proxy), set OmlxBackend to call the URL directly with
 * the API key supplied by some other mechanism (Electron main process, etc.).
 */

import type { Problem } from './problem'
import { buildPrompt } from './prompts'

export interface LLMBackend {
  readonly id: string
  isAvailable(): Promise<boolean>
  generateProblems(args: GenerateArgs): Promise<Problem[]>
  generateText(args: TextGenArgs): Promise<string>
}

export interface GenerateArgs {
  /** Identifier for the prompt template (defined in src/lib/prompts/) */
  template: string
  /** Variables to substitute into the template. */
  variables: Record<string, string | number>
  /** How many problems to generate in this batch. */
  count: number
  /** Topic tag — required so generated problems carry it through. */
  topic: string
  /** Optional difficulty level for the prompt to honor. */
  difficulty?: number
  /** Optional override for which model to use. */
  model?: string
}

export interface TextGenArgs {
  systemPrompt?: string
  userPrompt: string
  model?: string
  maxTokens?: number
  temperature?: number
  /** Request JSON output if backend supports it. */
  json?: boolean
}

const BASE = '/api/llm'

let healthCache: { ok: boolean; at: number } | null = null
const HEALTH_TTL_MS = 30_000

async function pingHealth(): Promise<boolean> {
  // Fully-offline single-file build: never reach for a server (writing falls back to its heuristic grader).
  if (import.meta.env.VITE_OFFLINE === 'true') return false
  if (healthCache && Date.now() - healthCache.at < HEALTH_TTL_MS) {
    return healthCache.ok
  }
  try {
    const r = await fetch(`${BASE}/health`, { method: 'GET' })
    const ok = r.ok
    healthCache = { ok, at: Date.now() }
    return ok
  } catch {
    healthCache = { ok: false, at: Date.now() }
    return false
  }
}

/**
 * oMLX backend. Calls the local MLX server's OpenAI-compatible /v1/chat/completions.
 * Used by providers when the user has LLM enabled and the server is reachable.
 */
export class OmlxBackend implements LLMBackend {
  readonly id = 'omlx'
  private model: string

  constructor(model = 'Qwen3.6-35B-A3B-bf16') {
    this.model = model
  }

  setModel(model: string) {
    this.model = model
  }

  async isAvailable(): Promise<boolean> {
    return pingHealth()
  }

  async generateText(args: TextGenArgs): Promise<string> {
    const messages: Array<{ role: string; content: string }> = []
    if (args.systemPrompt) messages.push({ role: 'system', content: args.systemPrompt })
    messages.push({ role: 'user', content: args.userPrompt })

    const body: Record<string, unknown> = {
      model: args.model ?? this.model,
      messages,
      max_tokens: args.maxTokens ?? 800,
      temperature: args.temperature ?? 0.7,
    }
    if (args.json) {
      body.response_format = { type: 'json_object' }
    }

    const r = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      throw new Error(`oMLX ${r.status}: ${text.slice(0, 200)}`)
    }
    const json = (await r.json()) as {
      choices: Array<{ message: { content: string } }>
    }
    return json.choices?.[0]?.message?.content ?? ''
  }

  async generateProblems(args: GenerateArgs): Promise<Problem[]> {
    const built = buildPrompt(args.template, args.variables, args.count)
    const raw = await this.generateText({
      systemPrompt: built.system,
      userPrompt: built.user,
      maxTokens: built.maxTokens ?? 1200,
      temperature: 0.8,
      json: true,
      model: args.model,
    })
    const problems = parseProblemsFromJson(raw, args.topic)
    return problems
  }
}

/**
 * Best-effort JSON extraction from an LLM response.
 * Tries: direct parse → strip code fences → find first {…} block.
 */
function parseProblemsFromJson(raw: string, topic: string): Problem[] {
  const cleaned = stripCodeFences(raw).trim()
  let data: unknown
  try {
    data = JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (!m) return []
    try {
      data = JSON.parse(m[0])
    } catch {
      return []
    }
  }
  const obj = data as { problems?: unknown[] } | unknown[]
  const list = Array.isArray(obj) ? obj : Array.isArray(obj?.problems) ? obj.problems : []
  const out: Problem[] = []
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Record<string, unknown>
    const prompt = String(p.prompt ?? '').trim()
    const answer = p.answer
    const options = Array.isArray(p.options) ? p.options : null
    if (!prompt || answer == null || !options || options.length < 2) continue
    // An answer that isn't one of the buttons (or duplicate buttons) makes the
    // question unanswerable — drop it and let the static provider fill in.
    if (!options.includes(answer as string | number)) continue
    if (new Set(options.map(String)).size !== options.length) continue
    const visualRaw = p.visual as Record<string, unknown> | undefined
    out.push({
      id: `llm-${topic}-${Date.now()}-${i}`,
      prompt,
      options: options as (string | number)[],
      answer: answer as string | number,
      topic,
      visual: visualRaw?.kind ? (visualRaw as Problem['visual']) : undefined,
      hint: typeof p.hint === 'string' ? p.hint : undefined,
      explanation: typeof p.explanation === 'string' ? p.explanation : undefined,
    })
  }
  return out
}

function stripCodeFences(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

/** Stub used when no backend is set or when fallback is needed. */
export const stubBackend: LLMBackend = {
  id: 'stub',
  async isAvailable() {
    return false
  },
  async generateProblems() {
    return []
  },
  async generateText() {
    throw new Error('No LLM backend configured.')
  },
}

let activeBackend: LLMBackend = new OmlxBackend()

export function getBackend(): LLMBackend {
  return activeBackend
}

export function setBackend(backend: LLMBackend) {
  activeBackend = backend
}

export async function isLLMAvailable(): Promise<boolean> {
  return activeBackend.isAvailable()
}

export async function generateProblemBatch(args: GenerateArgs): Promise<Problem[]> {
  try {
    return await activeBackend.generateProblems(args)
  } catch (e) {
    console.warn('[LLM] generation failed:', e)
    return []
  }
}

export async function generateText(args: TextGenArgs): Promise<string | null> {
  try {
    return await activeBackend.generateText(args)
  } catch (e) {
    console.warn('[LLM] generateText failed:', e)
    return null
  }
}
