/**
 * App-like touch behaviour the CSS can't do alone (see the PLATFORM SHELL block
 * in src/index.css): no context menu from a long-press — anywhere on touch
 * screens, and on game surfaces (3D canvases, `.game-surface`) for mice too —
 * while text fields keep theirs (paste, spell-check).
 */
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], .selectable'

function onContextMenu(e: MouseEvent) {
  const target = e.target
  if (!(target instanceof Element) || target.closest(EDITABLE)) return
  const pointerType = (e as PointerEvent).pointerType
  const fromTouch =
    pointerType === 'touch' ||
    pointerType === 'pen' ||
    (!pointerType && typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches)
  if (fromTouch || target.closest('canvas, .game-surface')) e.preventDefault()
}

export function installTouchGuards(): () => void {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('contextmenu', onContextMenu)
  return () => document.removeEventListener('contextmenu', onContextMenu)
}
