---
layout: home
hero:
  name: '@risklight/modal'
  text: Modals as a stack, not as markup
  tagline: Open modals from anywhere, await typed results, veto closing with async guards. One core for Vue, React and plain JS.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Live demo
      link: /demo
    - theme: alt
      text: GitHub
      link: https://github.com/RiskLight/modal
features:
  - title: Imperative and typed
    details: "modal.open(Component, props) from anywhere. Props are inferred from the component, prompt<R>() resolves with a typed value or null."
  - title: Async close guards
    details: "Unsaved changes? Return false from a guard and the modal stays. close() tells you whether it closed instead of throwing."
  - title: Stacks and namespaces
    details: "Push modals on top of each other, keep toasts in their own namespace with auto-close, show one at a time with singleShow."
  - title: Accessible by default
    details: "role=dialog on the surface, labelled by its heading, focus trap with focus return, inert background, Escape and backdrop handling."
  - title: Vue, React and plain JS
    details: "A framework-agnostic core with thin adapters. Works in Nuxt, under React StrictMode and on the server."
  - title: Router aware
    details: "Turn routes into modals with vue-router: open on enter, close on leave, go back on close, block navigation from a guard."
---
