import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useProgress } from '../store/progress'
import { PROBE, decideAutoQuality, setAutoResult, useGraphics } from './graphicsQuality'

/**
 * Graphics 'auto': once per session, the first time the World is played, time
 * ~4 seconds of frames (after a short warm-up for shader compiles) and drop to
 * "Fast" for the session if the machine can't keep up. Never changes the saved
 * choice. Mounted inside the World's Canvas.
 *
 * Automated browsers (navigator.webdriver: headless screenshot runs on a
 * software GPU) skip the probe so screenshots keep the full look; add
 * `?gfxprobe` to the URL to run it there anyway.
 */
export default function QualityProbe({ force = false }: { force?: boolean }) {
  const choice = useProgress((s) => s.graphicsQuality)
  const probed = useGraphics((s) => s.probed)
  const automated = typeof navigator !== 'undefined' && navigator.webdriver === true
  if (choice !== 'auto' || probed || (automated && !force)) return null
  return <ProbeRunner />
}

function ProbeRunner() {
  const st = useRef({ elapsed: 0, frames: 0, measuring: false, measured: 0, samples: [] as number[], skipNext: false, done: false })

  // A hidden tab pauses frames; the first frame back spans the whole gap — skip it.
  useEffect(() => {
    const onVis = () => { st.current.skipNext = true }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useFrame((_, dt) => {
    const s = st.current
    if (s.done) return
    if (document.hidden || s.skipNext) { s.skipNext = false; return }
    s.frames++
    s.elapsed += dt
    if (!s.measuring) {
      if (s.elapsed >= PROBE.warmupSeconds && s.frames >= PROBE.warmupFrames) s.measuring = true
      return
    }
    s.samples.push(dt * 1000)
    s.measured += dt
    if (s.measured < PROBE.windowSeconds) return
    s.done = true
    const result = decideAutoQuality(s.samples)
    if (import.meta.env.DEV) {
      const avg = s.samples.reduce((a, b) => a + b, 0) / s.samples.length
      console.info(`[graphics] auto: ${s.samples.length} frames, avg ${avg.toFixed(1)} ms → ${result}`)
    }
    if (result) setAutoResult(result)
  })
  return null
}
