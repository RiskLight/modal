# Accessibility

Containers render each modal as a backdrop wrapper with your component inside it. The component's root element is the dialog surface.

| Behaviour | Details |
|---|---|
| Dialog semantics | The surface gets `role="dialog"`, `aria-modal="true"` and `tabindex="-1"` unless the component sets its own, for example `role="alertdialog"`. |
| Name | `extra.ariaLabel` or `extra.ariaLabelledby`, otherwise the first heading inside (`h1`–`h6`, `[role=heading]`, `[data-modal-title]`). Headings rendered later are picked up too. |
| Initial focus | `[autofocus]`, otherwise the first focusable element, otherwise the surface. |
| Focus trap | Tab and Shift+Tab wrap inside the top modal. Focus that escapes is pulled back. |
| Focus return | Focus returns to the element that opened the modal, including for stacked modals, under `singleShow` and in React StrictMode. |
| Inert background | Everything outside the modal hosts becomes `inert`. Elements that were inert before stay inert. |
| Escape | On `keydown`. Auto-repeat and keys handled with `preventDefault()` are ignored. |
| Backdrop | Closes on click only when both press and release land on the backdrop. Dragging a text selection out of the dialog does not close it. |
| Reduced motion | Default transitions are disabled under `prefers-reduced-motion`. |

## Popovers, menus and toasts outside the modal

Elements rendered outside the modal (portaled select menus, date pickers, toasts) would become `inert`. List them in `allowOutside`:

```vue
<ModalContainer allow-outside="[data-popover], .toasts" />
```

Elements that match `allowOutside`:
- stay interactive;
- can take focus without it being pulled back;
- do not trigger Escape on the modal while focused.

## Non-modal stacks

Pass `trapFocus: false` for stacks that should not block the page, such as toasts. This skips the focus trap and `inert`.
