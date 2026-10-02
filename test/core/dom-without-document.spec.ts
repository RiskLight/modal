import { createModal } from '../../src'
import { acquireBehaviors, bindEscape, bindScrollLock, makeDraggable, trapFocus } from '../../src/dom'

describe('dom helpers without a document', () => {
  it('return no-op disposers', () => {
    const m = createModal()
    const element = {} as HTMLElement
    for (const dispose of [bindEscape(m), bindScrollLock(m), trapFocus(element), makeDraggable(element, element), acquireBehaviors(m)]) {
      expect(typeof dispose).toBe('function')
      expect(() => dispose()).not.toThrow()
    }
  })
})
