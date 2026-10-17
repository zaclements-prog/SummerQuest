import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Node ≥26's experimental localStorage breaks jsdom's; shim it (see file).
    setupFiles: ['src/test/setupLocalStorage.ts'],
  },
})
