/**
 * Audio on phones and tablets. Browsers — iOS Safari above all — only start
 * sound from a user gesture, and on iOS each media element has to be started
 * inside one before it may play from a timer or after an await. This module:
 *
 * - keeps ONE shared <audio> element for lesson narration and "unlocks" it by
 *   playing a silent clip inside the first tap / click / key. src/lib/narration.ts
 *   then reuses it for every clip (claimNarrationAudio) by swapping its `src`,
 *   so a step's voice can start after the manifest fetch without a fresh gesture;
 * - wakes the effects AudioContext (src/lib/sound.ts) on touchend / pointerup /
 *   click / keydown, and again when the app returns from the background;
 * - primes speechSynthesis (the narration fallback) with one empty utterance;
 * - silences everything when the app goes to the background (app stores test
 *   that nothing plays while hidden): effects, the narration element and speech.
 *
 * Installed once from src/platform/web/boot.ts.
 */
import { resumeAudio, silenceAudio, unlockAudio } from '../../lib/sound'

type UnlockState = 'locked' | 'pending' | 'unlocked'

let shared: HTMLAudioElement | null = null
let state: UnlockState = 'locked'
let owner: object | null = null
let speechPrimed = false
let silentSrc: string | null = null

/** ~0.1 s of silence as a tiny WAV data URI (mono, 8 kHz, 8-bit). */
function silentWav(): string {
  if (silentSrc) return silentSrc
  const samples = 800
  const bytes = new Uint8Array(44 + samples)
  const v = new DataView(bytes.buffer)
  const ascii = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i)
  }
  ascii(0, 'RIFF')
  v.setUint32(4, 36 + samples, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  v.setUint32(16, 16, true) // fmt chunk size
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, 8000, true) // sample rate
  v.setUint32(28, 8000, true) // byte rate
  v.setUint16(32, 1, true) // block align
  v.setUint16(34, 8, true) // bits per sample
  ascii(36, 'data')
  v.setUint32(40, samples, true)
  bytes.fill(128, 44) // 8-bit PCM silence
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  silentSrc = `data:audio/wav;base64,${btoa(bin)}`
  return silentSrc
}

/** Start the shared element inside this gesture (a silent clip), so it may play later without one. */
function unlockNarrationElement() {
  if (state !== 'locked' || typeof Audio === 'undefined') return
  const el = (shared ??= new Audio())
  if (!el.paused) return
  el.preload = 'auto'
  el.src = silentWav()
  state = 'pending'
  let started: Promise<void> | undefined
  try {
    started = el.play()
  } catch {
    state = 'locked'
    return
  }
  Promise.resolve(started).then(
    () => {
      state = 'unlocked'
      if (!owner) el.pause()
    },
    (e: unknown) => {
      // AbortError: narration already swapped its clip in, so this play() was allowed.
      if (e instanceof DOMException && e.name === 'AbortError') state = 'unlocked'
      // NotAllowedError etc.: not an activating gesture after all — try again on the next one.
      else if (state === 'pending') state = 'locked'
    },
  )
}

/** Speak one empty, silent utterance inside the first gesture (iOS gates speechSynthesis too). */
function primeSpeech() {
  if (speechPrimed) return
  speechPrimed = true
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return
  if (synth.speaking || synth.pending) return // already talking: nothing to prime
  try {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    synth.speak(u)
  } catch {
    /* no voice support: narration falls back to its silent timeline */
  }
}

/**
 * The shared narration element, once a gesture has unlocked it (null before
 * that: create a fresh `new Audio()` as usual). `by` identifies the caller,
 * which owns the element until another caller claims it.
 */
export function claimNarrationAudio(by: object): HTMLAudioElement | null {
  if (!shared || state === 'locked') return null
  owner = by
  return shared
}

/** May `by` still pause / play `audio`? A private element always; the shared one only while `by` owns it. */
export function controlsNarrationAudio(audio: HTMLAudioElement, by: object): boolean {
  return audio !== shared || owner === by
}

/** `by` is done with the shared element (it stays unlocked for the next clip). */
export function releaseNarrationAudio(by: object) {
  if (owner === by) owner = null
}

// Events that carry user activation on every engine: audio may start inside these.
// (A touch pointerdown does NOT on iOS — the tap's touchend / pointerup / click does.)
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const

function onGesture(e: Event) {
  unlockAudio() // cheap; resumes the effects context whenever it is not running
  const activating = e.type !== 'pointerdown' || (e as PointerEvent).pointerType === 'mouse'
  if (!activating) return
  unlockNarrationElement()
  primeSpeech()
}

/**
 * Going to the background: cut the effects, pause the narration element and
 * stop browser speech (lesson narration and the mini-games' chants). Only the
 * effects context is woken again on return (onLifecycle); the lesson player
 * resumes its own narration together with its clock (useNarration in
 * src/lib/narration.ts), so the voice and the visuals stay in step.
 */
function silenceForBackground() {
  silenceAudio()
  // (a silent unlock clip still starting is left to finish, so the unlock completes)
  if (shared && !shared.paused && (owner || state === 'unlocked')) {
    try {
      shared.pause()
    } catch {
      /* nothing to pause */
    }
  }
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* no speech support */
  }
}

function onLifecycle(e: Event) {
  if (e.type === 'pagehide' || document.visibilityState === 'hidden') silenceForBackground()
  else if (document.visibilityState === 'visible') resumeAudio()
}

let uninstall: (() => void) | null = null

/** Listen for the gestures that unlock audio (idempotent). Returns an uninstaller. */
export function installAudioUnlock(): () => void {
  if (uninstall) return uninstall
  if (typeof window === 'undefined') return () => {}
  const opts: AddEventListenerOptions = { capture: true, passive: true }
  for (const type of GESTURES) window.addEventListener(type, onGesture, opts)
  document.addEventListener('visibilitychange', onLifecycle)
  window.addEventListener('pagehide', onLifecycle)
  window.addEventListener('pageshow', onLifecycle)
  uninstall = () => {
    for (const type of GESTURES) window.removeEventListener(type, onGesture, opts)
    document.removeEventListener('visibilitychange', onLifecycle)
    window.removeEventListener('pagehide', onLifecycle)
    window.removeEventListener('pageshow', onLifecycle)
    uninstall = null
  }
  return uninstall
}

/** Tests only: forget the shared element and every unlock. */
export function resetAudioUnlockForTests() {
  uninstall?.()
  shared = null
  state = 'locked'
  owner = null
  speechPrimed = false
}
