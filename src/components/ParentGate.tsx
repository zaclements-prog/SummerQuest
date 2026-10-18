import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './ui/Modal'
import Button from './ui/Button'
import type { ButtonVariant } from './ui/Button'
import { sfx } from '../lib/sound'
import { lockRemainingMs, submitAnswer, withNewQuestion, type GateState } from '../lib/parentGate'
import { currentGate, markParentGatePassed, parentGateOpen, saveGate } from '../lib/parentGateSession'
import { useProgress } from '../store/progress'

interface ParentGateProps {
  open: boolean
  /** The grown-up answered right (the gate then stays open for 10 minutes). */
  onPass: () => void
  /** Back, Escape or a tap on the scrim. */
  onCancel: () => void
  /** What happens next (and any choice to make first, e.g. the new grade). */
  children?: ReactNode
  /** The medallion over the title. */
  emoji?: string
  /** The answer button (default "Continue"). */
  passLabel?: string
  passVariant?: ButtonVariant
  /** Keep the answer button off (e.g. until a grade is picked). */
  passDisabled?: boolean
}

/*
 * The grown-up check ("parental gate"): "Grown-ups only" and the product of two
 * numbers from 13–29, typed into a number field (the rules, lockout and the
 * 10-minute pass are in src/lib/parentGate.ts). In the toon dialog shell, with
 * 48px+ targets; the shared Modal keeps it above the on-screen keyboard.
 */
export default function ParentGate({ open, onCancel, ...rest }: ParentGateProps) {
  return (
    <Modal open={open} onClose={onCancel} label="Grown-ups only" role="alertdialog" size="md">
      {/* mounted only while open: every opening asks a new question */}
      <GateForm onCancel={onCancel} {...rest} />
    </Modal>
  )
}

function GateForm({
  onPass,
  onCancel,
  children,
  emoji = '🔒',
  passLabel = 'Continue',
  passVariant = 'primary',
  passDisabled = false,
}: Omit<ParentGateProps, 'open'>) {
  // Misses and a lockout carry over from the last time it was open (closing it doesn't reset them).
  const [gate, setGate] = useState<GateState>(() => withNewQuestion(currentGate()))
  const [answer, setAnswer] = useState('')
  const [missed, setMissed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const lockMs = lockRemainingMs(gate, now)
  const locked = lockMs > 0

  // Locked: tick the countdown; the answer field comes back when it runs out.
  useEffect(() => {
    if (!locked) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [locked])

  // Focus the field once the dialog has popped in (and again after a lockout):
  // a tablet's number pad comes straight up.
  useEffect(() => {
    if (locked) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [locked])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (passDisabled) return
    const t = Date.now()
    const { state, result } = submitAnswer(gate, answer, t)
    saveGate(state)
    setGate(state)
    setNow(t)
    if (result === 'blank') {
      inputRef.current?.focus()
      return
    }
    setAnswer('')
    if (result === 'pass') {
      markParentGatePassed(t)
      onPass()
      return
    }
    sfx.wrong()
    setMissed(result === 'wrong')
    if (result === 'wrong') inputRef.current?.focus()
  }

  const { a, b } = gate.question
  const seconds = Math.ceil(lockMs / 1000)

  return (
    <form onSubmit={submit} noValidate className="p-6 sm:p-7 short:p-5 text-center">
      <div
        className="mx-auto mb-3 grid place-items-center w-20 h-20 short:w-14 short:h-14 short:text-3xl short:mb-2 rounded-full bg-cream-100 border-[3px] border-line text-4xl"
        aria-hidden="true"
      >
        {locked ? '⏳' : emoji}
      </div>
      <h2 className="kid-text font-bold text-2xl text-ink-900 mb-2 leading-tight">Grown-ups only</h2>
      {children && <div className="text-ink-700 text-base mb-4">{children}</div>}

      {locked ? (
        <p
          role="status"
          className="kid-text text-xl text-ink-900 rounded-2xl bg-cream-100 border-[3px] border-line/20 px-4 py-4 mb-5"
        >
          Too many tries. Try again in <span className="tabular-nums">{seconds}</span> seconds.
        </p>
      ) : (
        <label className="block mb-5">
          <span className="kid-text text-2xl text-ink-900 tabular-nums">
            What is {a} × {b}?
          </span>
          {/* 30px text: iOS zooms the page into any field under 16px. */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={4}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value.replace(/\D/g, '').slice(0, 4))
              setMissed(false)
            }}
            className="mt-3 w-full rounded-2xl border-[3px] border-line bg-paper px-4 min-h-[60px] text-3xl text-center tabular-nums tracking-wider kid-text text-ink-900 outline-none focus:ring-4 focus:ring-ocean-600/60"
          />
          {missed && (
            <span role="alert" className="block mt-2 kid-text text-base text-wrong-800">
              Not quite. Here's a new one.
            </span>
          )}
        </label>
      )}

      <div className="flex flex-col-reverse sm:flex-row short:flex-row gap-3 justify-center">
        <div className="flex sm:flex-1 short:flex-1">
          <Button variant="ghost" size="md" className="flex-1 justify-center" onClick={onCancel}>
            ← Back
          </Button>
        </div>
        <Button
          type="submit"
          variant={passVariant}
          size="md"
          className="justify-center sm:flex-1 short:flex-1"
          disabled={locked || passDisabled}
        >
          {passLabel}
        </Button>
      </div>
    </form>
  )
}

/**
 * Route guard for /parent: the grown-up check comes first, so typing the URL
 * (or the Welcome screen's "Grown-ups start here") can't skip it. Backing out
 * returns to the game, or to the welcome screen before there's a player.
 */
export function RequireParent({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const hasPlayer = useProgress((s) => !!s.player)
  const [passed, setPassed] = useState(() => parentGateOpen())
  if (passed) return <>{children}</>
  return (
    <ParentGate
      open
      onPass={() => setPassed(true)}
      onCancel={() => navigate(hasPlayer ? '/world' : '/', { replace: true })}
    />
  )
}
