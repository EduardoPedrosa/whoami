import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Ack, Command, CommandInput, RoomView } from '@whoami/shared'
import { GameService, tokenHash } from '../src/game/game.service'
import { DatabaseService } from '../src/storage/database.service'

const alice = 'a'.repeat(64)
const bob = 'b'.repeat(64)
const charlie = 'c'.repeat(64)
let db: DatabaseService
let game: GameService
function send(token: string, input: CommandInput, requestId = randomUUID()) {
  return game.execute(tokenHash(token), token, {
    ...input,
    requestId,
  } as Command)
}
function room(response: Ack): RoomView {
  if (!response.ok || !response.room) throw new Error(JSON.stringify(response))
  return response.room
}
function create(token = alice, name = 'Alice') {
  return room(
    send(token, {
      type: 'room:create',
      profile: { name, avatar: 'planet' },
      settings: { category: 'Tudo vale' },
    }),
  )
}
function joinRoom(code: string, token = bob, name = 'Bob') {
  return room(
    send(token, {
      type: 'room:join',
      code,
      profile: { name, avatar: 'ghost' },
    }),
  )
}
function begin() {
  const r = create(alice, 'Alice')
  joinRoom(r.code)
  send(alice, { type: 'room:ready', ready: true })
  send(bob, { type: 'room:ready', ready: true })
  return room(send(alice, { type: 'room:begin' }))
}
function playing() {
  const assigning = begin()
  send(alice, {
    type: 'identity:set',
    identity: 'Batman',
    round: assigning.round,
  })
  return room(
    send(bob, {
      type: 'identity:set',
      identity: 'hidden',
      round: assigning.round,
    }),
  )
}

beforeEach(() => {
  process.env.DATABASE_PATH = ':memory:'
  db = new DatabaseService()
  game = new GameService(db)
  game.onModuleInit()
})
afterEach(() => {
  db.close()
})

describe('room lifecycle and authority', () => {
  it('isolates private rooms and rejects names reused within the same room', () => {
    const a = create()
    const b = create(bob, 'Bob')
    expect(a.code).not.toBe(b.code)
    expect(game.current(tokenHash(alice))?.players).toHaveLength(1)
    expect(() => joinRoom(a.code, charlie, 'alice')).toThrow('Já tem alguém')
    expect(() => joinRoom('ABC234', charlie)).toThrow('Essa sala não existe')
  })
  it('requires membership, host rights, two players and everyone ready', () => {
    expect(() => send(bob, { type: 'room:begin' })).toThrow('Entre em uma sala')
    const a = create()
    expect(() => send(alice, { type: 'room:begin' })).toThrow('Chame mais uma')
    joinRoom(a.code)
    expect(() => send(bob, { type: 'room:begin' })).toThrow('Só o anfitrião')
    expect(() => send(alice, { type: 'room:begin' })).toThrow('Espere todo mundo')
  })
  it('invalidates readiness after settings change', () => {
    const a = create()
    joinRoom(a.code)
    send(alice, { type: 'room:ready', ready: true })
    const r = room(
      send(alice, {
        type: 'room:settings',
        settings: { category: 'Mundo pop' },
      }),
    )
    expect(r.players.every((p) => !p.ready)).toBe(true)
    expect(() => send(bob, { type: 'room:settings', settings: r.settings })).toThrow(
      'Só o anfitrião',
    )
  })
  it('bounds capacity at twelve people', () => {
    const a = create()
    for (let i = 1; i < 12; i++) joinRoom(a.code, i.toString(16).padStart(64, '0'), `Pessoa ${i}`)
    expect(() => joinRoom(a.code, bob)).toThrow('Essa sala está cheia')
  })
})

describe('secrets, authorship and turns', () => {
  it('never sends the own identity before the player solves, including literal hidden', () => {
    const a = playing()
    const aView = game.current(tokenHash(alice))!
    const bView = game.current(tokenHash(bob))!
    expect(aView.players.find((p) => p.id === aView.selfId)?.identity).toBeNull()
    expect(bView.players.find((p) => p.id === bView.selfId)?.identity).toBeNull()
    expect(bView.players.find((p) => p.id !== bView.selfId)?.identity).toBe('hidden')
    expect(aView.players.find((p) => p.id !== aView.selfId)?.identity).toBe('Batman')
    expect(a.phase).toBe('playing')
  })
  it('hides every card during assignment and starts automatically when all submit', () => {
    const r = begin()
    const first = room(send(alice, { type: 'identity:set', identity: 'Batman', round: r.round }))
    expect(first.players.every((p) => p.identity === null)).toBe(true)
    expect(first.submittedIdentity).toBe('Batman')
    expect(game.current(tokenHash(bob))?.submittedIdentity).toBeNull()
    expect(() => joinRoom(r.code, charlie, 'Charlie')).toThrow('rodada já começou')
    expect(() =>
      send(bob, {
        type: 'identity:set',
        identity: 'Superman',
        round: r.round + 1,
      }),
    ).toThrow('rodada mudou')
  })
  it('only allows the author to confirm, removes the solved player from turns and rejects stale passing', () => {
    const r = playing()
    expect(() =>
      send(alice, { type: 'player:solve', playerId: r.players[0]!.id, round: r.round }),
    ).toThrow('quem escreveu')
    const solved = room(
      send(bob, { type: 'player:solve', playerId: r.players[0]!.id, round: r.round }),
    )
    expect(solved.players[0]?.solved).toBe(true)
    expect(solved.activePlayerId).toBe(solved.players[1]?.id)
    expect(() => send(bob, { type: 'turn:pass', turnId: r.turnId! })).toThrow('vez mudou')
    const passed = room(send(bob, { type: 'turn:pass', turnId: solved.turnId! }))
    expect(passed.activePlayerId).toBe(solved.players[1]?.id)
    expect(() =>
      send(bob, { type: 'player:solve', playerId: r.players[0]!.id, round: r.round }),
    ).toThrow('já foi descoberta')
  })
  it('finishes when everyone solves, reveals all identities and restarts without scores', () => {
    const r = playing()
    send(bob, { type: 'player:solve', playerId: r.players[0]!.id, round: r.round })
    const finished = room(
      send(alice, { type: 'player:solve', playerId: r.players[1]!.id, round: r.round }),
    )
    expect(finished.phase).toBe('finished')
    expect(finished.players.map((p) => p.identity)).toEqual(['hidden', 'Batman'])
    expect(finished.players[0]).not.toHaveProperty('score')
    const lobby = room(send(alice, { type: 'room:restart' }))
    expect(lobby.phase).toBe('lobby')
    expect(lobby.players.every((p) => p.identity === null && !p.ready)).toBe(true)
  })
  it('never advances due to elapsed time', () => {
    const r = playing()
    game.tick(Date.now() + 60 * 60 * 1000)
    expect(game.current(tokenHash(alice))?.activePlayerId).toBe(r.activePlayerId)
    expect(game.current(tokenHash(alice))).not.toHaveProperty('turnEndsAt')
    expect(r.settings).not.toHaveProperty('turnSeconds')
  })
  it('lets only the host finish early and rejects commands from an older round', () => {
    const r = playing()
    expect(() => send(alice, { type: 'room:restart' })).toThrow('partida avançou')
    expect(() => send(bob, { type: 'room:finish', round: r.round })).toThrow('Só o anfitrião')
    expect(() => send(alice, { type: 'room:finish', round: r.round + 1 })).toThrow('rodada mudou')
    const finished = room(send(alice, { type: 'room:finish', round: r.round }))
    expect(finished.phase).toBe('finished')
    expect(finished.activePlayerId).toBeNull()
    expect(finished.players.map((p) => p.identity)).toEqual(['hidden', 'Batman'])
  })
  it('uses the saved seating order for assignments and denies confirmations from unrelated players, including the host', () => {
    const a = create()
    const b = joinRoom(a.code)
    const c = joinRoom(a.code, charlie, 'Charlie')
    expect(() =>
      send(bob, { type: 'room:seats', playerIds: [c.selfId, a.selfId, b.selfId] }),
    ).toThrow('Só o anfitrião')
    expect(() =>
      send(alice, { type: 'room:seats', playerIds: [a.selfId, a.selfId, b.selfId] }),
    ).toThrow('jogadores mudaram')
    send(alice, { type: 'room:ready', ready: true })
    const ordered = room(
      send(alice, { type: 'room:seats', playerIds: [a.selfId, c.selfId, b.selfId] }),
    )
    expect(ordered.players.map((p) => p.id)).toEqual([a.selfId, c.selfId, b.selfId])
    expect(ordered.players.every((p) => !p.ready)).toBe(true)
    for (const token of [alice, bob, charlie]) send(token, { type: 'room:ready', ready: true })
    const r = room(send(alice, { type: 'room:begin' }))
    expect(r.assignmentTargetId).toBe(c.selfId)
    for (const token of [alice, bob, charlie])
      send(token, { type: 'identity:set', identity: 'Uma capivara', round: r.round })
    expect(() => send(alice, { type: 'player:solve', playerId: b.selfId, round: r.round })).toThrow(
      'quem escreveu',
    )
    const solved = room(send(charlie, { type: 'player:solve', playerId: b.selfId, round: r.round }))
    expect(solved.players.find((p) => p.id === b.selfId)?.solved).toBe(true)
    expect(solved.activePlayerId).toBe(a.selfId)
  })
})

describe('idempotency and recovery', () => {
  it('deduplicates create, join and author confirmations using request IDs', () => {
    const requestId = randomUUID()
    const input: CommandInput = {
      type: 'room:create',
      profile: { name: 'Alice', avatar: 'planet' },
      settings: { category: 'Tudo vale' },
    }
    const first = room(send(alice, input, requestId))
    expect(room(send(alice, input, requestId)).selfId).toBe(first.selfId)
    expect(db.rooms()).toHaveLength(1)
    expect(() =>
      send(alice, { ...input, profile: { name: 'Other', avatar: 'cat' } }, requestId),
    ).toThrow('solicitação já foi usada')
    joinRoom(first.code)
    send(alice, { type: 'room:ready', ready: true })
    send(bob, { type: 'room:ready', ready: true })
    const assigning = room(send(alice, { type: 'room:begin' }))
    send(alice, {
      type: 'identity:set',
      identity: 'Batman',
      round: assigning.round,
    })
    const play = room(
      send(bob, {
        type: 'identity:set',
        identity: 'Superman',
        round: assigning.round,
      }),
    )
    const solveRequest = randomUUID()
    const cmd: CommandInput = {
      type: 'player:solve',
      playerId: play.players[0]!.id,
      round: play.round,
    }
    send(bob, cmd, solveRequest)
    send(bob, cmd, solveRequest)
    expect(game.current(tokenHash(alice))?.players[0]?.solved).toBe(true)
    expect(game.current(tokenHash(alice))?.players[1]?.solved).toBe(false)
  })
  it('reserves a disconnected seat and restores the same ID and secret', () => {
    const r = playing()
    game.disconnected(tokenHash(alice))
    const before = game.current(tokenHash(bob))!
    expect(before.players[0]?.online).toBe(false)
    expect(before.players).toHaveLength(2)
    game.connected(tokenHash(alice))
    const recovered = game.current(tokenHash(alice))!
    expect(recovered.selfId).toBe(r.players[0]?.id)
    expect(recovered.players[0]?.identity).toBeNull()
    expect(recovered.players[0]?.online).toBe(true)
  })
  it('expires abandoned seats after two minutes and transfers host rights', () => {
    const a = create()
    const b = joinRoom(a.code)
    game.disconnected(tokenHash(alice))
    game.tick(Date.now() + 120_001)
    const recovered = game.current(tokenHash(bob))!
    expect(recovered.players).toHaveLength(1)
    expect(recovered.hostId).toBe(b.selfId)
    expect(game.current(tokenHash(alice))).toBeNull()
  })
  it('returns to lobby if a participant leaves during assignment', () => {
    begin()
    send(bob, { type: 'room:leave' })
    const r = game.current(tokenHash(alice))!
    expect(r.phase).toBe('lobby')
    expect(r.players).toHaveLength(1)
    expect(r.players[0]?.hasAssigned).toBe(false)
  })
  it('pauses when all remaining players are offline and resumes on reconnect', () => {
    const r = playing()
    game.disconnected(tokenHash(alice))
    game.disconnected(tokenHash(bob))
    // Host explicitly skips the offline player; no countdown means no automatic unfair scoring.
    const paused = room(send(alice, { type: 'turn:pass', turnId: r.turnId! }))
    expect(paused.activePlayerId).toBeNull()
    game.connected(tokenHash(bob))
    game.tick()
    expect(game.current(tokenHash(bob))?.activePlayerId).toBe(r.players[1]?.id)
  })
  it('upgrades stored timed/scored rooms without losing seats or secrets', () => {
    const r = playing()
    const legacy = db.room(r.code)!
    Object.assign(legacy, { turnEndsAt: Date.now() + 1000 })
    Object.assign(legacy.settings, { turnSeconds: 60 })
    legacy.players.forEach((player) => Object.assign(player, { score: 5 }))
    db.save(legacy)
    game.onModuleInit()
    const upgraded = db.room(r.code)!
    expect(upgraded).not.toHaveProperty('turnEndsAt')
    expect(upgraded.settings).not.toHaveProperty('turnSeconds')
    expect(upgraded.players[0]).not.toHaveProperty('score')
    expect(upgraded.players.map((p) => p.identity)).toEqual(['hidden', 'Batman'])
    expect(upgraded.players.map((p) => p.id)).toEqual(r.players.map((p) => p.id))
  })
  it('recovers persisted rooms, hashed sessions and receipts after a server restart', () => {
    const folder = mkdtempSync(join(tmpdir(), 'whoami-db-'))
    try {
      db.close()
      process.env.DATABASE_PATH = join(folder, 'test.sqlite')
      db = new DatabaseService()
      game = new GameService(db)
      const r = playing()
      db.close()
      db = new DatabaseService()
      game = new GameService(db)
      game.onModuleInit()
      const restored = game.current(tokenHash(alice))!
      expect(restored.code).toBe(r.code)
      expect(restored.phase).toBe('playing')
      expect(restored.players.every((p) => !p.online)).toBe(true)
      game.connected(tokenHash(alice))
      expect(game.current(tokenHash(alice))?.selfId).toBe(r.players[0]?.id)
      expect(game.current(tokenHash(alice))?.players[0]?.identity).toBeNull()
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
