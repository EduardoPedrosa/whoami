import { Avatar } from '@/components/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { gameClient } from '@/lib/game-client'
import { ArrowRight, CheckCircle, HourglassMedium, Sparkle } from '@phosphor-icons/react'
import { type RoomView } from '@whoami/shared'
import { useState } from 'react'

import { Countdown } from '@/features/room/components/countdown'
import { IdentityCard } from '@/features/room/components/identity-card'

export function Playing({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const active = room.players.find((p) => p.id === room.activePlayerId)
  const isMyTurn = active?.id === room.selfId
  const [confirmation, setConfirmation] = useState<{ name: string; turnId: string } | null>(null)
  const ordered = [...room.players].sort(
    (a, b) => Number(b.id === room.selfId) - Number(a.id === room.selfId),
  )
  async function confirm() {
    if (
      confirmation &&
      (await gameClient.command({ type: 'turn:solve', turnId: confirmation.turnId }))
    )
      setConfirmation(null)
  }
  return (
    <div className="playing-content">
      <div className="turn-banner">
        <div className="turn-avatar">
          {active ? (
            <Avatar avatar={active.avatar} large />
          ) : (
            <HourglassMedium size={34} aria-hidden="true" />
          )}
        </div>
        <div className="turn-copy">
          <span>{isMyTurn ? 'O HOLOFOTE É SEU' : 'A MESA ESTÁ OUVINDO'}</span>
          <h2>
            {isMyTurn
              ? 'Sua vez de descobrir.'
              : active
                ? `É a vez de ${active.name}.`
                : 'Esperando a conexão voltar.'}
          </h2>
          <p>
            {isMyTurn
              ? 'Faça perguntas de sim ou não em voz alta.'
              : active
                ? 'Respondam sem entregar o segredo. Vale tentar não rir.'
                : 'A rodada continua quando alguém reconectar.'}
          </p>
        </div>
        <Countdown room={room} />
      </div>
      <div className="game-board">
        {ordered.map((player, index) => (
          <IdentityCard
            key={`${room.round}-${player.id}`}
            player={player}
            room={room}
            index={index}
          />
        ))}
      </div>
      <div className="turn-controls">
        <div className="turn-hint">
          <Sparkle size={20} aria-hidden="true" />
          <p>
            {isMyTurn
              ? 'Uma boa primeira pergunta: “Eu existo na vida real?”'
              : active
                ? `${active.name} falou a identidade certa? Confirme o acerto.`
                : 'Ninguém perde a identidade por uma queda rápida.'}
          </p>
        </div>
        <div className="turn-buttons">
          {active && (isMyTurn || room.hostId === room.selfId) && (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => {
                void gameClient.command({ type: 'turn:pass', turnId: room.turnId! })
              }}
            >
              {isMyTurn ? 'Passar a vez' : 'Avançar a vez'}
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
          )}
          {active && !isMyTurn && (
            <Button
              disabled={disabled || !active.online}
              onClick={() => setConfirmation({ name: active.name, turnId: room.turnId! })}
            >
              <CheckCircle size={19} aria-hidden="true" />
              Confirmar acerto
            </Button>
          )}
        </div>
      </div>
      <AlertDialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.name} descobriu a identidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme apenas se a pessoa falou a identidade certa em voz alta. A carta será
              revelada e ela ganhará um ponto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>Ainda não</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={(event) => {
                event.preventDefault()
                void confirm()
              }}
            >
              Sim, acertou!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
