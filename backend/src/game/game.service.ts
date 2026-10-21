import { Injectable, OnModuleInit } from '@nestjs/common'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  RECONNECT_GRACE_MS,
  type Ack,
  type Command,
  type RoomView,
} from '@whoami/shared'
import { DatabaseService } from '../storage/database.service'
import { GameError, type Player, type Room } from './models'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_TTL = 24 * 60 * 60 * 1000
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
const fail = (code: string, message: string): never => {
  throw new GameError(code, message)
}

@Injectable()
export class GameService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    // Recovery is app-level as well as transport-level: never trust persisted presence.
    for (const room of this.db.rooms()) {
      for (const player of room.players) {
        player.online = false
        player.disconnectedAt = Date.now()
      }
      if (room.phase === 'playing' && room.settings.turnSeconds)
        room.turnEndsAt = Date.now() + room.settings.turnSeconds * 1000
      room.version++
      this.db.save(room)
    }
  }

  view(room: Room, playerId: string): RoomView {
    const self = room.players.find((p) => p.id === playerId && !p.departed)
    if (!self) return fail('SESSION_EXPIRED', 'Sua sessão terminou. Entre na sala novamente.')
    return {
      code: room.code,
      version: room.version,
      phase: room.phase,
      hostId: room.hostId,
      selfId: playerId,
      round: room.round,
      settings: room.settings,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        online: p.online,
        ready: p.ready,
        hasAssigned: !!(
          p.assignmentTargetId &&
          room.players.find((target) => target.id === p.assignmentTargetId)?.identity
        ),
        identity:
          room.phase === 'finished' || (room.phase === 'playing' && (p.id !== playerId || p.solved))
            ? p.identity
            : null,
        solved: p.solved,
        departed: p.departed,
        score: p.score,
      })),
      assignmentTargetId: self.assignmentTargetId,
      submittedIdentity:
        room.phase === 'assigning'
          ? (room.players.find((p) => p.id === self.assignmentTargetId)?.identity ?? null)
          : null,
      activePlayerId: room.activePlayerId,
      turnId: room.turnId,
      turnEndsAt: room.turnEndsAt,
      activity: room.activity,
      serverTime: Date.now(),
    }
  }

  current(hash: string): RoomView | null {
    const session = this.db.session(hash)
    if (!session) return null
    const room = this.db.room(session.code)
    if (!room || !room.players.some((p) => p.id === session.playerId && !p.departed)) return null
    return this.view(room, session.playerId)
  }

  connected(hash: string): string | null {
    const session = this.db.session(hash)
    if (!session) return null
    const room = this.db.room(session.code)
    const player = room?.players.find((p) => p.id === session.playerId && !p.departed)
    if (!room || !player) return null
    const wasOffline = !player.online
    player.online = true
    player.disconnectedAt = null
    if (wasOffline) this.activity(room, `${player.name} se reconectou.`, 'connection')
    this.save(room)
    return room.code
  }

  disconnected(hash: string): string | null {
    const session = this.db.session(hash)
    if (!session) return null
    const room = this.db.room(session.code)
    const player = room?.players.find((p) => p.id === session.playerId && !p.departed)
    if (!room || !player) return null
    player.online = false
    player.disconnectedAt = Date.now()
    this.activity(room, `Reconectando ${player.name}. O lugar está reservado.`, 'connection')
    this.save(room)
    return room.code
  }

  execute(hash: string, token: string, command: Command): Ack {
    const fingerprint = createHash('sha256').update(JSON.stringify(command)).digest('hex')
    const previous = this.db.receipt(hash, command.requestId)
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        return fail('REQUEST_CONFLICT', 'A solicitação já foi usada. Tente novamente.')
      return {
        ok: true,
        room: previous.code ? this.current(hash) : null,
        ...(previous.code ? this.credentials(hash, token) : {}),
      }
    }
    return this.db.transaction(() => {
      let session = this.db.session(hash)
      let room = session ? this.db.room(session.code) : undefined
      if (command.type === 'room:create' || command.type === 'room:join') {
        if (room && room.players.some((p) => p.id === session?.playerId && !p.departed))
          return fail(
            'ALREADY_IN_ROOM',
            'Você já está em uma sala. Saia dela antes de entrar em outra.',
          )
        if (command.type === 'room:create') {
          if (this.db.rooms().length >= 250)
            return fail('SERVER_FULL', 'A casa está cheia agora. Tente novamente em instantes.')
          let code: string
          do {
            code = Array.from(
              randomBytes(6),
              (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
            ).join('')
          } while (this.db.room(code))
          room = {
            code,
            version: 0,
            phase: 'lobby',
            hostId: '',
            round: 0,
            settings: command.settings,
            players: [],
            activePlayerId: null,
            turnId: null,
            turnEndsAt: null,
            updatedAt: Date.now(),
            activity: [],
          }
        } else {
          room = this.db.room(command.code)
          if (!room)
            return fail('ROOM_NOT_FOUND', 'Essa sala não existe ou já encerrou. Confira o código.')
          if (room.phase !== 'lobby')
            return fail(
              'ROUND_IN_PROGRESS',
              'A rodada já começou. Peça ao anfitrião para voltar à sala de espera.',
            )
          if (room.players.length >= MAX_PLAYERS)
            return fail('ROOM_FULL', 'Essa sala está cheia. O limite é 12 pessoas.')
        }
        if (
          room.players.some(
            (p) =>
              p.name.toLocaleLowerCase('pt-BR') === command.profile.name.toLocaleLowerCase('pt-BR'),
          )
        )
          return fail('NAME_TAKEN', 'Já tem alguém com esse nome. Escolha outro apelido.')
        const player: Player = {
          ...command.profile,
          id: randomUUID(),
          online: true,
          ready: false,
          identity: null,
          assignmentTargetId: null,
          solved: false,
          departed: false,
          score: 0,
          disconnectedAt: null,
        }
        room.players.push(player)
        if (!room.hostId) room.hostId = player.id
        session = { playerId: player.id, code: room.code }
        this.save(room)
        this.db.saveSession(hash, session)
        this.activity(room, `${player.name} entrou na sala.`, 'join')
      } else {
        if (!session || !room) return fail('NOT_IN_ROOM', 'Entre em uma sala para continuar.')
        const playerId = session.playerId
        const self = room.players.find((p) => p.id === playerId && !p.departed)
        if (!self) return fail('SESSION_EXPIRED', 'Sua sessão terminou. Entre na sala novamente.')
        switch (command.type) {
          case 'room:ready':
            this.requirePhase(room, 'lobby')
            self.ready = command.ready
            break
          case 'room:settings':
            this.requireHost(room, self)
            this.requirePhase(room, 'lobby')
            room.settings = command.settings
            room.players.forEach((p) => {
              p.ready = false
            })
            break
          case 'room:begin':
            this.requireHost(room, self)
            this.requirePhase(room, 'lobby')
            if (room.players.length < MIN_PLAYERS)
              return fail('NOT_ENOUGH_PLAYERS', 'Chame mais uma pessoa para começar.')
            if (!room.players.every((p) => p.online && p.ready))
              return fail(
                'PLAYERS_NOT_READY',
                'Espere todo mundo se conectar e marcar que está pronto.',
              )
            room.phase = 'assigning'
            room.round++
            room.players.forEach((p, i) => {
              p.identity = null
              p.solved = false
              p.assignmentTargetId = room!.players[(i + 1) % room!.players.length]!.id
            })
            this.activity(room, 'Cada jogador deve escolher uma identidade.', 'game')
            break
          case 'identity:set': {
            this.requirePhase(room, 'assigning')
            if (command.round !== room.round)
              return fail('STALE_ROUND', 'A rodada mudou. Escolha a identidade novamente.')
            const target = room.players.find((p) => p.id === self.assignmentTargetId)
            if (!target)
              return fail('INVALID_TARGET', 'Os jogadores mudaram. Volte à sala de espera.')
            target.identity = command.identity
            if (room.players.every((p) => !!p.identity)) {
              room.phase = 'playing'
              this.setActive(room, room.players[0]!.id)
              this.activity(room, 'A rodada começou!', 'game')
            }
            break
          }
          case 'turn:pass':
            this.requireTurn(room, command.turnId)
            if (room.activePlayerId !== self.id && room.hostId !== self.id)
              return fail('NOT_YOUR_TURN', 'Aguarde sua vez para passar.')
            this.activity(room, `${this.active(room).name} passou a vez.`, 'game')
            this.advance(room)
            break
          case 'turn:solve': {
            this.requireTurn(room, command.turnId)
            // Another participant confirms the spoken guess; nobody can reveal their own card.
            if (room.activePlayerId === self.id)
              return fail('CANNOT_CONFIRM_SELF', 'Outro jogador precisa confirmar seu acerto.')
            const active = this.active(room)
            active.solved = true
            active.score++
            this.activity(room, `${active.name} acertou! +1 ponto.`, 'success')
            this.advance(room)
            break
          }
          case 'room:restart':
            this.requireHost(room, self)
            room.phase = 'lobby'
            room.activePlayerId = null
            room.turnEndsAt = null
            room.players = room.players.filter((p) => !p.departed)
            room.players.forEach((p) => {
              p.identity = null
              p.assignmentTargetId = null
              p.solved = false
              p.ready = false
            })
            this.activity(room, 'Mesa pronta para uma nova rodada.', 'game')
            break
          case 'room:leave':
            this.remove(room, self.id)
            this.db.deleteSession(hash)
            if (room.players.length && room.players.some((p) => !p.departed)) this.save(room)
            else this.db.deleteRoom(room.code)
            this.db.saveReceipt(hash, command.requestId, {
              fingerprint,
              code: null,
            })
            return { ok: true, room: null }
        }
      }
      this.save(room!)
      this.db.saveReceipt(hash, command.requestId, {
        fingerprint,
        code: room!.code,
      })
      return {
        ok: true,
        room: this.view(room!, session!.playerId),
        ...this.credentials(hash, token),
      }
    })
  }

  private credentials(hash: string, token: string) {
    const session = this.db.session(hash)
    return session ? { session: { ...session, token } } : {}
  }
  private requireHost(room: Room, self: Player) {
    if (room.hostId !== self.id) return fail('HOST_ONLY', 'Só o anfitrião pode fazer isso.')
  }
  private requirePhase(room: Room, phase: Room['phase']) {
    if (room.phase !== phase)
      return fail('INVALID_PHASE', 'A partida avançou. Sua tela já está sendo atualizada.')
  }
  private requireTurn(room: Room, turnId: string) {
    this.requirePhase(room, 'playing')
    if (!room.activePlayerId || room.turnId !== turnId)
      return fail('STALE_TURN', 'A vez mudou. Confira quem está jogando agora.')
  }
  private active(room: Room): Player {
    return room.players.find((p) => p.id === room.activePlayerId)!
  }
  private setActive(room: Room, id: string) {
    room.activePlayerId = id
    room.turnId = randomUUID()
    room.turnEndsAt = room.settings.turnSeconds
      ? Date.now() + room.settings.turnSeconds * 1000
      : null
  }
  private advance(room: Room) {
    const eligible = room.players.filter((p) => !p.solved && !p.departed)
    if (eligible.length === 0) {
      room.phase = 'finished'
      room.activePlayerId = null
      room.turnEndsAt = null
      this.activity(room, 'Todo mundo se descobriu. Que rodada!', 'success')
      return
    }
    const index = room.players.findIndex((p) => p.id === room.activePlayerId)
    for (let offset = 1; offset <= room.players.length; offset++) {
      const player = room.players[(index + offset) % room.players.length]!
      if (!player.solved && !player.departed && player.online) {
        this.setActive(room, player.id)
        return
      }
    }
    // Pause while every remaining player reconnects; tick resumes when someone returns.
    room.activePlayerId = null
    room.turnEndsAt = null
  }
  private remove(room: Room, playerId: string) {
    const player = room.players.find((p) => p.id === playerId)
    if (!player) return
    player.online = false
    player.departed = true
    if (room.phase === 'lobby' || room.phase === 'assigning') {
      if (room.phase === 'assigning') {
        room.phase = 'lobby'
        room.players.forEach((p) => {
          p.identity = null
          p.assignmentTargetId = null
          p.ready = false
        })
        this.activity(room, 'Os jogadores mudaram. Escolham as identidades novamente.', 'game')
      }
      room.players = room.players.filter((p) => p.id !== playerId)
    } else if (room.phase === 'playing') {
      if (room.activePlayerId === playerId || room.players.every((p) => p.solved || p.departed))
        this.advance(room)
    }
    if (room.hostId === playerId)
      room.hostId =
        (room.players.find((p) => !p.departed && p.online) ?? room.players.find((p) => !p.departed))
          ?.id ?? ''
    this.activity(room, `${player.name} saiu da sala.`, 'connection')
  }
  private activity(room: Room, text: string, kind: Room['activity'][number]['kind']) {
    room.activity.push({ id: randomUUID(), text, kind, at: Date.now() })
    room.activity = room.activity.slice(-25)
  }
  private save(room: Room) {
    room.version++
    room.updatedAt = Date.now()
    this.db.save(room)
  }

  tick(now = Date.now()): string[] {
    const changed: string[] = []
    for (const room of this.db.rooms()) {
      if (room.updatedAt < now - ROOM_TTL) {
        this.db.deleteRoom(room.code)
        changed.push(room.code)
        continue
      }
      let dirty = false
      for (const player of [...room.players]) {
        if (
          !player.departed &&
          !player.online &&
          player.disconnectedAt !== null &&
          now - player.disconnectedAt >= RECONNECT_GRACE_MS
        ) {
          this.remove(room, player.id)
          this.db.deletePlayerSession(player.id)
          dirty = true
        }
      }
      if (!room.players.some((p) => !p.departed)) {
        this.db.deleteRoom(room.code)
        changed.push(room.code)
        continue
      }
      if (room.phase === 'playing') {
        if (room.turnEndsAt !== null && room.turnEndsAt <= now) {
          this.activity(
            room,
            `O tempo de ${this.active(room).name} acabou. Próxima pessoa!`,
            'game',
          )
          this.advance(room)
          dirty = true
        } else if (
          !room.activePlayerId &&
          room.players.some((p) => !p.solved && !p.departed && p.online)
        ) {
          this.advance(room)
          dirty = true
        }
      }
      if (dirty) {
        this.save(room)
        changed.push(room.code)
      }
    }
    this.db.prune()
    return changed
  }
}
