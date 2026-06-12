import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'

const EMOJIS = ['🦊', '🐯', '🦁', '🐻', '🐼', '🐸', '🦉', '🐲', '🦄', '🐙', '🦖', '🐉']
const COLORS = [
  { name: 'Sunset', value: '#fb923c' },
  { name: 'Berry', value: '#ec4899' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Sky', value: '#38bdf8' },
  { name: 'Grape', value: '#a855f7' },
  { name: 'Coral', value: '#f43f5e' },
]

export default function AvatarCreate() {
  const navigate = useNavigate()
  const setAvatar = useProgress((s) => s.setAvatar)
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [color, setColor] = useState(COLORS[0].value)
  const [name, setName] = useState('')

  const canStart = name.trim().length > 0

  function start() {
    if (!canStart) return
    sfx.victory()
    setAvatar({ emoji, color, name: name.trim() })
    navigate('/map')
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-white">
      <div className="max-w-3xl w-full bg-ocean-900/40 backdrop-blur p-8 rounded-3xl">
        <h2 className="kid-text text-4xl text-center mb-6">
          Create your explorer
        </h2>

        <div className="flex justify-center mb-6">
          <motion.div
            key={emoji + color}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="w-32 h-32 rounded-full flex items-center justify-center text-7xl shadow-lg ring-8 ring-white/30"
            style={{ background: color }}
          >
            {emoji}
          </motion.div>
        </div>

        <div className="mb-6">
          <label className="kid-text text-xl block mb-2">Pick a character</label>
          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  sfx.click()
                  setEmoji(e)
                }}
                className={`text-4xl p-2 rounded-2xl transition ${
                  emoji === e ? 'bg-white/40 ring-4 ring-quest-400' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="kid-text text-xl block mb-2">Pick a color</label>
          <div className="grid grid-cols-6 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  sfx.click()
                  setColor(c.value)
                }}
                className={`h-12 rounded-2xl transition ${
                  color === c.value ? 'ring-4 ring-white scale-105' : ''
                }`}
                style={{ background: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="kid-text text-xl block mb-2">What's your name?</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Type your name"
            maxLength={20}
            className="w-full px-4 py-3 rounded-2xl text-2xl kid-text text-ocean-900 bg-white outline-none focus:ring-4 focus:ring-quest-400"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={start}
            disabled={!canStart}
            className="btn-quest bg-correct-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: '#16a34a' }}
          >
            Begin adventure! 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
