import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { GRADE_LABEL, GRADE_SHORT_LABEL, nextGradeShortLabel, type GradeLevel } from '../lib/gradeTiers'
import { OFFERED_GRADES } from '../lib/features'
import { sfx } from '../lib/sound'
import { Card, Button, BackButton } from '../components/ui'
import { useEntrance } from '../lib/motion'
import { useKeepAboveKeyboard, useKeyboardInset } from '../components/useViewport'
import { isListenMode } from '../lib/gradeBand'
import { creatureForEmoji } from '../lib/home/catalog'
import { guide } from '../guide/store'
import { SayAgainButton } from '../guide/SayAgainButton'
import type { VoiceRef } from '../voice/types'

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
  { name: 'Sunset', value: '#fb923c', say: 'orange' },
  { name: 'Berry', value: '#ec4899', say: 'pink' },
  { name: 'Lime', value: '#84cc16', say: 'green' },
  { name: 'Sky', value: '#38bdf8', say: 'blue' },
  { name: 'Grape', value: '#a855f7', say: 'purple' },
  { name: 'Coral', value: '#f43f5e', say: 'red' },
]

/**
 * K–1 (voice-first) first run: the voice walks the child through picking an
 * animal and a color, then points at the big Begin button. A grown-up may type
 * a name; left empty, the explorer is named after the animal. The voice never
 * says the name (the privacy policy), only the animal and the color.
 */
const PICK_ANIMAL: VoiceRef = { line: 'k-nav/pickAnimal' }
const PICK_COLOR: VoiceRef = { line: 'k-nav/pickColor' }
const TAP_BEGIN: VoiceRef = { line: 'k-nav/tapBegin' }
const animalLine = (emoji: string): VoiceRef | null => {
  const id = creatureForEmoji(emoji)?.id
  return id ? { line: `k-nav/animal-${id}` } : null
}
/** An empty name in K–1 becomes the animal's ("Fox"). */
function defaultExplorerName(emoji: string): string {
  return creatureForEmoji(emoji)?.name ?? 'Explorer'
}

/** What each grade practices (one line under its big "K" / "2nd" label). */
const GRADE_BLURB: Record<GradeLevel, string> = {
  0: 'Counting, shapes, letters',
  1: 'Add to 20, tens & ones, reading',
  2: 'Add & subtract, arrays, easy fractions',
  3: 'Times tables, fractions, bigger numbers',
  4: 'Big multiplication, harder fractions',
  5: 'Decimals, long division, fractions',
}

/** The grades this build offers (lib/features: 2nd–4th in the store build for now). */
const GRADES: Array<{ grade: GradeLevel; label: string; blurb: string }> = OFFERED_GRADES.map((grade) => ({
  grade,
  label: GRADE_SHORT_LABEL[grade],
  blurb: GRADE_BLURB[grade],
}))

/**
 * Cards per row for 3–6 grades: three in a row (today's 2nd–4th); four in a
 * row for four; rows of three for five or six. A phone takes two per row once
 * there are more than three, so each big label keeps a thumb-sized card.
 */
const GRADE_COLS =
  GRADES.length <= 3
    ? 'grid-cols-3'
    : GRADES.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-2 min-[480px]:grid-cols-3'

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
  const nameRowRef = useRef<HTMLDivElement>(null)
  const gradeRef = useRef<HTMLDivElement>(null)
  // While typing on a phone/tablet the on-screen keyboard covers the bottom of
  // the page: keep the name field and its Go button above it.
  const [typing, setTyping] = useState(false)
  const keyboard = useKeyboardInset()
  useKeepAboveKeyboard(nameRowRef, typing)

  // K–1: the name is optional (a grown-up may type it), and the voice guides the picks.
  const listen = grade !== null && isListenMode(grade)
  const animalName = defaultExplorerName(emoji)
  const canStart = grade !== null && (listen || name.trim().length > 0)
  const colorName = COLORS.find((c) => c.value === color)?.name ?? ''
  // (K–1) a color has been tapped: after the next animal, go straight to Begin
  const colorTapped = useRef(false)
  // (K–1) an animal has been tapped (before or after the grade): never ask for one again
  const animalTapped = useRef(false)
  // The grade grid stays open until a K–1 grade is picked; then it folds into one
  // line with a small "Change" button, so a child's stray tap on a grade card can't
  // switch the grade and undo what the voice has walked them through.
  const [gradeOpen, setGradeOpen] = useState(true)
  const gradeFolded = listen && !gradeOpen

  /** Bring a guide target into view, then say the line and point at it. */
  function guideTo(voice: VoiceRef, target: string, cue?: string) {
    document.querySelector(`[data-guide="${target}"]`)?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    void guide.show({ voice, target, cue })
  }

  // A grown-up picked K or 1st: the voice takes the child through the rest,
  // from the first step not done yet (a child who already tapped an animal
  // isn't asked for one again).
  useEffect(() => {
    if (!listen) return
    if (colorTapped.current) guideTo(TAP_BEGIN, 'avatar-begin', 'button')
    else if (animalTapped.current) guideTo(PICK_COLOR, 'avatar-colors', 'color')
    else guideTo(PICK_ANIMAL, 'avatar-animals', 'animal')
    return () => guide.clear({ forget: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen])

  async function pickAnimal(e: string) {
    sfx.click()
    setEmoji(e)
    animalTapped.current = true
    if (!listen) return
    const said = animalLine(e)
    if (said && !(await guide.say(said))) return
    if (colorTapped.current) guideTo(TAP_BEGIN, 'avatar-begin', 'button')
    else guideTo(PICK_COLOR, 'avatar-colors', 'color')
  }

  async function pickColor(c: (typeof COLORS)[number]) {
    sfx.click()
    setColor(c.value)
    colorTapped.current = true
    if (!listen) return
    if (!(await guide.say({ line: `k-nav/color-${c.say}` }))) return
    guideTo(TAP_BEGIN, 'avatar-begin', 'button')
  }

  function start() {
    if (!canStart) {
      // Helpful feedback instead of a dead button: pulse the field and focus it.
      sfx.wrong()
      setNudge(true)
      if (!name.trim()) {
        inputRef.current?.focus()
      } else {
        // Only the grade is missing: close the keyboard and bring the grade picker up.
        inputRef.current?.blur()
        gradeRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
      }
      window.setTimeout(() => setNudge(false), name.trim() ? 1600 : 500)
      return
    }
    sfx.victory()
    setAvatar({ emoji, color, name: name.trim() || animalName, grade: grade! })
    navigate('/world')
  }

  // The keyboard's Go/Next key and the Go button next to the field do what
  // "Begin adventure!" does: begin, or show what's still missing.
  // K–1: the field's button is a plain "OK" that just closes the keyboard, so
  // the big green "Begin adventure!" is the only button that starts.
  function submitName(e: FormEvent) {
    e.preventDefault()
    if (listen) {
      inputRef.current?.blur()
      return
    }
    start()
  }

  function pickGrade(g: GradeLevel) {
    sfx.click()
    setGrade(g)
    // (K–1: fold the grid away once the grown-up has picked)
    if (isListenMode(g)) setGradeOpen(false)
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
          {listen && <SayAgainButton />}
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
            <Card className="relative overflow-hidden p-5 sm:p-6 short:py-3 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-4">
              <div className="absolute left-1/2 sm:left-[30%] lg:left-1/2 top-24 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sunburst pointer-events-none" aria-hidden="true" />
              <motion.div
                key={emoji + color}
                initial={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="relative w-36 h-36 short:w-24 short:h-24 short:text-5xl rounded-full flex items-center justify-center text-7xl border-[4px] border-line shadow-[0_6px_0_0_var(--color-line)]"
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
                  {name.trim() || (listen ? animalName : 'Your name here')}
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
                  data-guide="avatar-animals"
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
                        onClick={() => void pickAnimal(e)}
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
                  data-guide="avatar-colors"
                  className="grid grid-cols-6 gap-1.5 min-[400px]:gap-3"
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
                        onClick={() => void pickColor(c)}
                        className={[
                          tileBase,
                          // (K–1: a finger-sized 64px)
                          listen ? 'min-h-16 h-16' : 'min-h-[52px] h-14',
                          'rounded-full flex items-center justify-center',
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
                <SectionLabel htmlFor="explorer-name">
                  {listen ? (
                    <>
                      Name <span className="text-ink-700 text-lg font-semibold">— grown-ups, if you like</span>
                    </>
                  ) : (
                    "What's your name?"
                  )}
                </SectionLabel>
                <form onSubmit={submitName} className="scroll-mt-4">
                  <div ref={nameRowRef} className="flex gap-2 sm:gap-3">
                    <input
                      id="explorer-name"
                      ref={inputRef}
                      type="text"
                      inputMode="text"
                      enterKeyHint={grade === null ? 'next' : 'go'}
                      autoComplete="off"
                      autoCapitalize="words"
                      autoCorrect="off"
                      spellCheck={false}
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 20))}
                      onFocus={() => setTyping(true)}
                      onBlur={() => setTyping(false)}
                      placeholder={listen ? animalName : 'Type your name'}
                      maxLength={20}
                      className={[
                        'min-w-0 flex-1 px-5 py-3 max-sm:px-4 max-sm:text-xl min-h-[60px] rounded-[1.25rem] text-2xl kid-text',
                        'text-ink-900 bg-cream-50 border-[3px] outline-none transition-colors placeholder:text-ink-500',
                        'focus:bg-paper focus:ring-4 focus:ring-ocean-600/50',
                        nudge && !name.trim() ? 'border-wrong-600 bg-wrong-50 animate-shake' : 'border-line',
                      ].join(' ')}
                    />
                    <button
                      type="submit"
                      // keep the keyboard up while the tap lands (it closes on its own if we move on)
                      onPointerDown={(e) => e.preventDefault()}
                      className={[
                        tileBase,
                        tileIdle,
                        'shrink-0 min-h-[60px] min-w-[60px] px-4 kid-text text-xl text-ink-900 bg-quest-300 hover:bg-quest-200',
                      ].join(' ')}
                    >
                      {grade === null ? 'Next ↓' : listen ? 'OK ✓' : 'Go! 🚀'}
                    </button>
                  </div>
                </form>
                {nudge && (
                  <p className="kid-text text-wrong-800 text-lg mt-2" role="alert">
                    {grade === null
                      ? 'Pick your grade to begin! 🎒'
                      : 'Type your name first to begin! ✏️'}
                  </p>
                )}
              </div>

              {/* Grade picker (sets the difficulty of every adventure) */}
              <div ref={gradeRef} className={nudge && grade === null && name.trim() ? 'rounded-[1.25rem] ring-4 ring-wrong-500 ring-offset-4 ring-offset-paper' : ''}>
                {/* (grown-ups answer this: the grade just FINISHED picks the quests, e.g. 3rd = times tables) */}
                <SectionLabel id="grade-label">
                  Which grade did your child just finish?{' '}
                  <span className="text-ink-700 text-lg font-semibold">— this picks the quests</span>
                </SectionLabel>
                {gradeFolded && grade !== null ? (
                  // K–1, once picked: one line, and a small Change button well away from Begin's path
                  <div className="flex flex-wrap items-center gap-3" data-grade-folded="">
                    <span className="relative kid-text font-bold text-2xl text-ink-900 bg-quest-300 border-[3px] border-line rounded-[1rem] px-4 py-1 shadow-ledge-sm">
                      {GRADE_SHORT_LABEL[grade]}
                    </span>
                    <span className="kid-text text-lg text-ink-800">
                      Finished {GRADE_SHORT_LABEL[grade]} · going into {nextGradeShortLabel(grade)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.click()
                        setGradeOpen(true)
                      }}
                      className="kid-text text-base text-ink-800 underline underline-offset-4 min-h-[44px] px-2 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
                    >
                      Change grade
                    </button>
                  </div>
                ) : (
                <div
                  role="radiogroup"
                  aria-labelledby="grade-label"
                  className={`grid ${GRADE_COLS} gap-3`}
                >
                  {GRADES.map((g) => {
                    const selected = grade === g.grade
                    return (
                      <button
                        key={g.grade}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={GRADE_LABEL[g.grade]}
                        onClick={() => pickGrade(g.grade)}
                        className={[
                          tileBase,
                          'min-h-[88px] px-2 py-3 flex flex-col items-center gap-1 text-center',
                          selected ? tileOn : tileIdle,
                        ].join(' ')}
                      >
                        <span className="kid-text font-bold text-3xl text-ink-900">{g.label}</span>
                        <span className="kid-text text-sm text-ink-800 leading-tight">going into {nextGradeShortLabel(g.grade)}</span>
                        <span className="text-sm text-ink-700 leading-tight">{g.blurb}</span>
                        {selected && <Check />}
                      </button>
                    )
                  })}
                </div>
                )}
              </div>
            </Card>

            {/* ── Primary CTA ──────────────────────────────────────────── */}
            <div className="flex justify-center lg:justify-end">
              <Button
                variant="success"
                size="lg"
                guide="avatar-begin"
                onClick={start}
                className={`!text-2xl !px-10 !min-h-[64px] ${!canStart ? 'opacity-70' : ''}`}
              >
                Begin adventure! 🚀
              </Button>
            </div>
            {/* K–1: room under Begin, so the voice's pointing hand sits below the
                button (on nothing tappable) instead of flipping up onto the card */}
            {listen && <div aria-hidden="true" className="h-36" data-begin-room="" />}
          </motion.div>
        </motion.div>
        {/* While the keyboard covers the bottom of the page, room to scroll the name field up above it. */}
        {typing && keyboard > 0 && <div aria-hidden="true" style={{ height: keyboard }} />}
      </div>
    </div>
  )
}
