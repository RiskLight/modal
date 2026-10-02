import { readFileSync } from 'node:fs'

describe('vue adapter runtime dependencies', () => {
  it.each(['src/vue/router.ts', 'src/vue/types.ts', 'src/vue/manager.ts', 'src/vue/container.ts', 'src/vue/item.ts', 'src/vue/composables.ts'])(
    '%s only imports vue-router types',
    path => {
      const text = readFileSync(path, 'utf8')
      for (const match of text.matchAll(/^import\s+(type\s+)?[^\n]*?from\s+'vue-router'/gm)) expect(match[1]).toBe('type ')
    },
  )
})
