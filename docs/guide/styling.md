# Styling

Containers inject a small stylesheet once (`<style id="risklight-modal-styles">`) at the start of `<head>`, so your own styles win.

| Class | Element |
|---|---|
| `.modal-container` | Full-screen backdrop wrapper, one per modal. |
| `.modal-item` | The dialog surface, which is the component's root. |
| `.modal-list-*` | Vue `TransitionGroup` classes, renamed with the `transition` prop. |

The wrapper also has `widget__modal-container__item` and the surface has `widget__modal-wrap`, so stylesheets written for jenesius-vue-modal keep working.

```css
.modal-container { background-color: rgb(15 23 42 / 0.5); }
.modal-item { border-radius: 12px; }
```

## No injection

- **Strict CSP.** Pass `nonce` to the container.
- **Your own CSS file.** Pass `unstyled` and import the stylesheet yourself:

```ts
import '@risklight/modal/style.css'
```

## Animations

- **Vue.** Uses `TransitionGroup`. Pass `transition="fade"` and write `.fade-enter-from`, `.fade-leave-to` and the other transition classes.
- **React and plain JS.** Modals mount and unmount immediately. Animate with CSS on mount, for example `@keyframes` on `.modal-item`.
