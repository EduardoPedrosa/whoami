import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { gameClient } from '@/lib/game-client'
import { Shuffle, Trophy } from '@phosphor-icons/react'
import { type RoomView } from '@whoami/shared'

export function Results({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const players = [...room.players].sort((a, b) => b.score - a.score)
  return (
    <div className="results-content">
      <div className="results-icon">
        <Trophy size={50} weight="duotone" aria-hidden="true" />
      </div>
      <span className="small-tag">RODADA {room.round} CONCLUÍDA</span>
      <h2>Fim da rodada!</h2>
      <p>Confira as identidades e os pontos. Vamos jogar de novo?</p>
      <ul className="result-list">
        {players.map((player) => (
          <li key={player.id}>
            <span className="result-place">
              {players.findIndex((other) => other.score === player.score) + 1}
            </span>
            <Avatar avatar={player.avatar} />
            <div>
              <strong>
                {player.name}
                {player.id === room.selfId ? ' (você)' : ''}
              </strong>
              <span>
                {player.identity || 'Sem identidade'}
                {player.departed ? ' · saiu da rodada' : ''}
              </span>
            </div>
            <span className="result-score">
              {player.score}
              <small>{player.score === 1 ? 'ponto' : 'pontos'}</small>
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
          Mais uma rodada
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">O anfitrião pode preparar a próxima rodada.</p>
      )}
    </div>
  )
}
