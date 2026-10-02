# vue-router

Turn a route into a modal:

```ts
import { createModalRoute, installModalRouter } from '@risklight/modal/vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/users', component: Users, children: [{ path: ':id', components: { modal: createModalRoute(UserModal) } }] },
    { path: '/settings', component: createModalRoute(Settings, { mode: 'push', fallback: '/' }) },
  ],
})

installModalRouter(router, modal)
```

- **Entering the route** opens the modal. Route params become props, or pass `props: route => ({ ... })` to map them yourself.
- **Leaving the route** closes the modal with `event.route === true`. If a guard vetoes, the navigation is blocked. The modal closes in `beforeResolve`, and if a later guard aborts the navigation, the modal is reopened.
- **Closing the modal directly** (Escape, backdrop, `close()`) navigates back. If the modal route was the first page in history, it navigates to `fallback`, which defaults to `/`.
- **Same route, different params or query.** The same modal stays open and its props update.
- **Mode.** `mode: 'open'` (default) replaces the stack. `mode: 'push'` stacks the modal on top of the others.
- **Late container.** If the container mounts after the router is ready, the modal opens as soon as the container appears.
- **Dependencies.** The integration does not import `vue-router` at runtime. Its types are structural, so it works with vue-router 4 and 5.
