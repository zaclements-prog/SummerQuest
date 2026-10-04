/**
 * Offline writing feedback — used whenever the local AI grader isn't available
 * (offline build, AI turned off, or no oMLX server). It looks at more than length,
 * so a careful sentence can earn all 3 stars and keyboard-mashing can't.
 */

export interface WritingFeedback {
  score: number // 0–100
  stars: number // 0–3
  celebrations: string[]
  improvements: string[]
  summary: string
}

export function starsForScore(score: number): number {
  return score >= 85 ? 3 : score >= 65 ? 2 : score >= 40 ? 1 : 0
}

export function heuristicFeedback(text: string, minWords: number): WritingFeedback {
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const bare = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean)

  const lengthRatio = Math.min(1, wordCount / Math.max(1, minWords))
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
  const startsWithCapital = /^[A-Z]/.test(trimmed)
  const endsWithPunctuation = /[.!?]["')\]]*$/.test(trimmed)
  const allSentencesCapitalized = sentences.length > 0 && sentences.every((s) => /^["'(]*[A-Z0-9]/.test(s.trim()))
  const uniqueRatio = bare.length ? new Set(bare).size / bare.length : 0
  const realWordRatio = bare.length ? bare.filter((w) => /[aeiouy]/.test(w)).length / bare.length : 0

  // 0–1: how much this looks like real, varied writing (not "asdf asdf" or "qwrt zxcv").
  const quality = Math.min(1, realWordRatio / 0.85) * Math.min(1, uniqueRatio / 0.5)

  const score = Math.round(
    60 * lengthRatio * quality +
      (startsWithCapital ? 10 : 0) +
      (endsWithPunctuation ? 10 : 0) +
      (allSentencesCapitalized ? 5 : 0) +
      15 * quality,
  )
  const stars = starsForScore(score)

  const celebrations: string[] = []
  const improvements: string[] = []
  if (wordCount >= minWords) celebrations.push('You wrote plenty of words!')
  else improvements.push(`Try to write at least ${minWords} words.`)
  if (startsWithCapital && endsWithPunctuation) celebrations.push('Nice capital letter and ending punctuation!')
  else if (!startsWithCapital) improvements.push('Start with a capital letter.')
  else improvements.push('End your sentence with a period, question mark, or exclamation point.')
  if (uniqueRatio >= 0.6 && wordCount >= 4) celebrations.push('You used lots of different words.')
  else if (wordCount >= 4) improvements.push('Try using more different words instead of repeating the same ones.')

  return {
    score,
    stars,
    celebrations: celebrations.slice(0, 3),
    improvements: improvements.slice(0, 2),
    summary:
      stars >= 3
        ? 'Fantastic writing! Clear, careful, and complete.'
        : stars >= 1
          ? 'Good effort! Fix the tip below to earn more stars.'
          : 'Try writing a little more next time.',
  }
}
