# Vue 3 and Nuxt

```ts
import { createApp } from 'vue'
import { createVueModal } from '@risklight/modal/vue'

const modal = createVueModal()
createApp(App).use(modal).mount('#app')
```

Put a container where modals should render, usually at the root of the app:

```vue
<template>
  <RouterView />
  <ModalContainer />
</template>

<script setup lang="ts">
import { ModalContainer } from '@risklight/modal/vue'
</script>
```

The default namespace needs a mounted container, and opening without one rejects with `not-hosted`. Pass `requireHost: false` to turn the check off.

## Using the manager

```ts
import { useModal } from '@risklight/modal/vue'

const modal = useModal()
await modal.open(EditUser, { id: 1 })
```

Outside components, import the instance you created, or use `this.$modal` in the options API. `open` and `push` resolve after the modal has rendered, so `handle.instance` is ready.

## Inside a modal

```ts
import { onBeforeModalClose, useCurrentModal, useModalResolve } from '@risklight/modal/vue'

const handle = useCurrentModal()
const resolve = useModalResolve<boolean>()
onBeforeModalClose(() => !dirty.value)
```

These composables throw `outside-modal` when they are used outside a component rendered as a modal.

## Events

Listeners added with `handle.on('save', fn)` receive the component's emits. `on*` handlers passed in props keep working too.

## `<ModalContainer>` props

| Prop | Default | |
|---|---|---|
| `namespace` | `'default'` | |
| `transition` | `'modal-list'` | `TransitionGroup` name. |
| `appear` | `true` | |
| `trapFocus` | `true` | Focus trap and `inert` background. |
| `behaviors` | `true` | Escape and scroll lock. |
| `escapeEvent` | `'keydown'` | |
| `backdropTrigger` | `'click'` | `'pointerdown'` closes on press. |
| `allowOutside` | none | A selector for elements that stay usable outside the modal. |
| `unstyled` | `false` | |
| `nonce` | none | |
| `manager` | injected | Use an explicit manager without the plugin. |

## Nuxt

The Vue adapter works in Nuxt as is. Register it in a plugin, which creates one manager per request, and render the container in `app.vue`:

```ts
import { createVueModal } from '@risklight/modal/vue'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.use(createVueModal())
})
```

## Reactive state

`useModalSnapshot(namespace?)` returns a `shallowRef` with `items`, `top` and `options`. Use it for badges, counters or custom renderers.
