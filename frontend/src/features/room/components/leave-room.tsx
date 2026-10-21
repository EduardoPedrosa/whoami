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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { gameClient, useGame } from '@/lib/game-client'
import { SignOut } from '@phosphor-icons/react'

export function LeaveRoom() {
  const { pending } = useGame()
  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Sair da sala">
              <SignOut size={21} aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Sair da sala</TooltipContent>
      </Tooltip>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Sair desta mesa?</AlertDialogTitle>
          <AlertDialogDescription>
            Seu lugar será liberado. Para voltar, você precisará entrar novamente enquanto a sala
            estiver na espera.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Ficar na sala</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            variant="destructive"
            onClick={() => {
              void gameClient.command({ type: 'room:leave' })
            }}
          >
            Sair da sala
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
