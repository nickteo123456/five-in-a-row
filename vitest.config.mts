import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: { alias: { '@': rootDir } },
  test: {
    include: ['tests/**/*.test.ts'],
    // An empty URL keeps every test in dev mode, away from any real database
    env: {
      NEXT_PUBLIC_SUPABASE_URL: '',
      SESSION_SECRET: 'test-secret-test-secret-test-secret-1234',
      TEACHER_EMAIL: 'teacher@example.com',
      TEACHER_PASSWORD: 'a-long-test-password',
    },
    coverage: {
      include: ['lib/**/*.ts'],
      exclude: ['lib/supabase.ts', 'lib/i18n/**', 'lib/sound.ts', 'lib/email.ts'],
    },
  },
})
