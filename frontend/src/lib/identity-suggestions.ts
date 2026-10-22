/** Draw locally without repeats; renew the pool when no different option remains. */
export function createIdentitySuggester(suggestions: readonly string[]) {
  const pool = [...new Set(suggestions)]
  let remaining: string[] = []
  return (current = '') => {
    if (!remaining.some((suggestion) => suggestion !== current)) remaining = [...pool]
    const candidates = remaining.filter((suggestion) => suggestion !== current)
    const next = candidates[Math.floor(Math.random() * candidates.length)]
    if (next !== undefined) remaining.splice(remaining.indexOf(next), 1)
    return next
  }
}
