import type { Activity, Avatar, Phase, RoomSettings } from '@whoami/shared'

export interface Player {
  id: string
  name: string
  avatar: Avatar
  online: boolean
  ready: boolean
  identity: string | null
  assignmentTargetId: string | null
  solved: boolean
  departed: boolean
  score: number
  disconnectedAt: number | null
}
export interface Room {
  code: string
  version: number
  phase: Phase
  hostId: string
  round: number
  settings: RoomSettings
  players: Player[]
  activePlayerId: string | null
  turnId: string | null
  turnEndsAt: number | null
  updatedAt: number
  activity: Activity[]
}
export interface Session {
  playerId: string
  code: string
}
export interface Receipt {
  fingerprint: string
  code: string | null
}
export class GameError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}
