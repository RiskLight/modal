export function report(error: unknown): void {
  const reportError = (globalThis as { reportError?: (error: unknown) => void }).reportError
  if (typeof reportError === 'function') reportError(error)
  else console.error(error)
}
