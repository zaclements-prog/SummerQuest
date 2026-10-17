import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useProgress } from '../store/progress'
import type { GradeLevel } from '../lib/gradeTiers'
import { sfx } from '../lib/sound'
import { Card, Button, BackButton } from '../components/ui'
import { useEntrance } from '../lib/motion'

// A selectable toon tile: outlined paper that lifts on hover and sinks when
// pressed; the chosen one turns sunny with a check badge.
const tileBase = [
  'relative border-[3px] border-line rounded-[1.25rem] transition-[translate,box-shadow,background-color] duration-100',
  'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
  'active:translate-y-[3px] active:shadow-ledge-sm',
].join(' ')
const tileIdle = 'bg-paper shadow-ledge hover:bg-cream-100 hover:-translate-y-0.5'
const tileOn = 'bg-quest-300 shadow-ledge'

function Check() {
  return (
    <span
      className="absolute -top-2.5 -right-2.5 grid place-items-center w-7 h-7 rounded-full bg-correct-400 border-2 border-line text-sm kid-text text-ink-900"
      aria-hidden="true"
    >
      ✓
    </span>
  )
}

function SectionLabel({ id, children, htmlFor }: { id?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <label id={id} htmlFor={htmlFor} className="kid-text font-bold text-2xl text-ink-900 block mb-3">
      {children}
    </label>
  )
}

const EMOJIS = ['🦊', '🐯', '🦁', '🐻', '🐼', '🐸', '🦉', '🐲', '🦄', '🐙', '🦖', '🐉']
const COLORS = [
  { name: 'Sunset', value: '#fb923c' },
  { name: 'Berry', value: '#ec4899' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Sky', value: '#38bdf8' },
  { name: 'Grape', value: '#a855f7' },
  { name: 'Coral', value: '#f43f5e' },
]

const GRADES: Array<{ grade: GradeLevel; label: string; blurb: string }> = [
  { grade: 2, label: '2nd', blurb: 'Add & subtract, arrays, easy fractions' },
  { grade: 3, label: '3rd', blurb: 'Times tables, fractions, bigger numbers' },
  { grade: 4, label: '4th', blurb: 'Big multiplication, harder fractions' },
]

export default function AvatarCreate() {
  const navigate = useNavigate()
  const setAvatar = useProgress((s) => s.setAvatar)
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [color, setColor] = useState(COLORS[0].value)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<GradeLevel | null>(null)
  // Nudges the disabled CTA / name field when the user taps "Begin" too early.
  const [nudge, setNudge] = useState(false)

  const reduced = useReducedMotion()
  const { container, item } = useEntrance()
  const inputRef = useRef<HTMLInputElement>(null)

  const canStart = name.trim().length > 0 && grade !== null
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
    setAvatar({ emoji, color, name: name.trim(), grade: grade! })
    navigate('/world')
  }

  function surprise() {
    sfx.coin()
    const e = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
    const c = COLORS[Math.floor(Math.random() * COLORS.length)].value
    setEmoji(e)
    setColor(c)
  }

  return (
    <div className="flex-1 flex flex-col px-4 pt-5 pb-10 sm:px-6 sm:pt-6">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-5">

        {/* ── Back + title ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BackButton to="/" label="Back" />
          <h1 className="kid-text font-bold text-3xl sm:text-4xl flex-1 text-sky">
            Create your explorer
          </h1>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:flex-row lg:items-start gap-5"
        >
          {/* ── Live preview ───────────────────────────────────────────── */}
          <motion.div variants={item} className="lg:w-80 lg:sticky lg:top-6 shrink-0">
            <Card className="relative overflow-hidden p-5 sm:p-6 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-4">
              <div className="absolute left-1/2 sm:left-[30%] lg:left-1/2 top-24 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sunburst pointer-events-none" aria-hidden="true" />
              <motion.div
                key={emoji + color}
                initial={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="relative w-36 h-36 rounded-full flex items-center justify-center text-7xl border-[4px] border-line shadow-[0_6px_0_0_var(--color-line)]"
                style={{ background: color }}
              >
                <span className="absolute left-[20%] top-[11%] w-[22%] h-[9%] rounded-full bg-white/35 -rotate-[20deg]" aria-hidden="true" />
                <span className="relative" aria-hidden="true">{emoji}</span>
              </motion.div>
              <div className="relative flex flex-col items-center gap-4 min-w-0 max-w-full">
                <p
                  className="kid-text font-bold text-2xl text-ink-900 min-h-[2.75rem] max-w-full truncate bg-paper border-[3px] border-line rounded-full px-5 py-0.5 shadow-ledge-sm"
                  aria-live="polite"
                >
                  {name.trim() || 'Your name here'}
                </p>
                <Button variant="secondary" size="md" onClick={surprise}>
                  Surprise me 🎲
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* ── Chooser card ───────────────────────────────────────────── */}
          <motion.div variants={item} className="flex-1 min-w-0 flex flex-col gap-5">
            <Card className="p-5 sm:p-6 flex flex-col gap-6">

              {/* Character picker */}
              <div>
                <SectionLabel id="char-label">Pick a character</SectionLabel>
                <div
                  role="radiogroup"
                  aria-labelledby="char-label"
                  className="grid grid-cols-4 sm:grid-cols-6 gap-3"
                >
                  {EMOJIS.map((e) => {
                    const selected = emoji === e
                    return (
                      <button
                        key={e}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`Character ${e}`}
                        onClick={() => {
                          sfx.click()
                          setEmoji(e)
                        }}
                        className={[
                          tileBase,
                          'min-h-[56px] aspect-square text-[clamp(2.1rem,5.4vw,3.1rem)] flex items-center justify-center',
                          selected ? tileOn : tileIdle,
                        ].join(' ')}
                      >
                        <span aria-hidden="true">{e}</span>
                        {selected && <Check />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <SectionLabel id="color-label">
                  Pick a color{' '}
                  <span className="text-ink-700 text-lg font-semibold">— {colorName}</span>
                </SectionLabel>
                <div
                  role="radiogroup"
                  aria-labelledby="color-label"
                  className="grid grid-cols-6 gap-3"
                >
                  {COLORS.map((c) => {
                    const selected = color === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={c.name}
                        onClick={() => {
                          sfx.click()
                          setColor(c.value)
                        }}
                        className={[
                          tileBase,
                          'min-h-[52px] h-14 rounded-full flex items-center justify-center',
                          selected ? 'shadow-ledge ring-4 ring-paper ring-inset' : 'shadow-ledge hover:-translate-y-0.5',
                        ].join(' ')}
                        style={{ background: c.value }}
                      >
                        {selected && <Check />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name input */}
              <div>
                <SectionLabel htmlFor="explorer-name">What's your name?</SectionLabel>
                <input
                  id="explorer-name"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 20))}
                  placeholder="Type your name"
                  maxLength={20}
                  className={[
                    'w-full px-5 py-3 min-h-[60px] rounded-[1.25rem] text-2xl kid-text',
                    'text-ink-900 bg-cream-50 border-[3px] outline-none transition-colors placeholder:text-ink-500',
                    'focus:bg-paper focus:ring-4 focus:ring-ocean-600/50',
                    nudge ? 'border-wrong-600 bg-wrong-50 animate-shake' : 'border-line',
                  ].join(' ')}
                />
                {nudge && (
                  <p className="kid-text text-wrong-800 text-lg mt-2" role="alert">
                    {grade === null
                      ? 'Pick your grade to begin! 🎒'
                      : 'Type your name first to begin! ✏️'}
                  </p>
                )}
              </div>

              {/* Grade picker (sets the difficulty of every adventure) */}
              <div>
                <SectionLabel id="grade-label">
                  What grade are you finishing?{' '}
                  <span className="text-ink-700 text-lg font-semibold">— this picks your quests</span>
                </SectionLabel>
                <div
                  role="radiogroup"
                  aria-labelledby="grade-label"
                  className="grid grid-cols-3 gap-3"
                >
                  {GRADES.map((g) => {
                    const selected = grade === g.grade
                    return (
                      <button
                        key={g.grade}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${g.label} grade`}
                        onClick={() => {
                          sfx.click()
                          setGrade(g.grade)
                        }}
                        className={[
                          tileBase,
                          'min-h-[88px] px-2 py-3 flex flex-col items-center gap-1 text-center',
                          selected ? tileOn : tileIdle,
                        ].join(' ')}
                      >
                        <span className="kid-text font-bold text-3xl text-ink-900">{g.label}</span>
                        <span className="text-sm text-ink-700 leading-tight">{g.blurb}</span>
                        {selected && <Check />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* ── Primary CTA ──────────────────────────────────────────── */}
            <div className="flex justify-center lg:justify-end">
              <Button
                variant="success"
                size="lg"
                onClick={start}
                className={`!text-2xl !px-10 !min-h-[64px] ${!canStart ? 'opacity-70' : ''}`}
              >
                Begin adventure! 🚀
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
