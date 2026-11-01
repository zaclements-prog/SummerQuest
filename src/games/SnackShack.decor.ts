/** The Snack Shack's decorations (drawn in SnackShack.stand.tsx): what the tip stars buy during a shift. */

export type DecorId = 'umbrella' | 'palms' | 'lights' | 'flags' | 'sign' | 'surfboard' | 'parrot' | 'radio'

/** The pair offered at each upgrade, in order. */
export const DECOR_CHOICES: readonly (readonly [DecorId, DecorId])[] = [
  ['umbrella', 'palms'],
  ['lights', 'flags'],
  ['sign', 'surfboard'],
  ['parrot', 'radio'],
]

export const DECOR_NAMES: Record<DecorId, string> = {
  umbrella: 'Beach umbrella',
  palms: 'Palm roof',
  lights: 'Twinkle lights',
  flags: 'Party flags',
  sign: 'Big shiny sign',
  surfboard: 'Surfboard',
  parrot: 'Parrot friend',
  radio: 'Beach radio',
}
