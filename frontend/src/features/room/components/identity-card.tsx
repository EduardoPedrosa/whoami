import { Avatar } from '@/components/avatar'
import { cn } from '@/lib/utils'
import { Check, CheckCircle, LockSimple } from '@phosphor-icons/react'
import { type PlayerView, type RoomView } from '@whoami/shared'
import { motion } from 'motion/react'

export function IdentityCard({
  player,
  room,
  index,
}: {
  player: PlayerView
  room: RoomView
  index: number
}) {
  const self = player.id === room.selfId
  const active = player.id === room.activePlayerId
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={cn(
        'identity-card',
        self && 'identity-own',
        active && 'identity-active',
        player.solved && 'identity-solved',
        player.departed && 'identity-departed',
      )}
      aria-label={`Carta de ${player.name}${self ? ', você' : ''}${active ? ', jogando agora' : ''}`}
    >
      <div className="identity-card-header">
        <Avatar avatar={player.avatar} />
        <div>
          <strong>
            {player.name}
            {self && <span> (você)</span>}
          </strong>
          <span>
            {player.departed
              ? 'Saiu da rodada'
              : player.solved
                ? 'Descobriu!'
                : !player.online
                  ? 'Reconectando…'
                  : active
                    ? 'Fazendo as perguntas'
                    : 'Aguardando a vez'}
          </span>
        </div>
        {player.solved ? (
          <CheckCircle size={21} weight="fill" aria-hidden="true" />
        ) : self ? (
          <LockSimple size={18} aria-hidden="true" />
        ) : null}
      </div>
      <div className="identity-card-body">
        {player.identity ? (
          <>
            <span className="identity-caption">
              {self ? 'VOCÊ É' : `${player.name.toLocaleUpperCase('pt-BR')} É`}
            </span>
            <h3>{player.identity}</h3>
            {player.solved && (
              <span className="identity-found">
                <Check size={15} aria-hidden="true" />
                Identidade descoberta
              </span>
            )}
          </>
        ) : (
          <>
            <span className="mystery-question" aria-hidden="true">
              ?
            </span>
            <h3>Sua identidade secreta</h3>
            <p>Faça perguntas para descobrir quem você é.</p>
          </>
        )}
      </div>
      <div className="identity-card-footer">
        <span>
          {active ? (
            <>
              <span className="presence-dot" />
              Jogando agora
            </>
          ) : player.solved ? (
            'Identidade descoberta'
          ) : self ? (
            'Não vale espiar'
          ) : (
            'Não revele a identidade'
          )}
        </span>
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
    </motion.article>
  )
}
