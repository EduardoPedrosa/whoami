import type { Receipt, Room, Session } from '../game/models'
import { GameStore } from './game-store'

/** Process-local state. A restart deliberately starts with an empty house. */
export class MemoryStore extends GameStore {
  private roomStates = new Map<string, Room>()
  private sessions = new Map<string, Session>()
  private receipts = new Map<string, Receipt & { createdAt: number }>()

  transaction<T>(fn: () => T): T {
    const before = structuredClone([this.roomStates, this.sessions, this.receipts] as const)
    try {
      return fn()
    } catch (error) {
      ;[this.roomStates, this.sessions, this.receipts] = before
      throw error
    }
  }
  room(code: string) {
    return structuredClone(this.roomStates.get(code))
  }
  rooms() {
    return structuredClone([...this.roomStates.values()])
  }
  save(room: Room) {
    this.roomStates.set(room.code, structuredClone(room))
  }
  deleteRoom(code: string) {
    this.roomStates.delete(code)
    for (const [hash, session] of this.sessions)
      if (session.code === code) this.sessions.delete(hash)
  }
  session(hash: string) {
    return structuredClone(this.sessions.get(hash))
  }
  saveSession(hash: string, session: Session) {
    this.sessions.set(hash, structuredClone(session))
  }
  deleteSession(hash: string) {
    this.sessions.delete(hash)
  }
  deletePlayerSession(id: string) {
    for (const [hash, session] of this.sessions)
      if (session.playerId === id) this.sessions.delete(hash)
  }
  receipt(actor: string, requestId: string) {
    const receipt = this.receipts.get(`${actor}:${requestId}`)
    return receipt ? { fingerprint: receipt.fingerprint, code: receipt.code } : undefined
  }
  saveReceipt(actor: string, requestId: string, receipt: Receipt) {
    const key = `${actor}:${requestId}`
    if (this.receipts.has(key)) throw new Error('Duplicate command receipt')
    this.receipts.set(key, { ...receipt, createdAt: Date.now() })
  }
  prune() {
    const cutoff = Date.now() - 86_400_000
    for (const [key, receipt] of this.receipts)
      if (receipt.createdAt < cutoff) this.receipts.delete(key)
  }
  close() {
    this.roomStates.clear()
    this.sessions.clear()
    this.receipts.clear()
  }
}
