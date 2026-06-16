import { useHomeUi } from '../useHomeUi'
import { sfx } from '../../lib/sound'

export default function ModeToggle() {
  const mode = useHomeUi((s) => s.mode)
  const setMode = useHomeUi((s) => s.setMode)
  return (
    <div className="pointer-events-auto flex gap-1 bg-ocean-900/70 rounded-full p-1">
      {(['play', 'decorate'] as const).map((m) => (
        <button key={m} onClick={() => { sfx.click(); setMode(m) }}
          className={`kid-text px-3 py-1 rounded-full text-sm ${mode === m ? 'bg-quest-500 text-quest-900' : 'text-white'}`}>
          {m === 'play' ? '🎮 Play' : '🛠️ Decorate'}
        </button>
      ))}
    </div>
  )
}
