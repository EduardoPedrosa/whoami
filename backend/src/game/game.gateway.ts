import { Logger, OnModuleDestroy } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { commandSchema, type Ack, type ClientEvents, type ServerEvents } from '@whoami/shared'
import { GameService, tokenHash } from './game.service'
import { GameError } from './models'

type GameSocket = Socket<
  ClientEvents,
  ServerEvents,
  Record<string, never>,
  { token: string; hash: string }
>
export const allowedOrigins = () =>
  (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => callback(null, !origin || allowedOrigins().includes(origin)),
    credentials: false,
  },
  allowRequest: (
    request: { headers: { origin?: string } },
    callback: (error: string | null, allowed: boolean) => void,
  ) => callback(null, !request.headers.origin || allowedOrigins().includes(request.headers.origin)),
  maxHttpBufferSize: 16_384,
  pingInterval: 15_000,
  pingTimeout: 20_000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 120_000,
    skipMiddlewares: false,
  },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer() server!: Server<ClientEvents, ServerEvents>
  private readonly logger = new Logger(GameGateway.name)
  private readonly sockets = new Map<string, string>()
  private readonly roomCodes = new Map<string, string>()
  private readonly limits = new Map<string, { count: number; at: number }>()
  private readonly connections = new Map<string, { count: number; at: number }>()
  private timer?: ReturnType<typeof setInterval>
  constructor(private readonly game: GameService) {}

  afterInit(
    server: Server<
      ClientEvents,
      ServerEvents,
      Record<string, never>,
      { token: string; hash: string }
    >,
  ) {
    server.use((socket: GameSocket, next) => {
      const token: unknown = socket.handshake.auth.token
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
        return next(new Error('Sessão inválida. Atualize a página.'))
      const ip = socket.handshake.address
      const window = this.connections.get(ip)
      if (!window || Date.now() - window.at > 60_000)
        this.connections.set(ip, { count: 1, at: Date.now() })
      else if (++window.count > 120) return next(new Error('Muitas conexões. Aguarde um minuto.'))
      socket.data.token = token
      socket.data.hash = tokenHash(token)
      next()
    })
    this.timer = setInterval(() => {
      try {
        for (const code of this.game.tick()) this.broadcast(code)
      } catch (error) {
        this.logger.error('Falha na manutenção das salas', error)
      }
      for (const [ip, limit] of this.connections)
        if (Date.now() - limit.at > 60_000) this.connections.delete(ip)
      for (const [hash, limit] of this.limits)
        if (Date.now() - limit.at > 60_000) this.limits.delete(hash)
    }, 1000)
    this.timer.unref()
  }

  handleConnection(client: GameSocket) {
    const oldId = this.sockets.get(client.data.hash)
    this.sockets.set(client.data.hash, client.id)
    if (oldId && oldId !== client.id) {
      const old = this.server.sockets.sockets.get(oldId)
      old?.emit('session:replaced')
      old?.disconnect(true)
    }
    try {
      const code = this.game.connected(client.data.hash)
      if (code) {
        this.roomCodes.set(client.data.hash, code)
        this.broadcast(code)
      }
    } catch (error) {
      this.logger.error('Falha ao recuperar sessão', error)
      client.disconnect(true)
    }
  }

  handleDisconnect(client: GameSocket) {
    if (this.sockets.get(client.data.hash) !== client.id) return
    this.sockets.delete(client.data.hash)
    this.roomCodes.delete(client.data.hash)
    try {
      const code = this.game.disconnected(client.data.hash)
      if (code) this.broadcast(code)
    } catch (error) {
      this.logger.error('Falha ao atualizar presença', error)
    }
  }

  @SubscribeMessage('sync')
  sync(@ConnectedSocket() client: GameSocket): Ack {
    return this.safe(() => {
      this.rateLimit(client)
      return { ok: true, room: this.game.current(client.data.hash) }
    })
  }

  @SubscribeMessage('ping')
  ping(): number {
    return Date.now()
  }

  @SubscribeMessage('command')
  command(@ConnectedSocket() client: GameSocket, @MessageBody() raw: unknown): Ack {
    return this.safe(() => {
      this.rateLimit(client)
      if (this.sockets.get(client.data.hash) !== client.id)
        throw new GameError('SESSION_REPLACED', 'Sua sessão está aberta em outra aba.')
      const parsed = commandSchema.safeParse(raw)
      if (!parsed.success)
        return {
          ok: false,
          code: 'VALIDATION',
          message: parsed.error.issues[0]?.message || 'Confira os dados e tente novamente.',
        }
      const before = this.game.current(client.data.hash)?.code
      const response = this.game.execute(client.data.hash, client.data.token, parsed.data)
      if (response.ok) {
        if (response.room) this.roomCodes.set(client.data.hash, response.room.code)
        else this.roomCodes.delete(client.data.hash)
      }
      if (before) this.broadcast(before)
      if (response.ok && response.room && response.room.code !== before)
        this.broadcast(response.room.code)
      return response
    })
  }

  private broadcast(code: string) {
    for (const [hash, socketId] of this.sockets) {
      if (this.roomCodes.get(hash) !== code) continue
      const view = this.game.current(hash)
      if (view?.code === code) this.server.sockets.sockets.get(socketId)?.emit('room:state', view)
      else if (this.roomCodes.get(hash) === code) {
        this.roomCodes.delete(hash)
        this.server.sockets.sockets.get(socketId)?.emit('room:closed')
      }
    }
  }
  private rateLimit(client: GameSocket) {
    const key = client.data.hash
    const window = this.limits.get(key)
    if (!window || Date.now() - window.at > 10_000)
      this.limits.set(key, { count: 1, at: Date.now() })
    else if (++window.count > 40)
      throw new GameError('RATE_LIMIT', 'Você foi rápido demais. Aguarde alguns segundos.')
  }
  private safe(fn: () => Ack): Ack {
    try {
      return fn()
    } catch (error) {
      if (error instanceof GameError) return { ok: false, code: error.code, message: error.message }
      this.logger.error('Falha ao processar ação', error)
      return {
        ok: false,
        code: 'INTERNAL',
        message: 'Não conseguimos confirmar essa ação. Tente novamente.',
      }
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }
}
