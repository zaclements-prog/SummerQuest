import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isLLMAvailable, getBackend, OmlxBackend } from '../lib/llm'

interface SettingsState {
  llmEnabled: boolean
  llmModel: string
  llmAvailable: boolean | null
  llmLastCheck: number | null
  toggleLlm: () => void
  setLlmModel: (m: string) => void
  refreshLlmStatus: () => Promise<boolean>
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      llmEnabled: true,
      llmModel: 'Qwen3.6-35B-A3B-bf16',
      llmAvailable: null,
      llmLastCheck: null,
      toggleLlm: () => set({ llmEnabled: !get().llmEnabled }),
      setLlmModel: (m) => {
        const b = getBackend()
        if (b instanceof OmlxBackend) b.setModel(m)
        set({ llmModel: m })
      },
      refreshLlmStatus: async () => {
        const ok = await isLLMAvailable()
        set({ llmAvailable: ok, llmLastCheck: Date.now() })
        return ok
      },
    }),
    {
      name: 'summerquest-settings-v1',
    },
  ),
)

// initialize backend model from persisted setting on first load
const initial = useSettings.getState()
const b = getBackend()
if (b instanceof OmlxBackend) b.setModel(initial.llmModel)
