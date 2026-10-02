# Changelog

## 0.1.0

First release. It started as a rewrite of jenesius-vue-modal 1.11.9.

- **Core** (`@risklight/modal`):
  - framework-agnostic manager with namespaces and frozen snapshots that keep the same reference until something changes;
  - close guards;
  - `beforeOpen` hooks at the global, namespace, registry and per-open levels;
  - a registry and typed `prompt<R>()`;
  - per-namespace hosts;
  - `reset()` and `dispose()`.
- **DOM** (`@risklight/modal/dom`): Escape across namespaces, a shared scroll lock with scrollbar compensation, a focus trap stack with focus return, dragging, and refcounted behaviors.
- **Vue** (`@risklight/modal/vue`):
  - `createVueModal()` plugin;
  - `<ModalContainer>` with attribute fallthrough, `role="dialog"`, `singleShow` per namespace, slots and an injected or importable stylesheet;
  - composables;
  - vue-router integration without a runtime dependency on `vue-router`.
- **`allowOutside`** on the Vue and React containers (and on `trapFocus`, `bindEscape` and the dialog item in `./dom`): a selector for popovers, menus and toasts rendered outside the modal. They stay out of `inert`, can receive focus, and handle their own Escape.
- **Build:** Vite 8 (rolldown) for the library build, vitest 5, oxlint, CI on Node 22 and 24, releases through npm trusted publishing with provenance.
- **Accessibility:**
  - `role="dialog"` is on the modal surface.
  - The dialog is labelled automatically from its heading.
  - Content outside the modal becomes `inert`.
  - Escape uses `keydown` and ignores auto-repeat.
  - The backdrop closes on click.
  - Focus moves back correctly between stacked and `singleShow` modals.
- **Robustness:**
  - A guard can call `close()` or `resolve()` without recursing.
  - Concurrent `open()` calls are serialized per namespace.
  - The router closes in `beforeResolve` and waits for a late container.
  - `promptModal` keeps values resolved during mount.
  - `exports` has a `default` condition, so `require()` works.
  - CSS is listed in `sideEffects`.
  - The `.d.ts` files no longer depend on `vue-router`.
- **React** (`@risklight/modal/react`): `createReactModal()`, `ModalProvider`, `ModalContainer`, and the hooks `useModal`, `useCurrentModal`, `useBeforeModalClose`, `useModalResolve` and `useModalSnapshot` (on `useSyncExternalStore`). Dialog behaviour is shared with Vue through `createDialogItem` in `@risklight/modal/dom`.
- **Auto-close:** a `timeout` option on namespaces, registry entries and individual opens, for toasts. The dialog surface gets `tabindex="-1"`, so a click inside keeps focus in the dialog. Checked in a real browser with the React playground.
- **Plain JS** (`@risklight/modal/vanilla`): `createVanillaModal()` with a host that mounts itself on first open. Also `mount(target, options)`, function components `(props, handle) => Node | string | { element, destroy }`, and a `dispose()` that removes the hosts. The core now marks a handle as closed before it notifies subscribers.

