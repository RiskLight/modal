import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

const sources = [...files('src/core'), 'src/index.ts'].map(path => ({ path, text: readFileSync(path, 'utf8') }))

describe('core purity', () => {
  it.each(sources.map(s => [s.path, s.text]))('%s imports no framework', (_path, text) => {
    expect(text).not.toMatch(/from\s+['"](vue|vue-router|react|react-dom)(\/[^'"]*)?['"]/)
    expect(text).not.toMatch(/from\s+['"]\.\.\/(vue|dom|react)\//)
  })

  it.each(sources.map(s => [s.path, s.text]))('%s touches no DOM global', (_path, text) => {
    expect(text).not.toMatch(/\b(document|window|HTMLElement|navigator)\b/)
  })

  it.each(sources.map(s => [s.path, s.text]))('%s contains no comments', (_path, text) => {
    expect(text).not.toMatch(/(^|\s)\/\/|\/\*/m)
  })

  it('runs without a DOM', () => {
    expect(typeof (globalThis as Record<string, unknown>).document).toBe('undefined')
  })
})
