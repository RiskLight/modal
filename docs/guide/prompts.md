# Prompts and results

```ts
const color = await modal.prompt<string>(PickColor, { initial: 'red' })
if (color === null) return
```

Inside the modal, resolve with a value. The modal closes, and its guards still run:

::: code-group
```ts [Vue]
const resolve = useModalResolve<string>()
resolve('blue')
```
```tsx [React]
const resolve = useModalResolve<string>()
resolve('blue')
```
```js [Plain JS]
function PickColor(props, handle) {
  button.onclick = () => handle.resolve('blue')
}
```
:::

- **Emitting instead.** In Vue the component can also emit `PROMPT_EVENT` (`'modal:prompt'`) with the value.
- **A guard vetoes.** `resolve()` returns `false` and the prompt stays pending. A later successful `resolve()` delivers the new value.
- **Closing without a value.** Escape, the backdrop or `close()` resolve the prompt with `null`.
- **Results for any modal.** Every handle has `handle.result`, which is a promise of the resolved value or `null`.
