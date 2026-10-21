import {
  UsersThree,
  IdentificationCard,
  ChatCircleDots,
  Trophy,
  ArrowRight,
} from '@phosphor-icons/react'
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
          <DialogDescription>
            Seus amigos sabem sua identidade. Faça perguntas para descobrir.
          </DialogDescription>
        </DialogHeader>
        <ol className="how-to-list">
          <li>
            <UsersThree aria-hidden="true" />
            <div>
              <strong>Reúna de 2 a 12 amigos</strong>
              <p>Crie uma sala e compartilhe o código. Joguem juntos ou em uma chamada de voz.</p>
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
                Na sua vez, faça perguntas de sim ou não em voz alta. Continue até acertar, passar
                ou acabar o tempo.
              </p>
            </div>
          </li>
          <li>
            <Trophy aria-hidden="true" />
            <div>
              <strong>Outro jogador confirma o acerto</strong>
              <p>
                Outra pessoa confirma seu acerto. Sua carta é revelada, você ganha um ponto e a vez
                avança.
              </p>
            </div>
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          O Whoami cuida das cartas e dos turnos. O áudio acontece com vocês, pessoalmente ou na
          chamada que preferirem.
        </p>
        <DialogClose asChild>
          <Button className="w-full">
            Entendi, vamos jogar <ArrowRight aria-hidden="true" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
