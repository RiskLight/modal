# @risklight/modal

[![npm](https://img.shields.io/npm/v/@risklight/modal.svg)](https://www.npmjs.com/package/@risklight/modal)
[![CI](https://github.com/RiskLight/modal/actions/workflows/ci.yml/badge.svg)](https://github.com/RiskLight/modal/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@risklight/modal.svg)](./LICENSE)

A modal stack with a framework-agnostic core, close guards, typed prompts, and adapters for Vue 3 (including Nuxt) and React. It is a rewrite of [jenesius-vue-modal](https://github.com/Jenesius/vue-modal), and `@risklight/modal/compat` keeps that library's API, so you can migrate by changing the import.

- **Core** (`@risklight/modal`): namespaces, a stack per namespace, `beforeOpen` hooks, close guards, a registry, prompts and stable snapshots. It does not import Vue or touch the DOM.
- **DOM** (`@risklight/modal/dom`): Escape handling, scroll lock with scrollbar compensation, a focus trap stack and dragging. Every function returns a disposer.
- **Vue** (`@risklight/modal/vue`): the `createVueModal()` plugin, `<ModalContainer>`, composables and vue-router integration. It works in Nuxt as is.
- **React** (`@risklight/modal/react`): `createReactModal()`, `<ModalProvider>`, `<ModalContainer>` and hooks.
- **Compat** (`@risklight/modal/compat`): `openModal`, `pushModal`, `promptModal`, `container`, `config`, `useModalRouter` and the rest of the jenesius-vue-modal API.

Requirements: Node 22.12+ and ESM only. `vue` (3.3 or later), `vue-router` (4 or 5) and `react` (18 or 19) are optional peer dependencies. Install only the one you use.

## Install

```bash
npm install @risklight/modal
```

## Vue quick start

```ts
import { createApp } from 'vue'
import { createVueModal } from '@risklight/modal/vue'
import App from './App.vue'

const modal = createVueModal()
createApp(App).use(modal).mount('#app')
```

```vue
<template>
  <RouterView />
  <ModalContainer />
</template>

<script setup lang="ts">
import { ModalContainer } from '@risklight/modal/vue'
</script>
```

```ts
import { useModal } from '@risklight/modal/vue'
import ConfirmDelete from './ConfirmDelete.vue'

const modal = useModal()

const handle = await modal.open(ConfirmDelete, { title: 'Delete?' })
handle.onBeforeClose(event => !event.background)

const confirmed = await modal.prompt<boolean>(ConfirmDelete, { title: 'Sure?' })
```

Inside a modal component:

```ts
import { onBeforeModalClose, useCurrentModal, useModalResolve } from '@risklight/modal/vue'

const resolve = useModalResolve<boolean>()
onBeforeModalClose(event => (event.esc ? confirm('Discard changes?') : true))
```

### Opening modals

| Method | Behaviour |
|---|---|
| `open(component, props?, options?)` | Closes everything in the namespace, top-down and running guards, then opens the modal. |
| `push(component, props?, options?)` | Opens the modal on top of the stack. |
| `prompt<R>(component, props?, options?)` | Pushes the modal and resolves with the value passed to `resolve()`, or with `null` if the modal closes without one. |
| `pop()`, `closeAll()`, `closeById(id)` | Close one modal, all of them, or one by id. All of them respect guards. |

Props can be a plain object, a `ref`, a `reactive`, a `computed` or a getter, and the modal re-renders when they change. Props are inferred from the component. `options` accepts:
- `namespace`, `backgroundClose`, `escClose`, `draggable` (`true` or a handle selector) and `beforeOpen`;
- `slots`;
- `extra.ariaLabel` and `extra.ariaLabelledby`.

### `<ModalContainer>`

| Prop | Default | |
|---|---|---|
| `namespace` | `'default'` | Which stack to render. |
| `transition` | `'modal-list'` | `TransitionGroup` name. |
| `appear` | `true` | `TransitionGroup` appear. |
| `trapFocus` | `true` | Moves focus into the visible modal, keeps it there, makes the rest of the page `inert`, and returns focus on close. Set it to `false` for non-modal stacks such as toasts. |
| `behaviors` | `true` | Escape and scroll lock, bound once per manager. Read at mount. |
| `escapeEvent` | `'keydown'` | `'keyup'` restores the jenesius-vue-modal behaviour. |
| `backdropTrigger` | `'click'` | Closes when both press and release land on the backdrop. `'pointerdown'` closes on press. |
| `unstyled` | `false` | Skips injecting the default styles. You can import `@risklight/modal/style.css` instead. |
| `nonce` | none | CSP nonce for the injected `<style>`. |
| `manager` | injected | Use an explicit manager without the plugin. |

**Rendering:**
- Attributes fall through to the root element, which carries `data-modal-host`.
- The modal component must render a single root element. That element receives `role="dialog"` and `aria-modal="true"` unless it sets its own, for example `role="alertdialog"`. It also receives `aria-label` or `aria-labelledby` when they are passed in `extra`.
- Without a label, the first heading inside the modal (`h1`–`h6`, `[role=heading]` or `[data-modal-title]`) becomes its `aria-labelledby`.
- The backdrop wrapper has no role.

### Namespaces and options

```ts
const modal = createVueModal({
  defaults: { escClose: true, scrollLock: true, backgroundClose: true, singleShow: false, beforeOpen: () => isLoggedIn() },
  namespaces: { toast: { escClose: false, scrollLock: false } },
  registry: { confirm: { component: ConfirmDelete, backgroundClose: false } },
})

modal.configureNamespace('toast', { singleShow: true })
await modal.push('confirm', { title: 'By name' })
```

- **`beforeOpen` order:** hooks run global, then namespace, then registry entry, then per-open. If any hook returns `false`, the open is cancelled.
- **Escape:** closes the most recently opened modal whose namespace or own `escClose` allows it, across all namespaces. A modal that leaves `escClose` unset follows the namespace setting live. A modal opened with `escClose: false` blocks Escape while it is on top. A namespace with `escClose: false` and no per-modal override is skipped, which suits toasts.
- **Containers:** the default namespace requires a mounted `<ModalContainer>`. Other namespaces don't.

### vue-router

```ts
import { createModalRoute, installModalRouter } from '@risklight/modal/vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/users/:id', component: createModalRoute(UserModal) },
    { path: '/settings', component: createModalRoute(Settings, { mode: 'push', fallback: '/' }) },
  ],
})
installModalRouter(router, modal)
```

- **Entering and leaving.** The modal opens when the route is entered. When you navigate away, the modal is closed with `event.route === true`. If a guard vetoes the close, the navigation is blocked.
- **Closing directly.** Closing the modal with Escape, a background click or `close()` navigates back. If the modal route was the first entry in history, it navigates to `fallback`, which defaults to `/`.
- **Changing params or query.** On the same route the same modal stays open and its props update.
- **Guards.** The modal closes in `beforeResolve`. If a guard aborts the navigation, the modal stays open, or it is reopened when the guard ran after the close.
- **Container mounted after the router is ready.** If the initial route is a modal route, the modal opens once the container mounts.
- **Server.** On the server, route modals are not opened.
- **No dependency on vue-router.** The integration works with vue-router 4 and 5 through structural types, and `vue-router` is only needed if you use these functions.

## React quick start

```tsx
import { createReactModal, ModalContainer, ModalProvider, useModal } from '@risklight/modal/react'

const modal = createReactModal()

export function App() {
  return (
    <ModalProvider manager={modal}>
      <Page />
      <ModalContainer />
    </ModalProvider>
  )
}

function Page() {
  const modal = useModal()
  return <button onClick={() => modal.prompt<boolean>(ConfirmDelete, { title: 'Delete?' })}>Delete</button>
}
```

Inside a modal component:

```tsx
import { useBeforeModalClose, useCurrentModal, useModalResolve } from '@risklight/modal/react'

function ConfirmDelete({ title }: { title: string }) {
  const resolve = useModalResolve<boolean>()
  useBeforeModalClose(event => (event.esc ? window.confirm('Discard?') : true))
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={() => resolve(true)}>Yes</button>
    </div>
  )
}
```

**Props and events.** Props are passed as a plain object and are typed from the component, so required props are required. Each listener added with `handle.on('save', fn)` is passed to the component as an `onSave` prop, together with any `onSave` you pass yourself.

**Container behaviour.** `<ModalContainer>` accepts the same behaviour props as the Vue one: `namespace`, `trapFocus`, `behaviors`, `escapeEvent`, `backdropTrigger`, `unstyled`, `nonce` and `manager`. Any other HTML attributes go to the host `<div>`. It renders where you place it and does not use a portal.

**Hooks.** `useModalSnapshot(namespace?)` re-renders on changes through `useSyncExternalStore`, and it works with SSR.

## Core without a framework

```ts
import { createModal } from '@risklight/modal'
import { acquireBehaviors } from '@risklight/modal/dom'

const modals = createModal<MyComponentType>()
const release = acquireBehaviors(modals)

modals.subscribe(() => render(modals.getSnapshot()))
```

`getSnapshot(namespace)` returns a frozen object that keeps the same reference until something changes, so it can be used directly with `useSyncExternalStore`. `createDialogItem` in `@risklight/modal/dom` holds the dialog behaviour that both adapters share: accessible labelling, focus trap, backdrop closing and dragging.

## Migrating from jenesius-vue-modal

Change the import:

```diff
- import { container, openModal, pushModal, promptModal, config } from 'jenesius-vue-modal'
+ import { container, openModal, pushModal, promptModal, config } from '@risklight/modal/compat'
```

The upstream test suite is ported in `test/compat` and passes. You don't need `app.use()`: `container` works on its own and default styles are injected automatically.

| jenesius-vue-modal | compat | New API |
|---|---|---|
| `openModal / pushModal` | same | `modal.open / modal.push` |
| `promptModal` | same | `modal.prompt<R>()` |
| `popModal / closeModal / closeById` | same | `modal.pop / modal.closeAll / modal.closeById` |
| `config({ beforeEach })` | same | `defaults.beforeOpen` |
| `config({ store })` | same | `registry`, `register()` |
| `config({ skipInitCheck })` | same | `requireHost: false` |
| `modal.onclose = fn` | same | `handle.onBeforeClose(fn)` |
| `modal.ondestroy = fn` | same | `handle.onClosed(fn)` |
| `modal.closed.value` | same | `handle.closed` or `useModalSnapshot()` |
| `Modal.EVENT_PROMPT` emit | same | `useModalResolve()` or `PROMPT_EVENT` |
| `onBeforeModalClose` | same | same, but throws outside a modal |
| `useModalRouter(c)` + `.init(router)` | same | `createModalRoute(c)` + `installModalRouter(router, modal)` |
| `container` | same | `<ModalContainer>` |

`modalManager` from `@risklight/modal/compat` is the manager behind the compat API. You can use the new API on the same stack while you migrate.

### Behaviour changes

- **Double close.** Closing a modal twice, for example a double Escape with an async guard, no longer closes the modal underneath. Concurrent closes share one promise.
- **Memory.** Closed modals are removed from `Modal.STORE`.
- **`onBeforeModalClose` outside a modal** now throws instead of silently guarding modal 0.
- **Escape and scroll lock** work in every mounted namespace. Scroll lock restores the previous inline `overflow` and `padding-right` and compensates for the scrollbar width.
- **Router.** Route records without `components` no longer crash. Calling `useModalRouter.init` twice does nothing instead of throwing.
- **`closeModal` order.** It closes modals top-down.
- **Registry options.** Per-open options take precedence over store entry options.
- **Defaults kept from jenesius-vue-modal.** The compat `container` keeps `keyup` for Escape and `pointerdown` for the backdrop.
- **SSR.** Compat holds one module-level manager, so use it on the client only. For SSR, create a `createVueModal()` instance per request.

### Notes

- **`reset()` and `dispose()`** drop modals without running guards or `onClosed` listeners. Pending `result` promises resolve with `null`.
- **Registry entries.** An object with its own `component` key is treated as a registry entry. Any other value is treated as the component itself.
- **Module resolution.** Subpath imports need `moduleResolution: "bundler"`, `"node16"` or `"nodenext"` in TypeScript. `require()` works on Node 22.12 and later.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Releases are published from a `vX.Y.Z` tag through npm trusted publishing with provenance.

## License

MIT. See [LICENSE](./LICENSE). Based on jenesius-vue-modal by Jenesius (MIT).
