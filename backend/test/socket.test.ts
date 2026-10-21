import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { randomBytes, randomUUID } from 'node:crypto'
import { io, type Socket } from 'socket.io-client'
import type { Ack, ClientEvents, Command, CommandInput, ServerEvents } from '@whoami/shared'

let server: ChildProcess
let url: string
const sockets: Socket<ServerEvents, ClientEvents>[] = []
beforeAll(async () => {
  server = spawn(process.execPath, ['backend/dist/main.js'], {
    env: {
      ...process.env,
      PORT: '0',
      DATABASE_PATH: ':memory:',
      CORS_ORIGIN: 'http://localhost:3000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  url = await new Promise<string>((resolve, reject) => {
    let logs = ''
    server.once('error', reject)
    server.stdout?.on('data', (chunk) => {
      logs += String(chunk)
      const match = logs.match(/WHOAMI_READY (http:\/\/[^\s]+)/)
      if (match) resolve(match[1]!)
    })
    server.stderr?.on('data', (chunk) => {
      logs += String(chunk)
    })
    server.once('exit', (code) => reject(new Error(`Backend exited ${code}: ${logs}`)))
  })
})
afterAll(async () => {
  sockets.forEach((socket) => socket.disconnect())
  if (server.exitCode === null) {
    const exited = once(server, 'exit')
    server.kill()
    await exited
  }
})
async function connect(token = randomBytes(32).toString('hex'), transports = ['websocket']) {
  const socket: Socket<ServerEvents, ClientEvents> = io(url, {
    auth: { token },
    transports,
    autoConnect: false,
    reconnection: false,
  })
  sockets.push(socket)
  const ready = new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', reject)
  })
  socket.connect()
  await ready
  return { socket, token }
}
async function command(
  socket: Socket<ServerEvents, ClientEvents>,
  input: CommandInput,
): Promise<Ack> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit(
        'command',
        { ...input, requestId: randomUUID() } as Command,
        (error: Error | null, response: Ack) => (error ? reject(error) : resolve(response)),
      ),
  )
}
function sync(socket: Socket<ServerEvents, ClientEvents>): Promise<Ack> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit('sync', (error: Error | null, response: Ack) =>
        error ? reject(error) : resolve(response),
      ),
  )
}

describe('real Socket.IO transport', () => {
  it('serves health and responds to CORS polling, rejecting unapproved origins', async () => {
    expect((await fetch(`${url}/api/health`)).status).toBe(200)
    const ok = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: 'http://localhost:3000' },
    })
    expect(ok.status).toBe(200)
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
    const rejected = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: 'https://untrusted.example' },
    })
    expect(rejected.status).toBe(403)
  })
  it('acknowledges validated commands and synchronizes private views across transports', async () => {
    const a = await connect()
    const created = await command(a.socket, {
      type: 'room:create',
      profile: { name: 'Alice', avatar: 'planet' },
      settings: { category: 'Tudo vale', turnSeconds: 90 },
    })
    expect(created.ok && created.room?.phase).toBe('lobby')
    if (!created.ok || !created.room) throw new Error('Room missing')
    const b = await connect(undefined, ['polling'])
    const updated = new Promise((resolve) => a.socket.once('room:state', resolve))
    const joined = await command(b.socket, {
      type: 'room:join',
      profile: { name: 'Bob', avatar: 'ghost' },
      code: created.room.code,
    })
    expect(joined.ok && joined.room?.players).toHaveLength(2)
    await updated
    expect(await sync(a.socket)).toMatchObject({
      ok: true,
      room: { players: [{ name: 'Alice' }, { name: 'Bob' }] },
    })
    const invalid = await new Promise<Ack>((resolve) =>
      a.socket.emit(
        'command',
        {
          requestId: randomUUID(),
          type: 'identity:set',
          identity: '<'.repeat(500),
        } as unknown as Command,
        resolve,
      ),
    )
    expect(invalid).toMatchObject({ ok: false, code: 'VALIDATION' })
    const oldId = created.room.selfId
    a.socket.disconnect()
    const resumed = await connect(a.token)
    const state = await sync(resumed.socket)
    expect(state).toMatchObject({
      ok: true,
      room: { selfId: oldId, code: created.room.code },
    })
  })
  it('allows only one active socket per session and recovers after refresh', async () => {
    const a = await connect()
    await command(a.socket, {
      type: 'room:create',
      profile: { name: 'Charlie', avatar: 'cat' },
      settings: { category: 'Tudo vale', turnSeconds: 0 },
    })
    const replaced = new Promise<void>((resolve) => a.socket.once('session:replaced', resolve))
    const disconnected = new Promise<void>((resolve) =>
      a.socket.once('disconnect', () => resolve()),
    )
    const other = await connect(a.token)
    await Promise.all([replaced, disconnected])
    expect(a.socket.connected).toBe(false)
    const state = await sync(other.socket)
    expect(state.ok && state.room?.players[0]?.online).toBe(true)
  })
})
