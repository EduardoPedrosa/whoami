import { describe, expect, it } from 'vitest'
import { MemoryStore } from '../src/storage/memory-store'
import { GameService, tokenHash } from '../src/game/game.service'
import { randomUUID } from 'node:crypto'

describe('memory storage guarantees', () => {
  it('rolls back room, session and receipt changes together after a failed command', () => {
    const store = new MemoryStore()
    const game = new GameService(store)
    const token = 'a'.repeat(64)
    const hash = tokenHash(token)
    const result = game.execute(hash, token, {
      type: 'room:create',
      requestId: randomUUID(),
      profile: { name: 'Alice', avatar: 'planet' },
      settings: { category: 'Tudo vale' },
    })
    if (!result.ok || !result.room) throw new Error('Missing room')
    const code = result.room.code
    expect(() =>
      store.transaction(() => {
        store.deleteRoom(code)
        store.saveReceipt(hash, 'failed', { code, fingerprint: 'test' })
        throw new Error('Interrupted action')
      }),
    ).toThrow('Interrupted action')
    expect(game.current(hash)?.code).toBe(code)
    expect(store.receipt(hash, 'failed')).toBeUndefined()
    const detached = store.room(code)!
    detached.players[0]!.identity = 'Must stay private'
    expect(store.room(code)?.players[0]?.identity).toBeNull()
    expect(new GameService(new MemoryStore()).current(hash)).toBeNull()
  })
})
