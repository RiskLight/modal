# Opening modals

```ts
const handle = await modal.open(EditUser, { id: 42 })
const handle = await modal.push(Details, { id: 42 })
const value = await modal.prompt<boolean>(Confirm, { title: 'Sure?' })
```

| Method | What it does |
|---|---|
| `open(component, props?, options?)` | Closes everything in the namespace top-down, running guards, then opens. Rejects if a guard keeps a modal open. |
| `push(component, props?, options?)` | Puts the modal on top of the stack. |
| `prompt<R>(component, props?, options?)` | Pushes the modal and resolves with the value given to `resolve()`, or with `null` if it closes without one. |

Concurrent `open()` calls on the same namespace run one after another, so the last one wins and the stack never ends up with two modals.

## Props

Props are inferred from the component, and required props stay required.

- **Vue.** Props can be a plain object, `ref`, `reactive`, `computed` or a getter, and the modal re-renders when they change.
- **React and plain JS.** Props are a plain object.

## Options

| Option | Default | |
|---|---|---|
| `namespace` | `'default'` | Which stack to use. |
| `backgroundClose` | `true` | A backdrop click closes the modal. |
| `escClose` | inherits the namespace | Escape closes the modal. `false` also blocks Escape for the modals underneath while this modal is on top. |
| `draggable` | `false` | `true` drags by the whole surface. A selector string drags by a handle inside it. |
| `timeout` | `false` | Auto-closes after N ms. Guards still run. |
| `beforeOpen` | none | A hook that runs before opening. Return `false` to cancel. |
| `extra` | `{}` | Free data. `extra.ariaLabel` and `extra.ariaLabelledby` label the dialog. |
| `slots` | none | Vue only. Slots passed to the component. |

## beforeOpen hooks

Hooks run in this order: global (`defaults.beforeOpen`), then namespace, then registry entry, then per-open. Any hook can return `false` (or a promise of `false`) to cancel. The open then rejects with a `ModalError` whose code is `before-open-rejected`.

```ts
createVueModal({ defaults: { beforeOpen: () => auth.isLoggedIn } })
```

## Registry

Register modals by name and open them with a string:

```ts
const modal = createVueModal({
  registry: {
    confirm: { component: Confirm, backgroundClose: false },
    details: Details,
  },
})

await modal.push('confirm', { title: 'By name' })
```

`register(name, entry)`, `unregister(name)` and `lookup(name)` change the registry at runtime. An object with its own `component` key is treated as an entry with options. Anything else is treated as the component itself.
