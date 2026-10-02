import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('vue-router stays optional', () => {
  it.each(files('src').filter(path => path.endsWith('.ts')))('%s does not import vue-router', path => {
    expect(readFileSync(path, 'utf8')).not.toMatch(/from\s+['"]vue-router['"]/)
  })
})
