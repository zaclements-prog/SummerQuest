import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { sfx } from '../lib/sound'

export default function Welcome() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center text-white">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 8 }}
          className="text-9xl mb-4"
        >
          🌞
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="kid-text text-6xl mb-3 drop-shadow-lg"
        >
          SummerQuest
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="kid-text text-2xl mb-8 text-white/90"
        >
          An island adventure to keep your brain sharp this summer
        </motion.p>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            to="/avatar"
            onClick={() => sfx.enter()}
            className="btn-quest bg-quest-400 text-quest-900 inline-block"
            style={{ borderColor: '#c69b02' }}
          >
            Start your quest →
          </Link>
        </motion.div>
        <p className="mt-12 text-white/70 text-sm">
          For students entering 4th grade
        </p>
      </div>
    </div>
  )
}
