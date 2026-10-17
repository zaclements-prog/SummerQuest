import { useHomeUi } from '../useHomeUi'
import { sfx } from '../../lib/sound'

export default function ModeToggle() {
  const mode = useHomeUi((s) => s.mode)
  const setMode = useHomeUi((s) => s.setMode)
  return (
    <div className="pointer-events-auto flex gap-1 bg-ocean-900/70 rounded-full p-1" role="group" aria-label="Home mode">
      {(['play', 'decorate'] as const).map((m) => (
        <button key={m} type="button" onClick={() => { sfx.click(); setMode(m) }} aria-pressed={mode === m}
          className={`kid-text min-h-12 px-3 sm:px-4 rounded-full text-base whitespace-nowrap outline-none focus-visible:ring-4 focus-visible:ring-quest-300 ${mode === m ? 'bg-quest-500 text-quest-900' : 'text-white'}`}>
          {m === 'play' ? '🎮 Play' : '🛠️ Decorate'}
        </button>
      ))}
    </div>
  )
}
