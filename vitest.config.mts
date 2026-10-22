import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['backend/test/**/*.test.ts', 'frontend/src/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
})
