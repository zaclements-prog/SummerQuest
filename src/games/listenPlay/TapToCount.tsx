import { useState } from 'react'
import { sfx } from '../../lib/sound'
import { guide } from '../../guide/store'
import { COUNT_MAX } from '../../voice/packs/listen'
import { PictureArt } from './PictureCard'
import './listenPlay.css'

/**
 * Tap-to-count (one-to-one counting, K.CC.4): tap each object and the voice
 * says the running count ("one!", "two!"…); each tapped object keeps its
 * number. Tapping a counted one again just gives a soft tick (it was already
 * counted). `onDone(count)` once the last one has been counted and said.
 *
 *   <TapToCount count={6} emoji="🐞" onDone={…} />
 *
 * Listen & Play uses the same drawing for its "How many?" pictures, so a child
 * can count the apples before choosing a number.
 */
export function TapToCount({
  count,
  emoji = '🍎',
  onDone,
  guideId = 'lp-count',
  disabled = false,
  className = '',
}: {
  count: number
  emoji?: string
  onDone?: (count: number) => void
  guideId?: string
  disabled?: boolean
  className?: string
}) {
  const [marks, setMarks] = useState<Record<number, number>>({})
  const counted = Object.keys(marks).length

  function tap(i: number) {
    if (disabled) return
    if (marks[i] !== undefined) {
      sfx.tick()
      return
    }
    const n = counted + 1
    setMarks((m) => ({ ...m, [i]: n }))
    sfx.pop()
    const said = n <= COUNT_MAX ? guide.say({ template: 'listen/number', slots: { n } }) : Promise.resolve(true)
    if (n === count) void said.then(() => onDone?.(count))
  }

  return (
    <div data-guide={guideId} className={`relative w-full h-full min-h-40 ${className}`}>
      {/* (placed absolutely: the picture fits whatever box it's given, never stretches it) */}
      <div className="absolute inset-0 grid place-items-center">
        <PictureArt picture={{ kind: 'group', count, emoji }} marks={marks} onObjectTap={disabled ? undefined : tap} />
      </div>
    </div>
  )
}
