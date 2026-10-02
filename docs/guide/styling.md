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

All adapters use the same classes as Vue's `TransitionGroup`:
- `modal-list-enter-from`, `-enter-active`, `-enter-to`;
- `modal-list-leave-from`, `-leave-active`, `-leave-to`.

The default stylesheet fades the backdrop and slides the dialog. A closing modal stays in the DOM until its CSS transition or animation ends. Focus and `inert` are released as soon as closing starts.

```css
.fade-enter-active, .fade-leave-active { transition: opacity 150ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
```

- **Custom name.** Pass `transition="fade"` to `<ModalContainer>` in Vue and React, or `{ transition: 'fade' }` to `mount()` in plain JS.
- **Off.** `transition={false}` (React) or `transition: false` (plain JS) disables animations.
