# SummerQuest

A kid-friendly summer learning game that combines the strongest patterns from
Prodigy (meta-game + avatar), DragonBox (concept-first visual learning),
Khan Academy (mastery progression), and SplashLearn (quick-hit practice games).

**Current scope**: a single zone — Multiplication Mesa — fully built out for a
student going from 3rd to 4th grade. Other zones (Division, Fractions, Word
Problems, Reading) are mapped on the world but not yet implemented.

## Running it

Easiest: double-click `launch-summerquest.command` in Finder. On first run it
installs dependencies (~1 minute), then opens your browser to the game. Close
the Terminal window to stop.

Manually:

```bash
npm install
npm run dev
```

## Architecture

```
src/
  App.tsx                  router + audio unlock
  main.tsx                 entry
  index.css                Tailwind v4 theme + animations
  components/
    AppShell.tsx           header (coins, streak, avatar, sound, parent link)
  screens/
    Welcome.tsx            landing
    AvatarCreate.tsx       pick emoji + color + name
    WorldMap.tsx           island archipelago, zones positioned by data
    ZoneDetail.tsx         lists stages, shows progress, launches games
    GameRunner.tsx         dispatches gameId → component, shows results
    ParentDashboard.tsx    stats + reset
  games/multiplication/
    ArrayBuilder.tsx       concept: animated arrays + 4-choice answer
    SpeedRun.tsx           practice: 60-second timed drill
    BossBattle.tsx         mastery: HP-based fight, stars by HP remaining
  curriculum/
    types.ts               Zone / Stage / Curriculum types
    multiplication.ts      Multiplication Mesa zone data
    index.ts               curriculum aggregator + locked placeholders
  store/
    progress.ts            Zustand store, persisted to localStorage
  lib/
    sound.ts               Web Audio API SFX (no asset bundle)
    random.ts              problem generator with plausible distractors
```

### Adding a new zone

1. Create `src/curriculum/<topic>.ts` exporting a `Zone`.
2. Build any new game components in `src/games/<topic>/`.
3. Register the game in `GameRunner.tsx`'s switch and add its id to
   `GameId` in `curriculum/types.ts`.
4. Replace the placeholder in `curriculum/index.ts` with the real zone.

## Pedagogical model

Each zone follows a **3-stage mastery loop**:

1. **Concept** (slow, visual) — represent the math physically before
   abstracting. For multiplication, see arrays build row by row.
2. **Practice** (fast, fluent) — timed drill builds automaticity.
3. **Mastery** (themed) — a boss battle ties effort to narrative reward.

Stars per stage: 0 (fail) → 1 → 2 → 3 (perfect). Persisted by best score.

## Roadmap

- [ ] Division Dunes
- [ ] Fraction Falls
- [ ] Word Problem Woods
- [ ] Reading Reef (passage + question games)
- [ ] Shop for avatar cosmetics with coins
- [ ] Adaptive difficulty (track which facts a kid misses, weight those)
- [ ] Daily quest with bonus rewards
- [ ] Electron wrapper for "real" desktop app
- [ ] Multi-profile (more than one kid per install)
- [ ] Print/share weekly progress report
