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
import { ArrowLeft } from '@phosphor-icons/react'

export function Restart({ disabled }: { disabled: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar à espera
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Reorganizar a mesa?</AlertDialogTitle>
          <AlertDialogDescription>
            A rodada atual será encerrada e as identidades apagadas. Os pontos já conquistados serão
            mantidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar jogando</AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled}
            onClick={() => {
              void gameClient.command({ type: 'room:restart' })
            }}
          >
            Voltar à espera
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
