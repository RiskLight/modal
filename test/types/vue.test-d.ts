import { defineComponent, ref } from 'vue'
import { createVueModal, type ComponentProps, type VueModalHandle } from '../../src/vue'

const Title = defineComponent({ props: { title: { type: String, required: true }, count: Number } })

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

  it('types handles', () => {
    expectTypeOf(modal.push<typeof Title, boolean>(Title, { title: 'x' })).toEqualTypeOf<Promise<VueModalHandle<boolean>>>()
  })
})
