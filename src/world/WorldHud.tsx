import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import { useWorldUi } from './useWorldUi'
import WorldPanel from './WorldPanel'
import { sfx } from '../lib/sound'

export default function WorldHud({ posRef }: { posRef: RefObject<Vector3> }) {
  const activeNpc = useWorldUi((s) => s.activeNpc)
  const panel = useWorldUi((s) => s.panel)
  const navigate = useNavigate()

  const open = useCallback(() => {
    const npc = useWorldUi.getState().activeNpc
    if (!npc || useWorldUi.getState().panel) return
    sfx.click()
    useWorldUi.getState().openPanel(npc)
  }, [])

  const close = useCallback(() => useWorldUi.getState().closePanel(), [])

  // Leave the World for a stage / lesson; the avatar reappears where it stood.
  const launch = useCallback(
    (path: string) => {
      sfx.enter()
      const p = posRef.current
      const ui = useWorldUi.getState()
      ui.setReturnSpot(p ? [p.x, p.z] : null)
      ui.setEnteredFromWorld(true)
      ui.closePanel()
      navigate(path)
    },
    [navigate, posRef],
  )

  // Keyboard: E talks to the NPC you're standing next to.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') open()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Link to="/map" onClick={() => sfx.click()} className="pointer-events-auto kid-text bg-ocean-900/70 text-white px-3 py-1 rounded-full text-sm">← Map</Link>
        <span className="kid-text bg-ocean-900/50 text-white/90 px-3 py-1 rounded-full text-xs">🌍 World (beta) · W A S D to walk</span>
      </div>
      {activeNpc && !panel && (
        <button
          onClick={open}
          className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 kid-text bg-quest-500 text-quest-900 px-5 py-2 rounded-full shadow-lg text-lg animate-pulse"
        >
          Press E to visit {activeNpc.label} →
        </button>
      )}
      {panel && <WorldPanel npc={panel} onLaunch={launch} onClose={close} />}
    </div>
  )
}
