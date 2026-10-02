import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const src = (path: string) => fileURLToPath(new URL(`../../src/${path}`, import.meta.url))

export default defineConfig({
  title: '@risklight/modal',
  description: 'Modal stack with typed prompts, async close guards and adapters for Vue, React and plain JS',
  base: '/modal/',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: '/modal/favicon.svg' }]],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Adapters', link: '/adapters/vue' },
      { text: 'Demo', link: '/demo' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@risklight/modal' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Why this package', link: '/guide/why' },
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Opening modals', link: '/guide/opening' },
          { text: 'Closing and guards', link: '/guide/closing' },
          { text: 'Prompts and results', link: '/guide/prompts' },
          { text: 'Namespaces and toasts', link: '/guide/namespaces' },
          { text: 'Accessibility', link: '/guide/accessibility' },
          { text: 'Styling', link: '/guide/styling' },
          { text: 'SSR', link: '/guide/ssr' },
        ],
      },
      {
        text: 'Adapters',
        items: [
          { text: 'Vue 3 and Nuxt', link: '/adapters/vue' },
          { text: 'vue-router', link: '/adapters/vue-router' },
          { text: 'React', link: '/adapters/react' },
          { text: 'Plain JS', link: '/adapters/vanilla' },
          { text: 'Core and DOM', link: '/adapters/core' },
        ],
      },
      { text: 'API reference', link: '/api' },
      { text: 'Live demo', link: '/demo' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/RiskLight/modal' }],
    search: { provider: 'local' },
    editLink: { pattern: 'https://github.com/RiskLight/modal/edit/main/docs/:path' },
    footer: { message: 'Released under the MIT License.' },
  },
  vite: {
    resolve: {
      alias: [
        { find: '@risklight/modal/vue', replacement: src('vue/index.ts') },
        { find: '@risklight/modal/dom', replacement: src('dom/index.ts') },
        { find: /^@risklight\/modal$/, replacement: src('index.ts') },
      ],
    },
  },
})
