import { Suspense } from 'react'
import type { ReactNode } from 'react'
import type { GameProps } from '../screens/GameRunner'
import { Loading } from '../components/ui'
import { lazyWithRetry } from '../lib/lazyWithRetry'

/**
 * The four 3D mini-games (and the K–1 Listen & Play shell), each loaded on demand (three.js and its scene code
 * stay out of the stage runner until a 3D game is actually played). Same
 * props and default exports as the game modules, so the stage runner only
 * swaps its imports:
 *
 *   import { CloudKeeper, DivisionArena, FractionForge, TimesGrove } from '../games/lazyGames'
 *
 * The single-file build inlines these chunks, so it still works offline. A
 * chunk that fails to load throws to the app's error screen
 * (src/components/AppErrorBoundary.tsx), and the next visit imports it again.
 */
const DivisionArenaGame = lazyWithRetry(() => import('./DivisionArena'))
const FractionForgeGame = lazyWithRetry(() => import('./FractionForge'))
const CloudKeeperGame = lazyWithRetry(() => import('./CloudKeeper'))
const TimesGroveGame = lazyWithRetry(() => import('./TimesGrove'))
// Times Grove's 5th-grade mode (area models): its own module, so grades 2–4's grove is untouched.
const TimesGroveAreaGame = lazyWithRetry(() => import('./TimesGroveArea'))
// The K–1 Listen & Play shell (2D, but only K–1 stages need it).
const ListenPlayGame = lazyWithRetry(() => import('./listenPlay/ListenPlay'))
const CritterParadeGame = lazyWithRetry(() => import('./CritterParade'))

function Loader({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 grid place-items-center">
          <Loading label="Building the play area…" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function DivisionArena(props: GameProps) {
  return (
    <Loader>
      <DivisionArenaGame {...props} />
    </Loader>
  )
}

export function FractionForge(props: GameProps) {
  return (
    <Loader>
      <FractionForgeGame {...props} />
    </Loader>
  )
}

export function CloudKeeper(props: GameProps) {
  return (
    <Loader>
      <CloudKeeperGame {...props} />
    </Loader>
  )
}

export function TimesGrove(props: GameProps) {
  return <Loader>{props.params?.mode === 'area' ? <TimesGroveAreaGame {...props} /> : <TimesGroveGame {...props} />}</Loader>
}

export function ListenPlay(props: GameProps) {
  return (
    <Loader>
      <ListenPlayGame {...props} />
    </Loader>
  )
}

export function CritterParade(props: GameProps) {
  return (
    <Loader>
      <CritterParadeGame {...props} />
    </Loader>
  )
}
