# React

```tsx
import { createReactModal, ModalContainer, ModalProvider } from '@risklight/modal/react'

const modal = createReactModal()

export function App() {
  return (
    <ModalProvider manager={modal}>
      <Routes />
      <ModalContainer />
    </ModalProvider>
  )
}
```

```tsx
import { useModal } from '@risklight/modal/react'

function DeleteButton() {
  const modal = useModal()
  return <button onClick={() => modal.prompt<boolean>(Confirm, { title: 'Delete?' })}>Delete</button>
}
```

## Inside a modal

```tsx
import { useBeforeModalClose, useCurrentModal, useModalResolve } from '@risklight/modal/react'

function Confirm({ title }: { title: string }) {
  const resolve = useModalResolve<boolean>()
  useBeforeModalClose(event => !event.background)
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={() => resolve(true)}>Yes</button>
    </div>
  )
}
```

- **Guard closures.** `useBeforeModalClose` always calls the latest closure.
- **Events.** A listener added with `handle.on('save', fn)` reaches the component as an `onSave` prop. It is combined with any `onSave` you pass in props.

## `<ModalContainer>` props

- **Container behaviour.** `namespace`, `trapFocus`, `behaviors`, `escapeEvent`, `backdropTrigger`, `allowOutside`, `unstyled`, `nonce` and `manager` work as in Vue.
- **HTML attributes.** Any other attribute (`className`, `style`, `id`) goes to the host `<div>`.
- **No portal.** The container renders where you put it.

## State

`useModalSnapshot(namespace?)` uses `useSyncExternalStore` and works with SSR and concurrent rendering. The adapter is tested under StrictMode with React 18 and 19.
