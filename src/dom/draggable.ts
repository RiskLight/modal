const TRANSLATE = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/

function readOffset(element: HTMLElement): { x: number; y: number } {
  const match = TRANSLATE.exec(element.style.transform)
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 }
}

export function makeDraggable(element: HTMLElement, handle: HTMLElement): () => void {
  if (typeof document === 'undefined') return () => {}
  const touchAction = handle.style.touchAction
  handle.style.touchAction = 'none'
  let drag: { startX: number; startY: number; baseX: number; baseY: number } | undefined

  const onMove = (event: PointerEvent) => {
    if (!drag) return
    const x = drag.baseX + event.clientX - drag.startX
    const y = drag.baseY + event.clientY - drag.startY
    element.style.transform = `translate(${x}px, ${y}px)`
  }
  const end = () => {
    drag = undefined
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', end)
    document.removeEventListener('pointercancel', end)
  }
  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    end()
    const base = readOffset(element)
    drag = { startX: event.clientX, startY: event.clientY, baseX: base.x, baseY: base.y }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', end)
    document.addEventListener('pointercancel', end)
  }

  handle.addEventListener('pointerdown', onDown)
  let active = true
  return () => {
    if (!active) return
    active = false
    handle.removeEventListener('pointerdown', onDown)
    end()
    handle.style.touchAction = touchAction
  }
}
