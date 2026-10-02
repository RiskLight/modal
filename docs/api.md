# API reference

## Manager

| Member | Returns | |
|---|---|---|
| `open(target, props?, options?)` | `Promise<Handle>` | Replaces the namespace stack. |
| `push(target, props?, options?)` | `Promise<Handle>` | Adds a modal on top of the stack. |
| `prompt<R>(target, props?, options?)` | `Promise<R \| null>` | |
| `pop({ namespace? })` | `Promise<boolean>` | |
| `closeAll({ namespace? })` | `Promise<boolean>` | |
| `closeById(id, event?)` | `Promise<boolean>` | |
| `get(id)`, `current(namespace?)`, `topmost(predicate?)` | `Handle \| undefined` | |
| `getSnapshot(namespace?)` | `NamespaceSnapshot` | Frozen and stable until something changes. |
| `subscribe(listener)` | `() => void` | Returns an unsubscribe function. |
| `configure(options)`, `configureNamespace(name, options)` | `void` | |
| `register(name, entry)`, `unregister(name)`, `lookup(name)` | | Registry. |
| `attachHost(namespace?)`, `isHosted(namespace?)` | | Used by containers. |
| `reset()`, `dispose()` | `void` | |

`target` is a component or a registered name.

## Handle

| Member | |
|---|---|
| `id`, `namespace`, `component`, `props`, `name`, `isRoute`, `extra` | Read-only. |
| `status`, `closed`, `revision`, `timeout` | Read-only. |
| `backgroundClose`, `escClose`, `draggable` | Read and write. Changes re-render the modal. |
| `instance` | The rendered component instance (Vue). |
| `close(event?)` | `Promise<boolean>` |
| `resolve(value)` | `Promise<boolean>` |
| `setProps(props)` | Replaces the props of the open modal. |
| `result` | `Promise<R \| null>` |
| `onBeforeClose(guard)`, `onClosed(listener)`, `on(event, listener)` | Each returns an unsubscribe function. |
| `emit(event, ...args)`, `eventNames()` | |

## createModal options

| Option | |
|---|---|
| `defaults` | Options for every namespace, plus the global `beforeOpen`. |
| `namespaces` | Overrides per namespace. |
| `registry` | Named modals. |
| `requireHost` | `boolean` or `(namespace) => boolean`. The adapters require a container for `default`. |
| `guardFrom` | Reads a guard from a component. The Vue adapter reads `beforeModalClose`. |
