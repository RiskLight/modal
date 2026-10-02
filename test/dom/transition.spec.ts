import { enterTransition, leaveTransition } from '../../src/dom'

function styled(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
}

function element() {
  const el = document.createElement('div')
  document.body.append(el)
  return el
}

const frames = async () => {
  await vi.advanceTimersByTimeAsync(40)
}

describe('enterTransition', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('applies enter-from and enter-active, then swaps to enter-to and cleans up', async () => {
    styled('.fade-enter-active { transition: opacity 200ms ease; }')
    const el = element()
    enterTransition(el, 'fade')
    expect([...el.classList]).toEqual(['fade-enter-from', 'fade-enter-active'])
    await frames()
    expect(el.classList.contains('fade-enter-from')).toBe(false)
    expect(el.classList.contains('fade-enter-to')).toBe(true)
    await vi.advanceTimersByTimeAsync(250)
    expect([...el.classList]).toEqual([])
  })

  it('finishes on transitionend before the timeout', async () => {
    styled('.fade-enter-active { transition: opacity 5s; }')
    const el = element()
    enterTransition(el, 'fade')
    await frames()
    el.dispatchEvent(new Event('transitionend'))
    expect(el.classList.contains('fade-enter-active')).toBe(false)
  })

  it('cleans up immediately without a duration', async () => {
    const el = element()
    enterTransition(el, 'none')
    await frames()
    expect([...el.classList]).toEqual([])
  })

  it('can be cancelled', async () => {
    styled('.fade-enter-active { transition: opacity 200ms; }')
    const el = element()
    const cancel = enterTransition(el, 'fade')
    cancel()
    expect([...el.classList]).toEqual([])
    await vi.advanceTimersByTimeAsync(300)
    expect([...el.classList]).toEqual([])
  })
})

describe('leaveTransition', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('keeps the element until the leave transition ends, then calls done', async () => {
    styled('.fade-leave-active { transition: opacity 200ms; }')
    const el = element()
    const done = vi.fn()
    leaveTransition(el, 'fade', done)
    expect(el.classList.contains('fade-leave-from')).toBe(true)
    expect(el.classList.contains('fade-leave-active')).toBe(true)
    await frames()
    expect(el.classList.contains('fade-leave-to')).toBe(true)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(250)
    expect(done).toHaveBeenCalledOnce()
  })

  it('calls done right away without a duration', async () => {
    const el = element()
    const done = vi.fn()
    leaveTransition(el, 'none', done)
    await frames()
    expect(done).toHaveBeenCalledOnce()
  })

  it('reads animation durations too', async () => {
    styled('.pop-leave-active { animation: pop 300ms; }')
    const el = element()
    const done = vi.fn()
    leaveTransition(el, 'pop', done)
    await vi.advanceTimersByTimeAsync(200)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(done).toHaveBeenCalledOnce()
  })

  it('finishes immediately when cancelled and never twice', async () => {
    styled('.fade-leave-active { transition: opacity 200ms; }')
    const el = element()
    const done = vi.fn()
    const finish = leaveTransition(el, 'fade', done)
    finish()
    finish()
    await vi.advanceTimersByTimeAsync(300)
    expect(done).toHaveBeenCalledOnce()
  })
})
