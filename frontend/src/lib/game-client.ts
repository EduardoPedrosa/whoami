import { io, type Socket } from 'socket.io-client'
import { useSyncExternalStore } from 'react'
import type {
  Ack,
  ClientEvents,
  Command,
  CommandInput,
  RoomView,
  ServerEvents,
} from '@whoami/shared'

export type Connection = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'replaced'
interface State {
  room: RoomView | null
  connection: Connection
  pending: boolean
  error: string | null
  latency: number | null
  storageAvailable: boolean
}
const KEY = 'whoami.session.v2'
function requestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // getRandomValues also works when testing on a phone over a local HTTP network.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function credentials() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && /^[a-f0-9]{64}$/.test(saved)) return { token: saved, persistent: true }
  } catch {
    /* Private mode may disable storage. The game still works for this page. */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  try {
    localStorage.setItem(KEY, token)
    return { token, persistent: true }
  } catch {
    return { token, persistent: false }
  }
}

class GameClient {
  private state: State = {
    room: null,
    connection: navigator.onLine ? 'connecting' : 'offline',
    pending: false,
    error: null,
    latency: null,
    storageAvailable: true,
  }
  private listeners = new Set<() => void>()
  private socket: Socket<ServerEvents, ClientEvents>
  private interval: ReturnType<typeof setInterval> | null = null
  private readonly session = credentials()
  private retrySync: ReturnType<typeof setTimeout> | null = null
  private started = false
  constructor() {
    this.state.storageAvailable = this.session.persistent
    this.socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      auth: { token: this.session.token },
      autoConnect: false,
      transports: ['polling', 'websocket'],
      tryAllTransports: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10_000,
    })
    this.socket.on('connect', () => {
      void this.synchronize()
    })
    this.socket.on('room:state', (room) => this.accept(room))
    this.socket.on('room:closed', () =>
      this.update({
        room: null,
        error: 'Essa sala foi encerrada. Crie uma nova mesa para continuar.',
      }),
    )
    this.socket.on('disconnect', (reason) => {
      if (this.state.connection === 'replaced') return
      this.update({ connection: navigator.onLine ? 'reconnecting' : 'offline' })
      if (reason === 'io server disconnect') this.socket.connect()
    })
    this.socket.on('connect_error', () => {
      if (this.state.connection !== 'replaced')
        this.update({ connection: navigator.onLine ? 'reconnecting' : 'offline' })
    })
    this.socket.on('session:replaced', () => {
      this.update({
        connection: 'replaced',
        pending: false,
        error: 'Sua sessão foi aberta em outra aba. Continue por lá ou retome aqui.',
      })
      this.socket.disconnect()
    })
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  getSnapshot = () => this.state
  private update(patch: Partial<State>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }
  private accept(room: RoomView) {
    const current = this.state.room
    if (current?.code === room.code && current.version > room.version) return
    this.update({ room })
  }
  start() {
    if (this.started) return
    this.started = true
    if (navigator.onLine) this.socket.connect()
    window.addEventListener('online', this.online)
    window.addEventListener('offline', this.offline)
    document.addEventListener('visibilitychange', this.visibility)
    this.interval = setInterval(() => this.measureLatency(), 15_000)
  }
  stop() {
    this.started = false
    if (this.interval) clearInterval(this.interval)
    if (this.retrySync) clearTimeout(this.retrySync)
    window.removeEventListener('online', this.online)
    window.removeEventListener('offline', this.offline)
    document.removeEventListener('visibilitychange', this.visibility)
    this.socket.disconnect()
  }
  private online = () => {
    if (this.state.connection !== 'replaced') {
      this.update({ connection: 'reconnecting' })
      this.socket.connect()
    }
  }
  private offline = () => {
    this.socket.disconnect()
    this.update({ connection: 'offline' })
  }
  private visibility = () => {
    if (document.visibilityState === 'visible' && this.socket.connected) void this.synchronize()
  }
  reconnect = () => {
    this.update({ connection: 'connecting', error: null })
    this.socket.connect()
  }
  clearError = () => this.update({ error: null })

  private async synchronize() {
    this.socket.timeout(7000).emit('sync', (error: Error | null, response: Ack) => {
      if (!this.started || this.state.connection === 'replaced' || !this.socket.connected) return
      if (error || !response?.ok) {
        this.update({ connection: navigator.onLine ? 'reconnecting' : 'offline' })
        if (this.retrySync) clearTimeout(this.retrySync)
        this.retrySync = setTimeout(() => {
          if (this.socket.connected) void this.synchronize()
        }, 1500)
        return
      }
      if (this.retrySync) {
        clearTimeout(this.retrySync)
        this.retrySync = null
      }
      if (response.room) this.accept(response.room)
      else this.update({ room: null })
      this.update({ connection: 'connected' })
      this.measureLatency()
    })
  }
  private measureLatency() {
    if (!this.socket.connected || this.state.connection !== 'connected') return
    const at = performance.now()
    this.socket.timeout(5000).emit('ping', (error: Error | null) => {
      if (!error) this.update({ latency: Math.round(performance.now() - at) })
    })
  }
  async command(input: CommandInput): Promise<boolean> {
    if (this.state.pending) return false
    if (!this.socket.connected || this.state.connection !== 'connected') {
      this.update({ error: 'Espere a conexão voltar para continuar. Seu lugar está reservado.' })
      return false
    }
    const command = { ...input, requestId: requestId() } as Command
    this.update({ pending: true, error: null })
    try {
      let response: Ack | null = null
      for (let attempt = 0; attempt < 2; attempt++) {
        response = await new Promise<Ack | null>((resolve) => {
          if (!this.socket.connected) {
            resolve(null)
            return
          }
          this.socket
            .timeout(7000)
            .emit('command', command, (error: Error | null, ack: Ack) =>
              resolve(error ? null : ack),
            )
        })
        if (response) break
      }
      if (!response) {
        this.update({
          error: 'Não recebemos a confirmação. Reconectando para conferir o estado da partida.',
        })
        void this.synchronize()
        return false
      }
      if (!response.ok) {
        this.update({ error: response.message })
        return false
      }
      if (response.room) this.accept(response.room)
      else this.update({ room: null })
      return true
    } finally {
      this.update({ pending: false })
    }
  }
}

export const gameClient = new GameClient()
export function useGame() {
  return useSyncExternalStore(gameClient.subscribe, gameClient.getSnapshot)
}
if (import.meta.hot) import.meta.hot.dispose(() => gameClient.stop())
