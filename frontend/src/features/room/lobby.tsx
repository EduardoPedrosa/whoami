import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { gameClient } from '@/lib/game-client'
import {
  ArrowRight,
  Check,
  CheckCircle,
  IdentificationCard,
  LockSimple,
  Plus,
} from '@phosphor-icons/react'
import { type RoomView } from '@whoami/shared'

import { SeatingOrder } from '@/features/room/components/seating-order'
import { Settings } from '@/features/room/components/room-settings'

export function Lobby({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const self = room.players.find((p) => p.id === room.selfId)!
  const host = room.hostId === room.selfId
  const allReady = room.players.length >= 2 && room.players.every((p) => p.online && p.ready)
  const readyCount = room.players.filter((p) => p.ready && p.online).length
  return (
    <div className="lobby-content">
      <div className="lobby-welcome">
        <div className="stacked-avatars">
          {room.players.slice(0, 4).map((p) => (
            <Avatar avatar={p.avatar} key={p.id} />
          ))}
          {room.players.length < 2 && (
            <span className="empty-avatar">
              <Plus size={23} aria-hidden="true" />
            </span>
          )}
        </div>
        <h2>Jogadores na sala</h2>
        <p>
          {room.players.length < 2
            ? 'Mínimo de 2 jogadores. Compartilhe o link ou o código da sala.'
            : 'Definam a categoria e a ordem dos jogadores antes de começar.'}
        </p>
      </div>
      <Settings room={room} disabled={disabled} />
      <SeatingOrder room={room} disabled={disabled} />
      <div className="lobby-rules">
        <div>
          <IdentificationCard size={24} weight="duotone" aria-hidden="true" />
          <p>Cada pessoa escolhe a identidade do próximo jogador.</p>
        </div>
        <div>
          <LockSimple size={24} weight="duotone" aria-hidden="true" />
          <p>Sua identidade fica oculta até o acerto ou o fim da rodada.</p>
        </div>
      </div>
      <div className="lobby-controls">
        <div className="ready-summary">
          <span className="presence-dot" />
          <span>
            {readyCount} de {room.players.length} prontos
          </span>
        </div>
        <div className="lobby-buttons">
          <Button
            variant={self.ready ? 'outline' : 'default'}
            onClick={() => {
              void gameClient.command({ type: 'room:ready', ready: !self.ready })
            }}
            disabled={disabled}
          >
            {self.ready ? (
              <CheckCircle size={19} aria-hidden="true" />
            ) : (
              <Check size={19} aria-hidden="true" />
            )}
            {self.ready ? 'Cancelar prontidão' : 'Estou pronto'}
          </Button>
          {host && (
            <Button
              disabled={disabled || !allReady}
              onClick={() => {
                void gameClient.command({ type: 'room:begin' })
              }}
            >
              Começar rodada
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      <p className="lobby-next-hint">
        {host
          ? allReady
            ? 'Todos os jogadores estão prontos.'
            : 'O anfitrião pode começar quando todos estiverem prontos.'
          : 'Quando todos estiverem prontos, o anfitrião inicia a rodada.'}
      </p>
    </div>
  )
}
