import { makeDraggable } from '../../src/dom'

function pointer(type: string, target: EventTarget, x: number, y: number, extra: PointerEventInit = {}) {
  target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, pointerType: 'mouse', ...extra }))
}

describe('makeDraggable', () => {
  let el: HTMLElement
  let handle: HTMLElement
  beforeEach(() => {
    el = document.createElement('div')
    handle = document.createElement('div')
    el.append(handle)
    document.body.append(el)
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves the element by the pointer delta', () => {
    const off = makeDraggable(el, handle)
    pointer('pointerdown', handle, 10, 10)
    pointer('pointermove', document, 30, 50)
    expect(el.style.transform).toBe('translate(20px, 40px)')
    pointer('pointerup', document, 30, 50)
    off()
  })

  it('accumulates across drags', () => {
    const off = makeDraggable(el, handle)
    pointer('pointerdown', handle, 0, 0)
    pointer('pointermove', document, 10, 10)
    pointer('pointerup', document, 10, 10)
    pointer('pointerdown', handle, 100, 100)
    pointer('pointermove', document, 105, 90)
    expect(el.style.transform).toBe('translate(15px, 0px)')
    pointer('pointerup', document, 105, 90)
    off()
  })

  it('stops moving after pointerup and pointercancel', () => {
    const off = makeDraggable(el, handle)
    pointer('pointerdown', handle, 0, 0)
    pointer('pointerup', document, 0, 0)
    pointer('pointermove', document, 50, 50)
    expect(el.style.transform).toBe('')
    pointer('pointerdown', handle, 0, 0)
    pointer('pointercancel', document, 0, 0)
    pointer('pointermove', document, 50, 50)
    expect(el.style.transform).toBe('')
    off()
  })

  it('ignores secondary mouse buttons', () => {
    const off = makeDraggable(el, handle)
    pointer('pointerdown', handle, 0, 0, { button: 2 })
    pointer('pointermove', document, 50, 50)
    expect(el.style.transform).toBe('')
    off()
  })

  it('removes document listeners when disposed mid-drag', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const off = makeDraggable(el, handle)
    pointer('pointerdown', handle, 0, 0)
    off()
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function))
    remove.mockRestore()
    pointer('pointermove', document, 50, 50)
    expect(el.style.transform).toBe('')
  })

  it('ignores pointerdown after dispose', () => {
    const off = makeDraggable(el, handle)
    off()
    off()
    pointer('pointerdown', handle, 0, 0)
    pointer('pointermove', document, 50, 50)
    expect(el.style.transform).toBe('')
  })

  it('disables touch scrolling on the handle and restores it', () => {
    handle.style.touchAction = 'pan-y'
    const off = makeDraggable(el, handle)
    expect(handle.style.touchAction).toBe('none')
    off()
    expect(handle.style.touchAction).toBe('pan-y')
  })

  it('keeps an existing translate when starting', () => {
    el.style.transform = 'translate(5px, 6px)'
    const off = makeDraggable(el, handle)
    pointer('pointerdown', handle, 0, 0)
    pointer('pointermove', document, 1, 1)
    expect(el.style.transform).toBe('translate(6px, 7px)')
    off()
  })
})
