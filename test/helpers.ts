export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

export function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export function settle<T>(promise: Promise<T>): { readonly state: 'pending' | 'fulfilled' | 'rejected'; readonly value: T | undefined; readonly error: unknown } {
  const box: { state: 'pending' | 'fulfilled' | 'rejected'; value: T | undefined; error: unknown } = { state: 'pending', value: undefined, error: undefined }
  promise.then(
    value => {
      box.state = 'fulfilled'
      box.value = value
    },
    error => {
      box.state = 'rejected'
      box.error = error
    },
  )
  return box
}

export const A = { name: 'A' }
export const B = { name: 'B' }
export const C = { name: 'C' }
