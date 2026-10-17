import type { ReactElement } from 'react'

/** What every lesson scene receives each frame. */
export interface SceneProps {
  /** Seconds since the step's narration started (keeps counting after it ends). */
  t: number
  /** Narration length in seconds (best known). */
  dur: number
  /** Seconds at which `phrase` (case-insensitive, `nth` occurrence) is spoken. */
  cue: (phrase: string, nth?: number) => number
  /** prefers-reduced-motion: render the finished state, skip loops. */
  reduced: boolean
}

/** A lesson step's motion graphic: a pure render of the 960×540 stage at time t. */
export type Scene = (p: SceneProps) => ReactElement
