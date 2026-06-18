import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { sfx } from '../lib/sound'
import { Button } from '../components/ui'
import { useEntrance } from '../lib/motion'

// ── Decorative island/ocean scene ─────────────────────────────────────────────
// Purely cosmetic: layered ocean gradient with simple SVG islands, clouds, and
// sparkles drawn from the ocean/island/quest palette tokens. aria-hidden so it's
// invisible to assistive tech.

function IslandScene() {
  const reduced = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* deep-ocean gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 120%, var(--color-island-500) 0%, var(--color-ocean-500) 45%, var(--color-ocean-800) 100%)',
        }}
      />

      {/* drifting clouds */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
      >
        <g className="text-paper" fill="currentColor" opacity="0.85">
          <motion.g
            initial={reduced ? false : { x: -20 }}
            animate={reduced ? undefined : { x: [-20, 20, -20] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="70" cy="55" rx="34" ry="16" />
            <ellipse cx="95" cy="48" rx="24" ry="14" />
          </motion.g>
          <motion.g
            opacity="0.7"
            initial={reduced ? false : { x: 20 }}
            animate={reduced ? undefined : { x: [20, -25, 20] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="320" cy="70" rx="40" ry="18" />
            <ellipse cx="290" cy="62" rx="26" ry="15" />
          </motion.g>
        </g>

        {/* sparkles */}
        <g className="text-quest-200" fill="currentColor">
          {[
            [40, 110, 2.5],
            [360, 130, 3],
            [200, 40, 2],
            [120, 150, 1.8],
            [300, 165, 2.2],
          ].map(([cx, cy, r], i) => (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              initial={reduced ? false : { opacity: 0.3 }}
              animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeInOut',
              }}
            />
          ))}
        </g>

        {/* island silhouettes near the waterline */}
        <g>
          <path
            d="M-10 250 Q 60 195 140 250 Z"
            className="text-island-700"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M250 255 Q 330 200 420 255 Z"
            className="text-island-600"
            fill="currentColor"
            opacity="0.85"
          />
          {/* a couple of palm-trunk dots for character */}
          <circle cx="60" cy="205" r="4" className="text-island-800" fill="currentColor" />
          <circle cx="330" cy="210" r="4" className="text-island-800" fill="currentColor" />
        </g>

        {/* foreground ocean waves */}
        <g className="text-paper" fill="currentColor">
          <path d="M0 248 Q 100 236 200 248 T 400 248 L400 300 L0 300 Z" opacity="0.18" />
          <path d="M0 266 Q 100 256 200 266 T 400 266 L400 300 L0 300 Z" opacity="0.28" />
          <path d="M0 284 Q 100 276 200 284 T 400 284 L400 300 L0 300 Z" opacity="0.4" />
        </g>
      </svg>
    </div>
  )
}

// ── Welcome screen ─────────────────────────────────────────────────────────────

export default function Welcome() {
  const { container, item } = useEntrance()

  return (
    <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
      <IslandScene />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative max-w-2xl w-full text-center flex flex-col items-center gap-5"
      >
        {/* bobbing sun (decorative) */}
        <motion.div
          variants={item}
          className="text-8xl sm:text-9xl animate-bounce-soft drop-shadow-xl"
          style={{ animationIterationCount: 'infinite' }}
          aria-hidden="true"
        >
          🌞
        </motion.div>

        <motion.h1
          variants={item}
          className="text-display text-paper drop-shadow-[0_3px_6px_rgba(15,40,80,0.45)]"
        >
          SummerQuest
        </motion.h1>

        <motion.p
          variants={item}
          className="kid-text text-xl sm:text-2xl text-sky max-w-md"
        >
          An island adventure to keep your brain sharp this summer
        </motion.p>

        <motion.div variants={item} className="mt-2 animate-glow text-quest-400 rounded-2xl">
          <Button
            variant="primary"
            size="lg"
            to="/avatar"
            onClick={() => sfx.enter()}
            aria-label="Start your quest — create your avatar"
          >
            Start your quest →
          </Button>
        </motion.div>

        {/* low-emphasis grown-ups affordance */}
        <motion.div variants={item}>
          <Link
            to="/parent"
            onClick={() => sfx.click()}
            className="kid-text text-sm text-sky underline-offset-4 hover:underline inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px]"
          >
            <span aria-hidden="true">👋</span> Grown-ups start here
          </Link>
        </motion.div>

        <motion.p variants={item} className="mt-6 kid-text text-sm text-sky/90">
          For students entering 4th grade
        </motion.p>
      </motion.div>
    </div>
  )
}
