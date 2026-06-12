import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useProgress } from '../store/progress'
import { useSettings } from '../store/settings'
import { curriculum } from '../curriculum'
import DailyGoalCard from '../components/DailyGoalCard'

export default function ParentDashboard() {
  const { player, coins, zones, stats, resetPlayer } = useProgress()
  const {
    llmEnabled,
    llmAvailable,
    llmLastCheck,
    llmModel,
    toggleLlm,
    refreshLlmStatus,
  } = useSettings()

  useEffect(() => {
    void refreshLlmStatus()
  }, [refreshLlmStatus])

  const totalQuestions = stats.problemsAnswered
  const accuracy = totalQuestions
    ? Math.round((stats.problemsCorrect / totalQuestions) * 100)
    : 0

  function handleReset() {
    if (
      confirm(
        'Reset all progress? This deletes the player profile, coins, and stage records. Cannot be undone.',
      )
    ) {
      resetPlayer()
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="kid-text text-3xl text-ocean-900">Parent Dashboard</h2>
          <Link
            to={player ? '/map' : '/'}
            className="text-ocean-700 underline kid-text"
          >
            ← Back to game
          </Link>
        </div>

        {!player ? (
          <p className="text-gray-600">
            No player profile yet. Have your child set up their avatar to start.
          </p>
        ) : (
          <>
            <div className="bg-ocean-50 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
                  style={{ background: player.color }}
                >
                  {player.emoji}
                </div>
                <div>
                  <div className="kid-text text-2xl text-ocean-900">
                    {player.name}
                  </div>
                  <div className="text-gray-600">
                    Daily streak: {stats.streakDays} 🔥 · Coins: {coins} 🪙
                  </div>
                </div>
              </div>
            </div>

            <h3 className="kid-text text-xl text-ocean-900 mb-2">Activity</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Stat label="Questions" value={totalQuestions} />
              <Stat label="Correct" value={stats.problemsCorrect} />
              <Stat label="Accuracy" value={`${accuracy}%`} />
            </div>

            <div className="mb-6">
              <DailyGoalCard variant="light" />
            </div>

            <Link
              to="/progress"
              className="block text-center kid-text bg-ocean-500 hover:bg-ocean-700 text-white rounded-2xl py-2.5 mb-6 transition"
            >
              📈 View sessions &amp; performance trends over time →
            </Link>

            <h3 className="kid-text text-xl text-ocean-900 mb-2">
              Zone progress
            </h3>
            <div className="space-y-3 mb-6">
              {curriculum.zones.map((z) => {
                const progress = zones[z.id]
                const possible = z.stages.reduce(
                  (s, st) => s + st.starsToEarn,
                  0,
                )
                const earned = progress
                  ? Object.values(progress.stages).reduce(
                      (s, st) => s + st.stars,
                      0,
                    )
                  : 0
                const attempts = progress
                  ? Object.values(progress.stages).reduce(
                      (s, st) => s + st.attempts,
                      0,
                    )
                  : 0
                return (
                  <div
                    key={z.id}
                    className="flex items-center justify-between p-3 border rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{z.emoji}</div>
                      <div>
                        <div className="kid-text text-lg text-ocean-900">
                          {z.title}
                        </div>
                        <div className="text-sm text-gray-600">
                          {z.available ? z.subtitle : 'Locked'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right kid-text">
                      {z.available && possible > 0 ? (
                        <>
                          <div>
                            ⭐ {earned}/{possible}
                          </div>
                          <div className="text-sm text-gray-500">
                            {attempts} tries
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400 text-sm">—</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <h3 className="kid-text text-xl text-ocean-900 mb-2 mt-2">AI Settings</h3>
            <div className="bg-ocean-50 rounded-2xl p-4 mb-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="kid-text text-lg text-ocean-900">
                    Use AI for Word Problems, Reading & Writing
                  </div>
                  <div className="text-sm text-gray-600">
                    Generates fresh problems, passages, and grades writing using
                    your local AI server (oMLX).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={llmEnabled}
                  onChange={toggleLlm}
                  className="w-6 h-6 accent-ocean-500"
                />
              </label>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full kid-text ${
                    llmAvailable === true
                      ? 'bg-correct-500 text-white'
                      : llmAvailable === false
                        ? 'bg-wrong-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {llmAvailable === true
                    ? '● connected'
                    : llmAvailable === false
                      ? '● offline'
                      : '○ checking…'}
                </span>
                <span className="text-gray-600">
                  Model: <code className="text-xs">{llmModel}</code>
                </span>
                <button
                  onClick={() => void refreshLlmStatus()}
                  className="ml-auto text-ocean-700 underline"
                >
                  Recheck
                </button>
              </div>
              {llmAvailable === false && (
                <p className="text-xs text-gray-500 mt-2">
                  Tip: start oMLX (or set <code>VITE_OMLX_URL</code> in{' '}
                  <code>.env.local</code>) then restart the dev server.
                  {llmLastCheck && (
                    <> Last checked {new Date(llmLastCheck).toLocaleTimeString()}.</>
                  )}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-gray-500">
                Progress is saved locally in this browser only.
              </p>
              <button
                onClick={handleReset}
                className="text-wrong-600 hover:text-wrong-700 text-sm underline"
              >
                Reset all progress
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-quest-50 rounded-2xl p-3 text-center">
      <div className="kid-text text-3xl text-ocean-900">{value}</div>
      <div className="text-xs text-gray-600 uppercase tracking-wide">{label}</div>
    </div>
  )
}
