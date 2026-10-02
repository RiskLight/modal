import { createVanillaModal, type VanillaComponent, type VanillaComponentProps, type VanillaModalHandle } from '../../src/vanilla'

declare const Required: VanillaComponent<{ title: string; count?: number }>
declare const Optional: VanillaComponent<{ count?: number }>

describe('vanilla types', () => {
  const modal = createVanillaModal()

  it('infers props and keeps optional props optional', () => {
    expectTypeOf(modal.push).toBeCallableWith(Required, { title: 'x' })
    expectTypeOf(modal.push).toBeCallableWith(Optional)
    expectTypeOf<{ title: number }>().not.toMatchTypeOf<VanillaComponentProps<typeof Required>>()
  })

  it('requires props when the component has required props', () => {
    type Args = Parameters<typeof modal.open<unknown, typeof Required>>
    expectTypeOf<undefined>().not.toMatchTypeOf<Args[1]>()
  })

  it('types results and mount', () => {
    expectTypeOf(modal.push<boolean>(Required, { title: 'x' })).toEqualTypeOf<Promise<VanillaModalHandle<boolean>>>()
    expectTypeOf(modal.prompt<number>(Optional)).toEqualTypeOf<Promise<number | null>>()
    expectTypeOf(modal.mount()).toEqualTypeOf<() => void>()
  })
})
