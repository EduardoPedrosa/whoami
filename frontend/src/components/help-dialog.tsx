import { UsersThree, IdentificationCard, ChatCircleDots, CheckCircle } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="help-trigger">
          Como jogar
        </Button>
      </DialogTrigger>
      <DialogContent className="help-dialog rounded-3xl">
        <DialogHeader>
          <span className="dialog-kicker">AS REGRAS</span>
          <DialogTitle className="text-3xl">Como jogar Quem sou eu?</DialogTitle>
          <DialogDescription>Jogo de adivinhar identidades para 2 a 12 pessoas.</DialogDescription>
        </DialogHeader>
        <ol className="how-to-list">
          <li>
            <UsersThree aria-hidden="true" />
            <div>
              <strong>Reúna de 2 a 12 amigos</strong>
              <p>
                Crie uma sala e compartilhe o código. O administrador pode ajustar a ordem para
                acompanhar a roda presencial.
              </p>
            </div>
          </li>
          <li>
            <IdentificationCard aria-hidden="true" />
            <div>
              <strong>Escolha uma identidade</strong>
              <p>
                Cada pessoa escreve quem o próximo jogador será. Só a própria identidade fica
                escondida.
              </p>
            </div>
          </li>
          <li>
            <ChatCircleDots aria-hidden="true" />
            <div>
              <strong>Faça perguntas de sim ou não</strong>
              <p>
                Na sua vez, faça perguntas em voz alta. Quando quiser, passe a vez para a próxima
                pessoa da roda.
              </p>
            </div>
          </li>
          <li>
            <CheckCircle aria-hidden="true" />
            <div>
              <strong>Quem escreveu confirma o acerto</strong>
              <p>
                A pessoa que escreveu sua identidade confirma quando você acertar. Você deixa de
                perguntar, e os demais continuam. O administrador também pode encerrar a partida com
                confirmação.
              </p>
            </div>
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">O jogo não transmite áudio ou vídeo.</p>
        <DialogClose asChild>
          <Button className="w-full">Entendi</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
