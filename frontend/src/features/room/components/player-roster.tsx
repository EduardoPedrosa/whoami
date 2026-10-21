import { Avatar } from '@/components/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { CheckCircle, Crown, HourglassMedium, SpeakerHigh } from '@phosphor-icons/react'
import { MAX_PLAYERS, type RoomView } from '@whoami/shared'

export function PlayerRoster({ room }: { room: RoomView }) {
  return (
    <aside className="room-sidebar">
      <div className="sidebar-heading">
        <h2>Jogadores</h2>
        <span>
          {room.players.filter((p) => !p.departed).length}/{MAX_PLAYERS}
        </span>
      </div>
      <ul className="player-roster">
        {room.players
          .filter((p) => !p.departed)
          .map((player) => (
            <li key={player.id}>
              <Avatar avatar={player.avatar} />
              <div className="roster-info">
                <strong>
                  {player.name}
                  {player.id === room.selfId && <span> (você)</span>}
                </strong>
                <span>
                  {!player.online
                    ? 'Reconectando…'
                    : player.solved
                      ? 'Identidade descoberta'
                      : room.phase === 'lobby'
                        ? player.ready
                          ? 'Pronto para jogar'
                          : 'Ainda se preparando'
                        : room.phase === 'assigning'
                          ? player.hasAssigned
                            ? 'Identidade escolhida'
                            : 'Escolhendo identidade'
                          : `${player.score} ${player.score === 1 ? 'ponto' : 'pontos'}`}
                </span>
              </div>
              {player.id === room.hostId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="host-icon" role="img" aria-label="Anfitrião">
                      <Crown weight="duotone" size={19} aria-hidden="true" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Anfitrião</TooltipContent>
                </Tooltip>
              )}
              {(room.phase === 'lobby'
                ? player.ready
                : room.phase === 'assigning'
                  ? player.hasAssigned
                  : player.solved) && (
                <CheckCircle weight="fill" className="roster-ready" size={19} aria-label="Pronto" />
              )}
              {!player.online && (
                <HourglassMedium size={19} className="text-muted-foreground" aria-hidden="true" />
              )}
            </li>
          ))}
      </ul>
      <div className="table-tip">
        <SpeakerHigh aria-hidden="true" size={21} />
        <div>
          <strong>Joguem conversando</strong>
          <p>Joguem lado a lado ou abram uma chamada de voz. O áudio fica por conta de vocês.</p>
        </div>
      </div>
      <div className="activity-section">
        <h3>Atividade recente</h3>
        <ul aria-label="Atividade recente">
          {room.activity
            .slice(-4)
            .reverse()
            .map((item) => (
              <li key={item.id}>
                <span
                  className={cn('activity-dot', item.kind === 'success' && 'activity-success')}
                />
                <p>{item.text}</p>
              </li>
            ))}
        </ul>
      </div>
    </aside>
  )
}
