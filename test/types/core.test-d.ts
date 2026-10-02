import { createModal } from '../../src'
import type { ModalHandle, NamespaceSnapshot } from '../../src'

const A = { name: 'A' }
type Comp = typeof A

describe('core types', () => {
  it('infers prompt result type', () => {
    const m = createModal<Comp>()
    expectTypeOf(m.prompt<number>(A)).toEqualTypeOf<Promise<number | null>>()
  })

  it('types handle result and resolve', () => {
    const m = createModal<Comp>()
    expectTypeOf(m.push<string>(A)).toEqualTypeOf<Promise<ModalHandle<Comp, string>>>()
    type H = ModalHandle<Comp, string>
    expectTypeOf<H['result']>().toEqualTypeOf<Promise<string | null>>()
    expectTypeOf<Parameters<H['resolve']>[0]>().toEqualTypeOf<string>()
  })

  it('accepts a component or a registry name', () => {
    const m = createModal<Comp>()
    expectTypeOf(m.push).toBeCallableWith(A)
    expectTypeOf(m.push).toBeCallableWith('name')
  })

  it('types snapshots', () => {
    const m = createModal<Comp>()
    expectTypeOf(m.getSnapshot()).toEqualTypeOf<NamespaceSnapshot<Comp>>()
    expectTypeOf(m.getSnapshot().items[0]!.component).toEqualTypeOf<Comp>()
  })
})
