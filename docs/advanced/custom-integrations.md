# Custom integrations

::: tip You probably do not need this page
Use [Vue](/adapters/vue), [React](/adapters/react) or [Plain JS](/adapters/vanilla). Plain JS already covers pages without a framework, server-rendered templates, Alpine, htmx and jQuery. This page is for building an adapter for another framework, such as Svelte or Solid, or a custom renderer.
:::

All three adapters are built from two low-level entry points:

- `@risklight/modal` is the manager: stacks, namespaces, guards and prompts. It has no DOM.
- `@risklight/modal/dom` provides the browser behaviour: focus trap, `inert`, Escape, scroll lock and dragging.

```ts
import { createModal } from '@risklight/modal'
import { acquireBehaviors, createDialogItem, injectStyles } from '@risklight/modal/dom'

const modal = createModal<MyComponent>()
const release = acquireBehaviors(modal)
modal.subscribe(() => render(modal.getSnapshot()))
```

- **Core (`@risklight/modal`).** It has no framework or DOM imports. `getSnapshot(namespace)` returns a frozen object that keeps the same reference until something changes, so it plugs straight into `useSyncExternalStore` or any store.
- **DOM (`@risklight/modal/dom`).** It provides the behaviour the adapters use:
  - `createDialogItem` (dialog semantics, focus trap, backdrop, dragging);
  - `acquireBehaviors` (Escape and scroll lock, reference counted per manager);
  - `trapFocus`, `inertOutside`, `bindEscape`, `bindScrollLock`, `makeDraggable`, `injectStyles`.
- **Errors.** They are `ModalError` instances with a `code`: `not-hosted`, `before-open-rejected`, `guard-rejected`, `queue-not-empty`, `not-registered`, `no-component`, `outside-modal`, `no-manager` or `disposed`.
