import type { Receipt, Room, Session } from '../game/models'

export abstract class GameStore {
  abstract transaction<T>(fn: () => T): T
  abstract room(code: string): Room | undefined
  abstract rooms(): Room[]
  abstract save(room: Room): void
  abstract deleteRoom(code: string): void
  abstract session(hash: string): Session | undefined
  abstract saveSession(hash: string, session: Session): void
  abstract deleteSession(hash: string): void
  abstract deletePlayerSession(id: string): void
  abstract receipt(actor: string, requestId: string): Receipt | undefined
  abstract saveReceipt(actor: string, requestId: string, receipt: Receipt): void
  abstract prune(): void
}
