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

describe('adapters stay separate', () => {
  it.each(files('src/vue'))('%s does not import react', path => {
    expect(readFileSync(path, 'utf8')).not.toMatch(/from\s+['"]react/)
  })

  it.each(files('src/vanilla'))('%s imports no framework or other adapter', path => {
    expect(readFileSync(path, 'utf8')).not.toMatch(/from\s+['"](vue|vue-router|react|react-dom)(\/[^'"]*)?['"]/)
    expect(readFileSync(path, 'utf8')).not.toMatch(/from\s+['"]\.\.\/(vue|react)\//)
  })

  it.each(files('src/react'))('%s does not import vue', path => {
    expect(readFileSync(path, 'utf8')).not.toMatch(/from\s+['"](vue|vue-router)['"]/)
    expect(readFileSync(path, 'utf8')).not.toMatch(/from\s+['"]\.\.\/(vue)\//)
  })
})
