# Why this package

Most dialog libraries fall into one of two camps:
- **Primitives** such as Radix, Reka UI, react-aria and the native `<dialog>`. They are polished and accessible, but every modal has to be wired up by hand. They have no stack manager, no awaited result and no async guards.
- **Managers tied to one framework.** Several of them have not had a release since 2023–2024.

`@risklight/modal` is a stack manager with Vue/Nuxt, React and plain JS adapters. `await prompt<R>()` returns a typed result, and real async guards can veto closing. You keep full control over markup and styling, and you can render primitives inside it.

## Comparison

As of October 2026. ✓ yes, ~ partly, ✗ no.

| Package | Open from code | Stack | Typed awaited result | Async close guards | Namespaces | Router integration | Frameworks |
|---|---|---|---|---|---|---|---|
| **@risklight/modal** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ vue-router | Vue/Nuxt, React, plain JS |
| jenesius-vue-modal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Vue, unmaintained since 07.2024 |
| vue-final-modal | ✓ | ✓ | ✗ | ~ sync only | ✗ | ✗ | Vue/Nuxt, no release since 09.2024 |
| @kolirt/vue-modal | ✓ | ✓ | ✓ | ✓ | ✓ | ~ recipe | Vue |
| Nuxt UI `useOverlay` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | Nuxt UI only |
| @ebay/nice-modal-react | ✓ | ✓ | ~ | ✗ | ✗ | ✗ | React, no release since 10.2023 |
| react-modal-promise | ✓ | ✓ | ✓ | ✗ | ~ | ✗ | React |
| Radix / Reka / react-aria / Headless UI | ✗ declarative | ~ | ✗ | ~ sync | ✗ | ✗ | primitives |
| sweetalert2 | ✓ | ✗ | ✓ | ~ preConfirm | ✗ | ✗ | plain JS |
| micromodal / a11y-dialog | ~ | ✗ / ~ | ✗ | ~ sync | ✗ | ✗ | plain JS |
| native `<dialog>` | ✓ | ✓ top layer | ✗ string only | ~ sync | ✗ | ✗ | any |

## What you get in one package

- **Typed `prompt<R>()`.** It resolves with a value or `null`.
- **Async close guards.** They run on Escape, backdrop, `close()`, route changes and when `open()` replaces the stack. `close()` returns whether the modal actually closed.
- **Namespaces** with their own options: modals, toasts with auto-close, one-at-a-time stacks.
- **A registry of named modals and `beforeOpen` hooks** at the global, namespace, registry and per-open levels.
- **vue-router integration:** route-bound modals, close on navigation, back on close, a fallback for deep links.
- **Accessibility:** dialog semantics, labelling from the heading, focus trap with focus return, `inert` background, `allowOutside` for portaled popovers.
- **Scroll lock** with scrollbar compensation, plus dragging.
- **SSR** with one manager per request, no global state.

## Where others are better

- **Primitives.** Radix, react-aria and Reka UI have years of real-world accessibility testing behind them. You can render them inside a modal from this package.
- **Complete UI kits.** Nuxt UI, MUI and sweetalert2 ship designed dialogs and animations. This package ships behaviour and a minimal stylesheet.
- **The native `<dialog>`.** It gets the browser top layer and `::backdrop` for free.

## History

This package started as a rewrite of [jenesius-vue-modal](https://github.com/Jenesius/vue-modal). In 2021 it was the first Vue 3 package to combine an imperative modal stack, async close guards and vue-router integration. Development stopped in 2024. The rewrite keeps those ideas and fixes long-standing bugs. It adds a framework-agnostic core and React and plain JS adapters.
