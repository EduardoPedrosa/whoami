import { z } from 'zod'

export const MAX_PLAYERS = 12
export const MIN_PLAYERS = 2
export const RECONNECT_GRACE_MS = 120_000
export const CATEGORIES = [
  'Tudo vale',
  'Cinema e séries',
  'Mundo pop',
  'Animais e natureza',
  'História e cultura',
] as const
export const AVATARS = [
  'planet',
  'ghost',
  'rocket',
  'cat',
  'leaf',
  'lightning',
  'crown',
  'sun',
] as const
export type Avatar = (typeof AVATARS)[number]
export const settingsSchema = z.object({
  category: z.enum(CATEGORIES),
  turnSeconds: z.union([z.literal(0), z.literal(60), z.literal(90), z.literal(120)]),
})
export type RoomSettings = z.infer<typeof settingsSchema>
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Use pelo menos 2 letras.')
    .max(24, 'Use até 24 caracteres.')
    .regex(/^[\p{L}\p{N} ._'’-]+$/u, 'Use letras, números e espaços.'),
  avatar: z.enum(AVATARS),
})
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{6}$/, 'O código tem 6 letras ou números.')
const id = z.string().uuid()
const request = { requestId: id }
export const commandSchema = z.discriminatedUnion('type', [
  z.object({
    ...request,
    type: z.literal('room:create'),
    profile: profileSchema,
    settings: settingsSchema,
  }),
  z.object({
    ...request,
    type: z.literal('room:join'),
    profile: profileSchema,
    code: roomCodeSchema,
  }),
  z.object({ ...request, type: z.literal('room:ready'), ready: z.boolean() }),
  z.object({ ...request, type: z.literal('room:settings'), settings: settingsSchema }),
  z.object({ ...request, type: z.literal('room:begin') }),
  z.object({
    ...request,
    type: z.literal('identity:set'),
    round: z.number().int().positive(),
    identity: z
      .string()
      .trim()
      .min(2, 'Escreva pelo menos 2 caracteres.')
      .max(50, 'Use até 50 caracteres.')
      .regex(/^[^\p{Cc}]+$/u),
  }),
  z.object({ ...request, type: z.literal('turn:pass'), turnId: id }),
  z.object({ ...request, type: z.literal('turn:solve'), turnId: id }),
  z.object({ ...request, type: z.literal('room:restart') }),
  z.object({ ...request, type: z.literal('room:leave') }),
])
export type Command = z.infer<typeof commandSchema>
export type CommandInput = Command extends infer T
  ? T extends Command
    ? Omit<T, 'requestId'>
    : never
  : never
export type Phase = 'lobby' | 'assigning' | 'playing' | 'finished'
export interface PlayerView {
  id: string
  name: string
  avatar: Avatar
  online: boolean
  ready: boolean
  hasAssigned: boolean
  identity: string | null
  solved: boolean
  departed: boolean
  score: number
}
export interface Activity {
  id: string
  text: string
  at: number
  kind: 'join' | 'game' | 'connection' | 'success'
}
export interface RoomView {
  code: string
  version: number
  phase: Phase
  hostId: string
  selfId: string
  round: number
  settings: RoomSettings
  players: PlayerView[]
  assignmentTargetId: string | null
  submittedIdentity: string | null
  activePlayerId: string | null
  turnId: string | null
  turnEndsAt: number | null
  activity: Activity[]
  serverTime: number
}
export interface SessionCredentials {
  token: string
  playerId: string
  code: string
}
export type Ack =
  | { ok: true; room: RoomView | null; session?: SessionCredentials }
  | { ok: false; code: string; message: string }
export interface ServerEvents {
  'room:state': (room: RoomView) => void
  'session:replaced': () => void
  'room:closed': () => void
}
export interface ClientEvents {
  command: (command: Command, ack: (response: Ack) => void) => void
  sync: (ack: (response: Ack) => void) => void
  ping: (ack: (timestamp: number) => void) => void
}
export const IDENTITY_SUGGESTIONS: Record<RoomSettings['category'], string[]> = {
  'Tudo vale': [
    'Um astronauta',
    'Sherlock Holmes',
    'Uma capivara',
    'Uma estrela do rock',
    'Um detetive',
    'Um dragão',
  ],
  'Cinema e séries': [
    'Darth Vader',
    'Hermione Granger',
    'Shrek',
    'Wandinha',
    'Indiana Jones',
    'Elsa',
  ],
  'Mundo pop': ['Beyoncé', 'Neymar', 'Taylor Swift', 'Silvio Santos', 'Lady Gaga', 'Ayrton Senna'],
  'Animais e natureza': [
    'Uma capivara',
    'Um polvo',
    'Uma girafa',
    'Um pinguim',
    'Um vulcão',
    'Uma borboleta',
  ],
  'História e cultura': [
    'Cleópatra',
    'Albert Einstein',
    'Frida Kahlo',
    'Machado de Assis',
    'Leonardo da Vinci',
    'Santos Dumont',
  ],
}
