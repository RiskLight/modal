# Changelog

## 0.1.0

First release. It is a rewrite of jenesius-vue-modal 1.11.9.

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
- **Compat** (`@risklight/modal/compat`): the jenesius-vue-modal API, with the upstream test suite ported.
- **Upstream bugs fixed:**
  - a double close removed the modal underneath;
  - closed modals leaked;
  - `onBeforeModalClose` outside a modal attached to modal 0;
  - Escape and scroll lock worked only in the default namespace;
  - scroll lock overwrote inline styles;
  - the router crashed on records without `components`;
  - `promptModal` was untyped.
- **Build:** Vite 8 (rolldown) for the library build, vitest 5, oxlint, CI on Node 22 and 24, releases through npm trusted publishing with provenance.
