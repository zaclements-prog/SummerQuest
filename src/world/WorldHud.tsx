import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import { useWorldUi } from './useWorldUi'
import WorldPanel from './WorldPanel'
import GraphicsToggle from './GraphicsToggle'
import { sfx } from '../lib/sound'

/** The Home room's decorate mode (the House in the World is that room). */
const DECORATE_PATH = '/home?mode=decorate'

export default function WorldHud({ posRef }: { posRef: RefObject<Vector3> }) {
  const activeNpc = useWorldUi((s) => s.activeNpc)
  const panel = useWorldUi((s) => s.panel)
  const inHouse = useWorldUi((s) => s.insideBuildingId === 'house')
  const navigate = useNavigate()

  const open = useCallback(() => {
    const npc = useWorldUi.getState().activeNpc
    if (!npc || useWorldUi.getState().panel) return
    sfx.click()
    useWorldUi.getState().openPanel(npc)
  }, [])

  const close = useCallback(() => useWorldUi.getState().closePanel(), [])

  /** Remember where the avatar stands so coming back to the World lands here. */
  const rememberSpot = useCallback(() => {
    const p = posRef.current
    useWorldUi.getState().setReturnSpot(p ? [p.x, p.z] : null)
  }, [posRef])

  // Leave the World for a stage / lesson; the avatar reappears where it stood.
  const launch = useCallback(
    (path: string) => {
      sfx.enter()
      rememberSpot()
      const ui = useWorldUi.getState()
      ui.setEnteredFromWorld(true)
      ui.closePanel()
      navigate(path)
    },
    [navigate, rememberSpot],
  )

  // Inside your House: decorate the room (Home's "Back" brings you back inside the door).
  const decorate = useCallback(() => {
    if (useWorldUi.getState().insideBuildingId !== 'house' || useWorldUi.getState().panel) return
    sfx.enter()
    rememberSpot()
    navigate(DECORATE_PATH)
  }, [navigate, rememberSpot])

  // Keyboard: E talks to the NPC you're standing next to (or decorates, inside your House).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if (useWorldUi.getState().activeNpc) open()
      else decorate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, decorate])

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-2 left-2 right-2 flex items-start gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Link
            to="/map"
            onClick={() => { sfx.click(); rememberSpot() }}
            className="pointer-events-auto kid-text bg-ocean-900/55 hover:bg-ocean-900/70 text-white px-3 py-1 rounded-full text-sm border-2 border-white/50"
          >
            🗺️ Map
          </Link>
          <span className="kid-text bg-ocean-900/50 text-white/90 px-3 py-1 rounded-full text-xs">
            <span className="pointer-coarse:hidden">🌍 WASD / arrows or tap to walk</span>
            <span className="hidden pointer-coarse:inline">👆 Tap or hold to walk</span>
          </span>
        </div>
        <div className="ml-auto">
          <GraphicsToggle />
        </div>
      </div>
      {activeNpc && !panel && (
        <button
          onClick={open}
          className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 kid-text bg-quest-500 text-quest-900 px-5 py-2 rounded-full shadow-lg text-lg animate-pulse whitespace-nowrap"
        >
          <span className="pointer-coarse:hidden">Press E to visit {activeNpc.label} →</span>
          <span className="hidden pointer-coarse:inline">Tap to visit {activeNpc.label} →</span>
        </button>
      )}
      {inHouse && !activeNpc && !panel && (
        <button
          onClick={decorate}
          className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 kid-text bg-quest-500 hover:bg-quest-400 text-quest-900 px-7 py-3 rounded-full shadow-xl text-xl sm:text-2xl border-4 border-white/80 whitespace-nowrap"
        >
          🛠️ Decorate my room
          <span className="pointer-coarse:hidden text-sm opacity-70 ml-2">(E)</span>
        </button>
      )}
      {panel && <WorldPanel npc={panel} onLaunch={launch} onClose={close} />}
    </div>
  )
}
