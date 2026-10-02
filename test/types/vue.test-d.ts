import { defineComponent, ref } from 'vue'
import { createVueModal, type ComponentProps, type VueModalHandle } from '../../src/vue'

const Title = defineComponent({ props: { title: { type: String, required: true }, count: Number } })
const Optional = defineComponent({ props: { count: Number } })

describe('vue types', () => {
  const modal = createVueModal()

  it('infers props from the component', () => {
    expectTypeOf(modal.push).toBeCallableWith(Title, { title: 'x' })
    expectTypeOf(modal.push).toBeCallableWith(Title, ref({ title: 'x', count: 1 }))
    expectTypeOf(modal.push).toBeCallableWith(Title, () => ({ title: 'x' }))
  })

  it('rejects wrong props', () => {
    expectTypeOf<{ title: number }>().not.toMatchTypeOf<ComponentProps<typeof Title>>()
    expectTypeOf<{ count: number }>().not.toMatchTypeOf<ComponentProps<typeof Title>>()
    expectTypeOf<{ title: string }>().toMatchTypeOf<ComponentProps<typeof Title>>()
  })

  it('accepts names with loose props', () => {
    expectTypeOf(modal.push).toBeCallableWith('name', { anything: 1 })
  })

  it('types prompt results', () => {
    expectTypeOf(modal.prompt<number>(Title, { title: 'x' })).toEqualTypeOf<Promise<number | null>>()
    expectTypeOf(modal.prompt<string>('name')).toEqualTypeOf<Promise<string | null>>()
  })

  it('lets the result type be given on its own', () => {
    expectTypeOf(modal.push<boolean>(Title, { title: 'x' })).toEqualTypeOf<Promise<VueModalHandle<boolean>>>()
    expectTypeOf(modal.open<string>(Title, { title: 'x' })).toEqualTypeOf<Promise<VueModalHandle<string>>>()
  })

  it('requires props when the component has required props', () => {
    expectTypeOf(modal.push).parameters.not.toEqualTypeOf<[typeof Title]>()
    type Args = Parameters<typeof modal.open<unknown, typeof Title>>
    expectTypeOf<Args[1]>().not.toBeUndefined()
    expectTypeOf<undefined>().not.toMatchTypeOf<Args[1]>()
  })

  it('keeps props optional when every prop is optional', () => {
    expectTypeOf(modal.push).toBeCallableWith(Optional)
  })
})
