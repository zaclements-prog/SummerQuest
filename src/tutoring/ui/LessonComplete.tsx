import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ease, progress, spring } from '../motion/anim'
import { Burst, Confetti, Defs, Paper, Pop, Twinkle, Words } from '../motion/kit'
import { M } from '../motion/palette'
import { starPath } from '../motion/layout'
import { ArrowRightIcon, ReplayIcon } from './icons'
import { usePetUi } from '../../lib/pets/usePetUi'
import { guide } from '../../guide/store'
import { useIdleReprompt } from '../../guide/useIdleReprompt'
import { kLine } from '../lessons/k1Voice'

/** The big ▶ on the listen-mode card (the guide points at it). */
const LESSON_DONE_NEXT = 'lesson-done-next'

const VW = 640
const VH = 330
/** Seconds before we carry on to practice by ourselves. */
const AUTO_GO = 6

/**
 * The end-of-lesson moment: a medal with the lesson's emoji spins in on a
 * sunburst, three stars land, confetti flies, then we carry on to practice
 * (a ring on the button counts down; "Watch again" stays in the lesson).
 *
 * `listen` (the voice-first grades): nothing to read. No words on the card,
 * a big ↺ and a big ▶, and the narrator says "You did it! Tap the arrow to
 * play." while the hand points at ▶ (no countdown: the child goes on).
 */
export default function LessonComplete({ title, emoji, ideas, onPractice, onReplay, reduced, listen = false }: { title: string; emoji: string; ideas: number; onPractice: () => void; onReplay: () => void; reduced: boolean; listen?: boolean }) {
  const [t, setT] = useState(reduced ? 99 : 0)
  const goRef = useRef(onPractice)
  const btnRef = useRef<HTMLButtonElement>(null)
  // A pet hatching over this card holds the countdown until it's dismissed.
  const held = usePetUi((s) => s.momentOpen)
  const heldRef = useRef(held)
  useEffect(() => {
    goRef.current = onPractice
  }, [onPractice])
  useEffect(() => {
    heldRef.current = held
  }, [held])

  useEffect(() => {
    btnRef.current?.focus()
    let last = performance.now()
    let s = 0
    let raf = 0
    let gone = false
    const loop = () => {
      const now = performance.now()
      if (!heldRef.current) s += (now - last) / 1000
      last = now
      if (!reduced) setT(s)
      if (s >= AUTO_GO && !gone && !listen) {
        gone = true
        goRef.current()
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [reduced, listen])

  // listen: the narrator says what to do and the hand points at ▶ (once the medal has landed)
  useEffect(() => {
    if (!listen) return
    const t = setTimeout(() => void guide.show({ voice: kLine('lessonDone'), target: LESSON_DONE_NEXT, cue: 'arrow', pad: 10 }), reduced ? 200 : 1300)
    return () => {
      clearTimeout(t)
      guide.clear({ forget: true })
    }
  }, [listen, reduced])
  useIdleReprompt({ key: 'lesson-done', enabled: listen })

  const cx = VW / 2
  const cy = 128
  const medal = spring(t, 0.1, { stiffness: 160, damping: 11 })
  const spin = (1 - ease.outCubic(progress(t, 0.1, 0.9))) * -200
  const raysK = ease.outCubic(progress(t, 0.2, 0.6))

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 pt-[calc(1rem+var(--safe-top,env(safe-area-inset-top,0px)))] pb-[calc(1rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))] short:pt-[calc(0.5rem+var(--safe-top,env(safe-area-inset-top,0px)))] short:pb-[calc(0.5rem+var(--safe-bottom,env(safe-area-inset-bottom,0px)))]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-label="Lesson complete" data-pet-calm="">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(40,30,40,0.55)' }} aria-hidden="true" />
      <motion.div
        className="relative my-auto w-full max-w-xl overflow-hidden rounded-[32px]"
        style={{ background: M.paper, boxShadow: `0 0 0 3px ${M.ink}, 0 10px 0 0 rgba(58,44,56,0.35)` }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      >
        {/* On a short screen (a phone held sideways) the picture shrinks to fit
            the height, so the message and both buttons stay on screen. */}
        <svg viewBox={`0 0 ${VW} ${VH}`} className="block w-full" style={{ maxHeight: 'calc(100dvh - 190px)' }} aria-hidden="true">
          <Defs />
          <Paper />
          {/* sunburst */}
          <g transform={`translate(${cx} ${cy}) rotate(${t * 12}) scale(${raysK})`} opacity={0.55}>
            {Array.from({ length: 16 }, (_, i) => {
              const a0 = (i / 16) * Math.PI * 2
              const a1 = a0 + Math.PI / 16
              const R = 420
              return <path key={i} d={`M 0 0 L ${Math.cos(a0) * R} ${Math.sin(a0) * R} L ${Math.cos(a1) * R} ${Math.sin(a1) * R} Z`} fill={i % 2 ? M.gold : '#ffe39a'} opacity={0.5} />
            })}
          </g>
          <Confetti t={t} at={0.55} x={cx} y={cy} n={44} spread={420} />
          <Burst t={t} at={0.5} x={cx} y={cy} r={120} color={M.gold} rays={14} />
          {/* medal */}
          {medal > 0.001 && (
            <g transform={`translate(${cx} ${cy}) rotate(${spin}) scale(${medal})`}>
              <path d="M -34 36 L -52 100 L -27 90 L -14 112 L 0 50 Z" fill={M.coral} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
              <path d="M 34 36 L 52 100 L 27 90 L 14 112 L 0 50 Z" fill="#8ab8ff" stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
              <circle r={68} fill={M.gold} stroke={M.ink} strokeWidth={5} filter="url(#sq-shadow)" />
              <circle r={53} fill="#ffe39a" stroke={M.ink} strokeWidth={3} />
              <text y={5} fontSize={58} textAnchor="middle" dominantBaseline="middle">
                {emoji}
              </text>
            </g>
          )}
          {/* stars land around the medal */}
          {(
            [
              [-165, 18, 36, -14],
              [165, 18, 36, 14],
              [-222, -48, 22, -20],
              [222, -48, 22, 20],
            ] as const
          ).map(([dx, dy, r, rot], i) => {
            const x = cx + dx
            const y = cy + dy
            return (
              <Pop key={i} t={t} at={0.85 + i * 0.16} x={x} y={y} bounce={9}>
                <g transform={`translate(${x} ${y}) rotate(${rot + Math.sin(t * 2 + i) * 5})`}>
                  <path d={starPath(r)} fill={M.gold} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
                </g>
              </Pop>
            )
          })}
          <Twinkle t={t} at={1.6} x={cx} y={cy} r={120} n={6} color={M.white} size={10} />
          {!listen && <Words t={t} at={1.1} text="Lesson complete!" x={cx} y={282} size={46} gap={0.12} />}
        </svg>
        {listen ? (
          <div className="flex items-center justify-center gap-8 px-5 pb-6 pt-1 short:pb-3">
            <button
              type="button"
              onClick={onReplay}
              aria-label="Watch again"
              className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-line bg-ocean-300 shadow-ledge outline-none hover:bg-ocean-200 focus-visible:ring-4 focus-visible:ring-ocean-500 active:translate-y-[3px] active:shadow-ledge-sm short:h-16 short:w-16"
            >
              <svg viewBox="0 0 48 48" className="h-[58%] w-[58%]" aria-hidden="true">
                <path d="M36 25a12 12 0 1 1-4.2-9.1" fill="none" stroke="#3a2c38" strokeWidth="5.5" strokeLinecap="round" />
                <path d="M30 8.5l3.2 8.6-8.8 1.7z" fill="#3a2c38" stroke="#3a2c38" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              ref={btnRef}
              type="button"
              onClick={onPractice}
              aria-label="Let's play"
              data-guide={LESSON_DONE_NEXT}
              className="grid h-28 w-28 place-items-center rounded-full border-[3px] border-line bg-correct-400 shadow-ledge outline-none hover:bg-correct-300 focus-visible:ring-4 focus-visible:ring-ocean-500 active:translate-y-[3px] active:shadow-ledge-sm short:h-24 short:w-24"
            >
              <svg viewBox="0 0 48 48" className="h-[56%] w-[56%] translate-x-[6%]" aria-hidden="true">
                <path d="M15 9.5v29a2 2 0 0 0 3 1.7l23-14.5a2 2 0 0 0 0-3.4L18 7.8a2 2 0 0 0-3 1.7z" fill="#fffaf0" stroke="#3a2c38" strokeWidth="3.5" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : (
        <div className="px-5 pb-5 pt-1 text-center short:pb-3">
          <p className="kid-text text-lg short:text-base" style={{ color: '#5a4a56' }}>
            You learned {ideas} big ideas in {title}. Now let&apos;s practice!
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 short:mt-2">
            <button
              type="button"
              onClick={onReplay}
              className="kid-text inline-flex min-h-[52px] items-center gap-2 rounded-full px-5 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500"
              style={{ background: '#ffffff', color: M.ink, boxShadow: `0 0 0 3px ${M.ink}, 0 5px 0 0 rgba(58,44,56,0.3)` }}
            >
              <ReplayIcon size={22} /> Watch again
            </button>
            <button
              ref={btnRef}
              type="button"
              onClick={onPractice}
              className="kid-text relative inline-flex min-h-[56px] items-center gap-2 overflow-hidden rounded-full px-6 text-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-500"
              style={{ background: M.coral, color: '#ffffff', boxShadow: `0 0 0 3px ${M.ink}, 0 5px 0 0 rgba(58,44,56,0.35)` }}
            >
              {/* countdown fill */}
              {!reduced && <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${Math.min(100, (t / AUTO_GO) * 100)}%` }} aria-hidden="true" />}
              <span className="relative [text-shadow:0_2px_0_rgba(58,44,56,0.35)]">🚀 Let&apos;s practice!</span>
              <ArrowRightIcon size={22} className="relative" />
            </button>
          </div>
        </div>
        )}
      </motion.div>
    </motion.div>
  )
}
