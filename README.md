# @risklight/modal

[![npm](https://img.shields.io/npm/v/@risklight/modal.svg)](https://www.npmjs.com/package/@risklight/modal)
[![CI](https://github.com/RiskLight/modal/actions/workflows/ci.yml/badge.svg)](https://github.com/RiskLight/modal/actions/workflows/ci.yml)
[![docs](https://img.shields.io/badge/docs-risklight.github.io%2Fmodal-4f46e5)](https://risklight.github.io/modal/)
[![license](https://img.shields.io/npm/l/@risklight/modal.svg)](./LICENSE)

Modals as a stack, not as markup. Open a modal from anywhere, await a typed result, and veto closing with async guards. One framework-agnostic core with adapters for **Vue 3 / Nuxt**, **React** and **plain JS**.

**[Documentation](https://risklight.github.io/modal/)** · **[Live demo](https://risklight.github.io/modal/demo)** · **[Why this package](https://risklight.github.io/modal/guide/why)**

```bash
npm install @risklight/modal
```

## Vue / Nuxt

```ts
import { createVueModal } from '@risklight/modal/vue'

createApp(App).use(createVueModal()).mount('#app')
```

```vue
<template>
  <RouterView />
  <ModalContainer />
</template>
```

```ts
const modal = useModal()
const ok = await modal.prompt<boolean>(ConfirmDelete, { title: 'Delete the report?' })
```

## React

```tsx
const modal = createReactModal()

export const App = () => (
  <ModalProvider manager={modal}>
    <Routes />
    <ModalContainer />
  </ModalProvider>
)

const ok = await useModal().prompt<boolean>(ConfirmDelete, { title: 'Delete the report?' })
```

## Plain JS

Markup stays in HTML:

```html
<template data-modal="confirm">
  <div>
    <h2 data-prop="question"></h2>
    <button data-resolve="true">Yes</button>
    <button data-close>No</button>
  </div>
</template>
```

```js
import { createVanillaModal } from '@risklight/modal/vanilla'

const modal = createVanillaModal()
const ok = await modal.prompt('confirm', { question: 'Delete?' })
```

## Features

- **Imperative and typed.** `open`, `push` and `prompt<R>` from anywhere. Props are inferred from the component, and `prompt` resolves with a typed value or `null`.
- **Async close guards.** They run on Escape, backdrop, `close()`, stack replacement and route changes. `close()` resolves `true` or `false` instead of throwing on a veto.
- **Stacks and namespaces.** Modals in modals, toasts with auto-close, `singleShow`, a named registry, and `beforeOpen` hooks at four levels.
- **Routing everywhere.** vue-router, react-router (`ModalRoute`) and a built-in History router for plain JS. Modals bound to a route close on navigation, go back on close, fall back to a page for deep links, and let a guard block leaving.
- **Animations everywhere.** The same enter and leave classes in Vue, React and plain JS. A closing modal stays visible until its transition ends.
- **Accessible by default.**
  - `role="dialog"` on the surface, labelled by its heading.
  - A focus trap that returns focus to the opener.
  - An `inert` background, with `allowOutside` for portaled popovers.
  - Escape on `keydown`, and backdrop closing that ignores text-selection drags.
- **Practical.** Scroll lock with scrollbar compensation, dragging by a handle, CSP nonce, SSR-safe managers per request.
- **Small and tested.** Pure ESM with strict types. 600+ tests cover the core, DOM behaviour, every adapter and SSR, and each adapter is also checked in a real browser.

## Packages

Pick one adapter:

| Import | For |
|---|---|
| `@risklight/modal/vue` | Vue 3 and Nuxt |
| `@risklight/modal/react` | React 18 and 19 |
| `@risklight/modal/react-router` | `ModalRoute` for react-router 7 and 8 |
| `@risklight/modal/vanilla` | Plain JS: no framework, server-rendered templates, Alpine, htmx, jQuery |

Low-level entry points. You only need them to build an integration for another framework ([docs](https://risklight.github.io/modal/advanced/custom-integrations)):

| Import | What it is |
|---|---|
| `@risklight/modal` | The manager: stacks, guards, prompts. No DOM. |
| `@risklight/modal/dom` | Browser behaviour: focus trap, inert, Escape, scroll lock, dragging |
| `@risklight/modal/style.css` | Default styles, if you disable injection |

`vue`, `vue-router`, `react` and `react-router` are optional peer dependencies. It needs Node 22.12+ and is ESM only; `require()` works on Node 22.12+.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run docs:dev
```

Releases are published from a `vX.Y.Z` tag through npm trusted publishing with provenance.

## License

MIT. See [LICENSE](./LICENSE). The project started as a rewrite of [jenesius-vue-modal](https://github.com/Jenesius/vue-modal) by Jenesius.
