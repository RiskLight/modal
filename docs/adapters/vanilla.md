# Plain JS

## Markup in HTML

Describe modals as `<template>` in your page and open them by name:

```html
<template data-modal="confirm">
  <div class="card">
    <h2 data-prop="question"></h2>
    <button data-resolve="true">Yes</button>
    <button data-close>No</button>
  </div>
</template>

<template data-modal="rename">
  <form data-resolve>
    <input name="title" data-prop="title" />
    <button type="submit">Save</button>
    <button type="button" data-close>Cancel</button>
  </form>
</template>
```

```js
import { createVanillaModal } from '@risklight/modal/vanilla'

const modal = createVanillaModal()
const ok = await modal.prompt('confirm', { question: 'Delete?' })
const data = await modal.prompt('rename', { title: 'Report' })
```

| Attribute | Effect |
|---|---|
| `data-prop="key"` | Fills `props[key]` as text, or as the value of `input`, `textarea` and `select`. It never inserts HTML. |
| `data-resolve="value"` | On click, resolves the prompt. `true`, `false`, `null`, numbers and JSON are parsed, and anything else is passed as a string. |
| `<form data-resolve>` | On submit, resolves with the form data as an object. |
| `data-close` | On click, closes the modal (a prompt resolves with `null`). |
| `data-emit="name"` | On click, emits an event that `handle.on('name', fn)` receives. |

A template with one root element uses that element as the dialog surface. Several roots get a wrapper.

## A separate HTML file

Keep a modal in its own file, the way you would with a `.vue` file:

```js
import { fromHTML } from '@risklight/modal/vanilla'
import renameHtml from './rename.html?raw'

const Rename = fromHTML(renameHtml)
const data = await modal.prompt(Rename, { title: 'Report' })
```

## Adding behaviour to a template

```js
import { fromTemplate } from '@risklight/modal/vanilla'

const Counter = fromTemplate('#counter', (root, props, handle) => {
  let count = props.start
  root.querySelector('.inc').onclick = () => (root.querySelector('.count').textContent = ++count)
  return () => {}
})
```

The setup function runs after the bindings are applied. Return a function to clean up when the modal closes. `fromHTML(html, setup)` works the same way.

## Function components

```js
import { createVanillaModal } from '@risklight/modal/vanilla'

const modal = createVanillaModal()

function Confirm({ question }, handle) {
  const box = document.createElement('div')
  box.innerHTML = '<h2></h2><button>Yes</button>'
  box.querySelector('h2').textContent = question
  box.querySelector('button').onclick = () => handle.resolve(true)
  return box
}

const ok = await modal.prompt(Confirm, { question: 'Delete?' })
```

## Components

A component is a function `(props, handle) => Node | string | { element, destroy }`.

- **`handle`** gives you `resolve`, `close`, `onBeforeClose`, `on` and `emit`.
- **A string** is rendered as text, never as HTML.
- **`destroy`** is called when the modal closes. Use it to remove listeners.
- **Errors.** If the component throws, the error is reported and the modal closes.

## Mounting

- **Automatic.** The host mounts into `document.body` on the first open, so nothing else is needed.
- **Your own target or options.** Mount it yourself:

```js
const unmount = modal.mount('#toasts', { namespace: 'toast', trapFocus: false, className: 'toasts' })
```

- **`autoMount`.** Set it to `false`, or to a target element or selector.
- **Options.** `mount` takes the same behaviour options as the Vue and React containers.
- **Cleanup.** `modal.dispose()` closes everything and removes every host the manager created.

## Routing

Bind modals to URLs with the History API. No router library is needed:

```js
modal.routes({
  '/users/:id': 'user',
  '/settings': { modal: Settings, mode: 'push', fallback: '/' },
  '/files/:name': { modal: FileModal, props: ({ params, query }) => ({ name: params.name, tab: query.tab }) },
})
```

```html
<a href="/users/3" data-modal-link>Open user 3</a>
```

- **Entering a matching URL** opens the modal: on start for deep links, via `modal.navigate(path)`, via `<a data-modal-link>` or via back and forward.
- **Leaving the URL** closes the modal with `event.route === true`.
  - With `navigate()`, a guard veto cancels the navigation.
  - With the browser back button, a veto returns the URL to the modal.
- **Closing the modal** (Escape, backdrop, `data-close`) goes back. If the modal URL was the first entry, it goes to `fallback` (default `/`).
- **Same pattern, new params.** The same modal stays open and gets new props.
- **Targets.** A target is a component, a registered or template name, or a definition with `modal`, `props`, `mode`, `fallback` and any modal options.
- **Router options.** `modal.routes(definitions, { mode: 'hash' })` matches `#/path` instead. `links: false` turns off link interception. `modal.routes()` returns a stop function, and calling it again replaces the previous routes.

## Updating props

`handle.setProps(next)` updates an open modal:
- templates re-apply `data-prop`;
- function components receive the new props through an `update(props)` returned next to `element`;
- `fromTemplate` and `fromHTML` setup functions can return `{ update, destroy }`.

## Animations

The host uses the same classes as Vue's `TransitionGroup` (`modal-list-enter-from`, `-enter-active`, `-leave-to` and the rest), so the default styles animate modals in and out. A closing modal stays in the DOM until its transition ends. Focus and `inert` are released immediately.

- **Custom name.** `modal.mount(target, { transition: 'fade' })` uses your own class names.
- **Off.** `transition: false` disables animations.
