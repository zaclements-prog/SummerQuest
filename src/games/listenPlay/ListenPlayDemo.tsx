import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TopBar } from '../../components/ui'
import { guide, useGuideCaption } from '../../guide/store'
import { SayAgainButton } from '../../guide/SayAgainButton'
import type { Picture } from '../../lib/problem'
import { createProvider, type ProviderConfig } from '../../lib/providers'
import type { KCountingItem } from '../../lib/providers/kCounting'
import type { KShapeKind, KShapesMode } from '../../lib/providers/kShapes'
import type { KLettersMode } from '../../lib/providers/kLetters'
import type { GameResult } from '../../screens/GameRunner'
import { DragToMake } from './DragToMake'
import ListenPlay from './ListenPlay'
import { ListenResultCard } from './ListenResultCard'
import { PictureArt, PictureCard } from './PictureCard'
import { TapToCount } from './TapToCount'

/**
 * DEV ONLY (/dev/listen-play, routed only when import.meta.env.DEV): the
 * Listen & Play kit on its own, with any of the kindergarten providers (the
 * K–1 stage sets play them through the GameRunner too).
 *
 *   ?tab=play|count|drag|pictures|results|marker   (default play)
 *   ?k=counting|shapes|letters             (default counting)
 *   ?mode=count|compare · name2d|flatSolid|hunt · findUpper|matchCase|firstSound
 *   ?kind=howMany|findGroup|more|fewer|same|bigger · name|flat|solid|nameSolid|withSides|noCorners|howManySides   (one question shape)
 *
 * The voice is still the silent timeline stub, so a caption pill at the bottom
 * shows what the narrator is saying.
 */
const TABS = ['play', 'count', 'drag', 'pictures', 'results', 'marker'] as const
// (the 3D tab pulls in three.js: only when opened)
const MarkerDemo = lazy(() => import('./MarkerDemo'))
type Tab = (typeof TABS)[number]

export default function ListenPlayDemo() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'play'
  const kind = params.get('kind') as KCountingItem | null
  const k = params.get('k')
  const mode = params.get('mode') ?? undefined
  const config: ProviderConfig =
    k === 'shapes'
      ? { kind: 'kShapes', mode: mode as KShapesMode | undefined, kinds: kind ? [kind as unknown as KShapeKind] : undefined }
      : k === 'letters'
        ? { kind: 'kLetters', mode: mode as KLettersMode | undefined, confusablesAfter: 3 }
        : { kind: 'kCounting', mode: mode === 'compare' ? 'compare' : 'count', kinds: kind ? [kind] : undefined }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        back={{ label: 'Quit', to: '/' }}
        icon="🍎"
        title=""
        right={
          <nav className="flex gap-1 flex-wrap justify-end max-w-[40vw]">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setParams((p) => {
                  p.set('tab', t)
                  return p
                })}
                className={`text-xs rounded-full border-2 border-line px-2 py-0.5 ${t === tab ? 'bg-quest-300' : 'bg-paper'}`}
              >
                {t}
              </button>
            ))}
          </nav>
        }
      />
      {tab === 'play' && <PlayTab config={config} />}
      {tab === 'count' && <CountTab />}
      {tab === 'drag' && <DragTab />}
      {tab === 'pictures' && <PicturesTab />}
      {tab === 'results' && <ListenResultCard stars={2} coins={14} onReplay={() => {}} onNext={() => {}} />}
      {tab === 'marker' && (
        <Suspense fallback={null}>
          <MarkerDemo />
        </Suspense>
      )}
      <Caption />
      <Link to="/" className="sr-only">
        home
      </Link>
    </div>
  )
}

function PlayTab({ config }: { config: ProviderConfig }) {
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<GameResult | null>(null)
  const key = JSON.stringify(config)
  const provider = useMemo(() => createProvider(JSON.parse(key) as ProviderConfig), [key])
  if (result) {
    return (
      <ListenResultCard
        stars={result.stars}
        coins={result.correct * 2 + result.stars * 5}
        onReplay={() => {
          setResult(null)
          setRound((r) => r + 1)
        }}
        onNext={() => {
          setResult(null)
          setRound((r) => r + 1)
        }}
      />
    )
  }
  return <ListenPlay key={round} provider={provider} params={{ questionCount: 5 }} onComplete={setResult} onExit={() => {}} />
}

function CountTab() {
  const [round, setRound] = useState(0)
  useEffect(() => {
    void guide.show({ voice: { line: 'listen/tapToCount' }, target: 'lp-count', hand: 'tap', pad: 6 })
    return () => guide.clear({ forget: true })
  }, [round])
  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
      <div className="py-1">
        <SayAgainButton />
      </div>
      <div className="relative flex-1 min-h-48 bg-paper border-[3px] border-line rounded-[2rem] shadow-card lp-picture-panel">
        <div className="absolute inset-[3%]">
          <TapToCount key={round} count={6} emoji="🐞" onDone={() => window.setTimeout(() => setRound((r) => r + 1), 1500)} />
        </div>
      </div>
    </div>
  )
}

function DragTab() {
  const [round, setRound] = useState(0)
  useEffect(() => {
    void guide.sequence([
      { voice: { template: 'k-math/putInBowl', slots: { n: 5, thing: 'fish' } }, target: 'lp-tray', hand: false, pad: 4 },
      { target: 'lp-bowl', cue: 'bowl', hand: 'drag', from: 'lp-tray', pad: 4 },
    ])
    return () => guide.clear({ forget: true })
  }, [round])
  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
      <div className="py-1">
        <SayAgainButton />
      </div>
      <div className="relative flex-1 min-h-64">
        <DragToMake
          className="!absolute inset-0"
          key={round}
          target={5}
          emoji="🐟"
          onDone={() => {
            void guide.say({ line: 'ui/greatJob' }).then(() => window.setTimeout(() => setRound((r) => r + 1), 1200))
          }}
        />
      </div>
    </div>
  )
}

const GALLERY: Picture[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((n): Picture => ({ kind: 'numeral', n })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20].map((count, i): Picture => ({ kind: 'group', count, emoji: ['🍎', '⭐', '🐟', '🦆', '⚽', '🌼', '🐝', '🚗', '🍪', '🐸', '🍎', '⭐'][i] })),
  ...[3, 7, 10, 16].map((count): Picture => ({ kind: 'tenFrame', count })),
  ...(['circle', 'square', 'triangle', 'rectangle', 'hexagon', 'oval', 'star', 'cube', 'sphere', 'cone', 'cylinder'] as const).map((shape): Picture => ({ kind: 'shape', shape })),
  ...['A', 'b', 'M', 's'].map((ch): Picture => ({ kind: 'letter', ch })),
  ...['cat', 'the', 'see', 'jump'].map((text): Picture => ({ kind: 'word', text })),
  ...['🐶', '🌞', '🚀'].map((emoji): Picture => ({ kind: 'emoji', emoji })),
  { kind: 'clock', hour: 3, minute: 0 },
  { kind: 'clock', hour: 7, minute: 30 },
]

function PicturesTab() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(96px,1fr))]">
        {GALLERY.map((p, i) => (
          <PictureCard key={i} picture={p} tint={i} />
        ))}
      </div>
      {/* the same drawings at 64 px, the smallest a K–1 touch target gets */}
      <div className="mt-4 flex flex-wrap gap-2">
        {GALLERY.map((p, i) => (
          <span key={i} className="grid place-items-center w-16 h-16 rounded-2xl bg-paper border-2 border-line p-1.5">
            <PictureArt picture={p} aspect={1} badges={false} />
          </span>
        ))}
      </div>
    </div>
  )
}

/** What the (silent, for now) narrator is saying. */
function Caption() {
  const text = useGuideCaption()
  if (!text) return null
  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[60] pointer-events-none max-w-[90vw] truncate rounded-full bg-ink-900/80 text-paper text-sm px-3 py-1">
      🗣 {text}
    </div>
  )
}
