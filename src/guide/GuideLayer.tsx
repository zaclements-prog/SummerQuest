import { memo, useCallback, useEffect, useRef } from 'react'
import { useVoice } from '../voice/useVoice'
import type { VoicePlayback, VoiceRef } from '../voice/types'
import { handPlace, sameBox, spotBox, sweepShowing, type Box } from './placement'
import {
  cueTime,
  getGuideSnapshot,
  guide,
  guideEventFired,
  guideFire,
  guideLayerMounted,
  guideLineEnded,
  resolveTarget,
  useGuideSnapshot,
  type GuideMark,
} from './store'
import './guide.css'

/**
 * The guide's overlay and narrator. Mount ONCE, in the app shell.
 *
 * - The narrator: `useVoice` on the current line (remounted per line, so the
 *   same words twice still play twice).
 * - The overlay: a soft dim with a rounded spotlight hole, a pulsing ring and a
 *   bouncing 👆, each over the target as the voice reaches its cue.
 *
 * Nothing here re-renders per frame: one rAF loop reads the voice clock,
 * measures the target and writes transforms straight onto three elements, only
 * when something changed. The layer is `pointer-events: none` throughout, so it
 * never takes a tap from what it points at (or from anything else), and it is
 * `position: fixed`, so it never moves the page.
 */

/** The dim stays this long after the line ends, then lifts (ring and hand stay). */
const DIM_HOLD_S = 0.9
/** Re-measure the held target this often (frames) when nothing's moving; resize/scroll re-measure at once. */
const HELD_MEASURE_EVERY = 10

interface Published {
  serial: number
  pb: VoicePlayback
}

function Narrator({ serial, voice, onPlayback }: { serial: number; voice: VoiceRef; onPlayback: (serial: number, pb: VoicePlayback) => void }) {
  const pb = useVoice(voice, { autoPlay: true })
  useEffect(() => {
    onPlayback(serial, pb)
  })
  return null
}

export default memo(function GuideLayer({ resetKey }: { resetKey?: unknown }) {
  const snap = useGuideSnapshot()
  const spotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const published = useRef<Published | null>(null)
  const onPlayback = useCallback((serial: number, pb: VoicePlayback) => {
    published.current = { serial, pb }
  }, [])

  useEffect(() => guideLayerMounted(), [])

  // A new screen: whatever the old one was saying stops (and isn't "said again").
  const lastKey = useRef(resetKey)
  useEffect(() => {
    if (Object.is(lastKey.current, resetKey)) return
    lastKey.current = resetKey
    guide.clear({ forget: true })
  }, [resetKey])

  const active = !!snap.run
  useEffect(() => {
    const spot = spotRef.current
    const ring = ringRef.current
    const hand = handRef.current
    if (!active || !spot || !ring || !hand) return
    return overlayLoop({ spot, ring, hand }, published)
  }, [active])

  const line = snap.run?.lines[snap.line]
  return (
    <>
      {/* (tap-through inline too, so it holds even before the stylesheet arrives) */}
      <div className="gl-root" aria-hidden="true" style={{ pointerEvents: 'none' }}>
        <div ref={spotRef} className="gl-spot" />
        <div ref={ringRef} className="gl-ring">
          <div className="gl-pulse" />
        </div>
        <div ref={handRef} className="gl-hand">
          <div className="gl-sweeper">
            <span className="gl-glyph">👆</span>
          </div>
        </div>
      </div>
      {/* what the narrator says, for screen readers (never visible) */}
      <div className="sr-only" aria-live="polite">
        {snap.speaking ? line?.text : ''}
      </div>
      {line?.voice && <Narrator key={snap.lineSerial} serial={snap.lineSerial} voice={line.voice} onPlayback={onPlayback} />}
    </>
  )
})

interface Els {
  spot: HTMLDivElement
  ring: HTMLDivElement
  hand: HTMLDivElement
}

function setOn(el: HTMLElement, on: boolean) {
  if (on === el.hasAttribute('data-on')) return
  if (on) {
    // appear where it is, don't slide in from wherever it was last
    el.setAttribute('data-snap', '')
    el.setAttribute('data-on', '')
  } else {
    el.removeAttribute('data-on')
  }
}

function placeBox(el: HTMLElement, b: Box & { r: number }) {
  el.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0)`
  el.style.width = `${Math.round(b.w)}px`
  el.style.height = `${Math.round(b.h)}px`
  el.style.borderRadius = `${Math.round(b.r)}px`
}

/** The overlay's frame loop. Returns its stop function. */
function overlayLoop(els: Els, published: { current: Published | null }): () => void {
  let raf = 0
  let frame = 0
  let dirty = true
  let serial = -1
  let markIdx = -1
  /** performance.now() when the current mark (and its hand) appeared. */
  let markSince = 0
  let box: Box | null = null
  let from: Box | null = null
  let lastKey = ''
  const onChange = () => {
    dirty = true
  }
  window.addEventListener('resize', onChange)
  window.addEventListener('orientationchange', onChange)
  window.addEventListener('scroll', onChange, true)

  const hideAll = () => {
    for (const el of [els.spot, els.ring, els.hand]) setOn(el, false)
    lastKey = ''
  }

  const tick = () => {
    raf = requestAnimationFrame(tick)
    frame += 1
    // (one frame after appearing in place, movement animates again)
    for (const el of [els.spot, els.ring, els.hand]) if (el.hasAttribute('data-snap') && el.hasAttribute('data-placed')) el.removeAttribute('data-snap')

    const s = getGuideSnapshot()
    const run = s.run
    if (!run) return hideAll()
    const line = run.lines[s.line]
    if (!line) return hideAll()

    let now: number
    let dur: number
    let clock = null
    if (line.voice) {
      const pub = published.current
      if (!pub || pub.serial !== s.lineSerial) return // the narrator hasn't started this line yet
      clock = pub.pb.clock
      now = clock.now()
      dur = clock.duration()
    } else {
      now = (performance.now() - s.lineStartedAt) / 1000
      dur = 0
    }
    if (serial !== s.lineSerial) {
      serial = s.lineSerial
      markIdx = -1
      dirty = true
    }

    for (const ev of line.events) {
      if (!guideEventFired(ev) && now >= cueTime(ev.cue, ev.nth ?? 0, line.text, clock, ev.char)) guideFire(ev)
    }
    if (s.speaking && now >= dur + line.pause) {
      guideLineEnded(run.id, s.line)
      return
    }

    // the mark whose cue has been reached (once the line is over, the last one holds)
    let idx = -1
    line.marks.forEach((m, i) => {
      if (now >= cueTime(m.cue, m.nth, line.text, clock)) idx = i
    })
    if (idx < 0 && !s.speaking && line.marks.length) idx = line.marks.length - 1
    const mark: GuideMark | null = idx >= 0 ? line.marks[idx] : null
    if (idx !== markIdx) {
      markIdx = idx
      markSince = performance.now()
      dirty = true
    }

    if (dirty || s.speaking || frame % HELD_MEASURE_EVERY === 0) {
      const b = mark ? resolveTarget(mark.target) : null
      if (!sameBox(b, box)) box = b
      const f = mark?.hand === 'drag' && mark.from ? resolveTarget(mark.from) : null
      if (!sameBox(f, from)) from = f
      dirty = false
    }
    if (!mark || !box) return hideAll()

    const dimOn = mark.dim && !run.gentle && now < dur + DIM_HOLD_S
    // a sweeping hand fades once the line is said and it has glided along the row once
    const handOn = sweepShowing(mark.hand, s.speaking, (performance.now() - markSince) / 1000)
    const vw = window.innerWidth
    const vh = window.innerHeight
    const fromKey = from ? `${Math.round(from.x)},${Math.round(from.y)}` : ''
    const key = `${serial}:${idx}:${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.w)},${Math.round(box.h)}:${fromKey}:${dimOn}:${handOn}:${vw}x${vh}`
    if (key === lastKey) return
    lastKey = key

    const sp = spotBox(box, mark.pad)
    placeBox(els.spot, sp)
    setOn(els.spot, dimOn)

    const rg = spotBox(box, mark.pad + 4)
    placeBox(els.ring, rg)
    // the pulse grows ~14px past the ring on every side, whatever the ring's size
    els.ring.style.setProperty('--gl-psx', String((rg.w + 28) / rg.w))
    els.ring.style.setProperty('--gl-psy', String((rg.h + 28) / rg.h))
    setOn(els.ring, mark.ring)

    if (mark.hand) {
      const size = els.hand.offsetWidth || 64
      const drag = mark.hand === 'drag' && !!from
      const hp = handPlace(box, size, vw, vh, drag ? 'drag' : mark.hand === 'drag' ? 'tap' : mark.hand)
      els.hand.style.transform = `translate3d(${Math.round(hp.x)}px, ${Math.round(hp.y)}px, 0)`
      els.hand.style.setProperty('--gl-sweep', `${Math.round(hp.sweep)}px`)
      if (drag && from) {
        // the drag starts on the middle of `from` and ends where the hand rests
        els.hand.style.setProperty('--gl-dx', `${Math.round(from.x + from.w / 2 - (box.x + box.w / 2))}px`)
        els.hand.style.setProperty('--gl-dy', `${Math.round(from.y + from.h / 2 - (box.y + box.h * 0.55))}px`)
      }
      els.hand.toggleAttribute('data-flip', hp.flip)
      els.hand.dataset.mode = drag ? 'drag' : hp.sweep > 0 ? 'sweep' : 'tap'
    }
    setOn(els.hand, handOn)
    for (const el of [els.spot, els.ring, els.hand]) el.setAttribute('data-placed', '')
  }
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onChange)
    window.removeEventListener('orientationchange', onChange)
    window.removeEventListener('scroll', onChange, true)
    hideAll()
  }
}
