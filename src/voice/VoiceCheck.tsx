import { useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import { browserVoiceEnv, loadVoiceManifest } from './env'
import { VoicePlayer, type PlayReport } from './player'
import { planVoice } from './playlist'
import { speechBackend } from './speech'

/**
 * Parent area → "Voice check": a tiny, grown-up-facing diagnostic for a real
 * device (the Fire tablet's Amazon WebView). It plays one recorded line (no
 * fallback, so a missing or broken clip shows as such) and one device-speech
 * line, and shows what the device offers: whether `speechSynthesis` exists,
 * how many voices it has, and whether the recorded clip loaded.
 */

const DEVICE_LINE = "This is the tablet's own voice."

interface SpeechInfo {
  engine: string
  available: boolean
  voices: number
  local: number
  english: number
}

function readSpeech(): SpeechInfo {
  const b = speechBackend()
  const voices = b.available() ? b.voices() : []
  return {
    engine: b.name,
    available: b.available(),
    voices: voices.length,
    local: voices.filter((v) => v.local).length,
    english: voices.filter((v) => v.lang.toLowerCase().startsWith('en')).length,
  }
}

function recordedStatus(r: PlayReport | null): string {
  if (!r) return 'not tried yet'
  if (r.clip === 'loaded') return `✓ loaded and played${r.duration ? ` (${r.duration.toFixed(1)} s)` : ''}`
  if (r.clip === 'missing') return '— no recording in this build yet'
  if (r.clip === 'error') return `✗ failed to play${r.detail ? ` (${r.detail})` : ''}`
  if (r.clip === 'blocked') return '✗ blocked until a tap (autoplay rule)'
  return 'loading…'
}

function deviceStatus(r: PlayReport | null): string {
  if (!r) return 'not tried yet'
  if (r.speech === 'started') return '✓ started speaking'
  if (r.speech === 'silent') return '✗ silent: the engine never started'
  if (r.speech === 'unavailable') return '✗ no device speech'
  if (r.speech === 'error') return `✗ error${r.detail ? `: ${r.detail}` : ''}`
  return 'starting…'
}

export default function VoiceCheck() {
  const [speech, setSpeech] = useState(readSpeech)
  const [clips, setClips] = useState<number | null>(null)
  const [recorded, setRecorded] = useState<PlayReport | null>(null)
  const [device, setDevice] = useState<PlayReport | null>(null)
  const [players] = useState(() => {
    const rec = new VoicePlayer(browserVoiceEnv(), { prefer: 'recorded' })
    rec.load(planVoice({ line: 'ui/voiceCheck' }))
    const dev = new VoicePlayer(browserVoiceEnv(), { prefer: 'speech' })
    dev.load({ caption: DEVICE_LINE, segments: [] })
    return { rec, dev }
  })

  useEffect(() => {
    players.rec.setReportListener((r) => setRecorded({ ...r }))
    players.dev.setReportListener((r) => setDevice({ ...r }))
    let live = true
    void loadVoiceManifest().then((m) => {
      if (live) setClips(Object.keys(m).length)
    })
    // voices often arrive late (and some WebViews never fire voiceschanged): look again
    const refresh = () => setSpeech(readSpeech())
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    synth?.addEventListener?.('voiceschanged', refresh)
    const timers = [500, 2000].map((ms) => window.setTimeout(refresh, ms))
    return () => {
      live = false
      synth?.removeEventListener?.('voiceschanged', refresh)
      for (const t of timers) window.clearTimeout(t)
      players.rec.setReportListener(null)
      players.dev.setReportListener(null)
      players.rec.stop()
      players.dev.stop()
    }
  }, [players])

  const rows: [string, string][] = [
    ['Device speech', speech.available ? `${speech.engine} present` : `✗ no ${speech.engine}`],
    ['Device voices', speech.available ? `${speech.voices} (${speech.local} on-device, ${speech.english} English)` : '—'],
    ['Recorded clips', clips === null ? 'checking…' : `${clips} in this build`],
    ['Recorded line', recordedStatus(recorded)],
    ['Device line', deviceStatus(device)],
  ]

  return (
    <div className="text-sm text-ink-700">
      <p className="mb-3">
        For grown-ups: checks how this device plays the voice. Recorded lines are clips inside the app; the device voice
        is the tablet&apos;s own text-to-speech, used only when a recording is missing.
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mb-4" aria-live="polite">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold text-ink-900">{k}</dt>
            <dd data-voice-check={k}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void players.rec.play()}>
          ▶ Recorded line
        </Button>
        <Button variant="ghost" onClick={() => void players.dev.play()}>
          ▶ Device voice
        </Button>
      </div>
    </div>
  )
}
