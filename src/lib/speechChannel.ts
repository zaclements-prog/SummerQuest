/**
 * One voice at a time. Lesson narration (src/lib/narration.ts) and voice
 * lines (src/voice/useVoice.ts) both talk through the same speaker, the same
 * shared <audio> element and the same browser speech queue, so whoever starts
 * speaking takes this channel and the previous speaker is told to stop first:
 * a new line interrupts the one before it, and a voice line and the lesson
 * narration never talk over each other.
 *
 * `by` is any object identifying a speaker (the same one it uses with
 * claimNarrationAudio in src/platform/web/audioUnlock.ts).
 */

let holder: object | null = null
let onInterrupt: (() => void) | null = null

/**
 * `by` is about to speak. The current holder (if another speaker) is
 * interrupted BEFORE the channel changes hands, so it can still silence its
 * own speech; `interrupt` is what to call when someone else takes over.
 */
export function takeSpeechChannel(by: object, interrupt: () => void): void {
  if (holder && holder !== by) {
    const prev = onInterrupt
    try {
      prev?.()
    } catch {
      /* a speaker that fails to stop must not stop the next one */
    }
  }
  holder = by
  onInterrupt = interrupt
}

/** `by` stopped speaking (no-op unless it holds the channel). */
export function releaseSpeechChannel(by: object): void {
  if (holder !== by) return
  holder = null
  onInterrupt = null
}

/** Is someone OTHER than `by` speaking? (Then `by` must not cancel the shared speech queue.) */
export function speechChannelHeldByOther(by: object): boolean {
  return holder !== null && holder !== by
}

/** Tests only. */
export function resetSpeechChannelForTests(): void {
  holder = null
  onInterrupt = null
}
