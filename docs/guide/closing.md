# Closing and guards

## close() tells you what happened

```ts
const closed = await handle.close()
```

- `true` means the modal closed.
- `false` means a guard vetoed, or the modal was already closed. A veto is not an error, so a fire-and-forget `handle.close()` never causes an unhandled rejection.
- The promise rejects only when a guard throws.

`pop()`, `closeById(id)`, `closeAll()` and `resolve(value)` follow the same rule. `closeAll()` closes top-down, stops at the first veto and resolves `false`.

Concurrent closes of the same modal share one promise, and guards run once. A double Escape cannot close the modal underneath.

## Guards

A guard runs before each close attempt: Escape, a backdrop click, `close()`, `closeAll()`, an `open()` that replaces the stack, or a route change. It receives `{ esc, background, route }`.

::: code-group
```ts [Vue]
onBeforeModalClose(async event => {
  if (!form.dirty) return true
  return event.route ? confirm('Leave the page?') : confirm('Discard changes?')
})
```
```tsx [React]
useBeforeModalClose(() => !dirty)
```
```js [Plain JS]
const remove = handle.onBeforeClose(() => !dirty)
```
:::

Return `false`, or a promise of `false`, to keep the modal open. Any other value allows closing. `this` is bound to the component instance (Vue).

In Vue, an options-API component can also define `beforeModalClose()`.

## Escape, backdrop and blocking modals

| You want | Use |
|---|---|
| Close only through your own button | `{ escClose: false, backgroundClose: false }` |
| Decide based on state, such as unsaved changes | a guard |
| Ignore Escape for a whole namespace, such as toasts | `namespaces: { toast: { escClose: false } }` |

## After closing

- **`onClosed`.** `handle.onClosed(listener)` runs after the modal leaves the stack.
- **`result`.** `handle.result` resolves with the prompt value or `null`.
- **`reset()` and `dispose()`.** They drop modals without running guards or `onClosed`, and pending results resolve with `null`.
