import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATEGORIES, IDENTITY_SUGGESTIONS, commandSchema } from '@whoami/shared'
import { createIdentitySuggester } from './identity-suggestions'

afterEach(() => vi.restoreAllMocks())
describe('identity suggestions', () => {
  it('provides at least sixty valid and unique names for every category', () => {
    for (const category of CATEGORIES) {
      const pool = IDENTITY_SUGGESTIONS[category]
      expect(pool.length).toBeGreaterThanOrEqual(60)
      expect(new Set(pool).size).toBe(pool.length)
      for (const identity of pool)
        expect(
          commandSchema.safeParse({
            type: 'identity:set',
            requestId: '123e4567-e89b-42d3-a456-426614174000',
            round: 1,
            identity,
          }).success,
        ).toBe(true)
    }
    expect(IDENTITY_SUGGESTIONS['Tudo vale'].length).toBe(270)
  })
  it('exhausts the entire category without repeats and avoids repeating the last item on renewal', () => {
    const pool = IDENTITY_SUGGESTIONS['Cinema e séries']
    const draw = createIdentitySuggester(pool)
    const results: string[] = []
    let current = ''
    for (let i = 0; i < pool.length; i++) {
      current = draw(current)!
      results.push(current)
    }
    expect(new Set(results).size).toBe(pool.length)
    expect(new Set(results)).toEqual(new Set(pool))
    expect(draw(current)).not.toBe(current)
  })
  it('uses randomness and does not overwrite manual input with the same identity', () => {
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValue(0)
    expect(createIdentitySuggester(['A', 'B', 'C'])()).toBe('A')
    random.mockReturnValue(0.9999)
    expect(createIdentitySuggester(['A', 'B', 'C'])()).toBe('C')
    expect(createIdentitySuggester(['A', 'B', 'C'])('C')).not.toBe('C')
    expect(createIdentitySuggester([])()).toBeUndefined()
  })
})
