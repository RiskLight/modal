import { config, getComponentFromStore } from '../../src/compat'
import { ModalTitle } from './fixtures'

beforeEach(() => {
  config({ store: {} })
})

describe('Checking modal in the store', () => {
  test('Be default is undefined', () => {
    expect(getComponentFromStore('any')).toBe(undefined)
  })

  test('Add new component, but getting by wrong name', () => {
    config({ store: { alert: ModalTitle } })
    expect(getComponentFromStore('aler')).toBe(undefined)
  })

  test('Add new component and get it', () => {
    config({ store: { alert: ModalTitle } })
    expect(getComponentFromStore('alert')).toBe(ModalTitle)
  })

  test('Returns extended store entries as they were configured', () => {
    const entry = { component: ModalTitle, backgroundClose: false }
    config({ store: { alert: entry } })
    expect(getComponentFromStore('alert')).toBe(entry)
  })

  test('Does not resolve inherited keys', () => {
    expect(getComponentFromStore('toString')).toBe(undefined)
  })
})
