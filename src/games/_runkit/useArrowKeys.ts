import { useEffect } from 'react'

const MAP: Record<string, string> = { ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd' }

/**
 * Arrow keys walk too. The shared walk hook (src/world/useWanderWalk.ts, owned
 * elsewhere) only listens for W/A/S/D, so the arrows are re-sent as those keys.
 * Harmless if that hook learns arrows itself later: both set the same flags.
 * Stops the page from scrolling under the game while an arrow is held.
 */
export function useArrowKeys(): void {
  useEffect(() => {
    const relay = (type: 'keydown' | 'keyup') => (e: KeyboardEvent) => {
      const key = MAP[e.key]
      if (!key) return
      e.preventDefault()
      window.dispatchEvent(new KeyboardEvent(type, { key }))
    }
    const down = relay('keydown')
    const up = relay('keyup')
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
}
