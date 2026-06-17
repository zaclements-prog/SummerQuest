import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useHomeUi } from '../useHomeUi'
import { useProgress } from '../../store/progress'
import ModeToggle from './ModeToggle'
import CatalogDrawer from './CatalogDrawer'
import ControlsHelp from './ControlsHelp'
import { sfx } from '../../lib/sound'

export default function HomeHud() {
  const mode = useHomeUi((s) => s.mode)
  const placingItemId = useHomeUi((s) => s.placingItemId)
  const movingUid = useHomeUi((s) => s.movingUid)
  const rotate = useHomeUi((s) => s.rotate)
  const cancelPlacing = useHomeUi((s) => s.cancelPlacing)
  const removeItem = useProgress((s) => s.removeItem)
  const active = !!placingItemId || !!movingUid

  // While placing or moving: R rotates, Esc cancels (keyboard parity with the buttons).
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') rotate()
      else if (e.key === 'Escape') cancelPlacing()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, rotate, cancelPlacing])

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/map" onClick={() => sfx.click()} className="pointer-events-auto kid-text bg-ocean-900/70 text-white px-3 py-1 rounded-full text-sm">← Map</Link>
          <ControlsHelp />
        </div>
        <ModeToggle />
      </div>
      {active && (
        <div className="pointer-events-auto absolute top-14 left-1/2 -translate-x-1/2 flex gap-2 bg-ocean-900/85 rounded-full px-3 py-1.5">
          <span className="kid-text text-white text-sm self-center">
            {movingUid ? 'Tap a tile to move it' : 'Tap a tile to place'}
          </span>
          <button onClick={() => { sfx.click(); rotate() }} className="kid-text text-sm bg-white/20 text-white px-3 py-1 rounded-full">⟳ Rotate</button>
          {movingUid && (
            <button onClick={() => { sfx.click(); removeItem(movingUid); cancelPlacing() }} className="kid-text text-sm bg-white/20 text-white px-3 py-1 rounded-full">📦 Put away</button>
          )}
          <button onClick={() => { sfx.click(); cancelPlacing() }} className="kid-text text-sm bg-wrong-500 text-white px-3 py-1 rounded-full">✕ Cancel</button>
        </div>
      )}
      {mode === 'decorate' && <CatalogDrawer />}
    </div>
  )
}
