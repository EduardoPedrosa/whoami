import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { gameClient } from '@/lib/game-client'
import { Shuffle, IdentificationCard } from '@phosphor-icons/react'
import type { RoomView } from '@whoami/shared'

export function Results({ room, disabled }: { room: RoomView; disabled: boolean }) {
  return (
    <div className="results-content">
      <div className="results-icon">
        <IdentificationCard size={50} weight="duotone" aria-hidden="true" />
      </div>
      <span className="small-tag">RODADA {room.round} ENCERRADA</span>
      <h2>Fim da rodada</h2>
      <ul className="result-list">
        {room.players.map((player) => (
          <li key={player.id}>
            <Avatar avatar={player.avatar} />
            <div>
              <strong>
                {player.name}
                {player.id === room.selfId ? ' (você)' : ''}
              </strong>
              <span>
                {player.identity || 'Identidade não escolhida'}
                {player.departed ? ' · saiu da rodada' : ''}
              </span>
            </div>
            <span className="result-status">
              {player.departed ? 'Saiu' : player.solved ? 'Descobriu' : 'Revelada no fim'}
            </span>
          </li>
        ))}
      </ul>
      {room.hostId === room.selfId ? (
        <Button
          size="lg"
          disabled={disabled}
          onClick={() => {
            void gameClient.command({ type: 'room:restart' })
          }}
        >
          <Shuffle size={19} aria-hidden="true" />
          Nova rodada
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          O administrador pode preparar a próxima rodada.
        </p>
      )}
    </div>
  )
}
