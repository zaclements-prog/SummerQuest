import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHomeUi } from '../useHomeUi'
import { useWorldUi } from '../../world/useWorldUi'
import { insideDoorSpot } from '../../world/worldLayout'
import { useProgress } from '../../store/progress'
import { HOME_ITEMS } from '../../lib/home/catalog'
import { canPlace } from '../../lib/home/grid'
import { occupiedTiles } from '../../lib/home/occupancy'
import ModeToggle from './ModeToggle'
import CatalogDrawer from './CatalogDrawer'
import ControlsHelp from './ControlsHelp'
import { sfx } from '../../lib/sound'

// HUD chrome: dark translucent bubbles with white text, sized for fingers (48px).
export const hudBtn =
  'pointer-events-auto kid-text inline-flex items-center justify-center gap-1.5 min-h-12 rounded-full text-base leading-none outline-none focus-visible:ring-4 focus-visible:ring-quest-300'
const barBtn = 'kid-text inline-flex items-center justify-center gap-1.5 min-h-12 px-4 rounded-full text-base text-white bg-white/20 active:bg-white/35 outline-none focus-visible:ring-4 focus-visible:ring-quest-300'

export default function HomeHud() {
  const mode = useHomeUi((s) => s.mode)
  const placingItemId = useHomeUi((s) => s.placingItemId)
  const movingUid = useHomeUi((s) => s.movingUid)
  const selectedUid = useHomeUi((s) => s.selectedUid)
  const rotate = useHomeUi((s) => s.rotate)
  const cancelPlacing = useHomeUi((s) => s.cancelPlacing)
  const startMoving = useHomeUi((s) => s.startMoving)
  const select = useHomeUi((s) => s.select)
  const shopOpen = useHomeUi((s) => s.shopOpen)
  const setShopOpen = useHomeUi((s) => s.setShopOpen)
  const placed = useProgress((s) => s.placedItems)
  const moveItem = useProgress((s) => s.moveItem)
  const removeItem = useProgress((s) => s.removeItem)
  const active = !!placingItemId || !!movingUid
  const navigate = useNavigate()

  // The item tapped in decorate mode (gone if it was put away meanwhile).
  const sel = selectedUid && mode === 'decorate' ? placed.find((p) => p.uid === selectedUid) ?? null : null
  const selItem = sel ? HOME_ITEMS.find((i) => i.id === sel.itemId) ?? null : null

  // "No room to turn it here" — a short-lived note in the action bar.
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef(0)
  const flash = (text: string) => {
    window.clearTimeout(noteTimer.current)
    setNote(text)
    noteTimer.current = window.setTimeout(() => setNote(null), 1400)
  }
  useEffect(() => () => window.clearTimeout(noteTimer.current), [])

  // This room is your House in the World: "Back" walks you out into the World,
  // standing just inside the House door.
  const back = () => {
    sfx.click()
    useWorldUi.getState().setReturnSpot(insideDoorSpot('house'))
    navigate('/world')
  }

  // Turn the selected item a quarter turn where it stands (the next way round that fits).
  const rotateSelected = () => {
    if (!sel || !selItem) return
    const occ = occupiedTiles(placed, sel.uid)
    for (let k = 1; k <= 3; k++) {
      const r = (sel.rot + 90 * k) % 360
      if (canPlace(occ, selItem.footprint, sel.gx, sel.gz, r)) {
        sfx.click()
        moveItem(sel.uid, sel.gx, sel.gz, r)
        return
      }
    }
    sfx.wrong()
    flash('No room to turn it here')
  }
  const moveSelected = () => {
    if (!sel) return
    sfx.click()
    startMoving(sel.uid, sel.itemId, sel.rot)
  }
  const storeSelected = () => {
    if (!sel) return
    sfx.click()
    removeItem(sel.uid)
    select(null)
    setShopOpen(true)
  }
  // Letting go of an item, or calling off a placement, brings the shop back.
  const done = () => {
    select(null)
    setShopOpen(true)
  }
  const cancel = () => {
    cancelPlacing()
    setShopOpen(true)
  }

  // Keyboard parity with the buttons: R rotates, Esc cancels / lets go.
  const keys = useRef({ active, sel: !!sel, rotate, rotateSelected, cancel, done })
  useEffect(() => {
    keys.current = { active, sel: !!sel, rotate, rotateSelected, cancel, done }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current
      if (!k.active && !k.sel) return
      if (e.key === 'r' || e.key === 'R') {
        if (k.active) k.rotate()
        else k.rotateSelected()
      } else if (e.key === 'Escape') {
        if (k.active) k.cancel()
        else k.done()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The Home is edge-to-edge (no app padding), so the HUD keeps clear of the notch / home indicator itself.
  const bar = 'pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-[calc(0.75rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] w-max max-w-[calc(100%-1.5rem)] flex flex-wrap items-center justify-center gap-2 bg-ocean-900/85 backdrop-blur rounded-[1.75rem] px-3 py-2 shadow-pop'

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[calc(0.5rem+var(--safe-top,env(safe-area-inset-top,0px)))] left-[calc(0.5rem+var(--safe-left,env(safe-area-inset-left,0px)))] right-[calc(0.5rem+var(--safe-right,env(safe-area-inset-right,0px)))] flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={back} title="Back to the World" className={`${hudBtn} bg-ocean-900/70 text-white px-3 sm:px-4`}>← Back</button>
          <ControlsHelp />
        </div>
        <ModeToggle />
      </div>

      {active && (
        <div className={bar} role="toolbar" aria-label="Placing furniture">
          <span className="kid-text text-white text-base px-1 self-center">
            {movingUid ? 'Tap a tile to move it' : 'Tap a tile to place'}
          </span>
          <button type="button" onClick={() => { sfx.click(); rotate() }} className={barBtn}>⟳ Rotate</button>
          {movingUid && (
            <button type="button" onClick={() => { sfx.click(); removeItem(movingUid); cancelPlacing() }} className={barBtn}>📦 Put away</button>
          )}
          <button type="button" onClick={() => { sfx.click(); cancel() }} className={`${barBtn} !bg-wrong-500`}>✕ Cancel</button>
        </div>
      )}

      {!active && sel && selItem && (
        <div className={bar} role="toolbar" aria-label={`${selItem.name} selected`}>
          <span className="kid-text text-white text-base px-1 self-center" role="status">
            {note ?? selItem.name}
          </span>
          <button type="button" onClick={rotateSelected} className={barBtn}>⟳ Rotate</button>
          <button type="button" onClick={moveSelected} className={barBtn}>✋ Move</button>
          <button type="button" onClick={storeSelected} className={barBtn}>📦 Put away</button>
          <button type="button" onClick={() => { sfx.click(); done() }} className={`${barBtn} !bg-correct-500 !text-ink-900`}>✓ Done</button>
        </div>
      )}

      {/* The shop steps aside while you place, move or fix up an item, and stays
          folded after you place one (so you can see it) until you open it again. */}
      {mode === 'decorate' && !active && !sel && (shopOpen ? (
        <CatalogDrawer onHide={() => { sfx.click(); setShopOpen(false) }} />
      ) : (
        <button
          type="button"
          onClick={() => { sfx.click(); setShopOpen(true) }}
          className={`${hudBtn} absolute left-1/2 -translate-x-1/2 bottom-[calc(0.75rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] px-6 bg-quest-500 text-quest-900 text-lg shadow-pop`}
        >
          🛍️ Shop
        </button>
      ))}
    </div>
  )
}
