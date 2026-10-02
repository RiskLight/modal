# react-router

```bash
npm install react-router
```

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ModalRoute } from '@risklight/modal/react-router'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'users/:id', element: <ModalRoute component={UserModal} /> },
      { path: 'settings', element: <ModalRoute component={Settings} mode="push" fallback="/" /> },
    ],
  },
])

export const App = () => (
  <ModalProvider manager={modal}>
    <RouterProvider router={router} />
  </ModalProvider>
)
```

`<ModalContainer />` goes in the layout. `ModalRoute` renders nothing and opens the modal while its route is active.

| Prop | |
|---|---|
| `component` | A component or a registered name. |
| `props` | `({ params, search, location }) => props`. Defaults to the route params. |
| `mode` | `'open'` (default) replaces the stack, `'push'` stacks on top. |
| `fallback` | Where to go when the modal route was the first page. Defaults to `/`. |
| `options` | Modal options (`namespace`, `backgroundClose`, `timeout`…). |
| `manager` | An explicit manager instead of the provided one. |

## Behaviour

- **Leaving the route** closes the modal with `event.route === true`.
  - With a data router (`createBrowserRouter` and `RouterProvider`), a guard veto blocks the navigation through `useBlocker`. The page never changes underneath.
  - With `<BrowserRouter>`, a veto returns to the modal URL and keeps the same modal open.
- **Closing the modal directly** goes back, or to `fallback` for deep links.
- **Param or query changes** on the same route keep the modal and update its props without running guards.
- **StrictMode** is safe. Exactly one modal opens and guards never run on the simulated unmount.
- **Versions.** Works with react-router 7 and 8. `react-router` is an optional peer dependency, and `@risklight/modal/react` does not import it.
