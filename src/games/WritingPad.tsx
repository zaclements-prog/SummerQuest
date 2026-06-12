import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem } from '../lib/problem'
import { generateText, isLLMAvailable } from '../lib/llm'
import { buildWritingEvalPrompt } from '../lib/prompts'
import { useProgress } from '../store/progress'
import { useSettings } from '../store/settings'
import { sfx } from '../lib/sound'

interface Feedback {
  score: number
  stars: number
  celebrations: string[]
  improvements: string[]
  summary: string
}

export default function WritingPad({ provider, params, onComplete }: GameProps) {
  const kind = (params?.kind as 'sentence' | 'paragraph' | 'story') ?? 'sentence'
  const questionCount = (params?.questionCount as number) ?? 1
  const minWords =
    (params?.minWords as number) ??
    (kind === 'sentence' ? 3 : kind === 'paragraph' ? 12 : 25)

  const player = useProgress((s) => s.player)
  const llmEnabled = useSettings((s) => s.llmEnabled)
  const [idx, setIdx] = useState(0)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null)
  const [totalStars, setTotalStars] = useState<number[]>([])

  useEffect(() => {
    isLLMAvailable().then(setLlmAvailable)
  }, [])

  useEffect(() => {
    let cancel = false
    nextProblem(provider).then((p) => {
      if (!cancel) {
        setProblem(p)
        setText('')
        setFeedback(null)
      }
    })
    return () => {
      cancel = true
    }
  }, [idx, provider])

  const wordCount = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text],
  )
  const canSubmit = wordCount >= Math.max(1, Math.floor(minWords * 0.6)) && !submitting

  async function submit() {
    if (!problem || !canSubmit) return
    setSubmitting(true)
    sfx.click()

    const useAI = llmEnabled && llmAvailable !== false

    let fb: Feedback
    if (useAI) {
      const built = buildWritingEvalPrompt({
        promptText: problem.prompt,
        kidResponse: text,
        kind,
        playerName: player?.name,
      })
      const raw = await generateText({
        systemPrompt: built.system,
        userPrompt: built.user,
        maxTokens: built.maxTokens,
        temperature: 0.5,
        json: true,
      })
      fb = parseFeedback(raw, wordCount, minWords) ?? heuristicFeedback(wordCount, minWords)
    } else {
      fb = heuristicFeedback(wordCount, minWords)
    }

    if (fb.stars >= 2) sfx.victory()
    else if (fb.stars >= 1) sfx.correct()
    else sfx.defeat()

    setFeedback(fb)
    setSubmitting(false)
  }

  function nextOrFinish() {
    if (!feedback) return
    const stars = [...totalStars, feedback.stars]
    if (idx + 1 >= questionCount) {
      const avgStars = Math.round(
        stars.reduce((a, b) => a + b, 0) / stars.length,
      )
      const correct = stars.filter((s) => s > 0).length
      onComplete({
        stars: avgStars,
        score: stars.reduce((a, b) => a + b, 0) * 10,
        correct,
        total: questionCount,
      })
    } else {
      setTotalStars(stars)
      setIdx((i) => i + 1)
    }
  }

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center text-white kid-text text-2xl">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center p-4 text-white overflow-y-auto">
      <div className="kid-text text-lg mb-2 text-white/80">
        Prompt {idx + 1} of {questionCount}
      </div>

      <div className="bg-white text-ocean-900 rounded-3xl p-5 max-w-2xl mb-3 shadow-lg">
        <div className="kid-text text-sm uppercase tracking-wide text-gray-500 mb-2">
          ✍️ Writing prompt
        </div>
        <p className="text-lg leading-relaxed">{problem.prompt}</p>
      </div>

      {!feedback && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Write your ${kind} here…`}
            className="w-full max-w-2xl bg-white text-ocean-900 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-quest-400 resize-none kid-text text-lg"
            rows={kind === 'sentence' ? 3 : kind === 'paragraph' ? 6 : 10}
            disabled={submitting}
          />
          <div className="flex items-center gap-3 mt-3 kid-text">
            <span className="text-sm">
              {wordCount} word{wordCount === 1 ? '' : 's'}
              {wordCount < minWords && (
                <span className="opacity-70"> (aim for ~{minWords})</span>
              )}
            </span>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="btn-quest bg-correct-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: '#16a34a' }}
            >
              {submitting ? 'Reading…' : 'Submit ✨'}
            </button>
          </div>
          {!llmEnabled && (
            <p className="mt-3 text-sm text-white/70 kid-text max-w-md text-center">
              AI feedback is off in settings — you'll still get a score, but for richer feedback turn it on in the Parent dashboard.
            </p>
          )}
          {llmAvailable === false && llmEnabled && (
            <p className="mt-3 text-sm text-white/70 kid-text max-w-md text-center">
              AI server isn't responding. Your work will get a basic score.
            </p>
          )}
        </>
      )}

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white text-ocean-900 rounded-3xl p-6 max-w-2xl w-full mt-3 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="text-5xl">
                {feedback.stars >= 3 ? '🏆' : feedback.stars >= 2 ? '🎉' : feedback.stars >= 1 ? '💪' : '📝'}
              </div>
              <div className="flex-1">
                <div className="flex gap-1 text-3xl">
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ opacity: feedback.stars > i ? 1 : 0.25 }}>
                      ⭐
                    </span>
                  ))}
                </div>
                <div className="kid-text text-sm text-gray-500">Score: {feedback.score}/100</div>
              </div>
            </div>

            <p className="kid-text text-lg mb-3">{feedback.summary}</p>

            {feedback.celebrations.length > 0 && (
              <div className="bg-correct-50 border-l-4 border-correct-500 p-3 rounded-r-2xl mb-2">
                <div className="kid-text text-correct-600 text-sm mb-1">✨ You nailed</div>
                <ul className="list-disc list-inside text-sm">
                  {feedback.celebrations.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improvements.length > 0 && (
              <div className="bg-quest-50 border-l-4 border-quest-500 p-3 rounded-r-2xl mb-3">
                <div className="kid-text text-quest-700 text-sm mb-1">💡 Try next time</div>
                <ul className="list-disc list-inside text-sm">
                  {feedback.improvements.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={nextOrFinish}
              className="btn-quest bg-ocean-500 text-white w-full"
              style={{ borderColor: '#1d4ed8' }}
            >
              {idx + 1 >= questionCount ? 'Finish ✓' : 'Next prompt →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function parseFeedback(raw: string | null, wordCount: number, minWords: number): Feedback | null {
  if (!raw) return null
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      data = JSON.parse(m[0])
    } catch {
      return null
    }
  }
  const score = clamp(Number(data.score ?? 0), 0, 100)
  let stars = clamp(Number(data.stars ?? 0), 0, 3)
  if (wordCount < minWords * 0.4) stars = Math.min(stars, 1)
  return {
    score,
    stars,
    celebrations: arr(data.celebrations).slice(0, 3),
    improvements: arr(data.improvements).slice(0, 2),
    summary: String(data.summary ?? 'Nice work!').slice(0, 400),
  }
}

function heuristicFeedback(wordCount: number, minWords: number): Feedback {
  const ratio = Math.min(1.5, wordCount / minWords)
  const score = Math.round(35 + Math.min(60, ratio * 50))
  const stars = score >= 80 ? 2 : score >= 60 ? 1 : 0
  return {
    score,
    stars,
    celebrations: wordCount >= minWords ? ['You wrote enough words!'] : [],
    improvements: wordCount < minWords ? [`Try to write at least ${minWords} words.`] : [],
    summary: stars > 0 ? 'Good effort! Keep practicing.' : 'Try writing a little more next time.',
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function arr(x: unknown): string[] {
  if (!Array.isArray(x)) return []
  return x.filter((v) => typeof v === 'string') as string[]
}
