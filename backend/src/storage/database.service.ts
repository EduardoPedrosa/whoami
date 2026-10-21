import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common'
import Database from 'better-sqlite3'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import type { Receipt, Room, Session } from '../game/models'

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly db: Database.Database
  constructor() {
    const location = process.env.DATABASE_PATH || './data/whoami.sqlite'
    if (location !== ':memory:') mkdirSync(dirname(resolve(location)), { recursive: true })
    this.db = new Database(location)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('busy_timeout = 5000')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL, room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS receipts (actor TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, room_code TEXT, created_at INTEGER NOT NULL, PRIMARY KEY(actor, request_id));
      CREATE INDEX IF NOT EXISTS receipts_created ON receipts(created_at);
    `)
  }
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)()
  }
  room(code: string): Room | undefined {
    const row = this.db.prepare('SELECT state FROM rooms WHERE code = ?').get(code) as
      { state: string } | undefined
    return row ? (JSON.parse(row.state) as Room) : undefined
  }
  rooms(): Room[] {
    return (this.db.prepare('SELECT state FROM rooms').all() as { state: string }[]).map(
      (row) => JSON.parse(row.state) as Room,
    )
  }
  save(room: Room) {
    this.db
      .prepare(
        'INSERT INTO rooms(code,state,updated_at) VALUES (?,?,?) ON CONFLICT(code) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at',
      )
      .run(room.code, JSON.stringify(room), room.updatedAt)
  }
  deleteRoom(code: string) {
    this.db.prepare('DELETE FROM rooms WHERE code = ?').run(code)
  }
  session(tokenHash: string): Session | undefined {
    return this.db
      .prepare('SELECT player_id AS playerId, room_code AS code FROM sessions WHERE token_hash = ?')
      .get(tokenHash) as Session | undefined
  }
  saveSession(hash: string, session: Session) {
    this.db
      .prepare(
        'INSERT INTO sessions(token_hash,player_id,room_code) VALUES (?,?,?) ON CONFLICT(token_hash) DO UPDATE SET player_id=excluded.player_id, room_code=excluded.room_code',
      )
      .run(hash, session.playerId, session.code)
  }
  deleteSession(hash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash)
  }
  deletePlayerSession(id: string) {
    this.db.prepare('DELETE FROM sessions WHERE player_id = ?').run(id)
  }
  receipt(actor: string, requestId: string): Receipt | undefined {
    return this.db
      .prepare('SELECT fingerprint, room_code AS code FROM receipts WHERE actor=? AND request_id=?')
      .get(actor, requestId) as Receipt | undefined
  }
  saveReceipt(actor: string, requestId: string, receipt: Receipt) {
    this.db
      .prepare(
        'INSERT INTO receipts(actor,request_id,fingerprint,room_code,created_at) VALUES (?,?,?,?,?)',
      )
      .run(actor, requestId, receipt.fingerprint, receipt.code, Date.now())
  }
  prune() {
    this.db.prepare('DELETE FROM receipts WHERE created_at < ?').run(Date.now() - 86_400_000)
  }
  onApplicationShutdown() {
    this.close()
  }
  close() {
    try {
      this.db.close()
    } catch (error) {
      new Logger(DatabaseService.name).error(error)
    }
  }
}
