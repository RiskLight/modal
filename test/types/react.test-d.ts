import type { ComponentType } from 'react'
import { createReactModal, type ReactComponentProps, type ReactModalHandle } from '../../src/react'

declare const Required: ComponentType<{ title: string; count?: number }>
declare const Optional: ComponentType<{ count?: number }>

describe('react types', () => {
  const modal = createReactModal()

  it('infers props and keeps optional props optional', () => {
    expectTypeOf(modal.push).toBeCallableWith(Required, { title: 'x' })
    expectTypeOf(modal.push).toBeCallableWith(Optional)
    expectTypeOf<{ title: number }>().not.toMatchTypeOf<ReactComponentProps<typeof Required>>()
  })

  it('requires props when the component has required props', () => {
    type Args = Parameters<typeof modal.open<unknown, typeof Required>>
    expectTypeOf<undefined>().not.toMatchTypeOf<Args[1]>()
  })

  it('types results', () => {
    expectTypeOf(modal.push<boolean>(Required, { title: 'x' })).toEqualTypeOf<Promise<ReactModalHandle<boolean>>>()
    expectTypeOf(modal.prompt<number>(Optional)).toEqualTypeOf<Promise<number | null>>()
    expectTypeOf(modal.prompt<string>('name')).toEqualTypeOf<Promise<string | null>>()
  })
})
