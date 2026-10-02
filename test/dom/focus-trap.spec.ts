import { focusableElements, trapFocus } from '../../src/dom'

function build(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  return root
}

function tab(shift = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true })
  ;(document.activeElement ?? document.body).dispatchEvent(event)
  return event
}

describe('focusableElements', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('finds tabbable elements in document order', () => {
    const root = build(`
      <a href="#" id="a">a</a>
      <a id="no-href">no</a>
      <button id="b">b</button>
      <button disabled>x</button>
      <input id="c">
      <input type="hidden">
      <input disabled>
      <select id="d"></select>
      <textarea id="e"></textarea>
      <div tabindex="0" id="f"></div>
      <div tabindex="-1">x</div>
      <div contenteditable="true" id="g"></div>
      <div hidden><button>hidden</button></div>
      <div inert><button>inert</button></div>
    `)
    expect(focusableElements(root).map(el => el.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  it('returns an empty list when nothing is focusable', () => {
    expect(focusableElements(build('<p>text</p>'))).toEqual([])
  })
})

describe('trapFocus', () => {
  let opener: HTMLButtonElement
  beforeEach(() => {
    opener = document.createElement('button')
    opener.id = 'opener'
    document.body.append(opener)
    opener.focus()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('focuses the first focusable element', () => {
    const root = build('<p>t</p><button id="one">1</button><button id="two">2</button>')
    const off = trapFocus(root)
    expect(document.activeElement?.id).toBe('one')
    off()
  })

  it('prefers an element with autofocus', () => {
    const root = build('<button id="one">1</button><input id="auto" autofocus>')
    const off = trapFocus(root)
    expect(document.activeElement?.id).toBe('auto')
    off()
  })

  it('focuses initialFocus given as an element or selector', () => {
    const root = build('<button id="one">1</button><button id="two">2</button>')
    let off = trapFocus(root, { initialFocus: root.querySelector<HTMLElement>('#two')! })
    expect(document.activeElement?.id).toBe('two')
    off()
    off = trapFocus(root, { initialFocus: '#two' })
    expect(document.activeElement?.id).toBe('two')
    off()
  })

  it('focuses the container itself when nothing inside is focusable', () => {
    const root = build('<p>plain</p>')
    const off = trapFocus(root)
    expect(document.activeElement).toBe(root)
    expect(root.getAttribute('tabindex')).toBe('-1')
    off()
    expect(root.hasAttribute('tabindex')).toBe(false)
  })

  it('keeps an existing tabindex on the container', () => {
    const root = build('<p>plain</p>')
    root.setAttribute('tabindex', '0')
    const off = trapFocus(root)
    off()
    expect(root.getAttribute('tabindex')).toBe('0')
  })

  it('wraps Tab from the last to the first element', () => {
    const root = build('<button id="one">1</button><button id="two">2</button>')
    const off = trapFocus(root)
    root.querySelector<HTMLElement>('#two')!.focus()
    const event = tab()
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('one')
    off()
  })

  it('wraps Shift+Tab from the first to the last element', () => {
    const root = build('<button id="one">1</button><button id="two">2</button>')
    const off = trapFocus(root)
    const event = tab(true)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('two')
    off()
  })

  it('leaves Tab alone in the middle of the list', () => {
    const root = build('<button id="one">1</button><button id="two">2</button><button id="three">3</button>')
    const off = trapFocus(root)
    root.querySelector<HTMLElement>('#two')!.focus()
    expect(tab().defaultPrevented).toBe(false)
    off()
  })

  it('keeps focus on the container when nothing is focusable', () => {
    const root = build('<p>plain</p>')
    const off = trapFocus(root)
    expect(tab().defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(root)
    off()
  })

  it('moves Shift+Tab from the container to the last element', () => {
    const root = build('<button id="one">1</button><button id="two">2</button>')
    const off = trapFocus(root)
    root.setAttribute('tabindex', '-1')
    root.focus()
    tab(true)
    expect(document.activeElement?.id).toBe('two')
    off()
  })

  it('pulls focus back when it moves outside', () => {
    const root = build('<button id="one">1</button>')
    const off = trapFocus(root)
    opener.focus()
    expect(document.activeElement?.id).toBe('one')
    off()
  })

  it('returns focus to the opener on dispose', () => {
    const root = build('<button id="one">1</button>')
    const off = trapFocus(root)
    off()
    off()
    expect(document.activeElement).toBe(opener)
  })

  it('skips returning focus when disabled', () => {
    const root = build('<button id="one">1</button>')
    const off = trapFocus(root, { returnFocus: false })
    off()
    expect(document.activeElement).not.toBe(opener)
  })

  it('does not return focus to a detached opener', () => {
    const root = build('<button id="one">1</button>')
    const off = trapFocus(root)
    opener.remove()
    expect(() => off()).not.toThrow()
  })

  it('lets only the newest trap enforce focus and restores the previous trap after dispose', () => {
    const first = build('<button id="first">1</button>')
    const offFirst = trapFocus(first)
    const second = build('<button id="second">2</button>')
    const offSecond = trapFocus(second)
    expect(document.activeElement?.id).toBe('second')
    opener.focus()
    expect(document.activeElement?.id).toBe('second')
    offSecond()
    expect(document.activeElement?.id).toBe('first')
    opener.focus()
    expect(document.activeElement?.id).toBe('first')
    offFirst()
    expect(document.activeElement).toBe(opener)
  })

  it('stops enforcing after dispose', () => {
    const root = build('<button id="one">1</button>')
    trapFocus(root, { returnFocus: false })()
    opener.focus()
    expect(document.activeElement).toBe(opener)
  })
})

describe('trapFocus fallbacks', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('falls back to the first focusable when the initialFocus selector matches nothing', () => {
    const root = build('<button id="one">1</button>')
    const off = trapFocus(root, { initialFocus: '#missing' })
    expect(document.activeElement?.id).toBe('one')
    off()
  })

  it('ignores non-Tab keys', () => {
    const root = build('<button id="one">1</button><button id="two">2</button>')
    const off = trapFocus(root)
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    document.activeElement!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    off()
  })

  it('works when nothing was focused before', () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    const root = build('<button id="one">1</button>')
    const off = trapFocus(root)
    expect(() => off()).not.toThrow()
  })
})
