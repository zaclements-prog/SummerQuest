import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, Suspense } from 'react'
import { useProgress } from './store/progress'
import { unlockAudio } from './lib/sound'
import AppShell from './components/AppShell'
import Welcome from './screens/Welcome'
import AvatarCreate from './screens/AvatarCreate'
import WorldMap from './screens/WorldMap'
import ZoneDetail from './screens/ZoneDetail'
import ParentDashboard from './screens/ParentDashboard'
import { RequireParent } from './components/ParentGate'
import AppErrorBoundary from './components/AppErrorBoundary'
import { lazyWithRetry } from './lib/lazyWithRetry'
import BadgesScreen from './screens/BadgesScreen'
import DailyChallenge from './screens/DailyChallenge'
import ProgressScreen from './screens/ProgressScreen'
import FocusScreen from './screens/FocusScreen'
import { Loading } from './components/ui'
import NativeShell from './platform/native/NativeShell'
// The single-file offline build is opened straight from disk (file://), where the
// History API can't change the path — so it routes on the URL hash instead.
const Router = import.meta.env.VITE_OFFLINE === 'true' ? HashRouter : BrowserRouter

// Heavy routes load on demand, so the first screen appears fast on a tablet:
// the 3D World and Home (three.js), the stage runner (the 3D mini-games), the
// Tutor (its motion-graphic scenes) and the Pets page (3D pets). The single-file build inlines them all.
// A chunk that fails to load lands on the error screen, which can try it again.
const WorldScreen = lazyWithRetry(() => import('./world/WorldScreen'))
const HomeScreen = lazyWithRetry(() => import('./screens/HomeScreen'))
const GameRunner = lazyWithRetry(() => import('./screens/GameRunner'))
const TutorIndex = lazyWithRetry(() => import('./screens/TutorIndex'))
const TutorScreen = lazyWithRetry(() => import('./screens/TutorScreen'))
const PetsScreen = lazyWithRetry(() => import('./screens/PetsScreen'))

/** A lazily loaded route with its friendly loading state. */
function Lazy({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 grid place-items-center">
          <Loading label={label} />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function RequireAvatar({ children }: { children: React.ReactNode }) {
  const player = useProgress((s) => s.player)
  if (!player) return <Navigate to="/" replace />
  return <>{children}</>
}

/** The World (/world) is the game's hub once you have an avatar. */
const HUB = '/world'

// The path that was showing before the current navigation (committed after each one).
let lastPath: string | null = null
function PathMemory() {
  const { pathname } = useLocation()
  useEffect(() => {
    lastPath = pathname
  }, [pathname])
  return null
}

/**
 * The 2D map stays available at /map, but a brand-new explorer lands in the
 * World: AvatarCreate finishes with navigate('/map'), so that one hop
 * (/avatar → /map) is sent on to the hub instead.
 */
function MapRoute() {
  if (lastPath === '/avatar') return <Navigate to={HUB} replace />
  return <WorldMap />
}

export default function App() {
  const player = useProgress((s) => s.player)
  const bumpStreak = useProgress((s) => s.bumpStreakIfNeeded)

  useEffect(() => {
    const onPointer = () => unlockAudio()
    window.addEventListener('pointerdown', onPointer, { once: true })
    window.addEventListener('keydown', onPointer, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onPointer)
    }
  }, [])

  useEffect(() => {
    if (!player) return
    bumpStreak()
    // A tab left open overnight should still count today when the kid comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') bumpStreak()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [player, bumpStreak])

  return (
    <Router>
      <PathMemory />
      <NativeShell />
      {/* Anything a screen throws (or a screen's code that fails to load) → the "Oops!" screen. */}
      <AppErrorBoundary>
        <AppShell>
          <Routes>
            <Route
              path="/"
              element={player ? <Navigate to={HUB} replace /> : <Welcome />}
            />
            {/* Once there's a player, making a new one would rename them and change
                their grade, a grown-ups' setting: that lives behind the Parent gate. */}
            <Route path="/avatar" element={player ? <Navigate to={HUB} replace /> : <AvatarCreate />} />
            <Route
              path="/map"
              element={
                <RequireAvatar>
                  <MapRoute />
                </RequireAvatar>
              }
            />
            <Route
              path="/zone/:zoneId"
              element={
                <RequireAvatar>
                  <ZoneDetail />
                </RequireAvatar>
              }
            />
            <Route
              path="/play/:zoneId/:stageId"
              element={
                <RequireAvatar>
                  <Lazy label="Getting your game ready…">
                    <GameRunner />
                  </Lazy>
                </RequireAvatar>
              }
            />
            <Route
              path="/badges"
              element={
                <RequireAvatar>
                  <BadgesScreen />
                </RequireAvatar>
              }
            />
            <Route
              path="/daily"
              element={
                <RequireAvatar>
                  <DailyChallenge />
                </RequireAvatar>
              }
            />
            <Route
              path="/progress"
              element={
                <RequireAvatar>
                  <ProgressScreen />
                </RequireAvatar>
              }
            />
            <Route
              path="/tutor"
              element={
                <RequireAvatar>
                  <Lazy label="Opening the lessons…">
                    <TutorIndex />
                  </Lazy>
                </RequireAvatar>
              }
            />
            <Route
              path="/tutor/:lessonId"
              element={
                <RequireAvatar>
                  <Lazy label="Opening your lesson…">
                    <TutorScreen />
                  </Lazy>
                </RequireAvatar>
              }
            />
            <Route path="/focus" element={<RequireAvatar><FocusScreen /></RequireAvatar>} />
            <Route
              path="/home"
              element={
                <RequireAvatar>
                  <Lazy label="Loading your home…">
                    <HomeScreen />
                  </Lazy>
                </RequireAvatar>
              }
            />
            <Route path="/world" element={<RequireAvatar><Lazy label="Loading the world…"><WorldScreen /></Lazy></RequireAvatar>} />
            <Route
              path="/pets"
              element={
                <RequireAvatar>
                  <Lazy label="Finding your pets…">
                    <PetsScreen />
                  </Lazy>
                </RequireAvatar>
              }
            />
            <Route
              path="/parent"
              element={
                <RequireParent>
                  <ParentDashboard />
                </RequireParent>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </AppErrorBoundary>
    </Router>
  )
}
