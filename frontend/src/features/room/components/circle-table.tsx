import { useState, type CSSProperties } from 'react'
import { ArrowClockwise, CheckCircle, WifiSlash } from '@phosphor-icons/react'
import type { RoomView } from '@whoami/shared'
import { Avatar } from '@/components/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IdentityCard } from './identity-card'
import { cn } from '@/lib/utils'

export function CircleTable({ room }: { room: RoomView }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selfIndex = room.players.findIndex((p) => p.id === room.selfId)
  const ordered = [...room.players.slice(selfIndex), ...room.players.slice(0, selfIndex)]
  const activeIndex = room.players.findIndex((p) => p.id === room.activePlayerId)
  const next = Array.from(
    { length: room.players.length },
    (_, index) => room.players[(activeIndex + index + 1) % room.players.length]!,
  ).filter((p) => !p.solved && !p.departed && p.online && p.id !== room.activePlayerId)
  const selected = room.players.find((p) => p.id === selectedId)
  return (
    <div className="circle-view">
      <div className={cn('circle-table', ordered.length > 6 && 'circle-dense')}>
        <div className="circle-ring" aria-hidden="true" />
        <div className="circle-center">
          <ArrowClockwise aria-hidden="true" size={24} />
          <span>Sentido horário</span>
          <strong>{next[0] ? `Depois: ${next[0].name}` : 'A roda continua'}</strong>
          <small>Toque numa carta para ver</small>
        </div>
        <ol
          className="circle-seats"
          aria-label="Jogadores na roda, em sentido horário a partir de você"
        >
          {ordered.map((player, index) => {
            const angle = Math.PI / 2 + (index * Math.PI * 2) / ordered.length
            const seat = room.players.findIndex((p) => p.id === player.id) + 1
            const self = player.id === room.selfId
            const active = player.id === room.activePlayerId
            return (
              <li
                key={player.id}
                style={
                  {
                    '--seat-x': `${50 + 38 * Math.cos(angle)}%`,
                    '--seat-y': `${50 + 37 * Math.sin(angle)}%`,
                  } as CSSProperties
                }
              >
                <button
                  type="button"
                  className={cn(
                    'circle-seat',
                    self && 'circle-own',
                    active && 'circle-active',
                    player.solved && 'circle-solved',
                    player.departed && 'circle-departed',
                  )}
                  aria-label={`Carta de ${player.name}${self ? ', você' : ''}${active ? ', perguntando agora' : ''}${player.solved ? ', já descobriu' : ''}`}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => setSelectedId(player.id)}
                >
                  <span className="circle-seat-number">{seat}</span>
                  <Avatar avatar={player.avatar} />
                  <strong>{self ? 'Você' : player.name}</strong>
                  <span className="circle-identity">{player.identity || '?'}</span>
                  {player.solved ? (
                    <CheckCircle
                      className="circle-seat-status"
                      size={15}
                      aria-label="Identidade descoberta"
                    />
                  ) : !player.online ? (
                    <WifiSlash className="circle-seat-status" size={15} aria-label="Reconectando" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="next-turns">
        <span>Próximos a perguntar</span>
        {next.length ? (
          <ol>
            {next.map((p, index) => (
              <li key={p.id}>
                <span>{index + 1}</span>
                {p.name}
              </li>
            ))}
          </ol>
        ) : (
          <p>Sem outra pessoa aguardando a vez.</p>
        )}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        <DialogContent className="rounded-3xl circle-card-dialog">
          <DialogHeader>
            <DialogTitle>Carta de {selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.id === room.selfId && !selected.solved && !selected.identity
                ? 'Sua identidade continua escondida até o acerto ou o fim da partida.'
                : 'Não revele a identidade enquanto essa pessoa estiver tentando descobrir.'}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <IdentityCard player={selected} room={room} index={room.players.indexOf(selected)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
