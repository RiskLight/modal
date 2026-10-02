type Phase = 'enter' | 'leave'

function nextFrame(callback: () => void): () => void {
  let inner: number | undefined
  const outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(callback)
  })
  return () => {
    cancelAnimationFrame(outer)
    if (inner !== undefined) cancelAnimationFrame(inner)
  }
}

function toMs(value: string): number {
  const trimmed = value.trim()
  const amount = Number.parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(amount)) return 0
  return trimmed.endsWith('ms') ? amount : amount * 1000
}

function longest(durations: string, delays: string): number {
  const durationList = durations.split(',').map(toMs)
  const delayList = delays.split(',').map(toMs)
  return Math.max(0, ...durationList.map((duration, index) => duration + (delayList[index % delayList.length] ?? 0)))
}

const TIME = /^-?[\d.]+m?s$/

function fromShorthand(shorthand: string): number {
  return Math.max(
    0,
    ...shorthand.split(',').map(part => {
      const [duration = '0s', delay = '0s'] = part.trim().split(/\s+/).filter(token => TIME.test(token))
      return toMs(duration) + toMs(delay)
    }),
  )
}

function timeOf(duration: string, delay: string, shorthand: string): number {
  return duration ? longest(duration, delay || '0s') : fromShorthand(shorthand)
}

function timeoutOf(element: Element): number {
  const style = getComputedStyle(element)
  return Math.max(
    timeOf(style.transitionDuration, style.transitionDelay, style.transition),
    timeOf(style.animationDuration, style.animationDelay, style.animation),
  )
}

function classes(name: string, phase: Phase) {
  return { from: `${name}-${phase}-from`, active: `${name}-${phase}-active`, to: `${name}-${phase}-to` }
}

function run(element: HTMLElement, name: string, phase: Phase, done: () => void): () => void {
  const { from, active, to } = classes(name, phase)
  let finished = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const onEnd = (event: Event) => {
    if (event.target === element) finish()
  }
  const cleanup = () => {
    cancelFrame()
    if (timer !== undefined) clearTimeout(timer)
    element.removeEventListener('transitionend', onEnd)
    element.removeEventListener('animationend', onEnd)
    element.classList.remove(from, active, to)
  }
  const finish = () => {
    if (finished) return
    finished = true
    cleanup()
    done()
  }
  element.classList.add(from, active)
  if (timeoutOf(element) <= 0) {
    let cancelFrame = () => {}
    finished = true
    element.classList.remove(from, active, to)
    done()
    return () => cancelFrame()
  }
  const cancelFrame = nextFrame(() => {
    element.classList.remove(from)
    element.classList.add(to)
    const timeout = timeoutOf(element)
    if (timeout <= 0) {
      finish()
      return
    }
    element.addEventListener('transitionend', onEnd)
    element.addEventListener('animationend', onEnd)
    timer = setTimeout(finish, timeout + 1)
  })
  return finish
}

export function enterTransition(element: HTMLElement, name: string): () => void {
  if (typeof document === 'undefined') return () => {}
  let cancelled = false
  const finish = run(element, name, 'enter', () => {
    cancelled = true
  })
  return () => {
    if (!cancelled) finish()
  }
}

export function leaveTransition(element: HTMLElement, name: string, done: () => void): () => void {
  if (typeof document === 'undefined') {
    done()
    return () => {}
  }
  return run(element, name, 'leave', done)
}
