import type { ProblemAnswer, ProblemVisual } from '../lib/problem'

export interface LessonStep {
  id: string
  narration: string                 // spoken aloud + shown
  body?: string                     // extra on-screen teaching text
  visual?: ProblemVisual            // rendered by VisualRenderer
  check?: { question: string; options: ProblemAnswer[]; answer: ProblemAnswer; explain: string }
}

export interface Lesson {
  id: string
  zoneId: string
  skillIds: string[]
  title: string
  emoji: string
  intro: string
  steps: LessonStep[]
  practiceStageId: string
}
