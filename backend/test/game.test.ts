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
function create(token = alice, name = 'Alice', seconds: 0 | 60 | 90 | 120 = 90) {
  return room(
    send(token, {
      type: 'room:create',
      profile: { name, avatar: 'planet' },
      settings: { category: 'Tudo vale', turnSeconds: seconds },
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
function begin(seconds: 0 | 60 | 90 | 120 = 90) {
  const r = create(alice, 'Alice', seconds)
  joinRoom(r.code)
  send(alice, { type: 'room:ready', ready: true })
  send(bob, { type: 'room:ready', ready: true })
  return room(send(alice, { type: 'room:begin' }))
}
function playing(seconds: 0 | 60 | 90 | 120 = 90) {
  const assigning = begin(seconds)
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
        settings: { category: 'Mundo pop', turnSeconds: 0 },
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

describe('secrets, turns and scoring', () => {
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
  it('requires another person to confirm and rejects stale concurrent actions', () => {
    const r = playing()
    expect(() => send(alice, { type: 'turn:solve', turnId: r.turnId! })).toThrow('Outro jogador')
    const solved = room(send(bob, { type: 'turn:solve', turnId: r.turnId! }))
    expect(solved.players[0]?.solved).toBe(true)
    expect(solved.players[0]?.score).toBe(1)
    expect(solved.activePlayerId).not.toBe(r.activePlayerId)
    expect(() => send(bob, { type: 'turn:solve', turnId: r.turnId! })).toThrow('vez mudou')
    expect(solved.players[1]?.solved).toBe(false)
  })
  it('finishes when everyone solves, reveals all identities and retains cumulative points', () => {
    const r = playing()
    const next = room(send(bob, { type: 'turn:solve', turnId: r.turnId! }))
    const finished = room(send(alice, { type: 'turn:solve', turnId: next.turnId! }))
    expect(finished.phase).toBe('finished')
    expect(finished.players.map((p) => p.identity)).toEqual(['hidden', 'Batman'])
    const lobby = room(send(alice, { type: 'room:restart' }))
    expect(lobby.phase).toBe('lobby')
    expect(lobby.players.map((p) => p.score)).toEqual([1, 1])
    expect(lobby.players.every((p) => p.identity === null && !p.ready)).toBe(true)
  })
  it('advances by authoritative deadline and supports unlimited turns', () => {
    const r = playing(60)
    game.tick(r.turnEndsAt! + 1)
    expect(game.current(tokenHash(alice))?.activePlayerId).not.toBe(r.activePlayerId)
    const next = game.current(tokenHash(alice))!
    send(alice, { type: 'room:restart' })
    send(alice, {
      type: 'room:settings',
      settings: { category: 'Tudo vale', turnSeconds: 0 },
    })
    send(alice, { type: 'room:ready', ready: true })
    send(bob, { type: 'room:ready', ready: true })
    const assignment = room(send(alice, { type: 'room:begin' }))
    send(alice, {
      type: 'identity:set',
      identity: 'Uma capivara',
      round: assignment.round,
    })
    const unlimited = room(
      send(bob, {
        type: 'identity:set',
        identity: 'Um alien',
        round: assignment.round,
      }),
    )
    expect(unlimited.turnEndsAt).toBeNull()
    expect(next.phase).toBe('playing')
  })
})

describe('idempotency and recovery', () => {
  it('deduplicates create, join and score commands using request IDs', () => {
    const requestId = randomUUID()
    const input: CommandInput = {
      type: 'room:create',
      profile: { name: 'Alice', avatar: 'planet' },
      settings: { category: 'Tudo vale', turnSeconds: 90 },
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
    const scoreRequest = randomUUID()
    const cmd: CommandInput = { type: 'turn:solve', turnId: play.turnId! }
    send(bob, cmd, scoreRequest)
    send(bob, cmd, scoreRequest)
    expect(game.current(tokenHash(alice))?.players[0]?.score).toBe(1)
    expect(game.current(tokenHash(alice))?.players[1]?.score).toBe(0)
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
    const r = playing(0)
    game.disconnected(tokenHash(alice))
    game.disconnected(tokenHash(bob))
    // Host explicitly skips the offline player; no countdown means no automatic unfair scoring.
    const paused = room(send(alice, { type: 'turn:pass', turnId: r.turnId! }))
    expect(paused.activePlayerId).toBeNull()
    game.connected(tokenHash(bob))
    game.tick()
    expect(game.current(tokenHash(bob))?.activePlayerId).toBe(r.players[1]?.id)
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
