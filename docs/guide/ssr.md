# SSR

- **Core.** The core never touches the DOM.
- **DOM behaviour.** Behaviours (Escape, scroll lock, focus, `inert`, styles) attach only in the browser, after mount.
- **One manager per request.** Create a manager per request on the server, so modals never leak between users.

```ts
export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.use(createVueModal())
})
```

- **Server rendering.** Modals opened before rendering, with `requireHost: false`, are rendered into the HTML.
- **Route modals.** They open only in the browser.
- **React.** `useModalSnapshot` provides a server snapshot, so `renderToString` works.
