import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useWorldUi } from './useWorldUi'
import { sfx } from '../lib/sound'

export default function WorldHud() {
  const activeNpc = useWorldUi((s) => s.activeNpc)
  const navigate = useNavigate()

  const enter = () => {
    if (!activeNpc) return
    sfx.click()
    navigate(`/zone/${activeNpc.zoneId}`)
  }

  // Keyboard: E enters the active NPC's zone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.key === 'e' || e.key === 'E') && activeNpc) enter() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNpc])

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Link to="/map" onClick={() => sfx.click()} className="pointer-events-auto kid-text bg-ocean-900/70 text-white px-3 py-1 rounded-full text-sm">← Map</Link>
        <span className="kid-text bg-ocean-900/50 text-white/90 px-3 py-1 rounded-full text-xs">🌍 World (beta) · W A S D to walk</span>
      </div>
      {activeNpc && (
        <button
          onClick={enter}
          className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 kid-text bg-quest-500 text-quest-900 px-5 py-2 rounded-full shadow-lg text-lg animate-pulse"
        >
          Press E to enter {activeNpc.label} →
        </button>
      )}
    </div>
  )
}
