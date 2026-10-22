import { useState } from 'react'
import { Flag } from '@phosphor-icons/react'
import type { RoomView } from '@whoami/shared'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { gameClient } from '@/lib/game-client'

export function EndGame({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Flag aria-hidden="true" /> Encerrar partida
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar a partida?</AlertDialogTitle>
          <AlertDialogDescription>
            As identidades já escolhidas serão reveladas para todos e ninguém continuará perguntando
            nesta rodada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>Continuar jogando</AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled}
            onClick={async (event) => {
              event.preventDefault()
              if (await gameClient.command({ type: 'room:finish', round: room.round }))
                setOpen(false)
            }}
          >
            Sim, encerrar partida
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
