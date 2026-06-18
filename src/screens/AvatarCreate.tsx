import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { Card, Button, BackButton } from '../components/ui'
import { useEntrance, hoverPop, tap } from '../lib/motion'

const EMOJIS = ['🦊', '🐯', '🦁', '🐻', '🐼', '🐸', '🦉', '🐲', '🦄', '🐙', '🦖', '🐉']
const COLORS = [
  { name: 'Sunset', value: '#fb923c' },
  { name: 'Berry', value: '#ec4899' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Sky', value: '#38bdf8' },
  { name: 'Grape', value: '#a855f7' },
  { name: 'Coral', value: '#f43f5e' },
]

export default function AvatarCreate() {
  const navigate = useNavigate()
  const setAvatar = useProgress((s) => s.setAvatar)
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [color, setColor] = useState(COLORS[0].value)
  const [name, setName] = useState('')
  // Nudges the disabled CTA / name field when the user taps "Begin" too early.
  const [nudge, setNudge] = useState(false)

  const reduced = useReducedMotion()
  const { container, item } = useEntrance()
  const inputRef = useRef<HTMLInputElement>(null)

  const canStart = name.trim().length > 0
  const colorName = COLORS.find((c) => c.value === color)?.name ?? ''

  function start() {
    if (!canStart) {
      // Helpful feedback instead of a dead button: pulse the field and focus it.
      sfx.wrong()
      setNudge(true)
      inputRef.current?.focus()
      window.setTimeout(() => setNudge(false), 500)
      return
    }
    sfx.victory()
    setAvatar({ emoji, color, name: name.trim() })
    navigate('/map')
  }

  function surprise() {
    sfx.coin()
    const e = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
    const c = COLORS[Math.floor(Math.random() * COLORS.length)].value
    setEmoji(e)
    setColor(c)
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="max-w-3xl w-full mx-auto flex flex-col gap-4">

        {/* ── Back + title ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <BackButton to="/" label="Back" />
          <h1 className="kid-text text-3xl sm:text-4xl flex-1 text-sky drop-shadow-lg">
            Create your explorer
          </h1>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {/* ── Live preview ───────────────────────────────────────────── */}
          <motion.div variants={item} className="flex flex-col items-center gap-2">
            <motion.div
              key={emoji + color}
              initial={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-32 h-32 rounded-full flex items-center justify-center text-7xl ring-8 ring-white/40"
              style={{
                background: color,
                boxShadow: `0 0 28px ${color}, 0 10px 24px -4px rgba(0,0,0,0.25)`,
              }}
            >
              <span aria-hidden="true">{emoji}</span>
            </motion.div>
            <p className="kid-text text-2xl text-sky min-h-[2rem]" aria-live="polite">
              {name.trim() || 'Your name here'}
            </p>
          </motion.div>

          {/* ── Chooser card ───────────────────────────────────────────── */}
          <motion.div variants={item}>
            <Card tone="quest" accent className="p-5 sm:p-6 flex flex-col gap-5">

              {/* Surprise me randomizer */}
              <div className="flex justify-center">
                <Button variant="secondary" size="md" onClick={surprise}>
                  Surprise me 🎲
                </Button>
              </div>

              {/* Character picker */}
              <div>
                <label id="char-label" className="kid-text text-xl text-ink-900 block mb-2">
                  Pick a character
                </label>
                <div
                  role="radiogroup"
                  aria-labelledby="char-label"
                  className="grid grid-cols-4 sm:grid-cols-6 gap-2"
                >
                  {EMOJIS.map((e) => {
                    const selected = emoji === e
                    return (
                      <motion.button
                        key={e}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`Character ${e}`}
                        onClick={() => {
                          sfx.click()
                          setEmoji(e)
                        }}
                        whileHover={hoverPop}
                        whileTap={tap}
                        className={[
                          'min-h-[44px] aspect-square text-3xl sm:text-4xl rounded-2xl',
                          'flex items-center justify-center transition-colors',
                          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-quest-500',
                          selected
                            ? 'bg-quest-200 ring-4 ring-quest-500'
                            : 'bg-ink-900/5 hover:bg-ink-900/10',
                        ].join(' ')}
                      >
                        <span aria-hidden="true">{e}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label id="color-label" className="kid-text text-xl text-ink-900 block mb-2">
                  Pick a color{' '}
                  <span className="text-ink-700 text-base font-normal">— {colorName}</span>
                </label>
                <div
                  role="radiogroup"
                  aria-labelledby="color-label"
                  className="grid grid-cols-4 sm:grid-cols-6 gap-2"
                >
                  {COLORS.map((c) => {
                    const selected = color === c.value
                    return (
                      <motion.button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={c.name}
                        onClick={() => {
                          sfx.click()
                          setColor(c.value)
                        }}
                        whileHover={hoverPop}
                        whileTap={tap}
                        className={[
                          'min-h-[44px] h-12 rounded-2xl transition-shadow',
                          'flex items-center justify-center',
                          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-900/40',
                          selected ? 'ring-4 ring-ink-900' : 'ring-2 ring-ink-900/10',
                        ].join(' ')}
                        style={{ background: c.value }}
                      >
                        {selected && (
                          <span className="text-white text-2xl drop-shadow" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Name input */}
              <div>
                <label htmlFor="explorer-name" className="kid-text text-xl text-ink-900 block mb-2">
                  What's your name?
                </label>
                <input
                  id="explorer-name"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 20))}
                  placeholder="Type your name"
                  maxLength={20}
                  className={[
                    'w-full px-4 py-3 min-h-[52px] rounded-2xl text-2xl kid-text',
                    'text-ink-900 bg-white border-2 outline-none transition-colors',
                    'focus:ring-4 focus:ring-quest-500',
                    nudge ? 'border-wrong-500 animate-shake' : 'border-ink-900/15',
                  ].join(' ')}
                />
                {nudge && (
                  <p className="kid-text text-wrong-600 text-base mt-1" role="alert">
                    Type your name first to begin! ✏️
                  </p>
                )}
              </div>
            </Card>
          </motion.div>

          {/* ── Primary CTA ────────────────────────────────────────────── */}
          <motion.div variants={item} className="flex justify-center">
            <Button variant="success" size="lg" onClick={start} className={!canStart ? 'opacity-70' : ''}>
              Begin adventure! 🚀
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
