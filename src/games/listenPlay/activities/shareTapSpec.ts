import type { VoiceRef } from '../../../voice/types'
import type { ShareThing } from '../shareGeometry'
import { mixRole } from '../shareGeometry'
import type { ListenActivitySpec } from '../types'

/**
 * "Tap the half of the pizza." (Fair Share Falls, 1.G.3): one big thing cut
 * into a half and two fourths (one half cut in two again, `mix`); the child
 * taps a share. The answer is the kind of share asked for ('half' or
 * 'fourth': either fourth is right). Plain data for the provider and tests.
 */
export interface ShareTapSpec extends ListenActivitySpec {
  kind: 'shareTap'
  thing: ShareThing
  /** The cut turned (0, 90, 180, 270): where the half sits. */
  turn: number
  ask: 'half' | 'fourth'
}

export const isShareTapSpec = (s: ListenActivitySpec | undefined): s is ShareTapSpec => s?.kind === 'shareTap'

/** A share's name as it is tapped: "A half!" / "A fourth!" */
export const sayShare = (i: number): VoiceRef => ({ line: mixRole(i) === 'half' ? 'g1-shares/nameHalf' : 'g1-shares/nameFourth' })

/** The help after a miss, in order: what lights up and what is said. */
export function shareTapHelp(s: Pick<ShareTapSpec, 'ask'>): { light: 'fourths' | 'half'; voice: VoiceRef }[] {
  return s.ask === 'half'
    ? [
        { light: 'fourths', voice: { line: 'g1-shares/twoFourths' } },
        { light: 'half', voice: { line: 'g1-shares/thisHalf' } },
      ]
    : [
        { light: 'half', voice: { line: 'g1-shares/thatHalf' } },
        { light: 'fourths', voice: { line: 'g1-shares/theseFourths' } },
      ]
}

/** Every line a share-tap question can say. */
export function shareTapLines(speech: VoiceRef | undefined, s: ShareTapSpec): VoiceRef[] {
  return [...(speech ? [speech] : []), sayShare(0), sayShare(1), ...shareTapHelp(s).map((h) => h.voice)]
}
