import { createVanillaModal as create, fromHTML, fromTemplate, type VanillaModalCreateOptions, type VanillaModalManager } from '../../src/vanilla'
import { flush } from './fixtures'

const created: VanillaModalManager[] = []

function createVanillaModal(options?: VanillaModalCreateOptions): VanillaModalManager {
  const manager = create(options)
  created.push(manager)
  return manager
}

afterEach(() => {
  for (const manager of created.splice(0)) manager.dispose()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  document.body.removeAttribute('style')
})

function addTemplate(html: string) {
  document.body.insertAdjacentHTML('beforeend', html)
}

const click = (selector: string) => document.querySelector<HTMLElement>(selector)!.click()

describe('templates in the page', () => {
  it('opens a <template data-modal> by name without registration', async () => {
    addTemplate(`<template data-modal="confirm"><div class="confirm"><h2 data-prop="question"></h2><button class="yes" data-resolve="true">Yes</button><button class="no" data-resolve="false">No</button></div></template>`)
    const modal = createVanillaModal()
    const result = modal.prompt<boolean>('confirm', { question: 'Delete?' })
    await flush()
    expect(document.querySelector('.modal-container .confirm h2')!.textContent).toBe('Delete?')
    click('.yes')
    expect(await result).toBe(true)
  })

  it('uses the single root element of the template as the dialog surface', async () => {
    addTemplate(`<template data-modal="card"><section class="card"><h2>Title</h2></section></template>`)
    const modal = createVanillaModal()
    await modal.push('card')
    const surface = document.querySelector('.modal-container')!.firstElementChild!
    expect(surface.classList.contains('card')).toBe(true)
    expect(surface.getAttribute('role')).toBe('dialog')
    expect(surface.getAttribute('aria-labelledby')).toBe(surface.querySelector('h2')!.id)
  })

  it('wraps a template with several roots in one surface', async () => {
    addTemplate(`<template data-modal="multi"><h2>One</h2><p>Two</p></template>`)
    const modal = createVanillaModal()
    await modal.push('multi')
    const surface = document.querySelector('.modal-container')!.firstElementChild!
    expect(surface.querySelector('h2')).not.toBeNull()
    expect(surface.querySelector('p')).not.toBeNull()
  })

  it('prefers a registered component over a template with the same name', async () => {
    addTemplate(`<template data-modal="x"><p class="from-template"></p></template>`)
    const modal = createVanillaModal({ registry: { x: () => 'registered' } })
    await modal.push('x')
    expect(document.querySelector('.from-template')).toBeNull()
  })

  it('still rejects unknown names', async () => {
    const modal = createVanillaModal()
    await expect(modal.push('missing')).rejects.toMatchObject({ code: 'not-registered' })
  })

  it('renders a fresh copy each time', async () => {
    addTemplate(`<template data-modal="t"><p class="copy" data-prop="n"></p></template>`)
    const modal = createVanillaModal()
    await modal.push('t', { n: 1 })
    await modal.push('t', { n: 2 })
    expect([...document.querySelectorAll('.copy')].map(el => el.textContent)).toEqual(['1', '2'])
  })
})

describe('bindings', () => {
  it('fills text and form values from props, empty for missing ones', async () => {
    const modal = createVanillaModal()
    await modal.push(fromHTML(`<div><b data-prop="name"></b><i data-prop="missing">x</i><input data-prop="email"><textarea data-prop="bio"></textarea></div>`), { name: 'Oleg', email: 'a@b.c', bio: 'hi' })
    expect(document.querySelector('b')!.textContent).toBe('Oleg')
    expect(document.querySelector('i')!.textContent).toBe('')
    expect(document.querySelector('input')!.value).toBe('a@b.c')
    expect(document.querySelector('textarea')!.value).toBe('hi')
  })

  it('inserts prop values as text, never as html', async () => {
    const modal = createVanillaModal()
    await modal.push(fromHTML(`<div><p data-prop="x"></p></div>`), { x: '<img src=x onerror=alert(1)>' })
    expect(document.querySelector('.modal-container img')).toBeNull()
    expect(document.querySelector('.modal-container p')!.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('parses data-resolve values', async () => {
    const modal = createVanillaModal()
    const cases: [string, unknown][] = [['true', true], ['false', false], ['null', null], ['42', 42], ['{"a":1}', { a: 1 }], ['plain', 'plain'], ['', '']]
    for (const [raw, expected] of cases) {
      const result = modal.prompt(fromHTML(`<div><button data-resolve='${raw}'>go</button></div>`))
      await flush()
      click('.modal-container button')
      expect(await result).toEqual(expected)
    }
  })

  it('closes with data-close and resolves prompts with null', async () => {
    const modal = createVanillaModal()
    const result = modal.prompt(fromHTML(`<div><button data-close>Cancel</button></div>`))
    await flush()
    click('[data-close]')
    expect(await result).toBeNull()
    expect(document.querySelector('.modal-container')).toBeNull()
  })

  it('resolves a form with its data on submit', async () => {
    const modal = createVanillaModal()
    const result = modal.prompt<Record<string, string>>(fromHTML(`<form data-resolve><input name="title" data-prop="title"><select name="kind"><option>a</option><option selected>b</option></select><button type="submit">Save</button></form>`), { title: 'Report' })
    await flush()
    const form = document.querySelector('form')!
    form.querySelector('input')!.value = 'Edited'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(await result).toEqual({ title: 'Edited', kind: 'b' })
  })

  it('emits events with data-emit', async () => {
    const modal = createVanillaModal()
    const handle = await modal.push(fromHTML(`<div><button data-emit="save">Save</button></div>`))
    const listener = vi.fn()
    handle.on('save', listener)
    click('[data-emit]')
    expect(listener).toHaveBeenCalledOnce()
  })

  it('binds attributes on the root element too', async () => {
    const modal = createVanillaModal()
    const result = modal.prompt(fromHTML(`<button data-resolve="7">root</button>`))
    await flush()
    click('.modal-container button')
    expect(await result).toBe(7)
  })
})

describe('fromTemplate and setup', () => {
  it('accepts a template element or a selector', async () => {
    addTemplate(`<template id="tpl"><p class="by-id">x</p></template>`)
    const modal = createVanillaModal()
    await modal.push(fromTemplate('#tpl'))
    await modal.push(fromTemplate(document.getElementById('tpl') as HTMLTemplateElement))
    expect(document.querySelectorAll('.by-id')).toHaveLength(2)
  })

  it('throws a clear error for a missing template when opened', async () => {
    const modal = createVanillaModal()
    await expect(modal.push(fromTemplate('#nope'))).resolves.toBeTruthy()
    await flush()
    expect(document.querySelector('.modal-container')).toBeNull()
  })

  it('runs setup with the root, props and handle and keeps its cleanup', async () => {
    addTemplate(`<template id="counter"><div><span class="count">0</span><button class="inc">+</button></div></template>`)
    const destroy = vi.fn()
    const Counter = fromTemplate<{ start: number }>('#counter', (root, props, handle) => {
      let count = props.start
      const out = root.querySelector('.count')!
      out.textContent = String(count)
      root.querySelector<HTMLButtonElement>('.inc')!.onclick = () => (out.textContent = String(++count))
      expect(typeof handle.close).toBe('function')
      return destroy
    })
    const modal = createVanillaModal()
    const handle = await modal.push(Counter, { start: 5 })
    click('.inc')
    expect(document.querySelector('.count')!.textContent).toBe('6')
    await handle.close()
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('works with registry entries', async () => {
    const modal = createVanillaModal({ registry: { greet: fromHTML(`<p class="greet" data-prop="who"></p>`) } })
    await modal.push('greet', { who: 'world' })
    expect(document.querySelector('.greet')!.textContent).toBe('world')
  })
})
