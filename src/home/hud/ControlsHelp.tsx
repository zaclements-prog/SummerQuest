import { useState } from 'react'
import { sfx } from '../../lib/sound'

/** A "?" button that opens a kid-friendly guide to the Home controls. */
export default function ControlsHelp() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => { sfx.click(); setOpen(true) }}
        className="pointer-events-auto kid-text bg-ocean-900/70 text-white w-8 h-8 rounded-full text-base leading-none"
        title="How to play"
      >
        ?
      </button>
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white text-ocean-900 rounded-3xl p-5 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="kid-text text-2xl">🏠 How to play at Home</h3>
              <button onClick={() => { sfx.click(); setOpen(false) }} className="kid-text text-xl px-2">
                ✕
              </button>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed">
              <li>🖱️ <b>Drag</b> the room to spin it around and look from any side.</li>
              <li>✋ <b>Right-drag</b> (or two fingers) to slide the view across the room.</li>
              <li>🔍 <b>Scroll</b> or <b>pinch</b> to zoom in and out.</li>
              <li>🎮 <b>Play mode:</b> tap your creature to make it hop and cheer!</li>
              <li>🛠️ <b>Decorate mode:</b> buy furniture, then tap a green tile to place it. Tap <b>⟳ Rotate</b> to turn it before you drop it.</li>
              <li>📦 Tap a placed item to <b>pick it up</b> — put it somewhere new, or tap <b>✕ Cancel</b> to keep it in your bag.</li>
              <li>🦄 In the <b>Creatures</b> tab, buy a new animal and <b>Become</b> it!</li>
              <li>🪙 Earn coins by finishing activities — then spend them here.</li>
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
