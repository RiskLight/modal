# Core and DOM

Build your own renderer, or use modals without a UI framework.

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
