import DefaultTheme from 'vitepress/theme'
import './demo.css'
import { h } from 'vue'
import { createVueModal, ModalContainer } from '@risklight/modal/vue'
import type { Theme } from 'vitepress'

export const modal = createVueModal({
  namespaces: { toast: { escClose: false, scrollLock: false, timeout: 3000 } },
})

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'layout-bottom': () => [h(ModalContainer), h(ModalContainer, { namespace: 'toast', trapFocus: false, class: 'demo-toasts' })],
    }),
  enhanceApp({ app }) {
    app.use(modal)
  },
} satisfies Theme
