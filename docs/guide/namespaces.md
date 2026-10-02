# Namespaces and toasts

A namespace is an independent stack with its own options. Render each namespace with its own container.

```ts
const modal = createVueModal({
  defaults: { escClose: true, scrollLock: true, backgroundClose: true, singleShow: false },
  namespaces: {
    toast: { escClose: false, scrollLock: false, timeout: 3000 },
  },
})
```

```vue
<ModalContainer />
<ModalContainer namespace="toast" :trap-focus="false" class="toasts" />
```

```css
.toasts { position: fixed; right: 16px; bottom: 16px; }
.toasts .modal-container { position: static; width: auto; height: auto; background: none; }
```

| Option | Default | |
|---|---|---|
| `escClose` | `true` | Escape closes the top modal of this namespace. |
| `scrollLock` | `true` | Locks body scroll while the namespace has modals. |
| `backgroundClose` | `true` | Default for new modals. |
| `singleShow` | `false` | Shows only the top modal. The others are hidden but stay in the stack. |
| `draggable` | `false` | Default for new modals. |
| `timeout` | `false` | Auto-closes every modal after N ms. |
| `beforeOpen` | none | Namespace-level hook. |

To change options at runtime, use `configure(options)` for defaults and `configureNamespace(name, options)` for one namespace.

## Escape across namespaces

Escape closes the most recently opened modal whose namespace allows Escape, or whose own `escClose` is `true`.
- A namespace with `escClose: false` (toasts) is skipped.
- A modal on top that sets `escClose: false` itself blocks Escape.

## Toasts

Toasts need `timeout` and `trapFocus: false` on their container. Render your own close button in the toast. The library does not add one:

```ts
const handle = useCurrentModal()
```

```vue
<button aria-label="Close" @click="handle.close()">×</button>
```
