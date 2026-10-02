import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/core/**/*.spec.ts', 'test/ssr/**/*.spec.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          environment: 'happy-dom',
          setupFiles: ['test/setup-browser.ts', 'test/setup-motion.ts'],
          alias: { vue: 'vue/dist/vue.esm-bundler.js' },
          css: { include: [/style\.css/] },
          include: ['test/{dom,vue,vanilla}/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'react',
          environment: 'happy-dom',
          setupFiles: ['test/setup-motion.ts'],
          include: ['test/react/**/*.spec.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'types',
          include: [],
          typecheck: {
            enabled: true,
            only: true,
            include: ['test/types/**/*.test-d.ts'],
            tsconfig: './tsconfig.test.json',
          },
        },
      },
    ],
  },
})
