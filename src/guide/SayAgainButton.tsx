import { sfx } from '../lib/sound'
import { guide, useGuideSpeaking } from './store'
import './guide.css'

/**
 * 🔊 Say it again: the big speaker every K–1 screen keeps top-left. Replays
 * the screen's guided line (spotlight and all) from the top; the sound waves
 * move while the narrator talks. 72 px (64 on a short landscape screen, 80 on
 * a tablet with room). Marked `data-guide="say-again"`, so a tour can point at it.
 */
export function SayAgainButton({
  onPress,
  disabled = false,
  className = '',
  label = 'Say it again',
  speaking: speakingProp,
}: {
  /** Instead of replaying the guide's last line. */
  onPress?: () => void
  disabled?: boolean
  className?: string
  label?: string
  /** The waves move while this is true (default: while the guide talks); e.g. a lesson's narration. */
  speaking?: boolean
}) {
  const guideSpeaking = useGuideSpeaking()
  const speaking = speakingProp ?? guideSpeaking
  return (
    <button
      type="button"
      data-guide="say-again"
      aria-label={label}
      title={label}
      disabled={disabled}
      data-speaking={speaking ? '' : undefined}
      onClick={() => {
        sfx.click()
        if (onPress) onPress()
        else void guide.replay()
      }}
      className={[
        'sq-say-again grid place-items-center shrink-0 rounded-full',
        'w-[72px] h-[72px] short:w-16 short:h-16 roomy:w-20 roomy:h-20',
        'bg-quest-300 border-[3px] border-line shadow-ledge',
        'transition-[translate,box-shadow,background-color,opacity] duration-100',
        'hover:bg-quest-200 active:translate-y-[3px] active:shadow-ledge-sm',
        'disabled:opacity-60 disabled:active:translate-y-0',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
        className,
      ].join(' ')}
    >
      <svg viewBox="0 0 48 48" className="w-[62%] h-[62%]" aria-hidden="true">
        <path
          d="M7 18.5h7.5L25 10v28l-10.5-8.5H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
          fill="#fffaf0"
          stroke="#3a2c38"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path className="sq-wave sq-wave-1" d="M30.5 18.5a8 8 0 0 1 0 11" fill="none" stroke="#3a2c38" strokeWidth="3.4" strokeLinecap="round" />
        <path className="sq-wave sq-wave-2" d="M35.5 13.5a15 15 0 0 1 0 21" fill="none" stroke="#3a2c38" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    </button>
  )
}
