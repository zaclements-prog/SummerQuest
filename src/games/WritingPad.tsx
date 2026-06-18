import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem } from '../lib/problem'
import { generateText, isLLMAvailable } from '../lib/llm'
import { buildWritingEvalPrompt } from '../lib/prompts'
import { useProgress } from '../store/progress'
import { useSettings } from '../store/settings'
import { sfx } from '../lib/sound'
import { Card, Button, ProgressBar, Pill, StarRating, Loading } from '../components/ui'
import { useEntrance } from '../lib/motion'

interface Feedback {
  score: number
  stars: number
  celebrations: string[]
  improvements: string[]
  summary: string
}

export default function WritingPad({ provider, params, onComplete, meta }: GameProps) {
  const kind = (params?.kind as 'sentence' | 'paragraph' | 'story') ?? 'sentence'
  const questionCount = (params?.questionCount as number) ?? 1
  const minWords =
    (params?.minWords as number) ??
    (kind === 'sentence' ? 3 : kind === 'paragraph' ? 12 : 25)

  const player = useProgress((s) => s.player)
  const recordAttempt = useProgress((s) => s.recordAttempt)
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
    if (meta) recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: 'write-craft', skillLabel: 'writing', correct: feedback.stars > 0 })
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
      <div className="flex-1 flex items-center justify-center p-6">
        <Loading label="Loading your prompt…" />
      </div>
    )
  }

  return (
    <WritingPadView
      problem={problem}
      idx={idx}
      questionCount={questionCount}
      kind={kind}
      minWords={minWords}
      wordCount={wordCount}
      text={text}
      setText={setText}
      submit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      feedback={feedback}
      nextOrFinish={nextOrFinish}
      llmEnabled={llmEnabled}
      llmAvailable={llmAvailable}
    />
  )
}

// ── Presentational layer ──────────────────────────────────────────────────────
// All game logic lives in the parent; this component only renders props and
// forwards the existing callbacks. Built on the shared design system.

interface WritingPadViewProps {
  problem: Problem
  idx: number
  questionCount: number
  kind: 'sentence' | 'paragraph' | 'story'
  minWords: number
  wordCount: number
  text: string
  setText: (v: string) => void
  submit: () => void
  canSubmit: boolean
  submitting: boolean
  feedback: Feedback | null
  nextOrFinish: () => void
  llmEnabled: boolean
  llmAvailable: boolean | null
}

const KIND_LABEL: Record<WritingPadViewProps['kind'], string> = {
  sentence: 'Sentence',
  paragraph: 'Paragraph',
  story: 'Story',
}

function WritingPadView({
  problem,
  idx,
  questionCount,
  kind,
  minWords,
  wordCount,
  text,
  setText,
  submit,
  canSubmit,
  submitting,
  feedback,
  nextOrFinish,
  llmEnabled,
  llmAvailable,
}: WritingPadViewProps) {
  const reduced = useReducedMotion()
  const { container, item } = useEntrance()
  const rows = kind === 'sentence' ? 3 : kind === 'paragraph' ? 6 : 10
  const enoughWords = wordCount >= minWords

  return (
    <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto">
      {/* Progress */}
      <div className="w-full max-w-2xl mb-3">
        <div className="kid-text text-sm text-sky text-center mb-1">
          Prompt {idx + 1} of {questionCount}
        </div>
        <ProgressBar value={idx + 1} max={questionCount} tone="quest" />
      </div>

      <motion.div
        key={problem.id}
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-2xl flex flex-col items-center gap-3"
      >
        {/* Prompt surface — bright paper, dark ink, high contrast */}
        <motion.div variants={item} className="w-full">
          <Card tone="quest" accent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Pill tone="quest" icon="✍️">
                {KIND_LABEL[kind]} prompt
              </Pill>
            </div>
            <p className="kid-text text-ink-900 text-xl md:text-2xl leading-snug">
              {problem.prompt}
            </p>
          </Card>
        </motion.div>

        {!feedback && (
          <>
            {/* Writing surface */}
            <motion.div variants={item} className="w-full">
              <Card className="p-4">
                <label htmlFor="writing-input" className="sr-only">
                  Write your {kind} here
                </label>
                <textarea
                  id="writing-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Write your ${kind} here…`}
                  className={[
                    'w-full bg-paper text-ink-900 rounded-2xl p-4 resize-none',
                    'kid-text text-lg leading-relaxed',
                    'border-2 border-ocean-300',
                    'outline-none focus:border-ocean-500 focus:ring-4 focus:ring-ocean-400/40',
                    'placeholder:text-ink-700/40',
                    'disabled:opacity-60',
                  ].join(' ')}
                  rows={rows}
                  disabled={submitting}
                />
                <div className="flex items-center justify-between gap-3 mt-3">
                  <Pill tone={enoughWords ? 'correct' : 'ink'} icon={enoughWords ? '✓' : '✎'}>
                    {wordCount} word{wordCount === 1 ? '' : 's'}
                    {!enoughWords && ` · aim for ~${minWords}`}
                  </Pill>
                  <Button
                    variant="success"
                    onClick={submit}
                    disabled={!canSubmit}
                  >
                    {submitting ? 'Reading…' : 'Submit ✨'}
                  </Button>
                </div>
              </Card>
            </motion.div>

            {!llmEnabled && (
              <motion.p
                variants={item}
                className="text-sm text-sky kid-text max-w-md text-center"
              >
                AI feedback is off in settings — you'll still get a score, but for richer feedback turn it on in the Parent dashboard.
              </motion.p>
            )}
            {llmAvailable === false && llmEnabled && (
              <motion.p
                variants={item}
                className="text-sm text-sky kid-text max-w-md text-center"
              >
                AI server isn't responding. Your work will get a basic score.
              </motion.p>
            )}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-2xl mt-3"
          >
            <Card
              tone={feedback.stars >= 2 ? 'correct' : feedback.stars >= 1 ? 'quest' : 'ocean'}
              accent
              className="p-6"
            >
              {/* Score header */}
              <div className="flex items-center gap-4 mb-3">
                <div className="text-5xl" aria-hidden="true">
                  {feedback.stars >= 3 ? '🏆' : feedback.stars >= 2 ? '🎉' : feedback.stars >= 1 ? '💪' : '📝'}
                </div>
                <div className="flex-1">
                  <StarRating earned={feedback.stars} total={3} size="lg" />
                  <div className="kid-text text-sm text-ink-700 mt-0.5">
                    Score: {feedback.score}/100
                  </div>
                </div>
              </div>

              <p className="kid-text text-lg text-ink-900 mb-3 leading-snug">
                {feedback.summary}
              </p>

              {feedback.celebrations.length > 0 && (
                <div className="bg-correct-600/10 border-l-4 border-correct-600 p-3 rounded-r-2xl mb-2">
                  <div className="kid-text text-correct-700 text-sm mb-1">
                    <span aria-hidden="true">✨</span> You nailed
                  </div>
                  <ul className="list-disc list-inside text-sm text-ink-900 space-y-0.5">
                    {feedback.celebrations.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.improvements.length > 0 && (
                <div className="bg-quest-400/20 border-l-4 border-quest-500 p-3 rounded-r-2xl mb-3">
                  <div className="kid-text text-quest-700 text-sm mb-1">
                    <span aria-hidden="true">💡</span> Try next time
                  </div>
                  <ul className="list-disc list-inside text-sm text-ink-900 space-y-0.5">
                    {feedback.improvements.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                variant="primary"
                onClick={nextOrFinish}
                className="w-full"
              >
                {idx + 1 >= questionCount ? 'Finish ✓' : 'Next prompt →'}
              </Button>
            </Card>
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
