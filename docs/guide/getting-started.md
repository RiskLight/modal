# Getting started

```bash
npm install @risklight/modal
```

Requirements:
- **Node and module format.** Node 22.12+, ESM. `require()` also works on Node 22.12+.
- **Peer dependencies.** `vue` 3.3+, `vue-router` 4 or 5, and `react` 18 or 19 are optional. Install only what you use.

## Pick an adapter

| You use | Import from | Entry point |
|---|---|---|
| Vue 3 or Nuxt | `@risklight/modal/vue` | `createVueModal()` + `<ModalContainer>` |
| React 18/19 | `@risklight/modal/react` | `createReactModal()` + `<ModalProvider>` + `<ModalContainer>` |
| Plain JS | `@risklight/modal/vanilla` | `createVanillaModal()` |
| Another framework (Svelte, Solid…) | see [Custom integrations](/advanced/custom-integrations) | `createModal()` |

## Vue in 30 seconds

```ts
import { createApp } from 'vue'
import { createVueModal } from '@risklight/modal/vue'

createApp(App).use(createVueModal()).mount('#app')
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
const modal = useModal()
const ok = await modal.prompt<boolean>(ConfirmDelete, { title: 'Delete the report?' })
```

The [Vue](/adapters/vue), [React](/adapters/react) and [plain JS](/adapters/vanilla) pages show the full setup for each adapter.

## Core ideas

- **Manager.** `createVueModal()`, `createReactModal()` and `createVanillaModal()` each create a manager. A manager holds stacks of modals, and you can create as many managers as you need (one per app, one per SSR request).
- **Namespace.** A manager holds one stack per namespace, and `default` is used unless you pass `namespace`. A container renders one namespace.
- **Handle.** `open`, `push` and `prompt` create a handle. Use it to close the modal, add guards, listen to events or await the result.
- **Container.** The container renders a namespace's stack and handles Escape, the backdrop, focus, `inert` and scroll lock.
