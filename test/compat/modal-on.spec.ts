import { mount } from '@vue/test-utils'
import { container, openModal } from '../../src/compat'
import { forceClean, ModalButton } from './fixtures'

beforeEach(() => {
  forceClean()
})

describe('Test with on method of Modal', () => {
  test('Default', async () => {
    const wrap = mount(container)
    const value = Math.random()
    let output = null
    const modal = await openModal(ModalButton, { value })
    modal.on('update', function (v) {
      output = v
    })
    await wrap.vm.$nextTick()
    await wrap.find('button').trigger('click')
    expect(output).toBe(value)
  })

  test('Event should not be handled, after unsubscribe', async () => {
    const wrap = mount(container)
    let output = 0
    const modal = await openModal(ModalButton)
    const off = modal.on('update', () => {
      output++
    })
    await wrap.vm.$nextTick()
    const button = wrap.find('button')
    await button.trigger('click')
    expect(output).toBe(1)
    off()
    await button.trigger('click')
    expect(output).toBe(1)
  })
})
