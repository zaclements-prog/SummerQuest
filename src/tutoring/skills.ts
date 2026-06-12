import type { Problem } from '../lib/problem'

export interface SkillMeta {
  label: string
  zoneId: string
  lessonId: string
  practiceStageId: string
}

/** Canonical skill registry. id → where to learn + practice it.
 *  zoneId and practiceStageId are VERIFIED against src/curriculum/*.ts — do not change them. */
export const SKILLS: Record<string, SkillMeta> = {
  // multiplication-mesa
  'mult-f2_5':  { label: '2–5× facts',  zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  'mult-f6_9':  { label: '6–9× facts',  zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  'mult-f10_12':{ label: '10–12× facts',zoneId: 'multiplication-mesa', lessonId: 'multiplication', practiceStageId: 'mult-practice' },
  // division-dunes
  'div-basic':  { label: 'basic division facts', zoneId: 'division-dunes', lessonId: 'division', practiceStageId: 'div-practice' },
  'div-larger': { label: 'larger division facts', zoneId: 'division-dunes', lessonId: 'division', practiceStageId: 'div-practice' },
  // fraction-falls
  'frac-equiv':        { label: 'equivalent fractions',   zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-practice' },
  'frac-cmp-likeden':  { label: 'comparing (same bottom)',zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-practice' },
  'frac-cmp-unlikeden':{ label: 'comparing (different bottoms)', zoneId: 'fraction-falls', lessonId: 'fractions', practiceStageId: 'frac-practice' },
  // place-value-plateau
  'pv-identify': { label: 'place value of a digit', zoneId: 'place-value-plateau', lessonId: 'placeValue', practiceStageId: 'pv-practice' },
  'pv-round':    { label: 'rounding numbers',       zoneId: 'place-value-plateau', lessonId: 'placeValue', practiceStageId: 'pv-practice' },
  // measurement-marsh
  'meas-area':      { label: 'area', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-perimeter': { label: 'perimeter', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-time':      { label: 'telling time', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  'meas-money':     { label: 'money', zoneId: 'measurement-marsh', lessonId: 'measurement', practiceStageId: 'meas-practice' },
  // geometry-grove (practice-kind stage is geo-angles)
  'geo-shapes': { label: 'shapes & angles', zoneId: 'geometry-grove', lessonId: 'geometry', practiceStageId: 'geo-angles' },
  // data-delta (practice-kind stage is data-compare)
  'data-graphs': { label: 'reading graphs', zoneId: 'data-delta', lessonId: 'dataGraph', practiceStageId: 'data-compare' },
  // word-problem-woods
  'wp-solve': { label: 'word problems', zoneId: 'word-problem-woods', lessonId: 'wordProblem', practiceStageId: 'wp-practice' },
  // reading-reef (practice-kind stage is read-4th)
  'read-comprehend': { label: 'reading comprehension', zoneId: 'reading-reef', lessonId: 'reading', practiceStageId: 'read-4th' },
  // writing-workshop (practice-kind stage is write-paragraph)
  'write-craft': { label: 'writing', zoneId: 'writing-workshop', lessonId: 'writing', practiceStageId: 'write-paragraph' },
  // science-summit (practice-kind stage is science-4th)
  'sci-explore': { label: 'science', zoneId: 'science-summit', lessonId: 'science', practiceStageId: 'science-4th' },
}

export interface Skill { id: string; label: string }

/** Resolve a problem to its coarse skill bucket. */
export function skillOf(problem: Problem): Skill {
  if (problem.skill?.id) return problem.skill
  const id = deriveSkillId(problem)
  return { id, label: SKILLS[id]?.label ?? topicLabel(problem.topic) }
}

/** Maps a provider `topic` string → a representative registered skill id, so an
 *  untagged problem (e.g. LLM-generated) still routes to the right zone/lesson. */
const TOPIC_DEFAULT_SKILL: Record<string, string> = {
  multiplication: 'mult-f2_5',
  division: 'div-basic',
  'fraction-equivalence': 'frac-equiv',
  'fraction-compare': 'frac-cmp-unlikeden',
  'place-value-identify': 'pv-identify',
  'place-value-rounding': 'pv-round',
  measurement: 'meas-area',
  'measurement-area': 'meas-area',
  'measurement-perimeter': 'meas-perimeter',
  'measurement-time': 'meas-time',
  'measurement-money': 'meas-money',
  geometry: 'geo-shapes',
  data: 'data-graphs',
  'word-problem': 'wp-solve',
  'reading-comprehension': 'read-comprehend',
  writing: 'write-craft',
  science: 'sci-explore',
}

function deriveSkillId(problem: Problem): string {
  if (problem.topic === 'multiplication') return multBucket(problem.subtopic)
  if (problem.topic === 'division') return divBucket(problem.subtopic)
  const mapped = TOPIC_DEFAULT_SKILL[problem.topic]
  if (mapped) return mapped
  // prefix match catches variants like 'measurement-mixed' → 'measurement'
  for (const key of Object.keys(TOPIC_DEFAULT_SKILL)) {
    if (problem.topic.startsWith(key)) return TOPIC_DEFAULT_SKILL[key]
  }
  return `topic-${problem.topic}`
}

function divBucket(subtopic?: string): string {
  const nums = (subtopic ?? '').split(/[÷/x×]/).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
  // For "a ÷ b" the divisor is the second number; fall back to the largest seen.
  const divisor = nums.length >= 2 ? nums[1] : nums.length ? Math.max(...nums) : 0
  return divisor >= 6 ? 'div-larger' : 'div-basic'
}

function multBucket(subtopic?: string): string {
  if (!subtopic) return 'mult-f2_5'
  const nums = subtopic.split(/[×x*]/).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
  const hi = nums.length ? Math.max(...nums) : 0
  if (hi >= 10) return 'mult-f10_12'
  if (hi >= 6) return 'mult-f6_9'
  return 'mult-f2_5'
}

function topicLabel(topic: string): string {
  return topic.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

/** Metadata for a skill id, with a safe fallback for unknown ids. */
export function skillMeta(id: string): SkillMeta {
  if (SKILLS[id]) return SKILLS[id]
  // A `topic-<x>` id (unregistered topic) still routes to the right zone when the
  // topic is known, instead of always falling back to multiplication.
  if (id.startsWith('topic-')) {
    const mapped = TOPIC_DEFAULT_SKILL[id.slice('topic-'.length)]
    if (mapped && SKILLS[mapped]) return SKILLS[mapped]
  }
  return {
    label: id.replace(/^topic-/, ''),
    zoneId: 'multiplication-mesa',
    lessonId: 'multiplication',
    practiceStageId: 'mult-practice',
  }
}
