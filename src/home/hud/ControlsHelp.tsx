import { useState } from 'react'
import { sfx } from '../../lib/sound'
import { Modal } from '../../components/ui'
import { useCoarsePointer } from '../../components/useViewport'

/** A "?" button that opens a kid-friendly guide to the Home controls (worded for touch or mouse). */
export default function ControlsHelp() {
  const [open, setOpen] = useState(false)
  const touch = useCoarsePointer()
  const close = () => setOpen(false)
  return (
    <>
      <button
        type="button"
        onClick={() => { sfx.click(); setOpen(true) }}
        className="pointer-events-auto kid-text grid place-items-center bg-ocean-900/70 text-white w-12 h-12 rounded-full text-xl leading-none outline-none focus-visible:ring-4 focus-visible:ring-quest-300"
        title="How to play"
        aria-label="How to play"
      >
        ?
      </button>
      {/* The HUD layer ignores pointers (so the room underneath gets them); the dialog takes them back. */}
      <div className="pointer-events-auto">
        <Modal open={open} onClose={close} label="How to play at Home" size="md">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="kid-text text-2xl">🏠 How to play at Home</h3>
              <button
                type="button"
                onClick={() => { sfx.click(); close() }}
                className="kid-text grid place-items-center shrink-0 w-12 h-12 rounded-full bg-cream-100 border-2 border-line text-xl outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {touch ? (
              <ul className="space-y-2 text-base leading-relaxed">
                <li>👆 <b>Drag</b> one finger to spin the room and look from any side.</li>
                <li>🤏 <b>Pinch</b> with two fingers to zoom in and out — or slide two fingers to move the view.</li>
                <li>🐾 Your creature walks around the room all by itself.</li>
                <li>🎮 <b>Play mode:</b> tap your creature to make it hop and cheer!</li>
                <li>🛠️ <b>Decorate mode:</b> buy furniture, tap <b>Place</b>, then tap a green tile to put it there. Tap <b>⟳ Rotate</b> to turn it first.</li>
                <li>✋ <b>Tap</b> any placed item to pick it: then <b>⟳ Rotate</b> it, <b>✋ Move</b> it to a new tile, or <b>📦 Put away</b> to send it back to your bag. Tap <b>✓ Done</b> when it looks right.</li>
                <li>🦄 In the <b>Creatures</b> tab, buy a new animal and <b>Become</b> it!</li>
                <li>🪙 Earn coins by finishing activities — then spend them here.</li>
              </ul>
            ) : (
              <ul className="space-y-2 text-base leading-relaxed">
                <li>🖱️ <b>Drag</b> the room to spin it around and look from any side.</li>
                <li>✋ <b>Right-drag</b> (or two fingers) to slide the view across the room.</li>
                <li>🔍 <b>Scroll</b> or <b>pinch</b> to zoom in and out.</li>
                <li>⌨️ Press <b>W A S D</b> to walk your creature around the room.</li>
                <li>🎮 <b>Play mode:</b> click your creature to make it hop and cheer!</li>
                <li>🛠️ <b>Decorate mode:</b> buy furniture, then click a green tile to place it. Click <b>⟳ Rotate</b> (or press <b>R</b>) to turn it before you drop it.</li>
                <li>📦 Click any placed item to pick it: <b>⟳ Rotate</b> (or <b>R</b>), <b>✋ Move</b> it to a new green tile, or <b>📦 Put away</b> to send it back to your bag. <b>✓ Done</b> (or <b>Esc</b>) lets go; <b>✕ Cancel</b> (or <b>Esc</b>) stops a move and leaves it where it was.</li>
                <li>🦄 In the <b>Creatures</b> tab, buy a new animal and <b>Become</b> it!</li>
                <li>🪙 Earn coins by finishing activities — then spend them here.</li>
              </ul>
            )}
          </div>
        </Modal>
      </div>
    </>
  )
}
