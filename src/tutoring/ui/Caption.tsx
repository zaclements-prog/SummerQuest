import { useEffect, useMemo, useRef, useState } from 'react'
import type { NarrationClock } from '../../lib/narration'
import { stageNow } from '../motion/stageClock'
import { M } from '../motion/palette'

/**
 * The narration as a karaoke caption: words already spoken are solid ink, the
 * word being spoken wears a gold marker, words still to come are faint. It
 * reads the same clock as the stage (`clock.timeAtChar` per word), so it
 * follows the real audio, browser speech or the silent estimate alike.
 */
export default function Caption({ text, clock, className = '' }: { text: string; clock: NarrationClock; className?: string }) {
  const words = useMemo(() => {
    const out: { w: string; at: number }[] = []
    const re = /\S+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) out.push({ w: m[0], at: m.index })
    return out
  }, [text])

  // How many words have started, and whether the narration is over. Only set
  // when they change, so the caption re-renders per word, not per frame.
  const [spoken, setSpoken] = useState(0)
  const [done, setDone] = useState(false)
  const last = useRef({ n: -1, d: false })

  useEffect(() => {
    let raf = 0
    last.current = { n: -1, d: false }
    const loop = () => {
      const t = stageNow(clock)
      let n = 0
      for (const w of words) {
        if (clock.timeAtChar(w.at) <= t + 0.05) n++
        else break
      }
      const d = t > clock.duration() + 0.3
      if (n !== last.current.n) {
        last.current.n = n
        setSpoken(n)
      }
      if (d !== last.current.d) {
        last.current.d = d
        setDone(d)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [clock, words])

  return (
    <p className={`kid-text leading-snug ${className}`} style={{ color: M.ink }}>
      {words.map((w, i) => {
        const now = !done && i === spoken - 1
        const future = !done && i >= spoken
        return (
          <span key={i}>
            <span
              className="rounded-lg px-[3px] -mx-[3px] transition-[background-color,opacity,color] duration-200 [box-decoration-break:clone]"
              style={{
                background: now ? M.gold : 'transparent',
                opacity: future ? 0.38 : 1,
              }}
            >
              {w.w}
            </span>{' '}
          </span>
        )
      })}
    </p>
  )
}

/** A thin progress line for the narration (writes to the DOM directly, no re-renders). */
export function TimeBar({ clock, className = '' }: { clock: NarrationClock; className?: string }) {
  const fill = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const k = Math.min(1, Math.max(0, stageNow(clock) / Math.max(0.1, clock.duration())))
      if (fill.current) fill.current.style.transform = `scaleX(${k})`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [clock])
  return (
    <div className={`h-2.5 rounded-full overflow-hidden ${className}`} style={{ background: 'rgba(58,44,56,0.12)' }} aria-hidden="true">
      <div ref={fill} className="h-full w-full origin-left rounded-full" style={{ background: M.coral, transform: 'scaleX(0)' }} />
    </div>
  )
}
